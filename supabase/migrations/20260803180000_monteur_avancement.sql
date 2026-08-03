-- 2026-08-03 — Le monteur met à jour l'avancement de ses projets depuis son espace.
-- Même garde que member_add_delivery : jeton valide + projet réellement attribué.
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
  else
    perform public.log_project_event(
      p_project, 'progress',
      m.nom || ' a mis l''avancement à ' || v_prog || ' %',
      jsonb_build_object('member_id', m.id, 'progress', v_prog)
    );
  end if;

  return json_build_object('ok', true, 'status', coalesce(v_status, cur.status), 'progress', v_prog);
end $$;

revoke all on function public.member_update_progress(text, bigint, text, integer) from public;
grant execute on function public.member_update_progress(text, bigint, text, integer) to anon, authenticated;
