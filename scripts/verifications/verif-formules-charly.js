// Chaque formule que Charly peut ecrire atterrit dans une categorie
// qui existe, et les repas disent avec qui.
//
// Charles, 04/10 : « Dejeuner avec des amis » sortait en Famille, parce
// que « repas » est traduit par Famille quelle que soit la personne.
// Les cas se decouvraient un par un (temps libre, rdv, repas) : cette
// suite passe en revue toutes les formules d'un coup.
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

const mCat = page.match(/const catMap = \{[\s\S]*?\};/);
const ctx = { console, String, RegExp };
vm.createContext(ctx);
if (!mCat) { ko++; console.log('  KO  catMap introuvable'); }
else vm.runInContext(mCat[0].replace('const ', 'var '), ctx);
['tcSansAccents', 'tcCategorieDesPersonnes', 'tcCategorieDuTitre', 'tcCategorieDeProposition'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const C = (t, category) => ctx.tcCategorieDeProposition({ title: t, category: category }, ctx.catMap);
const IDS = ['travail', 'sante', 'famille', 'amis', 'sport', 'personnel', 'voyages'];

titre('Toute formule de la table mene a une categorie qui existe');
Object.keys(ctx.catMap).forEach((formule) => {
  verifie(formule + ' → ' + ctx.catMap[formule], IDS.indexOf(ctx.catMap[formule]) > -1);
});

titre('Les formules que Charly connait par sa consigne');
const liste = (page.match(/Catégories : ([a-z_, ]+)\n/) || [])[1] || '';
liste.split(',').map((x) => x.trim()).filter(Boolean).forEach((formule) => {
  const cat = C('Truc', formule);
  verifie('« ' + formule + ' » donne une categorie reconnue', IDS.indexOf(cat) > -1 || cat === 'green', cat);
});

titre('Un repas dit avec qui');
verifie('« Déjeuner avec des amis » (repas) → amis', C('Déjeuner avec des amis', 'repas') === 'amis', 'le cas de la capture');
verifie('« Déjeuner avec des amis » (dejeuner) → amis', C('Déjeuner avec des amis', 'dejeuner') === 'amis');
verifie('« Dîner avec les copains » (diner) → amis', C('Dîner avec les copains', 'diner') === 'amis');
verifie('« Déjeuner chez maman » (repas) → famille', C('Déjeuner chez maman', 'repas') === 'famille');
verifie('« Dîner de famille » (repas) → famille', C('Dîner de famille', 'repas') === 'famille');
verifie('« Déjeuner avec maman et des amis » → famille', C('Déjeuner avec maman et des amis', 'repas') === 'famille', 'la famille gagne');
verifie('« Déjeuner » seul (repas) → famille comme avant', C('Déjeuner', 'repas') === 'famille');
verifie('« Dîner » seul (diner) → famille comme avant', C('Dîner', 'diner') === 'famille', 'sans indice, on ne change pas');
verifie('« Déjeuner avec collègues » → amis', C('Déjeuner avec collègues', 'repas') === 'amis');

titre('Le reste n a pas bouge');
verifie('« Chercher les enfants » (trajet) → voyages', C('Chercher les enfants', 'trajet') === 'voyages');
verifie('« Rendez-vous chez maman » (rdv) → famille', C('Rendez-vous chez maman', 'rdv') === 'famille');
verifie('« Réunion avec collègues » (rdv) → travail', C('Réunion avec collègues', 'rdv') === 'travail', 'travail passe avant amis');
verifie('« Temps libre » (loisir) → personnel', C('Temps libre', 'loisir') === 'personnel');
verifie('« Dîner » (loisir) → amis', C('Dîner', 'loisir') === 'amis');

titre('La reparation a l ouverture : les repas ranges en Famille');
const ctx2 = { console, String, RegExp, Array, saves: 0 };
ctx2.saveEventsToStorage = () => { ctx2.saves++; };
vm.createContext(ctx2);
['tcSansAccents', 'tcCategorieDesPersonnes', 'tcCategorieDuTitre', 'tcReparerCategories'].forEach((n) => {
  const src = extraire(n); if (src) vm.runInContext(src, ctx2);
});
const ev = (id, title, cat) => ({ id: id, title: title, cat: cat });
ctx2.events = [
  ev('charly_ai_1', 'Déjeuner avec des amis', 'famille'),
  ev('charly_ai_2', 'Chercher les enfants à l\'école', 'famille'),
  ev('charly_ai_3', 'Dîner', 'famille'),
  ev('charly_ai_4', 'Déjeuner chez maman', 'famille'),
  ev('manuel_5', 'Déjeuner avec des amis', 'famille'),
  ev('charly_ai_6', 'Rendez-vous chez maman', 'sante')
];
const n = ctx2.tcReparerCategories();
const par = (id) => ctx2.events.find((e) => e.id === id).cat;
verifie('déjeuner avec des amis : famille → amis', par('charly_ai_1') === 'amis');
verifie('chercher les enfants reste famille', par('charly_ai_2') === 'famille');
verifie('« Dîner » seul reste famille', par('charly_ai_3') === 'famille');
verifie('déjeuner chez maman reste famille', par('charly_ai_4') === 'famille');
verifie('ce que Charles a cree a la main ne bouge pas', par('manuel_5') === 'famille');
verifie('et l ancienne reparation marche encore (chez maman : sante → famille)', par('charly_ai_6') === 'famille');
verifie('deux reparations, un seul enregistrement', n === 2 && ctx2.saves === 1);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
