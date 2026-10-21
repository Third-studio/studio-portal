-- 2026-10-21 — Correctif de register_client_space : la variable « slug » entrait en conflit avec la colonne
-- share_links.slug (42702 ambiguous) dès la recherche d'un identifiant libre. Variables préfixées v_.

create or replace function public.register_client_space(p_company text, p_contact text, p_email text, p_password text, p_website text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  signup_quota constant integer := 2;     -- créations d'essai par mois ; l'équipe ajuste ensuite
  v_company text := left(btrim(coalesce(p_company, '')), 80);
  v_contact text := left(btrim(coalesce(p_contact, '')), 60);
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_base    text;
  v_slug    text;
  n         integer := 0;
  cid       uuid;
  l         public.share_links;
  dest      text[];
begin
  perform pg_sleep(0.4);
  if coalesce(p_website, '') <> '' then return json_build_object('ok', false, 'reason', 'Inscription impossible.'); end if;
  if length(v_company) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez le nom de votre société ou de votre projet.'); end if;
  if length(v_contact) < 2 then return json_build_object('ok', false, 'reason', 'Indiquez votre nom.'); end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'reason', 'Adresse email invalide.'); end if;
  if length(coalesce(p_password, '')) < 6 then return json_build_object('ok', false, 'reason', 'Mot de passe : 6 caractères minimum.'); end if;
  if (select count(*) from public.share_links s where s.signup_at > now() - interval '1 hour') >= 10 then
    return json_build_object('ok', false, 'reason', 'Trop d''inscriptions en ce moment, réessayez dans une heure.');
  end if;
  if exists (select 1 from public.share_links s where lower(s.contact_email) = v_email and s.revoked_at is null) then
    return json_build_object('ok', false, 'reason', 'Un espace existe déjà avec cette adresse. Ouvrez-le avec son nom et votre mot de passe, ou écrivez à contact@thirdone.studio.');
  end if;

  -- Identifiant d'espace dérivé du nom de société, suffixé s'il est pris.
  v_base := coalesce(nullif(public.normalize_slug(v_company), ''), 'espace');
  if length(v_base) < 2 then v_base := v_base || '-1'; end if;
  v_slug := v_base;
  while exists (select 1 from public.share_links s where lower(s.slug) = v_slug) loop
    n := n + 1;
    if n > 20 then v_slug := left(v_base, 30) || '-' || substr(md5(random()::text), 1, 6); exit; end if;
    v_slug := left(v_base, 36) || '-' || n;
  end loop;

  insert into public.client_companies (name, contacts, notes)
    values (v_company, jsonb_build_array(jsonb_build_object('nom', v_contact, 'role', 'Contact', 'email', v_email, 'tel', '')),
            'Inscription en ligne le ' || to_char(now() at time zone 'America/Martinique', 'DD/MM/YYYY à HH24:MI') || ' (Studio IA).')
    returning id into cid;

  insert into public.share_links (label, slug, password_hash, company_id, note, creation_enabled, creation_quota, contact_email, signup_at)
    values (v_company, v_slug, crypt(p_password, gen_salt('bf', 10)), cid, 'Espace créé en ligne par ' || v_contact || ' (' || v_email || ').',
            true, signup_quota, v_email, now())
    returning * into l;

  -- Bienvenue au client (best effort) : identifiant + lien, pour qu'il retrouve son espace.
  begin
    perform public.call_edge('send-email', jsonb_build_object(
      'to', to_jsonb(array[v_email]), 'link_id', l.id, 'kind', 'inscription',
      'subject', 'Votre espace Third One Studio est prêt',
      'kicker', 'Espace client', 'title', 'Bienvenue ' || v_contact,
      'text', 'Votre espace « ' || v_company || ' » est créé.' ||
              E'\n\nPour l''ouvrir : thirdone.studio/client' ||
              E'\nIdentifiant : ' || l.slug ||
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
        'subject', '🆕 Nouvel espace client créé en ligne : « ' || v_company || ' »',
        'kicker', 'Inscription', 'title', v_contact || ' vient de créer un espace',
        'text', 'Société : ' || v_company || E'\nContact : ' || v_contact || ' · ' || v_email ||
                E'\nIdentifiant : ' || l.slug || E'\nStudio IA activé, ' || signup_quota || ' créations par mois.' ||
                E'\n\nÀ ajuster si besoin dans Studio › Espaces clients.',
        'cta', jsonb_build_object('label', 'Ouvrir le studio', 'url', 'https://www.thirdone.studio/studio/liens')));
    exception when others then null; end;
  end if;

  return json_build_object('ok', true, 'token', l.token, 'slug', l.slug, 'label', v_company);
end $$;
