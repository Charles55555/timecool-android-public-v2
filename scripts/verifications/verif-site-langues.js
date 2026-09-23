// Le site nomme-t-il les langues, et accueille-t-il le visiteur ?
//
// Deux erreurs seraient couteuses. Basculer la langue d'un visiteur
// qui en a deja choisi une le contrarierait a chaque page. Et une
// bascule vers le francais alors qu'on y est deja rechargerait la page
// sans fin.
const fs = require('fs');
const vm = require('vm');

const site = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

titre('Les dix-sept langues sont toujours proposees');
{
  const codes = [...site.matchAll(/data-lang="([a-z]{2})"/g)].map((m) => m[1]);
  const uniques = [...new Set(codes)];
  verifie('dix-sept, sans doublon dans un menu', uniques.length === 17,
    uniques.length + ' : ' + uniques.join(' '));
  verifie('les deux menus les portent', codes.length === 34,
    codes.length + ' entrees - bureau et mobile');
}

titre('Les noms sont traduits et classes');
verifie('la fonction de nommage est la',
  site.indexOf('function nomDeLangue(code, secours, dans)') > -1);
verifie('le tri suit la langue lue',
  site.indexOf("a.textContent.localeCompare(b.textContent, dans)") > -1,
  'un tri ordinaire rejetterait le grec et le russe en fin de liste');
verifie('le nom d origine est garde',
  site.indexOf("o.setAttribute('data-origine'") > -1,
  'il sert de repli et fait reconnaitre sa langue a un etranger');
verifie('la coche est reposee apres le tri',
  /forEach\(function\(o\)\{ panel\.appendChild\(o\); \}\);[\s\S]{0,300}setActiveLangOption\(dans\);/.test(site),
  'posee avant, son signe entrerait dans la comparaison');
verifie('Google ne retraduit pas le menu',
  site.indexOf("panel.classList.add('notranslate')") > -1,
  'il repasserait sur les noms qu on vient d ecrire');

titre('Le visiteur est accueilli dans sa langue');
verifie('les langues du navigateur sont lues',
  site.indexOf('navigator.languages') > -1);
verifie('un choix deja fait l emporte',
  site.indexOf('if(!dejaChoisi())') > -1);
verifie('le cookie ne suffit pas a conclure',
  /function dejaChoisi\(\)\{[\s\S]{0,260}localStorage\.getItem\('tc_langue_choisie'\)/.test(site),
  'il est absent aussi bien sans choix qu avec le francais choisi');
verifie('toucher une langue vaut choix',
  /closest\('\.lang-opt'\)[\s\S]{0,200}setItem\('tc_langue_choisie', '1'\)/.test(site));
verifie('le francais ne declenche aucune bascule',
  site.indexOf("if(base === 'fr') break;") > -1,
  'applyTranslation(fr) recharge la page - ce serait une boucle');
verifie('aucune detection par le pays',
  site.indexOf('geoip') === -1 && site.indexOf('ipapi') === -1,
  'la langue du navigateur dit ce qu on lit, l IP ou l on se trouve');

titre('Le classement, execute pour de vrai');
{
  const ctx = { Intl, console };
  vm.createContext(ctx);
  const src = site.match(/function nomDeLangue\(code, secours, dans\)\{[\s\S]*?\n    \}/);
  if (!src) { ko++; console.log('  KO  fonction introuvable'); }
  else {
    vm.runInContext(src[0], ctx);
    const codes = ['cs', 'da', 'de', 'el', 'en', 'es', 'fr', 'it', 'hu',
                   'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'fi', 'sv'];
    const fr = codes.map((c) => ctx.nomDeLangue(c, c, 'fr'))
      .sort((a, b) => a.localeCompare(b, 'fr'));
    console.log('  ' + fr.join(', '));
    verifie('le grec et le russe ne sont plus en fin de liste',
      fr.indexOf('Grec') < fr.indexOf('Italien') && fr.indexOf('Russe') < fr.indexOf('Suédois'),
      'leurs alphabets les rejetaient apres le notre');
    verifie('aucun nom ne reste un code',
      fr.every((n) => n.length > 2), fr.filter((n) => n.length <= 2).join(', '));
  }
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
