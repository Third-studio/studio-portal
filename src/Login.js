import { useState } from "react";
import { supabase } from "./supabase";

const S = `
  .li { width:100%; background:#F5F5F7; border:1.5px solid #E5E5EA; border-radius:10px; padding:12px 16px; color:#1D1D1F; font-size:14px; font-family:'Inter',sans-serif; outline:none; box-sizing:border-box; transition:border-color .2s,box-shadow .2s,background .2s; }
  .li:focus { border-color:#0077B6; background:#FFFFFF; box-shadow:0 0 0 4px rgba(0,180,216,0.10); }
  .li::placeholder { color:#C7C7CC; }
  .ltab { flex:1; padding:8px 0; border-radius:8px; border:none; cursor:pointer; font-family:'Inter',sans-serif; font-size:12px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; transition:all .2s; }
`;
const Lbl = ({children}) => <label style={{fontSize:11,color:"#6E6E73",letterSpacing:"0.06em",display:"block",marginBottom:7,fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>{children}</label>;

export default function Login({ onLogin }) {
  const inviteEmail = (() => { try { return new URLSearchParams(window.location.search).get("invite") || ""; } catch { return ""; } })();
  const [mode, setMode] = useState(inviteEmail ? "register" : "login");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email ou mot de passe incorrect.");
    else onLogin(data.user);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!nom.trim()) { setError("Merci d'indiquer votre prénom ou nom."); return; }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nom, role: "client" } } });
    if (error) { setError(error.message); setLoading(false); return; }
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("profiles").upsert({ id: uid, email, nom, role: "client", is_active: true, client_type: "PME", discount: 0, simulator_enabled: false });
    }
    setRegistered(true);
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError("Saisissez votre email pour recevoir le lien de réinitialisation."); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://thirdone.studio" });
    setResetSent(true); setError(null);
  };

  const switchMode = (m) => { setMode(m); setError(null); setEmail(""); setPassword(""); setConfirm(""); setNom(""); };

  return (
    <div style={{ minHeight:"100vh", background:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter', sans-serif", padding:"20px 16px",
      backgroundImage:"radial-gradient(ellipse at 30% 0%, rgba(0,180,216,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(0,199,190,0.04) 0%, transparent 50%)" }}>
      <style>{S}</style>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo + titre */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <img src="/logo192.png" alt="ThirdOne Studio" style={{ height:56, marginBottom:16, borderRadius:14 }}/>
          <div style={{ marginBottom:6, lineHeight:1 }}>
            <span style={{ fontFamily:"'Urbanist',sans-serif", fontSize:28, fontWeight:800, color:"#162040", letterSpacing:"-0.02em" }}>Third</span><span style={{ fontFamily:"'Urbanist',sans-serif", fontSize:28, fontWeight:800, color:"#0077B6", letterSpacing:"-0.02em" }}>One</span>
          </div>
          <p style={{ color:"#6E6E73", fontSize:12, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'Inter',sans-serif" }}>Production Interface</p>
        </div>

        <div style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid #E8E8ED", borderRadius:22, padding:"32px 28px", boxShadow:"0 1px 2px rgba(16,24,40,0.04), 0 12px 48px rgba(16,24,40,0.10)" }}>

          {/* Onglets */}
          <div style={{ display:"flex", gap:4, background:"#F5F5F7", padding:4, borderRadius:12, marginBottom:28 }}>
            {[["login","Connexion"],["register","Créer un compte"]].map(([m,l])=>(
              <button key={m} onClick={() => switchMode(m)} className="ltab"
                style={{ background:mode===m?"#FFFFFF":"transparent", color:mode===m?"#00B4D8":"#8E8E93",
                  boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>{l}</button>
            ))}
          </div>

          {/* CONNEXION */}
          {mode === "login" && !resetSent && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div><Lbl>Adresse email</Lbl>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="li"/>
              </div>
              <div><Lbl>Mot de passe</Lbl>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()} className="li"/>
              </div>
              {error && <p style={{ color:"#D70015", fontSize:12, textAlign:"center", background:"rgba(255,59,48,0.06)", border:"1px solid rgba(255,59,48,0.2)", borderRadius:8, padding:"8px 12px" }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading || !email || !password}
                style={{ width:"100%", background:loading||!email||!password?"#F5F5F7":"linear-gradient(180deg,#0096C7,#0077B6)", color:loading||!email||!password?"#C7C7CC":"#FFFFFF", border:"none", borderRadius:10, padding:"13px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"0.04em", textTransform:"uppercase", transition:"all .2s", marginTop:4,
                  boxShadow:loading||!email||!password?"none":"0 4px 12px rgba(0,180,216,0.3)" }}>
                {loading ? "Connexion en cours…" : "Se connecter →"}
              </button>
              <button onClick={handleReset}
                style={{ background:"transparent", color:"#6E6E73", border:"none", fontSize:12, cursor:"pointer", textDecoration:"underline", textAlign:"center", marginTop:-8 }}>
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* RESET ENVOYÉ */}
          {mode === "login" && resetSent && (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>📬</div>
              <p style={{ color:"#0077B6", fontSize:14, fontWeight:600, marginBottom:8 }}>Email envoyé !</p>
              <p style={{ color:"#6E6E73", fontSize:13, lineHeight:1.6 }}>Vérifiez votre boite mail pour réinitialiser votre mot de passe.</p>
              <button onClick={() => setResetSent(false)}
                style={{ marginTop:20, background:"transparent", color:"#6E6E73", border:"none", fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Retour à la connexion
              </button>
            </div>
          )}

          {/* INSCRIPTION */}
          {mode === "register" && !registered && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><Lbl>Votre prénom et nom</Lbl>
                <input type="text" placeholder="Marie Dupont" value={nom} onChange={e => setNom(e.target.value)} className="li"/>
              </div>
              <div><Lbl>Adresse email</Lbl>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="li"/>
              </div>
              <div><Lbl>Mot de passe</Lbl>
                <input type="password" placeholder="Minimum 6 caractères" value={password} onChange={e => setPassword(e.target.value)} className="li"/>
              </div>
              <div><Lbl>Confirmer le mot de passe</Lbl>
                <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleRegister()} className="li"/>
              </div>
              {error && <p style={{ color:"#D70015", fontSize:12, textAlign:"center", background:"rgba(255,59,48,0.06)", border:"1px solid rgba(255,59,48,0.2)", borderRadius:8, padding:"8px 12px" }}>{error}</p>}
              <button onClick={handleRegister} disabled={loading || !email || !password || !nom}
                style={{ width:"100%", background:loading||!email||!password||!nom?"#F5F5F7":"linear-gradient(180deg,#0096C7,#0077B6)", color:loading||!email||!password||!nom?"#C7C7CC":"#FFFFFF", border:"none", borderRadius:10, padding:"13px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"0.04em", textTransform:"uppercase", transition:"all .2s", marginTop:4,
                  boxShadow:loading||!email||!password||!nom?"none":"0 4px 12px rgba(0,180,216,0.3)" }}>
                {loading ? "Création en cours…" : "Créer mon compte →"}
              </button>
            </div>
          )}

          {/* INSCRIPTION RÉUSSIE */}
          {mode === "register" && registered && (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>✨</div>
              <p style={{ color:"#0077B6", fontSize:15, fontWeight:600, marginBottom:10 }}>Bienvenue !</p>
              <p style={{ color:"#6E6E73", fontSize:13, lineHeight:1.7 }}>
                Un email de confirmation a été envoyé à<br/>
                <strong style={{color:"#1D1D1F"}}>{email}</strong>.<br/>
                Validez votre compte puis connectez-vous.
              </p>
              <button onClick={() => switchMode("login")}
                style={{ marginTop:22, background:"linear-gradient(180deg,#0096C7,#0077B6)", color:"#FFFFFF", border:"none", borderRadius:10, padding:"11px 28px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em", textTransform:"uppercase", boxShadow:"0 4px 12px rgba(0,180,216,0.3)" }}>
                Se connecter →
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:24, fontSize:11, color:"#C7C7CC" }}>© 2026 Third-One Studio · Martinique</p>
      </div>
    </div>
  );
}
