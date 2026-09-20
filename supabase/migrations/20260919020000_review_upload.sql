-- 2026-09-19 — review-upload : dépôt de vidéos de relecture par les monteurs (espace /m/<token>, sans session Supabase).
-- La fonction Edge review-upload (service role) s'appuie sur ce journal et sur deux fonctions SQL atomiques :
--   review_upload_begin    : contrôle du lien monteur + attribution + projet non archivé + taille + chemin,
--                            limite de débit (10 envois par membre et par heure), garde-fou sur l'espace du bucket
--                            (offre gratuite : 1 Go au total), puis inscription de l'envoi AVANT la signature de l'URL.
--   review_upload_finalize : recontrôle le lien, exige un envoi inscrit par ce membre pour ce projet, vérifie que
--                            l'objet existe dans le bucket, crée la version (jamais visible du client) et marque
--                            l'envoi comme finalisé : un même fichier ne peut pas servir à deux versions (sinon la
--                            suppression d'une version par l'équipe supprimerait le fichier de l'autre).
-- Pourquoi un journal plutôt qu'un comptage de project_versions : created_by est un nom (pas un identifiant), et une URL
-- signée qui n'est jamais finalisée consommerait du stockage sans être comptée.
-- Les envois inscrits mais jamais finalisés sont purgés par la fonction Edge (objet supprimé puis ligne supprimée)
-- au bout de 6 heures ; une URL signée vit 2 heures et finalize refuse un envoi de plus de 3 heures : pas de croisement.
-- Aucune de ces fonctions n'est exposée à anon / authenticated : service role uniquement.

create table if not exists public.review_upload_log (
  id           bigint generated always as identity primary key,
  member_id    bigint not null references public.team_members(id) on delete cascade,
  project_id   bigint not null references public.projects(id) on delete cascade,
  path         text   not null unique check (length(path) between 10 and 200),
  size_bytes   bigint not null check (size_bytes between 1 and 52428800),
  created_at   timestamptz not null default now(),
  finalized_at timestamptz,
  version_id   uuid references public.project_versions(id) on delete set null
);
create index if not exists review_upload_log_member_idx  on public.review_upload_log (member_id, created_at);
create index if not exists review_upload_log_pending_idx on public.review_upload_log (created_at) where finalized_at is null;

alter table public.review_upload_log enable row level security; -- aucune policy : service role uniquement
revoke all on public.review_upload_log from anon, authenticated, public;
grant select, insert, update, delete on public.review_upload_log to service_role;

comment on table public.review_upload_log
  is 'review-upload : un envoi de vidéo de relecture par un monteur (URL signée). Sert à la limite de débit, au garde-fou de stockage et à empêcher qu''un fichier serve à deux versions. Service role uniquement.';

-- ───────────────────────────── begin (action « sign ») ─────────────────────────────
-- Retour : {ok:true, id, memberId, memberNom} ou {ok:false, code, reason}
--   code : 'forbidden' | 'archived' | 'invalid' | 'too_big' | 'too_many' | 'rate' | 'full'
create or replace function public.review_upload_begin(
  p_token            text,
  p_project          bigint,
  p_path             text,
  p_size             bigint,
  p_max_per_hour     int    default 10,
  p_max_bucket_bytes bigint default 1048576000
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m        public.team_members;
  archive  timestamptz;
  n        int;
  utilise  bigint;
  attente  bigint;
  new_id   bigint;
begin
  m := public.review_member_access(p_token, p_project);
  if m.id is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'reason', 'Projet non attribué ou lien révoqué.');
  end if;

  select archived_at into archive from public.projects where id = p_project;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'reason', 'Projet non attribué ou lien révoqué.');
  end if;
  if archive is not null then
    return jsonb_build_object('ok', false, 'code', 'archived', 'reason', 'Ce projet est archivé : le dépôt de versions est fermé.');
  end if;

  if p_size is null or p_size < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Fichier vide ou taille inconnue.');
  end if;
  if p_size > 52428800 then
    return jsonb_build_object('ok', false, 'code', 'too_big', 'reason', 'Ce fichier dépasse 50 Mo. Laissez la page le compresser avant l''envoi.');
  end if;

  -- <project_id>/<uuid>-<nom nettoyé>.<ext> : le chemin est fabriqué par la fonction Edge, jamais par le navigateur.
  if p_path is null
     or p_path !~ ('^' || p_project::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9]+(-[a-z0-9]+)*\.(mp4|m4v|mov|webm)$')
     or length(p_path) > 200 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Chemin de fichier invalide.');
  end if;

  if (select count(*) from public.project_versions where project_id = p_project) >= 200 then
    return jsonb_build_object('ok', false, 'code', 'too_many', 'reason', 'Trop de versions sur ce projet.');
  end if;

  -- Sérialise les envois (quelques-uns par jour) : comptage et inscription ne se croisent pas entre deux requêtes.
  perform pg_advisory_xact_lock(hashtext('review_upload_log'));

  select count(*) into n from public.review_upload_log
   where member_id = m.id and created_at >= now() - interval '1 hour';
  if n >= greatest(coalesce(p_max_per_hour, 10), 1) then
    return jsonb_build_object('ok', false, 'code', 'rate', 'reason', 'Trop d''envois en une heure. Réessayez un peu plus tard.');
  end if;

  -- Garde-fou de stockage : objets présents + envois signés récents dont l'objet n'est pas encore arrivé.
  select coalesce(sum(nullif(o.metadata->>'size', '')::bigint), 0) into utilise
    from storage.objects o where o.bucket_id = 'reviews';
  select coalesce(sum(l.size_bytes), 0) into attente
    from public.review_upload_log l
   where l.finalized_at is null and l.created_at >= now() - interval '2 hours'
     and not exists (select 1 from storage.objects o where o.bucket_id = 'reviews' and o.name = l.path);
  if utilise + attente + p_size > coalesce(p_max_bucket_bytes, 1048576000) then
    return jsonb_build_object('ok', false, 'code', 'full', 'reason', 'L''espace de stockage des relectures est plein. Prévenez le studio, ou collez un lien vers votre fichier.');
  end if;

  insert into public.review_upload_log (member_id, project_id, path, size_bytes)
  values (m.id, p_project, p_path, p_size)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id, 'memberId', m.id, 'memberNom', m.nom);
end $$;

comment on function public.review_upload_begin(text, bigint, text, bigint, int, bigint)
  is 'review-upload (sign) : contrôle du lien monteur, limite de débit, garde-fou de stockage, inscription de l''envoi. Service role uniquement.';

-- ───────────────────────────── finalize ─────────────────────────────
-- Retour : {ok:true, already, version:{…}} ou {ok:false, code, reason}
--   code : 'forbidden' | 'archived' | 'invalid' | 'unknown_upload' | 'expired' | 'missing_object' | 'too_many'
create or replace function public.review_upload_finalize(
  p_token    text,
  p_project  bigint,
  p_path     text,
  p_label    text,
  p_note     text    default null,
  p_fps      numeric default 25,
  p_duration numeric default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m        public.team_members;
  archive  timestamptz;
  libelle  text := left(regexp_replace(coalesce(trim(p_label), ''), '\s+', ' ', 'g'), 120);
  ips      numeric := coalesce(p_fps, 25);
  duree    numeric := case when p_duration is not null and p_duration > 0 then round(p_duration, 3) end;
  l        public.review_upload_log;
  o_size   bigint;
  o_mime   text;
  v        public.project_versions;
  titre    text;
begin
  m := public.review_member_access(p_token, p_project);
  if m.id is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'reason', 'Projet non attribué ou lien révoqué.');
  end if;
  select archived_at, title into archive, titre from public.projects where id = p_project;
  if archive is not null then
    return jsonb_build_object('ok', false, 'code', 'archived', 'reason', 'Ce projet est archivé : le dépôt de versions est fermé.');
  end if;

  if length(libelle) < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Donnez un nom à cette version (ex. V2 montage).');
  end if;
  if ips < 1 or ips > 120 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Cadence d''images invalide.');
  end if;
  if duree is not null and duree > 86400 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Durée invalide.');
  end if;
  if p_path is null or position(p_project::text || '/' in p_path) <> 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'reason', 'Ce fichier n''appartient pas à ce projet.');
  end if;

  -- L'envoi doit avoir été inscrit par CE membre pour CE projet (ligne verrouillée : deux finalize ne se croisent pas).
  select * into l from public.review_upload_log
   where path = p_path and member_id = m.id and project_id = p_project
   for update;
  if l.id is null then
    return jsonb_build_object('ok', false, 'code', 'unknown_upload', 'reason', 'Envoi introuvable ou expiré. Recommencez le dépôt.');
  end if;

  -- Déjà finalisé (nouvel essai après une coupure réseau) : on renvoie la version créée, sans doublon.
  if l.finalized_at is not null then
    select * into v from public.project_versions where id = l.version_id;
    if v.id is null then
      return jsonb_build_object('ok', false, 'code', 'unknown_upload', 'reason', 'Cette vidéo a déjà été enregistrée puis supprimée. Recommencez le dépôt.');
    end if;
    return jsonb_build_object('ok', true, 'already', true, 'version', jsonb_build_object(
      'id', v.id, 'label', v.label, 'status', v.status, 'createdAt', v.created_at, 'createdBy', v.created_by,
      'visibleClient', v.visible_client, 'fps', v.fps, 'durationS', v.duration_s, 'comments', 0, 'openComments', 0));
  end if;

  if l.created_at < now() - interval '3 hours' then
    return jsonb_build_object('ok', false, 'code', 'expired', 'reason', 'Envoi expiré. Recommencez le dépôt.');
  end if;

  select nullif(o.metadata->>'size', '')::bigint, lower(coalesce(o.metadata->>'mimetype', ''))
    into o_size, o_mime
    from storage.objects o where o.bucket_id = 'reviews' and o.name = p_path;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing_object', 'reason', 'Fichier introuvable : l''envoi n''a pas abouti. Recommencez.');
  end if;
  if coalesce(o_size, 0) < 1 or o_size > 52428800 or o_mime not in ('video/mp4', 'video/quicktime', 'video/webm') then
    return jsonb_build_object('ok', false, 'code', 'missing_object', 'reason', 'Le fichier reçu n''est pas une vidéo valide. Recommencez.');
  end if;

  if (select count(*) from public.project_versions where project_id = p_project) >= 200 then
    return jsonb_build_object('ok', false, 'code', 'too_many', 'reason', 'Trop de versions sur ce projet.');
  end if;

  -- Le chemin ne contient que [0-9a-z/.-] (contrôlé à l'inscription) : aucune mise en forme d'URL nécessaire.
  insert into public.project_versions (project_id, label, video_url, fps, duration_s, note, visible_client, created_by)
  values (p_project, libelle, 'https://www.thirdone.studio/media/' || p_path, ips, duree,
          left(nullif(trim(coalesce(p_note, '')), ''), 1000), false, left(m.nom, 60))
  returning * into v;

  update public.review_upload_log set finalized_at = now(), version_id = v.id, size_bytes = least(o_size, 52428800) where id = l.id;

  begin
    perform public.log_project_event(p_project, 'montage', m.nom || ' a déposé une version à relire : ' || libelle,
      jsonb_build_object('member_id', m.id, 'version_id', v.id, 'hosted', true));
  exception when others then null; end;
  begin
    perform public.notify_admin_whatsapp('🎬 ' || m.nom || ' a déposé « ' || libelle || ' » à relire sur « ' || coalesce(titre, '?') || ' »');
  exception when others then null; end;

  return jsonb_build_object('ok', true, 'already', false, 'version', jsonb_build_object(
    'id', v.id, 'label', v.label, 'status', v.status, 'createdAt', v.created_at, 'createdBy', v.created_by,
    'visibleClient', v.visible_client, 'fps', v.fps, 'durationS', v.duration_s, 'comments', 0, 'openComments', 0));
end $$;

comment on function public.review_upload_finalize(text, bigint, text, text, text, numeric, numeric)
  is 'review-upload (finalize) : crée la version de relecture à partir d''un envoi inscrit et présent dans le bucket. Service role uniquement.';

revoke all on function public.review_upload_begin(text, bigint, text, bigint, int, bigint) from public, anon, authenticated;
revoke all on function public.review_upload_finalize(text, bigint, text, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.review_upload_begin(text, bigint, text, bigint, int, bigint) to service_role;
grant execute on function public.review_upload_finalize(text, bigint, text, text, text, numeric, numeric) to service_role;
