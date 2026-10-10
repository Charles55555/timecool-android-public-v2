// « Mon temps libre » = temps protégé, contre l'API réelle (comptes sonde jetables).
// À lancer APRÈS la mise en ligne de l'API : elle vérifie le serveur en production.
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(66)} ${detail === undefined ? '' : detail}`);
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
    email: 'sonde.libre' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Libre', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const dispo = (obj) => reglage('timecool_disponibilites', JSON.stringify(obj));
const TOUS = [1, 2, 3, 4, 5, 6, 7];
const fiche = (uid, p, extra) => ({ type: 'contact', uid, contenu: Object.assign({ id: uid, name: p.prenom + ' Libre', phone: p.tel, email: '', isTimeCool: true }, extra || {}) });

(async () => {
  const t = await inscrire('Tania');
  const normal = await inscrire('Nina');
  const autorise = await inscrire('Axel');
  dire(!!t.ref && !!normal.ref && !!autorise.ref, 'trois comptes sonde créés');

  // Tania : validation décochée, ses contacts réservent seuls. Nina est une fiche ordinaire ;
  // Nina est classee travail ; Axel aussi, et il porte la pastille « Même en temps libre ».
  await poser(t.jeton, [reglage('tc_rdv_validation', '0'), fiche('ct_nina', normal, { categories: ['travail'] }), fiche('ct_axel', autorise, { categories: ['travail', 'personnel'] })]);

  console.log('\nTravail 13h-19h, temps libre 13h-20h tous les jours : le temps libre gagne :');
  await poser(t.jeton, [dispo({ travail: [{ jours: TOUS, debut: '13:00', fin: '19:00' }], personnel: [{ jours: TOUS, debut: '13:00', fin: '20:00' }] })]);
  const d1 = await appel('POST', '/rdv/demander', { reference: t.ref }, normal.jeton);
  dire(d1.code === 200 && d1.d.mode === 'messagerie', 'Nina (fiche ordinaire) : aucun créneau, la demande va en messagerie', d1.d.mode);
  const d2 = await appel('POST', '/rdv/demander', { reference: t.ref }, autorise.jeton);
  dire(d2.d.mode === 'creneaux' && d2.d.creneaux.length === 3, 'Axel (« même en temps libre ») obtient des créneaux', d2.d.mode);
  dire((d2.d.creneaux || []).every((c) => c.heure >= 13 && c.heure <= 18), 'et ils tombent bien dans les plages de travail', (d2.d.creneaux || []).map((c) => c.heure).join(','));

  console.log('\nTravail 9h-19h, temps libre 13h-20h : seules 9h à 12h restent pour Nina :');
  await poser(t.jeton, [dispo({ travail: [{ jours: TOUS, debut: '09:00', fin: '19:00' }], personnel: [{ jours: TOUS, debut: '13:00', fin: '20:00' }] })]);
  const d3 = await appel('POST', '/rdv/demander', { reference: t.ref }, normal.jeton);
  dire(d3.d.mode === 'creneaux' && d3.d.creneaux.length === 3, 'Nina obtient des créneaux', d3.d.mode);
  dire((d3.d.creneaux || []).every((c) => c.heure >= 9 && c.heure <= 11), 'tous avant 12h : jamais dans le temps libre', (d3.d.creneaux || []).map((c) => c.heure).join(','));

  console.log('\nLe temps libre grandit entre la proposition et le choix : refus neutre :');
  await poser(t.jeton, [dispo({ travail: [{ jours: TOUS, debut: '09:00', fin: '19:00' }], personnel: [{ jours: TOUS, debut: '00:00', fin: '23:59' }] })]);
  const c1 = await appel('POST', '/rdv/choisir', { rdv: d3.d.rdv, rang: 1 }, normal.jeton);
  dire(c1.code === 409, 'Nina : créneau devenu protégé, refusé comme un créneau pris', 'HTTP ' + c1.code);
  const d4 = await appel('POST', '/rdv/demander', { reference: t.ref }, autorise.jeton);
  dire(d4.d.mode === 'creneaux', 'Axel obtient toujours des créneaux (contact autorisé)', d4.d.mode);
  const c2 = await appel('POST', '/rdv/choisir', { rdv: d4.d.rdv, rang: 1 }, autorise.jeton);
  dire(c2.code === 200, 'et peut confirmer : son rendez-vous s\'inscrit', 'HTTP ' + c2.code);

  console.log('\nTemps libre vide = rien de protégé :');
  await poser(t.jeton, [dispo({ travail: [{ jours: TOUS, debut: '09:00', fin: '19:00' }], personnel: [] })]);
  const d5 = await appel('POST', '/rdv/demander', { reference: t.ref }, normal.jeton);
  dire(d5.d.mode === 'creneaux' && (d5.d.creneaux || []).length === 3, 'Nina obtient de nouveau des créneaux', d5.d.mode);

  console.log('\nÀ supprimer : ' + [t, normal, autorise].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
