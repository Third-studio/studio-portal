-- 2026-09-22 — Journal de suivi client : emails partis (ouverture, clic), ouvertures de l'espace client.
-- Les emails aux clients (tout destinataire hors équipe admin/collaborateur) passent par send-email,
-- qui les enregistre ici et y ajoute un pixel + un lien suivi servis par www.thirdone.studio/t/…
-- (rewrite Vercel vers la fonction mail-track). Première ouverture : email aux admins.

create table if not exists public.email_log (
  id             uuid primary key default gen_random_uuid(),
  recipients     text[] not null,
  subject        text not null,
  kind           text,
  cta_url        text,
  project_id     bigint references public.projects(id) on delete set null,
  link_id        uuid references public.share_links(id) on delete set null,
  sent_at        timestamptz not null default now(),
  status         text not null default 'envoye' check (status in ('envoye', 'echec')),
  error          text,
  open_count     integer not null default 0,
  first_open_at  timestamptz,
  last_open_at   timestamptz,
  open_client    text,
  click_count    integer not null default 0,
  first_click_at timestamptz,
  last_click_at  timestamptz
);
create index if not exists email_log_sent_idx on public.email_log (sent_at desc);
alter table public.email_log enable row level security;
drop policy if exists email_log_team_read on public.email_log;
create policy email_log_team_read on public.email_log
  for select to authenticated using (public.get_my_role() in ('admin', 'collaborateur'));

-- Appelée par la fonction mail-track (clé service) : ouverture ('o') ou clic ('c').
create or replace function public.mail_track(p_id uuid, p_kind text, p_client text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  e      public.email_log;
  dest   text[];
  quand  text;
begin
  select * into e from public.email_log where id = p_id;
  if e.id is null then return null; end if;
  -- ouverture dans la seconde qui suit l'envoi = préchargement automatique (antivirus, proxy) : ignorée
  if p_kind = 'o' and now() - e.sent_at < interval '5 seconds' then return null; end if;

  if p_kind = 'c' then
    update public.email_log set click_count = click_count + 1,
      first_click_at = coalesce(first_click_at, now()), last_click_at = now(),
      -- un clic prouve l'ouverture (images bloquées chez le client)
      open_count = greatest(open_count, 1), first_open_at = coalesce(first_open_at, now()), last_open_at = coalesce(last_open_at, now())
    where id = p_id;
  else
    update public.email_log set open_count = open_count + 1,
      first_open_at = coalesce(first_open_at, now()), last_open_at = now(),
      open_client = coalesce(open_client, nullif(left(p_client, 40), ''))
    where id = p_id;
  end if;

  if e.first_open_at is null then
    begin
      quand := to_char(now() at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI');
      perform public.notify_admin_whatsapp('📬 Email ouvert : « ' || e.subject || ' »' ||
        E'\nPar : ' || array_to_string(e.recipients, ', ') || E'\nLe ' || quand);
      select array_agg(email) into dest from public.profiles
       where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
      if dest is not null then
        perform public.call_edge('send-email', jsonb_build_object(
          'to', to_jsonb(dest),
          'subject', '📬 Ouvert : « ' || left(e.subject, 120) || ' »',
          'kicker', 'Suivi des emails',
          'title', array_to_string(e.recipients, ', ') || ' a ouvert votre email',
          'text', 'Email : ' || e.subject ||
                  E'\nEnvoyé le ' || to_char(e.sent_at at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') ||
                  E'\nOuvert le ' || quand ||
                  case when p_kind = 'c' then E'\nOuvert en cliquant sur le lien de l''email.' else '' end ||
                  E'\n\nL''historique complet est dans le Studio, rubrique Suivi.',
          'cta', jsonb_build_object('label', 'Voir le suivi', 'url', 'https://www.thirdone.studio/studio/suivi')
        ));
      end if;
    exception when others then null;
    end;
  end if;
  return e.cta_url;
end $$;
revoke all on function public.mail_track(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mail_track(uuid, text, text) to service_role;

-- Ouvertures de l'espace client (une visite = ouverture après 30 min sans activité).
create table if not exists public.link_visits (
  id      bigserial primary key,
  link_id uuid not null references public.share_links(id) on delete cascade,
  at      timestamptz not null default now()
);
create index if not exists link_visits_link_idx on public.link_visits (link_id, at desc);
alter table public.link_visits enable row level security;
drop policy if exists link_visits_team_read on public.link_visits;
create policy link_visits_team_read on public.link_visits
  for select to authenticated using (public.get_my_role() in ('admin', 'collaborateur'));

create or replace function public.trg_link_visit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_seen_at is distinct from old.last_seen_at and new.last_seen_at is not null
     and (old.last_seen_at is null or new.last_seen_at - old.last_seen_at > interval '30 minutes') then
    insert into public.link_visits (link_id, at) values (new.id, new.last_seen_at);
  end if;
  return new;
end $$;
drop trigger if exists share_links_visit on public.share_links;
create trigger share_links_visit after update of last_seen_at on public.share_links
  for each row execute function public.trg_link_visit();

-- reprise : la dernière ouverture connue de chaque espace
insert into public.link_visits (link_id, at)
select id, last_seen_at from public.share_links
 where last_seen_at is not null
   and not exists (select 1 from public.link_visits v where v.link_id = share_links.id);
