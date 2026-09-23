// La page se lit-elle encore ?
//
// Une virgule oubliee dans un fichier d'un million d'octets ne se voit
// pas a l'oeil, et l'application refuse alors de demarrer sans rien
// dire. Ce controle lit chaque bloc de script comme le ferait le
// navigateur, et designe la ligne fautive.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');
const blocs = [...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

let ko = 0;
blocs.forEach((m, i) => {
  // Ligne de depart, pour situer l'erreur dans la page entiere.
  const avant = page.slice(0, m.index).split('\n').length;
  try {
    new vm.Script(m[1], { filename: 'bloc ' + (i + 1) });
  } catch (e) {
    ko++;
    console.log(`KO  bloc ${i + 1} (debute ligne ${avant}) : ${e.message}`);
  }
});

console.log(`${blocs.length} bloc(s) de script lus, ${ko} illisible(s).`);
process.exit(ko ? 1 : 0);
