// Mission 40a (12/10) : documents joints, contre l'API (comptes sonde jetables e2erdv.doc…, petits fichiers).
// À lancer sur api-locale (TC_API=http://127.0.0.1:8099, dossier backend/private/documents) après la migration 013,
// puis contre la prod après la mise en ligne. Node 18+ (FormData, Blob).
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
async function envoyer(jeton, rdv, nom, octets, type) {
  const fd = new FormData();
  fd.append('rdv', rdv);
  fd.append('fichier', new Blob([octets], { type: type || 'application/octet-stream' }), nom);
  const r = await fetch(API + '/documents', { method: 'POST', headers: jeton ? { Authorization: 'Bearer ' + jeton } : {}, body: fd });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}
async function lire(jeton, id) {
  const r = await fetch(API + '/documents?id=' + id, { headers: jeton ? { Authorization: 'Bearer ' + jeton } : {} });
  return { code: r.status, type: r.headers.get('content-type') || '', disposition: r.headers.get('content-disposition') || '', octets: r.ok ? new Uint8Array(await r.arrayBuffer()) : null };
}
let n = 0;
async function inscrire(prenom) {
  n++;
  const tel = '+336' + String(Date.now() + n * 613).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.doc' + Date.now() + n + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Doc', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton };
}
// Un vrai PNG (1x1), un PDF minimal, un texte.
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2, 254, 167, 53, 129, 132, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
const TXT = new TextEncoder().encode('Devis du dentiste — 120 €\nMerci.\n');

(async () => {
  const anne = await inscrire('Anne');
  const bob = await inscrire('Bob');
  dire(!!anne.ref && !!bob.ref, 'deux comptes sonde créés');

  console.log('\nJoindre :');
  const t1 = await envoyer(anne.jeton, 'new_1760000000000', 'Devis dentiste.txt', TXT, 'text/plain');
  dire(t1.code === 200 && t1.d && t1.d.document && t1.d.document.id > 0 && t1.d.document.nom === 'Devis dentiste.txt' && t1.d.document.type === 'text/plain' && t1.d.document.taille === TXT.length && t1.d.document.rdv === 'new_1760000000000' && t1.d.document.origine === 'appareil', 'un texte : 200, la description du document (nom, type, taille, rendez-vous)', 'HTTP ' + t1.code + ' ' + JSON.stringify(t1.d).slice(0, 160));
  const idTxt = t1.d && t1.d.document && t1.d.document.id;
  const t2 = await envoyer(anne.jeton, 'new_1760000000000', 'photo.png', PNG, 'image/png');
  dire(t2.code === 200 && t2.d.document.type === 'image/png', 'un PNG : 200, type image/png (contenu verifie)', 'HTTP ' + t2.code);
  const t3 = await envoyer(anne.jeton, 'new_1760000000001', 'compte-rendu.pdf', PDF, 'application/pdf');
  dire(t3.code === 200 && t3.d.document.type === 'application/pdf', 'un PDF sur un autre rendez-vous : 200', 'HTTP ' + t3.code);
  const faux = await envoyer(anne.jeton, 'new_1760000000000', 'image.png', TXT, 'image/png');
  dire(faux.code === 415 && faux.d && faux.d.erreur === 'type_refuse', 'un texte deguise en .png : 415 type_refuse (le contenu ne ment pas)', 'HTTP ' + faux.code + ' ' + (faux.d && faux.d.erreur));
  const exe = await envoyer(anne.jeton, 'new_1760000000000', 'virus.exe', PNG, 'application/octet-stream');
  dire(exe.code === 415, 'un .exe : 415', 'HTTP ' + exe.code);
  const gros = await envoyer(anne.jeton, 'new_1760000000000', 'gros.txt', new Uint8Array(2 * 1024 * 1024 + 1), 'text/plain');
  dire(gros.code === 413 && gros.d && gros.d.erreur === 'fichier_trop_gros' && /2 Mo au plus par document/.test(gros.d.message || ''), '2 Mo + 1 octet : 413 fichier_trop_gros, message clair', 'HTTP ' + gros.code + ' ' + (gros.d && gros.d.message));
  const vide = await envoyer(anne.jeton, 'new_1760000000000', 'vide.txt', new Uint8Array(0), 'text/plain');
  dire(vide.code === 400, 'un fichier vide : 400', 'HTTP ' + vide.code);
  const sansRdv = await envoyer(anne.jeton, 'rdv invalide !', 'a.txt', TXT, 'text/plain');
  dire(sansRdv.code === 400, 'un rendez-vous mal forme : 400', 'HTTP ' + sansRdv.code);
  const sansSession = await envoyer(null, 'new_1', 'a.txt', TXT, 'text/plain');
  dire(sansSession.code === 401, 'sans session : 401', 'HTTP ' + sansSession.code);
  const sansFichier = await appel('POST', '/documents', { rdv: 'new_1' }, anne.jeton);
  dire(sansFichier.code === 400 && sansFichier.d && sansFichier.d.erreur === 'fichier_manquant', 'sans fichier : 400 fichier_manquant', 'HTTP ' + sansFichier.code);

  console.log('\nLire :');
  const l1 = await lire(anne.jeton, idTxt);
  dire(l1.code === 200 && /^text\/plain/.test(l1.type) && l1.octets && l1.octets.length === TXT.length && Array.from(l1.octets).every((b, i) => b === TXT[i]) && /inline/.test(l1.disposition) && /Devis/.test(decodeURIComponent(l1.disposition)), 'le texte revient octet pour octet (dechiffre), inline, avec son nom', l1.code + ' ' + l1.type + ' ' + l1.disposition.slice(0, 80));
  const l2 = await lire(anne.jeton, t2.d.document.id);
  dire(l2.code === 200 && /^image\/png/.test(l2.type) && l2.octets.length === PNG.length, 'le PNG revient tel quel', l2.code + ' ' + l2.type);
  const lb = await lire(bob.jeton, idTxt);
  dire(lb.code === 404, 'un autre compte ne lit pas le document : 404', 'HTTP ' + lb.code);
  const ls = await lire(null, idTxt);
  dire(ls.code === 401, 'sans session : 401', 'HTTP ' + ls.code);
  const l0 = await lire(anne.jeton, 999999999);
  dire(l0.code === 404, 'un identifiant inconnu : 404', 'HTTP ' + l0.code);

  console.log('\nLister :');
  const liste = await appel('POST', '/documents/liste', { rdv: 'new_1760000000000' }, anne.jeton);
  dire(liste.code === 200 && liste.d.documents.length === 2 && liste.d.documents.every((d) => d.rdv === 'new_1760000000000' && !('chemin' in d)) && liste.d.max_fichier === 2 * 1024 * 1024 && liste.d.max_compte === 20 * 1024 * 1024 && liste.d.occupe === TXT.length + PNG.length + PDF.length, 'par rendez-vous : 2 documents, sans chemin, plafonds et place occupee', JSON.stringify({ n: liste.d.documents.length, occupe: liste.d.occupe }));
  const tout = await appel('POST', '/documents/liste', {}, anne.jeton);
  dire(tout.code === 200 && tout.d.documents.length === 3, 'tout : 3 documents', tout.d.documents.length);
  const rienBob = await appel('POST', '/documents/liste', {}, bob.jeton);
  dire(rienBob.code === 200 && rienBob.d.documents.length === 0, 'Bob n a rien');

  console.log('\nRetirer :');
  const s1 = await appel('POST', '/documents/supprimer', { document: idTxt }, bob.jeton);
  dire(s1.code === 404, 'un autre compte ne retire pas : 404', 'HTTP ' + s1.code);
  const s2 = await appel('POST', '/documents/supprimer', { document: idTxt }, anne.jeton);
  dire(s2.code === 200, 'Anne retire le texte : 200', 'HTTP ' + s2.code);
  const l3 = await lire(anne.jeton, idTxt);
  const liste2 = await appel('POST', '/documents/liste', {}, anne.jeton);
  dire(l3.code === 404 && liste2.d.documents.length === 2 && liste2.d.occupe === PNG.length + PDF.length, 'ensuite : plus lisible (404), plus dans la liste, place liberee', l3.code + ' ' + liste2.d.documents.length);
  const s3 = await appel('POST', '/documents/supprimer', { document: idTxt }, anne.jeton);
  dire(s3.code === 404, 'retirer deux fois : 404', 'HTTP ' + s3.code);
  for (const d of liste2.d.documents) await appel('POST', '/documents/supprimer', { document: d.id }, anne.jeton);
  const fin = await appel('POST', '/documents/liste', {}, anne.jeton);
  dire(fin.d.documents.length === 0 && fin.d.occupe === 0, 'tout retire : liste vide, 0 octet (les fichiers de test ne restent pas)');

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
