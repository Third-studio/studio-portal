-- 2026-08-03 — Sujets SARA « Risques technologiques » (relance Régine Hildéral, mail du 03/08/2026)
-- 1) Insert idempotent des nouveaux sujets  2) MAJ des notes/dates des sujets déjà présents.

-- 1. Nouveaux sujets
insert into projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note)
select v.title, null, v.status, v.progress,
       jsonb_build_object(
         'objective', v.objective,
         'clientContact', 'Régine Hildéral — SARA',
         'source', 'Mail Régine Hildéral du 03/08/2026'
       ),
       '', v.delivery_date::date, null, v.status_note
from (values
  ('SARA — Web-série sécurité ép.2 « Pa konfonn vitès é précipitasyon »', 'montage', 5, '2026-08-31',
   'En situation d''urgence : réagir vite, agir juste',
   'Montage à démarrer avec les images des POI Martinique et Guyane. Attendu fin août, diffusion début septembre.'),
  ('SARA — Web-série sécurité ép.3', 'brief', 0, null,
   'Épisode 3 de la web-série Culture sécurité — sujet à définir',
   'À tourner — date de tournage et sujet à caler avec la SARA.'),
  ('SARA — Portraits vidéo collaborateurs Guyane', 'montage', 30, '2026-08-05',
   'Portraits vidéo des collaborateurs de la SARA Guyane',
   'Intégrer les commentaires client du 22/07 (WhatsApp). À lancer avant le 06/08 (congés Régine) — diffusion interne + réseaux.'),
  ('SARA — Photos du personnel Guyane', 'tournage', 20, null,
   'Photos du personnel de la SARA Guyane (prestataire photographe)',
   'En attente du retour du photographe.')
) as v(title, status, progress, delivery_date, objective, status_note)
where not exists (select 1 from projects p where p.title = v.title);

-- 2. Mise à jour des sujets existants
update projects set
  status = 'montage', progress = 60, delivery_date = '2026-08-31',
  status_note = 'v1 du 31/07 refusée : ne tient pas compte du brief du 07/07/2026. Refaire une version quasi aboutie, puis programmer la voix-off avec Florence BAUDIN. Attendu fin août, diffusion début septembre.'
where title = 'SARA — Web-série sécurité ép.1 « Sé yonn a lot »';

update projects set
  status = 'montage', progress = 40, delivery_date = '2026-08-05',
  status_note = 'Intégrer les commentaires client du 22/07 (WhatsApp). À lancer avant le 06/08 (congés Régine) — diffusion interne + réseaux.'
where title = 'SARA — Vidéo exercice POI';

update projects set
  status = 'montage', progress = 10, delivery_date = '2026-08-05',
  status_note = 'v1 non livrée — relance client interne. À produire en priorité.'
where title = 'SARA — Vidéo piquet premiers secours';
