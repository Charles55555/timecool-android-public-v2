// Recense les faux interrupteurs : des div dessines comme une bascule,
// sans case a cocher ni gestionnaire. Ils paraissent reglables mais ne
// repondent a rien — le defaut le plus trompeur d'une page de reglages.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

// Un interrupteur dessine : un div arrondi de 40 a 44 px contenant un
// rond blanc positionne en absolu.
const re = /<div[^>]*width:\s*4[0-9]px;[^>]*border-radius:\s*1[0-9]px[^>]*>\s*<div[^>]*border-radius:\s*50%[^>]*>\s*<\/div>\s*<\/div>/g;

let m, faux = 0;
const lignes = [];
while ((m = re.exec(html)) !== null) {
  const ligne = html.slice(0, m.index).split('\n').length;
  // Un vrai interrupteur porte une case a cocher dans le meme <label>.
  const contexte = html.slice(Math.max(0, m.index - 700), m.index + 200);
  const reel = /type=["']checkbox["']/.test(contexte);
  if (!reel) {
    faux++;
    // Libelle de la ligne, pour situer le probleme.
    const avant = html.slice(Math.max(0, m.index - 400), m.index);
    const titres = avant.match(/font-size:14px[^>]*>([^<]{3,40})</g) || [];
    const titre = titres.length
      ? titres[titres.length - 1].replace(/.*>/, '')
      : '(libelle inconnu)';
    lignes.push(`  KO ligne ${String(ligne).padEnd(6)} ${titre}`);
  }
}

if (lignes.length) {
  console.log('Interrupteurs dessines mais non branches :\n');
  lignes.forEach((l) => console.log(l));
} else {
  console.log('Aucun faux interrupteur.');
}
console.log(`\n${faux} faux interrupteur(s).`);
process.exit(faux ? 1 : 0);
