require('./comptes-jetables'); // Mission 70 : les comptes créés ici sont effacés en fin de passage.
// Mission 89 (Charles, 15/11 : « Le nom ? Le prénom ? Adresse email ? No de tel ? ») : à l'inscription, ce qui a déjà un
// compte (l'adresse e-mail, le numéro, ou les deux) se dit sous son champ, avant tout SMS, avec « Me connecter » et
// « Mot de passe oublié » ; le 409 de la création dit lequel des deux est pris.
// Usage : node verif-deja-inscrit-e2e.js <index.html> <backend/api/index.php>
//   TC_API = l'API à interroger (l'API locale en vérification) ; sans elle, la partie e2e n'est pas jouée.
//   TC_CHROME / TC_CAPTURES_89 : parcours dans un vrai Chrome (page locale, serveur simulé) et captures.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
const API = process.env.TC_API || '';
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && d !== '' ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom, prefixe) {
  let d = texte.indexOf((prefixe || 'function ') + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const MSG_EMAIL = 'Cette adresse e-mail a déjà un compte TimeCool.';
const MSG_TEL = 'Ce numéro de portable a déjà un compte TimeCool.';

titre('Côté serveur (lecture)');
const route = (api.match(/case 'POST \/inscription\/controler':[\s\S]*?Rep::ok\(\[[^\n]*/) || [''])[0];
verifie('la route /inscription/controler existe, avant la création du compte', !!route && api.indexOf("case 'POST /inscription/controler':") < api.indexOf("case 'POST /inscription':"));
verifie('elle ne fait que lire (aucun INSERT, aucun SMS, aucune ligne de verifications)', !!route && !/INSERT|UPDATE|DELETE|smsEnvoyer|envoyerEmail/.test(route));
verifie('limite par adresse IP (inscription_controle_ip_heure, 20 par heure par défaut) : 429 au-delà', /Conf::get\('inscription_controle_ip_heure', 20\)/.test(route) && /inscriptionControleCompter\(/.test(route) && /Rep::erreur\(429, 'trop_de_demandes'/.test(route));
const insc = (api.match(/case 'POST \/inscription':[\s\S]*?case 'POST \/connexion':/) || [''])[0];
verifie('le 409 de la création dit lequel est pris (email_deja_inscrit, numero_deja_inscrit), et jamais « cet email ou ce numéro » quand on le sait', insc.indexOf("Rep::erreur(409, 'email_deja_inscrit', '" + MSG_EMAIL + "')") > 0 && insc.indexOf("Rep::erreur(409, 'numero_deja_inscrit', '" + MSG_TEL + "')") > 0 && insc.indexOf("'email_deja_inscrit'") < insc.indexOf("'Un compte existe déjà avec cet email ou ce numéro.'"));
{
  // La limite seule, dans un dossier temporaire : 3 appels permis, le 4e refusé ; une autre adresse IP a son propre compte.
  const f = fonction(api, 'inscriptionControleCompter');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-limite-89-'));
  const php = ['/opt/plesk/php/8.3/bin/php', 'php'].find((p) => { try { cp.execFileSync(p, ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return false; } });
  if (!f || !php) {
    verifie('limite rejouée avec php', !!f && !php ? true : false, !f ? 'fonction absente' : '(php absent : non joué)');
  } else {
    const code = '<?php final class Conf { static function get($k, $d = null) { return $k === "poivre" ? "p" : $d; } }\n' + f
      + '\n$r = []; for ($i = 0; $i < 4; $i++) { $r[] = inscriptionControleCompter($argv[1], "203.0.113.7", 3) ? 1 : 0; }'
      + '\n$r[] = inscriptionControleCompter($argv[1], "203.0.113.8", 3) ? 1 : 0; echo implode(",", $r);';
    const fichier = path.join(dossier, 'limite.php');
    fs.writeFileSync(fichier, code);
    let sortie = '';
    try { sortie = cp.execFileSync(php, [fichier, path.join(dossier, 'limites')], { encoding: 'utf8' }).trim(); } catch (e) { sortie = String(e.message); }
    const noms = fs.existsSync(path.join(dossier, 'limites')) ? fs.readdirSync(path.join(dossier, 'limites')) : [];
    verifie('limite rejouée : 3 appels passent, le 4e est refusé ; une autre IP passe', sortie === '1,1,1,0,1', sortie);
    // Examen : en IPv6, deux adresses du meme /64 comptent ensemble ; un autre /64 et l IPv4 a part.
    const cle = fonction(api, 'inscriptionControleCle');
    let cles = '';
    if (cle) {
      const fc = path.join(dossier, 'cle.php');
      fs.writeFileSync(fc, '<?php ' + cle + '\necho implode(" ", [inscriptionControleCle("2001:db8:1:2::5"), inscriptionControleCle("2001:db8:1:2:ffff::9"), inscriptionControleCle("2001:db8:1:3::5"), inscriptionControleCle("203.0.113.7")]);');
      try { cles = cp.execFileSync(php, [fc], { encoding: 'utf8' }).trim(); } catch (e) { cles = String(e.message); }
    }
    verifie('IPv6 : la limite compte le préfixe /64 (une box en a un entier) ; IPv4 : l adresse exacte', cles === '20010db800010002::/64 20010db800010002::/64 20010db800010003::/64 203.0.113.7' && /inscriptionControleCle\(\$ipC\)/.test(route), cles);
    verifie('le compteur ne garde pas l adresse IP en clair (empreinte)', noms.length === 2 && noms.every((n) => /^inscription-[0-9a-f]{64}-\d{10}$/.test(n) && n.indexOf('203') < 0), noms.join(' '));
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
}

titre('Côté application (lecture et rejeu)');
const sub = fonction(page, 'submitSignup') || '';
verifie('« Continuer » contrôle l adresse et le numéro AVANT pendingSignup, donc avant tout SMS et tout choix de vérification', sub.indexOf('await tcDejaInscritAvantEnvoi(email,') > 0 && sub.indexOf('await tcDejaInscritAvantEnvoi(email,') < sub.indexOf('pendingSignup = {') && sub.indexOf('pendingSignup = {') < sub.indexOf("chooseVerifyMethod('sms')"));
verifie('le numéro refusé à l envoi du code (filet) et le 409 de la création prennent la même présentation', /code === 'numero_deja_inscrit' && pendingSignup/.test(fonction(page, 'tcErreurEnvoiCode') || '') && /e\.code === 'email_deja_inscrit' \|\| e\.code === 'numero_deja_inscrit'/.test(fonction(page, 'tcCreerCompte') || ''));
verifie('les nouveaux textes sont dans le dictionnaire des 16 langues (mission 87)', (() => {
  const m = page.match(/^var TC_ACCUEIL_FR = (\[.*\]);$/m);
  const fr = m ? JSON.parse(m[1]) : [];
  const n = fr.length;
  const langues = [...page.matchAll(/^  ([a-z]{2}): (\[.*\]),?$/gm)].filter((x) => x[2].charAt(1) === '"');
  return [MSG_EMAIL, MSG_TEL, 'Me connecter', 'Mot de passe oublié'].every((t) => fr.indexOf(t) >= 0) && langues.length === 16 && langues.every((x) => JSON.parse(x[2]).length === n);
})());
{
  // Rejeu de tcDejaInscritAvantEnvoi et tcMontrerDejaInscrit avec un faux DOM.
  const elements = {};
  const el = (id) => elements[id] || (elements[id] = { id, value: '', textContent: '', enfants: [], classList: { liste: [], add(c) { this.liste.push(c); }, remove() {}, contains(c) { return this.liste.indexOf(c) >= 0; } }, appendChild(c) { this.enfants.push(c); }, focus() { ctx.focus = id; }, scrollIntoView() {}, style: {} });
  const ctx = {
    console, appels: [], nav: [], focus: null,
    document: { getElementById: (id) => el(id), createElement: () => ({ style: {}, enfants: [], appendChild(c) { this.enfants.push(c); } }) },
    navigateAuth: (p) => ctx.nav.push(p), tcOuvrirOubli: () => ctx.nav.push('auth-oubli'), tcT: (t) => t,
    tcErreurChamp: (champ, zone, msg) => { el('err_' + champ).textContent = msg; },
    TC_BACKEND: { controlerInscription: async (e, t) => { ctx.appels.push([e, t]); return ctx.reponse; } },
  };
  el('page-auth-signup').classList.add('active');
  vm.createContext(ctx);
  vm.runInContext(['tcDejaInscritAvantEnvoi', 'tcMontrerDejaInscrit'].map((n) => fonction(page, n)).join('\n') + '\nvar _tcConnexionPreremplie = "";', ctx);
  (async () => {
    ctx.reponse = { email_deja_inscrit: true, numero_deja_inscrit: false };
    const r1 = await ctx.tcDejaInscritAvantEnvoi('ana@exemple.fr', '+33612345678');
    const z = el('err_signupEmail');
    const barre = z.enfants[0] || { enfants: [] };
    verifie('e-mail pris : on s arrête (true), message sous le champ e-mail, focus sur l e-mail', r1 === true && z.textContent === MSG_EMAIL && ctx.focus === 'signupEmail' && el('err_signupPhone').textContent === '', z.textContent);
    verifie('deux boutons : « Me connecter » (plein) et « Mot de passe oublié »', barre.enfants.length === 2 && barre.enfants[0].textContent === 'Me connecter' && barre.enfants[1].textContent === 'Mot de passe oublié' && barre.enfants.every((b) => b.type === 'button'));
    barre.enfants[0].onclick();
    verifie('« Me connecter » ouvre la connexion avec l adresse retenue', ctx.nav.join() === 'auth-login' && ctx._tcConnexionPreremplie === 'ana@exemple.fr', ctx.nav.join() + ' / ' + ctx._tcConnexionPreremplie);
    barre.enfants[1].onclick();
    verifie('« Mot de passe oublié » ouvre l écran avec l adresse déjà écrite', ctx.nav[1] === 'auth-oubli' && el('oubliTelephone').value === 'ana@exemple.fr');
    ctx.reponse = { email_deja_inscrit: false, numero_deja_inscrit: true }; ctx.focus = null;
    const r2 = await ctx.tcDejaInscritAvantEnvoi('neuve@exemple.fr', '+33612345678');
    verifie('numéro pris : message sous le téléphone, focus sur le téléphone', r2 === true && el('err_signupPhone').textContent === MSG_TEL && ctx.focus === 'signupPhone');
    ctx.reponse = { email_deja_inscrit: false, numero_deja_inscrit: false };
    verifie('rien de pris : on continue (false), comme avant', (await ctx.tcDejaInscritAvantEnvoi('a@b.fr', '+33600000000')) === false);
    ctx.TC_BACKEND.controlerInscription = async () => { throw Object.assign(new Error('x'), { code: 'reseau' }); };
    verifie('panne ou limite : on continue aussi (le serveur garde son filet)', (await ctx.tcDejaInscritAvantEnvoi('a@b.fr', '+33600000000')) === false);
    verifie('la connexion garde l identifiant passé par « Me connecter », sinon elle vide comme avant', /const garde = \(typeof _tcConnexionPreremplie === 'string'\) \? _tcConnexionPreremplie : '';/.test(fonction(page, 'tcViderChampsConnexion') || '') && /\['loginEmail', 'loginPassword'\]/.test(fonction(page, 'tcViderChampsConnexion') || ''));
  })().then(e2e).catch((e) => { verifie('rejeu', false, e.message); e2e(); });
}

async function appel(methode, chemin, corps) {
  const r = await fetch(API + chemin, { method: methode, headers: { 'Content-Type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}

async function e2e() {
  titre('Contre l API (' + (API || 'non jouée : TC_API absent') + ')');
  if (!API) return chrome();
  const base = Date.now();
  const id = { email: 'e2e89a' + base + '@exemple-timecool.fr', telephone: '+3363998' + String(base).slice(-4) };
  const neuf = { email: 'e2e89b' + base + '@exemple-timecool.fr', telephone: '+3363998' + String(base + 7).slice(-4) };
  const sql = (q) => { try { return cp.execFileSync('mysql', ['--no-defaults', '-u', 'claudecode', '-N', '-B', 'timecool_prod', '-e', q], { encoding: 'utf8' }).trim(); } catch (e) { return null; } };
  const compterVerifs = () => sql("SELECT COUNT(*) FROM verifications WHERE destination IN ('" + id.telephone + "','" + neuf.telephone + "','" + id.email + "','" + neuf.email + "')");
  const cree = await appel('POST', '/inscription', { email: id.email, telephone: id.telephone, mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Ana', nom: 'Verif', ville: 'Lyon', code_postal: '69001' });
  verifie('un compte existe (adresse A, numéro A)', cree.code === 201, 'HTTP ' + cree.code + ' ' + JSON.stringify(cree.d).slice(0, 120));
  const avant = compterVerifs();
  const c1 = await appel('POST', '/inscription/controler', { email: id.email, telephone: neuf.telephone });
  verifie('adresse A + numéro neuf : e-mail pris, numéro libre', c1.code === 200 && c1.d.email_deja_inscrit === true && c1.d.numero_deja_inscrit === false, JSON.stringify(c1.d));
  const c1b = await appel('POST', '/inscription/controler', { email: '  ' + id.email.toUpperCase() + ' ', telephone: neuf.telephone });
  verifie('la même adresse en majuscules, avec des espaces : prise aussi', c1b.d && c1b.d.email_deja_inscrit === true, JSON.stringify(c1b.d));
  const c2 = await appel('POST', '/inscription/controler', { email: neuf.email, telephone: id.telephone });
  verifie('adresse neuve + numéro A : numéro pris, e-mail libre', c2.code === 200 && c2.d.email_deja_inscrit === false && c2.d.numero_deja_inscrit === true, JSON.stringify(c2.d));
  const c3 = await appel('POST', '/inscription/controler', { email: id.email, telephone: id.telephone });
  verifie('les deux pris : les deux le disent', c3.d && c3.d.email_deja_inscrit === true && c3.d.numero_deja_inscrit === true);
  const c4 = await appel('POST', '/inscription/controler', { email: neuf.email, telephone: neuf.telephone });
  verifie('cas normal : rien de pris', c4.code === 200 && c4.d.email_deja_inscrit === false && c4.d.numero_deja_inscrit === false, JSON.stringify(c4.d));
  const apres = compterVerifs();
  verifie('aucune ligne ajoutée dans verifications par ces contrôles', avant !== null && avant === apres, avant === null ? '(mysql absent)' : avant + ' → ' + apres);
  const i1 = await appel('POST', '/inscription', { email: id.email, telephone: neuf.telephone, mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Bea', nom: 'Verif', ville: 'Lyon', code_postal: '69001' });
  verifie('filet : créer avec l adresse A → 409 email_deja_inscrit, message exact', i1.code === 409 && i1.d.erreur === 'email_deja_inscrit' && i1.d.message === MSG_EMAIL, JSON.stringify(i1.d));
  const i2 = await appel('POST', '/inscription', { email: neuf.email, telephone: id.telephone, mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Bea', nom: 'Verif', ville: 'Lyon', code_postal: '69001' });
  verifie('filet : créer avec le numéro A → 409 numero_deja_inscrit, message exact', i2.code === 409 && i2.d.erreur === 'numero_deja_inscrit' && i2.d.message === MSG_TEL, JSON.stringify(i2.d));
  const d1 = await appel('POST', '/verification/demander', { canal: 'sms', destination: id.telephone, but: 'inscription' });
  verifie('le code pour le numéro A à l inscription reste refusé (numero_deja_inscrit), sans ligne ajoutée', d1.code === 409 && d1.d.erreur === 'numero_deja_inscrit' && compterVerifs() === apres, JSON.stringify(d1.d));
  const i3 = await appel('POST', '/inscription', { email: neuf.email, telephone: neuf.telephone, mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Bea', nom: 'Verif', ville: 'Lyon', code_postal: '69001' });
  verifie('cas normal inchangé : adresse et numéro neufs → compte créé (201)', i3.code === 201 && i3.d.compte && i3.d.session, 'HTTP ' + i3.code);
  chrome();
}

// Dans un vrai Chrome : le formulaire rempli, « Continuer », serveur simulé (aucun réseau) ; puis les captures.
function chrome() {
  titre('Dans un vrai Chrome sans tête, 390 px (serveur simulé)');
  const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
  if (!exe) { console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)'); return terminer(); }
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-deja-inscrit-'));
  const remplir = `
    window.__appels = [];
    TC_BACKEND.controlerInscription = async function (e, t) { window.__appels.push('controler ' + e + ' ' + t); return window.__reponse; };
    TC_BACKEND.demanderVerification = async function () { window.__appels.push('SMS'); return { reference: 'R', expire_dans_minutes: 10, renvoi_dans_secondes: 60 }; };
    TC_BACKEND.parametres = async function () { window.__appels.push('parametres'); return { verification_sms_inscription: true }; };
    navigateAuth('auth-signup');
    [['signupFirstname', 'Charles'], ['signupLastname', 'Martin'], ['signupEmail', 'charles@exemple.fr'], ['signupPhone', '6 12 34 56 78'], ['signupZip', '75011'], ['signupCity', 'Paris'], ['signupPassword', 'MotDePasse2026!']].forEach(function (x) { document.getElementById(x[0]).value = x[1]; });
    document.getElementById('signupCgu').checked = true;`;
  const sonde = `<script>window.addEventListener('load', function () { setTimeout(function () {
    try { localStorage.setItem('tc_onboarding_done', '1'); } catch (e) {}
    showAuthFlow('auth-welcome');
    const cas = location.hash.slice(1).split('-');
    if (cas[1]) selectLanguage(cas[1]);
    window.__reponse = { email_deja_inscrit: cas[0] === 'email' || cas[0] === 'connexion', numero_deja_inscrit: cas[0] === 'numero' };
    setTimeout(function () {
      ${remplir}
      submitSignup().then(function () { setTimeout(function () {
        if (cas[0] === 'connexion') { document.querySelector('.tc-deja-inscrit button').click(); }
        if (location.search.indexOf('capture') >= 0) { const t = document.getElementById('toast'); if (t) t.classList.remove('show'); return; }
        const z = function (id) { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; };
        const res = { appels: window.__appels, page: (document.querySelector('.auth-page.active') || {}).id, email: z('err_signupEmail'), tel: z('err_signupPhone'),
          boutons: Array.prototype.map.call(document.querySelectorAll('.tc-deja-inscrit button'), function (b) { return b.textContent; }),
          invalide: Array.prototype.map.call(document.querySelectorAll('.champ-invalide'), function (e) { return e.id; }),
          login: (document.getElementById('loginEmail') || {}).value || '' };
        const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
      }, cas[0] === 'connexion' ? 1600 : 400); });
    }, 600);
  }, 1200); });</script>`;
  fs.writeFileSync(path.join(dossier, 'index-local.html'), page.replace('</body>', () => sonde + '</body>'));
  const lancer = (cas) => {
    const r = cp.spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'p-' + cas), '--window-size=390,844', '--virtual-time-budget=20000', '--dump-dom', 'file:///' + path.join(dossier, 'index-local.html').replace(/\\/g, '/') + '#' + cas], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : null; } catch (e) { return null; }
  };
  const e = lancer('email');
  verifie('e-mail pris : aucun SMS, on reste sur l inscription, champ e-mail en évidence, message exact, deux boutons', !!e && e.appels.join() === 'controler charles@exemple.fr +33612345678' && e.page === 'page-auth-signup' && e.email === MSG_EMAIL + 'Me connecterMot de passe oublié' && e.invalide.join() === 'signupEmail' && e.boutons.join() === 'Me connecter,Mot de passe oublié', JSON.stringify(e));
  const n = lancer('numero');
  verifie('numéro pris : aucun SMS, champ téléphone en évidence, message exact, deux boutons', !!n && n.appels.indexOf('SMS') < 0 && n.page === 'page-auth-signup' && n.tel === MSG_TEL + 'Me connecterMot de passe oublié' && n.invalide.join() === 'signupPhone', JSON.stringify(n));
  const l = lancer('libre');
  verifie('rien de pris : le parcours continue comme avant (paramètres, puis le SMS)', !!l && l.appels.join() === 'controler charles@exemple.fr +33612345678,parametres,SMS' && l.page === 'page-auth-verify-code', JSON.stringify(l));
  const c = lancer('connexion');
  verifie('« Me connecter » : écran de connexion, adresse déjà écrite (même après le vidage de l autocomplétion)', !!c && c.page === 'page-auth-login' && c.login === 'charles@exemple.fr', JSON.stringify(c));
  const es = lancer('email-es');
  verifie('en espagnol avant connexion : message et boutons traduits', !!es && es.email === 'Esta dirección de email ya tiene una cuenta TimeCool.Iniciar sesiónContraseña olvidada', es && es.email);
  const sortie = process.env.TC_CAPTURES_89;
  if (sortie) {
    fs.mkdirSync(sortie, { recursive: true });
    ['email', 'numero'].forEach((cas, i) => {
      // Le champ concerné au centre de l'écran (scrollIntoView), comme le verra la personne.
      fs.writeFileSync(path.join(dossier, 'cadre-' + cas + '.html'), '<!doctype html><html><body style="margin:0"><iframe src="index-local.html?capture#' + cas + '" style="border:0;width:390px;height:844px;display:block"></iframe></body></html>');
      const fichier = path.join(sortie, (i + 1) + '-' + (cas === 'email' ? 'adresse-deja-inscrite' : 'numero-deja-inscrit') + '.png');
      cp.spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'c-' + cas), '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=12000', '--screenshot=' + fichier, 'file:///' + path.join(dossier, 'cadre-' + cas + '.html').replace(/\\/g, '/')], { timeout: 120000 });
      verifie('capture ' + path.basename(fichier), fs.existsSync(fichier));
    });
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e2) {}
  terminer();
}
function terminer() {
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
}
