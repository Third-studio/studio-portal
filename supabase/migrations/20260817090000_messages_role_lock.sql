-- 2026-08-17 — Un client/prestataire ne peut plus usurper le rôle "prod" dans les messages
-- À exécuter dans Supabase Studio → SQL Editor
--
-- `public.messages` (project_id, author, content, role) est alimenté par 4 points d'insertion
-- côté client (App.js) : ProdProjectView (role toujours "prod", authentifié admin/collaborateur),
-- ClientProjectView (role toujours "client", authentifié client), PartenaireView ×2 (role
-- toujours "prestataire", authentifié partenaire) — mais `role` est un champ libre envoyé par le
-- client dans le body de l'insert, non vérifié côté serveur. Un appel direct à l'API Supabase
-- (JWT client valide, clé anon) avec `messages.insert({...,role:"prod"})` échappe à l'UI et
-- usurpe un message "prod" : le champ `role` conditionne l'affichage (bulle, alignement, carte
-- de proposition prestataire) ET une métrique métier (App.js ~3437 : compte les projets dont le
-- dernier message est côté "prod" pour repérer ceux en attente de relance client — un client
-- pourrait ainsi masquer son propre projet de cette file en insérant un faux message "prod").
-- Le seul chemin d'insertion sans session utilisateur est la RPC security definer
-- `member_send_message` (jeton monteur, auth.uid() NULL) : les fonctions SECURITY DEFINER
-- s'exécutent avec les privilèges du propriétaire de la fonction et ne sont, par défaut, pas
-- soumises aux policies RLS (sauf FORCE ROW LEVEL SECURITY, non constaté ailleurs dans ce
-- projet) — la clause `auth.uid() is null` ci-dessous est donc une garde défensive redondante,
-- pas le mécanisme principal de non-régression de ce chemin.
-- Seul `role` est verrouillé ici, pas `author` : `author` n'est qu'un libellé d'affichage
-- (nom formaté côté client, ex. "Nom (Société)" via fmtClientAuthor) sans effet d'autorisation
-- ni de métrique — le reproduire fidèlement côté SQL sans connaître le format exact risquerait
-- une régression visuelle pour un gain de sécurité nul.

drop policy if exists messages_role_lock on public.messages;
create policy messages_role_lock on public.messages
  as restrictive
  for insert
  with check (
    auth.uid() is null
    or role = case
      when get_my_role() in ('admin', 'collaborateur') then 'prod'
      when get_my_role() = 'client' then 'client'
      when get_my_role() = 'partenaire' then 'prestataire'
    end
  );
