// Mission 25 bis (Charles, 12/10, campagne 15) : un navigateur, F (English + Sombre) → D (fr + clair) → F. Rejeu avec
// les VRAIES fonctions de la page (synchro, menage, theme, langue, deconnexion) et un faux serveur par compte :
// (1) a la connexion de D, le theme du compte s applique a l ecran des le tour de connexion (plus seulement au
// rechargement) ; (2) F retrouve English + Sombre apres D (son choix, fait juste avant « Se déconnecter », est pousse
// avant la fin de session) ; (3) les options des listes restent claires. Usage : node verif-reglages-compte-simule.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
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
function bloc(debut) {
  const d = page.indexOf(debut);
  if (d < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(page.indexOf('{', d), j + 1); }
  }
  return null;
}

// ── Le faux serveur : un compte = une version et des elements (type:uid → contenu, version) ──
function Serveur() {
  this.comptes = {};
  this.compte = function (ref) { return this.comptes[ref] || (this.comptes[ref] = { version: 0, elements: {} }); };
  this.tirer = function (ref, depuis) { const c = this.compte(ref); const els = []; Object.keys(c.elements).forEach((k) => { const e = c.elements[k]; if (e.version > (depuis || 0)) els.push(Object.assign({}, e.lu)); }); return { elements: els, version: c.version, suite: false }; };
  this.pousser = function (ref, els) { const c = this.compte(ref); els.forEach((e) => { c.version++; c.elements[e.type + ':' + e.uid] = { version: c.version, lu: e.contenu === null ? { type: e.type, uid: e.uid, supprime: true } : { type: e.type, uid: e.uid, contenu: e.contenu } }; }); return { version: c.version }; };
  this.reglage = function (ref, cle) { const e = this.compte(ref).elements['reglage:' + cle]; return e && e.lu.contenu ? e.lu.contenu.v : null; };
}

// ── L appareil : un stockage, les variables de la page, les vraies fonctions ──
function Appareil(serveur) {
  const stock = {};
  const trace = { themesAppliques: [], langues: [], toasts: [] };
  const ctx = {
    // setTimeout joue tout de suite (traduction differee, etc.) ; tcSyncBientot, lui, est remplace plus bas par un compteur.
    console, String, Array, Object, JSON, Number, Math, Date, Promise, parseInt, parseFloat, setTimeout: (f) => { try { if (typeof f === 'function') f(); } catch (e) {} return 0; }, clearTimeout: () => {},
    localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; }, key: (i) => Object.keys(stock)[i], get length() { return Object.keys(stock).length; } },
    document: { documentElement: { style: { setProperty() {} } }, getElementById: () => null, querySelectorAll: () => [] },
    window: {}, userAccount: null, jeton: null, currentTheme: 'light', currentLanguage: 'fr', mode: 'user',
    events: [], tasksList: [], birthdays: [], contactsList: [], messages: { user: [], pro: [] }, customCalendars: [], charlyIA: { history: [], config: {} },
    closeSettingsModal() {}, showToast: (t) => { trace.toasts.push(t); }, showAuthFlow() {}, tcOublierMotDePasse() {}, tcConfirm: async () => true, renderMenu() {}, updateBadges() {}, render() {},
    // Effets d ecran des reglages de langue, sans objet ici.
    initLanguageDisplay() {}, updateHeaderAgendaLabel() {}, renderCharlyChat() {}, tcAfficherBoutonBiometrie() {}, tcAfficherLienAppairage() {}, navigateAuth() {}, tcMajAvatarEntete() {}, tcSyncCharlyGreeting() {}, tcTraduireMenu() {}, tcRafraichirTextes() {},
    tcPousserLangue: (c) => { trace.langues.push('serveur:' + c); }, tcNomDeLangue: (c, l) => l, translatePageWithGoogle: (c) => { trace.langues.push('page:' + c); }, tcRecupererClesDuServeur() {}, tcPoserJeton: (j) => { ctx.jeton = j; },
    TC_BACKEND: {
      estConnecte: () => !!ctx.jeton,
      syncTirer: async (depuis) => serveur.tirer(ctx.userAccount.reference, depuis),
      syncPousser: async (els) => serveur.pousser(ctx.userAccount.reference, els),
      deconnecter: async () => { ctx.jeton = null; }
    },
    _stock: stock, _trace: trace
  };
  vm.createContext(ctx);
  ['const TC_JAMAIS_TRANSFERE = \\[[^\\]]*\\];', 'const TC_SYNC_DEJA_SYNCHRONISE = \\[[^\\]]*\\];', 'const TC_SYNC_REGLAGE_MAX = [^;]*;', 'const TC_SYNC_VERSION_KEY = [^;]*;', 'const TC_SYNC_EMPREINTES_KEY = [^;]*;',
   'const TC_SYNC_SEUIL_DISPARITION = [^;]*;', 'const TC_COMPTE_LOCAL_KEY = [^;]*;', 'const TC_NETTOYAGE_KEY = [^;]*;', 'const TC_NETTOYAGE_VERSION = [^;]*;', 'const TC_EVENTS_KEY = [^;]*;', 'const TC_TASKS_KEY = [^;]*;',
   'const TC_CALENDARS_KEY = [^;]*;', 'const DARK_VARS = \\{[\\s\\S]*?\\};', 'const LIGHT_VARS = \\{[\\s\\S]*?\\};', 'const SUPPORTED_LANGUAGES = \\[[\\s\\S]*?\\n\\];']
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  const reglage = bloc('  reglage: {');
  if (reglage) vm.runInContext('const TC_SYNC_TYPES = { reglage: ' + reglage + ' };', ctx); else { ko++; console.log('  KO  TC_SYNC_TYPES.reglage introuvable'); }
  vm.runInContext('let _tcSyncVusIci = {}; let _tcSyncEnCours = false; let _tcSyncBloquee = false; let _tcOngletARecharger = false; let _tcRechargementsComplets = []; let _tcSonde = null; let _tcDernierTirage = null; let _tcDernierTourComplet = 0; let _tcSyncBientot = null; let _tcSuppressionEnAttente = null; let _tcDeplacementEnAttente = null; let _tcImprevuEnAttente = 0; let _tcGroupeEnAttente = 0; let _isolatedCalendarId = null;', ctx);
  ['tcJeton', 'tcCleTransferable', 'tcCleReglage', 'tcSyncCanon', 'tcSyncEmpreinte', 'tcSyncCompte', 'tcSyncEtat', 'tcSyncPoserVersion', 'tcSyncEmpreintes', 'tcSyncPoserEmpreintes', 'tcAssainirRecu',
   'tcSyncModifieIci', 'tcSyncAppliquer', 'tcSyncTirer', 'tcSyncPousser', 'tcSyncTour', 'tcCompteDuStockage', 'tcOngletARechargerMaintenant', 'tcOngletPerime', 'tcNoterRechargementComplet', 'tcPreparerAppareilPourCompte', 'tcViderDonneesDuCompte', 'loadCustomCalendars', 'saveCustomCalendars',
   'savePreference', 'applyTheme', 'selectLanguageFromSettings', 'tcAppliquerLangueRecue', 'tcViderChampsConnexion', 'logoutUser']
    .forEach((n) => { if (n === 'tcJeton') { vm.runInContext('function tcJeton() { return jeton; }', ctx); return; } const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  // tcSyncBientot : le vrai programme un tour a 1,5 s ; ici il est note, et le tour est joue a la main quand le scenario le dit.
  vm.runInContext('let _bientot = 0; function tcSyncBientot() { _bientot++; }', ctx);
  // applyTheme reel est deja charge ; on note chaque application.
  vm.runInContext('const _applyThemeReel = applyTheme; applyTheme = function (t) { _trace.themesAppliques.push(t); return _applyThemeReel(t); };', ctx);
  return ctx;
}
async function connexion(ctx, ref, prenom) { ctx.userAccount = { reference: ref, firstname: prenom }; ctx.jeton = 'jeton-' + ref; ctx._stock.timecool_session_active = 'true'; await ctx.tcSyncTour(); }   // le tour de connexion (showWelcomeSplash, +400 ms)
async function tourPeriodique(ctx) { await ctx.tcSyncTour(); }
async function deconnexion(ctx) { await ctx.logoutUser(); }
const etat = (ctx) => ({ lang: ctx._stock.timecool_language || null, theme: ctx._stock.tc_theme || null, affiche: ctx.currentTheme, langueCourante: ctx.currentLanguage });

(async () => {
  const serveur = new Serveur();
  const ctx = Appareil(serveur);
  if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
  // Les deux comptes existent deja sur le serveur : D a choisi fr + clair auparavant ; F n a encore rien choisi.
  serveur.pousser('D', [{ type: 'reglage', uid: 'timecool_language', contenu: { id: 'timecool_language', v: 'fr' } }, { type: 'reglage', uid: 'tc_theme', contenu: { id: 'tc_theme', v: 'light' } }]);
  ctx._stock.timecool_language = 'fr'; ctx._stock.tc_theme = 'light'; ctx._stock.tc_onboarding_done = '1';

  titre('C1. F se connecte, regle English + Sombre, se deconnecte tout de suite');
  await connexion(ctx, 'F', 'Fanny');
  ctx.selectLanguageFromSettings('en');
  ctx.applyTheme('dark');
  verifie('chaque choix demande une poussee sans attendre (tcSyncBientot)', vm.runInContext('_bientot', ctx) >= 2, vm.runInContext('_bientot', ctx));
  await deconnexion(ctx);   // avant tout tour periodique
  verifie('le compte de F a recu English + Sombre AVANT la fin de session', serveur.reglage('F', 'timecool_language') === 'en' && serveur.reglage('F', 'tc_theme') === 'dark', JSON.stringify([serveur.reglage('F', 'timecool_language'), serveur.reglage('F', 'tc_theme')]));
  verifie('sur l ecran de connexion : en + sombre (reglages de l appareil gardes)', etat(ctx).lang === 'en' && etat(ctx).theme === 'dark', JSON.stringify(etat(ctx)));

  titre('C2. D se connecte sur le meme navigateur : fr + clair des le tour de connexion');
  ctx._trace.themesAppliques.length = 0; ctx._trace.langues.length = 0;
  await connexion(ctx, 'D', 'Damien');
  verifie('le theme de D (clair) est applique a l ecran des le tour de connexion', ctx._trace.themesAppliques.indexOf('light') > -1 && ctx.currentTheme === 'light', JSON.stringify(ctx._trace.themesAppliques) + ' / ' + ctx.currentTheme);
  verifie('la langue de D (fr) est appliquee a la page', ctx.currentLanguage === 'fr' && ctx._trace.langues.indexOf('page:fr') > -1, JSON.stringify(ctx._trace.langues));
  verifie('le stockage porte les reglages de D', etat(ctx).lang === 'fr' && etat(ctx).theme === 'light', JSON.stringify(etat(ctx)));
  await tourPeriodique(ctx);
  verifie('le compte de F n a pas ete touche par la session de D', serveur.reglage('F', 'timecool_language') === 'en' && serveur.reglage('F', 'tc_theme') === 'dark');
  verifie('le compte de D n a pas recu les reglages de F', serveur.reglage('D', 'timecool_language') === 'fr' && serveur.reglage('D', 'tc_theme') === 'light');
  await deconnexion(ctx);

  titre('C3. F revient : English + Sombre retrouves');
  ctx._trace.themesAppliques.length = 0; ctx._trace.langues.length = 0;
  await connexion(ctx, 'F', 'Fanny');
  verifie('F retrouve English + Sombre des le tour de connexion (ecran et stockage)', ctx.currentTheme === 'dark' && ctx.currentLanguage === 'en' && etat(ctx).lang === 'en' && etat(ctx).theme === 'dark', JSON.stringify(etat(ctx)) + ' ' + JSON.stringify(ctx._trace.themesAppliques));
  await tourPeriodique(ctx);
  verifie('et apres un tour de plus, rien ne bouge (ni chez F ni sur le serveur)', etat(ctx).lang === 'en' && etat(ctx).theme === 'dark' && serveur.reglage('F', 'tc_theme') === 'dark' && serveur.reglage('D', 'tc_theme') === 'light');

  titre('C4. Un compte neuf sans reglage adopte ceux de l appareil, et ne les pousse qu au premier changement');
  await deconnexion(ctx);
  await connexion(ctx, 'N', 'Nour');
  verifie('N voit en + sombre (l appareil), rien n est pousse dans son compte', etat(ctx).lang === 'en' && etat(ctx).theme === 'dark' && serveur.reglage('N', 'tc_theme') === null, JSON.stringify(etat(ctx)) + ' ' + serveur.reglage('N', 'tc_theme'));
  ctx.applyTheme('light');
  await tourPeriodique(ctx);
  verifie('N choisit clair : son compte le recoit', serveur.reglage('N', 'tc_theme') === 'light');

  titre('(3) Les options des listes restent claires');
  verifie('CSS : select option { background:#fff; color:#202124; }', /\nselect option \{ background:#fff; color:#202124; \}/.test(page));
  verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('ERREUR ' + e.stack); process.exit(1); });
