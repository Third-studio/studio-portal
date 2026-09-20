-- 2026-09-20 — Échanges client ↔ monteur : cloisonnement et réponses structurées
--
-- Deux problèmes corrigés :
--  1. Tout message d'un monteur partait au client (email + WhatsApp signés de son nom),
--     alors que le champ s'intitule « Échanges avec l'équipe ». Les messages ont désormais
--     une visibilité explicite ; par défaut, un monteur écrit à l'équipe seulement.
--  2. Une demande du client n'avait pas d'état : on ne savait pas si elle était faite,
--     refusée ou en attente. Chaque demande porte maintenant un état et des réponses
--     structurées (possible / pas possible + raison codée).

-- ── 1. Visibilité des messages de projet ────────────────────────────────────
alter table public.messages add column if not exists visibility text not null default 'client';
alter table public.messages drop constraint if exists messages_visibility_check;
alter table public.messages add constraint messages_visibility_check check (visibility in ('client','interne'));
update public.messages set visibility = 'interne' where role = 'monteur' and visibility <> 'interne';
create index if not exists messages_visibility_idx on public.messages (project_id, visibility);
comment on column public.messages.visibility is 'client = visible dans l''espace client ; interne = équipe et monteurs seulement.';

-- ── 2. Demandes : état et visibilité ────────────────────────────────────────
alter table public.version_comments add column if not exists visibility text not null default 'client';
alter table public.version_comments drop constraint if exists version_comments_visibility_check;
alter table public.version_comments add constraint version_comments_visibility_check check (visibility in ('client','interne'));
update public.version_comments set visibility = 'interne' where role = 'monteur' and visibility <> 'interne';

alter table public.version_comments add column if not exists state text not null default 'en_attente';
alter table public.version_comments drop constraint if exists version_comments_state_check;
alter table public.version_comments add constraint version_comments_state_check
  check (state in ('en_attente','acceptee','faite','impossible','precision'));
create index if not exists version_comments_state_idx on public.version_comments (version_id, state);
comment on column public.version_comments.state is 'en_attente | acceptee (sera fait) | faite | impossible | precision (question au client).';

-- ── 3. Réponses à une demande ───────────────────────────────────────────────
create table if not exists public.comment_replies (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.version_comments(id) on delete cascade,
  author     text not null,
  role       text not null check (role in ('client','studio','monteur')),
  status     text check (status in ('acceptee','faite','impossible','precision')),
  reason     text check (reason in ('rush_absent','cadre','qualite','droits','contradiction','hors_devis','technique','autre')),
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint comment_replies_reason_only_if_impossible check (reason is null or status = 'impossible')
);
create index if not exists comment_replies_comment_idx on public.comment_replies (comment_id, created_at);
alter table public.comment_replies enable row level security;
drop policy if exists comment_replies_team on public.comment_replies;
create policy comment_replies_team on public.comment_replies
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );
revoke all on public.comment_replies from anon, public;
grant select, insert, update, delete on public.comment_replies to authenticated;

-- Libellé lisible d'une raison de refus (source unique, réutilisée par les exports).
create or replace function public.review_reason_label(p text)
returns text language sql immutable set search_path = public as $$
  select case p
    when 'rush_absent'   then 'Le plan demandé n''existe pas dans les rushs'
    when 'cadre'         then 'Le cadrage ne permet pas cette modification'
    when 'qualite'       then 'Qualité d''image ou de son insuffisante'
    when 'droits'        then 'Droits ou autorisation manquants'
    when 'contradiction' then 'Contredit une autre demande déjà validée'
    when 'hors_devis'    then 'Hors du périmètre prévu, à chiffrer'
    when 'technique'     then 'Techniquement impossible dans ce format'
    when 'autre'         then 'Autre raison'
    else null end;
$$;

-- L'état de la demande suit la dernière réponse qui en porte un.
create or replace function public.comment_replies_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is not null then
    update public.version_comments
       set state       = new.status,
           resolved_at = case when new.status in ('faite','impossible') then now() else null end,
           resolved_by = case when new.status in ('faite','impossible') then new.author else null end
     where id = new.comment_id;
  elsif new.role = 'client' then
    -- Le client a répondu à une demande de précision : la balle repasse au montage.
    update public.version_comments set state = 'en_attente', resolved_at = null, resolved_by = null
     where id = new.comment_id and state = 'precision';
  end if;
  return new;
end $$;
drop trigger if exists comment_replies_sync on public.comment_replies;
create trigger comment_replies_sync after insert on public.comment_replies
  for each row execute function public.comment_replies_sync();

-- ── 4. JSON d'une demande : état, réponses, visibilité ──────────────────────
create or replace function public.review_comment_json(c public.version_comments)
returns json language sql stable set search_path = public as $$
  select json_build_object(
    'id', c.id, 'author', c.author, 'role', c.role, 'body', c.body,
    't', round(c.t_seconds, 3), 'createdAt', c.created_at,
    'resolved', c.resolved_at is not null, 'resolvedBy', c.resolved_by,
    'state', c.state, 'visibility', c.visibility,
    'replies', coalesce((
      select json_agg(json_build_object(
               'id', r.id, 'author', r.author, 'role', r.role, 'status', r.status,
               'reason', r.reason, 'reasonLabel', public.review_reason_label(r.reason),
               'body', r.body, 'createdAt', r.created_at) order by r.created_at)
        from public.comment_replies r where r.comment_id = c.id), '[]'::json));
$$;

-- ── 5. Le monteur répond à une demande ──────────────────────────────────────
create or replace function public.member_reply_comment(
  p_token text, p_comment uuid, p_status text, p_reason text default null, p_body text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  m      public.team_members;
  c      public.version_comments;
  v      public.project_versions;
  clean  text := left(trim(coalesce(p_body, '')), 4000);
  titre  text;
  rep    public.comment_replies;
begin
  select * into m from public.team_members where access_token = p_token and access_revoked_at is null;
  if m.id is null then return json_build_object('ok', false, 'reason', 'Lien invalide ou révoqué'); end if;

  select * into c from public.version_comments where id = p_comment;
  if c.id is null then return json_build_object('ok', false, 'reason', 'Demande introuvable'); end if;
  select * into v from public.project_versions where id = c.version_id;
  if not exists (select 1 from public.project_assignments a where a.member_id = m.id and a.project_id = c.project_id) then
    return json_build_object('ok', false, 'reason', 'Projet non attribué');
  end if;

  if p_status not in ('acceptee','faite','impossible','precision') then
    return json_build_object('ok', false, 'reason', 'Réponse inconnue');
  end if;
  if p_status = 'impossible' then
    if public.review_reason_label(p_reason) is null then
      return json_build_object('ok', false, 'reason', 'Indiquez la raison pour laquelle ce n''est pas possible');
    end if;
    if length(clean) < 10 then
      return json_build_object('ok', false, 'reason', 'Expliquez en une phrase pourquoi ce n''est pas possible');
    end if;
  end if;
  if p_status = 'precision' and length(clean) < 5 then
    return json_build_object('ok', false, 'reason', 'Posez votre question au client');
  end if;
  if clean = '' then
    clean := case p_status when 'acceptee' then 'C''est noté, ce sera fait dans la prochaine version.'
                           when 'faite'    then 'C''est fait dans cette version.' else '' end;
  end if;

  insert into public.comment_replies (comment_id, author, role, status, reason, body)
  values (p_comment, m.nom, 'monteur', p_status,
          case when p_status = 'impossible' then p_reason else null end, clean)
  returning * into rep;

  select p.title into titre from public.projects p where p.id = c.project_id;
  begin
    perform public.log_project_event(c.project_id, 'demande_' || p_status,
      m.nom || ' : ' || left(clean, 140), jsonb_build_object('comment_id', p_comment, 'member_id', m.id));
  exception when others then null; end;
  begin
    perform public.notify_admin_whatsapp(
      case p_status when 'impossible' then '⛔ ' when 'precision' then '❓ ' when 'faite' then '✅ ' else '👍 ' end
      || m.nom || ' sur « ' || coalesce(titre, '?') || ' » (' || coalesce(v.label, 'version') || ') : '
      || case when p_status = 'impossible' then public.review_reason_label(p_reason) || ' — ' else '' end
      || left(clean, 160));
  exception when others then null; end;

  return json_build_object('ok', true, 'state', p_status, 'reply', json_build_object(
    'id', rep.id, 'author', rep.author, 'role', rep.role, 'status', rep.status,
    'reason', rep.reason, 'reasonLabel', public.review_reason_label(rep.reason),
    'body', rep.body, 'createdAt', rep.created_at));
end $$;
revoke all on function public.member_reply_comment(text, uuid, text, text, text) from public;
grant execute on function public.member_reply_comment(text, uuid, text, text, text) to anon, authenticated;

-- ── 6. Le client répond (précision demandée) ────────────────────────────────
create or replace function public.link_reply_comment(p_token text, p_comment uuid, p_author text, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare
  l      public.share_links;
  c      public.version_comments;
  acc    record;
  auteur text := left(regexp_replace(coalesce(trim(p_author), ''), '\s+', ' ', 'g'), 60);
  clean  text := left(trim(coalesce(p_body, '')), 4000);
  rep    public.comment_replies;
  titre  text;
begin
  if length(auteur) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom'); end if;
  if clean = ''         then return json_build_object('ok', false, 'reason', 'Votre réponse est vide'); end if;

  select * into c from public.version_comments where id = p_comment;
  if c.id is null then return json_build_object('ok', false, 'reason', 'Demande introuvable'); end if;
  select * into acc from public.review_link_access(p_token, c.project_id);
  if not coalesce(acc.allowed, false) then return json_build_object('ok', false, 'reason', 'Projet non accessible avec ce lien'); end if;
  if c.visibility <> 'client' then return json_build_object('ok', false, 'reason', 'Demande introuvable'); end if;

  insert into public.comment_replies (comment_id, author, role, status, body)
  values (p_comment, auteur, 'client', null, clean)
  returning * into rep;

  select p.title into titre from public.projects p where p.id = c.project_id;
  begin
    perform public.notify_admin_whatsapp('💬 ' || auteur || ' (client) précise sur « ' || coalesce(titre, '?') || ' » : ' || left(clean, 160));
  exception when others then null; end;

  return json_build_object('ok', true, 'reply', json_build_object(
    'id', rep.id, 'author', rep.author, 'role', rep.role, 'status', null,
    'reason', null, 'reasonLabel', null, 'body', rep.body, 'createdAt', rep.created_at));
end $$;
revoke all on function public.link_reply_comment(text, uuid, text, text) from public;
grant execute on function public.link_reply_comment(text, uuid, text, text) to anon, authenticated;

-- ── 7. Message du monteur : à l'équipe par défaut, au client seulement si demandé ──
drop function if exists public.member_send_message(text, bigint, text);
create or replace function public.member_send_message(
  p_token text, p_project bigint, p_content text, p_visibility text default 'interne')
returns json language plpgsql security definer set search_path = public as $$
declare
  m        public.team_members;
  clean    text;
  vis      text := case when lower(coalesce(p_visibility, '')) = 'client' then 'client' else 'interne' end;
  p_title  text;
  c_id     uuid;
  c_email  text;
  c_nom    text;
begin
  select * into m from public.team_members where access_token = p_token and access_revoked_at is null;
  if m.id is null then return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué'); end if;
  if not exists (select 1 from public.project_assignments a where a.member_id = m.id and a.project_id = p_project) then
    return json_build_object('ok', false, 'error', 'Projet non attribué');
  end if;
  clean := left(trim(coalesce(p_content, '')), 4000);
  if clean = '' then return json_build_object('ok', false, 'error', 'Message vide'); end if;

  insert into public.messages (project_id, author, content, role, visibility)
  values (p_project, m.nom, clean, 'monteur', vis);

  select p.title, pr.id, pr.email, pr.nom into p_title, c_id, c_email, c_nom
    from public.projects p left join public.profiles pr on pr.id = p.client_id where p.id = p_project;

  begin
    perform public.log_project_event(p_project, 'message',
      m.nom || case when vis = 'client' then ' a écrit au client' else ' a écrit à l''équipe' end,
      jsonb_build_object('member_id', m.id, 'visibility', vis));
  exception when others then null; end;

  -- Le client n'est prévenu que si le message lui est explicitement adressé.
  if vis = 'client' and c_email is not null then
    begin
      perform public.call_edge('send-email', jsonb_build_object(
        'to', c_email,
        'subject', 'Nouveau message sur « ' || coalesce(p_title, 'votre projet') || ' »',
        'kicker', 'Messagerie projet',
        'title', 'Nouveau message de ' || m.nom,
        'text', 'Bonjour ' || coalesce(c_nom, '') || ',' || E'\n\n'
                || m.nom || ' (montage) vous a écrit sur « ' || coalesce(p_title, 'votre projet') || ' » :'
                || E'\n\n« ' || left(clean, 300) || case when length(clean) > 300 then '… »' else ' »' end
                || E'\n\nRépondez depuis votre espace client.',
        'cta', jsonb_build_object('label', 'Ouvrir mon espace', 'url', 'https://www.thirdone.studio/client')));
    exception when others then null; end;
    begin
      perform public.notify_client_whatsapp(c_id,
        '💬 ' || m.nom || ' (Third-One Studio) sur « ' || coalesce(p_title, 'votre projet') || ' » : '
        || left(clean, 250) || case when length(clean) > 250 then '…' else '' end);
    exception when others then null; end;
  end if;

  begin
    perform public.notify_admin_whatsapp(
      case when vis = 'client' then '💬➡️client ' else '🔒 interne ' end
      || m.nom || ' sur « ' || coalesce(p_title, '?') || ' » : ' || left(clean, 200));
  exception when others then null; end;

  return json_build_object('ok', true, 'visibility', vis, 'emailed', vis = 'client' and c_email is not null);
end $$;
revoke all on function public.member_send_message(text, bigint, text, text) from public;
grant execute on function public.member_send_message(text, bigint, text, text) to anon, authenticated;

-- ── 8. Espace client : messages internes et demandes internes masqués ───────
create or replace function public.get_link_space(p_token text, p_touch boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare
  l        public.share_links;
  c        public.profiles;
  cc       public.client_companies;
  groupes  json := '[]'::json;
  projets  json := '[]'::json;
begin
  if coalesce(trim(p_token), '') = '' or length(p_token) < 20 then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;
  select * into l from public.share_links where token = p_token;
  if l.id is not null then
    if l.revoked_at is not null then return json_build_object('valid', false, 'reason', 'Lien révoqué'); end if;
    if coalesce(p_touch, true) then update public.share_links set last_seen_at = now() where id = l.id; end if;
    if l.client_id is not null then select * into c from public.profiles where id = l.client_id; end if;
    if l.company_id is not null then select * into cc from public.client_companies where id = l.company_id; end if;

    select coalesce(json_agg(json_build_object('id', g.id, 'parentId', g.parent_id, 'name', g.name, 'position', g.position) order by g.position, g.name), '[]'::json)
      into groupes from public.share_link_groups g where g.link_id = l.id;

    select coalesce(json_agg(x order by x."position", x."createdAt" desc), '[]'::json) into projets
    from (
      select p.id, p.title, p.status, p.progress,
             p.status_note as "statusNote", p.delivery_date as "deliveryDate", p.shoot_date as "shootDate",
             p.replay_url as "replayUrl", p.final_url as "finalUrl", p.validated_at as "validatedAt", p.validated_by as "validatedBy",
             p.created_at as "createdAt", lp.group_id as "groupId", lp.position,
             coalesce((
               select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
                 from public.messages m
                where m.project_id = p.id and m.visibility = 'client'
                  and (m.link_id = l.id or m.role in ('admin','collaborateur','studio','monteur'))
             ), '[]'::json) as messages,
             coalesce((
               select json_agg(json_build_object('id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                        'comments', (select count(*) from public.version_comments vc
                                      where vc.version_id = pv.id and vc.visibility = 'client'
                                        and (vc.role <> 'client' or vc.link_id is not distinct from l.id)),
                        'answered', (select count(*) from public.version_comments vc
                                      where vc.version_id = pv.id and vc.visibility = 'client'
                                        and vc.state in ('faite','impossible','acceptee')
                                        and (vc.role <> 'client' or vc.link_id is not distinct from l.id)),
                        'waitingClient', (select count(*) from public.version_comments vc
                                      where vc.version_id = pv.id and vc.visibility = 'client' and vc.state = 'precision'
                                        and (vc.role <> 'client' or vc.link_id is not distinct from l.id)))
                      order by pv.created_at desc)
                 from public.project_versions pv
                where pv.project_id = p.id and pv.visible_client
             ), '[]'::json) as versions
        from public.share_link_projects lp
        join public.projects p on p.id = lp.project_id
       where lp.link_id = l.id and p.archived_at is null
    ) x;

    return json_build_object(
      'valid', true,
      'link', json_build_object('label', l.label, 'kind', 'link'),
      'client', case when c.id is not null then json_build_object('nom', c.nom, 'company', c.company)
                     when cc.id is not null then json_build_object('nom', cc.name, 'company', cc.name)
                     else null end,
      'groups', groupes, 'projects', projets);
  end if;

  select * into c from public.profiles where share_token = p_token and role = 'client';
  if c.id is null then return json_build_object('valid', false, 'reason', 'Lien introuvable'); end if;
  if c.share_revoked_at is not null then return json_build_object('valid', false, 'reason', 'Lien révoqué'); end if;
  if c.is_active is false then return json_build_object('valid', false, 'reason', 'Accès suspendu'); end if;
  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) into projets
  from (
    select p.id, p.title, p.status, p.progress, p.status_note as "statusNote", p.delivery_date as "deliveryDate", p.shoot_date as "shootDate",
           p.replay_url as "replayUrl", p.final_url as "finalUrl", p.validated_at as "validatedAt", p.validated_by as "validatedBy",
           p.created_at as "createdAt", null::uuid as "groupId", 0 as position,
           coalesce((select json_agg(json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at) order by m.created_at)
                       from public.messages m where m.project_id = p.id and m.visibility = 'client'
                         and m.role in ('client','admin','collaborateur','studio','monteur')), '[]'::json) as messages,
           coalesce((
             select json_agg(json_build_object('id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                      'comments', (select count(*) from public.version_comments vc
                                    where vc.version_id = pv.id and vc.visibility = 'client' and (vc.role <> 'client' or vc.link_id is null)),
                      'answered', (select count(*) from public.version_comments vc
                                    where vc.version_id = pv.id and vc.visibility = 'client' and vc.state in ('faite','impossible','acceptee')
                                      and (vc.role <> 'client' or vc.link_id is null)),
                      'waitingClient', (select count(*) from public.version_comments vc
                                    where vc.version_id = pv.id and vc.visibility = 'client' and vc.state = 'precision'
                                      and (vc.role <> 'client' or vc.link_id is null)))
                    order by pv.created_at desc)
               from public.project_versions pv where pv.project_id = p.id and pv.visible_client
           ), '[]'::json) as versions
      from public.projects p where p.client_id = c.id and p.archived_at is null
  ) x;
  return json_build_object('valid', true, 'link', json_build_object('label', coalesce(c.company, c.nom), 'kind', 'legacy'),
    'client', json_build_object('nom', c.nom, 'company', c.company), 'groups', '[]'::json, 'projects', projets);
end $$;
revoke all on function public.get_link_space(text, boolean) from public;
grant execute on function public.get_link_space(text, boolean) to anon, authenticated;

-- ── 9. Page de relecture : le client ne voit que les demandes qui lui sont destinées ──
create or replace function public.review_payload(p_version uuid, p_client boolean, p_link uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v public.project_versions;
  titre text;
  liste json;
  coms  json;
begin
  select * into v from public.project_versions where id = p_version;
  if v.id is null then return null; end if;
  select title into titre from public.projects where id = v.project_id;
  select coalesce(json_agg(json_build_object(
           'id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
           'visibleClient', pv.visible_client) order by pv.created_at desc), '[]'::json)
    into liste
    from public.project_versions pv
   where pv.project_id = v.project_id and (not p_client or pv.visible_client);
  select coalesce(json_agg(public.review_comment_json(vc) order by vc.t_seconds, vc.created_at), '[]'::json)
    into coms
    from public.version_comments vc
   where vc.version_id = v.id
     and (not p_client or (vc.visibility = 'client' and (vc.role <> 'client' or vc.link_id is not distinct from p_link)));
  return json_build_object(
    'ok', true,
    'project', json_build_object('id', v.project_id, 'title', titre),
    'version', json_build_object('id', v.id, 'label', v.label, 'videoUrl', v.video_url, 'fps', v.fps,
                                 'durationS', v.duration_s, 'status', v.status, 'note', v.note,
                                 'visibleClient', v.visible_client, 'createdAt', v.created_at),
    'versions', liste,
    'comments', coms);
end $$;
revoke all on function public.review_payload(uuid, boolean, uuid) from public, anon, authenticated;

-- ── 10. Espace monteur : savoir ce qui est visible du client ────────────────
create or replace function public.get_member_workspace(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m       public.team_members;
  projets json;
  chrono  json;
begin
  if coalesce(trim(p_token), '') = '' then
    return json_build_object('valid', false, 'reason', 'Lien invalide');
  end if;
  select * into m from public.team_members where access_token = p_token;
  if m.id is null then
    return json_build_object('valid', false, 'reason', 'Lien introuvable');
  end if;
  if m.access_revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'Lien révoqué');
  end if;

  select json_build_object('projectId', e.project_id, 'startedAt', e.started_at)
    into chrono
    from public.member_time_entries e
   where e.member_id = m.id and e.ended_at is null
   order by e.started_at desc limit 1;

  select coalesce(json_agg(x order by x.delivery_date nulls last, x.title), '[]'::json) into projets
  from (
    select p.id,
           p.title,
           p.status,
           p.progress,
           p.status_note   as "statusNote",
           p.delivery_date as delivery_date,
           p.shoot_date    as "shootDate",
           p.replay_url    as "replayUrl",
           a.role_on_project as "roleOnProject",
           jsonb_build_object(
             'objective', p.brief->>'objective',
             'target',    p.brief->>'target',
             'duration',  p.brief->>'duration',
             'tone',      p.brief->>'tone',
             'notes',     p.brief->>'notes'
           ) as brief,
           jsonb_build_object(
             'status',  p.brief->>'videoStatus',
             'comment', p.brief->>'videoComment'
           ) as "clientFeedback",
           coalesce((
             select json_agg(json_build_object('id', d.id, 'url', d.url, 'note', d.note, 'at', d.created_at)
                             order by d.created_at desc)
               from public.member_deliveries d
              where d.project_id = p.id and d.member_id = m.id
           ), '[]'::json) as deliveries,
           coalesce((
             select json_agg(json_build_object(
                      'id', pv.id, 'label', pv.label, 'status', pv.status, 'createdAt', pv.created_at,
                      'visibleClient', pv.visible_client, 'createdBy', pv.created_by,
                      'comments', (select count(*) from public.version_comments vc where vc.version_id = pv.id),
                      'openComments', (select count(*) from public.version_comments vc where vc.version_id = pv.id and vc.resolved_at is null))
                    order by pv.created_at desc)
               from public.project_versions pv
              where pv.project_id = p.id
           ), '[]'::json) as versions,
           coalesce((
             select json_agg(json_build_object(
                      'id', msg.id, 'author', msg.author, 'content', msg.content, 'visibility', msg.visibility,
                      'role', msg.role, 'at', msg.created_at) order by msg.created_at)
               from (
                 select ms.id, ms.author, ms.content, ms.role, ms.created_at, ms.visibility
                   from public.messages ms
                  where ms.project_id = p.id
                    and coalesce(ms.role, '') <> 'prestataire'  -- propositions JSON, pas un fil
                  order by ms.created_at desc limit 30
               ) msg
           ), '[]'::json) as messages
      from public.project_assignments a
      join public.projects p on p.id = a.project_id
     where a.member_id = m.id
  ) x;

  return json_build_object(
    'valid', true,
    'member', json_build_object('id', m.id, 'nom', m.nom, 'role', m.role, 'color', m.color),
    'timer', chrono,
    'projects', projets
  );
end $function$;


revoke all on function public.get_member_workspace(text) from public;
grant execute on function public.get_member_workspace(text) to anon, authenticated;
