// Le serveur apprend-il vraiment la langue de chacun ?
//
// Cinq points doivent tenir ensemble : la route cote serveur, la
// methode cote client, les deux endroits ou l'utilisateur change de
// langue, et le rattrapage au demarrage. Si un seul manque, la
// traduction des messages partira dans la mauvaise langue -- et rien
// ne le signalera, puisque le message arrivera quand meme.
const fs = require('fs');

const page = fs.readFileSync(process.argv[2], 'utf8');   // index.html
const api  = fs.readFileSync(process.argv[3], 'utf8');   // index.php

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

console.log('\n── Cote serveur ──');
verifie('la route existe', /case 'POST \/compte\/langue':/.test(api));
verifie('elle ecrit bien en base',
  /UPDATE comptes SET langue = \? WHERE id = \?/.test(api));
verifie('une langue inconnue est refusee', /langue_inconnue/.test(api));
{
  // La liste du serveur doit couvrir celle de la page : une langue
  // proposee a l'ecran et refusee par le serveur serait un refus
  // silencieux, l'envoi n'etant pas attendu.
  const dansLaPage = [...page.matchAll(/\{ code: '([a-z]{2})',/g)].map(m => m[1]);
  const bloc = (api.match(/\$langues = \[([\s\S]*?)\];/) || [])[1] || '';
  const dansLApi = [...bloc.matchAll(/'([a-z]{2})'/g)].map(m => m[1]);
  const manquantes = dansLaPage.filter(c => dansLApi.indexOf(c) < 0);
  verifie('toutes les langues de l ecran sont acceptees',
    dansLaPage.length > 0 && manquantes.length === 0,
    manquantes.length ? manquantes.join(', ')
                      : dansLaPage.length + ' langues des deux cotes');
}

console.log('\n── Cote application ──');
verifie('TC_BACKEND sait l envoyer', /async enregistrerLangue\(code\)/.test(page));
verifie('l envoi existe', /function tcPousserLangue\(code\)/.test(page));
verifie('le rattrapage existe', /function tcRattraperLangue\(compte\)/.test(page));

console.log('\n── Branche aux bons endroits ──');
{
  // Le point-virgule distingue l'appel de la ligne qui declare la
  // fonction : sans lui, la definition se comptait comme un appel.
  const appels = (page.match(/tcPousserLangue\(code\);/g) || []).length;
  verifie('les deux changements de langue previennent le serveur',
    appels === 2, appels + ' appel(s) — attendu 2');
}
verifie('le rattrapage tourne a la revalidation',
  /tcRecupererClesDuServeur\(\);\s*\n\s*tcRattraperLangue\(compte\);/.test(page));

console.log('\n── Rien ne fait attendre l utilisateur ──');
verifie('l envoi n est jamais attendu',
  !/await tcPousserLangue/.test(page) && !/await tcRattraperLangue/.test(page),
  'sinon le changement de langue attendrait le reseau');
verifie('un echec reseau est absorbe',
  /enregistrerLangue\(code\)\.catch\(/.test(page));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
