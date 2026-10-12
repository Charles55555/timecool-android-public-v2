// Mission 27b (12/10) : convocations de groupe reelles (API), messages d un bloque retenus, phrase complete de la liste
// des bloques, synchro immediate apres blocage, reponse de demonstration de Charly vraie.
// Usage : node verif-convocations.js <index.html> <backend/api/index.php> <backend/sql/012_convocations.sql>
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
titre('1. L API : trois routes, messagePoser avec complement, un bloque ne peut plus ecrire');
const rEnvoi = morceau(api, "case 'POST /convocations':", "case 'POST /convocations/repondre':");
const rRep = morceau(api, "case 'POST /convocations/repondre':", "case 'POST /convocations/etat':");
const rEtat = morceau(api, "case 'POST /convocations/etat':", "case 'POST /messages/envoyer':");
verifie('les trois routes existent une fois, avant POST /messages/envoyer', ["case 'POST /convocations':", "case 'POST /convocations/repondre':", "case 'POST /convocations/etat':"].every((c) => api.split(c).length === 2) && rEnvoi.length > 400 && rRep.length > 300 && rEtat.length > 200);
verifie('envoi : titre requis (120), jour AAAA-MM-JJ, debut/fin HH:MM, fin apres debut, pas dans le passe, 30 personnes au plus', /Entree::requis\('titre', 120\)/.test(rEnvoi) && /\$fin <= \$debut/.test(rEnvoi) && /strtotime\('today'\)/.test(rEnvoi) && /count\(\$references\) > 30/.test(rEnvoi) && /Rep::erreur\(400, 'horaire_invalide'/.test(rEnvoi));
verifie('envoi : references inconnues → sans_compte ; l organisateur et les doublons ignores ; INSERT convocations (debut / fin DATETIME) puis convocation_reponses (schema existant)', /\$sansCompte\[\] = \$ref;/.test(rEnvoi) && /\$vus = \[\(int\) \$moi\['id'\] => true\];/.test(rEnvoi) && /INSERT INTO convocations \(organisateur_id, titre, debut, fin\) VALUES \(\?, \?, \?, \?\)',\s+\[\$moi\['id'\], \$titre, \$jour \. ' ' \. \$debut \. ':00', \$jour \. ' ' \. \$fin \. ':00'\]/.test(rEnvoi) && /INSERT INTO convocation_reponses \(convocation_id, compte_id\)/.test(rEnvoi) && api.indexOf('convocation_membres') < 0);
verifie('envoi : un message de genre « convocation » chez chaque membre, avec identifiant, horaire, quand (date en clair), statut attente ; bloque → chez l expediteur seulement', /messagePoser\(\$moi, \$c, \$texte, null, null, 'convocation', null, null, \$bloque,\s+\['convocation' => \$convocationId, 'titre' => \$titre, 'jour' => \$jour, 'debut' => \$debut, 'fin' => \$fin, 'quand' => \$quand, 'statut' => 'attente'\]\)/.test(rEnvoi) && /\$bloque = demandeurBloque\(\(int\) \$c\['id'\], \$moi\);/.test(rEnvoi) && /\$quand = rdvLibelleJour\(\$ts\) \. ' de ' \. \$debut \. ' à ' \. \$fin;/.test(rEnvoi));
verifie('envoi : Rep::ok(id, quand, envoyes, sans_compte)', /Rep::ok\(\['id' => \$convocationId, 'quand' => \$quand, 'envoyes' => \$envoyes, 'sans_compte' => \$sansCompte\]\)/.test(rEnvoi));
verifie('repondre : present|absent seulement (400), membre seulement (404), UPDATE statut + repondu_le, ligne marquee chez le membre, message « sera présent / absent » a l organisateur (genre convocation_reponse)', /in_array\(\$statut, \['present', 'absent'\], true\)/.test(rRep) && /Rep::erreur\(404, 'convocation_introuvable'/.test(rRep) && /UPDATE convocation_reponses SET reponse = \?, repondu_le = NOW\(\) WHERE id = \?/.test(rRep) && /FROM convocation_reponses m\s+JOIN convocations c ON c\.id = m\.convocation_id WHERE m\.convocation_id = \? AND m\.compte_id = \?/.test(rRep) && /convocationRepondue\(\$moi, \(string\) \$organisateur\['reference'\], \$convocationId, \$statut\);/.test(rRep) && /messagePoser\(\$moi, \$organisateur, \$texte, null, null, 'convocation_reponse', null, null, false,/.test(rRep));
verifie('etat : organisateur seul (404 sinon), membres avec reference, prenom, nom, statut, repondu_le ; quand en clair', /WHERE id = \? AND organisateur_id = \?/.test(rEtat) && /FROM convocation_reponses m\s+JOIN comptes k ON k\.id = m\.compte_id WHERE m\.convocation_id = \? AND m\.compte_id IS NOT NULL/.test(rEtat) && /'statut' => \$l\['reponse'\] === 'sans_reponse' \? 'attente' : \(string\) \$l\['reponse'\]/.test(rEtat) && /'membres' => \$membres/.test(rEtat) && /\$jour = substr\(\(string\) \$c\['debut'\], 0, 10\);/.test(rEtat) && /rdvLibelleJour\(\(int\) strtotime\(\(string\) \$c\['debut'\]\)\)/.test(rEtat));
const mp = fonction(api, 'messagePoser') || '';
verifie('messagePoser : parametre ?array $complement fusionne dans la ligne', /\?array \$complement = null\s*\): void/.test(mp) && /if \(is_array\(\$complement\)\) \{\s+\$ligne \+= \$complement;\s+\}/.test(mp));
verifie('convocationRepondue : la ligne « convocation » du membre recoit statut et traite (ses appareils retirent les boutons)', /function convocationRepondue\(array \$membre, string \$referenceOrganisateur, int \$convocationId, string \$statut\): void/.test(api) && /\$conv\['thread'\]\[\$i\]\['statut'\] = \$statut;\s+\$conv\['thread'\]\[\$i\]\['traite'\] = true;/.test(api));
const rMsg = morceau(api, "case 'POST /messages/envoyer':", "case 'POST /rdv/proposer-creneau':");
verifie('/messages/envoyer : bloque par le destinataire → messagePoser chez l expediteur seulement, pas d absence, 200', /\$bloque = demandeurBloque\(\(int\) \$cible\['id'\], \$moi\);\s+messagePoser\(\$moi, \$cible, Entree::requis\('texte', 2000\), null, \$imposee, null, null, null, \$bloque\);\s+if \(!\$bloque\) \{\s+envoyerAbsenceSiBesoin\(\$cible, \$moi\);\s+\}\s+Rep::ok\(\);/.test(rMsg));

titre('2. La migration 012');
verifie('les deux tables du schema existant, rejouables (CREATE TABLE IF NOT EXISTS), utf8mb4 ; plus de convocation_membres', /CREATE TABLE IF NOT EXISTS convocations \(/.test(sql) && /CREATE TABLE IF NOT EXISTS convocation_reponses \(/.test(sql) && (sql.match(/utf8mb4_unicode_ci/g) || []).length === 2 && !/CREATE TABLE IF NOT EXISTS convocation_membres/.test(sql));
verifie('convocations : organisateur_id, titre(200), debut/fin DATETIME, statut ; reponses : compte_id, reponse ENUM sans_reponse/present/absent, repondu_le, unique (convocation, destinataire)', /organisateur_id\s+BIGINT UNSIGNED NOT NULL/.test(sql) && /titre\s+VARCHAR\(200\) NOT NULL/.test(sql) && /debut\s+DATETIME NOT NULL/.test(sql) && /reponse\s+ENUM\('sans_reponse','present','absent'\) NOT NULL DEFAULT 'sans_reponse'/.test(sql) && /UNIQUE KEY uk_conv_rep \(convocation_id, destinataire_cle\)/.test(sql) && /DROP TABLE IF EXISTS convocation_membres/.test(sql));

titre('3. La page : synchro, TC_BACKEND, cadre Present / Absent, envoi reel, decompte');
verifie('la synchro garde convocation, titre, quand, statut sur chaque ligne', /convocation: typeof t\.convocation === 'number' \? t\.convocation : 0,\s+titre: typeof t\.titre === 'string' \? t\.titre : '',\s+quand: typeof t\.quand === 'string' \? t\.quand : '',\s+statut: typeof t\.statut === 'string' \? t\.statut : ''/.test(page));
verifie('TC_BACKEND : envoyerConvocation (POST /convocations), repondreConvocation (/repondre), etatConvocation (/etat)', /tcAppel\('POST', '\/convocations', \{ titre: c\.titre, groupe: c\.groupe \|\| undefined, date: c\.date, debut: c\.debut, fin: c\.fin, references: c\.references \|\| \[\] \}\)/.test(page) && /tcAppel\('POST', '\/convocations\/repondre', \{ convocation: id, statut: statut \}\)/.test(page) && /tcAppel\('POST', '\/convocations\/etat', \{ convocation: id \}\)/.test(page));
verifie('openConversation : apres le cadre de demande, le cadre de convocation recue', /if \(demandeRdv\) body\.innerHTML \+= tcCadreDemandeRdv\(demandeRdv, msg\.with, msg\.reference\);\s+\/\/[^\n]*\n\s+const convocationRecue = \(typeof tcConvocationEnAttente === 'function'\) \? tcConvocationEnAttente\(msg\) : null;\s+if \(convocationRecue\) body\.innerHTML \+= tcCadreConvocation\(convocationRecue, msg\.with\);/.test(fonction(page, 'openConversation') || ''));
verifie('createNewGroup retient nom → reference de compte (membresRefs)', /const membresRefs = \{\};/.test(fonction(page, 'createNewGroup') || '') && /members: members,\s+membresRefs: membresRefs,/.test(page));
const cc = fonction(page, 'createConvocation') || '';
verifie('createConvocation : asynchrone, fin apres debut, references des membres avec TimeCool → TC_BACKEND.envoyerConvocation ; echec → toast, rien de note ; sans session → toast', /^async function createConvocation\(/.test(cc) && /end <= start/.test(cc) && /reponse = await TC_BACKEND\.envoyerConvocation\(\{ titre: title, groupe: msg\.with, date: date, debut: start, fin: end, references: references \}\);/.test(cc) && /Convocation non envoyée : réessaie dans un instant/.test(cc) && /Ouvre une session TimeCool pour envoyer la convocation/.test(cc));
verifie('createConvocation : serveurId, quand (date en clair du serveur ou tcJourEnClair), destinataires avec reference / aMain ; message systeme avec la date en clair ; toast qui dit combien sont a prevenir soi-meme', /serveurId: reponse \? reponse\.id : 0,/.test(cc) && /const quand = \(reponse && reponse\.quand\) \? reponse\.quand : tcJourEnClair\(date\) \+ ' de ' \+ start \+ ' à ' \+ end;/.test(cc) && /aMain: !m\.reference/.test(cc) && /text: '📅 Convocation "' \+ title \+ '" — ' \+ quand,/.test(cc) && /à prévenir toi-même/.test(cc) && /aucun membre n’a TimeCool, préviens-les toi-même/.test(cc));
const od = fonction(page, 'openConvocationDashboard') || '';
verifie('decompte : avec compte, pas de toucher (reponse du serveur) ; sans compte, « (sans TimeCool, noté à la main) » et toucher ; le mot d explication ; date en clair ; rafraichi par tcRafraichirConvocation', /\(r\.aMain \? ' onclick="cycleRecipientStatus/.test(od) && /\(sans TimeCool, noté à la main\)/.test(od) && /Les réponses des membres qui ont TimeCool arrivent ici\./.test(od) && /tcJourEnClair\(c\.date\)/.test(od) && /tcRafraichirConvocation\(c\)\.then/.test(od));
verifie('cycleRecipientStatus : jamais sur un membre avec compte', /if \(!r \|\| !r\.aMain\) return;/.test(fonction(page, 'cycleRecipientStatus') || ''));
verifie('la feuille d envoi dit a qui la convocation part (tcPhraseDestinatairesConvocation)', /tcPhraseDestinatairesConvocation\(msg\)/.test(fonction(page, 'openConvocationSheet') || ''));

// Simulation des aides pures.
{
  const ctx = { console, String, Number, Array, Date, JSON, Math, contactsList: [{ id: 'a', name: 'Paul Convoc', referenceCompte: 'REFPAUL' }, { id: 'b', name: 'Sans Compte' }],
    escapeHTMLSafe: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
  vm.createContext(ctx);
  vm.runInContext('var _tcConvocTraitees = {};', ctx);
  ['tcJourEnClair', 'tcMembresDuGroupe', 'tcPhraseDestinatairesConvocation', 'tcConvocationEnAttente', 'tcCadreConvocation'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  verifie('tcJourEnClair : 2026-10-15 → « jeudi 15 octobre » ; autre chose rendu tel quel', ctx.tcJourEnClair && ctx.tcJourEnClair('2026-10-15') === 'jeudi 15 octobre' && ctx.tcJourEnClair('bizarre') === 'bizarre', ctx.tcJourEnClair && ctx.tcJourEnClair('2026-10-15'));
  const groupe = { with: 'Équipe', members: ['Paul Convoc', 'Sans Compte', 'Rita Convoc'], membresRefs: { 'Rita Convoc': 'REFRITA' } };
  const membres = ctx.tcMembresDuGroupe ? ctx.tcMembresDuGroupe(groupe) : [];
  verifie('tcMembresDuGroupe : reference du groupe (Rita), sinon de la fiche contact (Paul), vide sinon', JSON.stringify(membres) === JSON.stringify([{ name: 'Paul Convoc', reference: 'REFPAUL' }, { name: 'Sans Compte', reference: '' }, { name: 'Rita Convoc', reference: 'REFRITA' }]), JSON.stringify(membres));
  verifie('la phrase de la feuille : « Envoyée dans TimeCool à 2 membres … 1 membre sans TimeCool : tu noteras sa réponse toi-même. »', ctx.tcPhraseDestinatairesConvocation(groupe) === 'Envoyée dans TimeCool à 2 membres : chacun répondra Présent ou Absent. 1 membre sans TimeCool : tu noteras sa réponse toi-même.', ctx.tcPhraseDestinatairesConvocation(groupe));
  verifie('aucun membre avec TimeCool : « rien ne partira »', /rien ne partira/.test(ctx.tcPhraseDestinatairesConvocation({ members: ['Sans Compte'] })));
  const conv = { serveur: true, thread: [{ from: 'them', genre: 'convocation', convocation: 7, titre: 'Entraînement', quand: 'jeudi 15 octobre de 18:00 à 19:00', statut: 'attente', traite: false }] };
  const att = ctx.tcConvocationEnAttente(conv);
  verifie('tcConvocationEnAttente : la convocation recue sans reponse ; traitee ou locale → null', att && att.convocation === 7 && ctx.tcConvocationEnAttente({ serveur: true, thread: [Object.assign({}, conv.thread[0], { traite: true })] }) === null && ctx.tcConvocationEnAttente({ serveur: false, thread: conv.thread }) === null);
  vm.runInContext('_tcConvocTraitees[7] = true;', ctx);
  verifie('apres une reponse (_tcConvocTraitees), le cadre ne revient pas avant la synchro', ctx.tcConvocationEnAttente(conv) === null);
  const html = ctx.tcCadreConvocation(att, 'Olivia Convoc');
  verifie('le cadre : titre, « Olivia te convoque jeudi 15 octobre … », boutons ✅ Présent / ❌ Absent → tcRepondreConvocation(7, …)', /📅 Convocation : Entraînement/.test(html) && /Olivia te convoque jeudi 15 octobre de 18:00 à 19:00\. Seras-tu là \?/.test(html) && /tcRepondreConvocation\(7, 'present'\)[^>]*>✅ Présent/.test(html) && /tcRepondreConvocation\(7, 'absent'\)[^>]*>❌ Absent/.test(html), html.slice(0, 200));
}

titre('4. Les deux points ajoutes par le chef, et la phrase de la liste');
verifie('page Contacts : bloquer / debloquer passe par saveContacts (synchro tout de suite)', /contact\.blocked = !contact\.blocked;\s+saveContacts\(\);/.test(fonction(page, 'toggleContactBlock') || '') && !/localStorage\.setItem\('timecool_contacts'/.test(fonction(page, 'toggleContactBlock') || ''));
verifie('la reponse de demonstration de Charly dit la phrase vraie', page.indexOf("reply: 'Tes messages et rendez-vous passent par les serveurs TimeCool, chiffrés en transit, et ne sont jamais vendus ni partagés 🔒' }") > 0 && page.indexOf('Tes données restent sur ton appareil') < 0);
verifie('liste des bloques : « Cette personne ne peut plus t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas. »', /Cette personne ne peut plus t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas\./.test(fonction(page, 'openContactsBloques') || ''));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
