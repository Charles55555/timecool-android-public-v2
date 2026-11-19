// Mission 145 (Charles, 19/11, « 1 vas y ») : sur navigateur (PC, 1920 × 1080), « Importer mes contacts » dans « Mes contacts » :
// - compte de test (adresse qui finit par @exemple-timecool.fr) : aucune fenêtre ; les 8 contacts d'exemple s'ajoutent tout de
//   suite, sans « Lucas » (« Hugo Petit » à sa place) ; message « ✅ 8 contacts importés » (sans « d'exemple ») ; compteur et
//   liste à jour ; un second toucher n'ajoute rien (« Contacts déjà présents ») ; seuls /sync et /contacts/detecter sont appelés
//   (aucun SMS, e-mail ni notification) ;
// - tout autre compte (une autre adresse, même une autre adresse de test, ou une adresse qui contient seulement
//   « @exemple-timecool.fr ») : la même fenêtre, le même texte, et les mêmes 8 contacts (avec Lucas Petit) après « Confirmer » ;
// - l'application Android : le vrai carnet du téléphone, comme avant, même pour un compte de test.
// Usage : node verif-import-test145.js <index.html>   (TC_CHROME ; CAPTURES=<dossier>)
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const portLibre = () => new Promise((ok2) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok2(p)); }); });
const NOMS = ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Bernard', 'Lucas Petit', 'Emma Leroy', 'Thomas Moreau', 'Camille Roux'];
const NOMS_TEST = NOMS.map((n) => (n === 'Lucas Petit' ? 'Hugo Petit' : n));
const TITRE = '📱 Importer mes contacts du téléphone';
const TEXTE = '⚠️ Cette fonctionnalité nécessite l\'application Android officielle.\n\nVeux-tu importer 8 contacts d\'exemple pour tester l\'interface ?';

(async () => {
  const serveur = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/app/' || u === '/app/index.html') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return r.end(page); }
    r.writeHead(404); r.end();
  });
  const pw = await portLibre(); await new Promise((ok2) => serveur.listen(pw, '127.0.0.1', ok2));
  const pd = await portLibre();
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-145-'));
  // Rien ne sort : toute adresse autre que la page locale est introuvable (api.timecool.fr compris).
  const chrome = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--remote-debugging-port=' + pd, '--user-data-dir=' + profil, '--window-size=1920,1080',
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  const R = {};
  let ws = null;
  try {
    let cible = null;
    for (let i = 0; i < 60 && !cible; i++) { try { const l = await (await fetch('http://127.0.0.1:' + pd + '/json/list')).json(); cible = l.find((x) => x.type === 'page'); } catch (e) {} if (!cible) await pause(250); }
    if (!cible) throw new Error('Chrome ne répond pas');
    ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((ok2, ko2) => { ws.onopen = ok2; ws.onerror = ko2; });
    let id = 0; const attente = new Map(); let evts = []; let requetes = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); return; }
      evts.push(d.method);
      if (d.method === 'Network.requestWillBeSent' && /api\.timecool\.fr/.test(d.params.request.url)) requetes.push(d.params.request.method + ' ' + d.params.request.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]);
    };
    const cdp = (method, params = {}) => new Promise((ok2) => { const i = ++id; attente.set(i, ok2); ws.send(JSON.stringify({ id: i, method, params })); });
    const js = async (expr) => { const d = await cdp('Runtime.evaluate', { expression: '(async function () { ' + expr + ' })()', awaitPromise: true, returnByValue: true }); return d.result && d.result.result ? d.result.result.value : { erreur: JSON.stringify(d).slice(0, 300) }; };
    const capture = async (nom) => { if (!process.env.CAPTURES) return; fs.mkdirSync(process.env.CAPTURES, { recursive: true }); const d = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(process.env.CAPTURES, '145-' + nom + '.png'), Buffer.from(d.result.data, 'base64')); };
    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    let avant = null;
    // Une ouverture, connecté au compte donné (jeton factice : rien ne sort), puis « Mes contacts ».
    const ouvrir = async (email, plus) => {
      if (avant) { await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: avant }); avant = null; }
      const compte = JSON.stringify({ firstname: 'Lucas', lastname: 'Essai', email: email, reference: 'REF145' });
      const a = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); localStorage.setItem('timecool_user_account', " + JSON.stringify(compte) + ");"
        + " localStorage.setItem('timecool_session_active', 'true'); localStorage.setItem('tc_onboarding_done', '1'); localStorage.setItem('tc_permissions_shown', '1');"
        + " localStorage.setItem('tc_session_jeton', 'jeton-factice-145'); } catch (e) {}" + (plus || '') });
      avant = a.result && a.result.identifier;
      evts = [];
      await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pw + '/app/' });
      for (let i = 0; i < 80 && !evts.includes('Page.loadEventFired'); i++) await pause(250);
      await pause(2500);
      return js("document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });"
        + " if (typeof hideAuthFlow === 'function') hideAuthFlow(); navigate('contacts'); await new Promise(function (r) { setTimeout(r, 600); });"
        + " return { page: !!document.querySelector('#page-contacts.active'), email: userAccount && userAccount.email, contacts: contactsList.length };");
    };
    // Toucher « Importer mes contacts » (le bouton de la page), puis ce qu'on voit.
    const toucher = () => js("const b = Array.prototype.slice.call(document.querySelectorAll('#contactsContent button')).find(function (x) { return /importPhoneContacts\\(\\)/.test(x.getAttribute('onclick') || ''); });"
      + " if (!b) return { bouton: false }; const texte = b.innerText.trim(); b.click(); await new Promise(function (r) { setTimeout(r, 700); }); return Object.assign({ bouton: texte }, etat());");
    const ETAT = "window.etat = function () { const ov = document.querySelector('.tc-mod-ov'); const c = document.getElementById('contactsContent'); const m = (c ? c.innerText : '').match(/👥\\s*(\\d+)\\s*contacts/);"
      + " const liste = document.getElementById('contactsListContainer'); const t = document.getElementById('toast');"
      + " return { fenetre: !!ov, titre: ov ? (ov.querySelector('.tc-mod-tt') || {}).textContent : null, texte: ov ? (ov.querySelector('.tc-mod-tx') || {}).textContent : null,"
      + " noms: contactsList.map(function (x) { return x.name; }), origines: contactsList.map(function (x) { return x.origine; }).join(','), compteur: m ? Number(m[1]) : null,"
      + " liste: liste ? liste.innerText : '', toast: t ? t.textContent : '', toastVu: !!(t && t.classList.contains('show')), natif: window.__demandes || 0 }; }; return 1;";

    // A. Compte de test : pas de fenêtre, les contacts tout de suite ; un second toucher n'ajoute rien.
    R.ouvreTest = await ouvrir('lucas.essai@exemple-timecool.fr');
    await js(ETAT);
    requetes = [];
    R.test1 = await toucher();
    await capture('1-compte-test');
    await pause(2600);   // la synchronisation part 1,5 s après l'enregistrement
    R.test2 = await toucher();
    R.requetes = requetes.slice();
    // B. Même règle, adresse en majuscules et avec des espaces.
    await ouvrir('  Lucas.Essai@Exemple-Timecool.FR ');
    await js(ETAT);
    R.majuscules = await toucher();
    // C. Compte ordinaire : la même fenêtre, le même texte ; rien avant « Confirmer » ; puis les 8 contacts d'exemple, avec Lucas Petit.
    for (const [cle, email] of [['ordinaire', 'jean.martin@exemple.com'], ['autreTest', 'lucas.essai@exemple-test.fr'], ['piege', 'lucas@exemple-timecool.fr.exemple.com']]) {
      R['ouvre_' + cle] = await ouvrir(email);
      await js(ETAT);
      R[cle] = await toucher();
      if (cle === 'ordinaire') await capture('2-compte-ordinaire');
      R[cle + 'Apres'] = await js("const v = Array.prototype.slice.call(document.querySelectorAll('.tc-mod-ov .tc-mod-bt button')).find(function (x) { return x.textContent.trim() === 'Confirmer'; });"
        + " if (!v) return { confirmer: false }; v.click(); await new Promise(function (r) { setTimeout(r, 700); }); return Object.assign({ confirmer: true }, etat());");
    }
    // D. L'application Android, compte de test : le vrai carnet du téléphone, comme avant.
    await ouvrir('lucas.essai@exemple-timecool.fr', " window.TimeCoolNatif = { estNatif: function () { return true; }, demanderContacts: function () { window.__demandes = (window.__demandes || 0) + 1; } };");
    await js(ETAT);
    R.apk = await toucher();
  } catch (e) { R.erreur = String(e && e.stack || e).slice(0, 400); }
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); serveur.close();
  await pause(300);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}

  const J = (x) => JSON.stringify(x);
  if (R.erreur) verifie('le parcours sans erreur', false, R.erreur);
  const O = R.ouvreTest || {};
  verifie('PC 1920 × 1080, connecté au compte de test : « Mes contacts », vide, avec le bouton « Importer mes contacts »', O.page && O.contacts === 0 && R.test1 && R.test1.bouton === '📱 Importer mes contacts', J([O, R.test1 && R.test1.bouton]));
  const T1 = R.test1 || {}, T2 = R.test2 || {};
  verifie('compte de test : aucune fenêtre ; les 8 contacts d’exemple sont ajoutés tout de suite', T1.fenetre === false && T1.noms && T1.noms.length === 8 && T1.origines === Array(8).fill('exemple').join(','), J(T1));
  verifie('compte de test : pas de « Lucas » parmi eux, « Hugo Petit » à sa place, les autres inchangés', J(T1.noms) === J(NOMS_TEST) && !(T1.noms || []).some((n) => /lucas/i.test(n)), J(T1.noms));
  verifie('compte de test : le message « ✅ 8 contacts importés », sans « d’exemple »', T1.toast === '✅ 8 contacts importés' && T1.toastVu && !/exemple/i.test(T1.toast), J(T1.toast));
  verifie('compte de test : le compteur (« 👥 8 contacts ») et la liste (les 8 noms) sont à jour', T1.compteur === 8 && NOMS_TEST.every((n) => (T1.liste || '').includes(n)), J([T1.compteur, (T1.liste || '').slice(0, 300)]));
  verifie('compte de test, second toucher : aucune fenêtre, aucun doublon (toujours 8), « Contacts déjà présents, rien à ajouter »', T2.fenetre === false && T2.noms && T2.noms.length === 8 && T2.compteur === 8 && /^ℹ️ Contacts déjà présents, rien à ajouter$/.test(T2.toast || ''), J(T2));
  // OPTIONS : la question préalable du navigateur (CORS), qui n'envoie rien.
  const autorise = (x) => /^(GET \/|OPTIONS \/|POST \/sync$|POST \/contacts\/detecter$)/.test(x);
  verifie('compte de test : aucun SMS, e-mail ni notification (vers le serveur, seulement des lectures, /sync et /contacts/detecter)', Array.isArray(R.requetes) && R.requetes.every(autorise), J(R.requetes));
  const M = R.majuscules || {};
  verifie('la même règle pour l’adresse en majuscules, avec des espaces autour', M.fenetre === false && M.noms && M.noms.length === 8 && M.toast === '✅ 8 contacts importés', J(M));
  for (const [cle, libelle] of [['ordinaire', 'compte ordinaire'], ['autreTest', 'autre adresse de test (@exemple-test.fr)'], ['piege', 'adresse qui contient seulement « @exemple-timecool.fr » (…@exemple-timecool.fr.exemple.com)']]) {
    const A = R[cle] || {}, B = R[cle + 'Apres'] || {};
    verifie(libelle + ' : la même fenêtre, le même texte, et rien d’ajouté avant « Confirmer »', A.fenetre === true && A.titre === TITRE && A.texte === TEXTE && A.noms && A.noms.length === 0, J(A));
    verifie(libelle + ' : après « Confirmer », les mêmes 8 contacts d’exemple (avec Lucas Petit), « ✅ 8 contacts d’exemple importés »', B.confirmer && B.fenetre === false && J(B.noms) === J(NOMS) && B.toast === '✅ 8 contacts d\'exemple importés' && B.compteur === 8, J(B));
  }
  const P = R.apk || {};
  verifie('application Android, compte de test : le vrai carnet du téléphone est demandé, comme avant (pas de fenêtre, pas de contacts d’exemple)', P.natif === 1 && P.fenetre === false && P.noms && P.noms.length === 0, J(P));
  if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
