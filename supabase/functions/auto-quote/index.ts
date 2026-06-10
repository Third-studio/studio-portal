// supabase/functions/auto-quote/index.ts
// Génère un devis draft à partir du brief d'un projet via Claude.
// Appelé par trigger SQL à l'INSERT d'un projet (ou manuellement depuis le front).
// Body: { project_id }

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

  // Auth : cron, ou admin/collaborateur
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

    // Idempotence : si un devis draft existe déjà pour ce projet, ne pas re-générer (sauf force)
    if (!force) {
      const { data: existing } = await supabase.from("quotes")
        .select("id").eq("project_id", project_id).eq("direction", "out").limit(1);
      if (existing && existing.length) {
        return json({ ok: true, skipped: "quote already exists" });
      }
    }

    // Récupère la grille tarifaire (table service_types)
    const { data: services } = await supabase.from("service_types").select("*").limit(50);

    const systemPrompt = `Tu es l'assistant devis de Third-One Studio (production audiovisuelle, Martinique).
À partir du brief d'un projet, génère un devis détaillé en JSON strict (sans markdown).

Schéma :
{
  "label": "<libellé devis court>",
  "lines": [
    { "description": "<prestation>", "quantity": <number>, "unit_price_ht": <number> }
  ],
  "amount_ht": <total HT>,
  "vat_rate": 8.5,
  "amount_ttc": <total TTC arrondi à 2 décimales>,
  "valid_until": "<YYYY-MM-DD = aujourd'hui+30j>",
  "notes": "<conditions/délais notables>"
}

Règles :
- TVA Martinique = 8.5%
- Prestations typiques : pré-prod, tournage (par jour), montage, étalonnage, motion design, sound design, droits musique, droits prestataires, livraison multi-formats
- Si le brief est vague, propose un devis "type" pour le format (ex: reel = 2200€ HT, capsule corpo = 3500€ HT, clip = 5000€ HT)
- Sois concret : 4-8 lignes max, pas de fluff
- Devis = brouillon, l'humain validera

GRILLE TARIFAIRE (réf) :
${(services || []).map((s: any) => `- ${s.label} : ${s.price_ht ?? "?"} € HT`).join("\n") || "(grille vide)"}
`;

    const userPayload = {
      title: proj.title,
      brief: proj.brief,
      shoot_date: proj.shoot_date,
      delivery_date: proj.delivery_date,
    };

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}: ${await claudeRes.text()}`);
    const cj = await claudeRes.json();
    const raw = cj?.content?.[0]?.text || "{}";
    const parsed = JSON.parse(extractJson(raw));

    const validUntil = parsed.valid_until ||
      new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

    const { data: q, error: qErr } = await supabase.from("quotes").insert({
      project_id,
      client_id: proj.client_id,
      direction: "out",
      label: parsed.label || proj.title,
      amount_ht: parsed.amount_ht,
      vat_rate: parsed.vat_rate ?? 8.5,
      amount_ttc: parsed.amount_ttc,
      status: "draft",
      issued_at: new Date().toISOString().slice(0, 10),
      valid_until: validUntil,
      notes: [
        parsed.notes,
        "",
        "Lignes générées automatiquement :",
        ...((parsed.lines || []).map((l: any) =>
          `• ${l.description} — ${l.quantity}× ${l.unit_price_ht}€ HT`
        )),
      ].filter(Boolean).join("\n"),
    }).select("id").single();

    if (qErr) throw qErr;

    // Tâche pour qu'Idriss valide
    await supabase.from("tasks").insert({
      project_id,
      title: `Valider devis auto-généré "${parsed.label}" (${parsed.amount_ttc}€ TTC)`,
      priority: "high",
      source: "auto",
      due_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10),
    });

    await supabase.from("mail_logs").insert({
      source: "auto-quote", action: "classify", ref_id: q.id, success: true,
      message: `quote ${q.id} for project ${project_id}: ${parsed.amount_ttc}€`,
      payload: parsed,
    });

    return json({ ok: true, quote_id: q.id, parsed });
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
