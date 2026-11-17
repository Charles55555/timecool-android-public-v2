// Mission 108 (Charles, 17/11 : l'avion en papier « complètement nul ») : plus d'avion ni de bandeau. La petite bulle d'attente
// dit ce que Charly fait (le sous-titre aussi) ; de petites feuilles y glissent quand un message part (gauche → droite) ou
// arrive (droite → gauche). En vrai, aucune attente ajoutée sauf ~1 s pour lire ; démonstration ~1,5 s par étape.
// Usage : node verif-bulle-attente.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); } };
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

console.log('-- 1. Plus d avion, ni de bandeau, ni de « réfléchit » --');
verifie('l avion en papier et son bandeau sont retirés', !/tcAvion|TC_AVION|Demande envoyée à |avion en papier traverse/.test(page));
verifie('le mot « réfléchit » a disparu des textes de Charly', !/'[^'\n]*réfléchit[^'\n]*'/.test(page), (page.match(/'[^'\n]*réfléchit[^'\n]*'/) || [])[0]);
verifie('une constante par contexte : 1,5 s par étape dans la démonstration, 1 s en vrai (le temps de lire)', /const TC_ATTENTE_DUREES = \{ demo: 1500, vrai: 1000 \};/.test(page));
verifie('les feuilles : petites, grises, dans la bulle ; « Réduire les animations » : le texte seul', /\.tc-feuilles \{ position:relative; display:block; width:56px; height:18px; overflow:hidden; \}/.test(page) && /@media \(prefers-reduced-motion: reduce\) \{ \.tc-feuilles \{ display:none; \} \}/.test(page));
verifie('l appel au modèle : ce qu il fait, deviné d après la phrase', /tcDefinirStatutCharly\(typeof tcTexteAttente === 'function' \? tcTexteAttente\(tcDevinerAttente\(text\)\) : 'Charly cherche…', true\);/.test(page)
  && (page.match(/tcDefinirStatutCharly\('Charly cherche dans ton agenda…', true\);/g) || []).length === 2);

console.log('-- 2. Les mots --');
const ctx = { String, Array, tcSansAccents: (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() };
vm.createContext(ctx);
vm.runInContext(['tcAttentePrenoms', 'tcTexteAttente', 'tcDevinerAttente'].map(fonction).join('\n'), ctx);
const T = (q, n) => vm.runInContext('tcTexteAttente(' + JSON.stringify(q) + ', ' + JSON.stringify(n || []) + ')', ctx);
const vus = [T('agenda'), T('contacts'), T('agendaDe', ['Michel Virtuel']), T('agendaDe', ['Alice', 'Chloé']), T('agendaDe', ['Éric Durand']), T('envoi', ['Paul Virtuel']), T('reponse', ['Paul Virtuel']), T('reponse', ['Alice', 'Chloé']), T('range'), T(''), T('envoi', [])];
verifie('chaque mot suit l action', JSON.stringify(vus) === JSON.stringify(['Charly cherche dans ton agenda…', 'Charly cherche dans tes contacts…', 'Charly regarde l’agenda de Michel…', 'Charly regarde les agendas…', 'Charly regarde l’agenda d’Éric…', 'Charly envoie à Paul…', 'Paul répond…', 'Alice et Chloé répondent…', 'Charly range ton agenda…', 'Charly cherche…', 'Charly cherche…']), JSON.stringify(vus));
const D = (t) => vm.runInContext('tcDevinerAttente(' + JSON.stringify(t) + ')', ctx);
const devines = [D('Qu’est-ce que j’ai demain ?'), D('donne-moi le numéro de Hugo'), D('Préviens Paul que j’arrive'), D('Raconte-moi une blague')];
verifie('deviné : agenda, contacts ; jamais « envoie » sans envoi ; sinon « Charly cherche… »', JSON.stringify(devines) === JSON.stringify(['agenda', 'contacts', '', '']), JSON.stringify(devines));

console.log('-- 3. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (corps, calme) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var cliquer = function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); return !!b; };
      var bulle = function () { var b = document.getElementById('charlyAttente'); if (!b) return null; var f = b.querySelector('.tc-feuilles'); var r = b.firstElementChild.getBoundingClientRect();
        return { texte: b.innerText.replace(/\\s+/g, ' ').trim(), anim: f ? (f.classList.contains('retour') ? 'reception' : 'envoi') : (b.querySelector('.tc-points') ? 'points' : 'rien'), feuillesVisibles: f ? getComputedStyle(f).display !== 'none' : false, l: Math.round(r.width), h: Math.round(r.height), sous: document.getElementById('charlyStatus').textContent }; };
      var dernier = function () { return String(charlyIA.history[charlyIA.history.length - 1].content || ''); };
      var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
      try {
        document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        localStorage.setItem('tc_permissions_shown', '1');
        window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
        userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
        tcCharlyPret = function () { return true; };
        charlyIA.history = []; charlyIA._historiqueCharge = true;
        hideAuthFlow();
        await attendre(900);
        document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        var R = {};
        ${corps}
        fin(R);
      } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
    }, 1200); });</script>`;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-bulle-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom'];
    if (calme) args.push('--force-prefers-reduced-motion');
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 240000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };
  const S = jouer(`
        await tcOuvrirDemo();
        tcDemoJouer('retard'); await attendre(900);
        cliquer('Oui, envoie');
        await attendre(500);
        R.envoi = bulle(); R.envoiAvant = dernier();
        await attendre(1300);
        R.reponse = bulle(); R.reponseApres = dernier();
        await attendre(2200);
        R.fini = bulle(); R.repondu = charlyIA.history.some(function (m) { return /^Paul a répondu/.test(m.content || ''); });
        tcDemoJouer('michel'); await attendre(900);
        cliquer('En personne'); await attendre(400);
        R.agenda = bulle();
        R.repos = { l: 0 };
        await attendre(2500);
        // La bulle des quatre points (référence de taille) : le même cadre.
        tcDefinirStatutCharly(tcTexteAttente(''), true); await attendre(100); R.points = bulle(); tcDefinirStatutCharly(TC_STATUT_REPOS, false);`);
  verifie('envoi : « Charly envoie à Paul… », les feuilles de gauche à droite, le sous-titre aussi ; « C’est fait » attend', S.envoi && S.envoi.texte === 'Charly envoie à Paul…' && S.envoi.anim === 'envoi' && S.envoi.feuillesVisibles && S.envoi.sous === 'Charly envoie à Paul…' && !/C’est fait/.test(S.envoiAvant || ''), JSON.stringify([S.envoi, S.envoiAvant, S.erreur]));
  verifie('puis « C’est fait », puis « Paul répond… », les feuilles de droite à gauche', S.reponse && S.reponse.texte === 'Paul répond…' && S.reponse.anim === 'reception' && /^C’est fait/.test(S.reponseApres || ''), JSON.stringify([S.reponse, S.reponseApres]));
  verifie('la réponse s affiche, la bulle s en va', S.fini === null && S.repondu === true, JSON.stringify([S.fini, S.repondu]));
  verifie('agenda d un contact : « Charly regarde l’agenda de Michel… », les quatre points', S.agenda && S.agenda.texte === 'Charly regarde l’agenda de Michel…' && S.agenda.anim === 'points', JSON.stringify(S.agenda));
  verifie('la bulle ne grandit pas avec les feuilles (même hauteur que la bulle aux quatre points)', S.envoi && S.points && Math.abs(S.envoi.h - S.points.h) <= 2 && S.envoi.l <= 260, JSON.stringify([S.envoi && [S.envoi.l, S.envoi.h], S.points && [S.points.l, S.points.h]]));
  const V = jouer(`
        contactsList = [{ id: 'c_m', name: 'Michel Martin', referenceCompte: 'REF-M', isTimeCool: true }];
        TC_BACKEND.proposerRdvGroupe = async function () { return { creneaux: [], invites: ['Michel'], sans_acces: [], duree: 1 }; };
        var t0 = Date.now();
        var p = tcProposerRdvGroupe(['REF-M'], 1, '', 'physique');
        await attendre(200); R.pendant = bulle();
        await p; R.ms = Date.now() - t0; R.apres = bulle();
        tcDefinirStatutCharly(tcTexteAttente('envoi', ['Paul']), true, 'envoi'); await attendre(100); R.calme = bulle(); tcDefinirStatutCharly(TC_STATUT_REPOS, false);`, true);
  verifie('en vrai : la bulle le temps de la lecture, au moins 1 s pour lire, pas plus', V.pendant && V.pendant.texte === 'Charly regarde l’agenda de Michel…' && V.ms >= 950 && V.ms < 1600 && V.apres === null, JSON.stringify([V.pendant, V.ms, V.apres, V.erreur]));
  verifie('« Réduire les animations » : le texte seul (pas de feuilles)', V.calme && V.calme.texte === 'Charly envoie à Paul…' && V.calme.feuillesVisibles === false, JSON.stringify(V.calme));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
