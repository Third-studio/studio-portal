// supabase/functions/review-upload/index.ts
// Dépôt d'une vidéo de relecture depuis l'espace monteur (/m/<token>), SANS session Supabase.
// Auth réelle = le jeton du lien monteur (team_members.access_token, non révoqué) + l'attribution au projet
// (project_assignments). Le navigateur compresse la vidéo (≤ 50 Mo), demande une URL signée, y envoie le
// fichier, puis demande la création de la version. La vidéo est servie par notre domaine
// (https://www.thirdone.studio/media/<chemin>, réécriture Vercel vers le bucket public « reviews ») car le
// pare-feu de certains clients bloque Dropbox.
//
// Contrat (le front s'y conforme) :
//   POST https://<SUPABASE_URL>/functions/v1/review-upload   (CORS *, OPTIONS ok)
//   En-têtes conseillés : apikey + Authorization: Bearer <clé anon> (ce que fait supabase.functions.invoke) :
//     l'appel passe alors que la vérification JWT de la passerelle soit active ou non.
//
//   1) { action: "sign", token, projectId, filename, size, mime? }
//      → 200 { ok:true, path, signedUrl, token: <uploadToken>, contentType, maxBytes, expiresInS }
//      Envoi du fichier : PUT signedUrl, corps = le Blob, en-têtes content-type: <contentType>,
//      cache-control: max-age=86400, x-upsert: false. (ou supabase.storage.from("reviews")
//      .uploadToSignedUrl(path, token, blob, { contentType })). Le bucket refuse > 50 Mo et tout type hors
//      video/mp4, video/quicktime, video/webm.
//   2) { action: "finalize", token, projectId, path, label, note?, fps?, durationS? }
//      → 200 { ok:true, already, version: { id, label, status, createdAt, createdBy, visibleClient, fps,
//              durationS, comments, openComments } }
//      Version créée avec visible_client = false, status 'a_valider', created_by = nom du membre,
//      video_url = https://www.thirdone.studio/media/<path>. Rejouable sans doublon (already:true).
//   Erreurs : { ok:false, reason, error, code } (reason = error = message en français), statuts :
//     400 invalid / too_big · 403 forbidden · 404 unknown_upload / missing_object · 409 archived / too_many
//     410 expired · 429 rate · 507 full · 500 server.
//
// Garde-fous (migration 20260919020000_review_upload.sql, fonctions SQL service role uniquement) :
//   10 envois signés par membre et par heure ; espace total du bucket plafonné (offre gratuite 1 Go) ;
//   le chemin est fabriqué ici (<projectId>/<uuid>-<nom nettoyé>.<ext>), jamais par le navigateur ;
//   finalize exige un envoi inscrit par CE membre pour CE projet, présent dans le bucket, non déjà utilisé.
//   Les envois signés jamais finalisés sont purgés au bout de 6 h (objet supprimé, puis ligne du journal).
//
// Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injectés).
// Déploiement : supabase functions deploy review-upload --no-verify-jwt --project-ref ytmflrwfapxaeryehgal

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "reviews";
const MAX_BYTES = 52428800; // 50 Mo, limite du bucket
const MAX_PER_HOUR = 10; // envois signés par membre et par heure
const MAX_BUCKET_BYTES = 1048576000; // 1 000 Mo : garde-fou sous le plafond de l'offre gratuite (1 Go)
const SIGNED_URL_TTL_S = 7200; // durée de vie d'une URL signée d'envoi (fixée par Supabase Storage)
const PURGE_AFTER_H = 6; // envois jamais finalisés : objet et ligne supprimés
const MAX_BODY_CHARS = 8000;

const EXT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};
const ALLOWED_MIME = ["video/mp4", "video/quicktime", "video/webm"];

const STATUS: Record<string, number> = {
  invalid: 400,
  too_big: 400,
  forbidden: 403,
  unknown_upload: 404,
  missing_object: 404,
  archived: 409,
  too_many: 409,
  expired: 410,
  rate: 429,
  full: 507,
  server: 500,
};

type Body = {
  action?: unknown; token?: unknown; projectId?: unknown; filename?: unknown; size?: unknown; mime?: unknown;
  path?: unknown; label?: unknown; note?: unknown; fps?: unknown; durationS?: unknown;
};
type SqlResult = { ok?: boolean; code?: string; reason?: string; id?: number; already?: boolean; version?: unknown };

// Supabase Edge Runtime : waitUntil garde l'isolat vivant jusqu'à la fin de la promesse.
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;
function background(p: Promise<unknown>) {
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) EdgeRuntime.waitUntil(p);
}

// Client privilégié (service role) : la RLS est contournée, aucun en-tête de l'appelant n'est repris.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Méthode non autorisée.", "invalid", 405);

  try {
    const raw = await req.text().catch(() => "");
    if (!raw || raw.length > MAX_BODY_CHARS) return fail("Requête invalide.", "invalid");
    let body: Body | null = null;
    try { body = JSON.parse(raw) as Body; } catch { body = null; }
    if (!body || typeof body !== "object") return fail("Requête invalide.", "invalid");

    const action = String(body.action ?? "");
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const projectId = toProjectId(body.projectId);
    if (!token || token.length > 200) return fail("Lien monteur manquant.", "forbidden");
    if (projectId === null) return fail("Projet manquant.", "invalid");

    if (action === "sign") return await sign(token, projectId, body);
    if (action === "finalize") return await finalize(token, projectId, body);
    return fail("Action inconnue.", "invalid");
  } catch (e) {
    console.error("review-upload error", (e as Error).message);
    return fail("Service momentanément indisponible. Réessayez dans un instant.", "server");
  }
});

/* ------------------------------- sign ------------------------------- */

async function sign(token: string, projectId: number, body: Body): Promise<Response> {
  const filename = typeof body.filename === "string" ? body.filename.slice(0, 300) : "";
  const size = Number(body.size);
  const mime = typeof body.mime === "string" ? body.mime.trim().toLowerCase().split(";")[0] : "";

  if (!Number.isInteger(size) || size < 1) return fail("Fichier vide ou taille inconnue.", "invalid");
  if (size > MAX_BYTES) return fail("Ce fichier dépasse 50 Mo. Laissez la page le compresser avant l'envoi.", "too_big");

  const ext = extOf(filename);
  if (!ext) return fail("Choisissez un fichier vidéo (.mp4, .mov ou .webm).", "invalid");
  const contentType = EXT_MIME[ext];
  // Le type annoncé est facultatif ; s'il est fourni, il doit être une vidéo acceptée par le bucket.
  if (mime && !ALLOWED_MIME.includes(mime)) return fail("Ce type de fichier n'est pas accepté (mp4, mov ou webm).", "invalid");

  const path = `${projectId}/${crypto.randomUUID()}-${cleanBase(filename)}.${ext}`;

  // Contrôle du lien + attribution + projet non archivé + limite de débit + garde-fou de stockage, puis
  // inscription de l'envoi : tout dans une seule transaction SQL, avant de signer quoi que ce soit.
  const { data, error } = await admin.rpc("review_upload_begin", {
    p_token: token,
    p_project: projectId,
    p_path: path,
    p_size: size,
    p_max_per_hour: MAX_PER_HOUR,
    p_max_bucket_bytes: MAX_BUCKET_BYTES,
  });
  if (error) {
    console.error("review-upload begin", error.message);
    return fail(deployHint(error.code) ?? "Préparation de l'envoi impossible. Réessayez dans un instant.", "server");
  }
  const r = (data ?? {}) as SqlResult;
  if (!r.ok) {
    if (r.code === "rate" || r.code === "full") console.warn("review-upload refus", r.code, "projet", projectId);
    return fail(r.reason || "Envoi refusé.", r.code || "forbidden");
  }

  const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data?.signedUrl) {
    console.error("review-upload createSignedUploadUrl", signed.error?.message);
    await forget(r.id); // un envoi qui n'a pas pu démarrer ne consomme pas le quota
    return fail("Préparation de l'envoi impossible. Réessayez dans un instant.", "server");
  }

  background(purgeStale());

  console.log("review-upload sign", "projet", projectId, "membre", (data as { memberId?: number }).memberId, `${Math.round(size / 1048576)} Mo`);
  return json({
    ok: true,
    path,
    signedUrl: signed.data.signedUrl,
    token: signed.data.token,
    contentType,
    maxBytes: MAX_BYTES,
    expiresInS: SIGNED_URL_TTL_S,
  });
}

/* ----------------------------- finalize ----------------------------- */

async function finalize(token: string, projectId: number, body: Body): Promise<Response> {
  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!path || path.length > 200 || !path.startsWith(`${projectId}/`) || /(^|\/)\.{1,2}(\/|$)|\/\/|\\|\s/.test(path)) {
    return fail("Ce fichier n'appartient pas à ce projet.", "invalid");
  }
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : "";
  if (!label) return fail("Donnez un nom à cette version (ex. V2 montage).", "invalid");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

  let fps = 25;
  if (body.fps !== undefined && body.fps !== null && body.fps !== "") {
    fps = Number(body.fps);
    if (!Number.isFinite(fps) || fps < 1 || fps > 120) return fail("Cadence d'images invalide.", "invalid");
  }
  let durationS: number | null = null;
  if (body.durationS !== undefined && body.durationS !== null && body.durationS !== "") {
    const d = Number(body.durationS);
    if (!Number.isFinite(d) || d < 0 || d > 86400) return fail("Durée invalide.", "invalid");
    durationS = d > 0 ? Math.round(d * 1000) / 1000 : null;
  }

  // La fonction SQL revérifie le lien et l'attribution, exige l'envoi inscrit par ce membre, contrôle la
  // présence de l'objet dans le bucket (storage.objects), puis crée la version : une seule transaction.
  const { data, error } = await admin.rpc("review_upload_finalize", {
    p_token: token,
    p_project: projectId,
    p_path: path,
    p_label: label,
    p_note: note || null,
    p_fps: fps,
    p_duration: durationS,
  });
  if (error) {
    console.error("review-upload finalize", error.message);
    return fail(deployHint(error.code) ?? "Version non créée. Réessayez dans un instant.", "server");
  }
  const r = (data ?? {}) as SqlResult;
  if (!r.ok) return fail(r.reason || "Version non créée.", r.code || "forbidden");

  console.log("review-upload finalize", "projet", projectId, r.already ? "(déjà créée)" : "");
  return json({ ok: true, already: !!r.already, version: r.version });
}

/* ----------------------------- Réponses ----------------------------- */

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
// reason (contrat de l'espace monteur) et error (convention des autres fonctions) portent le même message.
function fail(reason: string, code: string, status?: number) {
  return json({ ok: false, reason, error: reason, code }, status ?? STATUS[code] ?? 400);
}

// Migration pas encore appliquée : message clair plutôt qu'une erreur technique.
// PGRST202 : fonction absente du cache PostgREST ; 42883 / 42P01 : fonction ou table inexistante.
function deployHint(code: string | undefined): string | null {
  return code && ["PGRST202", "42883", "42P01"].includes(code)
    ? "Fonction en cours de déploiement. Réessayez plus tard ou collez un lien."
    : null;
}

/* ----------------------------- Entrées ------------------------------ */

function toProjectId(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,15}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function extOf(filename: string): string | null {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(filename.trim());
  const ext = m ? m[1].toLowerCase() : "";
  return ext in EXT_MIME ? ext : null;
}

// Même nettoyage que reviewStoragePath côté front : ASCII minuscule, tirets, 60 caractères, « video » par défaut.
function cleanBase(filename: string): string {
  const base = filename.trim().replace(/\.[A-Za-z0-9]{2,5}$/, "");
  return base.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "") || "video";
}

/* ----------------------------- Journal ------------------------------ */

async function forget(id: number | undefined) {
  if (typeof id !== "number") return;
  try { await admin.from("review_upload_log").delete().eq("id", id).is("finalized_at", null); } catch { /* sans effet */ }
}

// Envois signés jamais finalisés depuis plus de 6 h : on supprime l'objet éventuel, puis la ligne (seulement si
// la suppression a réussi, pour ne pas perdre la trace d'un orphelin). finalize refuse tout envoi de plus de
// 3 h : aucune version ne peut naître d'une ligne en cours de purge.
async function purgeStale() {
  try {
    const before = new Date(Date.now() - PURGE_AFTER_H * 3600_000).toISOString();
    const { data, error } = await admin.from("review_upload_log")
      .select("id,path").is("finalized_at", null).lt("created_at", before).limit(50);
    if (error || !data?.length) return;
    const rows = data as { id: number; path: string }[];
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(rows.map((x) => x.path));
    if (rmErr) { console.error("review-upload purge storage", rmErr.message); return; }
    await admin.from("review_upload_log").delete().in("id", rows.map((x) => x.id)).is("finalized_at", null);
    console.log("review-upload purge", rows.length);
  } catch (e) {
    console.error("review-upload purge", (e as Error).message);
  }
}
