// Mission 107d (chef, 17/11 : « les six phrases de TikTok marchent pour de vrai ») : un rendez-vous à plusieurs garde ses
// invités (référence, prénom) dans l'agenda de chacun ; « Je suis malade, décale ma journée » (et annuler, le retard) les
// préviennent par la messagerie TimeCool. Décaler : le rendez-vous à plusieurs reste à sa place pour tout le monde.
// Usage : node verif-invites-groupe.js <index.html> [index.php]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const os = require('os');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(__dirname, '../../backend/api/index.php'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 500) : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}

console.log('-- 1. L API : les invités dans le rendez-vous de chacun --');
const conf = api.slice(api.indexOf("case 'POST /rdv/groupe/confirmer':"), api.indexOf('/* Message libre d un compte'));
verifie('/rdv/groupe/confirmer : le rendez-vous porte « invites » (référence, prénom)', /\$entree = static function \(string \$noms, array \$avec = \[\]\)[^{]*\{[\s\S]{0,300}'invites' => \$avec,/.test(conf)
  && /\$personne = static fn\(array \$compte, string \$prenom\): array => \['reference' => \(string\) \$compte\['reference'\], 'prenom' => \$prenom\];/.test(conf));
verifie('/rdv/groupe/confirmer : l organisateur a tous les invités ; chaque invité a l organisateur et les autres (jamais lui-même)', /'contenu'   => \$entree\(implode\(', ', \$prenomsInclus\), \$tous\),/.test(conf)
  && /\$avec = array_merge\(\[\$personne\(\$moi, texteSur\(\(string\) \$moi\['prenom'\]\)\)\],\s+array_values\(array_filter\(\$tous, static fn\(array \$t\): bool => \$t\['reference'\] !== \(string\) \$inv\['compte'\]\['reference'\]\)\)\);/.test(conf));
const convoc = api.slice(api.indexOf("// Mission 107d : les invités, comme /rdv/groupe/confirmer."), api.indexOf("// Mission 107d : les invités, comme /rdv/groupe/confirmer.") + 2500);
verifie('la convocation confirmée (rendez-vous à plusieurs de la messagerie) : les mêmes invités', /'invites' => \$avec,/.test(convoc) && /\$tous = array_map\(\$personne, \$presents\);/.test(convoc)
  && /\$avec = array_merge\(\[\$personne\(\$moi\)\], array_values\(array_filter\(\$tous, static fn\(array \$t\): bool => \$t\['reference'\] !== \(string\) \$m\['reference'\]\)\)\);/.test(convoc));
verifie('aucune migration : le champ vit dans le contenu (JSON) de l élément', !/ALTER TABLE/.test(conf + convoc));

console.log('-- 2. La page : les personnes d un rendez-vous --');
const ctx = { console, Array, Object, String, JSON, contactsList: [{ id: 'c_alice', name: 'Alice Martin', referenceCompte: 'REF-ALICE' }, { id: 'c_paul', name: 'Paul Durand', referenceCompte: 'REF-PAUL' }],
  tcQuestionnaireNoms: (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0] || '') };
vm.createContext(ctx);
const code = ['tcContactDuRdv', 'tcContactsDuRdv', 'tcEstRdvAPlusieurs', 'tcPrenomsInvites'].map(fonction);
verifie('les fonctions sont dans la page', code.every(Boolean), code.map((c) => !!c).join(','));
vm.runInContext(code.join('\n'), ctx);
const g = { invites: [{ reference: 'REF-ALICE', prenom: 'Alice' }, { reference: 'REF-BRUNO', prenom: 'Bruno' }, { reference: 'REF-ALICE', prenom: 'Alice' }, { prenom: 'Sans ref' }] };
ctx.g = g;
const pers = vm.runInContext('tcContactsDuRdv(g)', ctx);
verifie('invités : la fiche du carnet si elle existe, sinon le prénom et la référence (joignable par la messagerie) ; sans doublon ni invité sans référence',
  JSON.stringify(pers.map((c) => c.id + '|' + c.name + '|' + c.referenceCompte)) === JSON.stringify(['c_alice|Alice Martin|REF-ALICE', 'ref:REF-BRUNO|Bruno|REF-BRUNO']), JSON.stringify(pers));
verifie('« Alice et Bruno »', vm.runInContext('tcPrenomsInvites(g)', ctx) === 'Alice et Bruno');
verifie('un rendez-vous avec un contact : ce contact seul, ce n est pas un rendez-vous à plusieurs', vm.runInContext('JSON.stringify(tcContactsDuRdv({ contact: "c_paul", invites: g.invites }).map(function (c) { return c.id; })) === \'["c_paul"]\' && !tcEstRdvAPlusieurs({ contact: "c_paul" }) && tcEstRdvAPlusieurs(g) && !tcEstRdvAPlusieurs({})', ctx) === true);
verifie('le questionnaire compte les invités, et « personne à prévenir » seulement sans personne', /tcContactsDuRdv\(e\)\.forEach\(function \(c\) \{ if \(c && !vus\[c\.id\]\)/.test(fonction('tcQuestionnaireContacts')) && page.indexOf('const sans = r._rdvs.filter(function (e) { return !tcContactsDuRdv(e).length; });') > -1);
verifie('l envoi : chaque invité reçoit le message de chacun de ses rendez-vous', /const siens = touches\.filter\(function \(e\) \{ return tcContactsDuRdv\(e\)\.some\(function \(x\) \{ return x\.id === c\.id; \}\); \}\);/.test(fonction('tcQuestionnaireExecuter')));

console.log('-- 3. Dans la vraie page (Chrome) : malade, décaler puis annuler --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const scenario = (phrase) => `<script>window.addEventListener('load', function () { setTimeout(async function () {
    var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var cliquer = function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); return attendre(1500); };
    var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
    try {
      document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
      localStorage.setItem('tc_permissions_shown', '1');
      window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
      userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
      tcCharlyPret = function () { return true; };
      callAI = async function () { return 'MODELE'; };
      window.__envois = [];
      TC_BACKEND.estConnecte = function () { return true; };
      TC_BACKEND.envoyerMessage = async function (ref, texte) { window.__envois.push(ref + ' : ' + texte); return { ok: true }; };
      TC_BACKEND.propositions = async function () { return []; };
      TC_BACKEND.propositionLibres = async function () { return { libres: [0, 1, 2] }; };
      TC_BACKEND.propositionCreer = async function (c) { window.__envois.push('proposition ' + c.reference); return { rdv_id: 1, creneaux: c.creneaux }; };
      var d = new Date(); d.setDate(d.getDate() + 1);
      var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      contactsList = [{ id: 'c_alice', name: 'Alice Martin', referenceCompte: 'REF-ALICE', isTimeCool: true, phone: '0600000001', categories: [] }, { id: 'c_paul', name: 'Paul Durand', referenceCompte: 'REF-PAUL', isTimeCool: true, phone: '0600000002', categories: [] }];
      events = [
        { id: 'tc_grp_1', mode: 'user', date: iso, startH: 18, startM: 0, endH: 19, endM: 0, title: 'Alice, Bruno', cat: 'amis', invites: [{ reference: 'REF-ALICE', prenom: 'Alice' }, { reference: 'REF-BRUNO', prenom: 'Bruno' }] },
        { id: 'r_paul', mode: 'user', date: iso, startH: 10, startM: 0, endH: 11, endM: 0, title: 'Point avec Paul', cat: 'travail', contact: 'c_paul' },
        { id: 'r_coif', mode: 'user', date: iso, startH: 14, startM: 0, endH: 15, endM: 0, title: 'Coiffeur', cat: 'perso' }
      ];
      charlyIA.history = []; charlyIA._historiqueCharge = true;
      hideAuthFlow();
      await attendre(900);
      document.getElementById('charlyInput').value = ${JSON.stringify(phrase)};
      await charlySendMessage();
      await attendre(1200);
      var R = { recap: charlyIA.history.map(function (m) { return String(m.content || ''); }).join('\\n') };
      await cliquer('Tu les préviens');
      await cliquer('Oui');
      await attendre(2500);   // mission 108 : la bulle, au moins 1 s par étape
      R.bilan = String(charlyIA.history[charlyIA.history.length - 1].content || '');
      R.envois = window.__envois.slice();
      R.groupe = events.filter(function (e) { return e.id === 'tc_grp_1'; }).map(function (e) { return e.date === iso && e.startH === 18; });
      R.iso = iso;
      fin(R);
    } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
  }, 1200); });</script>`;
  const jouer = (phrase) => {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-invites-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => scenario(phrase) + '</body>'));
    const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=40000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };
  const D = jouer('Je suis malade, décale ma journée de demain');
  verifie('décaler : « personne à prévenir » seulement pour le coiffeur ; la carte dit « je les préviens. Il reste à sa place »', /personne à prévenir : « Coiffeur »\./.test(D.recap || '') && !/personne à prévenir[^\n]*Alice/.test(D.recap || '') && /« Alice, Bruno » avec Alice et Bruno : je les préviens\. Il reste à sa place\./.test(D.recap || ''), D.recap || D.erreur);
  verifie('décaler : Alice (fiche) et Bruno (absent du carnet) reçoivent « je dois décaler … Je reviens vers toi très vite avec un autre moment. »', Array.isArray(D.envois)
    && D.envois.some((x) => /^REF-ALICE : Bonjour Alice,\nÀ cause d’un imprévu, je dois décaler notre rendez-vous du .* à 18h00\. Je reviens vers toi très vite avec un autre moment\.$/.test(x))
    && D.envois.some((x) => /^REF-BRUNO : Bonjour Bruno,\nÀ cause d’un imprévu, je dois décaler/.test(x)) && D.envois.indexOf('proposition REF-PAUL') > -1, JSON.stringify(D.envois));
  verifie('décaler : le rendez-vous à plusieurs reste à sa place ; le bilan dit comment en trouver un autre', JSON.stringify(D.groupe) === '[true]' && /« Alice, Bruno » reste à sa place\. Pour un nouveau moment ensemble, dis-moi « Trouve un rendez-vous commun avec Alice et Bruno »\./.test(D.bilan || '') && /Prévenu par la messagerie TimeCool : Alice Martin et Bruno/.test(D.bilan || ''), JSON.stringify([D.groupe, D.bilan]));
  const A = jouer('Je suis malade, annule mes rendez-vous de demain');
  verifie('annuler : supprimé, et Paul, Alice et Bruno reçoivent le message d annulation', Array.isArray(A.envois) && ['REF-PAUL', 'REF-ALICE', 'REF-BRUNO'].every((r) => A.envois.some((x) => x.indexOf(r + ' : ') === 0 && /annuler notre rendez-vous/.test(x))) && JSON.stringify(A.groupe) === '[]', JSON.stringify([A.envois, A.groupe, A.erreur]));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
