-- Seed des sujets SARA en cours (2026-07-22). Insert idempotent : ignore si un
-- projet du même titre existe déjà.
insert into projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note)
select v.title, null, v.status, v.progress, '{}'::jsonb, '', null, null, v.status_note
from (values
  ('SARA — Kickoff Tour des Yoles',            'livraison', 100, 'Terminé — vidéo de lancement livrée'),
  ('SARA — Vidéo récap Tour des Yoles',        'montage',   10,  'Montage démarré'),
  ('SARA — Photos des 3 étapes (livraison)',   'livraison', 60,  'Tri/retouche et livraison des photos des 3 étapes'),
  ('SARA — Vidéo exercice POI',                'montage',   20,  'Images tournées, montage à faire'),
  ('SARA — Vidéo piquet premiers secours',     'brief',     0,   'À cadrer'),
  ('SARA — 4 vidéos Métier Passion',           'brief',     0,   '4 sujets distincts à produire'),
  ('SARA — Web-série sécurité ép.1 « Sé yonn a lot »', 'montage', 80, 'Retours client v1 traités, VO test générées')
) as v(title, status, progress, status_note)
where not exists (select 1 from projects p where p.title = v.title);
