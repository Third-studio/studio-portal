// supabase/functions/invoice-chaser/index.ts
// Cron quotidien. Relance les factures impayées en 3 paliers :
//   J+1 après due_date  → rappel "courtois"
//   J+8                 → relance ferme
//   J+15+               → mise en demeure + crée une tâche pour Idriss
// Ne renvoie pas plus d'une relance / 7 jours par facture.
//
// Marque chase_paused=true pour qu'une facture soit ignorée (override manuel).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cronKey = req.headers.get("X-Cron-Key");
  const isCron = cronKey && cronKey === Deno.env.get("CRON_SHARED_SECRET");
  if (!isCron) {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth" }, 401);
    const { data: u } = await supabase.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Invalid session" }, 401);
    const { data: p } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
    if (p?.role !== "admin" && p?.role !== "collaborateur") return json({ error: "Forbidden" }, 403);
  }

  const result = { chased: 0, skipped: 0, escalated: 0, errors: [] as string[] };
  const today = new Date(); today.setHours(0, 0, 0, 0);

  try {
    const { data: invoices, error: iErr } = await supabase
      .from("invoices")
      .select(`
        id, number, label, amount_ttc, due_date, status, project_id, client_id,
        last_chase_at, chase_count, chase_paused, notes,
        client:profiles!invoices_client_id_fkey(id, email, nom),
        project:projects!invoices_project_id_fkey(id, title)
      `)
      .in("status", ["sent", "overdue"])
      .eq("chase_paused", false)
      .not("due_date", "is", null)
      .lt("due_date", today.toISOString().slice(0, 10))
      .limit(100);

    if (iErr) throw iErr;

    for (const inv of invoices || []) {
      try {
        const dueDate = new Date(inv.due_date);
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / 86400_000);

        // Pas de 2 relances dans la même semaine
        if (inv.last_chase_at) {
          const lastDays = Math.floor((today.getTime() - new Date(inv.last_chase_at).getTime()) / 86400_000);
          if (lastDays < 7) { result.skipped++; continue; }
        }

        const tier = daysLate >= 15 ? 3 : daysLate >= 8 ? 2 : 1;
        const clientEmail = (inv as any).client?.email;
        const clientName = (inv as any).client?.nom || "Bonjour";
        const projectTitle = (inv as any).project?.title || "votre projet";
        const ref = inv.number || `#${inv.id.slice(0, 8)}`;
        const amount = Number(inv.amount_ttc || 0).toFixed(2);

        if (!clientEmail) {
          // Pas d'email client → crée juste une tâche pour Idriss
          await supabase.from("tasks").insert({
            project_id: inv.project_id,
            title: `Relancer manuellement facture ${ref} (${amount}€) — pas d'email client`,
            priority: "high", source: "auto",
          });
          result.skipped++; continue;
        }

        const { subject, body } = buildChaseMail(tier, {
          ref, amount, dueDate: inv.due_date, projectTitle, clientName, label: inv.label,
        });

        // Envoi via send-email
        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const sendRes = await fetch(`${supaUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Cron-Key": Deno.env.get("CRON_SHARED_SECRET")!,
            "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          },
          body: JSON.stringify({
            to: clientEmail,
            subject,
            text: body,
            html: body.replace(/\n/g, "<br>"),
          }),
        });

        if (!sendRes.ok) {
          result.errors.push(`inv ${inv.id}: send ${sendRes.status}`);
          continue;
        }

        await supabase.from("invoices").update({
          last_chase_at: new Date().toISOString(),
          chase_count: (inv.chase_count || 0) + 1,
          status: daysLate > 0 ? "overdue" : inv.status,
        }).eq("id", inv.id);

        // Palier 3 : on crée aussi une tâche pour qu'Idriss appelle
        if (tier === 3) {
          await supabase.from("tasks").insert({
            project_id: inv.project_id,
            title: `Appeler ${clientName} — facture ${ref} (${amount}€) en retard de ${daysLate}j`,
            priority: "urgent",
            source: "auto",
            due_date: today.toISOString().slice(0, 10),
          });
          result.escalated++;
        }

        result.chased++;
      } catch (e) {
        result.errors.push(`inv ${inv.id}: ${(e as Error).message}`);
      }
    }

    await supabase.from("mail_logs").insert({
      source: "invoice-chaser", action: "push",
      success: result.errors.length === 0,
      message: `chased=${result.chased} escalated=${result.escalated}`,
      payload: result,
    });

    return json({ ok: true, result });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("mail_logs").insert({
      source: "invoice-chaser", action: "error", success: false, message: msg,
    });
    return json({ error: msg }, 500);
  }
});

function buildChaseMail(tier: 1 | 2 | 3, ctx: {
  ref: string; amount: string; dueDate: string; projectTitle: string; clientName: string; label: string | null;
}) {
  if (tier === 1) {
    return {
      subject: `Petit rappel — facture ${ctx.ref}`,
      body:
`Bonjour ${ctx.clientName},

Un petit mot pour vous rappeler que la facture ${ctx.ref}${ctx.label ? ` (${ctx.label})` : ""} relative à ${ctx.projectTitle}, d'un montant de ${ctx.amount} €, était échue au ${formatDate(ctx.dueDate)}.

Peut-être est-elle déjà partie en règlement ? Si oui merci d'ignorer ce message, sinon vous pouvez la régler par virement à réception.

Bien cordialement,
Idriss — Third-One Studio`,
    };
  }
  if (tier === 2) {
    return {
      subject: `Relance — facture ${ctx.ref} échue`,
      body:
`Bonjour ${ctx.clientName},

Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture ${ctx.ref} relative à ${ctx.projectTitle}, d'un montant de ${ctx.amount} €, échue depuis le ${formatDate(ctx.dueDate)}.

Pouvez-vous me confirmer la date de règlement prévue ?

Bien à vous,
Idriss — Third-One Studio`,
    };
  }
  return {
    subject: `Mise en demeure — facture ${ctx.ref} impayée`,
    body:
`Bonjour ${ctx.clientName},

Malgré nos relances, la facture ${ctx.ref} d'un montant de ${ctx.amount} €, échue depuis le ${formatDate(ctx.dueDate)}, demeure impayée.

Je vous demande de procéder au règlement dans un délai de 8 jours à compter de la réception de ce message, faute de quoi nous serions contraints d'engager les voies de recouvrement, conformément aux dispositions du Code de commerce (intérêts de retard + indemnité forfaitaire 40 €).

Je reste disponible pour échanger directement si vous rencontrez une difficulté.

Cordialement,
Idriss Duleme — Third-One Studio`,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
