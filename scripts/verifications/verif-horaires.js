// Chaque rendez-vous montre son horaire de debut ET de fin.
//
// Charles, 04/10 : « Faut preciser le temps consacre pour chacun des
// rendez-vous : marque juste 9h alors qu'il faudrait 9h - 10h30. Idem
// pour tous les rdv ».
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

const ctx = { String, Number };
vm.createContext(ctx);
const src = extraire('tcHorairePlage');
if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  tcHorairePlage introuvable'); }
const H = (sh, sm, eh, em, extra) => ctx.tcHorairePlage(Object.assign({ startH: sh, startM: sm, endH: eh, endM: em }, extra || {}));

titre('Le cas de Charles');
verifie('cours de tennis 9h → 10h30 : « 9h-10h30 »', H(9, 0, 10, 30) === '9h-10h30', H(9, 0, 10, 30));

titre('Toutes les durees');
verifie('30 minutes : 15h → 15h30', H(15, 0, 15, 30) === '15h-15h30');
verifie('une heure : 14h → 15h', H(14, 0, 15, 0) === '14h-15h');
verifie('deux heures : 11h → 13h', H(11, 0, 13, 0) === '11h-13h');
verifie('de la fin de matinee : 9h45 → 11h15', H(9, 45, 11, 15) === '9h45-11h15');
verifie('apres-midi : 17h → 18h', H(17, 0, 18, 0) === '17h-18h');
verifie('9h → 18h (le temps libre)', H(9, 0, 18, 0) === '9h-18h');
verifie('minutes < 10 : 8h05 → 8h20', H(8, 5, 8, 20) === '8h05-8h20');

titre('Les cas limites');
verifie('journee entiere : « Journée »', H(0, 0, 0, 0, { allDay: true }) === 'Journée');
verifie('sans heure de fin : le debut seul', H(10, 0, 10, 0) === '10h');
verifie('fin avant le debut (donnee abimee) : le debut seul', H(10, 0, 9, 0) === '10h');
verifie('valeurs en texte (« 9 », « 30 ») : meme resultat', ctx.tcHorairePlage({ startH: '9', startM: '0', endH: '10', endM: '30' }) === '9h-10h30');
verifie('rendez-vous absent : chaine vide, pas d erreur', ctx.tcHorairePlage(null) === '');

titre('Branche dans les trois vues');
verifie('semaine : l horaire de debut-fin', /class="week-event-time">\$\{tcHorairePlage\(e\)\}<\/div>/.test(page));
verifie('semaine : plus de debut seul', !/week-event-time">\$\{String\(e\.startH\)/.test(page));
verifie('mois : la puce utilise tcHorairePlage', /const startStr = tcHorairePlage\(ev\);/.test(page));
verifie('mois : plus de debut seul', !/const startStr = String\(ev\.startH\)/.test(page));
verifie('jour : garde « debut – fin » complet (il a la place)', /day-event-time">\$\{String\(e\.startH\)[^`]*–[^`]*\$\{String\(e\.endH\)/.test(page));
verifie('un bloc de la semaine fait au moins 42 px : deux lignes y tiennent', /Math\.max\(dm\*\(44\/60\)-2, 42\)/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
