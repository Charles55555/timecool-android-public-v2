// Mission 140 (Charles, 19/11, « solution 1 ») : TimeCool s'installe depuis le navigateur (PC : Chrome, Edge ; Android : Chrome,
// Samsung ; iPhone : Safari, à la main). Vérifie :
// - le manifeste (web/app/manifest.json) et ses icônes (les étoiles de l'application, aux bonnes tailles) ; l'en-tête de la page ;
//   l'onglet garde l'horloge ; deployer-web.sh publie le tout avant la page ;
// - dans Chrome, la page servie sous /app/ : le manifeste tel que Chrome le lit, sans erreur, et ses critères d'installation
//   (Chrome sans tête ne lance pas son propre contrôle) ; icônes chargées ; AUCUN service worker ni cache ; la mise à jour par
//   version.json reste la même ;
// - la ligne « Installer TimeCool sur cet appareil » en bas du menu : seulement quand le navigateur le permet, jamais installé,
//   jamais dans l'application Android ; sur iPhone Safari, « Partager, puis Sur l'écran d'accueil ».
// Usage : node verif-installable140.js <index.html>   (TC_CHROME ; CAPTURES=<dossier> : captures 390 px et PC)
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const fichierPage = process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html');
const page = fs.readFileSync(fichierPage, 'utf8');
const DEPOT = path.join(__dirname, '../..');
const WEB = path.join(DEPOT, 'web/app');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('-- Le manifeste, les icônes, la page, la publication --');
let man = null;
try { man = JSON.parse(fs.readFileSync(path.join(WEB, 'manifest.json'), 'utf8')); } catch (e) { man = null; }
const taillePng = (f) => { try { const b = fs.readFileSync(path.join(WEB, f)); return b.slice(1, 4).toString() === 'PNG' ? b.readUInt32BE(16) + 'x' + b.readUInt32BE(20) : 'pas un PNG'; } catch (e) { return 'absente'; } };
verifie('le manifeste : TimeCool, ouvert sur /app/, en fenêtre à part', !!man && man.name === 'TimeCool' && man.short_name === 'TimeCool' && man.id === '/app/' && man.start_url === '/app/' && man.scope === '/app/' && man.display === 'standalone' && man.lang === 'fr' && !man.prefer_related_applications, JSON.stringify(man).slice(0, 300));
const icones = (man && man.icons) || [];
const icone = (taille, but) => icones.find((i) => i.sizes === taille && (i.purpose || 'any') === but && i.type === 'image/png');
verifie('les icônes du manifeste : 192 et 512, plus une masquable de 512, aux vraies tailles', ['192x192:any', '512x512:any', '512x512:maskable'].every((x) => { const [t, b] = x.split(':'); const i = icone(t, b); return i && taillePng(i.src) === t; }), JSON.stringify(icones.map((i) => i.src + ' ' + i.sizes + ' ' + taillePng(i.src))));
verifie('l’icône iPhone (180 px) existe', taillePng('icone-180.png') === '180x180', taillePng('icone-180.png'));
const tete = page.slice(0, page.indexOf('</head>'));
verifie('la page annonce le manifeste et l’icône iPhone (les étoiles)', /<link rel="manifest" href="manifest\.json">/.test(tete) && /<link rel="apple-touch-icon" href="icone-180\.png">/.test(tete) && /apple-mobile-web-app-capable" content="yes"/.test(tete), tete.slice(0, 600));
verifie('l’onglet garde l’horloge (favicon.ico, icon.svg)', /<link rel="icon" href="favicon\.ico" sizes="any">/.test(tete) && /<link rel="icon" type="image\/svg\+xml" href="icon\.svg">/.test(tete));
verifie('aucun service worker dans la page (rien n’est gardé en cache)', !/serviceWorker\s*\.\s*register/.test(page) && !/caches\s*\.\s*open/.test(page));
verifie('la mise à jour par version.json est la même (sans cache)', /fetch\('version\.json\?t=' \+ Date\.now\(\), \{ cache: 'no-store' \}\)/.test(page));
let dep = '';
try { dep = fs.readFileSync(path.join(DEPOT, 'scripts/deployer-web.sh'), 'utf8'); } catch (e) {}
const iBoucle = dep.indexOf('for FICHIER in "$RACINE"/web/app/*'), iPage = dep.indexOf('| tee "$CIBLE/index.html"');
verifie('deployer-web.sh publie web/app/ (tee) avant la page', iBoucle > 0 && iPage > iBoucle && /tee "\$CIBLE\/\$\(basename "\$FICHIER"\)" < "\$FICHIER"/.test(dep), iBoucle + ' ' + iPage);

console.log('-- Dans Chrome, la page servie sous /app/ --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const types = { '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const portLibre = () => new Promise((ok2) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok2(p)); }); });

(async () => {
  const serveur = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/app/' || u === '/app/index.html') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return r.end(page); }
    const nom = u.replace(/^\/app\//, '');
    if (u.startsWith('/app/') && /^[\w.-]+$/.test(nom) && fs.existsSync(path.join(WEB, nom))) { r.writeHead(200, { 'Content-Type': types[path.extname(nom)] || 'application/octet-stream' }); return r.end(fs.readFileSync(path.join(WEB, nom))); }
    r.writeHead(404); r.end();
  });
  const pw = await portLibre(); await new Promise((ok2) => serveur.listen(pw, '127.0.0.1', ok2));
  const pd = await portLibre();
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-140-'));
  const chrome = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + pd, '--user-data-dir=' + profil, '--window-size=390,844',
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  const R = {};
  let ws = null;
  try {
    let cible = null;
    for (let i = 0; i < 60 && !cible; i++) { try { const l = await (await fetch('http://127.0.0.1:' + pd + '/json/list')).json(); cible = l.find((x) => x.type === 'page'); } catch (e) {} if (!cible) await pause(250); }
    if (!cible) throw new Error('Chrome ne répond pas');
    ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((ok2, ko2) => { ws.onopen = ok2; ws.onerror = ko2; });
    let id = 0; const attente = new Map(); const evts = [];
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); } else evts.push(d.method); };
    const cdp = (method, params = {}) => new Promise((ok2) => { const i = ++id; attente.set(i, ok2); ws.send(JSON.stringify({ id: i, method, params })); });
    const js = async (expr) => { const d = await cdp('Runtime.evaluate', { expression: '(async function () { ' + expr + ' })()', awaitPromise: true, returnByValue: true }); return d.result && d.result.result ? d.result.result.value : { erreur: JSON.stringify(d).slice(0, 300) }; };
    const capture = async (nom) => { if (!process.env.CAPTURES) return; fs.mkdirSync(process.env.CAPTURES, { recursive: true }); const d = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(process.env.CAPTURES, '140-' + nom + '.png'), Buffer.from(d.result.data, 'base64')); };
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pw + '/app/' });
    for (let i = 0; i < 80 && !evts.includes('Page.loadEventFired'); i++) await pause(250);
    await pause(3000);
    // Chrome sans tête ne lance pas son propre contrôle d'installation (liste d'erreurs vide même sans manifeste) : on lit le
    // manifeste tel que Chrome le comprend, et on vérifie ses critères un par un, icônes chargées pour de vrai.
    const am = await cdp('Page.getAppManifest');
    const mm = (am.result && am.result.manifest) || {};
    R.manifeste = am.result ? { url: am.result.url, erreurs: am.result.errors, nom: mm.name, court: mm.shortName, affichage: mm.display, depart: mm.startUrl, portee: mm.scope, id: mm.id, prefere: mm.preferRelatedApplications, icones: (mm.icons || []).map(function (i) { return i.url + ' ' + i.sizes; }) } : am;
    R.iconesChargees = await js("return await Promise.all(" + JSON.stringify((mm.icons || []).map((i) => i.url)) + ".map(function (u) { return new Promise(function (r) { const i = new Image(); i.onload = function () { r(i.naturalWidth + 'x' + i.naturalHeight); }; i.onerror = function () { r('erreur'); }; i.src = u; }); }));");
    R.securise = await js("return window.isSecureContext;");
    R.sw = await js("const r = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : []; const c = window.caches ? await caches.keys() : []; return r.length + ' ' + c.length;");
    // La ligne du menu. On part sans événement du navigateur (celui de Chrome, s'il est venu, est mis de côté).
    R.sansEvenement = await js("_tcInstall140 = null; tcMajInstaller140(); const z = document.getElementById('tcInstaller140'); return z ? z.style.display + '|' + z.innerText : 'absente';");
    R.avecEvenement = await js(
      "window.__prompts = 0; const ev = new Event('beforeinstallprompt', { cancelable: true }); ev.prompt = function () { window.__prompts++; return Promise.resolve(); }; ev.userChoice = Promise.resolve({ outcome: 'dismissed' });"
      + " window.dispatchEvent(ev); document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; }); localStorage.setItem('tc_permissions_shown', '1');"
      + " userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' }; hideAuthFlow(); await new Promise(function (r) { setTimeout(r, 900); }); toggleMenu(); await new Promise(function (r) { setTimeout(r, 500); });"
      + " const z = document.getElementById('tcInstaller140'), m = document.getElementById('menuItems'), b = z.getBoundingClientRect(), menu = document.getElementById('sideMenu').getBoundingClientRect();"
      + " return { retenu: ev.defaultPrevented, visible: z.style.display !== 'none' && b.height > 0, texte: z.innerText.trim(), apresMenu: m.nextElementSibling === z, dansMenu: b.left >= menu.left - 1 && b.right <= menu.right + 1, police: parseFloat(getComputedStyle(z.firstElementChild).fontSize) };");
    await js("const z = document.getElementById('tcInstaller140'); z.scrollIntoView({ block: 'end' }); return 1;");
    await capture('1-menu-telephone');
    R.geste = await js("document.querySelector('#tcInstaller140 [role=button]').click(); await new Promise(function (r) { setTimeout(r, 300); }); return { prompts: window.__prompts, cachee: document.getElementById('tcInstaller140').style.display === 'none' };");
    const bip = "const ev = new Event('beforeinstallprompt', { cancelable: true }); ev.prompt = function () { return Promise.resolve(); }; ev.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(ev);";
    R.installee = await js(bip + " window.dispatchEvent(new Event('appinstalled')); return document.getElementById('tcInstaller140').style.display;");
    R.fenetre = await js("const mm = window.matchMedia; window.matchMedia = function (q) { return /display-mode: standalone/.test(q) ? { matches: true } : mm.call(window, q); }; " + bip + " const v = document.getElementById('tcInstaller140').style.display; window.matchMedia = mm; _tcInstall140 = null; tcMajInstaller140(); return v;");
    R.apk = await js("window.TimeCoolNatif = { estNatif: function () { return true; } }; " + bip + " const v = document.getElementById('tcInstaller140').style.display; delete window.TimeCoolNatif; _tcInstall140 = null; tcMajInstaller140(); return v;");
    R.iphone = await js("Object.defineProperty(navigator, 'userAgent', { configurable: true, get: function () { return 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'; } }); _tcInstall140 = null; tcMajInstaller140(); const z = document.getElementById('tcInstaller140'); return { visible: z.style.display !== 'none', texte: z.innerText.trim(), bouton: !!z.querySelector('[role=button]') };");
    await js("document.getElementById('tcInstaller140').scrollIntoView({ block: 'end' }); return 1;");
    await capture('2-menu-iphone');
    R.iphoneChrome = await js("Object.defineProperty(navigator, 'userAgent', { configurable: true, get: function () { return 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1'; } }); tcMajInstaller140(); return document.getElementById('tcInstaller140').style.display;");
    R.deborde = await js("return document.documentElement.scrollWidth - document.documentElement.clientWidth;");
    // Sur PC (1280 px), avec l'événement de Chrome ou d'Edge.
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    R.pc = await js("delete navigator.userAgent; " + bip + " await new Promise(function (r) { setTimeout(r, 300); }); const z = document.getElementById('tcInstaller140'); z.scrollIntoView({ block: 'end' }); return { visible: z.style.display !== 'none', texte: z.innerText.trim(), deborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };");
    await capture('3-menu-pc');
  } catch (e) { R.erreur = String(e && e.stack || e).slice(0, 400); }
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); serveur.close();
  await pause(300);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}

  if (R.erreur) verifie('le parcours sans erreur', false, R.erreur);
  const M = R.manifeste || {};
  verifie('Chrome lit le manifeste sans erreur, depuis /app/manifest.json', /\/app\/manifest\.json$/.test(M.url || '') && Array.isArray(M.erreurs) && M.erreurs.length === 0, JSON.stringify(M));
  verifie('les critères d’installation de Chrome : nom, départ et portée /app/, fenêtre à part, pas d’appli « préférée »', M.nom === 'TimeCool' && M.affichage === 'kStandalone' && /\/app\/$/.test(M.depart || '') && /\/app\/$/.test(M.portee || '') && /\/app\/$/.test(M.id || '') && M.prefere === false && R.securise === true, JSON.stringify([M, R.securise]));
  verifie('ses icônes se chargent, aux tailles annoncées (192, 512, 512)', Array.isArray(R.iconesChargees) && JSON.stringify(R.iconesChargees) === JSON.stringify(['192x192', '512x512', '512x512']), JSON.stringify([R.iconesChargees, M.icones]));
  verifie('aucun service worker, aucun cache après l’ouverture', R.sw === '0 0', R.sw);
  verifie('sans proposition du navigateur, pas de ligne', R.sansEvenement === 'none|', R.sansEvenement);
  const A = R.avecEvenement || {};
  verifie('le navigateur le permet : « Installer TimeCool sur cet appareil » en bas du menu, discrète ; son petit bandeau est retenu', A.retenu === true && A.visible === true && /Installer TimeCool sur cet appareil$/.test(A.texte || '') && A.apresMenu === true && A.dansMenu === true && A.police <= 13, JSON.stringify(A));
  verifie('le geste ouvre la fenêtre d’installation du navigateur, une fois ; la ligne s’en va', R.geste && R.geste.prompts === 1 && R.geste.cachee === true, JSON.stringify(R.geste));
  verifie('déjà installé (appinstalled, ou ouvert dans sa fenêtre) : pas de ligne', R.installee === 'none' && R.fenetre === 'none', R.installee + ' ' + R.fenetre);
  verifie('dans l’application Android : pas de ligne', R.apk === 'none', R.apk);
  verifie('iPhone Safari : la ligne explique « Partager, puis Sur l’écran d’accueil » ; Chrome sur iPhone : rien', R.iphone && R.iphone.visible && /Installer TimeCool sur cet appareil/.test(R.iphone.texte) && /Partager/.test(R.iphone.texte) && /Sur l’écran d’accueil/.test(R.iphone.texte) && !R.iphone.bouton && R.iphoneChrome === 'none', JSON.stringify([R.iphone, R.iphoneChrome]));
  verifie('sur PC (1280 px) : la ligne est là ; rien ne déborde (390 et 1280 px)', R.pc && R.pc.visible && /Installer TimeCool sur cet appareil/.test(R.pc.texte) && R.pc.deborde <= 0 && R.deborde <= 0, JSON.stringify([R.pc, R.deborde]));
  console.log('verif-installable140 : ' + ok + ' OK, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})();
