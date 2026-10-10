// « Savoir qui m'écrit » contre l'API réelle (comptes sonde jetables).
// À lancer APRÈS la mise en ligne de l'API : elle vérifie le serveur en production.
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(72)} ${detail === undefined ? '' : detail}`);
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
  const email = 'sonde.qui' + Date.now() + n + '@exemple-timecool.fr';
  const r = await appel('POST', '/inscription', {
    email, telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Quiecrit', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, email, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
const demandeDe = (conv) => conv && conv.contenu.thread.find((m) => m.genre === 'demande_rdv');
const jourOuvre = (plus) => { const d = new Date(Date.now() + plus * 86400000); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

(async () => {
  const t = await inscrire('Tania');
  const inconnue = await inscrire('Ines');
  const connue = await inscrire('Camille');
  const refusee = await inscrire('Rita');
  dire([t, inconnue, connue, refusee].every((c) => !!c.ref), 'quatre comptes sonde crees');
  await poser(t.jeton, [{ type: 'contact', uid: 'ct_camille', contenu: { id: 'ct_camille', name: 'Camille Quiecrit', phone: connue.tel, email: '', isTimeCool: true } }]);

  console.log('\nUne inconnue demande un rendez-vous :');
  const d1 = await appel('POST', '/rdv/demander', { reference: t.ref }, inconnue.jeton);
  dire(d1.code === 200 && d1.d.mode === 'messagerie', 'la demande part dans la messagerie', d1.d.mode);
  const chezT = await conversation(t.jeton, inconnue.ref);
  const ligneT = demandeDe(chezT);
  dire(!!ligneT && !!ligneT.demandeur, 'chez Tania, la demande porte le champ « demandeur »');
  dire(ligneT && ligneT.demandeur.prenom === 'Ines' && ligneT.demandeur.nom === 'Quiecrit', 'prenom et nom', ligneT && ligneT.demandeur.prenom + ' ' + ligneT.demandeur.nom);
  dire(ligneT && ligneT.demandeur.telephone === inconnue.tel && ligneT.demandeur.email === inconnue.email, 'telephone et email d inscription', ligneT && ligneT.demandeur.telephone);
  dire(ligneT && /^\d{4}-\d{2}-\d{2}T/.test(ligneT.demandeur.cree_le || ''), 'et la date d inscription (« sur TimeCool depuis le »)', ligneT && ligneT.demandeur.cree_le);
  dire(ligneT && /^Salut Tania 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool\. Tu me proposes un créneau \? Merci !$/.test(ligneT.texte), 'le nouveau texte de la demande', ligneT && ligneT.texte.slice(0, 50));
  const chezI = await elements(inconnue.jeton);
  const brutI = JSON.stringify(chezI);
  dire(!brutI.includes(t.tel) && !brutI.includes(t.email), 'la demandeuse ne recoit RIEN sur Tania (ni telephone ni email)');
  const ligneI = (chezI.find((e) => e.type === 'conversation' && e.uid === t.ref) || { contenu: { thread: [] } }).contenu.thread[0];
  dire(ligneI && !('demandeur' in ligneI), 'et son exemplaire du message n a pas de champ « demandeur »');

  console.log('\nUne personne deja dans le carnet demande :');
  await appel('POST', '/rdv/demander', { reference: t.ref }, connue.jeton);
  const ligneC = demandeDe(await conversation(t.jeton, connue.ref));
  dire(!!ligneC && !('demandeur' in ligneC), 'pas de « demandeur » : pas de carte pour un contact enregistre');

  console.log('\nTania propose un creneau a l inconnue :');
  await poser(t.jeton, [reglage('tc_rdv_validation', '1')]);
  const jour = jourOuvre(3);
  const ok = await appel('POST', '/rdv/proposer-creneau', { rdv: d1.d.rdv, date: jour, debut: '15:00', duree: 60 }, t.jeton);
  dire(ok.code === 200, 'le creneau est confirme', 'HTTP ' + ok.code);
  const elT = await elements(t.jeton);
  const fiches = elT.filter((e) => e.type === 'contact' && e.contenu.referenceCompte === inconnue.ref);
  dire(fiches.length === 1, 'une fiche est creee chez Tania pour Ines (une seule)', fiches.length);
  const f = fiches[0] && fiches[0].contenu;
  dire(f && f.name === 'Ines Quiecrit' && f.phone === inconnue.tel && f.email === inconnue.email, 'avec son nom, son telephone et son email', f && f.name);
  dire(f && f.isTimeCool === true && !('categories' in f) && !f.blocked, 'inscrite TimeCool, sans categorie, non bloquee', JSON.stringify(f));
  const rdv = elT.find((e) => e.type === 'rdv' && e.uid === 'tc_rdv_' + d1.d.rdv);
  dire(rdv && f && rdv.contenu.contact === f.id, 'le rendez-vous est rattache a cette fiche', rdv && rdv.contenu.contact);
  const d2 = await appel('POST', '/rdv/demander', { reference: t.ref }, inconnue.jeton);
  dire(d2.d.mode === 'messagerie', 'sans categorie, elle reste en messagerie pour la suite (voulu)', d2.d.mode);
  const ligneI2 = demandeDe(await conversation(t.jeton, inconnue.ref));
  dire(!ligneI2 || !('demandeur' in ligneI2) || ligneI2.traite === true, 'et plus de carte : elle est dans les contacts');

  console.log('\nProposer un creneau a une personne DEJA dans le carnet ne cree pas de doublon :');
  const dc = await appel('POST', '/rdv/demander', { reference: t.ref }, connue.jeton);
  const okc = await appel('POST', '/rdv/proposer-creneau', { rdv: dc.d.rdv, date: jourOuvre(5), debut: '11:00', duree: 60 }, t.jeton);
  dire(okc.code === 200, 'creneau confirme', 'HTTP ' + okc.code);
  const fichesC = (await elements(t.jeton)).filter((e) => e.type === 'contact' && (e.contenu.phone === connue.tel || e.contenu.referenceCompte === connue.ref));
  dire(fichesC.length === 1, 'une seule fiche pour Camille', fichesC.length);

  console.log('\n« Refuser et bloquer » n ajoute pas la personne comme un contact ordinaire :');
  const dr = await appel('POST', '/rdv/demander', { reference: t.ref }, refusee.jeton);
  const refus = await appel('POST', '/rdv/refuser', { rdv: dr.d.rdv }, t.jeton);
  dire(refus.code === 200, 'refus accepte', 'HTTP ' + refus.code);
  const fr = (await elements(t.jeton)).filter((e) => e.type === 'contact' && e.contenu.referenceCompte === refusee.ref);
  dire(fr.length === 1 && fr[0].contenu.blocked === true && fr[0].contenu.phone === '' && fr[0].contenu.email === '', 'sa fiche est bloquee, sans telephone ni email', JSON.stringify(fr.map((x) => x.contenu.phone)));

  console.log('\nÀ supprimer : ' + [t, inconnue, connue, refusee].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
