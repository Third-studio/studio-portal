// supabase/functions/attachment-ocr/index.ts
// OCR + extraction des PJ devis/facture reçues par mail.
// - Récupère le binaire via Gmail API
// - Envoie à Claude (vision/document) pour extraction structurée
// - Crée/met à jour invoices ou quotes draft
//
// Appelable :
//  - manuellement : { attachment_id }
//  - en batch (cron) : aucun body → traite les PJ kind_hint in (devis,facture) non encore traitées

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

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
    const body = await req.json().catch(() => ({}));
    const attachment_id = body.attachment_id as string | undefined;

    let targets: any[] = [];
    if (attachment_id) {
      const { data, error } = await supabase.from("email_attachments")
        .select("*, email:emails(gmail_id, project_id, from_addr, subject)")
        .eq("id", attachment_id).single();
      if (error || !data) return json({ error: "attachment not found" }, 404);
      targets = [data];
    } else {
      // Batch : PJ identifiées comme devis/facture, pas encore stockées
      const { data } = await supabase.from("email_attachments")
        .select("*, email:emails(gmail_id, project_id, from_addr, subject)")
        .in("kind_hint", ["devis", "facture"])
        .is("storage_path", null).limit(20);
      targets = data || [];
    }

    if (!targets.length) return json({ ok: true, processed: 0 });

    // Token Gmail (pour récupérer les binaires)
    const { data: integ } = await supabase.from("mail_integrations")
      .select("*").eq("provider", "gmail").eq("active", true).maybeSingle();
    if (!integ) return json({ error: "no gmail integration" }, 500);
    const accessToken = await ensureAccessToken(supabase, integ);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const result = { processed: 0, errors: [] as string[] };

    for (const att of targets) {
      try {
        if (!att.gmail_att_id || !att.email?.gmail_id) {
          result.errors.push(`att ${att.id}: missing gmail ids`); continue;
        }

        // Pull binary
        const binRes = await fetch(
          `${GMAIL_API}/messages/${att.email.gmail_id}/attachments/${att.gmail_att_id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!binRes.ok) throw new Error(`gmail att: ${binRes.status}`);
        const { data: dataB64 } = await binRes.json();
        if (!dataB64) throw new Error("empty data");

        // base64url → base64 standard
        const stdB64 = dataB64.replace(/-/g, "+").replace(/_/g, "/");

        // Claude vision/document
        const isPdf = (att.mime_type || "").includes("pdf");
        const isImg = (att.mime_type || "").startsWith("image/");
        if (!isPdf && !isImg) {
          result.errors.push(`att ${att.id}: unsupported mime ${att.mime_type}`); continue;
        }

        const claudeContent: any[] = [
          { type: "text", text: "Voici un document (devis ou facture). Extrais les informations structurées." },
          isPdf ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: stdB64 },
          } : {
            type: "image",
            source: { type: "base64", media_type: att.mime_type, data: stdB64 },
          },
        ];

        const claudeRes = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("CLAUDE_MODEL_VISION") || "claude-haiku-4-5-20251001",
            max_tokens: 1200,
            system: `Tu extrais un devis ou une facture en JSON strict (sans markdown).
Schéma :
{
  "kind": "devis" | "facture",
  "number": "<numéro|null>",
  "label": "<objet>",
  "issuer_name": "<émetteur|null>",
  "issuer_email": "<email|null>",
  "amount_ht": <number|null>,
  "vat_rate": <number|null>,
  "amount_ttc": <number|null>,
  "issued_at": "<YYYY-MM-DD|null>",
  "due_date": "<YYYY-MM-DD|null>",
  "lines_summary": "<résumé des lignes en 1 phrase>"
}`,
            messages: [{ role: "user", content: claudeContent }],
          }),
        });

        if (!claudeRes.ok) throw new Error(`claude ${claudeRes.status}: ${(await claudeRes.text()).slice(0, 200)}`);
        const cj = await claudeRes.json();
        const raw = cj?.content?.[0]?.text || "{}";
        const parsed = JSON.parse(extractJson(raw));

        const projectId = att.email?.project_id || null;
        const notes = `Extrait automatiquement du PDF "${att.filename}" (mail "${att.email?.subject}" de ${att.email?.from_addr}).
Lignes : ${parsed.lines_summary || "—"}`;

        if (parsed.kind === "facture") {
          await supabase.from("invoices").insert({
            project_id: projectId,
            number: parsed.number || null,
            label: parsed.label || att.filename,
            amount_ht: parsed.amount_ht,
            vat_rate: parsed.vat_rate ?? 8.5,
            amount_ttc: parsed.amount_ttc,
            status: "draft",
            issued_at: parsed.issued_at,
            due_date: parsed.due_date,
            notes,
          });
        } else {
          await supabase.from("quotes").insert({
            project_id: projectId,
            email_id: (att.email as any)?.id || null,
            attachment_id: att.id,
            direction: "in",
            number: parsed.number || null,
            label: parsed.label || att.filename,
            amount_ht: parsed.amount_ht,
            vat_rate: parsed.vat_rate ?? 8.5,
            amount_ttc: parsed.amount_ttc,
            status: "draft",
            issued_at: parsed.issued_at,
            valid_until: parsed.due_date,
            notes,
          });
        }

        // Marque la PJ comme traitée (storage_path placeholder)
        await supabase.from("email_attachments")
          .update({ storage_path: `ocr-processed://${att.id}` })
          .eq("id", att.id);

        result.processed++;
      } catch (e) {
        result.errors.push(`att ${att.id}: ${(e as Error).message}`);
      }
    }

    await supabase.from("mail_logs").insert({
      source: "attachment-ocr", action: "classify",
      success: result.errors.length === 0,
      message: `processed=${result.processed} errors=${result.errors.length}`,
      payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
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

function extractJson(s: string): string {
  const i = s.indexOf("{"); const j = s.lastIndexOf("}");
  return (i === -1 || j === -1) ? s : s.slice(i, j + 1);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
