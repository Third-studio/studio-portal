import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — écran d'accès ThirdOne Studio
// Desktop : panneau de marque (gauche) + formulaire (droite)
// Mobile  : en-tête compact + formulaire pleine largeur
// ─────────────────────────────────────────────────────────────────────────────

const S = `
  .lg-root { min-height:100vh; min-height:100dvh; display:grid; grid-template-columns:minmax(0,46fr) minmax(0,54fr); background:#FFFFFF; font-family:'Inter',sans-serif; color:#1D1D1F; }
  .lg-brand { position:relative; overflow:hidden; background:#0E1730; color:#FFFFFF; display:flex; flex-direction:column; justify-content:space-between; padding:clamp(28px,4vw,56px); isolation:isolate; }
  .lg-brand::before { content:''; position:absolute; inset:0; z-index:-2;
    background:
      radial-gradient(60% 50% at 15% 20%, rgba(0,180,216,0.55) 0%, rgba(0,180,216,0) 70%),
      radial-gradient(50% 45% at 85% 85%, rgba(61,208,237,0.35) 0%, rgba(61,208,237,0) 70%),
      radial-gradient(40% 40% at 70% 10%, rgba(123,156,255,0.22) 0%, rgba(123,156,255,0) 70%),
      linear-gradient(160deg,#111C3A 0%,#0B1328 60%,#070D1E 100%); }
  .lg-brand::after { content:''; position:absolute; inset:0; z-index:-1; opacity:.35; pointer-events:none;
    background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);
    background-size:44px 44px; -webkit-mask-image:radial-gradient(80% 80% at 50% 50%,#000 30%,transparent 100%); mask-image:radial-gradient(80% 80% at 50% 50%,#000 30%,transparent 100%); }
  .lg-orb { position:absolute; border-radius:50%; filter:blur(60px); opacity:.55; z-index:-1; pointer-events:none; animation:lgFloat 18s ease-in-out infinite; }
  .lg-orb.a { width:360px; height:360px; left:-120px; top:-80px; background:#00B4D8; }
  .lg-orb.b { width:300px; height:300px; right:-100px; bottom:-60px; background:#3DD0ED; animation-delay:-9s; animation-duration:22s; }
  @keyframes lgFloat { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(30px,-24px,0) scale(1.08)} }

  .lg-wordmark { font-family:'Urbanist',sans-serif; font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1; display:inline-flex; align-items:center; gap:10px; }
  .lg-wordmark span.one { color:#3DD0ED; }
  .lg-mark { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#3DD0ED,#0096BC); display:inline-flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#FFFFFF; box-shadow:0 8px 20px rgba(0,180,216,0.35), inset 0 1px 0 rgba(255,255,255,0.35); }
  .lg-eyebrow { display:inline-flex; align-items:center; gap:8px; font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,0.62); }
  .lg-eyebrow::before { content:''; width:22px; height:1px; background:rgba(255,255,255,0.35); }
  .lg-h1 { font-family:'Urbanist',sans-serif; font-weight:800; font-size:clamp(30px,3.4vw,46px); line-height:1.06; letter-spacing:-0.03em; margin:18px 0 18px; max-width:15ch; }
  .lg-h1 em { font-style:normal; color:#3DD0ED; }
  .lg-lead { font-size:15px; line-height:1.65; color:rgba(255,255,255,0.68); max-width:44ch; }
  .lg-points { list-style:none; margin:32px 0 0; padding:0; display:grid; gap:12px; }
  .lg-points li { display:flex; align-items:flex-start; gap:12px; font-size:14px; color:rgba(255,255,255,0.86); }
  .lg-points svg { flex-shrink:0; margin-top:1px; }
  .lg-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px; color:rgba(255,255,255,0.45); flex-wrap:wrap; }
  .lg-foot b { color:rgba(255,255,255,0.8); font-weight:600; }

  .lg-form { display:flex; align-items:center; justify-content:center; padding:clamp(24px,5vw,64px) clamp(18px,5vw,64px); background:#FFFFFF;
    background-image:radial-gradient(ellipse at 100% 0%, rgba(0,180,216,0.06) 0%, transparent 55%); }
  .lg-card { width:100%; max-width:420px; animation:lgIn .5s cubic-bezier(.16,1,.3,1) both; }
  @keyframes lgIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .lg-title { font-family:'Urbanist',sans-serif; font-weight:800; font-size:28px; letter-spacing:-0.025em; color:#162040; line-height:1.15; }
  .lg-sub { color:#6E6E73; font-size:14px; margin-top:6px; line-height:1.5; }

  .lg-seg { position:relative; display:grid; grid-template-columns:1fr 1fr; background:#F2F2F7; padding:4px; border-radius:12px; margin:26px 0 22px; }
  .lg-seg .pill { position:absolute; top:4px; bottom:4px; left:4px; width:calc(50% - 4px); background:#FFFFFF; border-radius:9px; box-shadow:0 1px 2px rgba(16,24,40,0.08), 0 2px 8px rgba(16,24,40,0.08); transition:transform .28s cubic-bezier(.16,1,.3,1); }
  .lg-seg .pill.right { transform:translateX(100%); }
  .lg-seg button { position:relative; z-index:1; background:transparent; border:none; padding:9px 0; border-radius:9px; cursor:pointer; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; color:#8E8E93; transition:color .2s; }
  .lg-seg button.on { color:#162040; }

  .lg-field { display:flex; flex-direction:column; gap:7px; }
  .lg-label { font-size:12px; font-weight:600; color:#3F3F46; letter-spacing:.01em; display:flex; justify-content:space-between; align-items:center; }
  .lg-label a, .lg-link { color:#0077B6; font-weight:600; text-decoration:none; cursor:pointer; background:none; border:none; font-family:'Inter',sans-serif; font-size:12px; padding:0; }
  .lg-link:hover, .lg-label a:hover { text-decoration:underline; }
  .lg-inwrap { position:relative; }
  .li { width:100%; height:46px; background:#F7F7F9; border:1.5px solid #E5E5EA; border-radius:11px; padding:0 14px; color:#1D1D1F; font-size:15px; font-family:'Inter',sans-serif; outline:none; box-sizing:border-box; transition:border-color .18s, box-shadow .18s, background .18s; -webkit-appearance:none; appearance:none; }
  .li.has-btn { padding-right:46px; }
  .li:hover { border-color:#D1D1D6; }
  .li:focus { border-color:#0077B6; background:#FFFFFF; box-shadow:0 0 0 4px rgba(0,180,216,0.14); }
  .li::placeholder { color:#B4B4BA; }
  .li.err { border-color:#FF3B30; }
  .lg-eye { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:8px; border:none; background:transparent; color:#8E8E93; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:color .15s, background .15s; }
  .lg-eye:hover { color:#1D1D1F; background:rgba(0,0,0,0.05); }

  .lg-strength { display:flex; gap:4px; margin-top:2px; }
  .lg-strength i { flex:1; height:3px; border-radius:2px; background:#E5E5EA; transition:background .25s; }
  .lg-strength.s1 i:nth-child(-n+1){background:#FF3B30}
  .lg-strength.s2 i:nth-child(-n+2){background:#FF9F43}
  .lg-strength.s3 i:nth-child(-n+3){background:#34C759}
  .lg-strength.s4 i{background:#0FA968}
  .lg-hint { font-size:11px; color:#8E8E93; margin-top:4px; }

  .lg-btn { width:100%; height:48px; border:none; border-radius:12px; font-family:'Inter',sans-serif; font-size:14px; font-weight:700; letter-spacing:.01em; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:transform .15s, box-shadow .2s, background .2s, opacity .2s; }
  .lg-btn.primary { color:#FFFFFF; background:linear-gradient(180deg,#0096C7,#0077B6); box-shadow:0 1px 2px rgba(0,119,182,0.4), 0 8px 22px rgba(0,180,216,0.28), inset 0 1px 0 rgba(255,255,255,0.22); }
  .lg-btn.primary:hover:not(:disabled) { transform:translateY(-1px); background:linear-gradient(180deg,#0088B8,#026CA6); box-shadow:0 2px 4px rgba(0,119,182,0.4), 0 12px 28px rgba(0,180,216,0.34), inset 0 1px 0 rgba(255,255,255,0.22); }
  .lg-btn.primary:active:not(:disabled) { transform:translateY(0) scale(.99); }
  .lg-btn:disabled { cursor:not-allowed; opacity:.55; box-shadow:none; }
  .lg-btn.ghost { background:#FFFFFF; color:#162040; border:1.5px solid #E5E5EA; }
  .lg-btn.ghost:hover:not(:disabled) { border-color:#0077B6; color:#0077B6; }
  .lg-spin { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,0.35); border-top-color:#FFFFFF; animation:lgSpin .7s linear infinite; }
  @keyframes lgSpin { to{transform:rotate(360deg)} }

  .lg-alert { display:flex; gap:10px; align-items:flex-start; padding:11px 13px; border-radius:11px; font-size:13px; line-height:1.5; animation:lgIn .25s ease both; }
  .lg-alert svg { flex-shrink:0; margin-top:1px; }
  .lg-alert.error { background:#FFF1F0; border:1px solid #FFD0CC; color:#B3261E; }
  .lg-alert.info  { background:#EEF8FB; border:1px solid #BFE9F3; color:#0B5E7A; }
  .lg-alert.ok    { background:#EEFBF3; border:1px solid #BFEACF; color:#166534; }
  .lg-alert .act { margin-left:auto; white-space:nowrap; }

  .lg-done { text-align:center; padding:10px 0 4px; animation:lgIn .35s cubic-bezier(.16,1,.3,1) both; }
  .lg-done .ico { width:64px; height:64px; border-radius:20px; margin:0 auto 18px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,rgba(61,208,237,0.18),rgba(0,150,188,0.18)); color:#0077B6; }
  .lg-done h2 { font-family:'Urbanist',sans-serif; font-weight:800; font-size:24px; color:#162040; letter-spacing:-0.02em; margin-bottom:8px; }
  .lg-done p { color:#6E6E73; font-size:14px; line-height:1.65; }
  .lg-done b { color:#1D1D1F; font-weight:600; }

  .lg-legal { text-align:center; margin-top:26px; font-size:11.5px; color:#A1A1A6; line-height:1.6; }
  .lg-mobile-head { display:none; }

  @media (max-width:880px) {
    .lg-root { grid-template-columns:1fr; }
    .lg-brand { display:none; }
    .lg-mobile-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:18px 20px 0; }
    .lg-mobile-head .lg-wordmark { color:#162040; font-size:22px; }
    .lg-mobile-head .lg-wordmark span.one { color:#0077B6; }
    .lg-mobile-head .tag { font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:#8E8E93; font-weight:600; }
    .lg-form { align-items:flex-start; padding:26px 20px 40px; }
    .lg-title { font-size:26px; }
    .li { height:48px; font-size:16px; } /* 16px : évite le zoom auto iOS */
    .lg-btn { height:50px; }
  }
  @media (prefers-reduced-motion:reduce) { .lg-orb, .lg-card, .lg-alert, .lg-done { animation:none !important; } .lg-seg .pill { transition:none; } }
`;

// ── Traduction des erreurs Supabase en messages utiles ─────────────────────
function humanError(err) {
  const m = (err?.message || String(err || "")).toLowerCase();
  const status = err?.status;
  if (!m && !status) return "Une erreur est survenue. Réessayez.";
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Votre email n'est pas encore confirmé. Ouvrez le lien reçu par email.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user_already_exists")) return "Un compte existe déjà avec cet email.";
  if (m.includes("rate limit") || m.includes("too many") || status === 429) return "Trop de tentatives. Patientez une minute avant de réessayer.";
  if (m.includes("password should be") || m.includes("weak_password")) return "Mot de passe trop faible : 6 caractères minimum.";
  if (m.includes("invalid format") || m.includes("validate email")) return "Adresse email invalide.";
  if (m.includes("signups not allowed") || m.includes("signup_disabled")) return "Les inscriptions sont fermées pour le moment. Contactez-nous.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed") || status >= 500 || status === 0) return "Service momentanément indisponible. Réessayez dans quelques instants.";
  if (m.includes("same password") || m.includes("different from the old")) return "Le nouveau mot de passe doit être différent de l'ancien.";
  return err?.message || "Une erreur est survenue. Réessayez.";
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
const strength = (p) => { if (!p) return 0; let s = 0; if (p.length >= 6) s++; if (p.length >= 10) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); };

// ── Icônes ─────────────────────────────────────────────────────────────────
const IcoCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DD0ED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" stroke="rgba(61,208,237,0.35)"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>;
const IcoEye = ({ off }) => off
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-3 4.2"/><path d="M6.6 6.6A16.5 16.5 0 0 0 2 12s3 8 10 8a10.9 10.9 0 0 0 5.4-1.4"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/><path d="m2 2 20 20"/></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
const IcoMail = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 7L2 7"/></svg>;
const IcoSpark = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4"/><path d="M17 19h4"/></svg>;
const IcoLock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;

const Alert = ({ kind = "error", children, action }) => (
  <div className={`lg-alert ${kind}`} role={kind === "error" ? "alert" : "status"}>
    <IcoAlert /><span>{children}</span>{action && <span className="act">{action}</span>}
  </div>
);

const PasswordInput = ({ value, onChange, placeholder, autoComplete, onEnter, invalid, id }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="lg-inwrap">
      <input id={id} type={show ? "text" : "password"} className={`li has-btn${invalid ? " err" : ""}`} placeholder={placeholder} value={value} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onEnter && onEnter()} />
      <button type="button" className="lg-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} tabIndex={-1}><IcoEye off={show} /></button>
    </div>
  );
};

const Brand = () => (
  <aside className="lg-brand" aria-hidden="true">
    <span className="lg-orb a" /><span className="lg-orb b" />
    <div className="lg-wordmark"><span className="lg-mark">31</span><span>Third<span className="one">One</span></span></div>
    <div>
      <span className="lg-eyebrow">Production audiovisuelle · Martinique</span>
      <h1 className="lg-h1">Votre projet, <em>du brief à la livraison.</em></h1>
      <p className="lg-lead">Un espace unique pour suivre l'avancement, valider les storyboards et récupérer vos livrables — en toute clarté.</p>
      <ul className="lg-points">
        <li><IcoCheck />Suivi de projet en temps réel, étape par étape</li>
        <li><IcoCheck />Validation des storyboards et des versions vidéo</li>
        <li><IcoCheck />Réservation des tournages et planning partagé</li>
      </ul>
    </div>
    <div className="lg-foot"><span><b>Third-One Studio</b> · Fort-de-France</span><span>Clarté cinématique &amp; confiance digitale</span></div>
  </aside>
);

export default function Login({ onLogin, recovery = false, onRecoveryDone }) {
  const inviteEmail = (() => { try { return new URLSearchParams(window.location.search).get("invite") || ""; } catch { return ""; } })();
  const [mode, setMode] = useState(recovery ? "recovery" : inviteEmail ? "register" : "login");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resent, setResent] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => firstRef.current?.focus?.(), 60); return () => clearTimeout(t); }, [mode]);
  useEffect(() => { if (recovery) setMode("recovery"); }, [recovery]);

  const switchMode = (m) => { setMode(m); setError(null); setInfo(null); setNeedsConfirm(false); setResetSent(false); setRegistered(false); setPassword(""); setConfirm(""); };

  // ── Connexion ──
  const handleLogin = async () => {
    if (loading) return;
    if (!isEmail(email)) { setError("Saisissez une adresse email valide."); return; }
    if (!password) { setError("Saisissez votre mot de passe."); return; }
    setLoading(true); setError(null); setInfo(null); setNeedsConfirm(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setError(humanError(error)); if ((error.message || "").toLowerCase().includes("not confirmed")) setNeedsConfirm(true); return; }
      onLogin(data.user);
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  };

  // ── Inscription ──
  const handleRegister = async () => {
    if (loading) return;
    if (!nom.trim()) { setError("Indiquez votre prénom et nom."); return; }
    if (!isEmail(email)) { setError("Saisissez une adresse email valide."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (password !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setLoading(true); setError(null); setInfo(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { nom: nom.trim(), role: "client" } } });
      if (error) { setError(humanError(error)); return; }
      // Supabase renvoie un utilisateur « fantôme » sans identités quand l'email existe déjà (confirmation activée)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError("Un compte existe déjà avec cet email."); return;
      }
      const uid = data.user?.id;
      if (uid && data.session) {
        try { await supabase.from("profiles").upsert({ id: uid, email: email.trim(), nom: nom.trim(), role: "client", is_active: true, client_type: "PME", discount: 0, simulator_enabled: false }); } catch { /* le trigger handle_new_user() crée le profil de toute façon */ }
      }
      if (data.session) { onLogin(data.user); return; } // confirmation email désactivée → connexion immédiate
      setRegistered(true);
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  };

  // ── Renvoi de l'email de confirmation ──
  const handleResend = async () => {
    if (loading || !isEmail(email)) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) setError(humanError(error)); else { setResent(true); setInfo("Email de confirmation renvoyé."); }
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  };

  // ── Mot de passe oublié ──
  const handleReset = async () => {
    if (loading) return;
    if (!isEmail(email)) { setError("Saisissez votre email pour recevoir le lien de réinitialisation."); return; }
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) { setError(humanError(error)); return; }
      setResetSent(true);
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  };

  // ── Nouveau mot de passe (après clic sur le lien reçu) ──
  const handleNewPassword = async () => {
    if (loading) return;
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (password !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(humanError(error)); return; }
      setInfo("Mot de passe mis à jour. Bienvenue !");
      setTimeout(() => onRecoveryDone && onRecoveryDone(), 600);
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  };

  const submit = (e) => { e.preventDefault(); if (mode === "login") handleLogin(); else if (mode === "register") handleRegister(); else handleNewPassword(); };
  const st = strength(password);
  const canLogin = isEmail(email) && password.length > 0 && !loading;
  const canRegister = nom.trim() && isEmail(email) && password.length >= 6 && confirm.length > 0 && !loading;
  const canRecover = password.length >= 6 && confirm.length > 0 && !loading;

  return (
    <div className="lg-root">
      <style>{S}</style>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="lg-mobile-head">
          <div className="lg-wordmark"><span className="lg-mark">31</span><span>Third<span className="one">One</span></span></div>
          <span className="tag">Studio</span>
        </div>
        <main className="lg-form">
          <div className="lg-card">

            {/* ── RECOVERY ── */}
            {mode === "recovery" && (
              <form onSubmit={submit} noValidate>
                <div className="lg-title">Nouveau mot de passe</div>
                <p className="lg-sub">Choisissez un mot de passe pour votre compte{email ? <> <b style={{ color: "#1D1D1F", fontWeight: 600 }}>{email}</b></> : ""}.</p>
                <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
                  <div className="lg-field"><label className="lg-label" htmlFor="np">Nouveau mot de passe</label>
                    <PasswordInput id="np" value={password} onChange={setPassword} placeholder="6 caractères minimum" autoComplete="new-password" />
                    <div className={`lg-strength s${st}`}><i /><i /><i /><i /></div>
                  </div>
                  <div className="lg-field"><label className="lg-label" htmlFor="npc">Confirmer</label>
                    <PasswordInput id="npc" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" invalid={confirm && confirm !== password} onEnter={handleNewPassword} />
                  </div>
                  {error && <Alert>{error}</Alert>}
                  {info && <Alert kind="ok">{info}</Alert>}
                  <button type="submit" className="lg-btn primary" disabled={!canRecover}>{loading ? <><span className="lg-spin" />Enregistrement…</> : "Enregistrer et continuer"}</button>
                </div>
              </form>
            )}

            {mode !== "recovery" && (
              <>
                <div className="lg-title">{mode === "login" ? "Bon retour." : "Créer votre espace."}</div>
                <p className="lg-sub">{mode === "login" ? "Connectez-vous pour accéder à vos projets." : "Quelques secondes suffisent pour rejoindre votre espace client."}</p>

                <div className="lg-seg" role="tablist" aria-label="Connexion ou inscription">
                  <span className={`pill${mode === "register" ? " right" : ""}`} />
                  <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>Connexion</button>
                  <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "on" : ""} onClick={() => switchMode("register")}>Créer un compte</button>
                </div>
              </>
            )}

            {/* ── CONNEXION ── */}
            {mode === "login" && !resetSent && (
              <form onSubmit={submit} noValidate style={{ display: "grid", gap: 16 }}>
                <div className="lg-field"><label className="lg-label" htmlFor="lg-email">Adresse email</label>
                  <input ref={firstRef} id="lg-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className="li" placeholder="vous@entreprise.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="lg-field">
                  <label className="lg-label" htmlFor="lg-pass">Mot de passe <button type="button" className="lg-link" onClick={handleReset}>Mot de passe oublié ?</button></label>
                  <PasswordInput id="lg-pass" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" onEnter={handleLogin} />
                </div>
                {error && <Alert action={needsConfirm && !resent ? <button type="button" className="lg-link" onClick={handleResend}>Renvoyer l'email</button> : null}>{error}</Alert>}
                {info && <Alert kind="ok">{info}</Alert>}
                <button type="submit" className="lg-btn primary" disabled={!canLogin}>{loading ? <><span className="lg-spin" />Connexion…</> : "Se connecter"}</button>
                <p style={{ textAlign: "center", fontSize: 13, color: "#6E6E73", margin: 0 }}>Pas encore de compte ? <button type="button" className="lg-link" style={{ fontSize: 13 }} onClick={() => switchMode("register")}>Créer un compte</button></p>
              </form>
            )}

            {/* ── RESET ENVOYÉ ── */}
            {mode === "login" && resetSent && (
              <div className="lg-done">
                <div className="ico"><IcoMail /></div>
                <h2>Lien envoyé</h2>
                <p>Si un compte existe pour <b>{email}</b>, vous recevrez un email avec un lien pour choisir un nouveau mot de passe. Pensez à vérifier vos spams.</p>
                <button type="button" className="lg-btn ghost" style={{ marginTop: 22 }} onClick={() => setResetSent(false)}>Retour à la connexion</button>
              </div>
            )}

            {/* ── INSCRIPTION ── */}
            {mode === "register" && !registered && (
              <form onSubmit={submit} noValidate style={{ display: "grid", gap: 14 }}>
                <div className="lg-field"><label className="lg-label" htmlFor="rg-nom">Prénom et nom</label>
                  <input ref={firstRef} id="rg-nom" type="text" autoComplete="name" className="li" placeholder="Marie Dupont" value={nom} onChange={e => setNom(e.target.value)} />
                </div>
                <div className="lg-field"><label className="lg-label" htmlFor="rg-email">Adresse email</label>
                  <input id="rg-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className={`li${email && !isEmail(email) ? " err" : ""}`} placeholder="vous@entreprise.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="lg-field"><label className="lg-label" htmlFor="rg-pass">Mot de passe</label>
                  <PasswordInput id="rg-pass" value={password} onChange={setPassword} placeholder="6 caractères minimum" autoComplete="new-password" />
                  <div className={`lg-strength s${st}`}><i /><i /><i /><i /></div>
                  <div className="lg-hint">{!password ? "Au moins 6 caractères. Majuscules, chiffres et symboles renforcent la sécurité." : st <= 1 ? "Mot de passe faible" : st === 2 ? "Mot de passe correct" : st === 3 ? "Bon mot de passe" : "Excellent mot de passe"}</div>
                </div>
                <div className="lg-field"><label className="lg-label" htmlFor="rg-conf">Confirmer le mot de passe</label>
                  <PasswordInput id="rg-conf" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" invalid={confirm && confirm !== password} onEnter={handleRegister} />
                </div>
                {error && <Alert action={/existe déjà/.test(error) ? <button type="button" className="lg-link" onClick={() => switchMode("login")}>Se connecter</button> : null}>{error}</Alert>}
                <button type="submit" className="lg-btn primary" disabled={!canRegister}>{loading ? <><span className="lg-spin" />Création…</> : "Créer mon compte"}</button>
                <p className="lg-legal" style={{ marginTop: 4 }}>En créant un compte, vous acceptez que Third-One Studio traite vos informations pour la gestion de vos projets.</p>
              </form>
            )}

            {/* ── INSCRIPTION RÉUSSIE ── */}
            {mode === "register" && registered && (
              <div className="lg-done">
                <div className="ico"><IcoSpark /></div>
                <h2>Bienvenue !</h2>
                <p>Un email de confirmation vient d'être envoyé à <b>{email}</b>.<br />Cliquez sur le lien pour activer votre compte, puis connectez-vous.</p>
                {info && <div style={{ marginTop: 14 }}><Alert kind="ok">{info}</Alert></div>}
                {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
                <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
                  <button type="button" className="lg-btn primary" onClick={() => switchMode("login")}>Aller à la connexion</button>
                  <button type="button" className="lg-btn ghost" disabled={loading || resent} onClick={handleResend}>{resent ? "Email renvoyé ✓" : "Je n'ai rien reçu, renvoyer l'email"}</button>
                </div>
              </div>
            )}

            {mode === "recovery" && !password && !confirm && <div style={{ display: "flex", justifyContent: "center", marginTop: 18, color: "#0077B6" }}><IcoLock /></div>}

            <p className="lg-legal">© 2026 Third-One Studio · Martinique</p>
          </div>
        </main>
      </div>
    </div>
  );
}
