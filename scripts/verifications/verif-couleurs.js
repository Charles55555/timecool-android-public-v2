// Execute reellement les blocs de definition des couleurs et verifie la
// coherence entre l'agenda, Mes disponibilites et les variables CSS.
// Le controle de syntaxe ne verrait pas une erreur d'ordre de definition.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const debut = html.indexOf('/* Code couleur officiel des categories.');
const fin = html.indexOf('function loadCategoryVisibility');
if (debut < 0 || fin < 0) { console.log('ERREUR: bloc introuvable'); process.exit(1); }

// Les declarations const/let ne deviennent pas des proprietes du contexte,
// contrairement a var : on les exporte explicitement.
const EXPORT = '\nglobalThis._x = { AGENDA_CATEGORIES, TC_AGENDA_ALIAS,'
  + ' TC_COULEURS_CATEGORIES, DISPO_CATEGORIES, tcCatNormalisee };';

const ctx = {};
vm.createContext(ctx);
try {
  vm.runInContext(html.slice(debut, fin) + EXPORT, ctx);
} catch (e) {
  console.log('ERREUR A L EXECUTION -> ' + e.message);
  process.exit(1);
}

const X = ctx._x;
let ko = 0;

console.log('Categories d agenda :');
X.AGENDA_CATEGORIES.forEach((c) => {
  const ref = X.TC_COULEURS_CATEGORIES[c.id];
  const ok = ref && c.color === ref.color && c.bg === ref.bg;
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${c.label.padEnd(20)} ${c.id.padEnd(10)} ${c.color}`);
});

console.log('\nMes disponibilites :');
X.DISPO_CATEGORIES.forEach((c) => {
  const ref = X.TC_COULEURS_CATEGORIES[c.id];
  const ok = ref && c.color === ref.color;
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${c.label.padEnd(28)} ${c.color}`);
});

console.log('\nMeme categorie, meme couleur dans les deux ecrans :');
X.DISPO_CATEGORIES.forEach((d) => {
  const a = X.AGENDA_CATEGORIES.find((x) => x.id === d.id);
  if (!a) { console.log(`  --  ${d.id} : absent de l agenda`); return; }
  const ok = a.color === d.color;
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${d.id.padEnd(10)} agenda=${a.color} dispo=${d.color}`);
});

console.log('\nMigration des anciens identifiants :');
Object.entries(X.TC_AGENDA_ALIAS).forEach(([vieux, neuf]) => {
  const res = X.tcCatNormalisee(vieux);
  const connu = !!X.TC_COULEURS_CATEGORIES[res];
  const ok = res === neuf && connu;
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${vieux.padEnd(8)} -> ${res}`);
});

console.log('\nConcordance avec les variables CSS :');
Object.entries(X.TC_COULEURS_CATEGORIES).forEach(([id, v]) => {
  const m = html.match(new RegExp('--cat-' + id + ':\\s*([#0-9A-Fa-f]+)'));
  const ok = m && m[1].toLowerCase() === v.color.toLowerCase();
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}--cat-${id} = ${m ? m[1] : 'ABSENTE'} / JS ${v.color}`);
});

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
