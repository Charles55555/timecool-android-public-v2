// Mission 84 (Charles, 14/11) : la liste des comptes de la page administrateur affiche l'heure de Paris.
// La base est en UTC : « 2026-11-14 11:50:13 » est une inscription à 12h50 à Paris (heure d'hiver).
// Usage : node verif-heure-paris-admin.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}

// Joué, quel que soit le fuseau de la machine qui lance la suite.
const ctx = { _tcUsersMoi: null };
vm.createContext(ctx);
try {
  vm.runInContext([fonction('tcDateServeurUTC'), fonction('tcDateHeureParis'), fonction('tcUserDepuisServeur')].join('\n')
    + '\nthis.f = function (cree) { var u = tcUserDepuisServeur({ reference: "X", cree_le: cree }, 0); var p = tcDateHeureParis(new Date(u.registeredAt)); return p.date + " " + p.heure; };', ctx);
} catch (e) { verifie('les fonctions se chargent', false, e.message); }
const f = (c) => { try { return ctx.f(c); } catch (e) { return 'erreur ' + e.message; } };
verifie('hiver : 11:50 UTC → 14/11/2026 12:50 (compte 32457)', f('2026-11-14 11:50:13') === '14/11/2026 12:50', f('2026-11-14 11:50:13'));
verifie('hiver : 16:40 UTC → 17:40 (compte 31248)', / 17:40$/.test(f('2026-11-10 16:40:00')), f('2026-11-10 16:40:00'));
verifie('été : 10:00 UTC → 12:00', f('2026-07-01 10:00:00') === '01/07/2026 12:00', f('2026-07-01 10:00:00'));
verifie('le jour change à minuit de Paris : 23:30 UTC → lendemain 00:30', f('2026-11-14 23:30:00') === '15/11/2026 00:30', f('2026-11-14 23:30:00'));
verifie('une date déjà munie de son fuseau ne bouge pas', f('2026-11-14T11:50:13Z') === '14/11/2026 12:50' && f('2026-11-14T12:50:13+01:00') === '14/11/2026 12:50');
verifie('date absente : vide, rangée en dernier', ctx.f && vm.runInContext('tcUserDepuisServeur({ cree_le: null }, 0).registeredAt', ctx) === '');

// Câblage : la liste et l'export CSV passent par l'heure de Paris.
const liste = fonction('renderUsersTab');
verifie('la liste : « JJ/MM/AAAA HH:MM » en heure de Paris', liste.includes("const paris = tcDateHeureParis(d);\n        const dateStr = paris.date + ' ' + paris.heure;") && !/toLocaleTimeString\('fr-FR', \{hour:'2-digit'/.test(liste));
verifie('l export CSV : la date de Paris', page.includes("const dateStr = (d && !isNaN(d.getTime())) ? tcDateHeureParis(d).date : '';"));
verifie('registeredAt passe par tcDateServeurUTC', fonction('tcUserDepuisServeur').includes('registeredAt: tcDateServeurUTC(u.cree_le),'));
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
