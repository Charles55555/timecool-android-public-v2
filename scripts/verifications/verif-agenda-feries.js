// Verifie l'abonnement des fetes a l'agenda : ce qui s'affiche, ce qui
// reste masque, et surtout que rien n'est enregistre dans les donnees
// de l'utilisateur.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/* ── Jours feries : calcules');
const fin = html.indexOf('function renderHolidays');

const stock = {};
const ctx = {
  Intl, Date, parseInt, Math, JSON, Array, String, console,
  localStorage: {
    getItem: (k) => (k in stock ? stock[k] : null),
    setItem: (k, v) => { stock[k] = String(v); },
  },
  showToast: () => {},
  renderHolidays: () => {},
  render: () => {},
  currentPage: 'holidays',
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(html.slice(debut, fin)
  + '\nglobalThis._a = { duJour: tcFetesDuJour, basculer: tcBasculerFeteAgenda,'
  + ' dans: tcFeteDansAgenda, feries: tcJoursFeries, traditions: TC_TRADITIONS };', ctx);
const A = ctx._a;

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(40)} ${detail || ''}`);
};

console.log('Aucun abonnement au depart :');
dire(A.duJour('2026-12-25').length === 0, 'Noel invisible dans l agenda', '0 fete');
dire(A.traditions.every((t) => !A.dans(t.type)), 'Aucune tradition abonnee');

console.log('\nApres abonnement aux feries :');
A.basculer('férié');
dire(A.dans('férié'), 'Feries abonnes');
const noel = A.duJour('2026-12-25');
dire(noel.length === 1 && noel[0].name === 'Noël', 'Noel apparait', noel.map((h) => h.name).join(', '));
dire(A.duJour('2026-09-21').length === 0, 'Yom Kippour reste masque', 'tradition non abonnee');
dire(A.duJour('2026-07-15').length === 0, 'Jour sans fete reste vide');

console.log('\nApres abonnement aux fetes juives :');
A.basculer('religieux-juif');
const yk = A.duJour('2026-09-21');
dire(yk.length === 1 && yk[0].name === 'Yom Kippour', 'Yom Kippour apparait', yk.map((h) => h.name).join(', '));
dire(A.duJour('2026-12-25').length === 1, 'Noel toujours la');

console.log('\nDesabonnement :');
A.basculer('férié');
dire(!A.dans('férié'), 'Feries retires');
dire(A.duJour('2026-12-25').length === 0, 'Noel disparait');
dire(A.duJour('2026-09-21').length === 1, 'Fetes juives conservees');

console.log('\nRien n est enregistre dans les donnees de l utilisateur :');
const cles = Object.keys(stock);
dire(cles.length === 1 && cles[0] === 'tc_fetes_dans_agenda',
  'Une seule cle ecrite', cles.join(', '));
dire(!cles.includes('tc_user_events'), 'Les evenements ne sont pas touches');

console.log('\nAnnee suivante, sans rien refaire :');
const noel2030 = A.duJour('2030-12-25');
A.basculer('férié');
dire(A.duJour('2030-12-25').length === 1, 'Noel 2030 apparait aussi',
  'les dates sont calculees, pas copiees');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
