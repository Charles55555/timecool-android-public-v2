// (A) Vocabulaire calme : « réserver seul » et « sans ton accord » ont disparu de toute l'application.
//     GARDE-FOU : il tourne à chaque livraison.
// (B) Le formulaire « Nouveau contact » / « Modifier le contact ».
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}

titre('A. Le garde-fou de vocabulaire');
// Insensible a la casse et aux accents ; les \uXXXX ecrits dans le code sont lus comme les lettres qu'ils representent.
const BS = String.fromCharCode(92);
const normal = (s) => s.split(BS + 'u').map((x, i) => (i === 0 ? x : String.fromCharCode(parseInt(x.slice(0, 4), 16)) + x.slice(4))).join('')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const INTERDITS = [
  [/reserv\w* +seul/, '« réserver seul », « réserve seul », « réservent seuls »'],
  [/reserv\w* +tout +seul/, '« réserve tout seul », « réservent tout seuls »'],
  [/sans (ton|mon|son|votre) accord/, '« sans ton accord »'],
  [/sans (te|me|lui|vous) demander/, '« sans te demander »'],
  [/a (ton|mon|son|votre) insu/, '« à ton insu »'],
  [/reservation automatique/, '« réservation automatique »'],
];
[['la page', page], ['l API', api]].forEach(([nom, texte]) => {
  const n = normal(texte);
  INTERDITS.forEach(([re, libelle]) => {
    const m = n.match(re);
    verifie(nom + ' ne contient plus ' + libelle, !m, m && n.slice(Math.max(0, m.index - 40), m.index + 60));
  });
});
verifie('le garde-fou reconnait bien les formes ecrites avec des accents ou des \\u00e9', normal('Réserver seul') === 'reserver seul' && normal('r' + BS + 'u00e9serv' + BS + 'u00e9 seuls') === 'reserve seuls' && /reserv\w* +seul/.test(normal('Les contacts REVERSENT… RÉSERVENT seuls')));

titre('A. Les textes remplaces');
const dit = (re, nom) => verifie(nom, re.test(page));
dit(/peuvent prendre rendez-vous directement, dans les plages de leur catégorie\./, 'cadre gris et case décochée : « peuvent prendre rendez-vous directement, dans les plages de leur catégorie »');
dit(/' contacts peuvent prendre rendez-vous directement dans ces heures'/, '« N contacts peuvent prendre rendez-vous directement dans ces heures »');
dit(/Chaque demande de rendez-vous passe par toi\./, 'fenêtre « Tu es protégé » : « Chaque demande de rendez-vous passe par toi. »');
dit(/Pour que quelqu’un puisse prendre rendez-vous directement, coche-le avec/, 'fenêtre « C\'est ouvert, en douceur » : « puisse prendre rendez-vous directement »');
dit(/Qui peut prendre rendez-vous directement : /, 'liste « Choisir qui » : « Qui peut prendre rendez-vous directement »');
dit(/Pour que ta famille, tes amis ou tes collègues puissent prendre rendez-vous directement, classe-les en une fois depuis/, 'page Contacts : « puissent prendre rendez-vous directement, classe-les en une fois »');
dit(/Acc\\u00e8s bloqu\\u00e9\.<\/b> Ses demandes de rendez-vous ne t\\u2019arrivent plus, et cette personne ne le sait pas\./, 'contact bloqué : « ses demandes de rendez-vous ne t’arrivent plus, et cette personne ne le sait pas » (11/10)');
dit(/Aucun rendez-vous ne peut m’être proposé, sauf par les contacts que j’autorise|aucun rendez-vous ne peut m’être proposé, sauf par les contacts que j’autorise/, '« Mon temps libre » : « aucun rendez-vous ne peut m’être proposé, sauf par les contacts que j’autorise »');
dit(/aucun rendez-vous ne peut t’être proposé, sauf par les contacts que tu autorises\./, 'fenêtre d\'une plage de temps libre : « aucun rendez-vous ne peut t’être proposé… »');
dit(/Toujours attendre ma validation pour une demande de rendez-vous/, 'la case « Toujours attendre ma validation pour une demande de rendez-vous » ne change pas');
dit(/Ce contact fait partie de :<\/div>/, 'fiche contact : « Ce contact fait partie de : »');
dit(/Peut me joindre même pendant mon temps libre/, 'fiche contact : « Peut me joindre même pendant mon temps libre »');
dit(/Sans choix, ses demandes de rendez-vous arrivent dans ta messagerie\./, 'fiche contact : « Sans choix, ses demandes de rendez-vous arrivent dans ta messagerie. »');
const fiche = page.slice(page.indexOf('const cats = c.categories || [];'), page.indexOf('Je lui dis :'));
verifie('la fiche : cinq pastilles (jamais « temps libre » parmi elles), puis la case', /CATS\.filter\(cat => cat\.id !== 'personnel'\)\.map/.test(fiche) && fiche.indexOf('Ce contact fait partie de') < fiche.indexOf('CATS.filter') && fiche.indexOf('CATS.filter') < fiche.indexOf('Peut me joindre'));
verifie('la case « temps libre » de la fiche pose / retire la categorie « personnel » (meme donnee que l ancienne pastille)', /onchange="toggleContactCat\('\$\{c\.id\}','personnel'\)"/.test(fiche));

titre('B. Le formulaire « Nouveau contact » / « Modifier le contact »');
const pays = page.match(/const TC_PHONE_COUNTRIES = \[[\s\S]*?\n\];/)[0];
const registre = {};
const faux = (id) => (registre[id] = registre[id] || { id, value: '', checked: false, textContent: '', style: {}, focus() { this.focus_ = true; }, remove() {} });
const ctx = {
  console, contactsList: [], sauvegardes: 0, rendus: 0, toasts: [], badges: 0, autoc: [],
  DISPO_CATEGORIES: [
    { id: 'travail', icon: 'T', label: 'Mon travail', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sante', icon: 'S', label: 'Ma santé', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'famille', icon: 'F', label: 'Ma famille', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'amis', icon: 'A', label: 'Mes amis et loisirs', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sport', icon: 'P', label: 'Mon sport', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'personnel', icon: 'L', label: 'Mon temps libre', color: '#aaa', bg: '#bbb', texte: '#333' },
  ],
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  saveContacts: () => { ctx.sauvegardes++; }, renderContacts: () => { ctx.rendus++; }, showToast: (m) => ctx.toasts.push(m),
  tcRafraichirBadgesContacts: () => { ctx.badges++; }, tcAutocompleterLieu: (i) => { ctx.autoc.push(i && i.id); },
};
let overlay = null;
ctx.document = {
  createElement: () => ({ style: {}, set innerHTML(h) { this._h = h; (h.match(/id="(cf[A-Za-z]+)"/g) || []).forEach((m) => faux(m.slice(4, -1))); }, get innerHTML() { return this._h; }, remove() { overlay = null; } }),
  body: { appendChild: (o) => { overlay = o; } },
  getElementById: (id) => (id === 'tcContactOverlay' ? overlay : (registre[id] || null)),
};
vm.createContext(ctx);
vm.runInContext(pays, ctx);
['tcNormaliserTelephone', 'tcContactDecouperNom', 'tcContactDecouperTelephone', 'tcContactDepuisFormulaire', 'tcFormulaireContact', 'tcFormulaireContactPastilles',
  'tcFormulaireContactCat', 'tcFormulaireContactFermer', 'tcFormulaireContactEnregistrer', 'addContactManually'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
vm.runInContext('var _tcContactForm = null;', ctx);
const ouvre = (id) => { Object.keys(registre).forEach((k) => delete registre[k]); vm.runInContext('tcFormulaireContact(' + (id ? JSON.stringify(id) : '') + ')', ctx); return overlay ? overlay.innerHTML : ''; };

let h = ouvre();
verifie('« + Ajouter » ouvre le formulaire (plus de simple question « Nom complet du contact »)', (() => { Object.keys(registre).forEach((k) => delete registre[k]); vm.runInContext('addContactManually()', ctx); return overlay && /➕ Nouveau contact/.test(overlay.innerHTML); })() && !/Nom complet du contact/.test(page));
h = ouvre();
verifie('panneau centre, 16 px de marge, 90 % de la hauteur, defilement dans le corps, boutons toujours visibles en bas', /align-items:center;justify-content:center;padding:16px/.test(overlay.style.cssText) && /max-height:90vh/.test(h) && /id="tcContactCorps" style="flex:1;min-height:0;overflow-y:auto/.test(h) && /Annuler<\/button>/.test(h) && /Enregistrer<\/button>/.test(h));
verifie('Prénom et Nom sur une ligne (deux colonnes)', /<div style="display:flex;gap:10px;"><div style="flex:1;min-width:0;"><label for="cfPrenom"[^>]*>Prénom<\/label>[^]*?<label for="cfNom"[^>]*>Nom<\/label>/.test(h));
verifie('Mobile avec l indicatif du pays (liste de l inscription), E-mail, Adresse postale', /id="cfIndicatif"/.test(h) && /id="cfMobile"/.test(h) && /id="cfEmail" type="email"/.test(h) && /id="cfAdresse"/.test(h) && /Adresse postale/.test(h));
verifie('les indicatifs viennent de la liste de l inscription (TC_PHONE_COUNTRIES), France par defaut', (h.match(/<option value="\+/g) || []).length === vm.runInContext('TC_PHONE_COUNTRIES.length', ctx) && /<option value="\+33" selected>/.test(h));
verifie('les propositions d adresses : l autocompletion existante est branchee sur le champ adresse', ctx.autoc.indexOf('cfAdresse') > -1);
verifie('« Ce contact fait partie de : » avec cinq pastilles (travail, santé, famille, amis, sport), jamais « temps libre » parmi elles', /Ce contact fait partie de :/.test(h) && (registre.cfPastilles.innerHTML.match(/<button/g) || []).length === 5 && !/Mon temps libre/.test(registre.cfPastilles.innerHTML) && /Mon travail/.test(registre.cfPastilles.innerHTML) && /Mon sport/.test(registre.cfPastilles.innerHTML));
verifie('« Peut me joindre même pendant mon temps libre » et la phrase grise', /id="cfPerso" type="checkbox"[^>]*> Peut me joindre même pendant mon temps libre/.test(h) && /Sans choix, ses demandes de rendez-vous arrivent dans ta messagerie\./.test(h));

// Nom obligatoire
vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
verifie('sans prénom ni nom : rien n est enregistre, un message le dit', ctx.contactsList.length === 0 && ctx.sauvegardes === 0 && /Indique au moins un prénom ou un nom\./.test(registre.cfErreur.textContent), registre.cfErreur.textContent);
// Un contact complet
ctx.document.getElementById = (id) => (id === 'tcContactOverlay' ? overlay : (id === 'cfPastilles' ? (registre.cfPastilles = registre.cfPastilles || { innerHTML: '' }) : (registre[id] || null)));
Object.assign(registre.cfPrenom, { value: 'Marie' }); Object.assign(registre.cfNom, { value: 'Dupont Martin' });
Object.assign(registre.cfIndicatif, { value: '+33' }); Object.assign(registre.cfMobile, { value: '06 12 34 56 78' });
Object.assign(registre.cfEmail, { value: ' marie@exemple.fr ' }); Object.assign(registre.cfAdresse, { value: '12 rue de la Paix, 75002 Paris' });
vm.runInContext('tcFormulaireContactCat("famille"); tcFormulaireContactCat("amis"); tcFormulaireContactCat("amis");', ctx);
registre.cfPerso.checked = true;
vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
const c = ctx.contactsList[0];
verifie('la fiche est creee : name = prénom + nom, mobile au format international, e-mail nettoye, adresse', !!c && c.name === 'Marie Dupont Martin' && c.phone === '+33612345678' && c.email === 'marie@exemple.fr' && c.address === '12 rue de la Paix, 75002 Paris', JSON.stringify(c));
verifie('catégories posées : famille, plus « temps libre » coché ; « amis » cliqué deux fois = retiré', JSON.stringify(c.categories) === '["famille","personnel"]', JSON.stringify(c.categories));
verifie('createdAt posé et AUCUNE marque d import : elle compte comme « récente »', /^\d{4}-\d{2}-\d{2}T/.test(c.createdAt) && !('origine' in c) && /^contact_\d+$/.test(c.id));
verifie('enregistre, formulaire ferme, liste redessinee, badge TimeCool remis a jour', ctx.sauvegardes === 1 && !overlay && ctx.rendus === 1 && ctx.badges === 1 && /Contact ajouté/.test(ctx.toasts[0]));
// Seul le prenom
h = ouvre(); Object.assign(registre.cfPrenom, { value: 'Zoé' });
ctx.document.getElementById = (id) => (id === 'tcContactOverlay' ? overlay : (id === 'cfPastilles' ? (registre.cfPastilles = registre.cfPastilles || { innerHTML: '' }) : (registre[id] || null)));
vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
verifie('le prénom seul suffit ; sans catégorie, pas de champ « categories », sans mobile ni e-mail', ctx.contactsList.length === 2 && ctx.contactsList[1].name === 'Zoé' && ctx.contactsList[1].phone === '' && !('categories' in ctx.contactsList[1]));
Object.assign(registre.cfPrenom || {}, {});
h = ouvre(); registre.cfNom.value = 'Nom Seul'; ctx.document.getElementById = ctx.document.getElementById;
vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
verifie('le nom seul suffit aussi', ctx.contactsList.length === 3 && ctx.contactsList[2].name === 'Nom Seul');

// Modifier
ctx.contactsList = [{ id: 'k1', name: 'Jean Marc Dupont', phone: '+33611223344', email: 'jean@exemple.fr', address: '1 rue X', categories: ['travail', 'personnel'], referenceCompte: 'REFJ', isTimeCool: true, langue: 'en', blocked: false, createdAt: '2026-08-01T10:00:00.000Z' }];
h = ouvre('k1');
verifie('modifier : le formulaire s ouvre PRE-REMPLI (prénom, nom, mobile, e-mail, adresse)', /➕|✏️ Modifier le contact/.test(h) && /✏️ Modifier le contact/.test(h) && /id="cfPrenom"[^>]*value="Jean"/.test(h) && /id="cfNom"[^>]*value="Marc Dupont"/.test(h) && /id="cfMobile"[^>]*value="0611223344"/.test(h) && /id="cfEmail"[^>]*value="jean@exemple\.fr"/.test(h) && /id="cfAdresse"[^>]*value="1 rue X"/.test(h), h.slice(0, 80));
verifie('modifier : « temps libre » pre-coche, les categories ouvrantes aussi', /id="cfPerso" type="checkbox" checked/.test(h) && vm.runInContext('_tcContactForm.cats.join()', ctx) === 'travail');
ctx.document.getElementById = (id) => (id === 'tcContactOverlay' ? overlay : (id === 'cfPastilles' ? (registre.cfPastilles = registre.cfPastilles || { innerHTML: '' }) : (registre[id] || null)));
Object.assign(registre.cfPrenom, { value: 'Jean' }); Object.assign(registre.cfNom, { value: 'Dupont' }); Object.assign(registre.cfIndicatif, { value: '+33' });
Object.assign(registre.cfMobile, { value: '0611223344' }); Object.assign(registre.cfEmail, { value: 'jean@exemple.fr' }); Object.assign(registre.cfAdresse, { value: '2 rue Y' }); registre.cfPerso.checked = false;
ctx.sauvegardes = 0; ctx.toasts.length = 0;
vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
const m = ctx.contactsList[0];
verifie('modifier : « Enregistrer » met a jour la MEME fiche (pas de doublon)', ctx.contactsList.length === 1 && m.id === 'k1' && m.name === 'Jean Dupont' && m.address === '2 rue Y' && /Contact modifié/.test(ctx.toasts[0]));
verifie('modifier : « temps libre » decoche retire la categorie, les autres restent', JSON.stringify(m.categories) === '["travail"]', JSON.stringify(m.categories));
verifie('modifier : les autres champs de la fiche sont gardes (langue, compte TimeCool, date de creation)', m.langue === 'en' && m.referenceCompte === 'REFJ' && m.isTimeCool === true && m.createdAt === '2026-08-01T10:00:00.000Z');
// Mobile ou e-mail change : le lien avec un compte est refait
h = ouvre('k1'); ctx.document.getElementById = (id) => (id === 'tcContactOverlay' ? overlay : (id === 'cfPastilles' ? (registre.cfPastilles = registre.cfPastilles || { innerHTML: '' }) : (registre[id] || null)));
Object.assign(registre.cfPrenom, { value: 'Jean' }); Object.assign(registre.cfNom, { value: 'Dupont' }); Object.assign(registre.cfIndicatif, { value: '+33' }); Object.assign(registre.cfMobile, { value: '0699887766' });
Object.assign(registre.cfEmail, { value: 'jean@exemple.fr' }); Object.assign(registre.cfAdresse, { value: '' });
ctx.badges = 0; vm.runInContext('tcFormulaireContactEnregistrer()', ctx);
verifie('un nouveau mobile : le lien avec l ancien compte est retire, puis le badge TimeCool est recalcule', !('referenceCompte' in ctx.contactsList[0]) && !('isTimeCool' in ctx.contactsList[0]) && ctx.badges === 1 && ctx.contactsList[0].phone === '+33699887766');

titre('B. Les petites fonctions');
const dec = (n) => vm.runInContext('tcContactDecouperNom(' + JSON.stringify(n) + ')', ctx);
verifie('« Jean Marc Dupont » → prénom « Jean », nom « Marc Dupont » ; un seul mot → prénom', JSON.stringify(dec('Jean Marc Dupont')) === '{"prenom":"Jean","nom":"Marc Dupont"}' && JSON.stringify(dec('Madonna')) === '{"prenom":"Madonna","nom":""}' && JSON.stringify(dec('')) === '{"prenom":"","nom":""}');
const tel = (p) => JSON.stringify(vm.runInContext('tcContactDecouperTelephone(' + JSON.stringify(p) + ')', ctx));
verifie('le mobile est redecoupe : +33 → « 0612345678 », +44 → indicatif britannique, sans indicatif → France tel quel, vide → vide', tel('+33612345678') === '{"dial":"+33","national":"0612345678"}' && tel('+447911123456').indexOf('"dial":"+44"') > -1 && tel('06 11 22 33 44') === '{"dial":"+33","national":"06 11 22 33 44"}' && tel('') === '{"dial":"+33","national":""}');
verifie('le menu de la fiche a « ✏️ Modifier le contact »', /tcFormulaireContact\('\$\{c\.id\}'\)"><span class="mi-ic">✏️<\/span>Modifier le contact/.test(page));
verifie('les modifications champ par champ (telephone, e-mail) restent', typeof fonction(page, 'tcLigneCoordonnee') === 'string');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
