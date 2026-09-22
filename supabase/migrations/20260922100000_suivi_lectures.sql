-- 2026-09-22 — Suivi des lectures côté client : qui a regardé quelle version, quand, combien de fois,
-- combien de temps. Une ligne = une lecture (du premier « play » à la fin ou à la fermeture de la page).
-- Pas de cookie tiers : un identifiant d'appareil aléatoire en localStorage + le nom saisi dans l'espace.
-- Première lecture d'une version : email aux admins + WhatsApp (best effort, ne bloque jamais la lecture).

create table if not exists public.version_views (
  id              uuid primary key,                 -- fourni par le navigateur (une lecture)
  version_id      uuid not null references public.project_versions(id) on delete cascade,
  project_id      bigint not null references public.projects(id) on delete cascade,
  link_id         uuid references public.share_links(id) on delete set null,
  viewer          text,                             -- nom saisi par le client (peut arriver après coup)
  device          text not null,                    -- identifiant d'appareil aléatoire
  device_label    text,                             -- « iPhone · Safari »
  started_at      timestamptz not null default now(),
  last_at         timestamptz not null default now(),
  watched_seconds integer not null default 0,
  max_position    numeric not null default 0,
  duration        numeric,
  completed       boolean not null default false
);
create index if not exists version_views_version_idx on public.version_views (version_id, started_at desc);
create index if not exists version_views_link_idx on public.version_views (link_id, started_at desc);

alter table public.version_views enable row level security;
drop policy if exists version_views_team_read on public.version_views;
create policy version_views_team_read on public.version_views
  for select to authenticated using (public.get_my_role() in ('admin', 'collaborateur'));
drop policy if exists version_views_admin_delete on public.version_views;
create policy version_views_admin_delete on public.version_views
  for delete to authenticated using (public.get_my_role() = 'admin');

create or replace function public.link_track_view(
  p_token text, p_version uuid, p_session uuid, p_device text,
  p_viewer text default null, p_device_label text default null,
  p_seconds integer default 0, p_position numeric default 0, p_duration numeric default null,
  p_completed boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v       public.project_versions;
  acc     record;
  cur     public.version_views;
  nom     text := nullif(left(btrim(coalesce(p_viewer, '')), 60), '');
  dev     text := left(btrim(coalesce(p_device, '')), 64);
  dur     numeric := case when p_duration > 0 and p_duration < 86400 then p_duration end;
  secs    integer;
  first   boolean;
  p       public.projects;
  societe text;
  espace  text;
  dest    text[];
  quand   text;
begin
  if p_version is null or p_session is null or length(dev) < 8 then
    return json_build_object('ok', false, 'reason', 'Paramètres invalides');
  end if;
  select * into v from public.project_versions where id = p_version and visible_client;
  if v.id is null then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;
  select * into acc from public.review_link_access(p_token, v.project_id);
  if not acc.allowed then return json_build_object('ok', false, 'reason', 'Version non accessible avec ce lien'); end if;

  -- plafond : on ne compte pas plus que la durée de la vidéo (+ marge) par lecture
  secs := greatest(0, least(coalesce(p_seconds, 0), coalesce(ceil(dur)::int + 30, 86400)));

  select * into cur from public.version_views where id = p_session;
  if cur.id is not null then
    if cur.version_id <> v.id or cur.device <> dev then
      return json_build_object('ok', false, 'reason', 'Lecture inconnue');
    end if;
    update public.version_views set
      last_at = now(),
      viewer = coalesce(nom, viewer),
      watched_seconds = greatest(watched_seconds, secs),
      max_position = greatest(max_position, least(coalesce(p_position, 0), coalesce(dur, 86400))),
      duration = coalesce(dur, duration),
      completed = completed or coalesce(p_completed, false)
    where id = p_session;
  else
    -- garde-fou anti-abus (fonction ouverte à anon)
    if (select count(*) from public.version_views
         where version_id = v.id and started_at > now() - interval '1 hour') >= 120 then
      return json_build_object('ok', false, 'reason', 'Trop de lectures, réessayez plus tard');
    end if;
    first := not exists (select 1 from public.version_views where version_id = v.id);
    insert into public.version_views (id, version_id, project_id, link_id, viewer, device, device_label,
                                      watched_seconds, max_position, duration, completed)
    values (p_session, v.id, v.project_id, acc.link_id, nom, dev, nullif(left(btrim(coalesce(p_device_label, '')), 60), ''),
            secs, greatest(0, least(coalesce(p_position, 0), coalesce(dur, 86400))), dur, coalesce(p_completed, false));

    if first then
      begin
        select * into p from public.projects where id = v.project_id;
        select name into societe from public.client_companies where id = p.company_id;
        if acc.link_id is not null then select label into espace from public.share_links where id = acc.link_id; end if;
        quand := to_char(now() at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI');
        perform public.notify_admin_whatsapp(
          '👁 Première lecture : « ' || coalesce(p.title, 'projet') || ' » ' || coalesce(v.label, '') ||
          coalesce(' (' || coalesce(societe, espace) || ')', '') ||
          E'\nPar : ' || coalesce(nom, 'nom pas encore saisi') ||
          coalesce(' · ' || nullif(left(btrim(coalesce(p_device_label, '')), 60), ''), '') ||
          E'\nLe ' || quand);
        select array_agg(email) into dest from public.profiles
         where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
        if dest is not null then
          perform public.call_edge('send-email', jsonb_build_object(
            'to', to_jsonb(dest),
            'subject', '👁 Première lecture : « ' || coalesce(p.title, 'projet') || ' » ' || coalesce(v.label, '') ||
                       coalesce(' (' || coalesce(societe, espace) || ')', ''),
            'kicker', 'Suivi des lectures',
            'title', coalesce(nom, 'Le client') || ' a commencé à regarder la vidéo',
            'text', 'Projet : ' || coalesce(p.title, '?') ||
                    E'\nVersion : ' || coalesce(v.label, '?') ||
                    coalesce(E'\nClient : ' || coalesce(societe, espace), '') ||
                    E'\nPar : ' || coalesce(nom, 'nom pas encore saisi') ||
                    coalesce(' (' || nullif(left(btrim(coalesce(p_device_label, '')), 60), '') || ')', '') ||
                    E'\nLe ' || quand ||
                    E'\n\nLe détail (nombre de lectures, durée regardée) est dans la relecture de la version, côté Studio.',
            'cta', jsonb_build_object('label', 'Voir la version', 'url', 'https://www.thirdone.studio/studio/review/' || v.id)
          ));
        end if;
      exception when others then null;
      end;
    end if;
  end if;

  -- le nom saisi plus tard renomme les lectures anonymes du même appareil
  if nom is not null then
    update public.version_views set viewer = nom where device = dev and viewer is null;
  end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.link_track_view(text, uuid, uuid, text, text, text, integer, numeric, numeric, boolean) from public;
grant execute on function public.link_track_view(text, uuid, uuid, text, text, text, integer, numeric, numeric, boolean) to anon, authenticated;
