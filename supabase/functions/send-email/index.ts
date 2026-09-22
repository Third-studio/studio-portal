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
//     replyTo?,
//     project_id?, link_id?, kind?   // rattachement du journal de suivi
//   }})
//
// Suivi : si un destinataire n'est pas un membre de l'équipe (admin/collaborateur), l'email est
// enregistré dans email_log, reçoit un pixel d'ouverture et son bouton passe par un lien suivi
// (www.thirdone.studio/t/o|c/<id> → fonction mail-track).

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
    const { to, subject, html, text, replyTo, kicker, title, cta, wrap, project_id, link_id, kind } = body as {
      to: string | string[]; subject: string; html?: string; text?: string; replyTo?: string;
      kicker?: string; title?: string; cta?: { label: string; url: string }; wrap?: boolean;
      project_id?: number; link_id?: string; kind?: string;
    };
    if (!to || !subject || (!html && !text)) {
      return json({ error: "Missing fields: to, subject, html|text" }, 400);
    }

    // Suivi des emails partis vers l'extérieur de l'équipe
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const recipients = (Array.isArray(to) ? to : String(to).split(",")).map((x) => String(x).trim()).filter(Boolean);
    let logId: string | null = null;
    try {
      const { data: team } = await admin.from("profiles").select("email").in("role", ["admin", "collaborateur"]);
      const teamSet = new Set((team || []).map((t: { email: string | null }) => (t.email || "").toLowerCase()));
      if (recipients.some((r) => !teamSet.has(r.toLowerCase()))) {
        const { data: row } = await admin.from("email_log").insert({
          recipients, subject: String(subject).slice(0, 300), kind: kind || null, cta_url: cta?.url || null,
          project_id: project_id || null, link_id: link_id || null,
        }).select("id").single();
        logId = row?.id || null;
      }
    } catch (e) { console.error("email_log", e); }
    const TRACK = "https://www.thirdone.studio/t";
    const trackedCta = logId && cta?.url ? { ...cta, url: `${TRACK}/c/${logId}` } : cta;

    // Habillage dans le template de marque (sauf wrap:false)
    let finalHtml = wrap === false && html
      ? html
      : renderEmail({
          preheader: (text || "").slice(0, 110),
          kicker: kicker || "Third-One Studio",
          title: title ?? subject,
          contentHtml: html || nl2html(text || ""),
          cta: trackedCta,
        });
    if (logId) {
      const pixel = `<img src="${TRACK}/o/${logId}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
      finalHtml = finalHtml.includes("</body>") ? finalHtml.replace("</body>", pixel + "</body>") : finalHtml + pixel;
    }

    try {
      await sendMail({ to, subject, html: finalHtml, text, replyTo });
    } catch (e) {
      if (logId) await admin.from("email_log").update({ status: "echec", error: String((e as Error).message || e).slice(0, 300) }).eq("id", logId);
      throw e;
    }

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
