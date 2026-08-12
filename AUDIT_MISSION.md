# Mission audit sécurité + perf — état d'avancement

Fichier d'état pour la routine de nuit. Chaque run : prendre les premiers items
non cochés (max 3-4 par run), VÉRIFIER le problème dans le code réel (les numéros
de ligne sont indicatifs — re-localiser par grep), corriger, `CI=true npm run build`
(0 erreur ESLint exigé), cocher ici, commit sur la branche `audit/nuit`, push, PR.
Ne JAMAIS pousser sur main. Quand tout est coché : écrire « MISSION TERMINÉE » en
tête de ce fichier et ne plus rien modifier.

Contraintes projet : src/App.js unique (~8500 lignes, voulu), ESLint strict CRA
(pas de vars inutilisées, hooks avant return conditionnel), charte graphique
intouchable, textes UI en français. Sécurité = RLS Supabase + fonctions
security definer (l'anon key est publique par design).

## Fait (sessions 2026-08-07/08)

- [x] Lien client public `?projets=TOKEN` : liste tous les projets d'un client sans compte
      (migration `20260807100000_espace_client_lien.sql` + RPC `get_client_space` +
      `ClientEspacePage` + boutons 🔗/↻ dans ClientsManager)
- [x] 4 appels `api.anthropic.com` côté client SANS clé (morts + clé destinée à être exposée)
      → edge function `ai-generate` (proxy authentifié, modèle/max_tokens bornés)
- [x] CSP `connect-src` : api.anthropic.com retiré (plus d'appel direct)
- [x] ai-generate : `clickup:true` interdit au rôle client
- [x] Réservations : confirm()/refuse() persistés en base (avant : state local only →
      les tournages confirmés « expiraient » et le créneau se libérait silencieusement)
- [x] addOption : erreur visible + vrai id base (avant : faux succès + id local Date.now())
- [x] Texte formulaire aligné sur l'expiration réelle (48h, pas 72h)
- [x] ClickUpSync : plus de faux succès en cas d'échec (avant : task_id inventé + « Tâche créée ! »)

## À faire — CRITIQUE / HAUTE

- [ ] `supabase/functions/refresh-trends/index.ts` : AUCUN check d'auth — invocable par
      n'importe qui avec l'anon key. Ajouter le même check JWT+rôle que `assistant`.
- [ ] `supabase/functions/mail-classify/index.ts:34` : aucun check d'auth, écritures
      service_role déclenchables avec l'anon key. Même correctif.
- [ ] XSS stocké dans l'export PDF des notes de réunion (`document.write` sans échappement,
      App.js ~3806). Échapper toutes les valeurs interpolées (title, attendees, summary…).
- [ ] Injection HTML dans les emails transactionnels : nom client / titre projet non
      échappés (App.js ~7755/7804) ET `send-email` accepte to/subject/text libres depuis
      le client (App.js ~917). Durcir côté edge function `send-email` : échappement HTML
      systématique + restreindre les destinataires aux emails liés au projet.
- [ ] Livrables « internes » (rushes, droits, notes) stockés dans la ligne `projects`
      lisible par le client (App.js ~562). Séparer ou filtrer côté RLS/RPC.
- [ ] Flags d'autorisation dans `projects.brief` (clientStepsUnlocked, submitted…) alors que
      le client peut réécrire tout le JSON brief (App.js ~1583/7909). Déplacer les flags
      admin dans une colonne non modifiable par le client (policy ou trigger).
- [ ] Réservations : noms clients + notes internes envoyés aux visiteurs non-admin, masquage
      UI seulement (App.js ~2176) ; formulaire « Poser une option » accessible aux
      non-admins (~2220). Filtrer côté requête/RLS selon le rôle.
- [ ] Révocation d'accès collaborateur : update sans vérification d'erreur → échec silencieux
      (App.js ~6762/7640). Vérifier error + notifier.
- [ ] PERF : le login charge TOUS les projets avec TOUS les messages/fichiers/storyboards
      imbriqués, sans limite (App.js ~7430/7551) et TOUT est rechargé à chaque refresh de
      token / retour d'onglet (~7497). Charger les détails à l'ouverture d'un projet,
      limiter les colonnes du select initial, ignorer les TOKEN_REFRESHED.

## À faire — MOYENNE

- [x] Token monteur : fallback prévisible `Date.now()` — remplacé par 2×crypto.randomUUID
      dans ensureMemberToken (2026-08-12). Vérifier qu'aucun autre site de génération ne subsiste.
- [ ] Supervision : vérifier que les policies RLS de la migration `20260618130000_supervision`
      couvrent bien tout ce que l'UI superviseur affiche (décision côté client, App.js ~7549).
- [ ] `claim_pending_projects()` : rattachement par simple correspondance d'email — un compte
      créé avec l'email visé récupère les projets en attente. Exiger email confirmé.
- [ ] `invite-upload` : expires_at/single_use ignorés + uploads illimités (index.ts ~48).
- [ ] `project-export` : injection de formule CSV (préfixer ' les cellules commençant
      par = + - @, index.ts ~87).
- [ ] `calendar-sync` : re-push de TOUTES les tâches ouvertes à chaque run (~200 appels
      Google). Ne pousser que les deltas.
- [ ] `Number()` sur des ids projet UUID casse la liaison post↔projet (App.js ~3092).
- [ ] Messages : `author`/`role` fournis par le client → usurpation possible (App.js ~1600).
      Forcer author/role côté serveur (RLS with check ou trigger).
- [ ] Upload client sans validation (type/taille) vers bucket public moodboard (App.js ~662).
- [ ] Liens invités (`?guest=`) : vérifier expiration/révocation appliquées côté serveur
      (App.js ~1501), pas seulement dans l'UI.
- [ ] ai-generate : rate limit simple (compteur par user/heure dans une table) — un client
      peut appeler en boucle avec system libre.
- [ ] PERF memo/refetch : wrappers memo() neutralisés par handlers inline (~8055/8168) ;
      ProjectsListView recalcule O(projets×factures) à chaque frappe (~7056) ;
      TasksReminders refetch 3 tables à chaque clic (TasksReminders.js:20) ; Inbox refetch
      200 emails + projets à chaque action (Inbox.js ~56/92) ; ProjectAutoStatus relance
      l'analyse de TOUS les projets pour un seul (ProjectAutoStatus.js:29) ; moodboard
      affiche les originaux pleine résolution en vignettes 160px (~710) ; profil fetché
      2× au login (~7527/7545).

## À faire — BASSE

- [ ] `notify-new-project` : rate-limiter / vérifier l'appartenance du project_id (spam admin).
- [ ] `auto-invoice` : numérotation par count() → doublons possibles ; utiliser une séquence.
- [ ] Section Tarifs seulement masquée par la navigation pour les collaborateurs (~8103).
- [ ] Suppressions/updates sans vérification d'erreur → state divergent de la base (~3955).
- [ ] Lien d'invitation client : simple email en paramètre d'URL, sans secret (~7921).
- [ ] Mode contraste : sélecteurs CSS `[style*="rgb(...)"]` coûteux (~8058) ; pas de cache
      inter-sections (~8155).

## Zones non encore auditées (les reviewers ont échoué — à refaire)

- [ ] src/App.js lignes ~4150-6300 (revue sécurité jamais terminée)
- [ ] Migrations SQL / RLS : reconstituer l'état final du schéma et vérifier les policies
      (get_project_invite, chat anonyme, espace monteur, get_client_space…)
- [ ] api/nouveau-projet.js, src/Login.js, fichiers *.command, dépendances package.json

## Rappels déploiement (à faire par Idriss, pas par la routine)

- `supabase db push --linked` → applique `20260807100000_espace_client_lien.sql`
- `supabase functions deploy ai-generate` (+ redéployer refresh-trends/mail-classify
  une fois corrigées)
- Secrets déjà en place : ANTHROPIC_API_KEY ; optionnel : CLICKUP_MCP_TOKEN
