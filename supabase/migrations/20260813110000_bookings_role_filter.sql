-- 2026-08-13 — Réservations : nom client + note interne visibles par tout visiteur non-admin
-- À exécuter dans Supabase Studio → SQL Editor
--
-- Constat : le front (CalendarModule/DayModal, App.js) charge `bookings` en entier
-- (`select("*")`) pour TOUS les rôles, y compris les clients — le masquage
-- (isAdmin && ...) n'est que visuel : les noms de clients et les notes internes de
-- TOUTES les réservations (pas seulement celles du visiteur) sont présents dans la
-- réponse réseau/le state React de n'importe quel client connecté. Le formulaire
-- « Poser une option » était en plus accessible sans vérification de rôle, permettant
-- à un client d'insérer une réservation arbitraire (nom, note, projet lié).
--
-- Le rôle Postgres "authenticated" est partagé par admin/collaborateur/client (la
-- distinction n'existe qu'au niveau applicatif via profiles.role + get_my_role()) :
-- un GRANT/REVOKE par colonne ne peut donc pas cibler uniquement les clients. On
-- verrouille la table aux admin/collaborateur via policies RESTRICTIVE (combinées en
-- ET avec la policy permissive historique, quel que soit son nom — même technique que
-- 20260813090000/20260813100000) et on expose une fonction SECURITY DEFINER qui
-- masque client_name/note pour les autres rôles tout en gardant date/équipe/statut/
-- créneaux visibles (nécessaire pour afficher les disponibilités du calendrier).

drop policy if exists bookings_select_admin_restrict on public.bookings;
create policy bookings_select_admin_restrict on public.bookings
  as restrictive
  for select
  using ( get_my_role() in ('admin','collaborateur') );

drop policy if exists bookings_insert_admin_restrict on public.bookings;
create policy bookings_insert_admin_restrict on public.bookings
  as restrictive
  for insert
  with check ( get_my_role() in ('admin','collaborateur') );

drop policy if exists bookings_update_admin_restrict on public.bookings;
create policy bookings_update_admin_restrict on public.bookings
  as restrictive
  for update
  using ( get_my_role() in ('admin','collaborateur') );

-- returns setof public.bookings (%rowtype) plutôt qu'une liste de colonnes typées à la
-- main : le schéma exact de bookings n'est pas dans les migrations versionnées, %rowtype
-- évite de deviner les types (id/project_id bigint vs uuid, etc.) et de casser la
-- fonction si la supposition est fausse.
create or replace function public.get_bookings()
returns setof public.bookings
language plpgsql security definer set search_path = public as $$
declare
  r public.bookings%rowtype;
begin
  if get_my_role() in ('admin','collaborateur') then
    return query select * from public.bookings order by date asc;
  else
    for r in select * from public.bookings order by date asc loop
      r.client_name := null;
      r.note := null;
      return next r;
    end loop;
  end if;
end;
$$;

grant execute on function public.get_bookings() to authenticated;
