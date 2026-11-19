// Mission 138 (Charles, 19/11) : dans le menu, la ligne « Charly Pro IA » porte le logo de sa page (le rond dégradé bleu et rouge
// avec l'éclair jaune), à la taille des autres icônes ; la ligne garde son fond bleu ciel ; « Charly IA » ne change pas.
// Usage : node verif-menu-charly-pro138.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); };
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
    tcCharlyPret = function () { return true; };
    hideAuthFlow(); await attendre(200);
    var ligne = function (t) { return Array.prototype.filter.call(document.querySelectorAll('#sideMenu .menu-item'), function (m) { return m.innerText.replace(/\\s+/g, ' ').trim().replace(/^\\S+ /, '') === t || m.innerText.trim().split('\\n').pop() === t; })[0] || null; };
    var mesure = function (el) { if (!el) return null; var r = el.getBoundingClientRect(); return { l: Math.round(r.width), h: Math.round(r.height) }; };
    var lire = function () {
      var pro = ligne('Charly Pro IA'), ia = ligne('Charly IA'), agenda = ligne('Mon agenda');
      var rond = pro ? pro.querySelector('.tc-menu-rond138') : null;
      var cs = rond ? getComputedStyle(rond) : null;
      return { pro: !!pro, rond: !!rond, eclair: rond ? rond.textContent : '', fond: cs ? cs.backgroundImage : '', arrondi: cs ? cs.borderTopLeftRadius : '', taille: mesure(rond),
        icone: agenda ? mesure(agenda.querySelector('span')) : null, ligneFond: pro ? getComputedStyle(pro).backgroundImage : '', bord: pro ? getComputedStyle(pro).borderLeft : '',
        ia: ia ? { html: ia.querySelector('span').outerHTML, rond: !!ia.querySelector('.tc-menu-rond138'), fond: getComputedStyle(ia).backgroundImage } : null,
        texte: pro ? pro.innerText.replace(/\\s+/g, ' ').trim() : '' };
    };
    // Sans la case CHARLY_PRO : pas de ligne « Charly Pro IA » (comme avant).
    FEATURES.CHARLY_PRO = false; renderMenu(); await attendre(100);
    R.eteint = { pro: !!ligne('Charly Pro IA'), ia: !!ligne('Charly IA') };
    FEATURES.CHARLY_PRO = true; renderMenu(); toggleMenu(); await attendre(300);
    R.particulier = lire();
    // Le logo de la page Charly Pro IA (le rond de l'en-tête).
    await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(400);
    var tete = document.querySelector('#page-assistant .msg-avatar.tc-rond-charly');
    R.page = tete ? { fond: getComputedStyle(tete).backgroundImage, eclair: tete.textContent.trim() } : null;
    renderMenu(); await attendre(100);
    R.particulierPro = lire();
    // Le menu « Pro ».
    mode = 'pro'; renderMenu(); await attendre(100);
    R.modePro = lire();
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-138-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur);
else {
  // Le premier ton est un bleu, le second un rouge.
  const bleuRouge = (t) => { const c = (String(t).match(/rgb\((\d+), (\d+), (\d+)\)/g) || []).map((x) => x.match(/\d+/g).map(Number)); return c.length === 2 && c[0][2] > c[0][0] && c[1][0] > c[1][1] && c[1][0] > c[1][2]; };
  verifie('case CHARLY_PRO éteinte : pas de ligne « Charly Pro IA », « Charly IA » est là (comme avant)', S.eteint.pro === false && S.eteint.ia === true, JSON.stringify(S.eteint));
  for (const [nom, X] of [['menu', S.particulier], ['menu, page Charly Pro IA ouverte', S.particulierPro], ['menu Pro', S.modePro]]) {
    verifie(nom + ' : « Charly Pro IA » porte un rond dégradé avec l’éclair ⚡', X.pro && X.rond && X.eclair === '⚡' && /linear-gradient/.test(X.fond) && X.arrondi === '50%' && X.texte === '⚡ Charly Pro IA', JSON.stringify(X).slice(0, 500));
    verifie(nom + ' : le même dégradé que le logo de la page Charly Pro IA (bleu puis rouge)', S.page && X.fond === S.page.fond && S.page.eclair === '⚡' && bleuRouge(X.fond), JSON.stringify([X.fond, S.page]));
    verifie(nom + ' : à la taille des autres icônes (24 px de haut, rond)', X.taille && X.icone && X.taille.l === X.taille.h && Math.abs(X.taille.h - X.icone.h) <= 1 && Math.abs(X.taille.l - X.icone.l) <= 2, JSON.stringify([X.taille, X.icone]));
    verifie(nom + ' : la ligne garde son fond bleu ciel et son bord bleu', /linear-gradient\(90deg, rgb\(225, 245, 254\)/.test(X.ligneFond) && /3px solid rgb\(79, 195, 247\)/.test(X.bord), JSON.stringify([X.ligneFond, X.bord]));
    verifie(nom + ' : « Charly IA » ne change pas (l’éclair seul, son fond jaune)', X.ia && !X.ia.rond && X.ia.html === '<span style="font-size:20px; flex-shrink:0;">⚡</span>' && !/rgb\(225, 245, 254\)/.test(X.ia.fond), JSON.stringify(X.ia));
  }
  verifie('la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
