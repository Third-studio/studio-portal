import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// Agent IA flottant 💬 — remplace la capture vocale.
// Équipe : interroge tous les projets, tâches, mails, plannings.
// Client : ne voit que SES projets (filtrage côté Edge Function "assistant").

export default function Assistant({ isTeam = false, currentProjectId = null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const suggestions = isTeam
    ? ["Quels projets sont à risque ?", "Qu'est-ce qui doit être livré cette semaine ?", "Résume l'activité récente"]
    : ["Où en est mon projet ?", "Quand est prévue la livraison ?", "Que dois-je valider ?"];

  async function send(q) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    const hist = [...messages, { role: "user", content: question }];
    setMessages(hist);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant", {
        body: {
          question,
          history: hist.slice(-8, -1), // contexte court, sans la question en cours
          project_id: currentProjectId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.answer || "(pas de réponse)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue : " + (e.message || e), error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Assistant ThirdOne"
          style={{
            position: "fixed", bottom: 22, right: 22, zIndex: 150,
            width: 52, height: 52, borderRadius: 26, border: "none",
            background: "linear-gradient(180deg,#0096C7,#0077B6)", color: "#fff",
            fontSize: 21, cursor: "pointer",
            boxShadow: "0 1px 2px rgba(2,62,92,0.4), 0 8px 24px rgba(0,119,182,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            transition: "transform .2s cubic-bezier(.4,0,.2,1)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >✦</button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 150,
          width: "min(380px, calc(100vw - 32px))", height: "min(540px, calc(100vh - 100px))",
          background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid #E8E8ED", borderRadius: 18, display: "flex", flexDirection: "column",
          boxShadow: "0 2px 8px rgba(16,24,40,0.08), 0 24px 64px rgba(16,24,40,0.18)",
          animation: "fadeUp .25s cubic-bezier(.16,1,.3,1)", overflow: "hidden",
          fontFamily: "'Inter',sans-serif",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #F2F2F7" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(180deg,#0096C7,#0077B6)", color: "#fff", fontSize: 15,
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>Assistant ThirdOne</div>
              <div style={{ fontSize: 10, color: "#6E6E73" }}>{isTeam ? "Accès équipe — tous les projets" : "Vos projets"}</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#6E6E73", fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#6E6E73", lineHeight: 1.5, textAlign: "center", padding: "8px 12px" }}>
                  Posez une question sur {isTeam ? "n'importe quel projet, les tâches, le planning…" : "vos projets : avancement, dates, validations…"}
                </p>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    style={{
                      background: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.2)", color: "#0090B3",
                      borderRadius: 10, padding: "9px 12px", fontSize: 12, cursor: "pointer", textAlign: "left",
                      fontFamily: "'Inter',sans-serif", transition: "background .15s",
                    }}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "9px 13px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "linear-gradient(180deg,#0096C7,#0077B6)" : m.error ? "rgba(255,59,48,0.06)" : "#F5F5F7",
                color: m.role === "user" ? "#fff" : m.error ? "#FF3B30" : "#1D1D1F",
                border: m.error ? "1px solid rgba(255,59,48,0.2)" : "none",
              }}>{m.content}</div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", padding: "9px 13px", borderRadius: 12, background: "#F5F5F7", color: "#6E6E73", fontSize: 13 }}>
                <span style={{ animation: "pulse 1.2s infinite" }}>Je consulte les projets…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #F2F2F7" }}>
            <input
              ref={inputRef}
              className="input"
              placeholder="Votre question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  );
}
