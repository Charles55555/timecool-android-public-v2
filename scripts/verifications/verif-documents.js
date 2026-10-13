// Mission 40a (12/10) : documents joints a un rendez-vous. API (envoi multipart, plafonds, types, chiffrement au repos,
// lecture par le compte seul, suppression), migration 013, page (liste synchronisee, fiche « 📎 Documents (N) », page
// « Mes documents », verifications sur l appareil, suppression d un rendez-vous).
// Usage : node verif-documents.js <index.html> <backend/api/index.php> <backend/sql/013_documents.sql>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
const sql = fs.readFileSync(process.argv[4], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
function morceau(texte, debut, fin) { const d = texte.indexOf(debut); if (d < 0) return ''; const f = texte.indexOf(fin, d + debut.length); return f < 0 ? texte.slice(d) : texte.slice(d, f); }

(async () => {
titre('1. L API');
const rEnvoi = morceau(api, "case 'POST /documents':", "case 'GET /documents':");
const rLire = morceau(api, "case 'GET /documents':", "case 'POST /documents/liste':");
const rListe = morceau(api, "case 'POST /documents/liste':", "case 'POST /documents/supprimer':");
const rSuppr = morceau(api, "case 'POST /documents/supprimer':", "case 'POST /commentaires':");
verifie('quatre routes, une fois chacune, avant POST /commentaires', ["case 'POST /documents':", "case 'GET /documents':", "case 'POST /documents/liste':", "case 'POST /documents/supprimer':"].every((c) => api.split(c).length === 2) && rEnvoi.length > 800 && rLire.length > 300 && rListe.length > 200 && rSuppr.length > 200);
verifie('envoi : compte obligatoire, rdv requis (forme sure), fichier multipart requis, erreurs PHP de taille → 413', /\$compte = Auth::compte\(\);/.test(rEnvoi) && /preg_match\('\/\^\[A-Za-z0-9_\.:-\]\{1,64\}\$\/', \$rdvUid\)/.test(rEnvoi) && /\$_FILES\['fichier'\]/.test(rEnvoi) && /UPLOAD_ERR_INI_SIZE/.test(rEnvoi) && /Rep::erreur\(400, 'fichier_manquant'/.test(rEnvoi) && /is_uploaded_file/.test(rEnvoi));
verifie('envoi : plafond par fichier (documents_max_octets, 2 Mo) → 413 fichier_trop_gros avec un mot clair ; vide → 400 ; type refuse → 415 ; compte plein (20 Mo) → 413 espace_plein', /\$taille > \$maxOctets/.test(rEnvoi) && /Rep::erreur\(413, 'fichier_trop_gros', 'Ce fichier fait ' \. documentsMoLisible\(\$taille\) \. ' : ' \. documentsMoLisible\(\$maxOctets\) \. ' au plus par document\.'\)/.test(rEnvoi) && /Rep::erreur\(400, 'fichier_vide'/.test(rEnvoi) && /Rep::erreur\(415, 'type_refuse'/.test(rEnvoi) && /SUM\(taille\)/.test(rEnvoi) && /Rep::erreur\(413, 'espace_plein'/.test(rEnvoi) && /2 \* 1024 \* 1024/.test(fonction(api, 'documentsMaxOctets') || '') && /20 \* 1024 \* 1024/.test(fonction(api, 'documentsMaxCompte') || ''));
verifie('envoi : INSERT puis fichier chiffre (Coffre::chiffrer) ecrit sous <dossier>/<compte>/<id>.bin ; echec d ecriture → ligne retiree, 500', /INSERT INTO documents \(compte_id, rdv_uid, nom, type_mime, taille, origine\)/.test(rEnvoi) && /file_put_contents\(\$chemin, Coffre::chiffrer\(\$contenu\), LOCK_EX\)/.test(rEnvoi) && /DELETE FROM documents WHERE id = \?/.test(rEnvoi) && /Rep::erreur\(500, 'stockage_indisponible'/.test(rEnvoi) && rEnvoi.indexOf('INSERT INTO documents') < rEnvoi.indexOf('Coffre::chiffrer'));
verifie('lecture : compte seul (WHERE compte_id), 404 sinon, dechiffree (Coffre::dechiffrer), servie avec son type, inline, nosniff, no-store, puis exit', /SELECT \* FROM documents WHERE id = \? AND compte_id = \? AND supprime_le IS NULL/.test(rLire) && /Coffre::dechiffrer\(\$brut\)/.test(rLire) && /header\('Content-Type: ' \. \$d\['type_mime'\]\);/.test(rLire) && /Content-Disposition: inline/.test(rLire) && /X-Content-Type-Options: nosniff/.test(rLire) && /Cache-Control: private, no-store/.test(rLire) && /echo \$clair;\s+exit;/.test(rLire));
verifie('liste : par rendez-vous ou tout, du compte, avec occupe / max_fichier / max_compte ; suppression : marque supprime_le et efface le fichier', /'documents' => array_map\('documentsLigne', \$lignes\), 'occupe' =>/.test(rListe) && /UPDATE documents SET supprime_le = NOW\(\) WHERE id = \?/.test(rSuppr) && /@unlink\(\$chemin\)/.test(rSuppr));
verifie('aides : dossier configurable hors racine web (../private/documents), nom sur (basename, controle), types par extension ET contenu (finfo), jamais d executable', /Conf::get\('documents_dossier', __DIR__ \. '\/\.\.\/private\/documents'\)/.test(fonction(api, 'documentsDossier') || '') && /basename\(/.test(fonction(api, 'documentsNomSur') || '') && /new finfo\(FILEINFO_MIME_TYPE\)/.test(fonction(api, 'documentsTypeAutorise') || '') && !/'(exe|sh|bat|cmd|php|js|html|htm|zip|svg|apk|msi)' =>/.test((fonction(api, 'documentsTypeAutorise') || '').split('$parExtension = [')[1].split('];')[0]) && /'pdf' => \['application\/pdf'\]/.test(fonction(api, 'documentsTypeAutorise') || ''));
verifie('documentsLigne ne rend jamais le chemin', !/chemin/.test(fonction(api, 'documentsLigne') || ''));

titre('2. La migration 013');
verifie('CREATE TABLE IF NOT EXISTS documents : compte, rdv_uid, nom(200), type_mime, taille, origine appareil/drive, lien_drive, supprime_le, cree_le, cle etrangere comptes', /CREATE TABLE IF NOT EXISTS documents \(/.test(sql) && /rdv_uid\s+VARCHAR\(64\) NOT NULL/.test(sql) && /nom\s+VARCHAR\(200\) NOT NULL/.test(sql) && /taille\s+INT UNSIGNED NOT NULL/.test(sql) && /origine\s+ENUM\('appareil','drive'\)/.test(sql) && /supprime_le\s+DATETIME NULL/.test(sql) && /FOREIGN KEY \(compte_id\) REFERENCES comptes \(id\) ON DELETE CASCADE/.test(sql) && /utf8mb4_unicode_ci/.test(sql));

titre('3. La page : liste synchronisee, fiche, menu, page, verifications, suppression');
verifie('la liste (tc_documents) a sa famille « document » dans TC_SYNC_TYPES et sa cle dans TC_SYNC_DEJA_SYNCHRONISE', /document: \{\s+lire: function \(\) \{ return typeof documentsList === 'undefined' \? \[\] : documentsList; \},/.test(page) && /'tc_documents',/.test((page.match(/const TC_SYNC_DEJA_SYNCHRONISE = \[[^\]]*\];/) || [''])[0]) && /if \(typeof documentsList !== 'undefined'\) documentsList = \[\];/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));
verifie('menu : « 📎 Mes documents » sous « Analyse de mon temps », dans les deux modes ; page-documents ; navigate → renderDocumentsPage', (page.match(/\{id:'documents', icon:'📎', label:'Mes documents'\}/g) || []).length === 2 && /id="page-documents"/.test(page) && /else if \(page === 'documents'\) renderDocumentsPage\(\);/.test(page));
verifie('fiche : la ligne tcLigneDocumentsFiche(e) avant « Confidentialité »', /\$\{typeof tcLigneDocumentsFiche === 'function' \? tcLigneDocumentsFiche\(e\) : ''\}\s+<div class="event-detail-row"><svg viewBox="0 0 24 24"><path d="M12 1 3 5v6c0/.test(page));
verifie('TC_BACKEND : envoyerDocument (multipart, Authorization, 90 s), listerDocuments, supprimerDocument, lireDocument (Blob)', /async envoyerDocument\(fichier, rdvId\) \{[\s\S]*?new FormData\(\)[\s\S]*?corps\.append\('fichier', fichier, fichier\.name \|\| 'document'\);[\s\S]*?90000/.test(page) && /tcAppel\('POST', '\/documents\/liste'/.test(page) && /tcAppel\('POST', '\/documents\/supprimer', \{ document: id \}\)/.test(page) && /fetch\(TC_API \+ '\/documents\?id=' \+ encodeURIComponent\(id\), \{ headers: entetes \}\)/.test(page));
verifie('un rendez-vous supprime emporte ses documents (fiche et Charly)', /tcJournaliserRdvManuel\('supprime', e\);\s+if \(typeof tcSupprimerDocumentsDesRdv === 'function'\) tcSupprimerDocumentsDesRdv\(\[e\.id\]\);/.test(fonction(page, 'deleteCurrentEvent') || '') && /tcSupprimerDocumentsDesRdv\(cible\.map\(function \(e\) \{ return e\.id; \}\)\);/.test(fonction(page, 'tcSupprimerRdvs') || ''));

// Simulation des aides pures.
const toasts = []; const appels = [];
const ctx = { console, String, Number, Array, Date, JSON, Math, Object, localStorage: { getItem: () => null, setItem() {} }, tcSyncBientot() { appels.push('sync'); },
  escapeHTMLSafe: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  showToast: (m) => toasts.push(m), events: [{ id: 'e1', title: 'Dentiste', date: '2026-10-13', startH: 15, startM: 0, endH: 16, endM: 0 }],
  TC_BACKEND: { estConnecte: () => true, supprimerDocument: async (id) => { appels.push('suppr:' + id); return {}; } }, currentPage: 'calendar', document: { getElementById: () => null } };
vm.createContext(ctx);
['const TC_DOCUMENTS_KEY = [^;]*;', 'const TC_DOCUMENT_MAX_OCTETS = [^;]*;', 'const TC_DOCUMENT_TYPES = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
vm.runInContext('var documentsList = [];', ctx);
let manque = 0;
['saveDocuments', 'tcTailleLisible', 'tcDocumentTypeAccepte', 'tcRefusDocument', 'tcDocumentsDuRdv', 'tcLigneDocumentHTML', 'tcLigneDocumentsFiche', 'tcSupprimerDocumentsDesRdv', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcLigneRdvPourJournal', 'renderDocumentsPage'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manque++; console.log('  KO  ' + n + ' introuvable'); } });
if (manque) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
verifie('tcTailleLisible : 2 Mo, 1,4 Mo, 320 Ko, 1 Ko au moins', ctx.tcTailleLisible(2 * 1024 * 1024) === '2 Mo' && ctx.tcTailleLisible(1.4 * 1024 * 1024) === '1,4 Mo' && ctx.tcTailleLisible(320 * 1024) === '320 Ko' && ctx.tcTailleLisible(10) === '1 Ko');
verifie('types acceptes : pdf, jpg, png, docx, xlsx, pptx, txt ; refuses : exe, zip, html, js, sans extension', ['a.pdf', 'b.JPG', 'c.png', 'd.docx', 'e.xlsx', 'f.pptx', 'g.txt'].every((n) => ctx.tcDocumentTypeAccepte(n)) && ['a.exe', 'b.zip', 'c.html', 'd.js', 'sansext', 'e.php'].every((n) => !ctx.tcDocumentTypeAccepte(n)));
verifie('tcRefusDocument : trop gros → « Ce fichier fait 3 Mo : 2 Mo au plus par document. » ; type → mot clair ; vide ; bon → \'\'', ctx.tcRefusDocument({ name: 'x.pdf', size: 3 * 1024 * 1024 }) === 'Ce fichier fait 3 Mo : 2 Mo au plus par document.' && /PDF, image, Word, Excel, PowerPoint ou texte/.test(ctx.tcRefusDocument({ name: 'x.exe', size: 10 })) && /vide/.test(ctx.tcRefusDocument({ name: 'x.pdf', size: 0 })) && ctx.tcRefusDocument({ name: 'x.pdf', size: 2 * 1024 * 1024 }) === '' && ctx.tcRefusDocument(null) !== '');
vm.runInContext("documentsList = [{ id: 'doc_2', serveur: 2, rdv: 'e1', nom: 'Devis <b>.pdf', type: 'application/pdf', taille: 350000, origine: 'appareil', creeLe: '2026-10-12T10:00:00' }, { id: 'doc_1', serveur: 1, rdv: 'e1', nom: 'Photo.jpg', type: 'image/jpeg', taille: 1200000, origine: 'appareil', creeLe: '2026-10-11T10:00:00' }, { id: 'doc_3', serveur: 3, rdv: 'e9', nom: 'Orphelin.txt', type: 'text/plain', taille: 1000, origine: 'appareil', creeLe: '2026-10-10T10:00:00' }];", ctx);
const docs = ctx.tcDocumentsDuRdv('e1');
verifie('tcDocumentsDuRdv : ceux du rendez-vous, du plus ancien au plus recent', docs.map((d) => d.id).join() === 'doc_1,doc_2');
const ligne = ctx.tcLigneDocumentsFiche(ctx.events[0]);
verifie('la ligne de la fiche : « Documents (2) », noms echappes, tailles, Ouvrir / Retirer par identifiant, « Joindre un document » (fichier cache, types acceptes), le plafond dit', /Documents \(2\)/.test(ligne) && /Devis &lt;b&gt;\.pdf/.test(ligne) && /1,1 Mo|1,2 Mo/.test(ligne) && /tcOuvrirDocument\('doc_2'\)/.test(ligne) && /tcRetirerDocument\('doc_1', false\)/.test(ligne) && /➕ Joindre un document<input type="file" accept="\.pdf,\.jpg/.test(ligne) && /onchange="tcJoindreDocument\(event, 'e1'\)"/.test(ligne) && /2 Mo au plus par document/.test(ligne), ligne.slice(0, 200));
verifie('sans document : « Aucun document joint. » ; hors session : pas de bouton, un mot', /Aucun document joint\./.test(ctx.tcLigneDocumentsFiche({ id: 'e7' })) && (() => { ctx.TC_BACKEND.estConnecte = () => false; const h = ctx.tcLigneDocumentsFiche(ctx.events[0]); ctx.TC_BACKEND.estConnecte = () => true; return !/Joindre un document/.test(h) && /Ouvre une session TimeCool/.test(h); })());
let html = '';
ctx.document.getElementById = (id) => id === 'documentsList' ? { set innerHTML(v) { html = v; } } : null;
ctx.renderDocumentsPage();
verifie('page « Mes documents » : total « 3 documents · 1,5 Mo sur 20 Mo », groupe Dentiste (titre + date), groupe « Rendez-vous supprimé » pour l orphelin', /3 documents · 1,5 Mo sur 20 Mo/.test(html) && /📅 Dentiste <span[^>]*>— Mardi 13 octobre, 15h à 16h<\/span>/.test(html) && /Rendez-vous supprimé/.test(html) && /tcRetirerDocument\('doc_3', true\)/.test(html), html.slice(0, 300));
appels.length = 0;
const n = ctx.tcSupprimerDocumentsDesRdv(['e1']);
verifie('un rendez-vous supprime : ses 2 documents quittent la liste, le serveur efface (sans bloquer), l orphelin reste', n === 2 && vm.runInContext('documentsList.map(function (d) { return d.id; }).join()', ctx) === 'doc_3' && appels.indexOf('suppr:1') >= 0 && appels.indexOf('suppr:2') >= 0 && appels.indexOf('sync') >= 0);
vm.runInContext('documentsList = [];', ctx); ctx.renderDocumentsPage();
verifie('page vide : un mot qui dit quoi faire', /Aucun document pour l’instant/.test(html));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
