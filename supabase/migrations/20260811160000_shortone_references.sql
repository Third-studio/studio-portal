-- 2026-08-11 — Shortone : bibliothèque de références + analyse des vidéos clients
--
-- Deux briques :
--   1. `shortone_references` — des reels de référence analysés (rythme, hook,
--      actes, palette, shotlist reconstituée). Alimentée hors ligne par
--      video-tools/shortone_analyze.py puis push_references.py : l'analyse
--      vidéo (ffmpeg/OpenCV/librosa) ne peut pas tourner dans une edge function.
--   2. `shortone_analyses` — la vidéo d'un client comparée à une référence.
--      Le client dépose, un worker local analyse et écrit le résultat.

-- ── 1. Bibliothèque de références ───────────────────────────────────────────
create table if not exists public.shortone_references (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null,
  source       text,                       -- compte / marque d'origine
  url          text,
  niche        text,                       -- Motion design, Fitness, Business…
  plateforme   text,                       -- TikTok, Instagram, YouTube…
  duree_s      numeric,
  format       text,                       -- 9:16, 1:1, 16:9
  asl_s        numeric,                    -- durée moyenne d'un plan
  cpm          numeric,                    -- coupes par minute
  nb_plans     integer,
  style_deduit text,
  fiche        jsonb not null default '{}'::jsonb,  -- l'analyse complète
  planche_url  text,                       -- planche contact
  notes        text,                       -- lecture éditoriale (rédigée)
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists shortone_references_niche_idx on public.shortone_references(niche, created_at desc);

alter table public.shortone_references enable row level security;

-- Lecture : équipe, + tout client dont l'accès Shortone est ouvert.
drop policy if exists shortone_refs_read on public.shortone_references;
create policy shortone_refs_read on public.shortone_references
  for select using (
    actif
    and (
      get_my_role() in ('admin', 'collaborateur')
      or exists (
        select 1 from public.profiles p
         where p.id = auth.uid()
           and p.shortone_enabled is true
           and p.is_active is not false
      )
    )
  );

-- Écriture : équipe uniquement.
drop policy if exists shortone_refs_write on public.shortone_references;
create policy shortone_refs_write on public.shortone_references
  for all using ( get_my_role() in ('admin', 'collaborateur') )
       with check ( get_my_role() in ('admin', 'collaborateur') );

-- ── 2. Analyses des vidéos clients ──────────────────────────────────────────
create table if not exists public.shortone_analyses (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.profiles(id) on delete cascade,
  project_id    bigint references public.projects(id) on delete set null,
  reference_id  uuid references public.shortone_references(id) on delete set null,
  titre         text,
  fichier_path  text,                      -- chemin dans le bucket shortone-uploads
  statut        text not null default 'en_attente',  -- en_attente|en_cours|termine|erreur
  fiche         jsonb,                     -- analyse de la vidéo du client
  comparaison   jsonb,                     -- écarts vs la référence + recommandations
  message       text,                      -- erreur éventuelle, lisible par le client
  created_at    timestamptz not null default now(),
  analyse_at    timestamptz
);
create index if not exists shortone_analyses_client_idx on public.shortone_analyses(client_id, created_at desc);
create index if not exists shortone_analyses_statut_idx on public.shortone_analyses(statut) where statut = 'en_attente';

alter table public.shortone_analyses enable row level security;

-- Le client voit et crée ses propres analyses ; il ne peut pas écrire le
-- résultat (fiche/comparaison/statut restent au worker, en service_role).
drop policy if exists shortone_analyses_client_read on public.shortone_analyses;
create policy shortone_analyses_client_read on public.shortone_analyses
  for select using ( client_id = auth.uid() or get_my_role() in ('admin', 'collaborateur') );

drop policy if exists shortone_analyses_client_insert on public.shortone_analyses;
create policy shortone_analyses_client_insert on public.shortone_analyses
  for insert with check (
    client_id = auth.uid()
    and statut = 'en_attente'
    and fiche is null
    and comparaison is null
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.shortone_enabled is true and p.is_active is not false
    )
  );

drop policy if exists shortone_analyses_team on public.shortone_analyses;
create policy shortone_analyses_team on public.shortone_analyses
  for all using ( get_my_role() in ('admin', 'collaborateur') )
       with check ( get_my_role() in ('admin', 'collaborateur') );

-- ── 3. Bucket privé pour les vidéos déposées ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('shortone-uploads', 'shortone-uploads', false, 209715200)  -- 200 Mo
on conflict (id) do nothing;

drop policy if exists shortone_uploads_team on storage.objects;
create policy shortone_uploads_team on storage.objects
  for all using ( bucket_id = 'shortone-uploads' and get_my_role() in ('admin', 'collaborateur') )
       with check ( bucket_id = 'shortone-uploads' and get_my_role() in ('admin', 'collaborateur') );

-- Le client dépose dans son propre dossier (préfixe = son uid) et s'y relit.
drop policy if exists shortone_uploads_client_write on storage.objects;
create policy shortone_uploads_client_write on storage.objects
  for insert with check (
    bucket_id = 'shortone-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.shortone_enabled is true and p.is_active is not false
    )
  );

drop policy if exists shortone_uploads_client_read on storage.objects;
create policy shortone_uploads_client_read on storage.objects
  for select using (
    bucket_id = 'shortone-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. Bucket public pour les planches contact des références ───────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('shortone-planches', 'shortone-planches', true, 10485760)
on conflict (id) do nothing;

drop policy if exists shortone_planches_team_write on storage.objects;
create policy shortone_planches_team_write on storage.objects
  for all using ( bucket_id = 'shortone-planches' and get_my_role() in ('admin', 'collaborateur') )
       with check ( bucket_id = 'shortone-planches' and get_my_role() in ('admin', 'collaborateur') );
