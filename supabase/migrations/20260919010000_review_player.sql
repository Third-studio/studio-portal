-- Lecteur de relecture : versions vidéo par projet + commentaires au timecode.
-- Vidéos : téléversées par l'équipe dans le bucket Storage « reviews » et servies depuis notre domaine
-- (https://www.thirdone.studio/media/<chemin>, réécriture Vercel) car certains pare-feu d'entreprise bloquent Dropbox.
-- À défaut, video_url peut rester un lien https direct (Dropbox raw=1, .mp4…).
-- Accès : équipe par RLS ; client (/p/:token) et monteur (/m/:token) uniquement par RPC security definer.

-- ───────────────────────────── Tables ─────────────────────────────
create table if not exists public.project_versions (
  id             uuid primary key default gen_random_uuid(),
  project_id     bigint not null references public.projects(id) on delete cascade,
  label          text not null check (length(trim(label)) between 1 and 120),
  video_url      text not null check (video_url ~* '^https://' and length(video_url) <= 2000),
  fps            numeric not null default 25 check (fps between 1 and 120),
  duration_s     numeric check (duration_s is null or duration_s >= 0),
  note           text,
  status         text not null default 'a_valider' check (status in ('a_valider','validee','remplacee')),
  visible_client boolean not null default true,
  created_by     text,
  created_at     timestamptz not null default now()
);

create table if not exists public.version_comments (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.project_versions(id) on delete cascade,
  project_id  bigint not null references public.projects(id) on delete cascade,
  author      text not null check (length(author) between 1 and 60),
  role        text not null check (role in ('client','studio','monteur')),
  body        text not null check (length(body) between 1 and 4000),
  t_seconds   numeric not null check (t_seconds >= 0),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  link_id     uuid
);

create index if not exists project_versions_project_idx on public.project_versions (project_id);
create index if not exists version_comments_project_idx on public.version_comments (project_id);
create index if not exists version_comments_version_t_idx on public.version_comments (version_id, t_seconds);

alter table public.project_versions enable row level security;
alter table public.version_comments enable row level security;

drop policy if exists project_versions_team on public.project_versions;
create policy project_versions_team on public.project_versions
  for all using ( get_my_role() in ('admin','collaborateur') )
  with check ( get_my_role() in ('admin','collaborateur') );

drop policy if exists version_comments_team on public.version_comments;
create policy version_comments_team on public.version_comments
  for all using ( get_my_role() in ('admin','collaborateur') )
  with check ( get_my_role() in ('admin','collaborateur') );

-- Aucun accès direct pour anon : tout passe par les RPC ci-dessous.
revoke all on public.project_versions from anon, public;
revoke all on public.version_comments from anon, public;
grant select, insert, update, delete on public.project_versions to authenticated;
grant select, insert, update, delete on public.version_comments to authenticated;

-- ───────────────────────────── Stockage : bucket « reviews » ─────────────────────────────
-- Public en lecture (URL publique, chemins non devinables : <project_id>/<uuid>-<nom>.mp4), pas de listing :
-- aucune policy select pour anon. Écriture / suppression : équipe uniquement.
-- Offre gratuite : 50 Mo par fichier (file_size_limit), 1 Go au total.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', true, 52428800, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists reviews_team on storage.objects;
create policy reviews_team on storage.objects
  for all
  using ( bucket_id = 'reviews' and get_my_role() in ('admin','collaborateur') )
  with check ( bucket_id = 'reviews' and get_my_role() in ('admin','collaborateur') );

-- ─────────────────────── Fonctions internes (non exposées) ───────────────────────

-- Le jeton d'espace client donne-t-il accès à ce projet ? (share_links, sinon ancien jeton de profil client)
create or replace function public.review_link_access(p_token text, p_project bigint, out allowed boolean, out link_id uuid)
language plpgsql security definer stable set search_path = public as $$
declare
  l public.share_links;
  c public.profiles;
begin
  allowed := false; link_id := null;
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 or p_project is null then return; end if;
  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is not null then
    link_id := l.id;
    select true into allowed
      from public.share_link_projects lp
      join public.projects p on p.id = lp.project_id
     where lp.link_id = l.id and lp.project_id = p_project and p.archived_at is null;
  else
    select * into c from public.profiles
     where share_token = p_token and role = 'client' and share_revoked_at is null and coalesce(is_active, true);
    if c.id is not null then
      select true into allowed from public.projects where id = p_project and client_id = c.id and archived_at is null;
    end if;
  end if;
  allowed := coalesce(allowed, false);
end $$;

create or replace function public.review_comment_json(c public.version_comments)
returns json language sql immutable set search_path = public as $$
  select json_build_object(
    'id', c.id, 'author', c.author, 'role', c.role, 'body', c.body,
    't', round(c.t_seconds, 3), 'createdAt', c.created_at,
    'resolved', c.resolved_at is not null, 'resolvedBy', c.resolved_by);
$$;

-- Charge utile commune du lecteur. p_client = true : versions visibles seulement, et parmi les commentaires
-- « client » seuls ceux déposés avec ce même lien (même règle que les messages de get_link_space).
create or replace function public.review_payload(p_version uuid, p_client boolean, p_link uuid)
returns json language plpgsql security definer stable set search_path = public as $$
declare
  v public.project_versions;
  titre text;
  liste json;
  coms  json;
begin
  select * into v from public.project_versions where id = p_version;
  if v.id is null then return null; end if;
  select title into titre from public.projects where id = v.project_id;

  select coalesce(json_agg(json_build_object(
           'id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
           'visibleClient', pv.visible_client) order by pv.created_at desc), '[]'::json)
    into liste
    from public.project_versions pv
   where pv.project_id = v.project_id and (not p_client or pv.visible_client);

  select coalesce(json_agg(public.review_comment_json(vc) order by vc.t_seconds, vc.created_at), '[]'::json)
    into coms
    from public.version_comments vc
   where vc.version_id = v.id
     and (not p_client or vc.role <> 'client' or vc.link_id is not distinct from p_link);

  return json_build_object(
    'ok', true,
    'project', json_build_object('id', v.project_id, 'title', titre),
    'version', json_build_object('id', v.id, 'label', v.label, 'videoUrl', v.video_url, 'fps', v.fps,
                                 'durationS', v.duration_s, 'status', v.status, 'note', v.note,
                                 'visibleClient', v.visible_client, 'createdAt', v.created_at),
    'versions', liste,
    'comments', coms);
end $$;

revoke all on function public.review_link_access(text, bigint) from public, anon, authenticated;
revoke all on function public.review_comment_json(public.version_comments) from public, anon, authenticated;
revoke all on function public.review_payload(uuid, boolean, uuid) from public, anon, authenticated;

-- ───────────────────────────── RPC espace client ─────────────────────────────

create or replace function public.link_get_review(p_token text, p_version uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v   public.project_versions;
  acc record;
begin
  if p_version is null then return json_build_object('ok', false, 'reason', 'Version introuvable'); end if;
  select * into v from public.project_versions where id = p_version and visible_client;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  select * into acc from public.review_link_access(p_token, v.project_id);
  if not acc.allowed then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  return public.review_payload(v.id, true, acc.link_id);
end $$;

create or replace function public.link_add_comment(p_token text, p_version uuid, p_author text, p_body text, p_t numeric)
returns json language plpgsql security definer set search_path = public as $$
declare
  v      public.project_versions;
  acc    record;
  auteur text := left(regexp_replace(coalesce(trim(p_author), ''), '\s+', ' ', 'g'), 60);
  texte  text := left(coalesce(trim(p_body), ''), 4000);
  c      public.version_comments;
begin
  if length(auteur) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if length(texte) < 1 then return json_build_object('ok', false, 'reason', 'Commentaire vide'); end if;
  if p_t is null or p_t < 0 or p_t > 86400 then return json_build_object('ok', false, 'reason', 'Timecode invalide'); end if;

  select * into v from public.project_versions where id = p_version and visible_client;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  select * into acc from public.review_link_access(p_token, v.project_id);
  if not acc.allowed then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;

  -- garde-fou anti-abus (fonction ouverte à anon)
  if (select count(*) from public.version_comments
       where version_id = v.id and role = 'client' and created_at > now() - interval '1 minute') >= 30 then
    return json_build_object('ok', false, 'reason', 'Trop de commentaires en peu de temps. Réessayez dans une minute.');
  end if;

  insert into public.version_comments (version_id, project_id, author, role, body, t_seconds, link_id)
  values (v.id, v.project_id, auteur, 'client', texte, round(p_t, 3), acc.link_id)
  returning * into c;

  begin
    perform public.log_project_event(v.project_id, 'client_comment',
      auteur || ' a commenté « ' || v.label || ' » : ' || left(texte, 140),
      jsonb_build_object('version_id', v.id, 't', round(p_t, 3)));
  exception when others then null; end;

  return json_build_object('ok', true, 'comment', public.review_comment_json(c));
end $$;

create or replace function public.link_validate_version(p_token text, p_version uuid, p_author text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v      public.project_versions;
  acc    record;
  auteur text := left(regexp_replace(coalesce(trim(p_author), ''), '\s+', ' ', 'g'), 60);
  texte  text;
  m      public.messages;
begin
  if length(auteur) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  select * into v from public.project_versions where id = p_version and visible_client;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  select * into acc from public.review_link_access(p_token, v.project_id);
  if not acc.allowed then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;

  if v.status = 'validee' then
    return json_build_object('ok', true, 'already', true,
      'version', json_build_object('id', v.id, 'label', v.label, 'status', v.status));
  end if;
  if v.status = 'remplacee' then
    return json_build_object('ok', false, 'reason', 'Cette version a été remplacée par une version plus récente.');
  end if;

  update public.project_versions set status = 'validee' where id = v.id;
  update public.project_versions set status = 'remplacee'
   where project_id = v.project_id and id <> v.id and status = 'a_valider' and visible_client;
  update public.projects set validated_at = now(), validated_by = auteur where id = v.project_id;

  texte := 'Version validée : ' || v.label;
  insert into public.messages (project_id, author, content, role, kind, link_id)
  values (v.project_id, auteur, texte, 'client', 'validation', acc.link_id)
  returning * into m;

  begin perform public.log_project_event(v.project_id, 'client_validation', auteur || ' : ' || texte,
          jsonb_build_object('version_id', v.id));
  exception when others then null; end;

  return json_build_object('ok', true, 'already', false,
    'version', json_build_object('id', v.id, 'label', v.label, 'status', 'validee'),
    'validatedBy', auteur,
    'message', json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at));
end $$;

revoke all on function public.link_get_review(text, uuid) from public;
revoke all on function public.link_add_comment(text, uuid, text, text, numeric) from public;
revoke all on function public.link_validate_version(text, uuid, text) from public;
grant execute on function public.link_get_review(text, uuid) to anon, authenticated;
grant execute on function public.link_add_comment(text, uuid, text, text, numeric) to anon, authenticated;
grant execute on function public.link_validate_version(text, uuid, text) to anon, authenticated;

-- ───────────────────────────── get_link_space : + versions ─────────────────────────────
-- Repris de la définition en production (20260918010000) ; seul ajout : "versions" par projet.
create or replace function public.get_link_space(p_token text, p_touch boolean default true)
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
    if coalesce(p_touch, true) then
      update public.share_links set last_seen_at = now() where id = l.id;
    end if;
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
             ), '[]'::json) as messages,
             coalesce((
               select json_agg(json_build_object('id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                        'comments', (select count(*) from public.version_comments vc
                                      where vc.version_id = pv.id and (vc.role <> 'client' or vc.link_id is not distinct from l.id)))
                      order by pv.created_at desc)
                 from public.project_versions pv
                where pv.project_id = p.id and pv.visible_client
             ), '[]'::json) as versions
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
                       from public.messages m where m.project_id = p.id and m.role in ('client','admin','collaborateur','studio','monteur')), '[]'::json) as messages,
           coalesce((
             select json_agg(json_build_object('id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                      'comments', (select count(*) from public.version_comments vc
                                    where vc.version_id = pv.id and (vc.role <> 'client' or vc.link_id is null)))
                    order by pv.created_at desc)
               from public.project_versions pv
              where pv.project_id = p.id and pv.visible_client
           ), '[]'::json) as versions
      from public.projects p where p.client_id = c.id and p.archived_at is null
  ) x;
  return json_build_object('valid', true, 'link', json_build_object('label', coalesce(c.company, c.nom), 'kind', 'legacy'),
    'client', json_build_object('nom', c.nom, 'company', c.company), 'groups', '[]'::json, 'projects', projets);
end $$;

revoke all on function public.get_link_space(text, boolean) from public;
grant execute on function public.get_link_space(text, boolean) to anon, authenticated;

-- ───────────────────────────── RPC monteur ─────────────────────────────

-- Jeton monteur valide + projet attribué → membre, sinon null.
create or replace function public.review_member_access(p_token text, p_project bigint)
returns public.team_members language plpgsql security definer stable set search_path = public as $$
declare m public.team_members;
begin
  if coalesce(trim(p_token), '') = '' or p_project is null then return null; end if;
  select * into m from public.team_members where access_token = p_token and access_revoked_at is null;
  if m.id is null then return null; end if;
  if not exists (select 1 from public.project_assignments a where a.member_id = m.id and a.project_id = p_project) then
    return null;
  end if;
  return m;
end $$;
revoke all on function public.review_member_access(text, bigint) from public, anon, authenticated;

create or replace function public.member_get_review(p_token text, p_version uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v public.project_versions;
  m public.team_members;
begin
  select * into v from public.project_versions where id = p_version;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  m := public.review_member_access(p_token, v.project_id);
  if m.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  return (public.review_payload(v.id, false, null)::jsonb
          || jsonb_build_object('member', jsonb_build_object('id', m.id, 'nom', m.nom)))::json;
end $$;

create or replace function public.member_add_comment(p_token text, p_version uuid, p_body text, p_t numeric)
returns json language plpgsql security definer set search_path = public as $$
declare
  v     public.project_versions;
  m     public.team_members;
  texte text := left(coalesce(trim(p_body), ''), 4000);
  c     public.version_comments;
begin
  if length(texte) < 1 then return json_build_object('ok', false, 'reason', 'Commentaire vide'); end if;
  if p_t is null or p_t < 0 or p_t > 86400 then return json_build_object('ok', false, 'reason', 'Timecode invalide'); end if;
  select * into v from public.project_versions where id = p_version;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  m := public.review_member_access(p_token, v.project_id);
  if m.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;

  insert into public.version_comments (version_id, project_id, author, role, body, t_seconds)
  values (v.id, v.project_id, left(m.nom, 60), 'monteur', texte, round(p_t, 3))
  returning * into c;
  return json_build_object('ok', true, 'comment', public.review_comment_json(c));
end $$;

create or replace function public.member_resolve_comment(p_token text, p_comment uuid, p_resolved boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  c public.version_comments;
  m public.team_members;
begin
  select * into c from public.version_comments where id = p_comment;
  if c.id is null then return json_build_object('ok', false, 'reason', 'Commentaire introuvable'); end if;
  m := public.review_member_access(p_token, c.project_id);
  if m.id is null then return json_build_object('ok', false, 'reason', 'Commentaire introuvable'); end if;

  update public.version_comments
     set resolved_at = case when coalesce(p_resolved, true) then coalesce(resolved_at, now()) else null end,
         resolved_by = case when coalesce(p_resolved, true) then coalesce(resolved_by, left(m.nom, 60)) else null end
   where id = c.id
  returning * into c;
  return json_build_object('ok', true, 'comment', public.review_comment_json(c));
end $$;

-- Le monteur dépose une version : masquée au client, l'équipe la publie ensuite depuis la fiche projet.
create or replace function public.member_add_version(p_token text, p_project bigint, p_label text, p_url text,
                                                     p_note text default null, p_fps numeric default 25)
returns json language plpgsql security definer set search_path = public as $$
declare
  m       public.team_members;
  libelle text := left(regexp_replace(coalesce(trim(p_label), ''), '\s+', ' ', 'g'), 120);
  lien    text := trim(coalesce(p_url, ''));
  ips     numeric := coalesce(p_fps, 25);
  v       public.project_versions;
  titre   text;
begin
  m := public.review_member_access(p_token, p_project);
  if m.id is null then return json_build_object('ok', false, 'reason', 'Projet non attribué ou lien révoqué'); end if;
  if length(libelle) < 1 then return json_build_object('ok', false, 'reason', 'Donnez un nom à cette version (ex. V2 montage).'); end if;
  if lien !~* '^https://[^\s]+$' or length(lien) > 2000 then
    return json_build_object('ok', false, 'reason', 'Collez un lien https vers le fichier vidéo (lien de partage Dropbox du .mp4).');
  end if;
  -- Le monteur ne téléverse pas : il ne peut pas redéposer l'adresse d'une vidéo hébergée chez nous
  -- (sinon la suppression de ce doublon par l'équipe viserait le fichier de la version publiée).
  if lien ~* '^https://(www\.)?thirdone\.studio/media/' or lien ~* '\.supabase\.co/storage/' then
    return json_build_object('ok', false, 'reason', 'Collez le lien de votre fichier (Dropbox ou lien direct) : l''hébergement sur thirdone.studio est réservé à l''équipe.');
  end if;
  if ips < 1 or ips > 120 then return json_build_object('ok', false, 'reason', 'Cadence d''images invalide'); end if;
  if (select count(*) from public.project_versions where project_id = p_project) >= 200 then
    return json_build_object('ok', false, 'reason', 'Trop de versions sur ce projet.');
  end if;

  insert into public.project_versions (project_id, label, video_url, fps, note, visible_client, created_by)
  values (p_project, libelle, lien, ips, left(nullif(trim(coalesce(p_note, '')), ''), 1000), false, left(m.nom, 60))
  returning * into v;

  begin
    perform public.log_project_event(p_project, 'montage', m.nom || ' a déposé une version à relire : ' || libelle,
      jsonb_build_object('member_id', m.id, 'version_id', v.id));
  exception when others then null; end;
  begin
    select title into titre from public.projects where id = p_project;
    perform public.notify_admin_whatsapp('🎬 ' || m.nom || ' a déposé « ' || libelle || ' » à relire sur « ' || coalesce(titre, '?') || ' »');
  exception when others then null; end;

  return json_build_object('ok', true, 'version', json_build_object(
    'id', v.id, 'label', v.label, 'status', v.status, 'createdAt', v.created_at,
    'visibleClient', v.visible_client, 'comments', 0, 'openComments', 0));
end $$;

revoke all on function public.member_get_review(text, uuid) from public;
revoke all on function public.member_add_comment(text, uuid, text, numeric) from public;
revoke all on function public.member_resolve_comment(text, uuid, boolean) from public;
revoke all on function public.member_add_version(text, bigint, text, text, text, numeric) from public;
grant execute on function public.member_get_review(text, uuid) to anon, authenticated;
grant execute on function public.member_add_comment(text, uuid, text, numeric) to anon, authenticated;
grant execute on function public.member_resolve_comment(text, uuid, boolean) to anon, authenticated;
grant execute on function public.member_add_version(text, bigint, text, text, text, numeric) to anon, authenticated;

-- ───────────────────────────── get_member_workspace : + versions ─────────────────────────────
-- Repris de la définition en production ; seul ajout : "versions" par projet.
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
                      'id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                      'visibleClient', pv.visible_client, 'createdBy', pv.created_by,
                      'comments', (select count(*) from public.version_comments vc where vc.version_id = pv.id),
                      'openComments', (select count(*) from public.version_comments vc where vc.version_id = pv.id and vc.resolved_at is null))
                    order by pv.created_at desc)
               from public.project_versions pv
              where pv.project_id = p.id
           ), '[]'::json) as versions,
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

revoke all on function public.get_member_workspace(text) from public;
grant execute on function public.get_member_workspace(text) to anon, authenticated;
