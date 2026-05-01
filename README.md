# TimeCool — Application Android

Application Android TimeCool v2.0 — Agenda intelligent pour particuliers et professionnels.

## Structure du projet

```
TIMECOOL-PUBLIC-V2/
├── .github/
│   └── workflows/
│       └── build-apk.yml          ← GitHub Actions (génère l'APK auto)
├── app/
│   └── src/main/
│       ├── assets/
│       │   └── index.html         ← L'application TimeCool complète
│       ├── java/com/timecool/app/
│       │   └── MainActivity.java  ← WebView Android
│       ├── res/                   ← Icônes et ressources
│       └── AndroidManifest.xml
├── build.gradle
├── settings.gradle
├── gradle.properties
└── gradlew / gradlew.bat
```

## Comment générer l'APK sur GitHub

### Étape 1 — Créer le dépôt GitHub

1. Va sur [github.com](https://github.com) et connecte-toi
2. Clique sur **New repository**
3. Nom : `timecool-android`
4. Visibilité : **Private** (recommandé)
5. Clique **Create repository**

### Étape 2 — Pousser ce projet sur GitHub

Ouvre un terminal dans ce dossier (`TIMECOOL-PUBLIC-V2`) et exécute :

```bash
git init
git add .
git commit -m "Initial commit - TimeCool v2.0 Android"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/timecool-android.git
git push -u origin main
```

> Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub.

### Étape 3 — L'APK se génère automatiquement

Dès que tu pousses le code :
1. Va dans l'onglet **Actions** de ton dépôt GitHub
2. Tu verras le workflow **"Build TimeCool APK"** en cours d'exécution
3. Attends ~3-5 minutes que le build se termine
4. Clique sur le workflow terminé
5. Dans la section **Artifacts**, clique sur **TimeCool-v2.0-debug**
6. Dézippe le fichier — tu obtiens `app-debug.apk`

### Étape 4 — Installer l'APK sur ton Android

1. Copie le fichier `app-debug.apk` sur ton smartphone (par USB ou cloud)
2. Sur le téléphone, va dans **Paramètres > Sécurité**
3. Active **"Installer des applications inconnues"** pour le gestionnaire de fichiers
4. Ouvre l'APK depuis le gestionnaire de fichiers
5. Clique **Installer**

## Lancer le build manuellement

Tu peux aussi déclencher le build manuellement sans pousser de code :
1. Onglet **Actions** → **Build TimeCool APK**
2. Bouton **Run workflow** → **Run workflow**

## Configuration technique

| Paramètre | Valeur |
|-----------|--------|
| Android minimum | API 26 (Android 8.0+) |
| Android cible | API 34 (Android 14) |
| Version app | 2.0 |
| Package | `com.timecool.app` |
| Build | Debug (installable directement) |

## Pour mettre à jour l'application

Si tu modifies le fichier HTML :
1. Remplace `app/src/main/assets/index.html` par la nouvelle version
2. `git add app/src/main/assets/index.html`
3. `git commit -m "Mise à jour TimeCool vX.Y"`
4. `git push`
5. GitHub génère automatiquement le nouvel APK
