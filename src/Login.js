import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Email ou mot de passe incorrect");
    } else {
      onLogin(data.user);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#08080F",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        background: "#12121A", border: "1px solid #2A2A3E",
        borderRadius: 12, padding: 36, width: "100%", maxWidth: 400
      }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 32,
          color: "#E8C547", letterSpacing: "0.1em", marginBottom: 6
        }}>◈ STUDIO</h1>
        <p style={{ color: "#8888AA", fontSize: 13, marginBottom: 28 }}>
          Connectez-vous à votre espace
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#8888AA", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>
            Email
          </label>
          <input
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%", background: "#0E0E18", border: "1px solid #2A2A3E",
              borderRadius: 6, padding: "10px 14px", color: "#F0EEE8",
              fontSize: 13, outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "#8888AA", textTransform: "uppercase", l
