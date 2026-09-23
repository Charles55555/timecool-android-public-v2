// Recense toutes les cases a cocher de l'application et signale celles
// qui ne peuvent pas repondre a un clic : pas de gestionnaire, ou
// apparence personnalisee jamais repeinte.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

const re = /<input[^>]*type=["']checkbox["'][^>]*>/gi;
let m, n = 0, ko = 0;

console.log('Cases a cocher trouvees :\n');
while ((m = re.exec(html)) !== null) {
  n++;
  const balise = m[0];
  const ligne = html.slice(0, m.index).split('\n').length;

  const id = (balise.match(/id=["']([^"']+)["']/) || [])[1] || '(sans id)';
  const aGestionnaire = /onchange=|onclick=/.test(balise);
  // Apparence personnalisee : la case est masquee, deux span la dessinent.
  const invisible = /opacity\s*:\s*0/.test(balise);
  const repeinte = /tcMajVisuelInterrupteur/.test(balise);

  let etat = 'OK ';
  let note = aGestionnaire ? 'gestionnaire present' : 'aucun gestionnaire';

  if (!aGestionnaire) {
    // Une case sans gestionnaire peut etre lue au moment de valider un
    // formulaire : ce n'est pas forcement un defaut.
    etat = '?  ';
    note = 'aucun gestionnaire — lue a la validation ?';
  } else if (invisible && !repeinte) {
    etat = 'KO ';
    note = 'apparence personnalisee jamais repeinte : parait inerte';
    ko++;
  } else if (invisible && repeinte) {
    note = 'apparence personnalisee, repeinte au clic';
  } else {
    note = 'case native, apparence geree par le navigateur';
  }

  console.log(`  ${etat}ligne ${String(ligne).padEnd(6)} ${id.padEnd(18)} ${note}`);
}

console.log(`\n${n} case(s) examinee(s), ${ko} inerte(s).`);
process.exit(ko ? 1 : 0);
