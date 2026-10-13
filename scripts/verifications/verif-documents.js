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
const rAdmin = morceau(api, "case 'POST /admin/supprimer':", "case 'POST /admin/administrateur':");
verifie('suppression d un compte : ses fichiers et son dossier sont effaces AVANT le DELETE (documentsEffacerDuCompte, rien n echoue si le dossier manque)', /\$cibleSuppression = Db::un\('SELECT id FROM comptes WHERE reference = \?', \[\$ref\]\);\s+if \(\$cibleSuppression !== null\) \{\s+documentsEffacerDuCompte\(\(int\) \$cibleSuppression\['id'\]\);\s+\}\s+\$sup = Db::req\('DELETE FROM comptes WHERE reference = \?', \[\$ref\]\);/.test(rAdmin) && !/cibleSuppression = compteParReference/.test(rAdmin) && /if \(\$compteId <= 0 \|\| !is_dir\(\$dossier\)\) \{\s+return 0;/.test(fonction(api, 'documentsEffacerDuCompte') || '') && /glob\(\$dossier \. '\/\*\.bin'\)/.test(fonction(api, 'documentsEffacerDuCompte') || '') && /@rmdir\(\$dossier\)/.test(fonction(api, 'documentsEffacerDuCompte') || ''));

titre('2. La migration 013');
verifie('CREATE TABLE IF NOT EXISTS documents : compte, rdv_uid, nom(200), type_mime, taille, origine appareil/drive, lien_drive, supprime_le, cree_le, cle etrangere comptes', /CREATE TABLE IF NOT EXISTS documents \(/.test(sql) && /rdv_uid\s+VARCHAR\(64\) NOT NULL/.test(sql) && /nom\s+VARCHAR\(200\) NOT NULL/.test(sql) && /taille\s+INT UNSIGNED NOT NULL/.test(sql) && /origine\s+ENUM\('appareil','drive'\)/.test(sql) && /supprime_le\s+DATETIME NULL/.test(sql) && /FOREIGN KEY \(compte_id\) REFERENCES comptes \(id\) ON DELETE CASCADE/.test(sql) && /utf8mb4_unicode_ci/.test(sql));

titre('3. La page : liste synchronisee, fiche, menu, page, verifications, suppression');
verifie('la liste (tc_documents) a sa famille « document » dans TC_SYNC_TYPES et sa cle dans TC_SYNC_DEJA_SYNCHRONISE', /document: \{\s+lire: function \(\) \{ if \(typeof tcRejouerEffacementsDocuments === 'function'\) tcRejouerEffacementsDocuments\(\); return typeof documentsList === 'undefined' \? \[\] : documentsList; \},/.test(page) && /'tc_documents',/.test((page.match(/const TC_SYNC_DEJA_SYNCHRONISE = \[[^\]]*\];/) || [''])[0]) && /if \(typeof documentsList !== 'undefined'\) documentsList = \[\];/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));
verifie('menu : « 📎 Mes documents » sous « Analyse de mon temps », dans les deux modes ; page-documents ; navigate → renderDocumentsPage', (page.match(/\{id:'documents', icon:'📎', label:'Mes documents'\}/g) || []).length === 2 && /id="page-documents"/.test(page) && /else if \(page === 'documents'\) renderDocumentsPage\(\);/.test(page));
verifie('fiche : la ligne tcLigneDocumentsFiche(e) avant « Confidentialité »', /\$\{typeof tcLigneDocumentsFiche === 'function' \? tcLigneDocumentsFiche\(e\) : ''\}\s+<div class="event-detail-row"><svg viewBox="0 0 24 24"><path d="M12 1 3 5v6c0/.test(page));
verifie('TC_BACKEND : envoyerDocument (multipart, Authorization, 90 s), listerDocuments, supprimerDocument, lireDocument (Blob)', /async envoyerDocument\(fichier, rdvId\) \{[\s\S]*?new FormData\(\)[\s\S]*?corps\.append\('fichier', fichier, fichier\.name \|\| 'document'\);[\s\S]*?90000/.test(page) && /tcAppel\('POST', '\/documents\/liste'/.test(page) && /tcAppel\('POST', '\/documents\/supprimer', \{ document: id \}\)/.test(page) && /fetch\(TC_API \+ '\/documents\?id=' \+ encodeURIComponent\(id\), \{ headers: entetes \}\)/.test(page));
verifie('un rendez-vous supprime emporte ses documents (fiche et Charly)', /tcJournaliserRdvManuel\('supprime', e\);\s+if \(typeof tcSupprimerDocumentsDesRdv === 'function'\) tcSupprimerDocumentsDesRdv\(\[e\.id\]\);/.test(fonction(page, 'deleteCurrentEvent') || '') && /tcSupprimerDocumentsDesRdv\(cible\.map\(function \(e\) \{ return e\.id; \}\)\);/.test(fonction(page, 'tcSupprimerRdvs') || ''));

// Simulation des aides pures.
const toasts = []; const appels = [];
const stock = {};
const ctx = { console, String, Number, Array, Date, JSON, Math, Object, Promise, setTimeout, localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; } }, tcSyncBientot() { appels.push('sync'); },
  escapeHTMLSafe: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  showToast: (m) => toasts.push(m), events: [{ id: 'e1', title: 'Dentiste', date: '2026-10-13', startH: 15, startM: 0, endH: 16, endM: 0 }],
  _serveurEnPanne: false,
  TC_BACKEND: { estConnecte: () => true, supprimerDocument: async (id) => { if (ctx._serveurEnPanne) { const e = new Error('Serveur injoignable'); e.code = 'reseau'; throw e; } appels.push('suppr:' + id); return {}; }, listerDocuments: async () => ({ documents: ctx._surServeur || [], max_compte: 20 * 1024 * 1024 }) }, currentPage: 'calendar', document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext('var _tcRejeuEffacementsEnCours = false; var _tcDocumentsMaxCompte = 20 * 1024 * 1024; var _tcDocumentsRdvRelus = {};', ctx);
ctx.TC_BACKEND.listerDocuments = async (rdv) => { appels.push('liste:' + (rdv || 'tout')); return { documents: (ctx._surServeur || []).filter((d) => !rdv || String(d.rdv) === String(rdv)), max_compte: 20 * 1024 * 1024 }; };
['const TC_DOCUMENTS_KEY = [^;]*;', 'const TC_DOCUMENT_MAX_OCTETS = [^;]*;', 'const TC_DOCUMENT_TYPES = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
vm.runInContext('var documentsList = [];', ctx);
let manque = 0;
['saveDocuments', 'tcTailleLisible', 'tcDocumentTypeAccepte', 'tcRefusDocument', 'tcDocumentsDuRdv', 'tcLigneDocumentHTML', 'tcLigneDocumentsFiche', 'tcSupprimerDocumentsDesRdv', 'tcEffacementsEnAttente', 'tcPoserEffacementsEnAttente', 'tcNoterEffacementDocument', 'tcRejouerEffacementsDocuments', 'tcRapprocherDocumentsDuServeur', 'tcRapprocherDocumentsDuRdv', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcLigneRdvPourJournal', 'renderDocumentsPage'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manque++; console.log('  KO  ' + n + ' introuvable'); } });
if (manque) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
verifie('tcTailleLisible : 2 Mo, 1,4 Mo, 320 Ko, 1 Ko au moins ; arrondie vers le haut : 2 Mo + 200 octets → « 2,01 Mo » (jamais « 2 Mo » face au plafond)', ctx.tcTailleLisible(2 * 1024 * 1024) === '2 Mo' && ctx.tcTailleLisible(1.4 * 1024 * 1024) === '1,4 Mo' && ctx.tcTailleLisible(320 * 1024) === '320 Ko' && ctx.tcTailleLisible(10) === '1 Ko' && ctx.tcTailleLisible(2 * 1024 * 1024 + 200) === '2,01 Mo' && ctx.tcTailleLisible(2 * 1024 * 1024 + 1) === '2,01 Mo' && ctx.tcTailleLisible(1024 * 1024 - 1) === '1024 Ko', [ctx.tcTailleLisible(2 * 1024 * 1024 + 200), ctx.tcTailleLisible(1024 * 1024 - 1)].join(' '));
verifie('le serveur arrondit de la meme façon (documentsMoLisible : ceil au centieme, zeros retires)', /ceil\(\$octets \/ \(1024 \* 1024\) \* 100\) \/ 100/.test(fonction(api, 'documentsMoLisible') || '') && /rtrim\(rtrim\(\$texte, '0'\), ','\)/.test(fonction(api, 'documentsMoLisible') || '') && /ceil\(\$octets \/ 1024\)/.test(fonction(api, 'documentsMoLisible') || ''));
verifie('2 Mo + 200 octets sur l appareil : « Ce fichier fait 2,01 Mo : 2 Mo au plus par document. »', ctx.tcRefusDocument({ name: 'x.pdf', size: 2 * 1024 * 1024 + 200 }) === 'Ce fichier fait 2,01 Mo : 2 Mo au plus par document.');
const ouvrir = fonction(page, 'tcOuvrirDocument') || '';
verifie('« Ouvrir » : la fenetre s ouvre DANS le geste (window.open avant l attente), le fichier y arrive ensuite (fenetre.location) ; sinon telechargement avec un mot ; blob libere ; fenetre fermee en cas d erreur', ouvrir.indexOf("window.open('', '_blank')") > 0 && ouvrir.indexOf("window.open('', '_blank')") < ouvrir.indexOf('await TC_BACKEND.lireDocument') && /fenetre\.location = url;/.test(ouvrir) && /a\.download = d\.nom;/.test(ouvrir) && /est téléchargé/.test(ouvrir) && /URL\.revokeObjectURL\(url\)/.test(ouvrir) && /fenetre\.close\(\)/.test(ouvrir) && /\/\^https:\\\/\\\/\/\.test\(String\(d\.lienDrive\)\)/.test(ouvrir));
// 40d : dans l application Android, « Ouvrir » passe par le telephone (pont natif), jamais par une fenetre ni un blob.
verifie('« Ouvrir » dans l APK : le pont natif est pris avant toute fenetre (tcOuvertureNativeDisponible → tcOuvrirDocumentDansAndroid)', ouvrir.indexOf('if (tcOuvertureNativeDisponible()) return tcOuvrirDocumentDansAndroid(d);') > 0 && ouvrir.indexOf('tcOuvertureNativeDisponible()') < ouvrir.indexOf("window.open('', '_blank')"));
const natifs = [];
ctx.window = { TimeCoolNatif: { estNatif: () => true, ouvrirDocument: (nom, b64, mime) => { natifs.push(nom + '|' + b64 + '|' + mime); setTimeout(() => ctx.tcOuvertureDocumentResultat(ctx._telephoneOuvre ? 'true' : 'false'), 0); } } };
ctx.Uint8Array = Uint8Array; ctx.btoa = btoa;
ctx.TC_BACKEND.lireDocument = async (id) => { appels.push('lire:' + id); return { arrayBuffer: async () => new Uint8Array([104, 105]).buffer }; };
vm.runInContext("documentsList = [{ id: 'doc_1', serveur: 1, rdv: 'e1', nom: 'Devis.pdf', type: 'application/pdf', taille: 10, origine: 'appareil', creeLe: '' }];", ctx);
let manqueNatif = 0;
['tcOuvertureNativeDisponible', 'tcOctetsVersBase64', 'tcOuvertureDocumentResultat', 'tcOuvrirDocumentDansAndroid', 'tcOuvrirDocument'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manqueNatif++; console.log('  KO  ' + n + ' introuvable'); } });
if (!manqueNatif) {
  toasts.length = 0; ctx._telephoneOuvre = true;
  await ctx.tcOuvrirDocument('doc_1');
  verifie('APK, le telephone ouvre : le fichier (base64, nom, type) va au pont natif ; aucun « est téléchargé », aucune fenetre', natifs.length === 1 && natifs[0] === 'Devis.pdf|aGk=|application/pdf' && !toasts.some((t) => /téléchargé|Aucune application/.test(t)), toasts.join(' / '));
  toasts.length = 0; ctx._telephoneOuvre = false;
  await ctx.tcOuvrirDocument('doc_1');
  verifie('APK, aucune application capable : un mot calme, jamais un message de reussite', toasts.some((t) => /Aucune application sur ce téléphone ne sait ouvrir « Devis\.pdf »/.test(t)) && !toasts.some((t) => /téléchargé/.test(t)), toasts.join(' / '));
  toasts.length = 0; ctx._telephoneOuvre = true;
  ctx.TC_BACKEND.lireDocument = async () => { const e = new Error('x'); e.code = 'document_introuvable'; throw e; };
  await ctx.tcOuvrirDocument('doc_1');
  verifie('APK, document disparu du serveur : le pont n est pas appele, le mot le dit', natifs.length === 2 && toasts.some((t) => /n’est plus sur le serveur/.test(t)), toasts.join(' / '));
}
const java = process.argv[5] ? fs.readFileSync(process.argv[5], 'utf8') : '';
const xml = process.argv[6] ? fs.readFileSync(process.argv[6], 'utf8') : '';
if (java) {
  const pont = /@JavascriptInterface\s+public void ouvrirDocument\(final String nomFichier,[\s\S]*?\n        \}\n/.exec(java);
  verifie('MainActivity : pont ouvrirDocument (cache documents/, FileProvider, ACTION_VIEW avec le type, lecture accordee, hors du fil principal), reponse vrai/faux a tcOuvertureDocumentResultat, jamais dans les Telechargements', !!pont && /getCacheDir\(\), "documents"/.test(pont[0]) && /FileProvider\.getUriForFile\(/.test(pont[0]) && /Intent\.ACTION_VIEW/.test(pont[0]) && /setDataAndType\(uri, /.test(pont[0]) && /FLAG_GRANT_READ_URI_PERMISSION/.test(pont[0]) && /new Thread\(/.test(pont[0]) && /appelerJs\("tcOuvertureDocumentResultat", ok \? "true" : "false"\)/.test(pont[0]) && /catch \(Exception e\)/.test(pont[0]) && !/MediaStore/.test(pont[0]), pont ? '' : 'pont introuvable');
}
if (java) {
  // 40e : les copies dechiffrees ne survivent ni a la deconnexion ni a un redemarrage de l application.
  const vider = /private void viderDocumentsOuvertsReellement\(\) \{[\s\S]*?\n    \}\n/.exec(java);
  const creation = /protected void onCreate\(Bundle savedInstanceState\) \{[\s\S]*?addJavascriptInterface\(new PontNatif\(\)/.exec(java);
  verifie('MainActivity : viderDocumentsOuvertsReellement efface les fichiers de cache/documents/ seulement, hors du fil principal, sans se plaindre', !!vider && /getCacheDir\(\), "documents"/.test(vider[0]) && /listFiles\(\)/.test(vider[0]) && /f\.isFile\(\)/.test(vider[0]) && /f\.delete\(\)/.test(vider[0]) && /new Thread\(/.test(vider[0]) && !/maj/.test(vider[0]) && !/deleteRecursively|dossier\.delete\(\)/.test(vider[0]));
  verifie('MainActivity : pont viderDocumentsOuverts (@JavascriptInterface) et appel au demarrage (onCreate, avant le pont)', /@JavascriptInterface\s+public void viderDocumentsOuverts\(\) \{\s+viderDocumentsOuvertsReellement\(\);\s+\}/.test(java) && !!creation && /viderDocumentsOuvertsReellement\(\);/.test(creation[0]));
}
verifie('a la deconnexion, la page demande au telephone d effacer les copies ouvertes (garde typeof, sans effet sur le web)', /if \(typeof window !== 'undefined' && window\.TimeCoolNatif && typeof window\.TimeCoolNatif\.viderDocumentsOuverts === 'function'\) \{ try \{ window\.TimeCoolNatif\.viderDocumentsOuverts\(\); \} catch \(e\) \{\} \}/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));
if (xml) verifie('file_paths.xml : le sous-dossier documents/ du cache est expose (et seulement lui en plus de maj/)', /<cache-path name="documents" path="documents\/"\/>/.test(xml) && (xml.match(/<(cache|files|external)[a-z-]*path /g) || []).length === 2);
const refusIni = /UPLOAD_ERR_INI_SIZE[\s\S]*?Rep::erreur\(413, 'fichier_trop_gros', [^\n]*\n/.exec(api);
verifie('API, PHP refuse avant nous : « environ » la taille reçue (Content-Length) si elle depasse, sinon « trop gros » ; jamais « dépasse 2 Mo »', !!refusIni && /\$_SERVER\['CONTENT_LENGTH'\]/.test(refusIni[0]) && /'Ce fichier fait environ ' \. documentsMoLisible\(\$recu\)/.test(refusIni[0]) && /'Ce fichier est trop gros'/.test(refusIni[0]) && !/dépasse/.test(refusIni[0]), refusIni ? refusIni[0].slice(-200) : 'introuvable');
verifie('la fiche relit ses documents a l ouverture (tcRapprocherDocumentsDuRdv dans openEventModal, redessin si changement)', /tcRapprocherDocumentsDuRdv\(e\.id\)\.then\(function \(change\) \{/.test(fonction(page, 'openEventModal') || '') && /openEventModal\(e\);/.test(fonction(page, 'openEventModal') || ''));
// Le redessin ne doit pas effacer une saisie : le formulaire « Modifier » (#editTitle) vit dans le meme cadre.
(function () {
  const src = fonction(page, 'openEventModal') || '';
  const m = /\.then\(function \(change\) \{([\s\S]*?)\n\s*\}\)\.catch/.exec(src);
  if (!m) { verifie('redessin : rappel extrait', false); return; }
  function joue(enEdition) {
    let redessins = 0;
    const c = vm.createContext({ document: { getElementById: (id) => id === 'eventModal' ? { classList: { contains: () => true } } : (id === 'editTitle' && enEdition ? {} : null) }, openEventModal: () => { redessins++; }, currentEvent: null, e: null });
    vm.runInContext('var e = {}; currentEvent = e; var change = true;' + m[1], c);
    return redessins;
  }
  verifie('fiche en lecture : elle se redessine quand un document est arrive', joue(false) === 1);
  verifie('formulaire « Modifier » ouvert dans le meme cadre : la fiche ne se redessine pas, la saisie reste', joue(true) === 0);
})();
verifie('types acceptes : pdf, jpg, png, docx, xlsx, pptx, txt ; refuses : exe, zip, html, js, sans extension', ['a.pdf', 'b.JPG', 'c.png', 'd.docx', 'e.xlsx', 'f.pptx', 'g.txt'].every((n) => ctx.tcDocumentTypeAccepte(n)) && ['a.exe', 'b.zip', 'c.html', 'd.js', 'sansext', 'e.php'].every((n) => !ctx.tcDocumentTypeAccepte(n)));
verifie('tcRefusDocument : trop gros → « Ce fichier fait 3 Mo : 2 Mo au plus par document. » ; type → mot clair ; vide ; bon → \'\'', ctx.tcRefusDocument({ name: 'x.pdf', size: 3 * 1024 * 1024 }) === 'Ce fichier fait 3 Mo : 2 Mo au plus par document.' && /PDF, image, Word, Excel, PowerPoint ou texte/.test(ctx.tcRefusDocument({ name: 'x.exe', size: 10 })) && /vide/.test(ctx.tcRefusDocument({ name: 'x.pdf', size: 0 })) && ctx.tcRefusDocument({ name: 'x.pdf', size: 2 * 1024 * 1024 }) === '' && ctx.tcRefusDocument(null) !== '');
vm.runInContext("documentsList = [{ id: 'doc_2', serveur: 2, rdv: 'e1', nom: 'Devis <b>.pdf', type: 'application/pdf', taille: 350000, origine: 'appareil', creeLe: '2026-10-12T10:00:00' }, { id: 'doc_1', serveur: 1, rdv: 'e1', nom: 'Photo.jpg', type: 'image/jpeg', taille: 1200000, origine: 'appareil', creeLe: '2026-10-11T10:00:00' }, { id: 'doc_3', serveur: 3, rdv: 'e9', nom: 'Orphelin.txt', type: 'text/plain', taille: 1000, origine: 'appareil', creeLe: '2026-10-10T10:00:00' }];", ctx);
const docs = ctx.tcDocumentsDuRdv('e1');
verifie('tcDocumentsDuRdv : ceux du rendez-vous, du plus ancien au plus recent', docs.map((d) => d.id).join() === 'doc_1,doc_2');
const ligne = ctx.tcLigneDocumentsFiche(ctx.events[0]);
verifie('la ligne de la fiche : « Documents (2) », noms echappes, tailles, Ouvrir / Retirer par identifiant, « Joindre un document » (fichier cache, types acceptes), le plafond dit', /Documents \(2\)/.test(ligne) && /Devis &lt;b&gt;\.pdf/.test(ligne) && /1,15 Mo/.test(ligne) && /tcOuvrirDocument\('doc_2'\)/.test(ligne) && /tcRetirerDocument\('doc_1', false\)/.test(ligne) && /➕ Joindre un document<input type="file" accept="\.pdf,\.jpg/.test(ligne) && /onchange="tcJoindreDocument\(event, 'e1'\)"/.test(ligne) && /2 Mo au plus par document/.test(ligne), ligne.slice(0, 200));
verifie('sans document : « Aucun document joint. » ; hors session : pas de bouton, un mot', /Aucun document joint\./.test(ctx.tcLigneDocumentsFiche({ id: 'e7' })) && (() => { ctx.TC_BACKEND.estConnecte = () => false; const h = ctx.tcLigneDocumentsFiche(ctx.events[0]); ctx.TC_BACKEND.estConnecte = () => true; return !/Joindre un document/.test(h) && /Ouvre une session TimeCool/.test(h); })());
let html = '';
ctx.document.getElementById = (id) => id === 'documentsList' ? { set innerHTML(v) { html = v; } } : null;
ctx.renderDocumentsPage();
verifie('page « Mes documents » : total « 3 documents · 1,48 Mo sur 20 Mo » (arrondi vers le haut au centieme), groupe Dentiste (titre + date), groupe « Rendez-vous supprimé » pour l orphelin', /3 documents · 1,48 Mo sur 20 Mo/.test(html) && /📅 Dentiste <span[^>]*>— Mardi 13 octobre, 15h à 16h<\/span>/.test(html) && /Rendez-vous supprimé/.test(html) && /tcRetirerDocument\('doc_3', true\)/.test(html), html.slice(0, 300));
appels.length = 0;
const n = ctx.tcSupprimerDocumentsDesRdv(['e1']);
await new Promise((r) => setTimeout(r, 30));
verifie('un rendez-vous supprime : ses 2 documents quittent la liste, le serveur efface (sans bloquer), l orphelin reste, rien n attend', n === 2 && vm.runInContext('documentsList.map(function (d) { return d.id; }).join()', ctx) === 'doc_3' && appels.indexOf('suppr:1') >= 0 && appels.indexOf('suppr:2') >= 0 && appels.indexOf('sync') >= 0 && ctx.tcEffacementsEnAttente().length === 0, appels.join(' ') + ' | attente ' + JSON.stringify(ctx.tcEffacementsEnAttente()));
// Hors ligne : l effacement est note, rejoue plus tard, jamais perdu.
ctx._serveurEnPanne = true; appels.length = 0;
vm.runInContext("documentsList.push({ id: 'doc_5', serveur: 5, rdv: 'e5', nom: 'Hors ligne.pdf', type: 'application/pdf', taille: 100, origine: 'appareil', creeLe: '2026-10-12T10:00:00' });", ctx);
ctx.tcSupprimerDocumentsDesRdv(['e5']);
await new Promise((r) => setTimeout(r, 30));
verifie('hors ligne : le document quitte la liste, l identifiant 5 reste en attente (tc_documents_a_effacer), rien d efface', !vm.runInContext("documentsList.some(function (d) { return d.id === 'doc_5'; })", ctx) && JSON.stringify(ctx.tcEffacementsEnAttente()) === '[5]' && appels.indexOf('suppr:5') < 0, JSON.stringify(stock['tc_documents_a_effacer']));
ctx._serveurEnPanne = false;
const rejoues = await ctx.tcRejouerEffacementsDocuments();
verifie('le reseau revient : le rejeu efface sur le serveur et vide l attente', rejoues === 1 && appels.indexOf('suppr:5') >= 0 && ctx.tcEffacementsEnAttente().length === 0 && !('tc_documents_a_effacer' in stock));
verifie('un document deja disparu du serveur (404) sort aussi de l attente', await (async () => { ctx.tcNoterEffacementDocument(77); ctx.TC_BACKEND.supprimerDocument = async () => { const e = new Error('x'); e.code = 'document_introuvable'; throw e; }; const f = await ctx.tcRejouerEffacementsDocuments(); ctx.TC_BACKEND.supprimerDocument = async (id) => { appels.push('suppr:' + id); return {}; }; return f === 1 && ctx.tcEffacementsEnAttente().length === 0; })());
// « Mes documents » relit le serveur : ce qui manque ici apparait (autre appareil, effacement perdu), avec Retirer.
ctx._surServeur = [{ id: 3, rdv: 'e9', nom: 'Orphelin.txt', type: 'text/plain', taille: 1000, origine: 'appareil', cree_le: '2026-10-10' }, { id: 9, rdv: 'e1', nom: 'Oublié.pdf', type: 'application/pdf', taille: 5000, origine: 'appareil', cree_le: '2026-10-12' }];
const change = await ctx.tcRapprocherDocumentsDuServeur();
verifie('rapprochement : le document 9 (absent ici) est ajoute, le 3 (deja la) ne l est pas en double, le plafond du compte vient du serveur', change === true && vm.runInContext("documentsList.filter(function (d) { return d.serveur === 9; }).length", ctx) === 1 && vm.runInContext("documentsList.filter(function (d) { return d.serveur === 3; }).length", ctx) === 1 && vm.runInContext('_tcDocumentsMaxCompte', ctx) === 20 * 1024 * 1024);
ctx.tcNoterEffacementDocument(9);
vm.runInContext("documentsList = documentsList.filter(function (d) { return d.serveur !== 9; });", ctx);
verifie('un document en attente d effacement n est pas rapporte par le rapprochement', (await ctx.tcRapprocherDocumentsDuServeur()) === false && !vm.runInContext("documentsList.some(function (d) { return d.serveur === 9; })", ctx));
ctx.tcPoserEffacementsEnAttente([]);
verifie('la page : les effacements sont rejoues puis le serveur relu a l ouverture ; la famille « document » rejoue a chaque tour de synchro ; la cle reste a l appareil et part a la deconnexion', /tcRejouerEffacementsDocuments\(\)\.then\(function \(\) \{ return tcRapprocherDocumentsDuServeur\(\); \}\)/.test(fonction(page, 'renderDocumentsPage') || '') && /lire: function \(\) \{ if \(typeof tcRejouerEffacementsDocuments === 'function'\) tcRejouerEffacementsDocuments\(\); return typeof documentsList/.test(page) && /'tc_documents_a_effacer',/.test((page.match(/const TC_JAMAIS_TRANSFERE = \[[^\]]*\];/) || [''])[0]) && /localStorage\.removeItem\('tc_documents_a_effacer'\)/.test(fonction(page, 'tcViderDonneesDuCompte') || '') && /espace_plein/.test(fonction(page, 'tcJoindreDocument') || ''));
// La fiche relit ses documents : joints ailleurs → ajoutes ; disparus la-bas → retires ; au plus une requete par minute.
vm.runInContext("documentsList = [{ id: 'doc_1', serveur: 1, rdv: 'e1', nom: 'Ici.pdf', type: 'application/pdf', taille: 10, origine: 'appareil', creeLe: '' }, { id: 'doc_4', serveur: 4, rdv: 'e4', nom: 'Autre rdv.pdf', type: 'application/pdf', taille: 10, origine: 'appareil', creeLe: '' }]; _tcDocumentsRdvRelus = {};", ctx);
ctx._surServeur = [{ id: 1, rdv: 'e1', nom: 'Ici.pdf', type: 'application/pdf', taille: 10, origine: 'appareil', cree_le: '' }, { id: 8, rdv: 'e1', nom: 'Joint ailleurs.jpg', type: 'image/jpeg', taille: 20, origine: 'appareil', cree_le: '' }];
appels.length = 0;
const c1 = await ctx.tcRapprocherDocumentsDuRdv('e1');
verifie('fiche : un document joint depuis un autre appareil (8) apparait, celui d un autre rendez-vous n est pas touche, une seule petite requete (par rendez-vous)', c1 === true && vm.runInContext("documentsList.map(function (d) { return d.id; }).sort().join()", ctx) === 'doc_1,doc_4,doc_8' && appels.filter((x) => x === 'liste:e1').length === 1, appels.join(' '));
const c2 = await ctx.tcRapprocherDocumentsDuRdv('e1');
verifie('rouverte dans la minute : aucune nouvelle requete', c2 === false && appels.filter((x) => x === 'liste:e1').length === 1);
ctx._surServeur = [{ id: 8, rdv: 'e1', nom: 'Joint ailleurs.jpg', type: 'image/jpeg', taille: 20, origine: 'appareil', cree_le: '' }];
const c3 = await ctx.tcRapprocherDocumentsDuRdv('e1', true);
verifie('retire sur un autre appareil (1 n est plus sur le serveur) : il s efface ici ; 8 et le document d un autre rendez-vous restent', c3 === true && vm.runInContext("documentsList.map(function (d) { return d.id; }).sort().join()", ctx) === 'doc_4,doc_8');
ctx.tcNoterEffacementDocument(8);
ctx._surServeur = [{ id: 8, rdv: 'e1', nom: 'Joint ailleurs.jpg', type: 'image/jpeg', taille: 20, origine: 'appareil', cree_le: '' }];
vm.runInContext("documentsList = documentsList.filter(function (d) { return d.serveur !== 8; });", ctx);
verifie('un document en attente d effacement n est pas rapporte dans la fiche', (await ctx.tcRapprocherDocumentsDuRdv('e1', true)) === false && !vm.runInContext("documentsList.some(function (d) { return d.serveur === 8; })", ctx));
ctx.tcPoserEffacementsEnAttente([]);
vm.runInContext('documentsList = [];', ctx); ctx.renderDocumentsPage(true);
verifie('page vide : un mot qui dit quoi faire', /Aucun document pour l’instant/.test(html));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
