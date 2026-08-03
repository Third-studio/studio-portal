-- 2026-08-03 — Pré-rattachement client des sujets SARA.
-- Aucun compte auth créé : on pose brief.pendingClientEmail sur les projets SARA
-- sans client. claim_pending_projects() les rattachera à la 1re connexion du
-- compte client portant cet email. Adresse provisoire : contact@thirdone.studio.
update projects
set brief = coalesce(brief, '{}'::jsonb) || jsonb_build_object(
      'pendingClientEmail',   'contact@thirdone.studio',
      'pendingClientName',    'Régine Hildéral',
      'pendingClientCompany', 'SARA'
    )
where title like 'SARA —%'
  and client_id is null;
