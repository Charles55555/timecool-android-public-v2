// Les deux pages parlent-elles enfin des memes categories ?
//
// Elles recopiaient chacune sa liste. « Mon sport » n'existait que
// d'un cote, et « Mon temps libre » etait vert ici, turquoise la-bas
// pour la meme chose. Un lien entre deux pages qui ne s'accordent pas
// est pire que pas de lien.
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

console.log('\n── Une seule liste pour les deux pages ──');
verifie('les fiches contact reprennent celle des disponibilites',
  page.indexOf('const CATS = DISPO_CATEGORIES.map(') > -1);
verifie('plus aucune couleur recopiee a la main',
  page.indexOf("short:'Mon temps libre', color:'#34a853'") === -1,
  'c est cette copie qui avait diverge');

console.log('\n── Les six categories ──');
{
  const bloc = (page.match(/var DISPO_CATEGORIES = \[([\s\S]*?)\]\.map/) || [])[1] || '';
  const ids = [...bloc.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
  verifie('« Mon sport » en fait partie', ids.indexOf('sport') > -1, ids.join(', '));
  verifie('elles sont six', ids.length === 6, String(ids.length));

  // La table des couleurs doit couvrir chacune : une categorie sans
  // couleur ferait planter la construction de la liste.
  const couleurs = (page.match(/var TC_COULEURS_CATEGORIES = \{([\s\S]*?)\};/) || [])[1] || '';
  const sansCouleur = ids.filter((id) => couleurs.indexOf(id + ':') === -1);
  verifie('chacune a sa couleur', sansCouleur.length === 0,
    sansCouleur.length ? sansCouleur.join(', ') : 'six couleurs');
}

console.log('\n── Le filtre par categorie ──');
{
  const ctx = { console, contactsList: [], contactsSearchQuery: '',
                _contactsLettre: '', _contactsCategorie: '', _contactsTimeCool: false, TC_CONTACTS_SEUIL: 200 };
  vm.createContext(ctx);
  ['tcLettreContact', 'tcContactsParLettres', 'tcContactsAffiches']
    .forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx); });

  ctx.contactsList = [
    { name: 'Coach Tennis', categories: ['sport'] },
    { name: 'Alice',        categories: ['travail'] },
    { name: 'Bob',          categories: ['sport', 'travail'] },
    { name: 'Chloe',        categories: [] },
    { name: 'David' }
  ];
  ctx._contactsCategorie = 'sport';
  const r = ctx.tcContactsAffiches();
  verifie('seuls les contacts de la categorie sortent',
    r.length === 2 && r.every((c) => c.categories.indexOf('sport') > -1),
    r.map((c) => c.name).join(', '));
  verifie('et ils sont tries', r[0].name === 'Bob', r[0].name);

  ctx._contactsCategorie = 'famille';
  verifie('une categorie sans personne rend une liste vide',
    ctx.tcContactsAffiches().length === 0);

  ctx._contactsCategorie = '';
  verifie('sans filtre, la page revient a son fonctionnement normal',
    ctx.tcContactsAffiches().length === 5);
}

console.log('\n── Le trajet depuis les disponibilites ──');
verifie('la ligne est cliquable',
  page.indexOf('tcVoirContactsDeCategorie(') > -1);
verifie('elle emmene bien sur les contacts',
  /function tcVoirContactsDeCategorie\(catId\) \{[\s\S]{0,300}navigate\('contacts'\)/.test(page));
verifie('l arrivee efface lettre et recherche',
  /_contactsLettre = '';\s*\n\s*contactsSearchQuery = '';\s*\n\s*navigate\('contacts'\)/.test(page),
  'sinon on arriverait filtre deux fois sans le savoir');
verifie('un bandeau dit sur quoi on est filtre',
  page.indexOf('function tcFiltreCategorieHTML()') > -1
  && page.indexOf('Qui peut r\\u00e9server pour') > -1);
verifie('et on peut le retirer',
  page.indexOf('function tcRetirerFiltreCategorie()') > -1
  && page.indexOf('Tout voir') > -1);
verifie('la reglette s efface pendant le filtre',
  page.indexOf('if (_contactsCategorie || _contactsTimeCool) return') > -1,
  'un alphabet sur trois personnes n aurait aucun sens');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
