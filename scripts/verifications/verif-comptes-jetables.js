// Mission 70 : les comptes de test ne s'accumulent plus. Hors réseau, un faux serveur local joue l'API.
// Usage : node verif-comptes-jetables.js <index.html> <index.php>
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const cp = require('child_process');

const D = __dirname;
const api = fs.readFileSync(process.argv[3] || path.join(D, '../../backend/api/index.php'), 'utf8');
const purge = fs.readFileSync(path.join(D, '../purger-comptes-test.sh'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d ? ' : ' + d : '')); } };

// 1. Toutes les suites qui s'inscrivent chargent le nettoyage.
const suites = fs.readdirSync(D).filter((f) => f.endsWith('.js') && f !== 'comptes-jetables.js' && f !== path.basename(__filename));
const sansNettoyage = suites.filter((f) => {
  const t = fs.readFileSync(path.join(D, f), 'utf8');
  return /appel\('POST', '\/inscription'|fetch\([^)]*\/inscription/.test(t) && !t.includes("require('./comptes-jetables')");
});
verifie('chaque suite qui crée des comptes les efface', sansNettoyage.length === 0, sansNettoyage.join(' '));
verifie('il y a bien des suites concernées', suites.filter((f) => fs.readFileSync(path.join(D, f), 'utf8').includes("require('./comptes-jetables')")).length >= 18);

// 2. L'API : une seule logique, et la route refuse tout autre compte.
const debut = api.indexOf('function compteEffacer(');
const fonction = api.slice(debut, api.indexOf('\n}\n', debut));
for (const t of ['commentaires', 'rappels_envoyes', 'rapports_techniques', 'verifications', 'comptes']) {
  verifie('compteEffacer efface ' + t, fonction.includes('DELETE FROM ' + t + ' '));
}
verifie('compteEffacer efface les fichiers joints', fonction.includes('documentsEffacerDuCompte($id)'));
const route = (n) => { const i = api.indexOf("case '" + n + "':"); return api.slice(i, api.indexOf('\n    case ', i + 10)); };
verifie('le « Supprimer » administrateur passe par compteEffacer', route('POST /admin/supprimer').includes('compteEffacer('));
verifie('une seule suppression de compte dans l API', (api.match(/DELETE FROM comptes/g) || []).length === 1);
const r = route('POST /compte/effacer-test');
verifie('la route demande une session', r.includes('Auth::compte()'));
verifie('la route refuse un compte qui n est pas de test', /str_ends_with\(strtolower\(\(string\) \(\$compte\['email'\]/.test(r) && r.includes("'@exemple-timecool.fr'") && r.includes('403'));
verifie('la route n efface que le compte de la session', r.includes("compteEffacer((int) $compte['id'])") && !/Entree::/.test(r));

// 3. Le script de purge.
verifie('purge : ne vise que le domaine de test', purge.includes("DOMAINE='@exemple-timecool.fr'") && purge.includes('DELETE FROM comptes WHERE id IN ($paquet) AND $COND'));
verifie('purge : les deux modes', purge.includes('--compter)') && purge.includes('--effacer)'));
verifie('purge : la sauvegarde est vérifiée avant le premier effacement', purge.indexOf('gzip -t') > 0 && purge.indexOf('gzip -t') < purge.indexOf('START TRANSACTION'));
verifie('purge : syntaxe', cp.spawnSync('bash', ['-n', path.join(D, '../purger-comptes-test.sh')]).status === 0);

// 4. Le nettoyage en fin de passage, sur un faux serveur.
const scenarios = {
  'fin normale': { corps: '', code: 0 },
  'process.exit(0)': { corps: 'process.exit(0);', code: 0 },
  'échec par process.exit(1)': { corps: 'process.exit(1);', code: 1 },
  'process.exit au milieu : la suite s arrête': { corps: "process.exit(1); console.log('PAS ICI');", code: 1 },
  'exception': { corps: "throw new Error('boum');", code: 1 },
  'promesse rejetée sans catch': { corps: "Promise.reject(new Error('boum'));", code: 1 },
  'échec attrapé par la suite': { corps: "throw new Error('boum');", code: 2, catch: true },
};

function jouer(url, corps, estCatch, env) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jetables-')), 's.js');
  const interne = `
    const i = await fetch(API + '/inscription', { method: 'POST', body: '{}' });
    await i.json();
    const j = await fetch(API + '/inscription-vrai/inscription', { method: 'POST', body: '{}' });
    await j.json();
    ${corps}`;
  fs.writeFileSync(f, `require(${JSON.stringify(path.join(D, 'comptes-jetables.js'))});
const API = ${JSON.stringify(url)};
(async () => {${interne}
})()${estCatch ? '.catch(() => process.exit(2))' : ''};
`);
  return new Promise((res) => {
    const p = cp.spawn(process.execPath, [f], { env: Object.assign({}, process.env, env || {}) });
    let s = '';
    p.stdout.on('data', (x) => { s += x; });
    p.stderr.on('data', () => {});
    p.on('close', (code) => { res({ code, sortie: s }); });
  });
}

(async () => {
  let effaces = [];
  let reponse = 200;
  const srv = http.createServer((q, s) => {
    q.resume();
    q.on('end', () => {
      if (q.url.endsWith('/inscription')) {
        const vrai = q.url.includes('vrai');
        s.end(JSON.stringify({ compte: { reference: vrai ? 'VRAI' : 'TEST', email: vrai ? 'quelquun@exemple.fr' : 'sonde.x@Exemple-TimeCool.fr' }, session: { jeton: vrai ? 'j-vrai' : 'j-test' } }));
      } else if (q.url === '/compte/effacer-test') {
        effaces.push(q.headers.authorization);
        s.statusCode = reponse;
        s.end('{}');
      } else { s.statusCode = 404; s.end('{}'); }
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port;
  for (const [nom, c] of Object.entries(scenarios)) {
    effaces = [];
    const r = await jouer(url, c.corps, c.catch);
    verifie(nom + ' : le code de sortie est gardé', r.code === c.code, String(r.code));
    verifie(nom + ' : le compte de test est effacé, lui seul', effaces.length === 1 && effaces[0] === 'Bearer j-test', effaces.join());
    verifie(nom + ' : rien après l arrêt', !r.sortie.includes('PAS ICI'));
  }
  const restes = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'restes-')), 'r.txt');
  reponse = 404;
  const r = await jouer(url, 'process.exit(0);', false, { TC_COMPTES_RESTES: restes });
  verifie('route absente : la suite garde son code', r.code === 0);
  verifie('route absente : le reste est noté', fs.existsSync(restes) && fs.readFileSync(restes, 'utf8').includes('sonde.x'));
  reponse = 401;
  effaces = [];
  fs.unlinkSync(restes);
  await jouer(url, 'process.exit(0);', false, { TC_COMPTES_RESTES: restes });
  verifie('compte déjà supprimé par la suite : rien à signaler', !fs.existsSync(restes));
  srv.close();
  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})();
