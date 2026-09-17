-- 2026-09-17 — Liens de partage client v2 (plateforme thirdone-studio)
-- Un lien = une sélection de projets choisie par l'équipe, organisée en groupes
-- et sous-groupes. Lecture sans compte via RPC security definer. Le client peut
-- répondre (nominatif) et valider une version. Replay (Dropbox Replay) pour les
-- versions, WeTransfer pour les finaux une fois validé.

-- ── 1. Projets : final + validation ──────────────────────────────────────────
alter table public.projects add column if not exists final_url     text;
alter table public.projects add column if not exists validated_at  timestamptz;
alter table public.projects add column if not exists validated_by  text;

-- ── 2. Messages : origine + nature ───────────────────────────────────────────
alter table public.messages add column if not exists kind       text not null default 'message';   -- message | validation
alter table public.messages add column if not exists link_id    uuid;
alter table public.messages add column if not exists created_at timestamptz not null default now();

-- ── 3. Liens, groupes, projets liés ──────────────────────────────────────────
create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  label       text not null,
  client_id   uuid references public.profiles(id) on delete set null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  last_seen_at timestamptz
);

create table if not exists public.share_link_groups (
  id        uuid primary key default gen_random_uuid(),
  link_id   uuid not null references public.share_links(id) on delete cascade,
  parent_id uuid references public.share_link_groups(id) on delete cascade,
  name      text not null,
  position  int  not null default 0
);

create table if not exists public.share_link_projects (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid   not null references public.share_links(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  group_id   uuid references public.share_link_groups(id) on delete set null,
  position   int not null default 0,
  unique (link_id, project_id)
);

create index if not exists share_link_groups_link_idx   on public.share_link_groups(link_id);
create index if not exists share_link_projects_link_idx on public.share_link_projects(link_id);
create index if not exists messages_link_idx            on public.messages(link_id);

alter table public.share_links          enable row level security;
alter table public.share_link_groups    enable row level security;
alter table public.share_link_projects  enable row level security;

drop policy if exists share_links_team on public.share_links;
create policy share_links_team on public.share_links
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
drop policy if exists share_link_groups_team on public.share_link_groups;
create policy share_link_groups_team on public.share_link_groups
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
drop policy if exists share_link_projects_team on public.share_link_projects;
create policy share_link_projects_team on public.share_link_projects
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- ── 4. Lecture de l'espace par lien (anon) ───────────────────────────────────
-- Accepte un jeton share_links (v2) ou, à défaut, l'ancien profiles.share_token.
create or replace function public.get_link_space(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  l        public.share_links;
  c        public.profiles;
  groupes  json := '[]'::json;
  projets  json := '[]'::json;
begin
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;

  select * into l from public.share_links where token = p_token;

  if l.id is not null then
    if l.revoked_at is not null then
      return json_build_object('valid', false, 'reason', 'Lien révoqué');
    end if;
    update public.share_links set last_seen_at = now() where id = l.id;
    if l.client_id is not null then select * into c from public.profiles where id = l.client_id; end if;

    select coalesce(json_agg(json_build_object('id', g.id, 'parentId', g.parent_id, 'name', g.name, 'position', g.position) order by g.position, g.name), '[]'::json)
      into groupes from public.share_link_groups g where g.link_id = l.id;

    select coalesce(json_agg(x order by x."position", x."createdAt" desc), '[]'::json) into projets
    from (
      select p.id, p.title, p.status, p.progress,
             p.status_note   as "statusNote",
             p.delivery_date as "deliveryDate",
             p.shoot_date    as "shootDate",
             p.replay_url    as "replayUrl",
             p.final_url     as "finalUrl",
             p.validated_at  as "validatedAt",
             p.validated_by  as "validatedBy",
             p.created_at    as "createdAt",
             lp.group_id     as "groupId",
             lp.position,
             coalesce((
               select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
                 from public.messages m
                where m.project_id = p.id and (m.link_id = l.id or m.role in ('admin','collaborateur','studio','monteur'))
             ), '[]'::json) as messages
        from public.share_link_projects lp
        join public.projects p on p.id = lp.project_id
       where lp.link_id = l.id
    ) x;

    return json_build_object(
      'valid', true,
      'link', json_build_object('label', l.label, 'kind', 'link'),
      'client', case when c.id is null then null else json_build_object('nom', c.nom, 'company', c.company) end,
      'groups', groupes,
      'projects', projets
    );
  end if;

  -- Ancien lien par client (profiles.share_token) : tous ses projets, sans groupe.
  select * into c from public.profiles where share_token = p_token and role = 'client';
  if c.id is null then return json_build_object('valid', false, 'reason', 'Lien introuvable'); end if;
  if c.share_revoked_at is not null then return json_build_object('valid', false, 'reason', 'Lien révoqué'); end if;
  if c.is_active is false then return json_build_object('valid', false, 'reason', 'Accès suspendu'); end if;

  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) into projets
  from (
    select p.id, p.title, p.status, p.progress,
           p.status_note as "statusNote", p.delivery_date as "deliveryDate", p.shoot_date as "shootDate",
           p.replay_url as "replayUrl", p.final_url as "finalUrl", p.validated_at as "validatedAt", p.validated_by as "validatedBy",
           p.created_at as "createdAt", null::uuid as "groupId", 0 as position,
           coalesce((
             select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
               from public.messages m where m.project_id = p.id and m.role in ('client','admin','collaborateur','studio','monteur')
           ), '[]'::json) as messages
      from public.projects p where p.client_id = c.id
  ) x;

  return json_build_object(
    'valid', true,
    'link', json_build_object('label', coalesce(c.company, c.nom), 'kind', 'legacy'),
    'client', json_build_object('nom', c.nom, 'company', c.company),
    'groups', '[]'::json,
    'projects', projets
  );
end $$;

revoke all on function public.get_link_space(text) from public;
grant execute on function public.get_link_space(text) to anon, authenticated;

-- ── 5. Réponse / validation depuis la page (anon, nominatif) ─────────────────
create or replace function public.link_post_message(p_token text, p_project bigint, p_author text, p_content text, p_kind text default 'message')
returns json language plpgsql security definer set search_path = public as $$
declare
  l       public.share_links;
  c       public.profiles;
  auteur  text := left(regexp_replace(coalesce(trim(p_author), ''), '\s+', ' ', 'g'), 60);
  texte   text := left(coalesce(trim(p_content), ''), 4000);
  allowed boolean := false;
  m       public.messages;
begin
  if length(auteur) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if p_kind not in ('message','validation') then return json_build_object('ok', false, 'reason', 'Type inconnu'); end if;
  if p_kind = 'message' and length(texte) < 1 then return json_build_object('ok', false, 'reason', 'Message vide'); end if;

  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is not null then
    select true into allowed from public.share_link_projects where link_id = l.id and project_id = p_project;
  else
    select * into c from public.profiles where share_token = p_token and role = 'client' and share_revoked_at is null and coalesce(is_active, true);
    if c.id is not null then
      select true into allowed from public.projects where id = p_project and client_id = c.id;
    end if;
  end if;
  if not coalesce(allowed, false) then return json_build_object('ok', false, 'reason', 'Projet non accessible avec ce lien'); end if;

  if p_kind = 'validation' then
    texte := coalesce(nullif(texte, ''), 'Version validée.');
    update public.projects set validated_at = now(), validated_by = auteur where id = p_project;
  end if;

  insert into public.messages (project_id, author, content, role, kind, link_id)
  values (p_project, auteur, texte, 'client', p_kind, l.id)
  returning * into m;

  begin perform public.log_project_event(p_project, case when p_kind = 'validation' then 'client_validation' else 'client_message' end, auteur || ' : ' || left(texte, 140)); exception when others then null; end;

  return json_build_object('ok', true, 'message', json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at));
end $$;

revoke all on function public.link_post_message(text, bigint, text, text, text) from public;
grant execute on function public.link_post_message(text, bigint, text, text, text) to anon, authenticated;
