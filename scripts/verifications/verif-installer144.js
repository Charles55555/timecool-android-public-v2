// Mission 144 (Charles, 19/11, au PC : il n'a pas trouvé comment installer). Dans Chrome, la page servie sous /app/ :
// - https://…/app/?installer=1 : la carte « Installer TimeCool sur cet appareil », au centre, par-dessus tout (même
//   « Bienvenue ! », sans être connecté ; même l'écran des autorisations) ; le paramètre s'efface de l'adresse ;
// - le navigateur propose l'installation (beforeinstallprompt, même un instant après l'ouverture) : un gros bouton « Installer »
//   qui ouvre sa fenêtre, une fois ; installé : la carte s'en va ; refusé : le geste s'affiche ;
// - sinon, le geste exact : Chrome et Edge sur PC, Safari sur Mac, iPhone (Safari, ou un autre navigateur), Android (Chrome,
//   ou un autre), Firefox (« ne sait pas installer », Chrome ou Edge) ; aucune ligne qui commence par « : » ou « » » ;
// - « Plus tard » ferme la carte pour de bon ; sans ?installer=1, déjà installé, ou dans l'APK : pas de carte ;
// - la ligne du menu (mission 140) est en haut du menu, bien visible ; toujours aucun service worker ni cache.
// Usage : node verif-installer144.js <index.html>   (TC_CHROME ; TC_DEPOT : le dépôt, pour web/app ; CAPTURES=<dossier>)
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
const WEB = path.join(process.env.TC_DEPOT || path.join(__dirname, '../..'), 'web/app');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const types = { '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const portLibre = () => new Promise((ok2) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok2(p)); }); });
const UA = {
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36'
};
// Un faux « beforeinstallprompt », envoyé 500 ms après l'ouverture ; sa réponse (accepted ou dismissed) vient de window.__choix.
const FAUX = "window.__prompts = 0; window.__choix = window.__choix || 'accepted'; window.__evenement = function () { const ev = new Event('beforeinstallprompt', { cancelable: true }); ev.prompt = function () { window.__prompts++; return Promise.resolve(); }; ev.userChoice = new Promise(function (r) { setTimeout(function () { r({ outcome: window.__choix }); }, 50); }); window.dispatchEvent(ev); return ev; };";

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
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-144-'));
  const chrome = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--remote-debugging-port=' + pd, '--user-data-dir=' + profil, '--window-size=390,844',
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  const R = {};
  let ws = null;
  try {
    let cible = null;
    for (let i = 0; i < 60 && !cible; i++) { try { const l = await (await fetch('http://127.0.0.1:' + pd + '/json/list')).json(); cible = l.find((x) => x.type === 'page'); } catch (e) {} if (!cible) await pause(250); }
    if (!cible) throw new Error('Chrome ne répond pas');
    ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((ok2, ko2) => { ws.onopen = ok2; ws.onerror = ko2; });
    let id = 0; const attente = new Map(); let evts = [];
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); } else evts.push(d.method); };
    const cdp = (method, params = {}) => new Promise((ok2) => { const i = ++id; attente.set(i, ok2); ws.send(JSON.stringify({ id: i, method, params })); });
    const js = async (expr) => { const d = await cdp('Runtime.evaluate', { expression: '(async function () { ' + expr + ' })()', awaitPromise: true, returnByValue: true }); return d.result && d.result.result ? d.result.result.value : { erreur: JSON.stringify(d).slice(0, 300) }; };
    const capture = async (nom) => { if (!process.env.CAPTURES) return; fs.mkdirSync(process.env.CAPTURES, { recursive: true }); const d = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(process.env.CAPTURES, '144-' + nom + '.png'), Buffer.from(d.result.data, 'base64')); };
    await cdp('Page.enable'); await cdp('Runtime.enable');
    const version = await cdp('Browser.getVersion');
    const UA_CHROME = ((version.result && version.result.userAgent) || '').replace('HeadlessChrome/', 'Chrome/').replace(/X11; Linux x86_64/, 'Windows NT 10.0; Win64; x64');
    // Une ouverture : la taille, le navigateur, ce qui tourne avant la page, l'adresse ; puis l'attente.
    let avant = null;
    const ouvrir = async (o) => {
      await cdp('Emulation.setDeviceMetricsOverride', o.pc ? { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false } : { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await cdp('Emulation.setUserAgentOverride', { userAgent: o.ua || UA_CHROME });
      if (avant) { await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: avant }); avant = null; }
      const a = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: FAUX + (o.avant || '') });
      avant = a.result && a.result.identifier;
      evts = [];
      await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pw + '/app/' + (o.sans ? '' : '?installer=1') });
      for (let i = 0; i < 80 && !evts.includes('Page.loadEventFired'); i++) await pause(250);
      await pause(o.attente || 2600);
    };
    // Ce que montre la carte.
    const carte = () => js("const c = document.getElementById('tcCarteInstaller144'); const W = innerWidth, H = innerHeight;"
      + " if (!c) return { la: false, adresse: location.search, cartes: document.querySelectorAll('#tcCarteInstaller144').length };"
      + " const boite = c.firstElementChild.getBoundingClientRect(), b = document.getElementById('tcInstaller144'), g = document.getElementById('tcGeste144'), t = document.getElementById('tcPlusTard144');"
      + " const dessus = document.elementFromPoint(Math.round((boite.left + boite.right) / 2), Math.round((boite.top + boite.bottom) / 2));"
      + " const bb = b ? b.getBoundingClientRect() : null, tb = t ? t.getBoundingClientRect() : null;"
      + " return { la: true, adresse: location.search, cartes: document.querySelectorAll('#tcCarteInstaller144').length, titre: document.getElementById('tcCarte144Titre').innerText.trim(), dessus: c.contains(dessus), z: Number(getComputedStyle(c).zIndex),"
      + " centre: Math.abs(boite.left - (W - boite.right)) <= 2 && boite.top >= 0 && boite.bottom <= H, largeur: Math.round(boite.width),"
      + " bouton: b ? { texte: b.innerText.trim(), haut: Math.round(bb.height), large: Math.round(bb.width), police: parseFloat(getComputedStyle(b).fontSize) } : null,"
      + " geste: g ? g.innerText.split(String.fromCharCode(160)).join(' ').replace(/\\s+/g, ' ').trim() : null,"
      + " plusTard: t ? { texte: t.innerText.trim(), police: parseFloat(getComputedStyle(t).fontSize), fond: getComputedStyle(t).backgroundColor } : null,"
      + " bienvenue: !!document.querySelector('#page-auth-welcome.active'), deborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };");

    // A. PC, Chrome, sans proposition du navigateur, pas connecté : par-dessus « Bienvenue ! » ; le geste de Chrome.
    await ouvrir({ pc: true });
    R.pcChrome = await carte();
    R.autorisations = await js("const p = document.getElementById('permissionsScreen'); p.style.display = 'block'; const c = document.getElementById('tcCarteInstaller144').firstElementChild.getBoundingClientRect(); const d = document.elementFromPoint(Math.round((c.left + c.right) / 2), Math.round(c.top + 30)); const v = document.getElementById('tcCarteInstaller144').contains(d); p.style.display = 'none'; return v;");
    R.sw = await js("const r = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : []; const c = window.caches ? await caches.keys() : []; return r.length + ' ' + c.length;");
    await capture('1-pc-chrome');
    // B. Téléphone, Android : le navigateur propose l'installation 500 ms après l'ouverture : le gros bouton, tout de suite.
    await ouvrir({ ua: UA.android, avant: " document.addEventListener('DOMContentLoaded', function () { setTimeout(window.__evenement, 500); });" });
    R.bouton = await carte();
    await capture('2-telephone-bouton');
    R.installe = await js("document.getElementById('tcInstaller144').click(); await new Promise(function (r) { setTimeout(r, 400); }); return { prompts: window.__prompts, carte: !!document.getElementById('tcCarteInstaller144') };");
    // C. Refusé dans la fenêtre du navigateur : la carte reste, avec le geste.
    await ouvrir({ ua: UA.android, avant: " window.__choix = 'dismissed'; document.addEventListener('DOMContentLoaded', function () { setTimeout(window.__evenement, 500); });" });
    R.refuse = await js("document.getElementById('tcInstaller144').click(); await new Promise(function (r) { setTimeout(r, 400); }); const g = document.getElementById('tcGeste144'); return { prompts: window.__prompts, carte: !!document.getElementById('tcCarteInstaller144'), geste: g ? g.innerText.trim().slice(0, 80) : null, bouton: !!document.getElementById('tcInstaller144') };");
    // D. « Plus tard » : la carte s'en va, et ne revient pas quand le navigateur propose ensuite ; la ligne du menu, en haut.
    await ouvrir({});
    R.plusTard = await js("document.getElementById('tcPlusTard144').click(); await new Promise(function (r) { setTimeout(r, 200); }); window.__evenement(); await new Promise(function (r) { setTimeout(r, 300); });"
      + " document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; }); localStorage.setItem('tc_permissions_shown', '1');"
      + " userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' }; hideAuthFlow(); await new Promise(function (r) { setTimeout(r, 800); }); toggleMenu(); await new Promise(function (r) { setTimeout(r, 500); });"
      + " const z = document.getElementById('tcInstaller140'), l = z.firstElementChild, m = document.getElementById('menuItems'), b = z.getBoundingClientRect(), mi = m.getBoundingClientRect(), s = l ? getComputedStyle(l) : null;"
      + " return { carte: !!document.getElementById('tcCarteInstaller144'), ligne: { visible: z.style.display !== 'none' && b.height > 0, texte: z.innerText.trim(), avantMenu: z.nextElementSibling === m && b.bottom <= mi.top + 1, police: s ? parseFloat(s.fontSize) : 0, gras: s ? Number(s.fontWeight) : 0, couleur: s ? s.color : '', fond: s ? s.backgroundColor : '' } };");
    await capture('3-menu-telephone');
    // E. Sans ?installer=1 ; F. déjà installé (ouvert dans sa fenêtre) ; G. dans l'APK : pas de carte.
    await ouvrir({ sans: true });
    R.sans = await carte();
    await ouvrir({ avant: " const mm = window.matchMedia; window.matchMedia = function (q) { return /display-mode: standalone/.test(q) ? { matches: true, addListener: function () {}, addEventListener: function () {} } : mm.call(window, q); };" });
    R.fenetre = await carte();
    await ouvrir({ avant: " window.TimeCoolNatif = { estNatif: function () { return true; } };" });
    R.apk = await carte();
    // H. Le geste exact, navigateur par navigateur (sans proposition du navigateur).
    const gestes = {};
    for (const [cle, o] of [['edge', { pc: true, ua: UA.edge }], ['firefox', { pc: true, ua: UA.firefox }], ['mac', { pc: true, ua: UA.mac }], ['iphone', { ua: UA.iphone }], ['iphoneChrome', { ua: UA.iphoneChrome }], ['android', { ua: UA.android }], ['samsung', { ua: UA.samsung }]]) {
      await ouvrir(o);
      gestes[cle] = await carte();
      // Aucune ligne du geste ne commence par « : », « ; », « ? », « ! » ou « » », ni ne finit par « « » (de 200 à 360 px).
      gestes[cle].coupures = await js("const z = document.getElementById('tcGeste144'); if (!z) return -1; const fautes = []; const r = document.createRange();"
        + " for (let w = 200; w <= 360; w += 2) { z.style.width = w + 'px'; const car = []; const tw = document.createTreeWalker(z, NodeFilter.SHOW_TEXT); let n;"
        + " while ((n = tw.nextNode())) for (let i = 0; i < n.data.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const q = r.getClientRects()[0]; if (q && q.width > 0) car.push({ c: n.data[i], t: q.top }); }"
        + " const lignes = []; car.forEach(function (x) { const l = lignes.find(function (y) { return Math.abs(y.t - x.t) < 6; }); if (l) l.s += x.c; else lignes.push({ t: x.t, s: x.c }); });"
        + " lignes.forEach(function (l) { const s = l.s.replace(/^[\\s\\u00a0]+|[\\s\\u00a0]+$/g, ''); if (/^[:;!?»]/.test(s) || /«$/.test(s)) fautes.push(w + ' px : « ' + s + ' »'); }); }"
        + " z.style.width = ''; return fautes.length ? fautes.slice(0, 3) : 0;");
      if (cle === 'iphone') await capture('4-iphone-safari');
      if (cle === 'firefox') await capture('5-pc-firefox');
    }
    R.gestes = gestes;
  } catch (e) { R.erreur = String(e && e.stack || e).slice(0, 400); }
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); serveur.close();
  await pause(300);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}

  const J = (x) => JSON.stringify(x);
  if (R.erreur) verifie('le parcours sans erreur', false, R.erreur);
  const A = R.pcChrome || {};
  verifie('?installer=1, sans être connecté : la carte « Installer TimeCool sur cet appareil », au centre, par-dessus « Bienvenue ! »', A.la && A.cartes === 1 && A.titre === 'Installer TimeCool sur cet appareil' && A.dessus && A.centre && A.bienvenue, J(A));
  verifie('par-dessus tout, même l’écran des autorisations ; le paramètre s’efface de l’adresse', R.autorisations === true && A.z >= 100000 && A.adresse === '', J([R.autorisations, A.z, A.adresse]));
  verifie('PC, Chrome, sans proposition du navigateur : « Clique sur la petite icône d’écran avec une flèche, à droite de la barre d’adresse, puis sur « Installer » », et le chemin du menu ⋮', !A.bouton && /^Clique sur la petite icône d’écran avec une flèche, à droite de la barre d’adresse, puis sur « Installer »\./.test(A.geste || '') && /Caster, enregistrer et partager/.test(A.geste) && /Installer la page en tant qu’appli/.test(A.geste), A.geste);
  verifie('« Plus tard », discret (14 px au plus, sans fond)', A.plusTard && A.plusTard.texte === 'Plus tard' && A.plusTard.police <= 14 && /rgba\(0, 0, 0, 0\)|transparent/.test(A.plusTard.fond), J(A.plusTard));
  const B = R.bouton || {};
  verifie('le navigateur propose l’installation un instant après l’ouverture : un gros bouton « Installer » (56 px de haut, toute la largeur), sans geste', B.la && B.bouton && B.bouton.texte === 'Installer' && B.bouton.haut >= 52 && B.bouton.police >= 17 && B.bouton.large >= B.largeur - 44 && !B.geste && B.centre && B.deborde <= 0, J(B));
  verifie('le bouton ouvre la fenêtre d’installation du navigateur, une fois ; installé : la carte s’en va', R.installe && R.installe.prompts === 1 && R.installe.carte === false, J(R.installe));
  verifie('refusé dans la fenêtre du navigateur : la carte reste, avec le geste (Android : « Installer et créer un raccourci »)', R.refuse && R.refuse.prompts === 1 && R.refuse.carte && !R.refuse.bouton && /Installer et créer un raccourci/.test(R.refuse.geste || ''), J(R.refuse));
  const D = R.plusTard || {}, L = D.ligne || {};
  verifie('« Plus tard » : la carte s’en va, et ne revient pas quand le navigateur propose ensuite', D.carte === false, J(D));
  verifie('la ligne du menu : en haut du menu, bien visible (15 px, gras, bleue, dans un cadre)', L.visible && /Installer TimeCool sur cet appareil$/.test(L.texte || '') && L.avantMenu && L.police >= 14 && L.gras >= 600 && L.couleur === 'rgb(26, 115, 232)' && L.fond !== 'rgba(0, 0, 0, 0)', J(L));
  verifie('sans ?installer=1, déjà installé (ouvert dans sa fenêtre), dans l’APK : pas de carte', R.sans && !R.sans.la && R.fenetre && !R.fenetre.la && R.apk && !R.apk.la, J([R.sans, R.fenetre, R.apk]));
  const G = R.gestes || {};
  const g = (k) => (G[k] && G[k].geste) || '';
  verifie('Edge sur PC : « Clique sur la petite icône « Application disponible », à droite de la barre d’adresse, puis sur « Installer » »', /^Clique sur la petite icône « Application disponible », à droite de la barre d’adresse, puis sur « Installer »\./.test(g('edge')), g('edge'));
  verifie('Firefox sur PC : « Firefox ne sait pas installer TimeCool », ouvrir dans Chrome ou Edge', /^Firefox ne sait pas installer TimeCool\./.test(g('firefox')) && /Chrome ou Edge/.test(g('firefox')), g('firefox'));
  verifie('Safari sur Mac : « Fichier », « Ajouter au Dock », « Ajouter »', /« Fichier »/.test(g('mac')) && /« Ajouter au Dock »/.test(g('mac')) && /« Ajouter »/.test(g('mac')), g('mac'));
  verifie('iPhone Safari : « Touche Partager, puis « Sur l’écran d’accueil » » ; un autre navigateur sur iPhone : l’ouvrir dans Safari', /^Touche Partager ⬆️, puis « Sur l’écran d’accueil »\./.test(g('iphone')) && /^Ouvre cette page dans Safari\./.test(g('iphoneChrome')) && /Sur l’écran d’accueil/.test(g('iphoneChrome')), J([g('iphone'), g('iphoneChrome')]));
  verifie('Android : Chrome, menu ⋮ puis « Installer et créer un raccourci » ; un autre navigateur (Samsung) : l’ouvrir dans Chrome', /^Touche le menu ⋮ en haut à droite, puis « Installer et créer un raccourci », puis « Installer »\./.test(g('android')) && /^Ouvre cette page dans Chrome\./.test(g('samsung')), J([g('android'), g('samsung')]));
  verifie('chaque carte de geste : au centre, sans débordement ; aucune ligne qui commence par « : » ou « » » (200 à 360 px)', Object.keys(G).length === 7 && Object.values(G).every((x) => x.la && x.centre && x.deborde <= 0 && x.coupures === 0), J(Object.fromEntries(Object.entries(G).map(([k, x]) => [k, [x.la, x.centre, x.deborde, x.coupures]]))));
  verifie('toujours aucun service worker ni cache', R.sw === '0 0', R.sw);
  if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
