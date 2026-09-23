// Verifie le bandeau contre le VRAI serveur, avec la page reellement
// deployee. Le test unitaire simule le reseau ; celui-ci verifie que le
// serveur repond bien ce que la page attend — content-type, forme du
// JSON, horodatage reellement inscrit dans la page.
const vm = require('vm');

const BASE = 'https://timecool.fr/app/';

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function contexte(source, elements, classes) {
  const ctx = {
    console,
    setInterval: () => 0,
    document: {
      hidden: false,
      getElementById: (id) => elements[id] || null,
      addEventListener: () => {},
      body: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {},
    // Le code demande « version.json?t=... », relatif a la page.
    fetch: (url, opt) => fetch(BASE + url, opt),
    tcLancerMaj: () => {},
    tcMettreAJourMaintenant: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return ctx;
}

(async function () {
  const html = await (await fetch(BASE + '?t=' + Date.now(), { cache: 'no-store' })).text();

  const d = html.indexOf('const TC_DEPLOIEMENT = ');
  const f = html.indexOf('/** Compare deux versions');
  verifie('le bloc du bandeau est bien dans la page deployee', d > 0 && f > d);
  if (d < 0 || f < d) { process.exit(1); }
  const source = html.slice(d, f);

  const horodatage = (source.match(/const TC_DEPLOIEMENT = '([^']*)'/) || [])[1];
  verifie('l horodatage est inscrit dans la page', /^[0-9]+$/.test(horodatage || ''), horodatage);

  const vjson = await (await fetch(BASE + 'version.json?t=' + Date.now())).json();
  verifie('version.json annonce le meme horodatage',
    String(vjson.deploiement) === horodatage, JSON.stringify(vjson));

  // Page a jour : aucun bandeau.
  let elements = { tcBandeauMaj: { hidden: true, dataset: {} },
                   tcBandeauMajTexte: {}, tcBandeauMajBouton: {} };
  let classes = new Set();
  let ctx = contexte(source, elements, classes);
  await ctx.tcVerifierMajWeb();
  verifie('page a jour : pas de bandeau', elements.tcBandeauMaj.hidden === true);

  // Meme page, mais en se faisant passer pour une copie plus ancienne :
  // c'est exactement le cas d'un navigateur qui ressert son cache.
  elements = { tcBandeauMaj: { hidden: true, dataset: {} },
               tcBandeauMajTexte: {}, tcBandeauMajBouton: {} };
  classes = new Set();
  ctx = contexte(source.replace("'" + horodatage + "'", "'1'"), elements, classes);
  await ctx.tcVerifierMajWeb();
  verifie('copie perimee : le bandeau apparait', elements.tcBandeauMaj.hidden === false);
  verifie('bouton « Recharger »', elements.tcBandeauMajBouton.textContent === 'Recharger',
    elements.tcBandeauMajBouton.textContent);

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
