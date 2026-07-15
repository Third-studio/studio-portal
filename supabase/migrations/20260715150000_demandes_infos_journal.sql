-- 2026-07-15 (ter) — Demandes d'informations + dépôt de fichiers + journal
-- 1. Journal des actions par projet (project_events), visible côté prod
-- 2. Bucket privé client-uploads (dépôts des clients via URL signée)
-- 3. brief.infoRequests : demandes de l'équipe, réponses texte + fichiers du client
-- 4. Les RPC publics écrivent aussi au journal

-- ── 1. Journal ───────────────────────────────────────────────────────────────
create table if not exists public.project_events (
  id         bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  at         timestamptz not null default now(),
  kind       text not null,
  label      text not null,
  meta       jsonb not null default '{}'::jsonb
);
create index if not exists project_events_project_idx on public.project_events(project_id, at desc);

alter table public.project_events enable row level security;
drop policy if exists project_events_team on public.project_events;
create policy project_events_team on public.project_events
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

create or replace function public.log_project_event(p_project bigint, p_kind text, p_label text, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_events (project_id, kind, label, meta)
  values (p_project, p_kind, left(p_label, 500), coalesce(p_meta, '{}'::jsonb));
exception when others then null;
end $$;
revoke all on function public.log_project_event(bigint, text, text, jsonb) from public, anon;
grant execute on function public.log_project_event(bigint, text, text, jsonb) to authenticated;

-- ── 2. Bucket privé pour les dépôts clients ─────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-uploads', 'client-uploads', false, 52428800)
on conflict (id) do nothing;

drop policy if exists client_uploads_team_read on storage.objects;
create policy client_uploads_team_read on storage.objects
  for select using ( bucket_id = 'client-uploads' and get_my_role() in ('admin','collaborateur') );

-- ── 3. Réponse du client à une demande d'informations ──────────────────────
create or replace function public.answer_invite_info_request(
  invite_token text,
  project_id   bigint,
  request_id   text,
  answer       text default '',
  files        jsonb default '[]'::jsonb
) returns json language plpgsql security definer set search_path = public as $$
declare
  inv        public.project_invites;
  p          public.projects;
  clean      text;
  reqs       jsonb;
  new_reqs   jsonb := '[]'::jsonb;
  item       jsonb;
  found      boolean := false;
  safe_files jsonb := '[]'::jsonb;
  f          jsonb;
begin
  select * into inv from public.project_invites where token = invite_token;
  if inv.id is null or inv.revoked_at is not null then
    return json_build_object('ok', false, 'error', 'Lien invalide');
  end if;
  select * into p from public.projects
   where id = project_id and invite_id = inv.id for update;
  if p.id is null then
    return json_build_object('ok', false, 'error', 'Projet introuvable');
  end if;

  clean := left(trim(coalesce(answer, '')), 4000);
  if jsonb_typeof(files) <> 'array' or jsonb_array_length(files) > 20 then
    files := '[]'::jsonb;
  end if;
  for f in select * from jsonb_array_elements(files) loop
    safe_files := safe_files || jsonb_build_object(
      'name', left(coalesce(f->>'name',''), 200),
      'path', left(coalesce(f->>'path',''), 300),
      'size', coalesce((f->>'size')::bigint, 0)
    );
  end loop;
  if clean = '' and jsonb_array_length(safe_files) = 0 then
    return json_build_object('ok', false, 'error', 'Réponse vide');
  end if;

  reqs := coalesce(p.brief->'infoRequests', '[]'::jsonb);
  for item in select * from jsonb_array_elements(reqs) loop
    if item->>'id' = request_id and coalesce(item->>'status','open') = 'open' then
      item := item || jsonb_build_object(
        'status', 'done',
        'answer', clean,
        'files', safe_files,
        'answeredAt', now()
      );
      found := true;
    end if;
    new_reqs := new_reqs || item;
  end loop;
  if not found then
    return json_build_object('ok', false, 'error', 'Demande introuvable ou déjà traitée');
  end if;

  update public.projects
     set brief = jsonb_set(coalesce(brief,'{}'::jsonb), '{infoRequests}', new_reqs)
   where id = p.id;

  insert into public.project_events (project_id, kind, label, meta)
  values (p.id, 'info_answer', 'Le client a répondu à une demande d''informations',
          jsonb_build_object('request_id', request_id, 'files', jsonb_array_length(safe_files), 'answer', left(clean, 300)));

  perform public.call_edge('send-email', jsonb_build_object(
    'to', 'idrissduleme@gmail.com',
    'subject', 'Informations recues - ' || p.title,
    'kicker', 'Demande d''informations',
    'title', p.title,
    'text', 'Le client a répondu à votre demande d''informations sur « ' || p.title || ' ».' || chr(10) || chr(10) ||
            case when clean <> '' then 'Réponse : ' || clean || chr(10) || chr(10) else '' end ||
            case when jsonb_array_length(safe_files) > 0 then jsonb_array_length(safe_files) || ' fichier(s) déposé(s).' || chr(10) || chr(10) else '' end ||
            'Ouvrir le back-office : https://www.thirdone.studio',
    'cta', jsonb_build_object('label', 'Ouvrir le back-office', 'url', 'https://www.thirdone.studio')
  ));

  return json_build_object('ok', true);
end $$;

revoke all on function public.answer_invite_info_request(text, bigint, text, text, jsonb) from public;
grant execute on function public.answer_invite_info_request(text, bigint, text, text, jsonb) to anon, authenticated;

-- ── 4. Journal dans les RPC publics existants ───────────────────────────────
-- (on réutilise les corps déjà en place ; seule l'insertion d'événement est ajoutée)

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
   where id = project_id and invite_id = inv.id for update;
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
     set brief = jsonb_set(coalesce(brief, '{}'::jsonb), '{complements}',
       coalesce(brief->'complements', '[]'::jsonb)
         || jsonb_build_object('text', clean, 'at', now(), 'from', 'client'))
   where id = p.id;

  insert into public.project_events (project_id, kind, label, meta)
  values (p.id, 'complement', 'Complément de brief du client', jsonb_build_object('text', left(clean, 300)));

  perform public.call_edge('send-email', jsonb_build_object(
    'to', 'idrissduleme@gmail.com',
    'subject', 'Complement de brief - ' || p.title,
    'kicker', 'Complément de brief',
    'title', p.title,
    'text', 'Le client vient d''ajouter un complément de brief sur « ' || p.title || ' » :' || chr(10) || chr(10) ||
            clean || chr(10) || chr(10) || 'Ouvrir le back-office : https://www.thirdone.studio',
    'cta', jsonb_build_object('label', 'Ouvrir le back-office', 'url', 'https://www.thirdone.studio')
  ));

  return json_build_object('ok', true);
end $$;

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
   where id = project_id and invite_id = inv.id for update;
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

  insert into public.project_events (project_id, kind, label, meta)
  values (p.id, 'video',
          case when action = 'approved' then 'Vidéo validée par le client' else 'Modifications demandées par le client' end,
          jsonb_build_object('comment', left(clean, 300)));

  perform public.call_edge('send-email', jsonb_build_object(
    'to', 'idrissduleme@gmail.com',
    'subject', case when action = 'approved' then 'Video validee - ' else 'Modifs demandees - ' end || p.title,
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

-- ── 5. get_project_invite : expose infoRequests ─────────────────────────────
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
        'complements',    coalesce(p.brief->'complements', '[]'::jsonb),
        'infoRequests',   coalesce(p.brief->'infoRequests', '[]'::jsonb)
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

-- ── 6. La création de projet alimente aussi le journal ──────────────────────
create or replace function public.trg_notify_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_events (project_id, kind, label, meta)
  values (new.id, 'brief',
          'Projet créé' || case when new.invite_id is not null then ' via le lien public' else '' end,
          jsonb_build_object('contact', new.brief->>'contactName', 'societe', new.brief->>'contactCompany'));
  perform public.call_edge('notify-new-project', jsonb_build_object('project_id', new.id));
  return new;
end $$;
