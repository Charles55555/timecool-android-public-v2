// Mission 27b (12/10) : convocations de groupe REELLES et messages d'un bloqué retenus, contre l'API (comptes sonde
// jetables e2erdv.convoc…). À lancer sur api-locale (TC_API=http://127.0.0.1:8099) tant que la migration 012 n'est pas
// jouée en production, puis contre la prod après la mise en ligne de l'API.
const API = process.env.TC_API || 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(74)} ${detail === undefined ? '' : detail}`);
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
  const tel = '+336' + String(Date.now() + n * 977).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.convoc' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Convoc', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);
const jourPlus = (k) => { const d = new Date(Date.now() + k * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  const orga = await inscrire('Olivia');
  const paul = await inscrire('Paul');
  const rita = await inscrire('Rita');
  dire(!!orga.ref && !!paul.ref && !!rita.ref, 'trois comptes sonde créés');

  console.log('\nEnvoi de la convocation :');
  const jour = jourPlus(3);
  const c = await appel('POST', '/convocations', { titre: 'Entraînement', groupe: 'Équipe', date: jour, debut: '18:00', fin: '19:00', references: [paul.ref, rita.ref, 'INCONNU000', orga.ref] }, orga.jeton);
  dire(c.code === 200 && c.d && typeof c.d.id === 'number', 'HTTP 200, un numéro de convocation', 'HTTP ' + c.code + ' ' + JSON.stringify(c.d).slice(0, 200));
  const id = c.d && c.d.id;
  dire(c.d && Array.isArray(c.d.envoyes) && c.d.envoyes.length === 2 && c.d.envoyes.map((e) => e.reference).sort().join() === [paul.ref, rita.ref].sort().join(), 'envoyée à Paul et Rita (l’organisateur ne compte pas)', JSON.stringify(c.d && c.d.envoyes));
  dire(c.d && Array.isArray(c.d.sans_compte) && c.d.sans_compte.join() === 'INCONNU000', 'la référence inconnue est rendue dans sans_compte', JSON.stringify(c.d && c.d.sans_compte));
  dire(c.d && /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d{1,2} [a-zéû]+ de 18:00 à 19:00$/.test(c.d.quand), 'date en clair « jeudi 15 octobre de 18:00 à 19:00 »', c.d && c.d.quand);

  const convPaul = await conversation(paul.jeton, orga.ref);
  const ligne = convPaul && convPaul.contenu.thread.find((m) => m.genre === 'convocation');
  dire(!!ligne && ligne.from === 'them' && ligne.convocation === id && ligne.statut === 'attente' && ligne.titre === 'Entraînement' && /Convocation « Entraînement »/.test(ligne.texte), 'Paul : une ligne « convocation » dans sa messagerie, statut attente', JSON.stringify(ligne).slice(0, 200));

  console.log('\nLes réponses :');
  const rp = await appel('POST', '/convocations/repondre', { convocation: id, statut: 'present' }, paul.jeton);
  dire(rp.code === 200 && rp.d && rp.d.statut === 'present', 'Paul répond présent → 200', 'HTTP ' + rp.code);
  const convPaul2 = await conversation(paul.jeton, orga.ref);
  const ligne2 = convPaul2.contenu.thread.find((m) => m.genre === 'convocation');
  dire(ligne2 && ligne2.statut === 'present' && ligne2.traite === true, 'chez Paul la ligne est marquée présent et traitée (plus de boutons)', JSON.stringify({ statut: ligne2 && ligne2.statut, traite: ligne2 && ligne2.traite }));
  const convOrga = await conversation(orga.jeton, paul.ref);
  const retour = convOrga && convOrga.contenu.thread.find((m) => m.genre === 'convocation_reponse');
  dire(!!retour && retour.from === 'them' && retour.statut === 'present' && /Paul sera présent/.test(retour.texte), 'l’organisateur reçoit « ✅ Paul sera présent : « Entraînement », jeudi … »', retour && retour.texte);
  const ra = await appel('POST', '/convocations/repondre', { convocation: id, statut: 'absent' }, rita.jeton);
  dire(ra.code === 200, 'Rita répond absente → 200', 'HTTP ' + ra.code);
  const etat = await appel('POST', '/convocations/etat', { convocation: id }, orga.jeton);
  const parRef = {}; (etat.d && etat.d.membres || []).forEach((m) => { parRef[m.reference] = m.statut; });
  dire(etat.code === 200 && parRef[paul.ref] === 'present' && parRef[rita.ref] === 'absent' && etat.d.titre === 'Entraînement' && etat.d.debut === '18:00', 'l’état chez l’organisateur : Paul présent, Rita absente', JSON.stringify(parRef));

  console.log('\nCe qui est refusé :');
  const pasMembre = await inscrire('Zoe');
  const r1 = await appel('POST', '/convocations/repondre', { convocation: id, statut: 'present' }, pasMembre.jeton);
  dire(r1.code === 404 && r1.d && r1.d.erreur === 'convocation_introuvable', 'un non-membre ne peut pas répondre → 404', 'HTTP ' + r1.code);
  const r2 = await appel('POST', '/convocations/etat', { convocation: id }, paul.jeton);
  dire(r2.code === 404, 'un membre ne lit pas l’état (organisateur seul) → 404', 'HTTP ' + r2.code);
  const r3 = await appel('POST', '/convocations/repondre', { convocation: id, statut: 'peut-etre' }, paul.jeton);
  dire(r3.code === 400 && r3.d && r3.d.erreur === 'reponse_invalide', 'statut inconnu → 400', 'HTTP ' + r3.code);
  const r4 = await appel('POST', '/convocations', { titre: 'X', date: jour, debut: '19:00', fin: '18:00', references: [paul.ref] }, orga.jeton);
  dire(r4.code === 400 && r4.d && r4.d.erreur === 'horaire_invalide', 'fin avant début → 400 horaire_invalide', 'HTTP ' + r4.code);
  const r5 = await appel('POST', '/convocations', { titre: 'X', date: '2020-01-01', debut: '10:00', fin: '11:00', references: [paul.ref] }, orga.jeton);
  dire(r5.code === 400, 'jour passé → 400', 'HTTP ' + r5.code);
  const r6 = await appel('POST', '/convocations', { date: jour, debut: '10:00', fin: '11:00', references: [paul.ref] }, orga.jeton);
  dire(r6.code === 400, 'sans titre → 400', 'HTTP ' + r6.code);
  const r7 = await appel('POST', '/convocations', { titre: 'X', date: jour, debut: '10:00', fin: '11:00' });
  dire(r7.code === 401, 'sans session → 401', 'HTTP ' + r7.code);

  console.log('\nUn bloqué ne peut plus écrire (retenu en silence) :');
  // Zoe demande un rendez-vous à Rita ; Rita refuse et bloque ; Zoe lui écrit : 200 pour Zoe, rien chez Rita.
  const dem = await appel('POST', '/rdv/demander', { reference: rita.ref }, pasMembre.jeton);
  dire(dem.code === 200 && typeof dem.d.rdv === 'number', 'Zoé demande un rendez-vous à Rita (messagerie)', 'HTTP ' + dem.code);
  const refus = await appel('POST', '/rdv/refuser', { rdv: dem.d.rdv }, rita.jeton);
  dire(refus.code === 200, 'Rita refuse et bloque', 'HTTP ' + refus.code);
  const avant = JSON.stringify((await conversation(rita.jeton, pasMembre.ref) || { contenu: { thread: [] } }).contenu.thread);
  const env = await appel('POST', '/messages/envoyer', { reference: rita.ref, texte: 'Coucou, tu es là ?' }, pasMembre.jeton);
  dire(env.code === 200, 'Zoé (bloquée) écrit à Rita : 200 pour elle', 'HTTP ' + env.code);
  const apres = JSON.stringify((await conversation(rita.jeton, pasMembre.ref) || { contenu: { thread: [] } }).contenu.thread);
  dire(avant === apres, 'chez Rita : rien, aucun nouveau message', apres.slice(-120));
  const chezZoe = await conversation(pasMembre.jeton, rita.ref);
  dire(!!chezZoe && chezZoe.contenu.thread.some((m) => m.from === 'me' && m.texte === 'Coucou, tu es là ?'), 'chez Zoé : son message apparaît comme envoyé (elle ne sait rien)');
  // Un membre qui a BLOQUÉ l'organisateur ne reçoit pas sa convocation (rien chez lui, en silence) : Zoé bloque Rita, puis Rita la convoque.
  const dem2 = await appel('POST', '/rdv/demander', { reference: pasMembre.ref }, rita.jeton);
  const refus2 = await appel('POST', '/rdv/refuser', { rdv: dem2.d && dem2.d.rdv }, pasMembre.jeton);
  dire(dem2.code === 200 && refus2.code === 200, 'Zoé bloque Rita (refuse et bloque sa demande)', 'HTTP ' + dem2.code + ' / ' + refus2.code);
  const c2 = await appel('POST', '/convocations', { titre: 'Réunion', date: jour, debut: '09:00', fin: '10:00', references: [pasMembre.ref] }, rita.jeton);
  const chezZoe2 = await conversation(pasMembre.jeton, rita.ref);
  dire(c2.code === 200 && c2.d.envoyes.length === 1 && !(chezZoe2 && chezZoe2.contenu.thread.some((m) => m.genre === 'convocation')), 'Rita convoque Zoé, qui l’a bloquée : 200 pour Rita, rien chez Zoé', JSON.stringify(c2.d).slice(0, 120));
  const chezRita2 = await conversation(rita.jeton, pasMembre.ref);
  dire(!!chezRita2 && chezRita2.contenu.thread.some((m) => m.from === 'me' && m.genre === 'convocation'), 'chez Rita : la convocation apparaît comme envoyée (elle ne sait rien)');
  const ouvert = await appel('POST', '/messages/envoyer', { reference: paul.ref, texte: 'Salut Paul' }, orga.jeton);
  const chezPaul = await conversation(paul.jeton, orga.ref);
  dire(ouvert.code === 200 && chezPaul.contenu.thread.some((m) => m.from === 'them' && m.texte === 'Salut Paul'), 'sans blocage, un message arrive toujours chez l’autre');

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
