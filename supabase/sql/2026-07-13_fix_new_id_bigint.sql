-- 2026-07-13 (ter) — Correctif : projects.id est un bigint (séquence), pas un uuid.
-- La variable new_id était déclarée uuid → le RETURNING id échouait à chaque envoi
-- du formulaire public (« Erreur serveur »). Seul le type de new_id change.


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

  -- Client déjà connu par email → rattachement direct
  if clean_email is not null then
    select id into existing_client from public.profiles
     where lower(email) = clean_email limit 1;
  end if;

  -- Mêmes clés que le brief client normal (submitted:true = brief complet envoyé)
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
  -- Pas de compte → rattachement différé via claim_pending_projects()
  if existing_client is null and clean_email is not null then
    new_brief := new_brief || jsonb_build_object(
      'pendingClientEmail', clean_email,
      'pendingClientName', full_name,
      'pendingClientCompany', societe
    );
  end if;

  shoot := case when brief->>'shootDate' ~ '^\d{4}-\d{2}-\d{2}$'
                then (brief->>'shootDate')::date else null end;

  insert into public.projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note)
  values (
    left(coalesce(nullif(trim(brief->>'title'), ''), 'Projet — ' || societe), 200),
    existing_client, 'brief', 0, new_brief, '', null, shoot, null
  ) returning id into new_id;

  update public.project_invites
     set uses = uses + 1, last_used_at = now()
   where id = inv.id;

  return json_build_object('ok', true, 'project_id', new_id);
end $$;

revoke all on function public.create_project_from_invite(text, jsonb, jsonb) from public;
grant execute on function public.create_project_from_invite(text, jsonb, jsonb) to anon, authenticated;
