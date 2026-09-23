// Vérifie le transfert d'agenda entre appareils : la clé commune se
// calcule bien des deux côtés, le paquet fait l'aller-retour intact, et
// rien de ce qui doit rester sur l'appareil ne part avec lui.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const stock = {};
const ctx = {
  crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
  Uint8Array, JSON, Object, Array, String, Number, Math, Date, Error,
  Promise, console, setTimeout,
  localStorage: {
    getItem: (k) => (k in stock ? stock[k] : null),
    setItem: (k, v) => { stock[k] = String(v); },
    get length() { return Object.keys(stock).length; },
    key: (i) => (Object.keys(stock)[i] === undefined ? null : Object.keys(stock)[i]),
  },
  events: [], tasksList: [], birthdays: [],
  saveEventsToStorage: async () => { stock.__events = JSON.stringify(ctx.events); },
  saveTasks: () => { stock.__taches = JSON.stringify(ctx.tasksList); },
  saveBirthdays: () => { stock.__anniv = JSON.stringify(ctx.birthdays); },
};
ctx.globalThis = ctx;
vm.createContext(ctx);
// Les fonctions déclarées au premier niveau deviennent globales dans le
// contexte ; pas les `const`. On expose donc la liste explicitement.
vm.runInContext(html.slice(html.indexOf('const TC_ECDH = '),
  html.indexOf('/* ── Les deux écrans'))
  + '\nglobalThis.TC_JAMAIS_TRANSFERE = TC_JAMAIS_TRANSFERE;', ctx);

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(46)} ${detail || ''}`);
};

(async () => {
  // ── La clé commune ────────────────────────────────────────────────
  console.log('Chaque appareil calcule la même clé sans jamais l envoyer :');
  const navigateur = await ctx.tcNouvellePaireTransfert();
  const telephone = await ctx.tcNouvellePaireTransfert();
  dire(navigateur.publique.kty === 'EC' && navigateur.publique.crv === 'P-256'
    && !('d' in navigateur.publique),
    'la moitié publique ne contient pas la privée',
    Object.keys(navigateur.publique).join(','));

  const cleTel = await ctx.tcCleCommune(telephone.privee, navigateur.publique);
  const cleNav = await ctx.tcCleCommune(navigateur.privee, telephone.publique);

  const secret = { message: 'agenda de Charles', accents: 'éàçùî — ✅🎂' };
  const chiffre = await ctx.tcChiffrerPaquet(cleTel, secret);
  const rendu = await ctx.tcDechiffrerPaquet(cleNav, chiffre);
  dire(JSON.stringify(rendu) === JSON.stringify(secret),
    'ce que chiffre le téléphone, le navigateur le lit', rendu.accents);

  const intrus = await ctx.tcNouvellePaireTransfert();
  const cleIntrus = await ctx.tcCleCommune(intrus.privee, navigateur.publique);
  let refuse = false;
  try { await ctx.tcDechiffrerPaquet(cleIntrus, chiffre); } catch (e) { refuse = true; }
  dire(refuse, 'une autre paire ne déchiffre rien', 'AES-GCM rejette');

  const bis = await ctx.tcChiffrerPaquet(cleTel, secret);
  dire(bis !== chiffre, 'deux envois identiques donnent deux paquets');

  // ── La liste de ce qui reste ne doit pas dériver ──────────────────
  // Elle est écrite en clair dans le code, pour être lisible depuis un
  // endroit où plusieurs constantes ne sont pas encore initialisées.
  // Ici on la confronte aux constantes réelles du fichier.
  console.log('\nCe qui ne doit jamais partir y figure bien :');
  const constantes = {};
  html.replace(/(?:const|var|let)\s+(TC_[A-Z_]+|_ADMIN_PIN_KEY)\s*=\s*'([^']+)'/g,
    (m, nom, val) => { constantes[nom] = val; return m; });
  [
    'TC_DEVICE_KEY_STORAGE', 'TC_DEVICE_ID_KEY', 'TC_JETON_CLE',
    'TC_BIOMETRIE_ACTIVE_KEY', 'TC_MDP_LOCAL_KEY', '_ADMIN_PIN_KEY',
    'TC_PERMISSIONS_KEY', 'TC_MAJ_RETOUR_KEY', 'TC_AUTO_BACKUP_LAST',
    'TC_LAST_AUTO_BACKUP_KEY', 'TC_BACKUP_HISTORY_KEY', 'TC_TRANSLATE_KEY',
    'TC_EVENTS_KEY', 'TC_TASKS_KEY',
    // Où en est CET appareil dans la synchronisation : recopié ailleurs,
    // le curseur ferait sauter tout ce qui précède.
    'TC_SYNC_VERSION_KEY', 'TC_SYNC_EMPREINTES_KEY',
  ].forEach((nom) => {
    const val = constantes[nom];
    dire(!!val && ctx.TC_JAMAIS_TRANSFERE.indexOf(val) >= 0, nom,
      val || '⚠ constante introuvable dans le fichier');
  });

  // ── Le tri par exclusion ──────────────────────────────────────────
  console.log('\nCe qui part, et ce qui reste :');
  Object.keys(stock).forEach((k) => delete stock[k]);
  stock.timecool_contacts = '[{"nom":"Marie"}]';
  stock.timecool_api_keys = '{"openai":"sk-secret"}';
  stock.timecool_ai_config = '{"ton":"amical"}';
  stock.timecool_categories = '["travail"]';
  stock.timecool_messages = '[]';
  stock.tc_theme = 'sombre';
  stock.tc_agenda_start = '7';
  stock.tc_fetes_dans_agenda = '["religieux-juif"]';
  stock.tc_fonction_inventee_demain = 'valeur';   // fonction future
  stock.tc_device_crypto_key = 'CLE-LOCALE';
  stock.tc_session_jeton = 'JETON';
  stock.tc_admin_pin = '1234';
  stock.tc_user_events = 'tcenc:...';
  stock.autre_application = 'rien à voir';

  const r = ctx.tcReglagesTransferables();
  dire(r.timecool_contacts && r.timecool_api_keys && r.timecool_ai_config
    && r.timecool_categories && r.tc_theme && r.tc_agenda_start,
    'contacts, clés API, config IA, thème, horaires', Object.keys(r).length + ' clés');
  dire(!!r.tc_fonction_inventee_demain,
    'une fonction ajoutée plus tard part toute seule',
    'c est une liste de ce qui RESTE, pas de ce qui part');
  dire(!('tc_device_crypto_key' in r), 'la clé de chiffrement reste sur place');
  dire(!('tc_session_jeton' in r), 'le jeton de session reste');
  dire(!('tc_admin_pin' in r), 'le code PIN admin reste');
  dire(!('tc_user_events' in r), 'les rendez-vous ne partent pas deux fois',
    'ils voyagent en clair, par leur propre champ');
  dire(!('autre_application' in r), 'ce qui n est pas TimeCool est ignoré');

  // ── Un agenda réaliste ────────────────────────────────────────────
  console.log('\nUn agenda entier passe sans casser :');
  ctx.events = [];
  for (let i = 0; i < 900; i++) {
    ctx.events.push({
      id: 'evt_' + i, mode: 'user', date: '2026-09-0' + (i % 9 + 1),
      startH: 9, startM: 0, endH: 10, endM: 0,
      title: 'Rendez-vous ' + i + ' — éàç', notes: 'x'.repeat(120), cat: 'travail',
    });
  }
  ctx.events.push({ id: 'demo_1', mode: 'demo', title: 'Démo', date: '2026-01-01' });
  ctx.tasksList = [{ id: 't1', title: 'Pain', dueDate: '2026-09-20', done: false, agenda: true }];
  ctx.birthdays = [{ id: 'b1', name: 'Marie Dupont', date: '1990-04-08', year: 1990, agenda: true }];

  const paquet = ctx.tcRassemblerDonnees();
  dire(paquet.evenements.length === 900, 'les 900 rendez-vous sont pris',
    paquet.evenements.length + ' sur ' + ctx.events.length);
  dire(!paquet.evenements.some((e) => e.mode === 'demo'),
    'les rendez-vous de démonstration restent sur place');
  dire(JSON.stringify(paquet).indexOf('CLE-LOCALE') < 0,
    'la clé de chiffrement de l appareil ne part pas');
  dire(JSON.stringify(paquet).indexOf('sk-secret') > 0,
    'les clés API, elles, partent bien');

  const gros = await ctx.tcChiffrerPaquet(cleTel, paquet);
  dire(gros.length > 100000, 'paquet volumineux encodé sans débordement',
    Math.round(gros.length / 1024) + ' Ko en base64');
  const relu = await ctx.tcDechiffrerPaquet(cleNav, gros);
  dire(relu.evenements.length === 900
    && relu.evenements[899].title === paquet.evenements[899].title,
    'et relu à l identique', relu.evenements[899].title);

  // ── L'installation ────────────────────────────────────────────────
  console.log('\nÀ l arrivée :');
  ctx.events = [{ id: 'demo_9', mode: 'demo', title: 'Démo locale', date: '2026-02-02' }];
  ctx.tasksList = []; ctx.birthdays = [];
  Object.keys(stock).forEach((k) => delete stock[k]);
  stock.tc_device_crypto_key = 'CLE-DE-CET-APPAREIL';
  stock.tc_session_jeton = 'JETON-DE-CET-APPAREIL';

  relu.reglages.tc_device_crypto_key = 'CLE-VOLEE';       // paquet malveillant
  relu.reglages.tc_session_jeton = 'JETON-VOLE';
  relu.reglages.autre_application = 'intrusion';
  const bilan = await ctx.tcInstallerDonnees(relu);

  dire(bilan.evenements === 900 && bilan.taches === 1 && bilan.anniversaires === 1,
    'tout est repris', JSON.stringify(bilan));
  dire(bilan.reglages >= 8, 'les réglages aussi', bilan.reglages + ' réglages');
  dire(ctx.events.length === 901 && ctx.events[0].id === 'demo_9',
    'les démos locales sont conservées', ctx.events.length + ' au total');
  dire(stock.__events !== undefined, 'les rendez-vous sont rechiffrés en local',
    'saveEventsToStorage appelé');
  dire(stock.timecool_contacts === '[{"nom":"Marie"}]', 'les contacts sont arrivés');
  dire(stock.timecool_api_keys === '{"openai":"sk-secret"}', 'les clés API aussi');
  dire(stock.tc_device_crypto_key === 'CLE-DE-CET-APPAREIL',
    'la clé locale n a pas été écrasée', 'paquet malveillant repoussé');
  dire(stock.tc_session_jeton === 'JETON-DE-CET-APPAREIL', 'le jeton non plus');
  dire(!('autre_application' in stock), 'et rien n a été écrit hors de TimeCool');

  let rejet = false;
  try { await ctx.tcInstallerDonnees({ version: 99 }); } catch (e) { rejet = true; }
  dire(rejet, 'un paquet d une autre version est refusé');

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
