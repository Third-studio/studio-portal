// supabase/functions/project-radar/index.ts
// Cron quotidien (ex: 6h Martinique). Pour chaque projet actif :
//   - Agrège mails+tâches+planning des 14 derniers jours
//   - Claude écrit auto_status_note (1-2 phrases) + auto_health + auto_next_action
//   - Le résultat alimente le briefing matinal et la fiche projet
//
// Secrets : ANTHROPIC_API_KEY, CRON_SHARED_SECRET, CLAUDE_MODEL

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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

  const result = { analyzed: 0, errors: [] as string[] };
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY missing" }, 500);

  try {
    // Projets actifs (pas livrés). On laisse aussi les statuts inconnus pour rattraper.
    const { data: projects, error: pErr } = await supabase
      .from("projects").select("id, title, status, brief, shoot_date, delivery_date")
      .not("status", "in", "(\"livraison\",\"archived\",\"cancelled\")")
      .limit(100);
    if (pErr) throw pErr;

    const since = new Date(Date.now() - 14 * 86400_000).toISOString();

    for (const proj of projects || []) {
      try {
        const [emails, tasks, slots, msgs] = await Promise.all([
          supabase.from("emails")
            .select("received_at, from_addr, subject, kind, urgence, summary_fr")
            .eq("project_id", proj.id).gte("received_at", since)
            .order("received_at", { ascending: false }).limit(20),
          supabase.from("tasks")
            .select("title, due_date, status, priority").eq("project_id", proj.id),
          supabase.from("planning_slots")
            .select("date, slot, role").eq("project_id", proj.id)
            .gte("date", new Date().toISOString().slice(0, 10)).limit(10),
          supabase.from("messages")
            .select("created_at, body").eq("project_id", proj.id)
            .gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        ]);

        const payload = {
          project: {
            id: proj.id, title: proj.title, status: proj.status,
            shoot_date: proj.shoot_date, delivery_date: proj.delivery_date,
            brief_summary: typeof proj.brief === "string"
              ? proj.brief.slice(0, 500)
              : JSON.stringify(proj.brief || {}).slice(0, 500),
          },
          recent_emails: emails.data || [],
          tasks: tasks.data || [],
          upcoming_slots: slots.data || [],
          recent_messages: msgs.data || [],
          today: new Date().toISOString().slice(0, 10),
        };

        const systemPrompt = `Tu analyses un projet de prod audiovisuelle (Third-One Studio, Martinique).
Réponds UNIQUEMENT en JSON valide (sans markdown ni backticks) :
{
  "status_note": "<1-2 phrases en français, factuelles, sur où en est le projet>",
  "health":      "ok" | "watch" | "risk" | "blocked",
  "next_action": "<verbe à l'infinitif + objet — la PROCHAINE action concrète>"
}

Règles :
- "ok" : avance normalement
- "watch" : à surveiller (deadline proche, attente client > 3 jours)
- "risk" : risque réel (retard imminent, demande client non claire)
- "blocked" : bloqué (pas de réponse client > 7j, livrable manquant, paiement bloqué)
- next_action est UNE seule action concrète (ex: "Relancer client pour validation storyboard", "Confirmer date tournage avec Léa")
- status_note doit refléter l'état réel d'après les données ; pas de blabla
`;

        const claudeRes = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5-20251001",
            max_tokens: 400,
            system: systemPrompt,
            messages: [{ role: "user", content: JSON.stringify(payload) }],
          }),
        });

        if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}`);
        const cj = await claudeRes.json();
        const raw = cj?.content?.[0]?.text || "{}";
        const parsed = JSON.parse(extractJson(raw));

        await supabase.from("projects").update({
          auto_status_note: parsed.status_note,
          auto_health:      parsed.health,
          auto_next_action: parsed.next_action,
          auto_status_at:   new Date().toISOString(),
        }).eq("id", proj.id);

        result.analyzed++;
      } catch (e) {
        result.errors.push(`proj ${proj.id}: ${(e as Error).message}`);
      }
    }

    await supabase.from("mail_logs").insert({
      source: "project-radar", action: "classify",
      success: result.errors.length === 0,
      message: `analyzed=${result.analyzed} errors=${result.errors.length}`,
      payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "project-radar", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

function extractJson(s: string): string {
  const i = s.indexOf("{"); const j = s.lastIndexOf("}");
  return (i === -1 || j === -1) ? s : s.slice(i, j + 1);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
