// Mission 103 (Charles, 16/11) : l'onglet « Tests » de la page administrateur reconnaît trois domaines de test
// (@exemple-timecool.fr, @exemple-test.fr, @exemple-timecool.test) et les comptes rangés à la main par un administrateur
// (« Ranger dans Tests » / « Remettre dans Utilisateurs »), un rangement gardé sur le serveur (comptes.range_tests_le,
// migration 020, route POST /admin/ranger-tests réservée aux administrateurs). Un classement d'affichage : rien d'autre ne change.
// Usage : node verif-admin-ranger-tests.js <index.html> [index.php]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const racine = path.join(__dirname, '../..');
const page = fs.readFileSync(process.argv[2] || path.join(racine, 'app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(racine, 'backend/api/index.php'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };
function fonction(nom, src) {
  src = src || page;
  const i = src.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (n === 0) return src.slice(i, k + 1); }
  }
  return '';
}
function constante(nom) {
  const i = page.indexOf('const ' + nom + ' = [');
  if (i < 0) return '';
  return page.slice(i, page.indexOf('];', i) + 2).replace('const ', 'var ');
}

// ── La page ──
const ecrans = {};
const appels = [];
const toasts = [];
let recharges = 0;
const ctx = {
  console, window: { _adminAccess: true }, _tcUsersMoi: 'R00000000001', _tcUsersEtat: 'pret', _tcUsersMessage: '',
  _tcTriUsers: 'alpha', _adminCurrentTab: 'users', _tcUsersServeur: [],
  document: { getElementById: (id) => (ecrans[id] = ecrans[id] || { innerHTML: '' }) },
  tcLibelleProvenance: () => 'Non renseigné',
  showToast: (t) => toasts.push(t),
  TC_BACKEND: { rangerDansTests: async (ref, tests) => { appels.push([ref, tests]); return tests; } },
  renderAIConfig: () => {}, tcChargerUtilisateurs: () => { recharges++; }
};
vm.createContext(ctx);
try {
  vm.runInContext(['tcEstAdresseDeTest', 'tcEstCompteTest', 'tcRangerDansTests', 'tcUsersDeLOnglet', 'tcOngletsAdmin', 'tcUserDepuisServeur', 'tcDateServeurUTC',
    'tcDateHeureParis', 'tcTrierUsers', 'escapeHTMLSafe', 'renderUsersTab']
    .map((n) => fonction(n)).join('\n') + '\n' + constante('TC_TRIS_USERS'), ctx);
} catch (e) { verifie('les fonctions se chargent', false, e.message); }

const est = (u) => { try { return vm.runInContext('tcEstCompteTest', ctx)(u); } catch (e) { return 'erreur ' + e.message; } };
verifie('…@exemple-test.fr est un compte de test', est({ email: 'alice@exemple-test.fr' }) === true);
verifie('…@exemple-timecool.test est un compte de test', est({ email: ' Jetable@Exemple-TimeCool.TEST ' }) === true);
verifie('…@exemple-timecool.fr l est toujours', est({ email: 'ines@exemple-timecool.fr' }) === true);
verifie('…@exemple-test.fr.autre.com et …@pasexemple-test.fr ne le sont pas', est({ email: 'a@exemple-test.fr.autre.com' }) === false && est({ email: 'a@pasexemple-test.fr' }) === false);
verifie('un compte rangé à la main est un compte de test', est({ email: 'marc@gmail.com', rangeTests: true }) === true);
verifie('un compte ordinaire ne l est pas', est({ email: 'marc@gmail.com', rangeTests: false }) === false);
verifie('la règle des domaines est écrite une seule fois dans la page', (page.match(/exemple-test\\\.fr/g) || []).length === 1 && (page.match(/exemple-timecool\\\.test/g) || []).length === 1);

const ligne = (ref, prenom, email, extra) => Object.assign({ reference: ref, prenom, nom: 'N', email, cree_le: '2026-11-01 10:00:00' }, extra || {});
ctx._tcUsersServeur = [
  ligne('R00000000001', 'Charles', 'charles@timecool.fr'),
  ligne('R00000000002', 'Marc', 'marc@gmail.com'),
  ligne('R00000000003', 'Sonde', 'sonde@gmail.com', { range_tests_le: '2026-11-16 14:00:00' }),
  ligne('R00000000004', 'Alice', 'alice@exemple-test.fr'),
  ligne('R00000000005', 'Testeur', 'jetable@exemple-timecool.test'),
  ligne('R00000000006', 'Bob', 'bob@exemple-test.fr', { range_tests_le: '2026-11-16 14:00:00' }),
  ligne('R00000000007', 'Pirate', 'x@gmail.com', { reference: "R7');alert(1);//" })
];
const montre = (onglet) => { ctx._adminCurrentTab = onglet; try { vm.runInContext('renderUsersTab()', ctx); } catch (e) { return 'erreur ' + e.message; } return ecrans.aiconfigContent.innerHTML; };
const u = montre('users');
verifie('Utilisateurs : 3 comptes (Charles, Marc, et la fiche à la référence piégée)', u.includes('3 utilisateurs enregistrés'), (u.match(/\d+ utilisateurs? enregistrés?/) || [])[0]);
verifie('Utilisateurs : ni Sonde (rangé à la main), ni Alice, Testeur, Bob', !/>Sonde |>Alice |>Testeur |>Bob /.test(u));
verifie('Utilisateurs : « Ranger dans Tests » sur la fiche de Marc', /tcRangerDansTests\('R00000000002', true\)[^>]*>🧪 Ranger dans Tests</.test(u));
verifie('Utilisateurs : pas de bouton sur sa propre fiche', !u.includes("tcRangerDansTests('R00000000001'"));
verifie('Utilisateurs : le bouton est sous la rangée Bloquer / Supprimer, qui reste intacte', /🗑️ Supprimer\s*<\/button>\s*<\/div>\s*<button onclick="tcRangerDansTests\('R00000000002', true\)" style="width:100%;/.test(u));
verifie('Utilisateurs : une référence piégée ne sort pas de l attribut (protection de la 98)', !u.includes("alert(1)") && u.includes("tcRangerDansTests('R7alert1', true)"));
const t = montre('tests');
verifie('Tests : 4 comptes (Sonde, Alice, Testeur, Bob)', t.includes('4 comptes de test'), (t.match(/\d+ comptes? de test/) || [])[0]);
verifie('Tests : « Remettre dans Utilisateurs » pour Sonde, rangé à la main', /tcRangerDansTests\('R00000000003', false\)[^>]*>↩️ Remettre dans Utilisateurs</.test(t));
verifie('Tests : pas de bouton de retour pour un compte reconnu par son adresse (Alice, Testeur, et Bob même rangé à la main)', !/tcRangerDansTests\('R0000000000[456]'/.test(t));
verifie('Tests : pas de « Ranger dans Tests » dans l onglet Tests', !t.includes('🧪 Ranger dans Tests'));

(async () => {
  try { await vm.runInContext("tcRangerDansTests('R00000000002', true)", ctx); await vm.runInContext("tcRangerDansTests('R00000000003', false)", ctx); } catch (e) { verifie('le rangement se lance', false, e.message); }
  verifie('ranger et remettre passent par le serveur, avec la référence et le sens', JSON.stringify(appels) === JSON.stringify([['R00000000002', true], ['R00000000003', false]]), JSON.stringify(appels));
  verifie('les messages', toasts[0] === '🧪 Rangé dans Tests' && toasts[1] === '↩️ Remis dans Utilisateurs', toasts.join(' | '));
  verifie('la liste est relue sur le serveur après chaque rangement', recharges === 2, recharges);
  verifie('TC_BACKEND.rangerDansTests appelle POST /admin/ranger-tests', /async rangerDansTests\(reference, tests\) \{\s*const d = await tcAppel\('POST', '\/admin\/ranger-tests', \{ reference: reference, tests: !!tests \}\);/.test(page));

  // ── L API ──
  const n = api.indexOf("case 'POST /admin/ranger-tests':");
  const route = n > 0 ? api.slice(n, api.indexOf('Rep::ok', n) + 40) : '';
  verifie('la route POST /admin/ranger-tests existe', !!route);
  verifie('réservée aux administrateurs (403 sinon)', /\(int\) \(\$moi\['admin'\] \?\? 0\) !== 1\) \{\s*Rep::erreur\(403, 'acces_refuse'/.test(route));
  verifie('référence contrôlée, « tests » doit être vrai ou faux', route.includes("preg_match('/^[0-9A-Z]{12,26}$/', $ref)") && route.includes('is_bool($tests)'));
  verifie('sans la migration 020 : 503 « migration_manquante », rien n est écrit', /if \(!colonneRangeTests\(\)\) \{\s*Rep::erreur\(503, 'migration_manquante'/.test(route) && route.indexOf('colonneRangeTests') < route.indexOf('UPDATE'));
  const maj = (route.match(/UPDATE comptes SET ([^']*) WHERE/g) || []);
  verifie('la route ne touche que range_tests_le (aucun droit, aucune donnée du compte)', maj.length === 2 && maj.every((m) => /^UPDATE comptes SET range_tests_le = (NOW\(\)|NULL) WHERE$/.test(m)), JSON.stringify(maj));
  const liste = api.slice(api.indexOf("case 'GET /admin/utilisateurs':"), api.indexOf("case 'POST /admin/bloquer':"));
  verifie('la liste des inscrits rend range_tests_le, et NULL tant que la migration n est pas jouée', liste.includes("(colonneRangeTests() ? 'range_tests_le' : 'NULL AS range_tests_le')"));
  verifie('colonneRangeTests lit information_schema', /function colonneRangeTests\(\): bool[\s\S]{0,400}information_schema\.COLUMNS[\s\S]{0,200}range_tests_le/.test(api));
  const sql = path.join(racine, 'backend/sql/020_comptes_ranges_tests.sql');
  const mig = fs.existsSync(sql) ? fs.readFileSync(sql, 'utf8') : '';
  verifie('migration 020 : ajoute range_tests_le, rejouable (seulement si la colonne manque)', /IF\(@existe = 0, 'ALTER TABLE comptes ADD COLUMN range_tests_le DATETIME NULL/.test(mig) && /COLUMN_NAME = 'range_tests_le'/.test(mig));
  const purge = path.join(racine, 'scripts/purger-comptes-test.sh');
  verifie('la purge des comptes de test ne lit pas le rangement (seulement l adresse)', !fs.existsSync(purge) || !/range_tests/.test(fs.readFileSync(purge, 'utf8')));
  const garder = path.join(racine, 'scripts/comptes-test-a-garder.txt');
  verifie('comptes-test-a-garder.txt ne parle pas du rangement', !fs.existsSync(garder) || !/range_tests/.test(fs.readFileSync(garder, 'utf8')));
  const code = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const nb = (t) => (code(t).match(/range_tests_le/g) || []).length;
  verifie('aucune autre route ne lit range_tests_le', nb(api) === nb(route) + nb(liste) + nb(fonction('colonneRangeTests', api)), nb(api) + ' / ' + nb(route) + ' + ' + nb(liste) + ' + ' + nb(fonction('colonneRangeTests', api)));

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
