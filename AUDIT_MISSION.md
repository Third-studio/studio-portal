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
- [x] PERF : le login charge TOUS les projets avec TOUS les messages/fichiers/storyboards
      imbriqués, sans limite (App.js ~7430/7551). Historique : « TOUT rechargé à chaque
      refresh de token » corrigé le 2026-08-13 (comparaison d'id sur `user`). Terminé
      (2026-08-16), option (b) retenue après analyse des runs précédents (aucun usage
      cross-projets de `files`/`storyboards`, contrairement à `messages` qui alimente le
      badge « derniers messages non lus » du dashboard prod) : le select initial
      (`loadData`) n'embarque plus `files(*)`/`storyboards(*)`, seulement `messages(*)`
      — projets initialisés avec `storyboards:[]`/`livrables:[]`. Nouvel effet
      (`detailFetchedIds`) qui charge `files`+`storyboards` du projet sélectionné en un
      seul aller-retour ciblé (`.eq("project_id", id)`) dès qu'une vue détail (admin ou
      client) s'ouvre sur ce projet, une seule fois par projet (Set de suivi). Avant : N
      projets × (messages+fichiers+storyboards) à chaque login ; après : messages pour N
      projets (nécessaire au badge), fichiers/storyboards seulement pour le projet
      réellement ouvert. Vérifié : les deux seuls usages de `project.storyboards`/tab
      « Livrables » dans le code sont dans les vues détail (ProdDetail, ClientProjectView),
      donc pas de régression d'affichage dans les vues liste/kanban (elles n'en lisaient
      déjà pas le compte).
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
- [x] ai-generate : rate limit simple — corrigé (2026-08-14) : nouvelle table générique
      `edge_function_calls` (migration `20260814110000_edge_function_rate_limit.sql`) +
      helper `_shared/rateLimit.ts` (compteur glissant 1h par fonction/utilisateur).
      `ai-generate` limite désormais à 15 appels/h pour un client, 60/h pour
      admin/collaborateur (429 au-delà) — avant, un compte client pouvait appeler
      Claude en boucle avec un `system` libre, sans aucune limite de coût. À déployer
      par Idriss (`supabase db push` + `supabase functions deploy ai-generate`).
- [ ] PERF memo/refetch : wrappers memo() neutralisés par handlers inline (~8055/8168) ;
      ProjectsListView recalcule O(projets×factures) à chaque frappe (~7056) ;
      TasksReminders refetch 3 tables à chaque clic (TasksReminders.js:20) ; Inbox refetch
      200 emails + projets à chaque action (Inbox.js ~56/92) ; moodboard affiche les
      originaux pleine résolution en vignettes 160px (~710) ; profil fetché 2× au login
      (~7527/7545). PARTIEL (2026-08-15) : le sous-point « ProjectAutoStatus relance
      l'analyse de TOUS les projets pour un seul » est corrigé — le bouton « ↻ Analyser »
      (ProjectAutoStatus.js) passe désormais `{project_id}` dans le body de l'invoke, et
      l'edge function `project-radar` (index.ts) filtre sur cet id unique quand il est
      fourni au lieu de re-traiter tous les projets actifs (limit 100) à chaque clic —
      avant : ~1 appel Claude par projet actif rien que pour rafraîchir le statut d'un
      seul projet. Le cron quotidien (X-Cron-Key, sans body) garde le comportement
      global inchangé. À redéployer par Idriss (`supabase functions deploy project-radar`).
      Sous-points supplémentaires corrigés (2026-08-15) : « TasksReminders refetch 3
      tables à chaque clic » — `useEffect` rechargeait `tasks`/`reminders`/`projects`
      depuis le réseau à chaque changement d'onglet (Tout/Aujourd'hui/Semaine/En retard,
      TasksReminders.js:20), alors que ce filtre est déjà purement client-side
      (`filteredTasks`, ligne 60) : chargement au montage uniquement désormais, le filtre
      continue de s'appliquer en mémoire. « Inbox refetch 200 emails + projets à chaque
      action » — `reclassify()`/`attachToProject()` (Inbox.js) rappelaient `loadData()`
      (200 emails + tous les projets) après une action sur UN SEUL email ; remplacé par une
      mise à jour ciblée de l'état local (`attachToProject`, avec vérification d'erreur
      ajoutée — absente avant) et un refetch de la seule ligne concernée après reclassement
      (son contenu est mis à jour côté serveur par l'edge function, pas connu du client).
      « Profil fetché 2× au login » — deux `useEffect [user]` distincts appelaient
      `profiles.select(...).eq("id",user.id).single()` en parallèle à chaque connexion
      (App.js, l'un pour `role` seul dans `loadData`, l'autre pour le profil complet
      alimentant `userRole`/`userProfile`) ; fusionnés en un seul fetch (`select("*")`)
      dans `loadData`, qui alimente maintenant aussi `userRole`/`userProfile`/`appView` —
      le second `useEffect` a été supprimé. « ProjectsListView recalcule O(projets×factures) à
      chaque frappe » — corrigé (2026-08-15) : `inv4(pid)` refaisait un `invoices.filter(...)`
      sur le tableau complet à chaque appel (une fois dans le filtre de liste, une fois dans le
      calcul des totaux, une fois par ligne affichée), recalculé à chaque frappe dans la
      recherche puisque `q` est un state du même composant. Remplacé par un index
      `Map(project_id → factures[])` construit une seule fois via `useMemo` (dépendance
      `invoices` uniquement) — `inv4` est maintenant un lookup O(1). Même correctif appliqué à
      `ProjectsKanban` (`KanbanCard` faisait le même `invoices.filter` par carte à chaque
      rendu). « memo() neutralisés par handlers inline » — corrigé (2026-08-16) :
      `ProjectsKanbanMemo`/`ProjectsListViewMemo` (les deux vues les plus coûteuses de
      l'app) recevaient ~13 handlers de mutation (quickUpdateProject, createTeamMember,
      copyMemberSpaceLink, assignMemberToProject, unassignMember, quickCreateProject,
      markInvoicePaid, sendClientUpdate, toggleProjectAccess, sendClientInvite,
      deleteProject, duplicateProject, notifyClient) redéfinis en simples fonctions à
      chaque rendu de `App`, plus 3 handlers inline créés à la volée dans le JSX
      (onOpenProject, onAddInvoice, onCreateForClient) — memo() était donc entièrement
      neutralisé : ces deux composants se re-rendaient en entier à chaque frappe/état
      modifié n'importe où ailleurs dans le composant, même à props strictement
      identiques. Les 13 fonctions passées sous `useCallback` (deps = état réellement lu :
      teamMembers/clients/assignments/selectedProjectId/showNotif/updProject/notifyClient
      selon le cas) et les 3 handlers inline extraits en consts stables
      (`openProjectDetail`, `openInvoiceModal`, `createForClient`). Ces définitions ont dû
      être déplacées avant les `return` conditionnels du composant (écran de chargement,
      pas de session, compte supprimé, rôle partenaire, compte suspendu) : `useCallback`
      est un hook, alors qu'auparavant ces fonctions (simples consts) étaient définies
      après ces retours anticipés — les y laisser aurait violé les règles des hooks (appel
      conditionnel), détecté immédiatement par `react-hooks/rules-of-hooks` au build
      (CI=true). Comportement fonctionnel inchangé (mêmes corps de fonction, mêmes
      garde-fous erreur déjà en place) ; build vérifié, 0 erreur ESLint. Reste non traité :
      moodboard vignettes pleine résolution (nécessite soit l'API de transformation d'image
      Supabase Storage — indisponible selon le plan, impossible à confirmer sans accès au
      projet — soit un redimensionnement côté client à l'upload ; pas de fix sûr identifié
      sans decision produit).

## À faire — BASSE

- [x] `notify-new-project` : rate-limiter / vérifier l'appartenance du project_id — corrigé
      (2026-08-14) : réutilise `edge_function_calls` (10 appels/h par utilisateur) +
      un client authentifié ne peut désormais notifier que sur SES PROPRES projets
      (`project.client_id !== userId` → 403) — avant, n'importe quel client connecté
      pouvait spammer l'email admin en rappelant la fonction en boucle avec le
      project_id de n'importe quel projet, y compris ceux d'autres clients. Le check
      cron (X-Cron-Key) et le rôle admin/collaborateur restent illimités (trigger DB,
      usage interne légitime). À redéployer par Idriss
      (`supabase functions deploy notify-new-project`).
- [x] `auto-invoice` : numérotation par count() → doublons possibles — corrigé (2026-08-14) :
      remplacé par un compteur atomique en base (`next_invoice_number()`, security definer,
      migration `20260814120000_invoice_number_sequence.sql`) — l'UPDATE...RETURNING sur
      une ligne unique par année prend un verrou Postgres qui sérialise les appels
      concurrents, contrairement au `count()` qui pouvait lire la même valeur pour deux
      projets passant en "livraison" au même moment et générer deux factures avec le même
      numéro F-YYYY-NNNN. À déployer par Idriss (`supabase db push` +
      `supabase functions deploy auto-invoice`).
- [x] Section Tarifs seulement masquée par la navigation pour les collaborateurs — corrigé
      (2026-08-15) : `pricing` n'est pas en base (constante JS `DEFAULT_PRICING`), donc pas
      de policy RLS à corriger ; le seul verrou était le filtre du bouton de nav
      (`COLLAB_BLOCKED=["tarifs"]`), sans garde sur le rendu lui-même — contrairement à
      la section "comptes" qui vérifie déjà `(isAdmin||isCollab)`. Ajout de `&&isAdmin`
      sur la condition de rendu de `AdminPricingModule` (App.js) : un collaborateur qui
      forcerait `prodSection="tarifs"` (devtools/state) ne peut plus afficher le module.
      Risque résiduel faible et non traité ici : les valeurs par défaut sont déjà dans le
      bundle JS livré au navigateur, donc pas confidentielles en soi — le gain est la
      défense en profondeur sur l'UI d'admin (édition des tarifs), pas la confidentialité
      des montants.
- [x] Suppressions/updates sans vérification d'erreur → state divergent de la base — corrigé
      (2026-08-15) : même famille de bug que `revoke()`/`toggleActive()` (déjà traités),
      trouvé sur 8 handlers supplémentaires dans App.js qui appliquaient le changement
      côté état React sans vérifier l'`error` retourné par Supabase (policy RLS refusée,
      contrainte FK…) : retrait d'assignation projet (`remove`), suppression de note de
      réunion (`del`), sauvegarde/suppression de créneau planning (`saveSlot`/
      `deleteSlot` — le cas insert affichait même « Créneau ajouté ! » alors que l'insert
      avait échoué), ajout/suppression de membre équipe (`addMember`/`deleteMember`),
      ajout/suppression de type de prestation (`addType`/`deleteType`), sauvegarde/
      suppression de prestataire (`savePrestataire`/`deletePrestataire`). Tous vérifient
      maintenant `error` et notifient l'échec au lieu de faire silencieusement diverger
      l'état local de la base.
- [x] ~~Lien d'invitation client : simple email en paramètre d'URL, sans secret (~7921)~~ —
      FAUX POSITIF (vérifié 2026-08-15) : le lien (`?invite=EMAIL`, généré App.js) ne fait
      que pré-remplir le champ email du formulaire d'inscription (Login.js) ; il faut
      ensuite un mot de passe + confirmation d'email Supabase pour créer un compte, et le
      rattachement des projets en attente (`claim_pending_projects()`) exige désormais
      `email_confirmed_at is not null` (migration
      `20260814090000_claim_pending_projects_email_confirme.sql`, déjà traitée). La simple
      connaissance de l'email d'un client ne permet donc plus d'usurper son espace.
- [x] Mode contraste : sélecteurs CSS `[style*="rgb(...)"]` coûteux ; pas de cache
      inter-sections — PARTIEL (2026-08-16) : « pas de cache inter-sections » corrigé —
      le `<style>` de réglages (police/densité/accent/contraste) était un template
      literal reconstruit et re-diffusé à chaque rendu de `AppMain`, y compris à chaque
      changement de section (prodSection/clientSection) ou tout autre état sans rapport
      avec les réglages d'apparence — recréé (`densityPad`/`fontSizePx` étaient aussi deux
      objets recréés à chaque rendu). Passé sous `useMemo` (déplacé avant les `return`
      conditionnels du composant, comme les autres hooks du fichier — `useMemo` ne peut
      pas être appelé après un early return) avec dépendances
      `[settings.contrast,settings.accent,settings.fontSize,settings.density]` : ce CSS
      n'est plus recalculé, et React ne retouche plus le nœud `<style>` en DOM, lors des
      rendus où les réglages n'ont pas changé — c'est-à-dire la quasi-totalité des rendus
      d'une session. `densityPad`/`fontSizePx` remontés en constantes de module
      (`DENSITY_PAD`/`FONT_SIZE_PX`, plus recréés à chaque rendu). Non traité : le coût
      intrinsèque des sélecteurs d'attribut `[style*="..."]` eux-mêmes (recalcul de style
      coûteux pour le navigateur sur un DOM volumineux) — ils ne sont injectés que si
      `settings.contrast===true` (déjà le cas avant ce correctif) et ne concernent donc
      que les sessions ayant activé cette option d'accessibilité ; les supprimer
      nécessiterait de faire porter les couleurs secondaires par des classes CSS plutôt
      que par des styles inline générés dynamiquement — refactor large touchant la charte
      graphique dans une grande partie du fichier, hors périmètre d'un correctif ciblé.

## Zones non encore auditées (les reviewers ont échoué — à refaire)

- [x] src/App.js lignes ~4150-6300 (revue sécurité) — faite (2026-08-15). Un nouveau problème
      trouvé et corrigé : `AccessManager`/`ClientsManager` créent des comptes équipe/client
      (`supabase.auth.signUp()` + `profiles.upsert({role:"partenaire"|"client",…})`) gardés
      uniquement par `isAdmin` côté React — rien n'empêchait un utilisateur authentifié
      d'appeler directement `profiles.update({role:"admin"}).eq("id", sonPropreId)` avec
      l'anon key si la policy UPDATE historique sur `profiles` (non versionnée) autorise déjà
      l'édition de sa propre ligne (pattern courant pour nom/avatar) — auto-promotion admin.
      Policy RESTRICTIVE ajoutée (`profiles_role_lock`, migration
      `20260815090000_profiles_role_lock.sql`, même technique que `clientStepsUnlocked`/
      `bookings`/`files`) : verrouille la colonne `role` à sa valeur déjà enregistrée pour
      tout rôle non admin/collaborateur. Sans effet si aucune policy self-update n'existe déjà
      (no-op), filet de sécurité si elle existe. À déployer par Idriss (`supabase db push`).
      Reste du périmètre (prestataires, monteur, client espace via tokens `member_*`/
      `get_client_space`) : RAS, ces flux passent par des RPC security definer qui revalident
      le token côté serveur, pas de nouvelle faille trouvée.
- [ ] Migrations SQL / RLS : reconstituer l'état final du schéma et vérifier les policies
      (get_project_invite, chat anonyme, espace monteur, get_client_space…)
- [x] api/nouveau-projet.js, src/Login.js, fichiers *.command, dépendances package.json —
      audités (2026-08-16). `api/nouveau-projet.js` : RAS, endpoint Vercel simple qui
      insère un projet + envoie une notif, pas de faille identifiée. `*.command` :
      scripts locaux de déploiement manuel (macOS), pas de secret en clair, RAS.
      `package.json` : pas de dépendance manifestement compromise identifiée en lecture
      (`npm audit` remonte des vulnérabilités transitives génériques de la toolchain CRA,
      pas spécifiques à ce projet — hors périmètre d'un audit applicatif ciblé).
      NOUVEAU problème trouvé en auditant `src/Login.js` (`handleRegister`) en le
      recoupant avec `profiles_role_lock` (migration `20260815090000`, déjà en place) :
      cette policy est `for update` UNIQUEMENT — elle verrouille bien un changement de
      `role` sur une ligne `profiles` déjà existante, mais ne couvre PAS l'INSERT. Or
      `Login.js` (auto-inscription client) ET `AccessManager.createAccess`/
      `ClientsManager.createAccount` (création de comptes équipe/client par un admin)
      créent tous la ligne `profiles` via `supabase.from("profiles").upsert({..,role:..})`
      — un premier upsert sur un id neuf est un INSERT, donc un appel direct à l'API
      Supabase (JWT valide obtenu via auto-inscription, anon key) avec
      `profiles.upsert({id:sonPropreId, role:"admin", ...})` échapperait au verrou actuel
      SI une policy INSERT historique permettant à un utilisateur de créer sa propre ligne
      `profiles` existe déjà — ce qui est très probablement le cas : c'est exactement ce
      dont dépend le flux d'auto-inscription actuel pour fonctionner (sans policy INSERT
      self, `Login.js` échouerait déjà en prod). NON CORRIGÉ ici (risque de régression du
      même type que mail-classify/gmail-sync et profiles_role_lock lui-même, déjà
      documenté) : `AccessManager.createAccess`/`ClientsManager.createAccount` appellent
      `supabase.auth.signUp()` alors qu'un ADMIN est déjà connecté — si l'app utilise le
      comportement par défaut du SDK (confirmation email désactivée), `signUp()` remplace
      la session active par celle du compte nouvellement créé, donc l'upsert `profiles`
      qui suit s'exécute potentiellement avec la session du NOUVEL utilisateur, pas celle
      de l'admin. Ajouter à l'aveugle une policy RESTRICTIVE `for insert` basée sur
      `get_my_role() in ('admin','collaborateur')` casserait alors la création de comptes
      équipe/client par les admins eux-mêmes (le nouvel utilisateur n'a pas encore de ligne
      `profiles`, donc `get_my_role()` renverrait vide). À reprendre avec accès à la
      définition actuelle de la policy INSERT sur `profiles` en base ET confirmation du
      comportement de session après `auth.signUp()` dans cette configuration Supabase —
      sans quoi le correctif le plus sûr techniquement (étendre `profiles_role_lock` à
      `for insert` en forçant `role='client'` par défaut sauf appelant déjà admin) risque
      de casser la création de comptes en silence.

## Rappels déploiement (à faire par Idriss, pas par la routine)

- `supabase db push --linked` → applique toutes les migrations en attente, dont
  `20260807100000_espace_client_lien.sql`, `20260813090000_files_internes_restriction.sql`,
  `20260813100000_lock_client_steps_unlocked.sql`, `20260813110000_bookings_role_filter.sql`,
  `20260813130000_files_insert_delete_team.sql`,
  `20260814090000_claim_pending_projects_email_confirme.sql`,
  `20260814100000_moodboard_bucket_limits.sql`, `20260814110000_edge_function_rate_limit.sql`,
  `20260814120000_invoice_number_sequence.sql`, `20260815090000_profiles_role_lock.sql`
- `supabase functions deploy ai-generate notify-new-project auto-invoice` (+ redéployer
  refresh-trends/mail-classify une fois corrigées, + `invite-upload` pour le check
  expires_at/limite 20 fichiers, + `calendar-sync` pour le filtre tasks déjà synchronisées,
  + `project-radar` pour le filtre project_id ciblé)
- Secrets déjà en place : ANTHROPIC_API_KEY ; optionnel : CLICKUP_MCP_TOKEN
