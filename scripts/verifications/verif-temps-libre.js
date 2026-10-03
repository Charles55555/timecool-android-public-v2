// « Temps libre » doit aller dans « Mon temps libre » (turquoise), pas
// dans Amis & Loisirs (violet).
//
// Capture du 04/10 : Charly n'avait pas « temps_libre » dans sa liste,
// il ecrivait « loisir », et catMap rangeait ca dans « amis ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* catMap tel qu'il est dans la page */
const mCat = page.match(/const catMap = \{[\s\S]*?\};/);
const ctx = { console, String, RegExp };
vm.createContext(ctx);
if (!mCat) { ko++; console.log('  KO  catMap introuvable'); }
else vm.runInContext(mCat[0].replace('const ', 'var '), ctx);
['tcSansAccents', 'tcCategorieDesPersonnes', 'tcCategorieDuTitre', 'tcCategorieDeProposition'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const C = (p) => ctx.tcCategorieDeProposition(p, ctx.catMap);

titre('La consigne connait le temps libre');
verifie('temps_libre est dans la liste des categories', /administratif, loisir, temps_libre/.test(page));
verifie('avec la consigne « jamais en loisir »', /Ne mets JAMAIS ces moments en loisir/.test(page));

titre('La table de correspondance');
verifie('temps_libre → personnel', ctx.catMap.temps_libre === 'personnel');
verifie('libre, detente, perso → personnel', ctx.catMap.libre === 'personnel' && ctx.catMap.detente === 'personnel' && ctx.catMap.perso === 'personnel');
verifie('loisir reste amis', ctx.catMap.loisir === 'amis');

titre('La securite sur le titre, quoi que dise le modele');
verifie('« Temps libre » dit loisir → personnel', C({ title: 'Temps libre', category: 'loisir' }) === 'personnel', 'le cas de la capture');
verifie('« Temps libre » sans categorie → personnel', C({ title: 'Temps libre', category: '' }) === 'personnel');
verifie('« Repos » → personnel', C({ title: 'Repos', category: 'loisir' }) === 'personnel');
verifie('« Détente au spa » → personnel', C({ title: 'Détente au spa', category: 'loisir' }) === 'personnel');
verifie('« Soirée libre entre amis » : le modele a dit famille, on respecte', C({ title: 'Soirée libre entre amis', category: 'famille' }) === 'famille',
  'la securite ne s applique que si le modele n a rien dit de plus precis que loisir');
verifie('« Cours de tennis » sport → sport', C({ title: 'Cours de tennis', category: 'sport' }) === 'sport');
verifie('« Dîner » loisir → amis, inchange', C({ title: 'Dîner', category: 'loisir' }) === 'amis');
verifie('categorie inconnue, titre quelconque → green comme avant', C({ title: 'Truc', category: 'xyz' }) === 'green');

titre('Branchee a l ajout');
verifie('l ajout passe par tcCategorieDeProposition', /cat: tcCategorieDeProposition\(p, catMap\),/.test(page));
verifie('plus de catMap[p.category] || green brut', !/cat: catMap\[p\.category\] \|\| 'green',/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
