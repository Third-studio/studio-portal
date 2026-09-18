-- 2026-09-18 — Back-office v2 : policies équipe, intégrité des espaces clients, outils SQL
-- Remplace 20260918010000_backoffice_equipe_policies.sql (même version, fusionné ici).
--
-- Constats par simulation SQL (transactions annulées) sur la base de prod :
--   • messages : seule admin_all couvre l'équipe → le collaborateur voit 0 message et son
--     insert (role = 'studio') est refusé par la RLS.
--   • profiles : own_profile + admin_all → le collaborateur ne voit que sa ligne, les listes
--     « Client » de Liens.jsx / Projets.jsx et la liste des comptes d'Equipe.jsx sont vides.
--   • set_client_space_password : garde « get_my_role() not in (...) » inopérante sans profil
--     (NULL) et fonction exécutable par anon.
--   • member_add_delivery : liste blanche SQL plus stricte que SAFE_HOSTS du front
--     (replay.dropbox.com, swisstransfer.com, thirdone.studio refusés).
--   • share_link_groups / share_link_projects : aucune garde de hiérarchie (dossier parent de
--     lui-même, profondeur illimitée, parent ou dossier d'un autre espace acceptés).
--   • share_links : slug libre (espaces, accents, majuscules) → espace introuvable par le client,
--     doublon renvoyé comme erreur Postgres brute.
--   • projects : aucun check (status, progress, https), 15 replay_url = '' au lieu de null,
--     FK company_id jamais validée.
--   • Enregistrement d'un espace depuis Liens.jsx en 5 requêtes sans transaction ; aucune
--     suppression définitive d'espace.
-- Rien n'est supprimé ici. Les nettoyages destructifs sont listés en commentaire en fin de fichier.
-- Aucune modification de anon_read_projects ni des policies client / supervisor / prestataire
-- de l'ancien portail (studio-portal).

-- ── 0. get_my_role : search_path fixé (security definer) ────────────────────
alter function public.get_my_role() set search_path = public;

-- Deux fonctions security definer héritées sans contrôle de rôle, exécutables par anon : n'importe qui
-- muni de la clé anon pouvait passer un profil en collaborateur (vérifié en transaction annulée).
-- promote_to_collaborateur : réservée à l'admin (seul appelant : studio-portal App.js:7227, session admin).
create or replace function public.promote_to_collaborateur(target_email text)
returns text language plpgsql security definer set search_path = public as $$
declare matched_id uuid;
begin
  if coalesce(get_my_role(), '') <> 'admin' then return 'forbidden'; end if;
  select id into matched_id from public.profiles where lower(email) = lower(target_email);
  if matched_id is null then return 'not_found'; end if;
  update public.profiles set role = 'collaborateur', is_active = true where id = matched_id;
  return 'ok';
end $$;
revoke all on function public.promote_to_collaborateur(text) from public, anon;
grant execute on function public.promote_to_collaborateur(text) to authenticated;
-- create_collaborateur n'a aucun appelant (ni studio-portal ni v2) : plus exécutable depuis l'API.
revoke all on function public.create_collaborateur(uuid, text, text) from public, anon, authenticated;

-- ── 1. Policies équipe (admin + collaborateur) ───────────────────────────────
-- Le collaborateur lit tout et répond (role = 'studio') ; il ne modifie ni ne supprime les retours et
-- validations des clients, qui servent de trace. admin_all conserve les droits complets de l'admin.
drop policy if exists messages_team on public.messages;
drop policy if exists messages_team_read on public.messages;
create policy messages_team_read on public.messages
  for select using ( get_my_role() in ('admin','collaborateur') );
drop policy if exists messages_team_insert on public.messages;
create policy messages_team_insert on public.messages
  for insert with check ( get_my_role() in ('admin','collaborateur') and role in ('studio','admin','collaborateur') );

-- Profils : pas de policy de lecture sur la table entière (profiles.share_token est un jeton porteur
-- accepté tel quel par get_link_space / link_post_message : un collaborateur pourrait ouvrir l'espace
-- de n'importe quel client). Le front v2 passe par team_profiles(), limitée aux colonnes utiles.
drop policy if exists profiles_team_read on public.profiles;
create or replace function public.team_profiles()
returns table (id uuid, nom text, email text, company text, role text, is_active boolean)
language sql security definer stable set search_path = public as $$
  select id, nom, email, company, role, is_active from public.profiles
  where get_my_role() in ('admin','collaborateur')
$$;
revoke all on function public.team_profiles() from public, anon;
grant execute on function public.team_profiles() to authenticated;

-- ── 2. Identifiant d'espace (slug) : normalisation + doublon en français ─────
-- Miroir de normSlug() du front (Liens.jsx) : minuscules, accents retirés, tout ce qui n'est
-- pas [a-z0-9] devient « - », tirets fusionnés et retirés aux extrémités, 40 caractères max.
-- translate() plutôt que unaccent() : immutable et sans dépendance à une extension.
create or replace function public.normalize_slug(p text)
returns text language sql immutable strict parallel safe set search_path = public as $$
  select left(
    btrim(
      regexp_replace(
        regexp_replace(
          translate(lower(p),
            'àáâãäåāăąçćčďđèéêëēėęěìíîïīįĺļľñńňòóôõöøōőùúûüūůűýÿžźżśšşťţ',
            'aaaaaaaaacccddeeeeeeeeiiiiiilllnnnoooooooouuuuuuuyyzzzssstt'),
          '[^a-z0-9-]+', '-', 'g'),
        '-{2,}', '-', 'g'),
      '-'),
    40)
$$;

create or replace function public.share_links_slug_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  new.slug := nullif(public.normalize_slug(coalesce(new.slug, '')), '');
  if new.slug is not null and new.slug !~ '^[a-z0-9][a-z0-9-]{1,39}$' then
    raise exception 'Identifiant invalide : 2 à 40 caractères, lettres, chiffres ou tirets'
      using errcode = 'check_violation';
  end if;
  if new.slug is not null and exists (
       select 1 from public.share_links s where s.slug = new.slug and s.id <> new.id) then
    raise exception 'Cet identifiant est déjà utilisé' using errcode = 'unique_violation';
  end if;
  return new;
end $$;

drop trigger if exists share_links_slug_guard on public.share_links;
create trigger share_links_slug_guard
  before insert or update of slug on public.share_links
  for each row execute function public.share_links_slug_guard();

-- Lignes existantes : 0 slug en prod, aucune normalisation nécessaire (idempotent si relancé).
update public.share_links set slug = nullif(public.normalize_slug(slug), '')
 where slug is not null and slug is distinct from nullif(public.normalize_slug(slug), '');

alter table public.share_links drop constraint if exists share_links_slug_format;
alter table public.share_links add constraint share_links_slug_format
  check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,39}$');
alter table public.share_links drop constraint if exists share_links_label_not_blank;
alter table public.share_links add constraint share_links_label_not_blank
  check (btrim(label) <> '');
create index if not exists share_links_company_idx on public.share_links(company_id);
create index if not exists share_links_client_idx  on public.share_links(client_id);
-- Le back-office n'a besoin que de savoir si un mot de passe est défini : colonne calculée, le hash
-- bcrypt n'est plus sélectionné par le front (Liens.jsx).
alter table public.share_links add column if not exists has_password boolean
  generated always as (password_hash is not null) stored;

-- Le client peut taper « SARA », « Sara Agence » : on compare sur la forme normalisée.
create or replace function public.open_client_space(p_name text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare l public.share_links;
begin
  perform pg_sleep(0.25); -- freine les essais en rafale
  select * into l from public.share_links
   where slug is not null and slug = public.normalize_slug(coalesce(p_name, '')) and revoked_at is null;
  if l.id is null or l.password_hash is null or crypt(coalesce(p_password, ''), l.password_hash) <> l.password_hash then
    return json_build_object('ok', false, 'reason', 'Nom ou mot de passe incorrect');
  end if;
  update public.share_links set last_seen_at = now() where id = l.id;
  return json_build_object('ok', true, 'token', l.token, 'label', l.label);
end $$;
revoke all on function public.open_client_space(text, text) from public;
grant execute on function public.open_client_space(text, text) to anon, authenticated;

-- ── 2b. Aperçu équipe : get_link_space(p_token, p_touch) ─────────────────────
-- Les boutons « Ouvrir » du back-office chargeaient /p/<token> et posaient last_seen_at = now() :
-- les aperçus de l'équipe passaient pour des ouvertures client (badge « Jamais ouvert », tri, accueil).
-- p_touch = false (lien ?apercu=1 depuis le studio) ne touche plus last_seen_at. Corps identique à
-- 20260917210000_espace_equipe.sql pour le reste. L'ancienne signature est supprimée : avec un
-- paramètre par défaut, deux surcharges rendraient l'appel PostgREST ambigu.
drop function if exists public.get_link_space(text);
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
revoke all on function public.get_link_space(text, boolean) from public;
grant execute on function public.get_link_space(text, boolean) to anon, authenticated;

-- ── 3. Mot de passe d'un espace : garde robuste, 6 caractères, équipe connectée seule ──
create or replace function public.set_client_space_password(p_link uuid, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if coalesce(get_my_role(), '') not in ('admin','collaborateur') then
    return json_build_object('ok', false, 'reason', 'Réservé à l''équipe');
  end if;
  if length(coalesce(p_password, '')) < 6 then
    return json_build_object('ok', false, 'reason', 'Mot de passe trop court (6 caractères minimum)');
  end if;
  update public.share_links set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = p_link;
  if not found then return json_build_object('ok', false, 'reason', 'Espace introuvable'); end if;
  return json_build_object('ok', true);
end $$;
revoke all on function public.set_client_space_password(uuid, text) from public, anon;
grant execute on function public.set_client_space_password(uuid, text) to authenticated;

-- ── 4. Dossiers et projets d'un espace : hiérarchie garantie ─────────────────
-- Tables vides en prod (0 dossier, 0 projet lié) : contraintes ajoutées directement.
alter table public.share_link_groups drop constraint if exists share_link_groups_not_self;
alter table public.share_link_groups add constraint share_link_groups_not_self
  check (parent_id is null or parent_id <> id);
alter table public.share_link_groups drop constraint if exists share_link_groups_id_link_key;
alter table public.share_link_groups add constraint share_link_groups_id_link_key unique (id, link_id);

-- Un dossier parent appartient au même espace.
alter table public.share_link_groups drop constraint if exists share_link_groups_parent_id_fkey;
alter table public.share_link_groups drop constraint if exists share_link_groups_parent_same_link_fkey;
alter table public.share_link_groups add constraint share_link_groups_parent_same_link_fkey
  foreign key (parent_id, link_id) references public.share_link_groups(id, link_id) on delete cascade;

-- Un projet rangé dans un dossier du même espace.
alter table public.share_link_projects drop constraint if exists share_link_projects_group_id_fkey;
alter table public.share_link_projects drop constraint if exists share_link_projects_group_same_link_fkey;
alter table public.share_link_projects add constraint share_link_projects_group_same_link_fkey
  foreign key (group_id, link_id) references public.share_link_groups(id, link_id) on delete set null (group_id);

-- Deux niveaux maximum (dossier puis sous-dossier), comme l'éditeur du back-office.
create or replace function public.share_link_groups_depth_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_id is not null and exists (
       select 1 from public.share_link_groups p where p.id = new.parent_id and p.parent_id is not null) then
    raise exception 'Deux niveaux maximum (dossier puis sous-dossier)' using errcode = 'check_violation';
  end if;
  if new.parent_id is not null and exists (
       select 1 from public.share_link_groups c where c.parent_id = new.id) then
    raise exception 'Un sous-dossier ne peut pas contenir de sous-dossiers' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists share_link_groups_depth on public.share_link_groups;
create trigger share_link_groups_depth
  before insert or update of parent_id on public.share_link_groups
  for each row execute function public.share_link_groups_depth_guard();

create index if not exists share_link_projects_project_idx on public.share_link_projects(project_id);
create index if not exists share_link_projects_group_idx   on public.share_link_projects(group_id);
create index if not exists share_link_groups_parent_idx    on public.share_link_groups(parent_id);

-- ── 5. Projets : checks et index ─────────────────────────────────────────────
-- Vérifié le 18/09 : 0 statut hors liste, 0 progress hors 0..100, 0 URL non https hormis 15
-- replay_url = '' (chaîne vide, écrite par l'ancien portail à la création).
update public.projects
   set replay_url = nullif(btrim(replay_url), ''), final_url = nullif(btrim(final_url), '')
 where replay_url = '' or final_url = '' or replay_url <> btrim(replay_url) or final_url <> btrim(final_url);

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('brief','storyboard','tournage','montage','livraison'));
alter table public.projects drop constraint if exists projects_progress_check;
alter table public.projects add constraint projects_progress_check
  check (progress between 0 and 100);
-- '' toléré : l'ancien portail insère replay_url = '' (App.js). Le front v2 écrit null.
alter table public.projects drop constraint if exists projects_replay_url_https;
alter table public.projects add constraint projects_replay_url_https
  check (replay_url is null or replay_url = '' or replay_url ~* '^https://');
alter table public.projects drop constraint if exists projects_final_url_https;
alter table public.projects add constraint projects_final_url_https
  check (final_url is null or final_url = '' or final_url ~* '^https://');
alter table public.projects alter column status   set default 'brief';
alter table public.projects alter column progress set default 0;
alter table public.projects alter column status   set not null;
alter table public.projects alter column progress set not null;
-- FK company_id créée NOT VALID : 0 orphelin le 18/09, on la valide.
alter table public.projects validate constraint projects_company_fk;

create index if not exists projects_client_idx           on public.projects(client_id);
create index if not exists project_assignments_member_idx on public.project_assignments(member_id);
create index if not exists messages_project_idx          on public.messages(project_id);

-- ── 6. Profils et membres ────────────────────────────────────────────────────
-- 'partenaire' : encore écrit par l'ancien portail (App.js:5439 upsert profiles role:"partenaire",
-- routé vers PartenaireView). À resserrer sur admin | collaborateur | client quand studio-portal sera retiré.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','collaborateur','client','partenaire'));

-- Lien team_members ↔ profiles (par e-mail, insensible à la casse) ; kellian reste à lier à la main.
alter table public.team_members add column if not exists profile_id uuid references public.profiles(id) on delete set null;
update public.team_members t set profile_id = p.id
  from public.profiles p where t.profile_id is null and lower(p.email) = lower(t.email);
create unique index if not exists team_members_email_idx on public.team_members(lower(email)) where email is not null;

-- ── 7. Dépôt de version (espace monteur) : liste blanche alignée sur SAFE_HOSTS ──
-- Sous-domaines acceptés pour chaque hôte (replay.dropbox.com, player.vimeo.com, app.frame.io…).
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
  p_title   text;
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
  ok_link := clean_url ~* '^https://([a-z0-9-]+\.)*(youtu\.be|youtube\.com|vimeo\.com|dropbox\.com|drive\.google\.com|docs\.google\.com|wetransfer\.com|we\.tl|frame\.io|frameio\.com|swisstransfer\.com|thirdone\.studio|notion\.so|1drv\.ms|onedrive\.live\.com)(/|\?|#|$)';
  if not ok_link then
    return json_build_object('ok', false, 'error', 'Lien non autorisé : Dropbox Replay, WeTransfer, SwissTransfer, Vimeo, YouTube, Drive ou Frame.io');
  end if;

  insert into public.member_deliveries (project_id, member_id, url, note)
  values (p_project, m.id, left(clean_url, 500), left(nullif(trim(coalesce(p_note, '')), ''), 1000));

  perform public.log_project_event(
    p_project, 'montage',
    m.nom || ' a déposé une version de montage',
    jsonb_build_object('member_id', m.id, 'url', left(clean_url, 500))
  );

  select title into p_title from public.projects where id = p_project;
  perform public.notify_admin_whatsapp(
    '🎬 ' || m.nom || ' a mis une version en ligne sur « ' || coalesce(p_title, '?') || ' »'
    || E'\n' || left(clean_url, 300));

  return json_build_object('ok', true);
end $$;
revoke all on function public.member_add_delivery(text, bigint, text, text) from public;
grant execute on function public.member_add_delivery(text, bigint, text, text) to anon, authenticated;

-- ── 8. Outils back-office : enregistrer / supprimer un espace en une transaction ──
-- Enregistrement complet d'un espace (dossiers + projets) : tout ou rien.
-- p_groups : [{id?, parent_id?, name, position?}], p_items : [{project_id, group_id?, position?}].
create or replace function public.save_client_space(p_link uuid, p_groups jsonb default '[]', p_items jsonb default '[]')
returns json language plpgsql security definer set search_path = public as $$
declare
  n_groups int := 0;
  n_items  int := 0;
begin
  if coalesce(get_my_role(), '') not in ('admin','collaborateur') then
    return json_build_object('ok', false, 'reason', 'Réservé à l''équipe');
  end if;
  if not exists (select 1 from public.share_links where id = p_link) then
    return json_build_object('ok', false, 'reason', 'Espace introuvable');
  end if;
  if jsonb_typeof(coalesce(p_groups, '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    return json_build_object('ok', false, 'reason', 'Format invalide');
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) g
              where coalesce(btrim(g->>'name'), '') = '') then
    return json_build_object('ok', false, 'reason', 'Donnez un nom à chaque dossier');
  end if;

  delete from public.share_link_projects where link_id = p_link;
  delete from public.share_link_groups   where link_id = p_link;

  -- Dossiers : racines d'abord, puis sous-dossiers (la FK parent exige le parent déjà présent).
  insert into public.share_link_groups (id, link_id, parent_id, name, position)
  select coalesce(nullif(g->>'id', '')::uuid, gen_random_uuid()),
         p_link,
         nullif(g->>'parent_id', '')::uuid,
         left(btrim(g->>'name'), 120),
         coalesce((g->>'position')::int, ord - 1)
    from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) with ordinality as t(g, ord)
   order by (nullif(g->>'parent_id', '') is not null), ord;
  get diagnostics n_groups = row_count;

  insert into public.share_link_projects (link_id, project_id, group_id, position)
  select p_link,
         (i->>'project_id')::bigint,
         nullif(i->>'group_id', '')::uuid,
         coalesce((i->>'position')::int, ord - 1)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(i, ord)
   order by ord;
  get diagnostics n_items = row_count;

  return json_build_object('ok', true, 'groups', n_groups, 'projects', n_items);
end $$;
revoke all on function public.save_client_space(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_client_space(uuid, jsonb, jsonb) to authenticated;

-- Suppression définitive d'un espace : dossiers et liaisons supprimés, projets et messages conservés.
-- messages.link_id est gardé tel quel (aucune FK ne l'exige) : le fil s'affiche « Espace supprimé »
-- dans /studio/messages et Projets.jsx, et non « ancien lien client » ; get_link_space ne renvoie
-- que les messages d'un lien existant, donc aucun effet côté client.
create or replace function public.delete_share_link(p_link uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  l        public.share_links;
  n_groups int := 0;
  n_items  int := 0;
  n_msgs   int := 0;
begin
  if coalesce(get_my_role(), '') not in ('admin','collaborateur') then
    return json_build_object('ok', false, 'reason', 'Réservé à l''équipe');
  end if;
  select * into l from public.share_links where id = p_link;
  if l.id is null then
    return json_build_object('ok', false, 'reason', 'Espace introuvable');
  end if;

  delete from public.share_link_projects where link_id = p_link;
  get diagnostics n_items = row_count;
  delete from public.share_link_groups where link_id = p_link;
  get diagnostics n_groups = row_count;
  select count(*) into n_msgs from public.messages where link_id = p_link;
  delete from public.share_links where id = p_link;

  return json_build_object('ok', true, 'label', l.label, 'groups', n_groups, 'projects', n_items, 'messages', n_msgs);
end $$;
revoke all on function public.delete_share_link(uuid) from public, anon;
grant execute on function public.delete_share_link(uuid) to authenticated;

-- ── Propositions NON appliquées (à valider par Idriss, destructives ou hors périmètre) ──
-- • projects : drop policy anon_read_projects (24 projets lisibles avec la clé anon) — à faire
--   dès que l'ancien portail n'en dépend plus. Contrôle : set local role anon → count = 0.
-- • messages : drop policy anon_insert_prestataire_message / auth_insert_prestataire_message
--   (spam possible) — servent encore à studio-portal (App.js:5848, :6391).
-- • projects : rattachement aux sociétés (24 projets sans company_id, client_companies vide) :
--   insert into public.client_companies (name, contacts) values ('SARA','[]'),('Beecee','[]');
--   update public.projects set company_id = (select id from public.client_companies where name='SARA')
--     where title ilike 'SARA %' or invite_id = '7028564b-c7a9-4086-a54f-686f4cc2d706'
--        or client_id in (select id from public.profiles where email ilike '%@sara-ag.fr');
--   update public.projects set company_id = (select id from public.client_companies where name='Beecee')
--     where invite_id = '45db3727-50e3-4ab8-8302-07a1a28f9e81'
--        or client_id = (select id from public.profiles where email = 'romane@beecee.fr');
--   Restent à affecter à la main : 11 (TDY 2026), 38 (Reel calqué), 39 à 41 (compte test).
-- • projects : id 27 en livraison à 60 % → update public.projects set progress = 100 where id = 27.
-- • team_members : kellian (id 2) sans jeton d'espace monteur :
--   update public.team_members set access_token = replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
--     access_revoked_at = null where id = 2 and access_token is null;
--   update public.team_members set email = lower(email);
--   update public.team_members set profile_id = (select id from public.profiles where email = 'kjean-philippe@cfa-mans.com') where id = 2;
-- • profiles : fermer l'ancien lien par client (14 share_token legacy) :
--   update public.profiles set share_revoked_at = now() where share_token is not null and share_revoked_at is null;
--   Comptes clients jamais connectés / inactifs depuis 90 jours : suppression dans Auth (dashboard).
--   Utilisateur auth.users sans profil c20df7c8-b7e2-4dc3-b875-b968bb6522e5 : supprimer ou recréer le profil.
-- • project_invites : 4 invitations actives jamais utilisées, sans expiration :
--   update public.project_invites set revoked_at = now() where revoked_at is null and uses = 0 and created_at < now() - interval '30 days';
-- • get_member_workspace : ajouter « and p.archived_at is null » sur la jointure projects
--   (studio-portal 20260811200000_espace_monteur_v2.sql) pour masquer les projets archivés au monteur.
-- • messages : checks role / kind non ajoutés, l'ancien portail écrit d'autres rôles
--   (prestataire, partenaire, monteur…). À poser quand studio-portal sera retiré, avec
--   profiles_role_check resserré sur ('admin','collaborateur','client').
-- • Policies redondantes (sans effet fonctionnel) : "Admin all projects" et admin_all sur projects,
--   admin_only sur team_members et project_assignments.
