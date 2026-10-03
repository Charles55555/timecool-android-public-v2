// « Rendez-vous chez maman » doit etre jaune (Famille), pas rouge (Sante).
//
// Capture du 04/10 : Charly ecrivait « rdv », que catMap traduit par
// Sante, systematiquement. On execute la vraie fonction de choix de
// categorie, et on verifie que la consigne n'enseigne plus « rdv ».
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

titre('Le cas de la capture');
verifie('« Rendez-vous chez maman » (rdv) → famille', C('Rendez-vous chez maman', 'rdv') === 'famille', 'avant : sante, donc rouge');
verifie('« Rendez-vous chez maman » sans categorie → famille', C('Rendez-vous chez maman', '') === 'famille');
verifie('« Déjeuner chez papa et maman » (loisir) → famille', C('Déjeuner chez papa et maman', 'loisir') === 'famille');

titre('Le titre tranche quand le modele reste vague');
verifie('« Rendez-vous dentiste » (rdv) → sante', C('Rendez-vous dentiste', 'rdv') === 'sante');
verifie('« Kiné » → sante', C('Kiné', 'rdv') === 'sante');
verifie('« Réunion client » (rdv) → travail', C('Réunion client', 'rdv') === 'travail');
verifie('« Golf » (loisir) → sport', C('Golf', 'loisir') === 'sport');
verifie('« Gare de Lyon » (rdv) → voyages', C('Gare de Lyon', 'rdv') === 'voyages');
verifie('« Restaurant » (rdv) → amis', C('Restaurant', 'rdv') === 'amis');
verifie('« Temps libre » (loisir) → personnel', C('Temps libre', 'loisir') === 'personnel');

titre('Une categorie precise du modele est respectee');
verifie('« Médecin de maman » donne sante → sante', C('Médecin de maman', 'sante') === 'sante');
verifie('« Chercher les enfants » donne trajet → voyages', C('Chercher les enfants', 'trajet') === 'voyages');
verifie('« Cours de tennis » donne sport → sport', C('Cours de tennis', 'sport') === 'sport');
verifie('« Soirée libre entre amis » donne famille → famille', C('Soirée libre entre amis', 'famille') === 'famille');

titre('Sans indice, comportement d avant');
verifie('« Rendez-vous banque » (rdv) → travail (administratif)', C('Rendez-vous banque', 'rdv') === 'travail');
verifie('« Rendez-vous avocat » (rdv) → travail', C('Rendez-vous avocat', 'rdv') === 'travail');
verifie('« Rendez-vous Marc » (rdv), aucun indice : sante comme avant', C('Rendez-vous Marc', 'rdv') === 'sante');
verifie('« Truc » categorie inconnue → green', C('Truc', 'xyz') === 'green');

titre('La consigne n enseigne plus « rdv »');
verifie('la liste des categories ne contient plus rdv', /Catégories : travail, sport, famille, sante, repas/.test(page) && !/famille, rdv, repas/.test(page));
verifie('« N\'écris JAMAIS rdv comme catégorie »', /N'écris JAMAIS « rdv » comme catégorie/.test(page));
verifie('les exemples medicaux disent sante', /Rendez-vous médecin \| sante/.test(page) && /Rendez-vous dentiste \| sante/.test(page));
verifie('l exemple de la banque dit administratif', /Rendez-vous banque \| administratif/.test(page));
verifie('plus aucun exemple « | rdv » de la consigne', (page.match(/Rendez-vous banque \| rdv|Titre du RDV \| rdv|médecin \| rdv|dentiste \| rdv/g) || []).length === 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
