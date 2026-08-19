-- 2026-08-14 — claim_pending_projects() : exiger un email confirmé
-- À exécuter dans Supabase SQL editor (ou via `supabase db push`).
--
-- claim_pending_projects() rattache au compte qui vient de se connecter tous les
-- projets pré-créés dont brief->>'pendingClientEmail' correspond (en security
-- definer, pour contourner la RLS client qui interdit d'UPDATE un projet
-- client_id=null). Problème : elle ne vérifiait que auth.users.email, jamais
-- email_confirmed_at. Un compte créé (même sans jamais confirmer son adresse)
-- avec l'email d'un vrai client rattachait immédiatement à lui tous les projets
-- (et briefs) en attente pour cet email — usurpation possible sans même prouver
-- la possession de la boîte mail visée.

create or replace function public.claim_pending_projects()
returns integer language plpgsql security definer set search_path = public as $$
declare
  my_email text;
  n integer;
begin
  select email into my_email from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if my_email is null then return 0; end if;

  update public.projects
     set client_id = auth.uid(),
         brief = (brief - 'pendingClientEmail' - 'pendingClientName' - 'pendingClientCompany')
   where client_id is null
     and lower(brief->>'pendingClientEmail') = lower(my_email);

  get diagnostics n = row_count;
  return n;
end $$;
