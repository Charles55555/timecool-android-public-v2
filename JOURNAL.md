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

## En attente de Charles

- **La liste d'avant-lancement**, section 8 de `CLAUDE.md`. Rien de fait.

**Tranché le 07/09 — ne plus y revenir :**

- Les **vingt-sept champs de clés** de la page Configuration IA restent
  en l'état. Ses mots : « tout ce qui se passe dans la page
  administrateur ne me dérange en rien [...] toi tu sais ce qui
  fonctionne et moi je sais ce qui fonctionne ». Il est en phase de test.
  Ne pas proposer de les nettoyer.
- Les **clés API en clair** : corrigées le 07/09.

## Ce que seule la session du PC peut faire

Regarder la base, lire les journaux du serveur, déployer la version web,
vérifier qu'une correction est bien arrivée sur l'appareil de Charles.

La session du nuage écrit et teste le code, ouvre une *pull request*, et
**pose ici ses questions** au lieu de deviner à partir des sources.
Plusieurs défauts de la semaine étaient invisibles dans le code.

## Avant le lancement public

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
