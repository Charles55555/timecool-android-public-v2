// Mission 24 (Charles, 12/10) : « Refuser » simple, contre l API (TC_API = copie locale par api-locale.sh, comptes
// sonde jetables e2erdv.refus…). Refus avec bloquer:false -> HTTP 200, statut refuse, PAS de fiche bloquee, le demandeur
// recoit « [Prénom] ne peut pas donner suite à ta demande pour le moment. », il peut redemander (la demande arrive) ;
// sans champ : refus ET blocage, comme avant ; bloquer:'oui' -> 400.
const API = process.env.TC_API || 'https://api.timecool.fr';

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
  const tel = '+336' + String(Date.now() + n * 139).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.refus' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Refus', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
const jourOuvre = (plus) => { const d = new Date(Date.now() + plus * 86400000); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

(async () => {
  const brigitte = await inscrire('Brigitte');
  const damien = await inscrire('Damien');
  dire(!!brigitte.ref && !!damien.ref, 'deux comptes sonde créés');

  console.log('\nDamien demande, Brigitte refuse SANS bloquer :');
  const d1 = await appel('POST', '/rdv/demander', { reference: brigitte.ref }, damien.jeton);
  dire(d1.code === 200 && typeof d1.d.rdv === 'number', 'Damien (inconnu) : demande en messagerie', d1.d && d1.d.mode);
  const mauvais = await appel('POST', '/rdv/refuser', { rdv: d1.d.rdv, bloquer: 'oui' }, brigitte.jeton);
  dire(mauvais.code === 400 && mauvais.d && mauvais.d.erreur === 'champ_invalide', 'bloquer:"oui" → 400 champ_invalide, rien n est fait', mauvais.code + ' ' + (mauvais.d && mauvais.d.erreur));
  const refus = await appel('POST', '/rdv/refuser', { rdv: d1.d.rdv, bloquer: false }, brigitte.jeton);
  dire(refus.code === 200, 'refus simple : HTTP 200', 'HTTP ' + refus.code);
  const fiche = (await elements(brigitte.jeton)).find((e) => e.type === 'contact' && e.contenu.referenceCompte === damien.ref && e.contenu.blocked === true);
  dire(!fiche, 'aucune fiche bloquée chez Brigitte');
  const chezDamien = await conversation(damien.jeton, brigitte.ref);
  const mots = chezDamien ? chezDamien.contenu.thread.map((m) => m.texte || m.text || '') : [];
  dire(mots.some((t) => t === 'Brigitte ne peut pas donner suite à ta demande pour le moment.'), 'Damien reçoit « Brigitte ne peut pas donner suite à ta demande pour le moment. »', JSON.stringify(mots).slice(0, 160));
  const convB = await conversation(brigitte.jeton, damien.ref);
  dire(convB && convB.contenu.thread.filter((m) => m.genre === 'demande_rdv' && !m.traite).length === 0, 'chez Brigitte, la carte est traitée (plus de demande en attente)');
  const prop = await appel('POST', '/rdv/proposer-creneau', { rdv: d1.d.rdv, date: jourOuvre(3), debut: '10:00', duree: 60 }, brigitte.jeton);
  dire(prop.code === 404, 'la demande refusée est close (404 sur « proposer un créneau »)', 'HTTP ' + prop.code);
  const encore = await appel('POST', '/rdv/refuser', { rdv: d1.d.rdv, bloquer: false }, brigitte.jeton);
  dire(encore.code === 404, 'un second refus de la même demande : 404 (déjà traitée)', 'HTTP ' + encore.code);

  console.log('\nDamien n est pas bloqué : il peut redemander, et la demande ARRIVE :');
  const d2 = await appel('POST', '/rdv/demander', { reference: brigitte.ref }, damien.jeton);
  dire(d2.code === 200 && typeof d2.d.rdv === 'number' && d2.d.rdv !== d1.d.rdv, 'nouvelle demande acceptée (nouvel identifiant)', d2.d && d2.d.rdv);
  const convB2 = await conversation(brigitte.jeton, damien.ref);
  dire(convB2 && convB2.contenu.thread.some((m) => m.genre === 'demande_rdv' && !m.traite && m.rdv === d2.d.rdv), 'chez Brigitte : une carte à traiter pour cette nouvelle demande');

  console.log('\nSans le champ : refus ET blocage, comme avant :');
  const refus2 = await appel('POST', '/rdv/refuser', { rdv: d2.d.rdv }, brigitte.jeton);
  dire(refus2.code === 200, 'HTTP 200', 'HTTP ' + refus2.code);
  const fiche2 = (await elements(brigitte.jeton)).find((e) => e.type === 'contact' && e.contenu.referenceCompte === damien.ref && e.contenu.blocked === true);
  dire(!!fiche2, 'cette fois la fiche bloquée existe chez Brigitte', fiche2 && fiche2.uid);
  const chezDamien2 = await conversation(damien.jeton, brigitte.ref);
  const nMsg = (chezDamien2 ? chezDamien2.contenu.thread : []).filter((t) => (t.texte || t.text || '') === 'Brigitte ne peut pas donner suite à ta demande pour le moment.').length;
  dire(nMsg === 1, 'aucun nouveau message de refus chez Damien (le blocage est silencieux)', nMsg);

  console.log('\nComptes sonde à supprimer au lancement : ' + [brigitte, damien].map((c) => c.ref).join(', '));
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('ERREUR ' + e.message); process.exit(1); });
