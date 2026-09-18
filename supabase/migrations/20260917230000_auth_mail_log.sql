-- 2026-09-17 — Journal des envois auth-mail (limitation de débit, service role uniquement)
-- Alimenté par la fonction Edge auth-mail (actions recovery / magiclink / invite) avec la clé
-- service : une ligne par tentative acceptée, emails inconnus compris (pas d'énumération).
-- Règle appliquée par la fonction : 3 envois par email et par heure, 20 par IP et par heure.
create table if not exists public.auth_mail_log (
  id         bigserial primary key,
  email      text,
  ip         text,
  action     text,
  created_at timestamptz not null default now()
);
comment on table public.auth_mail_log is 'Tentatives d''envoi auth-mail (recovery, magiclink, invite) pour la limite 3/email/h et 20/ip/h. Accès service role uniquement.';

create index if not exists auth_mail_log_email_idx on public.auth_mail_log (email, created_at);
create index if not exists auth_mail_log_ip_idx    on public.auth_mail_log (ip, created_at);

-- RLS activée et AUCUNE policy : seule la clé service (qui contourne la RLS) lit et écrit.
-- Les grants par défaut sont retirés en plus, ceinture et bretelles.
alter table public.auth_mail_log enable row level security;
revoke all on table public.auth_mail_log from anon, authenticated;
revoke all on sequence public.auth_mail_log_id_seq from anon, authenticated;

-- Purge quotidienne (données personnelles : email + IP) si pg_cron est disponible.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'cron') then
    perform cron.schedule(
      'auth_mail_log_purge',
      '20 4 * * *',
      $job$ delete from public.auth_mail_log where created_at < now() - interval '7 days' $job$
    );
  end if;
end $$;
