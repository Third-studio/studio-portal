import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// Bouton flottant 🎤 : maintenu enfoncé OU clic toggle pour enregistrer.
// Auto-upload à voice-capture, affiche transcript + tâches créées en notif.

export default function VoiceCapture({ currentProjectId = null }) {
  const [state, setState] = useState("idle"); // idle | recording | uploading | done | error
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = upload;
      rec.start();
      mediaRecorderRef.current = rec;
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setError("Micro non autorisé : " + e.message);
      setState("error");
    }
  }

  function stop() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }

  async function upload() {
    setState("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, `note-${Date.now()}.webm`);
      if (currentProjectId) fd.append("project_id", String(currentProjectId));

      const { data, error } = await supabase.functions.invoke("voice-capture", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setState("done");
      setTimeout(() => setState("idle"), 8000);
    } catch (e) {
      setError(e.message || String(e));
      setState("error");
      setTimeout(() => { setState("idle"); setError(null); }, 6000);
    }
  }

  function toggle() {
    if (state === "recording") stop();
    else if (state === "idle" || state === "error" || state === "done") start();
  }

  const bg = {
    idle:      "#00B4D8",
    recording: "#FF3B30",
    uploading: "#FF9500",
    done:      "#34C759",
    error:     "#FF3B30",
  }[state];

  const label = {
    idle:      "🎤",
    recording: `⏺ ${formatTime(elapsed)}`,
    uploading: "…",
    done:      "✓",
    error:     "!",
  }[state];

  return (
    <>
      <button
        onClick={toggle}
        title={state === "recording" ? "Cliquer pour terminer" : "Note vocale"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 150,
          minWidth: state === "recording" ? 110 : 56,
          height: 56,
          padding: state === "recording" ? "0 18px" : 0,
          borderRadius: 28,
          border: "none",
          background: bg,
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontSize: state === "recording" ? 14 : 22,
          fontWeight: 600,
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
          cursor: "pointer",
          transition: "all .2s",
          animation: state === "recording" ? "pulse 1.4s infinite" : "none",
        }}>
        {label}
      </button>

      {result && state === "done" && (
        <div className="notif" style={{ maxWidth: 380, right: 92, bottom: 28 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#34C759", marginBottom: 3 }}>
              Note enregistrée
            </div>
            <div style={{ fontSize: 12, color: "#1D1D1F", marginBottom: 6, fontStyle: "italic" }}>
              « {result.summary || result.transcript?.slice(0, 80) + "…"} »
            </div>
            <div style={{ fontSize: 11, color: "#6E6E73" }}>
              {result.tasks_created > 0 && `${result.tasks_created} tâche${result.tasks_created > 1 ? "s" : ""}`}
              {result.tasks_created > 0 && result.reminders_created > 0 && " · "}
              {result.reminders_created > 0 && `${result.reminders_created} rappel${result.reminders_created > 1 ? "s" : ""}`}
              {result.tasks_created === 0 && result.reminders_created === 0 && "Note archivée (pas d'action)"}
            </div>
          </div>
        </div>
      )}

      {error && state === "error" && (
        <div className="notif" style={{ right: 92, bottom: 28, color: "#FF3B30" }}>
          {error}
        </div>
      )}
    </>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
