// supabase/functions/notify-new-project/index.ts
// Notifie l'admin (idrissduleme@gmail.com) à la création d'un nouveau projet.
// Envoi via SMTP Hostinger (mêmes secrets que send-email).
//
// Auth : appel interne via X-Cron-Key (trigger DB) OU JWT d'un utilisateur connecté
//        (client ou admin). Le destinataire est figé → pas d'abus possible.
//
// Appel côté front :
//   supabase.functions.invoke("notify-new-project", { body: { project_id } })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFY_TO = "idrissduleme@gmail.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth : cron interne OU session utilisateur valide ──
    const cronKey = req.headers.get("X-Cron-Key");
    const isCron = cronKey && cronKey === Deno.env.get("CRON_SHARED_SECRET");
    if (!isCron) {
      const auth = req.headers.get("Authorization") || "";
      const jwt = auth.replace("Bearer ", "");
      if (!jwt) return json({ error: "Missing JWT" }, 401);
      const { data: u, error: ue } = await admin.auth.getUser(jwt);
      if (ue || !u?.user) return json({ error: "Invalid session" }, 401);
    }

    const body = await req.json().catch(() => null) as { project_id?: string } | null;
    const projectId = body?.project_id;
    if (!projectId) return json({ error: "Missing project_id" }, 400);

    const { data: project } = await admin
      .from("projects")
      .select("id,title,client_id,status,created_at,brief")
      .eq("id", projectId)
      .single();
    if (!project) return json({ error: "Project not found" }, 404);

    // Infos client (si rattaché)
    let clientName = "—", clientEmail = "—", clientType = "";
    if (project.client_id) {
      const { data: cli } = await admin
        .from("profiles")
        .select("nom,email,client_type")
        .eq("id", project.client_id)
        .single();
      if (cli) {
        clientName = cli.nom || "—";
        clientEmail = cli.email || "—";
        clientType = cli.client_type || "";
      }
    }

    const title = project.title || "Nouveau projet";
    const source = (project.brief && (project.brief as Record<string, unknown>).source) || null;
    const when = new Date(project.created_at || Date.now()).toLocaleString("fr-FR", {
      timeZone: "America/Martinique",
    });
    const link = "https://www.thirdone.studio";
    const subject = `🎬 Nouveau projet : ${title}`;

    const rows = [
      `Projet : ${title}`,
      project.client_id ? `Client : ${clientName} (${clientEmail})${clientType ? " · " + clientType : ""}` : "Client : — (créé en interne)",
      `Statut : ${project.status || "brief"}`,
      source ? `Source : ${source}` : null,
      `Créé le : ${when}`,
    ].filter(Boolean);

    const text =
`Un nouveau projet vient d'être créé sur la plateforme Third-One Studio.

${rows.join("\n")}

Ouvrir le back-office : ${link}

— Notification automatique Third-One Studio`;

    const html =
`<div style="font-family:Inter,Arial,sans-serif;color:#1D1D1F;max-width:560px;margin:0 auto;padding:24px">
  <div style="margin-bottom:18px">
    <strong style="font-family:Urbanist,Arial,sans-serif;font-size:20px;color:#162040">Third</strong><strong style="font-family:Urbanist,Arial,sans-serif;font-size:20px;color:#00B4D8">One</strong>
  </div>
  <p style="margin:0 0 6px;font-size:13px;color:#00B4D8;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Nouveau projet</p>
  <h1 style="font-family:Urbanist,Arial,sans-serif;font-size:22px;margin:0 0 16px;color:#1D1D1F">${title}</h1>
  <table style="border-collapse:collapse;font-size:14px;line-height:1.6;margin:0 0 18px">
    <tr><td style="color:#8E8E93;padding-right:14px">Client</td><td>${project.client_id ? `${clientName} &lt;${clientEmail}&gt;${clientType ? " · " + clientType : ""}` : "— (créé en interne)"}</td></tr>
    <tr><td style="color:#8E8E93;padding-right:14px">Statut</td><td>${project.status || "brief"}</td></tr>
    ${source ? `<tr><td style="color:#8E8E93;padding-right:14px">Source</td><td>${source}</td></tr>` : ""}
    <tr><td style="color:#8E8E93;padding-right:14px">Créé le</td><td>${when}</td></tr>
  </table>
  <p style="margin:18px 0 0">
    <a href="${link}" style="background:#00B4D8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block">Ouvrir le back-office</a>
  </p>
  <p style="margin:24px 0 0;font-size:12px;color:#8E8E93">Notification automatique · Third-One Studio</p>
</div>`;

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
    await client.send({
      from: `${fromName} <${fromUser}>`,
      to: [NOTIFY_TO],
      subject,
      content: text,
      html,
    });
    await client.close();

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
