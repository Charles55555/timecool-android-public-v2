// Vérifie qu'un appareil neuf, qui chiffre tous ses rendez-vous d'un
// coup, les relit tous : une seule clé doit naître, pas une par appel.
// Le 30/09/2026, 29 titres sur 30 ont disparu faute de cela.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf("const TC_DEVICE_KEY_STORAGE");
const fin = html.indexOf('async function saveEventsToStorage');
if (debut < 0 || fin < 0) { console.log('  KO blocs introuvables'); process.exit(1); }

async function essai(nom, source) {
  const stock = {};
  const ctx = {
    crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob, Uint8Array,
    JSON, String, Promise, console: { warn() {}, log() {} },
    localStorage: {
      getItem: (k) => (k in stock ? stock[k] : null),
      setItem: (k, v) => { stock[k] = String(v); },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source + '\n;globalThis.chiffrer = tcEncrypt; globalThis.dechiffrer = tcDecrypt;', ctx);

  // Même forme que saveEventsToStorage : tous les rendez-vous en parallèle.
  const titres = Array.from({ length: 30 }, (_, i) => 'Rendez-vous ' + i);
  const chiffres = await Promise.all(titres.map(async (t) => ({
    title: await ctx.chiffrer(t), date: await ctx.chiffrer('2026-10-01'),
  })));
  let perdus = 0;
  for (let i = 0; i < titres.length; i++) {
    if (await ctx.dechiffrer(chiffres[i].title) !== titres[i]) perdus++;
  }
  return perdus;
}

(async () => {
  let ko = 0;
  const perdus = await essai('actuel', html.slice(debut, fin));
  console.log((perdus === 0 ? '  OK ' : '  KO ') + 'appareil neuf, 30 titres chiffrés d\'un coup : ' + perdus + ' illisible(s)');
  if (perdus) ko++;
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
