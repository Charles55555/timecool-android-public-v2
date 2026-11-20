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
- **Veille du 26/10** : copie IONOS réussie le lundi 26/10 à 04h29 (heure d'hiver de Paris), TimeCool répond, aucune nouvelle panne. Certificats 32 et 89 jours. Redémarrage demandé depuis 20 jours (toujours en attente d'un soir choisi par Charles). Connexion Claude du serveur : expire le mercredi 28/10 à 15h41, Charles prévenu le 26/10.

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

## 24/10/2026 : mission 51, les ratés de la batterie des TESTEURS (chef, suite de la mission 50)

- Batterie TESTEURS v2.0.380 : 76 % (227/300), 40 phrases simples en « pas compris ». Six groupes corrigés, bloc « MISSION 51 »
  à la suite du bloc de la mission 50 (devant tcPhraseNonCompris).
- 1. Petites phrases sociales (tcClasseSocial, classe social, nature reponse) : « tkt » → « Merci 😊 Je peux t'aider pour un
  rendez-vous ? », « mdr » → « 😄 … », « ras »/« rien » → « D'accord. Je suis là si tu as besoin de moi. », « ça va et toi » → « Très
  bien, merci ! … », « tu sers à rien »/« t'es nul » → « Pardon, je fais de mon mieux : dis-moi ce que tu veux pour ton agenda ? »,
  « je t'ai pas parlé » → « D'accord, je me tais. … », « tu m'aimes ? », « tu dors jamais ? », « tu parles anglais ? », une blague,
  un poème, de la musique, « je m'ennuie », « quelle heure il est » (l'heure), « quel jour on est » (la date), « on sera quel jour
  demain », « c'est quand Noël » (la date et les jours restants), « combien font 12 fois 7 » (le calcul), un émoji seul (« 😂 »,
  « 👍 »). La question finale « Je peux t'aider pour un rendez-vous ? » est ouverte : le message suivant se classe. « dacc »,
  « ah oui c'est vrai », « t'es génial », « merci bcp » : acquiescement ou remerciement, nature reponse (plus « question »).
  « t'es une IA ? », « il fait quel temps demain » : des sujets qui se suffisent (présentation, météo), ils passent.
- 2. tcCorrigerAbreviations, appelée au tout début de charlySendMessage : c'est le message corrigé que lisent le classement, les
  détecteurs et le modèle (et que montre la bulle). dem/demin → demain, auj/ajd → aujourd'hui, lun…dim → le jour (sauf après
  « avec / chez / et / de / pour / à » et sauf tout en majuscules : « déj avec Sam ven 12h » garde Sam), sem, aprem, déj, w → avec,
  bcp, pr, qd, rendevous → rendez-vous, anule → annule, suprime → supprime, decalle → décale, sui → suis, retar → retard, jsuis,
  jai, quesque, malad, peu pas → peux pas… Une adresse mail ou un lien ne sont pas touchés.
- 3. Annuler sans cible (tcDetecterSuppressionSansCible, tcGererSuppressionSansCible) : « Annule », « stp annule », « Annule ça »,
  « Hugo a annulé » → « Lequel ?\n1. … 2. … 3. …\nDis-moi son numéro, son heure ou son nom. » avec les trois prochains rendez-vous
  (ceux avec le contact nommé d'abord) ; un seul → la confirmation oui/non habituelle ; aucun → « rien à annuler ». tcRdvDesigne
  lit aussi le numéro (« 2 », « le deuxième »).
- 4. Déplacer un rendez-vous existant sans le modèle (tcDeplacementLocal, tcGererDeplacementLocal, dans charlySendMessage après
  « rendez-vous introuvable » et avant la demande de créneau) : le rendez-vous par le jour de départ (« de mardi ») et les mots du
  titre ou du contact, la destination par un autre jour cité, « la semaine prochaine », « le lendemain », la dernière heure citée,
  « même heure » ; la durée est gardée. Plusieurs rendez-vous conviennent → « Tu as 2 rendez-vous qui conviennent : … Lequel
  veux-tu déplacer ? ». Puis tcExecuterDeplacement (sorti de tcTraiterDeplacement, partagé) : sans contact, déplacé tout de
  suite (« C'est fait, rendez-vous déplacé », marche arrière possible) ; avec un contact, « Je déplace : … Veux-tu que je prévienne
  X ? ». Plus jamais une carte [AGENDA] à la mauvaise date pour un déplacement compris.
- 5. tcDetecterRdvGroupe : « un moment », « un déjeuner », « un dîner », « un café », « un verre », « une visio », « un appel », « un
  point » avec deux comptes cités → le rendez-vous à plusieurs (« Trouve-nous un moment avec Hugo, Gaëlle et Paul », « Propose un
  déjeuner à Hugo et Gaëlle »).
- 6. tcDetecterMarcheArriere : « annule ce que tu viens de faire », « défais ce que tu as fait », « annule ta dernière action ».
  Contestation : « c'est pas la question », « je te demande pas ça ». Après une liste, « c'est tout ? » passe (une suite).
  « pourquoi jeudi ? » n'est plus une consultation de l'agenda.
- TC_APP_VERSION « 10.5.54 » : constante d'un mécanisme version.json jamais servi, sans rapport avec v2.0.NNN (la version de
  l'APK vient du pont natif). Non modifiée : au chef de décider (deployer-web.sh pourrait l'estampiller à chaque publication).
- API inchangée. Suite : verif-classement-charly, section 8 (abréviations, 24 phrases sociales, annulation sans cible exécutée,
  déplacement local exécuté avec et sans contact, à plusieurs, marche arrière).
- (suite, 24/10, examinateur et chef) La bulle de l'utilisateur montre TOUJOURS ce qu'il a tapé (tcBulleTapee, _tcTexteTape) ; le
  texte corrigé sert au classement, aux détecteurs et au modèle (_corrige dans tcHistoriquePourIA). Un jour abrégé (lun…dim) ne
  devient un jour que tout en minuscules, hors prénom d'un contact, pas après la/le/un/une/soirée/de/Pr…, et suivi d'une heure ou
  d'un nombre, ou cité seul (« au bord de la mer samedi », « soirée jeu », « jeu de société », « Sam vient », « le Pr Martin »
  restent) ; « pr » et « cc » retirés ; « w » → « avec » seulement devant un nom (jamais « w end »). Un complément après une
  question du classement se lit avec ce qui a été dit (compose : « Dermatologue » + « mardi 15h » → « Dermatologue mardi 15h »).
  « Supprime mon compte », « annule mon abonnement », « annule la synchro » → « Pour ton compte, ton abonnement ou tes réglages,
  c'est dans ton profil (menu ☰) : je ne peux pas le faire d'ici. » « Le match est annulé » (information) → « Je retire « Match de
  foot » de ton agenda ? » (oui/non), ou « rien à retirer ». « Annule tout » → « Tous tes rendez-vous, mais de quel jour ? », la
  réponse « demain » devient « annule tout demain » (la liste du jour, oui/non) : jamais une suppression en masse. « Annule » sans
  cible : seulement le verbe seul (avec ça / stp / le rendez-vous) ou « <contact connu> a annulé » ; « efface le message »,
  « pourquoi tu as annulé ? » suivent leur chemin. Noël : le compte à rebours seulement sur la question (« c'est quand Noël »,
  « combien de jours avant Noël »), jamais sur « dîner de Noël le 24 à 20h ».
- (suite, 24/10, examinateur) L'information d'annulation (« la réunion a été annulée », « la séance est annulée ») compte comme un
  détecteur dans le classement : elle arrive à « Je retire … de ton agenda ? » au lieu d'une pièce manquante ; le jour écrit
  (« du 26 », « de lundi », « de la semaine prochaine ») filtre les rendez-vous, et s'il en reste plusieurs, « Lequel ? »
  (numéro, heure ou nom, puis oui/non). La composition d'un complément avec la question précédente ne se fait que pour une
  pièce (pas de verbe de demande, pas de détecteur, cinq mots au plus, pas « non / plutôt / en fait ») : « préviens Sophie »,
  « décale le dentiste », « en fait non, laisse tomber, mes rdv de demain » partent seuls ; jamais après « je décale…, ou je
  préviens quelqu'un ? ». Le bloc « annuler sans cible » doublé par le passage précédent est retiré (le correctif le garantit).
  Chef : un jour écrit sans rendez-vous ce jour-là (« le golf du 20 est annulé », aucun golf le 20) → « Je ne trouve pas de « golf »
  mardi 20 octobre. Tu as Partie de golf lundi 19 octobre 14h : c'est celui-là que je retire ? » (oui/non), jamais un autre jour
  en silence. Après « Marc est en retard » → « je décale…, ou je préviens quelqu'un ? », « préviens Sophie » = prévenir Sophie du
  retard de MARC (tcPrevenirRetardAutre : « Bonjour Sophie, Marc est en retard. », relu et confirmé avant de partir) ; sans nom,
  « Qui veux-tu prévenir ? » ; le sujet du retard reste dans le fil.
- (suite, 24/10, examinateur et chef) Prévenir du retard d'un autre : après « Qui veux-tu prévenir ? » (proposition gardée avec
  attendNom), un nom de contact seul (« Sophie », « Sophie Anceau ») lance l'envoi, comme pour toute question précise de Charly. Le
  message est rédigé par Charly, jamais recopié de la phrase tapée : « Bonjour Sophie, Inès me demande de te prévenir : Marc Dupont a
  du retard pour « Dentiste », vendredi 16 octobre 15h. » (le prénom du compte, userAccount ; le prochain rendez-vous avec le
  retardataire s'il existe ; une chose aussi : « le train a du retard » ; sans prénom : « je suis chargé de te prévenir »). « en
  retard ? » puis « préviens Sophie » → « Je ne sais pas qui est en retard : dis-moi par exemple « Marc est en retard », et je préviens
  Sophie Anceau. » « préviens Marc » quand c'est Marc qui est en retard → « Marc Dupont est en retard ; tu veux prévenir quelqu'un
  d'autre, ou lui écrire ? ». « tu es en retard » tapé à Charly = une remarque, pas un retard à annoncer : « Je ne suis pas sûr de
  comprendre : tu veux dire que je réponds trop tard, ou que quelqu'un est en retard ? ». La relecture avant envoi est gardée.
- (suite, 24/10, examinateur) Prévenir du retard d'un autre : le rendez-vous n'est cité (« pour « Réunion avec Marc et Sophie » à
  11h ») que s'il est d'aujourd'hui, en cours ou dans les deux heures, et si le destinataire y participe avec le retardataire ;
  sinon « … a du retard. » sans titre : jamais le prochain rendez-vous d'un autre jour, jamais un rendez-vous privé révélé à un
  tiers (seul ce qui concerne les deux circule).
  Chef : le titre, le lieu et l'heure ne sont donnés que si le destinataire participe (contact du rendez-vous ou prénom dans le
  titre) ; un tiers ne voit jamais un rendez-vous où il n'est pas (cas ajouté au garde-fou : un point avec Marc seul, maintenant →
  pas de titre). Réserve « titre doublé » corrigée : « Dermatologue » puis « chez le dermato mardi 15h » ne se compose pas, le
  complément porte déjà l'objet.

## 24/10/2026 : mission 52, les 28 ratés restants et les réserves (chef, suite des missions 50 et 51)

- Batterie TESTEURS v2.0.381 : 91 % (272/300). Bloc « MISSION 52 » après le bloc 51 ; retouches des blocs 50 et 51.
- 1. Bug de date : tcHeureDansTexte lisait « h » (de « heures ») avant « heures » et perdait les minutes de « 11 heures 30 » ;
  « heures » passe d'abord. tcCreationLocale prenait « N heures » pour une durée : seules « pendant / de / environ N heures » et
  « N heures de » le sont. « rendez vous banque mardi 11 heures 30 », « note coiffeur samedi prochain à 10 heures », « rendé vous
  chez le dentisse mardi a 15 heure » (fautes corrigées en interne : rendé, dentisse) font la carte directement, le modèle n'écrit
  plus « déjà passé » ni « tu veux dire ? ». 1 bis : « mai rendez-vous » (faute pour « mes ») → « mes rendez-vous » (jamais le
  mois de mai) : la consultation « cette semaine » liste les rendez-vous.
- 2. L'aide figée du modèle (« Pour le supprimer, écris-moi par exemple… ») ne sort plus : tcRemplacerAideFigee la remplace par
  « Lequel ? » numéroté (ou la confirmation, ou « rien à annuler »). « rdv annulé », « je vais pas y aller », « j'y vais pas »,
  « mets Paul de côté » (le contact Paul) → « Lequel ? » ; « je peux plus aller au dentiste lundi » → « Je retire « Dentiste » ? »
  (avec le jour) ; « rappelle Hugo » → « Tu veux que je te mette un rappel pour Hugo Besnard, ou que je lui propose un créneau ? ».
- 3. Plus d'accueil sur une phrase d'agenda : « Quand est-ce qu'on se voit ? » → « Avec qui ? Dis-moi son nom, et je cherche un
  créneau. » (la réponse « Marc » devient « trouve un créneau avec Marc ») ; « On remet ça » → « Quel rendez-vous veux-tu remettre,
  et à quand ? » (la réponse devient « décale … ») ; « je suis à la bourre » = « je suis en retard » (le questionnaire retard).
- 5. Humeur (« ça me tue ces réunions », « je suis malade de ce boulot ») : réponse sociale ; tcDetecterMalade ne part que pour
  l'utilisateur lui-même (« mon chat est malade », « Marc est malade », « malade de ce boulot » non). « annule le premier »,
  « décale le deuxième » après une liste : l'élément de la dernière liste affichée (tcDernierListeRdv), confirmation oui/non ou
  « À quand ? ». « non c'était pour Hugo » après une création : le rendez-vous du message précédent reçoit ce contact.
- 6. Réserves : « … de 11h à 12h » ; « Je suis libre demain » (affirmation) → « Noté. Tu veux que je propose ce créneau à
  quelqu'un ? » ; « Tu es libre demain ? » → réponse sociale ; « kiné près de chez moi » → recherche de professionnel (un lieu
  suffit) ; « je n'aurai pas de retard », « pas de retard pour Marc ? », « je ne serai pas en retard » → « Bien noté, pas de
  retard. » (tcDetecterPrevenance ignore un retard nié).
- 7. scripts/deployer-web.sh : TC_APP_VERSION est estampillée à chaque publication (AAAA.MM.JJ-HHMM, heure de Paris), la source
  garde « 10.5.54 ».
- API inchangée. Suite : verif-classement-charly, section 9.
- (suite, 24/10, examinateur et rejouée Chrome) La recherche de professionnel par un lieu (« kiné près de chez moi ») ne part que
  sans jour, sans heure et sans « rdv / rendez-vous » dans la phrase : « dentiste près de la gare mardi 15h », « avocat en ville
  vendredi 14h » restent des rendez-vous. « Plus de retard » ne nie qu'après « n' / ne » (« je n'ai plus de retard ») ou seul ;
  « j'aurai plus de retard que prévu » est un retard (questionnaire). « non c'était pour Hugo » : seulement juste après une création
  par Charly (carte ou « C'est noté : rendez-vous ajouté » au dernier message de Charly, au-delà du « oui » ; sinon le dernier
  rendez-vous créé charly_ai_) ; un contact déjà là → « « Dîner » est avec Marc Dupont : je le passe à Hugo Besnard ? » puis « oui »
  (tcAppliquerCorrectionContact) ou « non » ; après une simple consultation (« le dentiste de demain ? »), Charly demande « Je remplace Marc Dupont par Sophie Anceau sur
  « Dentiste » (…) ? » et attend oui ; après une question précise du modèle, la phrase lui revient comme réponse. « encore plus de
  retard » → « je décale ou je préviens ? » ; « plus de retard du tout » → « Bien noté, pas de retard. » Quelqu'un
  d'autre malade : « mon chat est malade » → « Bon courage 😊 … », « Marc est malade » → « Marc Dupont est malade : je décale ou
  j'annule ton rendez-vous avec lui ? » ; plus de pièce manquante.

## 24/10/2026 : mission 53, les 13 ratés restants (chef, dernier passage de ce chantier)

- Batterie TESTEURS v2.0.382 : 96 % (287/300). Bloc « MISSION 53 » après le bloc 52 ; retouches des blocs 50, 51 et 52.
- 1. Chaque message reçoit une bulle de Charly (rôle assistant), jamais une carte système seule ni « rien » : « Mets Paul de côté » →
  « Je retire ton rendez-vous avec Paul Martin ? » (oui/non) ou « Lequel ? » ; les confirmations d'information d'annulation, d'ordinal
  et de sans cible sont des bulles. « non c'était pour Hugo » sur une proposition pas encore validée : la carte est refaite avec Hugo
  (tcCorrigerCartePendante, le 6e champ de la ligne [AGENDA]) et Charly demande de la valider.
- 2. Annulation douteuse (classement, avant tout détecteur) : « Je vais pas y aller », « j'y vais plus », « rdv annulé » → « Tu veux
  l'annuler ou le décaler, et lequel ? » (sans lister) ; « J'ai encore oublié le dentiste » → « Pour « Dentiste » (vendredi 16 octobre
  15h à 16h) : tu veux que je l'annule, ou que je le décale ? » ; la réponse se lit AVANT l'objet (« annule » → « annule « Dentiste » »,
  « décale-le à mardi » → « décale-le à mardi « Dentiste » » : déplacement local). Ces phrases ne sont plus « sans cible ».
- 3. « Je dois voir le dentiste avant lundi » → une demande de créneau (tcPeriodeAvant : d'aujourd'hui à la veille ; « d'ici
  vendredi », « avant demain ») : tcGererDemandeCreneau, dans Mes disponibilités (sans plage le week-end, pas de dimanche : le texte le
  dit). « Quels sont mes créneaux libres mardi ? », « je suis libre quand cette semaine » → les créneaux (plus « Noté. Tu veux que je
  propose… » : « quand » ou « ? » = question).
- 5. « Ajoute anniversaire de Gaëlle le 12 novembre » sans heure → journée entière notée directement (allDay, Famille) : « C'est noté :
  « Anniversaire de Gaëlle », jeudi 12 novembre, toute la journée. » ; une deuxième fois → « est déjà noté ». « ajoute quand même »
  sans carte ni conflit en attente (le modèle avait refusé en prose) : la demande précédente est recréée (tcCreationLocale(…, forcer)
  passe la garde « même titre ») et validée.
- Heures en lettres (tcHeuresEnLettres, dans tcCorrigerAbreviations) : « dix-huit heures » → « 18 heures », « quatorze heures trente »
  → « 14 heures 30 », « neuf heures et quart », « midi et demie » ; « deux rendez-vous » reste. Hors sujet courants (recette, pizza,
  « j'ai faim », capitale) : une réponse courte sans question.
- Règle permanente du chef : toute mission qui touche Charly passe la batterie TESTEURS avant son « publié ».
- API inchangée. Suite : verif-classement-charly, section 10.
- (suite, 24/10, rejouée Chrome) « ajoute quand même » : le rendez-vous est ajouté directement, même en doublon exact (la validation
  ordinaire le refusait : « Déjà dans ton agenda, rien à ajouter »), et dit : « C'est noté : « Dentiste », lundi 26 octobre 10h à 11h
  (ajouté quand même). » ; la carte « j'ajoute quand même » est marquée validée. Remarque pour le juge des TESTEURS : les confirmations
  historiques d'annulation (tcGererSuppressionRdv) et « Annulation abandonnée » restent des cartes système (rôle system_info).
- (suite, 24/10, examinateur et chef) Journée entière seulement pour les mots qui le disent (anniversaire, fête, férié, vacances, congé,
  pont, mariage, baptême, communion, « toute la journée ») et jamais avec « rdv » dans la phrase : « rdv salon de coiffure samedi »,
  « note examen médical mardi », « rdv déplacement chez le client jeudi » demandent l'heure (niveau 2). « Vacances du 20 au 30
  octobre », « congés du 28 décembre au 3 janvier », « du lundi au mercredi » (tcPeriodeDuAu) : un seul événement sur plusieurs jours
  (dateFin), titre sans la période (« Vacances »), « C'est noté : « Vacances », du 20 au 30 octobre, toute la journée. ». Les durées
  en lettres restent des durées (« dans une heure », « il y a trois heures », « une heure de route », « pendant deux heures ») ; « une
  heure » ne vaut 1h qu'après « à ». « j'ai oublié de te dire, ajoute golf samedi 10h » : un verbe d'action l'emporte (création) ;
  « j'ai oublié mon parapluie » (ni rendez-vous connu ni mot de rendez-vous) n'est pas une annulation ; « J'ai encore oublié le
  dentiste » garde « tu veux que je l'annule, ou que je le décale ? ».
- (suite, 24/10, examinateur et chef) Une période « du X au Y » se vérifie avant de créer (tcPeriodeDuAu) : fin avant le début dans le
  même mois (« du 30 au 20 octobre », faute de frappe) → « « du 30 au 20 octobre », c'est à l'envers : tu veux dire du 20 au 30
  octobre ? » ; déjà commencée → « a déjà commencé : je note « Vacances » d'aujourd'hui au 20 octobre ? » ; plus de 31 jours → « c'est
  plus d'un mois : je note « Vacances » sur toute cette période ? » ; rien ne se crée avant « oui » (la période proposée est gardée
  dans la bulle, « oui » la note, « non » → « D'accord, je ne note rien. »). « toute la journée » / « journée entière » ne restent pas
  dans le titre (« mets toute la journée formation jeudi » → « Formation »).

## 24/10/2026 : mission 54, le modèle ne décide plus seul de ce qui est libre ou occupé (chef)

- Cause commune cherchée d'abord : l'instantané envoyé au modèle (tcAgendaSnapshotPourIA) est juste (14 jours jour par jour, dates
  locales tcISO, « rien, journée libre » seulement sans rendez-vous, règle absolue en tête) ; c'est la lecture du modèle qui faillait
  (« aucun rendez-vous mardi » avec Réunion équipe à 14h, un kiné de jeudi pris pour un conflit du mercredi, « libre toute la semaine »
  avec quatre rendez-vous). Les trois réponses viennent donc du code.
- 1. « Libère mon mardi », « libère-moi vendredi après-midi », « vide ma journée de demain » : une contrainte (tcDetecterContrainte :
  « libérer / vider / dégager » une période) → tcGererContrainte liste les rendez-vous du jour et propose les trois choix (« Je ne
  touche à rien / Je les annule / Je les déplace ») ; sans rendez-vous : « Tu n'as aucun rendez-vous ce mardi : rien à annuler. ».
- 2. « Mets piscine mercredi de 18h à 19h », « rdv coach lundi 9h-10h30 » : tcCreationLocale lit la plage (début et fin), la carte est
  faite par la page et le conflit vérifié par la page (tcReponseConflitLocale) ; une plage à l'envers ou une durée (« pendant 2 heures »,
  « jusqu'à 17h » seul) partent au modèle.
- 3. « Trouve-moi 2 heures de libre cette semaine » : detecterDemandeCreneau lit la durée voulue (« 2 heures de libre », « deux
  heures de libre ») et tcGererDemandeCreneau ne garde que les créneaux assez longs (« Voici ce qui est libre cette semaine pour
  2 h : … ») ; aucun → « Je ne vois aucun créneau libre de 2 h cette semaine dans tes disponibilités. Tu veux que je regarde plus
  loin, ou une durée plus courte ? ». « Je suis libre quand tu veux » redevient une affirmation (« Noté. Tu veux que je propose ce
  créneau à quelqu'un ? »).
- API inchangée. Suite : verif-classement-charly, section 11 (agenda garni : six rendez-vous sur la semaine).
- Suite verif-charly-campagne10 : les deux plages « réunion mardi de 14h à 16h », « rdv dentiste mardi de 15h à 17h » passaient au modèle ; elles sont
  maintenant des créations locales (début et fin lus), une plage à l envers part toujours au modèle.
- Second passage (verdict EXAMINATEUR + décisions du chef, mission 54) : « de 9 à 11h », « de 9 à 11 », « 9-11h », « de 9 à 11 h 30 » sont
  des plages (A est une heure si B en est une), plus jamais une carte 11h-12h ; « libère / vide / dégage » n'est une contrainte qu'avec
  MON temps (tcLibererPeriode : possessif + jour, journée, matinée, après-midi, soirée, agenda, planning, semaine), jamais à la forme
  réfléchie ; « vide le lave-vaisselle demain », « vide ma boîte mail », « libère-toi mardi » → hors agenda (réponse courte) ;
  « je me libère mardi » → « Noté. Tu veux que je propose ce créneau à quelqu'un ? » ; « trouve-moi 1h30 de libre demain » → 90 min.

## 24/10/2026 : mission 55, dictée vocale et double sens (chef ; 100 phrases nouvelles des TESTEURS, 83 % → objectif 95 % sur 400)

- Hésitations : tcSansHesitations (bloc 55, appelée par tcCorrigerAbreviations) retire « euh », « hum », « bah », « attends », « en fait »,
  « du coup », « voilà », et le « non » devant « annule » (« euh non attends en fait annule » → « annule » → « Lequel ? » ; pendant une
  proposition, « annule » / « stop » seuls = non). La bulle garde le texte tapé.
- Nombres en lettres (tcHeuresEnLettres) : un jour devant un mois (« le cinq novembre », « le premier mai » → 5 novembre, 1er mai), des
  minutes (« dans dix minutes » → 10), les fautes de dictée (onz, catorze, kinze, dizuit…), les jours 24 à 31. tcCreationLocale accepte 12
  mots (« j'ai rendez-vous chez le cardiologue le cinq novembre à neuf heures ») et ne garde la garde « même titre → déplacement » que sans le
  mot rdv / rendez-vous / réunion / séance / consultation : « rdv chez le dentiste à dix-sept heures demain » est un nouveau rendez-vous
  (suite campagne10 adaptée : « rdv dentiste jeudi 10h » crée ; « mets le dentiste à jeudi 10h » reste un déplacement).
- Déplacer en langage parlé : tcDeplacementLocal lit « à 11 heures » ; charlySendMessage déclenche aussi sur « mettre », « mets-la ».
- Prévenir : tcDetecterPrevenance lit le destinataire nommé (« envoie à Gaëlle que… », « dis à Paul que… »), « j'arrive dans 10 minutes »
  (retard), et « retard 10 min dentiste » (la phrase commence par retard et nomme un rendez-vous) ; tcGererPrevenance : destinataire sans
  rendez-vous visé → tcPrevenirContactLibre (« Bonjour Gaëlle, de la part d'Inès : j'arrive dans 10 minutes. », confirmation avant envoi) ;
  rendez-vous nommé → parcours retard direct. « Marc est en retard » reste le retard d'un autre.
- À plusieurs : tcDetecterPlusieursCites (deux contacts connus cités pour se voir, dont un sans TimeCool) → le questionnaire à plusieurs,
  après avoir nommé ceux qui n'ont pas TimeCool.
- Annuler : tcCorrigerCibleSuppression pendant le « oui / non » (« non pas jeudi, vendredi » → la cible devient le Kiné de vendredi, même
  question ; absent → « Je ne trouve pas de « Kiné » vendredi… c'est celui-là que je retire ? »). « Paul me pose un lapin », « Sophie se
  désiste » = ce contact annule (« Je retire ton rendez-vous avec Paul ? »).
- Double sens (bloc 50) : « On se fait ça mardi ? » sur une carte en attente → la carte change de jour (tcCorrigerDateCartePendante) ; sans
  rien en cours → « Quoi, ça ? Dis-moi ce que je note mardi, et à quelle heure. » ; « Je suis coincé au bureau » → « Tu es retenu : je décale ton
  prochain rendez-vous, ou je préviens quelqu'un ? » ; « Lundi ça va pas le faire » → « Je décale quoi, lundi ? Tu as « Dentiste » (10h). Je le
  décale, ou je l'annule ? » ; « Le kiné a changé d'heure » → « À quelle heure, maintenant, pour « Kiné » (…) ? » puis « 17h » déplace le Kiné ;
  « pas libre, occupé » après des créneaux → « Aucun de ces créneaux ne te va : je regarde une autre semaine ? ».
- Phrases simples : « merci Charly t'es top » = remerciement ; « osef » = social ; la réponse à « ça me tue ces réunions » ne pose plus de
  question. « Mets Paul de côté » → « Tu veux dire : annuler ton rendez-vous avec Paul, ou autre chose ? » (rien d'armé ; « oui » lance
  l'annulation habituelle). « rendez-vous » seul → « Un rendez-vous : avec qui, quel jour, à quelle heure ? ». « une heure de libre la semaine
  prochaine » = les créneaux (60 min) ; « j'ai une heure de libre » reste une affirmation. Les réponses « aucun créneau… un autre jour ? »
  portent la nature question.
- API inchangée. Suite : verif-classement-charly section 12 ; verif-charly-campagne10 adaptée (patch-suites-m55).
- Second passage (verdict EXAMINATEUR, 9 défauts, décisions du chef) : tcDeplacementLocal ignore « de N heure(s) » comme heure cible et le lit
  comme un décalage (« décale le dentiste de 1 heure » → +1 h, « avance d'une heure » → -1 h, « de 30 minutes ») ; « je suis pris / prise /
  bloqué / retenu + un moment » → « Noté, mardi tu n'es pas disponible. Je décale quelque chose ? » (le parcours contrainte garde la main
  quand il reconnaît la phrase), « je suis coincé au bureau » reste « Tu es retenu… » ; « X a changé de numéro / d'adresse / de mail » → « tu veux
  que je mette à jour sa fiche ? », « a changé » seul ne vise plus un rendez-vous (il faut d'heure, d'horaire, de jour, décalé, reporté) ;
  « merci, et jeudi 15h ? » : le reste se classe (compose sans le merci) ; après des créneaux, « non, mardi plutôt » passe ; tcDetecterPlusieursCites
  exige une demande de créneau commun (trouver, proposer, un moment, quand), sans heure, sans question ni consultation, et au moins un invité sans
  compte (sinon tcDetecterRdvGroupe) ; « note café avec Marc et Sophie jeudi 15h » fait une carte (titre jusqu'à 5 mots ; les mots « avec » et les
  prénoms ne comptent plus dans la garde « même titre ») ; les messages aux contacts recopient le texte dicté avec ses accents (« j'aurai 10 min
  de retard », « j'annule le tennis », « Sophie est en retard »), « à lui / à elle » → « à toi » ; tcSansHesitations ne retire « attends », « en fait »,
  « du coup », « voilà », « bon » qu'en tête ou isolés (« on attend le plombier », « Paul attend ma réponse » intacts), jamais « je veux dire » devant
  « à » ; « non annule pas » garde son non ; tcDetecterChangementJourCarte ignore un jour précédé de « pas » ; « mets le rdv dentiste à jeudi 10h »
  (l'article) ne crée rien ; « retard de Marc au dentiste » n'est pas mon retard ; « comme tu veux » après une question précise est une réponse.
  Une vraie liste de mots de moment (TC_CLASSE_VRAI_MOMENT) remplace l'usage fautif de TC_CLASSE_MOTS_DE_MOMENT (qui contient « au », « non »).
- Troisième passage (examinateur + chef) : « je suis pas dispo mardi » → « Je n'ai rien bloqué. Tu veux que je note « Indisponible » mardi dans
  ton agenda ? » (le groupe « pas dispo » tombe en entier ; rien n'est bloqué sans « oui » ; « oui » = « indisponible mardi », journée entière
  « Indisponible », mots ajoutés à TC_JOURNEE_ENTIERE ; avec une heure, « note indisponible de 14h à 16h ») ; « Paul a changé d'adresse / d'email »
  avec l'élision ; aucun invité avec TimeCool (« propose un créneau à Marc et Sophie ») → « Marc Dupont et Sophie Anceau n'ont pas TimeCool : je ne
  peux pas leur proposer un créneau d'ici. Tu veux que je leur écrive ? », sans questionnaire ; « note café avec Marc et Sophie jeudi 15h » → carte
  « Café avec Marc et Sophie » (les prénoms de contacts gardent « avec » et « et » dans tcCreationLocale) ; messages aux contacts : « Bonjour Sophie,
  Inès me demande de te dire : … » ; « dis à Sophie qu'elle est géniale » → « …de te dire que tu es géniale. » (il/elle + verbe connu → 2e personne) ;
  verbe inconnu → la phrase brute entre guillemets et la confirmation « J'envoie ça tel quel à … ? ».

## 24/10/2026 (soir) : mission 56, pros, clients, rappels et invitations (chef ; 100 phrases nouvelles, 84 % → objectif 95 % sur 500)

- Bloc 56 (devant tcPhraseNonCompris) : tcAjusterCartePendante (le client nommé dans la carte proposée juste avant, ou « elle / il / décale-la »,
  ou « même heure la semaine prochaine » seul : « a annulé » → « je laisse tomber la proposition « … » ? » (oui = abandon, _abandonSurOui ;
  non = la garder), « veut décaler à mercredi », « d'une heure », « à 14h30 » → la carte recalée puis « Tu la valides ? ») ; tcDetecterRappelDate
  (« Rappelle-moi de payer l'URSSAF le 5 novembre » → journée entière « Rappel : … » ; avec une heure → carte ; récurrence ou « dans une heure »
  → modèle) ; tcCarteInvitation (« Invite Hugo à prendre un café mardi 16h », « Invite Paul à dîner samedi 20h », « Propose un rendez-vous à
  Gaëlle jeudi 11h », « Envoie une invitation à Gaëlle pour mardi 10h » → carte « Café avec Hugo » avec l'invité en 6e champ) ;
  tcQuestionTypeEnAttente (« en personne », « plutôt en visio », « par téléphone » répondent à « Par téléphone, en personne ou en visio ? ») ;
  tcAucunCreneau / tcDireAucunCreneau (« avant lundi », « d'ici vendredi » sans créneau : la question vient de la page).
- Page : « ajoute quand même » sur une carte ajoute même un doublon exact (tcAjouterQuandMeme) ; tcCreationLocale accepte un client nommé en
  tête (« Mme Lambert brushing samedi 10h », « M. Dubois vendredi 9h ») ; detecterDemandeCreneau lit « un client / un créneau de 2h » comme
  une durée ; tcDetecterRdvGroupe accepte UN contact avec compte sur une recherche de créneau commun (prends / trouve / propose… sans heure) ;
  tcDetecterPrevenance lit « demande à X si / quand … » (message « Bonjour Gaëlle, Inès te demande si tu peux décaler notre rdv. ») ;
  tcDetecterSuppressionSansCible : « annule le client / la cliente de 14h » → « Lequel ? ».
- Bloc 50 : « Gaëlle peut voir mon agenda ? », « Partage mon agenda avec Gaëlle » → « Non. Personne ne voit ton agenda ; seul un créneau circule
  quand tu le proposes. » ; « Je veux plus voir Paul » → « Je retire tes rendez-vous avec Paul, ou je le bloque ? » ; « Rappelle à M. Dubois son
  rendez-vous » → sans fiche « Je n'ai pas les coordonnées de M. Dubois : tu me donnes son numéro… ? », avec fiche le message part ; « SMS à
  Mme Martin » → « Je n'ai pas le numéro de Mme Martin : tu me le donnes ? » ; « M. Dubois arrivera 20 minutes en retard » → « D'accord : M. Dubois
  aura 20 minutes de retard. Je ne préviens personne, ton rendez-vous reste tel quel. » ; « Je suis en grève jeudi », « je reste chez moi demain »,
  « Je prends ma journée vendredi », « Je serai pas là la semaine prochaine » → « Je n'ai rien bloqué. Tu veux que je note « Indisponible » … ? ».
- API inchangée. Suite : verif-classement-charly section 13 (≈ 20 vérifications) ; rejoué dans Chrome avec l'agenda des TESTEURS et les contextes
  A9 / A10 / A11 : les 22 phrases ratées du passage 500 répondent comme attendu.
- Suites verif-charly-campagne10 et verif-creneaux-proposes : la forme exacte des deux lignes modifiées (chaîne de création locale, question « aucun créneau ») est
  acceptée (patch-suites-m56).
- Second passage (examinateur, 14 points + décisions du chef) : tcAjusterCartePendante ne touche la carte que si le message parle d'elle (nom
  exact du titre, « elle / il », « décale-la », « annule-le », « cette carte à 17h », « même heure la semaine prochaine » seul) ; « décale le kiné à
  jeudi », « annule le kiné », « Martine a annulé » la laissent ; dates en minuscule (tcDateMinuscule) ; tcHeureCourte de la page réutilisée ;
  tcDetecterRappelDate exige « de / d' / à + verbe » après « rappelle-moi » et lit une date en tête (« rappelle-moi le 5 novembre de payer… »,
  « rappelle-moi mardi d'appeler le comptable »), « mes rdv de demain », « ce que j'ai demain », « demain » seul partent au modèle ; un créneau
  a toujours une durée (23h30 → 23h59) ; tcCarteInvitation rend null avec deux invités (rendez-vous à plusieurs) ; tcDetecterRdvGroupe à un
  contact exclut « mon / le rdv », une période passée, « où est » ; questions transmises : « s'il » → « si tu », un « je / mon » d'Inès → phrase
  brute entre guillemets ; « On peut voir mon agenda sur l'iPhone ? » → « Oui : avec le même compte, ton agenda est le même sur le web et sur
  l'iPhone. », la réponse « Non. Personne ne voit… » seulement avec un contact nommé ou « qui / quelqu'un / les autres » ; rappel au client :
  le nom s'arrête à « que / qu' », sans fiche seulement un nom en majuscule ou M. / Mme ; retard d'un client suivi d'une action (« décale son
  rdv de 30 minutes », « préviens Paul ») : l'action suit son chemin, le client remplace « son rdv » ; indisponibilités : liste du chef
  (grève, congé, vacances, repos, pas là, reste chez moi, prends ma journée ; plus télétravail ni formation), période « du 2 au 6 novembre » et
  « la semaine prochaine » (oui = du lundi au vendredi) notées ; « ajoute quand même » ajoute la carte telle qu'affichée (tcAjouterCartePendante,
  dernier jour, dernière heure) ; « Je veux plus voir Paul » → « ou je bloque ce contact ? » ; le titre garde « M. » (« M. Dubois ») ; « Mme Lambert
  a appelé samedi 10h » part au modèle.
- Troisième passage (examinateur + chef) : partage : la vie privée d'abord (« Paul peut voir mon agenda sur son téléphone ? » → « Non. Personne ne voit ton
  agenda… »), le « oui » seulement pour moi sur mes appareils, phrase unique du chef (« …tu retrouves ton agenda sur tous tes appareils (téléphone, tablette,
  ordinateur). ») ; rappel au client : « Mme de Villiers », « M. Le Goff » restent entiers (particule, « Le ») ; rappel daté : la date précédée de « de / du /
  pour » reste dans l'objet (« Rappel : vérifier mes rdv de demain », noté demain), un petit mot final tombe ; tcCiviliteEnTete lit la civilité dans le texte
  tapé (« M. », « Mme », « Me » + espace ; « m'appeler » n'en est pas une) ; « Paul doit m'appeler jeudi 14h » → « Appel de Paul » ; « Me Durand » gardé.
- Quatrième passage (examinateur + chef) : partage : le tiers doit être le SUJET de voir / accès / partage (« Paul peut voir », « qui voit », « partage mon agenda
  avec Paul », « montre mon agenda à Hugo ») ; « je peux voir mes rdv avec Hugo ? » = consultation, « s'il » n'est pas un tiers ; tcCiviliteEnTete : « Me » / « M »
  seulement devant un nom en majuscule qui n'est pas un verbe (« Me rappeler », « Me Faire couper » ne sont pas des civilités) ; « Me rappeler jeudi 14h »,
  « rappelle-moi demain 9h » = une carte « Rappel » à cette heure (sans heure, le modèle) ; « Mme de Villiers mardi 10h » garde la particule.

## 25/10/2026 : mission 57, demandes reçues et invitations, envois relus, jamais « c'est fait » sans action (chef ; 100 phrases « deux comptes » à 64 %)

- Bloc 57 (devant tcPhraseNonCompris). tcDetecterDemandeRecue : « repondre » (accepte / refuse / décline / ignore ; dis oui / non à X ; présent / absent /
  je serai présent / je ne pourrai pas venir au… ; propose-lui, propose deux créneaux à X, propose à X jeudi 11h ; bloque X / bloque-la ; laisse tomber la
  demande ; pas cette semaine pour X ; toute phrase avec « la / une demande, invitation, convocation ») ou « lire » (« Hugo a répondu ? », « il veut quoi
  Hugo ? », « qui veut me voir ? », « c'est qui Lucie Marchand ? », « combien j'ai de demandes ? ») ; jamais un message à transmettre (« dis à Hugo que… »,
  « demande à Hugo plutôt mercredi », « réponds à Hugo que je suis dispo »). tcGererDemandeRecue : une bulle (question) avec la phrase du chef et le bouton
  « Ouvrir la messagerie » ; « oui » = « ouvre la messagerie » (tcDetecterOuvrirMessagerie / tcOuvrirMessagerie → navigate('messages')).
- tcProposerEnvoi / tcEnvoiEnAttente / tcRepondreEnvoi : tout message pour un contact (tcPrevenirContactLibre, tcPrevenirRetardAutre) est relu dans la
  conversation : « Je propose d'envoyer à X : « … ». J'envoie ? Réponds « oui » ou « non ». » (ou « J'envoie ça tel quel à X ? ») ; « oui » → tcTransmettrePrevenance
  et « C'est envoyé à X. » / « Le message est prêt pour X : envoie-le. » ; « non » → « D'accord, je n'envoie rien. » ; autre chose → la question tombe. Plus de tcConfirm.
- tcSansFaussesActions : une réponse du modèle sans bloc qui dit « c'est fait », « c'est envoyé », « je bloque X », « j'ai prévenu » est remplacée par « Je n'ai rien
  fait de moi-même : bloquer, envoyer ou répondre à une demande se fait dans la messagerie. Je t'y emmène ? » (nature question).
- charlySendMessage : la demande reçue est lue avant le classement ; « ouvre la messagerie » avant la prévenance ; « J'envoie ? » avec les attentes ; la fausse
  action après tcSansFormulesFaites. tcDetecterPrevenance lit « réponds à X que… ». tcNatureReponse : « Je t'y emmène ? » = question.
- API inchangée. Suite : verif-classement-charly section 14 (32 phrases « répondre », 12 « lire », 16 ordinaires, l'envoi relu oui / non, la fausse action).
- Second passage (examinateur, 8 points + décisions du chef) : tcDetecterDemandeRecue réécrit, étroit : l'objet explicite (la / sa / cette demande, invitation,
  convocation, proposition, « de X » = une personne connue ou écrite en majuscule ; jamais « demande de devis », « une invitation pour dîner »), accepte / refuse /
  décline / ignore seuls ou avec une personne, « tout », « la première », « la visio », « le point projet » ; « dis oui / non à X » ; présent / absent seuls ou « au
  point / à la réunion / à l'invitation » ; « je ne pourrai pas venir au point » ; « propose-lui », « propose deux créneaux à X », « propose à X jeudi 11h » (rien
  d'autre) ; « bloque X » / « bloque-la » (une personne, jamais du temps) ; « laisse tomber la demande » ; « pas cette semaine pour X » ; « lire » : « X a répondu ? »,
  « il veut quoi ? », « qui veut me voir ? », « c'est qui Lucie ? » (nom en majuscule), « des demandes en attente ? », « combien de demandes ? ». Exclus : un message à
  transmettre, une création ou un rappel, une règle (« tous les », « le dimanche »), ma présence (« je suis absent demain »), le temps bloqué, « c'est qui mon rdv »,
  « qui vient à la réunion de jeudi » (agenda, chef). tcSansFaussesActions : par phrase, seulement une affirmation (jamais « ? », « que je », « si c'est », « une fois
  que », « dès que », ni « bloque » + temps) ; « Le message a bien été envoyé », « Hugo est prévenu » couverts. tcRepondreEnvoi : oui net (≤ 4 mots) envoie, non net
  n'envoie rien, « oui mais… / plutôt… » n'envoie rien et demande le texte, toute autre phrase ferme la question et suit son chemin. tcPrevenirDepuisChat :
  relecture en bulle (annulation du rendez-vous ou note de retard après l'envoi), plus de tcConfirm sur le chemin du chat (les fenêtres décaler / annuler / voyage
  hors chat ne bougent pas, décision du chef). Suite : section 14, 46 cas négatifs.
- Troisième passage (examinateur + chef) : tcRepondreEnvoi : les petits mots autour du oui tombent (stp, svp, merci, charly, allez…), « ouais », « ouep », « carrément »,
  « bien sûr », « vas-y », « envoie(-le) », « 👍 » valent oui ; un oui qui n'est ni net ni « oui mais » repose « J'envoie ? Réponds « oui » ou « non ». » (jamais fermé en
  silence). tcSansFaussesActions : la majuscule du nom réellement exigée (« Ton agenda est bloqué ce jour-là » reste), « c'est annulé / réglé » seulement seul
  (« C'est réglé ! ») ou à la première personne (« je l'ai annulé ») ; « c'est réglé : tu n'as rien jeudi », « c'est annulé de son côté » restent (constats, chef).
- Quatrième passage (examinateur) : tcSansFaussesActions, « Nom est bloqué » : le « \b » après « é » ne marche pas en JS, remplacé par (?![a-zà-ÿ]) (« Hugo est
  bloqué. », « Il est bloqué. » à nouveau remplacés) ; tcRepondreEnvoi : le non se lit sur la phrase entière (« pas maintenant », « pas tout de suite » = refus dit).
- Cinquième passage (examinateur) : tcSansFaussesActions, « Nom est bloqué » : les jours, mois et mots d'agenda en majuscule (Jeudi, Demain, Ton, Agenda…) ne sont
  pas des personnes ; « Jeudi est bloqué. », « Mardi est bloqué pour ton sport. » restent (constats), « Hugo est bloqué. » reste remplacé.
- Sixième passage (chef) : tcSansFaussesActions, « X est bloqué / prévenu / informé » ne compte que si X est « il / elle » ou un contact qui a une fiche (tcContactsParMots) ;
  « Jeudi est bloqué (formation). », « Paris est informé de tout. », « Demain est bloqué. » restent des constats.
- À noter pour une mission à part (chef, 25/10) : trois e2e instables dans la nuit (verif-temps-protege-e2e, verif-blocage-silence-e2e, verif-qui-ecrit-e2e,
  verif-refus-simple-e2e : « compte_existant » pour Axel, Tania, Clemence…) quand deux passages tournent en même temps (codeur et examinateur). À faire : nettoyer
  les comptes d'essai avant chaque e2e, ou donner à chaque passage un nom de compte unique (suffixe horodaté).

## 25/10/2026 - Mission 58 (chef, 25/10) : les ratés du passage 14 des TESTEURS (session Codeur)

Après la publication de la mission 57 (v2.0.387, 97 % sur 600), le chef a envoyé les ratés du passage 14. Un seul « oui » de Charles couvre le chantier.
Ce qui change (bloc `MISSION 58` dans `index.html`, après le bloc 57 ; `correctif-m58.js`, rejouable, après m50c à m57) :
- Les demandes de rendez-vous et les invitations reçues sont lues dans le cache local de la messagerie (`tc_conversations`, écrit par la synchro ; jamais une requête) : `tcDemandesRecues`, `tcMessagerieANouveau`. Sans demande en attente, Charly le dit (« Tu n’as aucune demande en attente… », « Rien de nouveau dans la messagerie… », réponse) ; avec, il nomme qui attend quoi avant le chemin vers la messagerie (« Tu as une demande de rendez-vous de Hugo Besnard (en personne) en attente. Les demandes reçues se répondent… »).
- Une personne qui a demandé un rendez-vous + un jour et une heure (« Fixe Hugo vendredi 9h », « onze heures jeudi pour hugo », « Gaëlle par téléphone vendredi 9h », « propose a ugo jeudi a 11h », « ok hugo mer 15h », « Propose-lui lundi 10h ») : `tcDetecterCreneauPourRecue` / `tcGererCreneauPourRecue` envoient `/rdv/proposer-creneau` (le rendez-vous s'inscrit chez vous deux, comme le bouton « Proposer un créneau »), jamais une carte solo. Un conflit (« tu as déjà « Dentiste » (10h à 11h). Je propose quand même…, ou tu m’en donnes un autre ? ») ou une heure passée : une question, rien n'est envoyé ; « oui » envoie. Le serveur refuse : « Je n’ai pas pu envoyer ce créneau… Rien n’est inscrit ». « Ajoute Lucie à mes contacts et propose-lui mardi 10h » : la fiche du demandeur (prénom, nom, mail, référence) est créée puis la proposition part.
- La même personne + une période sans heure (« Trouve un créneau pour Hugo cette semaine », « Propose à Hugo mon prochain créneau libre », « Repousse Hugo à la semaine prochaine » sans rendez-vous avec Hugo, « Pas mardi, plutôt jeudi matin pour Hugo », « Hugo, mais après 17h seulement ») : une seule personne = une proposition simple, plus le chemin « groupe » : Charly cherche le premier créneau libre (mes disponibilités, mon agenda ; `tcPremierCreneauLibre`) et demande « Je lui propose ce créneau ? » ; « oui » envoie, « non » laisse, « plutôt lundi 10h » propose le nouveau créneau, toute autre phrase suit son chemin (`tcRepondreRecue`, lu avec les attentes après « J’envoie ? »).
- « Plutôt par téléphone avec Hugo vendredi 11h » quand UN rendez-vous avec Hugo existe (contact ou prénom dans le titre) : son mode change (et son heure par `tcExecuterDeplacement`), rien n'est créé ni proposé. « Repousse Hugo » trouve le rendez-vous dont le CONTACT est Hugo (`tcRdvNommeIntrouvable` / `tcRdvViseIntrouvable` regardent le contact, plus seulement le titre) et `tcDeplacementLocal` le déplace.
- « ok », « je viens », « Je viens mais j’arriverai à 10h15 » quand UNE invitation attend et rien d'autre (ni carte, ni conflit, ni question précise de Charly) : « Tu as une invitation de Gaëlle Perrin : « Point projet », jeudi 10h-11h. Je réponds « présent » de ta part ? » ; « oui » envoie `/convocations/repondre` (présent) ; l'heure d'arrivée est à écrire dans la messagerie. « Présent », « Absent », « Accepte l’invitation » gardent le chemin de la mission 57 (messagerie), décision du chef.
- « non pas ça », « pas celui-là » sur une carte proposée : « D’accord, je n’ajoute rien. Qu’est-ce que tu voulais ? » (question), plus la carte système seule. « je suis triste », « je suis fatigué », « ça va pas » : une réponse courte sans question (bloc 51, `TC_CLASSE_SOCIAL`). « Je dois annuler ? », « Faut-il décaler ? » : « Ça, c’est toi qui le sais : je ne connais pas la raison. Si tu veux annuler ou décaler un rendez-vous, dis-moi lequel. » (bloc 50, classe `conseil`, réponse, rien d'armé).
- Dates un dimanche : le contexte envoyé au modèle était juste ; « Ajoute dentiste mardi 9h » partait au modèle à cause du Dentiste déjà dans l'agenda (garde « même titre » de `tcCreationLocale`) : un verbe de création en tête (ajoute, crée, planifie, programme, inscris, enregistre) ne déplace jamais, la carte est faite ici. `tcPeriodeAgenda` : un dimanche, « cette semaine » est la semaine qui commence demain (plus le seul dimanche). « Mets Hugo et Gaëlle ensemble jeudi 10h » : « ensemble » compte pour `tcDetecterRdvGroupe` (deux noms = à plusieurs).
Choix pris seul (à trancher par le chef si besoin) : avec une personne, un jour et une heure explicites, la proposition part sans relecture (comme le bouton « Proposer un créneau ») ; avec une période seule, Charly demande d'abord. Le cache des conversations fait foi pour « aucune demande en attente ».
Vérifié : `verif-classement-charly.js` section 15 (demandes reçues, créneaux, convocation, classement, dimanche), les 21 suites Charly, `verifier.sh` ; 44 cas rejoués dans Chrome sur la page complète avec l'agenda et les conversations des TESTEURS (R1 à R6).
Deuxième passage (examinateur, 25/10) : « oui mais … » et « ok mais … » après « Je lui propose ? » ne sont plus un oui (oui net seulement, comme pour « J'envoie ? ») : avec un moment, le nouveau créneau ; sans, Charly redemande le jour et l'heure. « non, plutôt jeudi 15h » garde le nouveau moment. Un mot du calendrier (« mars ») n'est jamais un prénom à une lettre près. « ok », « parfait », « oui » seuls ne répondent à une invitation que si le dernier message de Charly en parlait (ou sans aucun échange avant) ; « je viens », « j'y serai » restent larges ; « absent » après « Je réponds présent ? » envoie la réponse absent. Mode « modifier » : un jour seul garde l'heure, une heure seule garde le jour (déplacement), jamais « rien d'autre ne change » à tort. Deux moments (« vendredi 9h et samedi 10h ») : « lequel je lui propose ? », rien ne part ; « mets », « bouge », « change » avec un rendez-vous déjà pris avec la personne : le déplacement local garde la main, rien ne part.
Troisième passage (examinateur, 25/10) : après « D'accord, pas celui-là. Quel jour et quelle heure pour Hugo ? », le créneau refusé est oublié (une nouvelle attente sans créneau) : « ok » ou « oui » redemandent « Lequel ? », rien ne part ; un jour et une heure ensuite partent. « non » n'est plus un petit mot : « Fixe Hugo vendredi 9h non » rend la main (le « non pas mardi » est déjà retiré avant).
Mission 58 bis (chef, 25/10) : personne + jour + heure (« Fixe Hugo vendredi 9h ») : Charly relit d'abord (« Je propose vendredi 30 octobre à 9h à Hugo (en personne) ? Réponds « oui » ou « non ». ») ; « oui » envoie, « non » laisse, un autre moment relit le nouveau. Rien ne part vers un contact sans « oui », comme pour les messages de la mission 57 (une phrase dictée peut être mal lue) ; le bouton « Proposer un créneau » de la messagerie reste direct (clic volontaire). Un dimanche, le libellé de « cette semaine » dit les dates (« cette semaine (du lundi 26 octobre au dimanche 1er novembre) ») : consulter et ajouter s'en servent tels quels, annuler ou libérer la période les montrent avant d'agir. « Mets Hugo et Gaëlle ensemble jeudi 10h » sans l'heure : noté pour plus tard (chef).

## 25/10/2026 - Mission 59 (chef, 25/10, capture de Charles) : un message à envoyer sans son texte, jamais « pas encore » (session Codeur)

- « Tu peux envoyer un message à ma mère qui se trouve dans ma messagerie via ma messagerie sécurisée TimeCool ? » recevait « Pas encore, ça arrive bientôt » (liste des réponses figées, mots « message », « tu peux envoyer »). Faux : Charly sait envoyer un message par la messagerie (mission 55). Bloc `MISSION 59` (`bloc-m59.js`, `correctif-m59.js` après m50c à m58) : `tcDetecterMessageSansTexte` reconnaît la demande SANS texte (« envoie / écris / dis quelque chose / préviens … à X », avec ou sans « via ma messagerie », « qui se trouve dans mes contacts », la politesse) ; le destinataire est un contact nommé, ou un lien de famille (« ma mère », « maman », « mon père »… : une fiche nommée ainsi, sinon les fiches classées « Ma famille »). `tcGererMessageSansTexte` : « Que veux-tu dire à Marie (Marie Dupont, ta mère) ? Je te relis le message avant de l’envoyer. » ; plusieurs fiches → « Lequel : … ? » ; aucune → « Je ne trouve pas ta mère dans tes contacts : dis-moi son nom, ou classe sa fiche dans « Ma famille ». ». `tcRepondreMessageSansTexte` (lu avec les attentes) : un nom → la fiche puis la question du texte ; « non c'est Hugo » → l'autre contact ; le texte → la relecture de la mission 55 (« Bonjour Marie, Inès me demande de te dire : … », « J’envoie ? ») et le « oui » envoie par la messagerie ; « non », « laisse tomber » → « D’accord, je n’envoie rien. ». « dis à Paul que j'arrive » (le texte est là) garde le chemin de la mission 55.
- Réponses figées : « tu peux envoyer » n'est plus un e-mail ; « message », « sms », « texto » → « Oui, par la messagerie TimeCool : dis-moi à qui et quoi (par exemple « dis à Paul que j’arrive dans 10 minutes »), je te relis le message avant de l’envoyer. » ; WhatsApp reste « pas encore ».
- « J’ai laissé tomber la proposition précédente. Je passe à ta nouvelle demande. » après « Cv » : la bulle ne sort plus que si le classement dit « claire » (une vraie nouvelle demande), jamais pour une phrase sociale ou une réaction.
- Vérifié : `verif-classement-charly.js` section 16, les 21 suites Charly, `verifier.sh` ; cas rejoués dans Chrome sur la page complète (m1 à m8).
Deuxième passage (examinateur, 25/10) : après « Marc est en retard → je préviens quelqu'un ? » (retard_autre), « préviens Sophie » reste la réponse de la mission 51 (le détecteur se retire). Un mot qui n'est pas la fiche à côté du nom (« préviens Hugo de mon retard », « dis à Paul bonjour », « envoie un message à Paul demain », « écris à Paul et Hugo ») rend la main (jamais « je ne trouve pas » pour une fiche qui existe) ; une fiche bloquée aussi. Une fiche trouvée par la seule catégorie Famille est confirmée (« C'est qui, ta mère : Marie Dupont ? Réponds « oui », ou donne-moi son nom. ») ; une fiche nommée « Maman » est prise directement. Étape « texte » : abandon élargi (« finalement non », « rien du tout », « annule », « laisse ») ; « oui », « ok » seuls reposent la question ; une demande d'agenda claire (classement « claire » + un détecteur d'agenda) fait tomber le message (« D'accord, je laisse tomber le message pour Paul. Je passe à ta demande. ») et suit son chemin ; « non, dis-lui que X », « dis-lui que X » → le message X.

## 26/10/2026 : mission 60, un réglage changé pour de vrai, jamais « c'est appliqué » sans rien faire ; les ratés du passage 15 (chef, capture de Charles)

- Capture de Charles : « Quelles sont toutes les fréquences possibles ? » → le modèle inventait « 5 min, 15 min, 30 min, 1h, ou la veille », puis « La veille »
  → « Noté, je règle tes rappels sur la veille. C'est appliqué ! 👍 » ; Paramètres > Notifications affichait toujours « 1 heure avant ». Cause : le filet de la
  mission 57 (tcSansFaussesActions) ne connaissait que « fait, envoyé, bloqué, refusé, accepté » et les verbes de la messagerie ; « appliqué », « je règle »,
  « noté » passaient, et rien dans la page ne savait changer un réglage depuis Charly.
- Bloc 60 (devant tcPhraseNonCompris). tcDetecterReglage / tcGererReglage, avant le classement et le modèle : « quelles fréquences / quels délais possibles ? »
  → la liste lue dans TC_DELAIS_RAPPEL (5, 10, 30 minutes, 1 heure, 2 heures avant, la veille, aucun rappel), l'actuel, « Lequel je mets ? » ; « mets mes rappels
  la veille / 30 minutes avant » → tc_rappel_delai écrit comme tcAppliquerDelaiRappel (reprogrammation des rappels, synchro), RELU, puis « C'est fait : tes
  rappels sont maintenant la veille. » ; une valeur que la page n'a pas (15 minutes) → rien ne change, la liste et « Lequel je mets ? » ; « désactive / active
  mes rappels » → tcBasculerRappels (sur le site, sans l'application Android, Charly dit qu'il ne peut pas les activer d'ici) ; « coupe / remets les
  sonneries » → tcBasculerSonneries ; « mes rappels aussi par mail » → tcDefinirRappelEmail ; « mets le thème sombre / clair / auto » → applyTheme ; « passe
  l'application en anglais », « remets en français » → selectLanguageFromSettings (une langue non proposée : « TimeCool n'existe pas encore en … ») ;
  « mes rappels sont activés ? » → l'état lu ; format des dates, fuseau, message d'absence, plage horaire, premier jour, mises à jour et sauvegarde
  automatiques, mot de passe → « Je ne peux pas encore le faire d'ici : Paramètres > … ». Jamais : un rappel pour UN rendez-vous, « rappelle-moi de… »,
  « traduis … en anglais », « mets mon téléphone en silencieux », une question qui n'ordonne rien. tcRepondreReglage : « Lequel je mets ? » → un délai le règle,
  « oui » seul repose la liste, « non » ne change rien ; après une liste de rappels du modèle, « La veille » seul règle aussi pour de vrai.
- tcSansFauxReglage (avant tcSansFaussesActions) : une réponse du modèle sans bloc qui affirme avoir réglé, appliqué, activé, désactivé, coupé, enregistré,
  modifié un réglage (rappels, sonneries, thème, langue, format, fuseau, absence…) est remplacée par la vérité et le moyen de le faire ; « Noté ! » seul
  sur un réglage aussi ; hors réglage, « c'est appliqué / activé / enregistré / mis à jour » sans rien de fait → « Je n'ai rien changé de moi-même … »
  (sauf un déplacement, que la page exécute juste après). Jamais une question, une condition ni le chemin des Paramètres.
- Passage 15 : la réponse de Hugo à MA demande (dernier mot de la conversation à lui, ni demande ni invitation) n'est plus « Tu n'as aucune demande en
  attente » : « Hugo a répondu ? » → sa réponse citée ; « Accepte la proposition de Hugo », « Réponds non à Hugo », « propose-lui 17h », « propose-lui jeudi
  midi » → sa réponse citée et la mienne relue (« Je lui réponds : « C'est d'accord pour mardi 27 octobre à 16h. » Puis je l'inscris dans ton agenda.
  J'envoie ? ») ; « oui » → le message part (tcRepondreEnvoi) et le rendez-vous est inscrit, ou déplacé quand mon message parlait d'un rendez-vous
  (« On garde le déjeuner de mercredi ? » / « On décale à vendredi même heure ? » → le déjeuner passe au vendredi qui suit, même heure) ; deux réponses sans
  nom → « À qui je réponds ? ». « donne-moi le numéro de Hugo », « c'est quoi le mail de Gaëlle ? » → lu dans la fiche (tcDetecterCoordonnees), « Je ne
  trouve pas X dans tes contacts » sinon ; jamais un numéro de semaine, des urgences ni un message à transmettre. Un lundi, « le dentiste de lundi »
  (tcDeplacementLocal) est celui de lundi prochain quand aujourd'hui n'en a plus à venir (« d'aujourd'hui », « ce soir » gardent aujourd'hui) ;
  « tu peux le mettre à onze heures » se lit 11h.
- API inchangée. Suite : verif-classement-charly section 17 (38 réglages compris, 19 phrases qui gardent leur chemin, la capture rejouée, chaque réglage
  relu, 10 réponses du modèle menteuses et 9 honnêtes, Hugo R3 / R4, numéro, lundi après-midi) ; section 15 : « Hugo a répondu ? » cite la réponse.
- Deuxième passage (examinateur, 26/10, 5 points) : une plainte (« j'ai plus de rappels », « pourquoi j'ai plus de notifications ? », « je reçois plus de
  rappels », « les rappels ne marchent plus ») n'est jamais un ordre : Charly dit l'état, rien ne change ; un jour, une période, une personne, la
  messagerie (« supprime mes rappels de demain », « coupe mes rappels pendant les vacances », « plus de notifications de Paul », « arrête les
  notifications de la messagerie ») et « je veux plus de rappels » (ambigu) gardent leur chemin ; seul un ordre net coupe ou active. Sans « Lequel je
  mets ? », un délai seul (« la veille », « 30 minutes », jamais « 30 minutes plus tard ») ne règle tous les rappels que juste après une bulle qui
  listait les délais de tous les rappels (au moins trois, sans « ce rendez-vous », durée ni heure). tcSansFauxReglage : un état décrit (« tes rappels
  sont activés 1 heure avant », « le mode sombre est activé le soir ») n'est plus une action (« sont maintenant / désormais … » l'est) ; seules les
  phrases qui mentent sont retirées, le reste de la réponse est gardé et la vérité ajoutée dessous (pour les rappels, avec les délais de la page).
  Réponse à Hugo : « oui mais pas cette semaine », « ok mais pas mardi » → « Quel autre moment je lui propose ? », un moment refusé n'est jamais la
  proposition ; « Réponds à Hugo que je suis malade » → ce texte, relu. Numéro d'un contact : le nom tel que tapé (« Hélène »), « ma mère » par le
  lien de famille de la mission 59 (fiche nommée ainsi, sinon la famille, dite comme telle), « Marc et Paul » chacun. « mets mes rappels 1h avant et
  la veille » → « Je ne peux en mettre qu'un seul… Lequel je mets ? ». Suite : section 17, sondes de l'examinateur reprises en vérifications.
- Troisième passage (examinateur, 26/10, 4 points) : réponse à Hugo : « accepte pas », « n'accepte pas », « valide pas », « pas d'accord » → un refus,
  jamais l'accord ; « mardi non, jeudi oui » → jeudi proposé ; « oui, mais préviens-le que… » reste un oui (la réserve ne compte que pour « mais pas /
  non / sauf »). Délai : une partie des rendez-vous (« la veille pour les rdv pro », « sauf le dentiste », « seulement pour le travail ») → « Je ne
  peux régler qu'un seul délai, le même pour tous tes rappels … », rien ne change ; « je préfère / ce serait mieux / je voudrais la veille pour mes
  rappels » → réglé. Filet : « sont réglés / programmés sur + un délai » est une action affirmée (« Noté ! Tes rappels sont réglés sur la veille. »
  → la vérité), « Tes rappels sont activés » seul reste un état. « quelles options pour le restaurant / mon abonnement ? » ne donne plus les délais.
  Numéro : « ma sœur » (ligature œ) passe par le lien de famille.

### 27/10/2026 : mission 61, les ratés du passage 16 (CODEUR)

- Mission 61 (chef, 27/10, passage 16 à 98,5 %) : « Rappelle-moi » seul → « Je te fais penser à quoi, et quand (par exemple « payer le loyer demain
  à 9h ») ? », jamais un rappel inventé à l'heure qu'il est (#134, #448 : le modèle décidait seul, d'où le retour du raté). La réponse se lit avec
  la question : « payer le loyer demain à 9h » → le rappel daté de la mission 56 ; sans jour (« payer le loyer ») → « Quel jour je te fais penser
  à « payer le loyer » ? », l'heure dite est gardée ; une récurrence part entière au modèle ; « laisse tomber » ou une autre demande suivent leur
  chemin. « comment j'ajoute un contact » (#243) → « Menu ☰ > Mes contacts, puis le bouton vert « + Ajouter » … » (l'import si on parle
  d'importer). « sans Hugo » après « propose un rdv à Hugo et Gaëlle jeudi après-midi » (#493) → Hugo sort de la proposition, Charly relit
  (« D'accord, sans Hugo Besnard : le rendez-vous est maintenant avec Gaëlle Perrin uniquement. ») puis repose la question du type, ou relance la
  recherche des créneaux ; « juste avec Gaëlle », « retire Hugo » aussi ; « pas en visio », « sans lui » gardent leur chemin. « mets-moi à
  l'heure de Londres » (#612) → « Je ne peux pas encore le faire d'ici : Paramètres > Affichage > Fuseau horaire. ». À la réponse de Hugo,
  « non c'est parfait », « je ne dis pas non » sont un accord. Un rappel daté avec une heure (« Rappelle-moi de payer le loyer demain à
  9h », « … d'appeler le taxi demain 9h ») ne tombe plus dans la liste « Pas encore » (les mots « payer », « taxi »). Suite : verif-classement-charly,
  section 18.
- Deuxième passage (examinateur, 27/10, 3 points) : après « Je te fais penser à quoi, et quand ? », une réponse sans verbe (« le loyer demain
  9h », « pour le loyer… », « Hugo demain 9h ») → « Rappel : penser au loyer » / « penser à Hugo » ; un moment seul (« demain à 9h ») → « Je te
  fais penser à quoi, demain à 9h ? », le moment gardé ; « le loyer » seul → « Quel jour je te fais penser au loyer ? » ; « je sais pas » n'est
  pas un objet. Deux Hugo invités : « sans Hugo » → « Lequel : Hugo Besnard ou Hugo Martin ? », rien ne change. « non c'est bon », « non ça
  va » restent un refus (souvent un refus poli) ; seuls « non c'est parfait / super / génial / nickel / impeccable / très bien / ça me va » sont un
  accord. En plus : « où sont mes contacts ? » → Menu ☰ > Mes contacts ; « mets-moi à l'heure de pointe » n'est plus le fuseau.
- Troisième passage (examinateur, 27/10, 1 point) : jamais un rappel « Rappel : penser » au titre vide (sinon la question). Un moment
  remplace le moment gardé (« demain à 9h » puis « vendredi plutôt » → « Je te fais penser à quoi, vendredi à 9h ? » ; « à 10h » → demain à
  10h). Un verbe plus loin dans la phrase est l'objet (« demain je dois appeler Paul » → « Rappel : appeler Paul », demain). Les petits mots de tête
  tombent (« oui demain 9h », « c'est pour demain » → quoi ? ; « bah le loyer demain » → penser au loyer) ; « rdv dentiste mardi 15h » suit son
  chemin. « non, ça me va très bien » est un accord.
- Quatrième passage (examinateur, 27/10, 1 point) : un moment devant l'infinitif, sans modal (« samedi 10h faire les courses », « demain
  matin prendre mes médicaments ») → le rappel composé ; jamais après un article (« le loyer » reste un nom). Sinon, le moment dit en tête reste
  dans la question (« vendredi je vais chez le médecin » → « Je te fais penser à quoi, vendredi ? »).

## 27/10/2026 : mission 62, les ratés du passage 17 (CODEUR)

- #405 « bloque 1h pour le devis de M. Garcia mercredi 16h » : la page lisait « 1h » comme l'heure (tcHeureDansTexte prenait la première).
  Une heure qui suit « bloque », « réserve », « pendant », « prévois »… est une durée quand une autre heure suit (tcEstUneDuree) :
  l'heure est 16h, la durée 1h (tcDureeDemandee, qui fixe aussi la fin du bloc proposé et la vérification de chevauchement).
- Un conflit ne vient que de l'agenda : « à 16h, tu as … le déjeuner de 12h à 13h. Je te propose 15h » est lu comme un conflit annoncé
  (tcAnnonceAutreCreneau, seulement si la demande a une heure) ; et un bloc du modèle qui accompagne un conflit annoncé tombe quand le
  créneau demandé est libre (tcBlocAvecFauxConflit). Dans les deux cas, tcIgnorerFauxConflit vérifie le chevauchement réel : libre → la
  page propose le créneau demandé ; pris → la phrase de conflit de la page, avec le vrai rendez-vous.
- #514 « C'est en visio ou en vrai avec Hugo ? » : tcRepondreModeRdv lit le mode de la demande reçue (messagerie) puis des rendez-vous à
  venir avec la personne (« aucun mode noté, donc en personne ») ; rien trouvé → il le dit. Jamais pour une demande (« propose-lui en
  visio », « passe-le en visio »), un « en vrai » qui veut dire « franchement », « comment ça se passe avec Hugo ? », ni quand la question
  « Par téléphone, en personne ou en visio ? » attend sa réponse.
- Restes de la 61 : « demain la facture » → « penser à la facture » demain ; « à 18h prendre le train » → « Quel jour je te fais penser à
  « prendre le train » … ? » (l'heure gardée) ; « 2 heures avant le match », « la veille du rdv » → la phrase entière au modèle.
- Suites : verif-classement-charly (section 19), verif-charly-conflits (section 3b). Sonde Chrome sur la page : tous les cas bons.
- Premier passage (examinateur, 27/10, 4 points) : une plage (« bloque 14h-16h », « 14h à 16h », « 10h-11h ») ou un choix (« 9h et 14h »,
  « 10h ou 11h ») n'est jamais une durée, ni une heure de plus de 8 h ; la plage compte entière pour le chevauchement et le bloc ; après
  « pendant », « dure », c'est toujours une durée (« pendant 1h30 à 9h »). Un bloc du modèle à l'heure demandée garde sa réponse. Mode :
  un nom complet ne désigne que cette personne (« Hugo Martin »), un nom partagé (« Martin », deux Hugo) → « Lequel : … ? » ; dispo,
  « je peux », lien, « a Teams », une heure citée ne sont pas des questions de mode. Rappel : « le 3 novembre la facture », « le 3 la
  facture » → « Rappel : penser à la facture » le 3 novembre.
- Deuxième passage (examinateur, 27/10, 1 point) : « bloque 1h à 16h », « réserve 1h30 à 9h » (4 h au plus devant une heure plus grande,
  après bloque/réserve/prévois/garde) sont une durée : 16h-17h, 9h-10h30 ; « bloque 2h jusqu'à 18h » → 16h-18h (tcDebutAvantJusqua),
  « jusqu » n'est plus un titre. « bloque 8h à 10h », « 14h à 16h », « 14h-16h » restent des plages.
- Troisième passage (examinateur, 27/10, 1 point) : le seuil passe de 6 h à 4 h, « bloque 6h à 7h demain » et « bloque 5h à 6h » sont des
  créneaux du matin (6h-7h, 5h-6h), « bloque 4h à 18h » reste une durée.

## 27/10/2026 : mission 63, les ratés du passage 18 (CODEUR)

- #176 « n'importe » (après « quand suis-je libre demain ? ») : le modèle répondait « Je bloque donc demain de 9h à 12h » avec un bloc
  « Mon temps libre ». Après une réponse vague (« n'importe », « peu importe », « comme tu veux », « à toi de voir », « choisis »…), le bloc
  du modèle ne part plus en carte : tcSansCarteApresReponseVague le remplace par « Je te propose « Mon temps libre » mardi 28 octobre, de
  9h à 12h. Je l'ajoute à ton agenda ? Réponds « oui » ou « non ». ». Rien n'est créé avant la réponse.
- #321 « La réunion est passée à 15h » : la page relie la phrase au rendez-vous existant (tcChangementAnnonce, puis tcDeplacementLocal) et
  relit : « Tu veux que je décale « Réunion équipe » ? Avant : mardi 3 novembre, 14h à 15h. Après : 15h à 16h. Réponds « oui » ou « non ». »
  (et « À cette heure-là, tu as déjà … » si la nouvelle place est prise). « oui » déplace (avec la question « prévenir ? » s'il y a un
  contact), « non » ne change rien. Formes lues : « est passée / a été décalée / est repoussée / passe à … », « est finalement à 16h ».
  Jamais pour une question, un rendez-vous absent (« le train est passé à 15h »), ni « la réunion est passée » sans heure ni jour.
- Restes de la 62 : « le 1er novembre la facture », « le 1er la facture » → rappel le 1er novembre ; « le 3 novembre payer le loyer » →
  « Rappel : payer le loyer » (plus « penser à payer… ») ; « réserve la salle 14h 16h » → 14h, durée 2 h (plus 14h16 : des minutes ne
  sont jamais suivies de « h »).
- Suite : verif-classement-charly (section 20).
- Premier passage (examinateur, 27/10, 4 points) : « oui mais à 16h », « non plutôt 16h », « oui mais plutôt jeudi » après la relecture
  relisent à la nouvelle place (tcRepondreRelectureDeplacement), rien ne bouge ; « oui mais », une autre demande → le chemin habituel.
  « oui / ok / ouais » en tête et « quand tu veux » sont une acceptation (la carte reste). « passer » au sens de « venir » : jamais pour une
  personne ou ce qui se livre (plombier, ma fille, la livraison, un contact), ni « vers 10h », ni une heure déjà passée aujourd'hui. Un nom
  précis (« la réunion client ») ne vise que ce rendez-vous (tcRdvNommesExactement, liste donnée à tcDeplacementLocal). Et « décale la
  réunion à demain 10h » va à demain (avant : la semaine d'après, règle des jours nommés).
- Deuxième passage (examinateur, 27/10, 2 points) : « d'accord », « ça marche », « parfait », « c'est bon » seuls après la relecture sont
  un oui (déplacé) ; un nom précis introuvable (« la réunion client » quand seule « Réunion équipe » existe) ne vise plus un autre
  rendez-vous : rien ici, le modèle répond.

## 27/10/2026 : mission 64, les ratés du passage 19 (CODEUR)

- #321 « La réunion est passée à 15h » : quand plusieurs rendez-vous à venir portent le même nom (la réunion de chaque mardi), la page
  prend le plus proche qui n'est pas fini (celui du jour s'il est encore à venir), jamais celui de la semaine d'après
  (tcRdvAnnoncePlusProche). Noms différents : toujours « Lequel ? ». Remarque : la batterie ne pose la « Réunion équipe » qu'au mardi
  SUIVANT (prochain(2) commence à demain) ; un mardi à 4h, il n'y a donc pas de réunion du jour dans l'agenda de test.
- #176 « n'importe » juste après « Voici ce qui est libre » : la page propose le premier créneau (« Je te propose « Mon temps libre »
  mercredi 28 octobre, de 9h à 12h. Je l'ajoute à ton agenda ? Réponds « oui » ou « non ». »), sans le modèle ; « oui » ajoute la carte,
  « non » ne change rien. tcGererDemandeCreneau garde les créneaux affichés avec le message (_creneaux). La proposition relue du modèle
  (mission 63) attend aussi son « oui ».
- #49 « déj gaëlle ven 12h30 » : un repas (déjeuner, dîner, café, apéro, brunch, verre…) suivi d'un contact connu, un jour et une heure est
  une création simple proposée par la page : carte « Déjeuner avec Gaëlle » vendredi 12h30. Un rendez-vous déjà prévu avec ce contact :
  la garde habituelle (déplacement possible) décide.
- #96 « décale tout lundi » : la liste du jour et « Vers quand je le(s) décale ? » ; la réponse (« mardi », « mardi 9h ») mène à la
  relecture « Tu veux que je décale ces 2 rendez-vous ? » (avant, après), rien ne bouge avant « oui ». Avec une heure, une partie du jour
  ou une destination : le chemin habituel.
- #140 « Même heure la semaine prochaine » (ou « pareil demain ») sans rendez-vous dans les derniers messages : « Quel rendez-vous veux-tu
  noter à la même heure la semaine prochaine ? », aucune carte.
- #425 « Pause déjeuner tous les jours de 12h à 13h30 » : des blocs [AGENDA] non fermés (ou plusieurs blocs) sont réunis en un seul bloc
  fermé juste après le modèle (tcFermerBlocsAgenda) ; une dernière ligne coupée tombe. Sans ligne complète, le texte seul, et le filet
  « j'ajoute sans bloc » fabrique la carte depuis la demande.
- Suite : verif-classement-charly (section 21).
- Premier passage (examinateur, 27/10, 4 points) : la proposition après « n'importe » ne vaut que pour le message qui la suit (lue et
  vidée en tête de charlySendMessage : « peu importe », « la réunion est passée à 15h », « oui » décale la réunion, n'ajoute plus le
  créneau) ; sa réponse suit la logique de la relecture 63 (« d'accord », « ok », « oui stp » ajoutent ; « oui mais l'après-midi », « oui
  et préviens Paul » suivent le chemin habituel ; « non merci » : rien) ; « pareil », « la même » ne sont jamais pris quand Charly vient de
  poser une question ou qu'une réponse est attendue, ni après « vendredi midi » ; « café Martin » avec deux Martin : rien de la page.
  Aussi : une journée libre est proposée sur trois heures (9h-12h) ; les blocs à catégorie accentuée (« santé ») restent lus, une fin
  coupée « temps_li » tombe, « Pas de [AGENDA] ici » ne change pas.

## 27/10/2026 — Mission 65 (chef, ratés du passage 20)

- « Le client de 14h m'a posé un lapin » (#434) : une heure citée filtre toujours les rendez-vous proposés. Rien à 14h aujourd'hui (ou le
  jour cité) : « Je ne vois pas de rendez-vous à 14h aujourd'hui. De quel rendez-vous parles-tu ? », rien n'attend ; un seul : le retrait
  avec oui/non ; plusieurs : « Lequel ? » entre eux seulement. L'aide figée du modèle remplacée par « Lequel ? » suit la même règle.
- « super, non merci », « ok non merci », « parfait non » : un refus, jamais un oui (proposition après « n'importe », relecture d'un
  déplacement, oui/non tapé).
- « Demande à Hugo quand il est dispo » (#463) : Hugo a TimeCool, la page cherche vos créneaux communs (« Hugo a TimeCool : je regarde
  vos créneaux communs, sans lui écrire. ») ; un contact sans TimeCool garde le message relu.
- « je suis triste » (#223) : « … mais je suis là. Si tu veux alléger ta journée, je peux décaler ou annuler un rendez-vous. »
- Suite : verif-classement-charly, section 22.
- Examen, 1er passage (3 points) : « le client de 14h » ne prend jamais une question, une négation (« ne m'a pas posé un lapin »), une
  autre heure (« avant 14h », « mais à 15h »), deux heures (« de 14h et 16h »), une 2e demande (« …, mets le dentiste à la place »),
  « hier », ni un rendez-vous ou contact nommé ; « de 14h » veut dire 14h00 ; une durée (« le rdv d'1h ») ou la nuit (« de 2h ») ne
  sont pas une heure. L'aide figée : un rendez-vous ou un contact nommé l'emporte (« avec Sophie, je suis pris à 14h » → Sophie), une
  période non lue (« la semaine prochaine à 14h ») garde la liste d'avant. « Demande à Hugo quand il est dispo en visio » est pris aussi.

## 02/11/2026 — Mission 66 (chef, validée par Charles) : Charly retrouve un contact

- « retrouve Hugo », « cherche-moi Gaëlle », « trouve-moi Paul », « est-ce que j'ai Hugo dans mes contacts ? », « Hugo est dans mes contacts ? »,
  « qui est Hugo ? » : une petite carte dans le chat (nom, téléphone, email, catégories, champs absents non affichés) et un bouton « Ouvrir la
  fiche » (la page Contacts, cherchée sur ce nom, la carte amenée à l'écran). Plusieurs fiches : une carte par fiche, 5 au plus, puis
  « Lequel ? » (numéro, « le deuxième » ou nom). « ma mère » : le lien de famille de la mission 59.
- Aucune fiche : « Je ne trouve pas « X » dans tes contacts. Tu veux l'ajouter ? », bouton « Ajouter X » vers le formulaire pré-rempli ; « oui »
  tapé vaut le bouton. Seulement si la phrase parle bien d'un contact (« dans mes contacts », réponse au bouton, « retrouve Hugo » avec une
  majuscule) ; sinon le chemin habituel : « retrouve macron », « qui est Macron ? », « trouve-moi un restaurant », « qui est le président ? ».
- Bouton « 👤 Retrouver un contact » au bout de la 2e ligne : « De qui veux-tu la fiche ? Dis-moi son nom. » Présentation : « retrouver la fiche
  d'un contact ». Les attentes vivent sur le message de Charly : elles ne valent que pour le message suivant.
- Suites : verif-classement-charly section 23, verif-boutons-charly, verif-presentation-charly. Batterie :
  TimeCool-Testeurs/charly-16-phrases-fiche-contact-02-11-2026.json.
- Examen, 1er passage (7 points) et décision du chef : `tcDesignationSansPetitMot` ne coupe plus « Marie » en « rie » ; un mot en trop (« j'ai bien Hugo », « retrouve Hugo vite ») ne fait plus dire qu'une fiche n'existe pas ; le carnet est lu d'abord (« le docteur Martin », « Banque Populaire ») ; plus d'ajout pour une quantité, un pluriel, une phrase au passé, ni pour un simple « cherche X » ou « trouve X » sans fiche (« Ajouter X » : « retrouve X », « qui est X ? », « la fiche de X », « dans mes contacts », réponse au bouton) ; au bouton, renoncer ou donner un email ou un numéro ; « ajoute-la » vaut oui ; « Lequel ? » suit le numéro de l'écran. Aussi : « je cherche Hugo », « la fiche de Hugo ».
- Examen, 2e passage (4 points) : plus de repli sur un seul mot (« Marie Dupont » n'est jamais présentée comme Marie Martin : le simple « Je ne trouve pas ») ; « mon ami Hugo », « mon collègue Hugo » cherchent Hugo ; « la fiche de paie » suit le chemin habituel, « la fiche de X » sans fiche demande une majuscule ; « Tu veux l'ajouter ? » n'accepte qu'une réponse courte (« ajoute la réunion demain à 10h » garde son chemin).
- Règle finale du chef (02/11) : le bouton « Ajouter X » seulement avec un mot de contact (contacts, fiche, ami, collègue, client, patient, mon, ma) ou en réponse au bouton de raccourci ; « retrouve Paris » : « Je ne trouve pas « Paris » dans tes contacts. », sans bouton ; « qui est X ? », « cherche X », « trouve X » sans fiche : le chemin habituel. Prénom et nom doivent correspondre ensemble ; une seule fiche proche : « J'ai : Marie Martin. C'est cette personne ? ». « fiche de paie », « fiche de poste » : jamais une recherche de contact.
- Examen, 3e passage (2 points) : « c'est elle », « c'est lui », « c'est bien elle » valent oui à « C'est cette personne ? » ; « le patient suivant », « mon dernier client », « ma fiche » ne sont pas des noms.
- Décision du chef (02/11) : après « mon / ma », le bouton « Ajouter X » seulement pour une relation ou un métier (« mon patron », « mon plombier ») ; « cherche mon chat », « ma carte bleue » : « Je ne trouve pas … dans tes contacts. », sans bouton.

## 02/11/2026 - Missions 67 et 68 (CODEUR)

- Mission 67 (commit 67d087a) : sous « Charly IA », le sous-titre devient « 🔒 Votre Assistant Intelligent », 18 occurrences de index.html (texte de départ et remises en place après une action). Une ligne de 320 à 500 px. Les autres « assistant intelligent » (accueil, consignes, aide) ne sont pas le sous-titre et restent.
- Mission 68 : verif-journal-periode était rouge depuis le 1er novembre (dates d'octobre en dur). Horloge figée retirée (d2cb60c) : les dates de la liste sont relatives à l'horloge ; le calcul de début de période est vérifié sur des jours donnés, dont un cas à cheval sur l'année. Aucun changement d'écran. Essayée à 9 dates (fins de mois, 1er janvier, 29 février).

## 02/11/2026 - Mission 69 (CODEUR) : retrouver un contact, le nom placé n'importe où

- Cas de Charles : « La Banane Dr Sellam tu peux me retrouver dans mes contacts en fait ce contact là » partait au modèle, qui demandait « rendez-vous ou vérifier ? ». Nouvelle détection juste après celle de la mission 66 : verbe de recherche + mot de contact, où qu'ils soient. Ce qui reste sans les mots-outils est le nom ; un titre (Dr, Mme…) ouvre le nom et ce qui le précède est ignoré.
- Une fiche : la carte. Plusieurs : la liste. Aucune : « Je n'ai trouvé personne qui s'appelle X dans tes contacts. » et le bouton « 👤 Retrouver un contact ».
- Décision : le dernier mot seul ne remplace pas la personne cherchée (règle de la mission 66) : « J'ai : … C'est cette personne ? », sans titre. Avec un titre, « Dr Sellam » est cherché tel quel.
- Rendez-vous, créneau, action sur un contact, liste de contacts, fiche de paie / poste / présence : le chemin habituel. Les contacts n'ont pas de champ société : la recherche porte sur le nom.
- Suite verif-fiche-libre, 14 phrases TESTEURS (charly-14-phrases-fiche-libre-02-11-2026.json).
- Examen de la mission 69 (5 défauts) : détection refaite. Le nom se reconnaît à sa place (avant le verbe et séparé de lui, juste avant « dans mes contacts », après « la fiche de », « qui s'appelle », un titre), jamais à ce qui reste dans la phrase. Mot de contact : contact, contacts, fiche ; « client », « ami », « mon plombier » seulement si la phrase reprend la personne (« Hugo mon client tu peux me le retrouver »). Négation : le chemin habituel. Noms à tiret, particules, deux noms ; le contact qui porte le titre demandé passe devant.
- Examen 2 de la mission 69 (4 défauts) : un nom sans titre placé avant le verbe doit être repris par la phrase (le, la, l', sa fiche, ce contact, « me » avec « dans mes contacts ») ; le nom complet d'un contact gagne sur toute autre lecture ; la négation écarte seulement l'ordre de ne pas chercher ; un mot peu sûr après « contact » ou « dans mes contacts » ne produit jamais « personne qui s'appelle X ».
- Examen 3 de la mission 69 : « mon ami Hugo » après le verbe, un mot après un article ou un démonstratif n'est pas un nom (« Cette dame »), « je n'ai pas trouvé Hugo dans mes contacts » est une recherche. Ancien défaut de la mission 66 corrigé : « retrouve-le dans mes contacts » ne cherche plus quelqu'un qui s'appelle « Le ».
- Examen 4 de la mission 69 : après un article, le carnet décide (« Le Gall » s'il le connaît, « Le comptable » sinon) ; « j'ai pas retrouvé Hugo dans mes contacts » ne prend plus le verbe pour le nom.

## 02/11/2026 — Mission 70 : les comptes de test ne s'accumulent plus

- `compteEffacer()` (API) : une seule logique d'effacement pour le « Supprimer » administrateur et les comptes de test ; elle nettoie aussi `commentaires`, `rappels_envoyes`, `rapports_techniques`, `verifications`, qui n'ont pas de clé étrangère et restaient en base.
- Route `POST /compte/effacer-test` : un compte @exemple-timecool.fr s'efface lui-même avec sa session, aucun autre compte. À déployer avant de relancer `verifier.sh` contre l'API en ligne.
- `scripts/verifications/comptes-jetables.js`, chargé en tête des 18 suites qui s'inscrivent : retient les comptes créés et les efface en fin de passage (fin normale, process.exit, exception, promesse rejetée, signal). Ce qui reste est signalé à la fin de `verifier.sh`.
- `scripts/purger-comptes-test.sh --compter | --effacer | --fichiers LISTE` : sauvegarde vérifiée, effacement par paquets, vrais comptes comptés avant et après. Les fichiers joints de production sont protégés : `--fichiers` se lance en root.
- Vérifié contre l'API locale (même base) : 26 185 comptes de test avant et après un passage complet, purge essayée sur 3 comptes.
- Examen 1 de la mission 70 : `scripts/comptes-test-a-garder.txt` (9 comptes fixes de TESTEURS) exclu de tous les comptages et effacements de la purge ; liste vide ou adresse hors domaine : refus. Après un arrêt sur erreur, le message donne la commande `--fichiers`, et la liste ne contient que les comptes vraiment effacés. Essai réel sur la base : commentaires, rappels, rapports et vérifications effacés par la purge et par la route, le compte gardé reste intact.

## 02/11/2026 : mission 71, les clés restent sur le serveur

- Constat du chef : `GET /cles-api/valeur` donnait à tout compte connecté la valeur des clés de l'administrateur. Constat en plus : `clesDuModele` recopiait ces clés dans chaque compte neuf, comme clés propres (17 comptes), et les applications les renvoyaient au serveur (`tcPousserClesVersServeur`).
- Relais : `POST /relais/anthropic`, `/relais/openai`, `/relais/google/suggestions|lieux|itineraire|recherche|traduction`, `POST /relais/tester` (bouton Tester, la clé saisie n'est pas enregistrée). Clé du compte, sinon celle de l'administrateur, relue en base à chaque appel. Réponse du service telle quelle. L'application n'utilise pas le streaming : le relais attend la réponse entière. Délai 55 s pour Charly, 15 s pour Google, 504 avec une phrase si le service se tait.
- `GET /cles-api/valeur` ne rend que la clé propre du compte, ou `herite: true` sans valeur. `POST /cles-api` n'enregistre pas une clé identique à celle de l'administrateur. Compte bloqué ou clôturé : 403.
- Compteurs : table `relais_compteurs` (017_relais.sql), limites par groupe dans `RELAIS_LIMITES` (Charly 30 par minute, 500 par jour), fois 20 pour @exemple-timecool.fr, 429 au-delà, trace dans le journal du serveur, cumul sur `GET /admin/relais`. Pas d'écran pour l'instant.
- Page : plus aucun appel direct, `tcRelais` à côté de `tcAppel`, `tcCharlyPret` et `tcGooglePret` remplacent les tests de clé, les clés héritées restées sur l'appareil s'effacent à la lecture de la liste. La traduction part par lots de 100 : une requête par texte aurait occupé les 10 processus du serveur.
- `scripts/cles-heritees.php --compter|--effacer` : à lancer avec la configuration de production dès l'API déployée. Retire une clé égale à celle de l'administrateur ou partagée par plusieurs comptes ; sauvegarde les lignes, toujours chiffrées, avant.
- Glissé : `purger-comptes-test.sh` lit une dernière ligne sans retour et sauvegarde la nouvelle table.
- Suites : `verif-relais` (statique et page), `verif-relais-e2e` (en local, faux service sur le port 8097 ; en production, vraie traduction et vraie recherche pour un compte neuf). Le chemin de la clé de l'administrateur n'est vérifiable qu'en production : le coffre local ne lit pas les vraies clés.
- Examen de la mission 71 : apostrophes rétablies dans les refus du serveur ; un lot de traduction s arrête aussi à 20 000 caractères.
- Demande du chef, mission 71 : liste de modèles côté serveur (ceux de Configuration IA, 400 sinon). Taille par groupe : Charly 200 Ko (125 Ko mesurés au plus, aucune photo ne part), traduction 64 Ko, lieux et itinéraire 8 Ko, recherche 2 Ko.
- verif-relais-e2e en production : phrase de traduction sans ambiguïté ; un 403 de Google qui cite Custom Search devient un avertissement, avec le message réel de Google.

## 03/11/2026 : Mission 72, Charly appelle l'utilisateur par son prénom

Chef, 03/11 (ok de Charles) : Charly connaît le prénom du compte et l'emploie là où un humain le ferait.
- `tcPrenomUtilisateur()` : le prénom, chaque mot avec une majuscule et le reste en minuscules (« CHARLES » → « Charles », « jean-pierre » → « Jean-Pierre », décision du chef après l'examen) ; le champ du compte ne change pas. Rien si le champ est vide, si le prénom est le nom, une adresse e-mail, des chiffres ou des signes.
- `tcConsignePrenom()` s'ajoute au prompt aux trois appels du modèle (pas dans le prompt modifiable des réglages) : bonjour, « C'est noté », « Bonne journée », jamais à chaque phrase, jamais dans un titre, un bloc [AGENDA] ou un message pour une autre personne. Sans prénom, aucune consigne : Charly parle comme avant.
- Phrases fixes : accueil à la connexion (il prenait le champ brut, « REPUBLIQUE » compris), premier bonjour, bonjour suivant (« Bonjour Charles ! Qu'est-ce que je peux faire pour toi ? »), au revoir (« À bientôt, Charles ! »). Le merci ne change pas. Le classement ne bouge pas.
- Suites : nouvelle `verif-prenom-charly` (25 comptes, la consigne, la page) ; `verif-classement-charly` rejoue bonjour, au revoir et merci avec et sans prénom.

## 03/11/2026 : Mission 74, trois textes validés par Charles

Chef, 03/11 (ok de Charles), publiés avant la 73 (la 73a attend, mise de côté par git stash).
- « Mes disponibilités » : le cadre gris en tête dit la même chose quelle que soit la case (confidentialité, qui prend rendez-vous et comment, et Charly). Décision du chef : « rien n'entre dans ton agenda avant ta validation » au lieu de « sans ton accord » (vocabulaire calme, garde-fou verif-vocabulaire-formulaire).
- Charly, son nom ou qui il est : réponse fixe « Je m'appelle Charly, ton assistant TimeCool 😊 Je suis là pour optimiser ton temps. »
- Ce qu'il sait faire, comment il aide ou optimise le temps : réponse fixe, le texte de Charles. Décision du chef : la puce de la photo devient « Un PDF ou un fichier texte… » (la lecture d'une photo n'existe pas encore ; elle reviendra avec sa mission). « C'est quoi TimeCool » reçoit ce texte.
- Réponses fixes de la page (liste _faq), sans appel au modèle ; le classement laisse passer les nouvelles formulations (TC_CLASSE_SUJETS). L'exemple du prompt (CAS 3) reprend la présentation et rappelle que les photos ne sont pas lues.
- Suites : verif-presentation-charly réécrite ; adaptées : banc-charly, verif-dispo, verif-contacts-classes, verif-validation-rdv, verif-classement-charly (la présentation ne cite plus la fiche d'un contact : texte de Charles).

## 03/11/2026 : Mission 73a, « Ma confiance en Charly » (réglage caché) et le profil 1

Chef, 03/11 (ok de Charles) : trois profils d'autonomie pour les actions de Charly qui touchent d'autres personnes ; un seul « publié » à la fin (73a, 73b, 73c). Décisions du chef : le rendez-vous d'origine reste en place, marqué « en cours de décalage », jusqu'au choix du contact ; « aucun ne me va » ou pas de réponse sous 24 h, Charly le dit et propose la suite ; les contacts sans TimeCool gardent leur bouton « Envoyer à … » (l'application n'envoie pas seule un SMS ou un e-mail) ; un seul accord pour le lot, plus de fenêtre de confirmation par contact.
- Réglage : bloc « 🤝 Ma confiance en Charly » en tête des Paramètres, textes validés, profil 1 au départ, clé de compte `tc_confiance_charly` (synchronisée). Caché par `TC_CONFIANCE_VISIBLE = false` jusqu'à la 73c.
- Serveur (migration 018, jouée par le chef) : `rdv.origine`, `remplace_uid`, `expire_le`, `traite_le`. Routes `POST /rdv/proposition/creer` (carte à boutons dans la messagerie d'un contact TimeCool, sinon lien de créneaux 72 h), `POST /rdv/proposition/choisir` (le contact, une seule réponse, créneau encore libre sinon 409), `GET /rdv/propositions` (choisi, refusé, sans réponse après 24 h), `POST /rdv/proposition/traiter`. Le lien public d'une proposition de Charly n'écrit plus dans l'agenda : le choix attend. Le rendez-vous qu'on décale ne gêne pas son propre nouveau créneau (`rdvOccupation` peut l'ignorer).
- Page : un rendez-vous avec un contact ne se déplace plus d'office. Charly propose le créneau prévu et deux autres libres (8h-19h, deux heures d'écart, 14 jours, jamais deux fois le même dans un lot), montre le message, demande un accord pour tout le lot (« déjà vu » : déplacé sans prévenir ; « non » : rien ne part). « Décale tout lundi », « déplace le dentiste… » et malade « Tu les préviens » + décaler passent par là ; le récapitulatif du questionnaire montre le message (retard et annulation compris). Les réponses reviennent par une sonde de 30 s (seulement si une proposition attend) : « Paul a choisi … Je le place ? », une à la fois. Pastille ⏳ (semaine, jour « en cours de décalage », fiche).
- Retard et annulation : pas de créneau à proposer ; seul change le message montré avant l'accord. Rendez-vous à plusieurs et nouveau rendez-vous avec un contact : inchangés (signalé au chef).
- Suites : nouvelles `verif-confiance-charly` (45) et `verif-propositions-e2e` (30, deux comptes, API locale) ; adaptées : verif-charly-deplacement, verif-deplacer-periode, verif-classement-charly, verif-questionnaire-malade, verif-imprevu, verif-onglets-charly, verif-campagne1, verif-type-rdv, verif-fiche-lieu-avec, verif-deplacer-au-doigt, verif-bloc-demi-case.

## 03/11/2026 : Mission 73a, après l’examen (3 défauts, décision du chef)

- Défaut 1 : « ajoute un autre rdv… », « garde-moi une place… », « rien de spécial, merci » étaient pris pour une réponse à « je propose d’autres moments ? ». Seul le message entier, court, répond désormais (TC_PROPOSITION_REPONSE_PLACER / NON / LAISSER / AUTRES) ; « non » vaut « je le laisse ». Une autre demande est traitée normalement, puis Charly repose sa question (jamais par-dessus une autre question qui attend ; « oui » va à la question la plus récente).
- Défaut 2 (décision du chef) : rien n’est « confirmé » au contact tant que l’utilisateur n’a pas validé. Lien et carte : « Merci, ton choix est bien noté : … [Prénom] doit encore le confirmer : tu recevras un message dès que c’est fait. En attendant, le rendez-vous du … reste en place. » Placé : « Rendez-vous déplacé : … ». Laissé : « Finalement, le rendez-vous du … reste en place. » Contact TimeCool : le serveur l’écrit dans sa messagerie ; contact au lien : le message est prêt, bouton « Envoyer à … », et la page du lien rouverte dit où en est la réponse.
- Défaut 3 : /rdv/proposition/traiter prend une décision (place, laisse, autres, ferme), ferme le lien pas encore utilisé et marque la carte du contact ; un choix tardif reçoit « Cette proposition n’est plus valable » (410 plus_valable).
- Remarque de l’examen : le chevauchement est dit dans la question, avant l’accord.
- Migration 019 (rdv.avant, le libellé du rendez-vous qu’on décale), jouée par le chef. Suites : verif-confiance-charly 63, verif-propositions-e2e 48.

## 03/11/2026 : Mission 73b, profil 2 « Charly réalise toutes les étapes et attend ma validation pour la dernière »

Chef, 03/11 (ok de Charles). Le bloc reste caché (TC_CONFIANCE_VISIBLE = false) jusqu’à la 73c ; un seul « publié » à la fin.
- Décaler un rendez-vous avec un contact : plus de « Je l’envoie ? » ; Charly envoie seul (messagerie TimeCool tout de suite, bouton « Envoyer à … » pour un contact au lien : l’application n’envoie pas seule un SMS ou un e-mail), les rendez-vous sans contact se déplacent, le bilan le dit.
- Les réponses : un créneau choisi, « Paul a choisi …, je le place ? » ; plusieurs arrivées, un seul accord pour le lot (« Je les place dans ton agenda ? », « Oui, place-les » / « Non, je les laisse où ils sont »), chevauchements dits dans la question. Rien n’est écrit dans l’agenda sans ce oui.
- « Aucun ne me va » ou pas de réponse sous 24 h : Charly propose seul d’autres moments, une fois (GET /rdv/propositions rend « tours ») ; la seconde fois, il demande, comme au profil 1. Décision prise seul, signalée au chef.
- Le questionnaire « je suis malade » garde son récapitulatif « Oui, vas-y » : il valide aussi des écritures dans l’agenda (déplacer, supprimer), la dernière étape du profil 2.
- Page du lien (contact sans TimeCool, décision du chef) : « [Prénom] doit encore le confirmer. Reviens sur cette page pour voir sa réponse. » ; la page reste lisible après la décision : déplacé, en place, ou « Ces créneaux ne sont plus proposés : [Prénom] a choisi de t’en proposer d’autres. ». La carte TimeCool garde « tu recevras un message » (le message part tout seul).
- À savoir (examen de la 73a, non bloquant) : /rdv/lien/choix verrouille rdv_liens puis rdv, /rdv/proposition/traiter l’inverse ; deux requêtes au même instant peuvent finir en interblocage MySQL (500, le contact réessaie, rien de perdu). Repris après la 73c si ça se reproduit.
- Suites : verif-confiance-charly 73 (section 7, profil 2), verif-propositions-e2e 50 (« tours », l’ancien lien dit « d’autres moments ») ; verif-charly-deplacement, verif-classement-charly, verif-deplacer-periode chargent tcConfianceCharly (profil 1 : « Je l’envoie ? » inchangé).

## 03/11/2026 : Mission 73c, profil 3 et compte rendu ; « Ma confiance en Charly » s’ouvre

Chef, 03/11 (ok de Charles). Les trois profils marchent : TC_CONFIANCE_VISIBLE = true, le bloc est en tête des Paramètres.
- Profil 3 : un créneau choisi s’écrit dans l’agenda dès la réponse ; un refus ou un silence, Charly repropose (une fois), puis laisse le rendez-vous à sa place ; chaque contact apprend la suite. Une carte courte par lot dans la conversation Charly : « 📋 Compte rendu de Charly » (déplacé, reproposé, laissé, ce qui attend encore, les chevauchements, « remets-les »), avec les boutons « Envoyer à … » des contacts au lien.
- Deux contacts sur le même créneau (décision du chef) : le premier garde le créneau. Le second reçoit 409 « Ce créneau vient d’être pris » ; le créneau est marqué « pris » (rdv_creneaux.retenu = 2, sans migration) et n’est plus proposé, ni sur son lien ni sur sa carte ; s’il n’en reste aucun, la réponse vaut « aucun ne va » (tous_pris). GET /rdv/propositions rend « pris » (le créneau et qui l’a pris) : « Marie a choisi … (Paul avait déjà pris mardi 10h) », « Paul a pris mardi 10h : je repropose à Marie d’autres moments ».
- Chevauchements d’un lot (examen de 2b1a00a) : les nouveaux créneaux du lot sont comparés entre eux et dits dans la question ; l’ancienne place d’un rendez-vous du lot ne compte plus. « tours » ne compte que la série en cours (un rendez-vous placé ou laissé la termine).
- Messages (retard, annulation, réponse à une demande) : profil 3, ils partent sans « J’envoie ? » ; profil 2 aussi, sauf quand l’envoi écrit dans l’agenda (supprimer, inscrire, déplacer : dernière étape). Charly cite le texte envoyé. Le questionnaire (« je suis malade »…) saute « Oui, vas-y » au profil 3, ses questions de cadrage restent.
- Inchangé : rendez-vous à plusieurs, nouveau rendez-vous avec un contact, l’agenda du contact.
- Suites : verif-confiance-charly 90 (sections 8 et 9), verif-propositions-e2e 62 (même créneau, tous pris) ; verif-campagne1 suit l’erreur HTTP qui porte le code de l’API.

## 03/11/2026 : Mission 73c, après l’examen (connexion manquée, « remets-les »)

- Défaut de l’examen, décision du chef : quand la connexion manque au moment de clore une proposition (traiter), le contact n’était jamais prévenu et personne ne le voyait. Désormais la proposition attend d’être close (_tcAClore, clé de compte tc_propositions_a_clore) ; elle n’est jamais retraitée ni redéplacée. Charly réessaie seul à chaque passage de la sonde (5 fois), puis à la prochaine ouverture ; tant que ce n’est pas parti, il le dit : « Je n’ai pas pu prévenir Léa, je réessaie. » (compte rendu au profil 3, message aux profils 1 et 2), puis « La connexion est revenue : je préviens Léa. », ou « je réessaierai à la prochaine ouverture de TimeCool ».
- « Remets-les » après des créneaux placés par Charly (décision du chef) : chaque contact déjà prévenu lit « Finalement, le rendez-vous du … est maintenu. » (route POST /rdv/proposition/maintenir : messagerie TimeCool, ou message prêt pour un contact au lien, dont la page dit « en place »). Une proposition pas encore close n’a rien dit au contact : pas de « maintenu », elle se ferme en « laissé » (il lit que le rendez-vous reste en place, la réponse à son choix ; signalé au chef).
- Suites : verif-confiance-charly 100 (section 10), verif-propositions-e2e 67 (maintenir).

## 03/11/2026 : Mission 73d, après la batterie et la campagne TESTEURS « décaler 10 rendez-vous »

Chef, 03/11 (batterie passage 27 : 696/700 ; campagne m73 dans les 3 profils). Un seul correctif avant Android.
- #431 n’était pas un recul de la 73 : à 11h54, « mardi 10h » était passé, la carte avait déjà glissé au mercredi 10h ; « Mme Martin veut décaler à mercredi même heure » ne changeait rien et tombait sur « J’ai laissé tomber la proposition précédente ». Désormais : « D’accord : la proposition est bien mercredi 4 novembre à 10h. Tu la valides ? », la carte attend.
- Créneaux reproposés (refus, silence, créneau pris) : jamais avant le premier jour possible du lot (le lendemain du jour malade ou de l’imprévu, gardé dans ev.lotDecalage.apres), même si des rendez-vous déplacés y ont libéré de la place ; jamais la place actuelle du rendez-vous (tcCreneauxReproposes, profils 1, 2 et 3).
- Profil 2 : le questionnaire saute « Oui, vas-y » quand Charly propose des créneaux aux contacts (décaler + « Tu les préviens ») ; la question vient à la fin, avant d’écrire. Il la garde pour supprimer et quand l’utilisateur prévient lui-même (décision seule, signalée au chef).
- Bilan d’envoi par profil : au profil 3, « Quand elle arrive, je place le créneau choisi dans ton agenda et je te fais un compte rendu. ».
- Marche arrière du lot : chaque « Oui, place-le » écrasait la précédente. Désormais un lot (ev.lotDecalage.id) garde une seule marche arrière : chaque rendez-vous garde sa place d’avant (les rendez-vous sans contact déplacés d’office compris), « remets-les » remet tout le lot et chaque contact déjà prévenu lit « maintenu » (tcDeplacerDansLeLot). Un autre déplacement entre-temps repart de zéro.
- Noms : les réponses prennent le nom de la fiche contact (« Gaëlle Perrin », « Jules Fictif »), pas celui du compte ni le prénom du lien, aussi dans « … avait déjà pris » (tcNomsDeFiche, seulement si c’est la même personne).
- Suites : verif-confiance-charly 113 (section 11), verif-classement-charly (#431).

## 03/11/2026 : Mission 75, la page Paramètres dans l'ordre voulu, une seule ligne « Langue »

Charles, 03/11 (par le chef) : page seule. De haut en bas : Ma confiance en Charly, Messages d'annulation & retards, Message d'absence, Notifications, Affichage, Langue & Région, Sauvegarde & Restauration, Compte & sécurité, Application, Confidentialité & Sécurité, À propos, la citation, Se déconnecter.
- Les cartes sont déplacées telles quelles (diff vérifié : mêmes lignes, autre ordre). Aucun réglage ni aucune clé ne change.
- La ligne « Langue » d'Affichage (openSettingsModal('language')) et « Langue de l'application » de Langue & Région (openLanguageSelector) commandaient le même réglage : toutes deux appellent selectLanguageFromSettings, clé timecool_language. La première est retirée ; la branche 'language' d'openSettingsModal reste dans le code, plus appelée.
- tcAppliquerLangueRecue (langue reçue du compte) ne mettait à jour que l'étiquette retirée : elle appelle aussi initLanguageDisplay, qui met à jour la ligne qui reste.
- La carte Notifications finissait par un </div> en trop (ignoré par le navigateur) : retiré.
- Sonde Chrome (compte Ines, écritures bloquées) à 390 px et 1280 px : ordre des 11 cartes exact, une seule ligne « Langue », fenêtre de langue qui s'ouvre, rien qui déborde, aucune erreur JS.
- Suites : verif-parametres-ordre (nouvelle, 8, échoue sur la page d'avant), verif-confiance-charly (le bloc est suivi de Messages d'annulation).

## 03/11/2026 : Mission 76, un titre de rendez-vous lisible dans sa case

Charles, 03/11 (par le chef, prioritaire) : « tu peux me noter un rendez-vous vendredi 11h chez ma maman… » donnait « Rendez-vous maman » ; dans la vue Semaine du téléphone, la case affichait « Rendez-vous … », Charles a cru le rendez-vous absent.
- Cause : l'exemple de format donné au modèle était lui-même « Rendez-vous banque » (et « Rendez-vous médecin / dentiste » dans le prompt). Les exemples disent maintenant « Banque », « Médecin », « Dentiste », et la règle est écrite : jamais « Rendez-vous », « RDV » ni « Rendez-vous chez » devant le titre.
- Filet (tcTitreEssentiel, tcTitresEssentielsDuBloc) sur toute réponse de Charly avec un bloc [AGENDA] (conversation et fichier analysé) : « Rendez-vous chez ma maman » → « Maman », « RDV dentiste » → « Dentiste », première lettre en majuscule ; la prose qui cite l'ancien titre entre guillemets ou en gras cite le nouveau. Tel quel si rien ne reste après ces mots, ou si l'utilisateur l'a dicté mot pour mot (guillemets, « intitulé », « appelle-le »). Les agendas existants ne changent pas.
- Cases (tcAjusterTitresCases) : vues Semaine et Jour, le titre passe sur autant de lignes que la case le permet ; s'il ne tient toujours pas, il est coupé au milieu, le dernier mot reste (« Coup…Martin ») ; pastille du Mois, une ligne, l'heure se raccourcit (« 11h ») puis s'efface pour laisser le titre. Mesure au canevas, une lecture des tailles puis les écritures : pas de mise en page par essai.
- Sonde Chrome (compte Ines, écritures bloquées, le relais du modèle passe) : la phrase de Charles → carte « Maman » ; à 390 px et 1280 px, Jour / Semaine / Mois : le dernier mot visible partout sauf une pastille du mois à 390 px où même « …Dupont » ne tient pas (coupé par le navigateur) ; rien qui déborde ; aucune erreur JS.
- Suites : verif-titres-case (nouvelle, 17) ; verif-categories-titre, verif-charly-dates, verif-campagne1, verif-type-rdv suivent les nouveaux exemples et le <span class="tc-titre-case">.
- Après l'examen (1 défaut) : un dernier mot plus large que la colonne (« Séance kinésithérapie », Semaine à 390 px) donnait « … » seul. Ce mot est maintenant coupé lui-même au milieu (« kin…pie », « kinés…rapie » sur deux lignes), deux lettres au moins, jamais « … » seul ; sur plusieurs lignes, aucun mot plus large que la case ne compte comme tenant (tcTientDansCase). verif-titres-case : 21.

## 03/11/2026 : Retouche 76b, titres dictés et cases du Mois (TESTEURS, passage 29)

- Titre dicté : « appelle-le "Point mensuel équipe" lundi 10h » donnait « Appelle-le Point mensuel équipe ». tcTitreEssentiel garde les mots dictés entre guillemets après « appelle-le », « intitule-le », « nomme-le », « titre : », sans le verbe ; un titre « Appelle-le … » ou « Titre : … » perd ce début. La règle est dite au modèle (ligne TITRE). « Appelle le plombier » reste une tâche.
- Semaine à 390 px : « Dentiste » (39,5 px) manquait de 2 px dans la colonne (37 px) et sortait « Dent…ste ». Un titre qui manque de peu se resserre (espacement des lettres -0,25 puis -0,5 px) au lieu d'être coupé.
- Un dernier mot plus large que la case, sur plusieurs lignes : le début reste entier, puis ce mot coupé (« Séance / kin…ie » dans un bloc d'1 h ; « kiné…pie » demandé ne tient pas à 10 px).
- Mois : la pastille garde le début du titre (tcCouperALaFin : « Anniv… », « Point… », « Séanc… ») ; nulle part une case ne commence par « … » (le début garde deux lettres au moins, sinon coupe à la fin).
- « Maman » : la question « Qui est ta maman ? » (« Noter sans contact ») n'est posée que si un contact porte ce mot ; sinon la carte « Valider mon agenda » tout de suite. Vaut pour les proches (tcEstUnProche : maman, papa, frère, sœur, mari, femme…) ; « mon dentiste » et les noms gardent la question.
- Après l'examen (bon, 1 remarque) : le titre dicté exige le pronom accroché (« appelle-le », « nomme-la ») ; « appelle "Maman" mardi 10h » garde « Appeler Maman ».
- verif-titres-case : 28 (titres dictés, deux lignes, Mois, jamais « … » en tête, proches). Sonde Chrome 390 px et web : Dentiste, Banque, Maman entiers ; carte Charly « Point mensuel équipe » ; « Maman » sans question de contact.

## 03/11/2026 : Mission 77, la demande du moment prime sur le profil, pour cette demande seulement

- Règle d'or (Charles, par le chef) : profil 2 ou 3 + « … et attends ma validation » (« demande-moi avant », « vérifie avec moi », « ne fais rien sans … ») : cette demande comme au profil 1, et Charly le dit : « D’accord, pour celle-ci j’attends ton accord. » Profil 1 ou 2 + « fais-le directement » (« sans me demander », « tout seul », « gère tout seul », « pas besoin de me demander ») : comme au profil 3 : « D’accord, pour celle-ci je fais tout et je te fais un compte rendu. » Le réglage ne change jamais par la parole.
- tcConfianceDemandee lit la phrase au début de charlySendMessage et l'ôte du texte (détecteurs et modèle lisent la demande seule ; la bulle montre ce qui a été tapé). _tcConfianceMoment { n, dit, texte } : tcConfianceCharly() le rend d'abord, tcConfianceCharly(true) donne le réglage (le bloc des Paramètres).
- Durée : une réponse à une question (questionnaire, « J’envoie ? », « je le place ? », « qui est-ce ? » : tcUneQuestionAttend) garde le profil du moment ; une nouvelle demande sans la phrase revient au réglage (retiré en tête s'il n'y a pas de question, et après les réponses attendues).
- La phrase « D’accord, pour celle-ci … » : une fois, seulement si elle change quelque chose, juste après la bulle pour décaler, retard, annuler, malade, imprévu (tcPousserMessageUtilisateur), sinon au premier choix qui dépend du profil. Une action à une seule étape (la carte + valider) ne change pas.
- La réponse d'un contact, qui arrive plus tard : le profil du moment est gardé sur le rendez-vous (decalage.confiance) ; tcSuivrePropositions traite chaque réponse avec le profil de sa demande (tcAvecConfiance).
- Après l'examen (2 défauts) : 1) une réponse tardive (le créneau choisi par un contact) ne lit plus jamais le profil du moment : celui gardé sur le rendez-vous, sinon le réglage (tcConfianceCharly(true)) ; les nouveaux tours passent le leur (it.confiance) ; tcAvecConfiance retiré. Avant, au profil 1 avec « fais-le directement » en cours, la réponse d'une autre demande était placée seule. 2) Seul un ordre à Charly compte : une proposition entière (« , fais-le directement », « et attends ma validation ») ; « sans me … », « tout seul » seuls en fin de message après une action (décale, annule, préviens…), sans « que » avant. « Paul a annulé sans … », « je vais au cinéma, tout seul », « mon fils fait tout seul ses devoirs », « je vérifie avec moi-même » ne changent rien. verif-confiance-charly : 127.
- Après l'examen 2 (1 défaut créé par le correctif) : les phrases du profil 1 n'étaient plus reconnues suivies d'autres mots (« demande-moi avant de prévenir Paul ») : au profil 3, Charly faisait tout seul. Côté profil 1, la reconnaissance est large (début de proposition, mot entier, « moi-même » exclu, « d abord » sans apostrophe) ; la phrase n'est ôtée que si elle finit la proposition (« stp » compris), sinon le texte reste entier. La rigueur reste pour le profil 3. verif-confiance-charly : 128.
- Après l'examen 3 : profil 1 reconnu aussi au milieu d'une proposition (« décale tout puis attends ma validation », « … stp attends ma validation » : texte entier) et « avant demande-moi » ; seule une proposition entière est ôtée. Profil 3 : « fais-le directement stp » compte. verif-confiance-charly : 129.
- Après le retour TESTEURS (03/11, en ligne, comptes armelle / basile / clemence) : 1) « attends ma validation » n'était jamais lu dans le vrai parcours : la correction de dictée ôtait « attends » (hésitation, mission 55) avant ; « attends ma / mon validation, accord, feu vert, ok » est gardé. 2) Le profil du moment tombe dès que la demande est finie (après chaque message et chaque bouton du questionnaire, plus rien n'attend de réponse), plus au début de la suivante. 3) « malade après-demain » compris (période sans bouton). 4) Un rendez-vous ⏳ n'est plus reproposé (malade, imprévu) : « Déjà en cours de décalage (⏳), j’attends la réponse : … ». 5) « Paul a annulé … » : un fait raconté, plus de « je ne trouve pas de rendez-vous « paul sans demander note » ». Sonde Chrome avec un contact : les 5 passent. verif-confiance-charly : 141.
- verif-confiance-charly : 124 (section 12 : 13 phrases et 7 phrases ordinaires, profil 3 + attends, profil 1 + fais-le, Paramètres inchangés, réponse tardive). Sonde Chrome 390 px (compte Ines, sans contact) : profil 3 + « attends ma validation » → « Oui, vas-y » demandé ; profil 1 + « fais-le directement » → décalé seul ; la demande suivante revient au réglage ; Paramètres cochés sur le réglage.

## 03/11/2026 : mission 78, trois comptes du manuel gardés par la purge

- alice.bernard, bruno.inconnu et chloe.martin (captures du manuel de l'adjointe), effacés par la purge du 02/11, ajoutés à scripts/comptes-test-a-garder.txt (12 adresses). `purger-comptes-test.sh --compter` : liste de 12 acceptée, 9 comptes gardés existent en base (les 3 du manuel sont à recréer), 0 à effacer.

## 11/11/2026 : mission 79, version Google Play

- Deux variantes de build (productFlavors, dimension « canal ») : « site » (APK de timecool.fr, mise a jour integree, targetSdk 34, inchange) et « play » (Google Play, aucune mise a jour integree, targetSdk 36 exige par Play depuis le 31/08/2026 pour une nouvelle appli). Meme applicationId, meme index.html, meme versionCode, meme cle. compileSdk 36, AGP 8.13.0, Gradle 8.13.
- Natif : le telechargement et l installation d APK sont passes dans MajApk, propre a chaque variante (src/site, src/play ; celui de play ne fait rien). REQUEST_INSTALL_PACKAGES dans src/site/AndroidManifest.xml seulement. Le pont donne canal() (« site » / « play »). Niveau 35 et plus : marges systeme (barres, encoche, clavier) posees sur un cadre autour de la WebView ; niveau 36 : retour arriere par OnBackInvokedDispatcher (RetourPredictif), onBackPressed garde pour le reste.
- Page : tcMajParBoutique() / tcMajIntegree(). Dans play : ni verification des releases, ni bandeau, ni telechargement ; Parametres > Application montre la version et « Les mises à jour arrivent par Google Play. » ; le bouton du haut actualise les donnees ; Charly ne renvoie plus vers « Mise à jour automatique ». Site et web : inchanges.
- Workflow : assembleSiteRelease bundlePlayRelease ; l APK du site garde son nom et sa Release ; le .aab est verifie (jarsigner) et depose en artefact TimeCool-Play-<version>, jamais dans la Release.
- Verifie : verifier.sh vert (verif-canal-play : 43). Build local sur le serveur (outils Android installes dans ~/outils-android avec l accord de Charles, licence Google acceptee), cle d essai : les deux variantes compilent ; manifeste fusionne de play sans REQUEST_INSTALL_PACKAGES, targetSdk 36 ; site : la permission, targetSdk 34 ; .aab « jar verified » ; le code de play ne contient plus l installateur d APK (dexdump). Non verifie sur un vrai telephone : l affichage bord a bord et le retour arriere de la version play (Android 15 / 16).
- Manque pour la Play Console (non code, en attente du chef) : suppression de compte dans l appli et par une adresse web.
- Apres l examen (bon, remarque 1) : le bundle Google Play est construit dans sa propre etape, APRES la Release du site ; s il echoue, l APK du site est deja publie et le run passe au rouge. verif-canal-play : 44.

## 12/11/2026 : mission 80, le portable confirmé par SMS à l'inscription

Chef, 12/11 (ok de Charles) : certifier le portable de chaque nouvel inscrit (pas de comptes à la chaîne). Choix envoyés au chef avant de coder, tous acceptés.
- Réglage serveur verification_sms_inscription (false par défaut ; le chef le passe à true en prod seulement après un vrai SMS reçu par Charles). verification_obligatoire (e-mail) reste suspendu, inchangé.
- Code : 6 chiffres, 10 min (verification_sms_minutes), 5 essais, usage unique ; preuve 30 min consommée à l'inscription. Rien dans comptes avant le bon code (la table verifications est à part ; ses lignes de plus de 24 h sont effacées à chaque demande, le numéro y est en clair).
- Limites : renvoi après 60 s (serveur et bouton), 3 envois par numéro et par heure, 5 par jour ; 5 par adresse IP et par heure, 15 par jour ; plafond global 300 par 24 h (sms_plafond_jour), e-mail aux administrateurs une fois par jour (table alertes_envoyees, créée par le code comme rappels_envoyes). Un envoi raté ne compte pas.
- Numéros : portables seulement (+33 6/7), outre-mer, Belgique, Suisse, Luxembourg, Monaco, Allemagne, Espagne, Italie, Portugal, Pays-Bas, Royaume-Uni, +1 (sms_prefixes). « Numéro déjà inscrit » dit AVANT tout SMS (but « inscription »).
- Comptes de test : pas de SMS seulement si numéro fictif ARCEP (06 39 98 00 00 à 06 39 98 99 99) + adresse @exemple-timecool.fr + adresse IP de ip_tests (serveur 82.165.253.73, PC de Charles) ; le code s'affiche dans le bandeau « MODE TEST » existant. Toutes les e2e s'inscrivent désormais au numéro fictif ; comptes-jetables.js demande le code de test et recommence avec la preuve quand le serveur exige le SMS.
- Google : le formulaire pré-rempli demande déjà le portable ; le même code est exigé.
- Twilio : la ligne « twilio » de cles_api ne contient qu'un identifiant (34 caractères). Envoi écrit dans index.php (smsEnvoyer), rien dans lib.php : clés de l'administrateur dans Configuration IA (twilio = Account SID AC…, twilio_jeton, twilio_expediteur), sinon config.php. /test/sms-twilio : administrateur seul, vers le numéro de son compte (le numéro en dur est retiré).
- Écran : plus de choix SMS / e-mail quand le SMS est exigé ; « Étape 2 sur 2 : un code à 6 chiffres vient de partir par SMS au +33 6 12 34 56 78. Il est valable 10 minutes. » ; cases en chiffres, code proposé par le clavier réparti dans les cases ; « Renvoyer le code (dans 59 s) » ; messages : code faux, expiré, trop d'essais, numéro déjà inscrit, trop d'envois. Le numéro affiché était mal groupé (« +33 61 23 45 67 8 ») : tcNumeroLisible.
- Suites : verif-sms-inscription (nouvelle, 59 : page, API lue, parcours réel contre deux API locales temporaires avec un faux Twilio) ; verif-retour-partout (la flèche de l'écran du code). verifier.sh vert.
- Reste : poser les trois clés Twilio (Charles, Configuration IA), un vrai SMS de test, ip_tests et verification_sms_inscription en prod (chef), batterie d'inscription TESTEURS avec un numéro 06 39 98 xx xx.
- Après l'examen (1 défaut) : flèche retour puis « Continuer » recréait pendingSignup, le code reçu ne pouvait plus être saisi (429 renvoi_trop_tot, puis un 2e SMS). Le dernier code parti est retenu (tcRetenirCode) et resservi tant qu'il est valable pour le même numéro et la même adresse (tcCodeEncoreValable, 30 s de marge) ; oublié à la création du compte. tcNumeroLisible lit +1 en 3-3-4. verif-sms-inscription : 65. Remarques transmises au chef : réserve de 10 000 numéros fictifs (409 possible si un compte de test reste), IP de box qui change, REMOTE_ADDR à vérifier derrière nginx avant l'activation.

## 12/11/2026 : mission 81, « Supprimer mon compte » (exigence Google Play)

Chef, 12/11 (ok de Charles) ; choix envoyés avant de coder, acceptés (révocation Google ajoutée par le chef).
- Existant : pas de clôture par l'utilisateur (cloture_le = blocage administrateur, réversible) ; compteEffacer sert à /admin/supprimer et /compte/effacer-test. Réutilisée telle quelle : aucun réglage jumeau.
- Serveur : POST /compte/supprimer (session) ; mot « supprimer » exigé (confirmation_requise), administrateur refusé (403 administrateur) ; l'accès Google Agenda est rendu chez Google (oauth2 revoke), un échec n'arrête rien ; puis compteEffacer : immédiat, définitif, l'adresse et le numéro redeviennent libres.
- Chez les contacts : leurs rendez-vous et leurs fiches restent (leur agenda), les messages reçus restent ; une demande de lui encore en attente répond « Cette demande n’est plus valable. » (le message des 5 cas « Demande inconnue ou déjà traitée. » de /rdv/choisir, /rdv/proposer-creneau, /rdv/refuser). Aucun message ne leur est envoyé.
- Page : Paramètres, tout en bas sous « Se déconnecter », lien rouge « Supprimer mon compte » ; fenêtre « Supprimer ton compte ? Ton agenda, tes contacts et tes messages seront effacés, sans retour possible. Écris « supprimer » pour confirmer. » (Annuler / Supprimer) ; après : l'appareil oublie tout comme à la déconnexion, retour à l'accueil, « Ton compte est supprimé. Merci d’avoir essayé TimeCool. ».
- Adresse web pour Google Play : https://timecool.fr/app/#supprimer-mon-compte : connecté, Paramètres puis la confirmation ; sinon « Connecte-toi : la suppression de ton compte s’ouvrira ensuite. » et elle s'ouvre après la connexion (fin de hideAuthFlow).
- Décision prise seul : le bouton s'affiche pour tout le monde (la page ne sait pas qui est administrateur) ; pour l'administrateur, le serveur refuse avec un message clair.
- Suites : verif-suppression-compte (nouvelle, 25 : page, confirmation jouée, API lue, deux comptes de test contre l'API). verifier.sh vert.
- Après l'examen (1 défaut) : l'appareil gardait le nom et l'adresse (timecool_user_account), jusqu'à 5 copies automatiques de l'agenda (tc_backup_history, tc_auto_backup_last, tc_last_auto_backup_at) et l'empreinte (tc_biometrie_active, jeton mort dans le pont natif). Ils partent à la suppression (et desactiverBiometrie) ; la simple déconnexion ne change pas (choix ancien, chef). Bouton « Supprimer » rouge (tcPrompt passe danger à tcModale). verif-suppression-compte : 27.

## 12/11/2026 : mission 82 mise de côté

Charles a vu les captures : « laisse tomber ce sujet pour le moment ». Le chef demande de l'écarter avant la mission 83 pour qu'elle ne parte pas en ligne par accident. Commit abc2b4c (git revert de ef8b0f4) : la page et les suites reviennent à l'état de d9f6dac. Le travail entier reste sur la branche locale mission-82 (ef8b0f4), à reprendre tel quel (git cherry-pick ef8b0f4 ou git revert abc2b4c).

## 12/11/2026 : mission 83, « Supprimer mon compte » en vrai bouton

Chef, 12/11 (ok de Charles : « Supprimer mon compte » était caché et écrit trop petit).
- Paramètres, tout en bas : le gros bouton rose « 🚪 Se déconnecter » est retiré ; « Supprimer mon compte » prend sa place, même taille et même forme (fond rose, bord, coins arrondis, 14 px gras), texte rouge, plus de soulignement. Même identifiant btnSupprimerMonCompte, même fenêtre de confirmation, #supprimer-mon-compte inchangé.
- La déconnexion reste dans le menu du rond aux initiales et en bas du menu ☰ (non touchés).
- Suites : verif-suppression-compte (plus de gros « Se déconnecter », le bouton et son style, les deux autres déconnexions présentes ; rouge sur la page d'avant), verif-parametres-ordre (le dernier bloc est « Supprimer mon compte »). verifier.sh vert. Captures 390 px : bas de Paramètres, menu du rond, menu ☰.

## 14/11/2026 : mission 84, l'heure de Paris dans la liste des comptes

Chef, 14/11 (ok de Charles). Constat : Configuration IA > Utilisateurs inscrits affichait l'heure UTC brute de la base (compte 32457 « 11:50 » pour une inscription à 12h50 à Paris). Cause : l'API rend cree_le « 2026-11-14 11:50:13 » sans fuseau (base et serveur en UTC) ; la page le lisait comme une heure locale.
- Correction côté affichage seulement (API, base et autres routes inchangées) : tcDateServeurUTC ajoute le Z à la date de la base, tcDateHeureParis formate en Europe/Paris (hiver +1, été +2), quel que soit le fuseau de l'appareil. Même format « JJ/MM/AAAA HH:MM ». L'export CSV prend aussi la date de Paris. Le tri ne change pas (même ordre).
- Autres dates de la page administrateur : aucune autre n'est affichée (derniere_connexion est rendue par l'API mais pas montrée ; Configuration IA ne montre pas maj_le).
- Recherche dans le reste de la page : aucun autre écran n'affiche une date de la base avec son heure. La carte d'un demandeur inconnu (« depuis le JJ/MM/AAAA ») reçoit date('c') de l'API, donc un fuseau explicite.
- Suite : verif-heure-paris-admin (nouvelle, 9 ; jouée sous TZ UTC, Paris et New York ; 8 rouges sur la page d'avant). verifier.sh vert. Capture 390 px avec deux comptes fictifs.

## 14/11/2026 : mission 85, le rappel par e-mail allumé dès l'inscription, et son bouton stop

Chef, 14/11 (ok de Charles). Avant : rappelsEnvoyer() n'écrivait qu'aux comptes dont le réglage tc_rappel_email valait « 1 », éteint au départ.
- API, /inscription : le nouveau compte reçoit tc_rappel_email = « 1 » par elementsPoser (délai par défaut inchangé : une heure). Un échec n'empêche pas l'inscription. Comptes existants : rien ne change (pas de migration).
- Page, tcCreerCompte : la même clé posée tout de suite sur l'appareil, l'interrupteur la montre sans attendre la synchronisation ; les autres appareils la reçoivent par GET /sync.
- E-mail : rappelEnvoyerUn passe par rappelMessage (même texte, même sujet) qui ajoute le bouton gris « Ne plus recevoir ces rappels », le lien dans la version texte, et les en-têtes List-Unsubscribe + List-Unsubscribe-Post (clic unique des messageries). envoyerEmail accepte des en-têtes en plus (toute ligne avec un retour à la ligne est écartée).
- Lien : https://api.timecool.fr/rappels/arreter?c=<référence>&s=<signature>. Signature = HMAC-SHA256 (poivre du serveur) de « rappels-stop|référence », 18 octets en base64url ; comparée par hash_equals. Sans poivre, pas de lien. GET : page calme (« C’est noté. Vous ne recevrez plus de rappel par e-mail… »), vouvoiement comme la page de retour Google ; POST : réponse « ok » pour le clic unique. Éteint par elementsPoser (« 0 ») : l'interrupteur s'éteint sur les appareils ; déjà éteint, rien n'est réécrit. Lien faux ou d'un autre compte : 400, « Ce lien n’est pas valable », rien ne change.
- Suites : verif-rappels-stop-e2e (nouvelle, 28 : code, e-mail rendu par le vrai code php, liens joués contre l'API locale) ; verif-sync-e2e adaptée (un compte neuf porte désormais un élément, version 1). verifier.sh vert. Captures : e-mail et page de confirmation.
- À savoir : la suite verif-sync-e2e contre la production ne passe qu'une fois cette API en ligne. Les comptes de test @exemple-timecool.fr ont eux aussi le rappel allumé.

## 14/11/2026 : mission 86, les SMS par OVHcloud

Chef, 14/11 (décision de Charles) : Twilio refuse l'envoi (« Primary compliance profile is not approved ») ; Charles a ouvert un compte OVHcloud et acheté 100 SMS.
- Voie choisie : http2sms (compte SMS sms-ab12345-1 + utilisateur API + mot de passe) plutôt que l'API signée (application key, secret, consumer key) : deux valeurs à créer chez OVHcloud au lieu de trois et une autorisation. Essai sans identifiants le 14/11 : http2sms lit bien les paramètres envoyés dans le CORPS d'un POST ; le mot de passe n'est donc dans aucune adresse.
- smsEnvoyer() choisit le fournisseur (smsFournisseur) : OVHcloud si ses trois valeurs sont posées, sinon Twilio comme avant (smsEnvoyerTwilio, inchangée). Réglage sms_fournisseur (auto par défaut, ovh ou twilio pour forcer). Clés OVHcloud : config.php d'abord (vérifications locales), sinon Configuration IA (ovh_sms_compte, ovh_sms_utilisateur, ovh_sms_mot_de_passe, ovh_sms_expediteur, chiffrées comme les autres). Rend le fournisseur, l'expéditeur utilisé et les crédits restants.
- Expéditeur : « TimeCool » s'il est posé ; vide, ou refusé par OVHcloud (pas encore validé), l'envoi passe par le numéro court (senderForResponse=1). noStop=1 (messages de service). Numéro au format 0033…
- Route d'essai : /test/sms-twilio gardée, /test/sms ajoutée (même code) ; la réponse dit fournisseur, expéditeur, crédits restants ; en cas de refus, le message d'OVHcloud.
- En local (php -S), jamais le vrai OVHcloud (TC_SMS_FAUX_OVH obligatoire). verif-sms-inscription force sms_fournisseur => twilio (son faux Twilio) : des clés OVHcloud posées dans Configuration IA (même base) ne l'en détournent pas.
- Inchangés : verification_sms_inscription (éteint), le texte du code, le mot de passe oublié par SMS (il passe encore par la classe Sms de lib.php, config.php seul : à décider).
- Suite : verif-sms-ovh (nouvelle, 23 : faux OVHcloud, expéditeur, numéro court, repli, refus, forçage). verifier.sh vert. Capture : Configuration IA, les quatre lignes OVHcloud.

## 15/11/2026 : mission 87, la langue choisie avant connexion

Chef, 15/11 (Charles, 14/11 : « pourquoi il faut s'inscrire pour changer de langue ? ») : le sélecteur de l'accueil disait « Español », mais l'écran restait en français.
- Cause : translatePageWithGoogle passe par le relais Google du serveur, réservé aux comptes. Sans compte, il s'arrêtait (« Connecte-toi pour traduire »).
- Remède, validé par le chef : un dictionnaire figé (TC_ACCUEIL_FR = la clé mot pour mot, TC_ACCUEIL_TEXTES = 16 langues × 143 textes), lu d'abord par translateText, showToast et tcT(fr, n). Sans compte, translatePageWithGoogle travaille quand même, sans message, avec les seuls textes figés. Le retour au français est inchangé (_tcTextNodes).
- Textes : les six écrans, les erreurs sous les champs, les messages, les boutons qui changent (« Envoi… », « Renvoyer le code (dans N s) »), et les messages du serveur pour l'inscription, le code et la connexion (y compris « numéro déjà inscrit », qui contient des espaces insécables : la clé les lit comme des espaces). Les noms des pays de l'indicatif viennent d'Intl.DisplayNames ; en français, ceux de la liste.
- Restent en français (à traduire si besoin) : la fenêtre « Vérifions ensemble » (panne réseau), les erreurs de connexion Google, les messages techniques du serveur (canal_invalide, envoi_indisponible, google_non_configure, verification_non_concordante, verification_requise « préalable obligatoire », sms_non_configure, « Envoi … impossible : détail »), l'aide de Paramètres. « Compte créé » et la page « Comment as-tu connu TimeCool ? » viennent après la création du compte : Google les traduit comme avant.
- Langue retenue : timecool_language, comme avant, plus une marque tc_langue_avant_connexion (jamais transférée). À la connexion, reglage.poser garde cette langue plutôt que celle du compte, et reglage.lire l'envoie. Après le premier tour (tcSyncTour), la marque s'efface et tcPousserLangue prévient le serveur. À l'inscription, la langue partait déjà avec le compte.
- Appels gardés par typeof : quatre simulations de synchronisation (verif-sync, verif-deconnexion, verif-sync-local-gagne, verif-reglages-compte-simule) chargent reglage sans le reste de la page.
- Suites : verif-langue-accueil (nouvelle ; Node, plus Chrome sur le PC : es sur les six écrans et leurs erreurs, en, fi, retour au français, rechargement ; échoue sur la page d'avant). verif-sms-inscription lit le texte de l'écran du code sous sa forme tcT. verifier.sh vert.
- Captures (PC, m71/captures87) : bienvenue, inscription, code, connexion en espagnol et en anglais, bienvenue en finnois.

## 15/11/2026 : mission 88, plus d'écran « Commencer »

Chef, 15/11 (Charles, en navigation privée) : un visiteur neuf voyait d'abord « Commencer → ». Ce n'était pas une page, mais un voile (onboardingScreen, z-index 99998) posé par checkOnboarding 500 ms après le chargement, tant que tc_onboarding_done n'existait pas, donc seulement sur un appareil neuf.
- Derrière « Commencer », un second écran, « Rejoins TimeCool », reprenait Google / Créer mon compte / J'ai déjà un compte ; ob3 (« Charly IA est prêt ») n'était plus atteignable (goToOb3 lisait ob_firstname, qui n'existe plus). Les trois écrans et leurs quatre fonctions sont retirés.
- Ce qui en dépendait : rien. Ni permission, ni lien d'invitation ou de rendez-vous, ni réglage autre que tc_onboarding_done, que toutes les ouvertures de session posent aussi. Le drapeau reste (TC_ONBOARDING_KEY), sans effet sur l'écran. La phrase « TimeCool est 100% gratuit » d'ob2 disparaît avec lui.
- Le dictionnaire de la mission 87 ne contenait aucun texte de ces écrans : rien à retirer.
- Suites : verif-arrivee-visiteur (nouvelle ; échoue sur la page d'avant, où « Commencer » recouvre le titre) ; verif-toast-et-accueil (la partie checkOnboarding devient « l'écran n'existe plus », et l'inscription pose toujours session et drapeau) ; verif-accents-accueil (les 5 textes retirés ne sont plus attendus, les interdits restent). verifier.sh vert.
- Capture : m71/captures88, l'arrivée d'un visiteur neuf.

## 15/11/2026 : mission 89, ce qui a déjà un compte, avant le SMS

Chef, 15/11 (essai réel de Charles, nuit du 14 au 15) : trois codes SMS validés (verifications 625 à 627), puis 409 compte_existant « Un compte existe déjà avec cet email ou ce numéro. ». C'était son adresse e-mail qui avait un compte, pas son numéro.
- API (touchée) : nouvelle route POST /inscription/controler {email, telephone} → {email_deja_inscrit, numero_deja_inscrit}. Elle ne fait que lire (comptes.email, normalisé comme l'index unique ; comptes.telephone). Limite par IP : inscription_controle_ip_heure (20 par défaut), 429 au-delà. Le compteur est un fichier par IP et par heure (empreinte HMAC avec le poivre) dans private/limites (réglage limites_dossier), à côté des documents : aucune table, aucune migration. Sous php -S, la limite passe à 1000 (les suites passent souvent) ; elle est rejouée seule avec php en ligne de commande par la suite.
- API : le 409 de la création (index unique) dit lequel est pris : email_deja_inscrit « Cette adresse e-mail a déjà un compte TimeCool. », sinon numero_deja_inscrit « Ce numéro de portable a déjà un compte TimeCool. », et compte_existant seulement si aucun des deux (ce qui n'arrive pas).
- Page : submitSignup appelle tcDejaInscritAvantEnvoi avant pendingSignup, donc avant le SMS de la mission 80 et avant le choix SMS / e-mail. Le message se pose sous le champ (tcMontrerDejaInscrit), avec « Me connecter » (_tcConnexionPreremplie, gardé par tcViderChampsConnexion malgré le vidage d'autocomplétion) et « Mot de passe oublié » (identifiant déjà écrit). En cas de panne ou de 429, on continue : le serveur garde son filet. numero_deja_inscrit à l'envoi du code (tcErreurEnvoiCode) et les nouveaux 409 (tcCreerCompte) ramènent au formulaire avec la même présentation.
- Google : une adresse Google déjà inscrite ouvre ce compte (/connexion/google, inchangé). Un compte fermé ou bloqué avec cette adresse donne le formulaire prérempli, puis « Continuer » arrête sur « Cette adresse e-mail a déjà un compte TimeCool. ».
- Dictionnaire de la mission 87 : 3 textes de plus (les deux messages, « Me connecter »), 146 par langue. « Mot de passe oublié » y était déjà.
- Suite verif-deja-inscrit-e2e (nouvelle) : lecture API et page, limite rejouée, rejeu à faux DOM, e2e contre l'API locale (contrôles, aucune ligne dans verifications, deux 409 aux messages exacts, cas normal 201), et Chrome sur le PC (aucun SMS, champ en évidence, boutons, connexion préremplie, espagnol). verifier.sh vert.
- Captures (PC, m71/captures89) : adresse déjà inscrite, numéro déjà inscrit.

## 15/11/2026 : mission 90, une phrase sur l'écran des autorisations

Chef, 15/11 (phrase validée mot pour mot par Charles) : sur #permissionsScreen, entre « ✅ Autoriser TimeCool » et « Passer cette étape », la phrase « Vous pourrez modifier ces autorisations à tout moment dans les réglages de votre téléphone. ». Elle est en petit texte gris centré (12 px, #5f6368, comme les sous-titres des quatre lignes). Rien d'autre ne change. Après la connexion, la traduction passe par Google, comme le reste de l'écran.
- Constat, sans correction : sur le web comme dans l'APK actuel, « Autoriser TimeCool » ne demande aucune permission. acceptPermissions n'agit que si window.Capacitor existe, et le projet n'utilise pas Capacitor (WebView native, pont TimeCoolNatif). La fonction marque l'écran comme vu et affiche toujours « Autorisations accordées ! ». Android demande chaque permission au moment où elle sert : micro pour la dictée, appareil photo, contacts à l'import, position, notifications (MainActivity).
- Sur un ordinateur, la phrase parle du téléphone (à voir avec Charles, selon le chef).
- Suite : verif-toast-et-accueil, section 4 (phrase exacte une seule fois, entre les deux boutons, style, quatre lignes et deux boutons intacts) ; elle échoue sur la page d'avant. verifier.sh vert. Capture : m71/captures90.

## 15/11/2026 : mission 91, profils 2 et 3 de « Ma confiance en Charly » au niveau du site

Chef, 15/11 (choix « A » de Charles, forme de la validation tranchée par le chef). Constat confirmé avant de coder : au profil 2, les messages et les propositions de créneaux partaient seuls, une proposition refusée ou restée sans réponse était reproposée seule, et seul le placement attendait un oui.
- Profil 2, désormais : rien ne part et rien ne s'écrit avant UN oui. C'est la carte du profil 1, posée une fois, à la fin.
  - Décaler avec un contact : tcDemanderDeplacementProfil2 (ce qui se déplace sans contact, les créneaux de chacun calculés d'avance par tcCreneauxDuLot, le message, « Quand Paul aura choisi, je placerai son créneau dans ton agenda sans te redemander. », Je l'envoie ?).
  - Malade, imprévu : le récapitulatif « Voici ce que je vais faire » n'est plus sauté, et il liste les créneaux (r._creneaux).
  - Message seul (retard, annulation, réponse) : « J'envoie ? ».
  Au oui, les créneaux montrés partent tels quels (tcProposerLesCreneaux options.items) et le rendez-vous est marqué decalage.confiance = 2.
- Réponse du contact (tcSuivrePropositions) :
  - marqué 2 et créneau choisi encore libre (tcGenesDuCreneau) : placé seul par tcTraiterSeul, avec un compte rendu ;
  - refus, silence (relance) ou créneau qui n'est plus libre : question, comme au profil 1 ; rien ne repart sans un nouveau oui ;
  - profil 2 réglé sans marque (envoi d'avant la mission 91) : traité comme le profil 1.
  tcReproposerSeul, tcPoserLotCreneaux et tcExecuterLotCreneaux ne sont plus appelés par la sonde ; ils restent pour une question de lot déjà posée, que l'historique garde.
- Profil 3 : inchangé, et chaque compte rendu va aussi au Journal d'activité (tcJournaliserCompteRendu, catégorie charly, statut « 📋 Compte rendu », texte entier en détail). Cela vaut pour la carte de tcTraiterSeul (profil 3, profil 2 après le oui), le bilan d'un décalage, le bilan du questionnaire sans récapitulatif (r._seul) et un message envoyé seul. Le filtre du Journal s'appelle « Recherches Charly IA » (inchangé).
- Textes du réglage : profil 2 « … avant d'écrire dans mon agenda ou d'envoyer un message ou une demande à mes contacts. » ; gris du profil 3 « … te fait un compte rendu, que tu retrouves aussi dans ton Journal d'activité. ». Aucun autre texte de l'appli ne décrivait le profil 2. La mission 77 (le profil du moment) est inchangée. API non touchée.
- Suites : verif-confiance-charly (section 7 réécrite, section 8 sur une question de lot déjà posée, bilan, messages seuls, Journal ; 145 vérifications), verif-questionnaire-malade (section 10 : profil 2, récapitulatif avec créneaux, rien avant le oui, créneaux montrés envoyés tels quels ; profil 3, compte rendu au Journal), verif-charly-deplacement et verif-deplacer-periode (nouvelles fonctions extraites). verifier.sh vert.
- Captures (PC, m71/captures91) : le réglage, la validation finale au profil 2 (parcours malade), le compte rendu au Journal.

## 15/11/2026 : mission 91, suite : créneaux communs et carte pour un enfant de 10 ans

Chef, 15/11 : Charles refuse la première carte du profil 2 (« trop compliqué ») et élargit la 91. Règle, valable pour toutes les missions : écrire comme pour un enfant de 10 ans (phrases courtes, une idée par ligne, pas de point-virgule).
- Créneaux, tous profils :
  - tcCreneauxPourDecalage ne garde que des moments dans les plages de l'utilisateur (tcPlagesDuJour) et libres entre 8h et 19h (12 candidats au plus, TC_PROPOSITION_CANDIDATS).
  - tcCreneauxPourContact : pour un contact qui a TimeCool, le serveur ne garde que ceux qui sont libres chez lui aussi (POST /rdv/proposition/libres), 3 au plus.
  - tcCreneauxDuLot est asynchrone ; il sert à décaler, au questionnaire (calcul dans TC_ETAPE_RECAP.avant, au profil 3 aussi) et aux nouveaux tours (tcCreneauxReproposesPour).
- API (touchée, sans migration) :
  - creneauxLibresPourContact : agenda du contact (rdvOccupation) ; s'il a classé l'utilisateur, ses plages (dispoPlagesDuJour) ; sinon son temps libre protégé. Un contact qui a bloqué l'utilisateur n'est pas consulté : tout revient, rien ne trahit le blocage. Seuls des indices sortent.
  - Route POST /rdv/proposition/libres (lecture seule, 30 créneaux au plus).
  - /rdv/proposition/creer refiltre et renumérote les rangs ; s'il ne reste rien : 409 aucun_creneau_libre, et le bilan le dit.
- Carte : tcCarteEnvoiCreneaux, texte validé par Charles.
  - Un rendez-vous : « Tu es malade. » (parcours malade seulement), « Je regarde… », « Je propose à Paul 3 nouveaux rendez-vous, mardi 17 novembre : / 9h, 11h ou 13h. », « Paul choisit, selon ses préférences… » (sans TimeCool : « … celui qui lui convient. »), « Je note son choix dans ton agenda. » (profil 1 : « Je te demande avant de noter… »), « Je lui envoie ? ».
  - Plusieurs rendez-vous : la forme validée par le chef.
  - Boutons « Oui, envoie » / « Non » : questionnaire (profils 1 et 2), décaler au profil 2 (_boutonsEnvoi, tcRendreBoutonsEnvoi). Aucun moment commun : Charly le dit, rien n'est proposé.
- Trouvé en faisant la capture « ce que voit Paul » : la liste des conversations du serveur ne gardait pas les créneaux d'une proposition (creneaux, avant, choix, suite, pris). La carte à boutons ne s'affichait donc jamais chez un contact TimeCool, depuis la 73. C'est corrigé (ajoutés après « statut » dans le passage de la messagerie).
- Suites :
  - verif-creneaux-communs-e2e (nouvelle, 3 comptes jetables : classé, non classé, bloqué, référence inconnue, sans session, création refiltrée, 409, contact sans TimeCool) ;
  - verif-confiance-charly (158 vérifications) ;
  - verif-questionnaire-malade et verif-imprevu (carte simple) ;
  - verif-charly-deplacement et verif-deplacer-periode (nouvelles fonctions).
  verifier.sh vert.
- Captures (PC, m71/captures91b) : carte avec TimeCool, sans TimeCool, à plusieurs, ce que voit Paul.

## 15/11/2026 : mission 95, messagerie : le texte reçu est affiché comme du texte

Chef, 15/11 (trouvé par EXAMINATEUR).
- Page : dans la conversation et dans la liste des conversations, le texte des messages, le nom, les initiales, l'heure et la recherche tapée sont échappés (escapeHTMLSafe) avant d'être affichés.
- Revu et déjà bon : le texte d'origine d'une traduction, les cartes reçues (demande de rendez-vous, convocation, proposition de créneaux), la carte du demandeur, la page publique des liens (backend/web/rdv.html), les toasts (textContent), le compte rendu au Journal (mission 91).
- API : les titres et lieux saisis par un compte et écrits chez un autre (demande de rendez-vous, rendez-vous à plusieurs, convocation, liens et propositions) passent par texteSur, comme les noms.
- Suite verif-messagerie-texte (nouvelle ; Chrome sur le PC). verifier.sh vert.

## 15/11/2026 : mission 92, l'accueil de Charly donne un exemple

Chef, 15/11 (texte validé par Charles).
- Les deux variantes du message d'accueil de Charly (avec et sans prénom) se terminent par « Par exemple, écris-moi ou dis-moi ci-dessous : « Crée-moi un rendez-vous demain à 15h chez mon dentiste ». » au lieu de « Par où on commence ? ».
- verif-prenom-charly : texte exact des deux variantes. verif-charly-campagne10 : la phrase d'exemple, tapée telle quelle, donne bien la carte « Dentiste » demain à 15h.
- verifier.sh vert.

## 15/11/2026 : mission 93, les boutons de Charly donnent un exemple

Chef, 15/11 (phrases et propositions validées par Charles ; complément « Qui est ton dentiste ? » validé le même jour).
- Les sept boutons (nouveau rdv, imprévu, retard, à plusieurs, malade, libre, contact) ne lancent plus de série de questions : Charly répond par une phrase avec un exemple à écrire ou à dire (TC_PHRASES_BOUTONS). Photo et Créer mon agenda ne changent pas. Les questionnaires restent joignables en tapant.
- Chaque exemple aboutit simplement, sans le modèle :
  - « Dentiste demain à 15h » (quoi, jour, heure) donne la carte tout de suite ; jamais pour une personne (nom de contact, majuscule, civilité, « avec »), un verbe ou « me rappeler » ;
  - décaler au profil 1 : la carte simple de la 91 (« Je lui envoie ? ») ;
  - retard : le contact nommé donne son rendez-vous du jour ; plus de « Et après ? » ni de « Qui prévient ? » ; une carte (« Tu seras en retard… Je lui envoie ? ») ;
  - malade : « aujourd'hui ou demain » = les deux jours ; Charly prévient (plus de « Qui prévient ? ») ;
  - « Dîner avec Paul et Marie samedi soir » : « À quelle heure ? » puis la carte.
- Contact du rendez-vous : compte sans contact, pas de question (la carte dit « sans contact · relier ») ; sinon « C’est avec quelqu’un de tes contacts ? » (« 👤 Choisir un contact » / « Non, personne »), « C’est l’un d’eux ? » pour deux ou trois.
- Suite verif-phrases-boutons (nouvelle ; Chrome sur le PC) : les sept phrases, puis chaque exemple tapé sur un compte neuf et un compte rempli. Treize suites adaptées. verifier.sh vert.
- Examen : une question (« qu’est-ce que j’ai avec Paul samedi », « combien… », « je suis avec… ») n’est jamais une demande sans heure ; « libre / dispo / occupé / rien / pas » ne sont jamais l’objet d’une carte. Suite complétée.
- Retouches de Charles (15/11) :
  - une bulle qui ne fait que répéter la carte qui suit est retirée (tcRepeteLaCarte) ; la carte arrive seule ;
  - malade : la liste seulement quand Charly demande « Que fait-on ? », plus de « Voici ce que je te propose » ;
  - un rendez-vous laissé en place faute de place libre ne fait plus prévenir personne ;
  - la carte du retard en trois lignes (« Je préviens Paul de ton retard. Voici le message : », le message, « Je lui envoie ? ») ; l'heure d'arrivée sans zéro devant ;
  - « midi » vaut 12h ; « soir » sans heure demande toujours l'heure.
  - examen : seule la bulle qui répète la carte à l'identique est cachée ; une bulle qui explique un écart (heure déjà prise, date corrigée) reste toujours visible.

## 15/11/2026 : mission 94, messagerie : chercher un contact TimeCool au lieu du crayon

Chef, 15/11 (validé par Charles).
- Plus de crayon ✏️ en haut de « Ma messagerie sécurisée » (il ne faisait qu'ouvrir la page Contacts). « Nouveau groupe » reste dans le menu ⋮.
- La case « Rechercher un contact TimeCool ou une conversation » trouve les conversations (nom, texte) et les contacts TimeCool à qui on n'a pas encore écrit ; un toucher ouvre la conversation (messageContact).
- Sous le titre, à la place de « Confidentielle » : « 🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool. »
- Page vide : « Aucun message pour l’instant. Cherche un contact TimeCool ci-dessus pour lui écrire. »
- Un contact sans TimeCool n'est jamais proposé : « Paul n’a pas encore TimeCool. Tu ne peux pas lui écrire ici. » ; rien ne correspond : « Aucun contact TimeCool à ce nom. »
- API non touchée. Suite verif-messagerie-recherche (nouvelle ; Chrome sur le PC). verifier.sh vert.

## 15/11/2026 : mission 96, Charly en tête de la messagerie, et sa base d'aide

Chef, 15/11 (tranché ; liste de l'adjointe du 15/11, revue et vérifiée dans le code).
- TC_AIDE : 22 questions d'un nouvel utilisateur, chacune avec sa réponse (2 à 4 phrases, chemin exact). Charly y répond seul, sans le modèle, dès qu'on lui pose une question d'aide (« comment… », « c'est quoi… », « où… », « je n'arrive pas à… ») ; une phrase avec un jour ou une heure, ou « je suis malade », n'est jamais prise pour une question d'aide. La réponse passe après les réponses attendues et les salutations, avant tout le reste.
- La page « Aide et commentaires » montre la même liste en tête, puis ses autres questions ; Google, rappels et créneaux libres gardent leur réponse de la page (page: false dans TC_AIDE).
- Ma messagerie sécurisée : « Charly, ton aide TimeCool » toujours en tête (« Une question ? Demande-moi : « Comment changer la langue ? » ») ; ce n'est pas une conversation (ni supprimable, ni archivable, jamais dans les non-lus) ; un toucher ouvre Charly IA, la flèche retour ramène à la messagerie.
- Suite verif-aide-charly (nouvelle ; Chrome sur le PC) ; messagerie-recherche et messagerie-texte connaissent la ligne de Charly. verifier.sh vert.

## 16/11/2026 : mission 97, page administrateur : onglet « Tests »

Chef, 16/11 (validé par Charles : il ne distinguait pas les comptes des testeurs des vrais inscrits).
- Mode Administrateur : un troisième onglet « 🧪 Tests », à droite de « Utilisateurs », même allure. Les trois onglets passent par tcOngletsAdmin (les deux bandeaux écrits à la main sont remplacés) ; ils tiennent sur une ligne à 390, 360 et 320 px (mesuré dans Chrome).
- Compte de test = e-mail finissant par @exemple-timecool.fr : une seule règle, tcEstCompteTest, écrite une seule fois dans la page.
- « Utilisateurs » : les autres comptes seulement ; « N utilisateurs enregistrés » ne compte plus les comptes de test. « Tests » : mêmes cartes, tris et boutons ; titre « Comptes de test », compteur « N comptes de test ». Chaque onglet est numéroté de #1 à #N.
- « Export CSV » exporte la liste de l'onglet ouvert (fichier TimeCool_Comptes_de_test_… pour « Tests »). Actualiser garde l'onglet ouvert.
- Rangement à l'écran seulement : aucun compte modifié, aucun droit changé, API non touchée. Textes en français, comme toute la page administrateur (aucune de ses phrases n'est traduite).
- Suite verif-admin-tests (nouvelle). verifier.sh vert.

## 16/11/2026 : mission 98, page administrateur : robustesse des fiches

Chef, 16/11 (rien ne change à l'écran).
- Carte des comptes (onglets « Utilisateurs » et « Tests ») et export CSV de la page administrateur rendus plus robustes.
- API : inscription et précision de provenance alignées sur les autres champs texte (backend/api/index.php, à déployer).
- Suite verif-admin-champs (nouvelle). verifier.sh vert.

## 16/11/2026 : mission 99, Charly retrouve un contact par son prénom seul

Chef, 16/11 (validé par Charles : « William » ne trouvait rien alors que 8 William sont dans ses contacts).
- Cause : depuis la mission 93, la phrase du bouton « Retrouver un contact » n'attendait plus de nom ; « William » partait au modèle, qui n'a pas le carnet et répondait « je ne trouve pas, je l'ajoute ? », puis proposait un rendez-vous à 0h.
- La phrase du bouton attend de nouveau un nom : la réponse est cherchée sur place (« Je ne trouve pas « X » dans tes contacts. Tu veux l’ajouter ? » si personne).
- Hors bouton, 1 à 3 mots qui sont le nom d'un contact (« William », « william ayache ») montrent les fiches, sans le modèle (tcDetecterNomSeul). Jamais quand une question ou une carte attend, ni avec un chiffre, un petit mot (« super »), un mot de moment ou le titre d'un de ses rendez-vous ; il faut au moins une fiche qui porte le mot en entier (« Will » ne suffit pas).
- Jusqu'à 10 fiches ; au-delà, « Tu as N contacts à ce nom. Voici les 10 premiers : » et le bouton « Voir les N », qui ouvre « Mes contacts » sur ces N fiches exactement. « Lequel ? » se répond de 1 à 10.
- Modèle : la consigne lui dit qu'il n'a pas le carnet (jamais « absent », jamais « je l'ajoute ») et le renvoie vers « Retrouve <son nom> ». Une carte à 00:00 sans heure ni « minuit » dans la phrase devient « À quelle heure ? » (tcCarteMinuitSansHeure). Consigne dans la page (TC_DEFAULT_SYSTEM_PROMPT) : API non touchée.
- Fluidité : carnet de 3 316 contacts, environ 1 ms par message, 2,5 ms avec l'affichage (Chrome).
- Suite verif-charly-nom-seul (nouvelle ; Chrome sur le PC) ; verif-classement-charly suit la nouvelle règle (7 fiches, puis 12 → 10 et « Voir les 12 »). verifier.sh vert, banc-charly vert.

## 16/11/2026 : mission 100, Charly comme une conversation de la messagerie

Chef, 16/11 (validé par Charles : « Je veux faire comme WhatsApp »).
- Toucher « Charly, ton aide TimeCool » ouvre la page de Charly en conversation : en-tête « Charly, ton aide TimeCool » avec la flèche retour et l'avatar, bulles, case d'écriture et bouton d'envoi en bas ; sans les deux rangées de boutons ni « Recommencer » (classe tc-charly-conv). Ouverte autrement (menu, boutons), la page de Charly ne change pas.
- Même moteur, même fil : les réponses d'aide (mission 96), les fiches, les cartes et leurs boutons marchent comme sur la page ; une seule histoire avec Charly (charlyIA.history, gardée sur l'appareil, les 10 derniers messages comme avant). Une flèche retour depuis une fiche ramène à la conversation, puis à la messagerie.
- La ligne reste en tête de la messagerie ; son aperçu montre le dernier message (sans carte ni balise ; l'accueil automatique ne compte pas), sinon la phrase de la mission 96. Conversation vide : cette même phrase.
- API non touchée. Suite verif-charly-conversation (nouvelle ; Chrome sur le PC). verifier.sh vert.

## 16/11/2026 : mission 101, l'histoire avec Charly garde 100 messages

Chef, 16/11 (Charles : « comme WhatsApp »). Rien ne change à l'écran.
- L'appareil garde les 100 derniers messages avec Charly (TC_CHARLY_HISTORIQUE_MAX, 10 avant) ; le modèle n'en lit que les 10 derniers (TC_CHARLY_MODELE_MAX, dans tcHistoriquePourIA ; les bulles d'application ne comptent pas). Avant, il lisait toute la conversation de la session.
- La limite de 50 messages par session ne compte plus les messages relus de l'appareil (marque _relu, jamais enregistrée) : sinon, avec 100 messages gardés, Charly aurait refusé d'écrire dès l'ouverture.
- Fluidité : 100 messages avec fiches et cartes, 3 316 contacts : la conversation se dessine en 2 à 10 ms (Chrome, temps réel, comme avec 10 messages).
- Remarque de la 100 : la pile des écrans retient l'allure de la page de Charly (_tcPileConv) ; page de Charly → messagerie → ligne → flèche → flèche rend la page d'origine.
- Remarque de la 99 : tcDetecterNomSeul cherche les contacts avant de parcourir les rendez-vous (même résultat).
- Suites : verif-historique-charly (100 gardés, 10 au modèle, limite) et verif-charly-conversation (double retour, 100 messages) ; échouent sur la page d'avant. verifier.sh vert.
- Examen (EXAMINATEUR) : couper à 10 cassait la création d'agenda par la checklist (CAS 2B : questions une par une, puis une seule carte). Désormais un fil en cours n'est jamais coupé (tcDebutFilPourIA) : la demande guidée (« vie quotidienne », « Pose-moi les questions ») et sa suite partent tant qu'aucune carte [AGENDA] n'a suivi ; une réponse à une question de Charly part avec la question, en remontant le fil. Cas ajoutés à verif-historique-charly.
- 2e examen : la remontée n'avait pas de borne (100 réponses « Autre chose ? » faisaient tout partir ; une checklist abandonnée rouvrait 80 messages). Désormais : jamais plus de 30 messages (TC_CHARLY_FIL_MAX) ; la demande guidée ne compte que dans ces 30 ; on ne remonte que sur une question qui attend (nature 'question'), jamais sur un simple « ? », et jamais dans une session passée (_relu). Cas ajoutés.

## 16/11/2026 : mission 102, « Charly, ton aide TimeCool » devient une conversation indépendante (hotline)

Chef, 16/11 (Charles : « une messagerie indépendante de la page charly … comme le fait WhatsApp … qui pourrait servir de hotline » ; « un fond bleu ciel »). Corrige le choix « un seul fil » de la 100.
- La ligne ouvre l'écran de conversation de la messagerie (page-conv), comme avec un contact. Son fil à elle : clé timecool_charly_aide (nouvelle : rien de l'histoire de la page Charly IA n'y apparaît, même pour qui a ouvert la ligne depuis la 100). Vide : la phrase de la 96.
- Hotline : réponses de la base d'aide (96) d'abord, sans le modèle ; demande d'agenda (créer, décaler, annuler, retard, malade, contact, jour ou heure cités, hors question « comment… ») : « Pour ton agenda, va sur la page Charly IA. » et le bouton « Ouvrir Charly IA » ; sinon le modèle, avec la consigne tcConsigneConvCharly (base d'aide en référence ; [PAGE_CHARLY] et [JE_NE_SAIS_PAS] deviennent nos phrases ; une carte écrite par le modèle devient la phrase et le bouton, jamais une carte).
- 100 messages gardés, les 10 derniers au modèle ; même limite de 50 envois par session que la page. La page Charly IA garde ses réglages de la 101.
- Ligne sur fond bleu ciel (#cdeafc ; #b9dff7 en sombre, où les lignes de la messagerie restent claires), toujours en tête ; aperçu = dernier message de cette conversation.
- La page Charly IA redevient celle d'avant la 100 (plus de mode « conversation », plus de pile qui retient son allure).
- Suites : verif-charly-conversation réécrite (Chrome sur le PC ; échoue sur la page d'avant), verif-aide-charly suit la nouvelle ouverture. verifier.sh vert.
- Examen (EXAMINATEUR) : le ménage du compte vide aussi le fil d'aide en mémoire (sinon le compte suivant le récupérait, comme en campagne 10) ; une vraie question sur l'appli (« Ça sert à quoi la fiche contact ? », « TimeCool marche le dimanche ? ») va au modèle : seule une demande d'action (ajoute, annule, décale…), un jour ou une heure sans « ? », ou « je suis malade » va à la page Charly IA. Contrôles ajoutés.

## 16/11/2026 : mission 103, onglet « Tests » de la page administrateur complété

Chef, 16/11 (validé par Charles : il voyait encore des comptes de test dans « Utilisateurs »).
- Règle (tcEstCompteTest, un seul endroit) : e-mail en @exemple-timecool.fr, @exemple-test.fr ou @exemple-timecool.test (base, lecture seule : 10 + 5 « TestTrad » + 5 « Testeur Jetable »), ou compte rangé à la main.
- Rangement à la main, côté serveur pour tous les administrateurs : colonne comptes.range_tests_le (migration 020, rejouable, à jouer par le chef), route POST /admin/ranger-tests (administrateurs seulement ; 503 « migration_manquante » tant que la colonne n'existe pas ; ne touche que range_tests_le). GET /admin/utilisateurs rend range_tests_le (NULL avant la migration, sans erreur).
- Fiche de « Utilisateurs » : bouton « 🧪 Ranger dans Tests » sous la rangée Bloquer / Supprimer (inchangée) ; dans « Tests », « ↩️ Remettre dans Utilisateurs » pour un compte rangé à la main, rien pour un compte reconnu par son adresse. Pas de bouton sur sa propre fiche. Référence nettoyée (mission 98).
- Classement d'affichage : aucun droit, aucune donnée du compte, ni la purge (scripts/purger-comptes-test.sh ne lit que l'adresse) ni comptes-test-a-garder.txt ne changent. Compteurs, tris, export CSV suivent l'onglet (97).
- Suite verif-admin-ranger-tests (nouvelle, page + API + migration ; échoue sur la version d'avant). verifier.sh vert.

## 16/11/2026 : mission 104, le manuel branché sur la hotline « Charly, ton aide TimeCool »

Chef, 16/11 (validé par Charles : « répondre à toutes les questions techniques » ; essais de 13h : « Salut comment ca va ? » → « Je ne sais pas encore répondre », une question sur le mot d'excuse renvoyée à tort vers Charly IA).
- Fiche de l'adjointe (MANUEL-UTILISATEUR/hotline, 278 questions) relue dans le code : 154 entrées à vérifier → 113 gardées, 40 corrigées, 1 exclue (où sont gardées les données, gardé pour Charles) ; ajout « lien public » (« Cette fonction n'existe pas dans TimeCool. ») ; vocabulaire calme appliqué.
- La fiche vit dans la page, en bloc de données (script type application/json, 124 Ko, ~36 Ko compressés), jamais lue au chargement : tcFicheHotline() la lit à la première question (31 ms), une recherche prend 0,13 ms.
- Ordre de la hotline : politesses (tcSocialHotline : réponse courte puis « Pose-moi ta question sur TimeCool. ») → base d'aide (96) → vraie demande d'action → question écrite comme dans la fiche (tcReponseDirecteHotline, sans le modèle) → modèle avec les 12 entrées les plus proches (tcChercherFicheHotline).
- Renvoi vers Charly IA (tcDemandeAgendaConvCharly) : impératif (« Annule… », « Préviens… »), demande polie (« Peux-tu décaler… »), « je suis malade », ou un rendez-vous et un moment (« Dentiste demain à 15h ») ; une question ou un infinitif seul (« Créer un compte ») reçoit une réponse.
- Réponse « photo » de la base d'aide corrigée : Charly ne lit pas encore les photos (ce que fait le code).
- API (remarques de l'examen de la 103) : POST /admin/ranger-tests répond ok quand l'état voulu est déjà là ; apostrophe du message 503 ; commentaire Twilio remis à sa place.
- Banc des 100 questions d'essai, vrai modèle, copie de la page (compte de test) : 100/100 avec la fiche (16/100 avant ; 85/100 si tout passe par le modèle ; jugé sur les 5 critères de l adjointe). Fichiers du banc : m71/m104 sur le PC du CODEUR.
- Suites : verif-hotline-manuel (nouvelle, échoue sur la page d'avant), verif-charly-conversation complétée. verifier.sh vert.
- Examen (EXAMINATEUR) et réponses du chef : une phrase négative (« Ça va pas », « Pas top ») reçoit « Mince. Dis-moi ce qui ne va pas avec TimeCool, je t’aide. », jamais une réponse gaie ; une demande polie (« Tu peux… ? ») ne va à Charly IA que pour un rendez-vous ou un moment (« Tu peux supprimer mon compte ? » reçoit le chemin dans Paramètres) ; « je ne vois plus… » est une question ; prix : « Oui, TimeCool est gratuit. Aucune carte bancaire ne te sera demandée. » (mots du site).

## 16/11/2026 : mission 105, la hotline plus polie et cinq exemples au premier message

Chef, 16/11 (validé par Charles après son essai : « Ca va » recevait « Très bien, merci ! 😊 Pose-moi ta question sur TimeCool. »). Textes validés mot pour mot.
- « Ça va ? », « comment ça va ? », « salut ça va », « tu vas bien ? » : « Très bien, merci Charles ! 😊 Et toi, ça va ? » (prénom du compte ; sans prénom, sans lui). Le message porte cava:true ; la réponse suivante seulement positive (« oui », « bien », « super », « pas mal »…) reçoit « Tant mieux ! Pose-moi ta question sur TimeCool. », seulement négative (« non », « bof », « pas du tout »…) la phrase de la 104 ; une question ou une demande suit le traitement normal (tcReponseCavaHotline).
- Au premier message du fil, après la réponse, une seule fois : « Je peux t’expliquer comment faire dans TimeCool. Par exemple : » et cinq boutons (changer la langue, régler tes notifications, ajouter un contact, changer le message envoyé en cas de retard, relier ton agenda Google). Toucher un bouton pose la question, répondue par la fiche sans le modèle (phrases ajoutées aux entrées Q2.7, Q10.12, Q5.2, Q10.5, Q8.10 ; chemin ajouté à Q10.12 et Q5.2). Marque timecool_charly_aide_exemples (effacée au ménage du compte) : un compte qui a déjà un fil les reçoit à son prochain message. Les exemples ne comptent ni pour l'aperçu de la ligne ni pour le modèle.
- « Ok super merci » : « Avec plaisir ! 😊 » sans le modèle (les politesses qui se touchent sont toutes retirées).
- Consigne du modèle : « prendre rendez-vous directement », avec ces mots-là (au banc, le modèle avait repris « réserver seul » d une question).
- Banc des 100 questions d'essai, vrai modèle : 100/100 maintenu (95 réponses de la fiche, 4 politesses, 1 du modèle ; 2 réponses changées, toutes justes).
- Suites : verif-hotline-manuel et verif-charly-conversation complétées (échouent sur la page d'avant). verifier.sh vert.

## 17/11/2026 : mission 106, l'accueil de Charly au milieu de la page, avec six exemples

Chef, 17/11 (ok de Charles, textes validés mot pour mot). Avant : une bulle d'une seule ligne en haut à gauche, coupée à droite sur PC.
- Accueil en dix lignes : « Bonjour Charles ! 😊 » (Bonsoir après 18h, comme avant ; sans prénom, sans lui), « Je suis Charly, ton assistant TimeCool. », « Je peux t’aider à organiser ton agenda, gérer tes rappels et bien plus encore. », « Par exemple, écris-moi ou dis-moi ci-dessous : », puis les six exemples entre guillemets, l'un sous l'autre (TC_CHARLY_ACCUEIL_LIGNES, TC_CHARLY_ACCUEIL_EXEMPLES, tcMessageAccueilCharly).
- Tant que la conversation est vide ou n'a que l'accueil : au milieu de la zone (horizontalement et verticalement), largeur bornée à 560 px, retour à la ligne (tcRendreAccueilCharly). Après le premier message : le même texte dans une bulle de Charly, en tête ; jamais lu comme une proposition (15h, 16h).
- Un compte qui n'a que l'ancien accueil d'une ligne reçoit le nouveau au prochain affichage. « Recommencer » montre le même accueil (dessiné, pas rangé).
- Exemples en texte simple, non touchables (choix par défaut du chef ; les rendre touchables : une ligne, comme tcExempleHotline).
- Langues : texte de l'app (appText) traduit par Google ligne par ligne, au même endroit qu'avant (tcSyncCharlyGreeting), mis en cache ligne par ligne ; jamais envoyé au modèle.
- Correction liée : « Crée-moi un nouveau rendez-vous demain à 15h chez mon dentiste » donnait le titre « Nouveau dentiste » ; « nouveau / nouvel / autre » juste devant « rendez-vous » ou « rdv » ne compte plus dans le titre (tcTitreDepuisDemande) : « Dentiste », comme l'exemple d'avant.
- Suites : verif-accueil-charly (nouvelle, échoue sur la page d'avant) ; verif-prenom-charly, verif-historique-charly, verif-rdv-groupe et verif-charly-campagne10 suivent le nouvel accueil. verifier.sh vert. Captures PC et 390 px : m71\captures106.

## 17/11/2026 : mission 107a, « Voir la démonstration » sur l'accueil de Charly IA

Chef, 17/11 (ok de Charles ; découpage 107a / 107b / 107c accepté). Captiver un nouvel inscrit dès la première minute, avec le vrai moteur de Charly sur des données d'exemple.
- Accueil (même mise en page que la 106) : bonjour, trois lignes, un seul exemple (« Crée-moi un nouveau rendez-vous demain à 15h chez mon dentiste »), puis « Tu veux voir tout ce dont je suis capable ? », « Je te montre avec un agenda d’exemple et des contacts d’exemple. » et le bouton « Voir la démonstration ». Un accueil d'avant, seul, est remplacé (v: 107).
- Démonstration (bac à sable dans la page, tcOuvrirDemo / tcQuitterDemo) : bandeau fixe « 🎬 Démonstration » + « Quitter ». À l'entrée, les vraies données en mémoire sont mises de côté (agenda, contacts, conversation de Charly, messages, hotline, tâches, anniversaires) ; données d'exemple fabriquées à ce moment-là (rien au chargement) : six contacts Virtuel(le) (06 39 98 00 0x, @exemple-timecool.fr ; Julien sans TimeCool), agenda placé par rapport au jour (café +1h, coiffeur et déjeuner demain, réunion 10h et sport 18h vendredi, repas dimanche ; dimanche : le suivant), un agenda par contact.
- Isolation : Storage.prototype patché (écritures dans une copie en mémoire ; lecture : la copie, ou une poignée de réglages d'affichage, jamais une donnée) ; fetch refuse tout ; TC_BACKEND remplacé (créneaux communs et confirmation lus dans les agendas d'exemple, comme creneauxCommuns de l'API ; tout autre appel répond « fait » sans rien envoyer) ; tcSyncBientot, tcSyncTour, tcProgrammerRappels, tcOuvrirAilleurs neutres ; le modèle n'est pas appelé (callAI répond « Dans la démonstration, je te montre ces phrases. Touche-en une : » et les phrases). Page rechargée ou appli tuée : rien n'a été écrit, tout revient. Les textes sont traduits d'avance (avant de couper le réseau).
- Deux phrases (107a) : « Demande un rendez-vous demain à mon ami Michel » (« Michel a TimeCool : je regarde vos créneaux communs, sans lui écrire. », téléphone / en personne / visio, 16h, 17h, 18h demain, « C’est calé. Regarde dans l’agenda. » + « Voir l’agenda ») et « Quand suis-je libre ce vendredi ? ». Après chaque phrase, celles qui restent ; à la fin « Tu as tout vu. ». « Quitter » : « Pour le faire avec tes vrais amis, importe tes contacts. » + « Importer mes contacts » ; la démonstration se rouvre depuis l'accueil.
- Vraie vie aussi : « Demande un rendez-vous [moment] à [un contact qui a TimeCool] » prend le chemin de « demande à Hugo quand il est dispo » (mission 65), avec la période jusqu'au serveur (depuis, jusqua, trois créneaux le même jour) ; un autre contact, plusieurs ou aucun : le chemin d'avant.
- Suites : verif-demo-charly (nouvelle ; vm + Chrome : jouée puis page rechargée en pleine démonstration, stockage identique octet pour octet, aucun appel réseau) ; verif-accueil-charly, verif-type-rdv, verif-historique-charly, verif-rdv-groupe suivent. verifier.sh vert. Captures : m71\captures107.
- Examen 107a : se déconnecter, supprimer son compte, l écran de connexion ou une autre page (hors Charly, agenda, contacts) ferment d abord la démonstration ; « Quitter » et ces gestes attendent la fin du message en cours (compteur occupe, tcDemoAttendre / tcDemoLibere) ; bouton grisé avec ⏳ pendant la traduction. verif-demo-charly : 54 contrôles.

## 17/11/2026 : mission 107b, les cinq phrases de la démonstration

Chef, 17/11 (suite de la 107a, publiée en v2.0.433).
- Les cinq phrases, dans l'ordre du chef : Michel demain, le retard de Paul, vendredi, Alice-Chloé-Virginie, malade demain.
- « Préviens Paul que j’aurai 10 minutes de retard » : le café est relié au contact d'exemple (champ contact, comme un vrai rendez-vous ; le déjeuner à Michel) ; le message relu part dans la messagerie d'exemple ; Paul répond tout seul une seconde après (« Pas de souci, à tout à l’heure ! », dans sa conversation et « Paul a répondu : … » chez Charly).
- « Trouve un rendez-vous commun avec Alice, Chloé et Virginie » : les trois agendas d'exemple lus (créneaux où tout le monde est libre), puis dans l'agenda.
- « Je suis malade, décale ma journée de demain » : le coiffeur est déplacé, le déjeuner est proposé à Michel (créneaux libres chez lui, propositionLibres), Michel choisit tout seul le premier créneau libre (propositionCreer, relève par tcSuivrePropositions), « Oui, place-le » le déplace.
- Serveur d'exemple : envoyerMessage, propositionLibres, propositionCreer, propositions, propositionTraiter, propositionMaintenir ; estConnecte vrai pendant la démonstration (la relève des réponses en dépend). Une réponse ne s'écrit que si la démonstration est encore ouverte.
- Les phrases reviennent après chaque scène : boutons du questionnaire et de la réponse d'un contact suivis comme les envois ; une réponse de contact attendue fait patienter ; seuls les derniers boutons restent ; une phrase tapée ou dictée compte comme touchée.
- Suite verif-demo-charly : 64 contrôles (vm + Chrome : les cinq phrases jouées jusqu'au bout, puis page rechargée en pleine démonstration). verifier.sh vert. Captures : m71\captures107b.
- Examen 107b : le rendez-vous pris avec une seule personne dans la démonstration lui est relié (contact) ; Alice, Chloé et Virginie prises toute la journée de demain, le rendez-vous à plusieurs tombe après. « Malade » ne dit plus « personne à prévenir » que pour le coiffeur. Dans la vraie vie, les invités d un rendez-vous à plusieurs : mission 107d. verif-demo-charly : 66 contrôles.
- Examen 107b (2) : les phrases attendent toute carte encore ouverte depuis le dernier geste et toute proposition d exemple pas encore tranchée (relevée tout de suite, trois fois au plus par geste) ; jamais deux fois les phrases sans nouveau geste. Un seul « Tu as tout vu » (contrôle Chrome). verif-demo-charly : 67 contrôles.

## 17/11/2026 : mission 107d, « malade » prévient les invités d un rendez-vous à plusieurs

Chef, 17/11 (objectif de Charles : les six phrases de TikTok marchent pour de vrai).
- API : /rdv/groupe/confirmer et la convocation confirmée posent « invites » (référence, prénom) dans le rendez-vous de chacun : l organisateur a tous les invités, chaque invité a l organisateur et les autres. Pas de migration (contenu JSON de l élément). Les rendez-vous à plusieurs d avant n ont pas ce champ : ils restent « personne à prévenir ».
- Page : tcContactsDuRdv (fiche du carnet par référence, sinon prénom et référence, joignable par la messagerie), tcEstRdvAPlusieurs, tcPrenomsInvites. Questionnaire (malade, imprévu) : les invités comptent ; décaler : le rendez-vous à plusieurs reste à sa place, chaque invité reçoit « À cause d un imprévu, je dois décaler notre rendez-vous du … Je reviens vers toi très vite avec un autre moment. », le bilan propose « Trouve un rendez-vous commun avec … » ; annuler et le retard : leurs messages habituels à chaque invité. Démonstration : le rendez-vous à plusieurs d exemple porte ses invités.
- Suite verif-invites-groupe (API, vm, Chrome : décaler et annuler). 14 suites ajoutent les nouvelles fonctions à leur liste d extraction. verifier.sh vert. Captures : m71\captures107d.

## 17/11/2026 : mission 107c, l avion en papier

Chef, 17/11, précisions de Charles sur la capture du retard de Paul (« comme ça on ne comprend pas bien ce que fait Charly IA »).
- tcAvionPapier({ sens, noms, quoi }) : un bandeau au-dessus de la barre de saisie, sur toute la largeur de la zone de conversation : pastille de Charly, rond aux initiales (+N pour plusieurs), piste en pointillés, avion (SVG) qui vole en arc ; dessous « Message envoyé à Paul » / « Demande envoyée à Michel » / « Paul répond… » / « … répondent… ». Les vols se suivent (file), jamais deux à la fois ; hors de la page Charly IA : pas de vol. pointer-events:none ; prefers-reduced-motion : le texte seul.
- Durées : TC_AVION_DUREES = { demo: 5000, vrai: 2000 } (Charles : 5 s dans la démonstration ; le chef : 2 s en vrai).
- Aller : questionnaire (retard, malade, imprévu) avant « C est fait », vers les personnes prévenues par la messagerie et celles à qui Charly propose ; lecture des agendas (Michel, à plusieurs) pendant la demande, puis retour avec les créneaux. Retour : démonstration avant « X a répondu » ; vraie vie avant « X a choisi … » quand on est sur la page (pas dans la démonstration, qui joue le sien). « Quitter » retire l avion.
- Suite verif-avion-papier (Chrome : ordre aller, C est fait, retour, réponse ; 5 s ; largeur ; doigt ; Quitter en vol ; 2 s en vrai ; réduire les animations). verif-demo-charly fait voler l avion vite. verifier.sh vert. Captures : m71\captures107c.
- Décision du chef (107c) : sur les créneaux communs, personne n est écrit : l avion dit « Je demande à l agenda de Michel » / « Je demande aux agendas d Alice, Chloé et Virginie », puis « L agenda de Michel a répondu » / « Les agendas ont répondu » (mots de Charles), et ne vole que dans la démonstration ; en vrai, la recherche reste immédiate. verif-avion-papier : 16 contrôles.

## 17/11/2026 : mission 108, plus d avion, la bulle d attente dit ce que Charly fait

Chef, 17/11 (Charles, après essai : l avion « complètement nul »).
- Retiré : tcAvionPapier, son bandeau, TC_AVION_DUREES, la suite verif-avion-papier.
- La bulle d attente (tcMajAttenteCharly) et le sous-titre disent l action réelle (tcTexteAttente) : agenda (« Charly cherche dans ton agenda… », consultation et recherche d un rendez-vous), agenda d un contact (« Charly regarde l’agenda de Michel… » / « les agendas… », créneaux communs), envoi (« Charly envoie à Paul… », questionnaire : seulement ceux qui reçoivent vraiment par la messagerie TimeCool), réponse (« Paul répond… », démonstration et propositions en vrai sur la page), rangement (« Charly range ton agenda… » : questionnaire qui déplace ou supprime, rendez-vous à plusieurs qui s inscrit), sinon « Charly cherche… » ; avant le modèle, deviné d après la phrase (tcDevinerAttente : agenda ou contacts, jamais « envoie »). Plus de « réfléchit » (le toast dit « Charly cherche déjà… »).
- Envoi / réponse : trois petites feuilles grises glissent dans la bulle (gauche → droite, droite → gauche) à la place des quatre points ; même hauteur de bulle ; prefers-reduced-motion : le texte seul.
- Étapes : tcEtapeAttente / tcFinEtapes, au moins TC_ATTENTE_DUREES = { demo: 1500, vrai: 1000 } par étape ; filet de 30 s. Ordre gardé : envoi, « C est fait », réponse (la réponse d exemple attend la fin de la scène). Textes de l appli traduits par le cache (tcTexteAppTraduit). Appels protégés par typeof (suites qui extraient les fonctions seules).
- Création d un rendez-vous par la carte « Ajouter » : instantanée, pas de bulle (rien à attendre).
- Suites : verif-bulle-attente (nouvelle) ; verif-demo-charly, verif-invites-groupe, verif-attente-charly suivent. verifier.sh vert. Captures : m71\captures108.

## 17/11/2026 — Mission 109 : les feuilles de la bulle d'attente se voient (CODEUR)

- Constat de Charles (PC, démonstration, « Préviens Paul… ») : aucune feuille vue (9 × 7 px, gris pâle, 1,5 s, cachées avec « Réduire les animations »).
- Feuilles de papier 14 × 18 px, contour bleu TimeCool, trois lignes et un coin plié ; elles glissent sur 82 px dans une zone de 96 × 22 px, toujours dans la même bulle. La zone d'animation a toujours 22 px de haut : la bulle ne saute pas quand les points deviennent des feuilles (elle passe de 62 à 66 px de haut).
- TC_ATTENTE_DUREES = { demo: 1500, vrai: 1000, feuilles: 5000 } : une étape à feuilles (envoi, réponse) dure 5 s, dans la démonstration et en vrai ; les autres étapes ne changent pas.
- « Réduire les animations » : les feuilles restent, immobiles, avec une flèche bleue → (envoi) ou ← (réponse).
- Suites : verif-bulle-attente refaite (24 contrôles, film de la bulle à 390 et 1280 sur retard et malade, 5 s mesurées, vrai, calme) ; verif-demo-charly (feuilles: 150) et verif-invites-groupe (attente 7 s) adaptées. Captures : m71/captures109.

## 17/11/2026 — Mission 110 : les six phrases de TikTok aboutissent, tapées mot pour mot (CODEUR)

- Cause (Michel) : une carte proposée (vendredi) attendait encore. tcDemanderRdvContact107 passe avant l'abandon de la carte et se retirait (tcUneReponseAttendueM64). La phrase partait donc au modèle ; dans la démonstration, le modèle est remplacé par simulateDemoReply (vieux « mode démo »), d'où « Quel type de professionnel ? ».
- Corrigé : tcUneReponseAttendueM64(sansCartes) ; la carte ou le conflit tombe (tcLaisserTomberCarte110), puis les créneaux communs. Contact introuvable : « Je m'en occupe. Je ne trouve pas Michel dans tes contacts. » avec le bouton « Ajouter Michel ». Démonstration : plus jamais simulateDemoReply (le modèle neutralisé, les phrases de la démonstration) ; simulateDemoReply ne parle plus de professionnel quand un contact est nommé.
- Les cinq autres phrases, essayées aussi : « Saisis dans mon agenda : … » donnait le titre « Saisis agenda dentiste » (→ « Dentiste ») ; « mardi à 15h » dit un mardi après 15h proposait mercredi (→ le mardi suivant, seulement pour créer : tcDateDemandee(…, { suivantSiPasse })) ; « … cette semaine, … après le boulot » proposait 8h (→ option des = 18 de la page au serveur, période de la phrase ; personne de libre le soir : les autres créneaux, et Charly le dit) ; « malade … demain, d'après-demain ou de cette semaine » décalait après-demain (→ « pour quand ? » avec ces trois moments ; période « semaine » ajoutée).
- Ajout (Charles, 16h42) : dans la démonstration, chaque étape de la bulle dure 5 s (TC_ATTENTE_DUREES.demo = 5000), « vendredi » compris ; en vrai, rien ne change.
- API : /rdv/groupe/proposer accepte des (8 à 19). À déployer.
- Suites : verif-phrases-tiktok (nouvelle, 34 contrôles : six phrases tapées, seules et après une carte en cours, démonstration et vrai) ; verif-type-rdv-e2e (des) ; verif-bulle-attente, verif-confiance-charly, verif-nouveau-rdv, verif-rdv-groupe, verif-charly-campagne10 adaptées. Essai en vrai sur l'API d'essai avec six comptes neufs : les six aboutissent (Dentiste, Michel calé, Paul prévenu, vendredi, Alice/Chloé/Virginie à 18h, malade décalé).
- Examen : le cas « contact introuvable » ne vaut que pour une personne (lien ou majuscule) ; « avec mon dentiste demain 15h », « à la mairie », « avec le dentiste » reprennent leur chemin d avant (tcRessembleAUnePersonne110).

## 17/11/2026 — Mission 111 : « Voir dans mon agenda », le doigt, « RDV … », le bandeau et les feuilles en couleurs (CODEUR)

- « Voir dans mon agenda » sous la réponse de Charly qui crée, décale ou modifie un rendez-vous. À chaque geste dans la conversation (phrase envoyée, bouton touché), l'agenda est photographié (tcGesteCharly111) ; ce qui est ensuite créé ou déplacé (tcSuivreRdvBouges, à l'enregistrement et à chaque affichage) va à la réponse qui l'annonce (tcAttacherVoir111 : « C'est noté / fait / calé », carte à plusieurs faite, bilan). Annulé ou supprimé : pas de bouton.
- Le bouton ouvre la Semaine au bon jour, la case à l'écran ; un doigt 👉 clignote collé à gauche TC_VOIR_AGENDA_MS = 5000 ; les autres rendez-vous bougés : contour bleu doux, même temps ; « Réduire les animations » : doigt fixe. Les cases de la semaine portent data-ev-id. La semaine dessine à l'image suivante : le doigt attend la case (dix essais).
- Titres « RDV … » (serveur : /rdv/groupe/confirmer, /convocations/confirmer, /rdv/choisir, /rdv/proposer-creneau, /rdv/lien/choix ; démonstration) ; motif dit dans la phrase (« pour aller boire un verre ») après « : ». « Repas de famille » devient « RDV famille ». Les rendez-vous déjà écrits ne changent pas.
- Bandeau « Démonstration » : sur la page Charly, juste au-dessus de la conversation (hors de la zone qui défile) ; ailleurs, sous l'en-tête. Placé par la vraie navigate (la surcharge vers la ligne 10871 ; la fonction d'origine n'est jamais appelée).
- Feuilles de la bulle : quatre, bleu, rouge, jaune, vert du logo en pastel (fond pastel, contour plus soutenu).
- Suites : verif-voir-agenda (nouvelle, 27 contrôles, PC et 390, calme) ; verif-bulle-attente (couleurs) ; verif-demo-charly, verif-type-rdv, verif-qui-ecrit, verif-rdv-e2e, verif-validation-rdv-e2e adaptées. Essai en vrai (API d'essai, comptes neufs) : bouton sous chaque création et décalage ; « RDV Michel », « RDV Alice, Chloé, Virginie : boire un verre » (« RDV Charlotte Essai, Chloé, Virginie : … » chez Alice). Captures : m71/captures111.
- Examen : un moment après « pour » (mardi, 18h, une heure, le 25, la fin du mois) n est pas un motif (tcMotifEstUnMoment111).

## 17/11/2026 — Mission 112 : la pastille « Démonstration » (CODEUR)

- Plus de bande jaune : une pastille bleu roi #1a47d6 centrée (texte blanc, « Quitter » blanc à texte bleu, ombre légère), fond transparent autour, même place qu en 111. verif-voir-agenda vérifie couleurs, taille et centrage (PC, 390). Captures : m71/captures112.

## 17/11/2026 — Mission 113 : Charly dit chaque agenda qu il consulte (CODEUR)

- tcEtapesConsultation113 : une étape « Charly consulte les préférences et les disponibilités d’Alice… » par personne (prénom, élision), puis « Charly compare les agendas… » (deux ou plus) ; TC_ATTENTE_DUREES.consulte = 3000 en démonstration, 1 s en vrai (tcEtapeAttente prend une durée). La demande au serveur part avant les étapes (tcProposerRdvGroupe, tcNouveauRdvCommuns) ; malade et décalage : tcCreneauxDuLot et tcCreneauxReproposesPour. Phrase de la conversation alignée. Suites : verif-bulle-attente (32), verif-demo-charly, verif-phrases-tiktok, verif-voir-agenda adaptées. Captures : m71/captures113.

## 17/11/2026 — Mission 114 : la conversation de la démonstration en colonne centrée (CODEUR)

- #charlyChatBody.tc-conv-colonne : marges max(12px, (100% - 700px)/2) (passent devant le style en ligne) ; tcMajColonneConversation à chaque affichage, réglage TC_CONV_COLONNE { demo: true, vrai: false }. Sous 700 px : 12 px comme avant. Suite verif-colonne-conversation (1920, 1366, téléphone). Captures : m71/captures114.

## 17/11/2026 — Mission 115 : les bulles de Charly à la taille de leur texte (CODEUR)

- .tc-bulle-col sur les deux gabarits (tcBulleCharly, réponse de Charly) : flex 0 1 auto, max-width --tc-bulle-max (85% téléphone, 80% au PC) ; tc-bulle-large (carte proposée) : largeur d avant (100% - 50 px) ; boutons 44 px au moins. TC_CONV_COLONNE.vrai = true (choix du chef). Premier essai : la carte large à 100% - 40 px et min-width:0 faisaient sortir « Recommencer » au téléphone : corrigé. Suite verif-colonne-conversation (34). Captures : m71/captures115.

## 17/11/2026 — Mission 116 : la bulle du choix touché (CODEUR)

- Écouteur de clics (capture) de #charlyChatBody : tcNoterChoix116 retient le libellé (tcLibelleChoix116, sans chiffre ni icône) d un bouton DANS une bulle de Charly (.tc-bulle-col) ; juste après (setTimeout 0), tcBulleDuChoix116 insère { role: user, _choix: true } à la place du geste, sauf si le chemin a déjà écrit une bulle utilisateur ou si la conversation a changé. Exclus : Voir dans mon agenda, accueil, Modifier, Recommencer, Quitter. Suite verif-bulle-choix. Captures : m71/captures116.
- Examen : carte de conflit (hors bulle) avec ses bulles ; tcDesignationPour, tcTypeDeProposition, tcEstUneCorrection et le repérage des sujets sautent les bulles _choix.

## 17/11/2026 — Mission 117 : « Et apres demain ? », phrases de Charles rejouées (CODEUR)

- Entrée normalisée (tcNormaliserMoments117) : après-demain, avant-hier, week-end, qu'est-ce que, rendez-vous, aujourd'hui en une seule écriture ; « et », « stp », « svp » devant ôtés ; « le lendemain » après une question sur un jour ; « ce soir » = aujourd'hui dans une question sur l'agenda seulement.
- Compris en plus : hier, avant-hier, ce week-end (dates), « lundi en huit » ; la réponse dit la date d'un jour seul ; passé au passé.
- Plus de « bientôt » pour la photo et le PDF scanné ; bouton périmé sans bulle orpheline.
- Garde-fou : phrases-charles.txt (35 phrases) + verif-phrases-charles (206 essais, moteur local), dans verifier.sh. Page d'avant : 79 échecs dont 42 par le modèle ; maintenant 0.
- À savoir : verif-demo-charly (malade) et verif-bulle-attente (malade) échouent après 22h, déjà sur la page publiée 116 : défaut d'heure, hors 117.

## 17/11/2026 (soir) — Mission 117, renvoi de l'EXAMINATEUR (CODEUR)

- Corrigé : un mot qui répond à une question de Charly n'est plus une consultation ; « Et toi ? » garde son « et » ; « le week-end du 28 novembre » = 28 et 29. Cas ajoutés à phrases-charles.txt (40 phrases, 228 essais).
- Le serveur a maintenant un Chrome sans tête (~/outils-tc, installer-chrome-serveur.sh, sans root) : les 18 suites à navigateur de verifier.sh y jouent pour de bon ; « non joué » ou « 0 vérification » = ÉCHEC.
- Le serveur joue la vraie largeur du téléphone (390 px) ; seuil de la « petite bulle » passé de 75 % à 90 % du rang.
- Le soir, deux suites de la démonstration (malade) regardaient trop tôt (Paul puis Michel) : elles attendent la carte.
- Hors 117, à signaler : « Qu'est-ce que j'ai le 25 novembre ? » (« libre sur cette période ») et « mercredi 25 novembre » (lu comme ce mercredi) ; « j'avais lundi » lu au présent.

## 18/11/2026 (nuit) — Mission 118 : avec qui et où (CODEUR)

- Fiche : « Avec » = tous les invités ; lieu de la phrase gardé (fiche, invités via /rdv/groupe/confirmer) et rappelé (📍).
- Démonstration : adresses d'exemple à Paris ; trajet d'exemple par le bouton « Combien de temps ? » de la fiche (le vrai calcule en voiture à la demande ; rien n'est calculé tout seul, ni en vrai ni en démonstration).
- Doigt : 18 px, fixe, s'en va au toucher / changement de vue / sortie ; 👇 puis 👈 si la place est prise.
- Boutons du haut : bulle de l'utilisateur.
- Préalables : dates écrites et passé dans la consultation ; verif-phrases-boutons sans heure rouge ; petite bulle à 0,75.
- Non couvert : e2e-rdv-groupe (hors verifier.sh) ne trouve plus de créneau depuis la fin des disponibilités par défaut ; le lieu côté API est vérifié par lecture et php -l. « Café avec Paul demain à 10h » part au modèle (avant 118 aussi).

## 18/11/2026 (nuit) — Mission 119 : Maya, l'aide de la messagerie (CODEUR)

- « Charly, ton aide TimeCool » devient « Maya, ton aide TimeCool » : ligne, en-tête, rond rose avec M blanc, « Maya écrit… », réponses courtes, fiche du manuel (14 entrées), consigne du modèle, au féminin. Charly IA inchangé.
- Le nom ne vient ni de l'API ni de la base (fil sur l'appareil, réponses de la fiche puis du modèle par le relais).

## 18/11/2026 (nuit) — Mission 120 : la bulle verte des contacts (CODEUR)

- Démonstration : la réponse d'un contact d'exemple est un message « tiers » (bulle verte, initiales, prénom), ni relu comme Charly ni envoyé au modèle, gardé avec la conversation.
- En vrai : « Hugo t'a répondu : … » (tcGererDemandeRecue, sur demande) : affichage séparé (_cites), données inchangées. Les choix de créneau par lien restent la carte de Charly.
- Lot 118-119-120 : 4e65cc7, c02fb00 et ce commit ; verifier.sh vert sur le serveur (Chrome du serveur, API locale).

## 18/11/2026 (nuit) — Lot 118-119-120, examen (CODEUR)

- 118 : le lieu n'est lu que dans une phrase qui crée un rendez-vous (verbe de création, ou quoi + jour + heure) ; jamais hérité par la demande suivante ; météo jamais prise pour l'agenda ; pas de bulle orpheline pour Photo et Créer mon agenda.
- 119 : chez Maya, « C'est qui Charly ? » parle de Charly IA et dit où le trouver.
- phrases-charles : 55 phrases, 305 essais ; condition envoi: (ce que reçoit le modèle).

## 18/11/2026 (nuit) — Mission 121 A : Configuration professionnelle, étapes 1 à 5 (CODEUR)

- Case CONFIG_PRO éteinte par défaut (Configuration IA, accès administrateur) ; page neuve, entrée de menu seulement avec la case ; étapes 1 à 5 et récapitulatif ; tc_config_pro (réglage du compte), jamais lu par le serveur ni par un autre compte (verif-config-pro-prive-e2e).
- Choix faits seuls : familles et sous-familles cochées au départ ; jours du lundi au vendredi cochés, 9h-12h et 14h-18h proposés ; durée de rendez-vous 20 min proposée ; durées des actes proposées (15 à 60 min).

## 18/11/2026 (nuit) — Mission 121 B : la fiche professionnelle et « Remplis à ma place » (CODEUR)

- Étape 6 : fiche question par question, réponses proposées pour le chirurgien-dentiste, photo réduite ; horaires du cabinet facultatifs, jamais ceux de l'étape 4 ; « Remplis à ma place » par texte collé (Charly Pro IA, relais habituel).
- Version complète garde CONFIG_PRO, MODE_PRO, CARNET_PROS ; 9h-9h : « la fin est la même que le début » ; café de la démonstration en journée.
- Capture d'écran pour « Remplis à ma place » : pas encore ; le relais transmet le corps tel quel (200 Ko au plus), à confirmer par un essai avant de coder.

## 18/11/2026 (nuit) — Mission 121 B, examen (CODEUR)

- « Remplis à ma place » : réponses en attente, « Valider ces réponses » / « Annuler », rien d'enregistré avant.

## 18/11/2026 (nuit) — Mission 122 : l'ami qui attend sa validation (CODEUR)

- À deux : la demande part dans la messagerie de l'ami (/rdv/demander), « Je m'en occupe » ; à plusieurs sans agenda lisible : trois de mes moments libres, puis l'invitation Présent / Absent ; certains lisibles : « Lui envoyer la demande ».
- phrases-charles : contexte @validation:… ; « version de test » : aucune mention dans l'appli ni dans l'API.

## 18/11/2026 (nuit) — Mission 122, examen (CODEUR)

- « oui » tapé ; « Je peux lui envoyer » (profils 1 et 2) ; champ souhait de /rdv/demander (API, sans migration) et reprise ; « J'ai dit à Michel que tu aimerais demain ».

- 122, examen de l API : reprise du demandeur bloqué indépendante du souhait et du type (echoDemandeRecent).
- 122, examen de l API (suite) : seul mon dernier message compte pour la reprise, reconnu à son genre.

## 18/11/2026 (nuit) — Livraison après la 122 : capture, morceau C, version de l aide, rond de Maya (CODEUR)

- Capture d écran dans « Remplis à ma place » (image par le relais, sans changer l API) ; question au patient sur une sous-famille ; vraie version en bas de l aide ; Maya en dégradé rose avec l éclair.
- Profil 2 : compte rendu écrit en clair (« Michel a choisi … J’ai déplacé … »), « Voir dans mon agenda », notification hors de la page.

## 18/11/2026 — Notification discrète, références sans accès, e2e-rdv-groupe réparée (CODEUR)

- Notification du compte rendu sans nom ni rendez-vous ; sans_acces_refs dans /rdv/groupe/proposer, utilisé par « Lui envoyer la demande » (deux Alice) ; e2e-rdv-groupe aux règles du 10/10, avec le lieu, dans verifier.sh (API locale).

## 18/11/2026 — Groupes 5 et 7 des « je ne peux pas » (CODEUR)

- Contact cité sans TimeCool : Charly prépare l’invitation (bouton SMS/e-mail, texte de Charles), aussi dans le chemin de la 122 où il disparaissait. « Créer un nouveau rdv » à plusieurs sans agenda lisible : invitation Présent ou Absent (questionnaire sans bouton d’entrée aujourd’hui).
- 18/11 (suite) : un seul « Je m’en occupe » (la carte 122 commence par « Chez … » après l’invitation) ; « Trouve un créneau avec Julien » : invitation + créneaux libres.
- 18/11 (suite) : l’invitation amicale seulement pour un prénom cité (jamais un cabinet, un docteur, « mon dentiste »).

## 18/11/2026 — Mission 127 : « Charly Pro IA », la même page que Charly IA (CODEUR)

- Case « Charly Pro IA » (MODE DÉVELOPPEUR, sous « Configuration professionnelle », décochée par défaut) ; cochée : entrée sous « Charly IA » (même éclair), même page et même moteur sous le nom « Charly Pro IA », même réponse ; conversation séparée (clé _pro, questions en attente rangées avec leur page) ; case décochée : Charly IA identique au pixel près.

## 18/11/2026 — Mission 128 : les couleurs de Charly Pro IA (CODEUR)

- Menu : « Charly Pro IA » en bleu ciel dégradé (bleu nuit en sombre) ; page Pro : ronds de l'éclair bleu et rouge (en-tête, accueil, bulles) ; Charly IA inchangé au pixel près. L'accueil reste en tête sur Pro comme sur IA. Capture AdminCharly : la case « ⚡ Charly IA » y est décochée.

## 18/11/2026 — Mission 129 : l'accueil de Charly Pro IA (CODEUR)

- Accueil dicté par Charles sur Charly Pro IA (Charly IA inchangé) ; l'exemple « … avec mon commercial demain à 15h durant 30 minutes » marche mot pour mot sur les deux pages (durée en minutes lue localement : fin 15h30). Inventaire envoyé au chef : journée oui (en deux temps), matinée et semaine (hors « malade ») non, retard pour une seule personne.
- Examen 129 : « est à 15 minutes », « 15 minutes de pause » ne sont plus une durée (sans préposition, après « à » ou devant « de »).
- Examen 129 (2e passage, conseil du chef) : une durée n’est lue que dite comme telle (durant, pendant, d’une durée de, de N minutes collé au rendez-vous ou à l’heure, pour N minutes) ; tout le reste garde l’heure par défaut.

## 18/11/2026 — Mission 130 A : décaler une période en une phrase (CODEUR)

- Matinée, après-midi, journée, semaine ; destination, « Vers quand ? » (une seule question) ou décalage ; relecture habituelle et un seul oui ; période vide : la journée proposée. « après midi » dicté n’est plus « après 12 heures ».
- Examen 130 A : « du 19 » lu comme le jour du mois (jamais aujourd’hui deviné) ; rien qui finit après minuit (Charly le dit et redemande) ; un décalage avec une destination : les deux.

## 18/11/2026 — Mission 130 B : prévenir d’un retard plusieurs personnes (CODEUR)

- La période dite (ce matin, demain matin, cet après-midi…), les personnes des rendez-vous, le message, un seul « Je leur envoie ? » ; sans contact joignable : à part, avec « Ajouter un contact ». Le mot cherché garde ses accents (« matinée »).
- Examen 130 B : un contact nommé (« Dis à Paul que… », « Préviens Paul que… ») garde son chemin d’avant, jamais toute la période.

## 18/11/2026 — Menu : « Configuration professionnelle » sous « Charly Pro IA » (CODEUR)

- Juste sous « Charly Pro IA » (ou sous « Charly IA » si Pro est décochée) ; rien d’autre ne bouge.

## 18/11/2026 — Mission 131 (1er lot) : la démonstration du chirurgien-dentiste, phrases 1 à 3 (CODEUR)

- Dans Charly Pro IA : titre « Démonstration pour un chirurgien-dentiste » (deux lignes au téléphone), six phrases, agenda de cabinet et onze contacts d’exemple, profil 2 dans la démonstration ; « Note-moi un rendez-vous demain avec … » au premier moment libre ; excuses dans les messages ; l’imprévu qui décale (créneaux, un oui, compte rendu). Charly IA : identique.
- Examen 131 (1er lot) : l’imprévu ne prend que « tous mes rendez-vous » / « ma matinée… » ; un moment vague garde « À quelle heure ? » ; l’après-midi commence à 14h.

## 18/11/2026 — Mission 131 (2e lot) : phrases 4 à 6, défauts anciens du retard (CODEUR)

- « mon assistante et mon prothésiste » trouvés par un mot de leur nom ; en vrai sans fiche : un bouton par fiche ; démonstration du dentiste du lundi au vendredi dès 9h ; « Préviens Paul et Marie… » : les deux ; « … sauf Paul » : tout le monde sauf Paul.
- Examen 131 (2e lot) : retard des personnes nommées au jour dit, prénoms seulement, « sauf Paul Martin » ; « ma femme », « mon petit frère » sans fiche : « Je ne trouve pas … », mes créneaux libres et « Ajouter un contact » (décision du chef).

## 18/11/2026 — Mission 132 : remarques de l’EXAMINATEUR sur la 131 (CODEUR)

- « sauf ceux de l’après-midi » : le reste de la journée, et la carte le dit ; « sauf Bruno » (pas une fiche) : « Je ne trouve pas Bruno dans tes rendez-vous de demain. » ; « Quand suis-je libre avec ma femme ? » comme « Trouve un créneau avec ma femme » ; verif-rappels-stop-e2e lit backend/api/lib.php (marche dans un worktree neuf).
- Examen 132 : un inconnu après « sauf » n’est dit que s’il est tapé avec une majuscule (« sauf Bruno ») ; « sauf contrordre » : rien.

## 18/11/2026 — Mission 133 : l’agenda de la démonstration du dentiste rempli, « RDV disponible » (CODEUR)

- Cabinet d’exemple : 9h-13h et 14h-18h, cases de 30 minutes, du lundi au vendredi ; demain toujours rempli, même un samedi ou un dimanche (choix B du chef). 15 jours remplis : 14, 14, 12, 8, 4 patients, puis 1 ou 2 par jour ; 15h-16h libre partout ; 46 patients virtuels ajoutés. Aujourd’hui ne change pas.
- « RDV disponible » (bleu ciel ; « Dispo » en vue Semaine au téléphone) : seulement dessiné par tcEvenementsDuJour, jamais dans `events` ; pour Charly, du temps libre. Fiche : « Ajouter un rendez-vous ».
- Démonstration du dentiste seulement : plages de Charly = heures du cabinet (tcPlagesDuJour, serveur d’exemple) ; matinée jusqu’à 13h (tcMidi133).
- Suites : verif-demo-pro133 (neuve, 7 jours simulés à 10h + PC, 158 vérifications) ; verif-demo-pro131 et phrases-charles aux nouveaux chiffres ; @charlypro joué à 10h du jour même.

## 18/11/2026 — Mission 134 : plus de 6 personnes d’un coup, la conversation reste courte (CODEUR)

- Réponses : 5 bulles vertes puis « … et N autres personnes ont répondu » (« Voir le détail ») ; démonstration : une seule étape d’attente pour une vague de plus de 6 réponses (5 s, règle de Charles inchangée) ; en vrai, les réponses citées pareil.
- Récapitulatif avant le « oui », carte du retard, « C’est fait », compte rendu : une ligne par jour et « Voir le détail » ; jamais plié : sans moment libre, conflit, laissé à sa place, non prévenu.
- Affichage seulement (_plie134, tcVue134) : le texte entier reste dans le message et au Journal d’activité. Jusqu’à 6 personnes : rien ne change.
- Suite verif-pliage134 (18 vérifications, lundi simulé). Phrase 6 du dentiste un lundi : réponses en 5 s (au lieu de 10 s).
- verif-demo-pro131 et 131b jouées à 10h du jour même (131b échouait après 21h30 UTC, sur 8225f6c aussi).

## 19/11/2026 — Mission 135 : au profil 1, plus de 6 choix d’un coup, une seule carte (CODEUR)

- Charles (solution B) : au-delà de 6 créneaux choisis qui attendent en même temps, une seule carte « Je les place dans ton agenda ? », pliée par jour, « Voir le détail » au-dessus du « oui ». Jusqu’à 6 : une question par réponse.
- Jamais plié : un conflit, un rendez-vous qui n’est plus dans l’agenda. Refus et silences : leur question, une à la fois, après.
- Rien placé avant le « oui » ; « non » ne place rien ; le lot est figé quand la carte est posée (une réponse tardive a sa propre question).
- Après : « C’est fait » et « D’accord, les N rendez-vous restent à leur place » pliés ; messages aux contacts comptés (« ✉️ … : 14 personnes »), aussi dans le compte rendu du profil 3 (oubli de la 134).
- Suite verif-lot135 (23 vérifications), rouge sur 8b04f66.
- verif-phrases-boutons, verif-demo-charly, verif-voir-agenda : rouges la nuit et le jeudi (sur 8b04f66 aussi) ; leur page croit être le mercredi de la semaine à 10h.
- Examen de la 135 : « Voir le détail » écrivait une bulle bleue « Voir le détail » (défaut de la 134, tcNoterChoix116) ; plus de bulle (classe tc-detail134). verif-lot135 : 24 vérifications, rouge sur cf850ed.

## 19/11/2026 — Mission 138 : le logo de Charly Pro IA dans le menu (CODEUR)

- La ligne « Charly Pro IA » du menu porte le rond dégradé bleu et rouge avec l’éclair jaune, comme sur sa page, à la taille des autres icônes (24 px). Fond bleu ciel gardé ; « Charly IA » inchangé.
- Suite verif-menu-charly-pro138 (17 vérifications), rouge sur b5370cf.

## 19/11/2026 — Mission 136, lot 1 : le métier « Coiffeur » (CODEUR)

- Même page, mêmes six étapes que le dentiste. « Prestation » et « client » ; 7 familles et 23 prestations ; consigne en tête de famille ; « Pas de rendez-vous en ligne » ; « Seulement avec une autre prestation ».
- Prix facultatif (un prix, une fourchette, « Sur devis ») ; durées en heures, jusqu’à 5 h ; une seule durée de rendez-vous.
- Fiche du salon (sans tarifs remboursés, carte Vitale, « à apporter », « Dr ») ; « Remplis à ma place » propose aussi les prestations, leurs durées et leurs prix.
- Dentiste identique au caractère près (empreintes). Suite verif-config-coiffeur136 (27 vérifications).

## 19/11/2026 — Mission 136, lot 2 : un salon, un ou plusieurs coiffeurs (CODEUR)

- « Vous travaillez seul, ou à plusieurs ? » (coiffeur seulement). À plusieurs : les coiffeurs un par un (prénom, photo) ; « Qui la fait ? » sous chaque prestation ; les jours de chaque coiffeur ; ses créneaux et le total du salon au récapitulatif.
- Photos dans tc_config_pro_photos (privé, ajouté à verif-config-pro-prive-e2e). Suite verif-config-salon136 (16 vérifications).
- Examen de la 136 : à plusieurs, l’étape 4 contrôlait encore les jours du salon (impasse si le salon n’avait plus de jour) ; seuls les jours de chaque coiffeur comptent. verif-config-salon136 : 18 vérifications, rouge sur cede390.

## 19/11/2026 — Mission 137 : le métier « Avocat » (CODEUR)

- « Domaine » et « mission » ; 14 domaines décochés au départ ; 11 missions du divorce, 6 missions générales ailleurs.
- Étape 3 : ses deux rendez-vous (premier contact par téléphone gratuit au départ ; cabinet, prix facultatif ; « Un nouveau client ne prend seul que le premier contact », cochée), 30 minutes pour tout.
- Fiche : « Maître … », barreau, honoraires, aide juridictionnelle Oui / Non, ses domaines ; « Remplis à ma place » coche les domaines.
- Dentiste et coiffeur identiques au caractère près (empreintes). Suite verif-config-avocat137 (22 vérifications).

## 19/11/2026 — Mission 139 : « Voir tous les métiers » (CODEUR)

- Récapitulatif de la Configuration professionnelle : gros bouton bleu « Voir tous les métiers » au-dessus de la carte « Votre métier » ; il ouvre l’étape 1, le métier enregistré coché. « ← Retour à ma configuration » en haut de chaque étape, tant qu’on regarde.
- En regardant, rien n’est enregistré (configuration en mémoire, photos remises) ; « Voir le récapitulatif » valide. Chaque métier garde sa configuration (e.metiers139).
- verif-config-metiers139 : 17 vérifications, rouge sur 1bfca84. Empreintes 136/137 lues sans le bouton.
- Examen de la 139 : en regardant, les photos étaient écrites et envoyées au compte (perdues si l’appli se fermait). Elles vivent désormais dans une copie de travail, écrites seulement à « Voir le récapitulatif ». verif-config-metiers139 : 21 vérifications, rouge sur b86a5fb.

## 19/11/2026 — Mission 140 : TimeCool installable depuis le navigateur (CODEUR)

- web/app/ : manifest.json + icônes « étoiles » (192, 512, masquable 512, iPhone 180), dessinées par scripts/dessiner-icones-web.sh ; publiées par deployer-web.sh à côté de index.html. L’onglet garde l’horloge.
- index.html : manifeste, icône iPhone, ligne discrète « Installer TimeCool sur cet appareil » en bas du menu (navigateur qui le propose ; iPhone Safari : « Partager, puis Sur l’écran d’accueil » ; jamais installé, jamais dans l’APK).
- Aucun service worker, aucun cache ; version.json inchangé. Suite verif-installable140 (19 vérifications, rouge sur bc6180b).
- Examen de la 140 : sur iPhone, le « : » pouvait rester seul sur une ligne ; espaces insécables devant « : » et dans les guillemets. verif-installable140 : 20 vérifications (coupures contrôlées de 140 à 300 px), rouge sur 696be0e.

## 19/11/2026 — Mission 141 : « Votre métier : … » rappelé aux étapes 2 à 6 (CODEUR)

- Configuration professionnelle : aux étapes 2 à 6, une carte « Votre métier : Avocat » (Coiffeur, Chirurgien-dentiste) entre le texte d’explication et la première carte, dans le style de la carte « Votre métier » du récapitulatif ; une ligne à 390 px (espace insécable devant « : »). En regardant les métiers : le métier regardé. Ni à l’étape 1, ni au récapitulatif.
- Suite verif-rappel-metier141 (17 vérifications, rouge sur be6740e : 10 KO). Les empreintes du dentiste (coiffeur136), du coiffeur (avocat137) et de l’avocat (141) se lisent sans cette ligne et restent celles d’avant : rien d’autre ne bouge.
- Règle de Charles redonnée : quand on touche quelque chose et qu’une suite s’ouvre, l’écran suivant rappelle le sujet touché.

## 19/11/2026 — Mission 142 : « Votre métier : … » grand et en gras ; « domaines d’activité » (CODEUR)

- Configuration professionnelle, étapes 2 à 6 : « Votre métier : … » tout en gras, le métier aussi, à la taille du titre de l’étape (20 px) ; même place, même carte. Une ligne à 390 px pour les trois métiers ; plus étroit, deux lignes propres (le métier ne se coupe jamais).
- Avocat, étape 2 : « Quels domaines d’activité pratiquez-vous ? ».
- Suite verif-rappel-metier142 (9 vérifications à 390, 360 et 320 px, rouge sur ecf9c94 : 3 KO) ; empreintes des trois métiers sans la ligne et avec l’ancien titre : identiques. verif-rappel-metier141 et verif-config-avocat137 suivent.
- Reprise de la 142 avant l’examen : le titre de l’avocat se coupait à « pratiquez- / vous ? » ; « pratiquez-vous ? » reste d’un bloc. verif-rappel-metier142 : 10 vérifications (titre à 390, 360, 320 px), rouge sur 86b67bd.

## 19/11/2026 — Mission 143 : titres d’étape d’un bloc sur les petits téléphones (CODEUR)

- Configuration professionnelle, étapes 1 à 6 : un mot à trait d’union reste entier (« rendez-vous », « faites-vous »), « ? » reste avec le mot d’avant ; trois métiers, 320 à 390 px. Texte inchangé.
- Suite verif-titres-etapes143 (5 vérifications, 5 largeurs, onze titres ; rouge sur 82cb5f8). Les suites à empreintes lisent la page sans ces blocs : empreintes d’avant inchangées.

## 19/11/2026 — Mission 144 : la carte « Installer TimeCool sur cet appareil » (CODEUR)

- https://timecool.fr/app/?installer=1 : carte au centre, par-dessus tout (même « Bienvenue ! », sans compte) ; gros bouton « Installer » quand le navigateur le propose (attendu 1,5 s au plus), sinon le geste exact (Chrome, Edge, Safari Mac, iPhone, Android, Firefox ; libellés relus dans l’aide officielle) ; « Plus tard » ; déjà installé ou APK : rien. Paramètre effacé de l’adresse.
- La ligne du menu (140) monte en haut du menu, bleue et en gras. Aucun service worker ni cache.
- Suite verif-installer144 (17 vérifications, rouge sur a937ab1) ; verif-installable140 suit la ligne en haut.
- Examen de la 144 : en thème sombre, la carte restait blanche avec le texte clair du thème (illisible) ; elle garde désormais ses couleurs claires, comme les fenêtres de l’appli ; ligne du menu en texte foncé, titre bleu #1a56b8. verif-installer144 : 20 vérifications (contrastes ≥ 4,5 en « Sombre », « Auto » sombre, iPhone), rouge sur 18cec38.

## 19/11/2026 — Mission 145 : import des contacts sans fenêtre pour les comptes de test (session Codeur)

- Charles, 19/11 (« 1 vas y »), pour la vidéo « coiffeur » sur PC : sur navigateur, un compte dont l'adresse finit par @exemple-timecool.fr touche « Importer mes contacts » et reçoit tout de suite les 8 contacts d'exemple, sans la fenêtre d'avertissement. Le message dit « ✅ 8 contacts importés » ; un second toucher n'ajoute rien (« Contacts déjà présents, rien à ajouter »). « Lucas Petit » devient « Hugo Petit » pour ces comptes, parce que le compte de la vidéo s'appelle Lucas.
- Tout autre compte, y compris les autres adresses de test (@exemple-test.fr…), garde la même fenêtre et les mêmes contacts. L'application Android ne change pas. Aucun SMS, e-mail ni notification : les contacts restent sur le compte.
- tcEstAdresseExemple145() est posée à côté de la règle des comptes de test (mission 97, toujours écrite une seule fois). Elle garde d'abord ce que tcEstAdresseDeTest accepte, puis seulement le domaine @exemple-timecool.fr.
- verif-import-test145 : 15 vérifications, dans Chrome à 1920 × 1080, sans réseau. Elle est rouge sur 731eba2 (6 KO).

## 19/11/2026 — Mission 146 : Charly comprend le jour dit dans « je suis malade » (CODEUR)

- « Je suis malade mercredi, annule (ou décale) mes rendez-vous » : le prochain mercredi à venir, sans la question « pour quand ? ». C'est pareil pour chaque jour de la semaine, pour « mercredi prochain », pour « après-demain » et pour un jour avec sa moitié (« mercredi matin », « jeudi après-midi », « aprem »). Si le jour dit tombe aujourd'hui, c'est aujourd'hui. « demain mercredi » vaut demain quand c'est bien le même jour.
- Ensuite tout se passe comme pour « demain » : mêmes cartes, mêmes messages, mêmes profils de confiance. Le parcours dans Chrome le vérifie. Un jeudi soir, « mercredi » donne mot pour mot la carte, le compte rendu, les messages et les créneaux proposés de « demain » un mardi. Quand rien ne reste à décaler, Charly dit la date (« Rien à décaler mercredi 25 novembre. Repose-toi. »).
- Phrase ambiguë : la question « pour quand ? » reste, avec ses cinq choix. C'est le cas de deux jours sans « ou », de « de lundi à mercredi », de « jusqu'à », « sauf », « depuis lundi », d'un jour passé, de « la semaine prochaine » et d'une date à plus d'une semaine. Avec « ou » (« mercredi ou vendredi »), Charly demande lequel, avec ces seuls jours, comme dans la mission 110.
- Les périodes jour_0 à jour_7, chacune avec sa matinée et son après-midi, sont cachées : aucun bouton de plus. tcMaladeJourDit146 s'appuie sur tcJoursCites. L'imprévu de la mission 131 lit la même phrase sans le drapeau : il ne change pas. Les phrases déjà comprises (aujourd'hui, demain et ses moitiés, 2 ou 3 prochains jours, cette semaine, « ou » de la 110) donnent le même résultat qu'avant.
- La suite verif-malade-jour146 compte 31 vérifications. Elle relit les phrases à chaque jour de la semaine, matin et soir, puis joue le vrai parcours dans Chrome, sans réseau. Elle est rouge sur f58e22b. phrases-charles.txt reçoit 15 phrases (98 essais) ; « {nomjour:+N} » donne le nom du jour J+N. Elles sont rouges sur f58e22b : 59 KO.
- Examen de la 146 : un jour passé faisait perdre le moment demandé. « Je suis malade depuis lundi, annule mes rendez-vous de demain » reposait la question. Désormais « depuis lundi », « depuis hier », « mercredi dernier » et « mardi passé » sont retirés avant de chercher le jour, comme « depuis ce matin ». S'il ne reste aucun jour nommé, Charly reprend le chemin d'avant : demain, aujourd'hui ou la semaine, comme sur f58e22b. verif-malade-jour146 passe à 41 vérifications, dont 8 KO sur 738e353. phrases-charles reçoit 4 phrases de plus. Les lignes « décale » ne contrôlent plus la date, car la carte « décale » dit les nouveaux créneaux et pas le jour libéré : la date se vérifie sur « annule », qui la dit toujours. Ainsi la suite reste juste quel que soit le jour où elle tourne. Au total, 22 phrases et 141 essais, dont 24 KO sur 738e353.

## 20/11/2026 — Corrections de date des suites (CODEUR, avant la mission 147)

- Constat du vendredi 20/11, la nuit : verifier.sh était rouge sur 889e169, la version en ligne, à cause de la date et non du code. Il y avait trois causes :
  1. « Quand suis-je libre ce vendredi ? » dit un vendredi : Charly répond aujourd'hui, mais la suite attendait le vendredi suivant.
  2. verif-demo-pro131, partie « en vrai » : demain tombait un samedi, sans créneau par défaut (règle 43b). La suite attendait « 12h » et « 14h ».
  3. De 23h à minuit UTC, verif-phrases-charles calculait ses dates à l'heure UTC du serveur, alors que l'appli est à l'heure de Paris.
- L'appli est juste. La démonstration du dentiste marche le vendredi et le samedi comme un autre jour.
- Ce qui change :
  - verif-demo-pro131 se joue le mardi 24/11/2026 à 10h, heure de Paris, toutes vérifications inchangées. Elle se joue aussi un vendredi et un samedi, au téléphone, avec la démonstration à l'identique. « En vrai », quand demain est fermé, la réponse est « À quelle heure ? » et jamais un créneau le week-end. 78 vérifications.
  - verif-phrases-charles calcule ses dates à l'heure de Paris. Chaque phrase se joue un jour fixe, le mardi 24/11/2026 à 10h. « @jours:vendredi,samedi » la rejoue ces jours-là ; « @jour:x » la joue seulement ce jour-là, avec ses attendus.
  - « jour:vendredi » attend exactement aujourd'hui un vendredi, et le vendredi suivant les autres jours. « jour:lundi+7 » ne change pas.
  - Sont rejouées le vendredi et le samedi : « ce vendredi » (Charly IA et Pro), « vendredi pour une urgence », « Dîner chez moi samedi », « Quand suis-je libre demain ? » (Pro). Deux lignes par jour ont été ajoutées pour « Quand suis-je libre demain ? » (pas de créneau le week-end) et pour « Préviens tous mes rendez-vous de cet après-midi… ».
  - Aucune vérification n'est retirée.
- Examen des corrections de date (EXAMINATEUR, chef) :
  - La vérification du week-end de verif-demo-pro131 ne testait que des absences : elle passait même sur une erreur. Elle exige maintenant « À quelle heure ? », et une erreur (« Erreur », « Connecte-toi ») n'est jamais acceptée.
  - Le trou de l'appli : un vendredi ou un samedi, « Mets une réunion avec l'équipe demain après-midi » (et « demain matin », « demain ») partait au modèle. Quand le jour n'a pas de moment libre, la recherche du premier moment libre (tcCreneauLibreSansHeure131) renvoyait null. Le chemin « À quelle heure ? » (tcHeureManquante) refusait ensuite « avec l' ».
  - La correction : tcCreneauLibreSansHeure131(text, forme) dit seulement la forme de la demande. Un jour sans moment libre (week-end sans plage, règle 43b, ou jour plein) donne « À quelle heure ? », sur place. Un jour avec un moment libre ne change pas.
  - verif-demo-pro131 compte 82 vérifications, dont « demain matin » et « demain » en vrai ; 6 sont rouges sur 333646e. phrases-charles reçoit 7 lignes et passe à 965 vérifications, dont 38 rouges sur 333646e.

## 20/11/2026 — Mission 147, lot 1 : tous les métiers par catégories (santé et beauté) (CODEUR)

- La demande vient de Charles : à l'étape 1 de « Configuration professionnelle », les métiers à rendez-vous sont rangés par catégories. Ils viennent de l'ébauche du 18/11. La page reste toujours derrière la case CONFIG_PRO.
- Chaque catégorie se déplie. Au départ elle est fermée, sauf celle du métier choisi, qui est ouverte. Son nom est en gros et donne le nombre de métiers. Dans chaque catégorie, les métiers sont par ordre alphabétique.
- Une case « Cherchez votre métier » réduit la liste à chaque lettre, sans tenir compte des accents ni des majuscules. Elle trouve aussi des mots en plus : « kiné », « psy », « massage ». Si rien ne correspond, la page dit « Aucun métier ne correspond. Essayez un autre mot. ».
- Lot 1 : Santé compte 34 métiers, Beauté et bien-être 16, et Droit et chiffre a l'avocat. Les métiers « en une ligne » de l'ébauche comptent aussi, rangés dans la famille « Mes actes » ou « Mes prestations ». Une ligne qui nomme plusieurs métiers en donne un par nom : Ergothérapeute et Psychomotricien, Radiologue et Centre d'imagerie.
- Un métier pas encore codé suit le parcours du coiffeur en version générique (tcCpGenerique147) :
  - les familles et les prestations de l'ébauche, à cocher, renommer, retirer ou créer ;
  - une seule durée pour tout, à l'étape 5 ;
  - un prix facultatif, à l'étape 3 « Quels prix affichez-vous ? » ;
  - seul ou à plusieurs ;
  - la fiche, avec « Remplis à ma place ».
- Chaque catégorie a ses mots. En santé : patient, acte, motif de consultation, praticien. En beauté : client, prestation, personne.
- Les questions particulières de l'ébauche ne sont pas posées.
- Le dentiste, le coiffeur et l'avocat gardent leur parcours. Pour les étapes 2 à 7, leurs empreintes sont identiques à celles de 889e169. Les mots du coiffeur passent par TC_PRO_EQUIPE_COIFFEUR_147, inchangés. « Voir tous les métiers » n'enregistre toujours rien, et chaque métier garde sa configuration.
- La suite verif-config-metiers147 compte 41 vérifications, à 390 et 1280 px. Elle est rouge sur 889e169.
- Examen de la 147 : pour un métier générique, l'étape 5 disait « Combien de temps dure un rendez-vous chez vous, par défaut ? ». Ce « par défaut » laissait croire qu'un acte pouvait avoir une autre durée. Pour ces métiers seulement, le titre devient « Combien de temps dure un rendez-vous chez vous ? » ; le dentiste, le coiffeur et l'avocat gardent leur titre. verif-config-metiers147 vérifie ce titre pour l'ostéopathe et la manucure, et que le coiffeur garde le sien. Elle compte toujours 41 vérifications, dont 2 rouges sur e914641.
- Quatre suites ont suivi l'étape 1 nouvelle. verif-config-pro cherche « Santé » au lieu du dentiste, puisque les catégories sont fermées. verif-config-coiffeur136 et verif-config-avocat137 vérifient la présence des métiers ; l'ordre alphabétique de chaque catégorie se vérifie dans la 147. Dans verif-titres-etapes143, l'empreinte porte sur les étapes 2 à 7, relevées sur 889e169.

## 20/11/2026 — Mission 147, lot 2 : les huit autres catégories de métiers (CODEUR)

- Ajout de 53 métiers de l'ébauche, partie C, dans l'ordre demandé :
  - Droit et chiffre : 7, avec l'avocat ;
  - Banque, assurance, immobilier : 4 ;
  - Automobile : 4 ;
  - Artisans et dépannage à domicile : 14 ;
  - Enseignement, sport, loisirs : 10 ;
  - Commerce et conseil : 9 ;
  - Animaux : 4, dont le vétérinaire avec ses familles ;
  - Administration et associations : 2.
- Une ligne qui nomme plusieurs métiers en donne un par nom : Peintre, Menuisier, Maçon et Carreleur ; Jardinier et Paysagiste ; les trois réparateurs ; Professeur de yoga et Professeur de pilates ; les quatre moniteurs ; Consultant et Formateur ; Architecte et Décorateur ; Courtier en crédit et Courtier en assurance ; Boutique de robes de mariée, Tailleur et Bijoutier. L'opticien est déjà en Santé.
- Les mots de chaque catégorie, sur la base de la beauté (client, « personne » à plusieurs) :
  - droit, banque, conseil : domaine, mission ;
  - automobile, artisans : intervention, et la fiche demande « Où intervenez-vous ? » ;
  - loisirs, animaux : prestation, avec des exemples neutres ;
  - administration : démarche, service, « la personne reçue », sans question de paiement.
- Certains métiers prennent d'autres mots que leur catégorie (4e case) : l'auto-école, le commercial, le recruteur, la boutique de robes de mariée, le tailleur et le bijoutier prennent « prestation ». Le vétérinaire aussi : sa fiche n'a ni carte Vitale ni remboursement.
- « Remplis à ma place » vouvoie « le patient », « le client » ou « la personne reçue » (M.proche porte l'article).
- verif-config-metiers147 compte 47 vérifications : les dix catégories et leur nombre de métiers ; 101 métiers génériques par vocabulaire ; le plombier, le notaire, la mairie, le vétérinaire, l'auto-école et le garagiste de l'étape 1 à la fiche. Elle est rouge sur f9d56e1.
