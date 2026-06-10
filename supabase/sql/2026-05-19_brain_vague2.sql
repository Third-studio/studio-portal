-- 2026-05-19 — Vague 2 : cerveau quotidien (briefing, radar, relances, recap)
-- Dépend de 2026-05-19_mail_infra.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Étend projects : status auto-rempli par project-radar
-- ─────────────────────────────────────────────────────────────────────────────
alter table projects
  add column if not exists auto_status_note text,
  add column if not exists auto_status_at   timestamptz,
  add column if not exists auto_health      text,      -- ok | watch | risk | blocked
  add column if not exists auto_next_action text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Étend invoices : relances automatiques
-- ─────────────────────────────────────────────────────────────────────────────
alter table invoices
  add column if not exists last_chase_at timestamptz,
  add column if not exists chase_count   int default 0,
  add column if not exists chase_paused  boolean default false;

create index if not exists invoices_chase_idx
  on invoices(status, due_date)
  where status in ('sent','overdue') and chase_paused = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIGESTS : historique des briefings/recaps envoyés (audit + UI futur)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists digests (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,           -- daily | weekly
  recipient    text not null,
  subject      text,
  body_md      text,
  body_html    text,
  payload      jsonb,                   -- données brutes utilisées
  sent_at      timestamptz,
  created_at   timestamptz default now()
);
create index if not exists digests_kind_idx on digests(kind, created_at desc);

alter table digests enable row level security;
drop policy if exists digests_admin_all on digests;
create policy digests_admin_all on digests
  for all using ( get_my_role() = 'admin' )
       with check ( get_my_role() = 'admin' );
