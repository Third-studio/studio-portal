-- 2026-05-19 — Infra mail : ingestion, classification, tâches, rappels, devis
-- À exécuter dans Supabase SQL editor après 2026-05-19_invoices.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- EMAILS : tous les mails entrants/sortants, classifiés par Claude
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists emails (
  id              uuid primary key default gen_random_uuid(),
  gmail_id        text unique,                  -- ID Gmail pour idempotence
  thread_id       text,                         -- thread Gmail
  direction       text not null default 'in',   -- in | out
  from_addr       text,
  from_name       text,
  to_addrs        text[],
  cc_addrs        text[],
  subject         text,
  snippet         text,
  body_text       text,
  body_html       text,
  has_attachments boolean default false,

  -- Classification (rempli par mail-classify)
  classified      boolean default false,
  classified_at   timestamptz,
  kind            text,    -- info | devis_in | facture_in | rdv | livrable | relance | spam | autre
  urgence         text,    -- low | normal | high | urgent
  project_id      bigint references projects(id) on delete set null,
  contact_email   text,
  detected_amount numeric(12,2),
  detected_date   date,
  summary_fr      text,    -- résumé 1-2 phrases généré par Claude
  action_items    jsonb,   -- [{title, due_date}]

  received_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists emails_project_idx   on emails(project_id);
create index if not exists emails_kind_idx      on emails(kind);
create index if not exists emails_received_idx  on emails(received_at desc);
create index if not exists emails_classified_idx on emails(classified) where classified = false;

create or replace function set_email_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_emails_updated on emails;
create trigger trg_emails_updated
  before update on emails
  for each row execute function set_email_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- EMAIL_ATTACHMENTS : pièces jointes (devis/factures PDF en particulier)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists email_attachments (
  id           uuid primary key default gen_random_uuid(),
  email_id     uuid references emails(id) on delete cascade,
  filename     text,
  mime_type    text,
  size_bytes   bigint,
  gmail_att_id text,                            -- pour récupérer le binaire via Gmail API
  storage_path text,                            -- chemin Supabase Storage si copié
  kind_hint    text,                            -- devis | facture | brief | autre
  created_at   timestamptz default now()
);
create index if not exists email_attachments_email_idx on email_attachments(email_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASKS : todos générées (par Claude depuis mails) ou créées manuellement
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   bigint references projects(id) on delete cascade,
  email_id     uuid   references emails(id)   on delete set null,
  assignee_id  uuid   references profiles(id) on delete set null,
  title        text not null,
  description  text,
  due_date     date,
  priority     text default 'normal',          -- low | normal | high | urgent
  status       text default 'todo',            -- todo | doing | done | cancelled
  source       text default 'manual',          -- manual | mail | auto
  calendar_event_id text,                      -- Google Calendar event id (idempotence)
  calendar_synced_at timestamptz,
  done_at      timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists tasks_project_idx  on tasks(project_id);
create index if not exists tasks_status_idx   on tasks(status);
create index if not exists tasks_due_idx      on tasks(due_date);
create index if not exists tasks_assignee_idx on tasks(assignee_id);

create or replace function set_task_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'done' and (old is null or old.status <> 'done') then
    new.done_at = now();
  end if;
  return new;
end $$;

drop trigger if exists trg_tasks_updated on tasks;
create trigger trg_tasks_updated
  before update on tasks
  for each row execute function set_task_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- REMINDERS : rappels datés (envoyés par mail + push calendar)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists reminders (
  id           uuid primary key default gen_random_uuid(),
  project_id   bigint references projects(id) on delete cascade,
  email_id     uuid   references emails(id)   on delete set null,
  recipient_id uuid   references profiles(id) on delete set null,
  title        text not null,
  body         text,
  remind_at    timestamptz not null,
  sent_at      timestamptz,
  calendar_event_id text,
  calendar_synced_at timestamptz,
  created_at   timestamptz default now()
);

create index if not exists reminders_remind_idx  on reminders(remind_at) where sent_at is null;
create index if not exists reminders_project_idx on reminders(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- QUOTES : devis (entrants ou sortants), distincts des factures émises
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists quotes (
  id            uuid primary key default gen_random_uuid(),
  project_id    bigint references projects(id) on delete cascade,
  client_id     uuid   references profiles(id) on delete set null,
  email_id      uuid   references emails(id)   on delete set null,  -- devis reçu par mail
  attachment_id uuid   references email_attachments(id) on delete set null,
  direction     text not null default 'out',   -- out (on émet) | in (on reçoit)
  number        text,
  label         text,
  amount_ht     numeric(12,2) default 0,
  vat_rate      numeric(5,2)  default 8.5,
  amount_ttc    numeric(12,2) default 0,
  status        text not null default 'draft', -- draft | sent | accepted | refused | expired
  issued_at     date,
  valid_until   date,
  accepted_at   date,
  pdf_url       text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists quotes_project_idx on quotes(project_id);
create index if not exists quotes_status_idx  on quotes(status);

create or replace function set_quote_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at = current_date;
  end if;
  return new;
end $$;

drop trigger if exists trg_quotes_updated on quotes;
create trigger trg_quotes_updated
  before update on quotes
  for each row execute function set_quote_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- MAIL_LOGS : journal d'exécution des syncs / classifications / push calendar
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists mail_logs (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,        -- gmail-sync | mail-classify | calendar-sync | project-export
  action     text not null,        -- poll | classify | upsert | push | error
  ref_id     uuid,                 -- email_id / task_id / reminder_id selon le contexte
  success    boolean default true,
  message    text,
  payload    jsonb,
  created_at timestamptz default now()
);
create index if not exists mail_logs_source_idx on mail_logs(source, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- MAIL_INTEGRATIONS : tokens OAuth (un seul tenant pour l'instant)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists mail_integrations (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,             -- gmail | gcal
  account_email text not null,
  refresh_token text not null,
  access_token  text,
  expires_at    timestamptz,
  scopes        text[],
  last_sync_at  timestamptz,
  history_id    text,                      -- pour Gmail incremental sync
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (provider, account_email)
);
create index if not exists mail_integrations_active_idx on mail_integrations(provider) where active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS : admin/collaborateur full, client read-only sur ses propres records
-- ─────────────────────────────────────────────────────────────────────────────
alter table emails              enable row level security;
alter table email_attachments   enable row level security;
alter table tasks               enable row level security;
alter table reminders           enable row level security;
alter table quotes              enable row level security;
alter table mail_logs           enable row level security;
alter table mail_integrations   enable row level security;

-- Helper : on suppose que get_my_role() existe déjà (utilisé par invoices)

-- EMAILS
drop policy if exists emails_admin_all   on emails;
drop policy if exists emails_client_read on emails;
create policy emails_admin_all on emails
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
create policy emails_client_read on emails
  for select using (
    project_id in (select id from projects where client_id = auth.uid())
  );

-- EMAIL_ATTACHMENTS : visibilité héritée du mail (admin only en pratique)
drop policy if exists email_attachments_admin_all on email_attachments;
create policy email_attachments_admin_all on email_attachments
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- TASKS
drop policy if exists tasks_admin_all  on tasks;
drop policy if exists tasks_self_read  on tasks;
create policy tasks_admin_all on tasks
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
create policy tasks_self_read on tasks
  for select using ( assignee_id = auth.uid() );

-- REMINDERS
drop policy if exists reminders_admin_all on reminders;
drop policy if exists reminders_self_read on reminders;
create policy reminders_admin_all on reminders
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
create policy reminders_self_read on reminders
  for select using ( recipient_id = auth.uid() );

-- QUOTES
drop policy if exists quotes_admin_all   on quotes;
drop policy if exists quotes_client_read on quotes;
create policy quotes_admin_all on quotes
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
create policy quotes_client_read on quotes
  for select using ( client_id = auth.uid() );

-- MAIL_LOGS : admin only
drop policy if exists mail_logs_admin_all on mail_logs;
create policy mail_logs_admin_all on mail_logs
  for all using ( get_my_role() = 'admin' )
       with check ( get_my_role() = 'admin' );

-- MAIL_INTEGRATIONS : admin only
drop policy if exists mail_integrations_admin_all on mail_integrations;
create policy mail_integrations_admin_all on mail_integrations
  for all using ( get_my_role() = 'admin' )
       with check ( get_my_role() = 'admin' );
