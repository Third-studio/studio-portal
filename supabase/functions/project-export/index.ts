// supabase/functions/project-export/index.ts
// Export consolidé d'un projet : tasks + emails + invoices + quotes + planning.
// Formats : json (default), csv.
//
// Appel : supabase.functions.invoke("project-export", { body: { project_id, format } })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth" }, 401);
  const { data: u } = await supabase.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Invalid session" }, 401);
  const { data: p } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
  if (p?.role !== "admin" && p?.role !== "collaborateur") return json({ error: "Forbidden" }, 403);

  try {
    const { project_id, format = "json" } = await req.json();
    if (!project_id) return json({ error: "missing project_id" }, 400);

    const [project, tasks, emails, invoices, quotes, planning, messages] = await Promise.all([
      supabase.from("projects").select("*").eq("id", project_id).single(),
      supabase.from("tasks").select("*").eq("project_id", project_id).order("due_date", { ascending: true }),
      supabase.from("emails").select("id, received_at, from_addr, subject, kind, urgence, summary_fr, detected_amount, detected_date").eq("project_id", project_id).order("received_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("project_id", project_id).order("issued_at", { ascending: false }),
      supabase.from("quotes").select("*").eq("project_id", project_id).order("issued_at", { ascending: false }),
      supabase.from("planning_slots").select("*").eq("project_id", project_id).order("date", { ascending: true }),
      supabase.from("messages").select("id, created_at, sender_id, body").eq("project_id", project_id).order("created_at", { ascending: true }).limit(500),
    ]);

    if (project.error) return json({ error: "project not found" }, 404);

    const payload = {
      generated_at: new Date().toISOString(),
      project: project.data,
      tasks: tasks.data || [],
      emails: emails.data || [],
      invoices: invoices.data || [],
      quotes: quotes.data || [],
      planning: planning.data || [],
      messages: messages.data || [],
      totals: {
        invoices_paid_ttc:  sum(invoices.data, "amount_ttc", (i: any) => i.status === "paid"),
        invoices_pending_ttc: sum(invoices.data, "amount_ttc", (i: any) => ["draft", "sent", "overdue"].includes(i.status)),
        quotes_accepted_ttc: sum(quotes.data, "amount_ttc", (q: any) => q.status === "accepted"),
      },
    };

    if (format === "csv") {
      const csv = buildCsv(payload);
      return new Response(csv, {
        headers: { ...CORS, "Content-Type": "text/csv; charset=utf-8",
                   "Content-Disposition": `attachment; filename="project-${project_id}-export.csv"` },
      });
    }

    return json(payload);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function sum(rows: any[] | null, field: string, where?: (r: any) => boolean): number {
  return (rows || []).filter(where || (() => true))
    .reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

function csvLine(values: (string | number | null | undefined)[]): string {
  return values.map((v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  }).join(";");
}

function buildCsv(p: any): string {
  const lines: string[] = [];
  lines.push(`# Export projet ${p.project.id} — ${p.project.title}`);
  lines.push(`# Généré le ${p.generated_at}`);
  lines.push("");

  lines.push("## TÂCHES");
  lines.push(csvLine(["id", "title", "due_date", "priority", "status", "source"]));
  for (const t of p.tasks) lines.push(csvLine([t.id, t.title, t.due_date, t.priority, t.status, t.source]));
  lines.push("");

  lines.push("## EMAILS");
  lines.push(csvLine(["received_at", "from", "subject", "kind", "urgence", "résumé", "montant", "date"]));
  for (const e of p.emails) lines.push(csvLine([e.received_at, e.from_addr, e.subject, e.kind, e.urgence, e.summary_fr, e.detected_amount, e.detected_date]));
  lines.push("");

  lines.push("## FACTURES");
  lines.push(csvLine(["number", "label", "amount_ht", "amount_ttc", "status", "issued_at", "due_date", "paid_at"]));
  for (const f of p.invoices) lines.push(csvLine([f.number, f.label, f.amount_ht, f.amount_ttc, f.status, f.issued_at, f.due_date, f.paid_at]));
  lines.push("");

  lines.push("## DEVIS");
  lines.push(csvLine(["number", "label", "direction", "amount_ttc", "status", "issued_at", "valid_until"]));
  for (const q of p.quotes) lines.push(csvLine([q.number, q.label, q.direction, q.amount_ttc, q.status, q.issued_at, q.valid_until]));
  lines.push("");

  lines.push("## TOTAUX");
  lines.push(csvLine(["Factures payées (TTC)", p.totals.invoices_paid_ttc]));
  lines.push(csvLine(["Factures en attente (TTC)", p.totals.invoices_pending_ttc]));
  lines.push(csvLine(["Devis acceptés (TTC)", p.totals.quotes_accepted_ttc]));

  return lines.join("\n");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
