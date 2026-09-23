// Prise de rendez-vous entre deux comptes, contre l'API réelle.
// Charles demande, Julian reçoit — dans son agenda ou dans sa messagerie
// selon ce qu'il a configuré, sans jamais pouvoir distinguer un refus.
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(50)} ${detail || ''}`);
};

async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' },
      jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}

let n = 0;
async function inscrire(prenom) {
  n++;
  const tel = '+336' + String(Date.now() + n * 137).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Verif', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}

const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;

(async () => {
  const charles = await inscrire('Charles');
  const julian = await inscrire('Julian');
  dire(!!charles.ref && !!julian.ref, 'deux comptes créés', charles.ref + ' / ' + julian.ref);

  // ── Julian n'a rien configuré ─────────────────────────────────────
  console.log('\nJulian n a rien configuré pour Charles :');
  const d1 = await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  dire(d1.code === 200 && d1.d.mode === 'messagerie', 'la demande part en messagerie',
    d1.d ? d1.d.mode : d1.code);
  dire(/complet ou pas encore configuré/.test(d1.d.message || ''),
    'le message ne révèle pas la raison', 'ni refus, ni blocage, ni absence de compte');
  dire(/[éèàù]/.test(d1.d.message || ''), 'et il porte ses accents',
    'ce texte est lu par l utilisateur');

  const chezJulian = await elements(julian.jeton);
  const chezCharles = await elements(charles.jeton);
  const convJ = chezJulian.find((e) => e.type === 'conversation');
  const convC = chezCharles.find((e) => e.type === 'conversation');
  dire(!!convJ && !!convC, 'la conversation existe des DEUX côtés');
  dire(convJ && convJ.contenu.thread[0].from === 'them',
    'chez Julian, le message vient de l autre', convJ && convJ.contenu.thread[0].from);
  dire(convC && convC.contenu.thread[0].from === 'me',
    'chez Charles, il vient de lui-même', convC && convC.contenu.thread[0].from);
  dire(convJ && convJ.contenu.with === 'Charles Verif', 'rangée sous le nom de l autre',
    convJ && convJ.contenu.with);
  dire(!chezJulian.some((e) => e.type === 'rdv'),
    'aucun rendez-vous posé dans son agenda', 'rien ne s impose à lui');

  console.log('\nUn deuxième clic ne renvoie pas la même chose :');
  const d1b = await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  dire(d1b.d.rdv === d1.d.rdv, 'la demande en attente est reprise',
    'demande ' + d1b.d.rdv);
  const convJ2 = (await elements(julian.jeton)).find((e) => e.type === 'conversation');
  dire(convJ2.contenu.thread.length === 1, 'un seul message chez Julian',
    convJ2.contenu.thread.length + ' message(s) après deux demandes');
  dire(d1b.d.message !== d1.d.message, 'le demandeur lit autre chose que la première fois',
    'plutôt qu un envoi annoncé qui n a pas eu lieu');
  dire(/consulter ta messagerie/.test(d1b.d.message),
    'et on le renvoie vers sa messagerie', d1b.d.message.slice(0, 45) + '…');

  console.log('\nUne demande oubliée ne bloque pas pour toujours :');
  // On vieillit artificiellement la demande en attente, comme si elle
  // datait de dix jours. Sans expiration, elle interdirait à jamais
  // toute nouvelle demande vers cette personne.
  await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  const avantVieillissement = (await elements(julian.jeton))
    .find((e) => e.type === 'conversation').contenu.thread.length;
  dire(avantVieillissement === 1, 'toujours un seul message', avantVieillissement);

  console.log('\nLe message envoyé est écrit à la première personne :');
  const texte = convJ2.contenu.thread[0].texte;
  dire(texte.startsWith('Salut Julian'), 'il s adresse à lui par son prénom', texte.slice(0, 30));
  dire(/👋/.test(texte), 'avec un emoji');
  dire(!/souhaite prendre rendez-vous avec vous/.test(texte),
    'ce n est plus une notification à la troisième personne');
  dire(/disponible/.test(texte), 'et il demande quelque chose de précis');

  // ── Julian autorise Charles ───────────────────────────────────────
  console.log('\nJulian ajoute Charles à ses contacts, avec une catégorie :');
  await appel('POST', '/sync', {
    elements: [{ type: 'contact', uid: 'ct_charles', contenu: {
      id: 'ct_charles', name: 'Charles Verif', phone: charles.tel, email: '',
      categories: ['travail'], isTimeCool: true } }],
  }, julian.jeton);

  const d2 = await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  dire(d2.d.mode === 'creneaux', 'cette fois, des créneaux sont proposés', d2.d.mode);
  dire(Array.isArray(d2.d.creneaux) && d2.d.creneaux.length === 3, 'trois créneaux',
    (d2.d.creneaux || []).length);
  dire((d2.d.creneaux || []).every((c) => {
    const j = new Date(c.date + 'T00:00:00').getDay();
    return j !== 0 && j !== 6;
  }), 'aucun le week-end');
  dire(new Set((d2.d.creneaux || []).map((c) => c.date)).size === 3,
    'un seul par jour', (d2.d.creneaux || []).map((c) => c.libelle).join(' | '));

  // ── Les créneaux viennent de l'agenda de Julian ────────────────────
  console.log('\nLes créneaux viennent bien de l agenda de JULIAN :');
  const premier = d2.d.creneaux[0];
  await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'occupe_1', contenu: {
      id: 'occupe_1', date: premier.date, startH: premier.heure, startM: 0,
      endH: premier.heure + 1, endM: 0, title: 'Déjà pris', cat: 'travail', mode: 'user' } }],
  }, julian.jeton);
  const d3 = await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  const memeCreneau = d3.d.creneaux.find((c) => c.date === premier.date && c.heure === premier.heure);
  dire(!memeCreneau, 'un créneau occupé chez Julian n est plus proposé',
    'l heure ' + premier.heure + 'h du ' + premier.date + ' a disparu');

  // ── Charles retient un créneau ────────────────────────────────────
  console.log('\nCharles retient le deuxième créneau :');
  const choix = await appel('POST', '/rdv/choisir', { rdv: d3.d.rdv, rang: 2 }, charles.jeton);
  dire(choix.code === 200, 'accepté', 'HTTP ' + choix.code + ' — ' + (choix.d.libelle || ''));

  const finC = await elements(charles.jeton);
  const finJ = await elements(julian.jeton);
  const rdvC = finC.filter((e) => e.type === 'rdv' && e.uid.startsWith('tc_rdv_'));
  const rdvJ = finJ.filter((e) => e.type === 'rdv' && e.uid.startsWith('tc_rdv_'));
  dire(rdvC.length === 1 && rdvJ.length === 1, 'inscrit dans les DEUX agendas');
  dire(rdvC[0].contenu.title === 'Julian Verif', 'chez Charles : le nom de Julian',
    rdvC[0].contenu.title);
  dire(rdvJ[0].contenu.title === 'Charles Verif', 'chez Julian : le nom de Charles',
    rdvJ[0].contenu.title);
  dire(rdvC[0].contenu.date === rdvJ[0].contenu.date
    && rdvC[0].contenu.startH === rdvJ[0].contenu.startH,
    'même date et même heure des deux côtés',
    rdvC[0].contenu.date + ' ' + rdvC[0].contenu.startH + 'h');

  const rejeu = await appel('POST', '/rdv/choisir', { rdv: d3.d.rdv, rang: 1 }, charles.jeton);
  dire(rejeu.code === 404, 'on ne choisit pas deux fois', 'HTTP ' + rejeu.code);

  // ── Le blocage se comporte comme une absence de configuration ──────
  console.log('\nUn contact bloqué ne se distingue pas d un agenda plein :');
  await appel('POST', '/sync', {
    elements: [{ type: 'contact', uid: 'ct_charles', contenu: {
      id: 'ct_charles', name: 'Charles Verif', phone: charles.tel, email: '',
      categories: ['travail'], isTimeCool: true, blocked: true } }],
  }, julian.jeton);
  const d4 = await appel('POST', '/rdv/demander', { reference: julian.ref }, charles.jeton);
  dire(d4.d.mode === 'messagerie', 'la demande repart en messagerie', d4.d.mode);
  dire(d4.d.message === d1.d.message, 'mot pour mot le même message qu au début',
    'impossible de deviner le blocage');

  console.log('\nRefus attendus :');
  const soi = await appel('POST', '/rdv/demander', { reference: charles.ref }, charles.jeton);
  dire(soi.code === 400, 'se prendre rendez-vous à soi-même', 'HTTP ' + soi.code);
  const inconnu = await appel('POST', '/rdv/demander', { reference: 'ZZZZZZZZZZZZ' }, charles.jeton);
  dire(inconnu.code === 404, 'référence inconnue', 'HTTP ' + inconnu.code);
  const anon = await appel('POST', '/rdv/demander', { reference: julian.ref });
  dire(anon.code === 401, 'sans session', 'HTTP ' + anon.code);
  const volE = await appel('POST', '/rdv/choisir', { rdv: d3.d.rdv, rang: 1 }, julian.jeton);
  dire(volE.code === 404, 'choisir le créneau d une demande qui n est pas la sienne',
    'HTTP ' + volE.code);

  console.log('\nÀ supprimer : ' + charles.ref + ', ' + julian.ref);
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
