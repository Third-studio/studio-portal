// supabase/functions/daily-briefing/index.ts
// Cron 7h Martinique (11h UTC). Génère un mail "ton point du jour" :
//   - top 3 tâches priorité haute/urgent
//   - RDV/livraisons du jour
//   - factures à relancer
//   - 5 mails importants non traités
// Mail envoyé via send-email (X-Cron-Key).
//
// Secrets :
//   ANTHROPIC_API_KEY, CRON_SHARED_SECRET, BRIEFING_RECIPIENT (défaut: idrissduleme@gmail.com)

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

  // Auth : cron-only (sauf admin pour preview manuel)
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
    const today = new Date().toISOString().slice(0, 10);

    // Récolte des signaux
    const [tasks, rdv, invoices, emails, projects] = await Promise.all([
      supabase.from("tasks").select("id, title, due_date, priority, project_id")
        .neq("status", "done")
        .or(`due_date.lte.${today},priority.in.(high,urgent)`)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20),
      supabase.from("tasks").select("id, title, due_date, project_id, description")
        .eq("due_date", today).neq("status", "done"),
      supabase.from("invoices").select("id, number, label, amount_ttc, due_date, status, project_id")
        .in("status", ["sent", "overdue"])
        .lte("due_date", today).limit(20),
      supabase.from("emails").select("id, from_addr, subject, kind, urgence, summary_fr, project_id")
        .in("urgence", ["high", "urgent"])
        .gte("received_at", new Date(Date.now() - 48 * 3600_000).toISOString())
        .limit(10),
      supabase.from("projects").select("id, title, status, auto_health, auto_next_action")
        .in("auto_health", ["risk", "blocked"]).limit(10),
    ]);

    const data = {
      tasks: tasks.data || [], rdv: rdv.data || [],
      invoices: invoices.data || [], emails: emails.data || [],
      at_risk_projects: projects.data || [],
    };

    const isEmpty = !data.tasks.length && !data.rdv.length && !data.invoices.length &&
                    !data.emails.length && !data.at_risk_projects.length;

    if (isEmpty) {
      // Pas la peine de spammer
      await supabase.from("digests").insert({
        kind: "daily", recipient, subject: "(skip — rien à signaler)",
        payload: data,
      });
      return json({ ok: true, skipped: true });
    }

    const systemPrompt = `Tu es l'assistant matinal d'Idriss (Third-One Studio, prod audiovisuelle, Martinique).
Génère un email court (markdown simple) et actionnable pour démarrer sa journée.

Structure obligatoire :
1. **Top 3 du jour** — les 3 actions les plus importantes (verbe à l'infinitif, mention projet si lié)
2. **RDV / livraisons** (si présent)
3. **À relancer** (factures impayées, max 5)
4. **Alertes** (projets à risque, mails urgents)

Règles :
- Pas de salutation longue, va à l'essentiel
- Maximum 250 mots
- Pas d'emojis sauf 🔴 (urgent) et ⚠️ (risque)
- Si rien à signaler dans une section, ne l'écris pas
- Termine par une ligne d'encouragement courte (1 phrase max)

Date : ${today}`;

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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(data, null, 2) }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}: ${await claudeRes.text()}`);
    const claudeJson = await claudeRes.json();
    const bodyMd = claudeJson?.content?.[0]?.text || "Briefing indisponible.";
    const bodyHtml = mdToHtml(bodyMd);
    const subject = `☀️ Ton point du jour — ${new Date().toLocaleDateString("fr-FR", {
      weekday: "long", day: "2-digit", month: "long",
    })}`;

    // Envoi via send-email (X-Cron-Key)
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const sendRes = await fetch(`${supaUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cron-Key": cronKey || Deno.env.get("CRON_SHARED_SECRET")!,
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: JSON.stringify({ to: recipient, subject, html: bodyHtml, text: bodyMd }),
    });

    const sendOk = sendRes.ok;
    await supabase.from("digests").insert({
      kind: "daily", recipient, subject,
      body_md: bodyMd, body_html: bodyHtml, payload: data,
      sent_at: sendOk ? new Date().toISOString() : null,
    });

    await supabase.from("mail_logs").insert({
      source: "daily-briefing", action: sendOk ? "push" : "error",
      success: sendOk,
      message: sendOk ? `sent to ${recipient}` : `send failed: ${await sendRes.text()}`,
    });

    return json({ ok: sendOk, subject });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "daily-briefing", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

function mdToHtml(md: string): string {
  // Conversion markdown minimaliste (titres, gras, listes, liens)
  let h = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  h = h.replace(/\n\n/g, "</p><p>");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;font-size:14px;line-height:1.55;color:#1D1D1F;max-width:560px;"><p>${h}</p></div>`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
