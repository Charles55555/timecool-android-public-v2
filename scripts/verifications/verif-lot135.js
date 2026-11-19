// Mission 135, solution B (Charles, 19/11) : au profil 1, quand plus de 6 créneaux choisis attendent en même temps, une seule carte
// « Je les place dans ton agenda ? » pour le lot, pliée par jour (« • Jeudi 19 : 14 personnes ont choisi leur nouveau moment »),
// « Voir le détail » dans la bulle au-dessus du « oui » ; un conflit ou un rendez-vous qui n'est plus dans l'agenda toujours écrits.
// Jusqu'à 6 : une question par réponse, comme avant. Rien n'est placé avant le « oui » ; un « non » ne place rien ; une réponse
// arrivée après la carte n'est pas placée avec le lot. Après : la règle de la mission 134 (une ligne par jour).
// Usage : node verif-lot135.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); };
const NB = String.fromCharCode(160);
const isoDe = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// Un lundi simulé (le prochain), à 10h : la semaine la plus remplie de la démonstration du dentiste (50 patients).
const lundi = new Date(); lundi.setHours(12, 0, 0, 0); lundi.setDate(lundi.getDate() + (((8 - lundi.getDay()) % 7) || 7));
const SIM = isoDe(lundi);

console.log('-- Dans la page (Chrome), lundi simulé ' + SIM + ' à 10h, profil 1 --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const horloge = `<script>(function () { var V = Date, dec = new V('${SIM}T10:00:00').getTime() - V.now();
  class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + dec); else super(...a); } static now() { return V.now() + dec; } }
  window.Date = D; })();</script>`;
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.requestAnimationFrame = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    tcCharlyPret = function () { return true; };
    hideAuthFlow(); navigate('assistant'); await attendre(500);
    TC_ATTENTE_DUREES.demo = 40; TC_ATTENTE_DUREES.vrai = 40; TC_ATTENTE_DUREES.feuilles = 40; TC_ATTENTE_DUREES.consulte = 40;
    var vu = function () { var b = document.getElementById('charlyChatBody'); return b ? b.innerText : ''; };
    var calme = async function () { var k = 0; while (k++ < 600 && _tcDemo && (_tcDemo.occupe > 0 || _tcDemo.reponsesAttendues > 0)) await attendre(400); await attendre(3000); };
    var question = function () { return charlyIA.history.filter(function (m) { return m && m._questionnaire && m._questionnaire.etat === 'choix'; }).pop(); };
    var cartes = function (n0) { return charlyIA.history.slice(n0).filter(function (m) { return m && m.role === 'assistant' && m._reponseCreneau && m._reponseCreneau.choix && m._reponseCreneau.choix.length; }); };
    var bouton = function (re) { return Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return re.test(x.textContent) && !x.disabled; }).pop(); };
    var boutonDetail = function (m) { var c = m && m._plie134 && m._plie134.cle; return c ? Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody .tc-detail134'), function (x) { return (x.getAttribute('onclick') || '').indexOf(c) > -1; })[0] : null; };
    var bulle = function (m) { var d = document.createElement('div'); d.style.width = '360px'; d.innerHTML = renderChatMessage(typeof tcVue134 === 'function' ? tcVue134(m) : m); document.body.appendChild(d); var t = d.innerText; d.remove(); return t; };
    var position = function (e) { return e.id + '@' + e.date + ' ' + e.startH + ':' + e.startM; };
    var utilisateur = function () { return charlyIA.history.filter(function (m) { return m && m.role === 'user'; }).length; };
    FEATURES.CHARLY_PRO = true; await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    // A et B. La phrase 6 du dentiste au profil 1, un lundi : 50 patients ; puis « Oui, place-les » (A) ou « Non » (B).
    for (var tour = 0; tour < 2; tour++) {
      await tcOuvrirDemo(); await attendre(400);
      _tcDemo.copie[TC_CONFIANCE_KEY] = '1';
      var avant = events.map(position);
      var n0 = charlyIA.history.length;
      await tcDemoJouer('malade'); await attendre(6000);
      var q = question();
      if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await calme(); }
      var C = cartes(n0), lot = C.filter(function (m) { return Array.isArray(m._reponseCreneau.lot); })[0];
      var X = { profil: tcConfianceCharly(), cartes: C.length, seules: C.filter(function (m) { return !Array.isArray(m._reponseCreneau.lot); }).length, taille: lot ? lot._reponseCreneau.lot.length : 0,
        plie: !!(lot && lot._plie134), contenu: lot ? lot.content : '', vu: lot ? bulle(lot) : '', bougesAvant: events.filter(function (e) { return avant.indexOf(position(e)) < 0; }).length,
        enAttente: events.filter(function (e) { return e && e.decalage && e.decalage.rdv; }).length };
      var bd = boutonDetail(lot), oui = bouton(/^Oui, place-les$/), non = bouton(/^Non, je les laisse où ils sont$/);
      X.boutonAvantOui = !!(bd && oui && (bd.compareDocumentPosition(oui) & 4));
      X.unSeulDetail = bd ? Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody .tc-detail134'), function (x) { return x.getAttribute('onclick') === bd.getAttribute('onclick'); }).length : 0;
      var choisis = lot ? lot._reponseCreneau.lot.map(function (p) { return { ev: tcRdvDeProposition(p), c: tcCreneauDeProposition(p) }; }) : [];
      if (tour === 0) {
        // Examen de la 135 : « Voir le détail » n'écrit aucune bulle de l'utilisateur, ni tout de suite, ni 3 s après.
        if (bd) { var u0 = utilisateur(); bd.click(); await attendre(300); X.bulleCarte = [utilisateur() - u0]; await attendre(3000); X.bulleCarte.push(utilisateur() - u0); }
        X.ouvert = lot ? bulle(lot) : '';
        var n1 = charlyIA.history.length;
        oui = bouton(/^Oui, place-les$/); if (oui) { oui.click(); await attendre(4000); }
        X.places = choisis.filter(function (x) { return x.ev && x.ev.date === x.c.date && x.ev.startH === x.c.startH && x.ev.startM === x.c.startM; }).length;
        X.bougesApres = events.filter(function (e) { return avant.indexOf(position(e)) < 0; }).length;
        X.enAttenteApres = events.filter(function (e) { return e && e.decalage && e.decalage.rdv; }).length;
        var fait = charlyIA.history.slice(n1).filter(function (m) { return m && /^✅ <b>C'est fait, rendez-vous déplacés/.test(String(m.content || '')); })[0];
        X.fait = { plie: !!(fait && fait._plie134), vu: fait ? bulle(fait) : '', rdvs: fait ? (String(fait.content).match(/« RDV /g) || []).length : 0, bouton: !!boutonDetail(fait) };
        var bf = boutonDetail(fait);
        if (bf) { var u1 = utilisateur(); bf.click(); await attendre(300); X.bulleFait = [utilisateur() - u1]; await attendre(3000); X.bulleFait.push(utilisateur() - u1); }
        X.traites = _tcDemo.propositions.filter(function (p) { return p.traite; }).length;
        R.A = X;
      } else {
        var n2 = charlyIA.history.length;
        if (non) { non.click(); await attendre(4000); }
        X.bougesApres = events.filter(function (e) { return avant.indexOf(position(e)) < 0; }).length;
        X.enAttenteApres = events.filter(function (e) { return e && e.decalage && e.decalage.rdv; }).length;
        var dac = charlyIA.history.slice(n2).filter(function (m) { return m && m.role === 'assistant' && /^D’accord, /.test(String(m.content || '')); })[0];
        X.non = { plie: !!(dac && dac._plie134), vu: dac ? bulle(dac) : '', rdvs: dac ? (String(dac.content).match(/« RDV /g) || []).length : 0 };
        R.B = X;
      }
      await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(300);
    }
    // C. En vrai (serveur simulé dans la page) : 6 choix, puis 8 choix (un conflit, un rendez-vous parti), un refus, une réponse tardive.
    var serveur = [], traites = [], textes = [];
    TC_BACKEND.estConnecte = function () { return true; };
    TC_BACKEND.propositions = async function () { return serveur.filter(function (p) { return !p.traite; }).map(function (p) { return Object.assign({}, p); }); };
    TC_BACKEND.propositionTraiter = async function (id, d) { traites.push(Number(id) + ':' + d); serveur.forEach(function (p) { if (p.rdv_id === Number(id)) p.traite = true; });
      return d === 'place' || d === 'laisse' ? { traite: true, message: 'Le rendez-vous est ' + (d === 'place' ? 'déplacé' : 'maintenu') + '.', messagerie: true } : { traite: true, message: null, messagerie: false }; };
    var vraiEtape = tcEtapeAttente; tcEtapeAttente = async function (t, sorte) { if (sorte === 'reception') textes.push(t); return vraiEtape.apply(this, arguments); };
    var preparer = function (n, avecConflit) {
      serveur = []; traites = []; textes = []; charlyIA.history.length = 0; events.length = 0;
      if (avecConflit) events.push({ id: 'occupe', title: 'Dentiste', mode: 'user', date: '2030-01-10', startH: 9, startM: 0, endH: 10, endM: 0 });
      for (var k = 0; k < n; k++) {
        var id = 'v' + k;
        events.push({ id: id, title: 'RDV P' + k, mode: 'user', date: k < 4 ? '2030-01-07' : '2030-01-08', startH: 9 + (k % 4), startM: 0, endH: 9 + (k % 4), endM: 30, decalage: { rdv: 100 + k, qui: 'P' + k + ' X', confiance: 1 } });
        var h = String(k + 11).padStart(2, '0');
        serveur.push({ rdv_id: 100 + k, remplace: id, qui: 'P' + k + ' X', etat: 'choisi', debut: '2030-01-10 ' + (avecConflit && k === 2 ? '09' : h) + ':00:00', fin: '2030-01-10 ' + (avecConflit && k === 2 ? '09' : h) + ':30:00', titre: 'RDV P' + k });
      }
    };
    var ouvertes = function () { return charlyIA.history.filter(function (m) { return m && m._reponseCreneau && !m._reponseCreneau._resolu && m._reponseCreneau.choix.length; }); };
    // C1. 6 choix : une question par réponse (rien ne change).
    preparer(6, false);
    await tcSuivrePropositions(true); await attendre(500);
    var o = ouvertes();
    R.C1 = { ouvertes: o.length, lot: o.filter(function (m) { return Array.isArray(m._reponseCreneau.lot); }).length, texte: o[0] ? o[0].content : '', plie: o.filter(function (m) { return m._plie134; }).length };
    // C2. 8 choix (P2 chevauche « Dentiste », P7 n'est plus dans l'agenda) et un refus (P8) ; puis P9 répond après la carte ; « oui » tapé.
    preparer(9, true);
    events.splice(events.findIndex(function (e) { return e.id === 'v7'; }), 1);
    serveur[8].etat = 'refuse'; serveur[8].debut = null; serveur[8].fin = null;
    var positions = events.map(position);
    await tcSuivrePropositions(true); await attendre(500);
    o = ouvertes();
    var carte = o[0];
    R.C2 = { ouvertes: o.length, taille: carte && carte._reponseCreneau.lot ? carte._reponseCreneau.lot.length : 0, refusDansLot: !!(carte && carte._reponseCreneau.lot && carte._reponseCreneau.lot.some(function (p) { return p.rdv_id === 108; })),
      vu: carte ? bulle(carte) : '', contenu: carte ? carte.content : '', bougesAvant: events.filter(function (e) { return positions.indexOf(position(e)) < 0; }).length, attente: textes.slice() };
    serveur.push({ rdv_id: 109, remplace: 'v9', qui: 'P9 X', etat: 'choisi', debut: '2030-01-11 08:00:00', fin: '2030-01-11 08:30:00', titre: 'RDV P9' });
    events.push({ id: 'v9', title: 'RDV P9', mode: 'user', date: '2030-01-09', startH: 15, startM: 0, endH: 15, endM: 30, decalage: { rdv: 109, qui: 'P9 X', confiance: 1 } });
    await tcSuivrePropositions(true); await attendre(500);
    R.C2.ouvertesApresTardive = ouvertes().length;
    R.C2.memeCarte = ouvertes()[0] === carte;
    var n3 = charlyIA.history.length;
    R.C2.tape = await tcRepondreReponseCreneau('Oui');
    await attendre(300);
    var ev = function (id) { return events.filter(function (e) { return e.id === id; })[0]; };
    R.C2.places = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6'].filter(function (id) { return ev(id) && ev(id).date === '2030-01-10'; }).length;
    R.C2.tardive = { date: ev('v9').date, traite: traites.filter(function (t) { return /^109:/.test(t); }).length, decalage: !!ev('v9').decalage };
    R.C2.refus = { date: ev('v8').date, traite: traites.filter(function (t) { return /^108:/.test(t); }).length };
    R.C2.traites = traites.slice();
    var apres = charlyIA.history.slice(n3);
    R.C2.messages = apres.map(function (m) { return (m._plie134 ? '[plié] ' : '') + bulle(m).replace(/\\s+/g, ' ').slice(0, 300); });
    var suites = apres.filter(function (m) { return /✉️ Message envoyé à /.test(String(m.content || '')); })[0];
    R.C2.suites = { plie: !!(suites && suites._plie134), vu: suites ? bulle(suites) : '', lignes: suites ? (String(suites.content).match(/✉️ Message envoyé à /g) || []).length : 0 };
    await attendre(2500);
    o = ouvertes();
    R.C2.ensuite = o.map(function (m) { return (Array.isArray(m._reponseCreneau.lot) ? 'lot ' : '') + m.content; });
    // C3. 7 choix, « Non, je les laisse où ils sont » : rien ne bouge.
    preparer(7, false);
    positions = events.map(position);
    await tcSuivrePropositions(true); await attendre(500);
    carte = ouvertes()[0];
    var n4 = charlyIA.history.length;
    if (carte) await tcChoisirReponseCreneau(Number(carte._reponseCreneau.p.rdv_id), 'laisser');
    await attendre(300);
    var dac2 = charlyIA.history.slice(n4).filter(function (m) { return m && m.role === 'assistant' && /^D’accord, /.test(String(m.content || '')); })[0];
    R.C3 = { lot: !!(carte && carte._reponseCreneau.lot), bouges: events.filter(function (e) { return positions.indexOf(position(e)) < 0; }).length, enAttente: events.filter(function (e) { return e.decalage; }).length,
      traites: traites.slice(), vu: dac2 ? bulle(dac2) : '', plie: !!(dac2 && dac2._plie134) };
    await attendre(2500);
    // C4. Les messages aux contacts : jusqu'à 6, rien ne change ; « Pense à prévenir … » toujours écrit.
    var L3 = ['✉️ Message envoyé à A dans sa messagerie TimeCool : « x »', '✉️ Message envoyé à B dans sa messagerie TimeCool : « x »'];
    var L8 = [0, 1, 2, 3, 4, 5].map(function (i) { return '✉️ Message envoyé à P' + i + ' dans sa messagerie TimeCool : « x »'; }).concat(['• Message prêt pour Q, à envoyer toi-même d’un geste (SMS ou email) : « x »', 'Pense à prévenir Z : « x »']);
    R.C4 = typeof tcPlierSuites135 === 'function' ? { trois: tcPlierSuites135(L3), huit: tcPlierSuites135(L8) } : { absent: true };
    // C5. Profil 3, 8 réponses : le compte rendu dit « Message envoyé dans la messagerie TimeCool : 8 personnes ».
    preparer(8, false);
    events.forEach(function (e) { if (e.decalage) e.decalage.confiance = 3; });
    await tcSuivrePropositions(true); await attendre(500);
    var cr = charlyIA.history.filter(function (m) { return m && m._compteRendu; }).pop();
    R.C5 = { plie: !!(cr && cr._plie134), vu: cr ? bulle(cr) : '', lignes: cr ? (String(cr.content).match(/✉️ Message envoyé à /g) || []).length : 0 };
    R.appels = appels;
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-135-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + horloge).replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=600000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, NB).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) verifie('la page a rejoué les parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur);
else {
  const lignesVues = (t) => String(t).split('\n').map((x) => x.trim()).filter(Boolean);
  const JOUR = /^• (Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) (1er|\d+) : /;
  const somme = (t, re) => lignesVues(t).filter((l) => JOUR.test(l) && re.test(l)).reduce((n, l) => n + Number((l.match(/ : (\d+) /) || [])[1] || 0), 0);
  const A = S.A || {}, B = S.B || {};
  // A. Le lot de la démonstration.
  verifie('démonstration du dentiste au profil 1 (50 patients) : une seule carte « Je les place dans ton agenda ? » pour les 50, aucune question une par une', A.profil === 1 && A.cartes === 1 && A.seules === 0 && A.taille === 50, JSON.stringify([A.profil, A.cartes, A.seules, A.taille]));
  verifie('la carte : une ligne par jour (« • Lundi 23 : 2 personnes ont choisi leur nouveau moment »…, 50 en tout), aucun rendez-vous listé, « Je les place dans ton agenda ? »', A.plie && somme(A.vu, / personnes? (ont|a) choisi (leur|son) nouveau moment$/) === 50 && !/« RDV /.test(A.vu) && /Je les place dans ton agenda \?/.test(A.vu) && lignesVues(A.vu).length <= 12, A.vu);
  verifie('la carte : « Voir le détail » dans la bulle, au-dessus de « Oui, place-les », une seule fois ; le message garde les 50 choix', A.boutonAvantOui && A.unSeulDetail === 1 && (A.contenu.match(/ a choisi /g) || []).length === 50, JSON.stringify([A.boutonAvantOui, A.unSeulDetail]));
  verifie('« Voir le détail » déplie les 50 choix avant le « oui »', (String(A.ouvert).match(/ a choisi /g) || []).length === 50, (String(A.ouvert).match(/ a choisi /g) || []).length);
  verifie('« Voir le détail » n’écrit aucune bulle de l’utilisateur, ni tout de suite, ni 3 s après (la carte, puis le « C’est fait »)', JSON.stringify(A.bulleCarte) === '[0,0]' && JSON.stringify(A.bulleFait) === '[0,0]', JSON.stringify([A.bulleCarte, A.bulleFait]));
  verifie('rien n’est placé avant le « oui » : aucun rendez-vous n’a bougé, les 50 attendent (⏳)', A.bougesAvant === 0 && A.enAttente === 50, JSON.stringify([A.bougesAvant, A.enAttente]));
  verifie('« Oui, place-les » : les 50 rendez-vous sont à l’heure choisie, plus aucun en attente, les 50 réponses closes', A.places === 50 && A.bougesApres === 50 && A.enAttenteApres === 0 && A.traites === 50, JSON.stringify([A.places, A.bougesApres, A.enAttenteApres, A.traites]));
  verifie('« C’est fait » : une ligne par jour (« • Lundi 23 : 2 rendez-vous déplacés »…, 50 en tout), « remets-les », « Voir le détail » ; le message garde les 50', A.fait && A.fait.plie && somme(A.fait.vu, / rendez-vous déplacés?$/) === 50 && !/« RDV /.test(A.fait.vu) && /remets-les/.test(A.fait.vu) && A.fait.bouton && A.fait.rdvs === 50, JSON.stringify(A.fait).slice(0, 600));
  // B. « Non ».
  verifie('« Non, je les laisse où ils sont » : aucun rendez-vous n’a bougé, plus aucun en attente', B.taille === 50 && B.bougesAvant === 0 && B.bougesApres === 0 && B.enAttenteApres === 0, JSON.stringify([B.taille, B.bougesAvant, B.bougesApres, B.enAttenteApres]));
  verifie('« Non » : « D’accord, les 50 rendez-vous restent à leur place. » (le message garde les 50 noms)', B.non && B.non.plie && /D’accord, les 50 rendez-vous restent à leur place\./.test(B.non.vu) && !/« RDV /.test(B.non.vu) && B.non.rdvs === 50, JSON.stringify(B.non).slice(0, 400));
  // C. En vrai.
  verifie('en vrai, 6 choix : une question pour la première réponse (« Je le place dans ton agenda ? »), rien de plié (comme avant)', S.C1.ouvertes === 1 && S.C1.lot === 0 && S.C1.plie === 0 && /^P0 X a choisi .* Je le place dans ton agenda \?$/.test(S.C1.texte), JSON.stringify(S.C1));
  verifie('en vrai, 8 choix et un refus : une seule carte pour les 8 choix, le refus n’en fait pas partie', S.C2.ouvertes === 1 && S.C2.taille === 8 && !S.C2.refusDansLot, JSON.stringify([S.C2.ouvertes, S.C2.taille, S.C2.refusDansLot]));
  verifie('la carte : le conflit (P2 et « Dentiste ») et le rendez-vous qui n’est plus dans l’agenda (P7) écrits en entier, les autres par jour', /P2 X a choisi .*attention, ça chevauche .*Dentiste/.test(S.C2.vu) && /P7 X a choisi .*« RDV P7 »/.test(S.C2.vu) && /• Lundi 7 : 3 personnes ont choisi leur nouveau moment/.test(S.C2.vu) && /• Mardi 8 : 3 personnes ont choisi leur nouveau moment/.test(S.C2.vu) && !/P0 X/.test(S.C2.vu), S.C2.vu);
  verifie('la bulle d’attente : « P0, P1, P2, P3, P4 et 3 autres répondent… »', S.C2.attente.length === 1 && S.C2.attente[0] === 'P0, P1, P2, P3, P4 et 3 autres répondent…', JSON.stringify(S.C2.attente));
  verifie('rien n’est placé avant le « oui »', S.C2.bougesAvant === 0, S.C2.bougesAvant);
  verifie('une réponse arrivée après la carte (P9) : pas de seconde carte, la même attend', S.C2.ouvertesApresTardive === 1 && S.C2.memeCarte, JSON.stringify([S.C2.ouvertesApresTardive, S.C2.memeCarte]));
  verifie('« oui » tapé : les 7 rendez-vous du lot placés ; P9 (arrivé après) n’est ni placé ni clos ; le refus non plus', S.C2.tape === true && S.C2.places === 7 && S.C2.tardive.date === '2030-01-09' && S.C2.tardive.traite === 0 && S.C2.tardive.decalage && S.C2.refus.date === '2030-01-08' && S.C2.refus.traite === 0, JSON.stringify([S.C2.tape, S.C2.places, S.C2.tardive, S.C2.refus]));
  verifie('après le « oui » : le conflit écrit (⚠️), « n’est plus dans ton agenda : je n’ai rien placé »', S.C2.messages.some((t) => /⚠️ Attention, ça chevauche/.test(t) && /RDV P2/.test(t)) && S.C2.messages.some((t) => /« RDV P7 » n’est plus dans ton agenda : je n’ai rien placé/.test(t)), JSON.stringify(S.C2.messages));
  verifie('les messages aux 7 contacts : « ✉️ Message envoyé dans la messagerie TimeCool : 7 personnes », « Voir le détail » ; le message garde les 7', S.C2.suites.plie && /✉️ Message envoyé dans la messagerie TimeCool : 7 personnes/.test(S.C2.suites.vu) && !/Message envoyé à /.test(S.C2.suites.vu) && S.C2.suites.lignes === 7, JSON.stringify(S.C2.suites));
  verifie('ensuite, une question pour la suite (le refus de P8 ou le choix de P9), une à la fois', S.C2.ensuite.length === 1 && !/^lot /.test(S.C2.ensuite[0]) && /P8 X|P9 X/.test(S.C2.ensuite[0]), JSON.stringify(S.C2.ensuite));
  verifie('en vrai, « Non » sur 7 choix : rien ne bouge, chaque réponse close « laissée », « D’accord, les 7 rendez-vous restent à leur place. »', S.C3.lot && S.C3.bouges === 0 && S.C3.enAttente === 0 && S.C3.traites.length === 7 && S.C3.traites.every((t) => /:laisse$/.test(t)) && /D’accord, les 7 rendez-vous restent à leur place\./.test(S.C3.vu) && !/« RDV /.test(S.C3.vu) && S.C3.plie, JSON.stringify(S.C3).slice(0, 500));
  verifie('messages aux contacts : jusqu’à 6, rien ne change ; « Pense à prévenir … » toujours écrit', S.C4.trois === null && Array.isArray(S.C4.huit) && S.C4.huit.join('\n') === '✉️ Message envoyé dans la messagerie TimeCool : 6 personnes\n• Message prêt, à envoyer toi-même d’un geste (SMS ou email) : 1 personne\nPense à prévenir Z : « x »', JSON.stringify(S.C4));
  verifie('profil 3, 8 réponses : le compte rendu dit « ✉️ Message envoyé dans la messagerie TimeCool : 8 personnes » (le message garde les 8)', S.C5.plie && /✉️ Message envoyé dans la messagerie TimeCool : 8 personnes/.test(S.C5.vu) && !/Message envoyé à /.test(S.C5.vu) && S.C5.lignes === 8, JSON.stringify(S.C5).slice(0, 600));
  verifie('aucun appel réseau ; la page ne déborde pas sur le côté', S.appels === 0 && S.debord <= 0, JSON.stringify([S.appels, S.debord]));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
