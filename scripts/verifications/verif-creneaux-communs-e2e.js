require('./comptes-jetables'); // Mission 70 : les comptes créés ici sont effacés en fin de passage.
// Mission 91 (Charles, 15/11) : un créneau proposé à un contact qui a TimeCool doit être libre chez lui aussi. Contre l'API
// (comptes jetables) : POST /rdv/proposition/libres (lecture seule) et la même vérification à la création de la proposition.
//   Paul a classé Ana (travail, 9h-18h) : un créneau occupé chez lui ou hors de ses plages n'est jamais gardé ;
//   Paul ne l'a pas classée : son agenda et son temps libre protégé comptent ;
//   Bob a bloqué Ana : rien n'est consulté, tout revient (rien ne trahit le blocage) ;
//   à la création : les créneaux occupés tombent, aucun libre → 409 aucun_creneau_libre ; jamais l'agenda de Paul dans la réponse.
// Usage : node verif-creneaux-communs-e2e.js <index.html> <index.php>   (TC_API : l'API à interroger ; sans elle, non jouée)
const API = process.env.TC_API || '';
let ko = 0;
const dire = (ok, libelle, detail) => { if (!ok) ko++; console.log(`  ${ok ? 'OK ' : 'KO '}${libelle}${detail === undefined || ok ? '' : '  - ' + detail}`); };
async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}
let n = 0;
async function inscrire(prenom) {
  n++;
  const tel = '+3363998' + String(Date.now() + n * 211).slice(-4);
  const r = await appel('POST', '/inscription', { email: 'e2e91' + Date.now() + n + '@exemple-timecool.fr', telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!', prenom, nom: 'Communs', ville: 'Lyon', code_postal: '69001' });
  if (r.code !== 201 && r.code !== 200) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, tel, prenom };
}
const poser = (jeton, els) => appel('POST', '/sync', { elements: els }, jeton);
const elements = async (jeton) => (await appel('GET', '/sync?depuis=0', undefined, jeton)).d.elements;
const reglage = (cle, v) => ({ type: 'reglage', uid: cle, contenu: { id: cle, v } });
const dispo = (obj) => reglage('timecool_disponibilites', JSON.stringify(obj));
const tous = [1, 2, 3, 4, 5, 6, 7];
const J = (() => { const d = new Date(Date.now() + 3 * 86400000); return d.toISOString().slice(0, 10); })();
const cr = (h1, h2) => ({ debut: J + ' ' + String(h1).padStart(2, '0') + ':00:00', fin: J + ' ' + String(h2).padStart(2, '0') + ':00:00' });
const rdv = (uid, h1, h2) => ({ type: 'rdv', uid, contenu: { id: uid, title: 'Occupé', date: J, startH: h1, startM: 0, endH: h2, endM: 0, mode: 'user' } });

(async () => {
  if (!API) { console.log('  (non jouée : TC_API absent)'); console.log('\n0 anomalie(s).'); return; }
  const ana = await inscrire('Ana'), paul = await inscrire('Paul'), bob = await inscrire('Bob');
  dire(!!ana.ref && !!paul.ref && !!bob.ref, 'trois comptes jetables (Ana, Paul, Bob)');
  const fiche = (categories, bloque) => ({ type: 'contact', uid: 'ct_ana', contenu: Object.assign({ id: 'ct_ana', name: 'Ana Communs', referenceCompte: ana.ref, phone: ana.tel, categories }, bloque ? { blocked: true } : {}) });
  await poser(paul.jeton, [fiche(['travail']), dispo({ travail: [{ jours: tous, debut: '09:00', fin: '18:00' }] }), rdv('ev_p1', 10, 11)]);
  const candidats = [cr(10, 11), cr(12, 13), cr(19, 20), cr(15, 16)];
  let r = await appel('POST', '/rdv/proposition/libres', { reference: paul.ref, creneaux: candidats }, ana.jeton);
  dire(r.code === 200 && JSON.stringify(r.d.libres) === '[1,3]', 'Paul a classé Ana (travail 9h-18h) : 10h (occupé chez lui) et 19h (hors de ses plages) ne sont jamais gardés ; 12h et 15h oui', JSON.stringify(r.d));
  dire(r.d && Object.keys(r.d).sort().join() === 'libres,ok', 'la réponse ne dit que des indices : jamais l agenda de Paul', JSON.stringify(r.d));
  // Paul ne classe plus Ana, et protège 12h-13h (temps libre).
  await poser(paul.jeton, [fiche([]), dispo({ personnel: [{ jours: tous, debut: '12:00', fin: '13:00' }] })]);
  r = await appel('POST', '/rdv/proposition/libres', { reference: paul.ref, creneaux: candidats }, ana.jeton);
  dire(r.code === 200 && JSON.stringify(r.d.libres) === '[2,3]', 'Ana non classée : son agenda (10h) et son temps libre protégé (12h) comptent ; 19h et 15h restent', JSON.stringify(r.d));
  // Bob a bloqué Ana, et il est occupé à 10h : rien n'est consulté, tout revient.
  await poser(bob.jeton, [Object.assign(fiche(['travail'], true), {}), rdv('ev_b1', 10, 11)]);
  r = await appel('POST', '/rdv/proposition/libres', { reference: bob.ref, creneaux: candidats }, ana.jeton);
  dire(r.code === 200 && JSON.stringify(r.d.libres) === '[0,1,2,3]', 'Bob a bloqué Ana : son agenda n est pas consulté, tous les créneaux reviennent (rien ne trahit le blocage)', JSON.stringify(r.d));
  r = await appel('POST', '/rdv/proposition/libres', { reference: 'ZZZZZZZZZZZZ', creneaux: candidats }, ana.jeton);
  dire(r.code === 200 && JSON.stringify(r.d.libres) === '[0,1,2,3]', 'référence inconnue : tous reviennent', JSON.stringify(r.d));
  r = await appel('POST', '/rdv/proposition/libres', { reference: paul.ref, creneaux: candidats });
  dire(r.code === 401, 'sans session : refusé', 'HTTP ' + r.code);
  // À la création : Paul (re)classe Ana, occupé à 10h.
  await poser(paul.jeton, [fiche(['travail']), dispo({ travail: [{ jours: tous, debut: '09:00', fin: '18:00' }] })]);
  r = await appel('POST', '/rdv/proposition/creer', { reference: paul.ref, texte: 'On décale ?', titre: 'Kiné', creneaux: [Object.assign(cr(10, 11), { libelle: '10h' }), Object.assign(cr(15, 16), { libelle: '15h' })] }, ana.jeton);
  dire(r.code === 201 && r.d.rdv_id > 0 && JSON.stringify(r.d.creneaux) === '[{"rang":1,"libelle":"15h"}]', 'création avec 10h (occupé) et 15h : acceptée, la réponse dit ce qui est vraiment parti (15h, rang 1)', JSON.stringify(r.d));
  const conv = (await elements(paul.jeton)).find((e) => e.type === 'conversation' && e.uid === ana.ref);
  const carte = conv && conv.contenu.thread.filter((m) => m.genre === 'proposition_creneaux').pop();
  dire(!!carte && carte.creneaux.length === 1 && carte.creneaux[0].libelle === '15h' && carte.creneaux[0].rang === 1, 'chez Paul, la carte ne propose que 15h (rang 1) : 10h est tombé', JSON.stringify(carte && carte.creneaux));
  r = await appel('POST', '/rdv/proposition/creer', { reference: paul.ref, texte: 'On décale ?', titre: 'Kiné', creneaux: [Object.assign(cr(10, 11), { libelle: '10h' }), Object.assign(cr(19, 20), { libelle: '19h' })] }, ana.jeton);
  dire(r.code === 409 && r.d.erreur === 'aucun_creneau_libre', 'aucun créneau libre pour les deux : 409 aucun_creneau_libre, rien ne part', JSON.stringify(r.d));
  r = await appel('POST', '/rdv/proposition/creer', { prenom_destinataire: 'Zoé', canal: 'sms', texte: 'On décale ?', titre: 'Kiné', creneaux: [Object.assign(cr(10, 11), { libelle: '10h' })] }, ana.jeton);
  dire(r.code === 201 && /\/rdv\/[A-Z2-9]+$/.test(r.d.url || ''), 'contact sans TimeCool : comme avant, un lien, rien n est consulté', JSON.stringify(r.d));
  // Examen : une limite par compte et par heure sur /libres (120 par défaut) ; un compte neuf n'en est pas gêné.
  dire(/inscriptionControleCompter\([\s\S]{0,200}'compte\|' \. \(int\) \$moi\['id'\], \(int\) Conf::get\('creneaux_libres_compte_heure', 120\), 'libres'\)/.test(require('fs').readFileSync(process.argv[3], 'utf8')), 'la route /libres a sa limite par compte et par heure (creneaux_libres_compte_heure, 120)');
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exitCode = ko ? 1 : 0;
})().catch((e) => { console.log('  KO exception ' + (e && e.stack || e)); console.log('\n' + (ko + 1) + ' anomalie(s).'); process.exitCode = 1; });
