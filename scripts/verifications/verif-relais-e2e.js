// Mission 71, contre l'API réelle. En local (api-locale.sh), un faux service joue Anthropic, OpenAI et Google :
// le relais est suivi de bout en bout, sans dépenser un appel. En production : la clé héritée ne sort plus,
// et un compte neuf, sans aucune clé, obtient une vraie traduction et une vraie recherche.
require('./comptes-jetables');
const http = require('http');
const cp = require('child_process');
const API = process.env.TC_API || 'https://api.timecool.fr';
const LOCAL = /^http:\/\/127\.0\.0\.1/.test(API);

let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + ' ' + (d || '')); } };

async function appel(methode, chemin, corps, jeton, brut) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: brut !== undefined ? brut : (corps === undefined ? undefined : JSON.stringify(corps)),
  });
  const texte = await r.text();
  let d = null;
  try { d = JSON.parse(texte); } catch (e) {}
  return { code: r.status, d, texte, type: r.headers.get('content-type') || '' };
}
const sql = (q) => cp.execFileSync('mysql', ['--no-defaults', '-u', 'claudecode', '-N', '-B', 'timecool_prod', '-e', q], { encoding: 'utf8' }).trim();

function fauxService() {
  const recues = [];
  let reponse = { code: 200, corps: '{"salut":1}' };
  const serveur = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      recues.push({ url: req.url, h: req.headers, corps: b, methode: req.method });
      res.writeHead(reponse.code, { 'Content-Type': 'application/json' });
      res.end(reponse.corps);
    });
  });
  return { serveur, recues, repondre: (r) => { reponse = r; }, derniere: () => recues[recues.length - 1] };
}

async function enLocal(jeton, id) {
  const f = fauxService();
  await new Promise((ok2) => f.serveur.listen(8097, '127.0.0.1', ok2));
  const cher = { model: 'claude-sonnet-5', max_tokens: 100, messages: [{ role: 'user', content: 'é"\\' }], system: [{ type: 'text', text: 'x', cache_control: { type: 'ephemeral' } }], vide: {} };
  const brut = JSON.stringify(cher);

  await appel('POST', '/cles-api', { service: 'anthropic', valeur: 'cle-propre-une' }, jeton);
  let r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('la réponse revient telle quelle', r.code === 200 && r.texte === '{"salut":1}', r.code + ' ' + r.texte);
  verifie('vers le bon service', f.derniere().url === '/api.anthropic.com/v1/messages', f.derniere().url);
  verifie('avec la clé du compte', f.derniere().h['x-api-key'] === 'cle-propre-une');
  verifie('et la version d Anthropic', f.derniere().h['anthropic-version'] === '2023-06-01');
  verifie('le corps arrive au caractère près', f.derniere().corps === brut);
  verifie('notre jeton de session ne part pas au service', !f.derniere().h.authorization);

  await appel('POST', '/cles-api', { service: 'anthropic', valeur: 'cle-propre-deux' }, jeton);
  await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('une clé changée est prise au coup d après', f.derniere().h['x-api-key'] === 'cle-propre-deux');

  f.repondre({ code: 401, corps: '{"error":{"message":"non"}}' });
  r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('le code du service revient aussi', r.code === 401 && r.d.error.message === 'non', r.code);
  f.repondre({ code: 200, corps: '{"salut":1}' });

  await appel('POST', '/cles-api', { service: 'openai', valeur: 'cle-oa' }, jeton);
  await appel('POST', '/relais/openai', { model: 'gpt-4o-mini', max_tokens: 5, messages: [] }, jeton);
  verifie('OpenAI : la clé en Bearer', f.derniere().h.authorization === 'Bearer cle-oa' && f.derniere().url === '/api.openai.com/v1/chat/completions');

  await appel('POST', '/cles-api', { service: 'gmaps', valeur: 'cle-g' }, jeton);
  await appel('POST', '/relais/google/itineraire', { origin: {} }, jeton);
  verifie('Routes : clé et masque', f.derniere().h['x-goog-api-key'] === 'cle-g' && f.derniere().h['x-goog-fieldmask'] === 'routes.duration,routes.staticDuration,routes.distanceMeters');
  await appel('POST', '/relais/google/lieux', { textQuery: 'x' }, jeton);
  verifie('Places : masque', /places\.displayName/.test(f.derniere().h['x-goog-fieldmask'] || ''));
  await appel('POST', '/relais/google/suggestions', { input: 'x' }, jeton);
  verifie('Suggestions : la bonne adresse', f.derniere().url === '/places.googleapis.com/v1/places:autocomplete');
  await appel('POST', '/relais/google/recherche', { q: 'dentiste é' }, jeton);
  verifie('Recherche : en GET, la clé hors de l adresse', f.derniere().methode === 'GET' && f.derniere().url.indexOf('cle-g') < 0 && f.derniere().h['x-goog-api-key'] === 'cle-g');
  verifie('Recherche : la question et le moteur par défaut', /q=dentiste/.test(f.derniere().url) && /cx=b5384d87b75fc4d3e/.test(f.derniere().url), f.derniere().url);

  const dejaRecues = f.recues.length;
  r = await appel('POST', '/relais/anthropic', { model: 'claude-mythos', max_tokens: 5, messages: [] }, jeton);
  verifie('modèle hors liste : 400', r.code === 400 && r.d.erreur === 'modele_refuse', r.code + ' ' + r.texte);
  r = await appel('POST', '/relais/openai', { model: 'claude-sonnet-5', max_tokens: 5, messages: [] }, jeton);
  verifie('modèle de l autre service : 400', r.code === 400 && r.d.erreur === 'modele_refuse', r.code);
  r = await appel('POST', '/relais/anthropic', { max_tokens: 5, messages: [] }, jeton);
  verifie('sans modèle : 400', r.code === 400 && r.d.erreur === 'modele_refuse', r.code);
  r = await appel('POST', '/relais/anthropic', { model: 'claude-sonnet-5', max_tokens: 5, messages: [{ role: 'user', content: 'x'.repeat(200001) }] }, jeton);
  verifie('demande trop longue : 413 et une phrase', r.code === 413 && r.d.erreur === 'requete_trop_longue', r.code);
  r = await appel('POST', '/relais/google/itineraire', { origin: 'x'.repeat(8001) }, jeton);
  verifie('itinéraire trop long : 413', r.code === 413, r.code);
  verifie('rien de tout cela ne part au service', f.recues.length === dejaRecues);
  r = await appel('POST', '/relais/anthropic', { model: 'claude-haiku-4-5', max_tokens: 5, messages: [{ role: 'user', content: 'x'.repeat(150000) }] }, jeton);
  verifie('une longue conversation passe', r.code === 200, r.code);

  r = await appel('POST', '/relais/tester', { service: 'anthropic', valeur: 'cle-essai' }, jeton);
  verifie('Tester : la clé saisie part au service', r.code === 200 && r.d.statut === 200 && f.derniere().h['x-api-key'] === 'cle-essai');
  r = await appel('POST', '/cles-api/supprimer', { service: 'anthropic' }, jeton);
  const liste = await appel('GET', '/cles-api', undefined, jeton);
  verifie('Tester n enregistre rien', !JSON.stringify(liste.d).includes('essai'));

  // Limite par minute : le compteur est posé juste sous la limite des comptes de test (30 × 20).
  await appel('POST', '/cles-api', { service: 'anthropic', valeur: 'cle-propre-une' }, jeton);
  await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  sql(`UPDATE relais_compteurs SET n_minute = 599 WHERE compte_id = ${id} AND service = 'anthropic'`);
  r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('juste à la limite : ça passe', r.code === 200, r.code);
  const avant = f.recues.length;
  r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('au-delà : 429 avec une phrase', r.code === 429 && r.d.erreur === 'limite_atteinte' && /minute/.test(r.d.message), r.code + ' ' + r.texte);
  verifie('et rien ne part au service', f.recues.length === avant);
  verifie('le refus est cumulé', sql(`SELECT refus FROM relais_compteurs WHERE compte_id = ${id} AND service = 'anthropic'`) === '1');
  sql(`UPDATE relais_compteurs SET minute = minute - INTERVAL 1 MINUTE WHERE compte_id = ${id} AND service = 'anthropic'`);
  r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('la minute suivante : ça repart', r.code === 200, r.code);
  sql(`UPDATE relais_compteurs SET n_jour = 10000 WHERE compte_id = ${id} AND service = 'anthropic'`);
  r = await appel('POST', '/relais/anthropic', undefined, jeton, brut);
  verifie('limite du jour : 429, demain', r.code === 429 && /demain/.test(r.d.message), r.texte);

  await new Promise((ok2) => f.serveur.close(ok2));
  r = await appel('POST', '/relais/google/traduction', { q: ['x'] }, jeton);
  // Pas de clé de traduction pour ce compte : celle de l administrateur est illisible avec le coffre local.
  verifie('clé illisible : une phrase, pas de détail', r.code === 500 && r.d.erreur === 'cle_illisible', r.code + ' ' + r.texte);
  r = await appel('POST', '/relais/openai', { model: 'gpt-4o-mini', max_tokens: 5, messages: [] }, jeton);
  verifie('service muet : 504 et une phrase', r.code === 504 && r.d.erreur === 'service_injoignable', r.code + ' ' + r.texte);

  sql(`UPDATE comptes SET bloque_le = NOW() WHERE id = ${id}`);
  r = await appel('POST', '/relais/openai', { model: 'gpt-4o-mini', max_tokens: 5, messages: [] }, jeton);
  verifie('compte bloqué : 403', r.code === 403 && r.d.erreur === 'compte_suspendu', r.code);
  sql(`UPDATE comptes SET bloque_le = NULL, cloture_le = NOW() WHERE id = ${id}`);
  r = await appel('POST', '/relais/openai', { model: 'gpt-4o-mini', max_tokens: 5, messages: [] }, jeton);
  verifie('compte clôturé : 403', r.code === 403 && r.d.erreur === 'compte_cloture', r.code);
  sql(`UPDATE comptes SET cloture_le = NULL WHERE id = ${id}`);
}

async function enProduction(jeton) {
  let r = await appel('POST', '/relais/google/traduction', { q: ['Merci beaucoup'], source: 'fr', target: 'en', format: 'text' }, jeton);
  verifie('un compte neuf traduit, sans aucune clé', r.code === 200 && /thank/i.test(r.texte), r.code + ' ' + r.texte.slice(0, 120));
  r = await appel('POST', '/relais/google/recherche', { q: 'timecool' }, jeton);
  // L'API de recherche n'est pas activée dans le projet Google : le relais a transmis, Google refuse. Ce n'est pas un défaut du relais.
  if (r.code === 403 && /Custom Search JSON API/.test(r.texte)) {
    console.log('  ATTENTION recherche web : API Custom Search non activée dans le projet Google, le relais a bien transmis.');
  } else {
    verifie('et cherche sur le web', r.code === 200, r.code + ' ' + r.texte.slice(0, 120));
  }
}

(async () => {
  const stamp = Date.now();
  const identite = { prenom: 'Sonde', nom: 'Relais', ville: 'Lyon', code_postal: '69001', email: 'sonde.relais' + stamp + '@exemple-timecool.fr', telephone: '+336' + String(stamp).slice(-8), mot_de_passe: 'Motdepasse-relais-1' };
  const a = await appel('POST', '/inscription', identite);
  verifie('compte créé', a.code === 200 || a.code === 201, a.texte);
  const jeton = a.d.session.jeton;

  for (const f of ['anthropic', 'openai', 'google/suggestions', 'google/lieux', 'google/itineraire', 'google/recherche', 'google/traduction', 'tester']) {
    const r = await appel('POST', '/relais/' + f, { max_tokens: 5 });
    verifie('sans session, refusé : ' + f, r.code === 401, 'HTTP ' + r.code);
  }
  const inconnu = await appel('POST', '/relais/autre', {}, jeton);
  verifie('relais inconnu : refusé', inconnu.code === 404, 'HTTP ' + inconnu.code);
  const illisible = await appel('POST', '/relais/anthropic', undefined, jeton, 'pas du json');
  verifie('demande illisible : 400', illisible.code === 400, 'HTTP ' + illisible.code);
  const longue = await appel('POST', '/relais/anthropic', { max_tokens: 9000, messages: [] }, jeton);
  verifie('réponse trop longue demandée : 400', longue.code === 400, 'HTTP ' + longue.code);

  // Le compte neuf : rien de copié, rien de sorti.
  const liste = await appel('GET', '/cles-api', undefined, jeton);
  verifie('la liste dit ce qui est hérité', Array.isArray(liste.d.cles) && liste.d.cles.length > 0 && liste.d.cles.every((c) => c.herite === true), liste.texte.slice(0, 200));
  for (const service of ['anthropic', 'openai', 'google_translate', 'gmaps', 'twilio']) {
    const v = await appel('GET', '/cles-api/valeur?service=' + service, undefined, jeton);
    verifie('aucune valeur héritée : ' + service, v.code === 200 && v.d.herite === true && !('valeur' in v.d), v.texte.slice(0, 60));
  }

  const moi = await appel('GET', '/compte', undefined, jeton);
  if (LOCAL) {
    const id = Number(sql(`SELECT id FROM comptes WHERE email = '${identite.email}'`));
    verifie('compte retrouvé', id > 0);
    await enLocal(jeton, id);
  } else {
    await enProduction(jeton);
  }
  void moi;
  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})().catch((x) => { console.log('  KO ' + x.stack); process.exit(1); });
