-- auto-invoice numérotait les factures par count(*) sur l'année courante :
-- deux exécutions concurrentes (deux projets passant en "livraison" au même
-- moment) peuvent lire le même count avant que l'une des deux n'ait inséré sa
-- facture, et générer deux factures avec le même numéro F-YYYY-NNNN.
--
-- Compteur atomique par année : l'UPDATE ... RETURNING sur une ligne unique
-- prend un verrou ligne Postgres, ce qui sérialise les appels concurrents et
-- garantit un numéro unique même sous concurrence.

create table if not exists public.invoice_number_counters (
  year integer primary key,
  counter integer not null default 0
);

alter table public.invoice_number_counters enable row level security;

create or replace function public.next_invoice_number(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counter integer;
begin
  insert into public.invoice_number_counters (year, counter)
  values (p_year, 1)
  on conflict (year) do update set counter = invoice_number_counters.counter + 1
  returning counter into v_counter;
  return v_counter;
end;
$$;

revoke all on function public.next_invoice_number(integer) from public;
grant execute on function public.next_invoice_number(integer) to service_role;
