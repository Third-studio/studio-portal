import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// Couleurs par type de mail (cohérence avec la palette existante)
const KIND_COLORS = {
  info:       { bg: "#6E6E7318", color: "#6E6E73", label: "Info" },
  devis_in:   { bg: "#AF52DE18", color: "#7C3AED", label: "Devis reçu" },
  facture_in: { bg: "#FF950018", color: "#B45309", label: "Facture" },
  rdv:        { bg: "#00B4D818", color: "#0077B6", label: "RDV" },
  livrable:   { bg: "#34C75918", color: "#15803D", label: "Livrable" },
  relance:    { bg: "#FF9F4318", color: "#B45309", label: "Relance" },
  spam:       { bg: "#FF3B3018", color: "#D70015", label: "Spam" },
  autre:      { bg: "#C7C7CC18", color: "#6E6E73", label: "Autre" },
};

const URGENCE_DOT = {
  low: "#C7C7CC", normal: "#00B4D8", high: "#FF9500", urgent: "#FF3B30",
};

export default function Inbox({ onOpenProject }) {
  const [emails, setEmails] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState({ kind: "all", project: "all", urgence: "all" });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [filter.kind, filter.project, filter.urgence]);

  async function loadData() {
    setLoading(true);
    let q = supabase
      .from("emails")
      .select("id, gmail_id, received_at, from_addr, from_name, subject, snippet, kind, urgence, summary_fr, project_id, detected_amount, detected_date, has_attachments, classified")
      .order("received_at", { ascending: false })
      .limit(200);
    if (filter.kind !== "all") q = q.eq("kind", filter.kind);
    if (filter.project !== "all") q = q.eq("project_id", filter.project);
    if (filter.urgence !== "all") q = q.eq("urgence", filter.urgence);

    const [emailsRes, projectsRes] = await Promise.all([
      q,
      supabase.from("projects").select("id, title").order("title"),
    ]);
    setEmails(emailsRes.data || []);
    setProjects(projectsRes.data || []);
    setLoading(false);
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("gmail-sync");
      if (error) alert("Erreur sync : " + error.message);
      await loadData();
    } finally { setSyncing(false); }
  }

  async function reclassify(id) {
    await supabase.functions.invoke("mail-classify", { body: { email_id: id } });
    await loadData();
  }

  async function attachToProject(emailId, projectId) {
    await supabase.from("emails").update({ project_id: projectId }).eq("id", emailId);
    setSelected((s) => (s && s.id === emailId ? { ...s, project_id: projectId } : s));
    await loadData();
  }

  const counts = emails.reduce((acc, e) => {
    acc[e.kind || "autre"] = (acc[e.kind || "autre"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Urbanist, sans-serif", fontWeight: 800, fontSize: 28, color: "#1D1D1F", marginBottom: 4 }}>
            Inbox
          </h1>
          <div style={{ color: "#6E6E73", fontSize: 13 }}>
            {emails.length} mails • classifiés automatiquement par Claude
          </div>
        </div>
        <button className="btn btn-primary" onClick={syncNow} disabled={syncing}>
          {syncing ? "Synchronisation…" : "↻ Synchroniser"}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="input" style={{ width: 180 }}
          value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}>
          <option value="all">Tous types ({emails.length})</option>
          {Object.entries(KIND_COLORS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({counts[k] || 0})</option>
          ))}
        </select>
        <select className="input" style={{ width: 220 }}
          value={filter.project} onChange={(e) => setFilter({ ...filter, project: e.target.value })}>
          <option value="all">Tous projets</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select className="input" style={{ width: 160 }}
          value={filter.urgence} onChange={(e) => setFilter({ ...filter, urgence: e.target.value })}>
          <option value="all">Toutes urgences</option>
          <option value="urgent">Urgent</option>
          <option value="high">Élevée</option>
          <option value="normal">Normale</option>
          <option value="low">Faible</option>
        </select>
      </div>

      {/* Layout split */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Liste */}
        <div className="card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6E6E73" }}>Chargement…</div>
          ) : emails.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6E6E73" }}>
              Aucun mail. Configure l'intégration Gmail puis clique « Synchroniser ».
            </div>
          ) : emails.map((e) => {
            const kc = KIND_COLORS[e.kind] || KIND_COLORS.autre;
            const proj = projects.find((p) => p.id === e.project_id);
            return (
              <div key={e.id}
                onClick={() => setSelected(e)}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #F2F2F7",
                  cursor: "pointer",
                  background: selected?.id === e.id ? "#F5F5F7" : "transparent",
                  transition: "background .15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: URGENCE_DOT[e.urgence] || "#C7C7CC", flexShrink: 0,
                  }} />
                  <span className="tag" style={{ background: kc.bg, color: kc.color }}>{kc.label}</span>
                  {proj && (
                    <span style={{ fontSize: 11, color: "#0077B6", fontWeight: 600 }}>
                      • {proj.title}
                    </span>
                  )}
                  {!e.classified && (
                    <span style={{ fontSize: 10, color: "#B45309" }}>non classifié</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#6E6E73" }}>
                    {formatDate(e.received_at)}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginBottom: 2 }}>
                  {e.subject || "(sans objet)"}
                </div>
                <div style={{ fontSize: 12, color: "#6E6E73" }}>
                  {e.from_name || e.from_addr}
                </div>
                {e.summary_fr && (
                  <div style={{ fontSize: 12, color: "#1D1D1F", marginTop: 4, fontStyle: "italic" }}>
                    {e.summary_fr}
                  </div>
                )}
                {(e.detected_amount || e.detected_date || e.has_attachments) && (
                  <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#6E6E73" }}>
                    {e.detected_amount && <span>💰 {Number(e.detected_amount).toFixed(2)} €</span>}
                    {e.detected_date && <span>📅 {e.detected_date}</span>}
                    {e.has_attachments && <span>📎 PJ</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Détail */}
        {selected && (
          <div className="card" style={{ padding: 20, alignSelf: "start", position: "sticky", top: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="tag" style={{
                background: (KIND_COLORS[selected.kind] || KIND_COLORS.autre).bg,
                color:      (KIND_COLORS[selected.kind] || KIND_COLORS.autre).color,
              }}>
                {(KIND_COLORS[selected.kind] || KIND_COLORS.autre).label}
              </span>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>✕</button>
            </div>

            <h2 style={{ fontFamily: "Urbanist, sans-serif", fontSize: 18, marginBottom: 4 }}>
              {selected.subject || "(sans objet)"}
            </h2>
            <div style={{ fontSize: 12, color: "#6E6E73", marginBottom: 16 }}>
              {selected.from_name || ""} &lt;{selected.from_addr}&gt; — {formatDate(selected.received_at)}
            </div>

            {selected.summary_fr && (
              <div style={{ background: "#F5F5F7", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong style={{ fontSize: 11, color: "#0077B6", textTransform: "uppercase" }}>Résumé IA</strong>
                <div style={{ marginTop: 4 }}>{selected.summary_fr}</div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#6E6E73", textTransform: "uppercase", fontWeight: 600 }}>
                Projet lié
              </label>
              <select className="input" style={{ marginTop: 4 }}
                value={selected.project_id || ""}
                onChange={(e) => attachToProject(selected.id, e.target.value || null)}>
                <option value="">— Aucun —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              {selected.project_id && onOpenProject && (
                <button className="btn btn-ghost" style={{ marginTop: 8 }}
                  onClick={() => onOpenProject(selected.project_id)}>
                  → Ouvrir le projet
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="btn btn-blue" onClick={() => reclassify(selected.id)}>
                ↻ Reclassifier
              </button>
            </div>

            <FullEmailBody emailId={selected.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function FullEmailBody({ emailId }) {
  const [full, setFull] = useState(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("emails")
        .select("body_text, body_html, action_items").eq("id", emailId).single();
      if (!cancel) setFull(data);
    })();
    return () => { cancel = true; };
  }, [emailId]);

  if (!full) return null;
  return (
    <>
      {full.action_items?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong style={{ fontSize: 11, color: "#0077B6", textTransform: "uppercase" }}>
            Actions extraites
          </strong>
          <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: 13 }}>
            {full.action_items.map((a, i) => (
              <li key={i}>{a.title}{a.due_date && ` — ${a.due_date}`}</li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "#6E6E73", marginBottom: 8 }}>
          Voir le corps du mail
        </summary>
        <div style={{
          fontSize: 12, color: "#1D1D1F", whiteSpace: "pre-wrap",
          maxHeight: 400, overflow: "auto", padding: 12, background: "#FAFAFA", borderRadius: 8,
        }}>
          {full.body_text || "(pas de version texte)"}
        </div>
      </details>
    </>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3600_000;
  if (diffH < 24) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 24 * 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
