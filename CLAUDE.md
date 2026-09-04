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
# Version web
cat app/src/main/assets/index.html | tee /var/www/vhosts/timecool.fr/httpdocs/app/index.html > /dev/null
```

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

## 8. Avant le lancement public

- Retirer `POST /test/sms-twilio`
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

- Canal temps réel dédié, si la seconde de latence devient gênante. La
  sonde actuelle interroge `GET /sync/version` (0,6 ms) chaque seconde
  quand l'application est utilisée, quinze sinon.
- `pm.max_children = 10` sur `api.timecool.fr` : c'est le plafond à
  surveiller quand le nombre d'utilisateurs montera.
