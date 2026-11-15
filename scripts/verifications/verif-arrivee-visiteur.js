// Mission 88 (Charles, 15/11) : un visiteur sans compte arrive directement sur « Bienvenue ! », sans l'ecran
// « Commencer » (ni « Rejoins TimeCool » qui le suivait), au premier lancement comme apres une deconnexion.
// Usage : node verif-arrivee-visiteur.js <index.html>
//   (TC_CHROME = chemin de Chrome : ouvre la page avec un stockage vide dans un vrai Chrome sans tete, sans aucun
//    appui ; sans Chrome : partie « non jouee », comme verif-contraste-sombre ; TC_CAPTURES_88 = dossier des captures)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 400) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

titre('Dans la page');
verifie('plus d ecran d accueil intercale (onboardingScreen, ob1/ob2/ob3, « Commencer → »)', page.indexOf('onboardingScreen') < 0 && !/id="ob[123]"/.test(page) && page.indexOf('Commencer &#x2192;') < 0 && !/>Rejoins TimeCool</.test(page));
verifie('ni sa logique (checkOnboarding, goToOb2, goToOb3, finishOnboarding)', !/(checkOnboarding|goToOb2|goToOb3|finishOnboarding)\(/.test(page));
verifie('au demarrage, sans compte : showAuthFlow(« auth-welcome »), comme avant', /const isLoggedIn = loadUserAccount\(\);\nif \(!isLoggedIn\) \{\n  showAuthFlow\('auth-welcome'\);/.test(page));
verifie('« Bienvenue ! » inchange, avec ses trois boutons', /<div style="font-size:22px; font-weight:700; color:var\(--text\); margin-bottom:10px;">Bienvenue !<\/div>/.test(page) && /onclick="signInWithGoogle\(\)"[^>]*>[\s\S]*?Continuer avec Google/.test(page) && /onclick="goToSignup\(\)"[^>]*>\s*✨ Créer mon compte/.test(page) && /onclick="goToLogin\(\)"[^>]*>\s*🔓 J'ai déjà un compte/.test(page));
verifie('la deconnexion ramene toujours sur « Bienvenue ! »', /showAuthFlow\('auth-welcome'\)/.test(page.slice(page.indexOf('function logoutUser('), page.indexOf('function logoutUser(') + 4000)));

titre('Dans un vrai Chrome sans tete, 390 px, stockage vide, aucun appui');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joue : pas de Chrome sur ce poste ; a rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-arrivee-'));
  // Rien n'est cache ni clique : on lit ce que voit le visiteur 3 secondes apres l'ouverture.
  const sonde = `<script>window.addEventListener('load', function () { setTimeout(function () {
    const titre = Array.prototype.find.call(document.querySelectorAll('#page-auth-welcome div'), function (e) { return e.children.length === 0 && e.textContent.trim() === 'Bienvenue !'; });
    let dessus = '';
    if (titre) { const r = titre.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); dessus = e === titre ? 'lui-meme' : (e ? (e.id || e.className || e.tagName) + ' : ' + (e.textContent || '').trim().slice(0, 60) : 'rien'); }
    const commencer = Array.prototype.filter.call(document.querySelectorAll('button, div, span'), function (e) { return e.offsetParent && /Commencer/.test(e.textContent) && e.children.length === 0; }).map(function (e) { return e.textContent.trim(); });
    const res = { stockage: localStorage.getItem('timecool_session_active'), active: (document.querySelector('.auth-page.active') || {}).id || '', titre: !!titre, dessus: dessus, commencer: commencer, boutons: Array.prototype.map.call(document.querySelectorAll('#page-auth-welcome button'), function (b) { return b.textContent.trim(); }).filter(Boolean) };
    const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
  }, 3000); });</script>`;
  fs.writeFileSync(path.join(dossier, 'index-local.html'), page.replace('</body>', () => sonde + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'profil'), '--window-size=390,844', '--virtual-time-budget=15000', '--dump-dom', 'file:///' + path.join(dossier, 'index-local.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : null; } catch (e) { res = null; }
  verifie('la page a rendu ce qu elle montre', !!res, (r.stdout || '').slice(0, 200));
  if (res) {
    verifie('premier ecran : « Bienvenue ! » (page-auth-welcome active), sans compte', res.active === 'page-auth-welcome' && res.titre && res.stockage !== 'true', JSON.stringify(res));
    verifie('rien ne le recouvre : au centre du titre, c est le titre lui-meme', res.dessus === 'lui-meme', res.dessus);
    verifie('aucun « Commencer » visible', res.commencer.length === 0, res.commencer.join(' | '));
    verifie('les trois boutons : Continuer avec Google, Créer mon compte, J ai déjà un compte', res.boutons.some((b) => /Continuer avec Google/.test(b)) && res.boutons.some((b) => /Créer mon compte/.test(b)) && res.boutons.some((b) => /J'ai déjà un compte/.test(b)), res.boutons.join(' | '));
  }
  const sortie = process.env.TC_CAPTURES_88;
  if (sortie) {
    fs.mkdirSync(sortie, { recursive: true });
    fs.writeFileSync(path.join(dossier, 'cadre.html'), '<!doctype html><html><body style="margin:0"><iframe src="index-local.html" style="border:0;width:390px;height:844px;display:block"></iframe></body></html>');
    const fichier = path.join(sortie, '1-arrivee-visiteur-neuf.png');
    spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'profil-capture'), '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=8000', '--screenshot=' + fichier, 'file:///' + path.join(dossier, 'cadre.html').replace(/\\/g, '/')], { timeout: 120000 });
    verifie('capture ' + path.basename(fichier), fs.existsSync(fichier));
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
