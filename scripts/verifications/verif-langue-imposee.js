// Forcer la langue d'un contact TimeCool : le choix part-il vraiment ?
//
// Le piege est de montrer un menu qui ne fait rien. Ici le reglage doit
// accompagner le message jusqu'au serveur, et son absence doit laisser
// gagner la langue du destinataire -- sinon on deciderait a sa place
// sans le vouloir.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');
const api  = fs.readFileSync(process.argv[3], 'utf8');

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

const langues = JSON.parse(
  '[' + (page.match(/const SUPPORTED_LANGUAGES = \[([\s\S]*?)\];/) || [])[1]
    .replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,\s*$/, '') + ']');

const ctx = { SUPPORTED_LANGUAGES: langues, currentLanguage: 'fr', console,
              contactsList: [] };
vm.createContext(ctx);
const src = extraire('tcLangueForceePour');
if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  fonction introuvable'); }

console.log('\n── Ce qui part avec le message ──');
ctx.contactsList = [
  { id: '1', name: 'Bob',   referenceCompte: 'AAA', langue: 'de' },
  { id: '2', name: 'Chloe', referenceCompte: 'BBB' },
  { id: '3', name: 'Dora',  referenceCompte: 'CCC', langue: 'klingon' }
];
verifie('une langue imposee accompagne le message',
  ctx.tcLangueForceePour('AAA') === 'de');
verifie('rien d impose : rien n est envoye',
  ctx.tcLangueForceePour('BBB') === '',
  'le serveur garde alors la langue du destinataire');
verifie('une valeur abimee est ignoree',
  ctx.tcLangueForceePour('CCC') === '',
  'plutot que de faire refuser l envoi entier');
verifie('un correspondant inconnu ne casse rien',
  ctx.tcLangueForceePour('ZZZ') === '');
verifie('sans reference non plus', ctx.tcLangueForceePour('') === '');

console.log('\n── Le menu propose bien le retour automatique ──');
verifie('l option existe pour un contact TimeCool',
  page.indexOf('Sa langue (automatique)') > -1);
verifie('elle est choisie tant que rien n est impose',
  page.indexOf("${c.langue ? '' : ' selected'}") > -1);
verifie('et seulement pour eux', page.indexOf('${onTC ? `<option value=""') > -1);
{
  const src2 = extraire('setContactLangue');
  verifie('la remettre a zero efface le reglage',
    src2 && /if \(!code\) \{[\s\S]{0,120}delete c\.langue;/.test(src2));
}

console.log('\n── Le serveur en tient compte ──');
verifie('la route accepte le champ',
  /\$imposee = Entree::corps\(\)\['langue'\] \?\? null;/.test(api));
verifie('une langue inventee est refusee',
  /langue_inconnue/.test(api) && /in_array\(\$imposee, \$connues, true\)/.test(api));
verifie('elle passe devant celle du compte',
  /if \(is_string\(\$langueImposee\) && \$langueImposee !== ''\) \{\s*\n\s*\$langueVers = \$langueImposee;/.test(api));
verifie('son absence garde l ancien comportement',
  /\?string \$langueImposee = null/.test(api));

console.log('\n── Le choix voyage jusqu au serveur ──');
verifie('l envoi le transmet',
  page.indexOf('if (langue) corps.langue = langue;') > -1);
verifie('la messagerie le calcule avant d envoyer',
  page.indexOf('tcLangueForceePour(conv.reference)') > -1);

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
