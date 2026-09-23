// La flèche de retour, et la mémoire de la page précédente.
//
// La page d'import s'ouvre depuis le menu et n'offrait aucune sortie :
// qui l'ouvrait par erreur devait rouvrir le menu.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const d = html.indexOf("let _tcPagePrecedente = 'calendar';");
const f = html.indexOf('  currentPage = page;', d);
if (d < 0 || f < d) { console.log('ERREUR: mémoire introuvable'); process.exit(1); }
// On garde l'ouverture de navigate jusqu'à l'affectation de currentPage
// — sans elle, la page courante ne changerait jamais et le test ne
// verrait qu'un seul déplacement — puis on referme la fonction.
const LIGNE = '  currentPage = page;';
const SOURCE = html.slice(d, f + LIGNE.length) + '\n};\n';

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function contexte(depart) {
  const c = { currentPage: depart, console };
  vm.createContext(c);
  vm.runInContext(SOURCE
    + '\nglobalThis._n = navigate;'
    + '\nglobalThis._r = tcRetour;'
    + '\nglobalThis._p = function () { return _tcPagePrecedente; };', c);
  return c;
}

console.log('\n── D où l on vient est retenu ──');
{
  const c = contexte('calendar');
  c._n('importagenda');
  verifie('calendrier → import : on retient le calendrier', c._p() === 'calendar', c._p());
  c._n('contacts');
  verifie('import → contacts : on retient l import', c._p() === 'importagenda', c._p());
}

console.log('\n── Une page ne se ramène pas à elle-même ──');
{
  const c = contexte('calendar');
  c._n('importagenda');
  c._n('importagenda');
  verifie('re-navigation ignorée', c._p() === 'calendar', c._p());
}

console.log('\n── Le retour ramène quelque part, toujours ──');
{
  const c = contexte('');
  verifie('sans historique, on revient au calendrier', c._p() === 'calendar', c._p());
}

console.log('\n── La flèche recule d une étape avant de quitter ──');
{
  // tcRetourImport lit _importStep, qui vit ailleurs dans le fichier :
  // on rejoue la fonction avec un compteur d'étapes simulé.
  const bloc = html.slice(html.indexOf('function tcRetourImport()'),
                          html.indexOf('navigate = function(page)'));
  function etape(depart) {
    const c = { _importStep: depart, sorties: 0, rendus: 0, console };
    c.renderImportAgenda = function () { c.rendus++; };
    c.tcRetour = function () { c.sorties++; };
    vm.createContext(c);
    vm.runInContext(bloc + '\nglobalThis._i = tcRetourImport;', c);
    c._i();
    return c;
  }
  // L'étape 2 — « jusqu'où remonter » — a été retirée : depuis le
  // fichier, on revient donc au choix de l'agenda, pas à une étape morte.
  const a = etape(3);
  verifie('fichier → choix de l agenda, sans quitter',
    a._importStep === 1 && a.sorties === 0 && a.rendus === 1, '_importStep=' + a._importStep);
  const b = etape(4);
  verifie('résultat → fichier', b._importStep === 3 && b.sorties === 0);
  const d1 = etape(1);
  verifie('choix de l agenda → on quitte la page', d1.sorties === 1, d1.sorties + ' sortie(s)');
}

console.log('\n── La flèche est bien sur la page ──');
verifie('bouton de retour dans l en-tête de l import',
  /id="page-importagenda"[\s\S]{0,320}onclick="tcRetourImport\(\)"/.test(html));
verifie('le titre reste lisible à côté',
  /id="page-importagenda"[\s\S]{0,700}Importer mon ancien agenda/.test(html));
verifie('plus de « Retour » en texte dans les étapes',
  !/_importStep=\d;renderImportAgenda\(\);[^']*Retour/.test(html),
  'deux commandes de retour se marchaient dessus');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
