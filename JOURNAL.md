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

## 10/10/2026 (session adjointe) — le TYPE d'un rendez-vous (étape 1)

**Codé et commité sur main, PAS publié.** Il y a du SQL (migration 010) et du serveur : la migration d'abord.

- Trois types : `telephone` | `physique` | `visio` (« 📞 Par téléphone » · « 🤝 En personne » · « 🎥 En visio »).
  Pas de lieu, de lien visio ni de durée dans cette étape.
- **Migration `backend/sql/010_type_rendez_vous.sql`** : `rdv.type ENUM('telephone','physique','visio') NULL`,
  ajoutée seulement si elle manque (rejouable). À passer AVANT de déployer l'API : `/rdv/demander` écrit
  la colonne.
- Serveur : `/rdv/demander` (champ `type`, gardé sur la ligne rdv, repris si la demande est reprise),
  `/rdv/choisir` et `/rdv/proposer-creneau` (le choix du titulaire prime) l'écrivent dans les DEUX agendas
  (champ `type` de l'élément rdv) et le disent : « Rendez-vous confirmé par téléphone : … » ;
  `/rdv/groupe/proposer` et `/confirmer` : `type` dans le corps, « physique » par défaut. La demande :
  « …sur TimeCool, par téléphone. Tu me proposes un créneau ? ». Sans type : textes et agendas comme avant.
- Application : fiche contact (trois pastilles + « Annuler » avant d'appeler le serveur), fenêtre
  « Proposer un créneau » (pastilles en haut, pré-sélection = le type demandé), formulaire de rendez-vous
  (création : « En personne » pré-sélectionné ; modification : seul un type choisi s'écrit), icône devant
  le titre (semaine, jour, fiche) pour les rendez-vous qui portent un type ; sans type : aucune icône.
- Charly : ligne [AGENDA] à 7e champ facultatif (rétrocompatible), mots reconnus (« appelle-moi », « par
  téléphone », « en visio », « visioconférence », « on se voit », « chez toi/moi », « en personne »),
  prompt `v11-type-rdv`. Rendez-vous à plusieurs sans type dit : une question « Par téléphone, en personne
  ou en visio ? ». Rendez-vous ordinaire sans précision : aucun type, aucune question.
- Suites : `verif-type-rdv` (nouvelle) ; `verif-type-rdv-e2e` vise l'API EN LIGNE, rouge tant que la
  migration et l'API ne sont pas passées.

## 10/10/2026 (session adjointe) — vocabulaire calme + formulaire « Nouveau contact »

**Codé et commité sur main, PAS publié.** Page seulement ; aucun texte serveur concerné.

- Vocabulaire : « réserver seul / réservent seuls / sans ton accord » ont disparu de toute l'application
  (page Contacts, Mes disponibilités, fiche contact, fenêtres « douceur » et « Tu es protégé », Choisir qui,
  panneau « Classer … ? »). Remplacé par « prendre rendez-vous directement » ; « Tu es protégé » dit
  « Chaque demande de rendez-vous passe par toi. » ; « Mon temps libre » : « aucun rendez-vous ne peut
  m'être proposé, sauf par les contacts que j'autorise ». La case « Toujours attendre ma validation… »
  ne change pas. **GARDE-FOU** dans `verif-vocabulaire-formulaire` : la page ET l'API ne doivent plus
  contenir ces formes (insensible à la casse et aux accents) ; il tourne à chaque livraison.
- Fiche contact : « Ce contact fait partie de : » (cinq pastilles), case « Peut me joindre même pendant mon
  temps libre » (la catégorie « personnel »), phrase grise « Sans choix, ses demandes de rendez-vous
  arrivent dans ta messagerie. » La légende « heures retenues » et la ligne rouge ont disparu.
- Formulaire « ➕ Nouveau contact » (bouton « + Ajouter ») et « ✏️ Modifier le contact » (menu ⋮ de la
  fiche) : panneau centré, prénom + nom, mobile avec indicatif, e-mail, adresse avec propositions,
  pastilles, case « temps libre ». Seul un prénom ou un nom est obligatoire. La fiche est créée sans
  marque d'import (donc « récente »). Le même formulaire, pré-rempli, met à jour la fiche (ses autres
  champs sont gardés ; si le mobile ou l'e-mail change, le lien avec un compte est refait).

## 10/10/2026 (session adjointe) — « Mon profil » en cartes

**Codé et commité sur main, PAS publié.** Page seulement.

- Page Mon profil (compte particulier) : en-tête compact d'environ 90 px (avatar, nom en gras, ville,
  « Profil protégé »), puis huit cartes (Identité, Coordonnées, Santé, Identité légale, Bancaire,
  Profession, Famille, Compte) en grille : deux colonnes dès 700 px, une sur téléphone.
- Un champ par ligne : libellé gris à gauche, valeur à droite ; une valeur longue (plus de 26 caractères)
  se replie sous le libellé. Champ vide : « — » gris clair. Carte entièrement vide : « Rien pour
  l'instant » + « Compléter ». La carte Compte (date, identifiant) n'a ni crayon ni « Compléter » et
  disparaît si elle est vide. Les champs saisis sont maintenant échappés.
- **Il n'existe pas encore d'édition du profil** : le crayon et « Compléter » affichent « La
  modification de ton profil arrive dans une prochaine version. » (tcModifierRubrique : c'est elle qu'il
  faudra brancher). Décision sensible à prendre avant (santé, IBAN, pièces d'identité : stockés où ?).
- Les profils pro (démo) ne changent pas.
- Suite : `verif-profil-cartes` (nouvelle).

## 10/10/2026 (session adjointe) — « 🆕 Mes contacts récents (N) »

**Codé et commité sur main, PAS publié.** Page seulement, aucun changement serveur.

- Sur la page Contacts, un bouton « 🆕 Mes contacts récents (N) » à GAUCHE de « 👥 Mes contacts TimeCool »,
  même ligne, deux moitiés (flex, 8 px, l'un sous l'autre si l'écran est étroit) ; toujours visible, avec
  « (0) » quand il n'y a personne. Exclusif avec TimeCool, la lettre, la catégorie et la recherche ;
  un second toucher revient à la vue normale.
- « Récent » = ajouté UN PAR UN dans les 30 derniers jours (`createdAt`) : à la main, par « ➕ Ajouter à mes
  contacts », par « ajouter aux contacts » d'un lieu, ou automatiquement à la proposition d'un créneau
  (le serveur pose déjà `createdAt` : rien à changer côté serveur). L'import du téléphone (`tcContactsRecus`)
  marque ses fiches `origine:'telephone'`, les contacts d'exemple `origine:'exemple'` : jamais récents.
  Les fiches importées avant la marque : toute fiche d'une « rafale » (plus de 20 fiches la même minute)
  est exclue, donc un nouvel import ne fait pas remonter tout le carnet.
- La vue des récents : du plus récent au plus ancien, « Ajouté le 10/10 » sous le nom, même fiche
  (pastilles, menu).
- Suite : `verif-contacts-recents` (nouvelle).

## 10/10/2026 (session adjointe) — savoir QUI m'écrit

**Codé et commité sur main, PAS publié.** Il y a du serveur (API) : à publier avec le web et l'APK.

- Quand une demande de rendez-vous part en messagerie, le serveur joint au message « demande_rdv » les
  coordonnées d'inscription du demandeur (`demandeur` : prénom, nom, téléphone, email, cree_le), chez le
  TITULAIRE seulement, et seulement si le demandeur n'est pas dans son carnet (`identiteDemandeur`, même
  règle que `ficheContactDe`). Le demandeur ne reçoit rien sur le titulaire.
- Messagerie : carte d'identité dans le cadre « Demande de rendez-vous » (nom, téléphone, email, « sur
  TimeCool depuis le … », « Pas dans tes contacts »), bouton « ➕ Ajouter à mes contacts » : crée la fiche
  (sans catégorie) puis propose de la classer (5 catégories, « Plus tard »). La carte disparaît dès que
  la fiche existe.
- /rdv/proposer-creneau : une personne hors carnet entre dans le carnet dans la même transaction (sans
  catégorie : elle reste en messagerie pour la suite) et le rendez-vous est rattaché à sa fiche. Pas
  d'ajout automatique sur « Refuser et bloquer » (la fiche bloquée existe déjà, sans téléphone ni email).
- Texte de la demande : « Salut {prénom} 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool. Tu me
  proposes un créneau ? Merci ! ».
- Suites : `verif-qui-ecrit` (nouvelle) ; `verif-qui-ecrit-e2e` vise l'API EN LIGNE, rouge tant qu'elle
  n'est pas déployée.

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
- **Veille du 19/10** : copie IONOS réussie le lundi 19/10 à 05h29 (heure de Paris), TimeCool répond, aucune nouvelle panne depuis celle du 06/10. Disque 14 %, certificats 36 et 39 jours (renouvellement automatique). Seule alerte : redémarrage demandé depuis 13 jours (trois nouveaux noyaux Linux et libc6 en attente) — à faire par root à un moment calme, puis relancer la session serveur.

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

## 10/10/2026 (session adjointe) — Premier jour de la semaine

**Codé et commité sur main, PAS publié.** Page seulement : ni serveur, ni SQL.

- Paramètres → Affichage, sous « Plage horaire de ma journée » : « Premier jour de la semaine »
  (Lundi par défaut, Dimanche, Samedi), même style que les autres lignes (« Modifier › » + fenêtre centrée).
  Clé `tc_premier_jour_semaine` ('1' | '0' | '6'), synchronisée avec les autres réglages (pas dans
  `TC_SYNC_DEJA_SYNCHRONISE`). Lue en direct dans le stockage : un réglage reçu d'un autre appareil agit tout de suite.
- Suivent le réglage : la vue semaine (colonnes, noms, « aujourd'hui », jours fermés du mode pro qui restent
  jeudi/samedi/dimanche), la grille du mois (en-têtes, premières cases), le panneau du mois (lettres, rangées,
  numéro de semaine de chaque rangée = celui de son lundi).
- Ne bougent pas : « Mes disponibilités » (L M M J V S D), les calculs du serveur, le numéro de semaine ISO
  (sous le titre : celui du lundi de la semaine affichée), Charly (« cette semaine » reste du lundi au dimanche).
- Suite `verif-premier-jour-semaine` (lundi/dimanche/samedi : ordre des en-têtes, première date de 70 semaines,
  changement de mois et d'année, 1er janvier, 29 février, aucun jour sauté ni doublé, « aujourd'hui » dans la bonne colonne).

## 11/10/2026 (session adjointe) — Déplacer un rendez-vous au doigt

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Appui long (500 ms) sur un rendez-vous de la vue Jour ou Semaine : il se soulève (ombre, léger agrandissement).
  On le glisse : il s'aimante sur des pas de 15 minutes, et de jour en jour dans la vue Semaine (limité à la
  semaine affichée, à 0h00–23h59). Une étiquette dit le jour et l'heure visés. Même geste à la souris.
- On relâche : déplacé, même durée, message « Déplacé vers vendredi 9 octobre, 12h15 — Annuler » pendant 6 s.
  « Annuler » remet l'ancien horaire (retrouve le rendez-vous par son identifiant si la synchro a remplacé l'objet).
  Un simple toucher ouvre le rendez-vous comme avant ; glisser puis revenir au même créneau ne fait rien.
- Écriture : la même sauvegarde que la fiche (`saveEventsToStorage`) : la synchro et Google suivent, pas de nouveau chemin.
- Rendez-vous pris avec un autre compte (`tc_rdv_…`, `tc_grp_…`) : il ne bouge PAS. Le geste ouvre « Je décale » :
  le message de prévenance propose le créneau visé (« … Voici ce que je peux te proposer : jeudi 8 octobre à 16h15. »),
  puis la modification s'ouvre déjà placée sur ce créneau. Le rendez-vous ne change qu'à l'enregistrement.
- Pendant le geste : glissement de semaine et tirer-pour-rafraîchir coupés ; défilement bloqué sur ce bloc seulement ;
  aucun écouteur sur le document hors geste ; un seul style (transform) écrit quand le créneau visé change.
- Pas de nouveau réglage. Journées entières, périodes et rendez-vous de démonstration ne se déplacent pas.
- Suite `verif-deplacer-au-doigt`. Piège rencontré : `tcAppliquerDeplacement` existait déjà (déplacement par Charly) ;
  la fonction du geste s'appelle `tcEcrireDeplacementDoigt` et la suite vérifie qu'aucun nom n'est pris deux fois.

## 11/10/2026 (session adjointe) — Toutes les flèches retour ramènent d'où l'on vient

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Une pile courte des écrans (`_tcPileEcrans`) : à chaque `navigate()` l'écran quitté est retenu (dix au plus, jamais
  deux fois le même de suite, un redessin du même écran n'empile rien). Une seule fonction, `tcRetour()` : elle remonte
  d'un écran, n'empile pas l'écran que l'on quitte (pas d'allers-retours), et retombe sur l'agenda si la pile est vide
  ou si l'écran n'existe plus. Le menu latéral n'est pas un écran : il n'entre pas dans la pile.
- Passent maintenant par `tcRetour()` : le parcours guidé de Charly (avant : toujours l'assistant), l'assistant (avant :
  toujours l'agenda), le bouton « Annuler » du parcours guidé, les pages légales hors authentification (avant :
  l'agenda ou les paramètres, écrits en dur), Google Agenda, et la dernière étape de l'import (qui l'utilisaient déjà).
- La conversation garde `tcRetourDepuisConversation` (la fiche contact reste l'origine) ; la pile ne retient pas
  « conv » : de la fiche, la flèche suivante va à l'agenda et non à la liste des messages.
- Le parcours guidé et l'agenda isolé contournent `navigate()` : ils retiennent eux aussi l'écran quitté.
- Exceptions gardées, à point de départ fixe : les 6 écrans d'authentification (`navigateAuth`, parcours linéaire avant la
  connexion, hors de `navigate()`), et les pages légales ouvertes depuis l'authentification.
- Non traité (natif, pas la page) : la touche retour matérielle d'Android appelle `webView.goBack()` ; l'application
  ne pousse rien dans l'historique du navigateur, elle quitte donc l'application.
- Suite `verif-retour-partout`.

## 11/10/2026 (session adjointe) — Tout rendez-vous de moins d'une heure sur une demi-case

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Vues Semaine ET Jour : durée < 60 min → hauteur = la moitié d'un rendez-vous d'une heure (21 px sur 42), quelle que soit
  la durée (15, 30, 45, 59 minutes : la même hauteur, pas de proportion : Charles l'a refusée). Le bloc part de
  l'heure de début. Une heure ou plus : inchangé. Une seule fonction, `tcHauteurBloc`, qui réutilise l'ancienne hauteur
  minimale de 42 px (c'était déjà la hauteur d'un rendez-vous d'une heure) sous le nom `TC_BLOC_HAUTEUR_HEURE`.
- Le texte tient dans 21 px : vue Semaine, deux lignes compactes (titre 9 px, horaire 8 px) ; vue Jour, une seule ligne
  « titre · 14:00 – 14:15 ». Titre tronqué par des points de suspension si besoin, jamais coupé en hauteur.
- Le déplacement au doigt est inchangé : l'aimantation se calcule sur la vraie durée (heures de début et de fin),
  l'échelle en pixels par minute n'a pas bougé.
- Deux rendez-vous courts qui se suivent (14h00-14h15, 14h15-14h30) : il n'existe pas de règle de chevauchement dans
  l'agenda (des rendez-vous qui se croisent se superposent, même pour deux d'une heure) : ils se superposent de 10 px,
  le second recouvre le bas du premier. Rien n'a été inventé pour cela.
- Suite `verif-bloc-demi-case` ; `verif-horaires` (règle « 42 px minimum » devenue « une heure = 42 px ») et
  `verif-deplacer-au-doigt` (charge la nouvelle fonction) mises à jour.

## 11/10/2026 (session Codeur) — Campagne 1 sur v2.0.317 : trois défauts de la session Testeurs

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Fiche contact → « Envoyer un message » : retrouve la conversation du serveur (référence du compte de la fiche,
  puis le nom, casse ignorée) au lieu d'en créer une vide ; avatar « BC », les 2 messages. Nouvelle fonction
  `tcConversationDuContact`. Sans conversation : une locale est créée ; si la fiche est un compte TimeCool, elle porte
  sa référence (`reference`, `serveur`) : le premier message part par le serveur, et dès que la synchro rapporte la
  conversation, `tcConversationsAffichables` les fond en une seule (ce qui avait été écrit dans la locale passe devant).
  `tcConversationParId` retrouve la conversation du serveur depuis l'ancien identifiant local (l'écran ouvert ne se
  vide pas) ; après un envoi, `sendConvMessage` rouvre `srv_<référence>`.
- « Mes contacts récents (N) » : les fiches `blocked` (créées par « Refuser et bloquer ») ne comptent plus.
- Avatar d'en-tête : `tcMajAvatarEntete()` est appelée dès `showWelcomeSplash` (chemin de toutes les connexions :
  mot de passe, Google, biométrie, appairage) et dans `hideAuthFlow`. Plus de « JD » après connexion.
- Suites : `verif-conversation-fiche` (nouvelle, dans verifier.sh), `verif-contacts-recents` complétée (fiche bloquée).
  Les deux échouent sur la page d'avant. Sonde Chrome 390 sur page locale : JD → AV, conversation Basile = BC + 2 messages,
  une seule ligne Basile, une seule ligne Clémence après synchro (avant correctif : JD, 👤 vide, deux lignes).
- Limite : le repli par e-mail/téléphone demandé n'existe pas — la conversation du serveur ne porte que la référence et
  le nom, pas les coordonnées de l'autre. La référence de la fiche (cas normal d'un compte TimeCool) et le nom suffisent.
- Piège vu en passant, non traité (hors mission) : `showAppAfterAuth()` est appelée (connexion Google « démo »,
  ~ligne 14836) mais n'est définie nulle part.
- Correctif apres examen (homonyme) : le nom ne sert de repli que si la fiche n a pas de reference, ou si la conversation trouvee n en a pas ; une ancienne conversation locale reprise recoit la reference du compte et passe par le serveur. Reserve notee : une locale serveur:true vide ne s archive pas tant qu aucun message n est parti.

## 11/10/2026 (session Codeur) — Un contact bloqué ne laisse plus aucune trace (« silence »)

**Codé et commité sur main, PAS publié. API À DÉPLOYER** (`backend/api/index.php`), page aussi. Pas de SQL.

- Avant : Clémence, bloquée par Armelle (« Refuser et bloquer »), redemandait un rendez-vous : `/rdv/demander` ne
  reprenait que les demandes « attente », la précédente étant « refuse » il en créait une nouvelle et déposait un second
  « demande_rdv » chez Armelle : la carte « Proposer un créneau / Refuser et bloquer » revenait.
- API : `fichesDe($titulaireId, $personne)` (les fiches qui désignent une personne : téléphone, e-mail ou référence de
  compte ; une seule détection, reprise par `categoriesPourPrendreRdv`) ; `demandeurBloque()` = bloquée sur l'une de ses
  fiches, bloquée partout. Dans `/rdv/demander`, AVANT toute écriture : bloquée → rien n'est créé chez le destinataire
  (ni rdv, ni message, ni notification) et la réponse est mot pour mot celle d'une première demande ordinaire
  (`reponseDemandeEnMessagerie()`, désormais la seule source du texte, utilisée aussi par le chemin ordinaire ; `rdv: 0`).
  La demandeuse garde l'écho de sa demande dans SA messagerie (`messagePoser(..., $chezExpediteurSeulement = true)` :
  côté « me » seulement, sans traduction) : la page l'y envoie chercher, et une messagerie vide aurait trahi le blocage.
  `/rdv/choisir` (409 neutre) et le rendez-vous à plusieurs (« sans accès ») passaient déjà par `categoriesPourPrendreRdv`
  : rien n'y est écrit, inchangés. Le lien public (`/rdv/lien/*`) ne concerne pas un compte demandeur : hors sujet.
- Page : fiche bloquée « Accès bloqué. Ses demandes de rendez-vous ne t’arrivent plus, et il ne le sait pas. Clique sur
  Débloquer l'accès pour le débloquer. » ; message fugace du blocage « ses demandes de rendez-vous ne t’arrivent plus ».
  Le bouton « Débloquer l'accès » existait (menu ⋮ de la fiche, `toggleContactBlock`) et marche : rien d'inventé.
- Suites : `verif-blocage-silence` (PHP exécuté : bloquée sur une fiche parmi deux, débloquée, par e-mail, par référence ;
  routes ; page), dans verifier.sh ; 14 KO sur l'API et la page d'avant. `verif-blocage-silence-e2e` écrite, PAS dans
  verifier.sh (il lance les e2e contre l'API en ligne : rouge tant que l'API n'est pas déployée) : 5 KO aujourd'hui contre
  l'API en ligne (la carte revient), à relancer après déploiement puis à enregistrer. Suites adaptées : `fichesDe` chargée
  par verif-acces-agenda, verif-contacts-classes, verif-temps-protege, verif-validation-rdv ; deux contrôles de
  verif-validation-rdv (texte en dur de la route → `reponseDemandeEnMessagerie`, détection → `fichesDe`) ; la phrase citée par
  verif-vocabulaire-formulaire.
- Non fait, à trancher : la phrase de « Mes disponibilités » (« …ou un contact bloqué, passe toujours par ta messagerie »,
  écran validé le 10/10) est devenue fausse ; `/messages/envoyer` d'une personne bloquée arrive toujours (hors mission).
- Limite : un deuxième clic d'une personne bloquée rend la réponse de première demande (pas celle de « reprise »), faute
  de demande en attente à reprendre.
- Correctif après examen : au deuxième clic d'une personne bloquée, même chose qu'une demande ordinaire déjà en attente
  (`echoDemandeRecent` : son dernier message vers cette personne est déjà l'écho de la demande, de moins de
  `rdv_demande_jours` jours → rien de réécrit, réponse de « reprise ») ; l'écho et la réponse portent l'identifiant de
  sa dernière demande vers cette personne (celle refusée) et le genre, comme l'ordinaire ; fiche : « et cette personne ne
  le sait pas » (formule neutre). La limite « deuxième clic » notée plus haut n'existe plus.
- Déploiement du 11/10 retiré par le chef de projet (deux e2e rouges) : pas une régression, mais les e2e qui attendaient
  l'ANCIENNE règle. `verif-rdv-e2e` (scène « Julian a bloqué Charles ») attendait la conversation chez le bloqueur ;
  `verif-validation-rdv-e2e` (« si elle redemande ») attendait le texte de première demande à chaque clic ; ma e2e enchaînait
  « créneaux » (ouvre une demande en attente) puis « messagerie » (reprise sans message : comportement ordinaire, pas un bug).
  Une seule règle, partout : rien chez le bloqueur ; pour le demandeur, exactement comme une demande ordinaire déjà en
  attente (son écho est récent → réponse de reprise, rien de réécrit). Les trois suites sont alignées dessus.
- `scripts/verifications/api-locale.sh` : sert l'API du dépôt sur `127.0.0.1:8099` (php -S, configuration propre à
  `claudecode` dans `~/api-locale/private`, jamais commitée ; `backend/private` est un lien, ajouté à .gitignore).
  Toutes les e2e lisent `TC_API` (sinon l'API en ligne). Valables en local : les e2e à comptes jetables ; avec un autre
  poivre, `contacts-classes-e2e` et `appairage-e2e` (comptes fixes) ne le sont pas : contre la production seulement.
  `verif-suppression-e2e` (compte admin) et `e2e-rdv-groupe` (règle du 09/10, périmée : 4 KO aussi contre la production)
  ne sont pas dans verifier.sh et restent rouges, comme avant.
- `verif-blocage-silence-e2e` enregistrée dans verifier.sh. Commentaire de `demandeurBloque` remis à sa place.

## 11/10/2026 (session Codeur) — Campagne 3 : toast invisible qui avale les appuis, accueil après inscription

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Toast (`showToast`) : `opacity:0` une fois disparu, mais il restait dans la page et captait les appuis sur les boutons du
  bas (« Enregistrer », « Demander un rendez-vous », « Choisir qui »…). `.toast { pointer-events:none }` : il n'a jamais rien à
  cliquer (texte seul), les appuis passent au travers, visible ou non. Position inchangée (bottom 80 px) : visible, il peut
  encore recouvrir un bouton 2,5 s, mais l'appui atteint le bouton. Autres flottants vérifiés, déjà sains : tirer-pour-
  rafraîchir et étiquette du déplacement (`pointer-events:none`), barre « Déplacé vers … » (`display:none`), bandeau de mise à
  jour (`hidden`), voile du menu, fenêtres `tc-mod-ov` (retirées du DOM).
- Accueil : le drapeau `tc_onboarding_done` n'était posé que par les boutons de l'écran d'accueil. Après une inscription
  (ou Google, appairage, biométrie), un rechargement rouvrait l'accueil. Désormais : chaque ouverture de session pose le
  drapeau (5 endroits : `saveUserAccount` = inscription, connexion, Google, appairage, biométrie), et `checkOnboarding`
  considère qu'une session ouverte vaut accueil terminé (les comptes déjà inscrits sont couverts).
- Suite `verif-toast-et-accueil` (CSS, `showToast` et `checkOnboarding`/`saveUserAccount` exécutées, les 5 ouvertures de
  session), dans verifier.sh ; 5 KO sur la page d'avant. Sonde Chrome 390x844, deux passages même profil : ancienne page,
  `elementFromPoint` au centre du toast = toast (visible et disparu), rechargement → accueil `block` ; nouvelle page = le
  bouton dessous, et après une VRAIE inscription (compte jetable e2erdv.sonde…, origine `null` autorisée) le rechargement
  ouvre l'agenda (accueil `none`, en-tête visible, page-calendar, avatar DS). Comptes sonde créés : 52FPTM2G6MRR, G7ZNJQVZA9M9.

## 11/10/2026 (session Codeur) — Charly : dates relatives résolues par la page, titres gardés

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Constat (campagne 4) : Charly ne recevait qu'« aujourd'hui » et « demain » et calculait les autres dates de tête
  (« mardi » → le 15, « lundi 19 » → « jour passé »). Pire : quand il disait « je vais ajouter » sans bloc [AGENDA], la page
  fabriquait le rendez-vous elle-même À LA DATE DU JOUR avec le titre « Activité » (cas 25, 33, 34 : plombier à 10h passé,
  « dans 2 jours » aujourd'hui, « mercredi prochain » dimanche).
- `tcDateDemandee(texte, now)` : la date que dit une phrase, résolue à partir de la vraie date du jour (injectable) :
  aujourd'hui / ce soir, demain, après-demain, dans N jours ou semaines (« ds » compris), jour de la semaine seul (le prochain,
  aujourd'hui compris) ou « prochain » (+7 si c'est le même jour), « lundi 19 » (le prochain 19, de préférence un lundi),
  « le 25 décembre » (l'an prochain si passé), « 19/10 », ISO, « le 19 » seul ; « 31 février » → invalide. Jamais passée.
- `tcTitreDepuisDemande(texte)` : la demande sans ses mots de date, d'heure et de remplissage (« rdv », « mets-moi »,
  « pourriez-vous m'ajouter », « chez le », « je vous prie »…) → « Dentiste », « Notaire », « Coach », « Plombier » ; vide
  si rien.
- `tcContexteDatePourIA(now)` : un seul contexte pour la conversation et l'analyse de fichier (variable `dateContext`
  conservée, verif-cache-prompt inchangée) : date et heure exactes, calendrier des 14 prochains jours (jour → date), règles
  (lire la table, jamais de date passée, heure passée aujourd'hui → le dire et proposer, titre = mot-clé, « Activité » seulement
  si rien), format [AGENDA].
- `tcBlocAgendaDepuisAnnonce(lastUserText, lastCharly, now, nbJours)` : le bloc de secours, extrait de charlySendMessage,
  à la date et au titre de la demande (les devinettes sur la question de Charly — enfants, médicaments… — restent en repli).
- `tcCorrigerPropositionsCharly(reply, texte, now)` : filet sur une proposition UNIQUE : la ligne [AGENDA] prend la date que
  dit la demande (si différente), « Activité » devient le titre de la demande, et une date-heure déjà passée devient un refus
  calme + proposition du lendemain à la même heure (bloc [AGENDA] à valider). Rien n'est touché pour un déplacement, une
  annulation, plusieurs lignes, ou sans bloc. Le texte en prose du modèle n'est pas réécrit (le calendrier doit l'empêcher
  de se tromper ; s'il se trompe encore, la date créée est juste, le texte peut dire autre chose).
- Suite `verif-charly-dates` (date fixée : dimanche 11/10/2026 14h20 ; les six phrases + variantes, le titre, le contexte,
  le bloc de secours, le filet), dans verifier.sh ; 8 KO sur la page d'avant. Pas de sonde Chrome : tout est exécuté en
  fonctions pures ; le modèle lui-même n'est pas rejoué (clé OpenAI du compte).
- Rien d'autre ne change à l'écran. `parseFrenchDateFromText` (trois usages ailleurs) est laissé tel quel.
- Correctif après examen : « mardi 15 heures », « lundi 15 h », « jeudi 8 h » ne sont plus pris pour un numéro de jour
  (un nombre suivi de « h »/« heures », collé ou non, est une heure) ; les apostrophes (droite ou typographique) séparent
  les mots dans `tcTitreDepuisDemande` (« aujourd'hui », « m'ajouter », « s'il te plait ») ; le filet ne force la date que si
  la phrase ne cite qu'un seul jour et sans « veille / lendemain / avant / après / rappel » (`tcPlusieursDatesOuRelatif`) ;
  le titre et l'heure passée restent traités. Réserve notée : une heure passée remplace toute la réponse du modèle par le
  refus calme et la proposition (sa prose disparaît).

## 11/10/2026 (session Codeur) — Charly : conflits d'un autre jour, déplacements à tort, jour manquant

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Constat (campagne 5) : l'agenda était transmis à Charly en liste plate sur 400 jours ; il citait un rendez-vous d'un autre
  jour comme conflit (« mardi 15h occupé par Zorglub », Zorglub étant lundi) et déplaçait le mauvais rendez-vous (« mon rdv de
  mardi » → Zorglub de lundi), la page suivant son bloc [AGENDA] par titre sans vérifier le jour. Sans jour dans la demande, il
  en choisissait un.
- `tcAgendaSnapshotPourIA(now)` (même mécanisme, même place dans les deux appels, date injectable) : jour par jour sur les 14
  prochains jours, aujourd'hui compris (une ligne par jour, « rien, journée libre » sinon, journée entière marquée), puis à plat
  « hors de ces jours » (hier, et au-delà de 14 jours jusqu'à 400, 200 au plus). Règle ajoutée : un conflit n'existe que le MÊME
  JOUR, sur la même ligne ; déplacer ou annuler ne désigne qu'un rendez-vous du jour dit, sinon demander lequel.
- Garde-fous dans la page, après le filet de la mission 4 :
  - `tcIgnorerFauxConflit` : Charly annonce un conflit (« déjà occupé », « tu as déjà », « chevauche »…) sans bloc, la demande
    a un jour et une heure, et l'agenda local (même mode, hors journée entière) n'a rien à cette heure-là → « Ce créneau est
    libre dans ton agenda : … Je te propose : » + bloc à valider (titre de la demande ; heure passée → refus calme du filet).
    Un vrai conflit (même mal nommé) laisse la réponse telle quelle ; déplacement/annulation exclus.
  - `tcQuestionJourManquant` : heure sans jour dans la demande ni dans les deux messages précédents, ni période (« la semaine
    prochaine »), et Charly propose quand même un créneau (ou annonce un conflit) → « Pour quel jour ? ».
  - `tcDeplacementHorsJour` (dans `tcTraiterDeplacement`, avant tout déplacement) : la demande nomme un ou des jours
    (`tcJoursCites` : tous les jours cités, dans l'ordre) et le rendez-vous visé est un autre jour → rien ne bouge, Charly demande
    : « Tu as 2 rendez-vous mardi 13 octobre : « Rdv banque » 10h, « Formation » 15h — lequel ? » (ou « un seul … c'est
    celui-là ? », ou « je ne trouve aucun rendez-vous … »). Sans jour dans la demande, le titre fait foi comme avant.
- Suites : `verif-charly-conflits` (dimanche 11/10/2026 14h20, agenda des Testeurs rejoué ; format jour par jour, jours cités,
  faux conflit ignoré / vrai conflit gardé, déplacement hors jour refusé, jour manquant → question), dans verifier.sh ; 5 KO
  sur la page d'avant. `verif-charly-deplacement` charge les deux nouvelles fonctions ; `verif-memoire-agenda` : le 16
  supprimé apparaît désormais comme « journée libre » (assertion adaptée : plus de 11h-13h ce jour-là).
- Non fait : créneaux libres dans l'agenda transmis (ils ne l'étaient pas avant) ; la prose du modèle n'est pas réécrite quand
  le conflit est réel mais mal nommé (« Zorglub » pour la formation) : l'agenda jour par jour doit l'en empêcher.
- Correctif après examen : `tcJoursCites(texte, now, departSeulement)` ignore un jour qui suit « à / vers / pour / sur / au /
  en / jusqu'à » (une destination) ; `tcDeplacementHorsJour` ne vérifie que les jours de départ (« décale Zorglub à mardi »
  passe, le titre fait foi). Les événements sur plusieurs jours (`dateFin`, `tcEvenementCouvre`) comptent chaque jour qu'ils
  couvrent : agenda jour par jour (« Séminaire (du … au …) »), conflit local, déplacement. Deux demandes dans un message
  (plus d'un jour cité) : `tcIgnorerFauxConflit` ne réécrit rien. Réserve notée : `tcAnnonceUnConflit` est large (« pas de
  conflit » compris), sans effet car l'agenda local est vérifié ensuite.

## 11/10/2026 (session Codeur) — Menu latéral : « Mes agendas » juste sous « Mon agenda »

**Codé et commité sur main, PAS publié.** Page seulement.

- La rubrique « Mes agendas » (agendas secondaires : pastille + nom, clic = `isolateCalendarView`) était collée tout en bas
  du menu, sous « Créer un nouvel agenda » : invisible sans faire défiler. `renderMenu` l'insère maintenant juste après la
  première ligne (« Mon agenda »), avant « Importer » et « Synchroniser avec mon ancien agenda » ; même rendu, même action.
  « Se déconnecter » puis « Créer un nouvel agenda » restent en bas. Sans agenda secondaire, la rubrique n'apparaît pas
  (avant : son titre s'affichait, vide).
- Suite `verif-menu-agendas` (renderMenu exécutée : ordre complet, rendu, sans agenda), dans verifier.sh ; rouge sur la page
  d'avant.

## 11/10/2026 (session Codeur) — Charly parle faux quand il cite des rendez-vous

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Constats (campagnes 4 et 6) : « reporte mon dentiste à jeudi » → un dentiste inventé ; « supprime tout mardi après-midi »
  partait au modèle (un jour de semaine seul n'était pas reconnu comme objet de la suppression), qui oubliait Formation ;
  « mets le rdv de Paul vendredi » → « tu as déjà un rendez-vous avec Paul mardi à 10h » (inexistant) ; prose « mardi 15
  octobre » avec un bloc du 13 ; « décale mon rdv de mardi » citait 2 rendez-vous sur 5 ; une nouvelle demande pendant
  qu'une confirmation attendait mélangeait les deux, et « non » répondait à l'ancienne question.
- `tcRdvNommeIntrouvable` (avant l'appel au modèle) : un déplacement qui nomme un rendez-vous absent des 14 prochains jours
  → « Je ne trouve pas de rendez-vous « dentiste » dans ton agenda des 14 prochains jours. Rien n’a été changé. »
- `tcQuestionRdvDuJour` (sorti de `tcDeplacementHorsJour`) : la liste « Tu as N rendez-vous mardi 13 octobre : … — lequel ? »
  construite par la page ; `tcListeDuJourPourDeplacement` remplace la liste du modèle quand il répond sans bloc à un
  déplacement avec jour de départ.
- `tcAccorderProseAuBloc` : la date en toutes lettres (même jour de semaine) devient celle du bloc proposé (une ligne).
- `tcIgnorerFauxConflit` sans heure dans la demande : la page dit l'agenda du jour demandé (« Vendredi 16 octobre 2026, tu as
  : Revue budget 14h à 16h. » ou « … est libre ») et demande l'heure ; rien d'inventé.
- `detecterSuppressionRdv` : un jour de semaine seul (`tcPeriodeJourNomme`) désigne l'objet ; après-midi = 12h-19h. La
  confirmation existante (« Tu veux annuler ces 4 rendez-vous ? … Réponds « oui » ou « non » ») liste tout ; « non » →
  « Annulation abandonnée, rien n'a été touché ».
- `tcAbandonnerAttente` + `tcEstUneNouvelleDemande` : une demande (≥ 3 mots) pendant qu'une annulation, un déplacement, un
  conflit ou une proposition attend → l'attente est close et Charly le dit (« D’accord, je laisse tomber l’annulation qui
  attendait. Je passe à ta nouvelle demande. ») ; le modèle n'a plus deux questions ouvertes.
- Suite `verif-charly-citations` (dimanche 11/10/2026 14h20, agenda de la campagne 6 ; `tcGererSuppressionRdv` exécutée avec
  horloge fixe), dans verifier.sh ; 6 KO sur la page d'avant. `verif-charly-conflits` charge `tcQuestionRdvDuJour`.
- Limites : la prose d'un vrai conflit mal nommé par le modèle n'est pas réécrite ; une question de suivi de 3 mots ou plus
  (« et le lieu ? ») abandonne la proposition en attente (règle de Charles : la nouvelle demande prime).
- Correctif après examen : `tcRdvNommeIntrouvable` ne se déclenche que pour un vrai déplacement (verbe strict déplacer /
  décaler / repousser / reporter / avancer / reprogrammer, ou un verbe large comme « change » avec le mot rdv / rendez-vous /
  réunion / séance), et cherche dans tout l'agenda à venir (« mon ostéopathe du 3 décembre » existe) ; « change la couleur de
  mon agenda », « modifie mon profil » ne sont plus interceptés. `tcIgnorerFauxConflit` sans heure : une question
  (« est-ce que j'ai quelque chose vendredi ? ») ou une réponse qui cite un rendez-vous réellement présent ce jour-là ne sont
  pas réécrites. Réserves notées : `tcAccorderProseAuBloc` remplace aussi une mention volontaire d'un autre mardi ; « et le
  lieu ? » (3 mots) abandonne la proposition en attente (règle de Charles).
- Correctif après examen (bis) : dans `tcRdvNommeIntrouvable`, le verbe de déplacement est reconnu avec fin de mot (déplace,
  décaler, repousses, reporte, avancez, reprogramme…) : « un déplacement à Lyon », « un reportage photo » sont des noms
  d'événements et passent ; une question (« quels sont mes déplacements ? ») ne déclenche rien. `tcEstDeplacement` est
  inchangée (elle sert ailleurs).

## 12/10/2026 (session Codeur) — Charly, campagne 7 : conflit sauté, consultation fausse, objet donné, « remets-les »

**Codé et commité sur main, PAS publié.** Page seulement (rien côté serveur ni SQL).

- Conflit (régression apparente, cause ancienne) : à la validation d'une proposition, la détection de conflit était sautée dès
  que l'un des TROIS derniers messages contenait « change », « avance », « pas à »… ; « change mon mot de passe » deux
  messages avant « rdv dentiste mardi 15h » posait le dentiste sur la formation sans alerte. `tcEstUneCorrection(msg)` :
  seul le message qui a provoqué CETTE proposition compte, avec fins de mots. Rien de changé entre 787c0e4 et 75e0d8e sur
  ce chemin : c'est l'enchaînement des messages des Testeurs qui l'a révélé.
- Consultation : « est-ce que j ai quelque chose vendredi ? » (apostrophe manquante) n'était pas reconnue et partait au
  modèle, qui répondait « libre ». `detecterConsultationAgenda` rétablit l'apostrophe (« j ai » → « j'ai »…) et accepte une
  question de 8 mots ; la réponse (liste exacte) était déjà construite par la page (`tcGererConsultationAgenda`).
- Objet donné : « ajoute un déplacement à Lyon jeudi 9h » → le modèle demandait « c'est pour quoi ? ». `tcRepondreObjetDonne`
  : si la demande a l'objet, le jour et l'heure, la page propose elle-même (« Déplacement à Lyon, jeudi 15 octobre 2026 à
  9h : je te propose ceci. » + bloc). `tcTitreDepuisDemande` garde « à » devant un nom propre.
- « Remets-les » : les rendez-vous remis reprenaient leur ancien identifiant, déjà envoyé au serveur comme supprimé : la
  synchro les effaçait à nouveau (« 3 rendez-vous remis », agenda vide). Ils reçoivent un identifiant neuf
  (`charly_ai_<horodatage>_rN`), mêmes dates, heures, titres.
- Suite `verif-charly-campagne7` (dimanche 11/10/2026 14h20, agenda campagne 7 ; `detectConflicts`, `tcGererConsultationAgenda`
  et `tcMarcheArriere` exécutées), dans verifier.sh ; rouge sur la page d'avant. verif-charly-dates / conflits / citations
  restent vertes.
- Correctif après examen : le seuil de la question explicite revient à 6 mots (à 8, « Tu peux me mettre un dentiste demain ? »
  devenait une consultation) ; `tcRepondreObjetDonne` exclut aussi bouge/change/modifie/remplace (fins de mots) ; « change »,
  « modifie » rejoignent les mots de remplissage de `tcTitreDepuisDemande`.
- Correctif après examen (bis) : les déclencheurs « qu'est-ce que j'ai » et « qu'est-ce qu'il y a » tolèrent apostrophes et
  tirets manquants (`qu'?est[- ]?ce que j'?ai`), que l'apostrophe rétablie laissait sans correspondance.

## 12/10/2026 (session Codeur) — Le nom de l'agenda secondaire sur la ligne du mois

**Codé et commité sur main, PAS publié.** Page seulement.

- Le nom de l'agenda secondaire ouvert (« 📍 Agenda scolaire de Elodie ») était dans la barre du haut, entre le logo et les
  icônes : trop serré sur téléphone. Il descend sur la ligne du mois, dans l'espace entre le sélecteur « Octobre 2026 ‹ › » et
  « Auj. » / loupe (`#subHeaderAgendaLabel`, qui remplace l'ancien espaceur vide : flex:1, min-width:0, centré, pastille + bleu,
  nowrap + ellipsis : il ne pousse jamais « Auj. »). Vide pour l'agenda principal (rien d'affiché, comme avant).
  L'emplacement de la barre du haut (`#headerAgendaLabel`) est retiré ; `updateHeaderAgendaLabel` écrit sur la ligne du mois.
- Suite `verif-titre-agenda` (HTML : ordre et style ; `updateHeaderAgendaLabel` exécutée : secondaire / principal / autre
  page), dans verifier.sh ; rouge sur la page d'avant. Capture Chrome 390x844 : `TimeCool-Codeur/captures/mission9-agenda-secondaire.png`.
- Mission 9 bis (Charles, 12/10) : sur la ligne du mois il ne restait que « 📍 A… » à 390 px (57 px pour 195). Le nom entier
  va sur une ligne dédiée, centrée (`#agendaSecondaireTitre`, 13px gras bleu), juste sous la ligne du mois et au-dessus de
  « Semaine 42 », masquée pour Mon agenda et quand le panneau du mois est ouvert (comme les badges) ; la ligne du mois
  retrouve son espaceur vide ; plus rien dans la barre du haut. Suite `verif-titre-agenda` réécrite pour cette disposition ;
  capture 390x844 refaite (`TimeCool-Codeur/captures/mission9-agenda-secondaire.png`).

## 12/10/2026 (session Codeur) — Créer un agenda secondaire ne masque plus « Mon agenda »

**Codé et commité sur main, PAS publié.** Page seulement.

- Cause (compte 53) : ouvrir un agenda depuis le menu (`isolateCalendarView`) écrivait `visible:false` sur tous les autres
  agendas DANS le réglage enregistré (`timecool_custom_calendars`) ; toute sauvegarde faite ensuite — créer un agenda, par
  exemple — figeait « Mon agenda » masqué : ses 87 rendez-vous paraissaient perdus. La création elle-même ne touchait pas
  à la visibilité.
- L'isolation est désormais un filtre d'affichage en mémoire (`_isolatedCalendarId`, lu par `isCalendarVisible` et
  `getVisibleCalendarIds`) : le réglage n'est plus écrit. La navigation lève l'isolation mais ne remet plus `visible:true` de
  force : la pastille (`toggleCalendarVisibility`) reste le seul réglage à la main. Garde-fou au chargement : « Mon agenda »
  masqué alors qu'aucun agenda n'est visible → il redevient visible (enregistré) ; un agenda masqué à la main à côté d'un
  autre visible n'est pas touché (règle du chef). Compte sans agenda secondaire : rien ne change.
- Suite `verif-agendas-visibles` (création, isolation, création pendant l'isolation, pastille, garde-fou — fonctions
  exécutées), dans verifier.sh ; rouge sur la page d'avant.
- À noter : un réglage déjà figé avec le secondaire visible et « Mon agenda » masqué (l'état actuel du compte 53) n'est pas
  couvert par le garde-fou tel que demandé : un appui sur la pastille de « Mon agenda » le remet.

## 12/10/2026 (session Codeur) — Charly, campagne 8 : phrase de conflit par la page, « déplacement » n'est pas un ordre

**Codé et commité sur main, PAS publié.** Page seulement.

- Vrai conflit : le modèle écrivait « mardi 15 octobre … le dentiste … libres 10:00-11:00 » (date fausse, Formation oubliée,
  créneaux déjà pris). Quand la page constate le conflit sur l'agenda local, c'est elle qui écrit : « Mardi 13 octobre
  2026 à 15h, tu as déjà « Rendez-vous dentiste » (15h-16h) et « Formation » (15h-17h). Ce jour-là, il reste : 8h-10h,
  11h-15h, 17h-19h. Dis-moi quel créneau te va. » (`tcPhraseConflitLocale`, `tcPlagesLibresDuJour` de 8h à 19h, journées
  entières ignorées). La prose du modèle n'est plus affichée pour cette partie.
- Verbe de déplacement : un seul détecteur partagé (`tcEstDeplacement`, `TC_VERBES_DEPLACEMENT` /
  `TC_VERBES_MODIFICATION`, forme conjuguée e/er/es/ez/ons) ; « un déplacement à Lyon », « un reportage », « une avancée »
  ne sont plus des ordres : « ajoute un déplacement à Lyon jeudi 9h » crée (plus de « lequel ? »). `tcRdvNommeIntrouvable`
  utilise la même table.
- Suite `verif-charly-campagne8` (dimanche 11/10/2026 14h20, agenda campagne 8), dans verifier.sh ; rouge sur la page
  d'avant. `verif-charly-conflits` et `verif-charly-citations` : les assertions « vrai conflit → la réponse du modèle reste »
  deviennent « → la phrase de la page ».

## 12/10/2026 (session Codeur) — Message d'absence

**Codé et commité sur main, PAS publié. API À DÉPLOYER** (`backend/api/index.php`), page aussi. Pas de SQL.

- Réglage unique `tc_absence` (JSON : actif, debut, fin, relaisNom, relaisTel, tu, vous), aucun réglage voisin n'existait ;
  il voyage comme les autres (famille « réglage ») : c'est le SERVEUR qui envoie la réponse, même application fermée.
- Paramètres, rubrique « 🏖️ Message d'absence » sous « Messages d'annulation & retards » (même carte) : interrupteur « Je suis
  absent(e) », dates du/au (fin ≥ début : l'autre date suit), texte dans la forme « Je tutoie / Je vouvoie » déjà choisie,
  pastilles « Tu peux utiliser : [Prénom] [date début] [date fin] [nom du relais] [téléphone du relais] », nom et téléphone
  du relais (facultatifs), aperçu, état (désactivé / à venir / en cours / terminé). Texte par défaut : « Bonjour [Prénom], je
  suis absent(e) du [date début] au [date fin]. En cas d'urgence, contacte/contactez [nom du relais] au [téléphone du relais].
  Je te/vous recontacte à mon retour. » Sans relais (nom OU téléphone vide), la phrase « En cas d'urgence… » est omise.
- API : `absenceDe` (réglage lu dans `elements`, en cours si actif et début ≤ aujourd'hui ≤ fin), `vouvoiePour` (même règle
  que l'application : choix de la fiche, sinon titre Dr/Me/M./Mme…, sinon catégorie travail ou santé), `texteAbsence`
  (pastilles, omission du relais, balises neutralisées), `envoyerAbsenceSiBesoin` : une seule fois par expéditeur et par
  période (la conversation de l'absent garde une ligne « me » de genre `absence` datée d'après le début). Appelée dans
  `/messages/envoyer` (après le message) et `/rdv/demander` (dans les deux issues, messagerie et créneaux ; jamais pour un
  demandeur bloqué : le silence de la mission 2 prime). Rien n'est bloqué, aucun bloc dans l'agenda de l'absent.
- Suites : `verif-absence` (page : réglage, texte, période, rendu ; API : fonctions exécutées sous PHP, routes), dans
  verifier.sh ; rouge sur la page/API d'avant. `verif-absence-e2e` (TC_API, comptes jetables e2erdv.absence…) : écrite, PAS dans
  verifier.sh tant que l'API n'est pas déployée (verte via api-locale.sh). Capture 390x844 :
  `TimeCool-Codeur/captures/mission12-message-absence.png`.
- Correctif après examen : `envoyerAbsenceSiBesoin` commence par `demandeurBloque` : une personne bloquée par l'absent ne
  reçoit jamais le message (ni le nom et le téléphone du relais), quel que soit le chemin ; e2e : Dave bloqué écrit → rien.
  Cas « inconnu » (aucune fiche chez l'absent) préparé : constante `ABSENCE_RELAIS_AUX_INCONNUS` (true = relais pour tous,
  comportement actuel ; false = le message part sans la phrase d'urgence, réservée aux contacts — recommandation du chef,
  réponse de Charles en attente) ; `texteAbsence(..., $avecRelais)`. Ligne fusionnée de `messagePoser` remise. Réserve notée :
  un point dans un texte personnalisé (« M. Dupont ») peut mal couper la phrase d'urgence quand le relais est vide.
- Choix de Charles (12/10) : `ABSENCE_RELAIS_AUX_INCONNUS = false` : un inconnu (aucune fiche chez l'absent) reçoit le message
  d'absence sans la phrase d'urgence ; le nom et le téléphone du relais ne vont qu'aux contacts. e2e : Eve (inconnue) → message
  sans relais ; Carl (fiche) → avec.

## 12/10/2026 (session Codeur) — « Mon agenda » dans le menu revient toujours à l'agenda principal

**Codé et commité sur main, PAS publié.** Page seulement.

- Agenda d'Élodie ouvert (isolation) → « Mon agenda » dans le menu : `navigate('calendar')` laissait l'isolation en place
  (depuis la page agenda, rien ne la levait), l'écran restait sur Élodie. L'entrée « Mon agenda » du menu appelle
  `tcOuvrirMonAgenda()` : l'isolation est levée (identifiant et nom), tous les agendas visibles reviennent (un agenda masqué
  à la main par la pastille le reste), la ligne « 📍 nom » s'efface, l'agenda s'ouvre et se redessine. Les autres entrées
  du menu et les agendas secondaires ne changent pas.
- Suite `verif-mon-agenda` (menu rendu, isolation puis « Mon agenda » exécutés), dans verifier.sh ; rouge sur la page
  d'avant.
- Mission 12 publiée (v2.0.330, API déployée) : `verif-absence-e2e` ajoutée à verifier.sh. Comptes sonde e2erdv.absence… à
  supprimer au nettoyage d'avant lancement : 7HM7TW8AAQPQ, X99KXG3CGDZZ, 1TG2AR3S3HGP, WVV7R9RGBP6Y, 13REWGAJTZSH,
  N7AH26DJ84Q7, ZWEWTKRGZB9M, WX66REN9V4D0, 2FBV4EZD7R72, TPDKFGN8KS7M, 897FQ1FBYPGC, YSV8AXTR961H, FW215G33RGVB,
  WR9JJH1BX3TD, MJ6K2RV3QZZ9, YFH00AE95AJH, V79HG7TZ3H1W, QSBF6BHHNA3F, 5S3Z2MX35707, 6SSRGBCMK13J, MPEE7AQ7RHCD,
  5WR20JJ1KPY3, WJD51A65Q4XC.

## 12/10/2026 (session Codeur) — La présentation de Charly

**Codé et commité sur main, PAS publié.** Page seulement.

- « Tu es qui ? », « c’est quoi Charly ? », « que sais-tu faire ? » : la réponse venait déjà de la page (liste `_faq` de
  `charlySendMessage`, deux entrées avec deux textes différents), jamais du modèle. Les deux entrées rendent maintenant le
  même texte, `TC_CHARLY_PRESENTATION` (texte exact de Charles, apostrophes typographiques, tutoiement : Charly tutoie
  toujours, le réglage « Je vouvoie » ne vaut que pour les messages aux contacts) ; mots-clés « c’est quoi Charly »,
  « qui est Charly », « Charly c’est qui » ajoutés.
- Suite `verif-presentation-charly` (texte exact, les deux entrées, reconnaissance rejouée avec `tcContientMot` sur
  « Tu es qui ? », « c’est quoi Charly ? », « que sais-tu faire ? » et variantes), dans verifier.sh ; rouge sur la page d'avant.

## 12/10/2026 (session Codeur) — Charly, campagne 9 : une proposition non validée n'existe pas pour la suite

**Codé et commité sur main, PAS publié.** Page seulement.

- Cause des trois constats : la carte [AGENDA] non validée partait au modèle (il « connaissait » un dentiste jamais ajouté
  et le « décalait » en créant un rendez-vous) ; « annule le dentiste » (3 mots) était pris pour le choix « annuler » de la
  carte de période en attente (« Déplacement à Lyon » est une période : le titre contient « déplacement ») ; la prose du
  modèle autour d'un conflit (« Pour annuler… », « C'est fait ! ») restait affichée.
- `tcHistoriquePourIA` : plus aucune carte ne part au modèle, validée ou non (mention « proposition NON ajoutée »). Une
  nouvelle demande ferme la proposition en attente — « J’ai laissé tomber la proposition précédente. Je passe à ta nouvelle
  demande. » — puis est traitée normalement (annulation, création, question…). `tcChoixPeriode` : un choix tient en 1 ou 2
  mots (« annule », « annule-les », « 2 »), « annule le dentiste » est une nouvelle demande.
- `tcTraiterDeplacement` : le modèle vise un rendez-vous que l'agenda n'a pas, avec un jour de départ cité → « Tu as 3
  rendez-vous mardi 13 octobre : … — lequel ? » (liste réelle), jamais une création.
- `tcReponseConflitLocale` : une proposition (une ligne, pas une période) qui chevauche l'agenda local → la phrase de conflit
  de la page seule (date exacte, rendez-vous réels, plages libres) + le bloc (pour « Ajouter quand même » à la validation).
  `tcSansFormulesFaites` : « C'est fait », « C'est noté », « C'est parti », « je l'ai ajouté », « rendez-vous ajouté »
  retirés tant qu'un bloc attend ; sans bloc, rien n'est touché.
- Suite `verif-charly-campagne9` (dimanche 11/10/2026 14h20, agenda campagne 9 ; les 3 scénarios, fonctions exécutées),
  dans verifier.sh ; rouge sur la page d'avant. `verif-memoire-agenda` (« la carte non validée ne part plus ») et
  `verif-charly-citations` (mots de l'abandon) alignées.
- À noter : « décale-la à 16h » sur une proposition pas encore validée ne marche plus (elle n'existe pas pour la suite,
  règle de Charles) ; il faut valider puis décaler.
- Correctif après examen : plus aucune assertion arrière `(?<=…)` dans la page (Safari ancien sur iPhone la refuse et
  toute l'application ne démarrerait plus ; contrôle ajouté à la suite) ; `tcSansFormulesFaites` ne retire que la formule
  exacte (« C'est fait », « C'est noté », « C'est parti », « je l'ai ajouté », « rendez-vous ajouté ») avec sa ponctuation
  et son emoji, jamais si un « ? » suit dans la phrase, « c'est bon » retiré de la liste ; `tcChoixPeriode` accepte les mots
  de politesse et d'opinion (« oui annule », « je préfère annuler », « laisse tomber »…), jamais un nom d'objet.

## 12/10/2026 (session Codeur) — Charly ne relance jamais un sujet de lui-même

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (compte 53) : après un document hors sujet puis « Désolé c'est une erreur de ma part », Charly relançait seul la
  question d'avant (« On reprend… quel(s) jour(s) pratiques-tu ton sport ? »).
- Règle de Charles : Charly ne relance jamais ; il peut seulement rappeler, en une ligne à la fin, ce qui reste à voir ;
  seul l'utilisateur reprend (« on reprend », « on continue », « et pour le sport ? »).
- `tcSujetsOuverts(history)` : une question de Charly suivie d'un message hors sujet (« désolé », « pardon », « oups »,
  « erreur de ma part »…) ou d'un fichier, et les propositions abandonnées (`tcAbandonnerAttente` marque la proposition
  « la proposition « titre » », cohérent avec la mission 13) ; un sujet repris sort de la liste. `tcSansRelance` : une
  phrase interrogative du modèle qui reprend les mots d'un sujet ouvert (ou « on reprend… ») est retirée, puis « Reste à
  voir : ton sport régulier, la proposition « Rendez-vous dentiste ». » est ajouté. `tcEstUneReprise` (« on reprend »,
  « on continue », « reprenons », « revenons à… », 6 mots au plus) : la page répond « On reprend : <sujet>. <question> » sans
  le modèle et ferme le sujet. La règle est aussi dite au modèle dans le contexte de chaque appel.
- Suite `verif-charly-relance` (scénario de la capture : question → fichier → « désolé » → pas de relance + « Reste à
  voir » ; « on reprend » → reprise annoncée ; proposition abandonnée citée, jamais relancée), dans verifier.sh ; rouge sur
  la page d'avant.
- Limites : un « hors sujet » se reconnaît aux excuses et aux fichiers ; une vraie nouvelle demande après une question de
  Charly n'est pas comptée comme sujet ouvert (on ne sait pas si elle y répond) ; « et pour le sport ? » va au modèle.
- Correctif après examen : si l'utilisateur reprend lui-même un sujet avec ses mots (« je fais du sport 3 fois par
  semaine », « et pour le sport ? »), la réponse du modèle est gardée entière et le sujet est clos ; « Reste à voir » une
  seule fois par question laissée en suspens (marque `_rappele`), jamais pour une proposition abandonnée ; libellé « ton
  sport régulier » (possessif) sinon la question entière ; « désolé / pardon / oups » n'ouvrent un sujet que seuls (6 mots
  au plus, sans mot de rendez-vous, jour ni heure), « erreur de ma part / mauvais message / ignore ce message » toujours ;
  « continue » et « reprends » seuls ne sont plus une reprise (seulement « on reprend », « on continue », « reprenons »,
  « continuons », « revenons à/sur »).

## 12/10/2026 (session Codeur) — Déconnexion : rien du compte ne reste ; Charly prêt dès la connexion

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (campagne 10, appareil partagé) : après déconnexion de F et connexion de D, D voyait l'historique Charly de F
  (« Bonjour Fanny ! ») jusqu'au rechargement ; puis « Aucune clé API. Configure-la dans Configuration IA » et la page
  de configuration. Cause : `tcViderDonneesDuCompte` (ménage au changement de compte) ne tournait qu'au tour de
  synchronisation, vidait le stockage mais pas la mémoire de Charly, et effaçait le tiroir de clés `timecool_api_keys`
  sans le re-remplir ; les clés n'étaient rapportées du serveur qu'au démarrage (`tcRevaliderSession`), jamais après
  une connexion.
- `logoutUser` appelle `tcViderDonneesDuCompte()` tout de suite (après `tcOublierMotDePasse`) et retire le marqueur
  `tc_compte_local`. `tcViderDonneesDuCompte` vide aussi la mémoire : `charlyIA.history` (et avec lui les propositions
  en attente), `_historiqueCharge`, `_tcSuppressionEnAttente`, `_tcDeplacementEnAttente`, `_tcImprevuEnAttente`,
  `_isolatedCalendarId`, `customCalendars`, clés IA en mémoire ; si une session est ouverte (ménage au changement de
  compte), les clés du nouveau compte sont redemandées au serveur.
- Connexion : `showWelcomeSplash` demande les clés du compte (sans attendre) ; dans `charlySendMessage`, s'il manque
  encore la clé avec une session ouverte, `await tcRecupererClesDuServeur()` avant de juger ; plus jamais
  `navigate('aiconfig')` ni « Aucune clé API » : à défaut, « Charly n’est pas encore prêt sur cet appareil. Réessaie
  dans un instant. ». `tcCleActiveCharly()` regroupe le choix de la clé selon le fournisseur.
- Suite `verif-deconnexion` (stockage factice d'un appareil quitté par F : seules les clés de l'appareil restent ;
  mémoire vidée ; textes de logoutUser / charlySendMessage / showWelcomeSplash), dans verifier.sh ; rouge sur la page
  d'avant.
- Non vérifié ici : le parcours réel F → D sur un même navigateur (Testeurs, campagne suivante).
- Suites re-ancrees : verif-charly-suppression et verif-imprevu (verification de cle devenue « let activeKey = tcCleActiveCharly() »), verif-historique-charly (deux remises a zero : « Recommencer » et le menage du compte). Le menage garde l idiome typeof … pour verif-sync.
- Correctif après examen : après l'effacement du stockage, `loadCustomCalendars()` remet « Mon agenda » en mémoire (un
  `customCalendars = []` laissait le prochain agenda créé s'enregistrer seul et « Mon agenda » disparaissait pour de
  bon) ; `tc_onboarding_done` (accueil terminé) est un réglage de l'appareil, le ménage l'épargne : après une
  déconnexion, l'appareil montre l'écran de connexion, pas « Rejoins TimeCool ». Autres réglages d'appareil candidats
  (langue `timecool_language`, thème `tc_theme`) : toujours balayés comme avant, à trancher par le chef de projet.

## 12/10/2026 (session Codeur) — Accents des écrans d'accueil, phrase d'appairage

**Codé et commité sur main, PAS publié.** Page seulement.

- Écrans d'accueil (`#ob2`, `#ob3`) : « Crée ton compte gratuitement et commence à gagner du temps », « Créer mon
  compte », « J’ai déjà un compte », « Charly IA est prêt à t’aider à organiser ton temps », « parler à Charly »,
  « Ou crée ton premier RDV », « Découvrir TimeCool ». « Compte créé ! » (écran de confirmation) avait déjà son accent.
- Appairage d'un ordinateur : « Sur votre téléphone : menu → Lier un nouvel appareil » devient « Sur ton téléphone :
  touche tes initiales en haut à droite → Lier un nouvel appareil » (tutoiement comme le reste de l'application).
- Décision du chef de projet (12/10, après la mission 20) : la langue (`timecool_language`) et le thème (`tc_theme`) sont
  des réglages de l'appareil, comme l'accueil terminé : le ménage du compte (`tcViderDonneesDuCompte`) ne les efface
  plus ; `verif-deconnexion` le vérifie.
- Suite `verif-accents-accueil` (chaînes attendues présentes, anciennes absentes), dans verifier.sh ; rouge sur la page
  d'avant. Aucune clé de traduction ni suite existante ne citait ces textes.
- Réserve de l'examen (vérifiée dans la synchro) : un compte neuf sans réglage sur le serveur aurait reçu la langue et le
  thème gardés de l'utilisateur précédent (`tcSyncPousser` envoie toute clé sans empreinte). Au ménage, les valeurs
  gardées sont notées dans `tc_reglages_gardes` (clé d'appareil, dans `TC_JAMAIS_TRANSFERE` : jamais synchronisée ni
  transférée) ; `reglage.lire()` ne pousse pas une clé tant qu'elle vaut encore cette valeur, et la libère dès que
  l'utilisateur la change. `verif-deconnexion` rejoue `reglage.lire` sur un stockage après ménage.

## 12/10/2026 (session Codeur) — Écran Charly : 2e ligne de 4 boutons (vitrine)

**Codé et commité sur main, PAS publié.** Page seulement.

- Sous la ligne « Créer mon agenda / Créer un nouveau rdv / Gérer un imprévu / Prévenir d'un retard », une 2e ligne
  `#charlyQuickActions2`, mêmes pilules (seules les couleurs changent), textes exacts : « 👥 Rendez-vous à plusieurs »,
  « 🤒 Je suis malade, décale tout », « 🕐 Quand suis-je libre ? », « 📸 Photo → rendez-vous ». Le trait du bas passe de
  la 1re ligne à la 2e (un seul bloc blanc).
- Chaque bouton lance le parcours existant (`charlyQuickAction`) : « Rendez-vous à plusieurs » → Charly demande « Avec
  qui ? », la réponse (deux prénoms de contacts, sans mot de rendez-vous) démarre `tcGererRdvGroupe` (créneaux où tout
  le monde est libre, via le serveur) ; 2 essais (`_tcGroupeEnAttente`), ensuite le message suit son chemin. « Je suis
  malade, décale tout » → `tcGererContrainte('Je suis malade, décale tout aujourd’hui')` : liste des rendez-vous du
  jour, puis « Je les annule / Je les déplace et je m'excuse / je ne touche à rien » ; le déplacement demande « Vers
  quand ? » et chaque message de décalage est relu et validé avant de partir (`tcPrevenirDecalages`). « Quand suis-je
  libre ? » → question « Quand suis-je libre cette semaine ? » pré-remplie et envoyée. « Photo → rendez-vous » →
  `charlyAttachAction('photo')` (Photos, comme le trombone).
- Écart avec la demande pour « malade » : Charly ne propose pas de lui-même le prochain créneau libre de chacun, il
  demande « Vers quand ? » (parcours existant). Proposer automatiquement un créneau par rendez-vous = une mission à part.
- Suite `verif-boutons-charly` (ligne, textes, style, actions rejouées, réponse à « Avec qui ? »), dans verifier.sh ;
  rouge sur la page d'avant. Capture 390×844 : `TimeCool-Codeur/captures/mission22-boutons-charly.png`.
- Correctif avant examen : le bouton « Je suis malade, décale tout » envoyait « aujourd’hui » avec l'apostrophe
  typographique, que `tcPeriodeAgenda` (`/aujourd'?hui/` sur le texte brut) ne reconnaît pas : apostrophe droite, et la
  suite le vérifie.
- Correctif après examen : l'apostrophe typographique « ’ » (clavier iPhone) vaut « ' » dans `tcPeriodeAgenda` et
  `tcPeriodeContrainte` (« aujourd’hui » tapé était ignoré : bulle sans réponse) ; `tcGererContrainte` répond quand
  aucun jour n'est reconnu (« Je n’ai pas compris quel jour… »). L'attente « Avec qui ? » n'avale plus une vraie demande
  (`tcRessembleAUneDemande` : plus de 6 mots, ou jour / heure / rendez-vous / verbe d'action → elle tombe, le message
  suit son chemin ; sinon une relance, une seule), expire après 10 min, et tombe au ménage du compte. La suite rejoue
  le bouton « malade » jusqu'à la liste du jour avec les deux apostrophes.
- Piège évité de justesse : la page avait déjà `tcRessembleAUneDemande` (règle de « qui est-ce ? », ≥ 5 mots ou verbe
  d'ordre en tête) ; une seconde déclaration du même nom l'aurait remplacée en silence. La règle existante est
  réutilisée, complétée par `tcDemandeHorsPrenoms` (jour, heure, mot de rendez-vous) ; la suite vérifie qu'il n'y a
  qu'une déclaration.

## 12/10/2026 (session Codeur) — Charly, suite de la campagne 10

**Codé et commité sur main, PAS publié.** Page seulement.

- (a) « Quand suis-je libre vendredi ? » : `detecterDemandeCreneau` lit aussi un jour nommé (`tcPeriodeJourNomme`) ;
  `tcGererDemandeCreneau` borne une période sans fin à son seul jour (plus jamais deux semaines pour « mardi » ou
  « aujourd'hui »). Réponse construite par la page : aucune carte « Proposition d'agenda ».
- (b) Toute suppression demande « oui / non » avec la liste des rendez-vous visés, même un seul (`tcGererSuppressionRdv`,
  remplace le choix du 30/09 « compris donc exécuté ») ; la suite `verif-charly-suppression` est adaptée.
- (c) Une création simple (objet + jour + heure + mot de rendez-vous ou verbe de création, sans question, annulation,
  déplacement, consultation ni série) est proposée par la page (`tcCreationLocale`) avant le modèle : « rdv dentiste
  mardi 15h », « ajoute un déplacement à Lyon jeudi 9h » (titre « Déplacement à Lyon »), « rdv coach vendredi 15h »
  donnent la même proposition quel que soit le message d'avant ; les garde-fous existants (conflit local, plages
  libres, formules) s'appliquent ensuite. « annule le dentiste » sans dentiste → « Je ne trouve pas de rendez-vous
  « dentiste » dans ton agenda. Rien n’a été changé. » (plus de rapprochement avec un autre rendez-vous).
- (d) « lequel ? » n'est plus affiché deux fois : `tcTraiterDeplacement` ne repousse pas la question du jour quand la
  réponse déjà affichée est cette même question (remplacée par `tcListeDuJourPourDeplacement`).
- Suite `verif-charly-campagne10` (horloge dimanche 11/10/2026 14h20, agenda de la campagne), dans verifier.sh ; rouge
  sur la page d'avant.
- Limites : la création locale vise une seule heure et un seul jour (une série ou un « de 14h à 16h » va au modèle) ;
  le titre vient de `tcTitreDepuisDemande` (« Dentiste », sans préfixe « Rendez-vous »).
- Suites adaptées à la règle du 12/10 (toute suppression attend « oui / non ») : `verif-suppression-plage`,
  `banc-charly` (on répond « oui » puis on vérifie comme avant), `verif-non-compris` (contexte : `tcDernierMessageCharly`),
  et `verif-charly-conflits` (forme de `tcTraiterDeplacement` avec la garde anti-doublon).
  Idem verif-non-compris (reponse « oui ») et verif-creneaux-proposes (extraction de tcPeriodeJourNomme).
- Correctif après examen (cinq régressions mesurées) : `tcCreationLocale` se retire (le modèle décide) devant une plage
  ou une durée (« de 14h à 16h », « 14h-16h », « jusqu'à 17h », « pendant 2 heures »), deux demandes (plus d'un jour
  ou d'une heure, « puis »), une phrase longue (titre de plus de 3 mots ou plus de 10 mots), un rendez-vous à venir qui
  porte déjà un mot du titre (« mets le dentiste à jeudi 10h » = déplacement, pas doublon), et les réservations
  (« réserve » retiré des verbes ; restaurant, hôtel, table, billet, train, vol exclus). Suppression : les mots de moment
  et de choix (matin, soir, midi, après-midi, aujourd'hui, demain, prochain, dernier, ce/cette…) sont dans `motsVides`
  (plus jamais « je ne trouve pas « matin » ») ; matin / après-midi / soir comptent comme un filtre ; « mon prochain
  rdv » vise le prochain à venir, « mon dernier rdv » le dernier passé. Les quatre phrases de l'examen et les cas de
  création sont dans `verif-charly-campagne10`.
- 2e examen : « prochain / dernier » ne choisit le premier ou le dernier rendez-vous que sans autre filtre (date, jour,
  heure, moment) et sans « tous » — « mardi prochain » n'est qu'un mot du jour (« tous mes rdv de mardi prochain » →
  les trois, « le rdv de mardi prochain » → « lequel ? ») ; « ce matin », « cet après-midi », « ce soir », « ce midi »
  visent d'abord aujourd'hui, puis le moment (la branche matin filtrait l'heure sur tous les jours). Réserve notée :
  « mon dernier rdv » sans rendez-vous passé vise le dernier de la liste (le plus éloigné), sens discutable.
  « annule le rdv de mardi prochain » (singulier, plusieurs ce jour-la) demande « lequel ? » ; « mes rdv de mardi » ou « tous » visent le jour entier.

## 12/10/2026 (session Codeur) — Types de rendez-vous : une seule liste partout

**Codé et commité sur main, PAS publié.** Page seulement (ni API ni serveur : `cat` reste une chaîne synchronisée telle quelle).

- Constat (Charles) : les 7 types du formulaire « Nouveau » (Personnel, Santé, Professionnel, Famille, Sport / Loisir,
  Transport, Service, identifiés par des couleurs) ne correspondaient pas aux 7 du menu ⋮ : Personnel → « Voyages &
  Trajets », Sport / Loisir → « Amis & Loisirs », Service → « Mon temps libre » (temps protégé !), Transport sans case
  (`TC_AGENDA_ALIAS`).
- Une seule liste (`AGENDA_CATEGORIES`, dans l'ordre voulu) : Travail, Santé, Famille, Amis & Loisirs, Sport, Voyages &
  Trajets, Mon temps libre, Personnel. « Personnel » (`perso`, gris discret) est le type neutre, distinct de « Mon temps
  libre » (`personnel`, temps protégé). Le formulaire « Nouveau » porte les mêmes identifiants et libellés, « Personnel »
  par défaut ; « Prendre rdv » (pros) choisit `sante`.
- Migration des anciens identifiants (`TC_AGENDA_ALIAS`, appliquée à la lecture par `tcCatNormalisee`, donc aussi aux
  rendez-vous reçus du serveur) : green → travail, yellow → famille, purple → amis, red → sante (inchangés) ;
  blue (« Personnel » du formulaire ; avant → voyages) → perso ; orange (« Service » ; avant → Mon temps libre) → perso ;
  teal (« Transport » ; avant rien) → voyages. Décision prise seule : un rendez-vous enregistré « blue » par le menu ⋮
  d'avant la table (où blue voulait dire Voyages) devient « Personnel » ; le formulaire « Personnel » était le sens visible.
- Charly : `perso` (et `autre`, `divers`) → type neutre ; `temps_libre` reste « Mon temps libre » ; la consigne cite
  `perso`. Fenêtre « Modifier » : champ TYPE (liste `AGENDA_CATEGORIES`, type actuel sélectionné), appliqué à `e.cat`.
- Suite `verif-types-rdv` (liste, ordre, couleurs, formulaire = menu, correspondance des 7 anciens types, jamais vers
  « Mon temps libre », Charly, fiche), dans verifier.sh ; rouge sur la page d'avant.
- Non fait : « Mes disponibilités » garde ses 6 catégories (pas de disponibilité « pour un rendez-vous personnel » ni
  « pour un trajet »).
- Palette unique : la couleur CSS --cat-perso (et -bg, -texte) declaree avec la couleur JS ; suites verif-temps-libre et verif-formules-charly adaptees (perso = type neutre).
- Correctif après examen et décisions du chef (12/10) : (1) un rendez-vous sans indice (« rdv » dans un bloc construit par
  la page, « Coach ») → « Personnel », jamais Santé par défaut (`catMap.rdv = 'perso'`) ; (2) les anciens « orange »
  (Service, qui étaient « Mon temps libre ») RESTENT « Mon temps libre » : on ne déprotège jamais un rendez-vous existant
  (`orange → personnel`) ; (3) « Modifier » affiche le type actuel tel quel — un ancien identifiant est ramené à sa
  forme actuelle, un type inconnu (« loisir », « rdv »…) est montré en première option « (type actuel : loisir) »,
  « Personnel » si vide — et ne réécrit `e.cat` que si l'utilisateur a changé le choix (`data-initial`) ; avant, un
  type inconnu était réécrit « travail » en silence dès qu'on modifiait le titre. Le formulaire « Nouveau » revient à
  « Personnel » à chaque ouverture (le select gardait le dernier choix). La suite rejoue la fenêtre : « loisir »
  modifié par le titre reste « loisir », choisi « Sport » devient « sport », sans type rien n'est écrit.
  Suite verif-categories-titre adaptee (« Rendez-vous Marc » sans indice → Personnel).

## 12/10/2026 (session Codeur) — Synchro : « ce que j'ai changé ici gagne »

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (Testeurs, campagne 11 ; adjointe) : le thème changé dans les 10 s revenait seul à l'ancienne valeur ~15,7 s
  après le chargement (6/12) ; sur un compte dont le serveur n'avait pas encore `tc_rdv_validation`, décocher « Toujours
  attendre ma validation » était annulé ~1,5 s plus tard, plages douces comprises. Cause : le premier tour de synchro
  tire avant de pousser, et `tcSyncAppliquer` écrivait la liste du serveur (valeurs et « disparitions ») sans regarder
  ce qui avait changé localement depuis le dernier tour ; l'empreinte posée faisait ensuite croire qu'il n'y avait rien
  à pousser.
- Règle : `tcSyncModifieIci(type, local, empreinte, neuf)` — un objet local dont l'empreinte diffère de la dernière
  connue (ou sans empreinte connue alors que l'état n'est pas neuf) n'est ni écrasé ni supprimé par la réception ; son
  empreinte n'est pas touchée, il part au tour de poussée suivant. À l'état neuf (premier tour d'un compte sur cet
  appareil), le serveur fait foi. Les objets en lecture seule ne sont pas concernés. Rien n'est ré-appliqué à l'écran
  par-dessus un changement local.
- Complément demandé : un rendez-vous sans type est coloré « Personnel » dans l'agenda, comme dans « Modifier »
  (`tcCatNormalisee('')` = perso, avant travail).
- Suite `verif-sync-local-gagne` (vrai type « reglage » de TC_SYNC_TYPES rejoué sur un stockage factice : thème changé à
  3 s puis tour simulé → tient et est poussé ; clé absente du serveur → tient et part ; témoin inchangé → le serveur
  s'applique ; état neuf → le serveur fait foi), dans verifier.sh ; rouge sur la page d'avant.
- Limite : la règle s'applique à tous les types poussables (réglages, rendez-vous, tâches…) : un objet modifié des deux
  côtés entre deux tours garde la version locale, qui repart ensuite.

## 12/10/2026 (session Codeur) — Vue Semaine : la bande « toute la journée » range les voyages d'abord

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (Charles, semaine 46) : le voyage « RYDER CUP » du 11 au 15 novembre était sur la ligne du haut tous les jours
  sauf le 11, où le férié « Armistice 1918 » passait devant et le faisait descendre d'une ligne.
- `tcLignesBandeSemaine(jours, evenementsDuJour, reperesDuJour)` (pure) : les événements sur plusieurs jours sont posés
  d'abord, par ordre de début (puis le plus long), chacun sur la première ligne libre sur TOUS ses jours — il garde la
  même ligne du premier au dernier jour ; les fêtes (deux au plus, puis « +n ») et les événements d'un seul jour
  remplissent ensuite les lignes libres de leur jour, jamais au-dessus. Une ligne occupée un autre jour par un voyage
  est rendue par un espace invisible de même hauteur (`.tc-chip-evt` caché) pour garder l'alignement. `renderWeek`
  calcule la bande pour la semaine entière, puis rend chaque colonne ligne par ligne ; rendu des fêtes, « +n »,
  pastilles d'événements et en-tête cliquable inchangés.
- Vue Mois : pas de bande par lignes (pastilles dans la case du jour), rien à changer.
- Suite `verif-bande-semaine` (semaine 46 : voyage 11→15 sur la même ligne les 5 jours, Armistice en dessous le 11,
  rien de vide les 9 et 10 ; un 2e voyage, une fête un jour libre en haut, un espace réservé ; « +n » ; renderWeek),
  dans verifier.sh ; rouge sur la page d'avant. Capture 390×844 : `captures/mission32-bande-semaine.png`.
- Suites verif-premier-jour-semaine, verif-deplacer-au-doigt et verif-bloc-demi-case : extraction de tcLignesBandeSemaine (elles rejouent renderWeek).
- Examen : la pastille de fete prend la boite .tc-chip-evt (meme hauteur qu une pastille d evenement) : le trait d un voyage reste continu sous une fete.

## 12/10/2026 (session Codeur) — Carte d'une demande de rendez-vous : « Refuser » simple

**Codé et commité sur main, PAS publié.** Page + API (`backend/api/index.php`, à déployer par le chef de projet). Pas de SQL.

- Demande (Charles) : à côté de « Refuser et bloquer », un bouton « Refuser » : la demande est refusée calmement, la
  personne est prévenue (« [Prénom] ne peut pas donner suite à ta demande pour le moment. »), elle n'est PAS bloquée et
  peut redemander ; « Proposer un créneau » reste.
- API `POST /rdv/refuser` : champ facultatif `bloquer` (absent = true : les anciennes applications bloquent comme
  avant ; autre chose qu'un booléen → 400 `champ_invalide`). `bloquer: false` → statut « refusé », pas de
  `bloquerContact`, message posé par `messagePoser($moi, $demandeur, …, $rdvId)` (dans les deux messageries, comme une
  proposition de créneau), puis `demandeRdvTraitee` dans les deux cas.
- Page : bouton « ✋ Refuser » (gris #9aa0a6, même forme que ses voisins) entre « Proposer un créneau » et « Refuser et
  bloquer » ; `tcRefuserRdv` : confirmation « Refuser cette demande ? La personne sera prévenue, sans être bloquée. »,
  appel `refuserRdv(rdv, false)`, le cadre disparaît ; `TC_BACKEND.refuserRdv(rdv, bloquer)` n'envoie `bloquer: false`
  que pour un refus simple.
- Suites : `verif-refus-simple` (page + texte de la route) dans verifier.sh, rouge avant ; `verif-refus-simple-e2e`
  (api-locale, comptes sonde `e2erdv.refus…@exemple-timecool.fr` : 400 sur une mauvaise valeur, refus simple → pas de
  fiche bloquée, message reçu, carte traitée, demande close, nouvelle demande acceptée et reçue ; sans champ → blocage
  silencieux comme avant). Comptes sonde à supprimer au lancement (préfixe `e2erdv.refus`). Capture 390×844 :
  `captures/mission24-refuser.png`.
- verif-refus-simple-e2e NON enregistree dans verifier.sh tant que l API n est pas deployee (les e2e y tournent contre la production) : jouee a la main contre api-locale (TC_API=http://127.0.0.1:8099), 0 anomalie ; comptes sonde crees : XAGB04ZYJEBW, G88HPCJERNCV. Suites verif-validation-rdv et verif-blocage-silence adaptees (muet seulement quand on bloque).

## 12/10/2026 (session Codeur) — Langue et thème par compte ; connexion ; thème sombre

**Codé et commité sur main, PAS publié.** Page + API (deux réserves de la mission 24, à déployer par le chef de projet).

- (a) Langue et thème suivent le COMPTE : `reglage.poser` appliquait déjà le thème reçu ; la langue reçue est désormais
  appliquée à l'écran aussi (`tcAppliquerLangueRecue` : langue courante, mémoire de l'appareil, libellé, traduction de
  la page — `translatePageWithGoogle('fr')` restaure le français ; jamais repoussée au serveur, c'est la sienne). Dès la
  connexion (`showWelcomeSplash`), un tour de synchro part tout de suite : les réglages du compte arrivent sans attendre
  le tour périodique. Avant connexion : ceux de l'appareil (gardés au ménage) ; un compte sans réglage les adopte et
  ils partent au premier changement (`tc_reglages_gardes`, 16 bis) — c'est la règle demandée, verif-deconnexion inchangée.
- (b) À la déconnexion (`logoutUser`) et à chaque arrivée sur l'écran de connexion (`navigateAuth('auth-login')`),
  `tcViderChampsConnexion` vide e-mail et mot de passe, maintenant puis après l'autocomplétion du navigateur (300 ms,
  1200 ms).
- (c) Thème sombre cohérent : les grands fonds `.header`, `.main`, `.side-menu`, `.modal`, `.tc-mod` (fenêtre « Nom du
  nouvel agenda ») et la saisie `.tc-mod-in` suivent `var(--bg)` / `var(--text)` au lieu de `#fff` ; Paramètres (dans
  `.main`) et le menu latéral deviennent sombres, texte clair. Les fonds `#fff` posés en ligne sur des cartes restent
  clairs avec texte sombre : lisibles. Captures en sombre : `captures/mission25-sombre-menu.png`,
  `captures/mission25-sombre-agenda.png`, `captures/mission25-sombre-parametres.png`.
- Réserves de la mission 24 (API) : le message de refus simple part APRÈS la transaction (sa traduction est un appel
  externe) ; prénom passé par `texteSur`. `verif-refus-simple-e2e` enregistrée dans verifier.sh (API déployée) ;
  comptes sonde de la prod : 8BFGEY4KGQ87, GZMZC986AG1Y.
- Suite `verif-compte-langue-theme` (CSS, poser, tcAppliquerLangueRecue rejouée, showWelcomeSplash, champs vidés
  rejoués, logoutUser, navigateAuth), dans verifier.sh ; rouge sur la page d'avant.
- (c) Après captures en sombre : rendre la page `.main` et l'en-tête sombres donnait du sombre-sur-sombre (titre du mois
  et beaucoup de textes à couleur codée en dur, 182 fonds blancs en ligne). Choix autorisé par le chef de projet : le
  thème sombre ne touche que ce qui le suit déjà et reste lisible partout — page et en-tête restent clairs dans les
  deux thèmes ; le menu latéral, les fenêtres (`.modal`, `.tc-mod`, saisie) et les cartes de Paramètres
  (`renderSettingsInterne`, `var(--bg)`) suivent le thème : plus de texte clair sur carte blanche. Un thème sombre
  complet (tous les fonds et textes codés) est un chantier à part.
- 2e capture : entree active du menu (variable --menu-active : bleu clair en clair, bleu nuit en sombre) et titre / sous-titre de page (couleurs fixes, page claire) lisibles en sombre.
- 3e capture : la mise en avant « Charly IA » du menu (degrade) suit le theme (--menu-charly).
- (c) Décision du chef de projet (12/10) après le balayage de contraste de l'examinateur (ratio < 3 sur 8 écrans en
  sombre : Paramètres 66, agenda 25, menu 30… ; titre du mois à 1,2:1) : pas de thème sombre à moitié. Le thème
  « Sombre » garde seulement ce qui est déjà bien fait (menu latéral, cartes de Paramètres) ; TOUT le reste reste
  lisible comme en clair. Mécanique : les zones restées claires (`.header`, `.sub-header`, `.page` sauf Paramètres,
  `.auth-page`, `.modal`, `.tc-mod`, `.msg-sheet`) redéfinissent LOCALEMENT les variables claires (`--text`,
  `--text-sec`, `--border`, `--bg` clair, `--bg-soft`, `--bg-hover`, menu, violet) et posent `color:var(--text)` /
  `background:var(--bg)` — un élément sans `color` propre héritait de la couleur déjà calculée du `body` (claire), d'où
  les noms de la messagerie et du profil clairs sur blanc ; les badges « Semaine 42 » transparents prenaient le fond
  sombre du `body`. La fenêtre « Nouveau » revient à son état d'avant (fond clair, champs lisibles). Paramètres (zone
  sombre) : « Importer » en `var(--violet)` (#8430ce / #c58af9), « Je vouvoie » sur `var(--bg)` (y compris au restylage
  de `tcChoisirFormeMessages`), citation en gris fixe.
- Balayage de contraste `verif-contraste-sombre` (vrai Chrome sans tête, `cadre-contraste.html` : 8 écrans — agenda,
  contacts, messagerie, disponibilités, profil, Paramètres, menu, fenêtre « Nouveau » — en sombre et en clair témoin ;
  pour chaque élément portant du texte visible, rapport texte / fond effectif ≥ 3, émojis seuls ignorés ; tolérés car
  préexistants en clair : logo « COOL » jaune, sous-titre gris de l'en-tête, tirets des champs vides, « Aucune
  plage… »). Enregistrée dans verifier.sh : sur le serveur (sans Chrome) elle dit « non joué » et passe ; elle se
  rejoue sur un poste avec Chrome (`TC_CHROME`), ce que fait le Codeur avant chaque commit et l'examinateur.
  `verif-compte-langue-theme` calcule en plus le contraste des paires de variables des deux thèmes.
- API (réserve de l'examen) : `messagePoser` du refus simple sous `try/catch` après le commit : un refus enregistré ne
  devient jamais un 500 si la traduction échoue.
- Chiffrage d'un vrai thème sombre complet (mission à part) : 182 fonds `#fff` et une centaine de couleurs de texte
  codées en ligne à remplacer par des variables, plus les cartes, pastilles et boutons colorés à décliner — environ deux
  jours de travail, avec le balayage de contraste comme garde-fou.
- Dernier reste (examen) : le menu deroulant « Sauvegarde automatique » (#autoBackupFreq) suit le theme ; le balayage mesure aussi les select avec leur propre fond (rouge avant pour cet element).

## 12/10/2026 (session Codeur) — Agendas créés perdus au rechargement (mission 28, urgente)

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (adjointe, compte fanny.roux@) : un agenda créé disparaît au rechargement ; le 2e agenda créé écrase la liste
  sur le serveur. Cause : `loadCustomCalendars();` s'exécute au chargement du script (bloc de démarrage, avec
  `loadCurrentLanguage()`…) AVANT la ligne `const TC_CALENDARS_KEY = …` du même bloc : lire une `const` avant sa
  déclaration lève une erreur (zone morte), attrapée par le `try` de la fonction → repli « Mon agenda » seul, à chaque
  démarrage ; créer un agenda enregistrait alors [Mon agenda + le nouveau] depuis cette liste tronquée, et la synchro
  (réglage `timecool_custom_calendars`) écrasait la liste du serveur.
- Correctif : la constante est déclarée tôt, à côté de `let customCalendars` (lui-même déclaré tôt pour la même raison) ;
  l'ancienne ligne devient un commentaire qui renvoie à la déclaration.
- Suite `verif-agendas-recharges` : ordre déclaration → appel dans le script ; rejeu au chargement (deux agendas relus,
  un rendez-vous rangé dans « Sport » visible, un 3e agenda créé puis rechargé : les trois) ; témoin du défaut (appelée
  avant la constante : repli « Mon agenda » seul). Dans verifier.sh ; rouge sur la page d'avant.
- Côté comptes : les listes déjà écrasées sur le serveur ne reviennent pas d'elles-mêmes (les agendas perdus sont à
  recréer) ; les rendez-vous rangés dedans sont intacts et restent VISIBLES (`isCalendarVisible` rend vrai pour un
  agenda inconnu), ils gardent leur `calendarId`.
- Examen : meme zone morte pour loadConvocations() / TC_CONVOCATIONS_KEY (convocations de groupe vides a chaque demarrage) : constante declaree tot aussi ; la suite controle desormais TOUS les appels de demarrage (aucune constante lue declaree apres l appel) et rejoue les convocations.

## 12/10/2026 (session Codeur) — Réglages du compte : enregistrés toujours, appliqués dès la connexion (mission 25 bis)

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (Testeurs, campagne 15, un navigateur, F English+Sombre → D fr+clair → F) : (1) à la connexion de D, le
  français arrive mais le thème reste sombre jusqu'au rechargement ; (2) F ne retrouve pas English + Sombre ; (3) les
  options de la liste « Sauvegarde automatique » sont illisibles en sombre.
- Cause de (2), reproduite en simulation : `applyTheme` et `selectLanguageFromSettings` n'appelaient pas
  `tcSyncBientot` — seul le tour périodique poussait les réglages — et `logoutUser` révoquait la session sans poussée
  finale : un choix fait juste avant « Se déconnecter » n'était jamais enregistré, puis le ménage l'effaçait. Règle de
  Charles appliquée : un choix fait dans Paramètres est TOUJOURS enregistré dans le compte — il part tout de suite
  (`tcSyncBientot` après chaque choix) et `logoutUser` fait une dernière poussée (`tcSyncPousser`) avant
  `deconnecter()`.
- (1) `reglage.poser` applique le thème reçu dès qu'il diffère de ce qui est affiché OU de ce que l'appareil avait en
  mémoire (`themeAvant`) : un thème gardé du compte précédent n'est pas « le sien ».
- (3) `select option { background:#fff; color:#202124; }` : la fenêtre native des listes reste claire dans les deux
  thèmes.
- Suite `verif-reglages-compte-simule` : rejeu F → D → F → compte neuf N avec les VRAIES fonctions (tour de synchro,
  ménage, thème, langue, déconnexion) et un faux serveur par compte : C1 chaque choix demande une poussée, le compte de
  F reçoit en + sombre avant la fin de session ; C2 D voit clair et fr dès le tour de connexion, aucun compte ne reçoit
  les réglages de l'autre ; C3 F retrouve en + sombre ; C4 un compte neuf adopte les réglages de l'appareil sans les
  pousser, puis les enregistre au premier changement. Rouge sur la page d'avant (choix de F jamais poussés, non
  retrouvés ; sans la règle d'options). Dans verifier.sh.
- Non reproduit en simulation : le thème non appliqué à +3 s/+30 s chez D (la simulation l'applique déjà avec l'ancien
  code) — le correctif (1) rend l'application indépendante de l'état affiché ; à revérifier par les Testeurs en vrai.

## 12/10/2026 (session Codeur) — Charly : notes internes jamais affichées ni imitées (mission 34)

**Codé et commité sur main, PAS publié.** Page seulement.

- Constat (capture de Charles) : dans une bulle de Charly, « [proposition d'agenda faite a ce moment-la - l'agenda reel
  ci-dessus fait foi] », « ✅ C'est noté : 17 créneaux ajoutés… » et « On continue : pour les courses… » deux fois.
  Cause commune : le modèle recopie ce qu'il lit dans l'historique qu'on lui envoie (`tcHistoriquePourIA`) — la note de
  remplacement mise à la place des cartes, les bulles d'application (« C'est noté » du parcours guidé, question de suite
  `_followUp` remise par la page après validation) qu'il prenait pour ses propres mots.
- Correctif à la source : les bulles d'application (`appText`, nouveau marqueur `_app`) ne partent plus au modèle ; la
  carte `[AGENDA]` est remplacée par rien (l'agenda réel, envoyé à part, fait foi). Marquées `_app` : « ✅ C'est noté… »
  et la question de suite remise par la page.
- Filtre d'affichage `tcSansNotesInternes` (après `tcSansFormulesFaites`) : toute ligne ou mention entre crochets qui
  parle d'une proposition d'agenda / de l'agenda réel est retirée ; toute ligne « ✅ C'est noté : … ajouté(s) » d'une
  réponse du modèle aussi (c'est la page qui le dit) ; aucune ligne identique répétée dans une bulle ; bloc [AGENDA]
  conservé.
- Suite `verif-charly-notes-internes` (historique envoyé sans bulles d'application ni note ; la bulle de la capture
  devient « Parfait, je note ça ! 📞 / On continue : pour les courses… » une fois ; bloc conservé ; points d'entrée),
  dans verifier.sh ; rouge sur la page d'avant.
- Limite : une question de suite reposée par le modèle dans une AUTRE bulle n'est pas dédoublonnée ici (c'est le rôle
  de `tcSansRelance`, mission 17).
- Suites verif-memoire-agenda, verif-charly-campagne9 (la carte est remplacee par rien, plus de mention) et verif-charly-relance (filtre tcSansNotesInternes entre les formules et la relance) adaptees ; une ligne qui n etait qu une note interne disparait avec elle.
- Examen : un message d assistant devenu vide (carte seule) n est plus envoye au modele, deux messages de meme role qui se suivent sont fusionnes ; le dedoublonnage ne retire qu une ligne identique a la precedente ou une phrase longue deja vue (jamais un fait d une liste).

## 12/10/2026 (session Codeur) — Page Charly : zone d'écriture longue (mission 35)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (Charles) : quand on écrit plusieurs lignes à Charly, la conversation doit remonter avec la barre (le bas suit
  la hauteur réelle de la barre) et la zone d'écriture est limitée à 3 lignes, avec défilement interne au-delà.
- `autoResizeCharly` : hauteur remise à « auto », puis bornée à `tcHauteurMaxSaisie` (= 3 lignes × interligne calculé +
  marges et bordures ; `TC_SAISIE_LIGNES_MAX = 3`), `overflow-y:auto` au-delà ; puis `tcCalerBasConversation()` : le corps
  de la conversation (`#charlyChatBody`) reçoit en bas la place exacte de la barre (`offsetHeight` + 12 px) et, s'il était
  au bas, y reste (le dernier message reste visible pendant la frappe).
- Suite `verif-saisie-charly` (textarea factice 14 px / 20 px : 1, 2, 5 lignes → 43, 63, 83 px ; défilement interne à
  partir de la 4e ligne ; place en bas = barre + 12 ; position gardée si l'utilisateur lisait plus haut), dans
  verifier.sh ; rouge sur la page d'avant. Capture 390×844 avec 5 lignes saisies : `captures/mission35-saisie-longue.png`.

## 12/10/2026 (session Codeur) — Ligne « Semaine 42 · 🌍 GMT+02 · Europe/Paris » (mission 26)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (Charles) : sous la ligne du mois, les deux lignes « Semaine 42 » et « 🌍 GMT+02 · Europe/Paris » deviennent
  UNE ligne centrée (même police, même gris) ; sur 320 px le fuseau se raccourcit en « GMT+02 » ; la ligne « 📍 agenda
  secondaire » reste au-dessus ; rien d'autre ne bouge.
- `tcLigneSemaineEtFuseau(semaine, fuseau, largeur)` (pure) compose la ligne ; en vue Semaine, `#weekNumberBadge` la
  porte et `#timezoneBadge` se cache ; hors vue Semaine, l'inverse (comme avant). `updateTimezoneBadge` reste la source
  du texte du fuseau, et il est désormais appelé AVANT la ligne de semaine (sinon la première ligne était sans fuseau).
- Suite `verif-ligne-semaine` (390 px, 320 px, sans fuseau, fuseau à plusieurs segments ; bloc d'affichage ; styles),
  dans verifier.sh ; rouge sur la page d'avant. Capture 390×844 : `captures/mission26-ligne-semaine.png`.
- Suite `verif-premier-jour-semaine` adaptée : elle lisait `wnBadge.textContent = …` pour tester le numéro de semaine ; elle lit
  désormais le calcul `const semaine = …` (même valeur, mêmes 400 jours).

## 12/10/2026 (session Codeur) — Toucher une plage vide ouvre « Nouveau » pré-rempli (mission 36)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (Charles) : vues Jour et Semaine, toucher une plage horaire VIDE ouvre le formulaire « Nouveau » du bouton +,
  pré-rempli : jour touché, heure de début = ligne touchée arrondie au quart d'heure, durée 1 h, type Personnel ; le
  reste inchangé (Annuler ferme sans rien créer) ; le glisser-déposer et le toucher d'un bloc existant ne changent pas ;
  pas de déclenchement pendant un défilement (seuil de mouvement) ; vue Mois inchangée.
- `openCreateModal(prerempli)` : paramètre facultatif `{ date, heure, minute }` qui pose date, début et fin (+ 1 h, 23h59
  au plus) après le comportement habituel ; sans paramètre, rien ne change (« Personnel » reste le type par défaut).
- `tcInstallerToucherDePlage(corps, plage)` (pointerdown / pointerup / pointercancel sur le corps de la vue) ;
  `tcEstUnToucherDePlage` : toucher court (≤ 450 ms), immobile (≤ 8 px), hors bloc (`.week-event`, `.day-event`,
  bandeaux, pastilles, boutons), hors glisser en cours (`_tcDrag`) ; `tcHeureDeLaPosition` : quart d'heure COMMENCÉ
  (0/15/30/45 ; tout en bas → heure suivante ; 23h45 au plus) — décision seule : on touche « vers 10h15 », pas « vers 10h30 ».
  Vue Semaine : colonne = jour, ligne `.hour-row` = heure ; vue Jour : ligne `.day-hour` = heure, jour affiché. Le geste est
  posé une seule fois par corps : les jours affichés sont relus à chaque rendu (`body._tcWeekDates`, `body._tcJourISO`),
  jamais ceux du premier rendu (piège de closure trouvé à l'essai à blanc).
- Suite `verif-toucher-plage` (arrondi ; geste court / appui long / défilement / glisser / bloc ; vue Semaine simulée :
  mercredi 14 octobre, ligne 14h à 60 % → 14:30 → 15:30, type perso ; sans argument inchangé ; les deux vues installent
  le geste, pas la vue Mois ; glisser-déposer intact), dans verifier.sh ; rouge sur la page d'avant. Capture 390×844 :
  `captures/mission36-toucher-plage.png` (formulaire ouvert après un toucher simulé).
- Suite `verif-types-rdv` adaptée (signature `openCreateModal(prerempli)`) ; garde-fou `typeof tcInstallerToucherDePlage` dans renderWeek /
  renderDay pour les suites qui extraient ces fonctions seules.
- Complément (réserve de l'examinateur, validé par le chef de projet) : un toucher qui ARRÊTE un défilement lancé (élan du
  doigt) donne pointerdown / pointerup sans mouvement ; il n'ouvre plus « Nouveau ». Tout défilement (écouté en capture sur
  window, donc quel que soit le conteneur) note l'instant (`_tcDernierDefilement`) ; un toucher commencé moins de
  250 ms après (`TC_TOUCHER_APRES_DEFILEMENT_MS`) est ignoré. Suite complétée (100 ms → rien, 300-400 ms → ouvre). À faire
  valider sur téléphone (Charles).

## 12/10/2026 (session Codeur) — Journal d'activité : période et archives (mission 29)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (Charles) : sous Tout / Rendez-vous / Recherches Charly IA / Actions sur mon compte, une 2e ligne de pilules :
  « Du mois en cours » (défaut) / « Des 3 derniers mois » (période combinée avec le filtre du dessus) / « Archiver »
  (les entrées affichées passent dans « Archives », rien n'est supprimé) ; un bouton « Archives » à droite pour les
  consulter et les désarchiver. Même style de pilules.
- `tcDemarchesVisibles(liste, filtre, periode, archives, now)` (pure) : les plus récentes d'abord, catégorie + période
  (`tcDebutPeriodeDemarches` : 1er du mois en cours, ou 1er du mois d'il y a deux mois), non archivées ; dans les
  Archives, les archivées de la catégorie sans période. `tcArchiverDemarches` marque `archive: true` sur les entrées
  affichées (« Rien à archiver » sinon) ; `tcDesarchiverDemarche` l'enlève ; `tcBasculerArchivesDemarches` bascule la
  vue (le bouton devient « ↩️ Journal »). Le bouton « 🗂️ Archives » n'apparaît que s'il existe des archivées.
- Suite `verif-journal-periode` (périodes, combinaisons avec les catégories, archives, archiver / désarchiver, rendu),
  dans verifier.sh ; rouge sur la page d'avant. Capture 390×844 : `captures/mission29-journal.png`.
- Les entrées existantes sans champ `archive` restent dans le journal ; `archive` est synchronisé avec l'entrée
  (`timecool_demarches`, réglage transférable), rien ne change côté serveur.
- Correction avant verdict : désarchiver la DERNIÈRE archivée ramène au journal (sinon écran « Archives » vide, sans bouton de
  retour, puisque « Journal » n existe que s il reste des archivées). Assertion ajoutée à la suite.
- Décisions du chef de projet après examen (12/10) : (1) « Archiver » demande confirmation par `tcConfirm` (« Archiver ces
  N entrées ? Elles restent consultables dans Archives. », Oui / Non ; au singulier pour une seule) ; (2) rien ne devient
  invisible : la vue Archives montre les archivées ET tout ce qui a plus de 3 mois ou n'a pas de date (anciennes entrées),
  avec la mention « plus de 3 mois » (`tcDemarcheAncienne`) ; le journal et Archives se complètent exactement ;
  « Archives (N) » apparaît dès qu'Archives a quelque chose, et désarchiver la dernière entrée d'Archives ramène au
  journal ; (3) libellés courts « Ce mois » / « 3 derniers mois » / « Archiver », ligne en `flex-wrap` (deux lignes au
  besoin sur 390 px), jamais de défilement. Suite réécrite en conséquence (asynchrone, `tcConfirm` simulé).

## 12/10/2026 (session Codeur) — Charly n'invente jamais un rendez-vous (mission 31)

**Codé et commité sur main, PAS publié.** Page seulement.

- Constats (adjointe) : « annule le dentiste » sans dentiste, par un chemin qui atteignait le modèle (question, formulation
  sans mot de rendez-vous), donnait « Souhaites-tu que je l'annule ? » ; une simple question (« quand suis-je libre … ? »)
  produisait une carte « Proposition d'agenda » (lundi 8h30-12h « Rendez-vous »).
- `tcRdvViseIntrouvable(texte, now, events, mode)` (pure) : si la phrase porte un verbe d'annulation ou de déplacement
  (question comprise) et nomme quelque chose (mots de 4 lettres, hors verbes, jours, heures, mots creux), et qu'aucun
  rendez-vous à venir ne porte ce mot → « Je ne trouve pas de rendez-vous « dentiste » dans ton agenda à venir. Rien
  n’a été changé. » ; null si le rendez-vous existe, si rien n'est nommé (« annule mon rdv de mardi ») ou si c'est un
  contact (traité ailleurs). Appliquée AVANT le modèle (avec `tcRdvNommeIntrouvable`, campagne 6) et APRÈS : une réponse
  du modèle qui parle d'annuler / déplacer un rendez-vous inexistant est remplacée par ce même message.
- `tcSansCarteApresQuestion(reply, texte)` : une simple question (« ? » final, ou tête « quand / est-ce que / quel /
  ai-je / suis-je / combien / comment / pourquoi ») sans verbe de création → le bloc [AGENDA] est retiré, la prose
  reste ; appliqué dès la réponse du modèle, avant les autres filets.
- Suite `verif-charly-jamais-inventer` (horloge dimanche 11/10/2026 14h20, agenda sans dentiste à venir) ; dans
  verifier.sh ; rouge sur la page d'avant.
- Suite `verif-charly-citations` adaptée : elle attendait `tcRdvNommeIntrouvable(…)` seul avant le modèle ; la ligne porte aussi
  `|| tcRdvViseIntrouvable(…)` (même vérification, forme élargie).
- Corrections après examen (12/10) : (1) `tcRdvViseIntrouvable` se déclenchait sur un PRÉFIXE de verbe (« un déplacement à
  Lyon », « un reportage photo », « décalage horaire », « avancement du projet ») et bloquait des créations avant le modèle ;
  désormais le verbe CONJUGUÉ avec fin de mot (`tcVerbeConjugue('deplacement')` ou annul/supprim/effac/enlev/retir + e/er/
  es/ez/ons), et « ajoute » / « mets » dans les mots creux. (2) `tcSansCarteApresQuestion` retirait la carte d'une demande
  polie (« Peux-tu me mettre un rdv dentiste mardi à 15h ? ») ; désormais seule une question de CONSULTATION (quand, est-ce
  que j'ai, suis-je libre, quels, combien, y a-t-il…) perd sa carte ; jamais « peux-tu / tu peux / je peux / pourrais-tu »,
  ni une phrase qui porte un jour ET une heure. Cas ajoutés à la suite. À signaler : un rendez-vous existant nommé
  autrement (« annule le médecin » avec « Dr. Martin » à l'agenda) donne le refus calme « Je ne trouve pas… » (sans danger).

## 12/10/2026 (session Codeur) — « Envoyer mon commentaire » envoie vraiment (mission 33)

**Codé et commité sur main, PAS publié.** Page + API + migration 011 (à jouer par le chef de projet AVANT l'API, l'API avant la page).

- Demande (Charles) : le bouton « ✉️ Envoyer mon commentaire » de « Aide et commentaires » ne faisait qu'une copie locale et un
  toast « Merci ». Désormais : route `POST /commentaires` (compte obligatoire, `texte` requis ≤ 2000, `version` ≤ 40,
  `appareil` ≤ 120) qui enregistre en base (table `commentaires`, migration `011_commentaires.sql`, rejouable) PUIS envoie
  un e-mail à social@timecool.fr (`envoyerEmail` existant, sujet « Commentaire TimeCool — Prénom Nom », corps : texte,
  compte, version, appareil, date, numéro). L'e-mail est dans un try/catch : s'il échoue, la ligne reste (elle fait foi)
  et la réponse dit `email_envoye:false`. Un compte de test (`…@exemple-timecool.fr`) est enregistré mais ne déclenche
  jamais d'e-mail (les sondes e2e n'écrivent pas à l'équipe).
- Page : `sendFeedback` devient asynchrone ; copie locale `timecool_feedbacks` gardée (hors ligne, rien ne se perd) ;
  connecté → `TC_BACKEND.envoyerCommentaire(texte, {version, appareil})` ; `tcContexteCommentaire` : version du build
  (`tcInfosVersion`, « web » sur le site) et navigateur, rien de personnel ; toast « envoyé à l’équipe » si l'API a répondu,
  « enregistré » sinon. Déconnecté : comme avant.
- Aide : nombre de langues calculé (`tcNombreDeLangues` = langues actives de `SUPPORTED_LANGUAGES`, plus de « 17 » en dur) ;
  « Paramètres → Rappels » → « Paramètres → Notifications » ; phrase « ta propre clé / Configuration IA » retirée ; Journal :
  statuts (préparée, envoyée, confirmée…), mois en cours ou trois derniers mois, archivage (mission 29).
- Suites : `verif-commentaires` (page, API, SQL) dans verifier.sh ; `verif-commentaires-e2e` (compte sonde jetable, 200/400/401,
  tronquage) : à enregistrer dans verifier.sh APRÈS la migration et la mise en ligne de l'API (verifier.sh vise la production).
- Corrections après examen (12/10) : (1) API : plafond par compte avant l'INSERT, 5 par heure et 20 par jour → 429
  `trop_de_demandes` (chaque envoi coûte un e-mail SMTP synchrone ; même mécanique que `verifications`) ; (2) page : le champ
  se vide et le bouton se fige AVANT l'attente, un second toucher ne fait rien (jamais deux envois du même texte) ;
  (3) page : en cas d'échec (hors ligne, 500, plafond), le texte revient dans le champ et le toast dit « Pas envoyé :
  réessaie dans un instant » (« Trop de commentaires d’un coup » sur 429) ; « envoyé à l’équipe » seulement quand la ligne
  existe ; hors session : copie locale et toast d'avant, inchangés. Suite : simulation (succès, échec, 429, envoi en cours)
  et assertions API ; e2e : 5e passe, 6e → 429. Ordre de mise en ligne à tenir : migration, API, page.

## 12/10/2026 (session Codeur) — Mission 31 bis : jamais de carte après une consultation, « lequel ? » si plusieurs rendez-vous du même nom

**Codé et commité sur main, PAS publié.** Page seulement (+ e2e commentaires enregistré dans verifier.sh).

- Constat (adjointe, v2.0.352, navigateur neuf) : « Quand suis-je libre vendredi ? » (et le bouton « 🕐 Quand suis-je libre ? »)
  affichait la bonne liste PUIS une carte « Proposition d'agenda — vendredi 16 octobre — 8h30-12h — Rendez-vous ». Cause : la
  liste est produite par la page (`tcGererDemandeCreneau`, sans modèle), et au rendu `extractAgendaProposals` (« Format 3 »,
  détection libre « 16 octobre de 8h30 à 12h ») la lisait comme une proposition. Le filtre de la mission 31 ne portait que
  sur la réponse du modèle.
- Règle (chef de projet) : après une question de consultation, aucune carte, quelle que soit la réponse. `tcEstQuestionDeConsultation`
  (pure : quand…, suis-je libre, est-ce que j'ai, quels, combien, y a-t-il, y compris « Peux-tu me dire quand je suis libre » ;
  jamais une demande polie de création ni une phrase avec jour ET heure ; majuscule, « ? » collé, trait d'union sans effet) ;
  au rendu, `renderChatMessage` lit la demande qui précède la réponse (`tcDemandePrecedente`) et ne lit aucune proposition
  après une consultation. `tcSansCarteApresQuestion` s'appuie sur la même fonction.
- Complément (Testeurs, campagne 17) : « décale mon coiffeur à 18h » avec deux coiffeurs → `tcRdvNommeAmbigu` : « Tu as 2
  rendez-vous « coiffeur » : mercredi 14 octobre 10h, vendredi 16 octobre 17h — lequel ? », avant le modèle et dans
  `tcTraiterDeplacement` (jamais une action) ; null si un jour est cité, si « prochain / premier / dernier », si un seul.
- Même phrase « dans ton agenda à venir » pour annuler et décaler.
- Suite `verif-charly-jamais-inventer` complétée (section 4) ; `verif-charly-citations` élargie ; `lancer verif-commentaires-e2e`
  ajouté dans verifier.sh après verif-refus-simple-e2e (migration 011 jouée et API en ligne depuis v2.0.353).
- Rejoué en vrai Chrome contre le vrai modèle (compte de test) : voir le rapport.
- Correction après examen (12/10) : « Quand tu peux, ajoute un rdv dentiste mardi 15h » commençait par « quand » et perdait sa
  carte sans un mot ; désormais un verbe de création accompagné d'un jour ou d'une heure l'emporte sur « quand / comment /
  quel… » (`tcEstQuestionDeConsultation`) ; « Quand suis-je libre vendredi ? » reste une consultation. Cas ajoutés à la suite.

## 12/10/2026 (session Codeur) — Messagerie : contacts bloqués réels, phrase vraie sur les données (mission 27a)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (chef de projet, mission 27 scindée) : (a) « Contacts bloqués » (feuille Confidentialité & sécurité de la messagerie)
  listait… un toast « Aucun contact bloqué ». Désormais `openContactsBloques` liste les vraies fiches bloquées
  (`contactsList`, `blocked === true`, même état que la page Contacts et « Refuser et bloquer »), triées par nom, chacune
  avec « ✅ Débloquer » (`tcDebloquerContact` : `blocked = false`, `saveContacts` → synchronisation, page Contacts
  redessinée, toast) ; « Aucun contact bloqué. » sinon ; la feuille Confidentialité affiche « Contacts bloqués (N) ».
- (c) La phrase vraie, unique (`TC_PHRASE_CONFIDENTIALITE`) : « Tes messages et rendez-vous passent par les serveurs
  TimeCool, chiffrés en transit, et ne sont jamais vendus ni partagés. », dans la feuille de la messagerie (à la place de
  « Tes messages restent sur ton appareil… chiffrement de bout en bout en développement ») et dans Paramètres →
  Confidentialité & Sécurité (à la place de « Stockage local sur votre appareil »). Les lignes « Confirmations de lecture »
  et « Appareils connectés » (un simple toast, rien derrière) sont retirées.
- Suite `verif-contacts-bloques` (textes ; feuille simulée : liste, Débloquer, vide, compteur), dans verifier.sh ; rouge sur
  la page d'avant. Capture 390×844 : `captures/mission27a-contacts-bloques.png`.
- Hors périmètre, noté : `toggleContactBlock` (page Contacts) écrit le stockage sans `saveContacts` (la synchro part au tour
  suivant, pas tout de suite). 27b (convocations réelles, API) suit.
- Correction après examen (12/10) : la liste disait « ne peut plus te demander de rendez-vous ni t’écrire » ; or un contact
  bloqué peut encore écrire aujourd'hui (`POST /messages/envoyer` ne regarde pas le blocage, seules ses demandes de
  rendez-vous sont retenues en silence). Phrase vraie, celle de la fiche contact : « Ses demandes de rendez-vous ne
  t’arrivent plus, et cette personne ne le sait pas. » Décision du chef pour la 27b : le serveur retiendra aussi les
  messages d'un bloqué (200 pour lui, rien chez l'autre) ; la phrase dira alors « ne peut plus t’écrire ni prendre rendez-vous ».

## 12/10/2026 (session Codeur) — Convocations de groupe réelles, messages d'un bloqué retenus (mission 27b)

**Codé et commité sur main, PAS publié.** Page + API + migration 012 (ordre de mise en ligne : migration, API, page).

- Demande (chef de projet) : la convocation de groupe part réellement chez chaque membre qui a TimeCool (messagerie, via
  l'API), chacun répond Présent / Absent, l'organisateur voit les réponses ; les membres sans TimeCool restent notés par
  l'organisateur, et la page le dit ; date en clair « jeudi 15 octobre » partout. Règle ajoutée : un contact bloqué ne peut
  plus écrire à celui qui l'a bloqué (retenu côté serveur, en silence : 200 pour lui, rien chez l'autre), comme ses demandes.
- API : migration `012_convocations.sql` (tables `convocations`, `convocation_membres`, rejouables) ; `POST /convocations`
  (titre ≤ 120, groupe, date, début, fin, références ≤ 30 ; références inconnues rendues dans `sans_compte` ; une ligne de
  messagerie de genre « convocation » chez chaque membre, avec identifiant, horaire, `quand` en clair, statut `attente` ;
  un membre qui a bloqué l'organisateur ne reçoit rien) ; `POST /convocations/repondre` (membre seul, present | absent ;
  la ligne du membre est marquée statut + traitée, l'organisateur reçoit « ✅ Paul sera présent : « Entraînement », jeudi
  15 octobre. » de genre « convocation_reponse ») ; `POST /convocations/etat` (organisateur seul : membres, statuts) ;
  `messagePoser` accepte un `$complement` de champs ; `/messages/envoyer` : bloqué → écho chez l'expéditeur seulement.
- Page : la synchro garde `convocation`, `titre`, `quand`, `statut` sur les lignes ; `TC_BACKEND.envoyerConvocation /
  repondreConvocation / etatConvocation` ; dans une conversation du serveur, le cadre « 📅 Convocation : … — Olivia te
  convoque jeudi 15 octobre de 18:00 à 19:00. Seras-tu là ? » avec ✅ Présent / ❌ Absent (`tcRepondreConvocation`, puis
  synchro) ; `createNewGroup` retient nom → référence de compte (`membresRefs`) ; `createConvocation` (asynchrone) envoie
  vraiment aux membres avec TimeCool (sans session : toast ; échec : toast, rien de noté), garde `serveurId` et `quand`,
  marque `aMain` les membres sans TimeCool ; la feuille d'envoi dit « Envoyée dans TimeCool à N membres … M sans
  TimeCool : tu noteras leur réponse toi-même » ; le décompte lit les réponses sur le serveur (`tcRafraichirConvocation`),
  n'accepte le toucher que sur les membres « (sans TimeCool, noté à la main) », date en clair.
- Ajouts demandés par le chef : la page Contacts synchronise tout de suite après un blocage / déblocage (`saveContacts`) ;
  la réponse de démonstration de Charly dit la phrase vraie ; la liste des bloqués dit « Cette personne ne peut plus
  t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas. » (suite `verif-contacts-bloques` adaptée).
- Suites : `verif-convocations` (API, SQL, page, aides simulées) dans verifier.sh ; `verif-convocations-e2e` (api-locale,
  comptes jetables : envoi, réponses, état, refus, bloqué qui écrit) : à enregistrer dans verifier.sh après la mise en ligne.
- Suites `verif-blocage-silence` et `verif-absence` adaptées (paramètre `$complement` de messagePoser ; saveContacts dans le bac à sable ;
  nouvelle forme de /messages/envoyer) : mêmes vérifications.
- Complément (12/10, après la migration jouée par le chef) : les tables `convocations` et `convocation_reponses` existaient
  déjà en production (schéma initial, 0 ligne, aucune route) avec un autre dessin (debut / fin DATETIME, titre 200,
  reponse sans_reponse / present / absent). Décision : l'API s'appuie sur ce schéma ; `convocation_membres` (créée par la
  première version de la 012) est abandonnée, à supprimer par le chef (`DROP TABLE IF EXISTS convocation_membres`). La 012
  décrit désormais les deux tables existantes (rien à rejouer). `/convocations/etat` rend `attente` pour `sans_reponse`.
- Ajouts avant déploiement (examen de la 27b, décision du chef, 12/10) : (1) API : plafond 20 convocations par compte et par
  jour → 429 `trop_de_demandes` (avant l'INSERT) ; (2) page : les membres d'un groupe créé sont retenus par IDENTIFIANT de
  fiche + référence de compte (`membres`, plus `membresRefs` par nom) : deux contacts du même nom reçoivent chacun leur
  convocation ; la référence est relue sur la fiche (une personne qui a rejoint TimeCool depuis est reconnue) ; les anciens
  groupes (noms seuls) sont résolus par le nom, une fiche ne servant pas deux fois ; (3) API : « hier » toléré pour le jour
  (le jour du serveur peut être en avance sur celui de l'organisateur). e2e complété : deux homonymes, 20e passe / 21e →
  429, hier toléré / avant-hier refusé. Notées pour plus tard : réponse modifiable sans fin (un message à chaque fois).

## 12/10/2026 (session Codeur) — Import .ics : vraie durée, journée entière, lieu, invités, doublons, web sans fausse recherche (mission 30)

**Codé et commité sur main, PAS publié.** Page seulement (+ e2e convocations enregistré dans verifier.sh).

- Demande (chef de projet) : lire DTEND / DURATION (vraie durée), LOCATION, ATTENDEE (invités en note), événements sans
  heure → journée entière (pas 9h) ; doublons évités (même UID, ou même titre + même début) ; sur le web, pas de fausse
  recherche « 2 fichiers » : droit au choix du fichier.
- Un seul lecteur pur, `tcLireIcs` (+ `tcProprietesIcs`, `tcTexteIcs`, `tcDateIcs`, `tcDureeIcs`) pour les deux imports
  (Paramètres `importIcsData`, et « Importer mon ancien agenda » `processIcsImport`) : lignes repliées recollées, DTSTART /
  DTEND avec TZID (heure gardée) ou en UTC (Z, ramenée à l'heure locale), VALUE=DATE → journée entière (`allDay`, 0:00-23:59,
  DTEND exclusif → `dateFin` pour une période), DURATION, sans fin → +1 h, fin un autre jour → 23:59, LOCATION → `lieu`,
  DESCRIPTION et ATTENDEE (CN ou adresse) → `notes` (« Invités : … »), UID gardé, « \, » « \; » « \n » décodés, type Personnel.
- `tcEstDoublonIcs` / `tcPreparerImportIcs` : un événement déjà dans l'agenda (même UID, ou même titre à la casse près +
  même jour + même heure) ou en double dans le fichier n'entre pas ; le nombre d'ignorés est dit (toast des Paramètres,
  écran « C'est terminé ! »). Les passés sont comptés sur la date de fin.
- Web : `startIcsAutoScan` et `finishIcsAutoScan` vont droit à `renderIcsChoixFichier` (« Choisis ton fichier .ics ») quand
  `TimeCoolNative.findLatestIcs` n'existe pas ; plus de faux « 1 fichier / 2 fichiers » ni de faux « mon-agenda.ics ». La
  recherche réelle reste à l'application Android.
- Suite `verif-import-ics` (export façon Google : repli, TZID, journée entière, période, DURATION, UTC, lieu, invités,
  virgules, UID double, sans date, sans titre ; doublons avec l'agenda et rejeu du fichier ; les deux imports ; le web) dans
  verifier.sh ; rouge sur la page d'avant. `lancer verif-convocations-e2e` ajouté après verif-commentaires-e2e (27b en ligne).
- Suites `verif-google-agenda-depart` et `verif-import` adaptées (lecteur commun, `showImportSuccess(count, passes, doublons)`) :
  mêmes vérifications.
- Ajout du chef (adjointe, v2.0.356) : la carte rouge de la fiche d'un contact bloqué dit la phrase de la liste : « Cette
  personne ne peut plus t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas. » (le message fugace du blocage
  ne change pas). Suites `verif-blocage-silence`, `verif-vocabulaire-formulaire` et `verif-contacts-bloques` alignées.
- Corrections après examen (12/10) : (1) les blocs VALARM (leur DESCRIPTION « Reminder ») sont retirés du VEVENT avant
  lecture : jamais la note du rendez-vous ; (2) la fin d'une période journée entière recule d'un jour de CALENDRIER (24 h
  faisaient perdre un jour au changement d'heure de printemps) ; (3) STATUS:CANCELLED → ignoré, compté à part (`annules`) ;
  (4) une date impossible (20261340, 20260230, 25h) est refusée dans `tcDateIcs` (la date relue doit être celle écrite).
  Cas ajoutés à `verif-import-ics`. Réserves notées, sans correction : RRULE / EXDATE (une seule occurrence), TZID gardé.

## 12/10/2026 (session Codeur) — Groupes de la messagerie synchronisés, décomptes relus (mission 27c)

**Codé et commité sur main, PAS publié.** Page seulement (aucun changement d'API : /sync accepte déjà tout type d'élément).

- Constat (Testeurs, campagne 18, v2.0.356) : le groupe disparaissait de la messagerie après déconnexion / reconnexion, et
  le décompte restait « en attente » tant qu'on ne le rouvrait pas. Cause : le bloc `timecool_messages` voyageait comme
  réglage mais n'était jamais rechargé en mémoire ; après reconnexion, la mémoire vide (`messages = {user:[],pro:[]}`)
  l'écrasait au premier enregistrement.
- Famille « groupe » de `TC_SYNC_TYPES` (un objet par groupe, comme un contact) : `tcGroupesPourSync` (id `grp_<clé>`,
  mode, nom, membres par identifiant + référence relus sur les fiches, trace = lignes système ≤ 50, convocations
  rattachées) ; `tcPoserGroupes` (recrée ce qui manque avec la même clé, met à jour nom / membres / trace sans doublon /
  convocations et leurs statuts, supprime un groupe disparu ailleurs, enregistre, redessine la messagerie, relit les
  décomptes). `timecool_messages` et `timecool_convocations` sont retirés des réglages (TC_SYNC_DEJA_SYNCHRONISE) : les
  conversations locales simples restent à l'appareil, celles du serveur ont leur famille.
- `tcRafraichirToutesConvocations(force)` : relit sur le serveur les réponses de toutes les convocations envoyées (au plus
  une fois par minute sans force) ; appelée au chargement de la messagerie (`renderMessages`), à l'ouverture d'un groupe
  (`openConversation`) et à la réception des groupes ; le décompte ouvert (`ov._tcConvocId`) est rouvert à jour.
- « ✕ Absent » : la page affiche déjà « ❌ Absent » (ligne reçue et décompte) ; le « ✕ » vu par les Testeurs vient du rendu
  de l'emoji sur leur appareil ; rien à changer.
- Suite `verif-groupes-sync` (famille, clés, rafraîchissements, simulation : départ → appareil vide → retour avec membres,
  trace et décompte ; mise à jour ; suppression ; cadence) dans verifier.sh ; rouge sur la page d'avant. Rejeu réel en Chrome
  contre la production (compte sonde : groupe + convocation poussés, déconnexion, reconnexion, retour) : voir le rapport.
- Trouvé au rejeu réel : à la déconnexion, `tcViderDonneesDuCompte` effaçait le stockage mais laissait les convocations en
  mémoire (`groupConvocations`) ; le compte suivant les voyait jusqu'au rechargement. Vidées aussi, la synchro du compte
  suivant rapporte les siennes (assertion ajoutée à `verif-groupes-sync`).
- Correction après examen (12/10) : les convocations d'un groupe supprimé (ici ou ailleurs) restaient orphelines dans
  `groupConvocations` et étaient relues sur le serveur à chaque ouverture, pour toujours. `tcPurgerConvocationsOrphelines`
  (retire celles dont le groupe n'existe plus, enregistre) appelée par `tcPoserGroupes` (groupe disparu ailleurs) et par
  `deleteGroupFromList` (suppression ici, qui demande aussi la synchro tout de suite). À l'ouverture d'un groupe, seules
  SES convocations sont relues (`tcRafraichirToutesConvocations(true, groupMsgId)`). Cas ajoutés à `verif-groupes-sync`.

## 12/10/2026 (session Codeur) — Page du lien reçu : toucher sélectionne, un bouton confirme (mission 37)

**Codé et commité sur main, PAS publié.** Page publique `backend/web/rdv.html` seulement (servie par api.timecool.fr/rdv/… :
à mettre en ligne par le chef de projet avec l'API ; aucune route ne change).

- Demande (chef de projet) : sur la page du lien reçu, toucher un créneau le sélectionne, un bouton « Confirmer ce
  créneau » confirme. Avant : le premier toucher envoyait la réponse (sauf le créneau désigné par `?c=`, déjà mis en avant).
- `_choix` (créneau touché) et `selectionnerCreneau(i)` : le toucher met en avant (✅, cadre bleu) et redessine ; `renderSlots`
  prend le créneau touché, sinon celui que le lien désigne ; le bouton « Confirmer ce créneau » (ex « Confirmer ce
  rendez-vous ») n'apparaît qu'avec un créneau mis en avant et lui seul appelle `chooseSlot` ; « Aucun de ces créneaux ne
  me convient » reste en un geste ; textes « Touche le créneau qui te convient, puis confirme-le : » / « Confirme le
  créneau que tu as choisi, ou touches-en un autre : » ; après un créneau pris entre-temps (409), la sélection repart de zéro.
- Suite `verif-lien-rdv` (page + simulation : départ, toucher, autre toucher, index hors liste, lien `?c=3`, toucher qui
  l'emporte) dans verifier.sh (`lancer verif-lien-rdv backend/web/rdv.html`) ; rouge sur la page d'avant.

## 12/10/2026 (session Codeur) — Agendas : l'interrupteur afficher / masquer par agenda revient (mission 38)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (chef de projet) : remettre l'interrupteur afficher / masquer par agenda (pastille dans « Mes agendas » du menu et
  dans « Créer un nouvel agenda »), en cohérence avec le texte « l'activer ou le désactiver à tout moment » ; « Mon agenda »
  ne peut pas être masqué ; accord « 1 rendez-vous sera transféré ».
- Constat : `isCalendarVisible` respectait déjà `visible`, `toggleCalendarVisibility` existait sans commande, et
  `navigate('calendar')` remettait tout visible de force (vestige de l'ancienne isolation, qui n'écrit plus `visible`).
- `tcPastilleAgendaHTML(cal, taille)` : la pastille de couleur devient l'interrupteur (pleine = affiché, cercle vide =
  masqué ; `role="switch"`, titre « Masquer / Afficher cet agenda » ; un toucher bascule sans ouvrir l'agenda,
  `stopPropagation`). Dans le menu « Mes agendas » (14 px) et dans « Créer un nouvel agenda » (18 px) ; un agenda masqué
  est grisé avec « (masqué) » ; le nom ouvre toujours l'agenda seul. `toggleCalendarVisibility` refuse « Mon agenda » (un
  mot le dit). La remise à zéro de `navigate('calendar')` est retirée : un agenda masqué à la main le reste. Mot
  d'explication complété sur la page ; « 1 rendez-vous sera transféré » au singulier.
- Suite `verif-agendas-interrupteur` (page ; simulation : pastille pleine / vide, masquer → rendez-vous cachés, remontrer,
  « Mon agenda » refusé, accord singulier / pluriel) dans verifier.sh ; rouge sur la page d'avant. Captures 390×844 :
  `captures/mission38-menu.png`, `captures/mission38-agendas.png`.
- Suites `verif-menu-agendas` et `verif-mon-agenda` adaptées (elles chargent `tcPastilleAgendaHTML`) : mêmes vérifications.
- Correction après examen (12/10) : la zone de toucher de la pastille était celle du dessin (14 / 18 px) ; au doigt, le
  toucher tombait sur la ligne et ouvrait l'agenda seul. Une enveloppe de 36 px (marges négatives : la mise en page ne
  bouge pas) porte le toucher (`role="switch"`, `stopPropagation`), le dessin garde sa taille. Assertion ajoutée (zone ≥ 32).
  Réserves notées, sans correction : pas de clavier sur l'interrupteur ; un `visible:false` d'une ancienne version se voit
  par la pastille vide.

## 12/10/2026 (session Codeur) — Journal d'activité : les gestes faits à la main et les messages d'absence (mission 39)

**Codé et commité sur main, PAS publié.** Page seulement.

- Demande (chef de projet) : enregistrer aussi les rendez-vous créés / modifiés / supprimés à la main (bouton + et fiche)
  et l'envoi d'un message d'absence, au même format d'entrée que les actions de Charly.
- `tcJournaliserRdvManuel(geste, e)` (créé → « 📅 Rendez-vous créé — titre », statut ajoutée ; modifié → ✏️, statut
  modifiée ; supprimé → 🗑️, statut annulée ; catégorie Rendez-vous ; résumé = `tcLigneRdvPourJournal` « mardi 13 octobre,
  15h-16h » / « toute la journée » / « du … au … » ; détail « Tu as créé / modifié / supprimé ce rendez-vous toi-même : … » ;
  champ `manuel`), appelée dans `saveNewEvent`, `saveEventEdit`, `deleteCurrentEvent` après l'enregistrement.
- `tcJournaliserAbsencesEnvoyees(conversations)` : à la réception des conversations du serveur, chaque ligne « absence »
  de moi (réponse d'absence partie automatiquement) fait une entrée « 🏖️ Message d’absence envoyé à … » (statut envoyée,
  catégorie Actions sur mon compte, datée du message), une seule fois (clé référence + instant).
- Le statut « modifiée » a enfin son étiquette (✏️ Modifiée) et sa couleur (il s'affichait brut).
- Suite `verif-journal-manuel` (points d'ancrage ; simulation des entrées, dates lisibles, échappement, absence sans
  doublon) dans verifier.sh ; rouge sur la page d'avant. Capture 390×844 : `captures/mission39-journal.png`.
- Correction après examen (12/10) : le résumé du message d absence était coupé APRÈS l échappement (entité « &quot; » tranchée) ;
  le texte brut est coupé à 200 puis échappé. Cas ajouté à la suite. Réserve notée : le déplacement au doigt n est pas journalisé.
- Complément (chef de projet, 12/10) : le déplacement au doigt (glisser-déposer) fait une entrée du Journal, une seule par
  geste terminé (`tcJournaliserDeplacementDoigt`, appelée par `tcMontrerDeplacement` : « ↔️ Rendez-vous déplacé — Dentiste »,
  « mardi 13 octobre 15h00 → mardi 13 octobre 16h00 », statut modifiée, catégorie Rendez-vous) ; « Annuler » dans la bulle
  retire cette entrée (`tcRetirerEntreeDeplacement`, identifiant gardé avec la bulle). Rien pendant le geste, rien pour un
  dépôt au même créneau ni pour « Je décale » (rendez-vous avec un autre compte).

## 13/10/2026 (session Codeur) — Documents joints à un rendez-vous (mission 40a)

**Codé et commité sur main, PAS publié.** Page + API + migration 013 (jouée par le chef le 12/10 ; ordre de mise en ligne :
API avant la page). Dossier des fichiers en production : `/var/www/vhosts/timecool.fr/private/documents` (créé par le chef,
700, utilisateur PHP) ; en local (api-locale) : `backend/private/documents` (hors git). Clé de config facultative
`documents_dossier` (défaut `../private/documents` depuis l'API), `documents_max_octets` (2 Mo), `documents_max_compte` (20 Mo).

- Demande (chef de projet) : dans la fiche d'un rendez-vous, un bouton « 📎 Documents » (joindre depuis l'appareil ; Google
  Drive web = 40b après la clé API ; sur Android, le sélecteur du téléphone propose Drive parmi les sources), liste des
  documents (ouvrir, retirer) ; entrée « 📎 Mes documents » dans le menu ☰ sous Analyse de mon temps (tous, par rendez-vous).
  Fichiers sur le serveur, hors racine web, chiffrés au repos ; plafond 2 Mo par fichier (PHP en prod : 2M), 20 Mo par
  compte ; types pdf, images, docx / xlsx / pptx, txt ; message clair quand ça dépasse.
- API : `POST /documents` (multipart `fichier` + `rdv` ; erreurs PHP de taille → 413 ; vide → 400 ; nom sûr ; type par
  extension ET contenu (finfo), sinon 415 ; plafond fichier → 413 « Ce fichier fait 3 Mo : 2 Mo au plus par document. » ;
  compte plein → 413 espace_plein ; INSERT puis fichier `Coffre::chiffrer` dans `<dossier>/<compte>/<id>.bin`, ligne retirée
  si l'écriture échoue) ; `GET /documents?id=` (compte seul, 404 sinon ; déchiffré ; type, inline, nosniff, no-store) ;
  `POST /documents/liste` (par rendez-vous ou tout : documents, occupe, max_fichier, max_compte) ; `POST /documents/supprimer`
  (supprime_le + fichier effacé). Aides : documentsDossier, documentsMaxOctets, documentsMaxCompte, documentsMoLisible,
  documentsChemin, documentsNomSur, documentsTypeAutorise, documentsLigne (jamais le chemin).
- Page : `documentsList` (clé `tc_documents`, famille « document » de TC_SYNC_TYPES : la liste seule, ≤ 1 Ko par document,
  jamais le fichier ; clé dans TC_SYNC_DEJA_SYNCHRONISE ; vidée à la déconnexion) ; TC_BACKEND.envoyerDocument (multipart,
  90 s), listerDocuments, supprimerDocument, lireDocument (Blob) ; fiche : ligne « Documents (N) » (tcLigneDocumentsFiche :
  liste avec Ouvrir / Retirer, « ➕ Joindre un document » = champ fichier caché aux types acceptés, plafond dit ; hors
  session, un mot) ; tcRefusDocument (type, vide, trop gros : « Ce fichier fait 3 Mo : 2 Mo au plus par document. ») avant
  tout envoi ; tcOuvrirDocument (Blob → nouvel onglet, ou téléchargement pour Word / Excel / PowerPoint) ; tcRetirerDocument
  (confirmation, serveur, liste) ; un rendez-vous supprimé (fiche ou Charly) emporte ses documents (tcSupprimerDocumentsDesRdv,
  sans bloquer) ; page « Mes documents » (renderDocumentsPage : total et place sur 20 Mo, groupes par rendez-vous avec titre et
  date, « Rendez-vous supprimé » pour les orphelins) ; menu « 📎 Mes documents » dans les deux modes. Rien n'est lu au démarrage.
- Suites : `verif-documents` (API, SQL, page, aides simulées) dans verifier.sh ; `verif-documents-e2e` (api-locale, comptes
  jetables : texte, PNG, PDF, texte déguisé en PNG → 415, .exe → 415, 2 Mo + 1 → 413 avec message, vide, rendez-vous mal
  formé, sans session, sans fichier, lecture octet pour octet, autre compte → 404, liste, retrait, nettoyage) : à enregistrer
  dans verifier.sh après la mise en ligne de l'API.
- Corrections après examen (13/10) : (1) API : la suppression d'un compte (POST /admin/supprimer) efface aussi ses fichiers et
  son dossier (`documentsEffacerDuCompte`, appelée avant le DELETE ; rien n'échoue si le dossier manque) ; (2) page : un
  effacement fait hors ligne n'est plus perdu : l'identifiant est noté (`tc_documents_a_effacer`, à l'appareil, jamais au
  serveur, vidé à la déconnexion) et rejoué à chaque tour de synchro (famille « document »), avant un envoi et à l'ouverture
  de « Mes documents » ; « Mes documents » relit la liste du serveur et montre ce qui manque ici (autre appareil, effacement
  perdu) sous « Rendez-vous supprimé » avec Retirer ; « espace plein » y renvoie ; le plafond du compte vient du serveur
  (max_compte) dès qu'une liste est lue. Cas ajoutés à `verif-documents`. Réserves notées, sans correction : l'ouverture
  d'un document après une attente (navigateurs mobiles, à rejouer par les Testeurs) ; lien Drive sans contrôle du schéma
  (40b : https seulement) ; aucun plafond du nombre d'envois par heure (la place est bornée).
- Correction (13/10) : l identifiant du compte à supprimer est lu sans le filtre « clôturé » de compteParReference : un compte
  clôturé se supprime aussi, et ses fichiers avec lui. Vérification statique ajoutée.
- Mission 40c (13/10, chef de projet ; défauts des Testeurs sur v2.0.362) : (1) iPhone : « Ouvrir » ouvre la fenêtre DANS le
  geste (`window.open` avant l'attente du fichier, un mot d'attente dedans), puis y pose le fichier ; fenêtre refusée ou
  type qui ne s'affiche pas (Word, Excel, PowerPoint) → téléchargement avec un mot calme ; erreur → la fenêtre se ferme ;
  le blob est libéré après une minute ; lien Drive ouvert seulement s'il commence par https. (2) Taille qui ne se contredit
  jamais : arrondie vers le HAUT au centième de Mo (« 2,01 Mo » pour 2 Mo + 200 octets, « 1024 Ko » juste sous 1 Mo), même
  règle page (`tcTailleLisible`) et serveur (`documentsMoLisible`). (3) La fiche d'un rendez-vous relit ses documents sur
  le serveur à l'ouverture (`tcRapprocherDocumentsDuRdv` : une petite requête `POST /documents/liste` pour ce seul
  rendez-vous, au plus une fois par minute par rendez-vous, rien au démarrage) : joints depuis un autre appareil, ils
  apparaissent ; disparus là-bas, ils s'effacent ici ; un effacement en attente n'est pas rapporté ; la fiche se redessine
  si quelque chose a changé. `verif-documents` complétée ; `verif-documents-e2e` enregistrée dans verifier.sh (l'API
  40a est en production). Non vérifié ici : le geste réel sur iPhone (Testeurs).
- Correction après examen (13/10, 40c) : la fiche ne se redessine après le rapprochement que si elle est encore en lecture (pas de #editTitle) : une saisie dans « Modifier » ne disparaît plus. Deux cas ajoutés à verif-documents.
- Mission 40d (13/10, chef de projet ; rejeu des Testeurs sur v2.0.363) : (1) application Android : la WebView n'ouvre ni
  fenêtre vide ni blob et ne télécharge pas ; « Ouvrir » passe par un pont natif `TimeCoolNatif.ouvrirDocument(nom, base64,
  type)` (MainActivity : fichier posé dans le cache `documents/`, jamais dans les Téléchargements, donné par le FileProvider
  à un Intent ACTION_VIEW avec le type, hors du fil principal ; `file_paths.xml` expose `documents/` en plus de `maj/`) ;
  réponse vrai/faux à `tcOuvertureDocumentResultat` ; la page (`tcOuvrirDocumentDansAndroid`) ne dit jamais qu'un document
  est ouvert ou téléchargé : si aucune application ne sait l'ouvrir, un mot calme ; le web ne change pas. (2) API : quand
  PHP refuse la taille avant nous (UPLOAD_ERR_INI_SIZE), « Ce fichier fait environ 2,01 Mo : 2 Mo au plus par document. »
  d'après Content-Length, sinon « Ce fichier est trop gros : … » ; plus de « dépasse 2 Mo ». `verif-documents` reçoit
  MainActivity.java et file_paths.xml en plus. Non vérifié ici : la compilation de MainActivity (pas d'android.jar ; c'est la
  construction de l'APK) et le geste réel sur un téléphone Android (PDF, image, Word, et un type sans application).
- Mission 40e (13/10, chef de projet ; réserve de l'examinateur sur 40d, décision du chef) : les copies déchiffrées posées
  dans `cache/documents/` par « Ouvrir » (application Android) sont effacées à la déconnexion (pont
  `TimeCoolNatif.viderDocumentsOuverts`, appelé par `tcViderDonneesDuCompte`, garde typeof : sans effet sur le web) et au
  démarrage de l'application (`onCreate`, avant le pont). `viderDocumentsOuvertsReellement` n'efface que les fichiers de ce
  sous-dossier (jamais `maj/` ni le reste du cache), hors du fil principal, sans se plaindre d'un fichier encore ouvert
  ailleurs. Rien ne change à l'écran. Trois cas ajoutés à `verif-documents`. Non vérifié ici : compilation (construction de
  l'APK) et effacement réel sur un téléphone.
- Mission 41 (14/10, chef de projet ; ok de Charles le 13/10 au soir) : fin de la boucle de chargement, garde-fou, panneau
  « Vérifions ensemble ». Cause de la boucle, lue dans les traces du 13/10 (51 688 requêtes en une journée depuis
  l'adresse de Charles, jusqu'à 355 par minute, `/sync?depuis=0` et `/sync?depuis=18` en alternance toutes les
  secondes, avec les 5 clés à chaque fois) : deux onglets sur deux comptes dans le même Chrome. Le stockage du
  navigateur (jeton, curseur `tc_sync_version`, marqueur `tc_compte_local`) est commun aux onglets, la mémoire
  (`userAccount`) ne l'est pas : `tcSyncEtat` voyait le curseur de l'autre compte → version 0 → chargement complet,
  et `tcPreparerAppareilPourCompte` prenait l'autre onglet pour un intrus → ménage (d'où « Chargement de tes
  données… » qui clignotait et les clés rapatriées), chaque onglet à son tour. (1) Règle : le compte qui fait foi est
  celui du stockage (`tcCompteDuStockage`) ; un onglet dont la mémoire ne correspond plus (`tcOngletPerime`) ne fait
  aucun ménage et se recharge (« Un autre compte vient de s'ouvrir dans TimeCool : cette page se recharge ») ; une
  session fermée dans un autre onglet recharge aussi (événement `storage` sur le jeton et le compte) ; le ménage du
  compte précédent se fait dès la connexion (`submitLogin`, `saveUserAccount`), avant le premier chargement.
  (2) Garde-fou : plus de 3 chargements complets en 30 s (`tcNoterRechargementComplet`) → synchro arrêtée
  (`_tcSyncBloquee`) et panneau « Quelque chose empêche TimeCool de se charger. » : « Réparer »
  (`tcReparerDonneesLocales` : ménage, session gardée, une seule synchro) et « Envoyer le rapport ». (3) « Vérifions
  ensemble » (`tcVerifionsEnsemble`) à la place de « Serveur injoignable » aux 5 endroits de la connexion et de la
  création de compte (réseau et délai dépassé) : « Tester ma connexion » (`GET /sante`, 8 s, sans cache) avec un
  constat en mots simples, puis six gestes un à un (« Ça marche » / « Ça ne marche pas »), puis « Envoyer le
  rapport ». Rapport (`tcRapportTechnique`) : version, navigateur, compte ou identifiant saisi, en ligne, adresse,
  résultat du test, 20 dernières requêtes (chemin sans paramètres, statut, durée, notées dans `tcAppel`), 10 dernières
  erreurs ; jamais de mot de passe ; rien de stocké. API : `POST /rapports-techniques` (sans session obligatoire,
  `compteOptionnel` rattache le compte si le jeton est valable, 32 Ko au plus, 10 par heure et par adresse, gardé en
  base, pas d'e-mail), migration `014_rapports_techniques.sql`. Nouvelle suite `verif-boucle-compte` (deux onglets
  simulés sur un stockage commun, garde-fou, réparation, test de connexion, rapport, API, migration) ;
  `verif-rapports-techniques-e2e` (à enregistrer après la mise en ligne de l'API). Aucun nouveau réglage ; rien au
  démarrage sauf deux écouteurs d'erreurs et deux petites listes en mémoire.
- Mission 41, suite (14/10) : rejeu réel dans Chrome (deux cadres sur un même stockage, comptes de test, API de
  production). Deux comptes : l'onglet périmé se recharge avec le mot, aucun ménage répété, garde-fou muet. Mais un
  SECOND va-et-vient est apparu, présent aussi sur la page publiée : un second onglet ouvert sur le MÊME compte
  (page chargée après coup) poussait les trois rendez-vous de démonstration chaque seconde, dans les deux onglets.
  Cause : `generateEvents()` les crée avec les anciennes couleurs (« orange », « yellow ») ; l'onglet qui les relit
  depuis le stockage les normalise (« personnel », « famille », `tcCatNormalisee`) ; chaque onglet voit l'autre
  version comme « modifiée ici » (`tcSyncModifieIci`) et la repousse. Les rendez-vous de démonstration naissent
  désormais avec la catégorie normalisée (littéraux : `TC_AGENDA_ALIAS` n'existe pas encore quand `generateEvents()`
  s'exécute). Cas ajouté à `verif-boucle-compte` ; rejeu réel « second onglet » : calme après correction.
- Mission 41 c (14/10, chef) : l'e2e `verif-rapports-techniques-e2e` est rejouable à volonté et enregistrée dans
  verifier.sh (après verif-documents-e2e). Elle n'envoie plus que trois rapports par passage (sans session, jeton
  valable, jeton inconnu ; le corps vide et le trop gros ne créent pas de ligne) et ne teste plus le plafond en
  envoyant 12 rapports : le plafond de 10 par heure et par adresse ne s'applique pas aux appels venus du serveur
  lui-même (127.0.0.1, ::1, 82.165.253.73, même liste que GET /taches/rappels), d'où tournent les suites ; les
  utilisateurs le gardent. Le plafond est vérifié en lecture par `verif-boucle-compte`. L'API change : à redéployer.
- Mission 41 d (14/10, chef, défauts TESTEURS sur la v2.0.366) : dans « Vérifions ensemble », « Ça marche » relance
  vraiment le test (GET /sante, même mécanique que « Tester ma connexion ») : « Super, c’est reparti » seulement si le
  serveur répond ; sinon le panneau reste à la même étape avec « Le serveur ne répond toujours pas depuis cet appareil.
  Réessaie dans un instant, ou passe à l’étape suivante. ». Le rapport technique porte la vraie version
  (`tcVersionPourRapport`) : « apk 2.0.366 » dans l’application, « web du 14/10/2026 12h41 » sur le web (l’horodatage
  de mise en ligne que compare le mécanisme de mise à jour, en heure de Paris ; brut dans le champ `deploiement`),
  « web sans horodatage » dans le dépôt. Plus de « page 10.5.54 » (constante TC_APP_VERSION d’un ancien mécanisme,
  qui ne désigne rien d’utile ; laissée en place, inutilisée par le rapport). La page web ne porte pas de numéro
  v2.0.NNN : seul l’APK le connaît. L’API ne change pas. verif-boucle-compte : 6 cas de plus (panneau simulé).
  Reprise après l’examinateur (14/10) : le GET /sante simple (sans en-tête JSON ni jeton, donc sans pré-vol CORS) ne
  suffit pas, puisque c’est un VRAI appel qui a échoué. « Ça marche » passe par `tcTesterConnexionComplete` : le test
  simple, puis un appel de la même forme que les vrais (`tcAppel('GET', '/sante')`, délai TC_SANTE_DELAI_MS) ; les deux
  doivent passer, sinon le panneau reste à l’étape. Le constat `complet` est noté pour le rapport. « Ça ne marche pas »
  est inactif pendant la vérification ; rien ne s’affiche si le panneau a été fermé entre-temps.
- Mission 42 (14/10, chef) : les trois rendez-vous de démonstration (demo_1 Fête du Travail, demo_2 Victoire 1945,
  demo_3 Anniversaire Marie) restent sur l’appareil. Ils ont le mode « user » (c’est ce qui les affiche) et tout le code
  les prenait pour des rendez-vous de l’utilisateur : ils montaient au serveur, puis vers Google Agenda et les autres
  appareils du compte. Deux prédicats dans le bloc de synchronisation : `tcEstDemonstration(e)` (identifiant « demo_ »)
  et `tcEstDeLUtilisateur(e)` (mode user ou Charly, jamais la démonstration). La famille rdv de TC_SYNC_TYPES lit sans
  eux, `ignorer(uid)` fait sauter ce qui en descend du serveur (comptes d’avant) sans empreinte ni marque « vu ici », et
  une ancienne empreinte de démonstration n’est jamais annoncée comme suppression ; `poser` garde les démonstrations
  locales. Même règle pour le paquet d’appairage (tcRassemblerDonnees / tcInstallerDonnées) et la sauvegarde
  (buildBackupPayload / restauration). Le stockage local (tc_user_events) ne change pas : ils y vivent, modifiés ou
  supprimés, et ne sont pas recréés (generateEvents ne sert qu’à un stockage vide). L’API ne change pas. État du serveur
  le 14/10 : 27 comptes ont encore demo_1 à demo_3 dans `elements` (81 lignes, 1 compte les a supprimées), aucun lien
  Google (google_agenda_liens) sur ces uid. Proposition au chef : migration 015 `DELETE FROM elements WHERE type = 'rdv'
  AND uid IN ('demo_1','demo_2','demo_3')` (rien à retirer chez Google). Suite : verif-demonstration-locale
  (serveur simulé, deux appareils, compte d’avant, vieilles empreintes, deux onglets, appairage, sauvegarde, stockage) ;
  verif-transfert charge les deux prédicats avec le bloc d’appairage.
- Mission 43 (14/10, chef, validée par Charles) : « Je suis malade, décale tout » devient un questionnaire guidé. Constat
  du 14/10 au soir : Charly listait les rendez-vous déjà passés du jour (11h, 14h, 17h) et un voyage en journée entière,
  puis redemandait « annule ou déplace ? » alors que le bouton disait « décale tout ». Un petit moteur de questionnaire
  (bloc « QUESTIONNAIRE GUIDÉ DE CHARLY », devant showConflictWarning) : une liste d’étapes (clé, question, choix avec
  mots reconnus au clavier, condition `si`, `avant` qui prépare l’étape et peut tout arrêter), une question à la fois en
  carte à boutons numérotés (message `_questionnaire`, rendu par tcRendreQuestionnaire, boutons inactifs une fois
  répondu ou après rechargement), réponse tapée acceptée (numéro, texte du choix, mots : tcQuestionnaireChoixTape, lue
  dans charlySendMessage avant « Vers quand ? » et sans clé API), une relance puis abandon, une vraie demande fait tomber
  le questionnaire et suit son chemin ; le travail n’est fait qu’à la fin (`terminer`). Premier parcours
  TC_QUESTIONNAIRE_MALADE : 1) période (Ce qui reste aujourd’hui / Demain matin / Demain après-midi / Demain toute la
  journée / Les 2 ou 3 prochains jours), sautée si la phrase la dit ; 2) liste des rendez-vous de la période pas encore
  commencés (jamais un passé, jamais une journée entière ni un voyage, agenda courant seulement), sinon « Rien à décaler
  … Repose-toi. » ; 3) action (Je les décale (je te propose de nouveaux créneaux) / Je les supprime / Je ne touche à rien),
  sautée si la phrase dit « décale » ou « annule » ; 4) créneaux proposés à partir du lendemain de la période dans les
  plages ouvertes (tcCreneauxDisponibles), chaque rendez-vous avec sa durée, sinon « je le laisse où il est » ;
  5) qui prévient (Je préviens les contacts moi-même / Tu les préviens / Personne), ligne d’information pour les
  rendez-vous sans contact, question sautée s’il n’y a aucun contact ; 6) récapitulatif « Voici ce que je vais faire : »
  puis « Oui, vas-y » / « Non, j’arrête » ; 7) « C’est fait. Repose-toi. » et le bilan (déplacé, supprimé, laissé en
  place, prévenu par la messagerie TimeCool, message prêt à envoyer (SMS ou email), sans numéro ni email, à prévenir
  toi-même, marche arrière « remets-les »). Mécanique existante réutilisée : tcAppliquerDeplacement et tcSupprimerRdvs
  (nouvelle option `silencieux` : le questionnaire fait son propre bilan ; sans option, rien ne change), modèles de
  messages « Je décale » / « J’annule », tcTransmettrePrevenance, démarches, marche arrière. Le bouton appelle
  tcDemarrerMalade('Je suis malade, décale tout') ; une phrase tapée avec « malade » (tcDetecterMalade, avant la
  contrainte dans charlySendMessage) suit le même parcours avec ce qu’elle dit déjà (tcMaladeDansLaPhrase). Le ménage du
  compte arrête le questionnaire. L’API ne change pas. Suites : verif-questionnaire-malade (nouvelle, 52 cas, horloge
  fixée au 14/10 20h30), verif-boutons-charly et banc-charly mises à jour (« malade » est une route à part).
  Réserve connue (mécanique existante) : plusieurs contacts à prévenir par SMS ou email d’affilée, seul le dernier
  message s’ouvre dans l’application du téléphone ; les autres restent dans la conversation locale.
  Reprise après l’examinateur (14/10) : deux défauts dans tcMaladeExecuter. Un contact avec plusieurs rendez-vous dans
  la période reçoit désormais un message par rendez-vous. Par SMS ou email, plus rien ne s’ouvre dans la boucle (deux
  liens sms: d’affilée, seul le dernier s’ouvrait, et le bilan les disait tous « prêts ») : le bilan (message `_envois`,
  rendu par tcRendreBilanMalade) porte un bouton « Envoyer à … » par message, tcMaladeEnvoyer l’ouvre par
  tcTransmettrePrevenance avec le texte prêt et le bouton le dit une fois touché. La messagerie TimeCool part toujours
  tout de suite. Deux cas de plus dans verif-questionnaire-malade.
- Mission 44 (15/10, chef, validée par Charles) : « Gérer un imprévu » passe sur le moteur de questionnaire de la
  mission 43. Le bloc est réécrit en entier : le moteur (une étape « libre » de plus, pour lire « 20 minutes » hors des
  choix), les aides partagées sous un nom générique (tcQuestionnaireDire / Quand / Noms / Contacts / Rdv / Creneaux /
  Recap / Message / Executer / Envoyer, tcRendreBilanQuestionnaire), deux étapes partagées (TC_ETAPE_PREVENIR,
  TC_ETAPE_RECAP) et les trois actions (TC_QUESTIONNAIRE_ACTIONS), puis les deux parcours : « malade » (inchangé pour
  l’utilisateur) et « imprévu » (TC_QUESTIONNAIRE_IMPREVU) : 1) « Qu’est-ce qui t’arrive ? » (Je suis en retard / Je
  dois partir plus tôt / Un rendez-vous s’ajoute / Je ne peux pas venir) ; 2) « Ça touche quoi ? » (Le prochain
  rendez-vous / Le reste de la journée / Un rendez-vous précis, puis « Lequel ? » parmi les rendez-vous à venir sur deux
  semaines, sept au plus, jamais un passé ni une journée entière) ; 3) la solution du cas : retard → « Combien de
  retard, à peu près ? » (10 / 15 / 30 / environ 1 heure, ou un nombre tapé) et le message « Je serai en retard » des
  Paramètres complété de « Je serai là vers HHhMM » (l’agenda ne bouge pas, comme « Prévenir d’un retard ») ; partir plus
  tôt ou je ne peux pas venir → « Que fait-on ? » (décaler avec créneaux proposés / supprimer / rien) ; rendez-vous qui
  s’ajoute → on fait de la place (décaler, créneaux proposés dès le lendemain du rendez-vous touché) ; 4) qui prévient ;
  5) récapitulatif « Oui, vas-y » ; 6) « C’est fait. » et le bilan (un message par rendez-vous, bouton « Envoyer à … »
  par SMS ou email, « remets-les »). Le bouton appelle tcDemarrerImprevu('J’ai un imprévu') ; « j’ai un imprévu » tapé
  sans jour va au même questionnaire (avec un jour, la contrainte comme avant). L’ancien parcours (TC_QUESTION_IMPREVU,
  _tcImprevuEnAttente, tcRepondreImprevu, tcPeriodeImprevu) est retiré. La phrase tapée pré-remplit ce qu’elle dit
  (« je suis en retard », « partir plus tôt », « aujourd’hui », « le prochain rendez-vous »).
  43b (détails TESTEURS) : après « remets-les », seuls les contacts vraiment prévenus sont rappelés (le questionnaire
  note `prevenus` dans la marche arrière, y compris au toucher d’un bouton « Envoyer à … » ; sans cette note, comme
  avant) ; « et » avant le dernier nom (tcQuestionnaireNoms, aussi dans la marche arrière) ; modèles par défaut sans
  « désolé(e) » (« Bonjour [Prénom], je dois décaler… », « Bonjour [Prénom], un imprévu m’oblige à annuler… ») ; sans
  aucune plage déclarée, la journée de repli 9h-18h vaut du lundi au vendredi seulement (jamais un créneau le week-end),
  et un jour sans plage quand d’autres en ont est fermé (tcDesPlagesDeclarees ; une plage invalide ne compte pas).
  Décision prise seule : « reprendre les plages douces par défaut » lu comme « jamais le week-end » (pas mardi/jeudi
  11h-12h et 14h-15h seuls en repli, ce qui viderait « Quand suis-je libre ? » d’un compte neuf). L’API ne change pas.
  Suites : verif-imprevu réécrite (nouveau parcours, 43b, 50 cas), verif-questionnaire-malade (noms génériques),
  verif-creneaux-proposes (samedi fermé, repli en semaine), verif-marche-arriere (prevenus), banc-charly (aiguillage), verif-deconnexion et verif-temps-protege (ajustées).
  Reprise après l’examinateur (15/10) : « Quand suis-je libre samedi ? » sur un jour fermé disait « aucun créneau
  libre » à un agenda vide. tcJoursFermes regarde les jours de la période : tous fermés par le repli (week-end sans plage
  déclarée) → « Sans plages ouvertes dans Mes disponibilités, je ne propose pas de créneau le week-end. » ; tous fermés par
  réglage → « Tes disponibilités ne sont pas ouvertes samedi : je ne propose pas de créneau en dehors de tes plages. » ;
  puis « Rien n’est noté dans ton agenda samedi. » ou « Tu as déjà quelque chose de noté samedi. », et « Tu veux que je
  regarde un autre jour ? ». Un jour ouvert mais plein garde « Je ne vois aucun créneau libre … plus loin ? ». Un retard
  ne touche que le prochain rendez-vous ou un rendez-vous précis (plus « le reste de la journée » pour ce cas). La règle
  « jamais le week-end sans plage déclarée » reste à faire valider par le chef / Charles avant la mise en ligne.
  verif-imprevu : cinq cas de plus (section 8).
- Mission 45 (15/10, chef, validée par Charles) : « Prévenir d’un retard » passe sur le moteur de questionnaire
  (TC_QUESTIONNAIRE_RETARD, dans le bloc du questionnaire guidé) : 1) « Tu as combien de retard ? » (10 min / 20 min /
  30 min / Plus (je tape un nombre) ; un nombre tapé est pris tel quel ; « Plus » ouvre une carte sans bouton « Combien de
  minutes ? Tape un nombre. » : le moteur pose désormais une étape « libre » sans choix) ; 2) « Pour quel rendez-vous ? »
  (Le prochain : « X » à HHhMM / Un autre, puis « Lequel ? » parmi les rendez-vous à venir du jour ; sans autre
  rendez-vous, la question n’est pas posée) ; 3) le rendez-vous et l’heure d’arrivée, puis « Et après ? » (Je rattrape
  (les suivants ne bougent pas) / Tout décale d’autant (les rendez-vous suivants du jour aussi), créneaux montrés ;
  sans suivant, pas de question) ; 4) qui prévient ; 5) récapitulatif « Oui, vas-y » ; 6) « C’est fait. » et le bilan.
  Le rendez-vous en retard ne bouge pas (on y arrive en retard) et son contact reçoit le modèle « Je serai en retard »
  des Paramètres complété de « Je serai là vers HHhMM » ; les suivants décalés reçoivent « Je décale » avec la nouvelle
  heure (tcQuestionnaireMessage, tcQuestionnaireRecap et tcQuestionnaireExecuter distinguent le rendez-vous en retard,
  `r._retardRdv`, des rendez-vous décalés, `r._liste`). Jamais un rendez-vous passé ni une journée entière. Le bouton
  appelle tcPrevenirRetard('Je vais être en retard') ; une phrase tapée (tcDetecterPrevenance, type retard) passe par
  tcGererPrevenance → tcPrevenirRetard(text, tcRdvVise(text)) avec ce qu’elle dit déjà (les minutes, « un quart
  d’heure », « prochain », le rendez-vous visé) ; l’annulation tapée garde tcPrevenirDepuisChat. L’ancien chemin du
  bouton (le prochain rendez-vous puis la feuille des minutes) et tcProchainRdv sont retirés ; la feuille
  prevenirRetard reste pour la fiche contact. L’API ne change pas.
  Complément (détails testeurs, v2.0.372) : avec un seul rendez-vous, les boutons s’accordent (« Je le décale (je te
  propose un nouveau créneau) / Je le supprime », tcQuestionnaireActions(r), et la question « Que fait-on de ce
  rendez-vous ? » aussi pour « malade ») ; « remets-le(s) » après une suppression garde l’identifiant d’origine (un
  rendez-vous partagé retrouve son lien) : depuis la mission 23 (« ce que j’ai changé ici gagne »), un rendez-vous
  présent ici sans empreinte est tenu pour modifié ici, la suppression annoncée par le serveur ne l’efface pas et il
  repart au tour suivant (le serveur le remet en vie, supprime = 0) ; plus besoin d’un identifiant neuf.
  Suites : verif-onglets-charly réécrite (parcours retard, phrases tapées, 38 cas), banc-charly (le retard tapé part au
  questionnaire), verif-marche-arriere (identifiant gardé), verif-sync-local-gagne (cas 4 bis : supprimé puis remis
  avec le même identifiant, tient et repart), verif-imprevu et verif-questionnaire-malade (singulier), verif-charly-campagne7 (identifiant gardé).
  Reprise après l’examinateur (15/10) : « Le prochain » est le prochain rendez-vous d’AUJOURD’HUI (pas le premier des
  quatorze jours : sans rendez-vous aujourd’hui, le bouton prévenait le contact de mardi prochain). Sans rendez-vous
  aujourd’hui : « Tu n’as plus de rendez-vous aujourd’hui : personne à prévenir. » ; un rendez-vous visé par la phrase
  (« en retard pour la banque ») garde son jour. Le libellé dit « aujourd’hui à HHhMM ». verif-onglets-charly : deux cas (47 au total).

## 15/10/2026 : « Créer un nouveau rdv » sur le questionnaire guidé (mission 46, chef, validée par Charles) : quoi, avec qui, quand, durée, récapitulatif

- Le bouton « Créer un nouveau rdv » ne pose plus une question unique laissée au modèle : il lance un parcours du moteur de
  questionnaire (mission 43), tcDemarrerNouveauRdv('Je veux créer un nouveau rendez-vous') → TC_QUESTIONNAIRE_NOUVEAU_RDV.
  Une question à la fois, boutons numérotés, « 2 » ou un texte tapé vaut le bouton, rien n'est créé avant « Oui, crée-le ».
  Chronologie : « C'est quel rendez-vous ? » (Travail / Médecin / Famille / Amis / Autre : le bouton donne le titre et la
  catégorie ; un titre tapé est rangé par tcCategorieDuTitre, sinon Personnel ; « Autre » demande le nom) ; « Avec qui ? »
  (Personne / Un contact / Plusieurs ; « Lequel ? » liste ses contacts, les plus probables d'abord, sept au plus, ou un nom
  tapé ; « Plusieurs » demande les prénoms de contacts qui ont TimeCool) ; « Quand ? » (Aujourd'hui / Demain / Cette semaine
  (sept jours) / Je choisis une date, ou une date tapée) ; puis trois créneaux libres au plus, dans les plages de « Mes
  disponibilités » (tcPlagesDuJour : sans plage déclarée lundi-vendredi 9h-18h, jamais le week-end ; un jour fermé le reste),
  hors de ce qui est déjà noté (les rendez-vous de démonstration comptent), jamais dans le passé : un seul jour, le début,
  le milieu et la fin de la journée ; plusieurs jours, le premier créneau de chaque jour ; une heure tapée vaut un choix ;
  « Combien de temps ? » (30 min / 1 h / 2 h / Autre, la durée habituelle de la catégorie en premier : la plus fréquente de
  ses rendez-vous, au moins deux fois) ; si la durée fait chevaucher un rendez-vous ou dépasser les plages, Charly le dit et
  repropose ce qui tient ; « Voici ce que je vais faire : » (titre et catégorie, avec qui, jour, heure, durée, ce qui part)
  puis « Oui, crée-le » / « Non, j'arrête ».
- Le travail : le rendez-vous s'écrit comme la carte « Ajouter » de Charly (mêmes champs, identifiant charly_ai_, contact,
  saveEventsToStorage, démarche « Nouveau rendez-vous : … », agenda ouvert sur le jour) ; « C'est noté. » puis la
  proposition au contact : par la messagerie TimeCool s'il a un compte (« J'ai envoyé la proposition à Marie. »), sinon un
  message prêt par SMS ou email avec le bouton « ✉️ Envoyer à … » du bilan (même mécanique que les missions 43-45) ; sans
  numéro ni email, « À prévenir toi-même ». Le lien à usage unique n'est pas utilisé ici : le clic du contact inscrirait un
  second rendez-vous (le serveur écrit dans l'agenda de l'organisateur), alors que celui-ci existe déjà depuis
  « Oui, crée-le » ; un message de proposition suffit (à confirmer par le chef).
- À plusieurs : la mécanique « rendez-vous à plusieurs » existante, dans le questionnaire : /rdv/groupe/proposer donne les
  créneaux communs de la période (tamisés par mes plages), avec qui manque sous chacun ; « Oui, crée-le » appelle
  /rdv/groupe/confirmer, qui inscrit le rendez-vous chez tout le monde avec le titre et la catégorie ; rien n'est écrit ici
  (la synchronisation le ramène) ; « C'est noté : …, avec A et B. Chacun l'a dans son agenda. » Un créneau pris
  entre-temps : rien n'est créé, Charly le dit.
- Un contact qui a TimeCool : son agenda est regardé par la même route (une seule référence) ; sans accès (il ne m'a pas
  classé, ou bloqué) ou serveur muet ou hors connexion, mes créneaux seuls et « Je n'ai pas pu regarder l'agenda de … ».
- Les étapes connues par la phrase sont sautées : « Dentiste demain 10h » tapé à la première question donne le titre, le
  jour et l'heure (tcNouveauRdvPhrase ; « avec Marc » désigne le contact, « pendant 2 h » la durée). Pour cela, une réponse
  libre peut rendre { valeur, aussi } : le moteur range « aussi » dans les autres étapes (tcQuestionnaireRepondreLibre) ;
  et une étape sans bouton a sa propre relance (`relance`), au lieu de « tape son numéro (1 à 0) ».
- API (deux routes, champs optionnels, compatibles) : POST /rdv/groupe/proposer accepte `depuis` et `jusqua` (jamais dans
  le passé, 31 jours au plus), `combien` (1 à 10) et `par_jour` (1 à 3) ; creneauxCommuns prend ces paramètres (sans eux,
  comme avant : de demain à J+14, le meilleur de chaque jour, trois en tout) et, aujourd'hui, ne propose jamais une heure
  passée. POST /rdv/groupe/confirmer accepte `titre` (120) et `cat` (une catégorie connue) ; sans eux, les prénoms et
  Travail comme avant. La page : TC_BACKEND.proposerRdvGroupe(…, options) et confirmerRdvGroupe(…, options).
- Deux détails du retard (testeurs, mission 45) : sans rendez-vous aujourd'hui (et aucun visé par la phrase), « Tu n'as plus
  de rendez-vous aujourd'hui : personne à prévenir. » vient AVANT « Tu as combien de retard ? », qui n'est plus posée
  (tcPrevenirRetard) ; dans le bilan, la ligne « Retard d'environ … » vient avant les lignes « Déplacé ».
- Suites : verif-nouveau-rdv réécrite (66 cas : page et API, bouton, parcours complets, phrase qui dit tout, contact SMS,
  contact TimeCool avec la période envoyée au serveur, sans accès / muet / hors connexion, plusieurs, durée habituelle,
  « Non », « Autre », date tapée, week-end fermé avec heure tapée, aujourd'hui sans heure passée, vraie demande qui fait
  tomber le questionnaire, contact sans moyen) ; verif-onglets-charly (retard : question non posée, ordre du bilan) ;
  verif-rdv-groupe (signatures). Rejouée Chrome sur la page entière : les deux parcours, le bouton d'envoi, le retard.
  Reprise après l’examinateur (15/10) : à plusieurs, le serveur inscrit des heures rondes (1 à 3) alors que le récapitulatif
  annonçait la durée choisie (30 min → 1 h inscrite, 4 h → 3 h). Désormais, à plusieurs, seules 1 h / 2 h / 3 h sont
  proposées (« Combien de temps ? À plusieurs, c’est 1 h, 2 h ou 3 h. ») et une autre durée tapée est refusée par la relance :
  le récapitulatif annonce exactement ce qui est inscrit. Réserve 1 prise : creneauxCommuns lit « aujourd’hui » et l’heure
  courante à l’heure de Paris (DateTime, Europe/Paris), PHP tournant en UTC. verif-nouveau-rdv : cinq cas de plus (71).

## 15/10/2026 : « Rendez-vous à plusieurs » sur le questionnaire guidé (mission 47, chef, validée par Charles) : avec qui, pour quoi, quand, durée, proposition, réponses

- Le bouton « Rendez-vous à plusieurs » ne demande plus des prénoms tapés en deux essais : il lance un parcours du moteur
  de questionnaire, tcDemarrerRdvAPlusieurs('Je veux un rendez-vous à plusieurs') → TC_QUESTIONNAIRE_PLUSIEURS, qui
  réutilise la branche « Plusieurs » de la mission 46 (mêmes créneaux communs, même inscription). L'ancienne attente
  « Avec qui ? » (_tcGroupeEnAttente, tcDemandeHorsPrenoms, la branche de charlySendMessage) est retirée ; la phrase tapée
  « trouve-nous un créneau avec A et B » suit toujours son chemin (tcDetecterRdvGroupe, la carte de choix).
- Chronologie : « Avec qui ? » (les contacts qui ont TimeCool, ni bloqués, les plus probables d'abord, neuf au plus ;
  plusieurs boutons puis « ✔️ C'est tout », ou des prénoms / numéros tapés ; au moins deux) ; « C'est pour quoi ? »
  (Travail / Famille / Amis / Autre, ou un sujet tapé qui peut dire le jour et l'heure, « Réunion projet mardi 14h ») ;
  « Quand ? » (Cette semaine = sept jours / Semaine prochaine = du lundi au dimanche / Je choisis une date) ; trois
  créneaux communs du serveur (/rdv/groupe/proposer sur la période, tamisés par mes plages : lundi-vendredi 9h-18h sans
  plage déclarée, jamais le week-end, jamais le passé), ceux où tout le monde est libre d'abord, qui manque sous les
  autres ; personne de consultable → mes créneaux à moi et « Je n'ai pas pu regarder l'agenda de … : je propose quand
  même » ; une heure ronde tapée vaut un choix ; « Combien de temps ? » 1 h / 2 h / 3 h (la durée habituelle de la
  catégorie en premier, si elle est ronde) ; « Voici ce que je vais faire : » (qui, quoi, créneau, durée, la suite) puis
  « Oui, propose-leur » / « Non, j'arrête ».
- Le travail : rien n'est inscrit ; la proposition part dans la messagerie de chacun comme une convocation (mission 27b,
  boutons Présent / Absent, /convocations), « C'est envoyé. » avec la liste des prévenus ; la proposition est gardée sur
  l'appareil (timecool_rdv_plusieurs : identifiant, titre, catégorie, créneau, durée, références). À chaque tour de
  synchronisation (au plus une fois par minute), tcPlusieursVerifier relit les réponses (/convocations/etat) : tout le
  monde présent → /rdv/groupe/confirmer l'inscrit chez tous avec le titre et la catégorie (mission 46), Charly le dit
  (« Tout le monde a répondu pour « … » : c'est confirmé, …, avec A et B. Chacun l'a dans son agenda. ») et, depuis une
  autre page, un mot à l'écran ; quelqu'un absent, ou le créneau passé sans réponse, ou pris entre-temps → rien n'est
  inscrit, Charly le dit ; serveur muet → au prochain tour.
- Le moteur : une étape « multiple » (min) accepte plusieurs boutons (tcQuestionnaireRepondre allume ou éteint), puis
  « ✔️ C'est tout » (tcQuestionnaireValider) ; des prénoms ou des numéros tapés (« Marc et Paul », « 2 et 3 »,
  tcQuestionnaireChoixTapes) s'ajoutent et font avancer dès qu'il y en a assez, sinon « J'ai noté …. Et qui d'autre ? » ;
  la relance d'une étape multiple est la sienne. Les étapes de fin de « Créer un nouveau rdv » (durée, vérification,
  nouvelle proposition) deviennent des constantes partagées (TC_ETAPES_NRDV_FIN).
- API inchangée (routes de la mission 46 et de la mission 27b).
- Suites : verif-rdv-plusieurs (54 cas : page, bouton, choix multiples par boutons / prénoms / numéros, parcours complet
  avec la période envoyée au serveur, réponses en attente / présents / absent / passé / pris / muet / hors connexion,
  personne de consultable, moins de deux contacts, phrase qui dit tout, « Autre », date tapée, durée habituelle, « Non »),
  enregistrée dans verifier.sh ; verif-boutons-charly (le bouton passe par le questionnaire, l'ancienne attente a
  disparu). Rejouée Chrome sur la page entière : les boutons allumés, « C'est tout », les créneaux, l'envoi, la confirmation.
  Reprise après l’examinateur (15/10) : le serveur n’écrit que chez ceux qui m’ont ouvert leurs plages ; un membre qui a
  dit « Présent » sans cela n’était ni inscrit ni nommé, et Charly disait « chacun l’a dans son agenda ». Désormais
  tcPlusieursVerifier dit la vérité : « X a dit oui, mais je ne peux pas écrire dans son agenda (ses plages ne me sont
  pas ouvertes) » et lui envoie un message TimeCool pour qu’il l’ajoute de son côté ; personne de joignable (409
  « Personne n est joignable ») → le rendez-vous est noté chez moi seulement (« Titre avec A et B »), un message à chacun,
  et Charly le dit. Deux onglets du même appareil inscrivaient deux fois : la proposition est réservée (enCours, relue à
  l’instant dans le stockage, deux minutes) avant l’appel, et libérée si le serveur se tait. API inchangée (une vraie
  confirmation par convocation côté API, qui inscrirait les présents sans exiger les plages, reste une décision du chef).
  verif-rdv-plusieurs : six cas de plus (60).

## 15/10/2026 : corrections des testeurs sur « Créer un nouveau rdv » et « Rendez-vous à plusieurs » (mission 48 = 46b / 47b, validée par Charles)

- Bloquant : la liste des propositions à plusieurs (timecool_rdv_plusieurs) partait au serveur comme un réglage ; une
  proposition traitée revenait et Charly se répétait ou se contredisait. Elle reste désormais sur l'appareil qui a envoyé
  (TC_SYNC_DEJA_SYNCHRONISE : la ligne du serveur est vidée au tour suivant) ; et le serveur porte le statut de chaque
  convocation (attente / refusee / confirmee), relu avant d'agir.
- Décision de Charles : un « Présent » vaut accord. Nouvelle route POST /convocations/confirmer (organisateur) : quand tous
  les membres ont répondu présent, le rendez-vous s'inscrit chez lui et chez chacun d'eux, aux heures et minutes de la
  convocation, avec le titre et la catégorie, sans exiger leurs plages ; une seule fois (statut active → confirmee sous
  verrou, rdv_uid, confirme_le) ; un second appel reçoit deja = true ; 409 creneau_pris si le créneau n'est plus libre chez
  l'organisateur ; un message « Rendez-vous confirmé… Il est dans ton agenda. » à chacun. POST /convocations/repondre
  « absent » clôt la convocation (statut annulee) ; POST /convocations/etat rend statut et rdv_uid. Migration
  backend/sql/016_convocations_confirmation.sql (ENUM + confirmee, rdv_uid, confirme_le ; rejouable), à jouer par le chef
  avant de déployer l'API. Plus de « noté chez moi seulement » ni de mot « ajoute-le de ton côté » : tcPlusieursVerifier
  appelle confirmerConvocation, dit chez qui (« avec Marc Dupont et Paul Martin. Chacun l'a dans son agenda. », noms des
  fiches), « déjà inscrit » si deja, « pris dans ton agenda » sur 409, retire sans un mot une convocation déjà confirmée
  ailleurs ; la réservation d'un onglet (relue à l'instant) vaut pour chaque action.
- Gênants : le titre tapé garde ses petits mots (tcNouveauRdvTitre : « Pot de départ », « Repas de famille » ; les mots de
  date, d'heure et de durée sont retirés, les mots de remplissage du début seulement) ; la durée est demandée AVANT les
  créneaux dans les deux parcours (le serveur est interrogé pour elle) ; les minutes sont gardées partout (proposition,
  convocation, inscription, « créneau passé ») et une heure tapée à la demi-heure est acceptée à plusieurs ; deux onglets :
  le second ne dit plus « rien n'est inscrit » (réservation, et deja) ; « tout le monde libre d'abord » : le serveur peut
  rendre jusqu'à 12 créneaux par jour et 40 en tout (/rdv/groupe/proposer, la page les demande) et la page les range par
  nombre de manquants, puis les étale (un jour : début, milieu, fin ; plusieurs jours : un par jour), ce qui corrige aussi
  « jamais l'après-midi » avec un contact TimeCool et les deux seuls créneaux de « Cette semaine ».
- Détails : « 30 min » tapé à plusieurs → la relance redit « À plusieurs, c'est 1 h, 2 h ou 3 h » (relance d'étape en
  fonction des réponses, relanceForte) ; le bilan d'un questionnaire retrouve les rendez-vous par identifiant (la
  synchronisation peut remplacer les objets de l'agenda entre la question et « Oui » : la ligne du retard manquait avec
  « Personne ») ; les prénoms rendus par le serveur (« Gaelle ») deviennent les noms des fiches (« Gaëlle Perrin ») ;
  « X ne m'a pas ouvert ses disponibilités : je propose quand même » (un contact TimeCool sans accès), « Je n'ai pas pu
  regarder l'agenda de X » seulement quand le serveur se tait.
- Suites : verif-nouveau-rdv (76 cas, nouvel ordre, titres), verif-rdv-plusieurs (72 cas : route de confirmation, statut,
  minutes, deux onglets, noms, ordre dans une journée), verif-rdv-groupe (plafonds, ordre sous PHP), verif-onglets-charly
  (retard « Personne » avec objets remplacés).

## 15/10/2026 : « Quand suis-je libre ? » sur le questionnaire guidé (mission 49, chef, validée par Charles)

- Le bouton ne pré-remplit plus « Quand suis-je libre cette semaine ? » (la phrase tapée garde son chemin, tcGererDemandeCreneau) :
  il lance un parcours du moteur de questionnaire, tcDemarrerLibre('Quand suis-je libre ?') → TC_QUESTIONNAIRE_LIBRE.
  « Quand ? » (Aujourd'hui / Demain / Cette semaine = sept jours / Semaine prochaine = du lundi au dimanche / Je choisis
  une date ; une date tapée vaut le bouton, « mardi pendant 2 h » donne aussi la durée) ; « Pour combien de temps ? »
  (30 min / 1 h / 2 h / Une demi-journée = 4 h) ; la liste des créneaux libres pour cette durée (tcNouveauRdvPropositions
  avec six au plus : Mes disponibilités, lundi-vendredi 9h-18h sans plage, jamais le week-end, jamais le passé, hors
  rendez-vous notés, démo comprise), regroupée par jour (« • vendredi 16 octobre : 09h00, 12h00, 13h00, 14h30, 15h30 et
  17h00 ») ; rien → « Rien de libre <période> dans tes disponibilités. Je regarde <période suivante> ? » (demain, les
  jours suivants de la semaine, la semaine prochaine, celle d'après, les sept jours suivants d'une date), « Oui, regarde »
  / « Non, merci », et « Rien de libre non plus … » s'il le faut ; « Tu veux y mettre quelque chose ? » Oui / Non ;
  « Lequel ? » (les créneaux numérotés, ou une heure tapée) puis le questionnaire « Créer un nouveau rdv » démarre avec le
  jour, l'heure et la durée déjà remplis (il reste quoi, avec qui, le récapitulatif, « Oui, crée-le ») ; Non → « D'accord. ».
  Rien n'est créé avant « Oui, crée-le ».
- tcNouveauRdvEtaler : un nombre voulu quelconque ; un seul jour, les créneaux répartis sur la journée (le premier, le
  dernier, les autres à égale distance ; trois = début, milieu, fin comme avant) ; plusieurs jours, le nombre réparti
  entre les jours (les premiers en ont un de plus) et, dans chaque jour, réparti sur la journée (deux = le premier et le
  dernier, jamais deux heures qui se suivent). Les propositions des missions 46 à 48 (trois) ne changent pas.
- API inchangée.
- Suites : verif-quand-libre (25 cas : bouton, demain 1 h avec la liste et l'enchaînement sur « Créer un nouveau rdv »
  (jour, heure, durée sautés), Non, heure tapée, cette semaine une demi-journée (répartition entre jours, démo comptée),
  samedi fermé → sept jours suivants, tout pris → demain → rien non plus, phrase « mardi pendant 2 h », semaine prochaine
  30 min), enregistrée dans verifier.sh ; verif-boutons-charly (le bouton passe par le questionnaire). Rejouée Chrome sur
  la page entière : la liste, « Lequel ? », l'enchaînement, la création, samedi fermé.

## 24/10/2026 : Charly ne répond que s'il est sûr d'avoir compris, sinon il demande (mission 50, chef, ok de Charles)

- Règle générale, au cœur de Charly et non une rustine par cas : avant tout détecteur et avant le modèle, charlySendMessage
  classe le message tapé (tcClasserMessage, bloc « CLASSER AVANT DE RÉPONDRE » devant tcPhraseNonCompris). Du code, le même
  quel que soit le modèle et quelle que soit la phrase : un score d'indices de clarté (détecteur de la page +3, verbe de
  demande ou « je veux / peux-tu / il faut » +2, sujet qui se suffit (prix, appli, qui es-tu…) +2, mot de question +1, mot
  d'agenda ou métier +1, moment +1, phrase de six mots ou plus +1) comparé à un seuil (TC_CLASSE_SEUIL = 2).
- « Claire » : le message suit son chemin habituel (détecteurs, questionnaires, FAQ, modèle). « Pas sûr » : une seule
  phrase calme qui demande, jamais un résultat (ni créneaux, ni rendez-vous, ni décalage, ni annulation) :
  contestation (« je ne t'ai pas demandé ça », « c'est pas ça », « n'importe quoi ») → « Pardon, j'ai répondu à côté :
  qu'est-ce que tu voulais ? », jamais la même action relancée ; doute (« tu es sûr ? », « vraiment ? ») → « Je peux me
  tromper : qu'est-ce qui ne te semble pas juste ? » ; remerciement → « Avec plaisir, tu veux autre chose ? » ;
  acquiescement (« ok ») → « D'accord, tu veux autre chose ? » ; abandon (« laisse tomber ») ; salutation hors premier
  message → « Bonjour ! Qu'est-ce que je peux faire pour toi ? » ; au revoir → « À bientôt ! Je reste là si tu as besoin
  de moi. » ; réaction, abréviation ou mot seul (« Cv ? », « ?? », « et ? », « oui », « lundi », « 14h ») et hors sujet
  (« il fait beau dehors ») → « Sauf erreur de ma part, je n'ai pas bien compris : … ? » avec ce que le message dit déjà
  (« tu veux noter quelque chose lundi à 14h, ou autre chose ? », « … avec Marc Dupont … », « tu veux noter un rendez-vous
  « Dermatologue », ou autre chose ? », sinon « qu'est-ce que tu veux que je fasse ? »).
- Le contexte compte : quand Charly venait de poser une question (le modèle « C'est pour quoi, à 16h ? », un détecteur, ou
  le classement lui-même), le message suivant est la réponse et passe (« dentiste », « oui », « lundi ») ; sauf une simple
  réaction (« ok », « oui », « cv ») à la question du classement : « Qu'est-ce que tu veux que je fasse, par exemple « mes
  rendez-vous de demain » ou « dentiste mardi 15h » ? ». Une contestation après une contestation suivie d'une vraie
  demande (« pas ça, annule plutôt le golf ») passe. Les réponses attendues (questionnaire, oui/non d'annulation ou de
  proposition, trajet, « qui est-ce ? ») sont lues avant le classement, comme avant. Dans une autre langue que le
  français, le classement s'efface (le modèle garde la main, sa consigne lui dit de demander).
- Pour le juge des 300 phrases de la session TESTEURS : chaque message poussé par le classement porte nature: 'question'
  (ou 'reponse' pour l'au revoir) et _classement ; la réponse du modèle porte nature: 'action' (bloc [AGENDA]),
  'question' (« Sauf erreur de ma part ») ou 'reponse' (tcNatureReponse, charlySendMessage et charlyProcessMessage).
  Les TESTEURS passent par la page, comme un utilisateur : pas d'endpoint.
- API inchangée. Le prompt du modèle ne change pas (sa ligne « Sauf erreur de ma part » reste le filet pour ce qui passe).
- Suite : verif-classement-charly (38 phrases pièges qui doivent produire une question, dont « Cv ? », « Je t'ai pas
  demandé quand je suis libre ? », « ok », « ?? », « et ? », « non pas ça », « tu es sûr ? », « merci », « lundi »,
  « 14h » ; 30 demandes claires qui doivent passer ; le contexte ; les pistes de la question ; la langue ; le seuil ; la
  place du classement dans charlySendMessage), enregistrée dans verifier.sh. Rejouée Chrome sur la page entière en mode
  démo : « Cv ? », « lundi », consultation, créneaux puis contestation, « merci », « tu es sûr ? », « Marc », « ok » après
  la question, hors sujet, annulation puis « non » (réponse attendue, lue avant le classement).

## 24/10/2026 : mission 50, deuxième passage : trois niveaux (décision du chef) et le fil de la conversation (examinateur)

- Trois niveaux au lieu de deux (chef, 24/10) : (1) intention claire et complète : le message suit son chemin ; (2) intention
  claire mais une pièce manque : Charly demande LA pièce, précisément, jamais « pas compris » (tcClassePieceManquante : « golf
  samedi » → « À quelle heure, pour « golf » samedi ? », « foot 14h » → « Quel jour, pour « foot » à 14h ? », « anniversaire de
  Marc », « Dermatologue », « dentiste demain » → « Quel jour et à quelle heure, pour « … » ? », « Marc » → « … avec Marc Dupont ? » ;
  « dentiste mardi 15h » (objet, jour, heure) passe ; « retard 10 min » part au questionnaire retard, qui demande à qui :
  tcDetecterPrevenance accepte « retard » sans verbe ni « je » jusqu'à quatre mots) ; (3) vraiment pas sûr : la question calme.
- Le fil compte : après une question du classement qui proposait déjà quelque chose (« tu veux noter quelque chose mercredi à
  15h ? », « Quel jour et à quelle heure, pour « Dermatologue » ? »), « oui » reçoit la question de ce qui manque avec ce qui a
  été dit (« D'accord : qu'est-ce que je note mercredi à 15h ? ») et un complément (« dentiste », « oui mardi 15h ») passe : le
  modèle a l'historique, le Dermatologue n'est pas oublié ; « non », « cv » : la question avec deux exemples. La bulle du
  classement garde _proposition et _texte. Une courte suite après un résultat de Charly sans « ? » (« Demain, tu as Dentiste à
  15h. ») passe : « et à 15h ? », « plutôt 16h », « avec qui ? », « c'est où ? », « Marc vient ? », « le golf » (six mots au
  plus : un « ? », un début « et / plutôt / avec / le … », un mot de question, ou un nom connu de l'agenda).
- Une contestation, c'est le message entier (« pas ça », « non non », « rien à voir », « à côté de la plaque ») ou une phrase qui
  conteste (« je ne t'ai pas demandé », « tu n'as pas compris ») ; plus jamais « à côté » ou « rien à voir » au milieu d'une
  information (« un restaurant à côté du bureau demain midi » passe).
- « Où est mon rdv ? », « c'est où ? », « où est mon rdv de lundi ? » : consultation de type lieu (detecterConsultationAgenda,
  tcGererConsultationAgenda) : « Dentiste, vendredi 16 octobre 15h : 12 rue de la Paix, Paris. », ou « … : aucun lieu noté. »,
  ou « Tu n'as rien de noté <période>. ». « où » est reconnu comme mot de question ((^|\s)où(\s|$) : ù n'est pas une lettre pour
  \b). Un nom connu de l'agenda (rendez-vous noté, contact) compte +1 dans le score. « noté » retiré des acquiescements.
- Suite : verif-classement-charly refaite (40 pièges → question ; 7 informations qui ne sont pas des contestations ; niveau 2 ;
  32 demandes claires ; le fil : réponse au modèle, « oui » après la proposition, complément, « non »/« cv » ; suite après un
  résultat ; lieu du rendez-vous exécuté ; langue, seuil, nature).
- (suite, 24/10) « oui » à une question qui demandait déjà la pièce (« Quel jour et à quelle heure, pour « Dermatologue » ? ») :
  la même question précise, et la proposition reste gardée (aussi après les deux exemples) : « mardi 15h » ensuite passe, le
  Dermatologue est dans l'historique.
- (suite, 24/10, examinateur et chef) Le classement tourne sur chaque message : une question OUVERTE de Charly (l'accueil « Qu'est-ce
  que je peux faire pour toi ? », « tu veux autre chose ? », TC_CLASSE_QUESTIONS_OUVERTES) ne laisse plus passer le message suivant
  sans classement (« Bonjour » puis « Cv ? » reçoit la question) ; seule une question précise (« C'est pour quoi, à 16h ? »,
  « Quel jour ? ») attend sa réponse. « Où » : le lieu d'un rendez-vous seulement si l'on parle d'un rendez-vous (rdv, rendez-vous,
  mon prochain, un titre de l'agenda, sans mot de recherche) ou « c'est où ? » seul ; « où aller manger ce soir ? », « où on va
  en vacances ? », une recherche de lieu (« pharmacie de garde à côté ») sans détecteur : hors agenda, « Je m'occupe seulement de
  ton agenda : je peux noter, décaler ou annuler un rendez-vous, prévenir quelqu'un ou trouver un créneau, qu'est-ce que je fais
  pour toi ? ». « Retard » : le questionnaire de MON retard ne part que pour soi (« je suis en retard », « j'ai 10 min de retard »,
  ou le mot seul « retard », « retard 10 min », « 10 min de retard ») ; « Marc est en retard », « le train est en retard » :
  « D'accord : je décale ton rendez-vous avec Marc Dupont (un rendez-vous), ou je préviens quelqu'un ? ». Détails : « pas » et les
  petits mots ne deviennent pas l'objet (« pas ça mardi »), le contact se cherche dans l'objet (« Sophie demain » : avec Sophie Anceau).
- (suite, 24/10, examinateur et chef) Un seul chemin d'entrée : la « courte suite » (« et à 15h ? », « le golf ») ne passe
  qu'après un RÉSULTAT de Charly (tcClasseQuestionDuMessage : null), jamais après une question ouverte (l'accueil, « tu veux
  autre chose ? ») ; après « Bonjour », « golf samedi », « Dermatologue ? », « il fait beau ? » reçoivent leur question. Un
  sujet qui se suffit (météo, sms, prix…) n'est jamais l'objet d'un rendez-vous à compléter : « météo demain » passe (la
  météo). « pas de retard », « finalement pas de retard » → « Bien noté, pas de retard. », aucun questionnaire. La phrase hors
  agenda est celle du chef : « Je m'occupe de ton agenda : rendez-vous, créneaux, retards, trajets, météo et recherche d'un
  professionnel. Je ne peux pas t'aider pour ça. » (nature réponse). La nature de la bulle du classement vient du classement.
- (suite, 24/10) Le hors agenda l'emporte sur le fil : « où aller manger ce soir ? » juste après une question de Charly (la
  sienne ou celle du modèle) reçoit la phrase hors agenda, jamais un passage au modèle comme réponse ou complément.
- (suite, 24/10, chef et examinateur) Le hors agenda ne se décide jamais sur un mot de lieu : « dermato à côté de la gare mardi
  15h » (objet, jour, heure : passe, même en phrase longue), « déjeuner au resto à côté du bureau samedi midi », « dermato à
  côté de la gare mardi » (« À quelle heure, pour « dermato à côté de la gare » mardi ? ») sont des demandes d'agenda, le lieu
  n'en est qu'un détail ; une réponse à une question sur le lieu (« au restaurant à côté du bureau », « à côté de la gare »,
  « où tu veux », « pharmacie de garde à côté ») est un lieu et passe. Le hors agenda ne reste que pour un « où » de recherche
  sans aucun lien avec l'agenda (ni rendez-vous, ni nom connu, ni détecteur, ni verbe de demande : « où aller manger ce
  soir ? », « où on va en vacances ? »), et dans le fil d'une question de Charly seulement s'il pose lui-même une question.
