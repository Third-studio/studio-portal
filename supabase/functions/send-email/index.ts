// supabase/functions/send-email/index.ts
// Envoi d'emails transactionnels via SMTP Hostinger.
// Réservé admin/collaborateur (vérif JWT) ou cron interne (X-Cron-Key).
//
// Secrets requis : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_NAME
//
// Appel :
//   supabase.functions.invoke("send-email", { body: {
//     to, subject,
//     text?,                    // texte brut (converti en HTML stylé si pas de html)
//     html?,                    // fragment HTML (habillé dans le template de marque)
//     kicker?, title?,          // sur-titre et titre de la carte
//     cta?: { label, url },     // bouton d'action
//     wrap?: false,             // true par défaut — false = envoyer html tel quel
//     replyTo?
//   }})

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMail } from "../_shared/mailer.ts";
import { renderEmail, nl2html } from "../_shared/template.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    // Bypass JWT si appel cron interne avec clé partagée
    const cronKey = req.headers.get("X-Cron-Key");
    const isCron = cronKey && cronKey === Deno.env.get("CRON_SHARED_SECRET");

    if (!isCron) {
      const auth = req.headers.get("Authorization") || "";
      const jwt = auth.replace("Bearer ", "");
      if (!jwt) return json({ error: "Missing JWT" }, 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { global: { headers: { Authorization: auth } } }
      );

      const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
      if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", userData.user.id).single();
      const role = profile?.role;
      if (role !== "admin" && role !== "collaborateur") {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);
    const { to, subject, html, text, replyTo, kicker, title, cta, wrap } = body as {
      to: string | string[]; subject: string; html?: string; text?: string; replyTo?: string;
      kicker?: string; title?: string; cta?: { label: string; url: string }; wrap?: boolean;
    };
    if (!to || !subject || (!html && !text)) {
      return json({ error: "Missing fields: to, subject, html|text" }, 400);
    }

    // Habillage dans le template de marque (sauf wrap:false)
    const finalHtml = wrap === false && html
      ? html
      : renderEmail({
          preheader: (text || "").slice(0, 110),
          kicker: kicker || "Third-One Studio",
          title: title ?? subject,
          contentHtml: html || nl2html(text || ""),
          cta,
        });

    await sendMail({ to, subject, html: finalHtml, text, replyTo });

    return json({ ok: true });
  } catch (e) {
    console.error("send-email error", e);
    return json({ error: (e as Error).message || "unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
