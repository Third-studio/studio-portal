-- 2026-08-03 — Espace monteur par lien
-- Un monteur (team_members) reçoit UN lien permanent ?monteur=TOKEN qui regroupe
-- tous les projets où il est assigné (project_assignments). Il peut y déposer un
-- lien de montage + un commentaire. Aucun compte, aucune écriture directe :
-- tout passe par deux RPC security definer.

-- ── 1. Jeton d'accès par membre ──────────────────────────────────────────────
alter table public.team_members add column if not exists access_token      text;
alter table public.team_members add column if not exists access_revoked_at timestamptz;

update public.team_members
   set access_token = replace(gen_random_uuid()::text, '-', '')
 where access_token is null;

create unique index if not exists team_members_access_token_idx
  on public.team_members(access_token);

-- ── 2. Dépôts des monteurs ───────────────────────────────────────────────────
create table if not exists public.member_deliveries (
  id         bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id)     on delete cascade,
  member_id  bigint not null references public.team_members(id) on delete cascade,
  url        text   not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists member_deliveries_project_idx on public.member_deliveries(project_id, created_at desc);

alter table public.member_deliveries enable row level security;
drop policy if exists member_deliveries_team on public.member_deliveries;
create policy member_deliveries_team on public.member_deliveries
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- ── 3. Lecture de l'espace (anon, via jeton) ─────────────────────────────────
create or replace function public.get_member_workspace(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  m       public.team_members;
  projets json;
begin
  if coalesce(trim(p_token), '') = '' then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;
  select * into m from public.team_members where access_token = p_token;
  if m.id is null then
    return json_build_object('valid', false, 'reason', 'Lien introuvable');
  end if;
  if m.access_revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'Lien révoqué');
  end if;

  select coalesce(json_agg(x order by x.delivery_date nulls last, x.title), '[]'::json) into projets
  from (
    select p.id,
           p.title,
           p.status,
           p.progress,
           p.status_note   as "statusNote",
           p.delivery_date as delivery_date,
           p.shoot_date    as "shootDate",
           p.replay_url    as "replayUrl",
           a.role_on_project as "roleOnProject",
           jsonb_build_object(
             'objective', p.brief->>'objective',
             'target',    p.brief->>'target',
             'duration',  p.brief->>'duration',
             'tone',      p.brief->>'tone',
             'notes',     p.brief->>'notes'
           ) as brief,
           coalesce((
             select json_agg(json_build_object('id', d.id, 'url', d.url, 'note', d.note, 'at', d.created_at)
                             order by d.created_at desc)
               from public.member_deliveries d
              where d.project_id = p.id and d.member_id = m.id
           ), '[]'::json) as deliveries
      from public.project_assignments a
      join public.projects p on p.id = a.project_id
     where a.member_id = m.id
  ) x;

  return json_build_object(
    'valid', true,
    'member', json_build_object('id', m.id, 'nom', m.nom, 'role', m.role, 'color', m.color),
    'projects', projets
  );
end $$;

-- ── 4. Dépôt d'un lien de montage (anon, via jeton) ──────────────────────────
create or replace function public.member_add_delivery(
  p_token   text,
  p_project bigint,
  p_url     text,
  p_note    text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  m         public.team_members;
  clean_url text;
  ok_link   boolean;
begin
  select * into m from public.team_members
   where access_token = p_token and access_revoked_at is null;
  if m.id is null then
    return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué');
  end if;

  if not exists (select 1 from public.project_assignments a
                  where a.member_id = m.id and a.project_id = p_project) then
    return json_build_object('ok', false, 'error', 'Projet non attribué');
  end if;

  clean_url := trim(coalesce(p_url, ''));
  -- Même liste blanche que ALLOWED_DOMAINS côté front.
  ok_link := clean_url ~* '^https://(www\.)?(youtu\.be|youtube\.com|vimeo\.com|player\.vimeo\.com|dropbox\.com|drive\.google\.com|docs\.google\.com|wetransfer\.com|we\.tl|frame\.io|app\.frame\.io|frameio\.com|notion\.so|1drv\.ms|onedrive\.live\.com)(/|$)';
  if not ok_link then
    return json_build_object('ok', false, 'error', 'Lien non autorisé — Vimeo, YouTube, Drive, Dropbox, WeTransfer ou Frame.io');
  end if;

  insert into public.member_deliveries (project_id, member_id, url, note)
  values (p_project, m.id, left(clean_url, 500), left(nullif(trim(coalesce(p_note, '')), ''), 1000));

  perform public.log_project_event(
    p_project, 'montage',
    m.nom || ' a déposé une version de montage',
    jsonb_build_object('member_id', m.id, 'url', left(clean_url, 500))
  );

  return json_build_object('ok', true);
end $$;

revoke all on function public.get_member_workspace(text) from public;
revoke all on function public.member_add_delivery(text, bigint, text, text) from public;
grant execute on function public.get_member_workspace(text) to anon, authenticated;
grant execute on function public.member_add_delivery(text, bigint, text, text) to anon, authenticated;
