// Mission 41 (14/10) : fin de la boucle de chargement au changement de compte (deux onglets, deux comptes), garde-fou
// (plus de 3 chargements complets en 30 s → arret + panneau « Réparer » / « Envoyer le rapport »), panneau « Vérifions
// ensemble » a la place de « Serveur injoignable », route API POST /rapports-techniques, migration 014.
// Usage : node verif-boucle-compte.js <index.html> <backend/api/index.php> <backend/sql/014_rapports_techniques.sql>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
const sql = fs.readFileSync(process.argv[4], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(Math.max(0, d - 6), d) === 'async ') d -= 6;
  let prof = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') prof++;
    else if (texte[j] === '}') { prof--; if (prof === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
function constante(re) { const m = page.match(new RegExp(re)); return m ? m[0] : null; }

(async () => {
titre('0. Garde-fous de la page');
verifie('aucun lookbehind dans la page (Safari)', page.indexOf('(?<') < 0);

titre('1. Deux onglets, deux comptes : plus de ping-pong');
// Un stockage COMMUN (comme localStorage entre onglets), deux memoires (un onglet = un contexte).
function Appareil(stock, compte, serveur, journal) {
  const ctx = {
    console, String, Number, Array, Date, JSON, Math, Object, Promise, setTimeout, clearTimeout,
    localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; }, get length() { return Object.keys(stock).length; }, key: (i) => Object.keys(stock)[i] },
    location: { reload() { journal.push(compte + ':reload'); } },
    showToast: (m) => { journal.push(compte + ':toast:' + m); },
    userAccount: compte ? { reference: compte } : null,
    tcJeton: () => (stock.tc_session_jeton || null),
    tcPreparerAppareilPourCompte() { // la vraie fait le menage si le marqueur change ; ici on le note
      const ref = ctx.tcSyncCompte(); const prec = stock.tc_compte_local || null;
      if (prec === ref) return false; if (prec !== null) { ctx.tcViderDonneesDuCompte(); } stock.tc_compte_local = ref; return prec !== null; },
    tcViderDonneesDuCompte() { journal.push(compte + ':menage'); delete stock.tc_sync_version; delete stock.tc_sync_empreintes; },
    tcSyncPousser: async () => {},
    tcSyncAppliquer: async (els) => els.length,
    tcSyncPlanifier() {}, tcPanneauBoucle() { journal.push(compte + ':panneau'); },
    renderMenu() {}, updateBadges() {}, render() {},
    TC_BACKEND: {
      estConnecte: () => !!stock.tc_session_jeton,
      syncTirer: async (depuis) => { journal.push(compte + ':tirer:' + depuis); return { elements: [], version: serveur.version, suite: false }; },
      syncVersionServeur: async () => { journal.push(compte + ':version'); return serveur.version; }
    }
  };
  vm.createContext(ctx);
  ['const TC_SYNC_VERSION_KEY = [^;]*;', 'const TC_SYNC_EMPREINTES_KEY = [^;]*;', 'const TC_COMPTE_LOCAL_KEY = [^;]*;', 'const TC_NETTOYAGE_KEY = [^;]*;', 'const TC_NETTOYAGE_VERSION = [^;]*;', 'const TC_JETON_CLE = [^;]*;', 'const TC_BOUCLE_MAX = [^;]*;', 'const TC_BOUCLE_FENETRE_MS = [^;]*;', 'const TC_SYNC_FILET = [^;]*;']
    .forEach((re) => { const c = constante(re); if (c) vm.runInContext(c, ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  vm.runInContext('let _tcSyncEnCours = false; let _tcSyncMinuteur = null; let _tcSyncBientot = null; let _tcDernierTourComplet = 0; let _tcSonde = null; let _tcOngletARecharger = false; let _tcRechargementsComplets = []; let _tcSyncBloquee = false; let _tcDernierTirage = null;', ctx);
  ['tcSyncCompte', 'tcSyncEtat', 'tcSyncPoserVersion', 'tcCompteDuStockage', 'tcOngletARechargerMaintenant', 'tcOngletPerime', 'tcNoterRechargementComplet', 'tcReparerDonneesLocales', 'tcSyncTirer', 'tcSyncTour', 'tcSyncSonde']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  return ctx;
}
const journal = [];
const serveur = { version: 18 };
// Charles etait ouvert dans l onglet A ; Gary vient de se connecter dans l onglet B : le stockage porte Gary.
const stock = { tc_session_jeton: 'jeton-gary', timecool_user_account: JSON.stringify({ reference: 'GARY' }), tc_compte_local: 'GARY', tc_sync_version: JSON.stringify({ compte: 'GARY', version: 18 }), tc_nettoyage: '' };
const A = Appareil(stock, 'CHARLES', serveur, journal);
const B = Appareil(stock, 'GARY', serveur, journal);
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
stock.tc_nettoyage = vm.runInContext('TC_NETTOYAGE_VERSION', A);
for (let i = 0; i < 4; i++) { await A.tcSyncTour(); await B.tcSyncTour(); await A.tcSyncSonde(); await B.tcSyncSonde(); }
await new Promise((r) => setTimeout(r, 1400));   // le rechargement de l onglet perime part apres 1,2 s
const chargesZero = journal.filter((x) => /:tirer:0$/.test(x)).length;
const menages = journal.filter((x) => /:menage$/.test(x)).length;
verifie('aucun chargement complet (depuis=0) ni menage pendant 8 tours alternes', chargesZero === 0 && menages === 0, journal.join(' '));
verifie('l onglet de Charles (memoire ≠ stockage) se recharge une seule fois, avec un mot, et ne parle jamais au serveur', journal.filter((x) => x === 'CHARLES:reload').length === 1 && journal.some((x) => /^CHARLES:toast:.*autre compte vient de s’ouvrir/.test(x)) && !journal.some((x) => /^CHARLES:(tirer|version)/.test(x)), journal.filter((x) => x.indexOf('CHARLES') === 0).join(' '));
verifie('l onglet de Gary continue normalement : des sondes de version, jamais depuis=0, le marqueur reste GARY', journal.some((x) => x === 'GARY:version') && !journal.some((x) => x === 'GARY:tirer:0') && stock.tc_compte_local === 'GARY', journal.filter((x) => x.indexOf('GARY') === 0).join(' '));
verifie('sans compte en stockage (suites, mode prive), rien n est considere perime', (() => { const s2 = { tc_session_jeton: 'j' }; const j2 = []; const C = Appareil(s2, 'X', serveur, j2); return C.tcOngletPerime() === false && j2.length === 0; })());
verifie('le changement de compte se fait DES la connexion (submitLogin, saveUserAccount → tcPreparerAppareilPourCompte), avant le premier chargement', /tcPreparerAppareilPourCompte === 'function'\) \{ try \{ tcPreparerAppareilPourCompte\(\); \}/.test(fonction(page, 'saveUserAccount') || '') && /tcPreparerAppareilPourCompte === 'function'\) \{ try \{ tcPreparerAppareilPourCompte\(\); \}/.test(fonction(page, 'submitLogin') || ''));
const demarrer = fonction(page, 'tcSyncDemarrer') || '';
verifie('un autre onglet qui ouvre un autre compte ou ferme la session : cet onglet suit (evenement storage sur le jeton et le compte)', /if \(cle === TC_JETON_CLE\) \{ if \(!e\.newValue && tcSyncCompte\(\)\) tcOngletARechargerMaintenant\(/.test(demarrer) && /if \(cle === 'timecool_user_account'\) \{ tcOngletPerime\(\); return; \}/.test(demarrer));

// Second onglet sur le MEME compte : les rendez-vous de demonstration doivent naitre avec une categorie deja normalisee,
// sinon l onglet qui les relit normalisees (tcCatNormalisee) et celui qui les a en memoire se les repoussent sans fin.
(function () {
  const gen = fonction(page, 'generateEvents') || '';
  const alias = constante('const TC_AGENDA_ALIAS = \\{[\\s\\S]*?\\};');
  const cA = vm.createContext({}); vm.runInContext(alias || 'const TC_AGENDA_ALIAS = {};', cA);
  const anciennes = Object.keys(vm.runInContext('TC_AGENDA_ALIAS', cA));
  const cats = (gen.match(/cat:'([a-z]+)'/g) || []).map((m) => m.slice(5, -1));
  verifie('les rendez-vous de demonstration naissent avec une categorie normalisee (aucune ancienne couleur de TC_AGENDA_ALIAS)', cats.length >= 3 && cats.every((c) => anciennes.indexOf(c) < 0), cats.join(',') + ' / anciennes : ' + anciennes.join(','));
})();

titre('2. Garde-fou : plus de 3 chargements complets en 30 s');
const j3 = []; const s3 = { tc_session_jeton: 'j', timecool_user_account: JSON.stringify({ reference: 'GARY' }), tc_compte_local: 'GARY' };
const G = Appareil(s3, 'GARY', serveur, j3);
s3.tc_nettoyage = vm.runInContext('TC_NETTOYAGE_VERSION', G);
for (let i = 0; i < 6; i++) { delete s3.tc_sync_version; await G.tcSyncTour(); }
verifie('le premier chargement ne compte pas ; 3 curseurs perdus passent, le 4e arrete la synchro et ouvre le panneau, le suivant ne touche plus le serveur', j3.filter((x) => x === 'GARY:tirer:0').length === 4 && j3.filter((x) => x === 'GARY:panneau').length === 1 && vm.runInContext('_tcSyncBloquee', G) === true, j3.join(' '));
await G.tcSyncSonde();
verifie('la sonde aussi reste muette tant que c est bloque', !j3.some((x) => x === 'GARY:version'), j3.join(' '));
verifie('un compte neuf ou vide (version 0 apres chaque tirage) n est jamais pris pour une boucle', await (async () => { const j4 = []; const s4 = { tc_session_jeton: 'j', timecool_user_account: JSON.stringify({ reference: 'NEUF' }), tc_compte_local: 'NEUF' }; const N = Appareil(s4, 'NEUF', { version: 0 }, j4); s4.tc_nettoyage = vm.runInContext('TC_NETTOYAGE_VERSION', N); for (let i = 0; i < 8; i++) { delete s4.tc_sync_version; await N.tcSyncTour(); } return j4.filter((x) => x === 'NEUF:tirer:0').length === 8 && !j4.some((x) => x === 'NEUF:panneau'); })());
verifie('un vrai changement de compte (5 comptes en quelques secondes, chacun dans son onglet) n est pas une boucle', await (async () => { const j5 = []; const s5 = { tc_session_jeton: 'j' }; for (const c of ['A', 'B', 'C', 'D', 'E']) { s5.timecool_user_account = JSON.stringify({ reference: c }); s5.tc_compte_local = c; delete s5.tc_sync_version; const T = Appareil(s5, c, { version: 9 }, j5); s5.tc_nettoyage = vm.runInContext('TC_NETTOYAGE_VERSION', T); await T.tcSyncTour(); } return !j5.some((x) => /:panneau$/.test(x)) && j5.filter((x) => /:tirer:0$/.test(x)).length === 5; })());
j3.length = 0;
const repare = await G.tcReparerDonneesLocales();
verifie('« Réparer » : un menage (la session reste : le jeton est intact), UNE synchro, le marqueur pose, la synchro repart', repare === true && j3.filter((x) => x === 'GARY:menage').length === 1 && j3.filter((x) => /^GARY:tirer:/.test(x)).length === 1 && s3.tc_session_jeton === 'j' && s3.tc_compte_local === 'GARY' && vm.runInContext('_tcSyncBloquee', G) === false, j3.join(' '));
verifie('tcSyncPlanifier ne replanifie rien tant que c est bloque ou que l onglet se recharge', /if \(_tcSyncBloquee \|\| _tcOngletARecharger\) return;/.test(fonction(page, 'tcSyncPlanifier') || ''));
const boucle = fonction(page, 'tcPanneauBoucle') || '';
verifie('panneau boucle : titre calme, « Réparer » (principal) et « Envoyer le rapport », rien d autre', /'Quelque chose empêche TimeCool de se charger\.'/.test(boucle) && /tcAideBouton\(barre, 'Réparer', true/.test(boucle) && /tcAideBouton\(barre, 'Envoyer le rapport', false/.test(boucle) && /tcReparerDonneesLocales\(\)/.test(boucle) && /tu restes connecté/.test(boucle));

titre('3. « Vérifions ensemble » et « Tester ma connexion »');
const sites = ['connexion', 'connexion_google', 'inscription', 'inscription_code', 'inscription_verification'];
verifie('a la connexion et a la creation de compte, plus de toast « Serveur injoignable » : le panneau s ouvre (5 endroits)', sites.every((s) => page.indexOf("tcVerifionsEnsemble('" + s + "')") > 0) && !/showToast\('❌ Serveur injoignable\./.test(page), sites.filter((s) => page.indexOf("tcVerifionsEnsemble('" + s + "')") < 0).join(','));
const etapes = constante('const TC_ETAPES_VERIFICATION = \\[[\\s\\S]*?\\n\\];');
const ctxE = vm.createContext({}); vm.runInContext(etapes || 'const TC_ETAPES_VERIFICATION = [];', ctxE);
const liste = vm.runInContext('TC_ETAPES_VERIFICATION', ctxE);
verifie('six gestes, dans l ordre demande : adresse, recharger (Ctrl + F5 / fermer et rouvrir), fenetre privee, bloqueur/VPN/antivirus, autre navigateur, partage de connexion', liste.length === 6 && /timecool\.fr\/app\//.test(liste[0]) && /Ctrl \+ F5/.test(liste[1]) && /ferme l’application/.test(liste[1]) && /fenêtre privée/.test(liste[2]) && /bloqueur de publicité, le VPN ou l’antivirus/.test(liste[3]) && /autre navigateur/.test(liste[4]) && /partage de connexion/.test(liste[5]), JSON.stringify(liste).slice(0, 200));
const verif = fonction(page, 'tcVerifionsEnsemble') || '';
verifie('le panneau : « Tester ma connexion », puis « Commencer les étapes », chaque etape avec « Ça marche » / « Ça ne marche pas », a la fin « Envoyer le rapport »', /'Vérifions ensemble'/.test(verif) && /'Tester ma connexion'/.test(verif) && /'Commencer les étapes'/.test(verif) && /'Ça ne marche pas', false, function \(\) \{ etape\+\+; dessiner\(\); \}/.test(verif) && /'Ça marche', true/.test(verif) && /'Envoyer le rapport', true/.test(verif) && /'Étape ' \+ \(etape \+ 1\) \+ ' sur '/.test(verif));
const textesAide = [boucle, verif, fonction(page, 'tcTesterConnexion') || '', fonction(page, 'tcEnvoyerRapportTechnique') || '', etapes || ''].join('\n');
verifie('aucun tiret long dans les textes des panneaux', textesAide.indexOf('—') < 0 && textesAide.indexOf('–') < 0);
// Simulation du test de connexion.
async function test(reponse, enLigne) {
  const c = { console, Date, String, setTimeout, clearTimeout, AbortController: class { constructor() { this.signal = {}; } abort() {} }, TC_API: 'https://api.timecool.fr', navigator: { onLine: enLigne }, _tcDernierTestConnexion: null, _appels: [],
    fetch: async (url, opts) => { c._appels.push(url + '|' + JSON.stringify(opts.headers || null) + '|' + opts.cache); if (reponse === 'ok') return { ok: true, status: 200 }; if (reponse === '500') return { ok: false, status: 500 }; const e = new Error('x'); if (reponse === 'delai') e.name = 'AbortError'; throw e; } };
  vm.createContext(c); vm.runInContext(constante('const TC_SANTE_DELAI_MS = [^;]*;') || 'const TC_SANTE_DELAI_MS = 8000;', c); vm.runInContext(fonction(page, 'tcTesterConnexion'), c);
  return { constat: await c.tcTesterConnexion(), appels: c._appels, dernier: c._tcDernierTestConnexion };
}
const t1 = await test('ok', true);
verifie('serveur ok : « Le serveur TimeCool répond, mais quelque chose sur cet appareil bloque l’application : bloqueur de publicité, VPN ou antivirus. » ; GET /sante sans en-tete d autorisation, sans cache', /^Le serveur TimeCool répond, mais quelque chose sur cet appareil bloque l’application : bloqueur de publicité, VPN ou antivirus\.$/.test(t1.constat) && t1.appels[0] === 'https://api.timecool.fr/sante|null|no-store' && t1.dernier && t1.dernier.resultat === 'serveur_ok', t1.constat + ' ' + t1.appels[0]);
const t2 = await test('erreur', false);
verifie('hors ligne : « Pas d’accès à internet sur cet appareil. … »', /^Pas d’accès à internet sur cet appareil\./.test(t2.constat), t2.constat);
const t3 = await test('erreur', true);
verifie('en ligne mais injoignable : le reseau qui bloque (ecole, entreprise, VPN, antivirus)', /n’est pas joignable depuis cet appareil/.test(t3.constat) && /école, entreprise, VPN ou antivirus/.test(t3.constat), t3.constat);
const t4 = await test('delai', true);
verifie('trop long : le reseau est peut-etre lent ou filtre', /met trop de temps à répondre/.test(t4.constat), t4.constat);
const t5 = await test('500', true);
verifie('le serveur repond mal : « Réessaie dans quelques minutes »', /pas comme prévu\. Réessaie dans quelques minutes/.test(t5.constat), t5.constat);
// Le rapport.
const cR = { console, Date, String, JSON, navigator: { userAgent: 'Navigateur de test', onLine: true }, location: { href: 'https://timecool.fr/app/?x=1#y' }, document: { getElementById: (id) => id === 'loginEmail' ? { value: ' gary@exemple-timecool.fr ' } : null }, TC_APP_VERSION: '10.5.54', tcSyncCompte: () => null, _tcDernierTestConnexion: { resultat: 'serveur_ok' }, _tcJournalRequetes: [{ m: 'POST', c: '/connexion', s: 'reseau', ms: 20000 }], _tcJournalErreurs: [{ e: 'TypeError: x' }] };
vm.createContext(cR); vm.runInContext(fonction(page, 'tcRapportTechnique'), cR);
const rapport = cR.tcRapportTechnique('connexion');
verifie('le rapport : contexte, version, navigateur, compte (l identifiant saisi si pas de session), en ligne, adresse sans parametres, test, requetes, erreurs ; jamais de mot de passe', rapport.contexte === 'connexion' && rapport.version === 'page 10.5.54' && rapport.navigateur === 'Navigateur de test' && rapport.compte === 'gary@exemple-timecool.fr' && rapport.en_ligne === true && rapport.adresse === 'https://timecool.fr/app/' && rapport.test_connexion.resultat === 'serveur_ok' && rapport.requetes.length === 1 && rapport.erreurs.length === 1 && JSON.stringify(rapport).indexOf('password') < 0 && JSON.stringify(rapport).indexOf('loginPassword') < 0, JSON.stringify(rapport).slice(0, 250));
verifie('tcAppel note chaque requete (chemin sans parametres, statut ou code, duree) et les erreurs de page sont notees ; rien de stocke', /tcNoterRequete\(methode, chemin, reponse\.status, Date\.now\(\) - _tcDebut\)/.test(fonction(page, 'tcAppel') || '') && /tcNoterRequete\(methode, chemin, err\.code, Date\.now\(\) - _tcDebut\)/.test(fonction(page, 'tcAppel') || '') && /split\('\?'\)\[0\]/.test(fonction(page, 'tcNoterRequete') || '') && /window\.addEventListener\('unhandledrejection'/.test(page) && !/localStorage/.test(fonction(page, 'tcNoterRequete') || ''));
verifie('TC_BACKEND.envoyerRapportTechnique → POST /rapports-techniques ; le bouton dit « Merci, rapport envoyé » ou un mot calme en cas d echec', /tcAppel\('POST', '\/rapports-techniques', rapport\)/.test(page) && /'Merci, rapport envoyé'/.test(fonction(page, 'tcEnvoyerRapportTechnique') || '') && /Le rapport n’a pas pu partir/.test(fonction(page, 'tcEnvoyerRapportTechnique') || ''));

titre('4. L API et la migration 014');
const route = /case 'POST \/rapports-techniques':[\s\S]*?Rep::ok\(\['id' => \(int\) Db::pdo\(\)->lastInsertId\(\), 'compte' => \$compteRapport !== null\]\);/.exec(api);
verifie('route POST /rapports-techniques : sans Auth::compte() (compteOptionnel), 32 Ko au plus, 10 par heure et par adresse, INSERT en base, pas d e-mail', !!route && !/Auth::compte\(\)/.test(route[0]) && /compteOptionnel\(\)/.test(route[0]) && /> 32768/.test(route[0]) && /INTERVAL 1 HOUR/.test(route[0]) && />= 10\)/.test(route[0]) && /INSERT INTO rapports_techniques/.test(route[0]) && !/envoyerEmail/.test(route[0]), route ? '' : 'route introuvable');
verifie('le plafond ne s applique pas aux appels venus du serveur lui-meme (suites rejouables), meme liste que /taches/rappels', !!route && /\$depuisLeServeur = in_array\(\$ipRapport, \['127\.0\.0\.1', '::1', '82\.165\.253\.73'\], true\);/.test(route[0]) && /if \(\$ipBin !== null && !\$depuisLeServeur\) \{/.test(route[0]));
const optionnel = fonction(api, 'compteOptionnel') || '';
verifie('compteOptionnel : meme regle que Auth::compte (jeton 64 hex, session non revoquee, non expiree, compte non cloture), mais null au lieu d une erreur', /return null;/.test(optionnel) && /s\.revoque_le IS NULL AND s\.expire_le > NOW\(\) AND c\.cloture_le IS NULL/.test(optionnel) && !/Rep::erreur/.test(optionnel));
verifie('migration 014 : table rapports_techniques (compte_id NULL, ip VARBINARY(16), contenu MEDIUMTEXT, index ip + cree_le), rejouable', /CREATE TABLE IF NOT EXISTS rapports_techniques/.test(sql) && /compte_id\s+INT UNSIGNED NULL/.test(sql) && /ip\s+VARBINARY\(16\) NULL/.test(sql) && /contenu\s+MEDIUMTEXT\s+NOT NULL/.test(sql) && /KEY idx_rapports_ip \(ip, cree_le\)/.test(sql));

console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
