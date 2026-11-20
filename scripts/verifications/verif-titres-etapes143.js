// Mission 143 (19/11) : les titres d'étape de la « Configuration professionnelle » (étapes 1 à 6) ne se coupent plus mal sur les
// petits téléphones : aucun mot coupé à son trait d'union (« rendez-/vous », « faites-/vous »), « ? » jamais séparé du mot
// d'avant. Chirurgien-dentiste, coiffeur (seul et à plusieurs), avocat ; 320, 340, 360, 375 et 390 px (chaque caractère situé
// par Range.getClientRects). Rien d'autre ne bouge : les étapes 1 à 7 des quatre configurations, une fois les blocs retirés,
// au caractère près (empreintes lues sur la page d'avant, 82cb5f8).
// Usage : node verif-titres-etapes143.js <index.html>   (TC_CHROME ; EMPREINTES=1 : affiche les empreintes)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); };
// Les quatre configurations, étapes 1 à 7, dessinées par la page d'avant la mission 143 (82cb5f8), blocs retirés.
// Mission 147 : étapes 2 à 7 seulement (l'étape 1 change), lues sur la page d'avant la mission (889e169).
const EMPREINTES = { dentiste: 'ac233d86dbe60a71', coiffeur: 'a92a6fca3bd3f44c', equipe: '8ca7140920069ddd', avocat: 'd9b42157f0beb8b6' };
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
    // Le titre de l'étape (20 px, gras) : chaque caractère et sa ligne.
    var titre = function () {
      var q = Array.prototype.filter.call(corps().children, function (x) { var s = getComputedStyle(x); return s.fontSize === '20px' && x.id !== 'cpRappelMetier141'; })[0];
      if (!q) return null;
      var l = [], w = document.createTreeWalker(q, NodeFilter.SHOW_TEXT), t;
      while ((t = w.nextNode())) for (var i = 0; i < t.length; i++) {
        if (t.data[i] === ' ' || t.data[i] === NBSP) continue;
        var r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
        var x = Array.prototype.filter.call(r.getClientRects(), function (y) { return y.width > 0; })[0];
        if (x) l.push({ c: t.data[i], y: Math.round(x.top + x.height / 2) });
      }
      var ys = l.map(function (x) { return x.y; }).sort(function (a, b) { return a - b; }), rangs = [], d = -99;
      ys.forEach(function (y) { if (y - d > 4) rangs.push(y); d = y; });
      l.forEach(function (x) { x.ligne = rangs.filter(function (y) { return x.y - y >= -4; }).length - 1; });
      var coupes = [];
      l.forEach(function (c, i) { if ((c.c === '-' && l[i + 1] && l[i + 1].ligne !== c.ligne) || (c.c === '?' && l[i - 1] && l[i - 1].ligne !== c.ligne)) coupes.push(c.c + '@' + i); });
      var lignes = []; l.forEach(function (c) { lignes[c.ligne] = (lignes[c.ligne] || '') + c.c; });
      return { texte: q.innerText.split(NBSP).join(' '), lignes: lignes, coupes: coupes };
    };
    var normal = function () { return corps().innerHTML.replace(new RegExp('<button id="cpTousMetiers139"[^>]*>[^<]*</button>'), '').replace(new RegExp('<div id="cpRappelMetier141"[^>]*>.*?</div>'), '')
      .replace(new RegExp('<span (?:class="cp-bloc143" )?style="white-space:nowrap;">([^<]*)</span>', 'g'), '$1'); };
    var CONFIGS = { dentiste: 'chirurgien-dentiste', coiffeur: 'coiffeur', equipe: 'coiffeur', avocat: 'avocat' };
    Object.keys(CONFIGS).forEach(function (cle) {
      var id = CONFIGS[cle];
      var e = { v: 1, metier: id, familles: tcConfigProFamillesDuMetier(id), jours: tcConfigProJoursDefaut(), dureeRdv: id === 'chirurgien-dentiste' ? 20 : 30, etape: 2, termine: false };
      if (cle === 'equipe') e.equipe = { mode: 'plusieurs', coiffeurs: [{ id: 'cA', prenom: 'Léa', jours: tcConfigProJoursDefaut(), sans: [] }, { id: 'cB', prenom: 'Tom', jours: tcConfigProJoursDefaut(), sans: [] }] };
      localStorage.setItem('tc_config_pro', JSON.stringify(e)); _tcConfigPro = null; _tcConfigProErreur = ''; tcOuvrirConfigPro121();
      var T = { titres: {}, html: [], debords: [] };
      // Mission 147 : l'étape 1 change (les métiers par catégories : verif-config-metiers147) ; l'empreinte se lit sur les étapes 2 à 7.
      for (var n = 1; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); if (n <= 6) T.titres['e' + n] = titre(); if (n >= 2) T.html.push(normal()); T.debords.push(deborde()); }
      R[cle] = T;
    });
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-143-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + largeur + ',844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  try { return m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { erreur: (r.stdout || '').slice(-300) }; } catch (e) { return { erreur: String(e) }; }
};
const LARGEURS = [320, 340, 360, 375, 390];
const CLES = ['dentiste', 'coiffeur', 'equipe', 'avocat'];
console.log('-- Dans la page (Chrome), ' + LARGEURS.join(', ') + ' px --');
const S = {};
if (process.env.EMPREINTES) { const A = jouer(390); console.log(JSON.stringify(Object.fromEntries(CLES.map((c) => [c, A[c] ? h(A[c].html.join('\n§\n')) : A.erreur])), null, 1)); process.exit(0); }
for (const L of LARGEURS) S[L] = jouer(L);
const J = (x) => JSON.stringify(x);
for (const L of LARGEURS) if (!S[L] || S[L].erreur) verifie('la page a rejoué le parcours (' + L + ' px)', false, S[L] && S[L].erreur);
if (!ko) {
  const mal = [], vus = {};
  for (const L of LARGEURS) for (const c of CLES) for (let n = 1; n <= 6; n++) {
    const T = S[L][c].titres['e' + n];
    if (!T) { mal.push(L + ' ' + c + ' ' + n + ' sans titre'); continue; }
    vus[T.texte] = 1;
    if (T.coupes.length) mal.push(L + ' px, ' + c + ', étape ' + n + ' : ' + J(T.lignes));
  }
  verifie('étapes 1 à 6, les trois métiers (coiffeur seul et à plusieurs), de 320 à 390 px : aucun titre coupé au milieu d’un mot à trait d’union, « ? » jamais seul', mal.length === 0, mal.join(' | '));
  const attendus = ['Quel est votre métier ?', 'Quels actes faites-vous ?', 'Quelles prestations faites-vous ?', 'Quels domaines d’activité pratiquez-vous ?', 'Combien de temps vous faut-il ?',
    'Combien de temps, et à quel prix ?', 'Vos deux rendez-vous', 'Quels jours travaillez-vous ?', 'Quels jours travaille chaque coiffeur ?', 'Combien de temps dure un rendez-vous chez vous, par défaut ?', 'Votre fiche professionnelle'];
  verifie('les onze titres sont tous vus, leur texte inchangé', attendus.every((t) => vus[t]) && Object.keys(vus).length === attendus.length, J(Object.keys(vus)));
  verifie('aucun débordement sur le côté, de 320 à 390 px, étapes 1 à 7', LARGEURS.every((L) => CLES.every((c) => S[L][c].debords.every((x) => x <= 0))), J(LARGEURS.map((L) => CLES.map((c) => S[L][c].debords))));
  const diff = CLES.filter((c) => h(S[390][c].html.join('\n§\n')) !== EMPREINTES[c]);
  verifie('rien d’autre ne bouge : les quatre configurations, étapes 2 à 7, blocs retirés, au caractère près (page d’avant)', Object.keys(EMPREINTES).length === 4 && diff.length === 0, diff.join(', '));
  verifie('aucun appel réseau', LARGEURS.every((L) => S[L].appels === 0), J(LARGEURS.map((L) => S[L].appels)));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
