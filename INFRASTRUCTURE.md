# Infrastructure serveur TimeCool

Audit en lecture seule du serveur dédié IONOS. Aucune modification effectuée.

- **Serveur** : 82.165.253.73 (`94DF20D`)
- **Date de l'audit** : 26 août 2026
- **Accès** : SSH par clé, `root@82.165.253.73` avec `~/.ssh/timecool_ionos`

---

## 1. Le serveur est administré par Plesk

C'est le fait structurant de cet audit, et il conditionne toute intervention.

| | |
|---|---|
| Panneau | Plesk Obsidian 18.0.69.3 (build 2025/05/02) |
| OS | Ubuntu 22.04.5 LTS, noyau 5.15.0-190 |
| Racine des sites | `/var/www/vhosts/` |

**Conséquence pratique : ne jamais éditer à la main les configurations Nginx ou Apache.** Plesk les régénère à partir de sa propre base et écrase toute modification manuelle. Les bases de données, domaines et réglages PHP se pilotent via `plesk bin` ou l'interface, sinon le panneau et la réalité divergent.

Nginx (1.26.3) et Apache (2.4.52) tournent **tous les deux** : c'est l'architecture Plesk standard, Nginx en frontal sur les ports 80/443, Apache derrière. Les deux écoutent sur l'IP publique uniquement, pas sur `127.0.0.1` — d'où l'échec d'un `curl http://127.0.0.1` qui n'indique aucun problème.

---

## 2. Base de données

MariaDB **10.6.23** est installé, actif et activé au démarrage.

| Réglage | Valeur |
|---|---|
| Écoute | `127.0.0.1:3306` **uniquement** |
| Moteur par défaut | InnoDB |
| Jeu de caractères serveur | `utf8mb4` |
| Collation serveur | `utf8mb4_general_ci` |

L'écoute restreinte à la boucle locale est une bonne chose : la base n'est pas exposée à Internet, et le pare-feu n'ouvre pas 3306. Toute application devra s'y connecter depuis le serveur lui-même.

### Bases présentes

| Base | Taille | Rôle |
|---|---|---|
| `multi_vendor` | 248,6 Mo — 321 tables | **Denxiad** — production, à ne pas toucher |
| `psa` | 6,6 Mo | Plesk lui-même |
| `mysql` | 4,8 Mo | Système MariaDB |
| `danami_warden` | 1,1 Mo | Extension de sécurité Plesk |
| `apsc` | 0,8 Mo | Catalogue d'applications Plesk |
| `roundcubemail` | 0,5 Mo | Webmail |
| `phpmyadmin` | 0,4 Mo | phpMyAdmin |

Aucune base TimeCool n'existe à ce jour.

### ⚠️ Correction sur Denxiad

`denxiad_mvop` **n'est pas une base de données** : c'est un *utilisateur MySQL*. Aucune base ne porte ce nom.

```
GRANT ... ON `multi_vendor`.* TO `denxiad_mvop`@`%`
```

L'objet à protéger est donc la base **`multi_vendor`** (248,6 Mo, 321 tables), rattachée dans Plesk au domaine `denxiad-france.com`. C'est elle qui porte les données de production Denxiad.

À noter : l'utilisateur `denxiad_mvop` est déclaré avec l'hôte `%` (connexion depuis n'importe quelle machine). Ce n'est pas exploitable en l'état puisque MariaDB n'écoute que sur la boucle locale, mais c'est plus permissif que nécessaire.

---

## 3. Langages disponibles

| Runtime | Version | Remarque |
|---|---|---|
| PHP | 8.0.30, 8.1.34, 8.2.33, 8.3.33 | Fournis par Plesk, dans `/opt/plesk/php/` |
| Python | 3.10.12 | Système |
| Node.js | **absent** | Aucune installation, ni nvm, ni pm2 |

Il n'y a **pas de `php` dans le `PATH` système** — d'où l'échec de `composer` lancé nu. Il faut utiliser le binaire complet, par exemple `/opt/plesk/php/8.3/bin/php`.

Le domaine `timecool.fr` tourne actuellement en **`plesk-php80-fpm`** (PHP 8.0.30). PHP 8.0 n'est plus maintenu en amont ; passer le domaine en 8.3 via Plesk est recommandé avant toute mise en production.

---

## 4. Le site timecool.fr — ⚠️ il n'est PAS sur ce serveur

| | |
|---|---|
| Racine web | `/var/www/vhosts/timecool.fr/httpdocs` |
| Utilisateur système | `timecool.fr_qj0vt3q1c4` |
| Handler PHP | `plesk-php80-fpm` |
| HTTPS | Fonctionnel — `https://timecool.fr` répond **200** |

**Le domaine public ne pointe pas ici.** `timecool.fr` résout vers **217.160.0.228**, un hébergement mutualisé IONOS situé sur un compte client distinct de celui du serveur dédié. Le vhost présent dans Plesk sur 82.165.253.73 ne sert qu'une page par défaut Plesk et ne reçoit aucun trafic : le répertoire est vierge de toute application.

Conséquence directe pour la suite : une API déposée dans `/var/www/vhosts/timecool.fr/httpdocs` **ne serait pas joignable** depuis `https://timecool.fr`. Deux issues possibles — rapatrier le domaine sur le serveur dédié, ou créer un sous-domaine (`api.timecool.fr`) avec un enregistrement A vers 82.165.253.73. Dans les deux cas c'est une modification DNS à effectuer sur l'autre compte IONOS.


Les deux domaines hébergés sont `timecool.fr` et `denxiad-france.com`.

Il n'y a pas de répertoire `/etc/letsencrypt` : les certificats sont gérés par Plesk selon son propre mécanisme, pas par un certbot autonome.

---

## 5. Ressources

Très largement dimensionnées pour le lancement.

| Ressource | Total | Utilisé | Disponible |
|---|---|---|---|
| Disque `/` | 911 Go | 122 Go (15 %) | **743 Go** |
| Inodes `/` | 60,7 M | 0,7 M (2 %) | 60,0 M |
| RAM | 31 Gio | 968 Mio | 29 Gio |
| Swap | 7,5 Gio | 0 | 7,5 Gio |

`/var/www/vhosts` occupe 21 Go, essentiellement Denxiad.

---

## 6. Réseau et sécurité

Pare-feu **ufw actif**. Ports ouverts : 22 (SSH), 80/443 (web), 8443/8880 (Plesk), 21 (FTP), 25/465/110/143/993/995/4190 (messagerie), 53 (DNS).

**3306 n'est pas ouvert** — MariaDB reste inaccessible depuis l'extérieur.

Docker n'est pas installé.

Des sauvegardes Plesk existent dans `/var/lib/psa/dumps/`. Leur périmètre et leur fréquence n'ont pas été vérifiés : **à confirmer avant toute opération d'écriture en base.**

---

## 7. Points d'attention pour la suite

1. **`multi_vendor` est la production Denxiad.** Toute opération doit être explicitement limitée à la base TimeCool. Aucun `GRANT ... ON *.*`, aucun `mysqldump --all-databases`.
2. **Passer par Plesk pour créer la base**, afin qu'elle apparaisse dans le panneau et entre dans le périmètre de sauvegarde. Une base créée directement en SQL resterait invisible de Plesk.
3. **PHP 8.0 est en fin de vie** sur `timecool.fr` — le passer en 8.3 avant le lancement public.
4. **Pas de Node.js** : le backend devra être en PHP, ou il faudra installer Node (via l'extension Node.js de Plesk, pour rester cohérent avec le panneau).
5. **Vérifier les sauvegardes** avant la première écriture en base.
6. **Le DNS de `timecool.fr` est le préalable au déploiement** : sans enregistrement pointant vers 82.165.253.73, rien de ce qui sera installé sur ce serveur ne sera accessible publiquement.
6. **Le DNS de `timecool.fr` est le préalable au déploiement** : sans enregistrement pointant vers 82.165.253.73, rien de ce qui est installé ici ne sera accessible publiquement.

---

## 8. Chantier de mise en production — 29 août 2026

Les trois points bloquants identifiés en section 4 sont réglés. Réalisé par Charly en SSH depuis son PC, étape par étape, avec vérifications indépendantes (DNS public, lecture du code) faites depuis une session Claude Code cloud — voir point "Limitation réseau" ci-dessous pour pourquoi c'est elle et pas la session qui a exécuté.

### DNS — résolu

`timecool.fr`, `www.timecool.fr` et `api.timecool.fr` pointent tous les trois vers `82.165.253.73`. La zone DNS se gère depuis le panneau client IONOS (my.ionos.fr), indépendamment de Plesk sur le serveur dédié — deux systèmes d'authentification distincts, à ne pas confondre. `api.timecool.fr` existait déjà avant ce chantier, il n'a pas eu besoin d'être créé.

### Base de données — créée

Base `timecool`, créée via Plesk (jamais en SQL direct, pour rester dans le périmètre de sauvegarde du panneau). Utilisateur dédié `timecool_app`, droits vérifiés par `SHOW GRANTS FOR 'timecool_app'@'localhost';` — limités strictement à `timecool`, jamais `multi_vendor`.

Commande Plesk qui fonctionne sur cette version (les options `-domain` et `-type` sont obligatoires, une première tentative sans elles avait échoué) :
```
plesk bin database --create-dbuser NOM_UTILISATEUR -domain NOM_DOMAINE -database NOM_BASE -type mysql -passwd 'MOT_DE_PASSE'
```

### Backend PHP — déployé

Disposition des fichiers, dictée par le code lui-même (`index.php` fait `require __DIR__ . '/../private/lib.php'`) :

```
/var/www/vhosts/timecool.fr/
  httpdocs/
    api/
      index.php
      .htaccess
      rdv.html
  private/                    ← hors zone web, jamais servi même si PHP est mal configuré
    lib.php
    config.php
```

`config.php` (copié depuis `backend/api/config.exemple.php`, jamais commité) contient trois secrets renseignés **directement sur le serveur, jamais transmis dans un chat** : `mot_de_passe` (utilisateur `timecool_app`), `poivre` et `cle_chiffrement` (deux valeurs *distinctes*, générées chacune par `openssl rand -hex 32`). Permissions `chmod 640`, propriétaire `timecool.fr_qj0vt3q1c4:psacln` (nom d'utilisateur système à revérifier avec `ls -la /var/www/vhosts/timecool.fr/` s'il a pu changer).

Vérification de bon fonctionnement :
```
curl -sk -o /dev/null -w '%{http_code}\n' https://api.timecool.fr/parametres
```
doit renvoyer `200`.

### ⚠️ Limitation réseau — confirmée, définitive

**Aucune session Claude Code cloud ne peut atteindre ce serveur**, quels que soient les identifiants fournis (root SSH, compte Plesk dédié à `timecool.fr`, même scindé de `denxiad-france.com`). Testé et confirmé sur SSH (22), Plesk (8443) et HTTPS (443) : le trafic sortant du bac à sable passe par un proxy qui répond explicitement `403 host_not_allowed` pour ce serveur — un refus net, pas une histoire de identifiants ou de permissions.

**Conséquence pratique pour toute tâche serveur future** : elle doit être exécutée par Charly en SSH direct depuis son PC (`root@82.165.253.73`, clé `~/.ssh/timecool_ionos`), guidé commande par commande par Claude Code — jamais tentée en autonome depuis une session cloud, quelle que soit la façon dont l'accès est proposé.

Restent non résolus, à traiter avant lancement public (voir aussi section 7) :
- PHP 8.0 sur `timecool.fr` à passer en 8.3.
- `google_client_ids`, identifiants Twilio (`twilio_account_sid`/`twilio_auth_token`/`twilio_numero_expediteur`) et service d'envoi email (SendGrid ou équivalent, pas encore branché) dans `config.php` avant l'ouverture publique. Renseigner les identifiants Twilio suffit à faire disparaître le mode test SMS de lui-même — voir `Sms::estConfigure()` dans `lib.php` ; `verification_obligatoire` reste à repasser à `true` séparément.
