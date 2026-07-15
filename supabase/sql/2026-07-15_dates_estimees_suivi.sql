-- 2026-07-15 — Dates estimées par étape sur le suivi public
-- L'admin coche l'avancement (timeline cliquable) et renseigne des dates estimées
-- (brief.stepDates.storyboard / montage) ; le client les voit sous la timeline.

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
