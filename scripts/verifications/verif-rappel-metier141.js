// Mission 141 (Charles, 19/11) : « Configuration professionnelle », étapes 2 à 6 : « Votre métier : … » entre le texte
// d'explication et la première carte, dans le style de la carte « Votre métier » du récapitulatif, sur une ligne à 390 px ;
// pour le chirurgien-dentiste, le coiffeur (seul et à plusieurs) et l'avocat. En regardant les métiers (« Voir tous les
// métiers ») : le métier regardé, et rien n'est écrit. Ni à l'étape 1, ni au récapitulatif. Rien d'autre ne bouge : l'avocat,
// étape par étape, sans cette ligne, au caractère près (empreintes lues sur la page d'avant, be6740e) ; le dentiste et le
// coiffeur : verif-config-coiffeur136 et verif-config-avocat137.
// Usage : node verif-rappel-metier141.js <index.html>   (TC_CHROME ; EMPREINTES=1 : affiche les empreintes de l'avocat)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
// L'avocat de cette suite, dessiné par la page d'avant la mission 141 (be6740e).
const EMPREINTES = { etape2: '0604a0b353acfa30', etape3: '563781055c2b6e15', etape4: 'c6ef638869b52ab2', etape5: '848b3ec16b863a18', etape6: '6d9f1202d4762534', etape7: 'cf1c3b8f8cc057c5' };
console.log('-- Dans la page (Chrome), 390 px --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow(); FEATURES.CONFIG_PRO = true;
    var NBSP = String.fromCharCode(160);
    var corps = function () { return document.getElementById('configProCorps'); };
    var deborde = function () { var c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    var style = function (el) { var s = getComputedStyle(el); return [s.backgroundColor, s.borderTopWidth, s.borderTopStyle, s.borderTopColor, s.borderTopLeftRadius, s.paddingTop, s.paddingLeft, s.marginBottom].join(' '); };
    var police = function (el) { var s = getComputedStyle(el); return [s.fontSize, s.fontWeight, s.color].join(' '); };
    // Le nombre de lignes d'un texte : chaque caractère situé par Range.getClientRects.
    var lignes = function (el) {
      var hauts = {}, w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t;
      while ((t = w.nextNode())) {
        for (var i = 0; i < t.length; i++) {
          if (t.data[i] === ' ') continue;
          var r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
          Array.prototype.forEach.call(r.getClientRects(), function (q) { if (q.width > 0) hauts[Math.round(q.top + q.height / 2)] = 1; });
        }
      }
      var l = Object.keys(hauts).map(Number).sort(function (a, b) { return a - b; }), n = 0, d = -99;
      l.forEach(function (y) { if (y - d > 4) n++; d = y; });
      return n;
    };
    // Ce que montre l'étape : la ligne, sa place (après l'explication, avant la première carte), son style.
    var mesure = function () {
      var l = corps().querySelectorAll('#cpRappelMetier141');
      var M = { n: l.length, debord: deborde() };
      var x = l[0];
      if (!x) return M;
      var av = x.previousElementSibling, q = av && av.previousElementSibling, et = q && q.previousElementSibling, ap = x.nextElementSibling;
      var r = x.getBoundingClientRect(), cs = getComputedStyle(x);
      M.texte = x.innerText.split(NBSP).join(' ');
      M.insecable = x.textContent.indexOf('métier' + NBSP + ':') > -1;
      M.lignes = lignes(x);
      M.visible = r.height > 0 && r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) === 1;
      M.dedans = r.left >= 0 && r.right <= document.documentElement.clientWidth;
      M.parent = x.parentElement === corps();
      M.etape = et ? et.innerText : '';
      M.question = q ? police(q) : '';
      M.explication = av ? av.innerText.split(NBSP).join(' ') : '';
      M.explicationPolice = av ? police(av) : '';
      M.apres = ap ? (ap.id || ap.className || ap.getAttribute('style') || '').slice(0, 60) : '';
      M.ecarts = [av ? Math.round(r.top - av.getBoundingClientRect().bottom) : null, ap ? Math.round(ap.getBoundingClientRect().top - r.bottom) : null];
      M.style = style(x);
      var sp = x.querySelectorAll('span');
      M.polices = Array.prototype.map.call(sp, police);
      M.rang = Array.prototype.indexOf.call(corps().children, x);
      return M;
    };
    // Le style de la carte « Votre métier » du récapitulatif.
    var carteRecap = function () {
      var t = Array.prototype.filter.call(corps().querySelectorAll('div'), function (d) { return d.children.length === 0 && d.innerText.trim() === 'Votre métier'; })[0];
      if (!t) return null;
      return { style: style(t.parentElement.parentElement), titre: police(t), nom: t.parentElement.nextElementSibling ? t.parentElement.nextElementSibling.innerText : '' };
    };
    var ouvrir = function (e) { localStorage.setItem('tc_config_pro', JSON.stringify(e)); _tcConfigPro = null; _tcConfigProErreur = ''; tcOuvrirConfigPro121(); };
    var etapes = function () { var T = {}; for (var n = 1; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); T['e' + n] = mesure(); } return T; };
    var neuf = function (id, d) { return { v: 1, metier: id, familles: tcConfigProFamillesDuMetier(id), jours: tcConfigProJoursDefaut(), dureeRdv: d, etape: 2, termine: false }; };
    navigate('configpro'); await attendre(300);
    // A. Le chirurgien-dentiste, le coiffeur seul, l'avocat : les étapes 1 à 7.
    var e = neuf('chirurgien-dentiste', 20); e.fiche = { nom: 'Dr Charles Haddad', metier: 'Chirurgien-dentiste', adresse: '12 rue de la Paix, 75002 Paris' };
    ouvrir(e); R.dentiste = etapes(); R.recapDentiste = carteRecap();
    var c = neuf('coiffeur', 30);
    ouvrir(c); R.coiffeur = etapes(); R.recapCoiffeur = carteRecap();
    // Le coiffeur à plusieurs : à l'étape 4, la ligne vient avant les onglets des coiffeurs.
    c.equipe = { mode: 'plusieurs', coiffeurs: [{ id: 'cA', prenom: 'Marie', jours: tcConfigProJoursDefaut(), sans: [] }, { id: 'cB', prenom: 'Julien', jours: tcConfigProJoursDefaut(), sans: [] }] };
    ouvrir(c); R.equipe = etapes();
    var a = neuf('avocat', 30); a.familles[0].gardee = true;
    a.fiche = { nom: 'Maître Charles Haddad', metier: 'Avocat', adresse: '3 place du Palais, 75001 Paris', barreau: 'Paris' };
    ouvrir(a); R.avocat = etapes(); R.recapAvocat = carteRecap();
    // L'avocat sans la ligne, étape par étape (empreintes) ; dessiné sans « Voir tous les métiers ».
    var sans = function () { return corps().innerHTML.replace(new RegExp('<button id="cpTousMetiers139"[^>]*>[^<]*</button>'), '').replace(new RegExp('<div id="cpRappelMetier141"[^>]*>.*?</div>'), '')
      .replace('Quels domaines d’activité <span style="white-space:nowrap;">pratiquez-vous ?</span>', 'Quels domaines pratiquez-vous ?'); };   // mission 142 : le titre de l'étape 2 de l'avocat
    var H = {}; for (var n = 2; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); H['etape' + n] = sans(); } R.html = H;
    // B. Le vrai parcours d'un avocat neuf : il touche « Avocat », puis « Suivant ».
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; _tcConfigProEtape = 1; _tcConfigProErreur = '';
    navigate('configpro'); await attendre(200);
    var carte = function (nom) { return Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return /choisirMetier/.test(b.getAttribute('onclick') || '') && b.innerText.trim() === nom; })[0]; };
    var cliquer = async function (el) { if (!el) throw new Error('bouton absent'); el.click(); await attendre(80); };
    R.neuf1 = mesure();
    await cliquer(carte('Avocat')); R.neufChoisi = mesure();
    await cliquer(document.getElementById('cpSuivant')); R.neuf2 = mesure();
    // C. En regardant les métiers, depuis le récapitulatif d'un dentiste : le métier regardé ; rien n'est écrit.
    var d = neuf('chirurgien-dentiste', 20); d.etape = 6; d.termine = true; d.fiche = { nom: 'Dr Charles Haddad', metier: 'Chirurgien-dentiste', adresse: '12 rue de la Paix, 75002 Paris' };
    localStorage.setItem('tc_config_pro', JSON.stringify(d)); _tcConfigPro = null; _tcConfigProEtape = 1;
    navigate('configpro'); await attendre(200);
    var avant = localStorage.getItem('tc_config_pro');
    R.r7 = mesure();
    await cliquer(document.getElementById('cpTousMetiers139')); R.r1 = mesure();
    await cliquer(carte('Avocat')); await cliquer(document.getElementById('cpSuivant')); R.rAvocat = mesure(); R.rRetourEnHaut = !!document.getElementById('cpRetourConfig139');
    var boutons = function (t) { return Array.prototype.filter.call(document.querySelectorAll('#configProCorps button'), function (b) { return b.innerText.trim() === t; })[0]; };
    await cliquer(boutons('← Retour')); R.rRetour1 = mesure();
    await cliquer(carte('Coiffeur'));
    var R2 = [];
    for (var k = 2; k <= 6; k++) { await cliquer(document.getElementById('cpSuivant')); var m = mesure(); m.n2 = _tcConfigProEtape; m.erreur = _tcConfigProErreur; R2.push(m); }
    R.rCoiffeur = R2;
    await cliquer(document.getElementById('cpRetourConfig139')); R.rRecap = mesure();
    R.rRien = localStorage.getItem('tc_config_pro') === avant;
    tcConfigPro121.aller(2); await attendre(50); R.rDentiste2 = mesure();
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-141-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 16);
if (S && S.html && process.env.EMPREINTES) { console.log(JSON.stringify(Object.fromEntries(Object.entries(S.html).map(([k, v]) => [k, h(v)])), null, 1)); process.exit(0); }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur);
else {
  const J = (x) => JSON.stringify(x);
  // Une étape de 2 à 6 : une seule ligne « Votre métier : <nom> », sous l'explication, avant la première carte, sur une ligne.
  const bonne = (M, nom, explication) => M && M.n === 1 && M.texte === 'Votre métier : ' + nom && M.insecable && M.lignes === 1 && M.visible && M.dedans && M.parent
    && /^ÉTAPE [2-6] SUR 6$/i.test(M.etape.trim()) && /^20px 700 /.test(M.question) && /^14px 400 /.test(M.explicationPolice) && (!explication || M.explication.indexOf(explication) === 0)
    && M.ecarts[0] >= 10 && M.ecarts[1] >= 10 && M.debord <= 0;
  const trois = [['dentiste', 'Chirurgien-dentiste', 'Cochez les actes que vous faites.'], ['coiffeur', 'Coiffeur', 'Cochez les prestations que vous faites.'], ['avocat', 'Avocat', 'Cochez vos domaines, puis leurs missions.']];
  for (const [cle, nom, aide2] of trois) {
    const T = S[cle];
    const mal = [2, 3, 4, 5, 6].filter((n) => !bonne(T['e' + n], nom, n === 2 ? aide2 : ''));
    verifie(nom + ' : aux étapes 2 à 6, une seule ligne « Votre métier : ' + nom + ' », entre l’explication et la première carte, sur une ligne à 390 px', mal.length === 0, mal.map((n) => n + ' ' + J(T['e' + n])).join(' | '));
    verifie(nom + ' : ni à l’étape 1 (le choix du métier), ni au récapitulatif', T.e1.n === 0 && T.e7.n === 0, J([T.e1, T.e7]));
  }
  // Le style de la carte « Votre métier » du récapitulatif : même fond, même bord, mêmes coins, même marge ; le titre à 15 px, en gras.
  const rc = [S.recapDentiste, S.recapCoiffeur, S.recapAvocat];
  // Mission 142 : le texte passe à la taille et au gras du titre de l'étape (verif-rappel-metier142) ; la carte garde ce style.
  const styleOk = rc.every((x) => x && x.style) && trois.every(([cle], i) => [2, 3, 4, 5, 6].every((n) => S[cle]['e' + n].style === rc[i].style));
  verifie('dans le style de la carte « Votre métier » du récapitulatif (fond, bord, coins, marges)', styleOk, J([rc, S.avocat.e2.style, S.avocat.e2.polices]));
  verifie('bien lisible : le nom du métier à 15 px au moins', trois.every(([cle]) => [2, 3, 4, 5, 6].every((n) => parseFloat((S[cle]['e' + n].polices || [])[1]) >= 15)), J(S.avocat.e2.polices));
  verifie('le récapitulatif garde sa carte « Votre métier » (Chirurgien-dentiste, Coiffeur, Avocat)', rc.map((x) => x && x.nom).join(',') === 'Chirurgien-dentiste,Coiffeur,Avocat', J(rc));
  const eq = S.equipe;
  verifie('le coiffeur à plusieurs : à l’étape 4, la ligne vient sous l’explication, avant les onglets des coiffeurs ; aux étapes 2 à 6, la même ligne', [2, 3, 4, 5, 6].every((n) => bonne(eq['e' + n], 'Coiffeur', '')) && /Choisissez un coiffeur, puis cochez ses jours\./.test(eq.e4.explication) && eq.e1.n === 0 && eq.e7.n === 0, J(eq.e4));
  verifie('le vrai parcours : l’avocat neuf touche « Avocat » (pas de ligne à l’étape 1), puis « Suivant » : « Votre métier : Avocat »', S.neuf1.n === 0 && S.neufChoisi.n === 0 && bonne(S.neuf2, 'Avocat', 'Cochez vos domaines'), J([S.neuf1.n, S.neufChoisi.n, S.neuf2]));
  // En regardant les métiers.
  verifie('« Voir tous les métiers » : pas de ligne au récapitulatif, ni à l’étape 1', S.r7.n === 0 && S.r1.n === 0, J([S.r7, S.r1]));
  verifie('en regardant l’avocat : « Votre métier : Avocat », sous l’explication (le bouton « Retour à ma configuration » reste en haut)', bonne(S.rAvocat, 'Avocat', 'Cochez vos domaines') && S.rRetourEnHaut && S.rAvocat.rang === 4, J(S.rAvocat));
  verifie('en regardant le coiffeur ensuite (« ← Retour », « Coiffeur »), aux étapes 2 à 6 : « Votre métier : Coiffeur »', S.rRetour1.n === 0 && S.rCoiffeur.length === 5 && S.rCoiffeur.every((M, i) => M.n2 === i + 2 && !M.erreur && bonne(M, 'Coiffeur', '')), J(S.rCoiffeur.map((M) => [M.n2, M.erreur, M.texte, M.lignes, M.ecarts])));
  verifie('« Retour à ma configuration » : son récapitulatif, sans la ligne ; rien n’a été écrit ; son étape 2 rappelle « Chirurgien-dentiste »', S.rRecap.n === 0 && S.rRien && bonne(S.rDentiste2, 'Chirurgien-dentiste', 'Cochez les actes'), J([S.rRecap.n, S.rRien, S.rDentiste2]));
  const diff = Object.keys(EMPREINTES).filter((k) => h(S.html[k]) !== EMPREINTES[k]);
  verifie('rien d’autre ne bouge : l’avocat, ses étapes 2 à 7 sans cette ligne, au caractère près (page d’avant la mission)', Object.keys(EMPREINTES).length === 6 && diff.length === 0, diff.join(', '));
  verifie('aucun appel réseau', S.appels === 0, S.appels);
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
