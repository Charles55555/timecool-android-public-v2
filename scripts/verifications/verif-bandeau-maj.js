// Verifie le bandeau « Nouvelle version disponible ».
//
// Ce bandeau est la seule chose qui previenne Charles qu'une version est
// sortie. Deux facons de le rater, opposees et aussi genantes l'une que
// l'autre : ne jamais apparaitre, ou reapparaitre sans fin apres qu'on
// l'a ferme. Les deux sont couvertes ici.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const DEBUT = "const TC_DEPLOIEMENT = ";
const FIN = "/** Compare deux versions";
const d = html.indexOf(DEBUT);
const f = html.indexOf(FIN);
if (d < 0 || f < 0 || f < d) { console.log('ERREUR: bloc du bandeau introuvable'); process.exit(1); }
const SOURCE = html.slice(d, f);

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

/* ── Un DOM minimal : juste ce que le bandeau touche ─────────────── */
function faireContexte(horodatageLocal, options) {
  options = options || {};
  const elements = {
    tcBandeauMaj: { hidden: true, dataset: {} },
    tcBandeauMajTexte: { textContent: '' },
    tcBandeauMajBouton: { textContent: '' },
  };
  const classes = new Set();
  const stockage = Object.assign({}, options.stockage || {});
  const journal = { fetch: [], lance: [], recharge: 0 };

  const ctx = {
    console,
    setInterval: function () { return 0; },
    document: {
      hidden: false,
      getElementById: (id) => elements[id] || null,
      addEventListener: function () {},
      body: {
        classList: {
          add: (c) => classes.add(c),
          remove: (c) => classes.delete(c),
        },
      },
    },
    localStorage: {
      getItem: (k) => (k in stockage ? stockage[k] : null),
      setItem: (k, v) => { stockage[k] = String(v); },
    },
    window: options.apk ? { TimeCoolNatif: { telechargerEtInstallerMaj: function () {} } } : {},
    fetch: async function (url) {
      journal.fetch.push(url);
      if (options.reponse === 'erreur') return { ok: false, status: 404 };
      if (options.reponse === 'reseau') throw new Error('hors ligne');
      return {
        ok: true,
        json: async () => {
          if (options.reponse === 'illisible') throw new Error('JSON invalide');
          return { deploiement: options.distante };
        },
      };
    },
    tcLancerMaj: (v) => journal.lance.push(v),
    tcMettreAJourMaintenant: () => { journal.recharge++; },
  };
  vm.createContext(ctx);
  vm.runInContext(SOURCE.replace('__TC_DEPLOIEMENT__', horodatageLocal), ctx);
  return { ctx, elements, classes, stockage, journal };
}

const visible = (e) => e.tcBandeauMaj.hidden === false;

(async function () {
  console.log('\n── Le bandeau apparait quand il faut ──');

  let t = faireContexte('1000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  verifie('horodatage different : bandeau affiche', visible(t.elements));
  verifie('bouton libelle « Recharger »',
    t.elements.tcBandeauMajBouton.textContent === 'Recharger',
    t.elements.tcBandeauMajBouton.textContent);
  verifie('le toast remonte au-dessus du bandeau', t.classes.has('maj-visible'));

  t = faireContexte('2000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  verifie('meme horodatage : rien ne s affiche', !visible(t.elements));
  verifie('le toast reste a sa place', !t.classes.has('maj-visible'));

  console.log('\n── La croix fait taire cette version, pas les suivantes ──');

  t = faireContexte('1000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  t.ctx.tcIgnorerMaj();
  verifie('apres la croix : bandeau masque', !visible(t.elements));
  verifie('la version fermee est retenue', t.stockage['tc_maj_ignoree'] === '2000',
    String(t.stockage['tc_maj_ignoree']));
  verifie('le toast redescend', !t.classes.has('maj-visible'));

  t = faireContexte('1000', { distante: '2000', stockage: { tc_maj_ignoree: '2000' } });
  await t.ctx.tcVerifierMajWeb();
  verifie('version deja fermee : ne revient pas', !visible(t.elements));

  t = faireContexte('1000', { distante: '3000', stockage: { tc_maj_ignoree: '2000' } });
  await t.ctx.tcVerifierMajWeb();
  verifie('version SUIVANTE : le bandeau revient', visible(t.elements));

  console.log('\n── Rien d intempestif ──');

  t = faireContexte('__TC_DEPLOIEMENT__', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  verifie('marqueur non remplace (depot, APK) : aucune requete',
    t.journal.fetch.length === 0 && !visible(t.elements));

  t = faireContexte('1000', { reponse: 'erreur' });
  await t.ctx.tcVerifierMajWeb();
  verifie('version.json absent : silence', !visible(t.elements));

  t = faireContexte('1000', { reponse: 'reseau' });
  await t.ctx.tcVerifierMajWeb();
  verifie('hors ligne : silence, sans exception', !visible(t.elements));

  t = faireContexte('1000', { reponse: 'illisible' });
  await t.ctx.tcVerifierMajWeb();
  verifie('reponse illisible : silence', !visible(t.elements));

  t = faireContexte('1000', { distante: '' });
  await t.ctx.tcVerifierMajWeb();
  verifie('horodatage distant vide : silence', !visible(t.elements));

  t = faireContexte('1000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  await t.ctx.tcVerifierMajWeb();
  await t.ctx.tcVerifierMajWeb();
  verifie('deja affiche : on n interroge plus le serveur',
    t.journal.fetch.length === 1, t.journal.fetch.length + ' requete(s)');

  t = faireContexte('1000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  verifie('la requete contourne le cache',
    /version\.json\?t=\d+/.test(t.journal.fetch[0]), t.journal.fetch[0]);

  console.log('\n── Le bouton fait la bonne chose ──');

  t = faireContexte('1000', { distante: '2000' });
  await t.ctx.tcVerifierMajWeb();
  t.ctx.tcActionBandeauMaj();
  verifie('sur le web : recharge la page',
    t.journal.recharge === 1 && t.journal.lance.length === 0);
  verifie('le bandeau disparait pendant l action', !visible(t.elements));

  t = faireContexte('1000', { apk: true });
  // `let` au premier niveau d'un vm ne cree pas une propriete du
  // contexte : y ecrire depuis l'exterieur ne toucherait pas la variable
  // que voit le code teste. Il faut ecrire DANS le contexte.
  vm.runInContext("_tcMajVersionApk = '2.1.0';", t.ctx);
  t.ctx.tcAfficherBandeauMaj('apk-2.1.0', 'Nouvelle version', 'Mettre à jour');
  t.ctx.tcActionBandeauMaj();
  verifie('dans l application : telecharge et installe',
    t.journal.lance.length === 1 && t.journal.lance[0] === '2.1.0'
    && t.journal.recharge === 0, JSON.stringify(t.journal.lance));

  t = faireContexte('1000', { apk: true, distante: '2000' });
  t.ctx.tcSurveillerMaj();
  verifie('dans l application : pas de verification web en double',
    t.journal.fetch.length === 0);

  console.log('\n── Ce que le fichier doit contenir ──');

  const nb = (html.match(/__TC_DEPLOIEMENT__/g) || []).length;
  verifie('le marqueur apparait une seule fois', nb === 1, nb + ' occurrence(s)');
  verifie('le bandeau est hors de toute page',
    /<div class="maj-bandeau" id="tcBandeauMaj" hidden>/.test(html));
  verifie('la croix appelle tcIgnorerMaj', /onclick="tcIgnorerMaj\(\)"/.test(html));
  verifie('le marqueur de fermeture ne voyage pas entre appareils',
    /'tc_maj_ignoree'\s*\/\/ TC_MAJ_IGNOREE_KEY/.test(html));
  verifie('la surveillance demarre au chargement',
    /tcSurveillerMaj\(\);\n\}\);/.test(html));
  verifie('l ancien encart bleu a disparu',
    !html.includes('Mettre à jour maintenant</button>'));
  verifie('le bandeau passe sous le toast',
    /\.maj-bandeau \{[^}]*z-index:10150/.test(html));

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
