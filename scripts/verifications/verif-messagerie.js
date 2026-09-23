// Les conversations sont-elles classees du plus recent au plus ancien ?
//
// Deux erreurs seraient invisibles : une conversation sans date
// remontee en tete par une valeur posee au hasard, et un classement
// qui s'inverse sans qu'on s'en apercoive parce que les dates de test
// se ressemblent.
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

/* La vraie fonction, executee sur des conversations fabriquees. */
const src = extraire('tcConversationsAffichables');
if (!src) { ko++; console.log('  KO  tcConversationsAffichables introuvable'); }

const conv = (ref, nom, maj, msg) => ({
  reference: ref, with: nom, maj: maj,
  thread: msg ? [{ from: 'them', texte: msg, le: maj }] : []
});

const ctx = {
  console, Date, isNaN, parseInt, String,
  mode: 'user',
  messages: { user: [
    { id: 1, with: 'Dr. Thomas Martin', thread: [{ from: 'them', text: 'x', time: 'Lun. 09:30' }] },
    { id: 2, with: 'M. Lefebvre', thread: [{ from: 'them', text: 'y', time: 'Hier' }] }
  ] },
  getContactColor: () => '#000',
  tcConversations: () => [
    conv('AAA', 'AdminCharly', '2026-09-07T14:00:00+02:00', 'ancien'),
    conv('BBB', 'Enzo Haddad', '2026-09-23T22:48:00+02:00', 'recent'),
    conv('CCC', 'Zoe Sansdate', '', 'sans date')
  ]
};
vm.createContext(ctx);
if (src) vm.runInContext(src, ctx);

titre('L ordre obtenu');
{
  const liste = ctx.tcConversationsAffichables();
  const noms = liste.map((c) => c.with);
  console.log('  ' + noms.join(' > '));
  verifie('le plus recent arrive en tete', noms[0] === 'Enzo Haddad', noms[0]);
  verifie('puis le plus ancien des dates',
    noms.indexOf('AdminCharly') < noms.indexOf('Zoe Sansdate'),
    'une conversation sans date ne doit pas doubler une vraie');
  verifie('les conversations de demonstration ferment la marche',
    noms.indexOf('Dr. Thomas Martin') > noms.indexOf('AdminCharly')
    && noms.indexOf('M. Lefebvre') > noms.indexOf('AdminCharly'),
    'elles n ont que des libelles, pas des dates');
  verifie('et gardent leur ordre entre elles',
    noms.indexOf('Dr. Thomas Martin') < noms.indexOf('M. Lefebvre'),
    'le tri de JavaScript est stable');
  verifie('aucune conversation n est perdue', liste.length === 5,
    liste.length + ' sur 5');
}

titre('Le moment garde pour comparer');
verifie('il est conserve brut',
  page.indexOf('quand: c.maj ||') > -1,
  '« 22:48 » sert a l affichage, pas a comparer');
verifie('a defaut, le dernier message du fil',
  page.indexOf('c.thread[c.thread.length - 1].le') > -1);
verifie('une date illisible vaut zero',
  page.indexOf('return isNaN(t) ? 0 : t;') > -1,
  'une date d aujourd hui posee par defaut ferait remonter la conversation en tete');

titre('Plus de classement par nom');
verifie('le tri alphabetique a disparu',
  page.indexOf("a.with.localeCompare(b.with, 'fr')") === -1,
  'personne ne cherche une conversation par ordre alphabetique');

titre('Les conversations creees dans l appareil');
{
  // Un groupe cree a l instant porte son heure ; les exemples de
  // demonstration ont de petits identifiants et restent en bas.
  ctx.messages = { user: [
    { id: 1, with: 'Dr. Thomas Martin', thread: [] },
    { id: Date.now(), with: 'Equipe test foot', isGroup: true,
      quand: new Date().toISOString(), thread: [] }
  ] };
  const noms = ctx.tcConversationsAffichables().map((c) => c.with);
  console.log('  ' + noms.join(' > '));
  verifie('le groupe cree a l instant passe en tete',
    noms[0] === 'Equipe test foot', noms[0]);
  verifie('et les exemples restent en bas',
    noms[noms.length - 1] === 'Dr. Thomas Martin', noms[noms.length - 1]);

  // Sans « quand », l identifiant doit suffire : c est ce qui range
  // les groupes crees avant cette correction.
  ctx.messages = { user: [
    { id: 2, with: 'M. Lefebvre', thread: [] },
    { id: Date.now(), with: 'Ancien groupe', isGroup: true, thread: [] }
  ] };
  const sans = ctx.tcConversationsAffichables().map((c) => c.with);
  verifie('un groupe deja cree se range quand meme',
    sans[0] === 'Ancien groupe', sans[0]);
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
