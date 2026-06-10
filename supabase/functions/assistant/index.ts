// supabase/functions/assistant/index.ts
// Agent IA du portail. Répond aux questions sur les projets sans fouiller l'app.
//   - Équipe (admin/collaborateur) : accès à tous les projets, tâches, mails, rappels, factures.
//   - Client : UNIQUEMENT ses projets, ses messages et ses factures. Jamais de données internes.
//
// Secrets : ANTHROPIC_API_KEY, CLAUDE_MODEL (optionnel)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Auth
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth" }, 401);
  const { data: u } = await supabase.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Invalid session" }, 401);
  const { data: profile } = await supabase.from("profiles")
    .select("role, nom, company, alias").eq("id", u.user.id).single();

  const role = profile?.role;
  const isTeam = role === "admin" || role === "collaborateur";
  const isClient = role === "client";
  if (!isTeam && !isClient) return json({ error: "Forbidden" }, 403);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY missing" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").slice(0, 2000).trim();
    if (!question) return json({ error: "question required" }, 400);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    // ── Collecte des données selon le rôle
    const today = new Date().toISOString().slice(0, 10);
    let context = "";

    if (isTeam) {
      const [projects, tasks, reminders, emails] = await Promise.all([
        supabase.from("projects")
          .select("id, title, status, shoot_date, delivery_date, status_note, auto_status_note, auto_health, auto_next_action, client_id")
          .order("created_at", { ascending: false }).limit(60),
        supabase.from("tasks")
          .select("project_id, title, due_date, priority, status")
          .or("status.is.null,status.neq.done").order("due_date", { ascending: true }).limit(60),
        supabase.from("reminders")
          .select("project_id, title, remind_at")
          .gte("remind_at", new Date().toISOString()).order("remind_at").limit(30),
        supabase.from("emails")
          .select("project_id, received_at, from_name, subject, kind, urgence, summary_fr")
          .order("received_at", { ascending: false }).limit(25),
      ]);

      const { data: clients } = await supabase.from("profiles")
        .select("id, nom, company").eq("role", "client").limit(200);
      const cName = (id: string | null) => {
        const c = (clients || []).find((x: any) => x.id === id);
        return c ? (c.company || c.nom || "?") : "—";
      };

      context = `PROJETS (${(projects.data || []).length}) :
${(projects.data || []).map((p: any) =>
  `• [#${p.id}] ${p.title} — statut:${p.status} client:${cName(p.client_id)} tournage:${p.shoot_date || "?"} livraison:${p.delivery_date || "?"}${p.auto_health ? ` santé:${p.auto_health}` : ""}${p.auto_status_note ? ` | radar: ${p.auto_status_note}` : ""}${p.auto_next_action ? ` | prochaine action: ${p.auto_next_action}` : ""}`
).join("\n")}

TÂCHES OUVERTES :
${(tasks.data || []).map((t: any) => `• [proj ${t.project_id ?? "—"}] ${t.title} (échéance:${t.due_date || "—"}, prio:${t.priority || "normal"})`).join("\n") || "(aucune)"}

RAPPELS À VENIR :
${(reminders.data || []).map((r: any) => `• ${r.remind_at} — ${r.title}`).join("\n") || "(aucun)"}

DERNIERS MAILS :
${(emails.data || []).map((e: any) => `• ${e.received_at?.slice(0, 10)} ${e.from_name || ""} — ${e.subject || ""}${e.summary_fr ? ` | ${e.summary_fr}` : ""}${e.urgence === "urgent" ? " ⚠ URGENT" : ""}`).join("\n") || "(aucun)"}`;
    } else {
      // CLIENT : uniquement ses données
      const { data: projects } = await supabase.from("projects")
        .select("id, title, status, shoot_date, delivery_date, status_note")
        .eq("client_id", u.user.id).order("created_at", { ascending: false }).limit(20);

      const ids = (projects || []).map((p: any) => p.id);
      const { data: messages } = ids.length
        ? await supabase.from("messages")
            .select("project_id, author, content, role, created_at")
            .in("project_id", ids).order("created_at", { ascending: false }).limit(30)
        : { data: [] };
      const { data: invoices } = await supabase.from("invoices")
        .select("number, label, amount_ttc, due_date, status, project_id")
        .eq("client_id", u.user.id).limit(30);

      context = `VOS PROJETS :
${(projects || []).map((p: any) =>
  `• [#${p.id}] ${p.title} — statut:${p.status} tournage:${p.shoot_date || "à définir"} livraison prévue:${p.delivery_date || "à définir"}${p.status_note ? ` | note: ${p.status_note}` : ""}`
).join("\n") || "(aucun projet)"}

DERNIERS MESSAGES :
${(messages || []).map((m: any) => `• [proj ${m.project_id}] ${m.author}: ${String(m.content).slice(0, 150)}`).join("\n") || "(aucun)"}

VOS FACTURES :
${(invoices || []).map((i: any) => `• ${i.number || ""} ${i.label || ""} — ${i.amount_ttc}€ — échéance:${i.due_date || "—"} — statut:${i.status}`).join("\n") || "(aucune)"}`;
    }

    const prenom = (profile?.nom || "").trim().split(/\s+/)[0];
    const system = isTeam
      ? `Tu es l'assistant interne de Third-One Studio (production audiovisuelle, Martinique). Tu réponds à ${prenom || "un membre de l'équipe"} (${role}).
Réponds en français, de façon concise et directe, uniquement à partir des DONNÉES ci-dessous. Si l'info n'y est pas, dis-le simplement.
Aujourd'hui : ${today}. Statuts projet : brief → storyboard → review → livraison.

DONNÉES :
${context}`
      : `Tu es l'assistant client du portail Third-One Studio (production audiovisuelle, Martinique). Tu réponds à ${prenom || "un client"}.
Réponds en français, de façon chaleureuse, concise et professionnelle, uniquement à partir des DONNÉES ci-dessous (ce sont SES projets).
RÈGLES STRICTES : ne jamais mentionner de noms de membres de l'équipe, d'emails, de données internes ou d'autres clients. Si l'info n'est pas dans les données, invite à laisser un message dans l'onglet Messages du projet — l'équipe répondra.
Aujourd'hui : ${today}.

DONNÉES :
${context}`;

    const msgs = [
      ...history
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1500) })),
      { role: "user", content: question },
    ];

    const cRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system,
        messages: msgs,
      }),
    });

    if (!cRes.ok) {
      return json({ error: `claude ${cRes.status}: ${(await cRes.text()).slice(0, 200)}` }, 502);
    }
    const cj = await cRes.json();
    const answer = cj?.content?.[0]?.text || "";

    return json({ ok: true, answer });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
