-- 2026-06-18 — Rattachement automatique des projets pré-créés (brief depuis email)
-- À exécuter dans Supabase SQL editor (ou via `supabase db push`).
--
-- Quand l'équipe crée un projet depuis un email avant que le client n'ait un compte,
-- on stocke l'email cible dans brief->>'pendingClientEmail' et client_id reste null.
-- À la première connexion du client (auto-inscription), cette fonction rattache
-- ces projets à son compte (la RLS client interdit au client d'UPDATE un projet
-- client_id=null, d'où le security definer).

create or replace function public.claim_pending_projects()
returns integer language plpgsql security definer set search_path = public as $$
declare
  my_email text;
  n integer;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then return 0; end if;

  update public.projects
     set client_id = auth.uid(),
         brief = (brief - 'pendingClientEmail' - 'pendingClientName' - 'pendingClientCompany')
   where client_id is null
     and lower(brief->>'pendingClientEmail') = lower(my_email);

  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.claim_pending_projects() to authenticated;
