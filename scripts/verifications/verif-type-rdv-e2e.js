// Le TYPE d'un rendez-vous contre l'API reelle (comptes sonde jetables).
// À lancer APRÈS la migration 010 et la mise en ligne de l'API.
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
  const r = await appel('POST', '/inscription', {
    email: 'sonde.type' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Typerdv', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
const jourOuvre = (plus) => { const d = new Date(Date.now() + plus * 86400000); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const rdvDe = (els, id) => els.find((e) => e.type === 'rdv' && e.uid === 'tc_rdv_' + id);
const derniers = (conv) => (conv ? conv.contenu.thread : []).map((m) => m.texte);

(async () => {
  const t = await inscrire('Tania');
  const a = await inscrire('Alice');   // demande par telephone
  const b = await inscrire('Bruno');   // demande sans type
  const c = await inscrire('Carla');   // type du titulaire different de la demande
  const d = await inscrire('Dora');    // contact classe, rendez-vous direct
  dire([t, a, b, c, d].every((x) => !!x.ref), 'cinq comptes sonde crees');

  console.log('\nAlice demande « par téléphone » :');
  const da = await appel('POST', '/rdv/demander', { reference: t.ref, type: 'telephone' }, a.jeton);
  dire(da.code === 200 && da.d.mode === 'messagerie', 'la demande part dans la messagerie', da.d.mode);
  const convTa = await conversation(t.jeton, a.ref);
  const ligne = convTa && convTa.contenu.thread.find((m) => m.genre === 'demande_rdv');
  dire(ligne && ligne.type === 'telephone', 'chez Tania, la ligne du message porte type = « telephone »', ligne && ligne.type);
  dire(ligne && /^Salut Tania 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool, par téléphone\. Tu me proposes un créneau \? Merci !$/.test(ligne.texte), 'et le texte dit « par téléphone »', ligne && ligne.texte.slice(0, 80));
  const convAt = await conversation(a.jeton, t.ref);
  dire(convAt && /par téléphone/.test(convAt.contenu.thread[0].texte), 'Alice relit sa propre demande avec « par téléphone »');
  const jour = jourOuvre(3);
  const pa = await appel('POST', '/rdv/proposer-creneau', { rdv: da.d.rdv, date: jour, debut: '15:00', duree: 60 }, t.jeton);
  dire(pa.code === 200, 'Tania propose un créneau SANS préciser le type (celui de la demande reste)', 'HTTP ' + pa.code);
  dire(pa.d && pa.d.type === 'telephone', 'la réponse rend le type retenu', pa.d && pa.d.type);
  const elT = await elements(t.jeton), elA = await elements(a.jeton);
  dire(rdvDe(elT, da.d.rdv) && rdvDe(elT, da.d.rdv).contenu.type === 'telephone', 'chez Tania, le rendez-vous porte type = « telephone »');
  dire(rdvDe(elA, da.d.rdv) && rdvDe(elA, da.d.rdv).contenu.type === 'telephone', 'chez Alice aussi (les DEUX agendas)');
  const confA = derniers(await conversation(a.jeton, t.ref)).find((x) => /Rendez-vous confirmé/.test(x));
  dire(/^Rendez-vous confirmé par téléphone : \S+ \d+ \S+ à \d{2}h\d{2}\.$/.test(confA || ''), '« Rendez-vous confirmé par téléphone : … à 15h00. »', confA);

  console.log('\nBruno demande sans rien préciser :');
  const db = await appel('POST', '/rdv/demander', { reference: t.ref }, b.jeton);
  const ligneB = ((await conversation(t.jeton, b.ref)) || { contenu: { thread: [] } }).contenu.thread.find((m) => m.genre === 'demande_rdv');
  dire(ligneB && !('type' in ligneB) && /sur TimeCool\. Tu me proposes un créneau/.test(ligneB.texte), 'pas de type, le texte d avant', ligneB && ligneB.texte.slice(0, 70));
  const pb = await appel('POST', '/rdv/proposer-creneau', { rdv: db.d.rdv, date: jourOuvre(4), debut: '10:00', duree: 60 }, t.jeton);
  dire(pb.code === 200 && !rdvDe(await elements(t.jeton), db.d.rdv).contenu.type, 'le rendez-vous est écrit sans type (= en personne partout, rien d inventé)');
  const confB = derniers(await conversation(b.jeton, t.ref)).find((x) => /Rendez-vous confirmé/.test(x));
  dire(/^Rendez-vous confirmé : /.test(confB || ''), 'et la confirmation est celle d avant', confB);

  console.log('\nCarla demande « en personne », Tania répond « en visio » :');
  const dc = await appel('POST', '/rdv/demander', { reference: t.ref, type: 'physique' }, c.jeton);
  const pc = await appel('POST', '/rdv/proposer-creneau', { rdv: dc.d.rdv, date: jourOuvre(5), debut: '11:00', duree: 60, type: 'visio' }, t.jeton);
  dire(pc.code === 200 && pc.d.type === 'visio', 'le choix du titulaire prime', pc.d && pc.d.type);
  const elC = await elements(c.jeton);
  dire(rdvDe(elC, dc.d.rdv) && rdvDe(elC, dc.d.rdv).contenu.type === 'visio' && rdvDe(await elements(t.jeton), dc.d.rdv).contenu.type === 'visio', 'écrit « visio » dans les deux agendas');
  dire(/^Rendez-vous confirmé en visio : /.test(derniers(await conversation(c.jeton, t.ref)).find((x) => /Rendez-vous confirmé/.test(x)) || ''), '« Rendez-vous confirmé en visio : … »');

  console.log('\nUn type invalide est ignoré :');
  const di = await appel('POST', '/rdv/demander', { reference: t.ref, type: 'skype' }, (await inscrire('Ivan')).jeton);
  dire(di.code === 200, 'la demande passe', 'HTTP ' + di.code);
  const refI = (await elements(t.jeton)).filter((e) => e.type === 'conversation').map((e) => e.contenu.thread.find((m) => m.genre === 'demande_rdv')).filter((m) => m && /Ivan/.test(JSON.stringify(m.demandeur || {})))[0];
  dire(refI && !('type' in refI), 'et ne laisse aucun type');

  console.log('\nRendez-vous direct (contact classé, validation décochée) : le type suit /rdv/choisir :');
  const dispo = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] };
  await poser(t.jeton, [reglage('tc_rdv_validation', '0'), reglage('timecool_disponibilites', JSON.stringify(dispo)),
    { type: 'contact', uid: 'ct_dora', contenu: { id: 'ct_dora', name: 'Dora Typerdv', phone: d.tel, email: '', categories: ['travail'], isTimeCool: true } }]);
  const dd = await appel('POST', '/rdv/demander', { reference: t.ref, type: 'visio' }, d.jeton);
  dire(dd.d.mode === 'creneaux', 'Dora (classée) obtient des créneaux', dd.d.mode);
  const ch = await appel('POST', '/rdv/choisir', { rdv: dd.d.rdv, rang: 1 }, d.jeton);
  dire(ch.code === 200, 'elle en choisit un', 'HTTP ' + ch.code);
  const elD = await elements(d.jeton);
  dire(rdvDe(elD, dd.d.rdv) && rdvDe(elD, dd.d.rdv).contenu.type === 'visio' && rdvDe(await elements(t.jeton), dd.d.rdv).contenu.type === 'visio', 'le type de la demande est écrit chez les DEUX');
  dire(/^Rendez-vous confirmé en visio : /.test(derniers(await conversation(t.jeton, d.ref)).find((x) => /Rendez-vous confirmé/.test(x)) || ''), 'et dit dans la confirmation');

  console.log('\nRendez-vous à plusieurs : « physique » par défaut, le type dans le corps :');
  const g1 = await appel('POST', '/rdv/groupe/proposer', { references: [t.ref], duree: 1 }, d.jeton);
  dire(g1.code === 200 && g1.d.type === 'physique', 'sans type : « physique »', g1.d.type);
  const g2 = await appel('POST', '/rdv/groupe/proposer', { references: [t.ref], duree: 1, type: 'telephone' }, d.jeton);
  dire(g2.d.type === 'telephone', 'avec « telephone » : repris', g2.d.type);
  const cr = (g2.d.creneaux || [])[0];
  if (cr) {
    const gc = await appel('POST', '/rdv/groupe/confirmer', { references: [t.ref], date: cr.date, heure: cr.heure, duree: 1, type: 'telephone' }, d.jeton);
    dire(gc.code === 200 && gc.d.type === 'telephone', 'confirmé en « telephone »', 'HTTP ' + gc.code);
    const evs = (await elements(t.jeton)).filter((e) => e.type === 'rdv' && e.uid.startsWith('tc_grp_'));
    dire(evs.length === 1 && evs[0].contenu.type === 'telephone', 'le rendez-vous de groupe porte le type chez Tania');
    dire(/^Rendez-vous confirmé par téléphone : /.test(derniers(await conversation(t.jeton, d.ref)).find((x) => /Rendez-vous confirmé/.test(x) && /par téléphone/.test(x)) || ''), 'et le message le dit');
  } else {
    dire(false, 'un créneau commun était attendu pour le test de groupe');
  }

  console.log('\nÀ supprimer : ' + [t, a, b, c, d].map((x) => x.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
