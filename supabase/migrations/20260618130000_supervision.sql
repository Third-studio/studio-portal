-- 2026-06-18 — Supervision par entreprise
-- À exécuter dans Supabase Studio → SQL Editor
-- (https://supabase.com/dashboard/project/ytmflrwfapxaeryehgal/sql)
--
-- Objectif : un compte client marqué "superviseur" peut VOIR et AGIR (commenter,
-- valider) sur les projets / livrables / contenus / storyboards des autres comptes
-- client qui partagent la même valeur `profiles.company`.
-- Le regroupement se fait sur le texte libre `company` (déjà existant).
--
-- Les policies ci-dessous sont ADDITIVES (elles s'ajoutent aux policies client/admin
-- existantes — en RLS PostgreSQL les policies d'une même commande sont combinées en OR).
-- On n'utilise que des noms neufs (préfixe *_supervisor_* / *_self_*) pour ne rien casser.

-- 1) Colonne flag superviseur ----------------------------------------------------
alter table public.profiles add column if not exists is_supervisor boolean default false;

-- 2) Helpers (security definer → contournent la RLS, donc pas de récursion) -------
create or replace function public.my_company()
returns text language sql stable security definer set search_path = public as $$
  select company from public.profiles where id = auth.uid()
$$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(is_supervisor, false) from public.profiles where id = auth.uid()
$$;

-- Vrai si le user courant est superviseur ET que `cid` est un compte de sa company.
create or replace function public.supervises_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_supervisor()
     and public.my_company() is not null
     and exists (
       select 1 from public.profiles p
       where p.id = cid and p.company = public.my_company()
     )
$$;

-- 3) PROFILES : un superviseur lit les profils de sa propre company ---------------
drop policy if exists profiles_supervisor_read on public.profiles;
create policy profiles_supervisor_read on public.profiles
  for select using (
    public.is_supervisor()
    and company is not null
    and company = public.my_company()
  );

-- 4) PROJECTS : voir + modifier les projets des comptes supervisés ----------------
drop policy if exists projects_supervisor_select on public.projects;
create policy projects_supervisor_select on public.projects
  for select using ( public.supervises_client(client_id) );

drop policy if exists projects_supervisor_update on public.projects;
create policy projects_supervisor_update on public.projects
  for update using ( public.supervises_client(client_id) )
           with check ( public.supervises_client(client_id) );

-- 5) MESSAGES : lire + commenter sur les projets supervisés -----------------------
drop policy if exists messages_supervisor_select on public.messages;
create policy messages_supervisor_select on public.messages
  for select using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );

drop policy if exists messages_supervisor_insert on public.messages;
create policy messages_supervisor_insert on public.messages
  for insert with check (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );

-- 6) FILES : voir les livrables des projets supervisés (lecture seule) ------------
drop policy if exists files_supervisor_select on public.files;
create policy files_supervisor_select on public.files
  for select using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );

-- 7) POSTS (contenus CM) ----------------------------------------------------------
-- 7a. Le client peut mettre à jour le statut de SES posts (approbation / révision).
--     (nouveau : l'app persiste désormais ces validations)
drop policy if exists posts_client_update on public.posts;
create policy posts_client_update on public.posts
  for update using (
    project_id in (select id from public.projects where client_id = auth.uid())
  ) with check (
    project_id in (select id from public.projects where client_id = auth.uid())
  );
-- 7b. Le superviseur voit + met à jour les posts des projets supervisés.
drop policy if exists posts_supervisor_select on public.posts;
create policy posts_supervisor_select on public.posts
  for select using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );
drop policy if exists posts_supervisor_update on public.posts;
create policy posts_supervisor_update on public.posts
  for update using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  ) with check (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );

-- 8) STORYBOARDS ------------------------------------------------------------------
-- La table n'existait pas (storyboards éphémères côté front jusqu'ici). On la crée
-- pour persister la génération + la validation, puis on pose la RLS.
create table if not exists public.storyboards (
  id                uuid primary key default gen_random_uuid(),
  project_id        bigint references public.projects(id) on delete cascade,
  title             text,
  frames            jsonb default '[]'::jsonb,
  validation_status text default 'pending',
  created_at        timestamptz default now()
);
create index if not exists storyboards_project_idx on public.storyboards(project_id);

alter table public.storyboards enable row level security;

drop policy if exists storyboards_admin_all on public.storyboards;
create policy storyboards_admin_all on public.storyboards
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- Le client lit + crée + valide les storyboards de SES projets.
drop policy if exists storyboards_client_select on public.storyboards;
create policy storyboards_client_select on public.storyboards
  for select using (
    project_id in (select id from public.projects where client_id = auth.uid())
  );
drop policy if exists storyboards_client_insert on public.storyboards;
create policy storyboards_client_insert on public.storyboards
  for insert with check (
    project_id in (select id from public.projects where client_id = auth.uid())
  );
drop policy if exists storyboards_client_update on public.storyboards;
create policy storyboards_client_update on public.storyboards
  for update using (
    project_id in (select id from public.projects where client_id = auth.uid())
  ) with check (
    project_id in (select id from public.projects where client_id = auth.uid())
  );

-- Le superviseur lit + valide les storyboards des projets supervisés.
drop policy if exists storyboards_supervisor_select on public.storyboards;
create policy storyboards_supervisor_select on public.storyboards
  for select using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );
drop policy if exists storyboards_supervisor_update on public.storyboards;
create policy storyboards_supervisor_update on public.storyboards
  for update using (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  ) with check (
    project_id in (select id from public.projects where public.supervises_client(client_id))
  );

-- 9) Marquer un compte superviseur (à adapter) -----------------------------------
-- update public.profiles set is_supervisor = true, company = 'Société XYZ'
--   where email = 'cliente@societe.com';
-- update public.profiles set company = 'Société XYZ'
--   where email in ('alternant1@societe.com','alternant2@societe.com');
