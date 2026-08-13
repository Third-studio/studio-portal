-- 2026-08-13 — Livrables internes (rushes, documents de droits) invisibles côté client
-- À exécuter dans Supabase Studio → SQL Editor
--
-- Constat : `public.files` a une colonne `category` ('rushes' | 'droits' | 'finaux').
-- L'interface (ProdLivrables, App.js) masque déjà "rushes"/"droits" au client côté UI
-- ("Interne" vs "Visible client"), mais ce masquage est purement visuel : la policy
-- SELECT client/superviseur existante (posée hors dépôt, avant le suivi des migrations)
-- ne filtre pas par catégorie — le JSON complet des fichiers du projet (y compris notes
-- internes, liens de rushes, documents de droits) est renvoyé par PostgREST à toute
-- requête embarquant `files(*)` sur un projet accessible en lecture, visible via
-- l'onglet réseau du navigateur.
--
-- On ne connaît pas le nom exact de cette policy historique (schéma de base non versionné),
-- donc on ne la remplace pas à l'aveugle. On ajoute à la place une policy RESTRICTIVE :
-- en PostgreSQL, les policies RESTRICTIVE se combinent en ET avec toutes les policies
-- PERMISSIVE existantes sur la même commande, quel que soit leur nom — elle réduit donc
-- l'accès quelle que soit la policy permissive déjà en place, sans avoir à la connaître.
-- Aucun effet si RLS n'est pas activée sur la table (pas de régression possible).

drop policy if exists files_categorie_interne_restrict on public.files;
create policy files_categorie_interne_restrict on public.files
  as restrictive
  for select
  using (
    get_my_role() in ('admin','collaborateur')
    or category = 'finaux'
  );
