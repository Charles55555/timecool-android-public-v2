// Mission 95 : messagerie : le texte reçu est affiché comme du texte. Un message, un nom ou un titre venus d'un autre compte
// ne deviennent jamais du HTML ; côté serveur, les titres et lieux saisis par un compte et écrits chez un autre sont nettoyés.
// Usage : node verif-messagerie-texte.js <index.html> <backend/api/index.php>   (TC_CHROME : rejeu dans un vrai Chrome)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (page.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}
const PIEGE = '<img src=x onerror="window.__xss=1">';

titre('Dans la page');
const oc = fonction('openConversation') || '';
verifie('un message (reçu ou envoyé) est échappé avant ses retours à la ligne', /\$\{escapeHTMLSafe\(t\.text\)\.replace\(\/\\n\/g,'<br>'\)\}/.test(oc) && !/\$\{t\.text\.replace/.test(oc));
verifie('les messages système aussi, et l heure', (oc.match(/escapeHTMLSafe\(t\.text\)/g) || []).length === 3 && /escapeHTMLSafe\(t\.time\)/.test(oc) && !/>\$\{t\.text\}</.test(oc));
verifie('le nom de l interlocuteur dans la demande de rendez-vous', /\$\{escapeHTMLSafe\(msg\.with\)\} souhaite/.test(oc));
const rm = fonction('renderMessages') || '';
verifie('la liste : le nom, les initiales, l heure, le dernier message, la recherche tapée', /escapeHTMLSafe\(m\.with\)/.test(rm) && /escapeHTMLSafe\(m\.icon\|\|m\.avatar\)/.test(rm) && /escapeHTMLSafe\(last\.time\)/.test(rm) && /escapeHTMLSafe\(last\.text\.substring\(0,60\)\)/.test(rm) && /escapeHTMLSafe\(q\)/.test(rm));
verifie('le texte d origine (traduction) et les cartes reçues restaient déjà échappés', /escapeHTMLSafe\(brut\)/.test(fonction('tcOriginalHTML') || '') && /escapeHTMLSafe\(String\(nom \|\| ''\)/.test(fonction('tcCadreDemandeRdv') || '') && /escapeHTMLSafe\(c\.titre/.test(fonction('tcCadreConvocation') || ''));

titre('La liste des conversations, rejouée');
{
  const liste = { innerHTML: '' };
  const ctx = {
    console, String, Array,
    _msgFilter: 'all',
    window: { innerWidth: 390 },
    document: { getElementById: (id) => (id === 'messagesList' ? liste : id === 'msgSearch' ? { value: '' } : null) },
    tcConversationsAffichables: () => [{ id: 'srv_X', with: 'Eve <b>Pirate</b>', avatar: '<i', icon: '', color: '#123', unread: 0, archived: false, thread: [{ from: 'them', text: PIEGE, time: '<12:00>' }] }],
  };
  vm.createContext(ctx);
  vm.runInContext(fonction('escapeHTMLSafe') + '\n' + (fonction('tcTexteRechercheMessagerie') || '') + '\n' + rm, ctx);
  ctx.renderMessages();
  verifie('le message piégé, le nom et l heure restent du texte (aucune balise)', liste.innerHTML.indexOf('<img') < 0 && liste.innerHTML.indexOf('&lt;img src=x') > -1 && liste.innerHTML.indexOf('<b>Pirate') < 0 && liste.innerHTML.indexOf('&lt;12:00&gt;') > -1, liste.innerHTML);
}

titre('Côté serveur');
verifie('demande de rendez-vous : le titre nettoyé (texteSur)', /\$titre = texteSur\(\(string\) \(Entree::texte\('titre', 200\) \?\? trim\(\$moi\['prenom'\] \. ' ' \. \$moi\['nom'\]\)\)\);/.test(api));
verifie('rendez-vous à plusieurs : le titre donné nettoyé', /\$titreDonne = \$titreDonne === null \? null : \(texteSur\(\$titreDonne\) !== '' \? texteSur\(\$titreDonne\) : null\);/.test(api));
verifie('convocation : le titre nettoyé, à la création et à la confirmation', /\$titre = texteSur\(Entree::requis\('titre', 120\)\);/.test(api) && /\$titre = texteSur\(\(string\) \(Entree::texte\('titre', 120\) \?\? \(string\) \$c\['titre'\]\)\);/.test(api));
verifie('liens et propositions : titre et lieu nettoyés', (api.match(/Entree::texte\('lieu', 255\) === null \? null : texteSur\(Entree::texte\('lieu', 255\)\)/g) || []).length === 2);
verifie('texteSur retire < > " et les caractères de contrôle', /function texteSur\(string \$t\): string\s*\{\s*return trim\(preg_replace\('\/\[<>"\\x00-\\x1F\]\+\/u', '', \$t\) \?\? ''\);/.test(api));

titre('Dans un vrai Chrome (message piégé reçu, rien ne s exécute)');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-messagerie-'));
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    document.querySelectorAll('.auth-page').forEach(function (p) { p.classList.remove('active'); });
    tcPoserConversations([{ reference: 'REFPIEGE', with: 'Eve Pirate', maj: new Date().toISOString(), thread: [
      { from: 'them', le: new Date().toISOString(), texte: ${JSON.stringify(PIEGE)} + '\\nDeuxième ligne' },
      { from: 'system', le: new Date().toISOString(), texte: '<img src=y onerror="window.__xss2=1">' }] }]);
    navigate('messages');
    setTimeout(function () {
      openConversation('srv_REFPIEGE');
      setTimeout(function () {
        var b = document.getElementById('convBody');
        var res = { xss: !!window.__xss || !!window.__xss2, texte: b ? b.textContent : '', br: b ? b.querySelectorAll('.conv-msg br').length : 0, img: b ? b.querySelectorAll('img').length : -1 };
        var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
      }, 600);
    }, 500);
  }, 1200); });</script>`;
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=15000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  verifie('le message piégé et le message système ne s exécutent pas, aucune image n est créée', !!res && res.xss === false && res.img === 0, JSON.stringify(res));
  verifie('ils s affichent comme du texte, et le retour à la ligne reste', !!res && res.texte.indexOf('<img src=x onerror=') > -1 && res.texte.indexOf('Deuxième ligne') > -1 && res.br >= 1, JSON.stringify(res));
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
