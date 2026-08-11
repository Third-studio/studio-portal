-- 2026-08-11 — Notifications WhatsApp (ligne pro via API Cloud Meta)
--
--   1. Idriss est prévenu sur WhatsApp des actions monteur : dépôt de version,
--      changement d'étape, message au client. Destinataire = secret
--      WHATSAPP_ADMIN_TO (pas de numéro en base).
--   2. Le client PEUT choisir de recevoir les infos par WhatsApp en plus de
--      l'email : profiles.notify_whatsapp + whatsapp_number, réglés par le
--      client lui-même (RPC set_my_notifications) ou par l'équipe.
-- Tout passe par call_edge('send-whatsapp', …) : best effort, jamais bloquant,
-- no-op tant que les secrets Meta ne sont pas posés.

-- ── 1. Préférences client ───────────────────────────────────────────────────
alter table public.profiles add column if not exists notify_whatsapp boolean not null default false;
alter table public.profiles add column if not exists whatsapp_number text;

create or replace function public.set_my_notifications(p_number text, p_enabled boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  clean text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'Non connecté');
  end if;
  clean := nullif(regexp_replace(coalesce(p_number, ''), '[^0-9+]', '', 'g'), '');
  if p_enabled and (clean is null or length(clean) < 8) then
    return json_build_object('ok', false, 'error', 'Numéro WhatsApp invalide — format +596…');
  end if;
  update public.profiles
     set whatsapp_number = clean,
         notify_whatsapp = coalesce(p_enabled, false)
   where id = auth.uid();
  return json_build_object('ok', true);
end $$;

revoke all on function public.set_my_notifications(text, boolean) from public, anon;
grant execute on function public.set_my_notifications(text, boolean) to authenticated;

-- ── 2. Helpers d'envoi ──────────────────────────────────────────────────────
create or replace function public.notify_admin_whatsapp(p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.call_edge('send-whatsapp', jsonb_build_object('text', left(p_text, 1200)));
end $$;

create or replace function public.notify_client_whatsapp(p_client uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.profiles;
begin
  if p_client is null then return; end if;
  select * into c from public.profiles where id = p_client;
  if c.id is null or c.notify_whatsapp is not true or coalesce(c.whatsapp_number, '') = '' then
    return;
  end if;
  perform public.call_edge('send-whatsapp',
    jsonb_build_object('to', c.whatsapp_number, 'text', left(p_text, 1200)));
end $$;

revoke all on function public.notify_admin_whatsapp(text) from public, anon, authenticated;
revoke all on function public.notify_client_whatsapp(uuid, text) from public, anon, authenticated;

-- ── 3. Dépôt de version → WhatsApp Idriss ───────────────────────────────────
create or replace function public.member_add_delivery(
  p_token   text,
  p_project bigint,
  p_url     text,
  p_note    text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  m         public.team_members;
  clean_url text;
  ok_link   boolean;
  p_title   text;
begin
  select * into m from public.team_members
   where access_token = p_token and access_revoked_at is null;
  if m.id is null then
    return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué');
  end if;

  if not exists (select 1 from public.project_assignments a
                  where a.member_id = m.id and a.project_id = p_project) then
    return json_build_object('ok', false, 'error', 'Projet non attribué');
  end if;

  clean_url := trim(coalesce(p_url, ''));
  ok_link := clean_url ~* '^https://(www\.)?(youtu\.be|youtube\.com|vimeo\.com|player\.vimeo\.com|dropbox\.com|drive\.google\.com|docs\.google\.com|wetransfer\.com|we\.tl|frame\.io|app\.frame\.io|frameio\.com|notion\.so|1drv\.ms|onedrive\.live\.com)(/|$)';
  if not ok_link then
    return json_build_object('ok', false, 'error', 'Lien non autorisé — Vimeo, YouTube, Drive, Dropbox, WeTransfer ou Frame.io');
  end if;

  insert into public.member_deliveries (project_id, member_id, url, note)
  values (p_project, m.id, left(clean_url, 500), left(nullif(trim(coalesce(p_note, '')), ''), 1000));

  perform public.log_project_event(
    p_project, 'montage',
    m.nom || ' a déposé une version de montage',
    jsonb_build_object('member_id', m.id, 'url', left(clean_url, 500))
  );

  select title into p_title from public.projects where id = p_project;
  perform public.notify_admin_whatsapp(
    '🎬 ' || m.nom || ' a mis une version en ligne sur « ' || coalesce(p_title, '?') || ' »'
    || E'\n' || left(clean_url, 300));

  return json_build_object('ok', true);
end $$;

-- ── 4. Changement d'étape → WhatsApp Idriss ─────────────────────────────────
create or replace function public.member_update_progress(
  p_token    text,
  p_project  bigint,
  p_status   text default null,
  p_progress integer default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  m        public.team_members;
  cur      public.projects;
  v_status text;
  v_prog   integer;
begin
  select * into m from public.team_members
   where access_token = p_token and access_revoked_at is null;
  if m.id is null then
    return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué');
  end if;

  if not exists (select 1 from public.project_assignments a
                  where a.member_id = m.id and a.project_id = p_project) then
    return json_build_object('ok', false, 'error', 'Projet non attribué');
  end if;

  select * into cur from public.projects where id = p_project;
  if cur.id is null then
    return json_build_object('ok', false, 'error', 'Projet introuvable');
  end if;

  v_status := nullif(trim(coalesce(p_status, '')), '');
  if v_status is not null and v_status not in ('brief','storyboard','tournage','montage','livraison') then
    return json_build_object('ok', false, 'error', 'Étape inconnue');
  end if;
  v_prog := greatest(0, least(100, coalesce(p_progress, cur.progress)));

  update public.projects
     set status   = coalesce(v_status, status),
         progress = v_prog
   where id = p_project;

  if v_status is not null and v_status is distinct from cur.status then
    perform public.log_project_event(
      p_project, 'step',
      m.nom || ' a fait passer le projet à « ' || v_status || ' »',
      jsonb_build_object('member_id', m.id, 'from', cur.status, 'to', v_status, 'progress', v_prog)
    );
    -- Étape franchie seulement (pas chaque % d'avancement : spam).
    perform public.notify_admin_whatsapp(
      '📍 « ' || cur.title || ' » → ' || v_status || ' (' || m.nom || ')');
  else
    perform public.log_project_event(
      p_project, 'progress',
      m.nom || ' a mis l''avancement à ' || v_prog || ' %',
      jsonb_build_object('member_id', m.id, 'progress', v_prog)
    );
  end if;

  return json_build_object('ok', true, 'status', coalesce(v_status, cur.status), 'progress', v_prog);
end $$;

-- ── 5. Message monteur → email client (déjà) + WhatsApp client opt-in + Idriss ─
create or replace function public.member_send_message(
  p_token   text,
  p_project bigint,
  p_content text
) returns json language plpgsql security definer set search_path = public as $$
declare
  m        public.team_members;
  clean    text;
  p_title  text;
  c_id     uuid;
  c_email  text;
  c_nom    text;
begin
  select * into m from public.team_members
   where access_token = p_token and access_revoked_at is null;
  if m.id is null then
    return json_build_object('ok', false, 'error', 'Lien invalide ou révoqué');
  end if;
  if not exists (select 1 from public.project_assignments a
                  where a.member_id = m.id and a.project_id = p_project) then
    return json_build_object('ok', false, 'error', 'Projet non attribué');
  end if;

  clean := left(trim(coalesce(p_content, '')), 4000);
  if clean = '' then
    return json_build_object('ok', false, 'error', 'Message vide');
  end if;

  insert into public.messages (project_id, author, content, role)
  values (p_project, m.nom, clean, 'monteur');

  perform public.log_project_event(
    p_project, 'message', m.nom || ' a écrit au client',
    jsonb_build_object('member_id', m.id)
  );

  select p.title, pr.id, pr.email, pr.nom into p_title, c_id, c_email, c_nom
    from public.projects p
    left join public.profiles pr on pr.id = p.client_id
   where p.id = p_project;

  if c_email is not null then
    perform public.call_edge('send-email', jsonb_build_object(
      'to',      c_email,
      'subject', 'Nouveau message sur « ' || coalesce(p_title, 'votre projet') || ' »',
      'kicker',  'Messagerie projet',
      'title',   'Nouveau message de ' || m.nom,
      'text',    'Bonjour ' || coalesce(c_nom, '') || ',' || E'\n\n'
                 || m.nom || ' (montage) vous a écrit sur « ' || coalesce(p_title, 'votre projet') || ' » :'
                 || E'\n\n« ' || left(clean, 300) || case when length(clean) > 300 then '… »' else ' »' end
                 || E'\n\nRépondez depuis votre espace client.',
      'cta',     jsonb_build_object('label', 'Ouvrir mon espace', 'url', 'https://thirdone.studio')
    ));
  end if;

  perform public.notify_client_whatsapp(c_id,
    '💬 ' || m.nom || ' (Third-One Studio) sur « ' || coalesce(p_title, 'votre projet') || ' » : '
    || left(clean, 250) || case when length(clean) > 250 then '…' else '' end);

  perform public.notify_admin_whatsapp(
    '💬 ' || m.nom || ' a écrit au client de « ' || coalesce(p_title, '?') || ' » : '
    || left(clean, 200));

  return json_build_object('ok', true, 'emailed', c_email is not null);
end $$;
