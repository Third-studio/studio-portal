# Infra Mail → Tâches → Calendar → Export

Pipeline interne qui :
1. **Poll Gmail** (toutes les 5 min via cron)
2. **Classifie chaque mail** avec Claude (Haiku 4.5) → projet, type, dates, montants, actions
3. **Crée automatiquement** : tâches, rappels, drafts de factures/devis
4. **Pousse vers Google Calendar** (toutes les 10 min)
5. **Exporte par projet** : CSV consolidé (tâches + mails + factures + devis + planning)

## Architecture

```
Gmail ─────► gmail-sync (cron 5min) ─────► table emails ─────► mail-classify (Claude)
                                                                      │
                                                                      ▼
                                                          tasks + reminders + invoices + quotes
                                                                      │
                                                                      ▼
                                                  calendar-sync (cron 10min) ─────► Google Calendar

                                                  project-export (à la demande) ─────► CSV/JSON
```

## 1. Migrations SQL

À exécuter dans Supabase SQL editor, dans cet ordre :

```sql
-- déjà appliqué
\i 2026-05-19_invoices.sql
-- nouveau
\i 2026-05-19_mail_infra.sql
```

Tables créées : `emails`, `email_attachments`, `tasks`, `reminders`, `quotes`, `mail_logs`, `mail_integrations`.

## 2. Setup OAuth Google (Gmail + Calendar)

### 2.1 Créer un projet Google Cloud

1. Va sur https://console.cloud.google.com → crée un projet « Third-One Studio Internal »
2. APIs & Services → Library → active **Gmail API** + **Google Calendar API**
3. OAuth consent screen → Internal (si Workspace) ou External + ajoute ton email en testeur
4. Credentials → Create credentials → OAuth client ID → **Desktop app** (pour générer un refresh_token long-lived sans avoir besoin de site web)
5. Note `client_id` et `client_secret`

### 2.2 Obtenir un refresh_token (une seule fois)

Depuis n'importe quelle machine :

```bash
# 1. Ouvre cette URL dans le navigateur (remplace CLIENT_ID)
open "https://accounts.google.com/o/oauth2/v2/auth?client_id=CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/calendar"

# 2. Autorise → copie le code affiché
# 3. Échange contre un refresh_token :
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=CODE_COPIÉ" \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
  -d "grant_type=authorization_code"
```

La réponse contient `refresh_token` — c'est lui qu'on stocke.

### 2.3 Enregistrer l'intégration

Dans Supabase SQL editor (un INSERT pour Gmail, un pour Calendar — même refresh_token car même scopes) :

```sql
insert into mail_integrations (provider, account_email, refresh_token, scopes, active)
values
  ('gmail', 'contact@thirdone.studio', '<refresh_token>',
   ARRAY['https://www.googleapis.com/auth/gmail.readonly'], true),
  ('gcal',  'contact@thirdone.studio', '<refresh_token>',
   ARRAY['https://www.googleapis.com/auth/calendar'], true);
```

## 3. Secrets Supabase

```bash
supabase secrets set \
  GOOGLE_OAUTH_CLIENT_ID="..." \
  GOOGLE_OAUTH_CLIENT_SECRET="..." \
  ANTHROPIC_API_KEY="sk-ant-..." \
  CLAUDE_MODEL="claude-haiku-4-5-20251001" \
  CRON_SHARED_SECRET="$(openssl rand -hex 32)" \
  GCAL_CALENDAR_ID="primary"
```

## 4. Déploiement Edge Functions

```bash
cd /Users/idrissduleme/studio-portal
supabase functions deploy gmail-sync
supabase functions deploy mail-classify
supabase functions deploy calendar-sync
supabase functions deploy project-export
```

## 5. Cron jobs (pg_cron)

À exécuter dans Supabase SQL editor (remplace `<PROJECT_REF>` et `<CRON_SHARED_SECRET>`) :

```sql
-- Active l'extension si pas déjà fait
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Sync Gmail toutes les 5 minutes
select cron.schedule(
  'gmail-sync-5min', '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/gmail-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'X-Cron-Key','<CRON_SHARED_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Push Calendar toutes les 10 minutes
select cron.schedule(
  'calendar-sync-10min', '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/calendar-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'X-Cron-Key','<CRON_SHARED_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Vague 2 : cerveau quotidien ────────────────────────────────────────────
-- Note : pg_cron tourne en UTC. Martinique = UTC-4, donc 7h locale = 11h UTC.

-- Project radar : chaque jour à 6h locale (10h UTC), prépare auto_status_note
select cron.schedule(
  'project-radar-daily', '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/project-radar',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

-- Briefing matinal : 7h locale (11h UTC) — APRÈS project-radar pour avoir les status à jour
select cron.schedule(
  'daily-briefing-7am', '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/daily-briefing',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

-- Invoice chaser : 9h locale (13h UTC), du lundi au vendredi
select cron.schedule(
  'invoice-chaser-daily', '0 13 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/invoice-chaser',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

-- Récap hebdo : vendredi 17h locale (21h UTC)
select cron.schedule(
  'weekly-recap-friday', '0 21 * * 5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/weekly-recap',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

## 5.bis Secrets additionnels (Vague 2)

```bash
supabase secrets set \
  BRIEFING_RECIPIENT="idrissduleme@gmail.com"
```

Et applique la migration SQL :

```bash
# dans Supabase SQL editor
\i 2026-05-19_brain_vague2.sql
```

## 5.ter Déploiement Edge Functions vague 2

```bash
supabase functions deploy daily-briefing
supabase functions deploy project-radar
supabase functions deploy invoice-chaser
supabase functions deploy weekly-recap
# send-email a été modifié pour accepter X-Cron-Key — re-deploy obligatoire
supabase functions deploy send-email
```

## 5.cinque Vague 3 bis : voice capture + UI status auto

Secret pour Whisper (un seul des deux suffit — Groq est plus rapide et ~2× moins cher) :

```bash
supabase secrets set GROQ_API_KEY="gsk_..."
# OU
supabase secrets set OPENAI_API_KEY="sk-..."
```

Déploiement :

```bash
supabase functions deploy voice-capture
```

**Effets côté front** :
- Bouton 🎤 flottant en bas à droite (visible uniquement en mode prod pour admin/collab)
- Maintenir / cliquer → enregistre la note vocale → upload → Whisper transcrit → Claude extrait actions → tâches créées
- Si tu es sur la fiche d'un projet quand tu enregistres, la note est automatiquement attachée à ce projet
- Bandeau `ProjectAutoStatus` en haut de chaque fiche projet : badge couleur ok/watch/risk/blocked + status_note + next_action + bouton ↻

## 5.quater Vague 3 : génération auto + capture étendue

Migration SQL :

```bash
# dans Supabase SQL editor
\i 2026-05-19_auto_triggers.sql
# ⚠️ Avant exécution, remplace <PROJECT_REF> et <CRON_SHARED_SECRET> dans le fichier
```

Edge Functions :

```bash
supabase functions deploy auto-quote
supabase functions deploy auto-invoice
supabase functions deploy attachment-ocr
supabase functions deploy calendar-pull
```

Cron supplémentaires :

```sql
-- Reverse Calendar (events créés à la main → tâches) toutes les 15 min
select cron.schedule(
  'calendar-pull-15min', '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/calendar-pull',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

-- Filet de sécurité OCR (au cas où le trigger SQL aurait raté une PJ)
select cron.schedule(
  'attachment-ocr-hourly', '7 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/attachment-ocr',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Key','<CRON_SHARED_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

**Effets** :
- À la **création** d'un projet → devis draft auto avec tâche « Valider devis » à 2 jours
- Au passage en **livraison** d'un projet → facture draft auto numérotée `F-YYYY-NNNN` avec tâche « Valider et envoyer »
- À l'arrivée d'un mail avec **PJ PDF devis/facture** → extraction auto + draft pré-rempli
- Tout event **créé manuellement dans Google Calendar** → tâche auto dans Third-One (matche le projet par titre)

## 6. Vérification

```sql
-- Logs récents
select source, action, success, message, created_at
from mail_logs order by created_at desc limit 30;

-- Mails non-classifiés (devrait converger vers 0)
select count(*) from emails where classified = false;

-- Tâches générées auto par mail
select t.title, t.due_date, t.priority, e.subject, e.from_addr
from tasks t join emails e on e.id = t.email_id
where t.source = 'mail'
order by t.created_at desc limit 20;
```

## 7. Utilisation côté front

- **Inbox** (sidebar prod) : liste tous les mails classifiés, filtre par projet/type/urgence, ré-attache manuellement un mail à un projet, ré-classifie à la demande
- **Tâches** (sidebar prod) : vues Aujourd'hui / Cette semaine / En retard, création manuelle, bouton « Pousser vers Calendar »
- **Export projet** : depuis la fiche projet (à brancher — voir étape suivante), bouton « Exporter » qui appelle `project-export` avec `format: "csv"`

### Vague 2 (cerveau quotidien — automatique)

- **Briefing matinal** : mail à 7h dans `idrissduleme@gmail.com` avec top 3 du jour + RDV + relances + alertes
- **Status auto des projets** : champ `projects.auto_status_note` rempli quotidiennement par Claude. À afficher dans la fiche projet (badge couleur selon `auto_health`)
- **Relances factures** : envoi auto J+1/J+8/J+15 à l'email du client, escalade en tâche urgente à J+15
- **Récap hebdo** : mail vendredi 17h avec chiffres semaine + projets ayant bougé + à traiter
- Override : pour mettre en pause les relances sur une facture, `update invoices set chase_paused = true where id = '...'`

## 8. Ce qui reste à brancher (optionnel)

- Bouton **Export** dans la fiche projet existante (`projetsView==="detail"`) qui appelle `supabase.functions.invoke("project-export", { body: { project_id, format: "csv" } })` et déclenche le téléchargement
- **Envoi de mails de rappel** : étendre `reminders` pour appeler `send-email` quand `remind_at < now()` (cron 1min ou directement dans calendar-sync)
- **OAuth UI** : page admin qui guide la connexion Google sans passer par curl

## 9. Coûts

- Claude Haiku 4.5 : ~0,001 € / mail classifié (8K tokens d'entrée + 1K sortie)
- 100 mails/jour ≈ 3 €/mois
- Supabase Edge Functions : inclus dans le plan gratuit jusqu'à 500K invocations/mois
- Gmail API & Calendar API : gratuits sous quota standard
