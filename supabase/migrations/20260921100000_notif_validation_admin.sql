-- 2026-09-21 — Email à l'équipe (admins actifs) quand un client valide une vidéo,
-- pour déclencher l'envoi des finaux. Branché sur l'insertion du message
-- kind='validation' : couvre link_validate_version (lecteur) et link_post_message.
-- Best effort via call_edge('send-email') : ne bloque jamais la validation.

create or replace function public.trg_notify_admin_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p       public.projects;
  societe text;
  espace  text;
  dest    text[];
begin
  if new.kind <> 'validation' or new.role <> 'client' then return new; end if;

  select * into p from public.projects where id = new.project_id;
  select name into societe from public.client_companies where id = p.company_id;
  if new.link_id is not null then
    select label into espace from public.share_links where id = new.link_id;
  end if;

  select array_agg(email) into dest from public.profiles
   where role = 'admin' and coalesce(is_active, true) and coalesce(email, '') <> '';
  if dest is null then return new; end if;

  begin
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
  exception when others then null; end;

  return new;
end $$;

revoke all on function public.trg_notify_admin_validation() from public, anon, authenticated;

drop trigger if exists trg_messages_notify_validation on public.messages;
create trigger trg_messages_notify_validation
  after insert on public.messages
  for each row when (new.kind = 'validation' and new.role = 'client')
  execute function public.trg_notify_admin_validation();
