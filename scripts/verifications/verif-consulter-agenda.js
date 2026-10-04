// Les consignes de Charly lui interdisent les questions dont l'agenda a la reponse.
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
const i = page.indexOf('CONSULTE L');
verifie('la regle existe dans les consignes, une seule fois', i > -1 && page.indexOf('CONSULTE L', i + 1) === -1);
const bloc = page.slice(i, i + 700);
verifie('elle interdit de demander si ca remplace un rendez-vous', /est-ce que ça remplace un de tes rendez-vous/.test(bloc));
verifie('elle interdit de demander si le creneau est libre', /ce créneau est-il libre/.test(bloc));
verifie('elle dit de ne demander que ce que lui seul connait', /Seule l.information que lui seul connaît/.test(bloc));
verifie('elle est avant la regle mere, donc bien lue', i > -1 && i < page.indexOf('RÈGLE MÈRE — AU-DESSUS'));
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
