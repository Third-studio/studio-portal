-- 2026-08-11 — Shortone : mots-clés sur les références
-- Le client filtre la bibliothèque en cochant des mots-clés ou en tapant une
-- recherche. Les tags sont posés au push (auto-déduits de l'analyse + manuels).

alter table public.shortone_references
  add column if not exists tags text[] not null default '{}';

create index if not exists shortone_references_tags_idx
  on public.shortone_references using gin(tags);
