// supabase/functions/send-whatsapp/index.ts
// Envoi WhatsApp via l'API Cloud de Meta (WhatsApp Business Platform).
// Réservé admin/collaborateur (JWT) ou appels internes DB (X-Cron-Key via call_edge).
//
// Secrets requis :
//   WHATSAPP_TOKEN     — jeton permanent de l'app Meta (System User)
//   WHATSAPP_PHONE_ID  — Phone Number ID de la ligne (PAS le numéro)
//   WHATSAPP_ADMIN_TO  — numéro E.164 d'Idriss (destinataire par défaut)
// Optionnels :
//   WHATSAPP_TEMPLATE  — nom d'un template approuvé par Meta (1 variable {{1}})
//   WHATSAPP_LANG      — langue du template (défaut : fr)
//
// ⚠ Règle WhatsApp : un message business → client hors fenêtre de 24h doit
// passer par un template pré-approuvé. Stratégie : texte libre d'abord, et si
// Meta refuse (hors fenêtre), bascule automatique sur le template s'il existe.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function graphSend(phoneId: string, token: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // ── Auth : clé interne (triggers DB) ou JWT équipe
    const cronKey = req.headers.get("X-Cron-Key");
    const isCron = cronKey && cronKey === Deno.env.get("CRON_SHARED_SECRET");
    if (!isCron) {
      const auth = req.headers.get("Authorization") || "";
      const jwt = auth.replace("Bearer ", "");
      if (!jwt) return json({ error: "Missing JWT" }, 401);
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: u } = await supabase.auth.getUser(jwt);
      if (!u?.user) return json({ error: "Invalid session" }, 401);
      const { data: profile } = await supabase.from("profiles")
        .select("role").eq("id", u.user.id).single();
      if (!["admin", "collaborateur"].includes(profile?.role ?? "")) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    if (!token || !phoneId) {
      // Infra pas encore branchée : no-op propre, les appelants n'échouent pas.
      return json({ ok: false, skipped: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID absents" });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").slice(0, 1500).trim();
    if (!text) return json({ error: "text required" }, 400);

    const to = String(body.to || Deno.env.get("WHATSAPP_ADMIN_TO") || "")
      .replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (!to || to.length < 8) return json({ error: "Destinataire invalide" }, 400);

    // 1. Texte libre (fenêtre de 24h ouverte, ou conversation existante)
    let r = await graphSend(phoneId, token, { to, type: "text", text: { body: text } });

    // 2. Hors fenêtre → template approuvé si configuré
    const template = Deno.env.get("WHATSAPP_TEMPLATE");
    if (!r.ok && template) {
      r = await graphSend(phoneId, token, {
        to,
        type: "template",
        template: {
          name: template,
          language: { code: Deno.env.get("WHATSAPP_LANG") || "fr" },
          components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 900) }] }],
        },
      });
    }

    if (!r.ok) {
      console.error("whatsapp error", r.status, JSON.stringify(r.data).slice(0, 400));
      return json({ ok: false, error: r.data?.error?.message || "Envoi refusé par Meta" }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("send-whatsapp", e);
    return json({ error: "Erreur interne" }, 500);
  }
});
