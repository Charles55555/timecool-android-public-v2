// Le bouton « Mes contacts TimeCool » dit-il vrai ?
//
// Deux silences seraient possibles : un compte qui inclut des contacts
// bloques ou mal detectes, et trois filtres qui restent allumes
// ensemble -- on croirait alors voir tous les inscrits alors qu'on
// n'en voit qu'une lettre.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

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

const ctx = {
  console, contactsList: [], contactsSearchQuery: '',
  _contactsLettre: '', _contactsCategorie: '', _contactsTimeCool: false,
  TC_CONTACTS_SEUIL: 200
};
vm.createContext(ctx);
['isTimeCoolUser', 'tcLettreContact', 'tcContactsParLettres',
 'tcContactsAffiches', 'tcCompterTimeCool', 'tcBoutonTimeCoolHTML']
  .forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx);
                    else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

ctx.contactsList = [
  { name: 'Bob',    isTimeCool: true },
  { name: 'Alice',  isTimeCool: true },
  { name: 'Chloe',  isTimeCool: false },
  { name: 'David' },
  { name: 'Emma',   isTimeCool: 'oui' },
  null
];

titre('Le compte');
verifie('seuls les inscrits sont comptes', ctx.tcCompterTimeCool() === 2,
  String(ctx.tcCompterTimeCool()));
verifie('une valeur qui n est pas un booleen ne compte pas',
  ctx.tcCompterTimeCool() === 2,
  'isTimeCoolUser n accepte que true, et c est bien ainsi');

titre('Ce que le bouton affiche');
{
  const h = ctx.tcBoutonTimeCoolHTML();
  verifie('il annonce le nombre', h.indexOf('(2)') > -1, h.slice(-60));
  verifie('et invite a les voir', h.indexOf('Mes contacts TimeCool') > -1);

  ctx._contactsTimeCool = true;
  verifie('une fois ouvert, il propose de tout revoir',
    ctx.tcBoutonTimeCoolHTML().indexOf('Tout voir') > -1);
  ctx._contactsTimeCool = false;

  ctx.contactsList = [{ name: 'Seul' }];
  const vide = ctx.tcBoutonTimeCoolHTML();
  verifie('sans aucun inscrit, il ne s ouvre pas',
    vide.indexOf('<button') === -1 && vide.indexOf('n’utilise encore') > -1,
    'un ecran vide ne renseigne sur rien');
  ctx.contactsList = [
    { name: 'Bob', isTimeCool: true }, { name: 'Alice', isTimeCool: true },
    { name: 'Chloe', isTimeCool: false }
  ];
  ctx._contactsCategorie = 'travail';
  verifie('il s efface pendant un filtre par categorie',
    ctx.tcBoutonTimeCoolHTML() === '', 'deux filtres a la fois seraient illisibles');
  ctx._contactsCategorie = '';
}

titre('La liste filtree');
{
  ctx._contactsTimeCool = true;
  const r = ctx.tcContactsAffiches();
  verifie('elle ne contient que les inscrits',
    r.length === 2 && r.every((c) => c.isTimeCool === true),
    r.map((c) => c.name).join(', '));
  verifie('et ils sont tries', r[0].name === 'Alice', r[0].name);
  ctx._contactsTimeCool = false;
  verifie('sans le filtre, tout revient', ctx.tcContactsAffiches().length === 3);
}

titre('Les filtres ne s empilent pas');
{
  const lettre = extraire('tcChoisirLettre');
  verifie('toucher une lettre quitte les inscrits',
    lettre && lettre.indexOf('_contactsTimeCool = false;') > -1);
  const cat = extraire('tcVoirContactsDeCategorie');
  verifie('aller sur une categorie aussi',
    cat && cat.indexOf('_contactsTimeCool = false;') > -1);
  const liste = extraire('renderContactsList');
  verifie('chercher un nom aussi',
    liste && liste.indexOf('_contactsTimeCool = false;') > -1,
    'on cherche dans tout le carnet, pas parmi les inscrits');
  const bascule = extraire('tcBasculerTimeCool');
  verifie('et ouvrir les inscrits efface lettre, categorie et recherche',
    bascule && bascule.indexOf("_contactsCategorie = ''") > -1
    && bascule.indexOf("_contactsLettre = ''") > -1
    && bascule.indexOf("contactsSearchQuery = ''") > -1);
}

titre('La place dans la page');
verifie('le bouton est pose au-dessus de la reglette',
  page.indexOf('${tcBoutonTimeCoolHTML()}') > -1
  && page.indexOf('${tcBoutonTimeCoolHTML()}') < page.indexOf('${tcRegletteHTML()}'));
verifie('la reglette s efface pendant le filtre',
  page.indexOf('if (_contactsCategorie || _contactsTimeCool) return \'\';') > -1);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
