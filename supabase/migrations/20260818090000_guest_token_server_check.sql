-- 2026-08-18 — Lien invité (?guest=TOKEN) : expiration/révocation appliquées côté serveur
-- À exécuter dans Supabase Studio → SQL Editor
--
-- Les liens invités (accès temporaire "validation vidéo" pour un tiers sans compte, App.js
-- ~1511) sont stockés dans `projects.brief->guests` (jsonb : token/name/createdAt/expiresAt),
-- pas dans une table dédiée. `GuestView` (App.js ~4663) appelle la RPC
-- `get_project_by_guest_token(guest_token)` qui renvoie le projet, PUIS vérifie `expiresAt`
-- côté client (App.js ~4666) avant d'afficher les données déjà reçues. La révocation
-- (App.js ~1534) se contente de retirer l'entrée du tableau `guests` en base — donc si la RPC
-- elle-même ne revalide pas le jeton contre l'état courant de `brief->guests`, un token expiré
-- ou révoqué reste exploitable indéfiniment via un appel direct à l'API (anon key) qui contourne
-- l'UI. La définition actuelle de `get_project_by_guest_token` n'existe dans aucune migration
-- versionnée (schéma de base) : impossible de savoir avec certitude ce qu'elle vérifie déjà sans
-- accès à la base réelle, donc pas de remplacement à l'aveugle (même prudence que pour
-- mail-classify/gmail-sync et profiles_role_lock : un CREATE OR REPLACE sur une fonction dont on
-- ne connaît pas la définition/signature exacte peut casser silencieusement le flux existant).
--
-- Approche additive à la place : une NOUVELLE fonction qui revalide expiration ET présence dans
-- `brief->guests` directement en SQL (le schéma de `projects.id/title/brief/replay_url` est lui
-- bien connu, réutilisé dans de nombreuses migrations de ce projet), et bascule du client vers
-- cette fonction. L'ancienne fonction est privée d'exécution pour anon/authenticated si elle
-- existe (revoke silencieux si elle n'existe pas/plus, pour ne jamais faire échouer ce script) —
-- fermant le contournement par appel direct pointant encore sur l'ancien nom.

do $$
begin
  execute 'revoke execute on function public.get_project_by_guest_token(text) from anon, authenticated';
exception when undefined_function then
  null;
end $$;

-- Type de retour dédié (pas `returns setof public.projects`/`table(...)`, qui forceraient
-- PostgREST à renvoyer un tableau côté client — `GuestView` (App.js) accède à `data.brief`/
-- `data.id` directement, comme sur une fonction à ligne unique) et pas `returns public.projects`
-- (qui exposerait TOUTES les colonnes de la table, y compris des colonnes internes non destinées
-- à un visiteur anonyme) : uniquement les 4 colonnes déjà lues côté client aujourd'hui.
drop type if exists public.guest_project_result cascade;
create type public.guest_project_result as (
  id bigint,
  title text,
  brief jsonb,
  replay_url text
);

create or replace function public.get_client_guest_project(p_guest_token text)
returns public.guest_project_result
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result public.guest_project_result;
begin
  select p.id, p.title, p.brief, p.replay_url
  into v_result
  from public.projects p
  cross join lateral jsonb_array_elements(coalesce(p.brief->'guests', '[]'::jsonb)) as g
  where g->>'token' = p_guest_token
    and (g->>'expiresAt') is not null
    and (g->>'expiresAt')::timestamptz > now()
  limit 1;

  if v_result.id is null then
    return null;
  end if;

  return v_result;
end;
$$;

grant execute on function public.get_client_guest_project(text) to anon, authenticated;
