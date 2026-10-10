# Journal des sessions

Plusieurs sessions Claude travaillent sur ce dépôt : celle qui tourne
sur le PC de Charles et qui peut déployer, et celles du nuage qui ne le
peuvent pas.

**La règle est simple : on note ce qu'on commence, et ce qu'on laisse.**

Écrire une ligne AVANT de commencer un chantier, et une ligne en le
laissant. Ça ne coûte rien et ça évite ce qui suit.

Entrées les plus récentes en haut.

---

## En cours — personne dessus

Rien n'est commencé et laissé en plan à cette heure.

**Deux sessions travaillent sur ce dépôt.** Avant de commencer un
chantier, écrire ici une ligne — quel sujet, quels fichiers — et la
pousser. La retirer en partant. Le 04/09, faute de cette ligne, les
formulaires de connexion ont été corrigés deux fois en parallèle.

## 10/10/2026 (session adjointe) — contacts classés : un non classé passe par la messagerie

**Codé et commité sur main, PAS publié.** Il y a du serveur (API) : à publier avec le web et l'APK.

- Règle (Charles, 10/10) : un contact NON CLASSÉ (aucune catégorie travail / santé / famille / amis /
  sport sur sa fiche ; la pastille « temps libre » seule ne classe personne) passe par la messagerie,
  comme un inconnu. Un contact CLASSÉ réserve seul (case décochée, non bloqué) uniquement dans les
  plages de SES catégories. `categoriesPourPrendreRdv` n'a plus de repli « toutes les catégories ».
  Vaut pour /rdv/demander, /rdv/choisir (reverif), /rdv/groupe/proposer et /confirmer.
- Mes disponibilités : « 👥 Choisir qui » sous chaque bloc ouvrant, avec « N choisis » ; la liste de TOUS
  les contacts, une case chacun (cochés d'abord, puis TimeCool, puis alphabétique), recherche en haut,
  60 lignes à la fois (3 313 contacts sans ralentir), « Terminé ». Cocher = ajouter la catégorie sur la
  fiche (même donnée que la pastille, enregistrée par saveContacts). Un contact bloqué n'est ni compté
  ni coché. La ligne « me déranger quand même » du temps libre ouvre la même liste.
- Textes : conseil de la page Contacts (texte de Charles, « Mes disponibilités » cliquable), fiche
  contact (« Il peut réserver seul dans les plages de : »), cadre gris, fenêtre « C'est ouvert, en douceur ».
- Suites : `verif-contacts-classes` (nouvelle) ; `verif-contacts-classes-e2e` vise l'API EN LIGNE, rouge
  tant que l'API n'est pas déployée ; les e2e existants classent désormais leurs contacts.

## 10/10/2026 (session adjointe) — « Choisir qui peut me déranger », tous les panneaux au centre

**Codé et commité sur main, PAS publié.** Aucun changement serveur.

- « Mon temps libre » : une ligne « 👥 Choisir qui peut me déranger quand même › » sous le bloc (reste
  cliquable même quand les blocs sont gris) et dans la fenêtre d'une plage (par défaut 13h-20h pour ce bloc).
  Elle ouvre Mes contacts : TOUS les contacts, ceux déjà choisis d'abord (filtrer sur les seuls choisis
  ne laissait rien à choisir la première fois), bandeau « Qui peut me déranger même en temps libre ».
- Panneaux : tout s'ouvre centré, 4 coins arrondis, 16 px de marge, 90 % de la hauteur, défilement à
  l'intérieur, fondu simple. Partagés : `.modal-overlay/.modal`, `.msg-sheet-ov/.msg-sheet`, `.tc-mod`.
  En ligne : fenêtre de créneau, ajout de plage, indicatif, langue, paramètres, fenêtre « douceur »,
  Google, code admin. Laissés tels quels : recherche (en haut), champ de Charly, menu latéral, toasts.
- Suite : `verif-panneaux-centres` (nouvelle).

## 10/10/2026 (session adjointe) — « Synchroniser avec mon ancien agenda », encadré rassurant, carte Outlook

**Codé et commité sur main, PAS publié.** Aucun changement serveur.

- Menu : « Synchroniser avec Google Agenda » devient « Synchroniser avec mon ancien agenda » (même clé
  `google`, même page `page-google`). Le titre de la page suit ; le sous-titre et le mode d'emploi parlent
  de l'ancien agenda (Google ou Outlook) puisque la page a maintenant deux cartes.
- Encadré vert doux avec cadenas, EN HAUT des pages Importer et Synchroniser, même texte et même dessin :
  « Ton ancien agenda ne risque rien… ». Sur la page Importer il est hors du contenu que les étapes
  réécrivent, donc il reste affiché pendant tout le parcours.
- Carte Outlook sous celle de Google (même structure, bouton « Synchroniser mon agenda TimeCool avec mon
  agenda Outlook »). `tcOutlookAgendaRelier()` affiche « Outlook arrive dans une prochaine version. » et ne
  fait AUCUN appel réseau : c'est elle qui deviendra la vraie liaison (Microsoft Graph).
- Charly : Outlook = « pas encore, mais bientôt », renvoie à la carte et propose l'import ; la clé
  « synchroniser avec mon ancien agenda » mène à la réponse Google. L'aide dit « Outlook : bientôt ».
- Suites : `verif-menu-ancien-agenda` (nouvelle) ; verif-page-google, verif-google-revue,
  verif-google-agenda-depart mises à jour.

## 10/10/2026 (session adjointe) — « Mon temps libre » = temps protégé

**Codé et commité sur main, PAS publié.**

- « Mon temps libre » (catégorie `personnel`) est à l'envers : ses plages sont du temps PROTÉGÉ.
  Serveur : elles sont retirées des heures permises de tout demandeur, même si une plage travail,
  santé… les recouvre (`dispoPlagesDuJour`, donc rendez-vous à deux et à plusieurs). `personnel`
  n'est plus une catégorie ouvrante par défaut.
- Exception : la pastille « Même en temps libre » (`personnel` dans `categories` de la fiche)
  veut dire « il peut me déranger pendant mes heures protégées ». Elle ne limite aucune heure.
- `/rdv/choisir` refuse (409 neutre, comme un créneau pris) un créneau devenu protégé, ou un
  contact devenu bloqué. `/rdv/groupe/confirmer` reverifie chaque invité avec ses catégories.
- `/rdv/proposer-creneau` (le titulaire choisit lui-même) n'applique PAS la protection :
  c'est son propre choix.
- Écran : bloc « Mon temps libre » réécrit, phrase « Je suis tranquille… », ligne « 🔒 Protégé… ».
  Au décochage, `personnel` reste vide. Les créneaux que Charly propose n'incluent jamais le
  temps protégé.
- Suites : `verif-temps-protege` (nouvelle, verte) ; `verif-temps-protege-e2e` vise l'API EN LIGNE,
  rouge tant que l'API n'est pas déployée.

## 10/10/2026 (session adjointe) — « Toujours attendre ma validation »

**Codé et commité sur main, PAS publié** (l'API, le web et l'APK partent avec le chef principal).

- Réglage `tc_rdv_validation` (famille « réglage », coché tant qu'il n'a pas de valeur). Lu côté
  serveur par `validationRdvExigee`.
- Une demande n'est automatique que si la case est décochée, que le demandeur est dans le carnet
  du titulaire (téléphone, email, ou référence de compte de la fiche) et qu'il n'est pas bloqué.
  Sinon : messagerie, avec la même réponse pour le demandeur. Vaut aussi pour les rendez-vous à
  plusieurs (invité qui exige sa validation, inconnu ou bloqué = « sans accès »).
- Plus d'horaires par défaut cachés côté serveur : aucune plage = rien de réservable. Au
  décochage, l'application ouvre 11h-12h et 14h-15h (lun-ven) dans les catégories vides.
- Messagerie : « Proposer un créneau » (`/rdv/proposer-creneau`, deux agendas, 409 si pris) et
  « Refuser et bloquer » (`/rdv/refuser`, fiche bloquée, rien envoyé au demandeur).
- Suites : `verif-validation-rdv` (nouvelle, verte) ; `verif-validation-rdv-e2e` et `verif-rdv-e2e`
  visent l'API EN LIGNE : rouges tant que l'API n'est pas déployée, à relancer ensuite.
- Les demandes reçues AVANT cette version n'ont pas de « genre » : elles restent des messages
  simples, sans boutons.

## Point du 09/10/2026 (session du PC, chef de projet)

**Dernière version : v2.0.293.** Semaine du 03 au 09/10, tout en ligne (web, Android, API) :
rendez-vous entre comptes fiabilisés (plus de double réservation, noms piégés bloqués, heures
correctes sur la page du lien), créneaux proposés selon « Mes disponibilités », bouton
« Prévenir » de la fiche réparé (il s'ouvrait derrière la fiche), deux onglets ne suppriment
plus un rendez-vous, rendez-vous à plusieurs via Charly (routes `/rdv/groupe/proposer` et
`/rdv/groupe/confirmer`), règle du 09/10 « tout contact qui a TimeCool peut être consulté,
sauf blocage ; les catégories ne sont qu'une limite facultative », APK publié aussi sous
`timecool-X.Y.Z.apk` (bouton du site), connexion Google sur le site web (code en ligne).

**Nouvelle organisation décidée le 09/10 :** une session chef de projet sur le PC parle avec
Charles et délègue aux autres sessions (serveur, et bientôt « Testeurs » = utilisateurs
virtuels, accès minimal). Consignes communes dans `CLAUDE.md` du Bureau du PC (copie :
`~/memoire-claude-pc/CLAUDE-bureau-pc.md`). Une session jumelle « CHEF DE PROJET OCTOBRE
2026 » peut être ouverte sur le PC : avant de toucher au code, demander à l'autre où elle en est.

**À faire, dans l'ordre validé :** défauts restants de la campagne 1 (notification qui cache
les boutons en bas, décaler/annuler sur un seul agenda, « Je décale » depuis la fiche contact,
avatar « JD », lien public : créneaux passés ou de nuit acceptés, pas de limite de requêtes) ;
préférence de notification par contact ; fuseaux horaires (plus tard, validé « plus tard »).

## En attente de Charles

- **Connexion Google sur le site web** : déclarer `https://timecool.fr` dans « Origines JavaScript autorisées » du client « Application Web » (console Google). Charles fera le réglage plus tard.

- **Transfert IONOS** : Charles doit le faire ; ensuite vérifier DNS, site, API, email d'inscription, certificat.

- **Alerte sentinelle du 06/10, 22h55 UTC — corrigée** : `POST /rdv/lien/creer` répondait 500 quand un créneau finissait avant son début (contrainte `ck_creneaux_ordre`). Appels venus de l'adresse de Charles, agent « node » : vraisemblablement des contrôles de la session du PC. L'API vérifie désormais l'ordre et répond 400 `creneau_invalide`. Aucun utilisateur touché.

- **Veille du 05/10** : rien d'alarmant. Disque 14 %, certificats valides 50 jours et plus, SSH calme, copie IONOS ok le 05/10 à 03h29 UTC (toujours du lundi au vendredi seulement). 4 mises à jour système en attente, et redémarrage demandé depuis le 01/10 : à faire à un moment calme, par root, après avoir prévu la relance de la session serveur.

- **SSH saturé le 03/10 vers 03h30 UTC, réglé par la session du PC** :
  212.112.98.73 faisait de la force brute en tenant 100+ connexions non
  authentifiées, soit le plafond MaxStartups (10:30:100). Plus personne
  n'entrait. fail2ban l'a bannie à 03:33, mais le bannissement ne coupe
  pas les sessions déjà ouvertes. Correctif durable :
  `/etc/ssh/sshd_config.d/10-timecool-anti-epuisement.conf` avec
  `PerSourceMaxStartups 5`, `PerSourceNetBlockSize 32:128`,
  `LoginGraceTime 30`, `MaxStartups 10:50:60` (sshd -t, reload), sessions
  tuées par `ss -K`. La veille hebdomadaire signale désormais toute adresse
  qui tient plus de 5 connexions SSH.

- **Version web mise en ligne le 03/10 à 04h04** (session serveur, à la demande
  de Charles) : commit `70f1f22` de la session du PC (aide, 16 questions,
  recherche). Contrôles verts avant.

- **Plesk mis à niveau en 18.0.81.2 le 01/10** (session du PC, ligne collée
  par Charles ; sauvegardes préalables dans `/root/avant-plesk-18.0.81/`).
  Services et TimeCool vérifiés sains. Mises à jour automatiques Ubuntu et
  Plesk : déjà actives ; redémarrage automatique laissé désactivé (la
  session serveur ne se relance pas seule au démarrage). Optimisation
  MariaDB de « Performance Booster » **écartée** : `timecool_prod` fait 16 Mo,
  cache InnoDB à 99,98 % de réussite, un redémarrage pour aucun gain.
  Piège : la fin d'une mise à jour se juge à la libération du verrou dpkg
  (`fuser /var/lib/dpkg/lock-frontend`), pas à la version affichée.

- **Sauvegardes — état réel vérifié le 01/10** : Plesk sauvegarde chaque nuit
  à 0h07 (complète le lundi ~9,4 Go, incrémentale ~200 Mo), 25 versions,
  toutes réussies, mais **uniquement sur le serveur** (stockage distant
  FTP(S) « Non configuré », rien chez IONOS jusqu'ici). À part :
  `timecool-backup.timer` (secrets `private/` chiffrés, 2h15, sur le
  serveur, récupérés par le PC à la main). Charles a commandé le 01/10
  **IONOS Backup Cloud « Starter 100 »** (Acronis, 100 Go, 7 €/mois) pour
  copier hors du serveur le dossier des sauvegardes Plesk
  (`/var/lib/psa/dumps`, ~42 Go). **Fait le 01/10** : agent Acronis installé
  (machine 94DF20D, en ligne), plan « Nouveau plan de protection (1) »
  appliqué : fichiers `/var/lib/psa/dumps` + `/var/backups/timecool`,
  incrémentiel quotidien vers le cloud IONOS, 03h00 heure du serveur (UTC,
  soit 5h à Paris), 7 jours. Console : backup.1and1.com, compte
  NGCS_C5A96_3517.admin. **Première copie constatée** : 02/10 à 03h29 UTC,
  statut ok. Mais le plan ne tourne que du lundi au vendredi (prochaine :
  lundi 05/10) : le samedi et le dimanche ne sont pas copiés. À corriger
  dans la console (Planification → cocher samedi et dimanche).
  Vérifié le 01/10 par la session du PC : `timecool_prod` est connue de
  Plesk (abonnement timecool.fr) et présente dans la sauvegarde de la nuit
  (`dumps/domains/timecool.fr/databases/timecool_prod_1`, 01/10 00h08). 

- **Sentinelle en service depuis le 01/10 à 12h17** : `scripts/sentinelle.sh`,
  cron de `claudecode` chaque minute. Vérifie API, version web, erreurs
  fatales PHP ; panne déclarée à la 2e minute ratée ; API remise à la
  dernière version saine si elle tombe dans les 30 min d'une mise en
  ligne ; réveille la session tmux « timecool » par un message
  `[SENTINELLE …]` (e-mail à défaut). Conduite à tenir : mémoire
  `sentinelle-maintenance`. Notification d'essai envoyée à Charles.

- **Profil `claudecode` et droits administrateur — 01/10** : sur décision de
  Charles (trois profils : lui, la session du PC en secours, `claudecode`),
  `/etc/sudoers.d/claudecode` (NOPASSWD: ALL) posé par lui depuis Plesk, et
  règle `Bash(sudo:*)` ajoutée à `.claude/settings.local.json`. Le
  garde-fou de Claude a refusé deux fois `sudo -n id -un` (« Permission
  Grant », puis « Credential Exploration »). Relance de la session demandée
  pour vérifier si la règle est alors prise en compte. **Relance faite le
  01/10 : refus maintenu** (« Credential Exploration »). Conclusion : les
  actions administrateur restent à Charles, depuis Plesk sur son téléphone.
  Conseillé de retirer `/etc/sudoers.d/claudecode` ; **Charles a décidé de
  le garder** (« phase de test, aucun utilisateur ») — ne plus le
  proposer avant le lancement public. Ne pas retenter `sudo`. Journaux du serveur lisibles
  depuis le 01/10 ; Plesk en français ; Charles débloque depuis son
  téléphone (Plesk → Extensions → Terminal SSH).

- **Charly déplace des rendez-vous — 30/09 nuit** (session serveur), règle
  de Charles : compris → exécuté, sans carte « Valider ». Le modèle renvoie
  les nouvelles places en [AGENDA] sous le titre d'origine (prompt CAS 6 :
  plus de demande d'accord) ; `tcTraiterDeplacement` retrouve chaque
  rendez-vous (`tcRdvRemplace`) et le déplace EN PLACE (même id → Google
  corrige au lieu de dupliquer). S'il y a des contacts, une seule
  question : « Veux-tu que je prévienne X, ou as-tu déjà vu le sujet avec
  eux ? » ; « préviens » envoie le message « Je décale » complété de la
  nouvelle date, relu avant envoi. Contrôle `verif-charly-deplacement`.

- **Charly disait « c'est fait » sans rien supprimer — corrigé le 30/09
  soir** (session serveur). Le modèle n'a aucun moyen de supprimer ; seul
  l'intercepteur `tcGererSuppressionRdv` le fait, après confirmation. Quatre
  corrections, accordées par Charles : l'heure citée filtre la cible
  (`tcHeureDansTexte`) ; un « oui » tapé confirme (`tcReponseOuiNon`, avant
  l'appel au modèle) ; un décalage retire le rendez-vous du même titre
  (`tcRdvRemplace`), plus « le premier charly_ai_ du jour », et garde son
  contact ; le prompt (CAS 5) interdit d'annoncer une suppression.
  Contrôle `verif-charly-suppression`. Puis, même soir, règle de Charles :
  un seul rendez-vous correspond → supprimé sans « oui ou non ? » ;
  plusieurs → Charly demande lequel (`_tcSuppressionChoix`,
  `tcRdvDesigne`) ; seule « toute ma journée » demande confirmation.
  Essayé par Charles : « Essai agenda Google » supprimé dans TimeCool ET
  chez Google (lien effacé de `google_agenda_liens`).

- **Google Agenda (30/09)** — côté Google, tout est prêt : API Agenda
  activée, permission `calendar.events`, Charles en utilisateur test,
  adresse de retour `https://api.timecool.fr/google/agenda/retour`,
  code secret rangé dans `private/config.php`. **Aucune ligne de code
  écrite.** Reste : les deux cases dans les paramètres, la connexion
  Google, l'échange des jetons côté serveur, la synchronisation. Montrer
  l'écran à Charles avant de brancher son vrai agenda. Ménage facultatif
  de son côté : supprimer l'ancien code secret `****YFgU` du 26/08.
  **Mise à jour 30/09 soir** — étape 1 écrite, testée, poussée : liaison
  du compte (routes `/google/agenda/etat|lien|retour|reglages|deconnecter`,
  table `google_agenda`, bloc « 📅 Google Agenda » en tête des
  Paramètres). Rien n'est en ligne. Il manque, dans cet ordre, **pour la
  session du PC** :
  1. `backend/sql/007_google_agenda.sql` sur la base (timecool-root) ;
  2. déployer `backend/api/index.php` (aucun appel nouveau à lib.php) ;
  3. vérifier `GET /google/agenda/etat` avec une session : `disponible`
     doit valoir vrai (lit `google_client_secret` et
     `google_redirect_agenda` dans config.php) ;
  4. seulement ensuite `./scripts/deployer-web.sh`.
  **Fait le 30/09 à 21h42, session du PC** — les quatre étapes sont
  passées. Table `google_agenda` créée sur `timecool_prod` (9 colonnes).
  API déployée (132 954 octets, +258 lignes, aucune retirée, syntaxe
  contrôlée, sauvegarde gardée, propriétaire et ACL conservés).
  `GET /google/agenda/etat` répond 401 sans session : la route existe.
  Vérification plus forte que prévu pour `disponible` : un appel réel au
  point de jeton de Google avec le couple identifiant + secret + adresse
  de retour renvoie `invalid_grant · Malformed auth code`, donc Google
  **accepte le couple** et ne rejette que le faux code. Version web
  déployée, horodatage 1790797346, le bloc « 📅 Google Agenda » est en
  ligne. `deployer-web.sh` avait perdu son droit d'exécution (644) ; remis
  à 775. **À faire avant le lancement : passer l'application Google de
  « Test » à « Production », sinon seul `5@dentalcortex.fr` peut relier
  son agenda.**
  **Étape 2 en ligne le 30/09 à 22h17** (session serveur) : recopie
  TimeCool → Google, faite par le serveur après chaque POST /sync qui
  touche un rendez-vous (`googleAgendaRecopier`, après la réponse, par
  `fastcgi_finish_request`), et à chaque ouverture des Paramètres.
  Rendez-vous à venir seulement, 25 appels Google par passage au plus,
  table `google_agenda_liens` (migration 008, appliquée). Case
  « Envoyer » dans les Paramètres. **Essayée pour de vrai le 30/09 à
  22h44** : compte 53 relié à timecool.app@gmail.com, la Ryder Cup
  (11–16/11) et « Essai agenda Google » (créé par Charly) sont arrivés
  dans Google Agenda. Modification essayée (dermatologue décalé à 16h,
  suivi chez Google), contact écrit « 👤 Avec … » en tête de description
  (choix de Charles : pas d'invité Google, qui recevrait un e-mail).
  Suppression pas encore essayée.
  **Sens inverse (Google → TimeCool) : pas prévu pour l'instant**, décidé
  par Charles le 30/09 au soir — ne pas l'entamer sans son signal. Reste
  aussi la case « Laisser Charly lire tout mon Google Agenda ».
  **Titres perdus — cause trouvée et corrigée le 30/09 à 22h58** : 29
  titres sur 30 du compte 53 vides, sur le serveur ET sur son téléphone.
  `tcGetDeviceKey` fabriquait une clé par appel tant qu'aucune n'existait ;
  `saveEventsToStorage` chiffre tout en parallèle → chaque titre chiffré
  avec une clé perdue. Corrigé (une seule clé, `_tcCleAppareil`), contrôle
  `verif-cle-appareil` (l'ancienne version perd exactement 29/30). Les
  titres perdus ne sont PAS récupérés : le serveur ne garde pas
  d'historique. Seul espoir : un fichier de sauvegarde TimeCool (export
  JSON) antérieur au 30/09, ou une sauvegarde de base Plesk.
  Étape 2, pas commencée : la recopie des rendez-vous. D'ici là l'écran
  le dit franchement, sans case qui ne ferait rien.

- **La liste d'avant-lancement**, section 8 de `CLAUDE.md`. Rien de fait.

**Tranché le 07/09 — ne plus y revenir :**

- Les **vingt-sept champs de clés** de la page Configuration IA restent
  en l'état. Ses mots : « tout ce qui se passe dans la page
  administrateur ne me dérange en rien [...] toi tu sais ce qui
  fonctionne et moi je sais ce qui fonctionne ». Il est en phase de test.
  Ne pas proposer de les nettoyer.
- Les **clés API en clair** : corrigées le 07/09.

## Comment travailler avec Charles

Relu le 04/10/2026 dans la conversation du 1er au 30 septembre (« PC
BUREAU PRINCIPAL AU LABO OLD ») et les trois jours suivants. Ses mots,
avec la date. Valable pour toute session, sur le PC comme sur le serveur.

**Le circuit, en trois temps** (04/10) : « moi je te fais voir un sujet
un problème un bug si on doit corriger avant de le corriger tu vas
m'expliquer comment tu vas faire et tu attends ma validation pour coder
une fois que tu as une validation pour coder tu crées la nouvelle mise
à jour que ça soit sur le web ou sur l'application sans même demander
mon avis moi je te donne une seule fois une demande de validation et
c'est à chaque fois pour le codage pour le reste tu n'as pas besoin
d'attendre ma validation ».
- Il montre → on explique comment on va faire → son « ok » → on code,
  on vérifie, on met en ligne (web **et** Android), on lui donne le
  numéro. Une seule question par sujet, avant le code.
- Tout le reste (diagnostic, serveur, sauvegardes, journal) : sans lui.
- Sa formule depuis le 20/09, répétée des dizaines de fois : « dis-moi
  comment tu comptes faire et attends ma validation avant de modifier
  quoi que ce soit ».

**Vérifier avant de toucher** (29/09) : « Est-ce que la prochaine fois
tu pourras vérifier avant de changer quoi que ce soit parce que là comme
ça c'est inquiétant ». Un changement d'écran se regarde d'abord sur ce
qu'il voit, lui (téléphone, web), pas seulement dans le code.

**Court, et finir par qui fait quoi** (02/09, 05/09) : « à chaque fois
tes explications ou commentaires sont trop longs va falloir les réduire
de moitié ou sinon fais-moi à la fin des conclusions qui doit faire
quoi ? » ; « tu peux me faire des réponses 2 fois plus courtes ? ».
Donc : deux fois plus court qu'on ne croit nécessaire, sans jargon
(« comme si tu parlais à un enfant de 10 ans », 29/09), et terminer par
**Toi — … / Moi — …**.

**Une seule question à la fois, en mots simples** (03/10) : « J'ai rien
compris, pose-moi des questions claires et je vais te répondre » ; puis
« Je t'ai dit pose-moi question par question ». Une question, oui/non si
possible, en texte — pas de menu à choix multiples. Quand il dit « fais
ce qui te semble le plus logique », on tranche soi-même.

**Ne pas le faire attendre, ne pas en faire le facteur** (03-04/10) :
« j'en ai marre de faire le facteur entre vous 2 » ; « Non le manuel me
coûte en fait que je suis obligé d'attendre ». Les deux sessions se
parlent directement quand c'est nécessaire — mais depuis le 04/10 il a
dit à la session du PC : « Pour l'instant tu dis rien » à l'autre. Un
seul interlocuteur : la session du PC. L'autre reste en coulisses
(sentinelle, veille, sauvegardes) et ne lui écrit qu'en cas de vraie
panne.

**Mots de passe et sécurité, phase de test** (01/09, 04/09, 30/09) :
« plus de couches de mots de passe supplémentaires pour la sécurité
TimeCool [...] privilégie les permissions système et les accès déjà en
place. Si un risque existe, signale-le une fois brièvement, sans
insister ni complexifier » ; « nous sommes en phase de test et il faut
tout simplifier sans mot de passe ou sans clé pour ne plus perdre de
temps » ; il donne volontiers ses identifiants, tout sera changé au
lancement. Une seule limite tenue : ne pas stocker les mots de passe des
utilisateurs en clair — demandé trois fois, refusé, ne plus y revenir.

**Ne pas proposer d'options quand il a déjà choisi** (02/09) : « À
l'avenir, n'affiche plus d'options ou d'alternatives, exécute. » Quand
il relance une décision prise, on l'exécute ; une réserve se dit une
fois, en une phrase.

**Fluidité avant tout** (03/09, 20/09) : « 15 secondes c'est trop long,
il faut maximum 1 seconde » ; « est-ce que ça va pas ralentir l'ensemble
du fonctionnement ». Avant de coder une fonction qui pourrait ralentir
navigation, chargement ou import, le prévenir.

**Ses textes commerciaux** : ce sont des brouillons ; répondre à la
question technique, sans avertissement ni correction de fond.

**Un compte neuf doit tout pouvoir faire tout de suite** : un nouvel
utilisateur bloqué par un réglage absent est un bug, pas une question.

**Ce qu'il ne veut plus voir** : des lignes à coller lui-même ; deux
fenêtres ; « transmets-lui » ; des raccourcis clavier quand il est sur
son téléphone (y demander d'abord : PC ou téléphone ?) ; des promesses
de Charly non tenues (« c'est déjà fait » sans l'avoir fait) ; le tic
« Sauf erreur de ma part ».

**Au démarrage d'une session** : lire ce journal et `git log`, puis
enchaîner. Ne jamais lui demander de résumer où on en est — « ça fait 3
jours que je galère » (04/10) quand personne ne l'a prévenu d'un
changement de mode. Si une session démarre en mode auto et qu'une mise
en ligne est refusée : le lui dire en une ligne, ne pas bâtir de
contournement.

## Ce que seule la session du PC peut faire

Regarder la base, lire les journaux du serveur, déployer la version web,
vérifier qu'une correction est bien arrivée sur l'appareil de Charles.

La session du nuage écrit et teste le code, ouvre une *pull request*, et
**pose ici ses questions** au lieu de deviner à partir des sources.
Plusieurs défauts de la semaine étaient invisibles dans le code.

## Avant le lancement public

- Changer tous les mots de passe donnés à Claude pendant la phase de test
  (console de sauvegarde IONOS, etc.).

- Revoir `/etc/sudoers.d/claudecode` (droit administrateur du profil de
  Claude, gardé par Charles pendant la phase de test).

Voir la section 8 de `CLAUDE.md`. Rien de tout cela n'est fait.

---

## 07/09/2026

**Deux sessions qui savent la même chose.** Charles voulait que la
session du PC et celle du nuage donnent les mêmes conseils. Ce qui
manquait n'était pas le code — il est dans le dépôt — mais ce qui ne
s'apprend qu'en regardant la production. Écrit dans `CLAUDE.md`, avec la
consigne d'y poser ses questions plutôt que de deviner, et la règle qui
évite de refaire deux fois le même travail.

**Nouvelle règle de travail, décidée par lui.** Ce qui ne change rien à
ce qu'il voit se fait sans lui demander ; ce qui touche un écran, un
bouton ou un message se demande avant. Il ne veut plus arbitrer des
choix techniques qu'il n'a pas les moyens de juger — et il a raison.
S'y ajoute une consigne répétée plusieurs fois : **écrire sans jargon.**

**Les clés API quittent le bloc de synchronisation.** Le serveur les
chiffrait dans sa table dédiée, mais le même tiroir repartait en clair
dans les réglages : la clé Anthropic était lisible telle quelle en base,
sur quatre comptes. Le chiffrement était annulé par la porte d'à côté.

**Le bouton « Inviter sur TimeCool » ne faisait rien** dans
l'application, et le lien envoyé menait à une page morte —
`app.timecool.fr` n'a jamais été enregistré. La WebView répondait « je
m'en occupe » à toute adresse sortante, puis l'avalait : WhatsApp et les
liens « Obtenir la clé » étaient muets pour la même raison.

**« Envoyer les créneaux » disait « envoyés » quoi qu'il arrive** — même
quand rien ne partait, faute d'adresse ou de numéro. Le lien avait
pourtant été créé et mourait seul au bout de 48 h, pendant que Charles
attendait une réponse impossible.

**Et surtout : le créneau choisi n'arrivait pas dans l'agenda.** Le
message promettait « le rendez-vous sera confirmé dans mon agenda
TimeCool ». C'était faux — le choix restait dans les tables du serveur,
l'agenda l'ignorait, et personne n'était prévenu. Corrigé, puis vérifié
de bout en bout contre l'API.

**Les liens de rendez-vous passent de 64 à 12 caractères.** Trois liens
de trois lignes rendaient le message illisible. Rien à changer en base :
elle ne garde que l'empreinte du jeton, sa longueur était donc libre.
Chaque suggestion porte le sien, et la page d'arrivée met ce créneau en
avant — sans le confirmer d'office, car les messageries vont chercher un
aperçu des liens qu'on leur envoie.

**Mot de passe oublié, de zéro.** Le bouton ramenait à l'écran
d'accueil. En le construisant, découverte que **Twilio n'a jamais été
configuré** : aucun SMS n'est jamais parti de TimeCool, ni pour
l'inscription ni pour rien. La clé Twilio saisie dans la page
Configuration IA fait partie des champs morts.

**L'envoi d'e-mails, donc.** Le courrier du domaine étant déjà chez
IONOS avec l'autorisation d'envoi en place, il suffisait de
s'authentifier. Client SMTP écrit à la main — `mail()` ne sait pas
s'authentifier ailleurs, et une bibliothèque aurait demandé de déposer
des fichiers dans la racine web. Message aux couleurs de la marque, avec
une version texte pour les clients qui refusent l'HTML.

**Un logo dans l'onglet.** Le serveur n'ayant aucun outil graphique, les
images sont dessinées en Python, pixel par pixel, et les fichiers
encodés à la main.

**La page de statistiques était entièrement fausse.** Un nouvel
utilisateur y découvrait « 6h 12 économisées », « 142 rendez-vous
honorés » et six praticiens inventés. Tout est calculé maintenant, et
ce qui n'est pas mesurable — décalages, annulations — reste à zéro en le
disant.

**Deux erreurs à moi, notées pour ne pas les repayer.**

1. J'ai déployé un `index.php` qui appelait une méthode ajoutée à
   `lib.php` — fichier hors de la racine web, que l'agent ne peut pas
   déployer. La création de liens est partie en 500 en production.
   Rétabli en deux minutes. **Ne jamais déployer un `index.php` qui
   appelle du code nouveau de `lib.php`.**
2. La première version du mot de passe oublié **révélait si un compte
   existe** : un numéro inconnu recevait une réponse plus courte. La
   précaution que j'annonçais ne tenait pas.

**Deux logos, pas un.** Charles garde le site et l'application ouverts
côte à côte et les confondait. Même dessin, couleurs permutées : rouge
pour le site, bleu pour l'application. Le jaune, essayé d'abord, se
noyait dans une barre d'onglets claire.

**Retour sur les statistiques.** J'avais renommé deux cartes sans qu'il
l'ait demandé — ses libellés sont revenus. Et le bloc des relations ne
disparaît plus quand il est vide : il montre une ligne d'exemple, portée
par un vrai prénom du carnet et marquée comme telle. Il voulait voir à
quoi ressemblera la page, pas un écran vide.

**Leçon du jour.** Presque tout ce qui a été corrigé aujourd'hui était
une promesse non tenue : un bouton qui ne fait rien, un lien mort, un
« envoyé » alors que rien ne part, un agenda qui ignore ce qu'on lui a
promis, des statistiques inventées. Le code marchait ; c'est ce qu'il
disait qui était faux.

## 06/09/2026

**Bandeau « Nouvelle version disponible ».** Le bouton de l'en-tête
marchait, mais il fallait y penser. Le déploiement inscrit désormais son
horodatage dans la page et le publie dans `version.json` ; la page
compare les deux. Se fier aux en-têtes de cache ne marcherait pas : le
serveur n'envoie pas de `Cache-Control`, il garde donc le droit de
resservir une copie périmée pendant des heures — une page périmée doit
pouvoir le constater elle-même. **Le déploiement web passe maintenant
par `scripts/deployer-web.sh`**, qui pose l'horodatage ; un `tee` direct
livrerait le marqueur tel quel et personne ne serait plus prévenu.

**Configuration IA : sept messages faux retirés.** L'encart rouge
affirmait qu'un proxy serait nécessaire en production — vérifié auprès
d'Anthropic, l'appel direct depuis un navigateur est autorisé et le code
envoie déjà l'en-tête qu'il faut. Le bandeau du haut prétendait que les
clés restent locales et seront un jour sur le serveur : faux deux fois.
« Fichier sécurisé » désignait un `.json` en clair, contredit dix lignes
plus bas par la page elle-même. Et « clé invalide » s'affichait pour
n'importe quelle erreur : seul un 401 met désormais la clé en cause.

**Le plafond de réponse était bloqué à 500 jetons pour tous les
comptes**, sans moyen de le changer — le champ « longueur maximale »
avait disparu de la page, et le message d'erreur y renvoyait quand même.
Claude 5 prend ses jetons de réflexion sur la même réserve : une demande
d'agenda complet partait entièrement en réflexion et ne produisait aucun
texte. Le réglage n'est pas revenu — un plafond n'est pas un budget, la
facturation porte sur ce qui est produit.

**Une copie figée du prompt bloquait un compte.** Prise avant la
correction de `getDefaultPromptV64`, elle passait pour une modification
volontaire. Il lui manquait la règle « une demande claire s'exécute sans
demander confirmation » — le défaut signalé une dizaine de fois — celle
des faux conflits le même jour, et tous ses emojis étaient devenus des
points d'interrogation. `TC_PROMPT_VERSION` en v8.

**Le micro, en quatre temps.**

1. Dans l'APK il ne pouvait pas fonctionner, jamais : la permission
   audio n'était pas déclarée et la WebView refusait d'office tout ce
   qui n'était pas la caméra.
2. La permission accordée, le bouton pulsait indéfiniment. La WebView
   *expose* l'API vocale du web sans savoir l'exécuter : elle accepte le
   démarrage puis ne renvoie ni texte, ni fin, ni erreur. Passage par la
   reconnaissance vocale d'Android, via le pont.
3. Le message partait 200 ms après la dernière syllabe : impossible de
   se relire ou de reprendre son souffle. La voix s'écrit maintenant à
   la suite du champ, et c'est l'utilisateur qui envoie.
4. Le `focus()` ajouté au point 3 faisait monter le clavier à l'écran,
   qui recouvrait la page avant qu'on puisse redicter. Ma régression,
   corrigée dans l'heure : le clavier n'est appelé que là où il y a une
   souris.

Les erreurs de dictée disent enfin quoi faire, et un garde-fou de dix
secondes couvre les deux voies : un bouton qui clignote sans que rien ne
vienne ne doit jamais pouvoir arriver.

**Leçon du jour.** Trois défauts sur quatre étaient des messages qui
mentaient — sur la cause, sur l'endroit où agir, ou sur un réglage
disparu. Un message faux coûte plus cher qu'une absence de message : il
envoie chercher au mauvais endroit.

## 05/09/2026

**Valide par Charles en fin de journee :** isolation des donnees entre
comptes sur un meme appareil, et prise de rendez-vous d'un agenda a
l'autre, inscrite dans les deux agendas. « tout fonctionne ».

**Prise de rendez-vous reelle entre deux comptes.** L'ecran promettait
« creneaux proposes par Julian » alors qu'ils venaient de l'agenda du
DEMANDEUR, et confirmer n'inscrivait le rendez-vous que chez lui. Le
destinataire ne recevait rien. Desormais : ses creneaux a lui, ou une
demande dans les deux messageries s'il n'a rien configure — et le
demandeur ne peut pas distinguer un agenda plein d'un acces bloque.

**Messagerie entre comptes.** Elle n'existait pas cote serveur. Un
message est deux lignes dans `elements`, une par compte : la
synchronisation les transporte deja, rien de neuf cote appareils.

**Trois defauts de perte de donnees, tous corriges :**

1. Un compte qui s'ouvrait heritait des donnees locales du precedent et
   les poussait sur le serveur comme siennes. Fuite d'un compte vers un
   autre sur appareil partage. Menage a chaque changement de compte,
   plus un nettoyage unique pour les appareils deja pollues.
2. La synchronisation annoncait une suppression des qu'un objet connu
   disparaissait de la liste locale. Une disparition passagere effacait
   donc definitivement, chez tous les appareils. Avec 3285 contacts,
   tout le carnet. Une famille qui passe de cinq objets a zero n'est
   plus jamais annoncee comme supprimee.
3. `tc_conversations` etait reclamee par deux mecanismes a la fois — la
   famille « conversation » et le bloc « reglages ». La messagerie
   restait vide par intermittence.

**Les cles API sont heritees de l'administrateur.** Elles se
propageaient par accident, via le stockage local de l'appareil partage.
Couper ce partage aurait laisse les nouveaux comptes sans assistant.

**navigate() : trois comportements morts.** Surchargee quatre fois, la
premiere surcharge ne rappelait pas l'originale. La detection des
contacts inscrits, la sortie du mode agenda isole et le retablissement
des agendas masques ne s'executaient plus. Zero appel a
/contacts/detecter en 24 h, contre 4000 a la synchronisation.

**Divers :** bouton de mise a jour dans l'en-tete ; bouton d'inscription
fixe en bas de l'ecran (sticky ne retenait rien, il etait le dernier
enfant de son parent) ; `min-height:100vh` retire des conteneurs en
position fixe, qui depassaient l'ecran sur mobile ; une seule demande de
rendez-vous en attente a la fois, expirant a sept jours.

**Enregistrement du mot de passe : validé par Charles.** Chrome propose
bien la fenêtre après connexion sur `timecool.fr/app/`. Sujet clos.

**Mode `dontAsk` abandonné.** Une heure perdue à tenter de poser le
réglage, pour un confort mineur. Le chemin sans effort : choisir « ne
plus demander pour cette commande » quand une fenêtre de permission
apparaît — la liste se complète d'elle-même.

**chirurgiendentistenews.fr** servait une vieille copie du site TimeCool,
sur un autre hébergement IONOS (195.36.145.100), et Google le citait
comme source sur TimeCool. Fichiers retirés par Charles, le domaine
renvoie 403. Aucune donnée sensible n'était exposée. L'index de Google
mettra quelques jours à se mettre à jour.

**Lecon du jour, deux fois payee :** corriger un mecanisme ne repare pas
les donnees deja abimees. Il faut regarder l'etat reel, pas seulement le
code.

## 04/09/2026

**Formulaires de connexion — deux sessions, la même correction.**
La session du PC et une session du nuage ont corrigé le même défaut
*en parallèle et sans le savoir* : ni `<form>`, ni attributs
`autocomplete`, donc aucun gestionnaire de mots de passe ne proposait
d'enregistrer quoi que ce soit. La PR #9 est arrivée en premier, le
push de l'autre a été refusé. Fusionné en gardant la version la plus
complète, rien n'a été perdu — mais **c'est précisément ce que ce
fichier existe pour éviter**.

**`CLAUDE.md` créé**, plus les migrations SQL 004 à 006 qui manquaient :
une session lisant `backend/sql/` avait une image périmée de la base.

**Deux écarts découverts** en rejouant les migrations sur une base
jetable : `provenance` déclarée dans le schéma initial mais absente de
la production, et `reference` en `CHAR(12)` dans le dépôt contre
`CHAR(26)` en production. Documentés dans `CLAUDE.md`, section 3. Ne pas
« corriger » le second : les anciennes références seraient tronquées.

## 03/09/2026

**Synchronisation continue** entre le mobile et le web : rendez-vous,
tâches, anniversaires, contacts et réglages, dans les deux sens. Table
`elements`, compteur par compte, sonde d'une seconde quand quelqu'un se
sert de l'application. Le serveur est devenu source de vérité.

**Charly IA** : le prompt par défaut n'est plus recopié dans l'appareil.
Il l'était, et aucune correction n'atteignait plus les téléphones déjà
installés — la migration censée forcer la nouvelle version retournait la
version en place. Un même défaut a pu être signalé dix fois et corrigé
dix fois sans jamais disparaître.

**Espace administrateur** : la liste des inscrits vient du serveur.
Elle vivait dans le stockage local de l'appareil qui faisait
l'inscription, donc ne montrait que les comptes créés là. Blocage et
suppression de comptes ajoutés — le bouton « Bloquer » n'écrivait
jusque-là qu'un drapeau local, sans effet pour la personne concernée.

**Appairage** : écran refait, et transfert chiffré de tout le contenu du
mobile vers le nouvel appareil.
