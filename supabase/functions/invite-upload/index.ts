// supabase/functions/invite-upload/index.ts
// Dépôt de fichiers depuis la page publique ?nouveau=TOKEN.
// Auth réelle = le token d'invitation (validé contre project_invites) ;
// le JWT anon ne sert qu'à passer le gateway. Retourne une URL signée
// d'upload vers le bucket privé client-uploads (52 Mo max, 20 fichiers/demande).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const sanitize = (name: string) =>
  name.normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "fichier";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => null) as
      { token?: string; project_id?: number; filename?: string; size?: number } | null;
    const token = (body?.token || "").slice(0, 128);
    const projectId = Number(body?.project_id);
    const filename = sanitize(String(body?.filename || ""));
    const size = Number(body?.size || 0);

    if (!token || !Number.isFinite(projectId)) return json({ ok: false, error: "Paramètres manquants" }, 400);
    if (size <= 0 || size > 52428800) return json({ ok: false, error: "Fichier trop volumineux (max 50 Mo)" }, 400);

    const { data: inv } = await admin.from("project_invites")
      .select("id,revoked_at").eq("token", token).single();
    if (!inv || inv.revoked_at) return json({ ok: false, error: "Lien invalide" }, 403);

    const { data: project } = await admin.from("projects")
      .select("id").eq("id", projectId).eq("invite_id", inv.id).single();
    if (!project) return json({ ok: false, error: "Projet introuvable" }, 403);

    const path = `${projectId}/${crypto.randomUUID()}-${filename}`;
    const { data, error } = await admin.storage.from("client-uploads").createSignedUploadUrl(path);
    if (error || !data) return json({ ok: false, error: "Erreur de préparation de l'upload" }, 500);

    return json({ ok: true, path, uploadToken: data.token, signedUrl: data.signedUrl });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
