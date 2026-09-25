// Peut-on partir vers un rendez-vous depuis sa fiche ?
//
// Trois silences seraient possibles : une adresse contenant une
// apostrophe qui casserait le bouton, une position refusee qui
// laisserait « Calcul en cours… » pour toujours, et une ouverture
// bloquee sans un mot dans l'application Android.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  const asy = page.indexOf('async function ' + nom + '(');
  const debut = asy > -1 ? asy : page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

titre('Le bouton « Y aller »');
{
  let ouverte = null;
  const ctx = {
    console, encodeURIComponent,
    tcOuvrirAilleurs: (u) => { ouverte = u; }
  };
  vm.createContext(ctx);
  const src = extraire('tcYAller');
  if (!src) { ko++; console.log('  KO  tcYAller introuvable'); }
  else {
    vm.runInContext(src, ctx);
    ctx.tcYAller('88 boulevard Victor Hugo, 92200 Neuilly-sur-Seine');
    verifie('il ouvre Google Maps sur l itineraire',
      ouverte && ouverte.indexOf('google.com/maps/dir/?api=1&destination=') > -1);
    verifie('l adresse est encodee',
      ouverte && ouverte.indexOf('88%20boulevard') > -1, (ouverte || '').slice(-60));

    ouverte = null;
    ctx.tcYAller('   ');
    verifie('une adresse vide n ouvre rien', ouverte === null);
    ouverte = null;
    ctx.tcYAller(null);
    verifie('une adresse absente non plus', ouverte === null);

    ouverte = null;
    ctx.tcYAller("12 rue de l'Église, Paris");
    verifie('une apostrophe ne casse rien',
      ouverte && ouverte.indexOf('%C3%89glise') > -1, (ouverte || '').slice(-50));
  }
}

titre('L ouverture passe par le bon chemin');
{
  const src = extraire('tcYAller');
  verifie('tcOuvrirAilleurs est utilise',
    src && src.indexOf('tcOuvrirAilleurs(url)') > -1,
    'un window.open ordinaire est bloque sans un mot dans l application');
  verifie('avec un repli si elle manque',
    src && src.indexOf("window.open(url, '_blank')") > -1);
}

titre('Le temps de trajet');
{
  const src = extraire('tcTempsDeTrajet');
  verifie('il reutilise l estimation existante',
    src && src.indexOf('tcEstimerTrajet(lieu)') > -1,
    'celle du bouton « Calculer trajet » de Charly');
  verifie('une position refusee est annoncee',
    src && src.indexOf('Position indisponible') > -1,
    'sinon « Calcul en cours… » resterait pour toujours');
  verifie('une adresse introuvable aussi',
    // Les accents sont ecrits en sequences d'echappement dans la
    // page : on cherche sur la partie sans accent.
    src && src.indexOf('Aucun itin') > -1);
  verifie('une erreur est montree, pas avalee',
    src && /catch \(err\)[\s\S]{0,200}tcMessageErreurTrajet\(err\)/.test(src));
  verifie('elle passe par la traduction en francais',
    src && src.indexOf('tcMessageErreurTrajet(err).split') > -1,
    '« Failed to fetch » ne dit rien a personne');
  verifie('et le detail de Google s affiche en dessous',
    src && /parts\[1\][\s\S]{0,200}escapeHTMLSafe\(parts\[1\]\)/.test(src),
    'ma phrase n est qu une hypothese : c est le detail qui tranche');
}

titre('L appel part vers une API qui accepte les navigateurs');
{
  let demande = null;
  let reponse = { ok: true, json: async () => ({
    routes: [{ duration: '1800s', staticDuration: '1500s', distanceMeters: 12400 }]
  }) };
  const ctx = {
    console, Math, JSON, String, parseFloat, RegExp,
    tcCleGoogle: () => 'CLE-TEST',
    tcObtenirPosition: async () => ({ lat: 48.88, lng: 2.27 }),
    fetch: async (url, init) => { demande = { url, init }; return reponse; }
  };
  vm.createContext(ctx);
  vm.runInContext(extraire('tcEstimerTrajet'), ctx);

  return ctx.tcEstimerTrajet('88 boulevard Victor Hugo, Neuilly').then((r) => {
    verifie('c est l API Routes qui est appelee',
      demande && demande.url.indexOf('routes.googleapis.com') > -1,
      demande ? demande.url : 'aucun appel');
    verifie('et plus l ancienne, que le navigateur bloque',
      page.indexOf('maps/api/directions/json') === -1,
      'Directions ne renvoie aucun en-tete CORS : l appel echouait toujours');
    verifie('la cle voyage dans l en-tete, pas dans l adresse',
      demande.init.headers['X-Goog-Api-Key'] === 'CLE-TEST'
      && demande.url.indexOf('CLE-TEST') === -1,
      'une cle dans l URL se retrouve dans les journaux de tout le monde');
    verifie('le masque de champs est fourni',
      !!demande.init.headers['X-Goog-FieldMask'],
      'sans lui Google refuse la requete');

    const corps = JSON.parse(demande.init.body);
    verifie('la position part en coordonnees',
      corps.origin.location.latLng.latitude === 48.88);
    verifie('la destination part en adresse',
      corps.destination.address.indexOf('Victor Hugo') > -1);
    verifie('le trafic est pris en compte',
      corps.routingPreference === 'TRAFFIC_AWARE',
      'sinon l estimation ignore les bouchons');

    verifie('la duree est lue malgre le « s » final',
      r.basseMin === 25 && r.hauteMin === 33,
      r.basseMin + ' a ' + r.hauteMin + ' min — 1500s et 1800s+10%');
    verifie('et la distance convertie en km', r.distanceKm === 12.4, String(r.distanceKm));

    // Aucune route : Google repond 200 avec une liste vide.
    reponse = { ok: true, json: async () => ({}) };
    return ctx.tcEstimerTrajet('Nulle part');
  }).then((r) => {
    verifie('une adresse sans itineraire est reconnue', r && r.aucunItineraire === true,
      'plutot qu une erreur rouge incomprehensible');

    reponse = { ok: false, status: 403, json: async () => ({ error: { message: 'API key not authorized' } }) };
    return ctx.tcEstimerTrajet('Ailleurs').then(() => null, (e) => e);
  }).then((err) => {
    verifie('un refus de Google remonte avec sa raison',
      err && err.message.indexOf('not authorized') > -1, err ? err.message : 'aucune erreur');
    suite();
  });
}

function suite() {
titre('Ce que lit l utilisateur quand ca echoue');
{
  const ctx = { console, RegExp, String };
  vm.createContext(ctx);
  vm.runInContext(extraire('tcMessageErreurTrajet'), ctx);
  const m = ctx.tcMessageErreurTrajet;

  const reseau = m(new Error('Failed to fetch'));
  verifie('« Failed to fetch » devient une phrase',
    reseau.split('\n')[0].indexOf('Failed') === -1
    && reseau.indexOf('connexion') > -1, reseau.split('\n')[0]);
  verifie('et le message d origine suit, en dessous',
    reseau.split('\n')[1] === 'Failed to fetch',
    'sans lui, une erreur mal classee envoie corriger le mauvais reglage');
  verifie('un quota atteint se dit',
    m(new Error('RESOURCE_EXHAUSTED')).indexOf('quota') > -1);
  verifie('une cle refusee se dit sans affirmer la cause',
    m(new Error('Google Routes : API key not authorized')).indexOf('refuse cette cl') > -1,
    'affirmer « tes restrictions » envoyait corriger un reglage qui allait bien');
  verifie('une facturation absente est reconnue',
    m(new Error('billing account not configured')).indexOf('facturation') > -1);
  verifie('une API non activee est nommee',
    m(new Error('Routes API has not been used in project 42 before or it is disabled'))
      .indexOf('Routes') > -1,
    'un projet qui avait Directions n a pas Routes pour autant');
  verifie('une cle absente garde son message, deja clair',
    m(new Error('Clé Google Maps Platform manquante — configure-la dans Configuration IA.'))
      .indexOf('manquante') > -1);
  verifie('une panne inconnue laisse de quoi diagnostiquer',
    m(new Error('Boum')).indexOf('Boum') > -1,
    'une capture d ecran doit suffire, sans ouvrir la console du navigateur');
  verifie('mais le detail reste court',
    m(new Error('x'.repeat(400))).length < 200,
    String(m(new Error('x'.repeat(400))).length) + ' caracteres');
  verifie('et une erreur sans message non plus',
    m(null).length > 0 && m({}).length > 0);
}

titre('Les boutons n apparaissent qu avec une adresse');
verifie('ils vivent dans la branche du lieu',
  /\$\{e\.lieu \? `[\s\S]{0,900}tcYAller\(/.test(page),
  'un bouton mort sur les autres rendez-vous n apprendrait rien');
// JSON.stringify seul ne suffisait pas : ses guillemets doubles
// refermaient l'attribut. Ils doivent devenir &quot;.
verifie('les guillemets de l adresse sont neutralises',
  page.indexOf('JSON.stringify(e.lieu).replace(/"/g, &quot;)') === -1
  && page.split('replace(/\"/g').length - 1 >= 2,
  'sans cela le bouton s affiche et ne fait rien');
verifie('la zone de reponse existe', page.indexOf('id="emTrajet"') > -1);

titre('Rien n est demande sans raison');
{
  const src = extraire('tcYAller');
  verifie('« Y aller » ne demande aucune position',
    src && src.indexOf('tcObtenirPosition') === -1,
    'c est Maps qui la reclame, sur son ecran');
}
verifie('le calcul ne part que sur clic',
  page.indexOf('onclick="tcTempsDeTrajet(') > -1
  && !/openEventModal[\s\S]{0,2000}await tcTempsDeTrajet/.test(page),
  'chaque calcul coute et reclame la position');

titre('L attribut produit se relit comme un navigateur le ferait');
{
  // La page ecrit : onclick="tcYAller(${JSON.stringify(e.lieu)...})"
  // On rejoue cette construction, puis on relit l'attribut.
  const fabriquer = (lieu) =>
    'onclick="tcYAller(' + JSON.stringify(lieu).replace(/"/g, '&quot;') + ')"';

  const decoder = (t) => t.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  [
    '88 boulevard Victor Hugo, 92200 Neuilly-sur-Seine',
    "12 rue de l'Eglise, Paris",
    'Cabinet "Le Bon Soin", Lyon',
    'Rue des Fleurs & Jardins'
  ].forEach(function (adresse) {
    const attribut = fabriquer(adresse);
    // Un attribut valide n'a que deux guillemets : ceux qui le bornent.
    const guillemets = (attribut.match(/"/g) || []).length;
    verifie('« ' + adresse.slice(0, 26) + '… » tient dans l attribut',
      guillemets === 2, guillemets + ' guillemets - il doit y en avoir 2');

    // Ce que le navigateur passera a JavaScript, une fois decode.
    const code = decoder(attribut.slice('onclick="'.length, -1));
    let recu = null;
    try {
      new Function('tcYAller', code)(function (v) { recu = v; });
    } catch (e) { recu = 'ERREUR : ' + e.message; }
    verifie('et l adresse arrive entiere', recu === adresse, String(recu));
  });
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
}
