// Mission 12 : message d absence contre une API reelle (TC_API=http://127.0.0.1:8099 via api-locale.sh, ou l API en ligne
// une fois deployee). Comptes jetables e2erdv.absence…@exemple-timecool.fr.
//   Alice est absente (reglage tc_absence synchronise, periode en cours) : Bob lui ecrit → il recoit le message d absence
//   une fois ; il ecrit encore, demande un rendez-vous → toujours une seule fois ; le message de Bob et sa demande sont
//   bien arrives chez Alice (rien n est bloque) ; relais → phrase urgence ; Carl (nouveau) → une fois pour lui aussi ;
//   periode terminee → plus rien ; fiche « Dr » → vouvoiement.
const API = process.env.TC_API || 'https://api.timecool.fr';   // TC_API : une copie locale de l API (php -S)

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
    email: 'e2erdv.absence' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Absence', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
const absencesRecues = async (jeton, ref) => { const c = await conversation(jeton, ref); return c ? c.contenu.thread.filter((m) => m.genre === 'absence' && m.from === 'them') : []; };
const iso = (d) => d.toISOString().slice(0, 10);
const jour = (n) => iso(new Date(Date.now() + n * 86400000));

(async () => {
  const alice = await inscrire('Alice');
  const bob = await inscrire('Bob');
  const carl = await inscrire('Carl');
  dire(!!alice.ref && !!bob.ref && !!carl.ref, 'trois comptes sonde créés');

  console.log('\nAlice part : réglage tc_absence (en cours), sans relais :');
  await poser(alice.jeton, [reglage('tc_absence', JSON.stringify({ actif: true, debut: jour(-1), fin: jour(2) }))]);
  const m1 = await appel('POST', '/messages/envoyer', { reference: alice.ref, texte: 'Salut Alice, tu es là ?' }, bob.jeton);
  dire(m1.code === 200, 'Bob lui écrit', 'HTTP ' + m1.code);
  let recues = await absencesRecues(bob.jeton, alice.ref);
  dire(recues.length === 1 && /^Bonjour Bob, je suis absent\(e\) du .+ au .+\. Je te recontacte à mon retour\.$/.test(recues[0].texte), 'Bob reçoit le message d absence (tu, sans phrase urgence), une fois', recues[0] && recues[0].texte);
  const chezAlice = await conversation(alice.jeton, bob.ref);
  dire(chezAlice && chezAlice.contenu.thread.some((m) => m.from === 'them' && /tu es là/.test(m.texte)), 'le message de Bob est bien arrivé chez Alice (rien n est bloqué)');
  dire(chezAlice && chezAlice.contenu.thread.some((m) => m.from === 'me' && m.genre === 'absence'), 'et sa réponse d absence est dans SA conversation (la trace « une fois »)');

  console.log('\nBob insiste, puis demande un rendez-vous :');
  await appel('POST', '/messages/envoyer', { reference: alice.ref, texte: 'Réponds-moi stp' }, bob.jeton);
  const d1 = await appel('POST', '/rdv/demander', { reference: alice.ref }, bob.jeton);
  dire(d1.code === 200 && d1.d.mode === 'messagerie', 'la demande de rendez-vous suit son chemin normal', d1.d && d1.d.mode);
  recues = await absencesRecues(bob.jeton, alice.ref);
  dire(recues.length === 1, 'toujours UN SEUL message d absence pour Bob', recues.length);
  const convA2 = await conversation(alice.jeton, bob.ref);
  dire(convA2 && convA2.contenu.thread.some((m) => m.genre === 'demande_rdv' && !m.traite), 'la demande est arrivée chez Alice (carte à traiter)');

  console.log('\nUn relais, et Carl (nouveau, fiche « Dr ») :');
  await poser(alice.jeton, [
    reglage('tc_absence', JSON.stringify({ actif: true, debut: jour(-1), fin: jour(2), relaisNom: 'Marie Dupont', relaisTel: '06 12 34 56 78' })),
    { type: 'contact', uid: 'ct_carl', contenu: { id: 'ct_carl', name: 'Dr Carl Absence', phone: carl.tel, email: '', isTimeCool: true } },
  ]);
  await appel('POST', '/messages/envoyer', { reference: alice.ref, texte: 'Bonjour, c est Carl' }, carl.jeton);
  const rc = await absencesRecues(carl.jeton, alice.ref);
  dire(rc.length === 1 && /contactez Marie Dupont au 06 12 34 56 78\. Je vous recontacte/.test(rc[0].texte), 'Carl (Dr) reçoit la version vouvoyée, avec le relais', rc[0] && rc[0].texte);
  dire((await absencesRecues(bob.jeton, alice.ref)).length === 1, 'Bob n en reçoit pas un second (même période)');

  console.log('\nLa période se termine :');
  await poser(alice.jeton, [reglage('tc_absence', JSON.stringify({ actif: true, debut: jour(-5), fin: jour(-1) }))]);
  const dave = await inscrire('Dave');
  await appel('POST', '/messages/envoyer', { reference: alice.ref, texte: 'Hello' }, dave.jeton);
  dire((await absencesRecues(dave.jeton, alice.ref)).length === 0, 'période terminée : Dave ne reçoit rien (l interrupteur reste tel quel)');
  await poser(alice.jeton, [reglage('tc_absence', JSON.stringify({ actif: false, debut: jour(-1), fin: jour(2) }))]);
  await appel('POST', '/messages/envoyer', { reference: alice.ref, texte: 'Hello encore' }, dave.jeton);
  dire((await absencesRecues(dave.jeton, alice.ref)).length === 0, 'interrupteur coupé : rien');
  const agendaAlice = (await elements(alice.jeton)).filter((e) => e.type === 'rdv');
  dire(agendaAlice.length === 0, 'aucun bloc dans l agenda d Alice : seulement le message');

  console.log('\nÀ supprimer : ' + [alice, bob, carl, dave].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
