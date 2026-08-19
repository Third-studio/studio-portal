-- 2026-08-13 — Le client ne peut plus s'auto-attribuer l'accès aux étapes internes
-- À exécuter dans Supabase Studio → SQL Editor
--
-- `projects.brief` (jsonb) mélange des champs édités par le client (objective, target,
-- duration…) et un flag réservé à l'équipe : `clientStepsUnlocked`, qui déverrouille pour
-- le client les onglets moodboard/storyboards/révisions/livrables (App.js, gatedTabs). Ce
-- flag n'est posé que par `toggleClientAccess` / `toggleProjectAccess`, deux actions admin.
-- Mais le client a (légitimement) le droit d'UPDATE sa propre ligne `projects` pour éditer
-- son brief, et cette permission porte sur la colonne `brief` entière : rien n'empêche
-- aujourd'hui un client d'appeler l'API Supabase directement (JWT valide, clé anon) avec
-- `brief: {...actuel, clientStepsUnlocked: true}` pour se déverrouiller lui-même l'accès
-- aux étapes internes du projet.
--
-- Comme pour les livrables internes (migration précédente), la policy UPDATE historique
-- sur `projects` n'est pas versionnée (schéma de base antérieur au suivi des migrations) :
-- on ne la remplace pas à l'aveugle. Ajout d'une policy RESTRICTIVE (combinée en ET avec
-- n'importe quelle policy permissive existante, quel que soit son nom) qui interdit à tout
-- rôle non admin/collaborateur de modifier la valeur de clientStepsUnlocked par rapport à
-- ce qui est déjà enregistré en base.

create or replace function public.project_client_steps_unlocked(pid bigint)
returns text language sql stable security definer set search_path = public as $$
  select brief->>'clientStepsUnlocked' from public.projects where id = pid
$$;

drop policy if exists projects_client_steps_unlocked_lock on public.projects;
create policy projects_client_steps_unlocked_lock on public.projects
  as restrictive
  for update
  with check (
    get_my_role() in ('admin','collaborateur')
    or (brief->>'clientStepsUnlocked') is not distinct from public.project_client_steps_unlocked(id)
  );
