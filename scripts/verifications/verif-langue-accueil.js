// Mission 87 (Charles, 14/11 : « pourquoi il faut s'inscrire pour changer de langue ? ») : la langue choisie dans le
// selecteur s'applique tout de suite aux ecrans d'avant connexion (bienvenue, inscription, verification, code,
// connexion, mot de passe oublie), sans compte ni reseau ; le francais reste mot pour mot ; le choix est garde sur
// l'appareil et passe au compte a l'inscription ou a la connexion.
// Usage : node verif-langue-accueil.js <index.html> <backend/api/index.php>
//   (TC_CHROME = chemin de Chrome : rejoue aussi les ecrans dans un vrai Chrome sans tete ; sans Chrome, cette partie
//    est « non jouee », comme verif-contraste-sombre ; TC_CAPTURES_87 = dossier ou ecrire les captures)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const pageChemin = process.argv[2];
const page = fs.readFileSync(pageChemin, 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 400) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const bloc = (re) => { const m = page.match(re); return m ? m[0] : ''; };

titre('Le dictionnaire fige, branche sur la traduction existante');
const decl = bloc(/var TC_ACCUEIL_FR = [\s\S]*?\nvar _tcAccueilIndex = null;/);
verifie('TC_ACCUEIL_FR et TC_ACCUEIL_TEXTES existent (un seul endroit)', !!decl && page.split('var TC_ACCUEIL_FR = ').length === 2);
const ctx = { console, String, Number, Object, Array, JSON, Math, Intl, currentLanguage: 'fr' };
vm.createContext(ctx);
try {
  vm.runInContext(decl, ctx);
  ['tcAccueilNormaliser', 'tcAccueilTrouver', 'tcTraduireFixe', 'tcT', 'tcLangueCourante'].forEach((n) => vm.runInContext(fonction(page, n) || '', ctx));
} catch (e) { verifie('le dictionnaire se charge', false, e.message); }
const FR = ctx.TC_ACCUEIL_FR || [];
const TX = ctx.TC_ACCUEIL_TEXTES || {};
const proposees = [...page.matchAll(/\{ code: '([a-z]{2})', flag: '[^']*', label: '[^']*', active: true \}/g)].map((m) => m[1]).filter((c) => c !== 'fr');
verifie('toutes les langues du selecteur (hors francais) ont leurs textes, ni plus ni moins', proposees.length === 16 && proposees.every((l) => TX[l]) && Object.keys(TX).length === proposees.length, proposees.length + ' langues : ' + Object.keys(TX).join(' '));
proposees.forEach((l) => {
  const L = TX[l] || [];
  const defauts = [];
  if (L.length !== FR.length) defauts.push(L.length + ' textes sur ' + FR.length);
  L.forEach((t, i) => {
    if (typeof t !== 'string' || !t.trim()) defauts.push('vide ' + i);
    const a = (FR[i].match(/\{n\}/g) || []).length, b = (String(t).match(/\{n\}/g) || []).length;
    if (a !== b) defauts.push('{n} ' + i);
    ['TimeCool', 'TIMECOOL', 'Charly', 'Google', 'contact@timecool.fr'].forEach((w) => { if (FR[i].indexOf(w) >= 0 && String(t).indexOf(w) < 0) defauts.push(w + ' ' + i); });
    if (/[<>]/.test(t)) defauts.push('balise ' + i);
  });
  const identiques = L.filter((t, i) => t === FR[i]);
  verifie(l + ' : ' + L.length + ' textes, {n}, marques (TimeCool, Charly, Google) intactes, rien de vide' + (identiques.length ? ' ; identiques au francais : ' + identiques.join(' | ') : ''), defauts.length === 0 && identiques.length <= 3, defauts.slice(0, 8).join(', '));
});
verifie('aucune cle en double', new Set(FR.map((f) => f.replace(/\s+/g, ' ').trim())).size === FR.length);

titre('Le francais ne change pas, les autres langues suivent');
if (typeof ctx.tcT !== 'function' || !FR.length) { verifie('tcT et le dictionnaire existent (page d avant la mission 87 : non)', false); terminer(); }
verifie('en francais, tcT rend chaque texte mot pour mot', FR.every((f) => { ctx.currentLanguage = 'fr'; return ctx.tcT(f) === f; }));
const essais = [
  ['es', 'Bienvenue !', undefined, '¡Bienvenido!'],
  ['es', '✨ Créer mon compte', undefined, '✨ Crear mi cuenta'],
  ['en', 'Continuer →', undefined, 'Continue →'],
  ['en', '🔓 J\'ai déjà un compte', undefined, '🔓 I already have an account'],
  ['en', 'Prénom *', undefined, 'First name *'],
  ['es', '⚠️ {n} champs sont à corriger', 3, '⚠️ Hay 3 campos que corregir'],
  ['fi', '↻ Renvoyer le code (dans {n} s)', 42, '↻ Lähetä koodi uudelleen (42 s kuluttua)'],
  ['de', '⚠️ Ce numéro a déjà un compte TimeCool : connecte-toi, ou utilise « Mot de passe oublié ».', undefined, '⚠️ Diese Nummer hat bereits ein TimeCool-Konto: Melde dich an oder nutze „Passwort vergessen“.'],
  ['en', 'Donne l’adresse e-mail de ton compte TimeCool. Tu recevras un\n        code à 6 chiffres.', undefined, 'Enter the email address of your TimeCool account. You will receive a 6-digit code.'],
  ['es', 'Un texte que le dictionnaire ignore', undefined, 'Un texte que le dictionnaire ignore'],
  ['fr', 'Numéro invalide : {n} chiffre(s) saisi(s), il en faut entre 8 et 15.', 5, 'Numéro invalide : 5 chiffre(s) saisi(s), il en faut entre 8 et 15.'],
  ['fr', '⚠️ {n} champs sont à corriger', 2, '⚠️ 2 champs sont à corriger'],
];
essais.forEach(([l, fr, n, attendu]) => { ctx.currentLanguage = l; const r = ctx.tcT(fr, n); verifie(l + ' : « ' + fr.replace(/\s+/g, ' ').slice(0, 50) + ' » → « ' + attendu.slice(0, 60) + ' »', r === attendu, r); });
ctx.currentLanguage = 'fr';

titre('Chaque texte des ecrans d avant connexion est dans le dictionnaire');
const debut = page.indexOf('<div class="page auth-page" id="page-auth-welcome"');
const fin = page.indexOf('<!-- Page Confirmation compte créé -->');
let html = debut > 0 && fin > debut ? page.slice(debut, fin) : '';
verifie('les six ecrans sont trouves (bienvenue, inscription, verification, code, mot de passe oublie x2, connexion)', ['page-auth-welcome', 'page-auth-signup', 'page-auth-verify-method', 'page-auth-verify-code', 'page-auth-oubli"', 'page-auth-oubli-code', 'page-auth-login'].every((id) => html.indexOf(id) >= 0));
html = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<div id="langMenu"[\s\S]*?<\/div>/, ' ');
// Remplaces par le code avant d etre vus (destinations du code, nom de la langue choisie).
const REMPLACES = ['Au numéro +33 ...', 'À l\'adresse ...', 'Un code à 6 chiffres a été envoyé...', 'Français'];
const textes = [];
html.split(/<[^>]+>/).forEach((t) => { const v = t.replace(/\s+/g, ' ').trim(); if (/[a-zA-ZÀ-ÿ]{2,}/.test(v) && REMPLACES.indexOf(v) < 0 && ['TIME', 'COOL', 'TIMECOOL'].indexOf(v) < 0) textes.push(v); });
[...html.matchAll(/placeholder="([^"]*)"/g)].forEach((m) => { if (/[a-zA-ZÀ-ÿ]{2,}/.test(m[1])) textes.push(m[1]); });
const absents = textes.filter((t) => proposees.some((l) => ctx.tcTraduireFixe(t, l) === null));
verifie(textes.length + ' textes et textes d aide lus a l ecran : tous traduits dans les 16 langues', textes.length > 60 && absents.length === 0, absents.slice(0, 10).join(' | '));
const FONCTIONS = ['submitSignup', 'chooseVerifyMethod', 'submitVerifyCode', 'resendCode', 'submitLogin', 'tcCreerCompte', 'tcOubliDemanderCode', 'tcOubliChanger', 'tcRenvoiAttendre', 'tcVerifDebut', 'tcVerifFin', 'suggestStrongPassword', 'openPhoneCountryPicker', 'tcAfficherBoutonBiometrie', 'selectLanguage'];
const litteraux = [];
FONCTIONS.forEach((nom) => {
  const f = fonction(page, nom) || '';
  if (!f) litteraux.push('FONCTION ABSENTE ' + nom);
  [...f.matchAll(/(?:showToast|tcT|signaler\([^,]+, [^,]+,)\s*\(?\s*'((?:[^'\\]|\\.)*)'/g)].forEach((m) => litteraux.push(m[1].replace(/\\'/g, '\'')));
  [...f.matchAll(/\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\)/g)].forEach((m) => { litteraux.push(m[1].replace(/\\'/g, '\'')); litteraux.push(m[2].replace(/\\'/g, '\'')); });
});
const textesCode = litteraux.filter((t) => /[a-zA-ZÀ-ÿ]{2,}/.test(t) && !/^\$\{|^❌ $|^⚠️ $|^⏳ $/.test(t));
const absentsCode = textesCode.filter((t) => t.indexOf('FONCTION ABSENTE') === 0 || proposees.some((l) => ctx.tcTraduireFixe(t, l) === null));
verifie(textesCode.length + ' messages du code (erreurs sous les champs, messages, boutons qui changent) : tous traduits', textesCode.length > 40 && absentsCode.length === 0, absentsCode.slice(0, 10).join(' | '));
const SERVEUR = ['Numéro de téléphone invalide.', 'Ce numéro ne peut pas recevoir de SMS : vérifie-le.', 'Il faut un numéro de portable (06 ou 07) : le code arrive par SMS.', 'Pour l’instant, TimeCool accepte les portables de France et d’Europe.', 'Un code vient de partir : attends une minute avant d’en demander un autre.', 'Trop de codes demandés pour ce numéro : réessaie dans une heure.', 'Trop de codes demandés depuis cette connexion : réessaie demain.', 'Beaucoup d’inscriptions en ce moment : réessaie dans quelques heures.', 'Le SMS n’a pas pu partir : réessaie dans un instant.', 'Confirme d’abord ton numéro de portable avec le code reçu par SMS.', 'Un compte existe déjà avec cet email ou ce numéro.', 'Identifiant ou mot de passe incorrect.', 'Ce compte a été clôturé.', 'Vérification absente, expirée ou déjà utilisée.'];
verifie('les messages du serveur (inscription, code, connexion) sont encore ceux de l API, et traduits', SERVEUR.every((m) => api.indexOf(m) >= 0) && SERVEUR.every((m) => proposees.every((l) => ctx.tcTraduireFixe(m, l) !== null)), SERVEUR.filter((m) => api.indexOf(m) < 0).join(' | '));
{
  // L API ecrit celui-ci avec des espaces insecables (avant « : » et dans « ») : la cle les lit comme des espaces.
  const brut = (api.match(/'numero_deja_inscrit',\s*'([^']+)'/) || [])[1] || '';
  verifie('le message « numéro déjà inscrit » (espaces insécables dans l API) et « compte suspendu » sont traduits', brut.replace(/\s+/g, ' ') === 'Ce numéro a déjà un compte TimeCool : connecte-toi, ou utilise « Mot de passe oublié ».' && / /.test(brut) && proposees.every((l) => ctx.tcTraduireFixe('⚠️ ' + brut, l) !== null) && /'Votre compte a été suspendu\. Écrivez à contact@timecool\.fr\.'/.test(api), brut);
}

titre('Branche aux bons endroits');
const tpg = fonction(page, 'translatePageWithGoogle') || '';
verifie('sans compte, la page se traduit quand meme (textes figes seulement), sans « Connecte-toi pour traduire »', /if \(!TC_BACKEND\.estConnecte\(\)\) silent = true;/.test(tpg) && tpg.indexOf('Connecte-toi pour traduire') < 0);
const tt = fonction(page, 'translateText') || '';
verifie('translateText : sans compte, le dictionnaire avant le cache ; connecte, Google comme avant (examen, remarque 1)', /var fixe = TC_BACKEND\.estConnecte\(\) \? null : tcTraduireFixe\(text, targetLang\);/.test(tt) && tt.indexOf('tcTraduireFixe') < tt.indexOf('TC_TRANSLATE_CACHE[cacheKey]'));
verifie('showToast (sans compte seulement) et les erreurs sous les champs passent par tcT', /if \(typeof tcT === 'function' && typeof TC_BACKEND !== 'undefined' && !TC_BACKEND\.estConnecte\(\)\) msg = tcT\(msg\);\n\s*t\.textContent = msg;/.test(fonction(page, 'showToast') || '') && /zone\.textContent = tcT\(message\)/.test(fonction(page, 'tcErreurChamp') || ''));
{
  // Connecte : « Connexion » ailleurs dans l appli part chez Google comme avant, sans prendre le texte de l ecran de connexion.
  const c4 = Object.assign({}, ctx, { TC_TRANSLATE_CACHE: {}, localStorage: { setItem() {} }, TC_BACKEND: { estConnecte: () => true }, envoyes: [] });
  vm.createContext(c4);
  vm.runInContext(decl + '\n' + ['tcAccueilNormaliser', 'tcAccueilTrouver', 'tcTraduireFixe', 'translateText'].map((n) => fonction(page, n)).join('\n'), c4);
  c4.tcTraduireParLot = (t, l) => { c4.envoyes.push(t); return Promise.resolve('[google ' + l + '] ' + t); };
  c4.translateText('Connexion', 'es').then((r) => {
    verifie('rejeu connecte : « Connexion » → Google (« [google es] Connexion »), pas « Iniciar sesión »', r === '[google es] Connexion' && c4.envoyes.join() === 'Connexion', r);
  });
}
verifie('l indicatif du pays : titre traduit, noms des pays par le navigateur, francais de la liste inchange', /tcT\('Indicatif du pays'\)/.test(fonction(page, 'openPhoneCountryPicker') || '') && /tcNomDePays\(c\)/.test(fonction(page, 'openPhoneCountryPicker') || '') && /if \(langue === 'fr' \|\| !TC_PAYS_REGION\[c\.code\]\) return c\.name;/.test(fonction(page, 'tcNomDePays') || ''));
const sl = fonction(page, 'selectLanguage') || '';
verifie('selecteur sans compte : langue retenue sur l appareil (timecool_language) et marquee « choisie avant connexion »', /localStorage\.setItem\('timecool_language', code\)/.test(sl) && /if \(!TC_BACKEND\.estConnecte\(\)\) \{ try \{ localStorage\.setItem\(TC_LANGUE_AVANT_CONNEXION, code\); \} catch \(e\) \{\} \}/.test(sl));
verifie('au demarrage, la langue retenue est relue et la page traduite (load, navigateAuth)', /if \(saved\) currentLanguage = saved;/.test(fonction(page, 'loadCurrentLanguage') || '') && /translatePageWithGoogle\(currentLanguage, true\)/.test(fonction(page, 'navigateAuth') || ''));
verifie('inscription : la langue de l appareil part avec le compte (langue: timecool_language)', /langue: \(localStorage\.getItem\('timecool_language'\) \|\| 'fr'\)/.test(fonction(page, 'tcCreerCompte') || ''));
const poser = bloc(/  reglage: \{[\s\S]*?\n  \}\n\};/);
verifie('connexion : la langue choisie avant l emporte sur celle du compte (poser), part au compte (lire), puis la marque s efface (tour)', /const langueAvant = \(typeof tcLangueAvantConnexion === 'function'\) \? tcLangueAvantConnexion\(\) : '';\s*if \(langueAvant\) voulus\.timecool_language = langueAvant;/.test(poser) && /if \(gardes\[k\] === v && !\(k === 'timecool_language' && typeof tcLangueAvantConnexion === 'function' && tcLangueAvantConnexion\(\) === v\)\) continue;/.test(poser) && /await tcSyncPousser\(\);[\s\S]{0,400}if \(typeof tcLangueAvantConnexionTransmise === 'function'\) tcLangueAvantConnexionTransmise\(\);/.test(fonction(page, 'tcSyncTour') || ''));
verifie('la marque reste sur l appareil, jamais envoyee au compte (TC_JAMAIS_TRANSFERE)', /const TC_JAMAIS_TRANSFERE = \[[\s\S]*?'tc_langue_avant_connexion'/.test(page));
{
  const stock = { tc_langue_avant_connexion: 'es' };
  const c2 = { console, poussees: [], connecte: true, localStorage: { getItem: (k) => (k in stock ? stock[k] : null), removeItem: (k) => { delete stock[k]; } } };
  c2.TC_BACKEND = { estConnecte: () => c2.connecte };
  c2.tcPousserLangue = (l) => c2.poussees.push(l);
  vm.createContext(c2);
  vm.runInContext('var TC_LANGUE_AVANT_CONNEXION = \'tc_langue_avant_connexion\';\n' + fonction(page, 'tcLangueAvantConnexion') + '\n' + fonction(page, 'tcLangueAvantConnexionTransmise'), c2);
  c2.connecte = false; c2.tcLangueAvantConnexionTransmise();
  const avant = stock.tc_langue_avant_connexion;
  c2.connecte = true; c2.tcLangueAvantConnexionTransmise(); c2.tcLangueAvantConnexionTransmise();
  verifie('rejeu : sans compte la marque attend ; connecte, la langue part une fois au serveur et la marque s efface', avant === 'es' && c2.poussees.join() === 'es' && !('tc_langue_avant_connexion' in stock), c2.poussees.join());
}

titre('Rejeu de translatePageWithGoogle sans compte (faux DOM)');
{
  const noeuds = ['Bienvenue !', '✨ Créer mon compte', 'Continuer avec Google', 'Votre agenda intelligent', 'Un texte inconnu'].map((v) => ({ nodeValue: '\n      ' + v + '\n    ' }));
  noeuds.forEach((n) => { n.parentElement = { closest: () => null, offsetParent: {}, tagName: 'DIV', getAttribute: () => null }; });
  const toasts = [];
  const c3 = Object.assign({}, ctx, {
    showToast: (m) => toasts.push(m), NodeFilter: { SHOW_TEXT: 4 }, window: {}, localStorage: { getItem: () => null, setItem() {} },
    TC_BACKEND: { estConnecte: () => false }, relais: 0,
    document: { body: {}, getElementById: () => null, querySelectorAll: () => [], createTreeWalker: () => { let i = 0; return { nextNode: () => noeuds[i++] || null }; } },
  });
  c3.tcTraduireParLot = () => { c3.relais++; return Promise.resolve(null); };
  vm.createContext(c3);
  vm.runInContext(decl + '\nvar TC_TRANSLATE_CACHE = {};\nvar TC_NO_TRANSLATE_SEL = "x";\nvar TC_BRAND_WORDS = ["TimeCool"];\n' + ['tcAccueilNormaliser', 'tcAccueilTrouver', 'tcTraduireFixe', 'translateText', 'tcShouldTranslateNode', 'translatePageWithGoogle'].map((n) => fonction(page, n)).join('\n'), c3);
  c3.translatePageWithGoogle('en').then(() => {
    const en = noeuds.map((n) => n.nodeValue.trim());
    verifie('en : la page passe en anglais sans compte et sans un seul appel au relais', en.join(' | ') === 'Welcome! | ✨ Create my account | Continue with Google | Your smart calendar | Un texte inconnu' && c3.relais === 0, en.join(' | ') + ' ; relais ' + c3.relais);
    verifie('aucun message « Traduction en cours » ni « Connecte-toi » sans compte', toasts.length === 0, toasts.join(' | '));
    return c3.translatePageWithGoogle('fr');
  }).then(() => {
    verifie('retour au francais : chaque texte reprend son francais d origine', noeuds.map((n) => n.nodeValue.trim()).join(' | ') === 'Bienvenue ! | ✨ Créer mon compte | Continuer avec Google | Votre agenda intelligent | Un texte inconnu');
    return c3.translatePageWithGoogle('ro');
  }).then(() => {
    verifie('ro (une des 11 autres) : « Bine ați venit! »', noeuds[0].nodeValue.trim() === 'Bine ați venit!', noeuds[0].nodeValue.trim());
    chrome();
  }).catch((e) => { verifie('rejeu', false, e.message); chrome(); });
}

// Dans un vrai Chrome : la page entiere, sans compte, du choix de la langue a la retraduction apres rechargement.
function chrome() {
  titre('Dans un vrai Chrome sans tete, 390 px, sans compte');
  const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
  if (!exe) { console.log('  (non joue : pas de Chrome sur ce poste ; a rejouer avec TC_CHROME sur un poste qui en a un)'); return terminer(); }
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-langue-accueil-'));
  const profil = path.join(dossier, 'profil');
  // Les ecrans sont lus un par un ; le resultat s ecrit dans <pre id="res"> (lu par --dump-dom).
  const sonde = `<script>
  window.__tcEcrans = function (etapes, fini) {
    const res = {}; let i = 0;
    const visibles = function (id) {
      const p = document.getElementById(id); if (!p) return '';
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null); const t = []; let n;
      while ((n = w.nextNode())) { const v = n.nodeValue.trim(); if (v && n.parentElement && n.parentElement.offsetParent) t.push(v); }
      p.querySelectorAll('input[placeholder]').forEach(function (e) { if (e.offsetParent) t.push('[' + e.placeholder + ']'); });
      return t.join(' | ');
    };
    const suite = function () {
      if (i >= etapes.length) { fini(res); return; }
      const e = etapes[i++];
      try { e[1](); } catch (x) { res[e[0]] = 'ERREUR ' + x.message; }
      setTimeout(function () { if (!res[e[0]]) res[e[0]] = (e[2] ? e[2]() : '') + ' || ' + visibles(e[3]); suite(); }, 700);
    };
    suite();
  };
  window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob]').forEach(function (e) { e.style.display = 'none'; });
    try { localStorage.setItem('tc_onboarding_done', '1'); } catch (e) {}
    showAuthFlow('auth-welcome');
    const mode = location.hash.slice(1);
    const toast = function () { const t = document.getElementById('toast'); return t ? t.textContent : ''; };
    const etapes = mode === 'relu'
      ? [['relu', function () {}, function () { return currentLanguage + ' / ' + (localStorage.getItem('tc_langue_avant_connexion') || ''); }, 'page-auth-welcome']]
      : [
        ['es-bienvenue', function () { selectLanguage('es'); }, toast, 'page-auth-welcome'],
        ['es-inscription', function () { navigateAuth('auth-signup'); }, null, 'page-auth-signup'],
        ['es-erreurs', function () { document.getElementById('signupPhone').value = '12'; document.getElementById('signupPassword').value = 'abc'; submitSignup(); }, toast, 'page-auth-signup'],
        ['es-verification', function () { navigateAuth('auth-verify-method'); }, null, 'page-auth-verify-method'],
        ['es-code', function () { document.getElementById('verifyMethodDestination').innerHTML = tcT('Étape 2 sur 2 : un code à 6 chiffres vient de partir par SMS au {n}.', '<b>+33 6 39 98 00 01</b>') + '<br>' + tcT('Il est valable {n} minutes.', 10); navigateAuth('auth-verify-code'); tcRenvoiAttendre(42); }, null, 'page-auth-verify-code'],
        ['es-connexion', function () { navigateAuth('auth-login'); submitLogin(); }, toast, 'page-auth-login'],
        ['es-oubli', function () { navigateAuth('auth-oubli'); }, null, 'page-auth-oubli'],
        ['fr-retour', function () { navigateAuth('auth-welcome'); selectLanguage('fr'); }, toast, 'page-auth-welcome'],
        ['en-bienvenue', function () { selectLanguage('en'); }, null, 'page-auth-welcome'],
        ['fi-bienvenue', function () { selectLanguage('fi'); }, null, 'page-auth-welcome'],
      ];
    window.__tcEcrans(etapes, function (res) {
      const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
    });
  }, 1200); });
  </script>`;
  fs.writeFileSync(path.join(dossier, 'index-local.html'), page.replace('</body>', () => sonde + '</body>'));
  const url = 'file:///' + path.join(dossier, 'index-local.html').replace(/\\/g, '/');
  const lancer = (mode) => {
    const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + profil, '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', url + '#' + mode], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    if (!m) return null;
    try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); } catch (e) { return null; }
  };
  const r = lancer('parcours');
  verifie('le parcours a rendu ses resultats', !!r, 'rien');
  if (r) {
    const a = (k, mots) => { const v = r[k] || ''; const manque = mots.filter((m) => v.indexOf(m) < 0); verifie(k + ' : ' + mots.slice(0, 4).join(', ') + (mots.length > 4 ? '…' : ''), manque.length === 0, manque.length ? 'manque ' + manque.join(' / ') + ' ; lu : ' + v.slice(0, 300) : ''); };
    a('es-bienvenue', ['Idioma: Español', 'Su agenda inteligente', '¡Bienvenido!', 'Organice su tiempo en pocos minutos', 'con su asistente inteligente Charly.', 'Continuar con Google', '✨ Crear mi cuenta', '🔓 Ya tengo una cuenta', 'Al continuar, acepta nuestras', 'Condiciones de uso', 'Política de privacidad']);
    verifie('es-bienvenue : plus aucun texte francais', !/Bienvenue|Votre agenda|Créer mon compte|déjà un compte|En continuant/.test(r['es-bienvenue'] || ''), r['es-bienvenue']);
    a('es-inscription', ['Crear mi cuenta', 'Paso 1 de 2 — Sus datos', 'Nombre *', 'Apellido *', 'Teléfono *', 'Contraseña *', '[Ej.: Charly]', '[Código postal]', '[Mínimo 10 caracteres]', 'Sugerir una contraseña segura', 'Acepto las', 'Continuar →']);
    a('es-erreurs', ['campos que corregir', 'El nombre es obligatorio.', 'Número no válido: 2 cifra(s) introducida(s), se necesitan entre 8 y 15.', 'Contraseña demasiado corta: 3 carácter(es) de 10 como mínimo.', 'Debes aceptar las condiciones generales y la política de privacidad.']);
    a('es-verification', ['Verificación', 'Paso 2 de 2 — Verificación de su identidad', '¿Cómo quieres verificar tu cuenta?', 'Código por SMS', 'Código por email']);
    a('es-code', ['Código de verificación', 'Introduce el código recibido', 'Paso 2 de 2: se acaba de enviar un código de 6 cifras por SMS al', 'Es válido durante 10 minutos.', 'Verificar', '↻ Reenviar el código (en 4']);
    a('es-connexion', ['Usuario y contraseña obligatorios', 'Iniciar sesión', '¡Qué alegría volver a verte!', 'Inicia sesión en tu cuenta TIMECOOL.', '¿Has olvidado la contraseña?', '[Contraseña]']);
    a('es-oubli', ['Contraseña olvidada', 'Te vamos a enviar un código', 'Indica la dirección de email de tu cuenta TimeCool. Recibirás un código de 6 cifras.', 'Recibir el código']);
    a('fr-retour', ['Langue : Français', 'Votre agenda intelligent', 'Bienvenue !', 'Organisez votre temps en quelques minutes', '✨ Créer mon compte', '🔓 J\'ai déjà un compte', 'En continuant, vous acceptez nos']);
    a('en-bienvenue', ['Your smart calendar', 'Welcome!', '✨ Create my account', '🔓 I already have an account', 'Terms of Use', 'Privacy Policy']);
    a('fi-bienvenue', ['Älykäs kalenterisi', 'Tervetuloa!', 'Jatka Googlella', '✨ Luo tili', '🔓 Minulla on jo tili']);
  }
  const r2 = lancer('relu');
  verifie('apres rechargement : la langue choisie (fi) est reprise, l accueil est en finnois, la marque « avant connexion » attend le compte', !!r2 && /^fi \/ fi \|\|/.test(r2.relu || '') && (r2.relu || '').indexOf('Tervetuloa!') > 0, r2 && r2.relu);
  // Captures pour Charles (TC_CAPTURES_87) : bienvenue, inscription, code, connexion en espagnol et en anglais ; bienvenue en finnois.
  const sortie = process.env.TC_CAPTURES_87;
  if (sortie) {
    const capt = `<script>window.addEventListener('load', function () { setTimeout(function () {
      document.querySelectorAll('#onboardingScreen,[id^=ob]').forEach(function (e) { e.style.display = 'none'; });
      showAuthFlow('auth-welcome');
      const p = location.hash.slice(1).split('-'); selectLanguage(p[0]);
      setTimeout(function () {
        if (p[1] === 'code') { pendingSignup = { smsSeul: true }; document.getElementById('verifyMethodDestination').innerHTML = tcT('Étape 2 sur 2 : un code à 6 chiffres vient de partir par SMS au {n}.', '<b style="white-space:nowrap;">+33 6 12 34 56 78</b>') + '<br>' + tcT('Il est valable {n} minutes.', 10); navigateAuth('auth-verify-code'); tcRenvoiAttendre(45); }
        else if (p[1] !== 'bienvenue') navigateAuth(p[1] === 'inscription' ? 'auth-signup' : 'auth-login');
        const t = document.getElementById('toast'); if (t) t.classList.remove('show');
      }, 400);
    }, 1200); });</script>`;
    fs.writeFileSync(path.join(dossier, 'capture.html'), page.replace('</body>', () => capt + '</body>'));
    fs.mkdirSync(sortie, { recursive: true });
    const noms = ['es-bienvenue', 'es-inscription', 'es-code', 'es-connexion', 'en-bienvenue', 'en-inscription', 'en-code', 'en-connexion', 'fi-bienvenue'];
    noms.forEach((n, i) => {
      const fichier = path.join(sortie, (i + 1) + '-' + n + '.png');
      // Dans un cadre de 390 px : la capture directe d une fenetre de 390 px coupait le bord droit.
      fs.writeFileSync(path.join(dossier, 'cadre-' + n + '.html'), '<!doctype html><html><body style="margin:0"><iframe src="capture.html#' + n + '" style="border:0;width:390px;height:844px;display:block"></iframe></body></html>');
      spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'p' + i), '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=8000', '--screenshot=' + fichier, 'file:///' + path.join(dossier, 'cadre-' + n + '.html').replace(/\\/g, '/')], { timeout: 120000 });
      verifie('capture ' + path.basename(fichier), fs.existsSync(fichier));
    });
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  terminer();
}
function terminer() {
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
}
