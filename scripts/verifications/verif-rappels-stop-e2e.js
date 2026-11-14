require('./comptes-jetables'); // Les comptes créés ici sont effacés en fin de passage.
// Mission 85 (Charles, 14/11) : le rappel par e-mail est allumé dès l'inscription (une heure avant), et chaque e-mail
// porte « Ne plus recevoir ces rappels » : un lien signé propre au compte, sans connexion, qui éteint tc_rappel_email.
// Usage : node verif-rappels-stop-e2e.js <index.html> <API> ; TC_API=http://127.0.0.1:8099 pour la partie jouée.
// La signature se calcule avec le poivre de l'API locale (php en ligne de commande) : contre une autre API, seule
// l'inscription est jouée. TC_RAPPELS_CAPTURES=<dossier> écrit aussi l'e-mail et la page pour les captures.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const D = __dirname;
const page = fs.readFileSync(process.argv[2] || path.join(D, '../../app/src/main/assets/index.html'), 'utf8');
const apiChemin = path.join(D, '../../backend/api/index.php');
const api = fs.readFileSync(apiChemin, 'utf8');
const API = process.env.TC_API || 'https://api.timecool.fr';
const LOCALE = /^http:\/\/127\.0\.0\.1:/.test(API);
const PHP = '/opt/plesk/php/8.3/bin/php';
const CONF_LOCALE = path.join(os.homedir(), 'api-locale/private/config.php');
const LIB = path.join(D, '../../backend/private/lib.php');

let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };

function fonctionPhp(nom) {
  const i = api.indexOf('\nfunction ' + nom + '(');
  if (i < 0) return '';
  let n = 0;
  for (let k = api.indexOf('{', api.indexOf(')', i)); k < api.length; k++) {
    if (api[k] === '{') n++;
    else if (api[k] === '}') { n--; if (n === 0) return api.slice(i + 1, k + 1); }
  }
  return '';
}

// ─── 1. Le code ───────────────────────────────────────────────
verifie('l inscription allume tc_rappel_email (« 1 ») par elementsPoser', /lastInsertId\(\);\n\n {8}\/\/ Mission 85[\s\S]{0,400}elementsPoser\(\[\[\n {16}'compte_id' => \$id, 'type' => 'reglage', 'uid' => 'tc_rappel_email',\n {16}'contenu' => \['id' => 'tc_rappel_email', 'v' => '1'\],/.test(api));
verifie('un échec d écriture n empêche pas l inscription', /'v' => '1'\],\n {12}\]\]\);\n {8}\} catch \(Throwable \$e\) \{\n {12}error_log\('rappel e-mail non allume/.test(api));
verifie('la page aussi, au moment de la création du compte', page.includes("  saveUserAccount(account);\n  // Mission 85") && page.includes("  try { localStorage.setItem(TC_RAPPEL_EMAIL_CLE, '1'); } catch (e) {}"));
verifie('le délai par défaut reste une heure', /if \(\$l === null\) \{\n\s+return 60;/.test(api));
verifie('la signature : HMAC du poivre, propre à la référence', fonctionPhp('rappelStopJeton').includes("hash_hmac('sha256', 'rappels-stop|' . $reference, $poivre, true)"));
verifie('sans poivre, pas de lien', /if \(\$poivre === '' \|\| \$reference === ''\) \{\n\s+return null;/.test(fonctionPhp('rappelStopJeton')));
verifie('comparaison à temps constant', api.includes('$valide = $attendu !== null && hash_equals($attendu, $sig);'));
verifie('la route éteint par elementsPoser (« 0 »), sans écrire si c est déjà fait', /case 'GET \/rappels\/arreter':\n {4}case 'POST \/rappels\/arreter':[\s\S]{0,900}\(\$d\['v'\] \?\? null\) !== '0'[\s\S]{0,200}'contenu' => \['id' => 'tc_rappel_email', 'v' => '0'\]/.test(api));
verifie('les rappels portent la référence du compte', api.includes('"SELECT c.id, c.reference, c.email, c.prenom'));
verifie('rappelEnvoyerUn passe par rappelMessage et ses en-têtes', fonctionPhp('rappelEnvoyerUn').includes("envoyerEmail((string) $compte['email'], $m['sujet'], $m['texte'], $m['html'], $m['entetes']);"));
verifie('un en-tête à retour à la ligne est écarté', fonctionPhp('envoyerEmail').includes("!preg_match('/[\\r\\n]/', $l)"));
verifie('vocabulaire calme', !/définitivement|désabonn|ATTENTION/i.test(fonctionPhp('rappelsStopPage') + fonctionPhp('rappelMessage')));

// ─── 2. L'e-mail, rendu par le vrai code (php, configuration locale) ────
function php(script, args) {
  const f = path.join(os.tmpdir(), 'tc-m85-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.php');
  fs.writeFileSync(f, script);
  try { return cp.spawnSync(PHP, [f].concat(args || []), { encoding: 'utf8' }); } finally { try { fs.unlinkSync(f); } catch (e) {} }
}
const phpPret = fs.existsSync(PHP) && fs.existsSync(CONF_LOCALE) && fs.existsSync(LIB);
const entete = '<?php\nrequire ' + JSON.stringify(LIB) + ';\nConf::charger(' + JSON.stringify(CONF_LOCALE) + ');\n'
  + ['emailHabille', 'rappelStopJeton', 'rappelStopLien', 'rappelMessage'].map(fonctionPhp).join('\n') + '\n';
function jeton(ref) {
  const r = php(entete + 'echo rappelStopJeton($argv[1]);\n', [ref]);
  return String(r.stdout || '').trim();
}
let message = null;
if (!phpPret) verifie('php et la configuration locale sont là', false, PHP + ' / ' + CONF_LOCALE);
else {
  const r = php(entete + "$c = ['reference' => 'REF0123456789ABC', 'prenom' => 'Léa', 'email' => 'lea@exemple-timecool.fr'];\n"
    + "$d = new DateTime('2026-11-17 15:00', new DateTimeZone('Europe/Paris'));\n"
    + "echo json_encode(rappelMessage($c, ['title' => 'Dentiste', 'lieu' => '12 rue de la Paix, Paris'], $d, 60), JSON_UNESCAPED_UNICODE);\n");
  try { message = JSON.parse(r.stdout); } catch (e) { verifie('rappelMessage se lit', false, (r.stdout || '') + (r.stderr || '')); }
}
if (message) {
  const j = jeton('REF0123456789ABC');
  const lien = 'https://api.timecool.fr/rappels/arreter?c=REF0123456789ABC&s=' + j;
  verifie('le jeton : 24 caractères sûrs dans une adresse', /^[A-Za-z0-9_-]{24}$/.test(j), j.length);
  verifie('deux comptes, deux jetons', j !== jeton('REF0123456789ABD'));
  verifie('l e-mail : « Dentiste, c est dans 1 heure. »', message.html.includes('<strong>Dentiste</strong>, c\'est dans 1 heure.') && message.texte.startsWith('Dentiste, c\'est dans 1 heure. Le 17/11/2026 à 15h00.'));
  verifie('le bouton « Ne plus recevoir ces rappels » et son lien signé', message.html.includes('<a href="' + lien.replace(/&/g, '&amp;') + '" ') && message.html.includes('>Ne plus recevoir ces rappels</a>'));
  verifie('la version texte porte le lien', message.texte.endsWith('\n\nNe plus recevoir ces rappels : ' + lien));
  verifie('les en-têtes List-Unsubscribe (et le clic unique)', JSON.stringify(message.entetes) === JSON.stringify(['List-Unsubscribe: <' + lien + '>', 'List-Unsubscribe-Post: List-Unsubscribe=One-Click']));
  verifie('le sujet ne change pas', message.sujet === 'TIMECOOL - RAPPEL : DENTISTE');
  if (process.env.TC_RAPPELS_CAPTURES) fs.writeFileSync(path.join(process.env.TC_RAPPELS_CAPTURES, 'email.html'), message.html);
}

// ─── 3. Joué contre l'API ─────────────────────────────────────
async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const t = await r.text();
  let d = null;
  try { d = JSON.parse(t); } catch (e) {}
  return { code: r.status, d, t };
}
let n = 0;
async function inscrire(prenom) {
  n++;
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.rappelstop' + Date.now() + n + '@exemple-timecool.fr',
    telephone: '+3363998' + String(Date.now() + 377 * n).slice(-4), mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Rappel', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + r.t.slice(0, 200));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton };
}
async function rappelEmail(c) {
  const s = await appel('GET', '/sync?depuis=0', undefined, c.jeton);
  const e = ((s.d && s.d.elements) || []).find((x) => x.type === 'reglage' && x.uid === 'tc_rappel_email');
  return e && !e.supprime && e.contenu ? e.contenu.v : null;
}

(async () => {
  const a = await inscrire('Alice');
  const b = await inscrire('Bruno');
  verifie('compte neuf : tc_rappel_email vaut « 1 » dans le compte (tous ses appareils le reçoivent)', await rappelEmail(a) === '1', await rappelEmail(a));
  if (!LOCALE || !phpPret) {
    console.log('  (API ' + API + ' : la signature n est calculable qu avec l API locale, liens non joués)');
  } else {
    const ja = jeton(a.ref), jb = jeton(b.ref);
    const v0 = (await appel('GET', '/sync/version', undefined, a.jeton)).d.version;
    const p1 = await appel('GET', '/rappels/arreter?c=' + a.ref + '&s=' + ja);
    verifie('le lien : page 200 « C’est noté »', p1.code === 200 && p1.t.includes('<h1 style="font-size:20px;margin:12px 0">C’est noté</h1>') && p1.t.includes('Vous ne recevrez plus de rappel par e-mail.'), p1.code);
    verifie('le réglage s éteint (« 0 ») : l interrupteur suit sur les appareils', await rappelEmail(a) === '0');
    const v1 = (await appel('GET', '/sync/version', undefined, a.jeton)).d.version;
    const p2 = await appel('GET', '/rappels/arreter?c=' + a.ref + '&s=' + ja);
    const v2 = (await appel('GET', '/sync/version', undefined, a.jeton)).d.version;
    verifie('ouvert deux fois : même page, rien de réécrit', p2.code === 200 && p2.t.includes('C’est noté') && v1 === v0 + 1 && v2 === v1, [v0, v1, v2].join(','));
    if (process.env.TC_RAPPELS_CAPTURES) fs.writeFileSync(path.join(process.env.TC_RAPPELS_CAPTURES, 'page.html'), p1.t);
    const faux = await appel('GET', '/rappels/arreter?c=' + b.ref + '&s=' + ja.replace(/^./, (x) => (x === 'A' ? 'B' : 'A')));
    verifie('signature fausse : 400, page calme, rien ne change', faux.code === 400 && faux.t.includes('Ce lien n’est pas valable') && await rappelEmail(b) === '1', faux.code);
    const autre = await appel('GET', '/rappels/arreter?c=' + b.ref + '&s=' + ja);
    verifie('la signature d un compte ne vaut rien pour un autre', autre.code === 400 && await rappelEmail(b) === '1', autre.code);
    const sans = await appel('GET', '/rappels/arreter?c=' + b.ref);
    const bidon = await appel('GET', '/rappels/arreter?c=../../x&s=' + jb);
    verifie('sans signature, ou référence bidon : 400', sans.code === 400 && bidon.code === 400, sans.code + ' ' + bidon.code);
    const clic = await fetch(API + '/rappels/arreter?c=' + b.ref + '&s=' + jb, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
    verifie('clic unique d une messagerie (POST) : 200, éteint', clic.status === 200 && (await clic.text()) === 'ok' && await rappelEmail(b) === '0', clic.status);
    const remis = await appel('POST', '/sync', { elements: [{ type: 'reglage', uid: 'tc_rappel_email', contenu: { id: 'tc_rappel_email', v: '1' } }] }, a.jeton);
    verifie('rallumé depuis l appli : le compte le reprend', remis.code === 200 && await rappelEmail(a) === '1');
  }
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO ' + e.message); process.exit(1); });
