// Mission 97 (Charles, 16/11) : page administrateur, onglet « Tests ». Les comptes @exemple-timecool.fr
// y sont rangés ; « Utilisateurs » ne montre que les autres ; l'export CSV suit l'onglet ouvert.
// Usage : node verif-admin-tests.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
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
  const j = page.indexOf('];', i);
  return page.slice(i, j + 2).replace('const ', 'var ');
}

// Une seule règle, écrite à un seul endroit.
verifie('la règle tcEstCompteTest existe', !!fonction('tcEstCompteTest'));
verifie('la règle @exemple-timecool.fr est écrite une seule fois dans la page',
  (page.match(/exemple-timecool\\\.fr/g) || []).length === 1, (page.match(/exemple-timecool\\\.fr/g) || []).length);
verifie('les deux bandeaux passent par tcOngletsAdmin (plus de boutons écrits à la main)',
  (page.match(/\$\{tcOngletsAdmin\(/g) || []).length === 2 && !page.includes('id="adminTabUsers" style="flex:1; padding:8px;'));

const ecrans = {};
const toasts = [];
const fichiers = [];
const ctx = {
  console, window: { _adminAccess: true }, _tcUsersMoi: 'R1', _tcUsersEtat: 'pret', _tcUsersMessage: '',
  _tcTriUsers: 'date_desc', _adminCurrentTab: 'users', _tcUsersServeur: [],
  document: { getElementById: (id) => (ecrans[id] = ecrans[id] || { innerHTML: '' }) },
  tcLibelleProvenance: () => 'Non renseigné',
  showToast: (t) => toasts.push(t),
  tcTelechargerFichier: async (nom, contenu) => { fichiers.push({ nom, contenu }); return true; },
  renderAIConfig: () => {}, tcChargerUtilisateurs: () => {}
};
vm.createContext(ctx);
try {
  vm.runInContext(['tcEstAdresseDeTest', 'tcEstCompteTest', 'tcUsersDeLOnglet', 'tcOngletsAdmin', 'tcUserDepuisServeur', 'tcDateServeurUTC',
    'tcDateHeureParis', 'tcTrierUsers', 'escapeHTMLSafe', 'renderUsersTab', 'exportUsersCsv', 'adminShowTab']
    .map(fonction).join('\n') + '\n' + constante('TC_TRIS_USERS'), ctx);
} catch (e) { verifie('les fonctions se chargent', false, e.message); }

const ligne = (ref, prenom, email, cree) => ({ reference: ref, prenom, nom: 'N' + ref, email, cree_le: cree });
ctx._tcUsersServeur = [
  ligne('R1', 'Charles', 'charles@timecool.fr', '2026-09-01 10:00:00'),
  ligne('R2', 'Léa', 'lea.testeuse@exemple-timecool.fr', '2026-10-11 10:00:00'),
  ligne('R3', 'Marc', 'marc@gmail.com', '2026-11-02 10:00:00'),
  ligne('R4', 'Tom', ' TOM@Exemple-TimeCool.FR ', '2026-10-12 10:00:00'),
  ligne('R5', 'Ines', 'ines@exemple-timecool.fr.autre.com', '2026-11-03 10:00:00'),
  ligne('R6', 'Zoé', 'zoe@pasexemple-timecool.fr', '2026-11-04 10:00:00'),
  ligne('R7', 'Sans', '', '2026-11-05 10:00:00')
];
const est = (email) => { try { return vm.runInContext('tcEstCompteTest', ctx)({ email }); } catch (e) { return 'erreur'; } };
verifie('…@exemple-timecool.fr est un compte de test', est('a@exemple-timecool.fr') === true);
verifie('majuscules et espaces autour ne changent rien', est(' A@EXEMPLE-TIMECOOL.FR ') === true);
verifie('…@exemple-timecool.fr.autre.com n est pas un compte de test', est('i@exemple-timecool.fr.autre.com') === false);
verifie('…@pasexemple-timecool.fr n est pas un compte de test', est('z@pasexemple-timecool.fr') === false);
verifie('sans e-mail : pas un compte de test', est('') === false && vm.runInContext('tcEstCompteTest(null)', ctx) === false);

const montre = (onglet) => {
  ctx._adminCurrentTab = onglet;
  try { vm.runInContext('renderUsersTab()', ctx); } catch (e) { return 'erreur ' + e.message; }
  return ecrans.aiconfigContent.innerHTML;
};
const u = montre('users');
verifie('Utilisateurs : titre inchangé', u.includes('👥 Utilisateurs inscrits'));
verifie('Utilisateurs : « 5 utilisateurs enregistrés » (les 2 comptes de test ne comptent plus)', u.includes('5 utilisateurs enregistrés'), (u.match(/\d+ utilisateurs? enregistrés?/) || [])[0]);
verifie('Utilisateurs : Léa et Tom n y sont pas', !u.includes('Léa') && !u.includes('Tom'));
verifie('Utilisateurs : Charles, Marc, Ines, Zoé et le compte sans e-mail y sont', ['Charles', 'Marc', 'Ines', 'Zoé', 'Sans'].every(p => u.includes(p)));
verifie('Utilisateurs : numérotés #1 à #5', u.includes('#5') && !u.includes('#6'));
verifie('Utilisateurs : l onglet actif est « Utilisateurs »', /adminTabUsers" style="[^"]*background:white/.test(u) && /adminTabTests" style="[^"]*rgba/.test(u));
verifie('trois onglets, dans l ordre Config IA, Utilisateurs, Tests', /⚙️ Config IA[\s\S]*👥 Utilisateurs<\/button>[\s\S]*🧪 Tests<\/button>/.test(u));
const t = montre('tests');
verifie('Tests : titre « Comptes de test »', t.includes('🧪 Comptes de test') && !t.includes('Utilisateurs inscrits'));
verifie('Tests : « 2 comptes de test »', t.includes('2 comptes de test'));
verifie('Tests : Léa et Tom, et eux seuls', t.includes('Léa') && t.includes('Tom') && !['Charles', 'Marc', 'Ines', 'Zoé'].some(p => t.includes(p)));
verifie('Tests : mêmes boutons (Bloquer, Supprimer, accès administrateur)', t.includes('🚫 Bloquer') && t.includes('🗑️ Supprimer') && t.includes('Donner l’accès administrateur'));
verifie('Tests : mêmes tris, même Export CSV, même Actualiser', t.includes('Trier :') && t.includes('Plus récents') && t.includes('exportUsersCsv()') && t.includes('↻ Actualiser'));
verifie('Tests : l onglet actif est « Tests »', /adminTabTests" style="[^"]*background:white/.test(t) && /adminTabUsers" style="[^"]*rgba/.test(t));
verifie('Tests : tri Plus récents (Tom avant Léa)', t.indexOf('Tom') < t.indexOf('Léa'));
ctx._tcUsersServeur = ctx._tcUsersServeur.filter(x => x.reference !== 'R4');
verifie('Tests : « 1 compte de test » au singulier', montre('tests').includes('1 compte de test<'));
const sauf = ctx._tcUsersServeur;
ctx._tcUsersServeur = sauf.filter(x => !/exemple-timecool\.fr$/.test(x.email));
verifie('Tests vide : « Aucun compte de test pour le moment »', montre('tests').includes('Aucun compte de test pour le moment'));
ctx._tcUsersServeur = sauf.concat([ligne('R4', 'Tom', 'tom@exemple-timecool.fr', '2026-10-12 10:00:00')]);

(async () => {
  try {
    ctx._adminCurrentTab = 'tests';
    await vm.runInContext('exportUsersCsv()', ctx);
    ctx._adminCurrentTab = 'users';
    await vm.runInContext('exportUsersCsv()', ctx);
  } catch (e) { verifie('l export se lance', false, e.message); }
  const [ft, fu] = fichiers;
  verifie('export Tests : les 2 comptes de test seulement', ft && ft.contenu.split('\r\n').length === 3 && ft.contenu.includes('Léa') && ft.contenu.includes('Tom') && !ft.contenu.includes('Charles'));
  verifie('export Tests : fichier TimeCool_Comptes_de_test_…', ft && /^TimeCool_Comptes_de_test_\d{4}-\d\d-\d\d\.csv$/.test(ft.nom), ft && ft.nom);
  verifie('export Utilisateurs : les 5 autres seulement', fu && fu.contenu.split('\r\n').length === 6 && !fu.contenu.includes('Léa') && !fu.contenu.includes('Tom'));
  verifie('export Utilisateurs : nom de fichier inchangé', fu && /^TimeCool_Utilisateurs_/.test(fu.nom));
  verifie('les messages disent ce qui a été exporté', toasts[0] === '✅ Export CSV créé — 2 compte(s) de test' && toasts[1] === '✅ Export CSV créé — 5 utilisateur(s)', toasts.join(' | '));

  // adminShowTab connaît « tests » ; Actualiser garde l'onglet ouvert.
  vm.runInContext('adminShowTab("tests")', ctx);
  verifie('adminShowTab("tests") ouvre Tests', vm.runInContext('_adminCurrentTab', ctx) === 'tests');
  vm.runInContext('adminShowTab("n importe quoi")', ctx);
  verifie('un onglet inconnu ramène à Config IA', vm.runInContext('_adminCurrentTab', ctx) === 'config');
  verifie('Actualiser recharge la liste dans Utilisateurs et Tests', fonction('refreshAiconfigPage').includes("if (_adminCurrentTab !== 'config') {"));
  verifie('rien n est envoyé au serveur pour ranger : l API n est pas touchée', !/TC_BACKEND/.test(fonction('tcUsersDeLOnglet') + fonction('tcEstCompteTest')));
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
