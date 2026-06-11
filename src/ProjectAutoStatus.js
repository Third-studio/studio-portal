import { useState } from "react";
import { supabase } from "./supabase";

// Bandeau qui affiche le status auto rempli par project-radar :
//   - badge couleur auto_health (ok/watch/risk/blocked)
//   - status_note (1-2 phrases)
//   - next_action (prochaine action)
//   - bouton rafraîchir → re-déclenche project-radar pour ce projet seul

const HEALTH = {
  ok:      { bg: "#34C75918", color: "#15803D", label: "✓ En piste", border: "#34C75940" },
  watch:   { bg: "#00B4D818", color: "#0077B6", label: "● À surveiller", border: "#00B4D840" },
  risk:    { bg: "#FF950018", color: "#B45309", label: "⚠ À risque", border: "#FF950040" },
  blocked: { bg: "#FF3B3018", color: "#D70015", label: "■ Bloqué", border: "#FF3B3040" },
};

export default function ProjectAutoStatus({ project, onRefreshed }) {
  const [refreshing, setRefreshing] = useState(false);
  if (!project) return null;

  const h = HEALTH[project.auto_health] || null;
  const hasStatus = !!project.auto_status_note;

  async function refresh() {
    setRefreshing(true);
    try {
      // project-radar prend tous les projets ; on accepte de payer ~1 appel.
      // Si la fonction est étendue pour accepter project_id, le filtrage se fera côté Edge.
      const { error } = await supabase.functions.invoke("project-radar");
      if (error) throw error;
      // Recharge le projet
      const { data } = await supabase.from("projects")
        .select("auto_status_note, auto_health, auto_next_action, auto_status_at")
        .eq("id", project.id).single();
      onRefreshed?.(data);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (!hasStatus) {
    return (
      <div className="card" style={{ padding: 14, marginBottom: 12, background: "#FAFAFA" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#6E6E73" }}>
            Statut auto pas encore généré. Project-radar tourne à 6h Martinique, ou rafraîchis manuellement.
          </div>
          <button className="btn btn-blue" onClick={refresh} disabled={refreshing}>
            {refreshing ? "…" : "↻ Analyser"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      padding: 14,
      marginBottom: 12,
      borderLeft: `3px solid ${h?.color || "#C7C7CC"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        {h && (
          <span className="tag" style={{
            background: h.bg, color: h.color, border: `1px solid ${h.border}`,
            padding: "3px 10px",
          }}>{h.label}</span>
        )}
        <span style={{ fontSize: 11, color: "#6E6E73" }}>
          analyse {timeAgo(project.auto_status_at)}
        </span>
        <button
          className="btn btn-ghost"
          onClick={refresh}
          disabled={refreshing}
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11 }}>
          {refreshing ? "…" : "↻"}
        </button>
      </div>

      <div style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.5, marginBottom: 8 }}>
        {project.auto_status_note}
      </div>

      {project.auto_next_action && (
        <div style={{
          fontSize: 12,
          padding: "8px 10px",
          background: "#F5F5F7",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "#0077B6", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
            Prochaine action
          </span>
          <span style={{ color: "#1D1D1F" }}>{project.auto_next_action}</span>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}
