// Chef, 22/11/2026 (ok de Charles) : « remets-les » marche après une fermeture de l'appli. Charly se souvient de son dernier
// déplacement (ou de sa dernière suppression) sur l'appareil, pour ce compte, 48 heures, y compris le lendemain matin. Ce qui ne
// peut plus être remis est dit, rendez-vous par rendez-vous (supprimé ou changé depuis, place prise, place déjà passée, plus de
// deux jours) ; le reste est remis. Rien de gardé (autre appareil, autre compte) : une réponse claire, jamais le modèle.
// 1. Le vrai parcours dans Chrome, sans réseau : « Je suis malade, décale tous mes rendez-vous de demain » → « Oui, vas-y » le
//    dimanche soir ; Chrome FERMÉ puis relancé sur le même profil (l'appli fermée puis rouverte), le lundi 7h30 : « remets-les ».
// 2. Les cas limites, mémoire vidée comme à une fermeture.
// Examen : le souvenir est chiffré avec la clé de l'appareil (aucun titre ni note en clair) et ne voyage jamais à l'appairage.
// Usage : node verif-remets-les.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 500) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
}

const R = (id, date, h, m, h2, m2, title) => ({ id: 'vr_' + id, date, startH: h, startM: m, endH: h2, endM: m2, title, cat: 'blue', mode: 'user', calendarId: 'cal_default' });
const SEMAINE = [
  R('lun1', '2026-11-23', 9, 0, 10, 0, 'Réunion d’équipe'), R('lun2', '2026-11-23', 14, 0, 15, 0, 'Dentiste'), R('lun3', '2026-11-23', 19, 0, 20, 30, 'Foot entre amis'),
  R('mar1', '2026-11-24', 8, 30, 9, 30, 'Point projet'), R('mar2', '2026-11-24', 12, 30, 13, 30, 'Déjeuner avec Léa'), R('mar3', '2026-11-24', 17, 0, 17, 30, 'Pressing')
];
const DIMANCHE = '2026-11-22T20:00:00', LUNDI_MATIN = '2026-11-23T07:30:00';

/** Dans la page : 1er lancement de Chrome = le dimanche soir ; 2e lancement, même profil = le lundi matin, puis les cas limites. */
async function dansLaPage(D) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const fin = (res) => { const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  const boutons = () => Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter((x) => !x.disabled && x.offsetParent).map((x) => x.innerText.trim());
  const cle = 'timecool_charly_marche_arriere';
  const place = (e) => e ? e.date + ' ' + e.startH + 'h' + (e.startM ? String(e.startM).padStart(2, '0') : '') + '-' + e.endH + 'h' + (e.endM ? String(e.endM).padStart(2, '0') : '') : 'absent';
  const ou = (id) => place(events.find((e) => e && e.id === id));
  let modele = 0;
  const preparer = async () => {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    if (typeof hideAuthFlow === 'function') hideAuthFlow();
    tcCharlyPret = function () { return true; };
    const neutre = callAI;
    callAI = async function () { modele++; return neutre.apply(this, arguments); };
    navigate('assistant'); await attendre(900);
    document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
  };
  const taper = async (t) => {
    const n = charlyIA.history.length, m0 = modele;
    document.getElementById('charlyInput').value = t; await charlySendMessage(); await attendre(2500);
    return { msgs: charlyIA.history.slice(n).filter((m) => m && m.role !== 'user').map((m) => String(m.content || '').replace(/<[^>]+>/g, ' ')), modele: modele > m0 };
  };
  try {
    const phase = localStorage.getItem('__phase') || '1';
    await preparer();
    if (phase === '1') {
      const r1 = {};
      events = events.filter((e) => e && !/^vr_/.test(String(e.id)) && (e.allDay || /^bh_|^fete|ferie/i.test(String(e.id))));
      D.semaine.forEach((e) => events.push(Object.assign({}, e)));
      await saveEventsToStorage();
      charlyIA.history = []; renderCharlyChat();
      r1.carte = await taper('Je suis malade, décale tous mes rendez-vous de demain');
      r1.boutons = boutons();
      const oui = Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter((x) => !x.disabled && x.offsetParent && /Oui, vas-y/.test(x.innerText)).pop();
      if (oui) { const n = charlyIA.history.length; oui.click(); await attendre(4000); r1.fait = charlyIA.history.slice(n).map((m) => String(m.content || '').replace(/<[^>]+>/g, ' ')); }
      r1.apres = ['lun1', 'lun2', 'lun3'].map((x) => ou('vr_' + x));
      await attendre(400);
      try {
        const brut = localStorage.getItem(cle) || '', g = JSON.parse(brut || 'null'), m = g && g.chiffre ? JSON.parse((await tcDecrypt(g.chiffre)) || 'null') : null;
        r1.garde = g && { compte: g.compte, chiffre: /^tcenc:/.test(g.chiffre || ''), clair: /Réunion|Dentiste|Foot/.test(brut), n: m && m.rdvs.length, apres: !!m && m.rdvs.every((r) => r.apres && r.title), t: !!(m && m.t) && m.t === g.t };
      } catch (e) { r1.garde = String(e); }
      await saveEventsToStorage(); await attendre(500);
      localStorage.setItem('__res1', JSON.stringify(r1));
      localStorage.setItem('__phase', '2');
      localStorage.setItem('__horloge', D.lundiMatin);
      fin({ phase1: true });
      return;
    }
    // ── 2e lancement : l'appli rouverte, le lundi 7h30 ──
    const res = { r1: JSON.parse(localStorage.getItem('__res1') || 'null'), cas: {} };
    const C = res.cas;
    C.reouverture = { memoire: typeof _tcMarcheArriere !== 'undefined' && _tcMarcheArriere === null, avant: ['lun1', 'lun2', 'lun3'].map((x) => ou('vr_' + x)), cle: !!localStorage.getItem(cle) };
    C.remets = await taper('remets-les');
    C.remets.apres = ['lun1', 'lun2', 'lun3'].map((x) => ou('vr_' + x));
    C.remets.cle = !!localStorage.getItem(cle);
    C.encore = await taper('remets-les');
    // Une fermeture : la mémoire de la page se vide, l'appareil garde.
    const fermer = async () => { await attendre(400); _tcMarcheArriere = null; };
    const poser = async (liste) => { events = events.filter((e) => e && !/^vx_/.test(String(e.id))); liste.forEach((e) => events.push(Object.assign({ cat: 'blue', mode: 'user', calendarId: 'cal_default' }, e))); await saveEventsToStorage(); };
    const X = (id, date, h, m, h2, m2, title) => ({ id: 'vx_' + id, date, startH: h, startM: m, endH: h2, endM: m2, title });
    const vers = (id, date, h, m, h2, m2) => ({ ev: events.find((e) => e.id === 'vx_' + id), p: { date, startH: h, startM: m, endH: h2, endM: m2 } });
    // Les cas : supprimé, changé à la main, place prise, intact.
    await poser([X('a', '2026-11-23', 10, 0, 11, 0, 'Rdv A'), X('b', '2026-11-23', 11, 0, 12, 0, 'Rdv B'), X('c', '2026-11-23', 15, 0, 16, 0, 'Rdv C'), X('d', '2026-11-23', 17, 0, 18, 0, 'Rdv D')]);
    tcAppliquerDeplacement([vers('a', '2026-11-25', 8, 0, 9, 0), vers('b', '2026-11-25', 9, 0, 10, 0), vers('c', '2026-11-25', 10, 0, 11, 0), vers('d', '2026-11-25', 11, 0, 12, 0)], { silencieux: true });
    await fermer();
    events = events.filter((e) => e.id !== 'vx_b');
    Object.assign(events.find((e) => e.id === 'vx_c'), { startH: 14, endH: 15 });
    events.push({ id: 'vx_plombier', date: '2026-11-23', startH: 17, startM: 0, endH: 17, endM: 30, title: 'Plombier', cat: 'blue', mode: 'user', calendarId: 'cal_default' });
    await saveEventsToStorage();
    C.partiel = await taper('remets-les');
    C.partiel.places = ['a', 'b', 'c', 'd'].map((x) => ou('vx_' + x));
    // Une place déjà passée : le lundi 15h30.
    window.__tcHorloge('2026-11-23T15:30:00');
    await poser([X('e', '2026-11-23', 9, 0, 10, 0, 'Rdv E'), X('f', '2026-11-23', 14, 0, 15, 0, 'Rdv F'), X('g', '2026-11-23', 21, 0, 22, 0, 'Rdv G')]);
    tcAppliquerDeplacement([vers('e', '2026-11-26', 9, 0, 10, 0), vers('f', '2026-11-26', 10, 0, 11, 0), vers('g', '2026-11-26', 11, 0, 12, 0)], { silencieux: true });
    await fermer();
    C.passe = await taper('remets-les');
    C.passe.places = ['e', 'f', 'g'].map((x) => ou('vx_' + x));
    // Plus de deux jours.
    window.__tcHorloge('2026-11-23T08:00:00');
    await poser([X('h', '2026-11-27', 9, 0, 10, 0, 'Rdv H')]);
    tcAppliquerDeplacement([vers('h', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    await fermer();
    window.__tcHorloge('2026-11-25T09:00:00');
    C.vieux = await taper('remets-les');
    C.vieux.place = ou('vx_h'); C.vieux.cle = !!localStorage.getItem(cle);
    C.vieuxEncore = await taper('remets-les');
    // Un autre compte sur le même appareil (le souvenir gardé est à son nom), puis le bon compte. (Changer le compte de la page en
    // cours lançait la remise à zéro de la synchronisation, qui ne finissait pas sans réseau : c'est le souvenir qui change de nom.)
    window.__tcHorloge('2026-11-23T08:00:00');
    await poser([X('i', '2026-11-27', 9, 0, 10, 0, 'Rdv I')]);
    tcAppliquerDeplacement([vers('i', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    await fermer();
    const garde = localStorage.getItem(cle) || '';
    localStorage.setItem(cle, garde.replace('"compte":"REFESSAIREMETS"', '"compte":"AUTRECOMPTE"'));
    C.autreCompte = await taper('remets-les');
    await fermer();
    localStorage.setItem(cle, garde);
    C.bonCompte = await taper('remets-les');
    C.bonCompte.place = ou('vx_i');
    // Un second appareil : rien de gardé ici.
    await poser([X('j2', '2026-11-27', 9, 0, 10, 0, 'Rdv J2')]);
    tcAppliquerDeplacement([vers('j2', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    await fermer(); localStorage.removeItem(cle);
    C.autreAppareil = await taper('remets-les');
    C.autreAppareil.place = ou('vx_j2');
    // Une suppression, puis la place de l'un prise.
    await poser([X('j', '2026-11-27', 10, 0, 11, 0, 'Rdv J'), X('k', '2026-11-27', 12, 0, 13, 0, 'Rdv K')]);
    tcSupprimerRdvs(events.filter((e) => e.id === 'vx_j' || e.id === 'vx_k'), { silencieux: true });
    await fermer();
    events.push({ id: 'vx_visite', date: '2026-11-27', startH: 12, startM: 0, endH: 12, endM: 30, title: 'Visite', cat: 'blue', mode: 'user', calendarId: 'cal_default' });
    C.suppression = await taper('remets-les');
    C.suppression.places = ['j', 'k'].map((x) => ou('vx_' + x));
    // Examen : un rendez-vous supprimé n'est jamais lisible en clair sur l'appareil (titre, notes), et revient intact.
    events = events.filter((e) => e && !/^vx_/.test(String(e.id)));
    events.push({ id: 'vx_psy', date: '2026-11-27', startH: 16, startM: 0, endH: 17, endM: 0, title: 'Psychiatre Dr Essai', notes: 'note secrète essai', cat: 'blue', mode: 'user', calendarId: 'cal_default' });
    await saveEventsToStorage();
    tcSupprimerRdvs(events.filter((e) => e.id === 'vx_psy'), { silencieux: true });
    await attendre(400);
    const brutPsy = localStorage.getItem(cle) || '';
    C.prive = { garde: !!brutPsy, titre: /Psychiatre/.test(brutPsy), notes: /note secr/.test(brutPsy), chiffre: /tcenc:/.test(brutPsy) };
    await fermer();
    Object.assign(C.prive, await taper('remets-les'));
    const psy = events.find((e) => e && e.id === 'vx_psy');
    C.prive.revenu = psy ? psy.title + ' / ' + psy.notes + ' / ' + place(psy) : 'absent';
    C.transfert = typeof tcCleTransferable === 'function' ? { ia: tcCleTransferable(cle), pro: tcCleTransferable(cle + '_pro'), conversation: tcCleTransferable('timecool_charly_historique') } : null;
    // Un lot replacé deux fois par Charly (créneau choisi, puis un autre) : remis à sa toute première place, pas « changé depuis ».
    await poser([X('l', '2026-11-27', 15, 0, 16, 0, 'Rdv L')]);
    const evL = events.find((e) => e.id === 'vx_l'); evL.lotDecalage = { id: 'lotEssai' };
    tcDeplacerDansLeLot([{ ev: evL, p: { date: '2026-11-28', startH: 9, startM: 0, endH: 10, endM: 0 } }], { silencieux: true });
    tcDeplacerDansLeLot([{ ev: evL, p: { date: '2026-11-28', startH: 11, startM: 0, endH: 12, endM: 0 } }], { silencieux: true });
    await fermer();
    C.lot = await taper('remets-les');
    C.lot.place = ou('vx_l');
    // Ce que « remets-les » reconnaît quand rien n'est gardé, ou quand le souvenir revient de l'appareil.
    await fermer(); localStorage.removeItem(cle);
    C.lecture = { vide: {}, relu: {} };
    const PH = ['remets-les', 'Remets les à leur place stp', 'et remets-les', 'remets le son des rappels', 'remets mes rappels la veille', 'remets le rdv de Paul demain', 'je me suis trompé'];
    PH.forEach((p) => { C.lecture.vide[p] = tcDetecterMarcheArriere(p); });
    await poser([X('m', '2026-11-27', 9, 0, 10, 0, 'Rdv M')]);
    tcAppliquerDeplacement([vers('m', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    await fermer();
    for (const p of PH) { await fermer(); await tcRelireMarcheArriere(); C.lecture.relu[p] = tcDetecterMarcheArriere(p); }
    C.lecture.reluCharge = !!(_tcMarcheArriere && _tcMarcheArriere._relu);
    // Sans fermeture : comme avant (« je me suis trompé » remet aussi).
    await fermer(); localStorage.removeItem(cle);
    await poser([X('n', '2026-11-27', 9, 0, 10, 0, 'Rdv N')]);
    tcAppliquerDeplacement([vers('n', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    C.memeSession = { lecture: tcDetecterMarcheArriere('je me suis trompé') };
    Object.assign(C.memeSession, await taper('remets-les'));
    C.memeSession.place = ou('vx_n');
    // Démonstration : rien n'est gardé sur l'appareil. Charly Pro IA : sa propre clé.
    localStorage.removeItem(cle); localStorage.removeItem(cle + '_pro');
    const demo = tcDemoActive;
    tcDemoActive = function () { return true; };
    await poser([X('o', '2026-11-27', 9, 0, 10, 0, 'Rdv O')]);
    tcAppliquerDeplacement([vers('o', '2026-11-28', 9, 0, 10, 0)], { silencieux: true });
    await attendre(400);
    C.demo = { cle: !!localStorage.getItem(cle) };
    tcDemoActive = demo; await fermer();
    const variante = tcCharlyVariante;
    tcCharlyVariante = 'pro';
    tcAppliquerDeplacement([vers('o', '2026-11-29', 9, 0, 10, 0)], { silencieux: true });
    await attendre(400);
    C.pro = { pro: !!localStorage.getItem(cle + '_pro'), ia: !!localStorage.getItem(cle) };
    tcCharlyVariante = variante; await fermer();
    fin(res);
  } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
}

const compte = JSON.stringify({ firstname: 'Lucie', lastname: 'Essai', email: 'lucie.essai.remets@exemple-timecool.fr', reference: 'REFESSAIREMETS' });
const tete = '<script>(function () { var V = Date; var ecart = 0;'
  + ' class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + ecart); else super(...a); } static now() { return V.now() + ecart; } }'
  + ' window.Date = D; window.__tcHorloge = function (iso) { ecart = new V(iso).getTime() - V.now(); };'
  + ' window.fetch = function () { return Promise.reject(new Error("hors ligne")); };'
  + ' try { if (localStorage.getItem("__phase") !== "2") { localStorage.clear(); localStorage.setItem("__horloge", ' + JSON.stringify(DIMANCHE) + ');'
  + ' localStorage.setItem("timecool_user_account", ' + JSON.stringify(compte) + '); localStorage.setItem("timecool_session_active", "true");'
  + ' localStorage.setItem("tc_onboarding_done", "1"); localStorage.setItem("tc_permissions_shown", "1"); localStorage.setItem("tc_session_jeton", "jeton-essai-remets"); }'
  + ' window.__tcHorloge(localStorage.getItem("__horloge")); } catch (e) {}'
  + ' })();</script>';
const corpsJs = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + dansLaPage.toString() + ')('
  + JSON.stringify({ semaine: SEMAINE, lundiMatin: LUNDI_MATIN }) + '); }, 1500); });</script>';
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-remets-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + tete).replace('</body>', () => corpsJs + '</body>'));
const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'),
  '--window-size=390,844', '--virtual-time-budget=150000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')];
// Deux lancements de Chrome sur le même profil : la page est fermée entre les deux, comme l'appli. (Un rechargement de la page dans
// le même Chrome n'arrivait jamais au bout du temps virtuel.)
const r1 = spawnSync(exe, args, { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) });
const fini1 = /<pre id="res">[^<]*phase1/.test(r1.stdout || '');
const r = fini1 ? spawnSync(exe, args, { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) }) : r1;
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let res = null;
try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
if (process.env.TC_VOIR) console.log(JSON.stringify(res, null, 1));
if (!res || res.erreur || !res.r1 || !res.cas) {
  verifie('Chrome a joué le parcours', false, (res && res.erreur) || ('1er lancement fini : ' + fini1 + ' ; 2e : code ' + r.status + ' ' + (r.signal || '') + ', ' + String(r.stdout || '').length + ' caractères ; ' + ((String(r.stdout || '').match(/<pre id=.res.>[^<]{0,300}/) || [''])[0]) + ' ; ' + String(r1.stdout || '').length + ' caractères au 1er'));
} else {
  const C = res.cas, r1 = res.r1;
  const txt = (x) => (x && x.msgs ? x.msgs.join('\n') : '');
  titre('1. Le dimanche soir, puis l’appli fermée et rouverte le lundi 7h30');
  verifie('« Je suis malade, décale tous mes rendez-vous de demain » → « Oui, vas-y » : les trois rendez-vous de lundi sont déplacés',
    r1.apres && r1.apres.every((p) => p !== 'absent' && !/^2026-11-23 /.test(p)) && /C’est fait|C'est fait/.test((r1.fait || []).join(' ')), JSON.stringify([r1.apres, r1.fait, r1.boutons]));
  verifie('le souvenir est gardé sur l’appareil, chiffré (aucun titre en clair) : ce compte, les trois rendez-vous avec leur place d’avant et d’après, l’heure',
    r1.garde && r1.garde.compte === 'REFESSAIREMETS' && r1.garde.chiffre && !r1.garde.clair && r1.garde.n === 3 && r1.garde.apres && r1.garde.t, JSON.stringify(r1.garde));
  verifie('appli rouverte : la mémoire de la page est vide, les rendez-vous sont toujours déplacés, l’appareil a gardé le souvenir',
    C.reouverture.memoire && C.reouverture.avant.every((p) => !/^2026-11-23 /.test(p)) && C.reouverture.cle, JSON.stringify(C.reouverture));
  verifie('« remets-les » le lendemain matin : « C’est fait : 3 rendez-vous remis à leur place », sans le modèle',
    /C'est fait : 3 rendez-vous remis à leur place/.test(txt(C.remets)) && !C.remets.modele, txt(C.remets) + ' modèle=' + C.remets.modele);
  verifie('… exactement à leur place d’origine : lundi 9h-10h, 14h-15h, 19h-20h30 ; le souvenir est effacé',
    JSON.stringify(C.remets.apres) === JSON.stringify(['2026-11-23 9h-10h', '2026-11-23 14h-15h', '2026-11-23 19h-20h30']) && !C.remets.cle, JSON.stringify(C.remets.apres));
  verifie('un second « remets-les » : « Je n’ai rien à remettre », sans le modèle',
    /^Je n'ai rien à remettre : je ne retrouve aucun rendez-vous supprimé ou déplacé récemment sur cet appareil\.$/.test(txt(C.encore)) && !C.encore.modele, txt(C.encore));
  titre('2. Ce qui ne peut plus être remis est dit');
  const p = txt(C.partiel);
  verifie('supprimé, changé à la main, place prise : chacun dit, seul « Rdv A » est remis',
    /« Rdv A » est remis à sa place/.test(p) && /« Rdv B » a été supprimé depuis\. Je ne le remets pas\./.test(p) && /« Rdv C » a été changé depuis\. Je n'y touche pas\./.test(p)
    && /« Rdv D » : sa place d'avant \(lundi 23 novembre, 17h à 18h\) est prise par « Plombier »\. Il reste où il est\./.test(p) && !C.partiel.modele, p);
  verifie('… A à sa place d’origine ; B absent ; C reste là où on l’a mis ; D reste là où Charly l’avait mis',
    JSON.stringify(C.partiel.places) === JSON.stringify(['2026-11-23 10h-11h', 'absent', '2026-11-25 14h-15h', '2026-11-25 11h-12h']), JSON.stringify(C.partiel.places));
  const q = txt(C.passe);
  verifie('lundi 15h30 : 9h et 14h sont passés (dit), 21h est remis',
    /« Rdv G » est remis à sa place/.test(q) && /« Rdv E » : sa place d'avant \(lundi 23 novembre, 09h à 10h\) est déjà passée\. Il reste où il est\./.test(q) && /« Rdv F » : sa place d'avant \(lundi 23 novembre, 14h à 15h\) est déjà passée/.test(q)
    && JSON.stringify(C.passe.places) === JSON.stringify(['2026-11-26 9h-10h', '2026-11-26 10h-11h', '2026-11-23 21h-22h']), q + ' ' + JSON.stringify(C.passe.places));
  verifie('plus de deux jours après : Charly le dit, ne touche à rien, oublie',
    /^C'était il y a plus de deux jours : je ne remets plus ces rendez-vous tout seul\. Tu peux les changer dans ton agenda\.$/.test(txt(C.vieux)) && C.vieux.place === '2026-11-28 9h-10h' && !C.vieux.cle
    && /^Je n'ai rien à remettre/.test(txt(C.vieuxEncore)), txt(C.vieux) + ' ' + C.vieux.place);
  verifie('un autre compte sur le même appareil : rien à remettre ; le bon compte : remis',
    /^Je n'ai rien à remettre/.test(txt(C.autreCompte)) && /« Rdv I » est remis à sa place/.test(txt(C.bonCompte)) && C.bonCompte.place === '2026-11-27 9h-10h', txt(C.autreCompte) + ' | ' + txt(C.bonCompte));
  verifie('un second appareil (rien de gardé ici) : « Je n’ai rien à remettre … sur cet appareil », rien ne bouge, jamais le modèle',
    /sur cet appareil\.$/.test(txt(C.autreAppareil)) && C.autreAppareil.place === '2026-11-28 9h-10h' && !C.autreAppareil.modele, txt(C.autreAppareil));
  const s = txt(C.suppression);
  verifie('une suppression : J remis ; la place de K est prise par « Visite » (dit), K reste supprimé',
    /« Rdv J » est remis/.test(s) && /« Rdv K » : sa place \(vendredi 27 novembre, 12h à 13h\) est prise par « Visite »\. Je ne le remets pas\./.test(s) && JSON.stringify(C.suppression.places) === JSON.stringify(['2026-11-27 10h-11h', 'absent']), s);
  verifie('un lot replacé deux fois par Charly : remis à sa toute première place (pas « changé depuis »)',
    /« Rdv L » est remis à sa place/.test(txt(C.lot)) && C.lot.place === '2026-11-27 15h-16h', txt(C.lot) + ' ' + C.lot.place);
  verifie('examen : un rendez-vous supprimé (« Psychiatre Dr Essai », ses notes) n’est jamais lisible en clair sur l’appareil, seulement chiffré',
    C.prive && C.prive.garde && C.prive.chiffre && !C.prive.titre && !C.prive.notes, JSON.stringify(C.prive));
  verifie('… et « remets-les » après fermeture le remet intact : titre, notes, place',
    C.prive && C.prive.revenu === 'Psychiatre Dr Essai / note secrète essai / 2026-11-27 16h-17h' && /« Psychiatre Dr Essai » est remis/.test(txt(C.prive)), C.prive && C.prive.revenu + ' ' + txt(C.prive));
  verifie('examen : le souvenir ne voyage jamais à l’appairage (timecool_charly_marche_arriere et _pro refusées par tcCleTransferable)',
    C.transfert && C.transfert.ia === false && C.transfert.pro === false, JSON.stringify(C.transfert));
  titre('3. Les phrases');
  const L = C.lecture;
  verifie('rien de gardé : « remets-les », « Remets les à leur place stp », « et remets-les » ont leur réponse ; « remets le son des rappels », « remets mes rappels la veille », « remets le rdv de Paul demain », « je me suis trompé » vont ailleurs',
    L.vide['remets-les'] && L.vide['Remets les à leur place stp'] && L.vide['et remets-les'] && !L.vide['remets le son des rappels'] && !L.vide['remets mes rappels la veille'] && !L.vide['remets le rdv de Paul demain'] && !L.vide['je me suis trompé'], JSON.stringify(L.vide));
  verifie('souvenir revenu de l’appareil (déchiffré) : pareil (les réglages ne sont pas pris pour une remise)', L.reluCharge === true && JSON.stringify(L.relu) === JSON.stringify(L.vide), JSON.stringify([L.reluCharge, L.relu]));
  verifie('sans fermeture, comme avant : « je me suis trompé » est une remise, « remets-les » remet', C.memeSession.lecture && /« Rdv N » est remis à sa place/.test(txt(C.memeSession)) && C.memeSession.place === '2026-11-27 9h-10h', JSON.stringify(C.memeSession));
  verifie('démonstration : rien n’est gardé sur l’appareil', C.demo && C.demo.cle === false, JSON.stringify(C.demo));
  verifie('Charly Pro IA : sa propre clé (timecool_charly_marche_arriere_pro)', C.pro && C.pro.pro && !C.pro.ia, JSON.stringify(C.pro));
}
console.log('');
console.log(ko ? ko + ' anomalie(s) sur ' + (ok + ko) + '.' : 'OK : ' + ok + ' vérifications.');
process.exit(ko ? 1 : 0);
