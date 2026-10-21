-- 2026-10-21 — Studio IA : style de l'animation. Le client choisit un style nommé (ou laisse l'atelier libre) ;
-- le worker applique la recette ~/thirdone-worker/styles/<style>.md. Premier style : « hologramme-schema »
-- (vulgarisation au trait, appris du reel @ottok.zz). Les modifications héritent du style du parent.

alter table public.creation_jobs
  add column if not exists style text check (style is null or style in ('hologramme-schema'));

create or replace function public.creation_job_json(j public.creation_jobs)
returns json language sql stable set search_path = public as $$
  select json_build_object(
    'id', j.id, 'projectId', j.project_id, 'author', j.author, 'title', j.title, 'prompt', j.prompt,
    'format', j.format, 'durationS', j.duration_s, 'status', j.status, 'note', j.worker_note, 'error', j.error,
    'versionId', j.version_id, 'createdAt', j.created_at, 'startedAt', j.started_at, 'finishedAt', j.finished_at,
    'kind', j.kind, 'parentJobId', j.parent_job_id, 'rootJobId', j.root_job_id, 'revisionN', j.revision_n,
    'style', j.style,
    'projectTitle', (select title from public.projects where id = j.project_id));
$$;

-- Nouvelle signature avec p_style (l'ancienne à 7 arguments est supprimée pour éviter l'ambiguïté PostgREST).
drop function if exists public.link_create_job(text, bigint, text, text, text, text, integer);
create or replace function public.link_create_job(p_token text, p_project bigint, p_author text, p_title text, p_prompt text,
                                                  p_format text default '9:16', p_duration integer default 30, p_style text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  l    public.share_links;
  used integer;
  pid  bigint := p_project;
  pos  integer;
  j    public.creation_jobs;
  sty  text := nullif(trim(coalesce(p_style, '')), '');
begin
  perform pg_sleep(0.2);
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is null then return json_build_object('ok', false, 'reason', 'Lien introuvable ou révoqué.'); end if;
  if not l.creation_enabled or l.read_only then return json_build_object('ok', false, 'reason', 'La création n''est pas activée sur cet espace.'); end if;
  if length(trim(coalesce(p_author, ''))) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if length(trim(coalesce(p_title, ''))) < 2 then return json_build_object('ok', false, 'reason', 'Donnez un titre à votre animation.'); end if;
  if length(trim(coalesce(p_prompt, ''))) < 10 then return json_build_object('ok', false, 'reason', 'Décrivez votre animation en quelques phrases.'); end if;
  if p_format not in ('9:16','16:9','1:1') or p_duration not between 5 and 90 then return json_build_object('ok', false, 'reason', 'Format ou durée invalide.'); end if;
  if sty is not null and sty not in ('hologramme-schema') then return json_build_object('ok', false, 'reason', 'Style inconnu.'); end if;

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

  insert into public.creation_jobs (link_id, project_id, author, title, prompt, format, duration_s, style, root_job_id)
    values (l.id, pid, left(trim(p_author), 60), left(trim(p_title), 120), trim(p_prompt), p_format, p_duration, sty, null)
    returning * into j;
  update public.creation_jobs set root_job_id = j.id where id = j.id returning * into j;

  return json_build_object('ok', true, 'job', public.creation_job_json(j), 'remaining', greatest(l.creation_quota - used - 1, 0));
end $$;
revoke all on function public.link_create_job(text, bigint, text, text, text, text, integer, text) from public;
grant execute on function public.link_create_job(text, bigint, text, text, text, text, integer, text) to anon, authenticated;

-- Les modifications héritent du style du parent.
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

  insert into public.creation_jobs (link_id, project_id, author, title, prompt, format, duration_s, kind, parent_job_id, root_job_id, revision_n, style)
    values (l.id, pj.project_id, left(trim(p_author), 60), pj.title, trim(p_changes), pj.format, pj.duration_s, 'revision', pj.id, rid, n + 1, pj.style)
    returning * into j;
  return json_build_object('ok', true, 'job', public.creation_job_json(j));
end $$;
