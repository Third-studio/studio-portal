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
      RÉGRESSION corrigée (2026-08-13) : ce check cassait l'appel interne
      `gmail-sync` → `mail-classify` (le supabase-js client de gmail-sync est créé avec la
      service role key, pas un JWT utilisateur → `auth.getUser()` échouait → 401 →
      classification automatique des emails entrants silencieusement cassée en prod, gmail-sync
      avale l'erreur). Ajout d'un bypass explicite quand le bearer token égale la service role
      key, avant toute vérification JWT/rôle.
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
- [x] NOUVEAU (découvert 2026-08-13 en traitant l'item livrables internes) : `ProdLivrables`
      (App.js, `add()`/`del()`) ne persistait jamais en base — corrigé (2026-08-13) :
      `add()`/`del()` font maintenant un vrai `insert`/`delete` sur `public.files`
      (project_id/name/url/note/category), avec vérification d'erreur avant de mettre à jour
      l'état local (auparavant `onUpdate` → `updProject` ne faisait que `setProjects` en
      mémoire — perte silencieuse des rushes/droits/livrables ajoutés/supprimés au rechargement
      de page). Migration `20260813130000_files_insert_delete_team.sql` ajoutée (policies
      INSERT/DELETE PERMISSIVE admin/collaborateur sur `public.files` — policies historiques
      inconnues, schéma non versionné, donc ajout plutôt que remplacement, cf. même approche
      que `20260813090000`). À déployer par Idriss (`supabase db push`).

## À faire — MOYENNE

- [x] Token monteur : fallback prévisible `Date.now()` — remplacé par 2×crypto.randomUUID
      dans ensureMemberToken (2026-08-12). Vérifier qu'aucun autre site de génération ne subsiste.
- [x] Supervision : vérifié (2026-08-14) — la migration `20260618130000_supervision.sql`
      couvre bien toutes les surfaces exposées par l'UI superviseur : projects (select+update),
      messages (select+insert, commentaires), files (select seule — le superviseur ne modifie
      jamais les livrables côté UI), posts (select+update, validation contenus CM), storyboards
      (select+update, validation). Le moodboard est stocké dans `projects.brief` (jsonb), donc
      déjà couvert par `projects_supervisor_update` — pas de policy dédiée nécessaire. La valeur
      `isSupervisor` calculée côté client (App.js) n'est qu'un affichage : l'accès réel passe par
      `is_supervisor()`/`supervises_client()` (security definer, lues en base), donc un client
      qui falsifierait cette valeur en front n'obtiendrait rien de plus via l'API. RAS, aucune
      lacune trouvée.
- [x] `claim_pending_projects()` : rattachement par simple correspondance d'email — corrigé
      (2026-08-14, migration `20260814090000_claim_pending_projects_email_confirme.sql`) :
      la fonction ne lit plus que les comptes dont `auth.users.email_confirmed_at is not null`.
      Avant : un compte créé avec l'email d'un vrai client (même jamais confirmé) rattachait
      immédiatement tous ses projets/briefs en attente — usurpation sans preuve de possession
      de la boîte mail. À déployer par Idriss (`supabase db push`).
- [x] `invite-upload` : expires_at ignoré + uploads illimités — corrigé (2026-08-14,
      supabase/functions/invite-upload/index.ts) : la fonction ne vérifiait que `revoked_at`,
      un lien expiré continuait donc à délivrer des URLs d'upload signées indéfiniment. Ajout du
      check `expires_at` (403 si expiré) et d'une limite de 20 fichiers par projet (comptage via
      `storage.list` sur le préfixe du projet), conforme au commentaire d'origine qui annonçait
      cette limite sans jamais l'appliquer. `single_use` volontairement PAS vérifié ici : ce flag
      gouverne la création du projet (déjà appliqué dans `create_project_from_invite`, migration
      `20260713150000`) — le bloquer aussi dans invite-upload casserait les dépôts de fichiers
      légitimes qui suivent la création d'un projet unique-usage. À redéployer par Idriss
      (`supabase functions deploy invite-upload`).
- [x] `project-export` : injection de formule CSV — corrigé (2026-08-13) : `csvLine()`
      préfixe maintenant d'un `'` toute cellule dont la valeur (converties en string) commence
      par `=`, `+`, `-` ou `@` avant l'échappement des guillemets. Un titre de tâche, sujet de
      mail ou libellé de facture piégé (ex: `=HYPERLINK(...)`) exécutait une formule à
      l'ouverture du CSV dans Excel/Sheets par l'admin qui exporte.
- [x] `calendar-sync` : re-push de TOUTES les tâches ouvertes à chaque run (~200 appels
      Google) — corrigé (2026-08-14) : la requête `tasks` ne filtrait pas sur
      `calendar_synced_at`, contrairement à celle des `reminders` juste en dessous dans le
      même fichier qui excluait déjà les éléments déjà synchronisés (`is("calendar_synced_at",
      null)`) — incohérence manifestement non intentionnelle entre les deux blocs. Ajout du
      même filtre sur les tasks : seules les tâches jamais poussées sont désormais
      synchronisées, au lieu des ~200 tâches ouvertes à chaque run. Limite connue (déjà
      acceptée pour les reminders avec le même mécanisme) : une tâche déjà synchronisée puis
      modifiée (titre, due_date) ne sera plus re-poussée automatiquement — nécessiterait un
      suivi `updated_at` absent du schéma actuel, hors périmètre de ce correctif ciblé. À
      redéployer par Idriss (`supabase functions deploy calendar-sync`).
- [x] ~~`Number()` sur des ids projet UUID casse la liaison post↔projet (App.js ~3092)~~ —
      FAUX POSITIF (vérifié 2026-08-14) : `projects.id` est un `bigint` (confirmé par toutes
      les FK versionnées, ex. `20260803160000_espace_monteur.sql` : `project_id bigint
      references public.projects(id)`), pas un uuid. Le `Number(e.target.value)` dans
      `CMPostModal` (sélecteur de projet, App.js ~3106) est nécessaire : la valeur d'un
      `<select>` HTML est toujours une string, et `projects.find(p=>p.id===form.projectId)`
      (comparaison stricte) casserait sans cette conversion. Aucun id projet uuid nulle part
      dans le schéma versionné.
- [ ] Messages : `author`/`role` fournis par le client → usurpation possible (App.js ~1600).
      Forcer author/role côté serveur (RLS with check ou trigger). NON TRAITÉ (2026-08-14,
      analysé mais pas corrigé, item trop risqué pour être bâclé) : au moins 3 chemins
      d'insertion directe distincts (prod authentifié, client authentifié, prestataire
      authentifié rôle "partenaire") + le chemin monteur qui, lui, passe déjà par une RPC
      security definer (`member_send_message`, appelée SANS session JWT — auth.uid() y est
      NULL, accès par token dans `team_members`). Un trigger de correction basé sur
      `get_my_role()` casserait ce chemin monteur (déjà sûr) si mal calibré côté NULL, et
      `get_my_role()` ne couvre explicitement que admin/collaborateur/client dans les
      migrations versionnées — le rôle "partenaire" (prestataires) n'y apparaît nulle part,
      son comportement réel est invisible sans lire la définition actuelle de la fonction en
      base (schéma de base non versionné). Risque de régression du même type que le bug
      mail-classify/gmail-sync du 2026-08-13 si corrigé à l'aveugle. À reprendre avec accès à
      la définition actuelle de `get_my_role()` et des policies `messages` en base.
- [x] Upload client sans validation (type/taille) vers bucket public moodboard — corrigé
      (2026-08-14) : `addByFile` (MoodboardPanel, App.js) n'imposait aucune whitelist MIME
      (le `accept="image/*"` de l'`<input>` n'est qu'indicatif, contournable par un appel
      direct à l'API storage avec l'anon key) ni de taille max — un fichier arbitraire
      (HTML/SVG avec script, exécutable, fichier énorme) pouvait être déposé et servi
      publiquement (bucket `moodboard`, `getPublicUrl`) sous le domaine du studio. Ajout
      d'une whitelist MIME (jpeg/png/webp/gif/avif, extension dérivée du MIME plutôt que du
      nom de fichier) + limite 15 Mo côté front, ET au niveau du bucket lui-même
      (`allowed_mime_types`/`file_size_limit`, migration
      `20260814100000_moodboard_bucket_limits.sql`) pour que la restriction tienne même en
      cas d'appel direct contournant l'UI. À déployer par Idriss (`supabase db push`).
- [ ] Liens invités (`?guest=`) : vérifier expiration/révocation appliquées côté serveur
      (App.js ~1501), pas seulement dans l'UI. NON TRAITÉ (2026-08-14, analysé) : l'expiration
      (`guest.expiresAt`) n'est vérifiée que côté client (GuestView, App.js ~4654) après appel
      à la RPC `get_project_by_guest_token` — si cette RPC ne revérifie pas elle-même
      l'expiration avant de renvoyer les données du projet, un token expiré resterait
      exploitable via un appel direct à l'API. RPC absente des migrations versionnées (schéma
      de base) → impossible de confirmer si le check existe déjà côté serveur sans lire sa
      définition réelle en base. À reprendre avec accès à la définition actuelle de la RPC.
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

- `supabase db push --linked` → applique toutes les migrations en attente, dont
  `20260807100000_espace_client_lien.sql`, `20260813090000_files_internes_restriction.sql`,
  `20260813100000_lock_client_steps_unlocked.sql`, `20260813110000_bookings_role_filter.sql`,
  `20260813130000_files_insert_delete_team.sql`,
  `20260814090000_claim_pending_projects_email_confirme.sql`
- `supabase functions deploy ai-generate` (+ redéployer refresh-trends/mail-classify
  une fois corrigées, + `invite-upload` pour le check expires_at/limite 20 fichiers)
- Secrets déjà en place : ANTHROPIC_API_KEY ; optionnel : CLICKUP_MCP_TOKEN
