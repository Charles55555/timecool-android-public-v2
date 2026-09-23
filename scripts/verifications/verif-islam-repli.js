// Verifie le calcul autonome des fetes musulmanes, celui qui sert quand
// le navigateur ne connait pas le calendrier um al-qura. C'est le cas de
// certains WebView Android : sans ce repli, la section disparait.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/* ── Jours feries : calcules');
const fin = html.indexOf('function renderHolidays');

// Intl ampute de ses calendriers non gregoriens, pour forcer le repli.
const IntlSansCalendriers = {
  DateTimeFormat: function (locale, opts) {
    const vrai = new Intl.DateTimeFormat('en', opts);
    return {
      resolvedOptions: () => ({ calendar: 'gregory' }),
      formatToParts: (d) => vrai.formatToParts(d),
      format: (d) => vrai.format(d),
    };
  },
};

function charger(intl) {
  const ctx = { Intl: intl, Date, parseInt, Math, JSON, Array, String, console,
    localStorage: { getItem: () => null, setItem: () => {} }, renderHolidays: () => {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(html.slice(debut, fin) + '\nglobalThis._f = { mus: tcFetesMusulmanes, toutes: tcJoursFeries };', ctx);
  return ctx._f;
}

const avec = charger(Intl);
const sans = charger(IntlSansCalendriers);

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(34)} ${detail || ''}`);
};

console.log('Avec le calendrier um al-qura (reference) :');
const ref2026 = avec.mus(2026);
dire(ref2026.length === 6, '2026', ref2026.map((h) => h.name + ' ' + h.date.slice(5)).join(', '));

console.log('\nSans calendrier musulman dans le navigateur :');
[2026, 2027, 2030, 2031, 2035].forEach((an) => {
  const l = sans.mus(an);
  dire(l.length >= 6, String(an), l.length + ' fetes');
});

console.log('\nEcart entre les deux methodes (doit rester <= 1 jour) :');
const jour = 24 * 3600 * 1000;
ref2026.forEach((r) => {
  const c = sans.mus(2026).find((x) => x.name === r.name);
  if (!c) { dire(false, r.name, 'absente du repli'); return; }
  const ecart = Math.abs(new Date(r.date) - new Date(c.date)) / jour;
  dire(ecart <= 1, r.name, r.date + ' vs ' + c.date + ' — ' + ecart + ' j');
});

// Le simulateur retire TOUS les calendriers non gregoriens : les fetes
// juives et bouddhistes disparaissent donc aussi, ce qui est attendu.
// Ce qui compte ici : les musulmanes restent, ainsi que tout ce qui ne
// depend pas d'Intl (feries francais, chretiennes, orthodoxes).
console.log('\nLa page reste utilisable sans calendriers Intl :');
[2026, 2030].forEach((an) => {
  const l = sans.toutes(an);
  const types = new Set(l.map((h) => h.type));
  dire(types.has('religieux-musulman') && types.has('férié')
    && types.has('religieux-chretien') && l.length >= 24, String(an),
    l.length + ' entrees, ' + types.size + ' traditions conservees');
});

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
