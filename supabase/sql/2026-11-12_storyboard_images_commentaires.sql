-- Storyboards v2 : images / GIF de référence hébergés sur le portail + commentaires
-- du client plan par plan.
--
-- 1) Les frames d'un storyboard (colonne storyboards.frames, jsonb) acceptent désormais :
--    { id, visual, title, desc, duration, camera, image, refs:[{label,url}] }
--    (les anciens storyboards IA avec {id, visual, desc} restent valides).
-- 2) Bucket public 'storyboards' : images des plans + GIF de référence, écriture équipe.
-- 3) Table storyboard_comments : commentaires du client (ou de l'équipe) par plan.

-- ── 1. Bucket public pour les images de plans et les GIF de référence ───────
insert into storage.buckets (id, name, public, file_size_limit)
values ('storyboards', 'storyboards', true, 26214400)  -- 25 Mo (GIF)
on conflict (id) do nothing;

drop policy if exists storyboards_bucket_team_write on storage.objects;
create policy storyboards_bucket_team_write on storage.objects
  for all using ( bucket_id = 'storyboards' and get_my_role() in ('admin', 'collaborateur') )
       with check ( bucket_id = 'storyboards' and get_my_role() in ('admin', 'collaborateur') );

-- ── 2. Commentaires par plan ────────────────────────────────────────────────
create table if not exists public.storyboard_comments (
  id            uuid primary key default gen_random_uuid(),
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  frame_id      integer,                 -- null = commentaire général sur le storyboard
  author        text,
  role          text not null default 'client',   -- client | prod | superviseur
  content       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists storyboard_comments_sb_idx on public.storyboard_comments(storyboard_id);

alter table public.storyboard_comments enable row level security;

drop policy if exists storyboard_comments_admin_all on public.storyboard_comments;
create policy storyboard_comments_admin_all on public.storyboard_comments
  for all using ( get_my_role() in ('admin','collaborateur') )
       with check ( get_my_role() in ('admin','collaborateur') );

-- Le client lit et écrit les commentaires des storyboards de SES projets.
drop policy if exists storyboard_comments_client_select on public.storyboard_comments;
create policy storyboard_comments_client_select on public.storyboard_comments
  for select using (
    storyboard_id in (
      select s.id from public.storyboards s
        join public.projects p on p.id = s.project_id
       where p.client_id = auth.uid()
    )
  );
drop policy if exists storyboard_comments_client_insert on public.storyboard_comments;
create policy storyboard_comments_client_insert on public.storyboard_comments
  for insert with check (
    role = 'client'
    and storyboard_id in (
      select s.id from public.storyboards s
        join public.projects p on p.id = s.project_id
       where p.client_id = auth.uid()
    )
  );

-- Le superviseur lit et commente les storyboards des projets supervisés.
drop policy if exists storyboard_comments_supervisor_select on public.storyboard_comments;
create policy storyboard_comments_supervisor_select on public.storyboard_comments
  for select using (
    storyboard_id in (
      select s.id from public.storyboards s
        join public.projects p on p.id = s.project_id
       where public.supervises_client(p.client_id)
    )
  );
drop policy if exists storyboard_comments_supervisor_insert on public.storyboard_comments;
create policy storyboard_comments_supervisor_insert on public.storyboard_comments
  for insert with check (
    role in ('client','superviseur')
    and storyboard_id in (
      select s.id from public.storyboards s
        join public.projects p on p.id = s.project_id
       where public.supervises_client(p.client_id)
    )
  );
