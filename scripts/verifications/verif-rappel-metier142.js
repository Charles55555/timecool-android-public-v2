// Mission 142 (Charles, 19/11, avec capture) : « Votre métier : … » (étapes 2 à 6 de la « Configuration professionnelle ») était
// trop petite. Tout en gras, le métier aussi, aussi grande que le titre de l'étape ; sur une ligne à 390 px pour les trois métiers
// (« Chirurgien-dentiste » compris) ; plus étroit (360, 320 px) : deux lignes propres au plus, jamais un mot coupé, « : » jamais
// seul. Avocat, étape 2 : « Quels domaines d’activité pratiquez-vous ? ». Rien d'autre ne bouge : les trois métiers, étapes 2 à 7,
// sans cette ligne et avec l'ancien titre de l'avocat, au caractère près (empreintes lues sur la page d'avant, ecf9c94).
// Usage : node verif-rappel-metier142.js <index.html>   (TC_CHROME ; EMPREINTES=1 : affiche les empreintes)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
// Les trois métiers de cette suite, étapes 2 à 7, dessinés par la page d'avant la mission 142 (ecf9c94), sans la ligne.
const EMPREINTES = { 'chirurgien-dentiste': 'ac233d86dbe60a71', coiffeur: 'a92a6fca3bd3f44c', avocat: 'fdd32f51454c7fce' };
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 16);
const jouer = (largeur) => {
  const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var R = { largeur: document.documentElement.clientWidth };
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow(); FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    var NBSP = String.fromCharCode(160);
    var corps = function () { return document.getElementById('configProCorps'); };
    var deborde = function () { var c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    var police = function (el) { var s = getComputedStyle(el); return [s.fontSize, s.fontWeight].join(' '); };
    // Chaque caractère situé par Range.getClientRects : son numéro de ligne.
    var lignesDe = function (racine) {
      var l = [], w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT), t;
      while ((t = w.nextNode())) for (var i = 0; i < t.length; i++) {
        if (t.data[i] === ' ' || t.data[i] === NBSP) continue;
        var r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
        var q = Array.prototype.filter.call(r.getClientRects(), function (x) { return x.width > 0; })[0];
        if (q) l.push({ c: t.data[i], y: Math.round(q.top + q.height / 2), n: t.parentElement });
      }
      var ys = l.map(function (x) { return x.y; }).sort(function (a, b) { return a - b; }), rangs = [], d = -99;
      ys.forEach(function (y) { if (y - d > 4) rangs.push(y); d = y; });
      l.forEach(function (x) { x.ligne = rangs.filter(function (y) { return x.y - y >= -4; }).length - 1; });
      return { n: rangs.length, chars: l };
    };
    var mesure = function () {
      var x = corps().querySelector('#cpRappelMetier141');
      if (!x) return { n: 0 };
      var q = x.previousElementSibling && x.previousElementSibling.previousElementSibling;
      var L = lignesDe(x), sp = x.querySelectorAll('span');
      var ligneDe = function (el) { var s = {}; L.chars.forEach(function (c) { if (el.contains(c.n)) s[c.ligne] = 1; }); return Object.keys(s).map(Number); };
      var polices = {}; L.chars.forEach(function (c) { polices[police(c.n)] = 1; });
      // Le titre de l'étape : aucun mot coupé à son trait d'union, « ? » jamais seul en début de ligne.
      var LT = q ? lignesDe(q).chars : [], coupes = [];
      LT.forEach(function (c, i) { if ((c.c === '-' && LT[i + 1] && LT[i + 1].ligne !== c.ligne) || (c.c === '?' && LT[i - 1] && LT[i - 1].ligne !== c.ligne)) coupes.push(c.c + '@' + i); });
      return { n: corps().querySelectorAll('#cpRappelMetier141').length, texte: x.innerText.split(NBSP).join(' ').replace(/\\s+/g, ' ').trim(), lignes: L.n,
        titre: q ? q.innerText : '', titrePolice: q ? police(q) : '', polices: Object.keys(polices), titreCoupes: coupes,
        lignesEtiquette: sp[0] ? ligneDe(sp[0]) : [], lignesNom: sp[1] ? ligneDe(sp[1]) : [], deuxPoints: (L.chars.filter(function (c) { return c.c === ':'; })[0] || {}).ligne,
        mot: (L.chars.filter(function (c) { return c.c === 'r'; })[0] || {}).ligne, debord: deborde() };
    };
    // Mission 148 : l'empreinte d'avant se lit sans l'étape « Vos règles de réservation » (sans son cadre au récapitulatif, avec le compteur
    // et les renvois d'avant : « sur 6 », une étape de moins à partir de la durée). verif-config-regles148 vérifie la nouvelle étape.
    var sans = function () { return corps().innerHTML.replace(new RegExp('<button id="cpTousMetiers139"[^>]*>[^<]*</button>'), '').replace(new RegExp('<div id="cpRappelMetier141"[^>]*>.*?</div>'), '').replace(new RegExp('<span class="cp-bloc143"[^>]*>([^<]*)</span>', 'g'), '$1').replace('Quels domaines d’activité pratiquez-vous ?', 'Quels domaines pratiquez-vous ?').replace(new RegExp('<div id="cpRecapRegles148">[^]*?</div><!--/cpRecapRegles148-->'), '').replace(/(Étape|étape|étapes) ([0-9])/g, function (m, a, c) { return a + ' ' + (Number(c) >= 6 ? Number(c) - 1 : c); }).replace(/ sur 7</g, ' sur 6<'); };   // mission 143 : les blocs des titres retirés
    ['chirurgien-dentiste', 'coiffeur', 'avocat'].forEach(function (id) {
      var e = { v: 1, metier: id, familles: tcConfigProFamillesDuMetier(id), jours: tcConfigProJoursDefaut(), dureeRdv: id === 'chirurgien-dentiste' ? 20 : 30, etape: 2, termine: false };
      if (id === 'avocat') e.familles[0].gardee = true;
      localStorage.setItem('tc_config_pro', JSON.stringify(e)); _tcConfigPro = null; _tcConfigProErreur = ''; tcOuvrirConfigPro121();
      var T = { html: [] };
      for (var n = 2; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); if (n <= 6) T['e' + n] = mesure(); else T.e7 = mesure(); T.html.push(sans()); }
      _tcConfigProEtape = 2; tcRendreConfigPro121(); T.titre2 = (corps().children[1] || {}).innerText || '';
      R[id] = T;
    });
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-142-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + largeur + ',844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  try { return m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { erreur: (r.stdout || '').slice(-300) }; } catch (e) { return { erreur: String(e) }; }
};
const METIERS = [['chirurgien-dentiste', 'Chirurgien-dentiste'], ['coiffeur', 'Coiffeur'], ['avocat', 'Avocat']];
console.log('-- Dans la page (Chrome), 390, 360 et 320 px --');
const S = { 390: jouer(390), 360: jouer(360), 320: jouer(320) };
if (process.env.EMPREINTES) { console.log(JSON.stringify(Object.fromEntries(METIERS.map(([id]) => [id, S[390][id] ? h(S[390][id].html.join('\n§\n')) : null])), null, 1)); process.exit(0); }
const J = (x) => JSON.stringify(x);
for (const L of [390, 360, 320]) if (!S[L] || S[L].erreur) verifie('la page a rejoué le parcours (' + L + ' px)', false, S[L] && S[L].erreur);
if (!ko) {
  const A = S[390];
  // 1. Tout en gras, à la taille du titre de l'étape.
  const mal1 = [];
  for (const [id, nom] of METIERS) for (const n of [2, 3, 4, 5, 6]) {
    const M = A[id]['e' + n];
    if (!(M.n === 1 && M.texte === 'Votre métier : ' + nom && /^20px 700$/.test(M.titrePolice) && M.polices.length === 1 && M.polices[0] === M.titrePolice)) mal1.push(id + ' ' + n + ' ' + J(M));
  }
  verifie('étapes 2 à 6, les trois métiers : « Votre métier : … » tout en gras, le métier aussi, à la taille du titre de l’étape (20 px, gras)', mal1.length === 0, mal1.join(' | '));
  verifie('ni à l’étape 1, ni au récapitulatif', METIERS.every(([id]) => A[id].e7.n === 0), J(METIERS.map(([id]) => A[id].e7)));
  // 2. Une ligne à 390 px, « Chirurgien-dentiste » compris.
  const mal2 = [];
  for (const [id] of METIERS) for (const n of [2, 3, 4, 5, 6]) { const M = A[id]['e' + n]; if (M.lignes !== 1 || M.debord > 0) mal2.push(id + ' ' + n + ' ' + J([M.lignes, M.debord])); }
  verifie('à 390 px : sur une seule ligne pour les trois métiers (« Votre métier : Chirurgien-dentiste » compris), sans débordement', mal2.length === 0, mal2.join(' | '));
  // 3. Plus étroit : deux lignes propres au plus.
  const mal3 = [];
  for (const L of [360, 320]) for (const [id] of METIERS) for (const n of [2, 3, 4, 5, 6]) {
    const M = S[L][id]['e' + n];
    const propre = M.n === 1 && M.lignes <= 2 && M.lignesEtiquette.length === 1 && M.lignesNom.length === 1 && M.deuxPoints === M.lignesEtiquette[0] && M.lignesEtiquette[0] <= M.lignesNom[0] && M.debord <= 0;
    if (!propre) mal3.push(L + ' ' + id + ' ' + n + ' ' + J(M));
  }
  verifie('à 360 et 320 px : deux lignes propres au plus (« Votre métier : » d’un bloc, le métier jamais coupé, même « Chirurgien-dentiste »), sans débordement', mal3.length === 0, mal3.join(' | '));
  verifie('à 360 px, « Chirurgien-dentiste » passe entier sur la deuxième ligne', S[360]['chirurgien-dentiste'].e2.lignes === 2 && S[360]['chirurgien-dentiste'].e2.lignesNom[0] === 1, J(S[360]['chirurgien-dentiste'].e2));
  // 4. Le titre de l'avocat, étape 2 ; ceux du dentiste et du coiffeur ne changent pas.
  verifie('avocat, étape 2 : « Quels domaines d’activité pratiquez-vous ? »', A.avocat.titre2 === 'Quels domaines d’activité pratiquez-vous ?' && A.avocat.e2.titre === A.avocat.titre2, J([A.avocat.titre2, A.avocat.e2.titre]));
  const mal4 = [];
  // Le titre changé par la mission (les autres titres ne bougent pas : empreintes plus bas).
  for (const L of [390, 360, 320]) { const M = S[L].avocat.e2; if (!M.titreCoupes || M.titreCoupes.length) mal4.push(L + ' ' + J([M.titre, M.titreCoupes])); }
  verifie('avocat, étape 2, à 390, 360 et 320 px : le titre ne coupe pas « pratiquez-vous ? » à son trait d’union, « ? » jamais seul', mal4.length === 0, mal4.join(' | '));
  verifie('dentiste et coiffeur, étape 2 : « Quels actes faites-vous ? », « Quelles prestations faites-vous ? » (inchangés)', A['chirurgien-dentiste'].titre2 === 'Quels actes faites-vous ?' && A.coiffeur.titre2 === 'Quelles prestations faites-vous ?', J([A['chirurgien-dentiste'].titre2, A.coiffeur.titre2]));
  // 5. Rien d'autre ne bouge.
  const diff = METIERS.filter(([id]) => h(A[id].html.join('\n§\n')) !== EMPREINTES[id]).map(([id]) => id);
  verifie('rien d’autre ne bouge : les trois métiers, étapes 2 à 7, sans cette ligne et avec l’ancien titre de l’avocat, au caractère près (page d’avant)', Object.keys(EMPREINTES).length === 3 && diff.length === 0, diff.join(', '));
  verifie('aucun appel réseau', [390, 360, 320].every((L) => S[L].appels === 0), J([390, 360, 320].map((L) => S[L].appels)));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
