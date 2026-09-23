# Les contrôles avant de livrer

```bash
bash scripts/verifications/verifier.sh      # depuis la racine du dépôt
```

Vert : on peut livrer. Rouge : on ne livre pas.

**Ne jamais lire le résultat à travers un tuyau.** `verifier.sh | tail -1`
renvoie le code de sortie de `tail`, jamais celui des contrôles — deux
livraisons sont parties avec une suite rouge à cause de ça. Écrire le
résultat dans un fichier, puis lire `$?` :

```bash
bash scripts/verifications/verifier.sh > /tmp/res.txt 2>&1; code=$?
```

## Ce que ces contrôles sont

Chaque suite extrait les vraies fonctions de `index.html` et les
exécute. Elles ne relisent pas le code : elles le font tourner. Une
suite qui vérifie seulement qu'un mot est présent dans le fichier ne
prouve presque rien — s'en servir avec parcimonie, et uniquement pour
ce qui n'est pas exécutable (un texte de consigne donné à Charly, une
règle CSS).

Quand une suite devient rouge après un changement légitime, la
question est toujours la même dans cet ordre : **le code est-il juste ?**
Si oui, c'est le contrôle qui a vieilli — le mettre à jour, et
profiter de l'occasion pour le rendre moins fragile. Un contrôle qui
recopie une liste à la main, ou qui compte des appels, se casse au
premier ajout légitime : le faire dépendre de la source de vérité.

## Neuf suites qui ne sont pas lancées

Elles existent dans ce dossier mais `verifier.sh` ne les appelle pas :
elles étaient déjà rouges avant d'arriver ici, et il faut les examiner
une par une avant de les réintégrer. Aucune n'a été écrite pour rien —
elles décrivent du comportement réel.

| Suite | Ce qui bloque |
|---|---|
| `verif-admin-e2e` | demande un jeton d'administration |
| `verif-suppression-e2e` | idem — HTTP 401 |
| `verif-site-langues` | attend le fichier du site, pas `index.html` |
| `verif-micro` | idem, argument manquant |
| `verif-pont-ios` | idem, argument manquant |
| `verif-bandeau-maj` | n'extrait plus `tcInitTirerRafraichir` |
| `verif-categories` | n'extrait plus `switchMode` |
| `verif-creneaux` | à vérifier : ouverture des liens WhatsApp |
| `verif-invitation` | à vérifier : lien SMS d'invitation |

Les deux « à vérifier » touchent du comportement utilisateur réel et
méritent d'être regardées en premier.
