// Mission 73 : les propositions de créneaux de Charly, de bout en bout sur l'API (deux comptes de test).
// Charly propose 1 à 3 créneaux pour remplacer un rendez-vous : chez un contact TimeCool, une carte à boutons dans sa
// messagerie ; sinon un lien. Le choix ATTEND l'organisateur (rien ne s'écrit dans son agenda), qui le place, le laisse
// ou repropose. « Aucun ne me va » et « pas de réponse sous 24 h » lui reviennent aussi. Le rendez-vous qu'on décale
// ne gêne pas son propre nouveau créneau ; un autre rendez-vous, si.
// Usage : TC_API=http://127.0.0.1:8099 node verif-propositions-e2e.js <index.html> <index.php>
require('./comptes-jetables');
const cp = require('child_process');
const API = process.env.TC_API || 'https://api.timecool.fr';

let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + ' ' + (d || '')); } };

async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await r.text();
  let d = null;
  try { d = JSON.parse(texte); } catch (e) {}
  return { code: r.status, d, texte };
}
const sql = (q, p) => cp.execFileSync('mysql', ['--no-defaults', '-u', 'claudecode', '-N', '-B', 'timecool_prod', '-e', q], { encoding: 'utf8' }).trim();
const echappe = (t) => String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function compte(nom, stamp, n) {
  const id = { prenom: nom, nom: 'Proposition', ville: 'Lyon', code_postal: '69001', email: 'sonde.proposition' + n + stamp + '@exemple-timecool.fr', telephone: '+336' + String(stamp + n).slice(-8), mot_de_passe: 'Motdepasse-propo-1' };
  const a = await appel('POST', '/inscription', id);
  verifie('compte ' + nom + ' créé', a.code === 200 || a.code === 201, a.texte.slice(0, 200));
  const jeton = a.d.session.jeton;
  const moi = await appel('GET', '/compte', undefined, jeton);
  const reference = moi.d.compte.reference;
  return { jeton, reference, id: Number(sql("SELECT id FROM comptes WHERE reference = '" + echappe(reference) + "'")) };
}
function poserRdv(compteId, uid, date, h1, h2) {
  const c = JSON.stringify({ id: uid, title: 'Essai ' + uid, date, startH: h1, startM: 0, endH: h2, endM: 0, mode: 'user' });
  sql("INSERT INTO elements (compte_id, type, uid, contenu, version, supprime) VALUES (" + compteId + ", 'rdv', '" + echappe(uid) + "', '" + echappe(c) + "', 1, 0)");
}
async function carteChez(b, refA, rdvId) {
  const l = sql("SELECT contenu FROM elements WHERE compte_id = " + b.id + " AND type = 'conversation' AND uid = '" + echappe(refA) + "'");
  const conv = l ? JSON.parse(l) : null;
  return conv ? (conv.thread || []).find((x) => x.genre === 'proposition_creneaux' && Number(x.rdv) === rdvId) : null;
}

(async () => {
  const stamp = Date.now();
  const jour = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const a = await compte('Alice', stamp, 1);
  const b = await compte('Bruno', stamp, 2);
  const creneaux = [
    { debut: jour + ' 10:00:00', fin: jour + ' 11:00:00', libelle: 'mardi à 10h' },
    { debut: jour + ' 14:00:00', fin: jour + ' 15:00:00', libelle: 'mardi à 14h' },
    { debut: jour + ' 16:00:00', fin: jour + ' 17:00:00', libelle: 'mardi à 16h' }
  ];

  console.log('-- 1. Un contact TimeCool : la carte à boutons, le choix attend --');
  let r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'Bonjour Bruno, je dois décaler notre rendez-vous.', reference: b.reference, titre: 'Dentiste', remplace: 'orig1' }, a.jeton);
  verifie('créée (201), sans lien', r.code === 201 && r.d.rdv_id > 0 && r.d.url === null, r.texte.slice(0, 200));
  const p1 = r.d.rdv_id;
  let carte = await carteChez(b, a.reference, p1);
  verifie('la carte arrive chez Bruno avec ses 3 créneaux', carte && carte.from === 'them' && Array.isArray(carte.creneaux) && carte.creneaux.length === 3 && carte.creneaux[1].libelle === 'mardi à 14h', JSON.stringify(carte));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  verifie('pas encore de réponse : rien n attend Alice', r.code === 200 && r.d.propositions.every((x) => x.rdv_id !== p1), r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p1, rang: 2 }, a.jeton);
  verifie('Alice ne peut pas choisir à la place de Bruno (404)', r.code === 404, r.code);
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p1, rang: 2 }, b.jeton);
  verifie('Bruno choisit le 2e créneau', r.code === 200 && r.d.enregistre === true, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p1, rang: 1 }, b.jeton);
  verifie('une seule réponse (410)', r.code === 410 && r.d.erreur === 'deja_repondu', r.code);
  carte = await carteChez(b, a.reference, p1);
  verifie('sa carte garde son choix (autre appareil : plus de boutons)', carte && carte.choix === 2, JSON.stringify(carte));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  let x = (r.d.propositions || []).find((y) => y.rdv_id === p1);
  verifie('la réponse attend Alice : choisi, 14h, le rendez-vous à remplacer, le nom de Bruno', x && x.etat === 'choisi' && /14:00:00$/.test(x.debut) && x.remplace === 'orig1' && x.qui === 'Bruno Proposition' && x.reference === b.reference, JSON.stringify(x));
  verifie('rien n est écrit dans l agenda d Alice', sql("SELECT COUNT(*) FROM elements WHERE compte_id = " + a.id + " AND type = 'rdv'") === '0');
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p1 }, b.jeton);
  verifie('seule Alice donne suite', r.code === 200 && r.d.traite === false, r.texte);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p1 }, a.jeton);
  verifie('Alice donne suite', r.code === 200 && r.d.traite === true, r.texte);
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  verifie('la réponse ne revient plus', r.d.propositions.every((y) => y.rdv_id !== p1));

  console.log('-- 2. Un contact sans TimeCool : le lien, « aucun ne me va » --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: creneaux.slice(0, 2), texte: 'x', prenom_destinataire: 'Chloé', titre: 'Kiné', remplace: 'orig2' }, a.jeton);
  verifie('créée avec un lien', r.code === 201 && /\/rdv\/[A-Z2-9]{8,16}$/.test(r.d.url || ''), r.texte.slice(0, 200));
  const p2 = r.d.rdv_id;
  const jetonLien = (r.d.url || '').split('/').pop();
  r = await appel('GET', '/rdv/lien?jeton=' + jetonLien);
  verifie('la page publique montre les 2 créneaux', r.code === 200 && r.d.creneaux.length === 2 && r.d.destinataire === 'Chloé', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/lien/choix', { jeton: jetonLien, rang: -1 });
  verifie('Chloé répond « aucun ne me va »', r.code === 200, r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p2);
  verifie('Alice le retrouve : refusé, Chloé, Kiné', x && x.etat === 'refuse' && x.qui === 'Chloé' && x.titre === 'Kiné' && x.debut === null, JSON.stringify(x));
  verifie('rien dans l agenda d Alice (un ancien lien aurait écrit tc_rdv_)', sql("SELECT COUNT(*) FROM elements WHERE compte_id = " + a.id + " AND type = 'rdv'") === '0');
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p2 }, a.jeton);

  console.log('-- 3. Pas de réponse sous 24 h --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', reference: b.reference, titre: 'Réunion', remplace: 'orig3' }, a.jeton);
  const p3 = r.d.rdv_id;
  verifie('le délai est de 24 h', sql('SELECT TIMESTAMPDIFF(MINUTE, cree_le, expire_le) FROM rdv WHERE id = ' + p3) === '1440');
  sql('UPDATE rdv SET expire_le = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ' + p3);
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p3);
  verifie('passé le délai : « sans réponse »', x && x.etat === 'sans_reponse', JSON.stringify(x));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p3 }, a.jeton);
  verifie('une fois traitée, elle est close', sql('SELECT statut FROM rdv WHERE id = ' + p3) === 'expire');
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p3, rang: 1 }, b.jeton);
  verifie('et Bruno ne peut plus choisir (410)', r.code === 410, r.code);

  console.log('-- 4. Le créneau encore libre --');
  poserRdv(a.id, 'orig4', jour, 10, 11);
  poserRdv(a.id, 'autre4', jour, 14, 15);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', reference: b.reference, titre: 'Point', remplace: 'orig4' }, a.jeton);
  const p4 = r.d.rdv_id;
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p4, rang: 2 }, b.jeton);
  verifie('14h est pris par un autre rendez-vous : 409, la proposition reste ouverte', r.code === 409 && sql('SELECT statut FROM rdv WHERE id = ' + p4) === 'attente', r.code);
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p4, rang: 1 }, b.jeton);
  verifie('10h n est occupé que par le rendez-vous qu on décale : accepté', r.code === 200, r.texte.slice(0, 200));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p4 }, a.jeton);

  console.log('-- 5. Les refus --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: [], texte: 'x', reference: b.reference }, a.jeton);
  verifie('sans créneau : 400', r.code === 400, r.code);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: [{ debut: jour + ' 11:00:00', fin: jour + ' 10:00:00' }], texte: 'x', reference: b.reference }, a.jeton);
  verifie('créneau à l envers : 400', r.code === 400, r.code);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', reference: a.reference }, a.jeton);
  verifie('à soi-même : 400', r.code === 400, r.code);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x' });
  verifie('sans session : 401', r.code === 401, r.code);
  r = await appel('GET', '/rdv/propositions');
  verifie('liste sans session : 401', r.code === 401, r.code);

  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO exception ' + e.stack); console.log((ko + 1) + ' anomalie(s).'); process.exit(1); });
