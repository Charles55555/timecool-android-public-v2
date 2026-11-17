// Mission 107a (Charles, 17/11) : « Voir la démonstration » sur l'accueil de Charly IA. Un bac à sable dans la page : agenda et
// contacts d'exemple ; le stockage jamais écrit, aucun appel ne sort (réseau, serveur, synchronisation, rappels, sms/mailto,
// modèle) ; « Quitter » remet tout. « Demande un rendez-vous demain à mon ami Michel » : ses créneaux communs ce jour-là.
// Usage : node verif-demo-charly.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}
const objet = (debut) => { const i = page.indexOf(debut); if (i < 0) return ''; let n = 0; for (let k = page.indexOf(debut.slice(-1) === '[' ? '[' : '{', i); k < page.length; k++) { if (page[k] === '[' || page[k] === '{') n++; else if (page[k] === ']' || page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1) + ';'; } } return ''; };
const NB = ' ';

console.log('-- 1. Les textes (validés mot pour mot) --');
verifie('l accueil : un seul exemple, puis l invitation et le bouton', /const TC_CHARLY_ACCUEIL_EXEMPLES = \[\n  'Crée-moi un nouveau rendez-vous demain à 15h chez mon dentiste'\n\];/.test(page)
  && page.indexOf("const TC_CHARLY_ACCUEIL_DEMO = [\n  'Tu veux voir tout ce dont je suis capable" + NB + "?',\n  'Je te montre avec un agenda d’exemple et des contacts d’exemple.',\n  'Voir la démonstration'\n];") > -1);
verifie('les cinq autres exemples ont quitté l accueil', page.indexOf("'Excuse-moi auprès de Paul et préviens-le que j’aurai 10 minutes de retard'") < 0 && page.indexOf("'Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine") < 0);
['Voici un agenda d’exemple.\\nTouche une phrase pour voir ce que je fais.', 'C’est calé. Regarde dans l’agenda.', 'Pour le faire avec tes vrais amis, importe tes contacts.', "importer: 'Importer mes contacts'", "bandeau: 'Démonstration'", "quitter: 'Quitter'"].forEach((t) => verifie('texte : ' + t, page.indexOf(t) > -1));
verifie('107a : les deux phrases prêtes (Michel, vendredi)', /const TC_DEMO_PHRASES = \[\n  \{ id: 'michel', texte: 'Demande un rendez-vous demain à mon ami Michel' \},\n  \{ id: 'vendredi', texte: 'Quand suis-je libre ce vendredi(?: |\\u00a0)\?' \}\n\];/.test(page));
verifie('jamais « je ne peux pas » dans les textes de la démonstration', !/peux pas|impossible|pas encore/i.test(objet('const TC_DEMO_TEXTES = {')));

// ── Un petit monde : le stockage (vrai prototype partagé), le réseau, le serveur, la page ──
function monde(jour) {
  const vraiStock = { tc_user_events: '["VRAI"]', timecool_contacts: '["VRAI"]', timecool_language: 'fr', tc_theme: 'dark' };
  function Storage() {}
  Storage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(vraiStock, k) ? vraiStock[k] : null; };
  Storage.prototype.setItem = function (k, v) { vraiStock[k] = String(v); };
  Storage.prototype.removeItem = function (k) { delete vraiStock[k]; };
  Storage.prototype.clear = function () { Object.keys(vraiStock).forEach((k) => delete vraiStock[k]); };
  const localStorage = new Storage();
  const sorties = [];
  const RealDate = Date;
  const base = new RealDate(jour).getTime();
  function FauxDate(...a) { return a.length ? new RealDate(...a) : new RealDate(base); }
  FauxDate.prototype = RealDate.prototype; FauxDate.now = () => base;
  const elements = {};
  const el = (id) => elements[id] || (elements[id] = { id, style: {}, innerHTML: '', value: '', remove() { delete elements[id]; }, setAttribute() {}, appendChild() {} });
  const ctx = {
    console, JSON, Array, Object, String, Number, Math, Promise, RegExp, Storage, localStorage, Date: FauxDate, TypeError, Error,
    setTimeout: (f) => { Promise.resolve().then(f); return 0; },
    document: { getElementById: (id) => elements[id] || null, createElement: () => ({ style: {}, setAttribute() {}, set id(v) { elements[v] = this; }, remove() { Object.keys(elements).forEach((k) => { if (elements[k] === this) delete elements[k]; }); } }), body: { style: {}, appendChild() {} }, querySelectorAll: () => [] },
    escapeHTML: (s) => String(s).replace(/</g, '&lt;'), tcBulleCharly: (h) => '<bulle>' + h + '</bulle>', tcSansAccents: (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(),
    tcPrenomUtilisateur: () => 'Charles', currentLanguage: 'fr', TC_TRANSLATE_CACHE: {}, translateText: async (t) => t,
    events: [{ id: 'vrai_1', mode: 'user', date: '2026-11-18', startH: 9, startM: 0, endH: 10, endM: 0, title: 'VRAI Kiné' }],
    contactsList: [{ id: 'vrai_c', name: 'Gaëlle Vraie', referenceCompte: 'REF-VRAIE', isTimeCool: true }],
    messages: { user: [{ t: 'VRAI' }], pro: [] }, _tcConvCharly: [{ text: 'VRAI' }], tasksList: ['VRAI'], birthdays: ['VRAI'],
    charlyIA: { history: [{ role: 'user', content: 'VRAIE question' }], config: { demoMode: false }, _historiqueCharge: true },
    navigate: () => {}, renderCharlyChat: () => {}, render: () => {},
    _sorties: sorties, _vraiStock: vraiStock
  };
  ctx.window = ctx;
  ctx.fetch = async (u) => { sorties.push('fetch ' + u); return { ok: true, json: async () => ({}) }; };
  ctx.TC_BACKEND = { estConnecte: () => true };
  ['proposerRdvGroupe', 'confirmerRdvGroupe', 'envoyerMessage', 'demanderRdv', 'syncPousser', 'syncTirer', 'propositions', 'propositionCreer', 'envoyerConvocation', 'createRdvLink'].forEach((k) => {
    ctx.TC_BACKEND[k] = async () => { sorties.push('serveur ' + k); return {}; };
  });
  vm.createContext(ctx);
  // Les fonctions qui sortiraient de l'appli : de vraies déclarations dans le contexte, qui notent leur appel.
  vm.runInContext(['tcSyncBientot', 'tcSyncTour', 'tcProgrammerRappels', 'tcOuvrirAilleurs', 'callAI', 'charlySendMessage', 'tcConfirmerRdvGroupe']
    .map((n) => 'function ' + n + '() { _sorties.push("' + n + '"); return "' + n + '"; }').join('\n'), ctx);
  vm.runInContext('function tcISO(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }', ctx);
  const code = [objet('const TC_DEMO_PHRASES = ['), objet('const TC_DEMO_TEXTES = {'), 'let _tcDemo = null;'].concat(['tcDemoActive', 'tcDemoClesLisibles', 'tcDemoJour', 'tcDemoVendredi', 'tcDemoDimanche', 'tcDemoRdv', 'tcDemoDonnees', 'tcDemoLibre',
    'tcDemoOccupationsMoi', 'tcDemoServeur', 'tcDemoBandeau', 'tcDemoTexte', 'tcDemoTraduire', 'tcDemoMessagePhrases', 'tcDemoRemplacer', 'tcOuvrirDemo', 'tcQuitterDemo'].map(fonction));
  if (code.some((c) => !c)) { verifie('les fonctions de la démonstration sont dans la page', false, code.map((c) => !!c).join(',')); return null; }
  vm.runInContext(code.join('\n'), ctx);
  return ctx;
}

(async () => {
  console.log('-- 2. Entrée : les données d exemple, rien de vrai --');
  const ctx = monde('2026-11-17T14:20:00');
  if (!ctx) { console.log(ko + ' anomalie(s)'); process.exit(1); }
  const vraiAvant = JSON.stringify(ctx._vraiStock);
  await vm.runInContext('tcOuvrirDemo()', ctx);
  verifie('la démonstration est ouverte', vm.runInContext('tcDemoActive()', ctx) === true);
  const contacts = vm.runInContext('contactsList', ctx);
  verifie('six contacts d exemple : Michel, Paul, Alice, Chloé, Virginie (TimeCool), Julien (sans)', JSON.stringify(contacts.map((c) => c.name + (c.isTimeCool ? '+' : '-'))) === JSON.stringify(['Michel Virtuel+', 'Paul Virtuel+', 'Alice Virtuelle+', 'Chloé Virtuelle+', 'Virginie Virtuelle+', 'Julien Virtuel-']));
  verifie('numéros fictifs 06 39 98 xx xx, adresses @exemple-timecool.fr', contacts.every((c) => /^06 39 98 \d\d \d\d$/.test(c.phone) && /@exemple-timecool\.fr$/.test(c.email)), contacts.map((c) => c.phone + ' ' + c.email).join(' | '));
  verifie('aucune vraie donnée visible : ni le vrai agenda, ni les vrais contacts, ni la vraie conversation, ni les messages', !JSON.stringify(vm.runInContext('[events, contactsList, charlyIA.history, messages, _tcConvCharly, tasksList, birthdays]', ctx)).includes('VRAI'));
  const evs = vm.runInContext('events.map(function (e) { return e.date + " " + e.startH + "h" + (e.startM || "") + " " + e.title; })', ctx);
  verifie('l agenda d exemple : café +1h, coiffeur 10h et déjeuner 12h30 demain, sport vendredi 18h, repas dimanche 12h30, pas de dentiste',
    JSON.stringify(evs) === JSON.stringify(['2026-11-17 16h Café avec Paul Virtuel', '2026-11-18 10h Coiffeur', '2026-11-18 12h30 Déjeuner avec Michel Virtuel', '2026-11-20 10h Réunion d’équipe', '2026-11-20 18h Sport', '2026-11-22 12h30 Repas de famille']), JSON.stringify(evs));
  verifie('le stockage n est pas lu pour les données : agenda, contacts → rien ; la langue et le thème → lus', ctx.localStorage.getItem('tc_user_events') === null && ctx.localStorage.getItem('timecool_contacts') === null && ctx.localStorage.getItem('timecool_language') === 'fr' && ctx.localStorage.getItem('tc_theme') === 'dark');

  console.log('-- 3. Pendant : rien n est écrit, rien ne sort --');
  ctx.localStorage.setItem('tc_user_events', '["EXEMPLE"]');
  ctx.localStorage.removeItem('timecool_contacts');
  ctx.localStorage.clear();
  verifie('écrire, effacer, tout vider : le vrai stockage ne bouge pas', JSON.stringify(ctx._vraiStock) === vraiAvant, JSON.stringify(ctx._vraiStock));
  verifie('ce qu on écrit se relit pendant la démonstration (la page marche)', (ctx.localStorage.setItem('x', '1'), ctx.localStorage.getItem('x') === '1'));
  ctx._sorties.length = 0;
  let refus = 0;
  try { await vm.runInContext('fetch("https://api.timecool.fr/messages")', ctx); } catch (e) { refus++; }
  await vm.runInContext('Promise.all(Object.keys(TC_BACKEND).filter(function (k) { return k !== "estConnecte"; }).map(function (k) { return TC_BACKEND[k]("DEMO-MICHEL", "x"); }))', ctx);
  ['tcSyncBientot()', 'tcSyncTour()', 'tcProgrammerRappels()', 'tcOuvrirAilleurs("sms:0639980001?body=x")'].forEach((x) => vm.runInContext(x, ctx));
  const modele = await vm.runInContext('callAI([{ role: "user", content: "x" }])', ctx);
  verifie('réseau coupé : fetch refuse', refus === 1);
  verifie('aucun appel ne sort : serveur, synchronisation, rappels du téléphone, sms/mailto, modèle', ctx._sorties.length === 0, ctx._sorties.join(', '));
  verifie('le modèle n est pas appelé : réponse de la démonstration, sans refus', /^Dans la démonstration, je te montre ces phrases\./.test(modele), modele);

  console.log('-- 4. Le serveur de la démonstration --');
  const r = await vm.runInContext('TC_BACKEND.proposerRdvGroupe(["DEMO-MICHEL"], 1, "physique", { depuis: "2026-11-18", jusqua: "2026-11-18", combien: 3, par_jour: 3 })', ctx);
  verifie('Michel demain : 16h, 17h, 18h (son agenda, et le tien, lus pour de vrai)', JSON.stringify(r.creneaux.map((c) => c.heure)) === '[16,17,18]' && r.creneaux.every((c) => c.date === '2026-11-18' && !c.manquants.length) && JSON.stringify(r.invites) === '["Michel"]', JSON.stringify(r));
  const c = await vm.runInContext('TC_BACKEND.confirmerRdvGroupe(["DEMO-MICHEL"], "2026-11-18", 17, 1, "physique")', ctx);
  verifie('confirmé : dans l agenda d exemple, chez Michel aussi, la réponse comme celle de l API', c.heure === '17:00' && c.libelle === 'mercredi 18 novembre' && JSON.stringify(c.inclus) === '["Michel"]'
    && vm.runInContext('events.some(function (e) { return e.date === "2026-11-18" && e.startH === 17 && /Michel Virtuel/.test(e.title); }) && _tcDemo.agendas["DEMO-MICHEL"].length === 2 && _tcDemo.cale === true', ctx), JSON.stringify(c));
  const r2 = await vm.runInContext('TC_BACKEND.proposerRdvGroupe(["DEMO-ALICE", "DEMO-CHLOE", "DEMO-VIRGINIE"], 1, "physique")', ctx);
  verifie('Alice, Chloé et Virginie : des créneaux communs où tout le monde est libre (pour la 107b)', r2.creneaux.length === 3 && r2.creneaux.every((x) => !x.manquants.length), JSON.stringify(r2.creneaux));

  console.log('-- 5. Quitter : tout revient --');
  vm.runInContext('tcQuitterDemo()', ctx);
  verifie('fermée', vm.runInContext('tcDemoActive()', ctx) === false);
  verifie('les vraies données reviennent, intactes', vm.runInContext('events.length === 1 && events[0].title === "VRAI Kiné" && contactsList.length === 1 && contactsList[0].name === "Gaëlle Vraie" && messages.user[0].t === "VRAI" && _tcConvCharly[0].text === "VRAI" && tasksList[0] === "VRAI" && birthdays[0] === "VRAI" && charlyIA.config.demoMode === false', ctx));
  verifie('la conversation revient, puis « importe tes contacts » (avec le bouton)', vm.runInContext('charlyIA.history.length === 2 && charlyIA.history[0].content === "VRAIE question" && charlyIA.history[1].content === "Pour le faire avec tes vrais amis, importe tes contacts." && charlyIA.history[1]._demo.importer === true', ctx));
  verifie('le stockage remarche (écriture réelle) et n a rien gardé de la démonstration', (ctx.localStorage.setItem('apres', '1'), ctx._vraiStock.apres === '1') && ctx._vraiStock.x === undefined && ctx._vraiStock.tc_user_events === '["VRAI"]');
  ctx._sorties.length = 0;
  await vm.runInContext('fetch("u"); TC_BACKEND.envoyerMessage(); tcSyncBientot(); callAI();', ctx);
  verifie('réseau, serveur, synchronisation et modèle remis', ctx._sorties.join(',') === 'fetch u,serveur envoyerMessage,tcSyncBientot,callAI', ctx._sorties.join(','));
  verifie('charlySendMessage et tcConfirmerRdvGroupe remis', vm.runInContext('charlySendMessage() === "charlySendMessage" && tcConfirmerRdvGroupe() === "tcConfirmerRdvGroupe"', ctx));

  console.log('-- 6. Les jours qui tombent mal --');
  [['2026-11-20T09:00:00', 'vendredi'], ['2026-11-21T09:00:00', 'samedi'], ['2026-11-22T23:30:00', 'dimanche soir']].forEach(([j, nom]) => {
    const w = monde(j);
    const d = vm.runInContext('tcDemoDonnees()', w);
    const ven = d.events.filter((e) => e.title === 'Sport')[0];
    const dim = d.events.filter((e) => e.title === 'Repas de famille')[0];
    const cafe = d.events.filter((e) => /Café/.test(e.title))[0];
    verifie(nom + ' : le vendredi et le dimanche d exemple ne sont jamais passés, le café jamais la nuit', ven.date >= j.slice(0, 10) && dim.date >= j.slice(0, 10) && cafe.startH >= 8 && cafe.startH <= 21, JSON.stringify(d.events.map((e) => e.date + ' ' + e.startH + ' ' + e.title)));
  });

  console.log('-- 7. La page --');
  verifie('le bouton « Voir la démonstration » ouvre la démonstration', /<button id="tcBoutonDemo" onclick="tcOuvrirDemo\(\)"/.test(page));
  verifie('les messages de la démonstration ont leur dessin', /if \(m && m\._demo\) return tcRendreDemo\(m\);/.test(page));
  verifie('« Demande un rendez-vous … à Michel » passe avant le classement et le modèle', page.indexOf('await tcDemanderRdvContact107(text)) return;') > page.indexOf('await tcDemanderDispoContactM65(text)) return;') && page.indexOf('await tcDemanderRdvContact107(text)) return;') < page.indexOf('const _prevenance = tcDetecterPrevenance(text);'));
  verifie('la période (« demain ») va jusqu au serveur', /r = await TC_BACKEND\.proposerRdvGroupe\(references, duree, type, options \|\| undefined\);/.test(page) && /await tcProposerRdvGroupe\(q\.references, q\.duree, '', type, q\.options\);/.test(page));
  verifie('rien de la démonstration au chargement (données fabriquées à l ouverture seulement)', !/tcDemoDonnees\(\)/.test(page.replace(fonction('tcOuvrirDemo'), '').replace(fonction('tcDemoDonnees'), '')));

  console.log('-- 8. Dans la vraie page (Chrome) : jouée, puis page rechargée en pleine démonstration --');
  const { spawnSync } = require('child_process');
  const os = require('os');
  const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
  if (!exe) {
    console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
  } else {
    const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
      document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
      var lireVrai = Storage.prototype.getItem;
      var tout = function () { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = lireVrai.call(localStorage, k); } return o; };
      var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
      if (sessionStorage.getItem('tc_banc_demo')) {
        // 2e chargement : l'appli « tuée » en pleine démonstration revient.
        var avant = JSON.parse(sessionStorage.getItem('tc_banc_demo'));
        var apres = tout();
        var diff = Object.keys(Object.assign({}, avant, apres)).filter(function (k) { return avant[k] !== apres[k]; });
        fin({ phase: 2, diff: diff, demo: typeof _tcDemo !== 'undefined' && !!_tcDemo, bandeau: !!document.getElementById('tcDemoBandeau'),
          natif: /native code/.test(String(Storage.prototype.setItem)) && /native code/.test(String(window.fetch)),
          vrai: JSON.parse(apres.tc_banc_vrai || 'null'), phase1: JSON.parse(sessionStorage.getItem('tc_banc_res') || '{}') });
        return;
      }
      localStorage.setItem('tc_permissions_shown', '1');
      localStorage.setItem('tc_user_events', '["VRAI-chiffre"]');
      localStorage.setItem('timecool_contacts', '["VRAI"]');
      localStorage.setItem('tc_banc_vrai', JSON.stringify({ agenda: 'VRAI Kiné', contact: 'Gaëlle Vraie' }));
      window.__reseau = [];
      var f0 = window.fetch;
      window.fetch = function (u) { window.__reseau.push(String(u)); return Promise.reject(new Error('hors ligne (banc)')); };
      userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
      tcCharlyPret = function () { return true; };
      charlyIA.history = []; charlyIA._historiqueCharge = true;
      hideAuthFlow();
      setTimeout(function () {
        var R = { accueilBouton: !!document.getElementById('tcBoutonDemo') };
        var avant = tout();
        sessionStorage.setItem('tc_banc_demo', JSON.stringify(avant));
        tcOuvrirDemo().then(function () {
          R.bandeau = !!document.getElementById('tcDemoBandeau');
          R.phrases = Array.prototype.map.call(document.querySelectorAll('.tc-demo-phrase'), function (b) { return b.innerText; });
          return tcDemoJouer('michel');
        }).then(function () {
          var q = charlyIA.history.filter(function (m) { return m._questionType; }).pop();
          R.question = q ? q.content : null;
          return tcRepondreTypeGroupe(q._questionType.id, 'physique');
        }).then(function () {
          var g = charlyIA.history.filter(function (m) { return m._groupe; }).pop();
          R.creneaux = g ? g._groupe.creneaux.map(function (c) { return c.heure; }) : null;
          return tcConfirmerRdvGroupe(g._groupe.id, 1);
        }).then(function () {
          R.cale = charlyIA.history.some(function (m) { return m.content === 'C’est calé. Regarde dans l’agenda.'; });
          R.agenda = events.filter(function (e) { return e.startH === 17 && /Michel Virtuel/.test(e.title); }).length;
          return tcDemoJouer('vendredi');
        }).then(function () {
          R.vendredi = document.getElementById('charlyChatBody').innerText.indexOf('Voici ce qui est libre ce vendredi') > -1;
          R.fini = charlyIA.history[charlyIA.history.length - 1].content;
          var t = tout();
          R.ecrit = Object.keys(Object.assign({}, avant, t)).filter(function (k) { return avant[k] !== t[k]; });
          R.reseau = window.__reseau.slice();
          sessionStorage.setItem('tc_banc_res', JSON.stringify(R));
          location.reload();
        }).catch(function (e) { fin({ phase: 1, erreur: String(e && e.stack || e), R: R }); });
      }, 900);
    }, 1200); });</script>`;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-demo-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
    const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 28 });
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    let R2 = null;
    try { R2 = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { R2 = null; }
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const P = (R2 && R2.phase1) || {};
    verifie('la page a été jouée puis rechargée', R2 && R2.phase === 2, JSON.stringify(R2).slice(0, 600));
    verifie('accueil : le bouton ; démonstration : le bandeau et les deux phrases', P.accueilBouton === true && P.bandeau === true && JSON.stringify((P.phrases || []).map((x) => x.replace(/&nbsp;| /g, ' '))) === JSON.stringify(['« Demande un rendez-vous demain à mon ami Michel »', '« Quand suis-je libre ce vendredi ? »']), JSON.stringify(P.phrases));
    verifie('Michel : « Michel a TimeCool… », puis 16h, 17h, 18h demain ; 17h touché : « C’est calé », dans l agenda d exemple', /^Michel a TimeCool/.test(P.question || '') && JSON.stringify(P.creneaux) === '[16,17,18]' && P.cale === true && P.agenda === 1, JSON.stringify([P.question, P.creneaux, P.cale, P.agenda]));
    verifie('vendredi : ce qui est libre, puis « Tu as tout vu. »', P.vendredi === true && /^Tu as tout vu\./.test(P.fini || ''), JSON.stringify([P.vendredi, P.fini]));
    verifie('pendant la démonstration : rien écrit dans le stockage, aucun appel réseau', Array.isArray(P.ecrit) && P.ecrit.length === 0 && Array.isArray(P.reseau) && P.reseau.length === 0, JSON.stringify([P.ecrit, P.reseau]));
    verifie('rechargée en pleine démonstration : le stockage est celui d avant, octet pour octet', R2 && Array.isArray(R2.diff) && R2.diff.length === 0, R2 && JSON.stringify(R2.diff));
    verifie('au retour : plus de démonstration, ni bandeau ; stockage et réseau d origine ; vraies données là', R2 && R2.demo === false && R2.bandeau === false && R2.natif === true && R2.vrai && R2.vrai.agenda === 'VRAI Kiné', JSON.stringify(R2 && [R2.demo, R2.bandeau, R2.natif, R2.vrai]));
  }

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO ' + e.stack); process.exit(1); });
