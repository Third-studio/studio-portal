-- 2026-09-17 — Espace équipe v2 : archivage projets, sociétés clientes + contacts, droits équipe
alter table public.projects add column if not exists archived_at timestamptz;
alter table public.projects add column if not exists company_id  uuid;

create table if not exists public.client_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contacts   jsonb not null default '[]'::jsonb,   -- [{nom, role, email, tel}]
  notes      text,
  created_at timestamptz not null default now()
);
alter table public.projects    add constraint projects_company_fk    foreign key (company_id) references public.client_companies(id) on delete set null not valid;
alter table public.share_links add column if not exists company_id uuid references public.client_companies(id) on delete set null;
create index if not exists projects_company_idx on public.projects(company_id);
create index if not exists projects_archived_idx on public.projects(archived_at);

alter table public.client_companies enable row level security;
drop policy if exists client_companies_team on public.client_companies;
create policy client_companies_team on public.client_companies
  for all using ( get_my_role() in ('admin','collaborateur') ) with check ( get_my_role() in ('admin','collaborateur') );

-- L'équipe (admin + collaborateur) lit et écrit projets, membres, attributions
drop policy if exists projects_team on public.projects;
create policy projects_team on public.projects
  for all using ( get_my_role() in ('admin','collaborateur') ) with check ( get_my_role() in ('admin','collaborateur') );
drop policy if exists team_members_team on public.team_members;
create policy team_members_team on public.team_members
  for all using ( get_my_role() in ('admin','collaborateur') ) with check ( get_my_role() in ('admin','collaborateur') );
drop policy if exists project_assignments_team on public.project_assignments;
create policy project_assignments_team on public.project_assignments
  for all using ( get_my_role() in ('admin','collaborateur') ) with check ( get_my_role() in ('admin','collaborateur') );

-- Nom du client sur l'espace par lien : société rattachée au lien, sinon profil, sinon société du projet
create or replace function public.get_link_space(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  l        public.share_links;
  c        public.profiles;
  cc       public.client_companies;
  groupes  json := '[]'::json;
  projets  json := '[]'::json;
begin
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;
  select * into l from public.share_links where token = p_token;
  if l.id is not null then
    if l.revoked_at is not null then return json_build_object('valid', false, 'reason', 'Lien révoqué'); end if;
    update public.share_links set last_seen_at = now() where id = l.id;
    if l.client_id is not null then select * into c from public.profiles where id = l.client_id; end if;
    if l.company_id is not null then select * into cc from public.client_companies where id = l.company_id; end if;

    select coalesce(json_agg(json_build_object('id', g.id, 'parentId', g.parent_id, 'name', g.name, 'position', g.position) order by g.position, g.name), '[]'::json)
      into groupes from public.share_link_groups g where g.link_id = l.id;

    select coalesce(json_agg(x order by x."position", x."createdAt" desc), '[]'::json) into projets
    from (
      select p.id, p.title, p.status, p.progress,
             p.status_note as "statusNote", p.delivery_date as "deliveryDate", p.shoot_date as "shootDate",
             p.replay_url as "replayUrl", p.final_url as "finalUrl", p.validated_at as "validatedAt", p.validated_by as "validatedBy",
             p.created_at as "createdAt", lp.group_id as "groupId", lp.position,
             coalesce((
               select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
                 from public.messages m
                where m.project_id = p.id and (m.link_id = l.id or m.role in ('admin','collaborateur','studio','monteur'))
             ), '[]'::json) as messages
        from public.share_link_projects lp
        join public.projects p on p.id = lp.project_id
       where lp.link_id = l.id and p.archived_at is null
    ) x;

    return json_build_object(
      'valid', true,
      'link', json_build_object('label', l.label, 'kind', 'link'),
      'client', case when c.id is not null then json_build_object('nom', c.nom, 'company', c.company)
                     when cc.id is not null then json_build_object('nom', cc.name, 'company', cc.name)
                     else null end,
      'groups', groupes, 'projects', projets);
  end if;

  select * into c from public.profiles where share_token = p_token and role = 'client';
  if c.id is null then return json_build_object('valid', false, 'reason', 'Lien introuvable'); end if;
  if c.share_revoked_at is not null then return json_build_object('valid', false, 'reason', 'Lien révoqué'); end if;
  if c.is_active is false then return json_build_object('valid', false, 'reason', 'Accès suspendu'); end if;
  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) into projets
  from (
    select p.id, p.title, p.status, p.progress, p.status_note as "statusNote", p.delivery_date as "deliveryDate", p.shoot_date as "shootDate",
           p.replay_url as "replayUrl", p.final_url as "finalUrl", p.validated_at as "validatedAt", p.validated_by as "validatedBy",
           p.created_at as "createdAt", null::uuid as "groupId", 0 as position,
           coalesce((select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
                       from public.messages m where m.project_id = p.id and m.role in ('client','admin','collaborateur','studio','monteur')), '[]'::json) as messages
      from public.projects p where p.client_id = c.id and p.archived_at is null
  ) x;
  return json_build_object('valid', true, 'link', json_build_object('label', coalesce(c.company, c.nom), 'kind', 'legacy'),
    'client', json_build_object('nom', c.nom, 'company', c.company), 'groups', '[]'::json, 'projects', projets);
end $$;
