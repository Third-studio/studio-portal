-- 2026-07-15 — Fluidifier l'échange client sur le lien public
-- 1. call_edge : appel HTTP non bloquant vers les Edge Functions (secret via Vault)
-- 2. Trigger : notif interne à chaque nouveau projet (remplace les appels front)
-- 3. Accusé de réception email après envoi du brief public
-- 4. Complément de brief : fil bidirectionnel (from client/team) + notif interne
-- 5. Validation vidéo depuis le lien public (approved / revision) + notif interne
-- ⚠ Prérequis (hors git, une seule fois) :
--   select vault.create_secret('<SECRET>', 'cron_shared_secret');
--   supabase secrets set CRON_SHARED_SECRET=<SECRET>

-- ── 1. call_edge ─────────────────────────────────────────────────────────────
create extension if not exists pg_net;

create or replace function public.call_edge(fn_name text, payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'cron_shared_secret' limit 1;
  if v_key is null then return; end if;   -- secret absent → no-op silencieux
  perform net.http_post(
    url     := 'https://ytmflrwfapxaeryehgal.supabase.co/functions/v1/' || fn_name,
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key', v_key),
    body    := payload
  );
exception when others then
  null;  -- un email raté ne doit JAMAIS bloquer l'écriture appelante
end $$;

revoke all on function public.call_edge(text, jsonb) from public, anon, authenticated;

-- ── 2. Notif interne à chaque nouveau projet ────────────────────────────────
create or replace function public.trg_notify_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.call_edge('notify-new-project', jsonb_build_object('project_id', new.id));
  return new;
end $$;

drop trigger if exists trg_projects_notify_new on public.projects;
create trigger trg_projects_notify_new
  after insert on public.projects
  for each row execute function public.trg_notify_new_project();

-- ── 3. Accusé de réception après le brief public ────────────────────────────
create or replace function public.create_project_from_invite(
  invite_token text,
  contact      jsonb,
  brief        jsonb default '{}'::jsonb
) returns json language plpgsql security definer set search_path = public as $$
declare
  inv             public.project_invites;
  existing_client uuid;
  prenom          text;
  nom             text;
  societe         text;
  clean_email     text;
  full_name       text;
  new_brief       jsonb;
  shoot           date;
  new_id          bigint;
  new_title       text;
  suivi_url       text;
begin
  select * into inv from public.project_invites where token = invite_token for update;
  if inv.id is null or inv.revoked_at is not null
     or (inv.expires_at is not null and inv.expires_at < now())
     or (inv.single_use and inv.uses > 0) then
    return json_build_object('ok', false, 'error', 'Lien invalide, expiré ou déjà utilisé');
  end if;

  if pg_column_size(brief) > 60000 or pg_column_size(contact) > 4000 then
    return json_build_object('ok', false, 'error', 'Contenu trop volumineux');
  end if;

  prenom      := left(trim(coalesce(contact->>'prenom', '')), 80);
  nom         := left(trim(coalesce(contact->>'nom', '')), 80);
  societe     := left(trim(coalesce(contact->>'societe', '')), 120);
  clean_email := nullif(lower(trim(coalesce(contact->>'email', ''))), '');

  if prenom = '' or nom = '' or societe = '' then
    return json_build_object('ok', false, 'error', 'Prénom, nom et société sont requis');
  end if;
  if coalesce(trim(brief->>'objective'), '') = '' or coalesce(trim(brief->>'target'), '') = '' then
    return json_build_object('ok', false, 'error', 'Le message principal et le public cible sont requis');
  end if;

  full_name := prenom || ' ' || nom;

  if clean_email is not null then
    select id into existing_client from public.profiles
     where lower(email) = clean_email limit 1;
  end if;

  new_brief := jsonb_build_object(
    'objective',      left(coalesce(brief->>'objective', ''), 4000),
    'target',         left(coalesce(brief->>'target', ''), 1000),
    'duration',       left(coalesce(brief->>'duration', ''), 200),
    'tone',           left(coalesce(brief->>'tone', ''), 500),
    'deliverables',   left(coalesce(brief->>'deliverables', ''), 1000),
    'budget',         left(coalesce(brief->>'budget', ''), 200),
    'deliveryWished', left(coalesce(brief->>'deliveryWished', ''), 40),
    'references',     left(coalesce(brief->>'references', ''), 4000),
    'notes',          left(coalesce(brief->>'notes', ''), 4000),
    'services',       coalesce(brief->'services', '[]'::jsonb),
    'musique',        coalesce(brief->'musique', '{}'::jsonb),
    'charteAssets',   coalesce(brief->'charteAssets', '{}'::jsonb),
    'draft', false, 'submitted', true, 'source', 'lien',
    'contactName', full_name,
    'contactCompany', societe,
    'inviteLabel', coalesce(inv.label, '')
  );
  if existing_client is null and clean_email is not null then
    new_brief := new_brief || jsonb_build_object(
      'pendingClientEmail', clean_email,
      'pendingClientName', full_name,
      'pendingClientCompany', societe
    );
  end if;

  shoot := case when brief->>'shootDate' ~ '^\d{4}-\d{2}-\d{2}$'
                then (brief->>'shootDate')::date else null end;

  new_title := left(coalesce(nullif(trim(brief->>'title'), ''), 'Projet — ' || societe), 200);

  insert into public.projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note, invite_id)
  values (new_title, existing_client, 'brief', 0, new_brief, '', null, shoot, null, inv.id)
  returning id into new_id;

  update public.project_invites
     set uses = uses + 1, last_used_at = now()
   where id = inv.id;

  -- Accusé de réception (si email fourni)
  if clean_email is not null then
    suivi_url := 'https://www.thirdone.studio/?nouveau=' || inv.token;
    perform public.call_edge('send-email', jsonb_build_object(
      'to', clean_email,
      'subject', 'Brief bien reçu — ' || new_title,
      'kicker', 'Confirmation',
      'title', 'Votre brief est bien reçu ✓',
      'text', 'Bonjour ' || prenom || ',' || chr(10) || chr(10) ||
              'Votre brief pour « ' || new_title || ' » a bien été transmis à l''équipe Third-One Studio. Nous revenons vers vous sous 48 h ouvrées.' || chr(10) || chr(10) ||
              'Suivez l''avancement de votre projet à tout moment : ' || suivi_url || chr(10) || chr(10) ||
              '— Third-One Studio',
      'cta', jsonb_build_object('label', 'Suivre mon projet', 'url', suivi_url)
    ));
  end if;

  return json_build_object('ok', true, 'project_id', new_id);
end $$;

revoke all on function public.create_project_from_invite(text, jsonb, jsonb) from public;
grant execute on function public.create_project_from_invite(text, jsonb, jsonb) to anon, authenticated;

-- ── 4. Complément de brief : auteur + notif interne ─────────────────────────
create or replace function public.add_invite_project_note(
  invite_token text,
  project_id   bigint,
  note         text
) returns json language plpgsql security definer set search_path = public as $$
declare
  inv   public.project_invites;
  p     public.projects;
  clean text;
begin
  select * into inv from public.project_invites where token = invite_token;
  if inv.id is null or inv.revoked_at is not null then
    return json_build_object('ok', false, 'error', 'Lien invalide');
  end if;

  select * into p from public.projects
   where id = project_id and invite_id = inv.id
     for update;
  if p.id is null then
    return json_build_object('ok', false, 'error', 'Projet introuvable');
  end if;

  clean := left(trim(coalesce(note, '')), 2000);
  if clean = '' then
    return json_build_object('ok', false, 'error', 'Le complément est vide');
  end if;
  if jsonb_array_length(coalesce(p.brief->'complements', '[]'::jsonb)) >= 50 then
    return json_build_object('ok', false, 'error', 'Limite de compléments atteinte — contactez l''équipe');
  end if;

  update public.projects
     set brief = jsonb_set(
       coalesce(brief, '{}'::jsonb),
       '{complements}',
       coalesce(brief->'complements', '[]'::jsonb)
         || jsonb_build_object('text', clean, 'at', now(), 'from', 'client')
     )
   where id = p.id;

  perform public.call_edge('send-email', jsonb_build_object(
    'to', 'idrissduleme@gmail.com',
    'subject', '✏️ Complément de brief — ' || p.title,
    'kicker', 'Complément de brief',
    'title', p.title,
    'text', 'Le client vient d''ajouter un complément de brief sur « ' || p.title || ' » :' || chr(10) || chr(10) ||
            clean || chr(10) || chr(10) ||
            'Ouvrir le back-office : https://www.thirdone.studio',
    'cta', jsonb_build_object('label', 'Ouvrir le back-office', 'url', 'https://www.thirdone.studio')
  ));

  return json_build_object('ok', true);
end $$;

revoke all on function public.add_invite_project_note(text, bigint, text) from public;
grant execute on function public.add_invite_project_note(text, bigint, text) to anon, authenticated;

-- ── 5. Validation vidéo depuis le lien public ───────────────────────────────
create or replace function public.set_invite_video_status(
  invite_token text,
  project_id   bigint,
  action       text,
  comment      text default ''
) returns json language plpgsql security definer set search_path = public as $$
declare
  inv   public.project_invites;
  p     public.projects;
  clean text;
begin
  if action not in ('approved', 'revision') then
    return json_build_object('ok', false, 'error', 'Action inconnue');
  end if;

  select * into inv from public.project_invites where token = invite_token;
  if inv.id is null or inv.revoked_at is not null then
    return json_build_object('ok', false, 'error', 'Lien invalide');
  end if;

  select * into p from public.projects
   where id = project_id and invite_id = inv.id
     for update;
  if p.id is null then
    return json_build_object('ok', false, 'error', 'Projet introuvable');
  end if;
  if coalesce(p.replay_url, '') = '' then
    return json_build_object('ok', false, 'error', 'Aucune vidéo à valider');
  end if;

  clean := left(trim(coalesce(comment, '')), 2000);
  if action = 'revision' and clean = '' then
    return json_build_object('ok', false, 'error', 'Précisez les modifications souhaitées');
  end if;

  update public.projects
     set brief = coalesce(brief, '{}'::jsonb)
              || jsonb_build_object('videoStatus', action, 'videoComment', clean)
   where id = p.id;

  perform public.call_edge('send-email', jsonb_build_object(
    'to', 'idrissduleme@gmail.com',
    'subject', case when action = 'approved' then '✅ Vidéo validée — ' else '↩ Modifs demandées — ' end || p.title,
    'kicker', 'Validation vidéo',
    'title', p.title,
    'text', case when action = 'approved'
                 then 'Le client a validé la vidéo de « ' || p.title || ' » 🎉'
                 else 'Le client demande des modifications sur « ' || p.title || ' » :' || chr(10) || chr(10) || clean
            end || chr(10) || chr(10) || 'Ouvrir le back-office : https://www.thirdone.studio',
    'cta', jsonb_build_object('label', 'Ouvrir le back-office', 'url', 'https://www.thirdone.studio')
  ));

  return json_build_object('ok', true, 'videoStatus', action);
end $$;

revoke all on function public.set_invite_video_status(text, bigint, text, text) from public;
grant execute on function public.set_invite_video_status(text, bigint, text, text) to anon, authenticated;

-- ── 6. get_project_invite : expose videoStatus / videoComment ───────────────
create or replace function public.get_project_invite(invite_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv     public.project_invites;
  bad     text;
  projets json;
begin
  select * into inv from public.project_invites where token = invite_token;
  if inv.id is null then
    return json_build_object('valid', false, 'reason', 'Lien introuvable');
  end if;
  if inv.revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'Lien révoqué');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    bad := 'Lien expiré';
  elsif inv.single_use and inv.uses > 0 then
    bad := 'Lien déjà utilisé';
  end if;

  select coalesce(json_agg(json_build_object(
      'id',           p.id,
      'title',        p.title,
      'status',       p.status,
      'progress',     p.progress,
      'statusNote',   p.status_note,
      'shootDate',    p.shoot_date,
      'deliveryDate', p.delivery_date,
      'replayUrl',    p.replay_url,
      'createdAt',    p.created_at,
      'videoStatus',  p.brief->>'videoStatus',
      'videoComment', p.brief->>'videoComment',
      'brief', jsonb_build_object(
        'objective',      p.brief->>'objective',
        'target',         p.brief->>'target',
        'duration',       p.brief->>'duration',
        'tone',           p.brief->>'tone',
        'deliverables',   p.brief->>'deliverables',
        'budget',         p.brief->>'budget',
        'deliveryWished', p.brief->>'deliveryWished',
        'references',     p.brief->>'references',
        'notes',          p.brief->>'notes',
        'musique',        coalesce(p.brief->'musique', '{}'::jsonb),
        'charteAssets',   coalesce(p.brief->'charteAssets', '{}'::jsonb),
        'stepDates',      coalesce(p.brief->'stepDates', '{}'::jsonb),
        'complements',    coalesce(p.brief->'complements', '[]'::jsonb)
      )
    ) order by p.created_at desc), '[]'::json)
    into projets
    from public.projects p
   where p.invite_id = inv.id;

  if bad is not null then
    return json_build_object('valid', false, 'reason', bad, 'label', inv.label, 'projets', projets);
  end if;
  return json_build_object(
    'valid', true,
    'label', inv.label,
    'projets', projets,
    'services', coalesce((
      select json_agg(json_build_object('id', id, 'label', label, 'icone', icone) order by label)
      from public.service_types where actif is not false
    ), '[]'::json)
  );
end $$;

grant execute on function public.get_project_invite(text) to anon, authenticated;
