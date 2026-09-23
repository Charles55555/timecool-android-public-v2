// Le compte des contacts autorises dit-il la verite ?
//
// Un chiffre faux serait pire que pas de chiffre : on croirait le
// reglage complet. Il doit compter exactement ce que le serveur
// accepte -- fiche portant la categorie, contact non bloque -- et rien
// d'autre.
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

const ctx = { console, contactsList: [] };
vm.createContext(ctx);
{
  const src = extraire('tcContactsAutorises');
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  tcContactsAutorises introuvable'); }
}

console.log('\n── Qui compte, qui ne compte pas ──');
ctx.contactsList = [
  { name: 'Pierre', categories: ['travail', 'sante'] },
  { name: 'Marie',  categories: ['travail'] },
  { name: 'Luc',    categories: ['travail'], blocked: true },
  { name: 'Anne',   categories: [] },
  { name: 'Jean' },
  null
];
verifie('les contacts autorises sont comptes',
  ctx.tcContactsAutorises('travail') === 2, String(ctx.tcContactsAutorises('travail')));
verifie('un contact bloque ne compte pas',
  ctx.tcContactsAutorises('travail') === 2,
  'le serveur lui refuse le rendez-vous, la page doit dire pareil');
verifie('une categorie sans personne rend zero',
  ctx.tcContactsAutorises('famille') === 0);
verifie('une fiche sans categories ne casse rien',
  ctx.tcContactsAutorises('sante') === 1);
verifie('une fiche vide non plus',
  typeof ctx.tcContactsAutorises('sport') === 'number');

console.log('\n── Sans carnet du tout ──');
ctx.contactsList = undefined;
verifie('aucun contact charge : zero, pas une erreur',
  ctx.tcContactsAutorises('travail') === 0);

console.log('\n── Les textes de la page ──');
verifie('le mot « automatiquement » a disparu',
  page.indexOf('peuvent te prendre un rendez-vous automatiquement') === -1,
  'c est l automatisme qui inquiete, pas la reservation');
verifie('la page dit qui decide',
  page.indexOf('tu restes ma\\u00eetre de ton agenda') > -1);
verifie('elle dit ce que les contacts ne voient pas',
  page.indexOf('ne voient jamais ton agenda') > -1);
verifie('une categorie vide l annonce clairement',
  page.indexOf('Aucune plage ouverte') > -1);
verifie('le bouton est raccourci',
  page.indexOf("'+ Ajouter une plage'") > -1
  && page.indexOf('Ajouter une plage pour me rendre disponible') === -1);
verifie('les libelles ne commencent plus par « Pour »',
  page.indexOf("label: 'Pour mon travail'") === -1
  && page.indexOf("label: 'Mon travail'") > -1);

console.log('\n── La ligne n apparait que si une plage existe ──');
verifie('elle est conditionnee aux plages',
  /if \(plages\.length > 0\) \{[\s\S]{0,200}tcContactsAutorises|var combien = tcContactsAutorises\(cat\.id\);\s*\n\s*if \(plages\.length > 0\)/.test(page),
  'annoncer « 0 contact » sur une categorie fermee serait du bruit');
verifie('zero s affiche en rouge',
  page.indexOf('color:#ea4335;margin-top:6px;font-weight:500;') > -1);

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
