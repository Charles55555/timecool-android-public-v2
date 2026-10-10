// Contacts classes contre l'API reelle (comptes sonde jetables) : un contact non classe passe par
// la messagerie ; un contact classe ne reserve que dans les plages de SES categories.
// À lancer APRÈS la mise en ligne de l'API : elle vérifie le serveur en production.
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
    email: 'sonde.classe' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Classe', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const dispo = (obj) => reglage('timecool_disponibilites', JSON.stringify(obj));
const fiche = (uid, p, extra) => ({ type: 'contact', uid, contenu: Object.assign({ id: uid, name: p.prenom + ' Classe', phone: p.tel, email: '', isTimeCool: true }, extra || {}) });
const SEMAINE = [1, 2, 3, 4, 5];

(async () => {
  const t = await inscrire('Tania');
  const nora = await inscrire('Nora');       // dans le carnet, NON classee
  const carl = await inscrire('Carl');       // classe travail
  const fanny = await inscrire('Fanny');     // classee famille
  const bob = await inscrire('Bob');         // classe travail mais bloque
  const ines = await inscrire('Ines');       // inconnue du carnet
  dire([t, nora, carl, fanny, bob, ines].every((c) => !!c.ref), 'six comptes sonde crees');

  await poser(t.jeton, [
    reglage('tc_rdv_validation', '0'),
    dispo({ travail: [{ jours: SEMAINE, debut: '09:00', fin: '12:00' }], famille: [{ jours: SEMAINE, debut: '14:00', fin: '18:00' }] }),
    fiche('ct_nora', nora),
    fiche('ct_carl', carl, { categories: ['travail'] }),
    fiche('ct_fanny', fanny, { categories: ['famille'] }),
    fiche('ct_bob', bob, { categories: ['travail'], blocked: true }),
  ]);

  console.log('\nValidation decochee. Tania a classe Carl (travail) et Fanny (famille), pas Nora :');
  const rNora = await appel('POST', '/rdv/demander', { reference: t.ref }, nora.jeton);
  dire(rNora.code === 200 && rNora.d.mode === 'messagerie', 'Nora (dans le carnet, NON classee) : messagerie', rNora.d.mode);
  const rIn = await appel('POST', '/rdv/demander', { reference: t.ref }, ines.jeton);
  const rBob = await appel('POST', '/rdv/demander', { reference: t.ref }, bob.jeton);
  dire(rIn.d.mode === 'messagerie' && rBob.d.mode === 'messagerie', 'Ines (inconnue) et Bob (bloque) : messagerie aussi');
  dire(rNora.d.message === rIn.d.message && rIn.d.message === rBob.d.message, 'meme reponse mot pour mot pour non classee, inconnue et bloque', 'impossible a distinguer');
  const rCarl = await appel('POST', '/rdv/demander', { reference: t.ref }, carl.jeton);
  dire(rCarl.d.mode === 'creneaux' && rCarl.d.creneaux.length === 3, 'Carl (classe travail) : des creneaux', rCarl.d.mode);
  dire((rCarl.d.creneaux || []).every((c) => [9, 10, 11].includes(c.heure)), 'tous dans les heures de TRAVAIL (9h-12h), jamais celles de la famille', (rCarl.d.creneaux || []).map((c) => c.heure).join(','));
  const rFanny = await appel('POST', '/rdv/demander', { reference: t.ref }, fanny.jeton);
  dire(rFanny.d.mode === 'creneaux' && (rFanny.d.creneaux || []).every((c) => c.heure >= 14 && c.heure <= 17), 'Fanny (classee famille) : creneaux dans les heures de FAMILLE seulement', (rFanny.d.creneaux || []).map((c) => c.heure).join(','));

  console.log('\nTania dé-classe Carl entre la proposition et le choix :');
  await poser(t.jeton, [fiche('ct_carl', carl, { categories: [] })]);
  const choix = await appel('POST', '/rdv/choisir', { rdv: rCarl.d.rdv, rang: 1 }, carl.jeton);
  dire(choix.code === 409, 'Carl, devenu non classe : refuse comme un creneau pris (409)', 'HTTP ' + choix.code);
  const reCarl = await appel('POST', '/rdv/demander', { reference: t.ref }, carl.jeton);
  dire(reCarl.d.mode === 'messagerie', 'et sa nouvelle demande part en messagerie', reCarl.d.mode);
  await poser(t.jeton, [fiche('ct_carl', carl, { categories: ['personnel'] })]);
  const perso = await appel('POST', '/rdv/demander', { reference: t.ref }, carl.jeton);
  dire(perso.d.mode === 'messagerie', 'la seule pastille « temps libre » ne classe pas : messagerie', perso.d.mode);
  await poser(t.jeton, [fiche('ct_carl', carl, { categories: ['travail'] })]);
  const retour = await appel('POST', '/rdv/demander', { reference: t.ref }, carl.jeton);
  dire(retour.d.mode === 'creneaux', 'reclasse travail : de nouveau des creneaux', retour.d.mode);

  console.log('\nRendez-vous a plusieurs : meme regle :');
  const g1 = await appel('POST', '/rdv/groupe/proposer', { references: [t.ref], duree: 1 }, carl.jeton);
  dire(g1.code === 200 && g1.d.invites.length === 1, 'Carl (classe) peut consulter Tania', JSON.stringify(g1.d.invites));
  dire((g1.d.creneaux || []).every((c) => [9, 10, 11].includes(c.heure)), 'et les creneaux communs sont dans SES heures de travail', (g1.d.creneaux || []).map((c) => c.heure).join(','));
  const g2 = await appel('POST', '/rdv/groupe/proposer', { references: [t.ref], duree: 1 }, nora.jeton);
  dire(g2.d.invites.length === 0 && g2.d.sans_acces.length === 1, 'Nora (non classee) : « sans acces »', JSON.stringify(g2.d.sans_acces));
  const g3 = await appel('POST', '/rdv/groupe/proposer', { references: [t.ref], duree: 1 }, ines.jeton);
  dire(g3.d.sans_acces.length === 1, 'Ines (inconnue) : « sans acces », meme reponse', JSON.stringify(g3.d.sans_acces));

  console.log('\nÀ supprimer : ' + [t, nora, carl, fanny, bob, ines].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
