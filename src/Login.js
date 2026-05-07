import { useState } from "react";
import { supabase } from "./supabase";

const loginStyles = `
  .login-input { width:100%; background:#12121A; border:1px solid #2A2A3E; border-radius:7px; padding:11px 14px; color:#F5F5F0; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; box-sizing:border-box; transition:border-color .2s; }
  .login-input:focus { border-color:#C9A84C; }
`;
const Lbl = ({children}) => <label style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>{children}</label>;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
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
    if (error) setError("Email ou mot de passe incorrect");
    else onLogin(data.user);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!nom.trim()) { setError("Merci d'indiquer votre nom"); return; }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
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
    if (!email) { setError("Entre ton email pour réinitialiser"); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://thirdone.studio" });
    setResetSent(true); setError(null);
  };

  const switchMode = (m) => { setMode(m); setError(null); setEmail(""); setPassword(""); setConfirm(""); setNom(""); };

  return (
    <div style={{ minHeight:"100vh", background:"#08080F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans, sans-serif", padding:20, backgroundImage:"radial-gradient(ellipse at 50% 0%, #C9A84C18 0%, transparent 60%)" }}>
      <style>{loginStyles}</style>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <img src="/logo.png" alt="Third-One Studio" style={{ height:60, filter:"invert(1) brightness(0.9)", marginBottom:12 }}/>
          <p style={{ color:"#555570", fontSize:12, letterSpacing:"0.15em", textTransform:"uppercase" }}>Espace client</p>
        </div>

        <div style={{ background:"#0E0E18", border:"1px solid #C9A84C33", borderRadius:14, padding:"36px 32px", boxShadow:"0 0 60px #C9A84C08" }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:4, background:"#12121A", padding:3, borderRadius:8, marginBottom:28 }}>
            <button onClick={() => switchMode("login")} style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"DM Sans,sans-serif", fontSize:12, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", background:mode==="login"?"#E8C547":"transparent", color:mode==="login"?"#08080F":"#555570", transition:"all .15s" }}>
              Connexion
            </button>
            <button onClick={() => switchMode("register")} style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"DM Sans,sans-serif", fontSize:12, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", background:mode==="register"?"#E8C547":"transparent", color:mode==="register"?"#08080F":"#555570", transition:"all .15s" }}>
              Créer un compte
            </button>
          </div>

          {/* LOGIN */}
          {mode === "login" && !resetSent && (
            <>
              <div style={{ marginBottom:14 }}>
                <Lbl>Email</Lbl>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="login-input"/>
              </div>
              <div style={{ marginBottom:24 }}>
                <Lbl>Mot de passe</Lbl>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()} className="login-input"/>
              </div>
              {error && <p style={{ color:"#FF6B6B", fontSize:12, marginBottom:14, textAlign:"center" }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading || !email || !password}
                style={{ width:"100%", background:loading?"#2A2A3E":"linear-gradient(135deg,#C9A84C,#E8C547)", color:"#08080F", border:"none", borderRadius:7, padding:"12px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
              <button onClick={handleReset} style={{ width:"100%", background:"transparent", color:"#8888AA", border:"none", marginTop:12, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Mot de passe oublié ?
              </button>
            </>
          )}

          {/* RESET SENT */}
          {mode === "login" && resetSent && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📧</div>
              <p style={{ color:"#4ECDC4", fontSize:13, marginBottom:8 }}>Email envoyé !</p>
              <p style={{ color:"#8888AA", fontSize:12 }}>Vérifie ta boite mail pour réinitialiser ton mot de passe.</p>
              <button onClick={() => setResetSent(false)} style={{ marginTop:16, background:"transparent", color:"#8888AA", border:"none", fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Retour à la connexion
              </button>
            </div>
          )}

          {/* REGISTER */}
          {mode === "register" && !registered && (
            <>
              <div style={{ marginBottom:14 }}>
                <Lbl>Nom complet</Lbl>
                <input type="text" placeholder="Jean Dupont" value={nom} onChange={e => setNom(e.target.value)} className="login-input"/>
              </div>
              <div style={{ marginBottom:14 }}>
                <Lbl>Email</Lbl>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="login-input"/>
              </div>
              <div style={{ marginBottom:14 }}>
                <Lbl>Mot de passe</Lbl>
                <input type="password" placeholder="Minimum 6 caractères" value={password} onChange={e => setPassword(e.target.value)} className="login-input"/>
              </div>
              <div style={{ marginBottom:24 }}>
                <Lbl>Confirmer le mot de passe</Lbl>
                <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleRegister()} className="login-input"/>
              </div>
              {error && <p style={{ color:"#FF6B6B", fontSize:12, marginBottom:14, textAlign:"center" }}>{error}</p>}
              <button onClick={handleRegister} disabled={loading || !email || !password || !nom}
                style={{ width:"100%", background:loading?"#2A2A3E":"linear-gradient(135deg,#C9A84C,#E8C547)", color:"#08080F", border:"none", borderRadius:7, padding:"12px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                {loading ? "Création..." : "Créer mon compte"}
              </button>
            </>
          )}

          {/* REGISTER SUCCESS */}
          {mode === "register" && registered && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <p style={{ color:"#4ECDC4", fontSize:14, fontWeight:600, marginBottom:8 }}>Compte créé !</p>
              <p style={{ color:"#8888AA", fontSize:12, lineHeight:1.6 }}>Un email de confirmation a été envoyé à <strong style={{color:"#F0EEE8"}}>{email}</strong>.<br/>Validez votre compte puis connectez-vous.</p>
              <button onClick={() => switchMode("login")} style={{ marginTop:20, background:"linear-gradient(135deg,#C9A84C,#E8C547)", color:"#08080F", border:"none", borderRadius:7, padding:"10px 24px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                Aller à la connexion
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#3A3A5E" }}>2026 Third-One Studio</p>
      </div>
    </div>
  );
}
