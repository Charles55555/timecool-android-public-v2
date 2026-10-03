// « Mon temps libre » est bleu ciel, partout, et les deux definitions
// de sa couleur ne divergent pas.
//
// Charles, 04/10 : « Pour mon temps libre utilise plutot une couleur
// bleu ciel. A faire sur toutes les pages ou apparait les differentes
// categories ».
const fs = require('fs');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

const css = page.match(/--cat-personnel:\s*(#[0-9a-fA-F]{6});\s*--cat-personnel-bg:\s*(#[0-9a-fA-F]{6});/);   // le « texte » suit, il est verifie ailleurs
const js = page.match(/personnel:\s*\{\s*color:\s*'(#[0-9a-fA-F]{6})',\s*bg:\s*'(#[0-9a-fA-F]{6})'/);
const hex = (m, i) => (m ? m[i].toLowerCase() : null);

titre('Les deux endroits qui definissent la couleur');
verifie('la palette CSS la definit', !!css);
verifie('la table de l agenda la definit', !!js);
verifie('palette CSS : bleu ciel clair', hex(css, 1) === '#b3e5fc' && hex(css, 2) === '#e1f5fe', hex(css, 1) + ' / ' + hex(css, 2));
verifie('table de l agenda : bleu ciel clair', hex(js, 1) === '#b3e5fc' && hex(js, 2) === '#e1f5fe', hex(js, 1) + ' / ' + hex(js, 2));
verifie('les deux definitions sont identiques', hex(css, 1) === hex(js, 1) && hex(css, 2) === hex(js, 2),
  'sinon la legende et les blocs n auraient pas la meme couleur');

titre('Plus de turquoise pour cette categorie');
verifie('#00ACC1 n est plus la couleur de personnel', !/--cat-personnel:\s*#00acc1/i.test(page) && !/personnel:\s*\{\s*color:\s*'#00acc1'/i.test(page));

titre('Distincte des autres categories');
const autres = ['travail', 'sante', 'famille', 'amis', 'sport', 'voyages'].map((c) => {
  const m = page.match(new RegExp('--cat-' + c + ':\\s*(#[0-9a-fA-F]{6})'));
  return [c, m ? m[1].toLowerCase() : null];
});
verifie('les six autres categories ont leur couleur', autres.every(([, h]) => !!h));
verifie('aucune autre categorie n a la meme couleur', autres.every(([, h]) => h !== '#b3e5fc'));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.sqrt(rgb(a).reduce((t, v, i) => t + Math.pow(v - rgb(b)[i], 2), 0));
const travail = autres.find(([c]) => c === 'travail')[1];
verifie('assez eloignee du bleu Travail pour ne pas se confondre', travail && dist('#b3e5fc', travail) > 50,
  'distance ' + (travail ? Math.round(dist('#b3e5fc', travail)) : '?') + ' (Travail ' + travail + ')');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
