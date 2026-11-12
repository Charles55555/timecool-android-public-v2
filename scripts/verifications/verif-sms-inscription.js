// Mission 80 (Charles, 12/11) : le portable confirmé par SMS à l'inscription.
// 1. La page : l'écran du code (web et Android, même page). 2. L'API, lue. 3. Le parcours réel contre une API locale
// (php -S, configuration à part : SMS exigé, faux Twilio local), dont le cas des comptes de test (numéro fictif).
// Usage : node verif-sms-inscription.js <index.html> <index.php>
require('./comptes-jetables');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const cp = require('child_process');
const vm = require('vm');

const D = __dirname;
const page = fs.readFileSync(process.argv[2] || path.join(D, '../../app/src/main/assets/index.html'), 'utf8');
const apiChemin = process.argv[3] || path.join(D, '../../backend/api/index.php');
const api = fs.readFileSync(apiChemin, 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };

/** Le texte d'une fonction de la page (accolades équilibrées). */
function fonction(src, nom) {
  const i = src.indexOf('function ' + nom + '(');
  if (i < 0) return '';
  let n = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (n === 0) return src.slice(i, k + 1); }
  }
  return '';
}

// ─── 1. La page ───────────────────────────────────────────────
for (const f of ['tcRetourDepuisCode', 'tcErreurEnvoiCode', 'tcRenvoiAttendre']) verifie('la page a ' + f, !!fonction(page, f));
verifie('la première case accepte le code proposé par le clavier', /autocomplete="one-time-code" maxlength="6" class="code-digit" data-idx="0"/.test(page));
verifie('les six cases ouvrent le clavier des chiffres', (page.match(/inputmode="numeric" pattern="\[0-9\]\*"[^>]*class="code-digit"/g) || []).length === 6);
verifie('le bouton « Renvoyer le code » a son identifiant', page.includes('id="btnRenvoyerCode" onclick="resendCode()"'));
verifie('le retour de l écran du code passe par tcRetourDepuisCode', page.includes('<button class="back-btn" onclick="tcRetourDepuisCode()">'));
verifie('le parcours lit verification_sms_inscription', page.includes('verification_sms_inscription: d.verification_sms_inscription === true'));
verifie('avec le SMS exigé, le code part dès le formulaire', /if \(params\.verification_sms_inscription\) \{\s*pendingSignup\.smsSeul = true;\s*await chooseVerifyMethod\('sms'\);/.test(page));
verifie('l envoi reprend un code encore valable, le compte créé l oublie', /const deja = tcCodeEncoreValable\(method, destination\);\s*if \(deja\) \{/.test(page) && (page.match(/tcRetenirCode\(method, destination, r\);/g) || []).length === 2 && /  _tcCodeEnCours = null;\n(  \/\/[^\n]*\n  _tcCompteNeuf = true;\n)?  \/\/ La preuve Google/.test(page));
verifie('la demande de code dit « inscription » (envoi et renvoi)', (page.match(/demanderVerification\(method, destination, 'inscription'\)/g) || []).length === 2);
verifie('le texte de l écran dit l étape et la durée', page.includes("'Étape 2 sur 2 : un'") && page.includes("' code à 6 chiffres vient de partir par SMS au <b style=\"white-space:nowrap;\">' + phoneDisplay + '</b>.<br>Il est valable '"));
verifie('messages du code : faux, expiré, trop d essais', page.includes('Ce code ne correspond pas : vérifie les 6 chiffres.') && page.includes('Ce code a expiré : demande un nouveau code.') && page.includes('Trop d’essais : demande un nouveau code.'));
verifie('Configuration IA : identifiant, jeton, expéditeur Twilio', page.includes("id: 'twilio_jeton'") && page.includes("id: 'twilio_expediteur'") && page.includes('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Account SID)') && !page.includes('SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'));

// Les fonctions de l'écran, jouées.
{
  const cases = [0, 1, 2, 3, 4, 5].map((i) => ({ value: '', idx: i, focus() { ctx.focusee = i; } }));
  const bouton = { disabled: false, style: {}, textContent: '' };
  const minuteurs = [];
  const ctx = {
    focusee: -1, envoye: 0, vers: '',
    document: {
      querySelectorAll: () => cases,
      querySelector: (q) => { const m = /data-idx="(\d)"/.exec(q); return m ? cases[+m[1]] : null; },
      getElementById: (id) => (id === 'btnRenvoyerCode' ? bouton : null),
    },
    setTimeout: (f) => { f(); return 1; },
    setInterval: (f) => { minuteurs.push(f); return minuteurs.length; },
    clearInterval: () => {},
    submitVerifyCode: () => { ctx.envoye++; },
    navigateAuth: (p) => { ctx.vers = p; },
    pendingSignup: null,
  };
  vm.createContext(ctx);
  vm.runInContext('let _tcRenvoiMinuteur = null;\n' + ['handleCodeInput', 'tcRenvoiAttendre', 'tcRetourDepuisCode'].map((f) => fonction(page, f)).join('\n') + '\nthis.handleCodeInput = handleCodeInput; this.tcRenvoiAttendre = tcRenvoiAttendre; this.tcRetourDepuisCode = tcRetourDepuisCode;', ctx);
  cases[0].value = '482913';
  ctx.handleCodeInput(cases[0], 0);
  verifie('six chiffres d un coup : une case chacun', cases.map((c) => c.value).join('') === '482913', cases.map((c) => c.value).join(','));
  verifie('six chiffres d un coup : envoi automatique', ctx.envoye === 1);
  cases.forEach((c) => { c.value = ''; });
  cases[2].value = 'a';
  ctx.handleCodeInput(cases[2], 2);
  verifie('une lettre ne reste pas dans une case', cases[2].value === '');
  ctx.tcRenvoiAttendre(2);
  verifie('renvoi : grisé avec le temps qui reste', bouton.disabled === true && bouton.textContent === '↻ Renvoyer le code (dans 2 s)', bouton.textContent);
  minuteurs[0](); minuteurs[0]();
  verifie('renvoi : de nouveau possible à la fin du délai', bouton.disabled === false && bouton.textContent === '↻ Renvoyer le code', bouton.textContent);
  ctx.pendingSignup = { smsSeul: true };
  ctx.tcRetourDepuisCode();
  verifie('retour (SMS seul) : le formulaire', ctx.vers === 'auth-signup');
  ctx.pendingSignup = {};
  ctx.tcRetourDepuisCode();
  verifie('retour (ancien parcours) : le choix SMS / e-mail', ctx.vers === 'auth-verify-method');
  vm.runInContext(fonction(page, 'tcNumeroLisible') + '\nthis.tcNumeroLisible = tcNumeroLisible;', ctx);
  verifie('numéro lisible : +33 6 12 34 56 78', ctx.tcNumeroLisible('+33', '06 12 34 56 78') === '+33 6 12 34 56 78', ctx.tcNumeroLisible('+33', '06 12 34 56 78'));
  verifie('numéro lisible : sans le zéro aussi', ctx.tcNumeroLisible('+33', '612345678') === '+33 6 12 34 56 78');
  verifie('numéro lisible : +1 en 3-3-4', ctx.tcNumeroLisible('+1', '4155550123') === '+1 415 555 0123', ctx.tcNumeroLisible('+1', '4155550123'));
  // Examen : flèche retour puis « Continuer » : le code déjà parti resservira (même numéro, même adresse, encore valable).
  vm.runInContext('let _tcCodeEnCours = null;\n' + fonction(page, 'tcRetenirCode') + '\n' + fonction(page, 'tcCodeEncoreValable') + '\nthis.tcRetenirCode = tcRetenirCode; this.tcCodeEncoreValable = tcCodeEncoreValable;', ctx);
  ctx.pendingSignup = { email: 'lea@exemple.fr' };
  ctx.tcRetenirCode('sms', '+33612345678', { reference: 'R1', expire_dans_minutes: 10, renvoi_dans_secondes: 60 });
  const garde = ctx.tcCodeEncoreValable('sms', '+33612345678');
  verifie('retour puis Continuer : le code parti resservira', !!garde && garde.r.reference === 'R1');
  verifie('un autre numéro : nouveau code', ctx.tcCodeEncoreValable('sms', '+33698765432') === null);
  ctx.pendingSignup = { email: 'autre@exemple.fr' };
  verifie('une autre adresse : nouveau code', ctx.tcCodeEncoreValable('sms', '+33612345678') === null);
  ctx.pendingSignup = { email: 'lea@exemple.fr' };
  ctx.tcRetenirCode('sms', '+33612345678', { reference: 'R2', expire_dans_minutes: 0.5, renvoi_dans_secondes: 0 });
  verifie('un code expiré : nouveau code', ctx.tcCodeEncoreValable('sms', '+33612345678') === null);
}

// ─── 2. L'API, lue ────────────────────────────────────────────
const route = (r) => { const i = api.indexOf("case '" + r + "':"); return i < 0 ? '' : api.slice(i, api.indexOf("\n    case '", i + 10)); };
const demander = route('POST /verification/demander');
verifie('numéro fictif de l ARCEP reconnu (06 39 98 xx xx)', api.includes("preg_match('/^\\+3363998[0-9]{4}$/', $e164)"));
for (const c of ['numero_deja_inscrit', 'renvoi_trop_tot', 'pas_un_portable', 'pays_non_pris', 'envois_suspendus', 'sms_max_ip_heure', 'sms_max_numero_jour', 'sms_plafond_jour']) {
  verifie('demander : ' + c, demander.includes(c));
}
verifie('demander : l envoi passe par smsEnvoyer (clés de Configuration IA)', demander.includes('smsEnvoyer($destination') && !demander.includes('Sms::envoyer'));
verifie('demander : un envoi raté ne compte pas', demander.includes("DELETE FROM verifications WHERE reference = ?"));
verifie('inscription : preuve SMS exigée par verification_sms_inscription', route('POST /inscription').includes("'verification_sms_requise'"));
const test = route('POST /test/sms-twilio');
verifie('test SMS : réservé à l administrateur, vers son propre numéro', test.includes("'acces_refuse'") && test.includes("smsEnvoyer((string) $moi['telephone']") && !test.includes('06 07 78 66 26'));
verifie('les clés Twilio de Configuration IA passent avant config.php', /cleAdministrateur\(\$service\)[\s\S]{0,400}'twilio_jeton'[\s\S]{0,200}'twilio_expediteur'/.test(api));

// ─── 3. Le parcours réel, API locale ──────────────────────────
const PHP = '/opt/plesk/php/8.3/bin/php';
const CONF_LOCALE = path.join(os.homedir(), 'api-locale/private/config.php');
const LIB = path.join(path.dirname(apiChemin), '../private/lib.php');

async function attendre(url) {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(url + '/parametres'); if (r.status === 200) return true; } catch (e) { /* pas encore */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

function preparer(T, nom, reglages) {
  const d = path.join(T, nom);
  fs.mkdirSync(path.join(d, 'api'), { recursive: true });
  fs.mkdirSync(path.join(d, 'private/documents'), { recursive: true });
  fs.copyFileSync(apiChemin, path.join(d, 'api/index.php'));
  fs.copyFileSync(LIB, path.join(d, 'private/lib.php'));
  fs.writeFileSync(path.join(d, 'private/config.php'), '<?php\n$c = require ' + JSON.stringify(CONF_LOCALE) + ';\nreturn array_merge($c, ' + reglages + ');\n');
  return d;
}

(async () => {
  if (!fs.existsSync(PHP) || !fs.existsSync(CONF_LOCALE) || !fs.existsSync(LIB)) {
    console.log('  (parcours réel sauté : pas d API locale ici)');
  } else {
    const T = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-'));
    const recus = [];
    const twilio = http.createServer((q, s) => {
      let b = '';
      q.on('data', (x) => { b += x; });
      q.on('end', () => {
        recus.push({ url: q.url, auth: q.headers.authorization || '', corps: Object.fromEntries(new URLSearchParams(b)) });
        s.statusCode = 201;
        s.end('{"sid":"SM0"}');
      });
    });
    await new Promise((r) => twilio.listen(0, '127.0.0.1', r));
    const SID = 'AC' + '0'.repeat(32);
    const commun = "'mode_test' => false, 'verification_sms_inscription' => true, 'twilio_account_sid' => '" + SID + "', 'twilio_auth_token' => 'jeton-de-test', 'twilio_numero_expediteur' => 'TimeCool', 'sms_max_ip_heure' => 1000, 'sms_max_ip_jour' => 1000";
    const A = preparer(T, 'a', "[" + commun + ", 'ip_tests' => ['127.0.0.1'], 'sms_renvoi_secondes' => 60]");
    const B = preparer(T, 'b', "[" + commun + ", 'ip_tests' => [], 'sms_renvoi_secondes' => 0, 'sms_max_numero_heure' => 3]");
    const port = 18100 + Math.floor(Math.random() * 800);
    const env = Object.assign({}, process.env, { TC_SMS_FAUX: 'http://127.0.0.1:' + twilio.address().port });
    const procs = [
      cp.spawn(PHP, ['-S', '127.0.0.1:' + port, path.join(A, 'api/index.php')], { env, stdio: 'ignore' }),
      cp.spawn(PHP, ['-S', '127.0.0.1:' + (port + 1), path.join(B, 'api/index.php')], { env, stdio: 'ignore' }),
    ];
    const UA = 'http://127.0.0.1:' + port, UB = 'http://127.0.0.1:' + (port + 1);
    const hasard = (n) => String(Math.floor(Math.random() * Math.pow(10, n))).padStart(n, '0');
    const N1 = '+337009' + hasard(6), N2 = '+337009' + hasard(6), N3 = '+337009' + hasard(6);
    const F1 = '+3363998' + hasard(4), F2 = '+3363998' + hasard(4), F3 = '+3363998' + hasard(4);
    const appel = async (base, m, chemin, corps, jeton) => {
      const h = { 'Content-Type': 'application/json' };
      if (jeton) h.Authorization = 'Bearer ' + jeton;
      const r = await fetch(base + chemin, { method: m, headers: h, body: corps ? JSON.stringify(corps) : undefined });
      let d = null;
      try { d = await r.json(); } catch (e) { /* vide */ }
      return { code: r.status, d: d || {} };
    };
    const identite = (tel, email) => ({ email, telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Sonde', nom: 'Sms', ville: 'Lyon', code_postal: '69001' });
    const stamp = Date.now();
    try {
      verifie('API locale A prête', await attendre(UA));
      verifie('API locale B prête', await attendre(UB));
      let r = await appel(UA, 'GET', '/parametres');
      verifie('paramètres : SMS exigé, renvoi 60 s', r.d.verification_sms_inscription === true && r.d.sms_renvoi_secondes === 60, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: '+33142000000', but: 'inscription' });
      verifie('un fixe français : « Il faut un numéro de portable »', r.code === 400 && r.d.erreur === 'pas_un_portable', JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: '+8613800000000', but: 'inscription' });
      verifie('un pays hors liste : refusé, sans SMS', r.code === 400 && r.d.erreur === 'pays_non_pris' && recus.length === 0, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/inscription', identite(N1, 'sonde.sms.a' + stamp + '@exemple-timecool.fr'));
      verifie('inscription sans code : refusée (verification_sms_requise)', r.code === 403 && r.d.erreur === 'verification_sms_requise', JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: N1, but: 'inscription' });
      const ref1 = r.d.reference;
      verifie('code demandé : 10 minutes, renvoi dans 60 s, jamais à l écran', r.code === 201 && r.d.expire_dans_minutes === 10 && r.d.renvoi_dans_secondes === 60 && !r.d.code_test, JSON.stringify(r.d));
      const sms = recus[recus.length - 1] || { corps: {}, url: '', auth: '' };
      const code = (/(\d{6})/.exec(sms.corps.Body || '') || [])[1] || '';
      verifie('le SMS part par Twilio : numéro, expéditeur, identifiants', recus.length === 1 && sms.corps.To === N1 && sms.corps.From === 'TimeCool' && sms.url.includes('/Accounts/' + SID + '/Messages.json') && sms.auth === 'Basic ' + Buffer.from(SID + ':jeton-de-test').toString('base64'), JSON.stringify(sms));
      verifie('le SMS dit le code et sa durée', /^TimeCool : ton code est \d{6}\. Il est valable 10 minutes\.$/.test(sms.corps.Body || ''), sms.corps.Body);
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: N1, but: 'inscription' });
      verifie('renvoi trop tôt : attendre une minute', r.code === 429 && r.d.erreur === 'renvoi_trop_tot' && recus.length === 1, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/valider', { reference: ref1, code: code === '000000' ? '111111' : '000000' });
      verifie('code faux : refusé', r.code === 400 && r.d.erreur === 'code_incorrect', JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/valider', { reference: ref1, code });
      const preuve = r.d.preuve;
      verifie('bon code : une preuve', r.code === 200 && !!preuve, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/inscription', Object.assign(identite(N2, 'sonde.sms.b' + stamp + '@exemple-timecool.fr'), { preuve }));
      verifie('la preuve ne vaut que pour son numéro', r.code === 403 && r.d.erreur === 'verification_non_concordante', JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/inscription', Object.assign(identite(N1, 'sonde.sms.a' + stamp + '@exemple-timecool.fr'), { preuve }));
      const jetonA = r.d.session && r.d.session.jeton;
      verifie('avec la preuve : le compte s ouvre', r.code === 201 && !!jetonA, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/inscription', Object.assign(identite(N1, 'sonde.sms.c' + stamp + '@exemple-timecool.fr'), { preuve }));
      verifie('la preuve ne sert qu une fois', r.code === 403, JSON.stringify(r.d));
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: N1, but: 'inscription' });
      verifie('numéro déjà inscrit : dit avant tout SMS', r.code === 409 && r.d.erreur === 'numero_deja_inscrit' && recus.length === 1 && /connecte-toi/.test(r.d.message || ''), JSON.stringify(r.d));
      if (jetonA) {
        r = await appel(UA, 'POST', '/test/sms-twilio', {}, jetonA);
        verifie('test SMS : refusé à un compte ordinaire', r.code === 403 && r.d.erreur === 'acces_refuse' && recus.length === 1, JSON.stringify(r.d));
      }
      // Les comptes de test : numéro fictif + adresse @exemple-timecool.fr + adresse IP de test.
      r = await fetch(UA + '/inscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identite(F1, 'sonde.sms.d' + stamp + '@exemple-timecool.fr')) });
      verifie('compte de test au numéro fictif : ouvert par le code de test, sans SMS', r.status === 201 && recus.length === 1, String(r.status));
      r = await appel(UA, 'POST', '/verification/demander', { canal: 'sms', destination: F2 });
      verifie('numéro fictif depuis une adresse de test : le code à l écran', r.code === 201 && /^\d{6}$/.test(r.d.code_test || '') && recus.length === 1, JSON.stringify(r.d));
      const v2 = await appel(UA, 'POST', '/verification/valider', { reference: r.d.reference, code: r.d.code_test });
      r = await appel(UA, 'POST', '/inscription', Object.assign(identite(F2, 'quelquun' + stamp + '@exemple.fr'), { preuve: v2.d.preuve }));
      verifie('numéro fictif avec une vraie adresse : refusé', r.code === 400 && r.d.erreur === 'telephone_invalide', JSON.stringify(r.d));
      r = await appel(UB, 'POST', '/verification/demander', { canal: 'sms', destination: F3 });
      verifie('numéro fictif hors adresse de test : refusé, sans code', r.code === 400 && r.d.erreur === 'telephone_invalide' && !r.d.code_test, JSON.stringify(r.d));
      const codes = [];
      for (let i = 0; i < 4; i++) codes.push((await appel(UB, 'POST', '/verification/demander', { canal: 'sms', destination: N3 })).code);
      verifie('trois codes par heure et par numéro, pas un de plus', codes.join(',') === '201,201,201,429', codes.join(','));
    } finally {
      // Les API locales restent en route jusqu'à la sortie : le nettoyage des comptes de test (comptes-jetables) passe par elles.
      process.on('exit', () => procs.forEach((p) => p.kill()));
      twilio.close();
      // Les demandes de la suite partent de la base : elles ne comptent pas dans les limites du vrai service.
      const purge = path.join(T, 'purge.php');
      fs.writeFileSync(purge, "<?php\nrequire $argv[1] . '/private/lib.php';\nConf::charger($argv[1] . '/private/config.php');\nforeach (json_decode($argv[2], true) as $d) { Db::req('DELETE FROM verifications WHERE destination = ?', [$d]); }\necho 'ok';\n");
      const p = cp.spawnSync(PHP, [purge, A, JSON.stringify([N1, N2, N3, F1, F2, F3])], { encoding: 'utf8' });
      verifie('les demandes de la suite sont effacées', p.stdout === 'ok', (p.stdout || '') + (p.stderr || ''));
      process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }); } catch (e) { /* rien */ } });
    }
  }
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
