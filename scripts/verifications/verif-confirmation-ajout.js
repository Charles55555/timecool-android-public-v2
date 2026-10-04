// La confirmation d'ajout est dans la bulle de Charly, simple, sans notification.
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
verifie('plus de petite ligne grise « créneaux ajoutés »', page.indexOf("role:'system_info', content:`✅ ${added} créneaux ajoutés") === -1);
verifie('Charly le dit dans sa bulle', page.indexOf("role:'assistant', content:`✅ C'est noté : ") > -1);
verifie('singulier : rendez-vous ajouté ; pluriel : N créneaux', page.indexOf("${added > 1 ? added + ' créneaux ajoutés' : 'rendez-vous ajouté'}") > -1);
verifie('il invite à vérifier', page.indexOf('Tu peux aller vérifier.') > -1);
verifie('la suite sur la notification est écartée', page.indexOf('préviendrai|te rappellerai|notification') > -1);
verifie('la consigne ne fait plus parler de notification', page.indexOf('Puis rassure-le : "Je te préviendrai') === -1);
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
