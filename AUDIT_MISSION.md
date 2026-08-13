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

- [x] `supabase/functions/refresh-trends/index.ts` : AUCUN check d'auth — corrigé (2026-08-12) :
      ajout du check JWT + rôle admin/collaborateur (même pattern que `assistant`), 403 sinon.
      N'importe qui avec l'anon key pouvait déclencher des appels Claude payants et écraser les
      tendances actives.
- [x] `supabase/functions/mail-classify/index.ts:34` : aucun check d'auth — corrigé (2026-08-12) :
      même check JWT + rôle admin/collaborateur ajouté avant tout traitement. Empêche un
      utilisateur non-équipe de forcer la classification d'emails et l'écriture service_role
      (tasks/reminders/invoices/quotes) avec l'anon key.
- [x] XSS stocké dans l'export PDF des notes de réunion (`document.write` sans échappement,
      App.js) — corrigé (2026-08-12) : ajout d'un helper `escHtml` et échappement de
      project.title, note.participants, note.content et chaque ligne de note.decisions avant
      interpolation dans le HTML généré. Empêchait l'exécution de script arbitraire dans
      l'onglet PDF ouvert par un admin consultant une note de réunion piégée.
- [x] Injection HTML dans les emails transactionnels — corrigé (2026-08-13) : `notifyClient`
      (fragment HTML de `send-email`) interpolait `client.name` / nom de fichier uploadé /
      montant facture sans échappement, et `sendClientInvite` interpolait `client.name` +
      `project.title` de la même façon → un nom de client ou de fichier piégé (balises
      HTML/JS) s'exécutait dans le client mail de l'admin ou du client à l'ouverture de
      l'email. Réutilisation du helper `escHtml` existant sur ces deux points d'interpolation.
      Non traité (nécessite une décision produit, pas un correctif ponctuel) : restreindre
      les destinataires de `send-email` aux emails liés au projet — la fonction est aussi
      utilisée pour des digests internes (weekly-recap, daily-briefing) qui n'ont pas de
      destinataire "lié à un projet", donc une restriction globale casserait ces usages.
- [x] Livrables « internes » (rushes, droits) lisibles par le client — corrigé (2026-08-13) :
      en réalité stockés dans une vraie table `public.files` (colonne `category`) jointe au
      projet via `files(*)`, pas dans la ligne `projects` comme indiqué initialement — le
      masquage « Interne » (App.js, ProdLivrables) n'est que visuel, la requête embarquée
      renvoie tout au client (visible en onglet réseau). Policy historique introuvable dans
      les migrations versionnées (schéma de base non versionné) → au lieu de la deviner et
      la remplacer à l'aveugle, ajout d'une policy RESTRICTIVE (`files_categorie_interne_restrict`,
      migration `20260813090000_files_internes_restriction.sql`) qui se combine en ET avec
      n'importe quelle policy permissive existante et bloque category≠'finaux' pour tout rôle
      hors admin/collaborateur — narrows l'accès quel que soit le nom de la policy en place.
      À déployer par Idriss (`supabase db push`).
      Découverte annexe (hors périmètre de cet item, à traiter séparément) : `ProdLivrables.add()`
      /`del()` (App.js) n'écrivent jamais dans `public.files` — ils passent par `onUpdate` qui
      ne fait que du `setProjects` en mémoire (App.js, `updProject`). Les livrables
      ajoutés/supprimés depuis cet onglet ne sont donc pas persistés et disparaissent au
      rechargement. À investiguer : soit un insert/delete Supabase manquant dans ProdLivrables,
      soit les fichiers visibles proviennent d'un autre flux (upload client/monteur) et cet
      onglet admin est cassé depuis un moment.
- [x] Flags d'autorisation dans `projects.brief` — corrigé (2026-08-13) pour `clientStepsUnlocked`
      (déverrouille moodboard/storyboards/révisions/livrables côté client, App.js gatedTabs) :
      posé uniquement par `toggleClientAccess`/`toggleProjectAccess` (admin), mais le client a
      le droit d'UPDATE sa colonne `brief` entière pour éditer son brief → rien n'empêchait un
      appel API direct (JWT client valide) avec `clientStepsUnlocked:true` pour s'auto-débloquer
      l'accès. Policy RESTRICTIVE ajoutée (`projects_client_steps_unlocked_lock`, migration
      `20260813100000_lock_client_steps_unlocked.sql`, même technique que pour les livrables
      internes) : interdit à tout rôle non admin/collaborateur de modifier ce flag par rapport
      à sa valeur déjà enregistrée. À déployer par Idriss (`supabase db push`).
      `submitted` (l'autre flag cité dans l'item d'origine) est en réalité un flag légitimement
      client-writable — c'est le client lui-même qui le passe à `true` en soumettant son brief
      (`submitBrief`, App.js) ; pas d'action prise dessus, le préciser sous ce nom prêtait à
      confusion mais ce n'est pas un flag "admin" au même titre.
- [x] Réservations : noms clients + notes internes envoyés aux visiteurs non-admin — corrigé
      (2026-08-13) : `bookings` était chargée en entier (`select("*")`) pour tous les rôles,
      le masquage (isAdmin && ...) n'était que visuel — un client recevait déjà, dans le
      state React et la réponse réseau, les noms/notes de TOUTES les réservations. Nouvelle
      RPC `get_bookings()` (security definer) qui masque client_name/note pour les non
      admin/collaborateur ; policies RESTRICTIVE select/insert/update sur `bookings`
      réservées à admin/collaborateur (empêche aussi le contournement par appel REST direct
      + bloque l'insertion via le formulaire « Poser une option », qui n'était pas gardé par
      rôle et permettait à un client d'insérer une réservation arbitraire). Formulaire
      masqué aux non-admins côté UI. Migration `20260813110000_bookings_role_filter.sql`
      à déployer par Idriss (`supabase db push`).
- [x] Révocation d'accès collaborateur/client : update sans vérification d'erreur → échec
      silencieux — corrigé (2026-08-13) : `revoke()` (AccessManager, révocation collaborateur)
      et `toggleActive()` (ClientsManager, suspension/activation client — même défaut, même
      famille de bug) vérifient maintenant `error` et notifient l'échec au lieu d'afficher
      « Accès révoqué »/« Compte suspendu » alors que la base n'a pas été mise à jour.
- [ ] PERF : le login charge TOUS les projets avec TOUS les messages/fichiers/storyboards
      imbriqués, sans limite (App.js ~7430/7551). PARTIEL (2026-08-13) : le volet
      « TOUT est rechargé à chaque refresh de token / retour d'onglet » est corrigé —
      `onAuthStateChange` gardait une nouvelle référence `user` à chaque événement (y
      compris TOKEN_REFRESHED, déclenché périodiquement + au retour d'onglet), ce qui
      redéclenchait le `useEffect [user]` de chargement complet ; il compare maintenant
      l'id et garde la même référence si l'utilisateur n'a pas changé. Reste à faire :
      limiter les colonnes du select initial et charger messages/fichiers/storyboards à
      l'ouverture d'un projet plutôt que pour tous les projets au login — refactor plus
      large (état + tous les composants qui lisent project.messages/files/storyboards),
      volontairement laissé pour un run dédié plutôt que bâclé dans le budget de celui-ci.
- [ ] NOUVEAU (découvert 2026-08-13 en traitant l'item livrables internes) : `ProdLivrables`
      (App.js, `add()`/`del()`) ne persiste jamais en base — passe uniquement par `onUpdate`
      → `updProject` qui ne fait que `setProjects` en mémoire (pas d'insert/delete Supabase
      sur `public.files`). Un ajout/suppression de rushes/droits/livrable final depuis la
      fiche projet disparaît donc silencieusement au rechargement de page — perte de données
      pour l'équipe. À vérifier : soit ajouter le vrai insert/delete vers `public.files` dans
      `ProdLivrables`, soit comprendre par quel autre flux les fichiers actuellement visibles
      en base ont été créés.

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
