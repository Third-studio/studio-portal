import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PRIORITY_COLOR = {
  low:    "#C7C7CC",
  normal: "#00B4D8",
  high:   "#FF9500",
  urgent: "#FF3B30",
};

export default function TasksReminders({ onOpenProject }) {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("all"); // all | today | week | overdue
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { loadData(); }, [view]);

  async function loadData() {
    setLoading(true);
    const [t, r, p] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("reminders").select("*").order("remind_at", { ascending: true }),
      supabase.from("projects").select("id, title"),
    ]);
    setTasks(t.data || []);
    setReminders(r.data || []);
    setProjects(p.data || []);
    setLoading(false);
  }

  async function pushCalendar() {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("calendar-sync");
      if (error) alert("Erreur calendar : " + error.message);
      await loadData();
    } finally { setSyncing(false); }
  }

  async function toggleStatus(taskId, current) {
    const next = current === "done" ? "todo" : "done";
    await supabase.from("tasks").update({ status: next }).eq("id", taskId);
    await loadData();
  }

  async function deleteTask(id) {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    await loadData();
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);

  const filteredTasks = tasks.filter((t) => {
    if (t.status === "done") return view === "all";
    if (view === "today") return t.due_date === todayStr;
    if (view === "week") return t.due_date && t.due_date >= todayStr && t.due_date <= weekEnd;
    if (view === "overdue") return t.due_date && t.due_date < todayStr;
    return true;
  });

  const projTitle = (id) => projects.find((p) => p.id === id)?.title || "—";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Urbanist, sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>
            Tâches & Rappels
          </h1>
          <div style={{ color: "#6E6E73", fontSize: 13 }}>
            {tasks.filter((t) => t.status !== "done").length} à faire • {reminders.filter((r) => !r.sent_at).length} rappels à venir
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowNew(true)}>+ Nouvelle tâche</button>
          <button className="btn btn-primary" onClick={pushCalendar} disabled={syncing}>
            {syncing ? "Sync…" : "📅 Pousser vers Calendar"}
          </button>
        </div>
      </div>

      {/* Onglets vue */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { k: "all", label: "Tout" },
          { k: "today", label: "Aujourd'hui" },
          { k: "week", label: "Cette semaine" },
          { k: "overdue", label: "En retard" },
        ].map((v) => (
          <button key={v.k} className={`tab ${view === v.k ? "active" : ""}`} onClick={() => setView(v.k)}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Tâches */}
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontFamily: "Urbanist, sans-serif", fontSize: 16, marginBottom: 12 }}>
            Tâches
          </h2>
          {loading ? <div style={{ color: "#6E6E73" }}>Chargement…</div> :
           filteredTasks.length === 0 ? (
            <div style={{ color: "#6E6E73", fontSize: 13, textAlign: "center", padding: 24 }}>
              Rien à faire pour cette vue ✓
            </div>
           ) :
           filteredTasks.map((t) => {
             const overdue = t.due_date && t.due_date < todayStr && t.status !== "done";
             return (
               <div key={t.id} className={`check-item ${t.status === "done" ? "done" : ""}`}
                    style={{ marginBottom: 6 }}>
                 <div className={`check-box ${t.status === "done" ? "checked" : ""}`}
                      onClick={() => toggleStatus(t.id, t.status)}>
                   {t.status === "done" && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{
                     fontSize: 13, fontWeight: 500,
                     textDecoration: t.status === "done" ? "line-through" : "none",
                     color: t.status === "done" ? "#6E6E73" : "#1D1D1F",
                   }}>
                     {t.title}
                   </div>
                   <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#6E6E73", marginTop: 3, alignItems: "center" }}>
                     <span style={{
                       display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                       background: PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.normal,
                     }} />
                     <span style={{ color: overdue ? "#FF3B30" : "#6E6E73", fontWeight: overdue ? 600 : 400 }}>
                       {t.due_date || "sans date"}
                     </span>
                     {t.project_id && (
                       <span style={{ color: "#00B4D8", cursor: "pointer" }}
                             onClick={() => onOpenProject?.(t.project_id)}>
                         {projTitle(t.project_id)}
                       </span>
                     )}
                     <span style={{ marginLeft: "auto", fontSize: 10 }}>
                       {t.source === "mail" ? "📧 auto" : t.source}
                       {t.calendar_event_id && " · 📅"}
                     </span>
                     <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }}
                             onClick={() => deleteTask(t.id)}>✕</button>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>

        {/* Rappels */}
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontFamily: "Urbanist, sans-serif", fontSize: 16, marginBottom: 12 }}>
            Rappels à venir
          </h2>
          {reminders.filter((r) => !r.sent_at).length === 0 ? (
            <div style={{ color: "#6E6E73", fontSize: 13, textAlign: "center", padding: 24 }}>
              Aucun rappel programmé
            </div>
          ) : reminders.filter((r) => !r.sent_at).map((r) => (
            <div key={r.id} style={{
              padding: 10, marginBottom: 6, background: "#FAFAFA",
              borderRadius: 8, border: "1px solid #E5E5EA",
            }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#6E6E73", marginTop: 3 }}>
                {new Date(r.remind_at).toLocaleString("fr-FR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                {r.project_id && ` • ${projTitle(r.project_id)}`}
                {r.calendar_event_id && " • 📅"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <NewTaskModal projects={projects} onClose={() => setShowNew(false)} onSaved={loadData} />
      )}
    </div>
  );
}

function NewTaskModal({ projects, onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", due_date: "", priority: "normal", project_id: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: form.title.trim(),
      due_date: form.due_date || null,
      priority: form.priority,
      project_id: form.project_id || null,
      description: form.description || null,
      source: "manual",
    });
    setSaving(false);
    if (error) alert(error.message);
    else { onSaved(); onClose(); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ padding: 24 }}>
        <h2 style={{ fontFamily: "Urbanist, sans-serif", fontSize: 20, marginBottom: 16 }}>
          Nouvelle tâche
        </h2>
        <input className="input" placeholder="Titre…" style={{ marginBottom: 10 }}
               value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        <textarea className="input" placeholder="Description (optionnel)" rows={3}
                  style={{ marginBottom: 10 }} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input type="date" className="input" value={form.due_date}
                 onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <select className="input" value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Faible</option>
            <option value="normal">Normale</option>
            <option value="high">Élevée</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <select className="input" value={form.project_id} style={{ marginBottom: 16 }}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
          <option value="">— Sans projet —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.title.trim()}>
            {saving ? "…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
