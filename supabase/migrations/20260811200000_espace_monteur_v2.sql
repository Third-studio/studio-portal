-- 2026-08-11 — Espace monteur v2 : chrono, messagerie client, retours client
--
-- Le monteur (lien ?monteur=TOKEN, sans compte) peut désormais :
--   1. chronométrer son temps par projet (member_time_entries). On ne lui
--      renvoie JAMAIS ses totaux — seulement la session en cours ; les totaux
--      se lisent côté équipe.
--   2. écrire au client dans le fil du projet (table messages, role 'monteur') ;
--      le client est prévenu par email via call_edge → send-email.
--   3. voir le retour client sur sa vidéo (brief.videoStatus / videoComment).
-- Son espace reste strictement limité à ses projets attribués
-- (project_assignments — déjà le cas, reconduit ici).

-- ── 1. Sessions de temps ─────────────────────────────────────────────────────
create table if not exists public.member_time_entries (
  id         bigint generated always as identity primary key,
  member_id  bigint not null references public.team_members(id) on delete cascade,
  project_id bigint not null references public.projects(id)     on delete cascade,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  note       text
);
create index if not exists member_time_entries_member_idx
  on public.member_time_entries(member_id, started_at desc);
-- Une seule session ouverte par monteur.
create unique index if not exists member_time_entries_open_idx
  on public.member_time_entries(member_id) where ended_at is null;

alter table public.member_time_entries enable row level security;
drop policy if exists member_time_entries_team on public.member_time_entries;
create policy member_time_entries_team on public.member_time_entries
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- ── 2. Chrono : démarrer ────────────────────────────────────────────────────
create or replace function public.member_timer_start(p_token text, p_project bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  m public.team_members;
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

  -- Session déjà ouverte (autre projet ou oubli) → on la clôt proprement.
  update public.member_time_entries
     set ended_at = least(now(), started_at + interval '12 hours')
   where member_id = m.id and ended_at is null;

  insert into public.member_time_entries (member_id, project_id)
  values (m.id, p_project);

  return json_build_object('ok', true, 'startedAt', now());
end $$;

-- ── 3. Chrono : arrêter ─────────────────────────────────────────────────────
create or replace function public.member_timer_stop(p_token text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  m       public.team_members;
  e       public.member_time_entries;
  minutes integer;
begin
  select * into m from public.team_members
   where access_token = p_token and access_revoked_at is null;
  if m.id is null then
    return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué');
  end if;

  select * into e from public.member_time_entries
   where member_id = m.id and ended_at is null
   order by started_at desc limit 1;
  if e.id is null then
    return json_build_object('ok', false, 'error', 'Aucun chrono en cours');
  end if;

  -- Un chrono oublié toute la nuit ne doit pas gonfler les totaux : cap à 12h.
  update public.member_time_entries
     set ended_at = least(now(), started_at + interval '12 hours'),
         note     = left(nullif(trim(coalesce(p_note, '')), ''), 500)
   where id = e.id;

  select ceil(extract(epoch from (least(now(), e.started_at + interval '12 hours') - e.started_at)) / 60)::int
    into minutes;
  return json_build_object('ok', true, 'minutes', greatest(minutes, 1));
end $$;

-- ── 4. Message au client (+ notification email) ─────────────────────────────
create or replace function public.member_send_message(
  p_token   text,
  p_project bigint,
  p_content text
) returns json language plpgsql security definer set search_path = public as $$
declare
  m       public.team_members;
  clean   text;
  p_title text;
  c_email text;
  c_nom   text;
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

  clean := left(trim(coalesce(p_content, '')), 4000);
  if clean = '' then
    return json_build_object('ok', false, 'error', 'Message vide');
  end if;

  insert into public.messages (project_id, author, content, role)
  values (p_project, m.nom, clean, 'monteur');

  perform public.log_project_event(
    p_project, 'message', m.nom || ' a écrit au client',
    jsonb_build_object('member_id', m.id)
  );

  -- Notification email au client du projet (best effort, jamais bloquant).
  select p.title, pr.email, pr.nom into p_title, c_email, c_nom
    from public.projects p
    left join public.profiles pr on pr.id = p.client_id
   where p.id = p_project;

  if c_email is not null then
    perform public.call_edge('send-email', jsonb_build_object(
      'to',      c_email,
      'subject', 'Nouveau message sur « ' || coalesce(p_title, 'votre projet') || ' »',
      'kicker',  'Messagerie projet',
      'title',   'Nouveau message de ' || m.nom,
      'text',    'Bonjour ' || coalesce(c_nom, '') || ',' || E'\n\n'
                 || m.nom || ' (montage) vous a écrit sur « ' || coalesce(p_title, 'votre projet') || ' » :'
                 || E'\n\n« ' || left(clean, 300) || case when length(clean) > 300 then '… »' else ' »' end
                 || E'\n\nRépondez depuis votre espace client.',
      'cta',     jsonb_build_object('label', 'Ouvrir mon espace', 'url', 'https://thirdone.studio')
    ));
  end if;

  return json_build_object('ok', true, 'emailed', c_email is not null);
end $$;

-- ── 5. Workspace : + fil de messages, retour client, chrono en cours ────────
create or replace function public.get_member_workspace(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  m       public.team_members;
  projets json;
  chrono  json;
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

  select json_build_object('projectId', e.project_id, 'startedAt', e.started_at)
    into chrono
    from public.member_time_entries e
   where e.member_id = m.id and e.ended_at is null
   order by e.started_at desc limit 1;

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
           jsonb_build_object(
             'status',  p.brief->>'videoStatus',
             'comment', p.brief->>'videoComment'
           ) as "clientFeedback",
           coalesce((
             select json_agg(json_build_object('id', d.id, 'url', d.url, 'note', d.note, 'at', d.created_at)
                             order by d.created_at desc)
               from public.member_deliveries d
              where d.project_id = p.id and d.member_id = m.id
           ), '[]'::json) as deliveries,
           coalesce((
             select json_agg(json_build_object(
                      'id', msg.id, 'author', msg.author, 'content', msg.content,
                      'role', msg.role, 'at', msg.created_at) order by msg.created_at)
               from (
                 select ms.id, ms.author, ms.content, ms.role, ms.created_at
                   from public.messages ms
                  where ms.project_id = p.id
                    and coalesce(ms.role, '') <> 'prestataire'  -- propositions JSON, pas un fil
                  order by ms.created_at desc limit 30
               ) msg
           ), '[]'::json) as messages
      from public.project_assignments a
      join public.projects p on p.id = a.project_id
     where a.member_id = m.id
  ) x;

  return json_build_object(
    'valid', true,
    'member', json_build_object('id', m.id, 'nom', m.nom, 'role', m.role, 'color', m.color),
    'timer', chrono,
    'projects', projets
  );
end $$;

revoke all on function public.member_timer_start(text, bigint) from public;
revoke all on function public.member_timer_stop(text, text) from public;
revoke all on function public.member_send_message(text, bigint, text) from public;
grant execute on function public.member_timer_start(text, bigint) to anon, authenticated;
grant execute on function public.member_timer_stop(text, text) to anon, authenticated;
grant execute on function public.member_send_message(text, bigint, text) to anon, authenticated;
