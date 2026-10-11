// Mission 2 (Charles, 11/10, « silence ») contre l'API réelle (comptes sonde jetables e2erdv…).
// À lancer APRÈS la mise en ligne de l'API : elle vérifie le serveur en production.
//
//   bloquée (« Refuser et bloquer ») et qui redemande -> HTTP 200, mode messagerie, mot pour mot
//   la réponse de sa première demande ; chez la titulaire : RIEN (ni message, ni demande, ni rdv) ;
//   bloquée sur une fiche parmi deux (l'autre classée, validation décochée) -> pareil ;
//   débloquée -> redevient ordinaire (créneaux si classée + décochée, messagerie sinon) ;
//   rendez-vous à plusieurs : « sans accès », rien chez elle.
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(70)} ${detail === undefined ? '' : detail}`);
};

async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
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
    email: 'e2erdv.silence' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Silence', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const dispo = (obj) => reglage('timecool_disponibilites', JSON.stringify(obj));
const jourOuvre = (plus) => { const d = new Date(Date.now() + plus * 86400000); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
// Tout ce qui pourrait trahir une demande chez la titulaire : fils de messagerie, demandes, rendez-vous.
const empreinte = async (jeton) => {
  const els = await elements(jeton);
  return JSON.stringify({
    conv: els.filter((e) => e.type === 'conversation').map((e) => [e.uid, e.contenu.thread.length, e.contenu.thread.filter((m) => m.genre === 'demande_rdv' && !m.traite).length]).sort(),
    rdv: els.filter((e) => e.type === 'rdv').map((e) => e.uid).sort(),
  });
};

(async () => {
  const armelle = await inscrire('Armelle');
  const clemence = await inscrire('Clemence');
  dire(!!armelle.ref && !!clemence.ref, 'deux comptes sonde créés');

  console.log('\nPremière demande, puis « Refuser et bloquer » :');
  const d1 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d1.code === 200 && d1.d.mode === 'messagerie' && typeof d1.d.rdv === 'number', 'Clémence (inconnue) : messagerie', d1.d && d1.d.mode);
  const refus = await appel('POST', '/rdv/refuser', { rdv: d1.d.rdv }, armelle.jeton);
  dire(refus.code === 200, 'Armelle refuse et bloque', 'HTTP ' + refus.code);
  const fiche = (await elements(armelle.jeton)).find((e) => e.type === 'contact' && e.contenu.referenceCompte === clemence.ref);
  dire(!!fiche && fiche.contenu.blocked === true, 'la fiche bloquée existe chez Armelle', fiche && fiche.uid);

  console.log('\nClémence (bloquée) redemande : rien chez Armelle, même réponse pour elle :');
  const avant = await empreinte(armelle.jeton);
  const chezClemAvant = await conversation(clemence.jeton, armelle.ref);
  const d2 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d2.code === 200 && d2.d.mode === 'messagerie', 'HTTP 200, mode messagerie', d2.code + ' ' + (d2.d && d2.d.mode));
  dire(d2.d.message === d1.d.message, 'mot pour mot la réponse de sa première demande', (d2.d.message || '').slice(0, 50));
  dire(typeof d2.d.rdv === 'number', 'le champ rdv est là (un nombre), comme d habitude', d2.d.rdv);
  const apres = await empreinte(armelle.jeton);
  dire(avant === apres, 'chez Armelle : aucun message, aucune demande, aucun rendez-vous en plus', apres);
  const convA = await conversation(armelle.jeton, clemence.ref);
  dire(convA && convA.contenu.thread.filter((m) => m.genre === 'demande_rdv' && !m.traite).length === 0, 'aucune carte « Proposer un créneau / Refuser et bloquer » ne revient');
  const chezClemApres = await conversation(clemence.jeton, armelle.ref);
  const nAvant = chezClemAvant ? chezClemAvant.contenu.thread.length : 0;
  const nApres = chezClemApres ? chezClemApres.contenu.thread.length : 0;
  dire(nApres === nAvant + 1 && chezClemApres.contenu.thread[nApres - 1].from === 'me', 'dans SA messagerie, Clémence retrouve sa demande, comme d habitude', nAvant + ' -> ' + nApres);
  const d3 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d3.d.message === d1.d.message && (await empreinte(armelle.jeton)) === avant, 'un troisième clic : même réponse, toujours rien chez Armelle');
  const prop = await appel('POST', '/rdv/proposer-creneau', { rdv: d1.d.rdv, date: jourOuvre(3), debut: '10:00', duree: 60 }, armelle.jeton);
  dire(prop.code === 404, 'la demande refusée reste close (rien de nouveau n a été ouvert)', 'HTTP ' + prop.code);

  console.log('\nBloquée sur UNE fiche parmi deux (l autre classée travail, validation décochée, plages) :');
  await poser(armelle.jeton, [
    reglage('tc_rdv_validation', '0'),
    dispo({ travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] }),
    { type: 'contact', uid: 'ct_clem_travail', contenu: { id: 'ct_clem_travail', name: 'Clemence Silence', phone: clemence.tel, email: '', categories: ['travail'], isTimeCool: true } },
  ]);
  const avant2 = await empreinte(armelle.jeton);
  const d4 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d4.code === 200 && d4.d.mode === 'messagerie' && d4.d.message === d1.d.message, 'toujours la réponse neutre (pas de créneaux)', d4.d && d4.d.mode);
  dire((await empreinte(armelle.jeton)) === avant2, 'et toujours rien chez Armelle');
  const g = await appel('POST', '/rdv/groupe/proposer', { references: [armelle.ref], duree: 1 }, clemence.jeton);
  dire(g.code === 200 && g.d.invites.length === 0 && g.d.sans_acces.length === 1, 'rendez-vous à plusieurs : Armelle est « sans accès » pour elle', JSON.stringify(g.d && g.d.sans_acces));
  dire((await empreinte(armelle.jeton)) === avant2, 'rien chez Armelle non plus');

  console.log('\nDébloquée : elle redevient une contact ordinaire :');
  await poser(armelle.jeton, [{ type: 'contact', uid: fiche.uid, contenu: Object.assign({}, fiche.contenu, { blocked: false }) }]);
  const d5 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d5.code === 200 && d5.d.mode === 'creneaux' && d5.d.creneaux.length === 3, 'classée travail + validation décochée : des créneaux, tout de suite', d5.d && d5.d.mode);
  await poser(armelle.jeton, [reglage('tc_rdv_validation', '1')]);
  const d6 = await appel('POST', '/rdv/demander', { reference: armelle.ref }, clemence.jeton);
  dire(d6.code === 200 && d6.d.mode === 'messagerie', 'validation cochée : messagerie', d6.d && d6.d.mode);
  const convA2 = await conversation(armelle.jeton, clemence.ref);
  dire(convA2 && convA2.contenu.thread.some((m) => m.genre === 'demande_rdv' && !m.traite && m.rdv === d6.d.rdv), 'et cette fois la demande ARRIVE chez Armelle (carte à traiter)');

  console.log('\nÀ supprimer : ' + [armelle, clemence].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
