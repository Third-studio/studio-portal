-- 2026-08-15 — Le client ne peut plus s'auto-attribuer un rôle admin
-- À exécuter dans Supabase Studio → SQL Editor
--
-- Découvert en revue de sécurité (App.js ~4400-4650, création de comptes prestataires /
-- clients) : les comptes équipe/client sont créés côté client (App.js, AccessManager /
-- ClientsManager) via `supabase.auth.signUp()` puis `supabase.from("profiles").upsert({..,
-- role:"partenaire"|"client",..})`. Ces appels ne sont gardés que par `isAdmin` côté React
-- (affichage du formulaire) — rien n'empêche un utilisateur authentifié d'appeler
-- directement l'API Supabase (JWT valide, clé anon) avec
-- `profiles.update({role:"admin"}).eq("id", monPropreId)` si la policy UPDATE historique sur
-- `profiles` (non versionnée, schéma antérieur au suivi des migrations) autorise un
-- utilisateur à modifier sa propre ligne — pattern courant pour permettre l'édition du nom/
-- avatar. Impossible de confirmer l'étendue exacte de cette policy sans lire sa définition
-- actuelle en base ; plutôt que de la remplacer à l'aveugle (risque de régression, cf.
-- mail-classify/gmail-sync du 2026-08-13), même technique que pour
-- `clientStepsUnlocked`/`bookings`/`files` : une policy RESTRICTIVE qui se combine en ET avec
-- n'importe quelle policy permissive existante et interdit à tout rôle non admin/collaborateur
-- de changer la valeur de `role` par rapport à ce qui est déjà enregistré — sans issue si
-- aucune policy self-update n'existe (no-op), filet de sécurité si elle existe.

create or replace function public.profile_role_before_update(pid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = pid
$$;

drop policy if exists profiles_role_lock on public.profiles;
create policy profiles_role_lock on public.profiles
  as restrictive
  for update
  with check (
    get_my_role() in ('admin','collaborateur')
    or role is not distinct from public.profile_role_before_update(id)
  );
