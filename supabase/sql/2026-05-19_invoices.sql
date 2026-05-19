-- 2026-05-19 — Facturation projets
-- À exécuter dans Supabase SQL editor.

create table if not exists invoices (
  id            uuid primary key default gen_random_uuid(),
  project_id    bigint references projects(id) on delete cascade,
  client_id     uuid   references profiles(id) on delete set null,
  number        text,                     -- ex: F-2026-0042
  label         text,                     -- libellé / objet
  amount_ht     numeric(12,2) default 0,
  vat_rate      numeric(5,2)  default 8.5,-- TVA Martinique par défaut
  amount_ttc    numeric(12,2) default 0,
  status        text not null default 'draft', -- draft | sent | paid | overdue | cancelled
  issued_at     date,
  due_date      date,
  paid_at       date,
  pdf_url       text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists invoices_project_idx on invoices(project_id);
create index if not exists invoices_client_idx  on invoices(client_id);
create index if not exists invoices_status_idx  on invoices(status);

create or replace function set_invoice_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at = current_date;
  end if;
  return new;
end $$;

drop trigger if exists trg_invoices_updated on invoices;
create trigger trg_invoices_updated
  before update on invoices
  for each row execute function set_invoice_updated_at();

-- RLS
alter table invoices enable row level security;

drop policy if exists invoices_admin_all   on invoices;
drop policy if exists invoices_client_read on invoices;

create policy invoices_admin_all on invoices
  for all
  using ( get_my_role() in ('admin','collaborateur') )
  with check ( get_my_role() in ('admin','collaborateur') );

create policy invoices_client_read on invoices
  for select
  using ( client_id = auth.uid() );
