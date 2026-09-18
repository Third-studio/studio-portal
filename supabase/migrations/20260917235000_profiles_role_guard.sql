-- 2026-09-17 — Garde-fou : un utilisateur ne peut pas changer lui-même son rôle ni son activation.
-- Constat : les policies own_profile / "Users own profile" (for all, id = auth.uid()) laissent un client
-- faire update profiles set role = 'admin'. Ce trigger conserve les anciennes valeurs de role / is_active
-- sauf si l'appelant est admin (get_my_role()), service_role (Edge Functions) ou une session sans JWT (CLI, SQL editor).
create or replace function public.profiles_guard_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new; -- service role, CLI, SQL editor : autorisés
  end if;
  caller_role := get_my_role();
  if caller_role is distinct from 'admin' then
    new.role      := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update of role, is_active on public.profiles
  for each row execute function public.profiles_guard_role();

-- À l'insertion (inscription), un non-admin ne peut pas se créer admin/collaborateur.
create or replace function public.profiles_guard_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if get_my_role() is distinct from 'admin' and new.role in ('admin', 'collaborateur') then
    new.role := 'client';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert
  before insert on public.profiles
  for each row execute function public.profiles_guard_insert();
