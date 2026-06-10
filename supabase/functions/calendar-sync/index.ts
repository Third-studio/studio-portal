// supabase/functions/calendar-sync/index.ts
// Pousse les tasks (avec due_date) et reminders non-synchronisés vers Google Calendar.
// Idempotent : on stocke calendar_event_id et on PATCH si déjà créé.
//
// Secrets :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
//   CRON_SHARED_SECRET
//   GCAL_CALENDAR_ID (défaut: "primary")
//
// L'intégration provider='gcal' doit exister dans mail_integrations (même flow OAuth que Gmail).

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
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

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

  const calendarId = Deno.env.get("GCAL_CALENDAR_ID") || "primary";
  const result = { tasks_pushed: 0, reminders_pushed: 0, errors: [] as string[] };

  try {
    const { data: integ, error: intErr } = await supabase
      .from("mail_integrations").select("*")
      .eq("provider", "gcal").eq("active", true).maybeSingle();
    if (intErr) throw intErr;
    if (!integ) return json({ ok: true, message: "No active gcal integration", result });

    const accessToken = await ensureAccessToken(supabase, integ);

    // ── Tasks à pousser (due_date présente, status != done)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .not("due_date", "is", null)
      .neq("status", "done")
      .limit(200);

    for (const t of tasks || []) {
      try {
        const start = `${t.due_date}T09:00:00-04:00`;
        const end = `${t.due_date}T10:00:00-04:00`;
        const body = {
          summary: `[Tâche] ${t.title}`,
          description: t.description || `Projet #${t.project_id ?? "—"}`,
          start: { dateTime: start, timeZone: "America/Martinique" },
          end:   { dateTime: end,   timeZone: "America/Martinique" },
        };
        const evId = await upsertEvent(accessToken, calendarId, t.calendar_event_id, body);
        await supabase.from("tasks").update({
          calendar_event_id: evId,
          calendar_synced_at: new Date().toISOString(),
        }).eq("id", t.id);
        result.tasks_pushed++;
      } catch (e) { result.errors.push(`task ${t.id}: ${(e as Error).message}`); }
    }

    // ── Reminders à pousser
    const { data: rems } = await supabase
      .from("reminders")
      .select("*")
      .is("calendar_synced_at", null)
      .gt("remind_at", new Date().toISOString())
      .limit(200);

    for (const r of rems || []) {
      try {
        const start = r.remind_at;
        const end = new Date(new Date(r.remind_at).getTime() + 30 * 60_000).toISOString();
        const body = {
          summary: `[Rappel] ${r.title}`,
          description: r.body || "",
          start: { dateTime: start, timeZone: "America/Martinique" },
          end:   { dateTime: end,   timeZone: "America/Martinique" },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
        };
        const evId = await upsertEvent(accessToken, calendarId, r.calendar_event_id, body);
        await supabase.from("reminders").update({
          calendar_event_id: evId,
          calendar_synced_at: new Date().toISOString(),
        }).eq("id", r.id);
        result.reminders_pushed++;
      } catch (e) { result.errors.push(`reminder ${r.id}: ${(e as Error).message}`); }
    }

    await supabase.from("mail_logs").insert({
      source: "calendar-sync", action: "push", success: result.errors.length === 0,
      message: `tasks=${result.tasks_pushed} rem=${result.reminders_pushed}`, payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "calendar-sync", action: "error", success: false, message: msg,
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
  if (!r.ok) throw new Error(`token refresh: ${r.status} ${await r.text()}`);
  const tok = await r.json();
  await supabase.from("mail_integrations").update({
    access_token: tok.access_token,
    expires_at: new Date(Date.now() + (tok.expires_in - 30) * 1000).toISOString(),
  }).eq("id", integ.id);
  return tok.access_token;
}

async function upsertEvent(accessToken: string, calendarId: string, existingId: string | null, body: any) {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const url = existingId ? `${base}/${existingId}` : base;
  const method = existingId ? "PATCH" : "POST";
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    // Si PATCH échoue (event supprimé), on retombe en POST
    if (existingId && r.status === 404) return upsertEvent(accessToken, calendarId, null, body);
    throw new Error(`gcal ${method} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  const data = await r.json();
  return data.id as string;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
