// Verifie les jours feries et fetes religieuses calcules, sur plusieurs
// annees. Une date religieuse fausse est pire qu'une date absente.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/* ── Jours feries : calcules');
const fin = html.indexOf('function renderHolidays');
if (debut < 0 || fin < 0) { console.log('ERREUR: bloc introuvable'); process.exit(1); }

const stock = {};
const ctx = {
  Intl, Date, parseInt, Math, JSON, Array, String, console,
  localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = v; } },
  renderHolidays: () => {},
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(html.slice(debut, fin)
  + '\nglobalThis._f = { feries: tcJoursFeries, paques: tcPaques, paquesO: tcPaquesOrthodoxe,'
  + ' iso: tcIsoDate, traditions: TC_TRADITIONS };', ctx);
const F = ctx._f;

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(30)} ${detail || ''}`);
};

console.log('Paques :');
[['2026', '2026-04-05'], ['2027', '2027-03-28'], ['2038', '2038-04-25']].forEach(([an, att]) => {
  const o = F.iso(F.paques(Number(an)));
  dire(o === att, 'gregorienne ' + an, o + (o === att ? '' : ' — attendu ' + att));
});
// Paques orthodoxe : references connues.
[['2026', '2026-04-12'], ['2027', '2027-05-02']].forEach(([an, att]) => {
  const o = F.iso(F.paquesO(Number(an)));
  dire(o === att, 'orthodoxe ' + an, o + (o === att ? '' : ' — attendu ' + att));
});

console.log('\nCouverture par tradition :');
[2026, 2027, 2030].forEach((an) => {
  const l = F.feries(an);
  const parType = {};
  l.forEach((h) => { parType[h.type] = (parType[h.type] || 0) + 1; });
  const resume = F.traditions.map((t) => t.label + ':' + (parType[t.type] || 0)).join(' ');
  const complet = F.traditions.every((t) => (parType[t.type] || 0) > 0);
  dire(complet, String(an), resume);
});

console.log('\nDates musulmanes 2026 (calendrier um al-qura) :');
const attenduMus = {
  'Début du Ramadan': '2026-02-18',
  'Aïd el-Fitr': '2026-03-20',
  'Aïd el-Adha': '2026-05-27',
  'Nouvel An musulman': '2026-06-16',
  'Achoura': '2026-06-25',
  'Mawlid': '2026-08-25',
};
const mus2026 = F.feries(2026).filter((h) => h.type === 'religieux-musulman');
Object.entries(attenduMus).forEach(([nom, att]) => {
  const t = mus2026.filter((h) => h.name === nom);
  dire(t.length === 1 && t[0].date === att, nom,
    t.length === 0 ? 'ABSENTE' : (t.length > 1 ? t.length + ' occurrences !' : t[0].date));
});

// Une meme fete peut legitimement tomber deux fois dans une annee
// gregorienne : l'annee musulmane est plus courte d'environ onze jours.
// Seule une entree identique en nom ET en date est un vrai doublon.
console.log('\nAucune entree en double, sur 6 annees :');
[2026, 2027, 2028, 2029, 2030, 2031].forEach((an) => {
  const l = F.feries(an);
  const cles = l.map((h) => h.name + '@' + h.date);
  const doubles = cles.filter((n, i) => cles.indexOf(n) !== i);
  const repetees = l.map((h) => h.name).filter((n, i, t) => t.indexOf(n) !== i);
  const note = repetees.length
    ? l.length + ' entrees (2 fois cette annee : ' + [...new Set(repetees)].join(', ') + ')'
    : l.length + ' entrees';
  dire(doubles.length === 0, String(an), doubles.length ? 'DOUBLON : ' + doubles[0] : note);
});

console.log('\nCoherence :');
const l = F.feries(2028);
dire(JSON.stringify(l.map((h) => h.date)) === JSON.stringify(l.map((h) => h.date).sort()), 'Liste triee');
dire(l.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date)), 'Format des dates');
dire(l.every((h) => F.traditions.some((t) => t.type === h.type)), 'Type connu pour chaque entree');
dire(l.every((h) => h.date.startsWith('2028')), 'Toutes dans l annee demandee');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
