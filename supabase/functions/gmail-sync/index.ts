// supabase/functions/gmail-sync/index.ts
// Poll Gmail (OAuth) → insère mails non-vus dans `emails` → déclenche mail-classify.
// Idempotent via gmail_id unique. Incrémental via history_id quand possible.
//
// Secrets requis :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   CRON_SHARED_SECRET   (header X-Cron-Key pour autoriser les appels cron sans JWT)
//
// Le refresh_token vit dans la table `mail_integrations` (provider='gmail').
// Cron suggéré (pg_cron) : toutes les 5 minutes.
//
// Appel manuel front (admin) : supabase.functions.invoke("gmail-sync")
// Appel cron : POST avec header X-Cron-Key.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth : soit JWT admin/collaborateur, soit header X-Cron-Key
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

  const result = { polled: 0, inserted: 0, classified: 0, errors: [] as string[] };

  try {
    const { data: integrations, error: intErr } = await supabase
      .from("mail_integrations")
      .select("*")
      .eq("provider", "gmail")
      .eq("active", true);

    if (intErr) throw intErr;
    if (!integrations?.length) {
      return json({ ok: true, message: "No active gmail integration", result });
    }

    for (const integ of integrations) {
      try {
        const accessToken = await ensureAccessToken(supabase, integ);
        const newMessages = await listNewMessages(accessToken, integ.last_sync_at);
        result.polled += newMessages.length;

        for (const msgMeta of newMessages) {
          const exists = await supabase
            .from("emails").select("id").eq("gmail_id", msgMeta.id).maybeSingle();
          if (exists.data) continue;

          const full = await fetchMessage(accessToken, msgMeta.id);
          const parsed = parseGmailMessage(full);

          const ins = await supabase.from("emails").insert({
            gmail_id: full.id,
            thread_id: full.threadId,
            direction: "in",
            from_addr: parsed.from_addr,
            from_name: parsed.from_name,
            to_addrs: parsed.to_addrs,
            cc_addrs: parsed.cc_addrs,
            subject: parsed.subject,
            snippet: full.snippet,
            body_text: parsed.body_text,
            body_html: parsed.body_html,
            has_attachments: parsed.attachments.length > 0,
            received_at: parsed.received_at,
          }).select("id").single();

          if (ins.error) { result.errors.push(`insert ${full.id}: ${ins.error.message}`); continue; }
          result.inserted++;

          if (parsed.attachments.length) {
            await supabase.from("email_attachments").insert(
              parsed.attachments.map((a) => ({
                email_id: ins.data.id,
                filename: a.filename,
                mime_type: a.mimeType,
                size_bytes: a.size,
                gmail_att_id: a.attachmentId,
                kind_hint: guessAttachmentKind(a.filename),
              }))
            );
          }

          // Déclenche classification (fire-and-forget, on log les erreurs sans bloquer)
          const classifyRes = await invokeClassify(supabase, ins.data.id);
          if (classifyRes.ok) result.classified++;
          else result.errors.push(`classify ${ins.data.id}: ${classifyRes.error}`);
        }

        await supabase.from("mail_integrations")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", integ.id);
      } catch (e) {
        const msg = (e as Error).message;
        result.errors.push(`integration ${integ.account_email}: ${msg}`);
        await supabase.from("mail_logs").insert({
          source: "gmail-sync", action: "error", success: false, message: msg,
        });
      }
    }

    await supabase.from("mail_logs").insert({
      source: "gmail-sync", action: "poll", success: result.errors.length === 0,
      message: `polled=${result.polled} inserted=${result.inserted} classified=${result.classified}`,
      payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "gmail-sync", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

// ─── helpers ──────────────────────────────────────────────────────────────────

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
  if (!r.ok) throw new Error(`token refresh failed: ${r.status} ${await r.text()}`);
  const tok = await r.json();
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 30) * 1000).toISOString();
  await supabase.from("mail_integrations").update({
    access_token: tok.access_token, expires_at: newExpiresAt,
  }).eq("id", integ.id);
  return tok.access_token;
}

async function listNewMessages(accessToken: string, lastSyncAt: string | null) {
  // Filtre Gmail : mails reçus depuis last_sync (à 1h près pour absorber les délais)
  const after = lastSyncAt
    ? Math.floor((new Date(lastSyncAt).getTime() - 3600_000) / 1000)
    : Math.floor((Date.now() - 7 * 24 * 3600_000) / 1000); // fallback : 7 jours
  const q = encodeURIComponent(`in:inbox after:${after}`);
  const url = `${GMAIL_API}/messages?q=${q}&maxResults=50`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(`list messages: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return data.messages || [];
}

async function fetchMessage(accessToken: string, id: string) {
  const r = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`fetch message: ${r.status}`);
  return await r.json();
}

function parseGmailMessage(msg: any) {
  const headers = (msg.payload?.headers || []) as { name: string; value: string }[];
  const H = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";

  const from = H("From");
  const fromMatch = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>\s]+@[^>\s]+)>?$/);
  const from_name = (fromMatch?.[1] || "").trim();
  const from_addr = (fromMatch?.[2] || from).trim();

  const splitAddrs = (s: string) => s
    ? s.split(",").map((p) => (p.match(/<([^>]+)>/)?.[1] || p).trim()).filter(Boolean)
    : [];

  const subject = H("Subject");
  const to_addrs = splitAddrs(H("To"));
  const cc_addrs = splitAddrs(H("Cc"));
  const received_at = msg.internalDate
    ? new Date(Number(msg.internalDate)).toISOString()
    : null;

  let body_text = "", body_html = "";
  const attachments: any[] = [];

  const walk = (part: any) => {
    if (!part) return;
    const mime = part.mimeType || "";
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: mime,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
      return;
    }
    if (mime === "text/plain" && part.body?.data) body_text += decodeB64(part.body.data);
    else if (mime === "text/html" && part.body?.data) body_html += decodeB64(part.body.data);
    if (Array.isArray(part.parts)) part.parts.forEach(walk);
  };
  walk(msg.payload);

  // Fallback : si pas de body_text, strip HTML
  if (!body_text && body_html) {
    body_text = body_html.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return { from_addr, from_name, to_addrs, cc_addrs, subject, body_text, body_html, received_at, attachments };
}

function decodeB64(data: string): string {
  try {
    const std = data.replace(/-/g, "+").replace(/_/g, "/");
    return new TextDecoder("utf-8").decode(
      Uint8Array.from(atob(std), (c) => c.charCodeAt(0))
    );
  } catch { return ""; }
}

function guessAttachmentKind(filename: string): string {
  const f = (filename || "").toLowerCase();
  if (/(devis|quote|estimate)/.test(f)) return "devis";
  if (/(facture|invoice|bill)/.test(f)) return "facture";
  if (/(brief|cdc|cahier)/.test(f)) return "brief";
  return "autre";
}

async function invokeClassify(supabase: any, emailId: string) {
  try {
    const { error } = await supabase.functions.invoke("mail-classify", { body: { email_id: emailId } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
