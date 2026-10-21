-- 2026-10-21 — Inscription en ligne : un client crée lui-même son espace (nom de société + contact + email + mot de passe)
-- pour utiliser le Studio IA sans passer par l'équipe. L'espace est un share_links ordinaire (slug + mot de passe),
-- rattaché à une société créée à la volée, avec le Studio IA activé et un quota d'essai. L'équipe est prévenue par
-- email et peut tout régler ensuite dans Studio › Espaces clients (quota, révocation, projets).
-- Avec l'email du contact connu, le client est aussi prévenu quand son animation est prête.

alter table public.share_links
  add column if not exists contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists signup_at     timestamptz;

create or replace function public.register_client_space(p_company text, p_contact text, p_email text, p_password text, p_website text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  signup_quota constant integer := 2;     -- créations d'essai par mois ; l'équipe ajuste ensuite
  company text := left(btrim(coalesce(p_company, '')), 80);
  contact text := left(btrim(coalesce(p_contact, '')), 60);
  email   text := lower(btrim(coalesce(p_email, '')));
  base    text;
  slug    text;
  n       integer := 0;
  cid     uuid;
  l       public.share_links;
  dest    text[];
begin
  perform pg_sleep(0.4);
  if coalesce(p_website, '') <> '' then return json_build_object('ok', false, 'reason', 'Inscription impossible.'); end if;
  if length(company) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez le nom de votre société ou de votre projet.'); end if;
  if length(contact) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom.'); end if;
  if email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'reason', 'Adresse email invalide.'); end if;
  if length(coalesce(p_password, '')) < 6 then return json_build_object('ok', false, 'reason', 'Mot de passe : 6 caractères minimum.'); end if;
  if (select count(*) from public.share_links where signup_at > now() - interval '1 hour') >= 10 then
    return json_build_object('ok', false, 'reason', 'Trop d''inscriptions en ce moment, réessayez dans une heure.');
  end if;
  if exists (select 1 from public.share_links where lower(contact_email) = email and revoked_at is null) then
    return json_build_object('ok', false, 'reason', 'Un espace existe déjà avec cette adresse. Ouvrez-le avec son nom et votre mot de passe, ou écrivez à contact@thirdone.studio.');
  end if;

  -- Identifiant d'espace dérivé du nom de société, suffixé s'il est pris.
  base := coalesce(nullif(public.normalize_slug(company), ''), 'espace');
  if length(base) < 2 then base := base || '-1'; end if;
  slug := base;
  while exists (select 1 from public.share_links where lower(slug) = slug) loop
    n := n + 1;
    if n > 20 then slug := left(base, 30) || '-' || substr(md5(random()::text), 1, 6); exit; end if;
    slug := left(base, 36) || '-' || n;
  end loop;

  insert into public.client_companies (name, contacts, notes)
    values (company, jsonb_build_array(jsonb_build_object('nom', contact, 'role', 'Contact', 'email', email, 'tel', '')),
            'Inscription en ligne le ' || to_char(now() at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') || ' (Studio IA).')
    returning id into cid;

  insert into public.share_links (label, slug, password_hash, company_id, note, creation_enabled, creation_quota, contact_email, signup_at)
    values (company, slug, crypt(p_password, gen_salt('bf', 10)), cid, 'Espace créé en ligne par ' || contact || ' (' || email || ').',
            true, signup_quota, email, now())
    returning * into l;

  -- Bienvenue au client (best effort) : identifiant + lien, pour qu'il retrouve son espace.
  begin
    perform public.call_edge('send-email', jsonb_build_object(
      'to', to_jsonb(array[email]), 'link_id', l.id, 'kind', 'inscription',
      'subject', 'Votre espace Third One Studio est prêt',
      'kicker', 'Espace client', 'title', 'Bienvenue ' || contact,
      'text', 'Votre espace « ' || company || ' » est créé.' ||
              E'\n\nPour l''ouvrir : thirdone.studio/client' ||
              E'\nIdentifiant : ' || slug ||
              E'\nMot de passe : celui que vous venez de choisir.' ||
              E'\n\nVous pouvez y créer ' || signup_quota || ' animations par mois avec le Studio IA, les relire image par image et échanger avec l''équipe. Pour une production complète, un devis ou plus de créations, répondez à cet email.',
      'cta', jsonb_build_object('label', 'Ouvrir mon espace', 'url', 'https://www.thirdone.studio/p/' || l.token)));
  exception when others then null; end;

  -- L'équipe (admins actifs) est prévenue.
  select array_agg(p.email) into dest from public.profiles p
   where p.role = 'admin' and coalesce(p.is_active, true) and coalesce(p.email, '') <> '';
  if dest is not null then
    begin
      perform public.call_edge('send-email', jsonb_build_object(
        'to', to_jsonb(dest),
        'subject', '🆕 Nouvel espace client créé en ligne : « ' || company || ' »',
        'kicker', 'Inscription', 'title', contact || ' vient de créer un espace',
        'text', 'Société : ' || company || E'\nContact : ' || contact || ' · ' || email ||
                E'\nIdentifiant : ' || slug || E'\nStudio IA activé, ' || signup_quota || ' créations par mois.' ||
                E'\n\nÀ ajuster si besoin dans Studio › Espaces clients.',
        'cta', jsonb_build_object('label', 'Ouvrir le studio', 'url', 'https://www.thirdone.studio/studio/liens')));
    exception when others then null; end;
  end if;

  return json_build_object('ok', true, 'token', l.token, 'slug', slug, 'label', company);
end $$;
revoke all on function public.register_client_space(text, text, text, text, text) from public;
grant execute on function public.register_client_space(text, text, text, text, text) to anon, authenticated;

-- worker_finish : même corps qu'en 20261021100000, plus l'email au client quand l'espace a une adresse de contact.
create or replace function public.worker_finish(p_secret text, p_job uuid, p_video_url text default null, p_duration numeric default null,
                                                p_fps numeric default 25, p_error text default null, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  j   public.creation_jobs;
  l   public.share_links;
  vid uuid;
begin
  if not public.worker_check(p_secret) then return json_build_object('ok', false, 'reason', 'secret'); end if;
  select * into j from public.creation_jobs where id = p_job and status = 'en_cours';
  if j.id is null then return json_build_object('ok', false, 'reason', 'job'); end if;

  if p_error is not null or coalesce(p_video_url, '') = '' then
    update public.creation_jobs set status = 'echec', error = left(coalesce(p_error, 'Aucune vidéo produite.'), 2000),
           worker_note = left(p_note, 300), finished_at = now() where id = j.id;
  else
    if p_video_url !~* '^https://(www\.)?thirdone\.studio/media/' then return json_build_object('ok', false, 'reason', 'url'); end if;
    if j.project_id is null then return json_build_object('ok', false, 'reason', 'project'); end if;
    insert into public.project_versions (project_id, label, video_url, fps, duration_s, note, status, visible_client, created_by)
      values (j.project_id, left('Studio IA · ' || j.title, 120), p_video_url, coalesce(p_fps, 25), p_duration,
              'Créée depuis l''espace client par ' || j.author || E'.\nBrief : ' || left(j.prompt, 600),
              'a_valider', true, 'Studio IA')
      returning id into vid;
    update public.creation_jobs set status = 'publie', version_id = vid, worker_note = left(p_note, 300), finished_at = now() where id = j.id;
    update public.projects set progress = greatest(coalesce(progress, 0), 60) where id = j.project_id;
    begin
      insert into public.messages (project_id, author, content, role, kind, link_id, visibility)
        values (j.project_id, 'Studio IA',
                'Votre animation « ' || j.title || ' » est prête. Regardez-la, commentez-la image par image et validez-la, ou décrivez une nouvelle version.',
                'studio', 'message', j.link_id, 'client');
    exception when others then null; end;

    select * into l from public.share_links where id = j.link_id;
    if l.contact_email is not null and l.revoked_at is null then
      begin
        perform public.call_edge('send-email', jsonb_build_object(
          'to', to_jsonb(array[l.contact_email]), 'link_id', l.id, 'project_id', j.project_id, 'kind', 'creation_prete',
          'subject', '🎬 Votre animation « ' || j.title || ' » est prête',
          'kicker', 'Studio IA', 'title', 'Votre animation est en ligne',
          'text', 'Demandée par ' || j.author || ', votre animation « ' || j.title || ' » (' || j.format || ', ' || j.duration_s || ' s) est prête à être regardée.' ||
                  E'\n\nOuvrez-la pour la commenter image par image, la valider, ou décrire une nouvelle version.',
          'cta', jsonb_build_object('label', 'Regarder l''animation', 'url', 'https://www.thirdone.studio/p/' || l.token || '/v/' || vid)));
      exception when others then null; end;
    end if;
  end if;

  update public.worker_state set current_job = null, heartbeat_at = now(), updated_at = now() where id = 1;
  return json_build_object('ok', true, 'versionId', vid);
end $$;
