-- 2026-07-13 (quinquies) — Détail projet + complément de brief sur le lien public
-- Depuis la page de suivi, le client peut ouvrir le détail d'un projet, consulter
-- son brief, et ajouter des compléments (notes horodatées dans brief.complements,
-- visibles côté admin). Lien révoqué → refus ; expiré / déjà utilisé → autorisé
-- (cohérent avec le suivi qui reste visible).

-- 1. get_project_invite : les projets portent leur id + le brief consultable
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

-- 2. Complément de brief : note horodatée ajoutée à brief.complements
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
         || jsonb_build_object('text', clean, 'at', now())
     )
   where id = p.id;

  return json_build_object('ok', true);
end $$;

revoke all on function public.add_invite_project_note(text, bigint, text) from public;
grant execute on function public.add_invite_project_note(text, bigint, text) to anon, authenticated;
