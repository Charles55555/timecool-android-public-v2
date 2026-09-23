// La page des contacts s'ouvre-t-elle sans tout construire ?
//
// Le piege : une recherche qui ne chercherait que dans la lettre
// affichee. On taperait un nom, on n'aurait rien, et on conclurait que
// le contact a disparu du carnet.
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

const ctx = { console, contactsList: [], contactsSearchQuery: '', _contactsLettre: '',
              _contactsCategorie: '', _contactsTimeCool: false, TC_CONTACTS_SEUIL: 200 };
vm.createContext(ctx);
['tcLettreContact', 'tcContactsParLettre', 'tcContactsParLettres',
 'tcContactsAffiches'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

console.log('\n── Sous quelle lettre ──');
verifie('un nom ordinaire', ctx.tcLettreContact({ name: 'Brutschi' }) === 'B');
verifie('la minuscule remonte', ctx.tcLettreContact({ name: 'du Pont' }) === 'D');
verifie('un accent rejoint sa lettre',
  ctx.tcLettreContact({ name: 'Émile' }) === 'E',
  'personne n irait chercher sous un É');
verifie('un numero sans nom va sous #',
  ctx.tcLettreContact({ name: '+33 6 12 34 56 78' }) === '#');
verifie('un nom vide aussi', ctx.tcLettreContact({ name: '   ' }) === '#');
verifie('une fiche absente ne casse rien', ctx.tcLettreContact(null) === '#');

console.log('\n── Un petit carnet ne change pas ──');
ctx.contactsList = [{ name: 'Anne' }, { name: 'Bob' }, { name: 'Zoe' }];
verifie('pas de reglette', ctx.tcContactsParLettres() === false);
verifie('tout s affiche', ctx.tcContactsAffiches().length === 3);

console.log('\n── Un grand carnet ──');
ctx.contactsList = [];
for (let i = 0; i < 300; i++) {
  ctx.contactsList.push({ name: String.fromCharCode(65 + (i % 26)) + 'nom' + i });
}
ctx.contactsList.push({ name: 'Émile Zola' });
verifie('la reglette apparait', ctx.tcContactsParLettres() === true);
verifie('rien n est construit au depart',
  ctx.tcContactsAffiches().length === 0,
  'c est ce qui rend l ouverture immediate');
{
  ctx._contactsLettre = 'E';
  const e = ctx.tcContactsAffiches();
  verifie('une lettre choisie ne construit qu elle',
    e.every((c) => ctx.tcLettreContact(c) === 'E'), e.length + ' fiches');
  verifie('Émile y est bien', e.some((c) => c.name === 'Émile Zola'));
  verifie('et il n y a pas tout le carnet', e.length < 20, e.length + ' sur 301');
}

console.log('\n── La recherche fouille tout le carnet ──');
{
  ctx._contactsLettre = 'E';
  ctx.contactsSearchQuery = 'Anom1';
  const r = ctx.tcContactsAffiches();
  verifie('elle trouve hors de la lettre affichee',
    r.length > 0 && r.every((c) => c.name.indexOf('Anom1') > -1),
    r.length + ' resultat(s) — sinon on croirait le contact perdu');
  ctx.contactsSearchQuery = '';
  ctx._contactsLettre = '';
}

console.log('\n── Le compte par lettre ──');
{
  const m = ctx.tcContactsParLettre();
  const total = Object.keys(m).reduce((s, k) => s + m[k], 0);
  verifie('chaque fiche est comptee une fois', total === 301, String(total));
  verifie('Émile compte sous E', m['E'] >= 2, String(m['E']));
}

console.log('\n── Le branchement dans la page ──');
verifie('la reglette est posee avant la liste',
  page.indexOf('${tcRegletteHTML()}') > -1
  && page.indexOf('${tcContactsListeHTML()}') > -1);
// La recherche efface desormais la lettre ET la liste des
// inscrits : on controle l intention, pas la ligne exacte.
verifie('taper un nom quitte la lettre',
  /if \(contactsSearchQuery\.trim\(\)\)[^;]*_contactsLettre = '';/.test(page),
  'sinon une lettre resterait allumee pendant une recherche globale');
verifie('le total s affiche pour verifier un import',
  page.indexOf("total.toLocaleString('fr-FR')") > -1);
verifie('plus aucun tri global a l ouverture',
  page.indexOf('const sorted = [...filtered].sort') === -1,
  'c est lui qui touchait les 3 286 fiches');

console.log('\n-- L ordre de la page --');
{
  const debut = page.indexOf('function renderContacts() {');
  const bloc = page.slice(debut, debut + 3500);
  const ou = (t) => bloc.indexOf(t);
  const phrase = ou('Choisis, pour chaque');
  const recherche = ou('contactsSearchInput');
  const reglette = ou('tcRegletteHTML');
  const liste = ou('contactsListContainer');
  const boutons = ou('importPhoneContacts');

  verifie('la phrase vient en premier',
    phrase > -1 && phrase < recherche, 'position ' + phrase);
  verifie('puis la recherche, avant la reglette',
    recherche > -1 && recherche < reglette);
  verifie('puis la reglette, avant la liste',
    reglette > -1 && reglette < liste);
  verifie('les deux gros boutons passent en dernier',
    boutons > liste,
    'ils servent une fois par an, la recherche a chaque visite');
}

console.log('\n-- Ce qui a disparu --');
verifie('l encart « Astuce » n est plus la',
  page.indexOf('seront import') === -1,
  'il annoncait un import a venir, deja fait 3 313 fois');
verifie('le bandeau ne fait plus un tiers d ecran',
  page.indexOf('Choisis pour chaque personne dans quel domaine') === -1);

console.log('\n-- La legende est descendue sur la premiere fiche --');
verifie('elle est posee sur la fiche', page.indexOf('legendeAPoser ?') > -1);
verifie('et une seule fois', page.indexOf('legendeAPoser = false;') > -1,
  'sinon elle se repeterait sous chacune des 3 313 fiches');

console.log('\n-- La reglette forme une grille reguliere --');
verifie('cellules de taille fixe',
  page.indexOf('grid-template-columns:repeat(auto-fill, minmax(30px, 1fr))') > -1,
  'les lettres se partageaient la largeur, W X Y Z # tenaient une ligne entiere');
verifie('plus aucun partage de largeur sur les lettres',
  page.indexOf('flex:1; min-width:26px') === -1);

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
