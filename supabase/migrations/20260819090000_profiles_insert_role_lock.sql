-- 2026-08-19 — Verrouille aussi la création (INSERT) de `profiles`, pas
-- seulement la modification (UPDATE, déjà couverte par `profiles_role_lock`,
-- migration 20260815090000).
--
-- Contexte (item bloqué depuis plusieurs sessions, cf. AUDIT_MISSION.md) :
-- l'auto-inscription client (Login.js) ET la création de comptes équipe/client
-- par un admin (AccessManager/ClientsManager) écrivent la ligne `profiles`
-- via un premier upsert sur un id neuf — un INSERT, donc hors du périmètre de
-- `profiles_role_lock` (`for update` uniquement). Si une policy INSERT
-- historique permet à un utilisateur de créer sa propre ligne `profiles`
-- (nécessaire pour que l'auto-inscription fonctionne), rien n'empêchait un
-- appel direct à l'API avec `profiles.upsert({id:monId, role:"admin", ...})`.
--
-- Ce qui débloque ce correctif aujourd'hui : la création de comptes par un
-- admin (AccessManager.createAccess / ClientsManager.createAccount) ne passe
-- plus par le SDK client (`auth.signUp()` + upsert avec la session de
-- l'appelant) mais par l'edge function `create-account` (service_role,
-- vérifie elle-même le rôle admin/collaborateur du JWT appelant) — ce chemin
-- bypass RLS et n'est donc plus concerné par cette policy. Le seul INSERT
-- `profiles` restant sous RLS authenticated est l'auto-inscription
-- (Login.js), qui envoie toujours `role:"client"` en dur dans le code —
-- jamais un rôle fourni par l'utilisateur. Cette policy RESTRICTIVE (même
-- technique que `profiles_role_lock`, `clientStepsUnlocked`, `bookings`,
-- `files` : se combine en ET avec toute policy permissive existante, no-op
-- si aucune n'autorise déjà le self-insert) impose donc `role='client'` pour
-- tout INSERT non admin/collaborateur.

drop policy if exists profiles_insert_role_lock on public.profiles;
create policy profiles_insert_role_lock on public.profiles
  as restrictive
  for insert
  with check (
    get_my_role() in ('admin','collaborateur')
    or role = 'client'
  );
