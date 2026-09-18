-- 2026-09-17 — auth_mail_try_log : limitation de débit atomique pour la fonction Edge auth-mail.
-- Remplace le couple « compter (2 SELECT) puis insérer » fait en deux requêtes PostgREST sans
-- verrou : N requêtes parallèles sur le même email passaient toutes le comptage à 0 et
-- déclenchaient N envois. Ici, dans UNE transaction : verrou consultatif, purge des lignes de
-- plus de 7 jours (données personnelles : email + IP ; pg_cron n'est PAS installé sur le projet,
-- la purge planifiée de 20260917230000 est donc sans effet), comptage, insertion.
-- Limites : p_max_email par email et par heure, p_max_ip par IP et par heure ; si l'IP est
-- indéterminable ('inconnue' ou vide), plafond global p_max_global par heure toutes IP confondues
-- (au lieu de désactiver la limite).
-- Retour : {ok:true, id} si la tentative est acceptée (ligne insérée), sinon
--          {ok:false, reason:'email'|'ip'|'global'}.
-- Exécutable par le service role uniquement (révoquée pour public, anon, authenticated).
create index if not exists auth_mail_log_created_idx on public.auth_mail_log (created_at);

create or replace function public.auth_mail_try_log(
  p_email      text,
  p_ip         text,
  p_action     text,
  p_max_email  int default 3,
  p_max_ip     int default 20,
  p_max_global int default 60
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  since    timestamptz := now() - interval '1 hour';
  n        int;
  new_id   bigint;
  ip_known boolean := p_ip is not null and p_ip <> '' and p_ip <> 'inconnue';
begin
  -- Sérialise les tentatives (volume : quelques envois par jour) : comptage et insertion ne
  -- peuvent plus se croiser entre deux requêtes concurrentes.
  perform pg_advisory_xact_lock(hashtext('auth_mail_log'));

  delete from public.auth_mail_log where created_at < now() - interval '7 days';

  select count(*) into n from public.auth_mail_log where email = p_email and created_at >= since;
  if n >= p_max_email then
    return jsonb_build_object('ok', false, 'reason', 'email');
  end if;

  if ip_known then
    select count(*) into n from public.auth_mail_log where ip = p_ip and created_at >= since;
    if n >= p_max_ip then
      return jsonb_build_object('ok', false, 'reason', 'ip');
    end if;
  else
    select count(*) into n from public.auth_mail_log where created_at >= since;
    if n >= p_max_global then
      return jsonb_build_object('ok', false, 'reason', 'global');
    end if;
  end if;

  insert into public.auth_mail_log (email, ip, action)
  values (p_email, p_ip, p_action)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

comment on function public.auth_mail_try_log(text, text, text, int, int, int)
  is 'auth-mail : verrou + purge 7 jours + comptage + insertion dans auth_mail_log en une transaction. Service role uniquement.';

revoke all on function public.auth_mail_try_log(text, text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.auth_mail_try_log(text, text, text, int, int, int) to service_role;
