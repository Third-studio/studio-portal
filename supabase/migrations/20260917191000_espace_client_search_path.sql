-- 2026-09-17 — Correctif : pgcrypto vit dans le schéma extensions (search_path)
-- Un share_link = un espace client. slug = nom saisi par le client (insensible à la casse),
-- password_hash = bcrypt. L'ouverture renvoie le token existant → page /p/<token>.


-- Équipe : définir / changer le mot de passe d'un espace
create or replace function public.set_client_space_password(p_link uuid, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if get_my_role() not in ('admin','collaborateur') then return json_build_object('ok', false, 'reason', 'Réservé à l''équipe'); end if;
  if length(coalesce(p_password, '')) < 4 then return json_build_object('ok', false, 'reason', 'Mot de passe trop court (4 caractères minimum)'); end if;
  update public.share_links set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = p_link;
  if not found then return json_build_object('ok', false, 'reason', 'Espace introuvable'); end if;
  return json_build_object('ok', true);
end $$;
revoke all on function public.set_client_space_password(uuid, text) from public;
grant execute on function public.set_client_space_password(uuid, text) to authenticated;

-- Client : ouvrir l'espace avec nom + mot de passe → token
create or replace function public.open_client_space(p_name text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare l public.share_links;
begin
  perform pg_sleep(0.25); -- freine les essais en rafale
  select * into l from public.share_links
   where slug is not null and lower(slug) = lower(trim(p_name)) and revoked_at is null;
  if l.id is null or l.password_hash is null or crypt(coalesce(p_password, ''), l.password_hash) <> l.password_hash then
    return json_build_object('ok', false, 'reason', 'Nom ou mot de passe incorrect');
  end if;
  update public.share_links set last_seen_at = now() where id = l.id;
  return json_build_object('ok', true, 'token', l.token, 'label', l.label);
end $$;
revoke all on function public.open_client_space(text, text) from public;
grant execute on function public.open_client_space(text, text) to anon, authenticated;
