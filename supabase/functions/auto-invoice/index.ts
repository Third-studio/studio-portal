// supabase/functions/auto-invoice/index.ts
// Génère une facture draft quand un projet passe à status='livraison'.
// Priorité 1 : copie le dernier devis accepté du projet.
// Priorité 2 : si aucun devis accepté, génère via Claude depuis brief.
// Body: { project_id, force? }

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

  try {
    const { project_id, force = false } = await req.json();
    if (!project_id) return json({ error: "missing project_id" }, 400);

    const { data: proj, error: pErr } = await supabase
      .from("projects").select("*").eq("id", project_id).single();
    if (pErr || !proj) return json({ error: "project not found" }, 404);

    // Idempotence
    if (!force) {
      const { data: existing } = await supabase.from("invoices")
        .select("id").eq("project_id", project_id).neq("status", "cancelled").limit(1);
      if (existing && existing.length) {
        return json({ ok: true, skipped: "invoice already exists" });
      }
    }

    // 1) Cherche devis accepté
    const { data: accQuote } = await supabase.from("quotes")
      .select("*").eq("project_id", project_id).eq("status", "accepted")
      .eq("direction", "out").order("accepted_at", { ascending: false }).limit(1).maybeSingle();

    // 2) Sinon dernier devis draft/sent
    const { data: anyQuote } = !accQuote ? await supabase.from("quotes")
      .select("*").eq("project_id", project_id).eq("direction", "out")
      .order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null };

    const base = accQuote || anyQuote;
    let amount_ht: number, amount_ttc: number, label: string, notes: string | null;

    if (base) {
      amount_ht = base.amount_ht;
      amount_ttc = base.amount_ttc;
      label = base.label || proj.title;
      notes = `Facture émise sur la base du devis ${base.number || base.id.slice(0, 8)}\n${base.notes || ""}`;
    } else {
      // Pas de devis : on génère depuis le brief via Claude
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      const claudeRes = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: `Tu estimes un montant de facturation pour un projet de prod audiovisuelle (Third-One Studio, Martinique, TVA 8.5%).
Réponds en JSON strict :
{ "label": "<libellé>", "amount_ht": <number>, "amount_ttc": <number>, "summary_lines": ["<ligne 1>", "<ligne 2>"] }
Sois conservateur : si tu doutes du montant, propose un fourchette basse réaliste.`,
          messages: [{ role: "user", content: JSON.stringify({
            title: proj.title, brief: proj.brief,
            shoot_date: proj.shoot_date, delivery_date: proj.delivery_date,
          })}],
        }),
      });

      if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}`);
      const cj = await claudeRes.json();
      const raw = cj?.content?.[0]?.text || "{}";
      const parsed = JSON.parse(extractJson(raw));
      amount_ht = parsed.amount_ht;
      amount_ttc = parsed.amount_ttc;
      label = parsed.label || proj.title;
      notes = `⚠️ Pas de devis trouvé — montant estimé par IA, à valider.\n${(parsed.summary_lines || []).join("\n")}`;
    }

    // Numéro de facture auto : F-YYYY-NNNN
    const year = new Date().getFullYear();
    const { count } = await supabase.from("invoices")
      .select("id", { count: "exact", head: true })
      .gte("issued_at", `${year}-01-01`);
    const number = `F-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

    const { data: inv, error: iErr } = await supabase.from("invoices").insert({
      project_id,
      client_id: proj.client_id,
      number,
      label,
      amount_ht,
      vat_rate: 8.5,
      amount_ttc,
      status: "draft",
      issued_at: today,
      due_date: dueDate,
      notes,
    }).select("id").single();

    if (iErr) throw iErr;

    // Tâche pour qu'Idriss valide + envoie
    await supabase.from("tasks").insert({
      project_id,
      title: `Valider et envoyer facture ${number} (${amount_ttc}€ TTC)`,
      priority: "high",
      source: "auto",
      due_date: today,
    });

    await supabase.from("mail_logs").insert({
      source: "auto-invoice", action: "classify", ref_id: inv.id, success: true,
      message: `invoice ${number} for project ${project_id}: ${amount_ttc}€`,
    });

    return json({ ok: true, invoice_id: inv.id, number });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
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
