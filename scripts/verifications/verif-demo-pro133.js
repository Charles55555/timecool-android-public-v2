// Mission 133 (Charles, 18/11) : l'agenda de la démonstration du chirurgien-dentiste, rempli comme chez un vrai dentiste (cases de
// 30 minutes, 9h-13h et 14h-18h, du lundi au vendredi ; demain toujours, décision du chef) ; chaque case libre porte un « RDV
// disponible » bleu ciel, seulement dessiné : pour Charly, c'est du temps libre (jamais prévenu, décalé, compté ni listé).
// La démonstration est rejouée un jour simulé de chaque sorte (lundi … dimanche, à 10h) : les données, les « RDV disponible » (vues
// Semaine et Jour, fiche), et les six phrases jusqu'au bout. Au PC : « RDV disponible » en entier dans la vue Semaine.
// Usage : node verif-demo-pro133.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
const NB = String.fromCharCode(160);
const CASES = [540, 570, 600, 630, 660, 690, 720, 750, 840, 870, 900, 930, 960, 990, 1020, 1050];
const REMPLI = [14, 14, 12, 8, 4];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const isoDe = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const auCabinet = (debut, fin) => (debut >= 540 && fin <= 780) || (debut >= 840 && fin <= 1080);

console.log('-- Le code --');
verifie('les « RDV disponible » ne sont jamais dans l’agenda lu par Charly : seulement ajoutés au dessin des vues Semaine et Jour (tcEvenementsDuJour)',
  (page.match(/tcDispoDuJour133\(/g) || []).length === 2 && /return !enBandeau && typeof tcDispoDuJour133 === 'function' \? l\.concat\(tcDispoDuJour133\(jour\)\) : l;/.test(page));
verifie('hors de la démonstration du dentiste, aucun « RDV disponible » (tcDemoPro)', /function tcDispoDuJour133\(jour\) \{\n  if \(!\(typeof tcDemoPro === 'function' && tcDemoPro\(\)\) \|\| !_tcDemo\) return \[\];/.test(page));

console.log('-- Dans la page (Chrome), un jour simulé de chaque sorte, à 10h --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const horloge = (iso) => `<script>(function () { var V = Date, dec = new V('${iso}T10:00:00').getTime() - V.now();
  class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + dec); else super(...a); } static now() { return V.now() + dec; } }
  window.Date = D; })();</script>`;
const js = (pc) => `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.requestAnimationFrame = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
  var R = {}, PC = ${pc ? 'true' : 'false'};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    tcCharlyPret = function () { return true; };
    hideAuthFlow(); navigate('assistant'); await attendre(500);
    TC_ATTENTE_DUREES.demo = 40; TC_ATTENTE_DUREES.vrai = 40; TC_ATTENTE_DUREES.feuilles = 40; TC_ATTENTE_DUREES.consulte = 40;
    var tout = function (n0) { return charlyIA.history.slice(n0).filter(function (m) { return m && m.role !== 'user'; }).map(function (m) { return (m.role === 'tiers' ? 'VERT ' : '') + String(m.content || '').replace(/<[^>]+>/g, ' ') + (m._questionnaire && m._questionnaire.question ? ' ' + m._questionnaire.question : ''); }).join('\\n---\\n'); };
    var agenda = function () { return events.map(function (e) { return [e.date, e.startH * 60 + e.startM, e.endH * 60 + e.endM, e.title, e.id]; }); };
    var dispo = function () { return R.jours.map(function (j) { return tcDispoDuJour133(j).map(function (x) { return x.startH * 60 + x.startM; }); }); };
    var semaine = function () { return { n: document.querySelectorAll('#weekBody .week-event.tc-dispo133').length, libelles: Array.prototype.map.call(document.querySelectorAll('#weekBody .week-event.tc-dispo133 .tc-titre-case'), function (s) { return s.textContent; }).filter(function (x, i, a) { return a.indexOf(x) === i; }), jours: (document.getElementById('weekBody')._tcWeekDates || []).map(tcISO), fond: (function () { var b = document.querySelector('#weekBody .week-event.tc-dispo133'); return b ? getComputedStyle(b).backgroundColor : ''; })() }; };
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(2500); };
    var calme = async function () { var k = 0; while (k++ < 600 && _tcDemo && (_tcDemo.occupe > 0 || _tcDemo.reponsesAttendues > 0)) await attendre(500); await attendre(800); };
    var oui = async function () { var q = charlyIA.history.filter(function (m) { return m && m._questionnaire && m._questionnaire.etat === 'choix'; }).pop(); if (!q) return false; await tcQuestionnaireRepondre(q._questionnaire.id, 0); await calme(); return true; };
    FEATURES.CHARLY_PRO = true; await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    var vraiSet = Storage.prototype.setItem, ecrits = [];
    Storage.prototype.setItem = function (k) { if (_tcDemo) ecrits.push(String(k)); return vraiSet.apply(this, arguments); };
    var appels0 = appels;
    await tcOuvrirDemo(); await attendre(400);
    R.auj = tcISO(new Date()); R.demain = tcISO(tcDemoJour(1)); R.heure = new Date().getHours();
    R.jours = tcDemoJoursCabinet133().map(tcISO);
    R.ev = agenda(); R.dispo = dispo(); R.dispoAuj = tcDispoDuJour133(R.auj).length;
    R.contacts = contactsList.map(function (c) { return [c.name, !!c.vouvoie, !!c.referenceCompte]; });
    // Les vues : la semaine en cours, la suivante, le jour de demain, la fiche, « Ajouter un rendez-vous ».
    navigate('calendar'); await attendre(300);
    viewDate = new Date(); switchView('week', true); await attendre(500); R.sem1 = semaine();
    viewDate = new Date(Date.now() + 7 * 86400000); switchView('week', true); await attendre(500); R.sem2 = semaine();
    if (!PC) {
    viewDate = new Date(R.demain + 'T12:00:00'); switchView('day', true); await attendre(500);
    R.jourVue = Array.prototype.map.call(document.querySelectorAll('#dayBody .day-event.tc-dispo133'), function (e) { return e.innerText.replace(/\\s+/g, ' '); });
    var b = document.querySelector('#dayBody .day-event.tc-dispo133');
    if (b) { b.click(); await attendre(300); R.fiche = { titre: document.getElementById('emTitle').textContent, corps: document.getElementById('emBody').innerText, actions: document.getElementById('emActions').innerText, prevenir: document.getElementById('emPrevenirRow').innerText, ouverte: document.getElementById('eventModal').classList.contains('open') };
      var aj = Array.prototype.filter.call(document.querySelectorAll('#emActions button'), function (x) { return /Ajouter un rendez-vous/.test(x.textContent); })[0];
      if (aj) { aj.click(); await attendre(300); R.creer = { ouverte: document.getElementById('createModal').classList.contains('open'), date: document.getElementById('newEvtDate').value, debut: document.getElementById('newEvtStart').value }; closeCreateModal(); } }
    navigate('assistant'); await attendre(300);
    // Pour Charly, un « RDV disponible » est du temps libre : jamais prévenu, toujours proposé.
    var n0 = charlyIA.history.length; await taper('Préviens mes patients de demain que j’ai 10 minutes de retard'); R.q1 = tout(n0); tcQuestionnaireArreter();
    n0 = charlyIA.history.length; await taper('Quand suis-je libre demain ?'); R.q2 = tout(n0);
    // Les six phrases, chacune dans une démonstration neuve.
    var neuve = async function () { await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(300); await tcOuvrirDemo(); await attendre(300); R.dispo0 = dispo(); };
    await neuve(); n0 = charlyIA.history.length; await tcDemoJouer('commercial'); await attendre(3000); R.p1 = tout(n0);
    var carte = charlyIA.history.filter(function (m) { return m && m.tempId && /Commercial Matériaux/.test(m.content || ''); }).pop();
    if (carte) { validateAgendaProposal(carte.tempId); await attendre(2500); }
    R.p1rdv = events.filter(function (e) { return /Commercial Matériaux/.test(e.title || ''); }).map(function (e) { return [e.date, e.startH * 60 + e.startM, e.endH * 60 + e.endM]; });
    R.p1dispo = tcDispoDuJour133(R.demain).map(function (x) { return x.startH * 60 + x.startM; });
    await neuve(); n0 = charlyIA.history.length; await tcDemoJouer('retard'); await attendre(3000); R.p2 = tout(n0); tcQuestionnaireArreter();
    await neuve(); var avant3 = agenda(); R.dispo3 = R.dispo0; n0 = charlyIA.history.length; await tcDemoJouer('imprevu'); await attendre(6000); R.p3 = tout(n0);
    R.p3oui = await oui(); R.p3b = tout(n0); R.avant3 = avant3; R.apres3 = agenda();
    await neuve(); n0 = charlyIA.history.length; await tcDemoJouer('vendredi'); await attendre(3000); R.p4 = tout(n0); R.vendredi = tcISO(tcDemoVendredi());
    await neuve(); n0 = charlyIA.history.length; await tcDemoJouer('reunion'); await attendre(2500); R.p5 = tout(n0);
    var i5 = document.getElementById('charlyInput'); i5.value = 'En personne'; await charlySendMessage(); await attendre(9000);
    var g = charlyIA.history.filter(function (m) { return m && m._groupe; }).pop(); R.p5g = g ? (g._groupe.creneaux || []).map(function (c) { return [c.date, c.heure * 60 + (c.minute || 0), (c.heure + (c.duree || 1)) * 60 + (c.minute || 0)]; }) : null; R.ev5 = agenda();
    await neuve(); var avant6 = agenda(), now6 = new Date(), m6 = now6.getHours() * 60 + now6.getMinutes(), jfin = new Date(); jfin.setDate(jfin.getDate() + (jfin.getDay() === 0 ? 7 : 7 - jfin.getDay()));   // un dimanche : jusqu'au dimanche suivant (Charles, 22/11, choix A)
    R.attendus6 = avant6.filter(function (e) { return e[0] >= R.auj && e[0] <= tcISO(jfin) && !(e[0] === R.auj && e[2] <= m6); }).length;
    R.dispo6 = R.dispo0; n0 = charlyIA.history.length; await tcDemoJouer('malade'); await attendre(6000); R.p6 = tout(n0);
    R.p6oui = await oui(); R.p6b = tout(n0); R.avant6 = avant6; R.apres6 = agenda();
    await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(400);
    Storage.prototype.setItem = vraiSet;
    // Après « Quitter » : plus aucun « RDV disponible » ; la démonstration de Charly IA n'en a pas.
    navigate('calendar'); viewDate = new Date(); switchView('week', true); await attendre(500);
    R.apres = { dispo: tcDispoDuJour133(R.demain).length, vue: document.querySelectorAll('.tc-dispo133').length, ecrits: ecrits.filter(function (k) { return k !== 'timecool_charly_historique_pro' && k !== 'timecool_charly_historique'; }), appels: appels - appels0 };
    navigate('assistant'); await attendre(200);
    await tcPasserCharlyVariante('ia', { ouvrir: true }); await attendre(300); await tcOuvrirDemo(); await attendre(400);
    navigate('calendar'); viewDate = new Date(); switchView('week', true); await attendre(500);
    R.ia = { dispo: tcDispoDuJour133(R.demain).length, vue: document.querySelectorAll('.tc-dispo133').length, pro: tcDemoPro() };
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    }
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;

function jouer(iso, w) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-133-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + horloge(iso)).replace('</body>', () => js(w > 600) + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + w + ',844', '--virtual-time-budget=400000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  try { return m ? JSON.parse(m[1].replace(/&nbsp;/g, NB).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { erreur: 'pas de résultat : ' + (r.stdout || '').slice(-300) }; } catch (e) { return { erreur: 'résultat illisible' }; }
}

/** Aucun chevauchement, tout au cabinet (sauf aujourd'hui, qui ne change pas), rien un samedi ou un dimanche sauf demain. */
function agendaSain(S, ev) {
  const fautes = [];
  ev.forEach(function (a, i) {
    ev.forEach(function (b, k) { if (k > i && a[0] === b[0] && a[1] < b[2] && b[1] < a[2]) fautes.push('chevauchement ' + a[3] + ' / ' + b[3] + ' ' + a[0]); });
    if (a[0] === S.auj) return;
    const j = new Date(a[0] + 'T12:00:00').getDay();
    if ((j === 0 || j === 6) && a[0] !== S.demain) fautes.push('week-end ' + a[0] + ' ' + a[3]);
    if (!auCabinet(a[1], a[2])) fautes.push('hors du cabinet ' + a[0] + ' ' + a[1] + ' ' + a[3]);
  });
  return fautes;
}
/** Les rendez-vous qui ont bougé : chacun sur une case qui était « RDV disponible » juste avant. */
function surDesCasesLibres(S, avant, apres, dispoAvant) {
  const fautes = [], bouges = [];
  apres.forEach(function (e) {
    const a = avant.filter(function (x) { return x[4] === e[4]; })[0];
    if (!a || (a[0] === e[0] && a[1] === e[1])) return;
    bouges.push(e);
    const k = S.jours.indexOf(e[0]);
    for (let t = e[1]; t < e[2]; t += 30) if (k < 0 || dispoAvant[k].indexOf(t) < 0) fautes.push(e[3] + ' → ' + e[0] + ' ' + e[1] + ' (pas une case « RDV disponible »)');
  });
  return { fautes: fautes, bouges: bouges };
}

const base = new Date(); base.setHours(0, 0, 0, 0);
const essais = [];
for (let k = 1; k <= 7; k++) { const d = new Date(base); d.setDate(d.getDate() + k); essais.push([isoDe(d), 390]); }
essais.push([essais.filter((e) => new Date(e[0] + 'T12:00:00').getDay() === 3)[0][0], 1366]);   // un mercredi, au PC
for (const [iso, w] of essais) {
  const S = jouer(iso, w);
  const jsem = JOURS[new Date(iso + 'T12:00:00').getDay()];
  const n = jsem + ' ' + iso + (w > 600 ? ' (PC)' : '') + ' — ';
  if (S.erreur) { verifie(n + 'aucune erreur', false, S.erreur); continue; }
  const SANS = (x) => !/je ne peux|pas bien compris|Lequel|À quelle heure/.test(x);
  if (w > 600) {
    verifie(n + 'vue Semaine au PC : « RDV disponible » en entier, bleu ciel', S.sem1.n > 0 && JSON.stringify(S.sem1.libelles) === '["RDV disponible"]' && S.sem1.fond === 'rgb(195, 230, 251)', JSON.stringify(S.sem1));
    verifie(n + 'la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
    continue;
  }
  // 1. Les données.
  const parJour = S.jours.map((j) => S.ev.filter((e) => e[0] === j));
  const ouvres = S.jours.slice(1).every((j) => { const d = new Date(j + 'T12:00:00').getDay(); return d !== 0 && d !== 6; });
  verifie(n + 'les jours remplis : demain (même un samedi ou un dimanche), puis 14 jours ouvrés (aucun week-end)', S.heure === 10 && S.auj === iso && S.jours.length === 15 && S.jours[0] === S.demain && ouvres && new Set(S.jours).size === 15, JSON.stringify(S.jours));
  const comptes = parJour.map((l) => l.length);
  verifie(n + 'le remplissage d’un vrai dentiste : 14, 14, 12, 8, 4 patients, puis 1 ou 2 par jour', JSON.stringify(comptes.slice(0, 5)) === JSON.stringify(REMPLI) && comptes.slice(5).every((c) => c === 1 || c === 2), JSON.stringify(comptes));
  const malPlaces = S.ev.filter((e) => e[0] !== S.auj && !(CASES.indexOf(e[1]) > -1 && e[2] - e[1] === 30 && /^RDV [A-ZÀ-Ý][a-zà-ÿ]+ Virtuel(?:le)? : .+/.test(e[3])));
  verifie(n + 'chaque patient : 30 minutes, sur une case du cabinet, titre « RDV Prénom Virtuel·le : acte »', malPlaces.length === 0 && S.ev.filter((e) => S.jours.indexOf(e[0]) < 0 && e[0] !== S.auj).length === 0, JSON.stringify(malPlaces.slice(0, 5)));
  verifie(n + 'aujourd’hui ne change pas : Inès et Nina, rien d’autre, aucun « RDV disponible »', JSON.stringify(S.ev.filter((e) => e[0] === S.auj).map((e) => e[3].split(' : ')[0])) === '["RDV Inès Virtuelle","RDV Nina Virtuelle"]' && S.dispoAuj === 0, JSON.stringify(S.ev.filter((e) => e[0] === S.auj)));
  verifie(n + 'demain garde Claire (9h), Louis, Emma, Hugo le matin, Léa et Tom l’après-midi ; 15h-16h libre', ['RDV Claire Virtuelle', 'RDV Louis Virtuel', 'RDV Emma Virtuelle', 'RDV Hugo Virtuel'].every((t) => parJour[0].some((e) => e[3].indexOf(t) === 0 && e[1] < 780)) && ['RDV Léa Virtuelle', 'RDV Tom Virtuel'].every((t) => parJour[0].some((e) => e[3].indexOf(t) === 0 && e[1] >= 840)) && parJour[0].some((e) => e[3].indexOf('RDV Claire Virtuelle') === 0 && e[1] === 540) && !parJour[0].some((e) => e[1] === 900 || e[1] === 930), JSON.stringify(parJour[0]));
  verifie(n + 'les contacts : vouvoyés, sans prénom en double', S.contacts.every((c) => c[1]) && new Set(S.contacts.map((c) => c[0].split(' ')[0])).size === S.contacts.length && S.contacts.length >= 50, S.contacts.length);
  // 2. Les « RDV disponible ».
  const complets = S.jours.every((j, k) => S.dispo[k].length + parJour[k].length === 16 && S.dispo[k].every((t) => CASES.indexOf(t) > -1 && !parJour[k].some((e) => e[1] === t)));
  verifie(n + 'chaque case : un patient ou un « RDV disponible » (16 par jour), jamais les deux', complets, JSON.stringify(S.dispo.map((d) => d.length)));
  verifie(n + 'un « RDV disponible » n’est jamais un rendez-vous de l’agenda', !S.ev.some((e) => /disponible/i.test(e[3])), '');
  const attendus = (sem) => sem.jours.reduce((t, j) => t + (S.jours.indexOf(j) > -1 ? S.dispo[S.jours.indexOf(j)].length : 0), 0);
  verifie(n + 'vue Semaine (390 px) : cette semaine et la suivante, un bloc bleu ciel par case libre, « Dispo »', S.sem1.n === attendus(S.sem1) && S.sem2.n === attendus(S.sem2) && S.sem2.n > 0 && JSON.stringify(S.sem2.libelles) === '["Dispo"]' && S.sem2.fond === 'rgb(195, 230, 251)', JSON.stringify([S.sem1, S.sem2, attendus(S.sem1), attendus(S.sem2)]));
  verifie(n + 'vue Jour de demain : « RDV disponible » en entier, avec son heure', S.jourVue.length === S.dispo[0].length && S.jourVue.every((t) => /^RDV disponible · ?\d\d:\d\d – \d\d:\d\d$|^RDV disponible \d\d:\d\d – \d\d:\d\d$/.test(t.trim())), JSON.stringify(S.jourVue));
  verifie(n + 'la fiche : « RDV disponible », le jour, l’heure, « Fermer » et « Ajouter un rendez-vous » (ni Modifier, ni Supprimer, ni Prévenir)', S.fiche && S.fiche.ouverte && S.fiche.titre === 'RDV disponible' && /15:00 – 15:30/.test(S.fiche.corps) && /libre/.test(S.fiche.corps) && /Ajouter un rendez-vous/.test(S.fiche.actions) && !/Modifier|Supprimer/.test(S.fiche.actions) && !S.fiche.prevenir.trim(), JSON.stringify(S.fiche));
  verifie(n + '« Ajouter un rendez-vous » : « Nouveau », demain à 15h', S.creer && S.creer.ouverte && S.creer.date === S.demain && S.creer.debut === '15:00', JSON.stringify(S.creer));
  verifie(n + 'Charly ne prévient que les patients (14 demain), jamais un « RDV disponible »', /Je préviens 14 personnes de ton retard, demain/.test(S.q1) && !/disponible/i.test(S.q1) && SANS(S.q1), S.q1);
  verifie(n + 'pour Charly, les « RDV disponible » sont du temps libre (demain de 15h à 16h), jamais la pause de midi', /Voici ce qui est libre/.test(S.q2) && /de 15h à 16h/.test(S.q2) && !/13h à 14h|de 13h/.test(S.q2) && SANS(S.q2), S.q2);
  // 3. Les six phrases.
  verifie(n + 'phrase 1 : le commercial demain à 15h, sur les cases libres ; « Valider » : les deux « RDV disponible » laissent la place', /^Commercial Matériaux, .* à 15h : je te propose ceci/.test(S.p1) && SANS(S.p1) && JSON.stringify(S.p1rdv) === JSON.stringify([[S.demain, 900, 960]]) && S.p1dispo.indexOf(900) < 0 && S.p1dispo.indexOf(930) < 0, JSON.stringify([S.p1.slice(0, 200), S.p1rdv, S.p1dispo]));
  verifie(n + 'phrase 2 : les patients à venir d’aujourd’hui (Inès, Nina), avec les excuses', /Je préviens 2 personnes de ton retard, aujourd’hui/.test(S.p2) && /Toutes mes excuses\./.test(S.p2) && SANS(S.p2), S.p2.slice(0, 400));
  const p3 = surDesCasesLibres(S, S.avant3, S.apres3, S.dispo3), sain3 = agendaSain(S, S.apres3);
  verifie(n + 'phrase 3 : « Je déplace 8 rendez-vous » (la matinée du cabinet, jusqu’à 13h), un seul oui, les 8 choix, sur des cases « RDV disponible »', /Tu as un imprévu\. Je déplace 8 rendez-vous\./.test(S.p3) && SANS(S.p3) && S.p3oui && (S.p3b.match(/ a choisi /g) || []).length === 8 && p3.bouges.length === 8 && !p3.fautes.length && !sain3.length && !/Léa|Tom/.test(S.p3), JSON.stringify([S.p3.slice(0, 160), (S.p3b.match(/ a choisi /g) || []).length, p3.bouges.length, p3.fautes.slice(0, 3), sain3.slice(0, 3)]));
  const plages = (S.p4.match(/de \d{1,2}h(?:\d\d)? à \d{1,2}h(?:\d\d)?/g) || []).map((x) => { const m = x.match(/de (\d+)h(\d\d)? à (\d+)h(\d\d)?/); return [Number(m[1]) * 60 + Number(m[2] || 0), Number(m[3]) * 60 + Number(m[4] || 0)]; });
  verifie(n + 'phrase 4 : « Voici ce qui est libre » vendredi, aux heures du cabinet seulement', /Voici ce qui est libre/.test(S.p4) && plages.length > 0 && plages.every((p) => auCabinet(p[0], p[1])) && SANS(S.p4), S.p4.slice(0, 300));
  const occupe5 = (c) => S.ev5.some((e) => e[0] === c[0] && e[1] < c[2] && c[1] < e[2]);
  verifie(n + 'phrase 5 : « En personne », des réunions communes aux heures du cabinet, sur des cases libres, jamais un week-end', /Par téléphone, en personne ou en visio/.test(S.p5) && Array.isArray(S.p5g) && S.p5g.length > 0 && S.p5g.every((c) => auCabinet(c[1], c[2]) && !occupe5(c) && [0, 6].indexOf(new Date(c[0] + 'T12:00:00').getDay()) < 0), JSON.stringify([S.p5.slice(0, 120), S.p5g]));
  const p6 = surDesCasesLibres(S, S.avant6, S.apres6, S.dispo6), sain6 = agendaSain(S, S.apres6);
  const n6 = ((S.p6.match(/Je déplace (\d+) rendez-vous/) || [])[1] || '') * 1;
  verifie(n + 'phrase 6 : tous les patients de la semaine (' + S.attendus6 + '), un seul oui, tous les choix, sur des cases « RDV disponible »', /Tu es malade\./.test(S.p6) && n6 === S.attendus6 && SANS(S.p6) && S.p6oui && (S.p6b.match(/ a choisi /g) || []).length === n6 && p6.bouges.length === n6 && !p6.fautes.length && !sain6.length, JSON.stringify([S.p6.slice(0, 160), n6, (S.p6b.match(/ a choisi /g) || []).length, p6.bouges.length, p6.fautes.slice(0, 3), sain6.slice(0, 3)]));
  // 4. Les garanties.
  verifie(n + 'garanties : rien écrit sur l’appareil, aucun appel réseau ; après « Quitter », plus aucun « RDV disponible »', S.apres.ecrits.length === 0 && S.apres.appels === 0 && S.apres.dispo === 0 && S.apres.vue === 0, JSON.stringify(S.apres));
  verifie(n + 'la démonstration de Charly IA n’a aucun « RDV disponible »', S.ia.pro === false && S.ia.dispo === 0 && S.ia.vue === 0, JSON.stringify(S.ia));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
