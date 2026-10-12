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
