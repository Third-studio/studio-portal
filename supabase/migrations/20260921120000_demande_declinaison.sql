-- 2026-09-21 (ter) — Demande de déclinaison depuis l'espace client.
-- link_post_message accepte p_kind='declinaison' (texte obligatoire) ; le
-- trigger de notification prévient les admins par email.

CREATE OR REPLACE FUNCTION public.link_post_message(p_token text, p_project bigint, p_author text, p_content text, p_kind text DEFAULT 'message'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  l       public.share_links;
  c       public.profiles;
  auteur  text := left(regexp_replace(coalesce(trim(p_author), ''), '\s+', ' ', 'g'), 60);
  texte   text := left(coalesce(trim(p_content), ''), 4000);
  allowed boolean := false;
  m       public.messages;
begin
  if length(auteur) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom (ou un surnom).'); end if;
  if p_kind not in ('message','validation','declinaison') then return json_build_object('ok', false, 'reason', 'Type inconnu'); end if;
  if p_kind in ('message','declinaison') and length(texte) < 1 then return json_build_object('ok', false, 'reason', 'Message vide'); end if;

  select * into l from public.share_links where token = p_token and revoked_at is null;
  if l.id is not null then
    select true into allowed from public.share_link_projects where link_id = l.id and project_id = p_project;
  else
    select * into c from public.profiles where share_token = p_token and role = 'client' and share_revoked_at is null and coalesce(is_active, true);
    if c.id is not null then
      select true into allowed from public.projects where id = p_project and client_id = c.id;
    end if;
  end if;
  if not coalesce(allowed, false) then return json_build_object('ok', false, 'reason', 'Projet non accessible avec ce lien'); end if;

  if p_kind = 'validation' then
    texte := coalesce(nullif(texte, ''), 'Version validée.');
    update public.projects set validated_at = now(), validated_by = auteur where id = p_project;
  end if;

  insert into public.messages (project_id, author, content, role, kind, link_id)
  values (p_project, auteur, texte, 'client', p_kind, l.id)
  returning * into m;

  begin perform public.log_project_event(p_project, case p_kind when 'validation' then 'client_validation' when 'declinaison' then 'client_declinaison' else 'client_message' end, auteur || ' : ' || left(texte, 140)); exception when others then null; end;

  return json_build_object('ok', true, 'message', json_build_object('id', m.id, 'author', m.author, 'content', m.content, 'role', m.role, 'kind', m.kind, 'createdAt', m.created_at));
end $function$;

create or replace function public.trg_notify_admin_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p       public.projects;
  societe text;
  espace  text;
  dest    text[];
  mb      record;
begin
  if new.role <> 'client' or new.kind not in ('validation', 'declinaison') then return new; end if;

  select * into p from public.projects where id = new.project_id;
  select name into societe from public.client_companies where id = p.company_id;
  if new.link_id is not null then
    select label into espace from public.share_links where id = new.link_id;
  end if;

  select array_agg(email) into dest from public.profiles
   where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
  dest := coalesce(dest, '{}');

  -- Demande de déclinaison : alerte admins seulement.
  if new.kind = 'declinaison' then
    if cardinality(dest) > 0 then begin
      perform public.call_edge('send-email', jsonb_build_object(
        'to', to_jsonb(dest),
        'subject', '🎞 Demande de déclinaison : « ' || coalesce(p.title, 'projet') || ' »' ||
                   coalesce(' (' || coalesce(societe, espace) || ')', ''),
        'kicker', 'Demande client',
        'title', coalesce(new.author, 'Le client') || ' demande une déclinaison',
        'text', 'Projet : ' || coalesce(p.title, '?') ||
                coalesce(E'\nClient : ' || coalesce(societe, espace), '') ||
                E'\nDemandé par : ' || coalesce(new.author, '?') ||
                E'\nLe ' || to_char(new.created_at at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') ||
                E'\n\n' || coalesce(new.content, '') ||
                E'\n\nRéponds-lui depuis Studio › Messages (réponse visible sur sa page).',
        'cta', jsonb_build_object('label', 'Répondre', 'url', 'https://www.thirdone.studio/studio/messages')));
    exception when others then null; end; end if;
    return new;
  end if;

  if cardinality(dest) > 0 then begin
    perform public.call_edge('send-email', jsonb_build_object(
      'to', to_jsonb(dest),
      'subject', '✅ Validé : « ' || coalesce(p.title, 'projet') || ' »' ||
                 coalesce(' (' || coalesce(societe, espace) || ')', '') || ' — finaux à envoyer',
      'kicker', 'Validation client',
      'title', coalesce(new.author, 'Le client') || ' a validé la vidéo',
      'text', 'Projet : ' || coalesce(p.title, '?') ||
              coalesce(E'\nClient : ' || coalesce(societe, espace), '') ||
              E'\nValidé par : ' || coalesce(new.author, '?') ||
              E'\n' || coalesce(new.content, '') ||
              E'\nLe ' || to_char(new.created_at at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') ||
              E'\n\n' || case when coalesce(p.final_url, '') = ''
                              then 'Aucun lien des finaux n''est encore posé : tu peux faire l''envoi.'
                              else 'Un lien des finaux est déjà posé, vérifie qu''il pointe bien sur la version validée.' end,
      'cta', jsonb_build_object('label', 'Ouvrir le studio', 'url', 'https://www.thirdone.studio/studio/projets')));
  exception when others then null; end; end if;

  -- Monteurs attribués au projet (fiche active) : un mail chacun, lien vers leur espace.
  for mb in
    select distinct on (lower(coalesce(nullif(tm.email, ''), pr.email)))
           tm.nom, coalesce(nullif(tm.email, ''), pr.email) as email, tm.profile_id, tm.access_token
      from public.project_assignments pa
      join public.team_members tm on tm.id = pa.member_id
      left join public.profiles pr on pr.id = tm.profile_id
     where pa.project_id = new.project_id
       and tm.access_revoked_at is null
       and coalesce(nullif(tm.email, ''), pr.email, '') <> ''
       and not (lower(coalesce(nullif(tm.email, ''), pr.email)) = any (select lower(unnest(dest))))
  loop
    begin
      perform public.call_edge('send-email', jsonb_build_object(
        'to', mb.email,
        'subject', '✅ Le client a validé « ' || coalesce(p.title, 'projet') || ' »',
        'kicker', 'Validation client',
        'title', 'Bravo ' || coalesce(mb.nom, '') || ', la vidéo est validée',
        'text', 'Bonjour ' || coalesce(mb.nom, '') || ',' ||
                E'\n\n' || coalesce(new.author, 'Le client') || ' a validé « ' || coalesce(p.title, 'le projet') || ' »' ||
                coalesce(' (' || coalesce(societe, espace) || ')', '') || '.' ||
                E'\n' || coalesce(new.content, '') ||
                E'\nLe ' || to_char(new.created_at at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') ||
                E'\n\nMerci pour le montage. L''équipe Third One se charge de l''envoi des finaux au client.',
        'cta', jsonb_build_object('label', 'Ouvrir mon espace',
          'url', case when mb.profile_id is not null or mb.access_token is null
                      then 'https://www.thirdone.studio/studio'
                      else 'https://www.thirdone.studio/m/' || mb.access_token end)));
    exception when others then null; end;
  end loop;

  return new;
end $$;

revoke all on function public.trg_notify_admin_validation() from public, anon, authenticated;

drop trigger if exists trg_messages_notify_validation on public.messages;
create trigger trg_messages_notify_validation
  after insert on public.messages
  for each row when (new.kind in ('validation', 'declinaison') and new.role = 'client')
  execute function public.trg_notify_admin_validation();
