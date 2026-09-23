// Verifie la comparaison de versions, qui decide si une mise a jour est
// proposee. Une erreur ici passerait inapercue jusqu'a une version ou
// l'app cesserait de se mettre a jour, ou en proposerait une en boucle.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/** Compare deux versions');
const fin = html.indexOf('async function checkForUpdates');
if (debut < 0 || fin < 0) { console.log('ERREUR: fonction introuvable'); process.exit(1); }

const ctx = {};
vm.createContext(ctx);
vm.runInContext(html.slice(debut, fin) + '\nglobalThis._f = tcVersionPlusRecente;', ctx);
const f = ctx._f;

const cas = [
  ['2.0.50', '2.0.51', true,  'increment mineur'],
  ['2.0.51', '2.0.51', false, 'version identique'],
  ['2.0.51', '2.0.50', false, 'version distante plus ancienne'],
  ['2.0.9',  '2.0.10', true,  'comparaison numerique, pas alphabetique'],
  ['2.0.51', 'v2.0.52', true, 'prefixe v tolere'],
  ['1.9.99', '2.0.0',  true,  'changement de majeure'],
  ['2.1.0',  '2.0.99', false, 'mineure superieure cote local'],
  ['2.0',    '2.0.1',  true,  'segments manquants'],
  ['',       '2.0.51', true,  'version locale inconnue'],
];

let ko = 0;
cas.forEach(([a, b, attendu, libelle]) => {
  const obtenu = f(a, b);
  const ok = obtenu === attendu;
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(38)} ${a || '(vide)'} -> ${b} = ${obtenu}`);
});

console.log(`\n${ko} anomalie(s) sur ${cas.length} cas.`);
process.exit(ko ? 1 : 0);
