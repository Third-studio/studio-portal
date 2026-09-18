// supabase/functions/auth-mail/index.ts
// Emails d'authentification de l'espace équipe (/studio), envoyés par SMTP Hostinger
// à la place des emails Supabase par défaut (qui n'arrivent pas).
// Les liens sont générés par l'API admin Supabase (auth.admin.generateLink) avec la
// clé service, puis envoyés avec les modules partagés mailer.ts + template.ts.
//
// Contrat (le front s'y conforme) :
//   POST https://<SUPABASE_URL>/functions/v1/auth-mail   (CORS *, OPTIONS ok)
//   Body JSON : { action: "recovery" | "magiclink" | "invite", email, redirectTo?, nom?, role? }
//   - recovery  : lien « nouveau mot de passe ». Sans JWT. Répond {ok:true} même si
//                 l'email est inconnu (aucune énumération), sauf rate limit. Envoyé seulement
//                 si un profil équipe actif (admin / collaborateur) existe : les clients n'ont
//                 pas de compte /studio et un accès désactivé ne reçoit rien.
//   - magiclink : lien de connexion sans mot de passe. Sans JWT. Même garde que recovery ;
//                 sinon {ok:true} silencieux, sans jamais appeler generateLink (qui créerait
//                 l'utilisateur).
//   - invite    : JWT d'un admin requis (Authorization: Bearer <access_token>). Crée
//                 l'utilisateur si absent (email confirmé), met à jour public.profiles
//                 (nom, role, is_active true) puis envoie un lien de connexion.
//   Rate limit (table public.auth_mail_log + fonction SQL auth_mail_try_log, service role
//     uniquement, verrou + comptage + insertion dans une seule transaction) :
//     3 envois par email et par heure, 20 par IP et par heure ; IP indéterminable →
//     plafond global 60 par heure. Dépassement → 429. Purge des lignes de plus de 7 jours
//     à chaque appel (pg_cron n'est pas installé sur le projet).
//   Réponses : 200 {ok:true} ; 4xx/5xx {ok:false, error:"message en français"}.
//   redirectTo : accepté seulement sous https://www.thirdone.studio, https://thirdone.studio
//     ou http://localhost:5173 ; sinon repli sur https://www.thirdone.studio/studio.
//   Lien envoyé : sur notre domaine, <redirectTo>/studio?token_hash=…&type=recovery|magiclink
//     (hashed_token de generateLink). Le front affiche « Continuer » puis verifyOtp au clic :
//     un scanner d'emails ne consomme pas le jeton et la liste Redirect URLs de Supabase
//     n'entre plus en jeu. Repli sur action_link si hashed_token est absent.
//   Temps de réponse (recovery / magiclink) : plancher MIN_RESPONSE_MS, envoi SMTP en
//     arrière-plan (EdgeRuntime.waitUntil) pour que la durée ne trahisse pas l'existence
//     du compte. invite (admin authentifié) attend l'envoi et remonte un échec SMTP.
//
// Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injectés) + SMTP_HOST, SMTP_PORT,
//           SMTP_USER, SMTP_PASS, FROM_NAME (les mêmes que send-email).
//
// Appel côté front : supabase.functions.invoke("auth-mail", { body })
//   (apikey ajoutée par le client ; pour invite, le JWT de session est ajouté automatiquement)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMail } from "../_shared/mailer.ts";
import { escapeHtml, renderEmail } from "../_shared/template.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "recovery" | "magiclink" | "invite";
type Role = "admin" | "collaborateur";
type Profile = { id: string; email: string | null; nom: string | null; role: string | null; is_active: boolean | null };
type Body = { action?: unknown; email?: unknown; redirectTo?: unknown; nom?: unknown; role?: unknown };
type Mail = { subject: string; html: string; text: string };

const ACTIONS: readonly string[] = ["recovery", "magiclink", "invite"];
const ROLES: readonly string[] = ["admin", "collaborateur"];
const ROLE_LABEL: Record<Role, string> = { admin: "administrateur", collaborateur: "collaborateur" };

const ALLOWED_ORIGINS = ["https://www.thirdone.studio", "https://thirdone.studio", "http://localhost:5173"];
const DEFAULT_REDIRECT = "https://www.thirdone.studio/studio";

// Fenêtre d'une heure, appliquée par la fonction SQL auth_mail_try_log.
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 20;
const MAX_GLOBAL = 60; // toutes IP confondues, quand l'IP est indéterminable
const RATE_LIMIT_MSG = "Trop de demandes, réessayez dans une heure";
// Temps de réponse plancher pour recovery / magiclink : email connu ou inconnu, même durée.
// L'envoi SMTP part en arrière-plan, la réponse tombe au plancher dans les deux cas.
const MIN_RESPONSE_MS = 1200;

// Supabase Edge Runtime : waitUntil garde l'isolat vivant jusqu'à la fin de la promesse.
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;
function background(p: Promise<unknown>) {
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) EdgeRuntime.waitUntil(p);
}

const BRAND = "Third One Studio";
const SITE_URL = "https://www.thirdone.studio";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALIDITY = "Ce lien est valable une heure et ne sert qu'une fois.";
const IGNORE = "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.";

// Un seul client privilégié, sans en-tête Authorization surchargé : la RLS est
// contournée (service role) et auth.admin.* fonctionne. Ne jamais copier le pattern
// de send-email (global.headers.Authorization = JWT appelant) ici.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Méthode non autorisée.", 405);

  const started = Date.now();
  let logId: number | null = null;

  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== "object") return fail("Requête invalide.", 400);

    const action = String(body.action ?? "");
    if (!ACTIONS.includes(action)) return fail("Action inconnue.", 400);

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return fail("Adresse email invalide.", 400);

    const redirectTo = safeRedirect(body.redirectTo);
    const ip = clientIp(req);

    // invite : champs propres + appelant admin actif (vérifié avant toute écriture)
    let nom = "";
    let role: Role = "collaborateur";
    let inviter: Profile | null = null;
    if (action === "invite") {
      nom = String(body.nom ?? "").trim().slice(0, 80);
      const roleRaw = body.role === undefined || body.role === null || body.role === "" ? "collaborateur" : String(body.role);
      if (!ROLES.includes(roleRaw)) return fail("Rôle inconnu.", 400);
      role = roleRaw as Role;

      const gate = await requireAdmin(req);
      if ("error" in gate) return fail(gate.error, gate.status);
      inviter = gate.profile;
    }

    // Rate limit : verrou + comptage + insertion dans une seule transaction SQL, avant tout
    // envoi, tentatives sur emails inconnus comprises.
    const attempt = await tryLog(email, ip, action as Action);
    if (attempt.limited) {
      console.warn("auth-mail rate limit", attempt.reason, action, mask(email), ip === "inconnue" ? "(ip inconnue)" : "");
      return fail(RATE_LIMIT_MSG, 429);
    }
    logId = attempt.id;

    let mail: Mail;

    if (action === "recovery" || action === "magiclink") {
      // Même garde pour les deux actions : seul un profil équipe actif reçoit un lien. Un
      // client (pas de compte /studio) ou un accès désactivé obtient la même réponse
      // {ok:true} au même moment : aucune énumération, et pas d'email « espace équipe »
      // envoyé à quelqu'un qui tomberait ensuite sur la porte « pas d'accès équipe ».
      if (!(await isTeamAccount(email))) { await pad(started); return ok(); }
      const r = await generateLink(action, email, redirectTo);
      if (r.notFound) { await pad(started); return ok(); }
      if (!r.link) { await forget(logId); return fail(r.error || "Lien non généré. Réessayez dans un instant.", 500); }
      mail = action === "recovery" ? recoveryMail(email, r.link) : magicMail(email, r.link);
    } else {
      // invite
      const existing = await findProfile(email);
      if (existing && inviter && existing.id === inviter.id && role !== "admin") {
        await forget(logId);
        return fail("Vous ne pouvez pas modifier votre propre rôle.", 400);
      }

      let userId = existing?.id ?? null;
      if (!userId) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { nom, role },
        });
        if (!error && data?.user) {
          userId = data.user.id;
        } else if (error && isEmailExists(error)) {
          // Utilisateur auth déjà présent sans profil (ou profil sous une autre casse)
          userId = await findAuthUserId(email);
        } else {
          console.error("auth-mail createUser", error?.message);
          await forget(logId);
          return fail("Impossible de créer le compte. Réessayez dans un instant.", 500);
        }
        if (!userId) {
          await forget(logId);
          return fail("Compte introuvable après création. Réessayez dans un instant.", 500);
        }
      }

      // Le trigger handle_new_user pose role 'client' + is_active false : on corrige ici.
      // upsert (et non update) : un utilisateur auth sans profil existe en prod.
      const patch: Record<string, unknown> = { id: userId, email, role, is_active: true };
      if (nom) patch.nom = nom;
      const { error: upErr } = await admin.from("profiles").upsert(patch, { onConflict: "id" });
      if (upErr) {
        console.error("auth-mail profiles upsert", upErr.message);
        await forget(logId);
        return fail("Impossible de mettre à jour le profil. Réessayez dans un instant.", 500);
      }

      const r = await generateLink("magiclink", email, redirectTo);
      if (!r.link) { await forget(logId); return fail(r.error || "Compte introuvable.", 500); }
      mail = inviteMail({ email, nom: nom || existing?.nom || "", role, link: r.link, inviter });
    }

    const send = sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });

    if (action === "invite") {
      // Appelant admin authentifié : on attend l'envoi et on remonte un échec SMTP.
      try {
        await send;
      } catch (e) {
        console.error("auth-mail smtp", action, (e as Error).message);
        await forget(logId);
        return fail("L'envoi de l'email a échoué. Réessayez dans quelques minutes.", 502);
      }
      console.log("auth-mail sent", action, mask(email), `${Date.now() - started}ms`);
      return ok();
    }

    // recovery / magiclink : la réponse part au plancher sans attendre la session SMTP
    // (connexion TLS, AUTH, DATA : 1,5 à 4 s, mesurables). L'envoi se termine en arrière-plan ;
    // un échec est journalisé et la ligne auth_mail_log est conservée.
    background(send.then(
      () => console.log("auth-mail sent", action, mask(email), `${Date.now() - started}ms`),
      (e) => console.error("auth-mail smtp", action, (e as Error).message),
    ));
    await pad(started);
    return ok();
  } catch (e) {
    console.error("auth-mail error", (e as Error).message);
    await forget(logId);
    return fail("Service momentanément indisponible. Réessayez dans un instant.", 500);
  }
});

/* ----------------------------- Réponses ----------------------------- */

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
const ok = () => json({ ok: true });
const fail = (error: string, status: number) => json({ ok: false, error }, status);

async function pad(started: number) {
  const rest = MIN_RESPONSE_MS - (Date.now() - started);
  if (rest > 0) await new Promise((r) => setTimeout(r, rest));
}

/* ----------------------------- Entrées ------------------------------ */

// redirectTo accepté seulement sous une origine autorisée (origine exacte suivie de
// "/", "?", "#" ou fin : "https://thirdone.studio.evil.com" est refusé). Sinon repli.
function safeRedirect(raw: unknown): string {
  const r = typeof raw === "string" ? raw.trim() : "";
  if (!r || r.length > 500 || /[\s<>"'\\]/.test(r)) return DEFAULT_REDIRECT;
  const okOrigin = ALLOWED_ORIGINS.some((o) =>
    r === o || r.startsWith(o + "/") || r.startsWith(o + "?") || r.startsWith(o + "#")
  );
  if (!okOrigin) {
    console.warn("auth-mail redirectTo refusé, repli sur défaut");
    return DEFAULT_REDIRECT;
  }
  return r;
}

// IP réelle : d'abord l'en-tête posé par l'infrastructure (Cloudflare devant les Edge Functions),
// puis la DERNIÈRE valeur de X-Forwarded-For (les proxys ajoutent l'IP réelle en fin de liste ;
// la première valeur est choisie par le client et permettait de contourner la limite par IP).
function clientIp(req: Request): string {
  const cf = (req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const parts = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length) return parts[parts.length - 1];
  return (req.headers.get("x-real-ip") || "").trim() || "inconnue";
}

const mask = (email: string) => {
  const [u, d] = email.split("@");
  return `${(u || "").slice(0, 2)}***@${d || ""}`;
};

/* --------------------------- Accès admin ---------------------------- */

async function requireAdmin(req: Request): Promise<{ profile: Profile } | { error: string; status: number }> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { error: "Connexion requise.", status: 401 };

  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return { error: "Session invalide ou expirée. Reconnectez-vous.", status: 401 };

  const { data: p, error: pErr } = await admin
    .from("profiles").select("id,email,nom,role,is_active").eq("id", data.user.id).maybeSingle();
  if (pErr) {
    console.error("auth-mail profil appelant", pErr.message);
    return { error: "Impossible de vérifier votre profil. Réessayez dans un instant.", status: 500 };
  }
  const profile = p as Profile | null;
  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    return { error: "Réservé aux administrateurs.", status: 403 };
  }
  return { profile };
}

/* ---------------------------- Rate limit ---------------------------- */

// Une seule requête : la fonction SQL auth_mail_try_log (security definer, exécutable par le
// service role seulement) prend un verrou consultatif, purge les lignes de plus de 7 jours,
// compte puis insère dans la même transaction. Un rafale de requêtes parallèles sur le même
// email ne passe plus toutes le comptage. IP indéterminable → plafond global MAX_GLOBAL au
// lieu de sauter la limite. Retour SQL : {ok:true,id} ou {ok:false,reason:'email'|'ip'|'global'}.
type TryLog = { limited: true; reason: string } | { limited: false; id: number | null };
async function tryLog(email: string, ip: string, action: Action): Promise<TryLog> {
  const { data, error } = await admin.rpc("auth_mail_try_log", {
    p_email: email,
    p_ip: ip,
    p_action: action,
    p_max_email: MAX_PER_EMAIL,
    p_max_ip: MAX_PER_IP,
    p_max_global: MAX_GLOBAL,
  });
  if (error) throw new Error("auth_mail_try_log : " + error.message);
  const r = (data ?? {}) as { ok?: boolean; id?: number; reason?: string };
  if (!r.ok) return { limited: true, reason: r.reason || "inconnue" };
  return { limited: false, id: typeof r.id === "number" ? r.id : null };
}

// Un envoi qui n'a pas abouti ne doit pas consommer le quota.
async function forget(id: number | null) {
  if (id == null) return;
  try { await admin.from("auth_mail_log").delete().eq("id", id); } catch { /* sans effet */ }
}

/* --------------------------- Utilisateurs --------------------------- */

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m);

// Profil équipe actif (admin / collaborateur, is_active différent de false) : seul cas où un
// lien recovery / magiclink est généré. Utilisé par les deux actions sans JWT.
async function isTeamAccount(email: string): Promise<boolean> {
  const profile = await findProfile(email);
  return !!profile && ROLES.includes(profile.role ?? "") && profile.is_active !== false;
}

async function findProfile(email: string): Promise<Profile | null> {
  const { data, error } = await admin.from("profiles")
    .select("id,email,nom,role,is_active")
    .ilike("email", likeEscape(email)).limit(2);
  if (error) throw new Error("profiles : " + error.message);
  const rows = (data ?? []) as Profile[];
  if (!rows.length) return null;
  return rows.find((p) => (p.email || "").toLowerCase() === email) ?? rows[0];
}

// supabase-js n'a pas de getUserByEmail : on parcourt listUsers (quelques dizaines de comptes).
async function findAuthUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error("auth-mail listUsers", error.message); return null; }
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

type GoTrueErr = { code?: string; status?: number; message?: string };
const isNotFound = (e: GoTrueErr) =>
  e.code === "user_not_found" || e.status === 404 || /user not found/i.test(e.message || "");
const isEmailExists = (e: GoTrueErr) =>
  e.code === "email_exists" || (e.status === 422 && /already|exist|registered/i.test(e.message || ""));

async function generateLink(
  type: "recovery" | "magiclink",
  email: string,
  redirectTo: string,
): Promise<{ link?: string; notFound?: boolean; error?: string }> {
  const params = type === "recovery"
    ? { type: "recovery" as const, email, options: { redirectTo } }
    : { type: "magiclink" as const, email, options: { redirectTo } };
  const { data, error } = await admin.auth.admin.generateLink(params);
  if (error) {
    if (isNotFound(error as GoTrueErr)) return { notFound: true };
    console.error("auth-mail generateLink", type, error.message);
    return { error: "Impossible de générer le lien. Réessayez dans un instant." };
  }
  const hashed = data?.properties?.hashed_token;
  if (hashed) return { link: studioLink(redirectTo, hashed, type) };
  // Repli : lien Supabase /auth/v1/verify à usage unique (consommable par un scanner d'emails,
  // et dépendant de la liste Redirect URLs du projet).
  const link = data?.properties?.action_link;
  if (!link) return { error: "Lien non généré. Réessayez dans un instant." };
  return { link };
}

// Lien sur notre domaine : <origine>/studio?token_hash=…&type=… . Le front (Studio.jsx) affiche
// « Continuer » et appelle verifyOtp au clic : un scanner d'emails (SafeLinks, antivirus, aperçu
// de lien) qui ouvre l'URL ne consomme pas le jeton, et Supabase n'a plus à rediriger.
function studioLink(redirectTo: string, tokenHash: string, type: "recovery" | "magiclink"): string {
  let u: URL;
  try { u = new URL(redirectTo); } catch { u = new URL(DEFAULT_REDIRECT); }
  if (!u.pathname.startsWith("/studio")) u.pathname = "/studio";
  u.hash = "";
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  return u.toString();
}

/* ------------------------------ Emails ------------------------------ */
// Sujets sans accent : mailer.ts translittère les sujets en ASCII (les accents du
// corps sont conservés, encodage base64).

const P = (s: string) => `<p style="margin:0 0 14px;">${escapeHtml(s)}</p>`;
const MUTED = (inner: string) =>
  `<p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:#8E8E93;">${inner}</p>`;
const SIGN =
  `<p style="margin:22px 0 0;">${BRAND}<br><a href="${SITE_URL}" style="color:#00A8CA;text-decoration:none;">thirdone.studio</a></p>`;

function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;">
    <tr><td bgcolor="#00B4D8" style="border-radius:10px;background:linear-gradient(180deg,#0BC2E6,#00A8CA);">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function fallbackLink(url: string) {
  return MUTED(
    `Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>` +
    `<a href="${escapeHtml(url)}" style="color:#00A8CA;word-break:break-all;">${escapeHtml(url)}</a>`,
  );
}

const textBody = (lines: string[]) => lines.join("\n\n") + `\n\n${BRAND}\n${SITE_URL}\n`;

function recoveryMail(email: string, link: string): Mail {
  const intro = `Vous avez demandé à changer le mot de passe du compte ${email} sur l'espace équipe ${BRAND}.`;
  const html = renderEmail({
    preheader: "Votre lien pour choisir un nouveau mot de passe, valable une heure.",
    kicker: BRAND,
    title: "Réinitialisez votre mot de passe",
    contentHtml:
      P("Bonjour,") + P(intro) +
      P("Cliquez sur le bouton pour choisir un nouveau mot de passe. " + VALIDITY) +
      button("Choisir un nouveau mot de passe", link) +
      fallbackLink(link) +
      P(IGNORE + " Votre mot de passe reste inchangé.") +
      SIGN,
    footerNote: "Email envoyé à votre demande",
  });
  const text = textBody([
    "Bonjour,",
    intro,
    `Choisissez un nouveau mot de passe en ouvrant ce lien (valable une heure, à usage unique) :\n${link}`,
    IGNORE + " Votre mot de passe reste inchangé.",
  ]);
  return { subject: "Votre lien pour changer de mot de passe", html, text };
}

function magicMail(email: string, link: string): Mail {
  const intro = `Voici votre lien pour ouvrir l'espace équipe ${BRAND} sans mot de passe, pour le compte ${email}.`;
  const html = renderEmail({
    preheader: "Votre lien de connexion sans mot de passe, valable une heure.",
    kicker: BRAND,
    title: "Votre lien de connexion",
    contentHtml:
      P("Bonjour,") + P(intro) +
      P("Ouvrez-le depuis l'appareil sur lequel vous souhaitez travailler. " + VALIDITY) +
      button("Me connecter", link) +
      fallbackLink(link) +
      P(IGNORE) +
      SIGN,
    footerNote: "Email envoyé à votre demande",
  });
  const text = textBody([
    "Bonjour,",
    intro,
    `Connectez-vous en ouvrant ce lien (valable une heure, à usage unique) :\n${link}`,
    IGNORE,
  ]);
  return { subject: "Votre lien de connexion", html, text };
}

function inviteMail({ email, nom, role, link, inviter }: {
  email: string; nom: string; role: Role; link: string; inviter: Profile | null;
}): Mail {
  const greeting = nom ? `Bonjour ${nom},` : "Bonjour,";
  const who = (inviter?.nom || "").trim();
  const intro = who
    ? `${who} vous invite à rejoindre l'espace équipe de ${BRAND} en tant que ${ROLE_LABEL[role]}.`
    : `Vous êtes invité à rejoindre l'espace équipe de ${BRAND} en tant que ${ROLE_LABEL[role]}.`;
  const after = `Vous pourrez ensuite définir un mot de passe depuis le menu Mot de passe, pour vos prochaines connexions avec l'adresse ${email}.`;
  const ignore = "Si vous n'attendiez pas cette invitation, ignorez cet email.";
  const html = renderEmail({
    preheader: `Votre accès à l'espace équipe ${BRAND}, valable une heure.`,
    kicker: BRAND,
    title: `Vous êtes invité sur ${BRAND}`,
    contentHtml:
      P(greeting) + P(intro) +
      P("Cliquez sur le bouton pour ouvrir votre espace. " + VALIDITY) +
      button("Ouvrir mon espace", link) +
      P(after) +
      fallbackLink(link) +
      P(ignore) +
      SIGN,
    footerNote: "Invitation envoyée par un administrateur",
  });
  const text = textBody([
    greeting,
    intro,
    `Ouvrez votre espace avec ce lien (valable une heure, à usage unique) :\n${link}`,
    after,
    ignore,
  ]);
  return { subject: `Votre invitation ${BRAND}`, html, text };
}
