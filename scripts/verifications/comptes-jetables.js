// Mission 70 : un compte de test créé par une suite ne reste pas en base.
// Chargé en tête de chaque suite qui s'inscrit : retient les comptes @exemple-timecool.fr créés,
// et les efface en fin de passage, même si la suite échoue (POST /compte/effacer-test, même logique
// que le « Supprimer » de la page administrateur). L'effacement est fait par un processus fils
// attendu de façon synchrone : process.exit garde son comportement (il ne rend jamais la main).
// Ce qui n'a pas pu être effacé est écrit dans le fichier TC_COMPTES_RESTES (verifier.sh le signale),
// sinon sur la sortie d'erreur.
const fs = require('fs');
const cp = require('child_process');

function noterRestes(restes) {
  if (!restes.length) return;
  const f = process.env.TC_COMPTES_RESTES;
  if (f) fs.appendFileSync(f, restes.join('\n') + '\n');
  else console.error('Comptes de test non effacés : ' + restes.join(', '));
}

if (require.main === module) {
  // Le processus fils : la liste des comptes arrive sur l'entrée standard.
  (async () => {
    const comptes = JSON.parse(fs.readFileSync(0, 'utf8'));
    const restes = [];
    for (const c of comptes) {
      let code = 0;
      try {
        const r = await fetch(c.base + '/compte/effacer-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.jeton },
          body: '{}',
          signal: AbortSignal.timeout(15000),
        });
        code = r.status;
      } catch (e) { /* le compte part dans les restes */ }
      // 401 : la suite a déjà supprimé ce compte, sa session est partie avec lui.
      if (code !== 200 && code !== 401) restes.push(c.email + ' (HTTP ' + code + ')');
    }
    noterRestes(restes);
  })();
} else {
  const DOMAINE = /@exemple-timecool\.fr$/i;
  const comptes = new Map();
  const vraiFetch = globalThis.fetch;
  const vraiExit = process.exit.bind(process);
  let fait = false;

  // Mission 80 : le portable confirmé par SMS. Un compte de test (adresse @exemple-timecool.fr, numéro fictif
  // 06 39 98 xx xx) lit son code dans la réponse du serveur (adresse IP de test) et recommence avec la preuve.
  // Tout autre refus est rendu tel quel.
  async function avecCodeDeTest(chemin, options, r) {
    let d = null;
    try { d = await r.clone().json(); } catch (e) { return r; }
    if (!d || d.erreur !== 'verification_sms_requise') return r;
    let corps;
    try { corps = JSON.parse(options.body); } catch (e) { return r; }
    let tel = String(corps.telephone || '').replace(/[^\d+]/g, '');
    if (/^0/.test(tel)) tel = '+33' + tel.slice(1);
    if (!DOMAINE.test(String(corps.email || '')) || !/^\+3363998\d{4}$/.test(tel)) return r;
    const base = chemin.replace(/\/inscription$/, '');
    const h = { 'Content-Type': 'application/json' };
    const dem = await vraiFetch(base + '/verification/demander', { method: 'POST', headers: h, body: JSON.stringify({ canal: 'sms', destination: tel }) });
    let dd = null;
    try { dd = await dem.json(); } catch (e) { return r; }
    if (!dem.ok || !dd || !dd.code_test) return r;
    const val = await vraiFetch(base + '/verification/valider', { method: 'POST', headers: h, body: JSON.stringify({ reference: dd.reference, code: dd.code_test }) });
    let dv = null;
    try { dv = await val.json(); } catch (e) { return r; }
    if (!val.ok || !dv || !dv.preuve) return r;
    return vraiFetch(chemin, Object.assign({}, options, { body: JSON.stringify(Object.assign({}, corps, { preuve: dv.preuve })) }));
  }

  globalThis.fetch = async function (url, options) {
    let r = await vraiFetch(url, options);
    const chemin = String(url);
    if (r.status === 403 && options && options.method === 'POST' && /\/inscription$/.test(chemin)) {
      r = await avecCodeDeTest(chemin, options, r);
    }
    if (r.ok && options && options.method === 'POST' && /\/(inscription|connexion)$/.test(chemin)) {
      try {
        const d = await r.clone().json();
        const ref = d.compte && d.compte.reference;
        const jeton = d.session && d.session.jeton;
        if (ref && jeton && DOMAINE.test(String(d.compte.email || ''))) {
          comptes.set(ref, { base: chemin.replace(/\/(inscription|connexion)$/, ''), jeton, email: d.compte.email });
        }
      } catch (e) { /* une réponse illisible n'est pas un compte retenu */ }
    }
    return r;
  };

  function effacer() {
    if (fait || !comptes.size) return;
    fait = true;
    const liste = [...comptes.values()];
    const r = cp.spawnSync(process.execPath, [__filename], { input: JSON.stringify(liste), stdio: ['pipe', 'inherit', 'inherit'], timeout: 120000 });
    if (r.status !== 0) noterRestes(liste.map((c) => c.email + ' (nettoyage interrompu)'));
  }

  process.exit = function (code) {
    effacer();
    vraiExit(code);
  };
  process.on('exit', effacer);
  process.on('uncaughtException', (e) => { console.error(e); process.exit(1); });
  process.on('unhandledRejection', (e) => { console.error(e); process.exit(1); });
  process.on('SIGINT', () => process.exit(130));
  process.on('SIGTERM', () => process.exit(143));
}
