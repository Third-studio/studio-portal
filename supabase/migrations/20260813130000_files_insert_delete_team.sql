-- 2026-08-13 — ProdLivrables (App.js) ne persistait jamais en base : add()/del()
-- passaient uniquement par onUpdate → setProjects (état React en mémoire), sans
-- insert/delete Supabase sur public.files. Un ajout/suppression de rushes, document
-- de droits ou livrable final depuis la fiche projet disparaissait donc au
-- rechargement de page.
--
-- Corrigé côté front (ProdLivrables fait maintenant un vrai insert/delete sur
-- public.files). Cette migration s'assure que la policy manque bien du côté base :
-- on ne connaît pas les policies INSERT/DELETE historiques de public.files (schéma
-- de base non versionné), donc on ajoute des policies PERMISSIVE dédiées à l'équipe
-- plutôt que de deviner/remplacer l'existant. Si une policy équivalente existe déjà,
-- celle-ci s'y ajoute simplement en OR (comportement normal des policies PERMISSIVE) —
-- aucune régression possible.

drop policy if exists files_insert_team on public.files;
create policy files_insert_team on public.files
  for insert
  with check ( get_my_role() in ('admin','collaborateur') );

drop policy if exists files_delete_team on public.files;
create policy files_delete_team on public.files
  for delete
  using ( get_my_role() in ('admin','collaborateur') );
