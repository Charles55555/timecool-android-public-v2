// Sur mobile, 100vh compte la zone masquée par la barre d'adresse du
// navigateur. Un élément en position fixe qui l'utilise dépasse l'écran
// par le bas, et cette partie devient inatteignable : c'est toujours le
// dernier bouton de la page qui disparaît.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(50)} ${detail || ''}`);
};

// Les règles CSS du fichier, une par ligne utile.
const regles = html.split('\n')
  .filter((l) => /^\s*\.[a-z-]+[^{]*\{/.test(l) && l.includes('}'))
  .map((l) => l.trim());

console.log('Aucun élément en position fixe ne se dimensionne en 100vh :');
const fautifs = regles.filter((r) =>
  /position:\s*fixed/.test(r) && /(height|min-height):\s*100vh/.test(r));
fautifs.forEach((r) => dire(false, r.slice(0, 46), r.slice(0, 90)));
dire(fautifs.length === 0, fautifs.length + ' règle(s) fautive(s)',
  fautifs.length ? '' : 'aucune');

console.log('\nLes deux conteneurs concernés sont bornés par le haut ET le bas :');
[['.auth-page', 'écrans de connexion et inscription'],
 ['.side-menu', 'menu latéral']].forEach(([sel, quoi]) => {
  const r = regles.find((x) => x.startsWith(sel + ' ') || x.startsWith(sel + '{'));
  dire(!!r && /top:\s*0/.test(r) && /bottom:\s*0/.test(r), sel, quoi);
  dire(!!r && !/100vh/.test(r), sel + ' n utilise plus 100vh');
  dire(!!r && /overflow-y:\s*auto/.test(r), sel + ' fait défiler son contenu');
});

/*
 * Angle mort comblé le 14/09 : ce test ne lisait que la feuille de
 * style. Chaque page d'authentification portait encore
 * « min-height:100vh » écrit dans sa balise — et un style écrit là
 * l'emporte sur la feuille. La correction du 06/09 était donc annulée
 * au cas par cas, sans que rien ne le signale.
 *
 * Invisible sur Android, où la barre d'adresse est fine. Sur iPhone
 * elle est plus haute : c'est le bouton d'inscription qui repassait
 * sous l'écran.
 */
console.log('\nAucun style écrit dans une balise ne réintroduit 100vh :');
{
  const enDur = html.match(/style="[^"]*min-height:\s*100vh[^"]*"/g) || [];
  enDur.forEach((s) => dire(false, 'style en dur', s.slice(0, 80)));
  dire(enDur.length === 0, enDur.length + ' style(s) en dur',
    enDur.length ? '' : 'la feuille de style fait foi');
}

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
