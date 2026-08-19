// supabase/functions/create-account/index.ts
// Création de comptes équipe/client par un admin, via service_role — remplace
// l'appel client-side à supabase.auth.signUp(), qui swap la session active de
// l'admin sur le compte nouvellement créé si la confirmation email est
// désactivée sur le projet (comportement documenté du SDK Supabase) : l'admin
// se retrouvait potentiellement déconnecté de son propre compte en pleine
// création d'un accès. Bonus : l'écriture profiles passe désormais par
// service_role (bypass RLS), donc plus aucune dépendance sur la policy INSERT
// historique de `profiles` (non versionnée) pour ce flux.
//
// Rôles créables : "client" (ClientsManager) et "partenaire" (AccessManager).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const CREATABLE_ROLES = ["client", "partenaire"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Auth : seul un admin/collaborateur peut créer un compte
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth" }, 401);
  const { data: u } = await supabase.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Invalid session" }, 401);
  const { data: callerProfile } = await supabase.from("profiles")
    .select("role").eq("id", u.user.id).single();
  if (!["admin", "collaborateur"].includes(callerProfile?.role ?? "")) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const role = body.role;
    if (!email || !password || !CREATABLE_ROLES.includes(role)) {
      return json({ error: "email, password et role (client|partenaire) requis" }, 400);
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, role },
    });
    if (createErr) return json({ error: createErr.message }, 400);
    const uid = created.user?.id;
    if (!uid) return json({ error: "Création compte impossible" }, 500);

    // Profil : uniquement les colonnes attendues par le rôle créé, jamais
    // celles envoyées librement par l'appelant au-delà de cette liste.
    const profile: Record<string, unknown> = { id: uid, email, nom, role, is_active: true };
    if (role === "client") {
      profile.company = typeof body.company === "string" ? body.company || null : null;
      profile.client_type = typeof body.client_type === "string" ? body.client_type : "PME";
      profile.discount = Number(body.discount) || 0;
      profile.simulator_enabled = body.simulator_enabled === true;
      profile.shortone_enabled = body.shortone_enabled === true;
      profile.is_supervisor = body.is_supervisor === true;
    }

    const { error: profileErr } = await supabase.from("profiles").upsert(profile);
    if (profileErr) {
      // Compte auth créé mais profil en échec : on retire le compte orphelin
      // plutôt que de laisser un utilisateur sans ligne profiles (rôle inconnu).
      await supabase.auth.admin.deleteUser(uid);
      return json({ error: profileErr.message }, 400);
    }

    return json({ id: uid });
  } catch (e) {
    console.error("create-account", e);
    return json({ error: "Erreur interne" }, 500);
  }
});
