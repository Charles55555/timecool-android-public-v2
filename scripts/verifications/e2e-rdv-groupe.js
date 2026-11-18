require('./comptes-jetables'); // Mission 70 : les comptes créés ici sont effacés en fin de passage.
/* Bout en bout, contre l'API (comptes jetables sonde.groupe.*@exemple-timecool.fr) : rendez-vous à plusieurs.
 * Réparée le 18/11 (chef) aux règles du 10/10 : un ami n'est lisible que s'il a décoché « Toujours attendre ma validation »,
 * classé la personne dans une catégorie et réglé des plages pour elle. Sinon (case cochée, non classée, inconnue, bloquée),
 * il est « sans accès », sans explication.
 *   Alice et Bob : case décochée, Olivia classée « travail », plages 9h-18h en semaine → lisibles ;
 *   Carl a bloqué Olivia ; Dana ne l'a pas dans ses contacts ; Eve l'a classée mais garde la case cochée → sans accès ;
 *   une deuxième « Alice » (Alice Bis, case cochée) : sans_acces_refs rend SA référence (deux prénoms pareils ne se confondent plus).
 *   La confirmation inscrit le lieu donné chez chacun (Olivia, Alice, Bob).
 * Usage : node e2e-rdv-groupe.js [index.html] [index.php]   (TC_API : l'API à interroger ; sans elle, non jouée — jamais la production) */
const API = process.env.TC_API || '';
const stamp = String(Date.now());
let ko = 0, n = 0;
function verifie(l, c, d) { n++; if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).slice(0, 300) : '')); }
async function appel(methode, chemin, jeton, corps) {
  const r = await fetch(API + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps ? JSON.stringify(corps) : undefined });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { status: r.status, data: d && d.data !== undefined ? d.data : d, brut: d };
}
async function creer(prenom, i) {
  const tel = '063998' + stamp.slice(-3) + String(i);
  const r = await appel('POST', '/inscription', null, { email: 'sonde.groupe.' + prenom.toLowerCase().replace(/[^a-z]/g, '') + i + '.' + stamp + '@exemple-timecool.fr', telephone: tel, mot_de_passe: 'SondeGroupe-' + stamp, prenom: prenom, nom: 'Sonde' + i, ville: 'Paris', code_postal: '75001' });
  const d = r.data || {};
  if (!d.session) throw new Error('inscription ' + prenom + ' : ' + JSON.stringify(r.brut).slice(0, 200));
  return { prenom, jeton: d.session.jeton, ref: d.compte.reference, tel, email: d.compte.email };
}
async function poser(c, elements) {
  const r = await appel('POST', '/sync', c.jeton, { elements: elements });
  if (r.status !== 200) throw new Error('sync : ' + r.status + ' ' + JSON.stringify(r.brut).slice(0, 200));
}
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const fiche = (autre, categories, bloque) => {
  const f = { id: 'c_' + autre.ref, name: autre.prenom + ' Sonde', phone: autre.tel, email: autre.email, categories: categories, referenceCompte: autre.ref, isTimeCool: true };
  if (bloque) f.blocked = true;
  return { type: 'contact', uid: f.id, contenu: f };
};
// Les règles du 10/10 : case décochée, plages en semaine pour « travail ».
const ouvert = [reglage('tc_rdv_validation', '0'), reglage('timecool_disponibilites', JSON.stringify({ travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] }))];
async function elementsDe(c, type) {
  const r = await appel('GET', '/sync?depuis=0', c.jeton);
  return ((r.data || {}).elements || []).filter((e) => e.type === type && !e.supprime);
}
const groupeDe = async (c) => (await elementsDe(c, 'rdv')).filter((e) => String(e.uid).indexOf('tc_grp_') === 0);
const J = (x) => JSON.stringify(x);

(async () => {
  if (!API) { console.log('  (non jouée : TC_API absent)'); console.log('0 vérification'); return; }
  console.log('-- comptes de test --');
  const O = await creer('Olivia', 1), A = await creer('Alice', 2), B = await creer('Bob', 3), C = await creer('Carl', 4), D = await creer('Dana', 5), E = await creer('Eve', 6), A2 = await creer('Alice', 7);
  await poser(A, ouvert.concat([fiche(O, ['travail'])]));
  await poser(B, ouvert.concat([fiche(O, ['travail'])]));
  await poser(C, ouvert.concat([fiche(O, ['travail'], true)]));
  await poser(E, [reglage('timecool_disponibilites', ouvert[1].contenu.v), fiche(O, ['travail'])]);
  await poser(A2, [fiche(O, ['travail'])]);

  console.log('-- recherche --');
  let r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [A.ref, B.ref, C.ref] });
  verifie('HTTP 200', r.status === 200, r.status);
  const p = r.data || {};
  const creneaux = Array.isArray(p.creneaux) ? p.creneaux : [];
  verifie('3 créneaux, tous complets (Alice et Bob libres)', creneaux.length === 3 && creneaux.every((c) => (c.manquants || []).length === 0), J(p.creneaux));
  verifie('Carl (qui a bloqué Olivia) est mis de côté sans explication, sa référence à part', J(p.sans_acces) === '["Carl"]' && J(p.sans_acces_refs) === J([C.ref]) && J(p.invites) === '["Alice","Bob"]', J([p.sans_acces, p.sans_acces_refs, p.invites]));
  verifie('jamais un week-end, toujours dans leurs plages (9h-18h)', creneaux.length > 0 && creneaux.every((c) => { const j = new Date(c.date + 'T12:00:00').getDay(); return j !== 0 && j !== 6 && c.heure >= 9 && c.heure + 1 <= 18; }), J(creneaux));

  console.log('-- règles du 10/10 --');
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [D.ref, E.ref] });
  verifie('Dana (Olivia inconnue) et Eve (case « Toujours attendre ma validation » cochée) : sans accès, aucun créneau', J((r.data || {}).invites) === '[]' && J((r.data || {}).sans_acces) === '["Dana","Eve"]' && J((r.data || {}).sans_acces_refs) === J([D.ref, E.ref]) && ((r.data || {}).creneaux || []).length === 0, J(r.data));
  r = await appel('POST', '/rdv/demander', O.jeton, { reference: E.ref });
  verifie('à deux avec Eve : sa demande part dans sa messagerie, pas de créneaux', (r.data || {}).mode === 'messagerie', J(r.brut));
  r = await appel('POST', '/rdv/demander', O.jeton, { reference: C.ref });
  verifie('à deux avec Carl (qui a bloqué) : la même réponse qu un agenda plein', (r.data || {}).mode === 'messagerie', J(r.brut));

  console.log('-- deux prénoms pareils --');
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [A.ref, A2.ref] });
  verifie('deux « Alice » : l une lisible, l autre sans accès, et la référence rendue est celle de la bonne', J((r.data || {}).invites) === '["Alice"]' && J((r.data || {}).sans_acces) === '["Alice"]' && J((r.data || {}).sans_acces_refs) === J([A2.ref]), J(r.data));

  console.log('-- confirmation, avec le lieu --');
  const s1 = creneaux[0] || {};
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref, C.ref], date: s1.date, heure: s1.heure, duree: 1, lieu: 'Café de la Gare, 3 place de la Gare' });
  verifie('HTTP 200', r.status === 200, r.status + ' ' + J(r.brut));
  verifie('inclus : Alice et Bob, personne d exclu', J((r.data || {}).inclus) === '["Alice","Bob"]' && ((r.data || {}).exclus || []).length === 0, J(r.data));
  for (const [qui, nom] of [[O, 'Olivia'], [A, 'Alice'], [B, 'Bob']]) {
    const rdvs = await groupeDe(qui);
    const c = (rdvs[0] && rdvs[0].contenu) || {};
    verifie(nom + ' a le rendez-vous au bon jour, à la bonne heure, au bon lieu', rdvs.length === 1 && c.date === s1.date && c.startH === s1.heure && c.endH === s1.heure + 1 && c.lieu === 'Café de la Gare, 3 place de la Gare', J(c));
  }
  const cA = ((await groupeDe(A))[0] || {}).contenu || {};
  verifie('chez Alice, le titre cite Olivia et Bob', /Olivia/.test(cA.title || '') && /Bob/.test(cA.title || ''), cA.title);
  verifie('Alice a reçu un message de confirmation', (await elementsDe(A, 'conversation')).some((e) => /Rendez-vous confirm/.test(J(e.contenu))));
  verifie('Carl (non inclus) n a reçu aucune confirmation, et rien dans son agenda', !(await elementsDe(C, 'conversation')).some((e) => /Rendez-vous confirm/.test(J(e.contenu))) && (await groupeDe(C)).length === 0);
  verifie('Eve, Dana et l autre Alice n ont rien dans leur agenda', (await groupeDe(E)).length === 0 && (await groupeDe(D)).length === 0 && (await groupeDe(A2)).length === 0);

  console.log('-- conflits --');
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref], date: s1.date, heure: s1.heure, duree: 1 });
  verifie('le même créneau une deuxième fois : 409 creneau_pris (Olivia est déjà prise)', r.status === 409 && /creneau_pris/.test(J(r.brut)), r.status + ' ' + J(r.brut));
  const s2 = creneaux[1] || {};
  await poser(A, [{ type: 'rdv', uid: 'sonde_pris_alice', contenu: { id: 'sonde_pris_alice', mode: 'user', date: s2.date, title: 'Occupé', startH: s2.heure, startM: 0, endH: s2.heure + 1, endM: 0, cat: 'travail' } }]);
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref], date: s2.date, heure: s2.heure, duree: 1 });
  verifie('Alice est prise sur le 2e créneau : inscrit pour Olivia et Bob seulement', r.status === 200 && J((r.data || {}).inclus) === '["Bob"]' && J((r.data || {}).exclus) === '["Alice"]', r.status + ' ' + J(r.data));
  verifie('et Alice n a PAS été écrasée : un seul rendez-vous de groupe chez elle', (await groupeDe(A)).length === 1);
  const sansLieu = (await groupeDe(B)).map((e) => e.contenu).find((c) => c.date === s2.date && c.startH === s2.heure) || {};
  verifie('sans lieu donné, aucun lieu inventé', sansLieu.date === s2.date && !sansLieu.lieu, J(sansLieu));

  console.log('-- garde-fous --');
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref], date: '2020-01-01', heure: 10, duree: 1 });
  verifie('une date passée est refusée (400)', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref], date: s1.date, heure: 3, duree: 1 });
  verifie('une heure de nuit est refusée (400)', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: Array.from({ length: 13 }, (_, i) => 'REF' + i) });
  verifie('plus de 12 personnes : 400', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [O.ref] });
  verifie('soi-même seulement : personne à consulter, pas de plantage', r.status === 200 && ((r.data || {}).creneaux || []).length === 0, J(r.brut));
  await poser(B, [fiche(O, ['travail'], true)]);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [A.ref, B.ref] });
  verifie('Bob bloque Olivia : il est mis de côté comme Carl, avec sa référence', J((r.data || {}).sans_acces) === '["Bob"]' && J((r.data || {}).sans_acces_refs) === J([B.ref]) && J((r.data || {}).invites) === '["Alice"]', J(r.data));
  r = await appel('POST', '/rdv/groupe/proposer', null, { references: [A.ref] });
  verifie('sans session : 401', r.status === 401, r.status);

  console.log(ko + ' anomalie(s) : ' + n + ' vérifications');
  process.exitCode = ko ? 1 : 0;
})().catch((e) => { console.log('  KO exception ' + (e && e.stack || e)); console.log((ko + 1) + ' anomalie(s) : ' + n + ' vérifications'); process.exitCode = 1; });
