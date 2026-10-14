// Mission 42 (14/10) : les trois rendez-vous de demonstration (demo_1, demo_2, demo_3) restent sur l appareil : jamais
// envoyes au serveur (donc ni Google Agenda ni un autre compte), ignores s ils en descendent (comptes d avant), jamais
// annonces comme supprimes, absents du paquet d appairage et de la sauvegarde ; toujours affiches, modifiables,
// supprimables, et jamais recrees en boucle.
// Usage : node verif-demonstration-locale.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
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
const blocSync = page.slice(
  page.indexOf('/* ══════════════════════════════════════════════════════════════\n   SYNCHRONISATION ENTRE APPAREILS'),
  page.indexOf('/* ══════════════════════════════════════════════════════════════\n   APPAIRAGE MULTI-APPAREILS'))
  + page.slice(page.indexOf('const TC_JAMAIS_TRANSFERE = ['), page.indexOf('function tcReglagesTransferables()'));
const blocAppairage = page.slice(page.indexOf('const TC_ECDH = '), page.indexOf('/* ── Les deux écrans'));
const predicats = (fonction(page, 'tcEstDemonstration') || '') + '\n' + (fonction(page, 'tcEstDeLUtilisateur') || '');

// Le serveur, reduit a ce que l API fait vraiment.
const serveur = { compteur: 0, elements: new Map(), recus: 0 };
serveur.pousser = (elements) => {
  serveur.recus += elements.length;
  elements.forEach((e) => {
    serveur.compteur++;
    serveur.elements.set(e.type + ':' + e.uid, { type: e.type, uid: e.uid, contenu: e.contenu === null ? null : JSON.parse(JSON.stringify(e.contenu)), version: serveur.compteur, supprime: e.contenu === null });
  });
  return { version: serveur.compteur };
};
serveur.tirer = (depuis) => {
  const tout = [...serveur.elements.values()].filter((e) => e.version > depuis).sort((a, b) => a.version - b.version);
  return { elements: tout.map((e) => JSON.parse(JSON.stringify(e))), version: tout.length ? tout[tout.length - 1].version : serveur.compteur, suite: false };
};
serveur.poserDemo = (compte) => {   // un compte d avant la mission 42 : ses trois demonstrations sont sur le serveur
  ['demo_1', 'demo_2', 'demo_3'].forEach((uid) => { serveur.compteur++; serveur.elements.set('rdv:' + uid, { type: 'rdv', uid, contenu: { id: uid, mode: 'user', title: 'Version serveur ' + uid, date: '2026-05-01', cat: 'orange' }, version: serveur.compteur, supprime: false }); });
};

function appareil(nom, compte, stockInitial) {
  const stock = Object.assign({ tc_nettoyage: 'v1-donnees-melangees' }, stockInitial || {});
  const ctx = {
    JSON, Object, Array, String, Number, Math, Date, console,
    setTimeout: (f) => f(), clearTimeout: () => {}, setInterval: () => 1,
    localStorage: {
      getItem: (k) => (k in stock ? stock[k] : null),
      setItem: (k, v) => { stock[k] = String(v); },
      removeItem: (k) => { delete stock[k]; },
      get length() { return Object.keys(stock).length; },
      key: (i) => (Object.keys(stock)[i] === undefined ? null : Object.keys(stock)[i]),
    },
    currentTheme: 'light',
    document: { addEventListener() {}, visibilityState: 'visible' },
    window: { addEventListener() {} },
    events: [], tasksList: [], birthdays: [], contactsList: [],
    TC_EVENTS_KEY: 'tc_user_events', TC_TASKS_KEY: 'tc_user_tasks',
    messages: { user: [], pro: [] },
    userAccount: { reference: compte },
    tcJeton: () => 'jeton-' + nom,
    saveEventsToStorage: async () => { stock.__events = JSON.stringify(ctx.events); },
    saveTasks: () => {}, saveBirthdays: () => {}, saveContacts: () => {},
    TC_BACKEND: {
      syncTirer: async (depuis) => serveur.tirer(depuis || 0),
      syncPousser: async (elements) => serveur.pousser(elements),
      syncVersionServeur: async () => serveur.compteur,
    },
  };
  ctx.applyTheme = function (t) { ctx.currentTheme = t; };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(blocSync + '\nglobalThis._sync = { tour: tcSyncTour, tirer: tcSyncTirer, pousser: tcSyncPousser, types: TC_SYNC_TYPES, vus: _tcSyncVusIci };', ctx);
  ctx.stock = stock;
  return ctx;
}
const ids = (liste) => liste.map((e) => e.id).sort().join(',');
const empreintes = (d) => Object.keys(JSON.parse(d.stock.tc_sync_empreintes || '{}')).sort().join(',');

(async () => {
titre('0. Garde-fous');
verifie('aucun lookbehind dans la page (Safari)', page.indexOf('(?<') < 0);
const gen = fonction(page, 'generateEvents') || '';
const cG = vm.createContext({}); vm.runInContext(gen, cG);
const demo = cG.generateEvents();
verifie('generateEvents : toujours les trois demonstrations (demo_1, demo_2, demo_3), mode « user » pour l affichage, categories normalisees', ids(demo) === 'demo_1,demo_2,demo_3' && demo.every((e) => e.mode === 'user') && demo.map((e) => e.cat).join(',') === 'personnel,personnel,famille', JSON.stringify(demo).slice(0, 200));
const cP = vm.createContext({}); vm.runInContext(predicats, cP);
verifie('tcEstDemonstration : vrai pour demo_1 a demo_3 (meme modifies), faux pour un vrai rendez-vous, un rendez-vous de Charly, rien', cP.tcEstDemonstration({ id: 'demo_1', mode: 'user' }) && cP.tcEstDemonstration({ id: 'demo_3', mode: 'user', title: 'Modifié' }) && !cP.tcEstDemonstration({ id: 'evt_1', mode: 'user' }) && !cP.tcEstDemonstration({ id: 'charly_ai_1' }) && !cP.tcEstDemonstration(null) && !cP.tcEstDemonstration({}));
verifie('tcEstDeLUtilisateur : vrai pour un rendez-vous « user » ou de Charly, faux pour la demonstration, le mode pro, rien', cP.tcEstDeLUtilisateur({ id: 'evt_1', mode: 'user' }) && cP.tcEstDeLUtilisateur({ id: 'charly_ai_1', mode: 'pro' }) && !cP.tcEstDeLUtilisateur({ id: 'demo_2', mode: 'user' }) && !cP.tcEstDeLUtilisateur({ id: 'p1', mode: 'pro' }) && !cP.tcEstDeLUtilisateur(null));

titre('1. Un appareil : la demonstration ne monte jamais, meme modifiee ou supprimee');
const A = appareil('A', 'CPT1');
A.events = cG.generateEvents().concat([{ id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05' }]);
await A._sync.tour();
verifie('premier tour : un seul objet au serveur (le dentiste), aucune demonstration', serveur.elements.size === 1 && serveur.elements.has('rdv:evt_1') && !serveur.elements.has('rdv:demo_1'), [...serveur.elements.keys()].join(' '));
verifie('aucune empreinte de demonstration gardee', empreintes(A) === 'rdv:evt_1', empreintes(A));
A.events.find((e) => e.id === 'demo_3').title = '🎂 Anniversaire de Mamie';
await A._sync.tour();
A.events = A.events.filter((e) => e.id !== 'demo_1');
await A._sync.tour(); await A._sync.tour();
verifie('demonstration modifiee puis supprimee : rien ne part, rien n est annonce comme supprime', serveur.elements.size === 1 && serveur.recus === 1 && !serveur.elements.has('rdv:demo_3') && !serveur.elements.has('rdv:demo_1'), 'recus=' + serveur.recus);
verifie('elle reste affichee et modifiee sur l appareil (demo_1 supprimee, demo_3 renommee, le dentiste intact)', ids(A.events) === 'demo_2,demo_3,evt_1' && A.events.find((e) => e.id === 'demo_3').title === '🎂 Anniversaire de Mamie', ids(A.events));

titre('2. Un compte d avant : ses demonstrations sont encore sur le serveur');
serveur.poserDemo('CPT1');
const recusAvant = serveur.recus;
const B = appareil('B', 'CPT1');
B.events = cG.generateEvents();
B.events.find((e) => e.id === 'demo_2').title = 'Ma version locale';
await B._sync.tour();
verifie('nouvel appareil : le dentiste descend, les demonstrations du serveur sont ignorees (ni doublon, ni ecrasement de la version locale)', ids(B.events) === 'demo_1,demo_2,demo_3,evt_1' && B.events.find((e) => e.id === 'demo_2').title === 'Ma version locale' && B.events.filter((e) => e.id === 'demo_1').length === 1, ids(B.events) + ' | ' + B.events.find((e) => e.id === 'demo_2').title);
verifie('aucune empreinte ni marque « vu ici » pour ce qui est ignore', empreintes(B) === 'rdv:evt_1' && !B._sync.vus['rdv:demo_1'], empreintes(B));
await B._sync.tour(); await B._sync.tour(); await B._sync.tour();
verifie('les tours suivants ne poussent rien : ni renvoi, ni suppression des demonstrations du serveur', serveur.recus === recusAvant && serveur.elements.get('rdv:demo_1').supprime === false, 'recus=' + serveur.recus);
await A._sync.tour(); await A._sync.tour();
verifie('l appareil A, qui avait supprime demo_1, ne la recoit pas du serveur et ne pousse rien', ids(A.events) === 'demo_2,demo_3,evt_1' && serveur.recus === recusAvant, ids(A.events));

titre('3. Une ancienne empreinte de demonstration (page d avant) n est pas une suppression a annoncer');
const C = appareil('C', 'CPT1', { tc_sync_empreintes: JSON.stringify({ 'rdv:demo_1': 'vieille', 'rdv:demo_2': 'vieille', 'rdv:demo_3': 'vieille', 'rdv:evt_1': 'vieille' }), tc_sync_version: JSON.stringify({ compte: 'CPT1', version: serveur.compteur }) });
C.events = cG.generateEvents().concat([{ id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05' }]);
vm.runInContext("_tcSyncVusIci['rdv:demo_1'] = true; _tcSyncVusIci['rdv:demo_2'] = true; _tcSyncVusIci['rdv:demo_3'] = true; _tcSyncVusIci['rdv:evt_1'] = true;", C);
const tailleAvant = serveur.elements.size;
await C._sync.tour(); await C._sync.tour();
verifie('rien de supprime au serveur ; le dentiste (empreinte changee) est renvoye une fois ; les vieilles empreintes de demonstration disparaissent', serveur.elements.size === tailleAvant && [...serveur.elements.values()].every((e) => !e.supprime) && serveur.recus === recusAvant + 1 && empreintes(C) === 'rdv:evt_1', 'recus=' + serveur.recus + ' ' + empreintes(C));

titre('4. Deux onglets sur le meme compte : plus de ping-pong de demonstrations');
const recus2 = serveur.recus;
const D = appareil('D', 'CPT1', JSON.parse(JSON.stringify(A.stock)));
D.events = cG.generateEvents().concat([{ id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05' }]);
for (let i = 0; i < 5; i++) { await D._sync.tour(); await A._sync.tour(); }
verifie('dix tours a deux onglets : rien ne part', serveur.recus === recus2, 'recus=' + serveur.recus);

titre('5. Paquet d appairage et sauvegarde');
const cT = { JSON, Object, Array, String, Number, Math, Date, console, Promise, localStorage: { getItem: () => null, setItem() {}, length: 0, key: () => null }, events: [], tasksList: [], birthdays: [], saveEventsToStorage: async () => {}, saveTasks() {}, saveBirthdays() {}, currentTheme: 'light', applyTheme() {} };
cT.globalThis = cT; vm.createContext(cT);
vm.runInContext(predicats + '\n' + blocAppairage, cT);
cT.events = [{ id: 'demo_1', mode: 'user', title: 'Modifiée ici', date: '2026-05-01' }, { id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05' }, { id: 'charly_ai_7', mode: 'user', title: 'Charly', date: '2026-09-06' }];
const paquet = cT.tcRassemblerDonnees();
verifie('tcRassemblerDonnees : le dentiste et le rendez-vous de Charly, pas la demonstration', ids(paquet.evenements) === 'charly_ai_7,evt_1', ids(paquet.evenements));
const bilan = await cT.tcInstallerDonnees({ version: 1, evenements: [{ id: 'demo_2', mode: 'user', title: 'Du paquet', date: '2026-05-08' }, { id: 'evt_9', mode: 'user', title: 'Coiffeur', date: '2026-10-01' }] });
verifie('tcInstallerDonnees : la demonstration locale reste (modifiee), celle du paquet n entre pas, le coiffeur arrive, bilan 1', ids(cT.events) === 'demo_1,evt_9' && cT.events[0].title === 'Modifiée ici' && bilan.evenements === 1, ids(cT.events) + ' bilan=' + bilan.evenements);
const sauvegarde = fonction(page, 'buildBackupPayload') || '';
verifie('la sauvegarde (export) ne contient pas la demonstration, et sa restauration garde la demonstration locale sans importer celle du fichier', /events: events\.filter\(tcEstDeLUtilisateur\)/.test(sauvegarde) && /events = \[\.\.\.garde, \.\.\.backup\.events\.filter\(e => !tcEstDemonstration\(e\)\)\];/.test(page));

titre('6. Le stockage local : elle y vit, supprimee elle n est pas recreee');
const cS = { JSON, Object, Array, String, Number, Math, Date, console, Promise, stock: {}, events: [], TC_EVENTS_KEY: 'tc_user_events', tcEncrypt: async (v) => v, tcDecrypt: async (v) => v, tcCatNormalisee: (c) => c, tcDedoublonnerRendezVous() {}, tcReparerCategories() {} };
cS.localStorage = { getItem: (k) => (k in cS.stock ? cS.stock[k] : null), setItem: (k, v) => { cS.stock[k] = String(v); } };
cS.globalThis = cS; vm.createContext(cS);
vm.runInContext(gen + '\n' + fonction(page, 'saveEventsToStorage') + '\n' + fonction(page, 'loadEventsFromStorage'), cS);
cS.events = cS.generateEvents().concat([{ id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05', startH: 9, startM: 0, endH: 10, endM: 0 }]);
await cS.saveEventsToStorage();
verifie('saveEventsToStorage garde la demonstration dans tc_user_events (sur l appareil)', ids(JSON.parse(cS.stock.tc_user_events)) === 'demo_1,demo_2,demo_3,evt_1', ids(JSON.parse(cS.stock.tc_user_events)));
cS.stock.tc_user_events = JSON.stringify([{ id: 'demo_3', mode: 'user', title: 'Renommée', date: '2026-04-22', startH: '9', startM: '0', endH: '18', endM: '0' }]);
cS.events = cS.generateEvents();
await cS.loadEventsFromStorage();
verifie('au chargement, le stockage fait foi : demo_1 et demo_2 supprimees ne reviennent pas, demo_3 renommee reste', ids(cS.events) === 'demo_3' && cS.events[0].title === 'Renommée', ids(cS.events));

console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
