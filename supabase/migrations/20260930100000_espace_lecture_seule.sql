-- 2026-09-30 — Espaces en lecture seule (share_links.read_only)
-- Un espace en lecture seule sert à montrer un film à un prestataire ou un partenaire (voix, musique…) :
-- on regarde les versions, rien d'autre. Ni validation, ni commentaire, ni réponse, ni message,
-- ni demande de déclinaison ; les échanges et commentaires du client ne lui sont pas renvoyés.
--
-- Mise en œuvre : les six RPC publiques de l'espace sont renommées en <nom>_rw (corps inchangé,
-- plus accessibles à anon) et remplacées par une enveloppe du même nom qui applique la lecture seule.
-- ⚠️ Pour modifier la logique de l'une de ces RPC, redéfinir <nom>_rw, PAS <nom> : un
-- « create or replace function public.<nom> » avec le corps complet effacerait la lecture seule.

alter table public.share_links add column if not exists read_only boolean not null default false;

create or replace function public.share_link_read_only(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select read_only from public.share_links where token = p_token and revoked_at is null), false);
$$;
revoke all on function public.share_link_read_only(text) from public, anon, authenticated;

-- ── 1. Renommage des RPC existantes (idempotent) ─────────────────────────────
do $$
declare
  f record;
begin
  for f in select * from (values
    ('get_link_space',        'text, boolean'),
    ('link_get_review',       'text, uuid'),
    ('link_add_comment',      'text, uuid, text, text, numeric'),
    ('link_validate_version', 'text, uuid, text'),
    ('link_reply_comment',    'text, uuid, text, text'),
    ('link_post_message',     'text, bigint, text, text, text')
  ) as t(name, args)
  loop
    if to_regprocedure(format('public.%s_rw(%s)', f.name, f.args)) is null then
      execute format('alter function public.%I(%s) rename to %I', f.name, f.args, f.name || '_rw');
    end if;
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', f.name || '_rw', f.args);
  end loop;
end $$;

-- ── 2. Lecture : on ajoute readOnly et on retire les échanges ────────────────
create or replace function public.get_link_space(p_token text, p_touch boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare
  r  jsonb := public.get_link_space_rw(p_token, p_touch)::jsonb;
  ro boolean := public.share_link_read_only(p_token);
begin
  if r is null then return null; end if;
  if ro and jsonb_typeof(r->'projects') = 'array' then
    r := jsonb_set(r, '{projects}', coalesce((
      select jsonb_agg(
               p || jsonb_build_object(
                 'messages', '[]'::jsonb,
                 'versions', case when jsonb_typeof(p->'versions') = 'array' then coalesce((
                   select jsonb_agg(v || jsonb_build_object('comments', 0) order by vi)
                     from jsonb_array_elements(p->'versions') with ordinality as x(v, vi)), '[]'::jsonb)
                   else coalesce(p->'versions', '[]'::jsonb) end)
               order by pi)
        from jsonb_array_elements(r->'projects') with ordinality as y(p, pi)), '[]'::jsonb));
  end if;
  return (r || jsonb_build_object('readOnly', ro))::json;
end $$;

create or replace function public.link_get_review(p_token text, p_version uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  r  jsonb := public.link_get_review_rw(p_token, p_version)::jsonb;
  ro boolean := public.share_link_read_only(p_token);
begin
  if r is null then return null; end if;
  if ro and r ? 'comments' then r := jsonb_set(r, '{comments}', '[]'::jsonb); end if;
  return (r || jsonb_build_object('readOnly', ro))::json;
end $$;

-- ── 3. Écriture : refusée en lecture seule ───────────────────────────────────
create or replace function public.link_add_comment(p_token text, p_version uuid, p_author text, p_body text, p_t numeric)
returns json language plpgsql security definer set search_path = public as $$
begin
  if public.share_link_read_only(p_token) then return json_build_object('ok', false, 'reason', 'Ce lien permet uniquement de regarder les vidéos.'); end if;
  return public.link_add_comment_rw(p_token, p_version, p_author, p_body, p_t);
end $$;

create or replace function public.link_validate_version(p_token text, p_version uuid, p_author text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if public.share_link_read_only(p_token) then return json_build_object('ok', false, 'reason', 'Ce lien permet uniquement de regarder les vidéos.'); end if;
  return public.link_validate_version_rw(p_token, p_version, p_author);
end $$;

create or replace function public.link_reply_comment(p_token text, p_comment uuid, p_author text, p_body text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if public.share_link_read_only(p_token) then return json_build_object('ok', false, 'reason', 'Ce lien permet uniquement de regarder les vidéos.'); end if;
  return public.link_reply_comment_rw(p_token, p_comment, p_author, p_body);
end $$;

create or replace function public.link_post_message(p_token text, p_project bigint, p_author text, p_content text, p_kind text default 'message')
returns json language plpgsql security definer set search_path = public as $$
begin
  if public.share_link_read_only(p_token) then return json_build_object('ok', false, 'reason', 'Ce lien permet uniquement de regarder les vidéos.'); end if;
  return public.link_post_message_rw(p_token, p_project, p_author, p_content, p_kind);
end $$;

revoke all on function public.get_link_space(text, boolean) from public;
revoke all on function public.link_get_review(text, uuid) from public;
revoke all on function public.link_add_comment(text, uuid, text, text, numeric) from public;
revoke all on function public.link_validate_version(text, uuid, text) from public;
revoke all on function public.link_reply_comment(text, uuid, text, text) from public;
revoke all on function public.link_post_message(text, bigint, text, text, text) from public;
grant execute on function public.get_link_space(text, boolean) to anon, authenticated;
grant execute on function public.link_get_review(text, uuid) to anon, authenticated;
grant execute on function public.link_add_comment(text, uuid, text, text, numeric) to anon, authenticated;
grant execute on function public.link_validate_version(text, uuid, text) to anon, authenticated;
grant execute on function public.link_reply_comment(text, uuid, text, text) to anon, authenticated;
grant execute on function public.link_post_message(text, bigint, text, text, text) to anon, authenticated;
