// supabase/functions/brief-from-email/index.ts
// Extrait un brief de production structuré à partir d'un email (table `emails`).
// Lecture seule : renvoie le JSON, la création du projet est faite côté front (AppMain)
// pour garder l'état synchronisé.
// Body: { email_id }
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

  // Auth : admin/collaborateur uniquement
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth" }, 401);
  const { data: u } = await supabase.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Invalid session" }, 401);
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
  if (prof?.role !== "admin" && prof?.role !== "collaborateur") return json({ error: "Forbidden" }, 403);

  try {
    const body = (await req.json()) as { email_id?: string; text?: string; subject?: string; from_name?: string; from_addr?: string };

    // Source : soit un email existant (Inbox), soit du texte collé.
    let email: { subject: string; from_name: string; from_addr: string; body_text: string; received_at: string };
    if (body.email_id) {
      const { data, error: emErr } = await supabase
        .from("emails").select("subject, from_name, from_addr, body_text, received_at").eq("id", body.email_id).single();
      if (emErr || !data) return json({ error: "email not found" }, 404);
      email = data as any;
    } else if (body.text && body.text.trim()) {
      email = { subject: body.subject || "", from_name: body.from_name || "", from_addr: body.from_addr || "", body_text: body.text, received_at: "" };
    } else {
      return json({ error: "missing email_id or text" }, 400);
    }

    const userText = [
      `SUJET: ${email.subject || ""}`,
      `EXPÉDITEUR: ${email.from_name || ""} <${email.from_addr || ""}>`,
      `REÇU LE: ${email.received_at || ""}`,
      `--- CORPS ---`,
      (email.body_text || "").slice(0, 8000),
    ].join("\n");

    const systemPrompt = `Tu es l'assistant de production de Third-One Studio (production audiovisuelle, Martinique).
À partir d'un email entrant d'un prospect/client, pré-remplis un BRIEF de production vidéo.
Déduis uniquement ce qui est présent ou raisonnablement implicite ; n'invente pas de chiffres précis.

Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks), schéma exact :
{
  "title": "<titre court et parlant du projet>",
  "objective": "<message principal / contexte, 1-3 phrases>",
  "target": "<public cible si mentionné, sinon ''>",
  "duration": "<durée souhaitée si mentionnée, sinon ''>",
  "tone": "<ton & ambiance si mentionnés, sinon ''>",
  "deliverables": "<livrables/formats souhaités si mentionnés, sinon ''>",
  "budget": "<budget approximatif si mentionné, sinon ''>",
  "deliveryWished": "<date de livraison souhaitée AAAA-MM-JJ si mentionnée, sinon ''>",
  "references": "<références/inspirations/liens si mentionnés, sinon ''>",
  "notes": "<autres précisions utiles, sinon ''>",
  "client": {
    "name": "<nom du contact / signataire, sinon ''>",
    "email": "<email du contact, défaut = expéditeur>",
    "company": "<nom de l'entreprise/organisation si identifiable, sinon ''>"
  }
}

Règles :
- Français. Champs absents = chaîne vide "" (jamais null), sauf l'objet client toujours présent.
- "title" : concis (ex: "Spot de lancement boutique", "Vidéo institutionnelle 2026").
- Martinique = fuseau -04:00 ; dates au format AAAA-MM-JJ.
- "client.email" : si non explicite dans le corps, utilise l'adresse de l'expéditeur.`;

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
      return json({ error: "claude failed", status: claudeRes.status, detail: errTxt.slice(0, 500) }, 502);
    }

    const claudeJson = await claudeRes.json();
    const rawText = claudeJson?.content?.[0]?.text || "";
    let parsed: any;
    try { parsed = JSON.parse(extractJson(rawText)); }
    catch { return json({ error: "claude response not JSON", raw: rawText }, 502); }

    // Garde-fous + défaut email expéditeur
    parsed.client = parsed.client || {};
    if (!parsed.client.email) parsed.client.email = email.from_addr || "";
    if (!parsed.client.name) parsed.client.name = email.from_name || "";

    return json({ ok: true, brief: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function extractJson(s: string): string {
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
