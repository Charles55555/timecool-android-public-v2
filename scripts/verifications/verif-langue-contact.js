// La langue d'un contact est-elle choisie correctement ?
//
// Deux regles comptent, et aucune ne se voit a l'oeil : un contact qui
// a TimeCool impose sa propre langue, et un contact sans reglage doit
// retomber sur celle de l'utilisateur plutot que sur du vide. Une
// erreur ici n'affiche aucun message : le texte part simplement dans
// la mauvaise langue.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

/* ── Les vraies fonctions, extraites et executees ────────────────── */
function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let i = page.indexOf('{', debut), n = 0;
  for (let j = i; j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

const langues = JSON.parse(
  '[' + (page.match(/const SUPPORTED_LANGUAGES = \[([\s\S]*?)\];/) || [])[1]
    .replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,\s*$/, '') + ']');

const ctx = { SUPPORTED_LANGUAGES: langues, currentLanguage: 'fr', console };
vm.createContext(ctx);
['tcLangueCourante', 'tcLangueDuContact'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  fonction ' + n + ' introuvable'); }
});

console.log('\n── Les 17 langues sont bien lues ──');
verifie('la liste est complete', langues.length === 17, langues.length + ' langues');

console.log('\n── Quelle langue pour ce contact ? ──');
verifie('un contact sans reglage prend la mienne',
  ctx.tcLangueDuContact({ name: 'Pierre-Marie' }) === 'fr');
verifie('un contact regle en anglais garde l anglais',
  ctx.tcLangueDuContact({ name: 'John', langue: 'en' }) === 'en');
verifie('une langue inconnue ne passe pas',
  ctx.tcLangueDuContact({ name: 'X', langue: 'klingon' }) === 'fr',
  'sinon Google recevrait un code qu il refuse');
verifie('aucun contact ne rend vide',
  ctx.tcLangueDuContact(null) === 'fr');

console.log('\n── Si je lis TimeCool en allemand ──');
ctx.currentLanguage = 'de';
verifie('mes nouveaux contacts heritent de l allemand',
  ctx.tcLangueDuContact({ name: 'Hans' }) === 'de');
verifie('celui que j ai regle en italien ne bouge pas',
  ctx.tcLangueDuContact({ name: 'Luca', langue: 'it' }) === 'it');
ctx.currentLanguage = 'fr';

console.log('\n── Le selecteur s affiche pour tout le monde ──');
verifie('present sur chaque fiche',
  page.indexOf('setContactLangue(\'${c.id}\', this.value)') > -1);
verifie('avec le retour automatique chez ceux qui ont TimeCool',
  page.indexOf('Sa langue (automatique)') > -1,
  'leur propre langue reste le defaut, mais on peut la forcer');
verifie('le choix est enregistre', /function setContactLangue\(id, code\)/.test(page));
verifie('et ecrit sur la fiche',
  /c\.langue = code;\s*\n\s*saveContacts\(\);/.test(page));
verifie('les noms de langues ne sont pas traduits',
  /<select data-notranslate onchange="setContactLangue/.test(page),
  'sinon « Deutsch » deviendrait « Allemand » dans la liste');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
