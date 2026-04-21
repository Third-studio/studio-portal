import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Email ou mot de passe incorrect"); }
    else { onLogin(data.user); }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError("Entre ton email pour reinitialiser"); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://thirdone.studio" });
    setResetSent(true);
    setError(null);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#08080F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans, sans-serif", padding:20, backgroundImage:"radial-gradient(ellipse at 50% 0%, #C9A84C18 0%, transparent 60%)" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <img src="/logo.png" alt="Third-One Studio" style={{ height:60, filter:"invert(1) brightness(0.9)", marginBottom:12 }}/>
          <p style={{ color:"#555570", fontSize:12, letterSpacing:"0.15em", textTransform:"uppercase" }}>Espace client</p>
        </div>
        <div style={{ background:"#0E0E18", border:"1px solid #C9A84C33", borderRadius:14, padding:"36px 32px", boxShadow:"0 0 60px #C9A84C08" }}>
          <h2 style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:22, color:"#F5F5F0", letterSpacing:"0.08em", marginBottom:24 }}>Connexion</h2>

          {resetSent ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📧</div>
              <p style={{ color:"#4ECDC4", fontSize:13, marginBottom:8 }}>Email envoyé !</p>
              <p style={{ color:"#8888AA", fontSize:12 }}>Vérifie ta boite mail pour réinitialiser ton mot de passe.</p>
              <button onClick={() => setResetSent(false)} style={{ marginTop:16, background:"transparent", color:"#8888AA", border:"none", fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, color:"#8888AA", textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>Email</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width:"100%", background:"#12121A", border:"1px solid #2A2A3E", borderRadius:7, padding:"11px 14px", color:"#F5F5F0", fontSize:13, outline:"none", boxSizing:"border-box" }}
                  onFocus={e => e.target.style.borderColor="#C9A84C"}
                  onBlur={e => e.target.style.borderColor="#2A2A3E"}
                />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:10, color:"#8888AA", textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>Mot de passe</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{ width:"100%", background:"#12121A", border:"1px solid #2A2A3E", borderRadius:7, padding:"11px 14px", color:"#F5F5F0", fontSize:13, outline:"none", boxSizing:"border-box" }}
                  onFocus={e => e.target.style.borderColor="#C9A84C"}
                  onBlur={e => e.target.style.borderColor="#2A2A3E"}
                />
              </div>
              {error && <p style={{ color:"#FF6B6B", fontSize:12, marginBottom:14, textAlign:"center" }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading || !email || !password}
                style={{ width:"100%", background:loading?"#2A2A3E":"linear-gradient(135deg, #C9A84C, #E8C547)", color:"#08080F", border:"none", borderRadius:7, padding:"12px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"0.05em", textTransform:"uppercase", transition:"all 0.2s" }}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
              <button onClick={handleReset}
                style={{ width:"100%", background:"transparent", color:"#8888AA", border:"none", marginTop:12, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Mot de passe oublie ?
              </button>
            </>
          )}
        </div>
        <p style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#3A3A5E" }}>
          2026 Third-One Studio
        </p>
      </div>
    </div>
  );
}
