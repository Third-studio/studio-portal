// supabase/functions/weekly-recap/index.ts
// Cron vendredi 17h Martinique (21h UTC). Récap de la semaine :
//   - mails reçus / traités
//   - tâches faites / restantes
//   - factures émises / payées / en retard
//   - projets ayant bougé (events, livrables, mails)
//   - CA encaissé
// Envoyé en mail récap via send-email.

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
    if (p?.role !== "admin") return json({ error: "Forbidden" }, 403);
  }

  try {
    const recipient = Deno.env.get("BRIEFING_RECIPIENT") || "idrissduleme@gmail.com";
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400_000);
    const sinceIso = weekAgo.toISOString();
    const sinceDate = weekAgo.toISOString().slice(0, 10);

    const [emailsIn, tasksDone, tasksOpen, invIssued, invPaid, invOverdue, projects, quotesAccepted] =
      await Promise.all([
        supabase.from("emails").select("kind").gte("received_at", sinceIso),
        supabase.from("tasks").select("id, title, project_id").eq("status", "done").gte("done_at", sinceIso),
        supabase.from("tasks").select("id").neq("status", "done"),
        supabase.from("invoices").select("number, label, amount_ttc, project_id, issued_at, status").gte("issued_at", sinceDate),
        supabase.from("invoices").select("number, amount_ttc, project_id").eq("status", "paid").gte("paid_at", sinceDate),
        supabase.from("invoices").select("number, amount_ttc, due_date").eq("status", "overdue"),
        supabase.from("projects").select("id, title, status, auto_status_note, auto_health, auto_next_action").not("auto_status_at", "is", null).gte("auto_status_at", sinceIso),
        supabase.from("quotes").select("number, amount_ttc, project_id").eq("status", "accepted").gte("accepted_at", sinceDate),
      ]);

    const kindCounts = (emailsIn.data || []).reduce((acc: any, e: any) => {
      acc[e.kind || "autre"] = (acc[e.kind || "autre"] || 0) + 1; return acc;
    }, {});

    const caPaid = (invPaid.data || []).reduce((s: number, i: any) => s + Number(i.amount_ttc || 0), 0);
    const caInvoiced = (invIssued.data || []).reduce((s: number, i: any) => s + Number(i.amount_ttc || 0), 0);
    const overdueTotal = (invOverdue.data || []).reduce((s: number, i: any) => s + Number(i.amount_ttc || 0), 0);
    const caQuoted = (quotesAccepted.data || []).reduce((s: number, q: any) => s + Number(q.amount_ttc || 0), 0);

    const data = {
      week_of: sinceDate,
      emails_received: emailsIn.data?.length || 0,
      emails_by_kind: kindCounts,
      tasks_done: tasksDone.data || [],
      tasks_open_count: tasksOpen.data?.length || 0,
      invoices_issued: invIssued.data || [],
      invoices_paid: invPaid.data || [],
      invoices_overdue: invOverdue.data || [],
      quotes_accepted: quotesAccepted.data || [],
      projects_with_movement: projects.data || [],
      totals: {
        ca_invoiced_ttc: caInvoiced,
        ca_paid_ttc: caPaid,
        ca_quoted_accepted_ttc: caQuoted,
        overdue_total_ttc: overdueTotal,
      },
    };

    const systemPrompt = `Tu rédiges le récap hebdomadaire d'Idriss (Third-One Studio, Martinique).
Mail markdown court, ton factuel et chaleureux, max 350 mots.

Structure :
## Semaine du <date>
**Chiffres** : <CA encaissé> encaissés, <CA facturé> facturés, <à recouvrer> à recouvrer
### Ce qui a bougé
- Liste les 3-5 mouvements projets les plus notables (livraisons, validations, blocages)
### Tâches accomplies
- <nombre> tâches terminées (cite les 3-5 plus impactantes)
### À traiter la semaine prochaine
- Projets en risk/blocked (cite-les avec le next_action)
- Factures en retard si total > 0

Termine par une ligne courte (1 phrase) résumant la semaine.

Règles :
- Pas d'emojis sauf ⚠️ pour les alertes
- Montants formatés "1 234 €"
- Pas de blabla, données factuelles uniquement`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(data, null, 2) }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}`);
    const cj = await claudeRes.json();
    const bodyMd = cj?.content?.[0]?.text || "Récap indisponible.";
    const bodyHtml = mdToHtml(bodyMd);

    const subject = `📊 Récap semaine — ${weekAgo.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} au ${now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const sendRes = await fetch(`${supaUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cron-Key": Deno.env.get("CRON_SHARED_SECRET")!,
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: JSON.stringify({ to: recipient, subject, html: bodyHtml, text: bodyMd }),
    });

    const sendOk = sendRes.ok;
    await supabase.from("digests").insert({
      kind: "weekly", recipient, subject,
      body_md: bodyMd, body_html: bodyHtml, payload: data,
      sent_at: sendOk ? new Date().toISOString() : null,
    });

    await supabase.from("mail_logs").insert({
      source: "weekly-recap", action: sendOk ? "push" : "error",
      success: sendOk, message: `sent=${sendOk}`,
    });

    return json({ ok: sendOk, subject });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "weekly-recap", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

function mdToHtml(md: string): string {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/^### (.+)$/gm, "<h3 style='margin-top:18px'>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2 style='font-family:Urbanist,sans-serif;color:#00B4D8;'>$1</h2>");
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  h = h.replace(/\n\n/g, "</p><p>");
  return `<div style="font-family:-apple-system,Inter,sans-serif;font-size:14px;line-height:1.6;color:#1D1D1F;max-width:600px;"><p>${h}</p></div>`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
