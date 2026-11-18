// Mission 119 (Charles, 17/11 20h15) : l'aide de la messagerie s'appelle Maya. Rond rose avec un « M » blanc, accords au
// féminin ; Charly IA (page de l'agenda, éclair doré) ne change pas.
// Usage : node verif-maya.js <index.html>   (TC_CHROME : Chrome sans tête)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 500) : '')); };

console.log('-- Le code --');
const fiche = JSON.parse((page.match(/<script type="application\/json" id="tcFicheHotline">([\s\S]*?)<\/script>/) || [])[1] || '[]');
const textes = fiche.map((e) => [e[1], e[2].join(' / '), e[3]].join(' | '));
verifie('la fiche de la hotline : plus de « Charly, ton aide », ni « Je suis Charly », ni « Je m’appelle Charly »', fiche.length > 200 && !textes.some((t) => /Charly, ton aide|Je suis Charly|Je m’appelle Charly/.test(t)), textes.filter((t) => /Charly, ton aide|Je suis Charly|Je m’appelle Charly/.test(t)).join('\n'));
verifie('la fiche : « Je suis Maya, ton aide TimeCool » et « c’est TimeCool qui m’a créée » (au féminin)', textes.some((t) => /Je suis Maya, ton aide TimeCool/.test(t)) && textes.some((t) => /m’a créée/.test(t)) && !textes.some((t) => /Maya[^|]*m’a créé\./.test(t)));
verifie('la consigne du modèle : « Tu es Maya », au féminin, et Charly IA n’est pas elle', /return 'Tu es Maya, l’aide de l’application TimeCool \(un agenda intelligent\)\. Tu parles de toi au féminin/.test(page) && /Charly IA est l’assistant de l’agenda, sur sa propre page : ce n’est pas toi\./.test(page));
verifie('Charly IA garde son nom : « Je suis Charly, ton assistant TimeCool. » (accueil de la page Charly IA)', /'Je suis Charly, ton assistant TimeCool\.'/.test(page));

console.log('-- Dans la page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow();
    var style = function (el) { if (!el) return null; var c = getComputedStyle(el); return { texte: el.textContent.trim(), fond: c.backgroundColor, couleur: c.color, image: c.backgroundImage }; };
    navigate('messages'); await attendre(500);
    var ligne = document.getElementById('msgCharly');
    R.ligne = ligne ? { nom: (ligne.querySelector('.msg-name') || {}).textContent, avatar: style(ligne.querySelector('.msg-avatar')) } : null;
    tcOuvrirCharlyAide(); await attendre(400);
    R.entete = { nom: document.getElementById('convName').textContent, avatar: style(document.getElementById('convAvatar')) };
    var poser = async function (q) { var i = document.getElementById('convInput'); i.value = q; sendConvMessage(); await attendre(1500); var f = tcFilConvCharly().filter(function (m) { return m.from === 'charly' && !m.exemples; }); return (f[f.length - 1] || {}).text || ''; };
    R.qui = await poser('Qui es-tu ?');
    R.robot = await poser('Bonjour Maya, tu es une IA ?');
    R.bonjour = await poser('Bonjour Maya');
    R.charly = await poser('C’est qui Charly ?');
    // Une conversation avec un contact, juste après : son rond à lui, pas celui de Maya.
    if (typeof openConversation === 'function' && Array.isArray(messages) && messages.length) { try { openConversation(messages[0].id); await attendre(300); R.autre = style(document.getElementById('convAvatar')); } catch (e) {} }
    // Charly IA ne change pas.
    navigate('assistant'); await attendre(400);
    var tete = document.querySelector('#page-assistant');
    R.charlyIA = tete ? tete.innerText.slice(0, 200) : '';
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-119-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
// Contraste WCAG du « M » blanc sur le rose.
const rgb = (t) => (String(t || '').match(/\d+/g) || []).slice(0, 3).map(Number);
const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contraste = (a, b) => { const l1 = lum(rgb(a)), l2 = lum(rgb(b)); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
// Charles, 18/11 : le rond de Maya est celui de Charly IA en rose bonbon : un dégradé, l'éclair jaune au centre (une ombre le garde lisible).
const rose = (a) => !!a && a.texte === '⚡' && /^linear-gradient\(135deg, rgb\(255, 179, 217\), rgb\(224, 69, 123\)\)$/.test(a.image || '');
verifie('l’éclair de Maya garde une ombre légère (lisible sur le rose)', /\.tc-maya-eclair \{ filter:drop-shadow/.test(page));
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else {
  if (S.erreur) verifie('aucune erreur', false, S.erreur);
  verifie('la ligne de la messagerie : « Maya, ton aide TimeCool », rond rose bonbon en dégradé avec l’éclair jaune', S.ligne && S.ligne.nom === 'Maya, ton aide TimeCool' && rose(S.ligne.avatar), JSON.stringify(S.ligne));
  verifie('l’en-tête de sa conversation : le même nom, le même rond', S.entete && S.entete.nom === 'Maya, ton aide TimeCool' && rose(S.entete.avatar), JSON.stringify(S.entete));
  verifie('« Qui es-tu ? » : « Je m’appelle Maya, l’aide de TimeCool »', /^Je m’appelle Maya, l’aide de TimeCool/.test(S.qui), S.qui);
  verifie('« tu es une IA ? » : « créée par TimeCool » (au féminin)', /créée par TimeCool/.test(S.robot), S.robot);
  verifie('« Bonjour Maya » : une réponse aimable', /^Bonjour/.test(S.bonjour), S.bonjour);
  verifie('« C’est qui Charly ? » : Charly IA, l’assistant de l’agenda, et où le trouver ; jamais « Je m’appelle Maya »', /^Charly IA, c’est l’assistant de ton agenda/.test(S.charly) && /« Charly IA »/.test(S.charly) && !/Je m’appelle Maya/.test(S.charly), S.charly);
  verifie('Charly IA garde son nom sur sa page', /Charly IA/.test(S.charlyIA) && !/Maya/.test(S.charlyIA), S.charlyIA);
  if (S.autre) verifie('une conversation avec un contact ensuite : pas le rond de Maya', S.autre.texte !== 'M' || S.autre.fond !== 'rgb(214, 51, 132)', JSON.stringify(S.autre));
}
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
