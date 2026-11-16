// Mission 98 (chef, 16/11) : la carte de la page administrateur montre les champs d'un compte comme du texte,
// l'export CSV n'est pas lu comme un calcul, et l'API nettoie ville, code postal et précision de provenance.
// Usage : node verif-admin-champs.js <index.html> [index.php]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(__dirname, '../../backend/api/index.php'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}
function constante(nom) {
  const i = page.indexOf('const ' + nom + ' = [');
  if (i < 0) return '';
  return page.slice(i, page.indexOf('];', i) + 2).replace('const ', 'var ');
}

const ecrans = {};
const fichiers = [];
const ctx = {
  console, window: { _adminAccess: true }, _tcUsersMoi: 'MOI', _tcUsersEtat: 'pret', _tcUsersMessage: '',
  _tcTriUsers: 'date_desc', _adminCurrentTab: 'users', _tcUsersServeur: [],
  document: { getElementById: (id) => (ecrans[id] = ecrans[id] || { innerHTML: '' }) },
  TC_PROVENANCE_LABELS: { autre: 'Autre' },
  showToast: () => {},
  tcTelechargerFichier: async (nom, contenu) => { fichiers.push(contenu); return true; }
};
vm.createContext(ctx);
try {
  vm.runInContext(['tcEstAdresseDeTest', 'tcEstCompteTest', 'tcUsersDeLOnglet', 'tcOngletsAdmin', 'tcUserDepuisServeur', 'tcDateServeurUTC',
    'tcDateHeureParis', 'tcTrierUsers', 'escapeHTMLSafe', 'tcLibelleProvenance', 'renderUsersTab', 'exportUsersCsv']
    .map(fonction).join('\n') + '\n' + constante('TC_TRIS_USERS'), ctx);
} catch (e) { verifie('les fonctions se chargent', false, e.message); }

const B = '<b id="x">';
const compte = (ref, email) => ({
  reference: ref, prenom: B + 'P', nom: B + 'N', email, telephone: B + 'T',
  code_postal: B + 'CP', ville: B + 'V', provenance: 'autre', provenance_detail: B + 'D', cree_le: '2026-11-16 10:00:00'
});
ctx._tcUsersServeur = [compte("R1');x('", 'a' + B + '@exemple.fr'), compte('R2', 'b' + B + '@exemple-timecool.fr')];
['users', 'tests'].forEach((onglet) => {
  ctx._adminCurrentTab = onglet;
  let html = '';
  try { vm.runInContext('renderUsersTab()', ctx); html = ecrans.aiconfigContent.innerHTML; } catch (e) { html = 'erreur ' + e.message; }
  verifie(onglet + ' : aucun champ du compte n arrive comme balise', !html.includes(B), (html.match(/.{20}<b id="x">.{10}/) || [])[0]);
  ['P', 'N', 'T', 'CP', 'V', 'D'].forEach((c) => verifie(onglet + ' : ' + c + ' affiché comme texte', html.includes('&lt;b id=&quot;x&quot;&gt;' + c)));
  verifie(onglet + ' : l e-mail affiché comme texte', html.includes('&lt;b id=&quot;x&quot;&gt;@exemple'));
  if (onglet === 'users') verifie('la référence dans les boutons ne garde que lettres et chiffres', html.includes("toggleBlockUser('R1x'") && !html.includes("R1');x('"));
});

// Export CSV : une case qui ressemble à un calcul reste du texte ; un numéro de téléphone reste tel quel.
ctx._adminCurrentTab = 'users';
ctx._tcUsersServeur = [Object.assign(compte('R3', 'c@exemple.fr'), { prenom: '=1+1', nom: '@SOMME(A1)', telephone: '+33 6 12 34 56 78', ville: '-2+3', code_postal: '75011', provenance_detail: '' })];
(async () => {
  try { await vm.runInContext('exportUsersCsv()', ctx); } catch (e) { verifie('l export se lance', false, e.message); }
  const csv = fichiers[0] || '';
  verifie('CSV : « =1+1 » devient du texte', csv.includes('"\'=1+1"'));
  verifie('CSV : « @SOMME(A1) » devient du texte', csv.includes('"\'@SOMME(A1)"'));
  verifie('CSV : « -2+3 » devient du texte', csv.includes('"\'-2+3"'));
  verifie('CSV : le téléphone « +33 6 12 34 56 78 » reste tel quel', csv.includes('"+33 6 12 34 56 78"'));
  verifie('CSV : le code postal reste tel quel', csv.includes('"75011"'));

  // API : inscription et précision de provenance passent par texteSur.
  verifie('API : ville nettoyée à l inscription', api.includes("'ville'               => texteSur(Entree::requis('ville', 120)),"));
  verifie('API : code postal nettoyé à l inscription', api.includes("'code_postal'         => texteSur(Entree::requis('code_postal', 16)),"));
  verifie('API : précision de provenance nettoyée', api.includes('$detail = mb_substr(texteSur($detail), 0, 200);'));
  verifie('API : prénom et nom toujours nettoyés', api.includes("'prenom'              => texteSur(Entree::requis('prenom', 100)),") && api.includes("'nom'                 => texteSur((string) Entree::requis('nom', 100)),"));
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
