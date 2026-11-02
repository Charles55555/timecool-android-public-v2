// Mission 71 : aucune clé ne sort vers le téléphone ; tous les services passent par le relais du serveur.
// Usage : node verif-relais.js <index.html> <index.php>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const D = __dirname;
const page = fs.readFileSync(process.argv[2] || path.join(D, '../../app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(D, '../../backend/api/index.php'), 'utf8');
const purge = fs.readFileSync(path.join(D, '../purger-comptes-test.sh'), 'utf8');
const migration = fs.readFileSync(path.join(D, '../../backend/sql/017_relais.sql'), 'utf8');
const nettoyage = fs.readFileSync(path.join(D, '../cles-heritees.php'), 'utf8');

let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d ? '  - ' + d : '')); } };

function fonction(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}
function routePhp(nom) {
  const i = api.indexOf("case '" + nom + "':");
  if (i < 0) return '';
  const j = api.indexOf("\n    case '", i + 10);
  return api.slice(i, j);
}

// ── La page ──────────────────────────────────────────────
['api.anthropic.com', 'api.openai.com', 'places.googleapis.com', 'routes.googleapis.com',
  'translation.googleapis.com', 'www.googleapis.com/customsearch', 'anthropic-dangerous-direct-browser-access',
  'x-api-key', 'X-Goog-Api-Key', 'X-Goog-FieldMask'].forEach((t) => {
  verifie('la page ne cite plus ' + t, page.indexOf(t) < 0);
});
['tcCleActiveCharly', 'tcCleGoogle', 'tcCseCx'].forEach((t) => verifie('plus de ' + t, page.indexOf(t) < 0));
verifie('aucune clé écrite dans la page', !/sk-ant-api03-[A-Za-z0-9_-]{16}|sk-proj-[A-Za-z0-9_-]{16}|AIza[0-9A-Za-z_-]{20}/.test(page));
['openai', 'anthropic', 'google/suggestions', 'google/lieux', 'google/itineraire', 'google/recherche', 'google/traduction'].forEach((f) => {
  verifie('la page appelle le relais ' + f, page.indexOf("tcRelais('" + f + "'") > -1);
  verifie('l API connaît la route ' + f, api.indexOf("case 'POST /relais/" + f + "':") > -1);
  verifie('et sa définition', api.indexOf("'" + f + "'") > -1);
});

// ── L'API ────────────────────────────────────────────────
verifie('plus de copie des clés à l inscription', api.indexOf('clesDuModele') < 0 && api.indexOf('CLES_COMPTE_MODELE') < 0);
const valeur = routePhp('GET /cles-api/valeur');
verifie('GET /cles-api/valeur existe', valeur.length > 100);
verifie('une clé héritée sort sans valeur', /Rep::ok\(\['service' => \$service, 'herite' => true\]\)/.test(valeur));
verifie('seule la ligne du compte est déchiffrée', (valeur.match(/Coffre::dechiffrer/g) || []).length === 1 && /Coffre::dechiffrer\(\$ligne\['valeur_chiffree'\]\)/.test(valeur));
verifie('le relais refuse un compte suspendu', /bloque_le[\s\S]{0,60}Rep::erreur\(403, 'compte_suspendu'/.test(api));
verifie('le relais refuse un compte clôturé', /cloture_le IS NOT NULL[\s\S]{0,260}Rep::erreur\(403, 'compte_cloture'/.test(api));
verifie('le dépassement répond 429', /Rep::erreur\(429, 'limite_atteinte'/.test(api));
verifie('le dépassement va au journal du serveur', /error_log\('relais : limite atteinte/.test(api));
verifie('jamais de clé dans le journal', !/error_log\([^;]*\$cle\b/.test(api) && !/error_log\([^;]*\$valeur/.test(api));
verifie('l adresse de secours vient de l environnement seul', /getenv\('TC_RELAIS_FAUX'\)/.test(api) && api.indexOf("Entree::corps()['url']") < 0);
verifie('le cumul se lit pour l administrateur', /case 'GET \/admin\/relais':[\s\S]{0,160}acces_refuse/.test(api));
verifie('les comptes de test ont une limite haute', /RELAIS_FACTEUR_TEST = 20/.test(api) && /exemple-timecool\.fr/.test(api));
const lim = /'charly'\s*=> \[(\d+), (\d+)\]/.exec(api);
verifie('la batterie Charly (690 phrases) passe dans la limite des comptes de test', lim && +lim[2] * 20 >= 690 && +lim[1] * 20 >= 60);
verifie('la limite d un compte normal reste humaine', lim && +lim[1] <= 60 && +lim[2] <= 1000);
verifie('une clé héritée renvoyée n est pas enregistrée', /hash_equals\(\$clairAdmin, \$valeur\)/.test(api));
verifie('la table est effacée avec le compte', /ON DELETE CASCADE/.test(migration));
verifie('la purge sauvegarde la nouvelle table', /relais_compteurs"/.test(purge));
verifie('la purge lit une dernière ligne sans retour', purge.indexOf('while read -r ligne || [ -n "$ligne" ]; do') > -1);
verifie('le nettoyage sauvegarde avant d effacer', nettoyage.indexOf('file_put_contents') > -1 && nettoyage.indexOf('file_put_contents') < nettoyage.indexOf('DELETE FROM'));
verifie('le nettoyage n affiche aucune clé', !/echo[^;]*(\$clair|valeur_chiffree)/.test(nettoyage));

["Ce service n'est pas disponible pour le moment.", "Beaucoup de demandes d'un coup. Réessaie dans une minute."].forEach((p) => {
  verifie('phrase avec son apostrophe : ' + p, api.indexOf(p) > -1);
});
['service n est', 'demandes d un coup'].forEach((p) => verifie('plus de phrase sans apostrophe : ' + p, api.indexOf(p) < 0));
verifie('GET /admin/relais : apostrophe', routePhp('GET /admin/relais').indexOf("à l'administrateur") > -1);

// Les modèles du serveur sont ceux que la page propose, ni plus ni moins.
const modeles = (id) => [...page.slice(page.indexOf('id="' + id + '"'), page.indexOf('</select>', page.indexOf('id="' + id + '"'))).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
const serveur = (nom) => (new RegExp("'" + nom + "'\\s*=> \\[([^\\]]+)\\]").exec(api.slice(api.indexOf('const RELAIS_MODELES'))) || [, ''])[1].match(/[a-z0-9.-]{5,}/g) || [];
verifie('Claude : la liste du serveur suit la page', modeles('aiClaudeModel').length === 3 && JSON.stringify(modeles('aiClaudeModel')) === JSON.stringify(serveur('anthropic')), serveur('anthropic').join());
verifie('OpenAI : la liste du serveur suit la page', modeles('aiModel').length === 3 && JSON.stringify(modeles('aiModel')) === JSON.stringify(serveur('openai')), serveur('openai').join());
verifie('le modèle par défaut de chaque service est permis', serveur('anthropic').includes('claude-sonnet-5') && serveur('openai').includes('gpt-4o-mini'));
verifie('le relais contrôle le modèle', /in_array\(\$d\['model'\] \?\? null, RELAIS_MODELES\[\$fonction\], true\)/.test(api));
verifie('plus aucune limite de 7 Mo', api.indexOf('7000000') < 0);
verifie('Charly : 200 Ko au plus', /'charly'\s*=> 200000/.test(api));

// ── tcRelais, dans la page ───────────────────────────────
async function essaisRelais() {
  let vu = null, rep = null, jeton = 'j'.repeat(64);
  const notes = [];
  const ctx = {
    console, JSON, Date, AbortController, setTimeout, clearTimeout, Error,
    TC_API: 'https://api.test', tcJeton: () => jeton,
    tcNoterRequete: (m, c, s) => notes.push([m, c, s]),
    fetch: async (url, o) => { vu = { url, o }; if (rep instanceof Error) throw rep; return rep; },
  };
  vm.createContext(ctx);
  vm.runInContext('const TC_DELAI_RELAIS_MS = 1000;\n' + fonction('tcRelais'), ctx);
  const reponse = (statut, d) => ({ ok: statut < 400, status: statut, clone() { return this; }, json: async () => d });

  rep = reponse(200, { reponse: 1 });
  const r = await ctx.tcRelais('anthropic', { a: 1 });
  verifie('le relais part vers notre serveur', vu.url === 'https://api.test/relais/anthropic', vu.url);
  verifie('avec la session', vu.o.headers.Authorization === 'Bearer ' + jeton);
  verifie('et sans clé', Object.keys(vu.o.headers).length === 2);
  verifie('le corps part tel quel', vu.o.body === '{"a":1}');
  verifie('la réponse revient telle quelle', r === rep);
  verifie('l appel est noté', notes.length === 1 && notes[0][2] === 200);

  rep = reponse(401, { error: { message: 'cle refusee' } });
  const r2 = await ctx.tcRelais('anthropic', {});
  verifie('une erreur du service revient telle quelle', r2 === rep);

  rep = reponse(429, { ok: false, erreur: 'limite_atteinte', message: 'Réessaie dans une minute.' });
  let e = null;
  try { await ctx.tcRelais('anthropic', {}); } catch (x) { e = x; }
  verifie('un refus du serveur donne sa phrase', e && e.message === 'Réessaie dans une minute.' && e.code === 'limite_atteinte');

  rep = new Error('Failed to fetch');
  e = null;
  try { await ctx.tcRelais('openai', {}); } catch (x) { e = x; }
  verifie('sans réseau : une phrase, pas le message du navigateur', e && e.message === 'Serveur injoignable');

  jeton = null;
  e = null; vu = null;
  try { await ctx.tcRelais('openai', {}); } catch (x) { e = x; }
  verifie('sans session : rien ne part', e && vu === null);
}

// ── Le tiroir : une clé héritée quitte l'appareil, la clé du compte reste ──
async function essaisTiroir() {
  const stock = { timecool_api_keys: JSON.stringify({ anthropic: 'cle-heritee', openai: 'cle-a-moi', gmaps: 'cle-heritee-2' }) };
  const toasts = [];
  const ctx = {
    console, JSON, Object,
    localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); } },
    charlyIA: { config: { apiKey: 'cle-a-moi', anthropicKey: 'cle-heritee' } },
    showToast: (t) => toasts.push(t),
    TC_BACKEND: {
      estConnecte: () => true,
      listerClesApi: async () => [{ service: 'anthropic', herite: true }, { service: 'gmaps', herite: true }, { service: 'openai' }, { service: 'twilio', herite: true }],
      lireCleApi: async () => { throw new Error('rien à lire'); },
    },
  };
  vm.createContext(ctx);
  ['tcLireTiroirCles', 'tcEcrireTiroirCles', 'tcRecupererClesDuServeur'].forEach((n) => vm.runInContext(fonction(n), ctx));
  await ctx.tcRecupererClesDuServeur();
  const t = JSON.parse(stock.timecool_api_keys);
  verifie('les clés héritées quittent l appareil', !t.anthropic && !t.gmaps, stock.timecool_api_keys);
  verifie('la clé du compte reste', t.openai === 'cle-a-moi');
  verifie('elles quittent aussi la mémoire', ctx.charlyIA.config.anthropicKey === '' && ctx.charlyIA.config.apiKey === 'cle-a-moi');
  verifie('sans bruit à l écran', toasts.length === 0);
}

// ── La traduction, par lots ──────────────────────────────
async function essaisLots() {
  const envois = [];
  let panne = false;
  const ctx = {
    console, JSON, Promise, setTimeout,
    tcRelais: async (f, c) => {
      envois.push({ f, c });
      if (panne) throw new Error('panne');
      return { json: async () => ({ data: { translations: c.q.map((t) => ({ translatedText: t + '-en' })) } }) };
    },
  };
  vm.createContext(ctx);
  vm.runInContext('var TC_TRADUCTION_LOT = 100;\nvar TC_TRADUCTION_CARACTERES = 20000;\nvar _tcFilesTraduction = {};\n' + fonction('tcTraduireParLot') + '\n' + fonction('tcEnvoyerLotTraduction'), ctx);
  const textes = Array.from({ length: 250 }, (_, i) => 't' + i);
  const res = await Promise.all(textes.map((t) => ctx.tcTraduireParLot(t, 'en')));
  verifie('250 textes partent en 3 requêtes', envois.length === 3, envois.length + ' requêtes');
  verifie('par le relais de traduction, en français vers la langue', envois[0].f === 'google/traduction' && envois[0].c.source === 'fr' && envois[0].c.target === 'en');
  verifie('jamais plus de 100 par lot', envois.every((e) => e.c.q.length <= 100));
  verifie('chaque texte retrouve sa traduction', res.every((r, i) => r === 't' + i + '-en'));
  envois.length = 0;
  const longs = Array.from({ length: 5 }, (_, i) => i + 'x'.repeat(9000));
  const resL = await Promise.all(longs.map((t) => ctx.tcTraduireParLot(t, 'es')));
  verifie('un lot ne dépasse pas 20 000 caractères', envois.length === 3 && envois.every((e) => e.c.q.join('').length <= 20000), envois.length + ' requêtes');
  verifie('les textes longs retrouvent leur traduction', resL.every((r, i) => r === longs[i] + '-en'));
  envois.length = 0;
  const enorme = 'y'.repeat(25000);
  const resE = await ctx.tcTraduireParLot(enorme, 'it');
  verifie('un texte seul plus long que la limite part quand même', envois.length === 1 && resE === enorme + '-en');
  panne = true;
  const r = await ctx.tcTraduireParLot('x', 'de');
  verifie('une panne rend null : le français reste affiché', r === null);
  panne = false;
  const r2 = await ctx.tcTraduireParLot('y', 'de');
  verifie('et la file repart ensuite', r2 === 'y-en');
}

(async () => {
  await essaisRelais();
  await essaisTiroir();
  await essaisLots();
  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})().catch((x) => { console.log('  KO ' + x.stack); process.exit(1); });
