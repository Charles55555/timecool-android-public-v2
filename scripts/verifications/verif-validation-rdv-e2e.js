// « Toujours attendre ma validation » contre l'API réelle (comptes sonde jetables).
// À lancer APRÈS la mise en ligne de l'API : elle vérifie le serveur en production.
//
//   inconnu / bloqué / validation exigée -> la demande arrive dans la messagerie,
//   avec exactement la même réponse pour le demandeur ;
//   contact enregistré + case décochée   -> créneaux automatiques ;
//   boutons de la messagerie             -> « proposer un créneau » (deux agendas),
//                                           « refuser et bloquer » (en silence).
const API = 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(62)} ${detail === undefined ? '' : detail}`);
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
    email: 'sonde.valid' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Valid', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const plages = (jours, debut, fin) => ({ travail: [{ jours, debut, fin }] });
const dispo = (obj) => reglage('timecool_disponibilites', JSON.stringify(obj));
const jourOuvre = (plus) => { const d = new Date(Date.now() + plus * 86400000); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const conversation = async (jeton, ref) => (await elements(jeton)).find((e) => e.type === 'conversation' && e.uid === ref);

(async () => {
  const titulaire = await inscrire('Tania');
  const contact = await inscrire('Camille');
  const inconnu = await inscrire('Ines');
  const bloque = await inscrire('Boris');
  dire(!!titulaire.ref && !!contact.ref && !!inconnu.ref && !!bloque.ref, 'quatre comptes sonde créés');

  // Le carnet de Tania : Camille (connue), Boris (bloqué). Ines n y est pas.
  await poser(titulaire.jeton, [
    { type: 'contact', uid: 'ct_camille', contenu: { id: 'ct_camille', name: 'Camille Valid', phone: contact.tel, email: '', isTimeCool: true } },
    { type: 'contact', uid: 'ct_boris', contenu: { id: 'ct_boris', name: 'Boris Valid', phone: bloque.tel, email: '', blocked: true, isTimeCool: true } },
  ]);

  console.log('\nCase jamais touchée (cochée par défaut) : personne ne réserve seul :');
  const reponses = {};
  for (const [nom, p] of [['Camille (connue)', contact], ['Ines (inconnue)', inconnu], ['Boris (bloqué)', bloque]]) {
    const r = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, p.jeton);
    reponses[nom] = r;
    dire(r.code === 200 && r.d.mode === 'messagerie', nom + ' : la demande part dans la messagerie', r.d && r.d.mode);
  }
  const msgs = Object.values(reponses).map((r) => r.d.message);
  dire(new Set(msgs).size === 1, 'la réponse est mot pour mot la même pour les trois', msgs[0] && msgs[0].slice(0, 40));
  const convT = await conversation(titulaire.jeton, contact.ref);
  const demande = convT && convT.contenu.thread.find((m) => m.genre === 'demande_rdv');
  dire(!!demande && typeof demande.rdv === 'number', 'chez Tania, la demande porte son identifiant et son genre', demande && demande.rdv);
  dire(demande && demande.traite !== true, 'et n est pas encore traitée');
  dire(!(await elements(titulaire.jeton)).some((e) => e.type === 'rdv'), 'aucun rendez-vous posé chez elle');

  console.log('\nTania décoche la case, avec des plages (lun-ven 9h-18h) :');
  await poser(titulaire.jeton, [reglage('tc_rdv_validation', '0'), dispo(plages([1, 2, 3, 4, 5], '09:00', '18:00'))]);
  const auto = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, contact.jeton);
  dire(auto.d.mode === 'creneaux' && auto.d.creneaux.length === 3, 'Camille (connue) obtient des créneaux tout de suite', auto.d.mode);
  const inc = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, inconnu.jeton);
  dire(inc.d.mode === 'messagerie', 'Ines (inconnue) passe TOUJOURS par la messagerie', inc.d.mode);
  const blo = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, bloque.jeton);
  dire(blo.d.mode === 'messagerie', 'Boris (bloqué) aussi', blo.d.mode);
  dire(inc.d.message === blo.d.message, 'et inconnue ou bloqué se lisent pareil', 'impossible de les distinguer');

  console.log('\nPlus d\'horaires cachés : toutes les plages supprimées = rien de réservable :');
  await poser(titulaire.jeton, [dispo({ travail: [], sante: [], famille: [], amis: [], sport: [], personnel: [] })]);
  const vide = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, contact.jeton);
  dire(vide.d.mode === 'messagerie', 'Camille n\'obtient plus aucun créneau', vide.d.mode);
  await poser(titulaire.jeton, [dispo(plages([1, 2, 3, 4, 5], '11:00', '12:00'))]);
  const doux = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, contact.jeton);
  dire(doux.d.mode === 'creneaux' && doux.d.creneaux.every((c) => c.heure === 11), 'plage 11h-12h : tous les créneaux sont à 11h', (doux.d.creneaux || []).map((c) => c.heure).join(','));

  console.log('\n« Proposer un créneau » : Tania choisit pour Ines :');
  const rdvInes = inc.d.rdv;
  const jour = jourOuvre(3);
  const mauvais = await appel('POST', '/rdv/proposer-creneau', { rdv: rdvInes, date: '2020-01-01', debut: '10:00', duree: 60 }, titulaire.jeton);
  dire(mauvais.code === 400, 'un créneau passé est refusé', 'HTTP ' + mauvais.code);
  const absurde = await appel('POST', '/rdv/proposer-creneau', { rdv: rdvInes, date: jour, debut: '25:00', duree: 60 }, titulaire.jeton);
  dire(absurde.code === 400, 'une heure absurde est refusée', 'HTTP ' + absurde.code);
  const volee = await appel('POST', '/rdv/proposer-creneau', { rdv: rdvInes, date: jour, debut: '15:00', duree: 60 }, bloque.jeton);
  dire(volee.code === 404, 'quelqu\'un d\'autre ne peut pas répondre à sa place', 'HTTP ' + volee.code);
  const ok = await appel('POST', '/rdv/proposer-creneau', { rdv: rdvInes, date: jour, debut: '15:00', duree: 90 }, titulaire.jeton);
  dire(ok.code === 200 && ok.d.heure === '15:00', 'accepté', 'HTTP ' + ok.code + ' ' + (ok.d && ok.d.libelle));
  const chezT = (await elements(titulaire.jeton)).filter((e) => e.type === 'rdv' && e.uid === 'tc_rdv_' + rdvInes);
  const chezI = (await elements(inconnu.jeton)).filter((e) => e.type === 'rdv' && e.uid === 'tc_rdv_' + rdvInes);
  dire(chezT.length === 1 && chezI.length === 1, 'le rendez-vous est dans les DEUX agendas');
  dire(chezT[0] && chezT[0].contenu.title === 'Ines Valid' && chezI[0] && chezI[0].contenu.title === 'Tania Valid', 'chacun voit le nom de l\'autre');
  dire(chezT[0] && chezI[0] && chezT[0].contenu.date === chezI[0].contenu.date && chezT[0].contenu.startH === 15 && chezI[0].contenu.endH === 16 && chezI[0].contenu.endM === 30,
    'même jour, 15h à 16h30 des deux côtés', chezT[0] && chezT[0].contenu.date + ' ' + chezT[0].contenu.startH + 'h');
  const convIt = await conversation(inconnu.jeton, titulaire.ref);
  dire(convIt && convIt.contenu.thread.some((m) => /Rendez-vous confirmé/.test(m.texte)), 'Ines reçoit la confirmation dans sa messagerie');
  const convTi = await conversation(titulaire.jeton, inconnu.ref);
  dire(convTi && convTi.contenu.thread.filter((m) => m.genre === 'demande_rdv').every((m) => m.traite === true), 'chez Tania, la demande est marquée traitée (plus de boutons)');
  const rejeu = await appel('POST', '/rdv/proposer-creneau', { rdv: rdvInes, date: jour, debut: '17:00', duree: 60 }, titulaire.jeton);
  dire(rejeu.code === 404, 'on ne répond pas deux fois à la même demande', 'HTTP ' + rejeu.code);

  console.log('\nCréneau déjà pris chez Tania : 409, la demande reste en attente :');
  const autre = await inscrire('Axel');
  const dAxel = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, autre.jeton);
  const pris = await appel('POST', '/rdv/proposer-creneau', { rdv: dAxel.d.rdv, date: jour, debut: '16:00', duree: 60 }, titulaire.jeton);
  dire(pris.code === 409, 'le créneau chevauche celui d\'Ines : 409', 'HTTP ' + pris.code);
  const encore = await appel('POST', '/rdv/proposer-creneau', { rdv: dAxel.d.rdv, date: jour, debut: '17:00', duree: 60 }, titulaire.jeton);
  dire(encore.code === 200, 'la demande était restée en attente : un autre créneau passe', 'HTTP ' + encore.code);

  console.log('\n« Refuser et bloquer » : en silence :');
  const eve = await inscrire('Eve');
  const dEve = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, eve.jeton);
  const avantEve = JSON.stringify((await elements(eve.jeton)).filter((e) => e.type === 'conversation').map((e) => e.contenu.thread.length));
  const nonProp = await appel('POST', '/rdv/refuser', { rdv: dEve.d.rdv }, eve.jeton);
  dire(nonProp.code === 404, 'la demandeuse ne peut pas refuser sa propre demande', 'HTTP ' + nonProp.code);
  const refus = await appel('POST', '/rdv/refuser', { rdv: dEve.d.rdv }, titulaire.jeton);
  dire(refus.code === 200, 'Tania refuse', 'HTTP ' + refus.code);
  const fiche = (await elements(titulaire.jeton)).find((e) => e.type === 'contact' && e.contenu.referenceCompte === eve.ref);
  dire(!!fiche && fiche.contenu.blocked === true, 'une fiche bloquée est créée pour Ève', fiche && fiche.contenu.name);
  dire(fiche && fiche.contenu.phone === '' && fiche.contenu.email === '', 'sans copier son téléphone ni son email');
  const apresEve = JSON.stringify((await elements(eve.jeton)).filter((e) => e.type === 'conversation').map((e) => e.contenu.thread.length));
  dire(avantEve === apresEve, 'Ève ne reçoit rien : elle ne sait pas', apresEve);
  const convTe = await conversation(titulaire.jeton, eve.ref);
  dire(convTe && convTe.contenu.thread.filter((m) => m.genre === 'demande_rdv').every((m) => m.traite === true), 'la demande disparaît de la messagerie de Tania');
  const rejeuEve = await appel('POST', '/rdv/refuser', { rdv: dEve.d.rdv }, titulaire.jeton);
  dire(rejeuEve.code === 404, 'on ne refuse pas deux fois', 'HTTP ' + rejeuEve.code);
  const reEve = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, eve.jeton);
  dire(reEve.d.mode === 'messagerie' && reEve.d.message === dEve.d.message, 'si elle redemande : même réponse qu\'avant, sans rien deviner', reEve.d.mode);

  console.log('\nRefuser quelqu\'un déjà dans le carnet : sa fiche passe à « bloqué » :');
  await poser(titulaire.jeton, [reglage('tc_rdv_validation', '1')]);
  const dCam2 = await appel('POST', '/rdv/demander', { reference: titulaire.ref }, contact.jeton);
  const refusCam = await appel('POST', '/rdv/refuser', { rdv: dCam2.d.rdv }, titulaire.jeton);
  dire(refusCam.code === 200, 'Tania refuse Camille', 'HTTP ' + refusCam.code);
  const ficheCam = (await elements(titulaire.jeton)).filter((e) => e.type === 'contact' && e.uid === 'ct_camille');
  dire(ficheCam.length === 1 && ficheCam[0].contenu.blocked === true && ficheCam[0].contenu.name === 'Camille Valid', 'la fiche existante est mise à jour, pas dupliquée');

  console.log('\nRendez-vous à plusieurs : même règle :');
  await poser(titulaire.jeton, [reglage('tc_rdv_validation', '0'), dispo(plages([1, 2, 3, 4, 5], '09:00', '18:00')),
    { type: 'contact', uid: 'ct_axel', contenu: { id: 'ct_axel', name: 'Axel Valid', phone: autre.tel, email: '', isTimeCool: true } }]);
  const g1 = await appel('POST', '/rdv/groupe/proposer', { references: [titulaire.ref], duree: 1 }, autre.jeton);
  dire(g1.code === 200 && g1.d.invites.length === 1, 'décochée, Axel (dans son carnet) peut la consulter', JSON.stringify(g1.d.invites));
  const g2 = await appel('POST', '/rdv/groupe/proposer', { references: [titulaire.ref], duree: 1 }, inconnu.jeton);
  dire(g2.code === 200 && g2.d.invites.length === 0 && g2.d.sans_acces.length === 1, 'Ines (inconnue) : « sans accès »', JSON.stringify(g2.d.sans_acces));
  await poser(titulaire.jeton, [reglage('tc_rdv_validation', '1')]);
  const g3 = await appel('POST', '/rdv/groupe/proposer', { references: [titulaire.ref], duree: 1 }, autre.jeton);
  dire(g3.d.invites.length === 0 && g3.d.sans_acces.length === 1, 'cochée : même Axel est « sans accès »', JSON.stringify(g3.d.sans_acces));

  console.log('\nÀ supprimer : ' + [titulaire, contact, inconnu, bloque, autre, eve].map((c) => c.ref).join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
