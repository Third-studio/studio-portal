-- 2026-10-21 — Studio IA : la « ligne modif ». Le client demande une modification d'une animation publiée sans
-- redécrire le film : un job kind='revision' rattaché au job d'origine (parent_job_id, root_job_id, revision_n).
-- L'atelier repart de la composition existante (copiée depuis le dossier du job parent), reçoit l'historique des
-- modifications déjà faites et les commentaires non résolus posés dans le lecteur sur la version parente.
-- Les modifications ne consomment pas le quota mensuel ; 3 par animation au maximum. La version parente passe
-- en « remplacée » (toujours visible) quand la nouvelle est publiée.

alter table public.creation_jobs
  add column if not exists kind          text not null default 'creation' check (kind in ('creation','revision')),
  add column if not exists parent_job_id uuid references public.creation_jobs(id) on delete set null,
  add column if not exists root_job_id   uuid references public.creation_jobs(id) on delete set null,
  add column if not exists revision_n    integer not null default 0 check (revision_n between 0 and 20);
create index if not exists creation_jobs_root_idx on public.creation_jobs (root_job_id);
update public.creation_jobs set root_job_id = id where root_job_id is null and kind = 'creation';

-- Le quota mensuel ne compte que les créations.
create or replace function public.creation_used(p_link uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.creation_jobs
   where link_id = p_link and kind = 'creation' and status not in ('echec','annule')
     and created_at >= (date_trunc('month', now() at time zone 'America/Martinique') at time zone 'America/Martinique');
$$;

create or replace function public.creation_job_json(j public.creation_jobs)
returns json language sql stable set search_path = public as $$
  select json_build_object(
    'id', j.id, 'projectId', j.project_id, 'author', j.author, 'title', j.title, 'prompt', j.prompt,
    'format', j.format, 'durationS', j.duration_s, 'status', j.status, 'note', j.worker_note, 'error', j.error,
    'versionId', j.version_id, 'createdAt', j.created_at, 'startedAt', j.started_at, 'finishedAt', j.finished_at,
    'kind', j.kind, 'parentJobId', j.parent_job_id, 'rootJobId', j.root_job_id, 'revisionN', j.revision_n,
    'projectTitle', (select title from public.projects where id = j.project_id));
$$;

-- ─────────────────────── Client : demander une modification ───────────────────────
create or replace function public.link_revise_job(p_token text, p_parent uuid, p_author text, p_changes text)
returns json language plpgsql security definer set search_path = public as $$
declare
  max_revisions constant integer := 3;
  l    public.share_links;
  pj   public.creation_jobs;
  rid  uuid;
  n    integer;
  j    public.creation_jobs;
begin
  perform pg_sleep(0.2);
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is null then return json_build_object('ok', false, 'reason', 'Lien introuvable ou révoqué.'); end if;
  if not l.creation_enabled or l.read_only then return json_build_object('ok', false, 'reason', 'La création n''est pas activée sur cet espace.'); end if;
  if length(trim(coalesce(p_author, ''))) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if length(trim(coalesce(p_changes, ''))) < 5 then return json_build_object('ok', false, 'reason', 'Décrivez ce que vous voulez changer.'); end if;

  select * into pj from public.creation_jobs where id = p_parent and link_id = l.id;
  if pj.id is null then return json_build_object('ok', false, 'reason', 'Animation introuvable sur cet espace.'); end if;
  if pj.status <> 'publie' or pj.version_id is null then return json_build_object('ok', false, 'reason', 'Cette animation n''est pas encore publiée : attendez qu''elle soit prête.'); end if;
  rid := coalesce(pj.root_job_id, pj.id);

  select count(*) into n from public.creation_jobs
   where root_job_id = rid and kind = 'revision' and status not in ('echec','annule');
  if n >= max_revisions then
    return json_build_object('ok', false, 'reason', format('%s modifications ont déjà été demandées sur cette animation. Pour aller plus loin, écrivez à l''équipe dans le fil du projet.', max_revisions));
  end if;
  if exists (select 1 from public.creation_jobs where root_job_id = rid and status in ('en_attente','en_cours')) then
    return json_build_object('ok', false, 'reason', 'Une modification de cette animation est déjà en cours. Attendez qu''elle soit prête.');
  end if;
  if (select count(*) from public.creation_jobs where link_id = l.id and status in ('en_attente','en_cours')) >= 2 then
    return json_build_object('ok', false, 'reason', 'Deux créations sont déjà en fabrication. Attendez qu''elles soient prêtes.');
  end if;

  insert into public.creation_jobs (link_id, project_id, author, title, prompt, format, duration_s, kind, parent_job_id, root_job_id, revision_n)
    values (l.id, pj.project_id, left(trim(p_author), 60), pj.title, trim(p_changes), pj.format, pj.duration_s, 'revision', pj.id, rid, n + 1)
    returning * into j;
  return json_build_object('ok', true, 'job', public.creation_job_json(j));
end $$;
revoke all on function public.link_revise_job(text, uuid, text, text) from public;
grant execute on function public.link_revise_job(text, uuid, text, text) to anon, authenticated;

-- ─────────────────────── Atelier : worker_poll avec le contexte de modification ───────────────────────
create or replace function public.worker_poll(p_secret text, p_host text default null, p_current uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  j       public.creation_jobs;
  pj      public.creation_jobs;
  l       public.share_links;
  societe text;
  cnotes  text;
  extra   jsonb := '{}'::jsonb;
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

  if j.kind = 'revision' and j.parent_job_id is not null then
    select * into pj from public.creation_jobs where id = j.parent_job_id;
    extra := jsonb_build_object(
      'parent', jsonb_build_object('jobId', pj.id, 'prompt', pj.prompt, 'versionId', pj.version_id, 'kind', pj.kind),
      'originalPrompt', (select r.prompt from public.creation_jobs r where r.id = j.root_job_id),
      'history', coalesce((
        select jsonb_agg(jsonb_build_object('n', c.revision_n, 'changes', c.prompt, 'author', c.author) order by c.revision_n)
          from public.creation_jobs c
         where c.root_job_id = j.root_job_id and c.kind = 'revision' and c.id <> j.id and c.status = 'publie'), '[]'::jsonb),
      'comments', coalesce((
        select jsonb_agg(jsonb_build_object('t', round(vc.t_seconds, 2), 'author', vc.author, 'body', vc.body) order by vc.t_seconds)
          from public.version_comments vc
         where vc.version_id = pj.version_id and vc.role = 'client' and vc.resolved_at is null), '[]'::jsonb));
  end if;

  return json_build_object('ok', true, 'job', (public.creation_job_json(j)::jsonb || jsonb_build_object(
    'space', l.label, 'company', societe, 'companyNotes', cnotes) || extra)::json);
end $$;

-- ─────────────────────── Atelier : worker_finish, version vN et parent remplacé ───────────────────────
create or replace function public.worker_finish(p_secret text, p_job uuid, p_video_url text default null, p_duration numeric default null,
                                                p_fps numeric default 25, p_error text default null, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  j     public.creation_jobs;
  pj    public.creation_jobs;
  l     public.share_links;
  vid   uuid;
  lbl   text;
  msg   text;
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

    lbl := 'Studio IA · ' || j.title || case when j.kind = 'revision' then ' · v' || (j.revision_n + 1) else '' end;
    insert into public.project_versions (project_id, label, video_url, fps, duration_s, note, status, visible_client, created_by)
      values (j.project_id, left(lbl, 120), p_video_url, coalesce(p_fps, 25), p_duration,
              case when j.kind = 'revision'
                   then 'Modification demandée depuis l''espace client par ' || j.author || E'.\nChangements : ' || left(j.prompt, 600)
                   else 'Créée depuis l''espace client par ' || j.author || E'.\nBrief : ' || left(j.prompt, 600) end,
              'a_valider', true, 'Studio IA')
      returning id into vid;
    update public.creation_jobs set status = 'publie', version_id = vid, worker_note = left(p_note, 300), finished_at = now() where id = j.id;
    update public.projects set progress = greatest(coalesce(progress, 0), 60) where id = j.project_id;

    -- La version parente est remplacée (reste visible pour comparer) ; ses commentaires client sont marqués traités.
    if j.kind = 'revision' and j.parent_job_id is not null then
      select * into pj from public.creation_jobs where id = j.parent_job_id;
      if pj.version_id is not null then
        update public.project_versions set status = 'remplacee' where id = pj.version_id and status = 'a_valider';
        update public.version_comments set resolved_at = now(), resolved_by = 'Studio IA'
         where version_id = pj.version_id and role = 'client' and resolved_at is null;
      end if;
    end if;

    msg := case when j.kind = 'revision'
                then 'La version ' || (j.revision_n + 1) || ' de « ' || j.title || ' » est prête, avec vos modifications. Regardez-la, commentez-la ou validez-la.'
                else 'Votre animation « ' || j.title || ' » est prête. Regardez-la, commentez-la image par image et validez-la, ou décrivez une nouvelle version.' end;
    begin
      insert into public.messages (project_id, author, content, role, kind, link_id, visibility)
        values (j.project_id, 'Studio IA', msg, 'studio', 'message', j.link_id, 'client');
    exception when others then null; end;

    select * into l from public.share_links where id = j.link_id;
    if l.contact_email is not null and l.revoked_at is null then
      begin
        perform public.call_edge('send-email', jsonb_build_object(
          'to', to_jsonb(array[l.contact_email]), 'link_id', l.id, 'project_id', j.project_id, 'kind', 'creation_prete',
          'subject', '🎬 ' || case when j.kind = 'revision' then 'Version ' || (j.revision_n + 1) || ' de « ' || j.title || ' » prête' else 'Votre animation « ' || j.title || ' » est prête' end,
          'kicker', 'Studio IA', 'title', case when j.kind = 'revision' then 'Vos modifications sont en ligne' else 'Votre animation est en ligne' end,
          'text', msg || E'\n\nOuvrez-la pour la commenter image par image, la valider, ou demander une autre modification.',
          'cta', jsonb_build_object('label', 'Regarder l''animation', 'url', 'https://www.thirdone.studio/p/' || l.token || '/v/' || vid)));
      exception when others then null; end;
    end if;
  end if;

  update public.worker_state set current_job = null, heartbeat_at = now(), updated_at = now() where id = 1;
  return json_build_object('ok', true, 'versionId', vid);
end $$;
