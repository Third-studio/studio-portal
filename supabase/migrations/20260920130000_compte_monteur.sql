-- 2026-09-20 — Compte « monteur ».
--
-- Constat : un monteur n'avait que deux mauvaises portes. Soit son lien /m/<token>, à garder
-- dans un message, sans mot de passe et introuvable depuis le site ; soit un compte de rôle
-- « collaborateur », qui ouvre tout le back-office (créer et supprimer des projets et des
-- sociétés, gérer les espaces clients et leurs mots de passe, révoquer les jetons des autres).
--
-- Ici : un troisième rôle. Le monteur se connecte sur /studio avec son adresse et retrouve
-- exactement l'espace qu'il avait par lien. Aucune policy d'équipe ne s'ouvre à lui : tout
-- passe par les RPC member_* (security definer) déjà en place, qui résolvent sa fiche
-- team_members. Révoquer sa fiche coupe les deux portes d'un coup.

-- ───────────────────────── 1. Le rôle existe ─────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['admin', 'collaborateur', 'client', 'partenaire', 'monteur']));

-- Personne ne se donne ce rôle tout seul : le garde-fou du 17/09 ne connaissait pas « monteur ».
create or replace function public.profiles_guard_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if get_my_role() is distinct from 'admin' and new.role in ('admin', 'collaborateur', 'monteur') then
    new.role := 'client';
  end if;
  return new;
end $$;

-- ──────────────── 2. Un compte pour une fiche, et une seule ────────────────
create unique index if not exists team_members_profile_idx
  on public.team_members (profile_id) where profile_id is not null;

-- ─────────── 3. Le monteur connecté retrouve sa fiche (sans jeton dans l'URL) ───────────
-- Volatile à dessein : une fiche sans jeton en reçoit un ici, sinon ses RPC ne répondraient pas.
create or replace function public.my_member_space()
returns json language plpgsql security definer set search_path = public as $$
declare m public.team_members;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'reason', 'session');
  end if;
  select * into m from public.team_members where profile_id = auth.uid();
  if m.id is null then
    return json_build_object('ok', false, 'reason', 'sans_fiche');
  end if;
  if m.access_revoked_at is not null then
    return json_build_object('ok', false, 'reason', 'revoque');
  end if;
  if coalesce(m.access_token, '') = '' then
    update public.team_members
       set access_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
     where id = m.id
    returning * into m;
  end if;
  return json_build_object('ok', true, 'token', m.access_token, 'memberId', m.id,
                           'nom', m.nom, 'role', m.role, 'color', m.color);
end $$;
revoke all on function public.my_member_space() from anon, public;
grant execute on function public.my_member_space() to authenticated;

-- ─────────── 4. Relier un compte à une fiche (Studio › Équipe, admin) ───────────
create or replace function public.member_set_account(p_member bigint, p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.profiles; e text := lower(trim(coalesce(p_email, '')));
begin
  if get_my_role() is distinct from 'admin' then
    return json_build_object('ok', false, 'reason', 'Réservé aux administrateurs.');
  end if;
  if e = '' then
    return json_build_object('ok', false, 'reason', 'Indiquez l''adresse email du compte.');
  end if;
  select * into v from public.profiles where lower(email) = e;
  if v.id is null then
    return json_build_object('ok', false, 'reason',
      'Aucun compte avec cette adresse. Invitez d''abord la personne depuis « Comptes équipe ».');
  end if;
  if exists (select 1 from public.team_members where profile_id = v.id and id <> p_member) then
    return json_build_object('ok', false, 'reason', 'Ce compte est déjà relié à une autre fiche.');
  end if;
  -- Un admin ou un collaborateur garde son rôle : relier sa fiche ne doit pas le rétrograder.
  update public.profiles set role = 'monteur', is_active = true
   where id = v.id and role not in ('admin', 'collaborateur');
  update public.team_members set profile_id = v.id where id = p_member;
  return json_build_object('ok', true, 'profileId', v.id,
                           'role', (select role from public.profiles where id = v.id));
end $$;
revoke all on function public.member_set_account(bigint, text) from anon, public;
grant execute on function public.member_set_account(bigint, text) to authenticated;

create or replace function public.member_clear_account(p_member bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  if get_my_role() is distinct from 'admin' then
    return json_build_object('ok', false, 'reason', 'Réservé aux administrateurs.');
  end if;
  update public.team_members set profile_id = null where id = p_member;
  return json_build_object('ok', true);
end $$;
revoke all on function public.member_clear_account(bigint) from anon, public;
grant execute on function public.member_clear_account(bigint) to authenticated;

-- ─────────── 5. Les fiches d'équipe existantes passent au nouveau rôle ───────────
-- Kellian : sa fiche porte son adresse personnelle, son compte celle de son école.
update public.team_members set profile_id = p.id
  from public.profiles p
 where public.team_members.profile_id is null
   and p.email = 'kjean-philippe@cfa-mans.com'
   and public.team_members.id = 2;

-- Les comptes reliés à une fiche de monteur n'ont plus besoin du back-office complet.
update public.profiles p set role = 'monteur'
  from public.team_members m
 where m.profile_id = p.id and p.role = 'collaborateur' and m.role = 'monteur';
