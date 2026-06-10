// supabase/functions/calendar-pull/index.ts
// Reverse sync : poll Google Calendar et crée une tâche pour chaque event
// créé manuellement (= sans calendar_event_id correspondant en base).
// Évite la double-création des events déjà poussés par calendar-sync.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cronKey = req.headers.get("X-Cron-Key");
  const isCron = cronKey && cronKey === Deno.env.get("CRON_SHARED_SECRET");
  if (!isCron) {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth" }, 401);
    const { data: u } = await supabase.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Invalid session" }, 401);
    const { data: p } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
    if (p?.role !== "admin" && p?.role !== "collaborateur") return json({ error: "Forbidden" }, 403);
  }

  const result = { events: 0, tasks_created: 0, skipped: 0, errors: [] as string[] };

  try {
    const { data: integ } = await supabase.from("mail_integrations")
      .select("*").eq("provider", "gcal").eq("active", true).maybeSingle();
    if (!integ) return json({ ok: true, message: "No gcal integration", result });

    const accessToken = await ensureAccessToken(supabase, integ);
    const calendarId = Deno.env.get("GCAL_CALENDAR_ID") || "primary";

    // Liste les events des 30 prochains jours
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 86400_000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`;

    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`list events: ${r.status}`);
    const events = (await r.json()).items || [];
    result.events = events.length;

    // IDs déjà connus (push depuis calendar-sync)
    const knownIds = new Set<string>();
    const [{ data: t }, { data: rem }] = await Promise.all([
      supabase.from("tasks").select("calendar_event_id").not("calendar_event_id", "is", null),
      supabase.from("reminders").select("calendar_event_id").not("calendar_event_id", "is", null),
    ]);
    (t || []).forEach((x: any) => x.calendar_event_id && knownIds.add(x.calendar_event_id));
    (rem || []).forEach((x: any) => x.calendar_event_id && knownIds.add(x.calendar_event_id));

    // Récupère projets pour matcher par titre
    const { data: projects } = await supabase.from("projects").select("id, title");
    const projectMatch = (text: string) => {
      const t = (text || "").toLowerCase();
      for (const p of projects || []) {
        const title = (p.title || "").toLowerCase();
        if (title.length > 3 && t.includes(title)) return p.id;
      }
      return null;
    };

    for (const ev of events) {
      if (knownIds.has(ev.id)) { result.skipped++; continue; }
      // Skip si déclaré comme déjà importé (extendedProperties)
      if (ev.extendedProperties?.private?.thirdone === "imported") {
        result.skipped++; continue;
      }

      const start = ev.start?.dateTime || ev.start?.date;
      if (!start) continue;
      const dueDate = start.slice(0, 10);

      const title = ev.summary || "RDV sans titre";
      const description = ev.description || ev.location || null;
      const text = `${title} ${description || ""}`;
      const projectId = projectMatch(text);

      const { data: task, error: tErr } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: `📅 ${title}`,
        description,
        due_date: dueDate,
        priority: "normal",
        source: "auto",
        calendar_event_id: ev.id,
        calendar_synced_at: new Date().toISOString(),
      }).select("id").single();

      if (tErr) { result.errors.push(`ev ${ev.id}: ${tErr.message}`); continue; }
      result.tasks_created++;

      // Marque l'event Google pour éviter ré-import futur
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${ev.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            extendedProperties: { private: { thirdone: "imported", task_id: task.id } },
          }),
        }
      ).catch(() => {/* non-bloquant */});
    }

    await supabase.from("mail_logs").insert({
      source: "calendar-pull", action: "poll",
      success: result.errors.length === 0,
      message: `events=${result.events} created=${result.tasks_created} skipped=${result.skipped}`,
      payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "calendar-pull", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

async function ensureAccessToken(supabase: any, integ: any): Promise<string> {
  const now = Date.now();
  const expiresAt = integ.expires_at ? new Date(integ.expires_at).getTime() : 0;
  if (integ.access_token && expiresAt > now + 60_000) return integ.access_token;
  const body = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
    refresh_token: integ.refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token refresh: ${r.status}`);
  const tok = await r.json();
  await supabase.from("mail_integrations").update({
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + (tok.expires_in - 30) * 1000).toISOString(),
  }).eq("id", integ.id);
  return tok.access_token;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
