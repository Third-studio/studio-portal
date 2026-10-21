-- 2026-10-21 — Studio IA : un client crée une animation 2D / motion design depuis son espace.
-- Le brief part en file (creation_jobs). L'atelier (le Mac d'Idriss, ~/thirdone-worker/worker.mjs) le prend,
-- fabrique la vidéo avec Claude + HyperFrames, la dépose dans le bucket « reviews » et crée une version
-- à relire : le client la regarde, la commente image par image et la valide comme toute autre version.
-- Activation par espace (share_links.creation_enabled) avec un quota mensuel (creation_quota).
-- L'atelier s'authentifie par un secret haché (worker_state.secret_hash) ; son battement de cœur dit s'il est allumé.

alter table public.share_links
  add column if not exists creation_enabled boolean not null default false,
  add column if not exists creation_quota   integer not null default 3 check (creation_quota between 0 and 100);

-- ───────────────────────────── Tables ─────────────────────────────
create table if not exists public.creation_jobs (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references public.share_links(id) on delete cascade,
  project_id  bigint references public.projects(id) on delete set null,
  author      text not null check (length(author) between 2 and 60),
  title       text not null check (length(trim(title)) between 2 and 120),
  prompt      text not null check (length(trim(prompt)) between 10 and 4000),
  format      text not null default '9:16' check (format in ('9:16','16:9','1:1')),
  duration_s  integer not null default 30 check (duration_s between 5 and 90),
  status      text not null default 'en_attente' check (status in ('en_attente','en_cours','publie','echec','annule')),
  worker_note text,
  error       text,
  version_id  uuid references public.project_versions(id) on delete set null,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists creation_jobs_link_idx   on public.creation_jobs (link_id, created_at desc);
create index if not exists creation_jobs_status_idx on public.creation_jobs (status, created_at);

alter table public.creation_jobs enable row level security;
drop policy if exists creation_jobs_team on public.creation_jobs;
create policy creation_jobs_team on public.creation_jobs
  for all using ( get_my_role() in ('admin','collaborateur') )
  with check ( get_my_role() in ('admin','collaborateur') );
revoke all on public.creation_jobs from anon, public;
grant select, insert, update, delete on public.creation_jobs to authenticated;

-- Une seule ligne : l'état de l'atelier.
create table if not exists public.worker_state (
  id           integer primary key default 1 check (id = 1),
  secret_hash  text,
  heartbeat_at timestamptz,
  current_job  uuid,
  host         text,
  updated_at   timestamptz not null default now()
);
insert into public.worker_state (id) values (1) on conflict do nothing;
alter table public.worker_state enable row level security;
drop policy if exists worker_state_team_read on public.worker_state;
create policy worker_state_team_read on public.worker_state
  for select using ( get_my_role() in ('admin','collaborateur') );
revoke all on public.worker_state from anon, public;
grant select on public.worker_state to authenticated;

-- ─────────────────────── Fonctions internes (non exposées) ───────────────────────
create or replace function public.worker_check(p_secret text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select secret_hash is not null and crypt(p_secret, secret_hash) = secret_hash
                     from public.worker_state where id = 1), false);
$$;
revoke all on function public.worker_check(text) from public, anon, authenticated;

-- Créations décomptées ce mois-ci (heure de la Martinique). Les échecs et les annulations ne comptent pas.
create or replace function public.creation_used(p_link uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.creation_jobs
   where link_id = p_link and status not in ('echec','annule')
     and created_at >= (date_trunc('month', now() at time zone 'America/Martinique') at time zone 'America/Martinique');
$$;
revoke all on function public.creation_used(uuid) from public, anon, authenticated;

create or replace function public.creation_job_json(j public.creation_jobs)
returns json language sql stable set search_path = public as $$
  select json_build_object(
    'id', j.id, 'projectId', j.project_id, 'author', j.author, 'title', j.title, 'prompt', j.prompt,
    'format', j.format, 'durationS', j.duration_s, 'status', j.status, 'note', j.worker_note, 'error', j.error,
    'versionId', j.version_id, 'createdAt', j.created_at, 'startedAt', j.started_at, 'finishedAt', j.finished_at,
    'projectTitle', (select title from public.projects where id = j.project_id));
$$;
revoke all on function public.creation_job_json(public.creation_jobs) from public, anon, authenticated;

-- ─────────────────────── Côté client (anon, par jeton d'espace) ───────────────────────
create or replace function public.link_creation_space(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  l    public.share_links;
  used integer;
  hb   timestamptz;
begin
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 then return json_build_object('ok', false, 'reason', 'Lien introuvable.'); end if;
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is null then return json_build_object('ok', false, 'reason', 'Lien introuvable ou révoqué.'); end if;
  if not l.creation_enabled or l.read_only then return json_build_object('ok', true, 'enabled', false); end if;
  used := public.creation_used(l.id);
  select heartbeat_at into hb from public.worker_state where id = 1;
  return json_build_object(
    'ok', true, 'enabled', true,
    'quota', l.creation_quota, 'used', used, 'remaining', greatest(l.creation_quota - used, 0),
    'workerOnline', hb is not null and hb > now() - interval '3 minutes',
    'projects', coalesce((
      select json_agg(json_build_object('id', p.id, 'title', p.title) order by p.title)
        from public.share_link_projects lp join public.projects p on p.id = lp.project_id
       where lp.link_id = l.id and p.archived_at is null), '[]'::json),
    'jobs', coalesce((
      select json_agg(public.creation_job_json(j) order by j.created_at desc)
        from public.creation_jobs j where j.link_id = l.id), '[]'::json));
end $$;

create or replace function public.link_create_job(p_token text, p_project bigint, p_author text, p_title text, p_prompt text,
                                                  p_format text default '9:16', p_duration integer default 30)
returns json language plpgsql security definer set search_path = public as $$
declare
  l    public.share_links;
  used integer;
  pid  bigint := p_project;
  pos  integer;
  j    public.creation_jobs;
begin
  perform pg_sleep(0.2);
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is null then return json_build_object('ok', false, 'reason', 'Lien introuvable ou révoqué.'); end if;
  if not l.creation_enabled or l.read_only then return json_build_object('ok', false, 'reason', 'La création n''est pas activée sur cet espace.'); end if;
  if length(trim(coalesce(p_author, ''))) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if length(trim(coalesce(p_title, ''))) < 2 then return json_build_object('ok', false, 'reason', 'Donnez un titre à votre animation.'); end if;
  if length(trim(coalesce(p_prompt, ''))) < 10 then return json_build_object('ok', false, 'reason', 'Décrivez votre animation en quelques phrases.'); end if;
  if p_format not in ('9:16','16:9','1:1') or p_duration not between 5 and 90 then return json_build_object('ok', false, 'reason', 'Format ou durée invalide.'); end if;

  used := public.creation_used(l.id);
  if used >= l.creation_quota then
    return json_build_object('ok', false, 'reason', format('Quota atteint : %s création%s ce mois-ci. Écrivez à l''équipe pour en demander davantage.', l.creation_quota, case when l.creation_quota > 1 then 's' else '' end));
  end if;
  if (select count(*) from public.creation_jobs where link_id = l.id and status in ('en_attente','en_cours')) >= 2 then
    return json_build_object('ok', false, 'reason', 'Deux créations sont déjà en fabrication. Attendez qu''elles soient prêtes.');
  end if;

  if pid is not null then
    if not exists (select 1 from public.share_link_projects lp join public.projects p on p.id = lp.project_id
                    where lp.link_id = l.id and lp.project_id = pid and p.archived_at is null) then
      return json_build_object('ok', false, 'reason', 'Projet inconnu sur cet espace.');
    end if;
  else
    insert into public.projects (title, status, progress, company_id, client_id, brief)
      values (left(trim(p_title), 120), 'montage', 10, l.company_id, l.client_id,
              jsonb_build_object('source', 'studio_ia', 'prompt', trim(p_prompt), 'submitted', true, 'author', trim(p_author)))
      returning id into pid;
    select coalesce(max(position), 0) + 1 into pos from public.share_link_projects where link_id = l.id;
    insert into public.share_link_projects (link_id, project_id, group_id, position) values (l.id, pid, null, pos);
  end if;

  insert into public.creation_jobs (link_id, project_id, author, title, prompt, format, duration_s)
    values (l.id, pid, left(trim(p_author), 60), left(trim(p_title), 120), trim(p_prompt), p_format, p_duration)
    returning * into j;

  return json_build_object('ok', true, 'job', public.creation_job_json(j), 'remaining', greatest(l.creation_quota - used - 1, 0));
end $$;

create or replace function public.link_cancel_job(p_token text, p_job uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  l public.share_links;
  n integer;
begin
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is null then return json_build_object('ok', false, 'reason', 'Lien introuvable ou révoqué.'); end if;
  update public.creation_jobs set status = 'annule', finished_at = now()
   where id = p_job and link_id = l.id and status = 'en_attente';
  get diagnostics n = row_count;
  if n = 0 then return json_build_object('ok', false, 'reason', 'Cette création a déjà démarré : elle ne peut plus être annulée.'); end if;
  return json_build_object('ok', true);
end $$;

-- ─────────────────────── Côté atelier (anon + secret) ───────────────────────
-- p_current : le job que l'atelier croit tenir (null au démarrage). Un job « en_cours » que l'atelier ne tient
-- pas est orphelin (atelier redémarré pendant un rendu) : il passe en échec, puis on sert le suivant.
create or replace function public.worker_poll(p_secret text, p_host text default null, p_current uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  j       public.creation_jobs;
  l       public.share_links;
  societe text;
  cnotes  text;
begin
  if not public.worker_check(p_secret) then return json_build_object('ok', false, 'reason', 'secret'); end if;
  update public.worker_state set heartbeat_at = now(), host = coalesce(p_host, host), updated_at = now() where id = 1;

  update public.creation_jobs
     set status = 'echec', error = 'Atelier interrompu pendant la fabrication.', finished_at = now()
   where status = 'en_cours' and (p_current is null or id <> p_current);

  if p_current is not null and exists (select 1 from public.creation_jobs where id = p_current and status = 'en_cours') then
    return json_build_object('ok', true, 'job', null, 'busy', true);
  end if;

  select * into j from public.creation_jobs where status = 'en_attente' order by created_at limit 1 for update skip locked;
  if j.id is null then
    update public.worker_state set current_job = null where id = 1;
    return json_build_object('ok', true, 'job', null);
  end if;

  update public.creation_jobs set status = 'en_cours', started_at = now(), worker_note = 'Prise en charge par l''atelier.'
   where id = j.id returning * into j;
  update public.worker_state set current_job = j.id where id = 1;

  select * into l from public.share_links where id = j.link_id;
  select c.name, c.notes into societe, cnotes from public.client_companies c where c.id = l.company_id;
  return json_build_object('ok', true, 'job', (public.creation_job_json(j)::jsonb || jsonb_build_object(
    'space', l.label, 'company', societe, 'companyNotes', cnotes))::json);
end $$;

create or replace function public.worker_progress(p_secret text, p_job uuid, p_note text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_check(p_secret) then return json_build_object('ok', false, 'reason', 'secret'); end if;
  update public.worker_state set heartbeat_at = now(), updated_at = now() where id = 1;
  update public.creation_jobs set worker_note = left(p_note, 300) where id = p_job and status = 'en_cours';
  return json_build_object('ok', true);
end $$;

-- Fin de fabrication. Succès : la vidéo est déjà dans le bucket (URL /media/ sur notre domaine) → version à relire
-- visible du client + message dans le fil du projet. Échec : le job garde l'erreur, rien n'est créé.
create or replace function public.worker_finish(p_secret text, p_job uuid, p_video_url text default null, p_duration numeric default null,
                                                p_fps numeric default 25, p_error text default null, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  j   public.creation_jobs;
  vid uuid;
begin
  if not public.worker_check(p_secret) then return json_build_object('ok', false, 'reason', 'secret'); end if;
  select * into j from public.creation_jobs where id = p_job and status = 'en_cours';
  if j.id is null then return json_build_object('ok', false, 'reason', 'job'); end if;

  if p_error is not null or coalesce(p_video_url, '') = '' then
    update public.creation_jobs set status = 'echec', error = left(coalesce(p_error, 'Aucune vidéo produite.'), 2000),
           worker_note = left(p_note, 300), finished_at = now() where id = j.id;
  else
    if p_video_url !~* '^https://(www\.)?thirdone\.studio/media/' then return json_build_object('ok', false, 'reason', 'url'); end if;
    if j.project_id is null then return json_build_object('ok', false, 'reason', 'project'); end if;
    insert into public.project_versions (project_id, label, video_url, fps, duration_s, note, status, visible_client, created_by)
      values (j.project_id, left('Studio IA · ' || j.title, 120), p_video_url, coalesce(p_fps, 25), p_duration,
              'Créée depuis l''espace client par ' || j.author || E'.\nBrief : ' || left(j.prompt, 600),
              'a_valider', true, 'Studio IA')
      returning id into vid;
    update public.creation_jobs set status = 'publie', version_id = vid, worker_note = left(p_note, 300), finished_at = now() where id = j.id;
    update public.projects set progress = greatest(coalesce(progress, 0), 60) where id = j.project_id;
    begin
      insert into public.messages (project_id, author, content, role, kind, link_id, visibility)
        values (j.project_id, 'Studio IA',
                'Votre animation « ' || j.title || ' » est prête. Regardez-la, commentez-la image par image et validez-la, ou décrivez une nouvelle version.',
                'studio', 'message', j.link_id, 'client');
    exception when others then null; end;
  end if;

  update public.worker_state set current_job = null, heartbeat_at = now(), updated_at = now() where id = 1;
  return json_build_object('ok', true, 'versionId', vid);
end $$;

-- Secret de l'atelier : défini par un administrateur depuis Studio › Studio IA, affiché une seule fois.
create or replace function public.worker_set_secret(p_secret text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if get_my_role() <> 'admin' then return json_build_object('ok', false, 'reason', 'Réservé aux administrateurs.'); end if;
  if length(coalesce(p_secret, '')) < 24 then return json_build_object('ok', false, 'reason', '24 caractères minimum.'); end if;
  update public.worker_state set secret_hash = crypt(p_secret, gen_salt('bf')), updated_at = now() where id = 1;
  return json_build_object('ok', true);
end $$;

revoke all on function public.link_creation_space(text) from public;
revoke all on function public.link_create_job(text, bigint, text, text, text, text, integer) from public;
revoke all on function public.link_cancel_job(text, uuid) from public;
revoke all on function public.worker_poll(text, text, uuid) from public;
revoke all on function public.worker_progress(text, uuid, text) from public;
revoke all on function public.worker_finish(text, uuid, text, numeric, numeric, text, text) from public;
revoke all on function public.worker_set_secret(text) from public, anon;
grant execute on function public.link_creation_space(text) to anon, authenticated;
grant execute on function public.link_create_job(text, bigint, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.link_cancel_job(text, uuid) to anon, authenticated;
grant execute on function public.worker_poll(text, text, uuid) to anon, authenticated;
grant execute on function public.worker_progress(text, uuid, text) to anon, authenticated;
grant execute on function public.worker_finish(text, uuid, text, numeric, numeric, text, text) to anon, authenticated;
grant execute on function public.worker_set_secret(text) to authenticated;

-- ─────────────────────── Emails à l'équipe (best effort) ───────────────────────
create or replace function public.trg_notify_admin_creation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  espace text;
  dest   text[];
  sujet  text;
  titre  text;
  corps  text;
begin
  if tg_op = 'UPDATE' and (new.status = old.status or new.status not in ('publie','echec')) then return new; end if;
  select label into espace from public.share_links where id = new.link_id;
  select array_agg(email) into dest from public.profiles
   where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
  if dest is null then return new; end if;

  if tg_op = 'INSERT' then
    sujet := '✨ Création IA demandée : « ' || new.title || ' »' || coalesce(' (' || espace || ')', '');
    titre := new.author || ' demande une animation';
    corps := 'Espace : ' || coalesce(espace, '?') || E'\nTitre : ' || new.title || E'\nFormat : ' || new.format || ' · ' || new.duration_s || ' s' ||
             E'\n\n' || new.prompt || E'\n\nL''atelier la fabrique dès qu''il est allumé.';
  elsif new.status = 'publie' then
    sujet := '🎬 Création IA prête : « ' || new.title || ' »' || coalesce(' (' || espace || ')', '');
    titre := 'L''animation est en ligne dans l''espace client';
    corps := 'Espace : ' || coalesce(espace, '?') || E'\nTitre : ' || new.title || E'\nDemandée par : ' || new.author ||
             E'\n\nLa version est visible du client, à relire aussi côté équipe.';
  else
    sujet := '⚠️ Création IA en échec : « ' || new.title || ' »' || coalesce(' (' || espace || ')', '');
    titre := 'La fabrication a échoué';
    corps := 'Espace : ' || coalesce(espace, '?') || E'\nTitre : ' || new.title || E'\n\n' || coalesce(new.error, 'Sans détail.') ||
             E'\n\nRelance possible depuis Studio › Studio IA.';
  end if;

  begin
    perform public.call_edge('send-email', jsonb_build_object(
      'to', to_jsonb(dest), 'subject', sujet, 'kicker', 'Studio IA', 'title', titre, 'text', corps,
      'cta', jsonb_build_object('label', 'Ouvrir le studio', 'url', 'https://www.thirdone.studio/studio/studio-ia')));
  exception when others then null; end;
  return new;
end $$;
revoke all on function public.trg_notify_admin_creation() from public, anon, authenticated;

drop trigger if exists trg_creation_jobs_notify on public.creation_jobs;
create trigger trg_creation_jobs_notify
  after insert or update of status on public.creation_jobs
  for each row execute function public.trg_notify_admin_creation();
