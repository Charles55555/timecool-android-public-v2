// Chacun lit-il les noms de langues dans la sienne ?
//
// Et surtout : le menu qui change la langue de TimeCool doit garder
// les noms d'origine. Un Suedois arrive sur une interface en francais
// cherche « Svenska » -- s'il n'y lit que « Suedois », il ne se
// reconnait pas et ne trouve plus son propre menu.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

const ctx = { Intl, currentLanguage: 'fr', console };
vm.createContext(ctx);
['tcLangueCourante', 'tcNomDeLangue'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  fonction ' + n + ' introuvable'); }
});

console.log('\n── Un francophone ──');
verifie('sv devient Suedois', ctx.tcNomDeLangue('sv', 'Svenska') === 'Suédois',
  ctx.tcNomDeLangue('sv', 'Svenska'));
verifie('nl devient Neerlandais', ctx.tcNomDeLangue('nl', 'Nederlands') === 'Néerlandais',
  ctx.tcNomDeLangue('nl', 'Nederlands'));
verifie('la majuscule est mise', /^[A-ZÀ-Þ]/.test(ctx.tcNomDeLangue('el', 'Ελληνικά')),
  ctx.tcNomDeLangue('el', 'Ελληνικά'));

console.log('\n── Un italien ──');
ctx.currentLanguage = 'it';
verifie('sv devient Svedese', ctx.tcNomDeLangue('sv', 'Svenska') === 'Svedese',
  ctx.tcNomDeLangue('sv', 'Svenska'));
verifie('de devient Tedesco', ctx.tcNomDeLangue('de', 'Deutsch') === 'Tedesco',
  ctx.tcNomDeLangue('de', 'Deutsch'));

console.log('\n── Un allemand ──');
ctx.currentLanguage = 'de';
verifie('fr devient Franzoesisch',
  ctx.tcNomDeLangue('fr', 'Français') === 'Französisch',
  ctx.tcNomDeLangue('fr', 'Français'));

console.log('\n── Les 17 langues ont toutes un nom ──');
{
  ctx.currentLanguage = 'fr';
  const codes = [...page.matchAll(/\{ code: '([a-z]{2})', flag/g)].map(m => m[1]);
  const sansNom = codes.filter(c => {
    const n = ctx.tcNomDeLangue(c, '@@secours@@');
    return !n || n === '@@secours@@';
  });
  verifie('aucune ne retombe sur le secours', sansNom.length === 0,
    sansNom.length ? sansNom.join(', ') : codes.length + ' langues nommees');
}

console.log('\n── Un navigateur trop ancien ne casse rien ──');
{
  const isole = { Intl: undefined, currentLanguage: 'fr', console };
  vm.createContext(isole);
  ['tcLangueCourante', 'tcNomDeLangue'].forEach(n => vm.runInContext(extraire(n), isole));
  verifie('repli sur le nom d origine',
    isole.tcNomDeLangue('sv', 'Svenska') === 'Svenska',
    'mieux vaut « Svenska » qu une liste vide');
}

console.log('\n── La liste est classee pour celui qui lit ──');
{
  const src = extraire('tcLanguesClassees');
  if (!src) { ko++; console.log('  KO  tcLanguesClassees introuvable'); }
  else {
    const langues = JSON.parse(
      '[' + (page.match(/const SUPPORTED_LANGUAGES = \[([\s\S]*?)\];/) || [])[1]
        .replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,\s*$/, '') + ']');
    ctx.SUPPORTED_LANGUAGES = langues;
    vm.runInContext(src, ctx);

    ctx.currentLanguage = 'fr';
    const fr = ctx.tcLanguesClassees().map(l => l.nom);
    console.log('  ' + fr.join(', '));
    verifie('classee pour un francophone',
      fr.join('|') === fr.slice().sort((a, b) => a.localeCompare(b, 'fr')).join('|'));
    verifie('Neerlandais tombe entre Italien et Norvegien',
      fr.indexOf('Italien') < fr.indexOf('Néerlandais')
        && fr.indexOf('Néerlandais') < fr.indexOf('Norvégien'),
      'l accent ne doit pas le rejeter en fin de liste');
    verifie('les 17 sont toujours la', fr.length === 17, fr.length + '');

    ctx.currentLanguage = 'it';
    const it = ctx.tcLanguesClassees().map(l => l.nom);
    console.log('  ' + it.join(', '));
    verifie('et classee pour un italien',
      it.join('|') === it.slice().sort((a, b) => a.localeCompare(b, 'it')).join('|'));
    verifie('l ordre change vraiment avec la langue', fr.join('|') !== it.join('|'));
    ctx.currentLanguage = 'fr';
  }
}

console.log('');
console.log('-- Les trois menus de langue sont traduits et classes --');
{
  const menus = (page.match(/tcLanguesClassees\(\)\.map/g) || []).length;
  verifie('les trois menus passent par la liste classee', menus >= 4,
    menus + ' endroits - trois menus, plus la fiche contact');
  verifie('plus aucun ne trie la liste sur place',
    page.indexOf('SUPPORTED_LANGUAGES.sort(') === -1,
    'ce tri reordonnait la liste pour toute l application');
  verifie('le nom d origine reste affiche a cote',
    page.indexOf('lang.origine') > -1,
    'un Suedois sur une interface francaise cherche Svenska');
  verifie('la mention BIENTOT survit au changement',
    page.indexOf('lang.active ?') > -1);
}

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
