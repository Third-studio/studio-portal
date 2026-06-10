// supabase/functions/mail-classify/index.ts
// Classifie un email avec Claude Haiku 4.5 (coût/latence optimisés) :
//   - type (info / devis_in / facture_in / rdv / livrable / relance / spam / autre)
//   - projet associé (match sur titres existants)
//   - dates, montants, action items
// Puis met à jour `emails`, crée tasks/reminders, et drafts invoices/quotes le cas échéant.
//
// Secrets :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   ANTHROPIC_API_KEY
//   CLAUDE_MODEL (optionnel, défaut: claude-haiku-4-5-20251001)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { email_id } = (await req.json()) as { email_id: string };
    if (!email_id) return json({ error: "missing email_id" }, 400);

    const { data: email, error: emErr } = await supabase
      .from("emails").select("*").eq("id", email_id).single();
    if (emErr || !email) return json({ error: "email not found" }, 404);

    // Récupère les projets pour matching (admin sees all via service role)
    const { data: projects } = await supabase
      .from("projects").select("id, title").limit(200);
    const projectList = (projects || []).map((p: any) => `[${p.id}] ${p.title}`).join("\n");

    const userText = [
      `SUJET: ${email.subject || ""}`,
      `EXPÉDITEUR: ${email.from_name || ""} <${email.from_addr || ""}>`,
      `REÇU LE: ${email.received_at || ""}`,
      `--- CORPS ---`,
      (email.body_text || "").slice(0, 8000),
    ].join("\n");

    const systemPrompt = `Tu es l'assistant interne de Third-One Studio (production audiovisuelle, Martinique).
Tu reçois un email professionnel en français. Classifie-le et extrais les infos utiles.

Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks), avec ce schéma exact :
{
  "kind": "info" | "devis_in" | "facture_in" | "rdv" | "livrable" | "relance" | "spam" | "autre",
  "urgence": "low" | "normal" | "high" | "urgent",
  "project_id": <int|null>,            // ID parmi la liste fournie si le mail concerne un projet
  "contact_email": "<email|null>",
  "detected_amount": <number|null>,    // en euros si un montant TTC est mentionné
  "detected_date": "<YYYY-MM-DD|null>", // date clé (RDV, échéance, livraison)
  "summary_fr": "<résumé 1 phrase>",
  "action_items": [
    { "title": "<verbe à l'infinitif>", "due_date": "<YYYY-MM-DD|null>", "priority": "low|normal|high|urgent" }
  ],
  "reminders": [
    { "title": "<rappel court>", "remind_at": "<YYYY-MM-DDTHH:MM:SS+04:00>" }
  ],
  "calendar_event": null | { "title": "<...>", "start": "<ISO>", "end": "<ISO|null>", "location": "<|null>" }
}

Règles :
- Martinique = fuseau -04:00 (toujours).
- Si un devis ou une facture est joint/mentionné, mets kind="devis_in" ou "facture_in" et remplis detected_amount si possible.
- Crée des action_items concrètes (ex: "Rappeler client", "Envoyer storyboard", "Confirmer date tournage").
- Crée un calendar_event SEULEMENT s'il y a un RDV explicite (visio, tournage, livraison).
- Si tu hésites sur le projet, mets null. Ne devine pas.

PROJETS EXISTANTS :
${projectList || "(aucun)"}
`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY missing" }, 500);

    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("CLAUDE_MODEL") || DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userText }],
      }),
    });

    if (!claudeRes.ok) {
      const errTxt = await claudeRes.text();
      await supabase.from("mail_logs").insert({
        source: "mail-classify", action: "error", ref_id: email_id,
        success: false, message: `claude ${claudeRes.status}: ${errTxt.slice(0, 500)}`,
      });
      return json({ error: "claude failed", status: claudeRes.status }, 502);
    }

    const claudeJson = await claudeRes.json();
    const rawText = claudeJson?.content?.[0]?.text || "";
    let parsed: any;
    try { parsed = JSON.parse(extractJson(rawText)); }
    catch (e) {
      await supabase.from("mail_logs").insert({
        source: "mail-classify", action: "error", ref_id: email_id,
        success: false, message: `parse: ${(e as Error).message}`,
        payload: { raw: rawText.slice(0, 1000) },
      });
      return json({ error: "claude response not JSON", raw: rawText }, 502);
    }

    // Met à jour l'email avec la classification
    await supabase.from("emails").update({
      classified: true,
      classified_at: new Date().toISOString(),
      kind: parsed.kind,
      urgence: parsed.urgence,
      project_id: parsed.project_id || null,
      contact_email: parsed.contact_email || email.from_addr,
      detected_amount: parsed.detected_amount,
      detected_date: parsed.detected_date,
      summary_fr: parsed.summary_fr,
      action_items: parsed.action_items || [],
    }).eq("id", email_id);

    // Crée les tâches
    const tasksToInsert = (parsed.action_items || []).map((a: any) => ({
      project_id: parsed.project_id || null,
      email_id,
      title: a.title,
      due_date: a.due_date || null,
      priority: a.priority || "normal",
      source: "mail",
    }));
    if (tasksToInsert.length) await supabase.from("tasks").insert(tasksToInsert);

    // Crée les rappels
    const remindersToInsert = (parsed.reminders || []).map((r: any) => ({
      project_id: parsed.project_id || null,
      email_id,
      title: r.title,
      remind_at: r.remind_at,
    }));
    if (remindersToInsert.length) await supabase.from("reminders").insert(remindersToInsert);

    // Si calendar_event explicite, crée une task avec due_date (calendar-sync s'en chargera)
    if (parsed.calendar_event?.start) {
      await supabase.from("tasks").insert({
        project_id: parsed.project_id || null,
        email_id,
        title: parsed.calendar_event.title || "RDV",
        description: parsed.calendar_event.location || null,
        due_date: parsed.calendar_event.start.slice(0, 10),
        priority: "high",
        source: "mail",
      });
    }

    // Drafts invoices/quotes si détecté
    if (parsed.kind === "facture_in" && parsed.detected_amount) {
      await supabase.from("invoices").insert({
        project_id: parsed.project_id || null,
        label: email.subject || "Facture reçue",
        amount_ttc: parsed.detected_amount,
        amount_ht: Number((parsed.detected_amount / 1.085).toFixed(2)),
        status: "draft",
        notes: `Auto-extrait du mail "${email.subject}" reçu de ${email.from_addr}`,
        due_date: parsed.detected_date || null,
      });
    } else if (parsed.kind === "devis_in" && parsed.detected_amount) {
      await supabase.from("quotes").insert({
        project_id: parsed.project_id || null,
        email_id,
        direction: "in",
        label: email.subject || "Devis reçu",
        amount_ttc: parsed.detected_amount,
        amount_ht: Number((parsed.detected_amount / 1.085).toFixed(2)),
        status: "draft",
        valid_until: parsed.detected_date || null,
      });
    }

    await supabase.from("mail_logs").insert({
      source: "mail-classify", action: "classify", ref_id: email_id,
      success: true, message: `kind=${parsed.kind} project=${parsed.project_id ?? "-"} tasks=${tasksToInsert.length}`,
      payload: parsed,
    });

    return json({ ok: true, classification: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function extractJson(s: string): string {
  // Claude peut parfois ajouter du texte autour ; on isole le premier { ... }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return s;
  return s.slice(start, end + 1);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
