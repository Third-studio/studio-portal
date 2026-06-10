// supabase/functions/send-email/index.ts
// Envoi d'emails transactionnels via SMTP Hostinger.
// Réservé admin/collaborateur (vérif JWT côté Supabase + check rôle).
//
// Secrets requis (supabase secrets set ...) :
//   SMTP_HOST   smtp.hostinger.com
//   SMTP_PORT   465
//   SMTP_USER   contact@thirdone.studio
//   SMTP_PASS   <mot de passe applicatif>
//   FROM_NAME   Third-One Studio
//
// Appel côté front :
//   supabase.functions.invoke("send-email", { body: { to, subject, html, text } })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { to, subject, html, text, replyTo } = body as {
      to: string | string[]; subject: string; html?: string; text?: string; replyTo?: string;
    };
    if (!to || !subject || (!html && !text)) {
      return json({ error: "Missing fields: to, subject, html|text" }, 400);
    }

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.hostinger.com",
        port: Number(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    const fromName = Deno.env.get("FROM_NAME") || "Third-One Studio";
    const fromUser = Deno.env.get("SMTP_USER")!;
    const recipients = Array.isArray(to) ? to : [to];

    await client.send({
      from: `${fromName} <${fromUser}>`,
      to: recipients,
      replyTo: replyTo || fromUser,
      subject,
      content: text || "Voir version HTML.",
      html: html || undefined,
    });
    await client.close();

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
