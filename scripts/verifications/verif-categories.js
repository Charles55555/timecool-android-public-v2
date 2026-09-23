// Extrait les blocs TC_COULEURS_CATEGORIES / DISPO_CATEGORIES du HTML,
// les évalue, et vérifie ordre, libellés et couleurs attendus.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('var TC_COULEURS_CATEGORIES');
const fin = html.indexOf('var JOURS_LABELS');
if (debut < 0 || fin < 0) { console.log('ERREUR: blocs introuvables'); process.exit(1); }

const ctx = {};
vm.createContext(ctx);
vm.runInContext(html.slice(debut, fin), ctx);

const attendu = [
  ['travail',   'Pour mon travail',          '#3B7DEA'],
  ['sante',     'Pour ma santé',             '#EA4335'],
  ['famille',   'Pour ma famille',           '#F9AB00'],
  ['amis',      'Pour mes amis et loisirs',  '#9334EA'],
  ['sport',     'Pour mon sport',            '#34A853'],
  ['personnel', 'Pour mon temps à moi',      '#00ACC1'],
];

const cats = ctx.DISPO_CATEGORIES;
let ko = 0;
console.log(`Nombre de categories : ${cats.length} (6 attendues)`);
if (cats.length !== 6) ko++;

attendu.forEach((a, i) => {
  const c = cats[i] || {};
  const okId = c.id === a[0], okLab = c.label === a[1], okCol = c.color === a[2];
  const okBg = typeof c.bg === 'string' && c.bg.startsWith('#');
  const statut = (okId && okLab && okCol && okBg) ? 'OK ' : 'KO ';
  if (statut === 'KO ') ko++;
  console.log(`  ${statut}${i + 1}. ${c.icon || '?'} ${c.label} — ${c.color} / ${c.bg}`);
  if (!okId)  console.log(`       id attendu ${a[0]}, obtenu ${c.id}`);
  if (!okLab) console.log(`       libelle attendu "${a[1]}"`);
  if (!okCol) console.log(`       couleur attendue ${a[2]}`);
});

// Cohérence avec les variables CSS déclarées dans :root
console.log('\nCoherence JS <-> CSS :');
Object.keys(ctx.TC_COULEURS_CATEGORIES).forEach((id) => {
  const c = ctx.TC_COULEURS_CATEGORIES[id].color;
  const m = html.match(new RegExp('--cat-' + id + ':\\s*([#0-9A-Fa-f]+)'));
  const cssVal = m ? m[1] : null;
  const ok = cssVal && cssVal.toLowerCase() === c.toLowerCase();
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}--cat-${id} = ${cssVal} / JS ${c}`);
});

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
