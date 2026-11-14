// Mission 86 (Charles, 14/11) : les SMS partent par OVHcloud (http2sms) quand ses clés sont posées, sinon par Twilio.
// Lu : le code et Configuration IA. Joué : une API locale à part (php -S) et un FAUX OVHcloud ; aucun vrai SMS.
// Usage : node verif-sms-ovh.js <index.html> <index.php>
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const cp = require('child_process');

const D = __dirname;
const page = fs.readFileSync(process.argv[2] || path.join(D, '../../app/src/main/assets/index.html'), 'utf8');
const apiChemin = process.argv[3] && /\.php$/.test(process.argv[3]) ? process.argv[3] : path.join(D, '../../backend/api/index.php');
const api = fs.readFileSync(apiChemin, 'utf8');
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
const route = (r) => { const i = api.indexOf("case '" + r + "':"); return i < 0 ? '' : api.slice(i, api.indexOf("\n    case '", i + 10)); };

// ─── 1. Le code ───────────────────────────────────────────────
const ovh = fonctionPhp('smsEnvoyerOvh');
verifie('smsEnvoyer choisit le fournisseur (OVHcloud, sinon Twilio)', /\$f = smsFournisseur\(\);\n\s+if \(\$f === 'ovh'\)[\s\S]{0,200}if \(\$f === 'twilio'\) \{\n\s+smsEnvoyerTwilio/.test(fonctionPhp('smsEnvoyer')));
verifie('OVHcloud passe avant Twilio (réglage sms_fournisseur, auto par défaut)', /Conf::get\('sms_fournisseur', 'auto'\)[\s\S]{0,120}smsIdentifiantsOvh\(\) !== null\) \{\n\s+return 'ovh';[\s\S]{0,120}smsIdentifiants\(\) !== null\) \{\n\s+return 'twilio';/.test(fonctionPhp('smsFournisseur')));
verifie('Twilio reste en place, inchangé', fonctionPhp('smsEnvoyerTwilio').includes("'/2010-04-01/Accounts/' . rawurlencode($id['sid']) . '/Messages.json'") && fonctionPhp('smsIdentifiants').includes("'twilio_jeton'"));
verifie('les clés OVHcloud : Configuration IA, chiffrées comme les autres', ['ovh_sms_compte', 'ovh_sms_utilisateur', 'ovh_sms_mot_de_passe', 'ovh_sms_expediteur'].every((s) => fonctionPhp('smsIdentifiantsOvh').includes("smsCleAdministrateur('" + s + "')")) && fonctionPhp('smsCleAdministrateur').includes('Coffre::dechiffrer'));
verifie('le mot de passe part dans le corps (POST), jamais dans l adresse', ovh.includes("curl_init($base . '/cgi-bin/sms/http2sms.cgi');") && ovh.includes('CURLOPT_POST           => true') && /CURLOPT_POSTFIELDS     => http_build_query\(\[[\s\S]{0,200}'password'    => \$id\['mot_de_passe'\]/.test(ovh));
verifie('aucun journal ne contient les identifiants', !/error_log\([^;]*(\$id\[|mot_de_passe|password)/.test(ovh + fonctionPhp('smsIdentifiantsOvh')));
verifie('en local (php -S), jamais le vrai OVHcloud', /if \(PHP_SAPI === 'cli-server'\) \{[\s\S]{0,200}if \(\$faux === ''\) \{\n\s+throw new RuntimeException/.test(ovh));
verifie('pas de mention STOP ajoutée (messages de service)', ovh.includes("'noStop'      => '1',"));
const test = route('POST /test/sms') + route('POST /test/sms-twilio');
verifie('route d essai : /test/sms-twilio gardée, /test/sms ajoutée, même code', api.includes("    case 'POST /test/sms':\n    case 'POST /test/sms-twilio':\n"));
verifie('route d essai : réservée à l administrateur, vers son numéro, dit le fournisseur et le message d OVHcloud', test.includes("'acces_refuse'") && test.includes("$envoi = smsEnvoyer((string) $moi['telephone']") && test.includes("'fournisseur'     => $nomFournisseur") && test.includes("'Envoi ' . $nomFournisseur . ' impossible : '"));
verifie('le code par SMS à l inscription reste éteint par défaut', route('POST /inscription').includes("Conf::get('verification_sms_inscription', false)") || /verification_sms_inscription', false\)/.test(api));
const lignes = ['ovh_sms_compte', 'ovh_sms_utilisateur', 'ovh_sms_mot_de_passe', 'ovh_sms_expediteur'].map((id) => (page.match(new RegExp("\\{ id: '" + id + "', name: '([^']+)'")) || [])[1]);
verifie('Configuration IA : les quatre lignes OVHcloud, après Twilio', lignes.join(' | ') === 'OVHcloud (SMS), nom du compte SMS | OVHcloud (SMS), utilisateur API | OVHcloud (SMS), mot de passe de l’utilisateur API | OVHcloud (SMS), expéditeur (facultatif)' && page.indexOf("id: 'ovh_sms_compte'") > page.indexOf("id: 'twilio_expediteur'") && page.indexOf("id: 'ovh_sms_expediteur'") < page.indexOf("id: 'vonage'"), lignes.join(' | '));

// ─── 2. Joué : API locale + faux OVHcloud ─────────────────────
const PHP = '/opt/plesk/php/8.3/bin/php';
const CONF_LOCALE = path.join(os.homedir(), 'api-locale/private/config.php');
const LIB = path.join(path.dirname(apiChemin), '../private/lib.php');

(async () => {
  if (!fs.existsSync(PHP) || !fs.existsSync(CONF_LOCALE) || !fs.existsSync(LIB)) {
    console.log('  (parcours réel sauté : pas d API locale ici)');
  } else {
    const T = fs.mkdtempSync(path.join(os.tmpdir(), 'smsovh-'));
    fs.mkdirSync(path.join(T, 'api'), { recursive: true });
    fs.mkdirSync(path.join(T, 'private/documents'), { recursive: true });
    fs.copyFileSync(apiChemin, path.join(T, 'api/index.php'));
    fs.copyFileSync(LIB, path.join(T, 'private/lib.php'));
    const configurer = (reglages) => fs.writeFileSync(path.join(T, 'private/config.php'), '<?php\n$c = require ' + JSON.stringify(CONF_LOCALE) + ";\nreturn array_merge($c, ['mode_test' => false, 'sms_max_ip_heure' => 1000, 'sms_max_ip_jour' => 1000, 'sms_renvoi_secondes' => 0, " + reglages + ']);\n');

    // Le faux OVHcloud : le nom du compte dit comment répondre.
    const recus = [];
    const faux = http.createServer((q, s) => {
      let b = '';
      q.on('data', (x) => { b += x; });
      q.on('end', () => {
        const p = Object.fromEntries(new URLSearchParams(b));
        recus.push({ methode: q.method, url: q.url, p });
        s.setHeader('Content-Type', 'application/json');
        if (p.account === 'sms-ab00003-1') return s.end('{"status":401,"message":"No IP allowed. For more informations : https://docs.ovh.com/fr/telecom/ "}');
        if (p.account === 'sms-ab00002-1' && p.from) return s.end('{"status":202,"message":"Invalid sender (TimeCool). For more informations : https://docs.ovh.com/fr/telecom/ "}');
        s.end('{"status":100,"creditLeft":"99","SmsIds":["12345"]}');
      });
    });
    await new Promise((r) => faux.listen(0, '127.0.0.1', r));
    const port = 18900 + Math.floor(Math.random() * 600);
    const env = Object.assign({}, process.env, { TC_SMS_FAUX_OVH: 'http://127.0.0.1:' + faux.address().port, TC_SMS_FAUX: 'http://127.0.0.1:9' });
    const proc = cp.spawn(PHP, ['-S', '127.0.0.1:' + port, path.join(T, 'api/index.php')], { env, stdio: 'ignore' });
    const U = 'http://127.0.0.1:' + port;
    const hasard = (n) => String(Math.floor(Math.random() * Math.pow(10, n))).padStart(n, '0');
    const numeros = [];
    const demander = async () => {
      const n = '+337009' + hasard(6);
      numeros.push(n);
      const r = await fetch(U + '/verification/demander', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canal: 'sms', destination: n }) });
      let d = {};
      try { d = await r.json(); } catch (e) { /* vide */ }
      return { code: r.status, d, n };
    };
    const cles = (compte, expediteur) => "'ovh_sms_compte' => '" + compte + "', 'ovh_sms_utilisateur' => 'timecool', 'ovh_sms_mot_de_passe' => 'Motdp123', 'ovh_sms_expediteur' => '" + expediteur + "'";
    try {
      configurer(cles('sms-ab00001-1', 'TimeCool'));
      let pret = false;
      for (let i = 0; i < 50 && !pret; i++) { try { pret = (await fetch(U + '/parametres')).status === 200; } catch (e) { await new Promise((r) => setTimeout(r, 100)); } }
      verifie('API locale prête', pret);

      let r = await demander();
      let q = recus[recus.length - 1] || { p: {} };
      verifie('le code part par OVHcloud, en POST, à /cgi-bin/sms/http2sms.cgi', r.code === 201 && recus.length === 1 && q.methode === 'POST' && q.url === '/cgi-bin/sms/http2sms.cgi', r.code + ' ' + JSON.stringify(r.d));
      verifie('compte, utilisateur, mot de passe dans le corps ; rien dans l adresse', q.p.account === 'sms-ab00001-1' && q.p.login === 'timecool' && q.p.password === 'Motdp123' && !/password|login/.test(q.url));
      verifie('numéro au format OVHcloud (0033…), expéditeur TimeCool, sans STOP, réponse JSON', q.p.to === '00' + r.n.slice(1) && q.p.from === 'TimeCool' && q.p.noStop === '1' && q.p.contentType === 'application/json', JSON.stringify(Object.assign({}, q.p, { password: '…' })));
      verifie('le texte du code ne change pas', /^TimeCool : ton code est \d{6}\. Il est valable 10 minutes\.$/.test(q.p.message || ''), q.p.message);

      configurer(cles('sms-ab00001-1', ''));
      r = await demander();
      q = recus[recus.length - 1] || { p: {} };
      verifie('sans expéditeur : le numéro court (senderForResponse)', r.code === 201 && recus.length === 2 && q.p.from === '' && q.p.senderForResponse === '1', JSON.stringify(Object.assign({}, q.p, { password: '…' })));

      configurer(cles('sms-ab00002-1', 'TimeCool'));
      r = await demander();
      const deux = recus.slice(-2);
      verifie('expéditeur pas encore validé : renvoyé par le numéro court, pas d échec', r.code === 201 && recus.length === 4 && deux[0].p.from === 'TimeCool' && deux[1].p.from === '' && deux[1].p.senderForResponse === '1', r.code + ' ' + recus.length);

      configurer(cles('sms-ab00003-1', 'TimeCool'));
      r = await demander();
      verifie('OVHcloud refuse : 502, « Le SMS n’a pas pu partir », la demande ne compte pas', r.code === 502 && r.d.erreur === 'envoi_echoue' && recus.length === 5, r.code + ' ' + JSON.stringify(r.d));

      configurer(cles('sms-ab00001-1', 'TimeCool') + ", 'sms_fournisseur' => 'twilio', 'twilio_account_sid' => 'AC" + '0'.repeat(32) + "', 'twilio_auth_token' => 'x', 'twilio_numero_expediteur' => 'TimeCool'");
      r = await demander();
      verifie('sms_fournisseur => twilio : OVHcloud n est pas appelé', recus.length === 5, recus.length);

      configurer("'ovh_sms_compte' => 'pas-un-compte', 'ovh_sms_utilisateur' => 'timecool', 'ovh_sms_mot_de_passe' => 'Motdp123', 'sms_fournisseur' => 'ovh'");
      r = await demander();
      verifie('un nom de compte OVHcloud abîmé : aucun appel, échec propre', r.code === 502 && recus.length === 5, r.code);
    } finally {
      proc.kill();
      faux.close();
      // Les demandes de la suite partent de la base : elles ne comptent pas dans les limites du vrai service.
      const purge = path.join(T, 'purge.php');
      fs.writeFileSync(purge, "<?php\nrequire $argv[1] . '/private/lib.php';\nConf::charger($argv[1] . '/private/config.php');\nforeach (json_decode($argv[2], true) as $d) { Db::req('DELETE FROM verifications WHERE destination = ?', [$d]); }\necho 'ok';\n");
      const p = cp.spawnSync(PHP, [purge, T, JSON.stringify(numeros)], { encoding: 'utf8' });
      verifie('les demandes de la suite sont effacées', p.stdout === 'ok', (p.stdout || '') + (p.stderr || ''));
      try { fs.rmSync(T, { recursive: true, force: true }); } catch (e) { /* rien */ }
    }
  }
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
