/* Bout en bout, VRAI serveur, comptes de test neufs : rendez-vous a plusieurs.
 *   node e2e-rdv-groupe.js     (comptes sonde.groupe.*@exemple-timecool.fr) */
const API = 'https://api.timecool.fr';
const stamp = String(Date.now());
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 260) : '')); }
async function appel(methode, chemin, jeton, corps) {
  const r = await fetch(API + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps ? JSON.stringify(corps) : undefined });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { status: r.status, data: d && d.data !== undefined ? d.data : d, brut: d };
}
async function creer(prenom, i) {
  const tel = '06' + stamp.slice(-7) + String(i);
  const r = await appel('POST', '/inscription', null, { email: 'sonde.groupe.' + prenom.toLowerCase() + '.' + stamp + '@exemple-timecool.fr', telephone: tel, mot_de_passe: 'SondeGroupe-' + stamp, prenom: prenom, nom: 'Sonde', ville: 'Paris', code_postal: '75001' });
  const d = r.data || {};
  if (!d.session) throw new Error('inscription ' + prenom + ' : ' + JSON.stringify(r.brut).slice(0, 200));
  return { prenom, jeton: d.session.jeton, ref: d.compte.reference, tel, email: d.compte.email };
}
async function poserFiche(titulaire, autre, categories, bloque) {
  const fiche = { id: 'c_' + autre.prenom, name: autre.prenom + ' Sonde', phone: autre.tel, email: autre.email, categories: categories, referenceCompte: autre.ref };
  if (bloque) fiche.blocked = true;
  const r = await appel('POST', '/sync', titulaire.jeton, { elements: [{ type: 'contact', uid: fiche.id, contenu: fiche }] });
  if (r.status !== 200) throw new Error('fiche : ' + r.status);
}
async function poserRdv(c, uid, date, h1, h2) {
  const r = await appel('POST', '/sync', c.jeton, { elements: [{ type: 'rdv', uid: uid, contenu: { id: uid, mode: 'user', date: date, title: 'Occupe', startH: h1, startM: 0, endH: h2, endM: 0, cat: 'travail' } }] });
  if (r.status !== 200) throw new Error('rdv : ' + r.status);
}
async function elementsDe(c, type) {
  const r = await appel('GET', '/sync?depuis=0', c.jeton);
  return ((r.data || {}).elements || []).filter((e) => e.type === type && !e.supprime);
}
(async () => {
  console.log('-- comptes de test --');
  const O = await creer('Olivia', 1), A = await creer('Alice', 2), B = await creer('Bob', 3), C = await creer('Carl', 4);
  console.log('  ' + [O, A, B, C].map((x) => x.prenom + ':' + x.ref).join('  '));
  // A, B et C ont Olivia dans leurs contacts. A et B ont coche « travail » ; C n a rien coche.
  await poserFiche(A, O, ['travail']); await poserFiche(B, O, ['travail']); await poserFiche(C, O, []);

  console.log('-- recherche --');
  let r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [A.ref, B.ref, C.ref] });
  verifie('HTTP 200', r.status === 200, r.status);
  const p = r.data || {};
  verifie('3 creneaux, tous complets (Alice et Bob libres)', Array.isArray(p.creneaux) && p.creneaux.length === 3 && p.creneaux.every((c) => c.manquants.length === 0), JSON.stringify(p.creneaux));
  verifie('Carl (aucune categorie cochee) est mis de cote sans explication', JSON.stringify(p.sans_acces) === '["Carl"]' && JSON.stringify(p.invites) === '["Alice","Bob"]', JSON.stringify([p.sans_acces, p.invites]));
  verifie('jamais un week-end (aucune disponibilite reglee)', p.creneaux.every((c) => { const j = new Date(c.date + 'T12:00:00').getDay(); return j !== 0 && j !== 6; }));

  console.log('-- confirmation --');
  const s1 = p.creneaux[0];
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref, C.ref], date: s1.date, heure: s1.heure, duree: 1 });
  verifie('HTTP 200', r.status === 200, r.status + ' ' + JSON.stringify(r.brut));
  verifie('inclus : Alice et Bob, personne d exclu', JSON.stringify((r.data || {}).inclus) === '["Alice","Bob"]' && ((r.data || {}).exclus || []).length === 0, JSON.stringify(r.data));
  for (const [qui, nom] of [[O, 'Olivia'], [A, 'Alice'], [B, 'Bob']]) {
    const rdvs = (await elementsDe(qui, 'rdv')).filter((e) => String(e.uid).indexOf('tc_grp_') === 0);
    const c = rdvs[0] && rdvs[0].contenu;
    verifie(nom + ' a le rendez-vous dans son agenda, au bon jour et a la bonne heure', rdvs.length === 1 && c.date === s1.date && c.startH === s1.heure && c.endH === s1.heure + 1, JSON.stringify(c));
  }
  const cA = ((await elementsDe(A, 'rdv')).find((e) => String(e.uid).indexOf('tc_grp_') === 0) || {}).contenu || {};
  verifie('chez Alice, le titre cite Olivia et Bob', /Olivia/.test(cA.title) && /Bob/.test(cA.title), cA.title);
  const convA = await elementsDe(A, 'conversation');
  verifie('Alice a recu un message de confirmation', convA.some((e) => /Rendez-vous confirm/.test(JSON.stringify(e.contenu))), convA.length + ' conversation(s)');
  const convC = await elementsDe(C, 'conversation');
  verifie('Carl (non inclus) n a rien recu', convC.length === 0);

  console.log('-- conflits --');
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref], date: s1.date, heure: s1.heure, duree: 1 });
  verifie('le meme creneau une deuxieme fois : 409 creneau_pris (Olivia est deja prise)', r.status === 409 && /creneau_pris/.test(JSON.stringify(r.brut)), r.status + ' ' + JSON.stringify(r.brut));
  const s2 = p.creneaux[1];
  await poserRdv(A, 'sonde_pris_alice', s2.date, s2.heure, s2.heure + 1);
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref, B.ref], date: s2.date, heure: s2.heure, duree: 1 });
  verifie('Alice est prise sur le 2e creneau : le rendez-vous est inscrit pour Olivia et Bob seulement', r.status === 200 && JSON.stringify((r.data || {}).inclus) === '["Bob"]' && JSON.stringify((r.data || {}).exclus) === '["Alice"]', JSON.stringify(r.data));
  const rdvAlice = (await elementsDe(A, 'rdv')).filter((e) => String(e.uid).indexOf('tc_grp_') === 0);
  verifie('et Alice n a PAS ete ecrasee : un seul rendez-vous de groupe chez elle', rdvAlice.length === 1, rdvAlice.length);

  console.log('-- garde-fous --');
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref], date: '2020-01-01', heure: 10, duree: 1 });
  verifie('une date passee est refusee (400)', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/confirmer', O.jeton, { references: [A.ref], date: s1.date, heure: 3, duree: 1 });
  verifie('une heure de nuit est refusee (400)', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: Array.from({ length: 13 }, (_, i) => 'REF' + i) });
  verifie('plus de 12 personnes : 400', r.status === 400, r.status);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [O.ref] });
  verifie('soi-meme seulement : aucune personne a consulter, pas de plantage', r.status === 200 && (r.data.creneaux || []).length === 0, JSON.stringify(r.brut));
  // Bob bloque Olivia : il disparait des invites, sans explication.
  await poserFiche(B, O, ['travail'], true);
  r = await appel('POST', '/rdv/groupe/proposer', O.jeton, { references: [A.ref, B.ref] });
  verifie('Bob a bloque Olivia : il est mis de cote comme Carl', JSON.stringify((r.data || {}).sans_acces) === '["Bob"]' && JSON.stringify((r.data || {}).invites) === '["Alice"]', JSON.stringify(r.data));
  r = await appel('POST', '/rdv/groupe/proposer', null, { references: [A.ref] });
  verifie('sans session : 401', r.status === 401, r.status);
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('erreur : ' + e.message); process.exit(2); });
