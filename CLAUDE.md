# TimeCool — à lire avant de toucher à quoi que ce soit

Agenda Android + version web. L'application entière tient dans un seul
fichier : `app/src/main/assets/index.html` (~900 Ko). Le même fichier est
servi sur `timecool.fr/app/` et embarqué dans l'APK.

Charles est le porteur du projet. Réponses en français.

**Lire `JOURNAL.md` avant de commencer**, et y noter ce qu'on entame et
ce qu'on laisse. Plusieurs sessions travaillent sur ce dépôt : le
04/09/2026, deux d'entre elles ont corrigé le même défaut en parallèle
sans le savoir.

---

## 1. Comment travailler avec lui

**Annoncer, puis attendre.** Sur tout sujet : dire ce qu'on compte
faire, attendre son feu vert, et seulement ensuite modifier. Ne pas
dérouler un catalogue de possibilités — une recommandation claire suffit.

**Terminer chaque réponse par ces deux questions**, dans cet ordre :

> **Moi je dois faire quoi ?**
> **Toi tu dois faire quoi ?**

**Réponses courtes.** Deux fois plus courtes que ce qui vient
spontanément.

**Pas de couches de mots de passe supplémentaires.** Deux mots de passe
protègent déjà le PC et la session. Pour toute protection — clés,
sauvegardes, fichiers sensibles — préférer les permissions système et
les accès déjà en place. Signaler un risque une fois, brièvement, sans
insister.

**L'écriture en base est autorisée** depuis le 02/09/2026, sans
redemander à chaque fois.

**Un refus déjà tranché, ne pas le rouvrir :** stocker les mots de passe
en clair côté serveur. Demandé trois fois, refusé trois fois. Argon2id
reste. Une phrase suffit, pas un débat.

---

### Quand demander, quand agir — règle du 07/09/2026

Charles ne veut plus arbitrer des choix techniques qu'il n'a pas les
moyens de juger. Ses mots : « je souhaiterais que ta session et la sienne
puissiez être le plus autonomes possible ».

**Si ça ne change rien à ce qu'il voit : on agit, on le dit après.**
Une correction interne, un défaut de sécurité, un test, du code mort.

**Si ça change ce qu'il voit ou la façon dont l'application se comporte :
on demande avant.** Un écran, un bouton, un message, une fonction
nouvelle.

Cette règle remplace la précédente — annoncer et attendre sur *tous* les
sujets, posée le 04/09 quand des modifications non demandées lui
faisaient perdre du temps. Elle ne l'annule pas : la moitié « ce qu'il
voit » reste entière.

Terminer chaque réponse par **« Moi je dois faire quoi ? »** puis
**« Toi tu dois faire quoi ? »** — cela n'a pas changé.

Et le plus important : **écrire sans jargon.** Il l'a demandé plusieurs
fois, la dernière avec agacement — « on dirait que vous me parlez en
chinois ». Une case, un fichier, une page : des mots qu'il utilise.
Quand un exemple concret peut remplacer une explication, le donner.

---

## 2. Ce que cette session peut faire — ou non

Tout dépend de l'endroit où elle s'exécute.

**Sur le PC de Charles** — elle dispose de ses clés SSH (`~/.ssh/`) et
peut donc déployer sur le serveur, écrire en base, pousser sur GitHub,
lancer les builds.

**Ailleurs (session du nuage)** — elle n'a qu'une copie du dépôt. Ni
clés SSH, ni accès au serveur, ni à la base. **Elle ne peut pas
déployer.** Elle lit, comprend, modifie le code, et ouvre une *pull
request*. C'est exactement ce qu'a fait la PR #9 le 03/09.

Ne jamais tenter de contourner cela. Les clés privées n'ont rien à faire
dans un dépôt, même privé.

Test rapide : `ssh -o BatchMode=yes timecool-cc 'echo ok'` répond, ou
non.

### Ce que le code ne dit pas — et qu'il faut demander

Plusieurs défauts n'ont été trouvés qu'en regardant la production, jamais
en lisant le code :

- le plafond de réponse de Charly IA était figé à 500 jetons **sur tous
  les comptes**, valeur enregistrée, invisible dans les sources ;
- un compte gardait une copie figée d'un ancien prompt, ce qui le privait
  de toutes les corrections écrites depuis ;
- les clés API sont en clair dans la table de synchronisation, alors que
  la table prévue pour elles les chiffre.

Donc : quand un diagnostic dépend de l'état réel — la valeur d'un réglage
sur un compte, les journaux du serveur, savoir si une correction est bien
arrivée sur l'appareil de Charles — **ne pas deviner à partir du code**.
Poser la question dans `JOURNAL.md`, section « En attente ». La session
du PC y répond.

### Qui travaille sur quoi

`app/src/main/assets/index.html` fait 950 Ko d'un seul tenant. Deux
sessions dans la même zone finissent en conflit, ou refont le même
travail : le 04/09, les formulaires de connexion ont été corrigés **deux
fois en parallèle**, sans que ni l'une ni l'autre le sache.

**Avant de toucher au code : écrire une ligne dans la section « En cours »
de `JOURNAL.md`, et la pousser.** Une ligne suffit — quel chantier, quels
fichiers. La retirer en partant.

---

## 3. Où est quoi — et les pièges

| Chemin | Rôle |
|---|---|
| `app/src/main/assets/index.html` | Toute l'application |
| `backend/api/index.php` | **La source** de l'API |
| `backend/api/lib.php` | Classes Db, Auth, Rep, Entree, Conf |
| `backend/sql/` | Migrations, dans l'ordre |
| `.github/workflows/build-apk.yml` | Construction de l'APK |

Sur le serveur :

| Chemin | Rôle |
|---|---|
| `/var/www/vhosts/timecool.fr/site1/index.php` | **L'API en production** — racine de `api.timecool.fr` |
| `/var/www/vhosts/timecool.fr/httpdocs/app/index.html` | La version web |
| `/var/www/vhosts/timecool.fr/private/` | `lib.php` et `config.php`, illisibles par l'utilisateur `claudecode` — c'est voulu |

**Piège coûteux :** `httpdocs/api/` est une **copie morte**. Un
diagnostic « l'API est tombée » posé en la testant serait faux : c'est
`api.timecool.fr` qui compte. L'erreur a déjà été commise.

**Deuxième piège :** la production peut être en retard sur le dépôt.
Comparer avant de conclure quoi que ce soit :

```
diff --strip-trailing-cr \
  <(cat /var/www/vhosts/timecool.fr/site1/index.php) \
  <(git show HEAD:backend/api/index.php)
```

### Deux écarts connus entre le dépôt et la production

Rejouer `backend/sql/*.sql` sur une base neuve ne redonne pas exactement
la base de production. Deux différences, toutes deux sans danger, mais à
connaître avant de « corriger » quoi que ce soit :

- **`comptes.reference`** vaut `CHAR(12)` dans le dépôt, `CHAR(26)` en
  production. Les comptes créés avant août 2026 ont de vraies références
  de 26 caractères : **réduire la colonne les tronquerait**. Le code
  accepte les deux longueurs (`^[0-9A-Z]{12,26}$`). Ne pas y toucher.
- **`comptes.provenance` et `provenance_detail`** figurent dans
  `001_schema_initial.sql` mais manquaient en production : elle avait été
  créée avant leur ajout au fichier. Ajoutées à la main le 03/09/2026.

Leçon : avant de livrer une migration, la rejouer sur une base jetable
et comparer le résultat à la production. C'est ce qui a révélé les deux.

---

## 4. Déployer

**Toujours `cat … | tee destination`, jamais `cp`.** Le fichier de
production appartient à un autre utilisateur ; `cp` remplacerait le
fichier et perdrait propriétaire et permissions, `tee` écrit dedans.

```bash
# API
cat backend/api/index.php | tee /var/www/vhosts/timecool.fr/site1/index.php > /dev/null
# Version web : PASSER PAR LE SCRIPT, jamais tee directement
./scripts/deployer-web.sh
```

**La version web se déploie par `scripts/deployer-web.sh`.** Il fait le
`tee`, mais il inscrit aussi l'horodatage du déploiement dans la page
et le publie dans `version.json`. C'est la comparaison des deux qui
fait apparaître le bandeau « Nouvelle version disponible » chez ceux qui
ont déjà la page ouverte ou une copie en cache. Un `tee` direct
déploierait le marqueur `__TC_DEPLOIEMENT__` tel quel : la page ne
saurait plus se comparer à rien, et plus personne ne serait prévenu.

Base de données : lecture par `timecool-cc`, **écriture par
`timecool-root`** (le compte `claudecode_ro` est en lecture seule).

Certaines actions sont refusées à l'agent, quelles que soient les
permissions locales — accorder un droit administrateur, par exemple.
Donner alors la commande à Charles pour qu'il la lance lui-même.

---

## 5. Ne jamais annoncer une version sans l'avoir vérifiée

Le numéro de version vient du numéro de construction GitHub. Une
construction peut échouer **en silence**. Quatre versions ont été
annoncées un jour sans exister.

```bash
gh run list --limit 1 --json databaseId --jq '.[0].databaseId' \
  | xargs -I{} gh run watch {} --exit-status
gh release list --limit 1
```

Attendre ce retour avant d'écrire un numéro de version dans une réponse.

Les étapes Gradle sont retentées trois fois : Maven Central répond
parfois `429`. Un échec après trois tentatives est un vrai échec.

---

## 6. Vérifier avant de livrer

Le projet a des suites de vérification écrites en JavaScript pur, qui
extraient des morceaux de `index.html` et les exécutent dans un contexte
isolé. Elles vivent dans le dossier de travail de Charles, hors du
dépôt. Elles couvrent : la syntaxe des blocs `<script>`, les jours
fériés, le repli du calendrier musulman, l'agenda des fêtes, les tâches,
les anniversaires, le transfert chiffré, la synchronisation, le prompt
de Charly IA, les formulaires de connexion.

Une modification qui touche `index.html` doit au minimum passer la
vérification de syntaxe. Sans elles, écrire un test équivalent plutôt
que de livrer à l'aveugle.

---

## 7. Pièges déjà payés — ne pas les repayer

**Un identifiant qui change casse ce qui le construit par morceaux.**
Renommer une catégorie a cassé les vues Jour et Semaine : le code
fabriquait `'chip-' + e.cat`. Une recherche sur l'ancienne valeur ne
trouve pas ça.

**Une liste de ce qui PART se périme ; une liste de ce qui RESTE, non.**
Le paquet d'appairage et la synchronisation trient par exclusion. Une
fonction ajoutée demain suit toute seule.

**Ne jamais recopier dans l'appareil ce qui vient du code.** Le prompt
de Charly IA était recopié dans le stockage local : pendant des
semaines, aucune correction n'atteignait les téléphones déjà installés.
La migration censée forcer la nouvelle version retournait la version en
place — elle ne faisait rien.

**Ce qui est propre à un appareil ne voyage jamais :** clé de
chiffrement locale, jeton de session, biométrie, code PIN, curseur de
synchronisation. Voir `TC_JAMAIS_TRANSFERE`.

**Les rendez-vous sont chiffrés en local** avec une clé propre à
l'appareil. Les recopier tels quels donne des lignes vides à l'arrivée :
ils voyagent en clair *dans* le paquet chiffré, et sont rechiffrés à
destination.

**Un bouton qui ne fait rien est pire que pas de bouton.** « Bloquer le
compte » n'écrivait qu'un drapeau local pendant des semaines.

**Écrire un fichier : encoder, écrire dans un temporaire, puis
`os.replace`.** Un `open(p,'w')` a déjà vidé `index.html` parce que
l'erreur d'encodage est survenue après la troncature.

---

### lib.php n'est pas déployable — index.php si

`backend/api/lib.php` et `config.php` vivent dans
`/var/www/vhosts/timecool.fr/private/`, un dossier fermé à l'agent. On
peut les modifier dans le dépôt, **pas les mettre en production**.

Conséquence : **ne jamais déployer un `index.php` qui appelle du code
nouveau de `lib.php`.** La méthode n'existera pas côté serveur et toute
la route part en erreur 500. C'est arrivé le 07/09 sur la création des
liens de rendez-vous — rétabli en deux minutes, mais la production était
cassée entre-temps.

Ce qui doit vivre à côté du code déployable s'écrit dans `index.php`,
même si sa place naturelle serait `lib.php`. Voir `jetonCourt()`.

Toujours vérifier après un déploiement d'API :

```bash
curl -sS https://api.timecool.fr/parametres
```

et, pour une route modifiée, l'appeler pour de vrai.

---

## 8. Avant le lancement public

- Retirer `POST /test/sms-twilio` et `POST /test/email`
- Passer `timecool.fr` de PHP 8.0 à 8.3
- Remettre `verification_obligatoire` à vrai et `mode_test` à faux
  (`mode_test` expose les codes de vérification dans les réponses)
- Rendre le dépôt Android privé
- Retirer ou reformuler « chiffrement de bout en bout — en
  développement, non encore actif » dans la politique de
  confidentialité : le serveur stocke désormais l'agenda pour la
  synchronisation

---

## 9. Ce qui reste à faire

**Décisions en attente de Charles** — analysées, chiffrées, non tranchées :

- **Les clés API sont en clair dans la base.** La table `cles_api` les
  chiffre en AES-256-GCM, mais le bloc « réglage » de la synchronisation
  transporte le même tiroir `timecool_api_keys` sans chiffrement : la clé
  Anthropic est lisible en clair dans `elements`, sur quatre comptes. Le
  correctif tient en une ligne — ajouter `timecool_api_keys` à
  `TC_SYNC_DEJA_SYNCHRONISE` — car la route `/cles-api` distribue déjà les
  clés aux nouveaux comptes, chiffrées. Signalé une fois à Charles, sans
  insister : c'est sa décision.
- ~~**Les clés API en clair**~~ — corrigé le 07/09 : `timecool_api_keys`
  est sorti du bloc « réglage ». L'exclusion efface aussi les valeurs
  déjà stockées, la clé étant annoncée disparue au tour suivant.
- **Les vingt-sept champs de clés : Charles a tranché le 07/09 — on n'y
  touche pas.** Ses mots : « tout ce qui se passe dans la page
  administrateur ne me dérange en rien [...] toi tu sais ce qui
  fonctionne et moi je sais ce qui fonctionne ». Il est en phase de test,
  ces champs ne le gênent pas. **Ne pas y revenir**, ni proposer de les
  nettoyer. Ce qui suit reste noté pour information seulement.
- **Vingt-deux des vingt-sept champs de clés ne servent à rien.** Seuls
  `anthropic`, `openai`, `gmaps`, `google_cse_cx` et `google_translate`
  sont relus par le code. Les autres s'enregistrent et rien ne les
  consulte — Twilio compris, que Charles avait rempli alors que les SMS
  partent avec la configuration du serveur. Deux champs Firebase font
  double emploi et réclament une clé que Google a supprimée en juin 2024.
- **Badge « Actif v6.1 »** sur une application en 2.0.x.
- **`verif-categories` est cassé** depuis avant le 06/09 : le test
  lui-même, pas l'application.


- Canal temps réel dédié, si la seconde de latence devient gênante. La
  sonde actuelle interroge `GET /sync/version` (0,6 ms) chaque seconde
  quand l'application est utilisée, quinze sinon.
- `pm.max_children = 10` sur `api.timecool.fr` : c'est le plafond à
  surveiller quand le nombre d'utilisateurs montera.
