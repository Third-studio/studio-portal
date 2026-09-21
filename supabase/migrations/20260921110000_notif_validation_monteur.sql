-- 2026-09-21 (bis) — La notification de validation part aussi aux monteurs
-- attribués au projet (project_assignments, fiche non révoquée). Email de la
-- fiche équipe, sinon celui du compte relié. Les admins déjà destinataires sont exclus.

create or replace function public.trg_notify_admin_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p       public.projects;
  societe text;
  espace  text;
  dest    text[];
  mb      record;
begin
  if new.kind <> 'validation' or new.role <> 'client' then return new; end if;

  select * into p from public.projects where id = new.project_id;
  select name into societe from public.client_companies where id = p.company_id;
  if new.link_id is not null then
    select label into espace from public.share_links where id = new.link_id;
  end if;

  select array_agg(email) into dest from public.profiles
   where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
  dest := coalesce(dest, '{}');

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
