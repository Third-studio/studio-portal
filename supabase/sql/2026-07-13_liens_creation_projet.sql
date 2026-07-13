-- 2026-07-13 — Liens publics de création de projet
-- Problème : certains clients ne peuvent pas accéder à l'espace (pare-feu entreprise
-- bloquant supabase.co ou les emails d'auth). Solution : un lien public ?nouveau=TOKEN
-- qui permet de créer un projet SANS compte — juste prénom / nom / société.
-- Le formulaire passe par /api/nouveau-projet (même domaine → traverse les pare-feux).
-- Si un email est fourni, le projet sera rattaché automatiquement au compte client
-- à sa première connexion (mécanisme claim_pending_projects existant).

-- 1. Table des liens
create table if not exists public.project_invites (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null,
  label        text,                          -- pour l'équipe (ex: "Salon Pro 2026", "Client SARA")
  single_use   boolean not null default false,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  uses         integer not null default 0,
  last_used_at timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.project_invites enable row level security;

drop policy if exists project_invites_admin_all on public.project_invites;
create policy project_invites_admin_all on public.project_invites
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- 2. Vérification d'un lien (page publique — accessible anon)
create or replace function public.get_project_invite(invite_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv public.project_invites;
begin
  select * into inv from public.project_invites where token = invite_token;
  if inv.id is null then
    return json_build_object('valid', false, 'reason', 'Lien introuvable');
  end if;
  if inv.revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'Lien révoqué');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return json_build_object('valid', false, 'reason', 'Lien expiré');
  end if;
  if inv.single_use and inv.uses > 0 then
    return json_build_object('valid', false, 'reason', 'Lien déjà utilisé');
  end if;
  return json_build_object('valid', true, 'label', inv.label);
end $$;

-- 3. Création d'un projet depuis un lien (anon — validations côté serveur)
create or replace function public.create_project_from_invite(
  invite_token        text,
  contact_prenom      text,
  contact_nom         text,
  contact_societe     text,
  contact_email       text default null,
  project_title       text default null,
  project_description text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  inv             public.project_invites;
  existing_client uuid;
  full_name       text;
  clean_email     text;
  new_brief       jsonb;
  new_id          uuid;
begin
  select * into inv from public.project_invites where token = invite_token for update;
  if inv.id is null or inv.revoked_at is not null
     or (inv.expires_at is not null and inv.expires_at < now())
     or (inv.single_use and inv.uses > 0) then
    return json_build_object('ok', false, 'error', 'Lien invalide, expiré ou déjà utilisé');
  end if;

  if coalesce(trim(contact_prenom), '') = ''
     or coalesce(trim(contact_nom), '') = ''
     or coalesce(trim(contact_societe), '') = '' then
    return json_build_object('ok', false, 'error', 'Prénom, nom et société sont requis');
  end if;

  full_name   := left(trim(contact_prenom) || ' ' || trim(contact_nom), 120);
  clean_email := nullif(lower(trim(coalesce(contact_email, ''))), '');

  -- Client déjà connu par email → rattachement direct
  if clean_email is not null then
    select id into existing_client from public.profiles
     where lower(email) = clean_email limit 1;
  end if;

  new_brief := jsonb_build_object(
    'notes', left(coalesce(project_description, ''), 4000),
    'draft', true, 'submitted', false, 'source', 'lien',
    'contactName', full_name,
    'contactCompany', left(trim(contact_societe), 120),
    'inviteLabel', coalesce(inv.label, '')
  );
  -- Pas de compte → rattachement différé via claim_pending_projects()
  if existing_client is null and clean_email is not null then
    new_brief := new_brief || jsonb_build_object(
      'pendingClientEmail', clean_email,
      'pendingClientName', full_name,
      'pendingClientCompany', left(trim(contact_societe), 120)
    );
  end if;

  insert into public.projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note)
  values (
    left(coalesce(nullif(trim(project_title), ''), 'Projet — ' || trim(contact_societe)), 200),
    existing_client, 'brief', 0, new_brief, '', null, null, null
  ) returning id into new_id;

  update public.project_invites
     set uses = uses + 1, last_used_at = now()
   where id = inv.id;

  return json_build_object('ok', true, 'project_id', new_id);
end $$;

revoke all on function public.get_project_invite(text) from public;
revoke all on function public.create_project_from_invite(text, text, text, text, text, text, text) from public;
grant execute on function public.get_project_invite(text) to anon, authenticated;
grant execute on function public.create_project_from_invite(text, text, text, text, text, text, text) to anon, authenticated;
