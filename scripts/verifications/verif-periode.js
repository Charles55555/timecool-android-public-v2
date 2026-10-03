// Un rendez-vous sur plusieurs jours s'affiche-t-il partout ou il faut ?
//
// Deux erreurs seraient invisibles a l'oeil : un evenement dont la
// periode est a l'envers disparaitrait de toutes les vues sans un mot,
// et une journee entiere posee dans la grille horaire recouvrirait
// tous les vrais rendez-vous du jour. Les deux se verifient ici.
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

const ctx = {
  console, Date,
  events: [],
  mode: 'perso',
  isCategoryVisible: () => true,
  isCalendarVisible: () => true
};
vm.createContext(ctx);
['tcEvenementFin', 'tcEvenementCouvre', 'tcEvenementSurPlusieursJours',
 'tcEstBandeau', 'tcEvenementDuree', 'tcEtapeDeLaPeriode',
 'tcEvenementsDuJour', 'tcPeriodeLisible'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  fonction ' + n + ' introuvable'); }
});

const ryder = { date: '2026-11-11', dateFin: '2026-11-14', title: 'Ryder Cup',
                cat: 'purple', mode: 'perso', startH: 0, startM: 0, endH: 23, endM: 59 };
const dentiste = { date: '2026-11-12', title: 'Dentiste', cat: 'red',
                   mode: 'perso', startH: 14, startM: 0, endH: 15, endM: 0 };
const ferie = { date: '2026-11-11', title: 'Armistice', cat: 'orange',
                mode: 'perso', allDay: true, startH: 0, startM: 0, endH: 23, endM: 59 };

console.log('\n── Le dernier jour occupe ──');
verifie('sans periode, le jour meme', ctx.tcEvenementFin(dentiste) === '2026-11-12');
verifie('avec periode, la date de fin', ctx.tcEvenementFin(ryder) === '2026-11-14');
verifie('une periode a l envers est ramenee au debut',
  ctx.tcEvenementFin({ date: '2026-11-11', dateFin: '2026-11-04' }) === '2026-11-11',
  'sinon l evenement ne s afficherait sur aucun jour');

console.log('\n── Quels jours sont couverts ──');
verifie('la veille : non', ctx.tcEvenementCouvre(ryder, '2026-11-10') === false);
verifie('le premier jour : oui', ctx.tcEvenementCouvre(ryder, '2026-11-11') === true);
verifie('un jour du milieu : oui', ctx.tcEvenementCouvre(ryder, '2026-11-13') === true);
verifie('le dernier jour : oui', ctx.tcEvenementCouvre(ryder, '2026-11-14') === true);
verifie('le lendemain : non', ctx.tcEvenementCouvre(ryder, '2026-11-15') === false);
verifie('un rendez-vous ordinaire ne deborde pas',
  ctx.tcEvenementCouvre(dentiste, '2026-11-13') === false);

console.log('\n── Ce qui va au bandeau ──');
verifie('une periode, oui', ctx.tcEstBandeau(ryder) === true);
verifie('une journee entiere, oui', ctx.tcEstBandeau(ferie) === true);
verifie('un rendez-vous de 14h a 15h, non', ctx.tcEstBandeau(dentiste) === false,
  'sinon il quitterait la grille des heures');

console.log('\n── Se reperer dans la periode ──');
verifie('quatre jours', ctx.tcEvenementDuree(ryder) === 4);
verifie('le premier', ctx.tcEtapeDeLaPeriode(ryder, '2026-11-11') === 'Jour 1 sur 4');
verifie('le troisieme', ctx.tcEtapeDeLaPeriode(ryder, '2026-11-13') === 'Jour 3 sur 4');
verifie('rien sur un rendez-vous d un jour',
  ctx.tcEtapeDeLaPeriode(dentiste, '2026-11-12') === '');

console.log('\n── La date dite en francais ──');
verifie('un seul jour', /jeudi 12 novembre/.test(ctx.tcPeriodeLisible(dentiste)),
  ctx.tcPeriodeLisible(dentiste));
verifie('une periode dans le meme mois',
  ctx.tcPeriodeLisible(ryder) === 'du mercredi 11 au samedi 14 novembre',
  ctx.tcPeriodeLisible(ryder));
{
  const across = { date: '2026-10-30', dateFin: '2026-11-02' };
  verifie('une periode a cheval sur deux mois repete le mois',
    /octobre/.test(ctx.tcPeriodeLisible(across)) && /novembre/.test(ctx.tcPeriodeLisible(across)),
    ctx.tcPeriodeLisible(across));
}

console.log('\n── Le tri entre bandeau et grille ──');
ctx.events = [ryder, dentiste, ferie];
{
  const bandeau = ctx.tcEvenementsDuJour('2026-11-12', true).map(e => e.title);
  const grille = ctx.tcEvenementsDuJour('2026-11-12', false).map(e => e.title);
  verifie('le 12, la Ryder Cup est en bandeau', bandeau.join() === 'Ryder Cup', bandeau.join());
  verifie('et le dentiste dans les heures', grille.join() === 'Dentiste', grille.join());
}
{
  const bandeau = ctx.tcEvenementsDuJour('2026-11-11', true).map(e => e.title).sort();
  verifie('le 11, la Ryder Cup et l Armistice cohabitent',
    bandeau.join() === 'Armistice,Ryder Cup', bandeau.join());
  verifie('et la grille du 11 est vide',
    ctx.tcEvenementsDuJour('2026-11-11', false).length === 0);
}
{
  ctx.isCategoryVisible = (c) => c !== 'purple';
  verifie('une categorie masquee disparait aussi du bandeau',
    ctx.tcEvenementsDuJour('2026-11-13', true).length === 0);
  ctx.isCategoryVisible = () => true;
}

console.log('\n── Les trois vues suivent la meme regle ──');
verifie('la vue mois', page.indexOf('tcEvenementCouvre(e, cellDateStr)') > -1);
verifie('la vue semaine', (page.match(/tcEvenementsDuJour\(fmt\(d\), false\)/g) || []).length === 2,
  'jour et semaine');
verifie('le bandeau du jour', page.indexOf('tcEvenementsDuJour(fmt(d), true)') > -1);
verifie('plus aucune vue ne compare la date a l identique',
  !/events\.filter\(e => e\.date===fmt\(d\)/.test(page),
  'c etait ce qui masquait les jours du milieu');

console.log('\n── Modifier un rendez-vous ne perd pas sa periode ──');
{
  const src = extraire('saveEventEdit');
  verifie('la date de fin est relue', src && src.indexOf("getElementById('editDateFin')") > -1,
    'sans cela, corriger un titre effacait la periode');
  verifie('ramenee au jour meme, elle est retiree',
    src && /else delete e\.dateFin;/.test(src));
  verifie('la journee entiere est relue', src && src.indexOf("getElementById('editAllDay')") > -1);
  verifie('et le formulaire propose les deux champs',
    page.indexOf('id="editDateFin"') > -1 && page.indexOf('id="editAllDay"') > -1);
}

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
