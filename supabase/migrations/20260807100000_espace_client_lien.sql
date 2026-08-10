-- 2026-08-07 — Espace client par lien (sans compte)
-- Chaque client (profiles role='client') a UN lien permanent ?projets=TOKEN
-- qui liste tous ses projets, en cours comme livrés. Lecture seule, champs
-- sûrs uniquement, via RPC security definer. Révocable (share_revoked_at ou
-- régénération du token). Même pattern que l'espace monteur.

-- ── 1. Jeton de partage par client ───────────────────────────────────────────
alter table public.profiles add column if not exists share_token      text;
alter table public.profiles add column if not exists share_revoked_at timestamptz;

update public.profiles
   set share_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
 where share_token is null and role = 'client';

create unique index if not exists profiles_share_token_idx
  on public.profiles(share_token);

-- ── 2. Lecture de l'espace (anon, via jeton) ─────────────────────────────────
create or replace function public.get_client_space(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       public.profiles;
  projets json;
begin
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;
  select * into c from public.profiles where share_token = p_token and role = 'client';
  if c.id is null then
    return json_build_object('valid', false, 'reason', 'Lien introuvable');
  end if;
  if c.share_revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'Lien révoqué');
  end if;
  if c.is_active is false then
    return json_build_object('valid', false, 'reason', 'Accès suspendu');
  end if;

  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) into projets
  from (
    select p.id,
           p.title,
           p.status,
           p.progress,
           p.status_note   as "statusNote",
           p.delivery_date as "deliveryDate",
           p.shoot_date    as "shootDate",
           p.replay_url    as "replayUrl",
           p.created_at    as "createdAt",
           coalesce((
             select json_agg(json_build_object('label', l->>'label', 'url', l->>'url'))
               from jsonb_array_elements(coalesce(p.brief->'replayLinks', '[]'::jsonb)) l
              where coalesce(l->>'url', '') <> ''
           ), '[]'::json) as "replayLinks"
      from public.projects p
     where p.client_id = c.id
  ) x;

  return json_build_object(
    'valid', true,
    'client', json_build_object('nom', c.nom, 'company', c.company),
    'projects', projets
  );
end $$;

revoke all on function public.get_client_space(text) from public;
grant execute on function public.get_client_space(text) to anon, authenticated;
