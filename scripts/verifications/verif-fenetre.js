// La fenetre de 12 mois doit garantir qu'une tradition abonnee affiche
// toujours au moins une date a venir, quel que soit le jour de l'annee.
// C'est ce qui manquait : au 3 septembre, les fetes musulmanes de 2026
// etaient toutes passees et celles de 2027 hors champ.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/* ── Jours feries : calcules');
const fin = html.indexOf('function renderHolidays');
const ctx = { Intl, Date, parseInt, Math, JSON, Array, String, console,
  localStorage: { getItem: () => null, setItem: () => {} }, renderHolidays: () => {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(html.slice(debut, fin)
  + '\nglobalThis._x = { feries: tcJoursFeries, trads: TC_TRADITIONS };', ctx);
const X = ctx._x;

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(46)} ${detail || ''}`);
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Reproduit exactement le decoupage de renderHolidays.
function fenetre(today) {
  const an = today.getFullYear();
  const todayStr = iso(today);
  const horizonStr = iso(new Date(an + 1, today.getMonth(), today.getDate()));
  const toutes = X.feries(an).concat(X.feries(an + 1));
  return toutes.filter(h => h.date >= todayStr && h.date < horizonStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

console.log('Le 3 septembre 2026 — le cas signale :');
const auj = fenetre(new Date(2026, 8, 3));
X.trads.forEach((t) => {
  const l = auj.filter(h => h.type === t.type);
  dire(l.length > 0, t.label, l.length ? l[0].date + ' ' + l[0].name : 'AUCUNE date a venir');
});

console.log('\nChaque 1er du mois, sur trois ans, aucune tradition ne se vide :');
for (let an = 2026; an <= 2028; an++) {
  for (let m = 0; m < 12; m++) {
    const f = fenetre(new Date(an, m, 1));
    const manquantes = X.trads.filter(t => !f.some(h => h.type === t.type));
    if (manquantes.length) dire(false, `${an}-${m+1}`, 'vide : ' + manquantes.map(t => t.label).join(', '));
  }
}
dire(true, '36 mois testes', ko === 0 ? 'aucun trou' : 'voir ci-dessus');

console.log('\nLa fenetre reste bornee et ordonnee :');
const j = 24*3600*1000;
dire(auj.every(h => (new Date(h.date) - new Date(2026, 8, 3)) / j <= 366), 'rien au-dela de 12 mois');
dire(auj.every((h, i) => i === 0 || auj[i-1].date <= h.date), 'dates croissantes');
dire(auj.length >= 20, 'volume raisonnable', auj.length + ' dates');

console.log('\nLibelle :');
const heb = X.trads.find(t => t.type === 'religieux-juif');
dire(heb.label === 'Hébraïque' && heb.court === 'Hébraïque', 'Juif renomme en Hebraique', heb.label);

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
