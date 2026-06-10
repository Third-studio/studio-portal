-- 2026-06-10 — Chat anonymisé + agent IA
-- À exécuter dans Supabase Studio → SQL Editor (https://supabase.com/dashboard/project/ytmflrwfapxaeryehgal/sql)

-- 1. Colonnes d'anonymisation sur profiles
--    alias   : pour l'équipe → poste ou surnom affiché dans le chat (ex: "Chef de projet", "Monteur")
--    company : pour les clients → nom de l'entreprise affiché dans le chat (ex: "Société XYZ")
alter table public.profiles add column if not exists alias text;
alter table public.profiles add column if not exists company text;

-- 2. Renseigner les alias de l'équipe (à adapter — exemples) :
-- update public.profiles set alias = 'Chef de projet' where email = 'marc@thirdone.studio';
-- update public.profiles set alias = 'Monteur'        where email = 'kevin@thirdone.studio';

-- Le rendu dans le chat sera :
--   Équipe  → "Chef de projet · Marc"  (ou "Équipe · Marc" si pas d'alias)
--   Client  → "Marie · Société XYZ"    (ou juste "Marie" si pas d'entreprise)
-- Aucun nom de famille ni email n'est plus jamais affiché.
