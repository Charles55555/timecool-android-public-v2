// Synchronisation par différences, contre l'API réelle. Deux appareils
// simulés : ce que l'un écrit, l'autre doit le voir, et rien d'autre.
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(48)} ${detail || ''}`);
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

(async () => {
  const m = 'e2esync' + Date.now();
  const insc = await appel('POST', '/inscription', {
    email: m + '@exemple-timecool.fr', mot_de_passe: 'MotDePasseDeTest2026!',
    telephone: '+336' + String(Date.now()).slice(-8),
    prenom: 'Sync', nom: 'Verif', ville: 'Lyon', code_postal: '69001',
  });
  if (insc.code !== 200 && insc.code !== 201) {
    console.log('  KO  inscription :', insc.code, JSON.stringify(insc.d));
    process.exit(1);
  }
  const reference = insc.d.compte.reference;
  const mobile = insc.d.session.jeton;

  // Deuxième session sur le même compte : c'est le PC.
  const co = await appel('POST', '/connexion',
    { identifiant: insc.d.compte.email, mot_de_passe: 'MotDePasseDeTest2026!' });
  const web = co.d.session.jeton;
  dire(!!web && web !== mobile, 'deux appareils, deux sessions, un compte', reference);

  console.log('\nAu départ, rien :');
  const vide = await appel('GET', '/sync?depuis=0', undefined, mobile);
  dire(vide.code === 200 && vide.d.elements.length === 0 && vide.d.version === 0,
    'aucun élément, version 0', 'version ' + vide.d.version);

  console.log('\nLe mobile crée trois objets :');
  const pousse = await appel('POST', '/sync', {
    elements: [
      { type: 'rdv', uid: 'evt_1', contenu: { titre: 'Dentiste', date: '2026-09-05' } },
      { type: 'rdv', uid: 'evt_2', contenu: { titre: 'Réunion — éàç', date: '2026-09-04' } },
      { type: 'contact', uid: 'ct_1', contenu: { nom: 'Marie Dupont' } },
    ],
  }, mobile);
  dire(pousse.code === 200 && pousse.d.version === 3, 'trois versions attribuées',
    'version ' + pousse.d.version);

  console.log('\nLe web les récupère sans avoir rien fait :');
  const tire = await appel('GET', '/sync?depuis=0', undefined, web);
  dire(tire.d.elements.length === 3, 'les trois arrivent', tire.d.elements.length);
  const rdv = tire.d.elements.find((e) => e.uid === 'evt_2');
  dire(rdv && rdv.contenu.titre === 'Réunion — éàç', 'contenu et accents intacts',
    rdv ? rdv.contenu.titre : 'absent');
  dire(tire.d.version === 3 && tire.d.suite === false, 'curseur rendu, pas de suite',
    'version ' + tire.d.version);

  console.log('\nOn ne retélécharge que la suite :');
  const rien = await appel('GET', '/sync?depuis=3', undefined, web);
  dire(rien.d.elements.length === 0, 'rien de neuf, rien ne transite');
  const partiel = await appel('GET', '/sync?depuis=2', undefined, web);
  dire(partiel.d.elements.length === 1 && partiel.d.elements[0].uid === 'ct_1',
    'un seul objet après la version 2', partiel.d.elements[0].uid);

  console.log('\nLe web modifie, le mobile voit :');
  const modif = await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_1', contenu: { titre: 'Dentiste 15h', date: '2026-09-05' } }],
  }, web);
  dire(modif.d.version === 4, 'la version monte', 'version ' + modif.d.version);
  const vuMobile = await appel('GET', '/sync?depuis=3', undefined, mobile);
  dire(vuMobile.d.elements.length === 1
    && vuMobile.d.elements[0].contenu.titre === 'Dentiste 15h',
    'le mobile reçoit la modification, et elle seule',
    vuMobile.d.elements[0].contenu.titre);

  console.log('\nUne suppression voyage aussi :');
  const supp = await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_2', contenu: null }],
  }, mobile);
  dire(supp.d.version === 5, 'version 5');
  const vuWeb = await appel('GET', '/sync?depuis=4', undefined, web);
  dire(vuWeb.d.elements.length === 1 && vuWeb.d.elements[0].supprime === true
    && vuWeb.d.elements[0].contenu === null,
    'marquée supprimée, pas simplement absente',
    'sans cela le web la ressusciterait');

  console.log('\nDeux appareils, deux objets différents, aucun écrasement :');
  await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_A', contenu: { titre: 'Depuis le mobile' } }],
  }, mobile);
  await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_B', contenu: { titre: 'Depuis le web' } }],
  }, web);
  const tout = await appel('GET', '/sync?depuis=0', undefined, mobile);
  const parUid = {};
  tout.d.elements.forEach((e) => { parUid[e.uid] = e; });
  dire(parUid.evt_A && parUid.evt_B
    && parUid.evt_A.contenu.titre === 'Depuis le mobile'
    && parUid.evt_B.contenu.titre === 'Depuis le web',
    'les deux coexistent');
  dire(parUid.evt_1.contenu.titre === 'Dentiste 15h', 'et rien n a été perdu au passage');

  console.log('\nLe dernier qui écrit gagne, sur le même objet :');
  await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_A', contenu: { titre: 'Version mobile' } }],
  }, mobile);
  await appel('POST', '/sync', {
    elements: [{ type: 'rdv', uid: 'evt_A', contenu: { titre: 'Version web' } }],
  }, web);
  const arbitre = await appel('GET', '/sync?depuis=0', undefined, mobile);
  const a = arbitre.d.elements.find((e) => e.uid === 'evt_A');
  dire(a.contenu.titre === 'Version web', 'la dernière écriture l emporte', a.contenu.titre);

  console.log('\nUn gros premier chargement est découpé :');
  for (let lot = 0; lot < 2; lot++) {
    const paquet = [];
    for (let i = 0; i < 300; i++) {
      paquet.push({ type: 'rdv', uid: 'ev_' + lot + '_' + i,
        contenu: { titre: 'Rendez-vous ' + i, notes: 'n'.repeat(200) } });
    }
    const r = await appel('POST', '/sync', { elements: paquet }, mobile);
    dire(r.code === 200, 'lot de 300 accepté', 'version ' + r.d.version);
  }
  const page1 = await appel('GET', '/sync?depuis=0', undefined, web);
  dire(page1.d.elements.length === 500 && page1.d.suite === true,
    'première page de 500, avec « suite »', page1.d.elements.length + ' éléments');
  const page2 = await appel('GET', '/sync?depuis=' + page1.d.version, undefined, web);
  dire(page2.d.elements.length > 0 && page2.d.suite === false,
    'la page suivante termine', page2.d.elements.length + ' éléments');

  console.log('\nRefus attendus :');
  const sansJeton = await appel('GET', '/sync?depuis=0');
  dire(sansJeton.code === 401, 'lecture sans session refusée', 'HTTP ' + sansJeton.code);
  const mauvais = await appel('POST', '/sync',
    { elements: [{ type: 'RDV!', uid: 'x', contenu: {} }] }, mobile);
  dire(mauvais.code === 400, 'type invalide refusé', 'HTTP ' + mauvais.code);
  const trop = await appel('POST', '/sync',
    { elements: new Array(501).fill({ type: 'rdv', uid: 'x', contenu: {} }) }, mobile);
  dire(trop.code === 413, 'lot de plus de 500 refusé', 'HTTP ' + trop.code);

  // Isolation : un autre compte ne doit rien voir.
  const autre = await appel('POST', '/inscription', {
    email: 'e2eiso' + Date.now() + '@exemple-timecool.fr',
    mot_de_passe: 'MotDePasseDeTest2026!',
    telephone: '+337' + String(Date.now()).slice(-8),
    prenom: 'Autre', nom: 'Verif', ville: 'Lyon', code_postal: '69001',
  });
  const vuAutre = await appel('GET', '/sync?depuis=0', undefined, autre.d.session.jeton);
  dire(vuAutre.d.elements.length === 0, 'un autre compte ne voit rien',
    vuAutre.d.elements.length + ' éléments');

  console.log('\nÀ supprimer : ' + reference + ', ' + autre.d.compte.reference);
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
