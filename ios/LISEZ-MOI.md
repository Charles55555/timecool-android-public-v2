# L'application iPhone — première séance sur le Mac

Tout ce qui pouvait être préparé sans Mac l'est. Cette page décrit la
**partie 1 seulement** : installer et compiler. Les essais et l'envoi à
Apple viendront après, dans un ordre séparé.

Compte **deux à trois heures**. Il y aura des messages d'erreur : c'est
normal, recopie-les, ils se règlent un par un.

---

## Avant de commencer

Tu as besoin d'un Mac — loué en ligne ou emprunté — et de rien d'autre.
Pas de compte développeur Apple, pas d'iPhone, pas d'argent dépensé
au-delà des heures de location. Un identifiant Apple gratuit suffit pour
cette étape.

---

## 1. Récupérer le projet

Dans le Terminal du Mac :

```
git clone <adresse du dépôt> timecool
cd timecool
```

## 2. Installer l'outil qui fabrique le projet

```
curl -L -o xcodegen.zip https://github.com/yonaskolb/XcodeGen/releases/latest/download/xcodegen.zip
unzip -q xcodegen.zip
```

Quatre mégaoctets, deux minutes.

**Pourquoi pas Homebrew :** son installateur réclame les droits
administrateur, qu'on n'a pas sur un Mac loué en formule partagée.
XcodeGen se distribue aussi tout compilé — on s'en sert directement.

Si Xcode n'est pas déjà là, installe-le depuis le Mac App Store — c'est
long, une dizaine de gigaoctets. Sur un Mac loué chez MacinCloud, il est
déjà présent.

## 3. Copier la page dans le projet

```
./scripts/preparer-ios.sh
```

**Pourquoi cette étape existe :** la page de TimeCool est unique. Elle
sert à Android, au site web et à l'iPhone. Ce script la recopie dans le
projet Apple. Il faut la relancer après chaque correction de la page.

Ne modifie jamais la copie : elle est écrasée à chaque fois. Tout se
corrige dans l'original.

## 4. Fabriquer le projet Xcode

```
cd ios
../xcodegen_bin/bin/xcodegen
open TimeCool.xcodeproj
```

Si le chemin ne correspond pas, cherche où l'archive s'est décompressée :
`find ~ -name xcodegen -type f 2>/dev/null | head`

Xcode s'ouvre.

**Pourquoi le projet n'est pas dans le dépôt :** Xcode le range dans un
fichier de plusieurs milliers de lignes, illisible et impossible à
relire. On le fabrique donc à la demande, à partir d'un fichier court —
`project.yml`. Celui-là se relit et se corrige.

## 5. Signer avec ton identifiant Apple

Dans Xcode, à gauche, clique sur **TimeCool** tout en haut, puis sur
l'onglet **Signing & Capabilities**.

- coche **Automatically manage signing**
- dans **Team**, choisis ton identifiant Apple — s'il n'y est pas :
  menu Xcode → Settings → Accounts → +

Xcode fabrique alors tout seul ce qu'il faut pour compiler.

## 6. Compiler

En haut à gauche, choisis **iPhone 15** dans la liste des appareils —
c'est l'iPhone simulé, il n'y a pas besoin d'en posséder un.

Puis appuie sur le bouton ▶.

**Ce que tu dois voir :** un iPhone apparaît à l'écran et TimeCool s'y
ouvre, sur la page d'accueil habituelle.

---

## Si ça ne compile pas

C'est le cas le plus probable de cette première séance, et ce n'est pas
grave. Xcode affiche ses erreurs en rouge dans le panneau de gauche.

**Recopie-les telles quelles** et envoie-les-moi. Ne cherche pas à les
corriger toi-même : la plupart tiennent à un détail que je peux régler
en une ligne.

---

## Ce qui ne marchera pas encore, et c'est normal

**Les rappels et Face ID ne fonctionnent pas sur l'iPhone simulé.** Il
faut un vrai appareil, et un compte développeur Apple. C'est la partie 2.

Tout le reste — l'agenda, Charly IA, les contacts, la messagerie, les
envois — doit fonctionner dès cette première compilation.
