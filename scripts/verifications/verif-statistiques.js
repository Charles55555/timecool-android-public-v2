// La page de statistiques compte les vrais rendez-vous.
//
// Tout y était écrit en dur : un nouvel utilisateur découvrait « 6h 12
// économisées » et « 142 rendez-vous honorés » avant même d'en avoir
// pris un. Le pire défaut d'un tableau de bord est d'être faux.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const d = html.indexOf('const TC_MINUTES_PAR_RDV_CHARLY');
const f = html.indexOf('// ═══ DASHBOARD ═══');
if (d < 0 || f < d) { console.log('ERREUR: calcul introuvable'); process.exit(1); }

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function calcul(evenements, mois) {
  const ctx = { events: evenements, Date, Math, String, isNaN, console };
  vm.createContext(ctx);
  vm.runInContext(html.slice(d, f)
    + '\nglobalThis._s = tcStatistiques; globalThis._d = tcDureeLisible;', ctx);
  return { stats: ctx._s(mois), duree: ctx._d };
}

const MOIS = new Date(2026, 8, 15);   // septembre 2026

console.log('\n── Un nouvel utilisateur part de zéro ──');
{
  const { stats, duree } = calcul([], MOIS);
  verifie('temps économisé : 0', stats.minutesMois === 0, duree(stats.minutesMois));
  verifie('rendez-vous prévus : 0', stats.prevusMois === 0);
  verifie('honorés : 0', stats.honoresMois === 0);
  verifie('cumul : 0', stats.honoresTotal === 0 && stats.charlyTotal === 0);
}

console.log('\n── Cinq minutes par rendez-vous de Charly ──');
{
  const dix = [];
  for (let i = 0; i < 10; i++) {
    dix.push({ id: 'charly_ai_' + i, date: '2026-09-0' + ((i % 9) + 1),
               mode: 'user', startH: 10, startM: 0, endH: 11, endM: 0 });
  }
  const { stats, duree } = calcul(dix, MOIS);
  verifie('10 rendez-vous de Charly = 50 min',
    stats.minutesMois === 50, duree(stats.minutesMois));
  verifie('l affichage dit « 50 min »', duree(stats.minutesMois) === '50 min');
}

console.log('\n── Un rendez-vous saisi à la main ne compte pas ──');
{
  const { stats } = calcul([
    { id: 'charly_ai_1', date: '2026-09-03', mode: 'user', startH: 9, endH: 10 },
    { id: 'new_123',     date: '2026-09-04', mode: 'user', startH: 9, endH: 10 },
  ], MOIS);
  verifie('un seul compte pour le temps gagné', stats.minutesMois === 5);
  verifie('les deux comptent comme rendez-vous prévus', stats.prevusMois === 2);
}

console.log('\n── Les heures s écrivent en heures ──');
{
  const { duree } = calcul([], MOIS);
  [[0, '0 min'], [5, '5 min'], [59, '59 min'], [60, '1 h'],
   [125, '2 h 05'], [372, '6 h 12']].forEach(([m, attendu]) => {
    verifie(m + ' min → « ' + attendu + ' »', duree(m) === attendu, duree(m));
  });
}

console.log('\n── Seul le mois affiché est compté ──');
{
  const { stats } = calcul([
    { id: 'charly_ai_1', date: '2026-09-10', mode: 'user', startH: 9, endH: 10 },
    { id: 'charly_ai_2', date: '2026-10-10', mode: 'user', startH: 9, endH: 10 },
  ], MOIS);
  verifie('septembre ne compte pas octobre', stats.charlyMois === 1);
  verifie('le cumul, lui, compte les deux', stats.charlyTotal === 2);
}

console.log('\n── Un rendez-vous à venir n est pas encore honoré ──');
{
  const an = new Date().getFullYear() + 2;
  const { stats } = calcul([
    { id: 'a', date: '2020-09-10', mode: 'user', startH: 9, endH: 10 },
    { id: 'b', date: an + '-09-10', mode: 'user', startH: 9, endH: 10 },
  ], new Date(2020, 8, 15));
  verifie('le passé compte', stats.honoresMois === 1);
  verifie('l avenir attend', stats.honoresTotal === 1);
}

console.log('\n── Plus rien d écrit en dur dans la page ──');
verifie('« 6h 12 » a disparu', html.indexOf('>6h 12<') < 0);
verifie('« ~75h économisées » a disparu', html.indexOf('~75h économisées') < 0);
verifie('« Total cumulé : 142 » a disparu', html.indexOf('Total cumulé : 142') < 0);
verifie('les praticiens inventés ne s affichent plus par défaut',
  /relations\.length === 0/.test(html),
  'six médecins fictifs accueillaient le nouvel utilisateur');
verifie('les deux libellés d origine sont revenus',
  html.indexOf('RDV honorés par moi') > 0 && html.indexOf('RDV honorés par mes contacts') > 0);
verifie('une ligne d exemple, marquée comme telle',
  />Exemple</.test(html) && /contactExemple/.test(html),
  'Charles veut voir a quoi ressemblera la page');
verifie('l exemple prend un vrai prénom du carnet',
  /contactsList\[0\]\.name/.test(html),
  'et non un docteur invente');
verifie('l encart d explication est là',
  html.indexOf('Ton temps, en chiffres') > 0);
verifie('il est avant le temps économisé',
  html.indexOf('Ton temps, en chiffres') < html.indexOf('Temps économisé ce mois'));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
