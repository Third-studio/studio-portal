-- 2026-08-03 — Journée inclusive SARA × Tour de la Martinique des Yoles Rondes
-- Source : « Brief Journée inclusive SARA Tour des Yoles V01 » (agence CibleS).
-- Vidéo réseaux sociaux 9:16, 45-60 s. Tournage prévu le vendredi 31/07/2026 à
-- bord du catamaran affrété par SARA.
insert into projects (title, client_id, status, progress, brief, replay_url, delivery_date, shoot_date, status_note)
select
  'SARA — Journée inclusive Tour des Yoles (vidéo réseaux sociaux)',
  null, 'montage', 5,
  jsonb_build_object(
    'objective', 'Valoriser l''engagement sociétal et RSE de SARA à travers une action concrète d''inclusion : une association accompagnant des personnes en situation de handicap embarque sur le catamaran SARA pendant le Tour des Yoles. Raconter une histoire humaine, pas un reportage institutionnel.',
    'target',    'Réseaux sociaux SARA — LinkedIn, Facebook, Instagram',
    'duration',  '45 à 60 s (un peu plus si les échanges sont riches) — format vertical 9:16',
    'tone',      'Authenticité, émotion, chaleur humaine, spontanéité, énergie positive. Éviter tout ton institutionnel, paternaliste, démonstratif ou misérabiliste — le handicap n''est pas le sujet, l''expérience vécue l''est.',
    'notes',     E'ANGLE — regards, sourires, échanges spontanés, découverte de l''événement, émotions de la journée, interactions invités / collaborateurs SARA / équipage, ambiance du Tour en contexte.\n\nIMAGES D''AMBIANCE — arrivée des participants, accueil par les équipes SARA, préparatifs et embarquement, échanges avant le départ, navigation, paysages et ambiance du Tour, temps de convivialité, encouragements aux yoles, interactions naturelles, moments de joie / surprise / émotion.\n\nTÉMOIGNAGES — interviews courtes 10 à 20 s : représentants de l''association, bénéficiaires (uniquement s''ils souhaitent témoigner), collaborateurs ou représentant SARA. Questions : le plaisir de vivre cette journée, ce que représente cette invitation, l''importance de rendre ces événements accessibles, ce que l''expérience leur apporte. Réponses simples, spontanées, naturelles.\n\nLIVRABLE — 1 vidéo principale 9:16, rythme dynamique alternant ambiance / détails / interactions / témoignages, habillage graphique conforme à la charte SARA. Conserver des rushes et courtes séquences pour d''autres publications.\n\nMESSAGE PRINCIPAL — parce que les grands événements de Martinique doivent pouvoir être vécus par tous, SARA agit concrètement pour favoriser l''inclusion et permettre à chacun de partager des expériences qui créent des souvenirs, renforcent les liens et participent à la vie du territoire.\n\nSOURCE — brief V01 transmis par l''agence CibleS (cibles-conseil.com).',
    'pendingClientEmail',   'contact@thirdone.studio',
    'pendingClientName',    'Régine Hildéral',
    'pendingClientCompany', 'SARA'
  ),
  '', null, date '2026-07-31',
  'Tournage prévu le vendredi 31/07/2026 à bord du catamaran SARA. Montage à faire — 9:16, 45-60 s, charte SARA.'
where not exists (
  select 1 from projects p
   where p.title = 'SARA — Journée inclusive Tour des Yoles (vidéo réseaux sociaux)'
);
