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
  const id = { prenom: nom, nom: 'Proposition', ville: 'Lyon', code_postal: '69001', email: 'sonde.proposition' + n + stamp + '@exemple-timecool.fr', telephone: '+3363998' + String(stamp + n).slice(-4), mot_de_passe: 'Motdepasse-propo-1' };
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
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p1 }, a.jeton);
  verifie('donner suite sans dire laquelle : 400', r.code === 400, r.code);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p1, decision: 'place' }, b.jeton);
  verifie('seule Alice donne suite', r.code === 200 && r.d.traite === false, r.texte);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p1, decision: 'place' }, a.jeton);
  verifie('Alice place : le message « Rendez-vous déplacé : mardi à 14h. », écrit dans la messagerie de Bruno', r.code === 200 && r.d.traite === true && r.d.message === 'Rendez-vous déplacé : mardi à 14h.' && r.d.messagerie === true, r.texte);
  carte = await carteChez(b, a.reference, p1);
  const filB = JSON.parse(sql("SELECT contenu FROM elements WHERE compte_id = " + b.id + " AND type = 'conversation' AND uid = '" + echappe(a.reference) + "'")).thread;
  verifie('chez Bruno : la carte dit « place » (plus de boutons), le message suit', carte && carte.suite === 'place' && carte.choix === 2 && filB[filB.length - 1].from === 'them' && filB[filB.length - 1].texte === 'Rendez-vous déplacé : mardi à 14h.', JSON.stringify(filB.slice(-2)));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  verifie('la réponse ne revient plus', r.d.propositions.every((y) => y.rdv_id !== p1));

  console.log('-- 2. Un contact sans TimeCool : le lien, « aucun ne me va » --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: creneaux.slice(0, 2), texte: 'x', prenom_destinataire: 'Chloé', titre: 'Kiné', remplace: 'orig2', avant: 'lundi 2 novembre à 9h' }, a.jeton);
  verifie('créée avec un lien', r.code === 201 && /\/rdv\/[A-Z2-9]{8,16}$/.test(r.d.url || ''), r.texte.slice(0, 200));
  const p2 = r.d.rdv_id;
  const jetonLien = (r.d.url || '').split('/').pop();
  r = await appel('GET', '/rdv/lien?jeton=' + jetonLien);
  verifie('la page publique montre les 2 créneaux, dit que c est Charly et le rendez-vous d avant', r.code === 200 && r.d.creneaux.length === 2 && r.d.destinataire === 'Chloé' && r.d.charly === true && r.d.avant === 'lundi 2 novembre à 9h', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/lien/choix', { jeton: jetonLien, rang: -1 });
  verifie('Chloé répond « aucun ne me va »', r.code === 200, r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p2);
  verifie('Alice le retrouve : refusé, Chloé, Kiné', x && x.etat === 'refuse' && x.qui === 'Chloé' && x.titre === 'Kiné' && x.debut === null && x.tours === 1, JSON.stringify(x));
  verifie('rien dans l agenda d Alice (un ancien lien aurait écrit tc_rdv_)', sql("SELECT COUNT(*) FROM elements WHERE compte_id = " + a.id + " AND type = 'rdv'") === '0');
  r = await appel('GET', '/rdv/lien?jeton=' + jetonLien);
  verifie('Chloé rouvre son lien : « refus noté », pas de créneaux', r.code === 200 && r.d.suite && r.d.suite.etat === 'refus_note' && r.d.creneaux.length === 0, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p2, decision: 'place' }, a.jeton);
  verifie('placer sans créneau choisi : 409', r.code === 409, r.code);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p2, decision: 'laisse' }, a.jeton);
  verifie('Alice laisse : le message « Finalement, le rendez-vous du lundi 2 novembre à 9h reste en place. » revient à l application (lien)', r.code === 200 && r.d.message === 'Finalement, le rendez-vous du lundi 2 novembre à 9h reste en place.' && r.d.messagerie === false, r.texte);
  r = await appel('GET', '/rdv/lien?jeton=' + jetonLien);
  verifie('et son lien le dit : « en place »', r.code === 200 && r.d.suite && r.d.suite.etat === 'en_place' && r.d.avant === 'lundi 2 novembre à 9h', r.texte.slice(0, 200));

  console.log('-- 3. Pas de réponse sous 24 h --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', reference: b.reference, titre: 'Réunion', remplace: 'orig3' }, a.jeton);
  const p3 = r.d.rdv_id;
  verifie('le délai est de 24 h', sql('SELECT TIMESTAMPDIFF(MINUTE, cree_le, expire_le) FROM rdv WHERE id = ' + p3) === '1440');
  sql('UPDATE rdv SET expire_le = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ' + p3);
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p3);
  verifie('passé le délai : « sans réponse »', x && x.etat === 'sans_reponse', JSON.stringify(x));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p3, decision: 'autres' }, a.jeton);
  verifie('une fois traitée, elle est close', sql('SELECT statut FROM rdv WHERE id = ' + p3) === 'expire');
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p3, rang: 1 }, b.jeton);
  verifie('et Bruno ne peut plus choisir : « n’est plus valable » (410)', r.code === 410 && r.d.erreur === 'plus_valable', r.texte.slice(0, 200));
  carte = await carteChez(b, a.reference, p3);
  verifie('sa carte : suite « autres », plus de boutons', carte && carte.suite === 'autres', JSON.stringify(carte));

  console.log('-- 4. Le créneau encore libre --');
  poserRdv(a.id, 'orig4', jour, 10, 11);
  poserRdv(a.id, 'autre4', jour, 14, 15);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', reference: b.reference, titre: 'Point', remplace: 'orig4' }, a.jeton);
  const p4 = r.d.rdv_id;
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p4, rang: 2 }, b.jeton);
  verifie('14h est pris par un autre rendez-vous : 409, la proposition reste ouverte', r.code === 409 && sql('SELECT statut FROM rdv WHERE id = ' + p4) === 'attente', r.code);
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p4, rang: 1 }, b.jeton);
  verifie('10h n est occupé que par le rendez-vous qu on décale : accepté', r.code === 200, r.texte.slice(0, 200));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p4, decision: 'place' }, a.jeton);

  console.log('-- 4 bis. Le lien après la réponse : noté, puis déplacé ; un lien fermé par « autres » ou « laisse » (examen 73a) --');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', prenom_destinataire: 'Denis', titre: 'Garage', remplace: 'orig6', avant: 'lundi 2 novembre à 15h' }, a.jeton);
  const p6 = r.d.rdv_id, jeton6 = r.d.url.split('/').pop();
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton6, rang: 3 });
  verifie('Denis choisit le 3e', r.code === 200, r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/lien?jeton=' + jeton6);
  verifie('il rouvre son lien : « noté : mardi à 16h », rien de confirmé', r.code === 200 && r.d.suite && r.d.suite.etat === 'note' && r.d.suite.choix === 'mardi à 16h' && r.d.avant === 'lundi 2 novembre à 15h', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p6, decision: 'place' }, a.jeton);
  verifie('Alice place : « Rendez-vous déplacé : mardi à 16h. » revient à l application', r.code === 200 && r.d.message === 'Rendez-vous déplacé : mardi à 16h.' && r.d.messagerie === false, r.texte);
  r = await appel('GET', '/rdv/lien?jeton=' + jeton6);
  verifie('son lien dit maintenant « déplacé : mardi à 16h »', r.code === 200 && r.d.suite && r.d.suite.etat === 'deplace' && r.d.suite.choix === 'mardi à 16h', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/maintenir', { rdv_id: p6 }, b.jeton);
  verifie('« remets-les » : seule Alice peut maintenir', r.code === 200 && r.d.maintenu === false, r.texte);
  r = await appel('POST', '/rdv/proposition/maintenir', { rdv_id: p6 }, a.jeton);
  verifie('Alice remet : « Finalement, le rendez-vous du lundi 2 novembre à 15h est maintenu. » revient à l application (lien)', r.code === 200 && r.d.maintenu === true && r.d.message === 'Finalement, le rendez-vous du lundi 2 novembre à 15h est maintenu.' && r.d.messagerie === false, r.texte);
  r = await appel('GET', '/rdv/lien?jeton=' + jeton6);
  verifie('et le lien de Denis dit « en place »', r.code === 200 && r.d.suite && r.d.suite.etat === 'en_place', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/maintenir', { rdv_id: p6 }, a.jeton);
  verifie('une seule fois', r.code === 200 && r.d.maintenu === false, r.texte);
  r = await appel('POST', '/rdv/proposition/maintenir', { rdv_id: p1 }, a.jeton);
  const filB2 = JSON.parse(sql("SELECT contenu FROM elements WHERE compte_id = " + b.id + " AND type = 'conversation' AND uid = '" + echappe(a.reference) + "'")).thread;
  verifie('Bruno (TimeCool) le lit dans sa messagerie, sa carte dit « en place »', r.d.maintenu === true && r.d.messagerie === true && filB2[filB2.length - 1].texte === 'Finalement, le rendez-vous est maintenu.' && (await carteChez(b, a.reference, p1)).suite === 'laisse', JSON.stringify(filB2.slice(-1)));
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', prenom_destinataire: 'Emma', titre: 'Coiffeur', remplace: 'orig7' }, a.jeton);
  const p7 = r.d.rdv_id, jeton7 = r.d.url.split('/').pop();
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p7, decision: 'autres' }, a.jeton);
  r = await appel('GET', '/rdv/lien?jeton=' + jeton7);
  verifie('« autres » : l ancien lien se ferme (410), plus de créneaux (défaut 3)', r.code === 410, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton7, rang: 1 });
  verifie('et un choix tardif est refusé (410)', r.code === 410, r.code);
  verifie('le lien est marqué expiré en base', sql('SELECT statut FROM rdv_liens WHERE rdv_id = ' + p7) === 'expire');
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', prenom_destinataire: 'Emma', titre: 'Coiffeur', remplace: 'orig7' }, a.jeton);
  const p7b = r.d.rdv_id;
  r = await appel('GET', '/rdv/lien?jeton=' + jeton7);
  verifie('une nouvelle proposition pour le même rendez-vous : l ancien lien dit « d autres moments », sans créneaux (73b)', r.code === 200 && r.d.suite && r.d.suite.etat === 'autres' && r.d.creneaux.length === 0, r.texte.slice(0, 200));
  sql('UPDATE rdv SET expire_le = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ' + p7b);
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p7b);
  verifie('la 2e proposition pour ce rendez-vous : tours = 2 (profil 2 : Charly ne repropose seul qu une fois)', x && x.tours === 2 && x.etat === 'sans_reponse', JSON.stringify(x));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p7b, decision: 'laisse' }, a.jeton);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', prenom_destinataire: 'Emma', titre: 'Coiffeur', remplace: 'orig7' }, a.jeton);
  const p7c = r.d.rdv_id;
  sql('UPDATE rdv SET expire_le = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ' + p7c);
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p7c);
  verifie('laissé en place, puis décalé de nouveau plus tard : une nouvelle série, tours = 1 (remarque 2 de l examen)', x && x.tours === 1, JSON.stringify(x));
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p7c, decision: 'laisse' }, a.jeton);
  r = await appel('POST', '/rdv/proposition/creer', { creneaux, texte: 'x', prenom_destinataire: 'Farid', titre: 'Banque', remplace: 'orig8', avant: 'mercredi 4 novembre à 11h' }, a.jeton);
  const p8 = r.d.rdv_id, jeton8 = r.d.url.split('/').pop();
  await appel('POST', '/rdv/proposition/traiter', { rdv_id: p8, decision: 'laisse' }, a.jeton);
  r = await appel('GET', '/rdv/lien?jeton=' + jeton8);
  verifie('« laisse » sans réponse : le lien ne montre plus de créneaux, il dit que le rendez-vous reste en place', r.code === 200 && r.d.suite && r.d.suite.etat === 'en_place' && r.d.creneaux.length === 0, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton8, rang: 1 });
  verifie('et un choix tardif est refusé (410)', r.code === 410, r.code);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p8, decision: 'place' }, a.jeton);
  verifie('une proposition déjà traitée ne se retraite pas', r.code === 200 && r.d.traite === false, r.texte);
  r = await appel('POST', '/rdv/proposition/traiter', { rdv_id: p8, decision: 'efface' }, a.jeton);
  verifie('décision inconnue : 400', r.code === 400, r.code);

  console.log('-- 4 ter. Deux contacts sur le même créneau : le premier le garde (73c) --');
  const deux = [{ debut: jour + ' 18:00:00', fin: jour + ' 19:00:00', libelle: 'mardi à 18h' }, { debut: jour + ' 08:00:00', fin: jour + ' 09:00:00', libelle: 'mardi à 8h' }];
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: deux, texte: 'x', reference: b.reference, titre: 'Thé', remplace: 'orig9' }, a.jeton);
  const p9 = r.d.rdv_id;
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p9, rang: 1 }, b.jeton);
  verifie('Bruno prend mardi 18h le premier', r.code === 200, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: deux, texte: 'x', prenom_destinataire: 'Gaby', titre: 'Golf', remplace: 'orig10', avant: 'lundi 2 novembre à 17h' }, a.jeton);
  const p10 = r.d.rdv_id, jeton10 = r.d.url.split('/').pop();
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton10, rang: 1 });
  verifie('Gaby choisit aussi 18h : 409 « ce créneau vient d’être pris », le lien reste ouvert', r.code === 409 && r.d.erreur === 'creneau_pris' && sql('SELECT statut FROM rdv_liens WHERE rdv_id = ' + p10) === 'attente', r.texte.slice(0, 200));
  verifie('le créneau est marqué « pris » pour Gaby', sql('SELECT retenu FROM rdv_creneaux WHERE rdv_id = ' + p10 + ' AND rang = 1') === '2');
  r = await appel('GET', '/rdv/lien?jeton=' + jeton10);
  verifie('son lien ne propose plus que mardi 8h', r.code === 200 && r.d.creneaux.length === 1 && r.d.creneaux[0].rang === 2, r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton10, rang: 2 });
  verifie('Gaby prend 8h', r.code === 200, r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p10);
  verifie('Alice le sait : Gaby a choisi 8h, 18h pris par Bruno Proposition', x && x.etat === 'choisi' && x.pris.length === 1 && x.pris[0].libelle === 'mardi à 18h' && x.pris[0].par === 'Bruno Proposition' && x.tous_pris === false, JSON.stringify(x));
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: [deux[0]], texte: 'x', prenom_destinataire: 'Hugo', titre: 'Hockey', remplace: 'orig11', avant: 'lundi 2 novembre à 8h' }, a.jeton);
  const p11 = r.d.rdv_id, jeton11 = r.d.url.split('/').pop();
  r = await appel('POST', '/rdv/lien/choix', { jeton: jeton11, rang: 1 });
  verifie('Hugo, son seul créneau est pris : 409 « tous_pris », la réponse vaut « aucun ne va »', r.code === 409 && r.d.erreur === 'tous_pris' && sql('SELECT statut FROM rdv WHERE id = ' + p11) === 'refuse', r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/lien?jeton=' + jeton11);
  verifie('son lien le dit (« tous pris »), sans créneaux', r.code === 200 && r.d.suite && r.d.suite.etat === 'tous_pris' && r.d.creneaux.length === 0, r.texte.slice(0, 200));
  r = await appel('GET', '/rdv/propositions', undefined, a.jeton);
  x = r.d.propositions.find((y) => y.rdv_id === p11);
  verifie('Alice le retrouve : refusé, tous pris, par Bruno', x && x.etat === 'refuse' && x.tous_pris === true && x.pris[0].par === 'Bruno Proposition', JSON.stringify(x));
  r = await appel('POST', '/rdv/proposition/creer', { creneaux: [deux[0], { debut: jour + ' 12:00:00', fin: jour + ' 13:00:00', libelle: 'mardi à 12h' }], texte: 'x', reference: b.reference, titre: 'Pique-nique', remplace: 'orig12' }, a.jeton);
  const p12 = r.d.rdv_id;
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p12, rang: 1 }, b.jeton);
  verifie('dans la messagerie aussi : 18h déjà gardé (409), la carte le marque « pris »', r.code === 409 && r.d.erreur === 'creneau_pris' && (await carteChez(b, a.reference, p12)).pris.join() === '1', r.texte.slice(0, 200));
  r = await appel('POST', '/rdv/proposition/choisir', { rdv_id: p12, rang: 2 }, b.jeton);
  verifie('et Bruno prend 12h', r.code === 200, r.texte.slice(0, 200));
  for (const id of [p9, p10, p11, p12]) await appel('POST', '/rdv/proposition/traiter', { rdv_id: id, decision: 'laisse' }, a.jeton);

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
