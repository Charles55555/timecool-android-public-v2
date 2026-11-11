// Mission 79 : la version Google Play (variante « play ») n a aucune mise a jour integree,
// la version du site (variante « site ») garde exactement la sienne.
// Usage : node verif-canal-play.js app/src/main/assets/index.html
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PAGE = process.argv[2];
const RACINE = path.resolve(path.dirname(PAGE), '..', '..', '..', '..');
const lire = (f) => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8'); } catch (e) { return ''; } };
const html = fs.readFileSync(PAGE, 'utf8');

let ko = 0, n = 0;
function verifie(libelle, condition, detail) {
  n++;
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle + (detail && !condition ? '  : ' + detail : ''));
}
function titre(t) { console.log('\n' + t); }

/* ── Construction ────────────────────────────────────────────────── */
titre('Deux variantes, une seule appli');
const gradle = lire('app/build.gradle');
const blocSite = (gradle.match(/\n        site \{[\s\S]*?\n        \}/) || [''])[0];
const blocPlay = (gradle.match(/\n        play \{[\s\S]*?\n        \}/) || [''])[0];
verifie('productFlavors site et play, dimension canal', /flavorDimensions = \['canal'\]/.test(gradle) && blocSite && blocPlay);
verifie('meme applicationId pour les deux (aucun suffixe de variante)', /applicationId "com\.timecool\.app"/.test(gradle) && !/applicationIdSuffix/.test(blocSite + blocPlay));
verifie('versionCode commun (defaultConfig, aucun versionCode de variante)', /versionCode resolvedVersionCode/.test(gradle) && !/versionCode/.test(blocSite + blocPlay));
verifie('play cible le niveau 36 (exigence Google Play du 31/08/2026)', /targetSdk 36/.test(blocPlay));
verifie('site garde le niveau 34 (comportement inchange)', /targetSdk 34/.test(blocSite) && /\n        targetSdk 34\n/.test(gradle));
verifie('compileSdk 36', /\n    compileSdk 36\n/.test(gradle));
verifie('BuildConfig.CANAL vaut site ou play', /"CANAL", "\\"site\\""/.test(blocSite) && /"CANAL", "\\"play\\""/.test(blocPlay));
verifie('AGP 8.13.0 et Gradle 8.13 (compileSdk 36)', /version '8\.13\.0'/.test(lire('build.gradle')) && /gradle-8\.13-bin\.zip/.test(lire('gradle/wrapper/gradle-wrapper.properties')));

titre('REQUEST_INSTALL_PACKAGES : site seulement');
const manMain = lire('app/src/main/AndroidManifest.xml');
const manSite = lire('app/src/site/AndroidManifest.xml');
verifie('absente du manifeste principal', manMain && !/<uses-permission[^>]*REQUEST_INSTALL_PACKAGES/.test(manMain));
verifie('declaree dans src/site/AndroidManifest.xml', /<uses-permission android:name="android\.permission\.REQUEST_INSTALL_PACKAGES"\/>/.test(manSite));
verifie('aucun manifeste propre a play', !fs.existsSync(path.join(RACINE, 'app/src/play/AndroidManifest.xml')));

titre('Le code natif de mise a jour : site seulement');
const act = lire('app/src/main/java/com/timecool/app/MainActivity.java');
const majSite = lire('app/src/site/java/com/timecool/app/MajApk.java');
const majPlay = lire('app/src/play/java/com/timecool/app/MajApk.java');
const retour = lire('app/src/main/java/com/timecool/app/RetourPredictif.java');
verifie('le pont dit son canal (canal() rend BuildConfig.CANAL)', /@JavascriptInterface\n        public String canal\(\) \{\n            return BuildConfig\.CANAL;/.test(act));
verifie('telechargerEtInstallerMaj passe par MajApk', /public void telechargerEtInstallerMaj\(final String url\) \{[\s\S]{0,300}MajApk\.lancer\(MainActivity\.this, url\);\n        \}/.test(act));
verifie('plus aucun telechargement ni installation d APK dans le code commun', !/package-archive|HttpURLConnection|timecool-maj\.apk/.test(act));
verifie('MajApk du site : telechargement, FileProvider, installateur', /HttpURLConnection/.test(majSite) && /application\/vnd\.android\.package-archive/.test(majSite) && /FileProvider\.getUriForFile/.test(majSite) && /tcMajProgression/.test(majSite) && /tcMajPrete/.test(majSite));
verifie('MajApk de play : ni reseau, ni fichier, ni installateur', majPlay && !/HttpURLConnection|URL\(|package-archive|startActivity|FileProvider|File\(/.test(majPlay) && /tcMajEchec/.test(majPlay));
verifie('marges systeme posees seulement au niveau 35 et plus', /if \(Build\.VERSION\.SDK_INT < 35 \|\| getApplicationInfo\(\)\.targetSdkVersion < 35\) return;/.test(act) && /WindowInsets\.Type\.systemBars\(\)\n\s+\| WindowInsets\.Type\.displayCutout\(\) \| WindowInsets\.Type\.ime\(\)/.test(act));
verifie('retour arriere par OnBackInvokedDispatcher au niveau 36, onBackPressed garde', /targetSdkVersion >= 36\) \{\n            retourPredictif = new RetourPredictif\(this, webView\);/.test(act) && /public void onBackPressed\(\)/.test(act) && /doUpdateVisitedHistory[\s\S]{0,120}majRetourPredictif\(\)/.test(act) && /registerOnBackInvokedCallback/.test(retour) && /unregisterOnBackInvokedCallback/.test(retour));
const layout = lire('app/src/main/res/layout/activity_main.xml');
verifie('la WebView est dans un cadre « racine »', /<FrameLayout[\s\S]*android:id="@\+id\/racine"[\s\S]*<WebView[\s\S]*android:id="@\+id\/webview"/.test(layout));

titre('GitHub : APK du site inchange, bundle Google Play en artefact');
const wf = lire('.github/workflows/build-apk.yml');
verifie('une seule commande pour les deux, meme versionCode', /\.\/gradlew assembleSiteRelease bundlePlayRelease --stacktrace/.test(wf) && (wf.match(/VERSION_CODE:/g) || []).length === 1);
verifie('l APK du site vient de la variante site', /SRC=app\/build\/outputs\/apk\/site\/release\/app-site-release\.apk/.test(wf) && /cp "\$SRC" dist\/timecool\.apk/.test(wf));
verifie('le bundle est verifie (jarsigner) et depose en artefact', /bundle\/playRelease\/app-play-release\.aab/.test(wf) && /jarsigner -verify/.test(wf) && /name: TimeCool-Play-/.test(wf) && /path: dist-play\/\*\.aab/.test(wf));
const release = (wf.match(/gh release create[\s\S]*$/) || [''])[0];
verifie('le bundle n est pas dans la Release publique', release && !/\.aab|dist-play/.test(release));

/* ── La page ─────────────────────────────────────────────────────── */
titre('La page : rien de la mise a jour integree dans la version Google Play');
const d = html.indexOf('const TC_MAJ_API');
const f = html.indexOf("window.addEventListener('load', function() {", d);
const SOURCE = d > -1 && f > d ? html.slice(d, f) : '';
verifie('bloc des mises a jour trouve', !!SOURCE);

function contexte(pont) {
  const j = { fetch: [], toasts: [], rafraichir: 0, installe: 0, intervalles: 0 };
  const ctx = {
    console,
    window: pont ? { TimeCoolNatif: pont(j) } : {},
    document: { hidden: false, readyState: 'complete', getElementById: () => null, addEventListener: () => {}, body: { classList: { add() {}, remove() {} } } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout: () => 0,
    setInterval: () => { j.intervalles++; return 0; },
    fetch: async (u) => { j.fetch.push(String(u)); return { ok: true, json: async () => ({ tag_name: 'v2.0.999', deploiement: '1' }) }; },
    showToast: (t) => j.toasts.push(t),
    tcInfosVersion: () => ({ version: '2.0.400', buildTime: null }),
    loadAutoUpdatePref: () => false,
    tcRafraichirTout: () => { j.rafraichir++; },
    tcInitTirerRafraichir: () => {},
    navigate: () => {},
    currentPage: 'settings',
  };
  vm.createContext(ctx);
  vm.runInContext(SOURCE, ctx);
  return { ctx, j };
}
const pontPlay = (j) => ({ estNatif: () => true, canal: () => 'play', telechargerEtInstallerMaj: () => { j.installe++; } });
const pontSite = (j) => ({ estNatif: () => true, canal: () => 'site', telechargerEtInstallerMaj: () => { j.installe++; } });
const pontAncien = (j) => ({ estNatif: () => true, telechargerEtInstallerMaj: () => { j.installe++; } });

(async function () {
  if (SOURCE) {
    {
      const { ctx, j } = contexte(pontPlay);
      verifie('play : tcMajParBoutique vrai, tcMajIntegree faux', ctx.tcMajParBoutique() === true && ctx.tcMajIntegree() === false);
      await ctx.checkForUpdates(false); await ctx.checkForUpdates(true);
      verifie('play : aucune verification des releases, aucun message', j.fetch.length === 0 && j.toasts.length === 0, JSON.stringify(j));
      ctx.tcLancerMaj('2.0.999');
      verifie('play : tcLancerMaj ne telecharge rien', j.installe === 0 && j.toasts.length === 0);
      ctx.tcMettreAJourMaintenant();
      verifie('play : le bouton du haut actualise les donnees, sans verification', j.rafraichir === 1 && j.fetch.length === 0 && j.installe === 0);
      ctx.tcSurveillerMaj();
      verifie('play : aucune surveillance du site', j.fetch.length === 0 && j.intervalles === 0);
    }
    {
      const { ctx, j } = contexte(pontSite);
      verifie('site : tcMajIntegree vrai', ctx.tcMajIntegree() === true && ctx.tcMajParBoutique() === false);
      await ctx.checkForUpdates(true);
      verifie('site : verifie les releases GitHub comme avant', j.fetch.length === 1 && /api\.github\.com\/repos\/.+\/releases\/latest/.test(j.fetch[0]));
      ctx.tcLancerMaj('2.0.999');
      verifie('site : tcLancerMaj telecharge et installe comme avant', j.installe === 1);
      ctx.tcMettreAJourMaintenant();
      verifie('site : le bouton du haut verifie la version comme avant', j.rafraichir === 0 && j.fetch.length === 2);
    }
    {
      const { ctx, j } = contexte(pontAncien);
      verifie('pont sans canal (ancien APK) : vaut site', ctx.tcMajIntegree() === true && ctx.tcMajParBoutique() === false);
      await ctx.checkForUpdates(true);
      verifie('pont sans canal : verifie les releases comme avant', j.fetch.length === 1);
    }
    {
      const { ctx, j } = contexte(null);
      verifie('navigateur : ni boutique ni mise a jour integree', ctx.tcMajParBoutique() === false && ctx.tcMajIntegree() === false);
      await ctx.checkForUpdates(true);
      verifie('navigateur : message habituel, aucune verification', j.fetch.length === 0 && j.toasts.length === 1 && /uniquement dans l/.test(j.toasts[0]));
    }
  }

  titre('Parametres, Charly, bouton du haut');
  const a = html.indexOf('<div id="updateBannerZone"></div>');
  const b = html.indexOf('🔄 Vérifier</div>', a);
  const zone = a > -1 && b > a ? html.slice(a, b + 200) : '';
  const sep = zone.indexOf('` : `');
  const branchePlay = sep > -1 ? zone.slice(0, sep) : '';
  const brancheSite = sep > -1 ? zone.slice(sep) : '';
  verifie('Parametres : deux branches selon tcMajParBoutique()', /\$\{\(typeof tcMajParBoutique === 'function' && tcMajParBoutique\(\)\) \? `/.test(zone) && /🔄 Vérifier<\/div>\n      <\/div>\n      `\}\n/.test(zone));
  verifie('Parametres play : la version, sans interrupteur ni verification', /Version actuelle : \$\{tcFormaterVersion\(\)\}/.test(branchePlay) && !/autoUpdateToggle|checkForUpdates|Mise à jour automatique|Vérifier/.test(branchePlay) && /Les mises à jour arrivent par Google Play\./.test(branchePlay));
  verifie('Parametres site : interrupteur et verification inchanges', /id="autoUpdateToggle"/.test(brancheSite) && /onclick="checkForUpdates\(true\)"/.test(brancheSite) && /Version actuelle : \$\{tcFormaterVersion\(\)\}/.test(brancheSite));
  verifie('Charly : pas de « Mise à jour automatique » dans la version Google Play', /if \(\/Mise à jour automatique\/\.test\(phrase\) && typeof tcMajParBoutique === 'function' && tcMajParBoutique\(\)\) \{\n\s+phrase = 'Les mises à jour de l’application arrivent par Google Play : rien à régler ici\.';/.test(html));
  verifie('bouton du haut renomme « Actualiser » dans la version Google Play', /if \(tcMajParBoutique\(\)\) \{\n\s+const b = document\.querySelector\('\.header-right \.icon-btn\[onclick="tcMettreAJourMaintenant\(\)"\]'\);\n\s+if \(b\) \{ b\.title = 'Actualiser'; b\.setAttribute\('aria-label', 'Actualiser'\); \}/.test(html));
  verifie('tirer pour rafraichir : pas de verification de version dans play', /const dansApk = !parBoutique && /.test(html) && /\} else if \(parBoutique\) \{/.test(html));

  console.log('\n' + (ko ? ko + ' KO sur ' + n : n + ' verifications OK'));
  process.exit(ko ? 1 : 0);
})();
