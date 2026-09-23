// Deux appareils, un serveur simulé : ce qu'on crée d'un côté doit
// apparaître de l'autre, les suppressions doivent voyager, et surtout
// rien ne doit repartir en boucle.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const source = html.slice(
  html.indexOf('/* ══════════════════════════════════════════════════════════════\n   SYNCHRONISATION ENTRE APPAREILS'),
  html.indexOf('/* ══════════════════════════════════════════════════════════════\n   APPAIRAGE MULTI-APPAREILS'))
  // La liste de ce qui ne quitte jamais l'appareil vit avec l'appairage.
  // On la charge telle quelle plutôt que de la simuler : c'est elle qui
  // décide quels réglages se synchronisent.
  + html.slice(html.indexOf('const TC_JAMAIS_TRANSFERE = ['),
    html.indexOf('function tcReglagesTransferables()'));

// ── Le serveur, réduit à ce que l'API fait vraiment ───────────────────
const serveur = { compteur: 0, elements: new Map(), recus: 0, sondes: 0, appelsLourds: 0 };
serveur.pousser = (elements) => {
  serveur.recus += elements.length;
  elements.forEach((e) => {
    serveur.compteur++;
    serveur.elements.set(e.type + ':' + e.uid, {
      type: e.type, uid: e.uid,
      // Aller-retour JSON, et clés réordonnées : c'est ce que fait un
      // vrai passage par PHP puis par la base.
      contenu: e.contenu === null ? null : desordonner(JSON.parse(JSON.stringify(e.contenu))),
      version: serveur.compteur, supprime: e.contenu === null,
    });
  });
  return { version: serveur.compteur };
};
serveur.tirer = (depuis) => {
  const tout = [...serveur.elements.values()]
    .filter((e) => e.version > depuis).sort((a, b) => a.version - b.version);
  const page = tout.slice(0, 500);
  return {
    elements: page.map((e) => JSON.parse(JSON.stringify(e))),
    version: page.length ? page[page.length - 1].version : serveur.compteur,
    suite: tout.length > 500,
  };
};
function desordonner(o) {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return o;
  const r = {};
  Object.keys(o).reverse().forEach((k) => { r[k] = desordonner(o[k]); });
  return r;
}

// ── Un appareil ───────────────────────────────────────────────────────
// `neuf` : appareil jamais nettoyé, comme ceux d'avant la correction.
// Les autres portent déjà le marqueur, sans quoi leur premier tour
// commencerait par un ménage et fausserait tous les tests.
function appareil(nom, compte, neuf) {
  const stock = neuf ? {} : { tc_nettoyage: 'v1-donnees-melangees' };
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
    // Déclarées ailleurs dans la page, hors des tranches extraites ici.
    TC_EVENTS_KEY: 'tc_user_events',
    TC_TASKS_KEY: 'tc_user_tasks',
    messages: { user: [], pro: [] },
    userAccount: { reference: compte },
    tcJeton: () => 'jeton-' + nom,
    saveEventsToStorage: async () => {},
    saveTasks: () => {}, saveBirthdays: () => {}, saveContacts: () => {},
    TC_BACKEND: {
      syncTirer: async (depuis) => { serveur.appelsLourds++; return serveur.tirer(depuis || 0); },
      syncPousser: async (elements) => serveur.pousser(elements),
      syncVersionServeur: async () => { serveur.sondes++; return serveur.compteur; },
    },
  };
  // Écrit sur ctx explicitement : appelée sans receveur depuis le vm,
  // une fonction définie ici verrait `this` pointer sur le global de
  // Node, pas sur celui de l'appareil simulé.
  ctx.applyTheme = function (t) { ctx.currentTheme = t; };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(source
    + '\nglobalThis._sync = { tour: tcSyncTour, tirer: tcSyncTirer,'
    + ' pousser: tcSyncPousser, empreinte: tcSyncEmpreinte, etat: tcSyncEtat,'
    + ' sonde: tcSyncSonde, cleReglage: tcCleReglage, types: TC_SYNC_TYPES,'
    + ' preparer: tcPreparerAppareilPourCompte,'
    // Le filet se déclenche sur l'heure du dernier tour complet : le
    // test doit pouvoir la placer où il veut pour l'atteindre.
    + ' marquerTour: function (t) { _tcDernierTourComplet = t; } };', ctx);
  ctx.stock = stock;
  ctx.nom = nom;
  return ctx;
}

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(50)} ${detail || ''}`);
};
const rdv = (d) => d.events.filter((e) => e.mode === 'user').map((e) => e.title).sort();

(async () => {
  const mobile = appareil('mobile', 'CPT1');
  const web = appareil('web', 'CPT1');

  console.log('Le mobile crée un rendez-vous :');
  mobile.events.push({ id: 'evt_1', mode: 'user', title: 'Dentiste', date: '2026-09-05' });
  mobile.events.push({ id: 'demo_1', mode: 'demo', title: 'Démonstration', date: '2026-01-01' });
  await mobile._sync.tour();
  dire(serveur.elements.size === 1, 'un seul objet envoyé', serveur.elements.size);
  dire(!serveur.elements.has('rdv:demo_1'),
    'le rendez-vous de démonstration reste sur place');

  console.log('\nLe web le voit, sans avoir rien fait :');
  await web._sync.tour();
  dire(JSON.stringify(rdv(web)) === '["Dentiste"]', 'il est arrivé', rdv(web).join(', '));

  console.log('\nRien ne repart en boucle :');
  const avant = serveur.recus;
  await mobile._sync.tour();
  await web._sync.tour();
  await mobile._sync.tour();
  await web._sync.tour();
  dire(serveur.recus === avant, 'quatre tours à vide n envoient rien',
    (serveur.recus - avant) + ' objet(s) — les clés réordonnées ne trompent pas l empreinte');

  console.log('\nLe web modifie, le mobile suit :');
  web.events.find((e) => e.id === 'evt_1').title = 'Dentiste 15h';
  await web._sync.tour();
  await mobile._sync.tour();
  dire(JSON.stringify(rdv(mobile)) === '["Dentiste 15h"]', 'modification reçue',
    rdv(mobile).join(', '));

  console.log('\nLe mobile crée, le web crée, personne ne s écrase :');
  mobile.events.push({ id: 'evt_M', mode: 'user', title: 'Depuis le mobile' });
  web.events.push({ id: 'evt_W', mode: 'user', title: 'Depuis le web' });
  await mobile._sync.tour();
  await web._sync.tour();
  await mobile._sync.tour();
  dire(rdv(mobile).length === 3 && rdv(web).length === 3, 'trois rendez-vous des deux côtés',
    rdv(mobile).join(' | '));

  console.log('\nUne suppression voyage :');
  mobile.events = mobile.events.filter((e) => e.id !== 'evt_M');
  await mobile._sync.tour();
  await web._sync.tour();
  dire(rdv(web).length === 2 && !rdv(web).includes('Depuis le mobile'),
    'le web l a perdu aussi', rdv(web).join(' | '));
  await mobile._sync.tour();
  dire(rdv(mobile).length === 2, 'et il ne ressuscite pas au tour suivant',
    'la suppression est marquée, pas silencieuse');

  console.log('\nTâches, anniversaires et contacts suivent le même chemin :');
  mobile.tasksList.push({ id: 'task_1', title: 'Acheter du pain', done: false });
  mobile.birthdays.push({ id: 'bday_1', name: 'Marie', date: '1990-04-08' });
  mobile.contactsList.push({ id: 'ct_1', name: 'Julian' });
  await mobile._sync.tour();
  await web._sync.tour();
  dire(web.tasksList.length === 1 && web.birthdays.length === 1 && web.contactsList.length === 1,
    'les trois familles sont arrivées',
    web.tasksList[0].title + ', ' + web.birthdays[0].name + ', ' + web.contactsList[0].name);

  console.log('\nLes réglages circulent aussi, clé par clé :');
  mobile.localStorage.setItem('tc_theme', 'dark');
  mobile.localStorage.setItem('timecool_language', 'fr');
  mobile.localStorage.setItem('timecool_ai_config', '{"ton":"amical"}');
  // Ce qui ne doit jamais quitter l appareil, et ce qui est deja
  // synchronise objet par objet, ne doivent pas partir en réglage.
  mobile.localStorage.setItem('tc_device_crypto_key', 'CLE-DU-MOBILE');
  mobile.localStorage.setItem('tc_session_jeton', 'JETON-DU-MOBILE');
  mobile.localStorage.setItem('timecool_contacts', '[{"id":"ct_1"}]');
  // Un historique de conversation : trop gros pour un réglage.
  mobile.localStorage.setItem('timecool_messages', 'm'.repeat(150000));
  web.localStorage.setItem('tc_device_crypto_key', 'CLE-DU-WEB');

  await mobile._sync.tour();
  await web._sync.tour();
  dire(web.localStorage.getItem('tc_theme') === 'dark'
    && web.localStorage.getItem('timecool_language') === 'fr'
    && web.localStorage.getItem('timecool_ai_config') === '{"ton":"amical"}',
    'thème, langue et config IA sont arrivés',
    web.localStorage.getItem('tc_theme'));
  dire(web.currentTheme === 'dark', 'le thème s applique tout de suite', web.currentTheme);
  dire(web.localStorage.getItem('tc_device_crypto_key') === 'CLE-DU-WEB',
    'la clé de chiffrement du web n a pas été écrasée');
  dire(!serveur.elements.has('reglage:tc_session_jeton'), 'le jeton ne part pas');
  dire(!serveur.elements.has('reglage:timecool_contacts'),
    'les contacts ne partent pas deux fois',
    'ils sont déjà synchronisés objet par objet');
  dire(!serveur.elements.has('reglage:timecool_messages'),
    'un contenu trop gros est écarté',
    'sinon le serveur refuserait TOUT l envoi');

  console.log('\nEt un réglage modifié en face revient :');
  web.localStorage.setItem('tc_theme', 'light');
  await web._sync.tour();
  await mobile._sync.tour();
  dire(mobile.localStorage.getItem('tc_theme') === 'light',
    'le mobile reprend le thème du web', mobile.localStorage.getItem('tc_theme'));
  const avantReglages = serveur.recus;
  await mobile._sync.tour();
  await web._sync.tour();
  dire(serveur.recus === avantReglages, 'et rien ne repart en boucle',
    (serveur.recus - avantReglages) + ' objet(s)');

  console.log('\nOn ne retélécharge pas ce qu on a déjà :');
  const curseur = web._sync.etat().version;
  dire(curseur === serveur.compteur, 'le curseur suit le serveur',
    curseur + ' / ' + serveur.compteur);
  let demandes = 0;
  const vrai = web.TC_BACKEND.syncTirer;
  web.TC_BACKEND.syncTirer = async (d) => { demandes += serveur.tirer(d || 0).elements.length; return vrai(d); };
  await web._sync.tour();
  dire(demandes === 0, 'un tour à vide ne rapatrie aucun objet', demandes + ' objet(s)');

  console.log('\nUn autre compte sur le même appareil repart de zéro :');
  web.userAccount = { reference: 'CPT2' };
  dire(web._sync.etat().version === 0 && web._sync.etat().neuf,
    'curseur et empreintes remis à zéro', 'aucun mélange entre deux agendas');
  // Remis comme avant : la suite du test réutilise cet appareil, et un
  // compte resté différent y déclencherait un ménage.
  web.userAccount = { reference: 'CPT1' };

  // ── Les données du compte précédent ne doivent pas suivre ─────────
  // Sans ce ménage, le nouveau compte les pousserait sur le serveur
  // COMME SIENNES : une fuite d'un compte vers un autre sur un appareil
  // partagé.
  console.log('\nEt ses données ne partent pas sous le nouveau compte :');
  const part = appareil('partage', 'CPT_A', true);   // jamais nettoye
  part.events.push({ id: 'evt_prive', mode: 'user', title: 'Rendez-vous privé' });
  part.contactsList.push({ id: 'ct_1', name: 'Un contact' });
  part.tasksList.push({ id: 't_1', title: 'Une tâche' });
  part.localStorage.setItem('timecool_api_keys', '{"openai":"sk-partagee"}');
  part.localStorage.setItem('tc_device_crypto_key', 'CLE-DE-CET-APPAREIL');
  // Premier passage sur cet appareil : le nettoyage unique s'applique,
  // car on ne peut pas savoir à qui appartiennent ces données.
  dire(part._sync.preparer() === true, 'le nettoyage unique a lieu une fois',
    'les appareils déjà pollués sont remis à plat');
  dire(rdv(part).length === 0, 'et il efface ce qui traînait',
    'la lecture qui suit rétablit ce qui appartient au compte');

  // Une seconde fois, il ne rejoue pas — sinon il effacerait à chaque
  // tour ce que la lecture vient de rapporter.
  part.events.push({ id: 'evt_apres', mode: 'user', title: 'Rendez-vous rapporté' });
  dire(part._sync.preparer() === false, 'il ne se rejoue pas au tour suivant');
  dire(rdv(part).length === 1, 'ce qui est arrivé depuis reste en place',
    rdv(part).join(', '));

  part.events.push({ id: 'evt_prive', mode: 'user', title: 'Rendez-vous privé' });
  part.contactsList.push({ id: 'ct_1', name: 'Un contact' });
  part.tasksList.push({ id: 't_1', title: 'Une tâche' });
  part.localStorage.setItem('timecool_api_keys', '{"openai":"sk-partagee"}');

  part.userAccount = { reference: 'CPT_B' };   // quelqu un d autre se connecte
  const menage = part._sync.preparer();
  dire(menage === true, 'un changement de compte est détecté');
  dire(rdv(part).length === 0 && part.contactsList.length === 0
    && part.tasksList.length === 0, 'rendez-vous, contacts et tâches effacés',
    'ils appartenaient au compte précédent');
  dire(part.localStorage.getItem('timecool_api_keys') === null,
    'les clés API aussi', 'le serveur les rendra, celles du bon compte');
  dire(part.localStorage.getItem('tc_device_crypto_key') === 'CLE-DE-CET-APPAREIL',
    'mais la clé de chiffrement de l appareil reste',
    'elle n appartient à aucun compte');

  const rienAEnvoyer = await part._sync.pousser();
  dire(rienAEnvoyer === 0, 'et rien ne part sous le nouveau compte',
    'aucune suppression annoncée non plus');

  // ── La sonde ──────────────────────────────────────────────────────
  console.log('\nLa sonde ne réveille que quand il y a de quoi :');
  const sonde = appareil('sonde', 'CPT1');
  await sonde._sync.tour();                    // rattrape l existant
  sonde._sync.marquerTour(Date.now());         // le filet ne doit pas jouer
  let lourdsAvant = serveur.appelsLourds;
  let sondesAvant = serveur.sondes;
  await sonde._sync.sonde();
  await sonde._sync.sonde();
  await sonde._sync.sonde();
  dire(serveur.sondes - sondesAvant === 3, 'trois sondes envoyées',
    (serveur.sondes - sondesAvant) + ' sondes');
  dire(serveur.appelsLourds === lourdsAvant,
    'et aucune synchronisation complète déclenchée',
    'rien n avait bougé — c est ce qui rend la seconde tenable');

  console.log('\nMais elle réagit dès que le numéro bouge :');
  mobile.events.push({ id: 'evt_flash', mode: 'user', title: 'Ajouté à l instant' });
  await mobile._sync.tour();
  lourdsAvant = serveur.appelsLourds;
  await sonde._sync.sonde();
  dire(serveur.appelsLourds > lourdsAvant, 'la sonde a déclenché un tour complet');
  dire(rdv(sonde).includes('Ajouté à l instant'), 'et le rendez-vous est arrivé',
    'en un seul aller-retour');

  console.log('\nLe filet de sécurité :');
  sonde._sync.marquerTour(Date.now() - 120000);   // dernier tour il y a 2 min
  lourdsAvant = serveur.appelsLourds;
  await sonde._sync.sonde();
  dire(serveur.appelsLourds > lourdsAvant,
    'un tour complet a lieu même sans changement annoncé',
    'rattrape un curseur qui aurait dérivé');

  // ── Deux mécanismes ne doivent jamais écrire la même clé ──────────
  // Une famille synchronisée objet par objet dont la clé de stockage
  // resterait dans les « réglages » verrait ce bloc écraser ses données,
  // par intermittence, selon lequel des deux écrit en dernier. Aucune
  // erreur, juste des données qui disparaissent.
  console.log('\nAucune clé n est réclamée par deux mécanismes :');
  [
    ['tc_conversations', 'conversation'],
    ['tc_user_events', 'rdv'],
    ['tc_user_tasks', 'tache'],
    ['timecool_birthdays', 'anniversaire'],
    ['timecool_contacts', 'contact'],
  ].forEach(([cle, famille]) => {
    dire(web._sync.cleReglage(cle) === false,
      cle + ' est hors des réglages', 'déjà porté par la famille « ' + famille + ' »');
  });

  // ── Les conversations descendent, elles ne remontent jamais ───────
  console.log('\nUne conversation reçue ne repart pas au serveur :');
  serveur.compteur++;
  serveur.elements.set('conversation:REF123', {
    type: 'conversation', uid: 'REF123', version: serveur.compteur, supprime: false,
    contenu: { reference: 'REF123', with: 'Julian Verif',
      thread: [{ from: 'them', texte: 'Bonjour', le: '2026-09-05T10:00:00Z' }] },
  });
  await web._sync.tour();
  dire(JSON.parse(web.localStorage.getItem('tc_conversations') || '[]').length === 1,
    'elle arrive bien', 'écrite par le serveur, transportée par la sonde');

  const recusAvant = serveur.recus;
  await web._sync.tour();
  await web._sync.tour();
  dire(serveur.recus === recusAvant, 'et ne repart pas',
    (serveur.recus - recusAvant) + ' objet(s) renvoyé(s)');

  // Le piège : sans le drapeau lectureSeule, la comparaison
  // d'empreintes la verrait comme un objet local disparu et enverrait
  // sa suppression — ce qui l'effacerait chez les deux correspondants.
  const envoyees = [];
  const vraiPousser = web.TC_BACKEND.syncPousser;
  web.TC_BACKEND.syncPousser = async (els) => { envoyees.push(...els); return vraiPousser(els); };
  web.localStorage.setItem('tc_conversations', '[]');   // comme si elle disparaissait ici
  await web._sync.pousser();
  dire(!envoyees.some((e) => e.type === 'conversation'),
    'sa disparition locale n est jamais annoncée',
    'sinon elle serait effacée chez les deux correspondants');
  web.TC_BACKEND.syncPousser = vraiPousser;

  // ── Une famille vidée d'un coup n'est pas un geste d'utilisateur ──
  // C'est ce qui a fait disparaître un contact du serveur une seconde
  // après sa création. Avec 3285 contacts, c'est tout le carnet.
  console.log('\nUne disparition en masse n est jamais annoncée :');
  const carnet = appareil('carnet', 'CPT_C');
  for (let i = 0; i < 12; i++) carnet.contactsList.push({ id: 'ct_' + i, name: 'Contact ' + i });
  carnet.tasksList.push({ id: 't_1', title: 'Une tâche' });
  // Un tour complet, pas une simple poussée : sans avoir lu le serveur
  // au moins une fois, l'appareil se croit neuf et ignore ses propres
  // empreintes — le test ne prouverait alors rien.
  await carnet._sync.tour();

  const envois = [];
  const vraiPoussee = carnet.TC_BACKEND.syncPousser;
  carnet.TC_BACKEND.syncPousser = async (els) => { envois.push(...els); return vraiPoussee(els); };

  carnet.contactsList = [];              // la liste disparaît, par accident
  await carnet._sync.pousser();
  dire(!envois.some((e) => e.type === 'contact' && e.contenu === null),
    'les douze contacts ne sont pas effacés chez tout le monde',
    envois.filter((e) => e.type === 'contact').length + ' suppression(s) envoyée(s)');

  envois.length = 0;
  carnet.tasksList = [];                 // une seule tâche : suppression plausible
  await carnet._sync.pousser();
  dire(envois.some((e) => e.type === 'tache' && e.contenu === null),
    'mais une vraie suppression passe toujours',
    'le garde-fou ne bloque que les disparitions en masse');
  carnet.TC_BACKEND.syncPousser = vraiPoussee;

  console.log('\nHors ligne, rien ne se perd :');
  const coupe = appareil('coupe', 'CPT1');
  coupe.TC_BACKEND.syncPousser = async () => { throw new Error('Serveur injoignable'); };
  coupe.TC_BACKEND.syncTirer = async () => { throw new Error('Serveur injoignable'); };
  coupe.events.push({ id: 'evt_offline', mode: 'user', title: 'Créé sans réseau' });
  await coupe._sync.tour();
  dire(rdv(coupe).length === 1, 'la modification reste dans l appareil');
  coupe.TC_BACKEND.syncTirer = async (d) => serveur.tirer(d || 0);
  coupe.TC_BACKEND.syncPousser = async (e) => serveur.pousser(e);
  await coupe._sync.tour();
  await web._sync.tour();
  dire(serveur.elements.has('rdv:evt_offline'),
    'et part dès le retour du réseau', 'rien n a été perdu');

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
