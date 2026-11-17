// Mission 108 (Charles, 17/11 : l'avion en papier « complètement nul ») : plus d'avion ni de bandeau. La petite bulle d'attente
// dit ce que Charly fait (le sous-titre aussi) ; des feuilles y glissent quand un message part (gauche → droite) ou
// arrive (droite → gauche).
// Mission 109 (Charles, 17/11 16h : « je n'ai vu aucune feuille ») : les feuilles sont des feuilles de papier bleues, nettement
// plus grandes, toujours dans la même bulle ; une étape à feuilles (envoi, réponse) dure 5 s, dans la démonstration et en vrai ;
// « Réduire les animations » : les feuilles restent, immobiles, avec une flèche. Les autres étapes : 1,5 s (démonstration), 1 s.
// Usage : node verif-bulle-attente.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); } };
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
verifie('une constante réglable : 5 s par étape dans la démonstration (mission 110), 1 s en vrai, 5 s pour une étape à feuilles', /const TC_ATTENTE_DUREES = \{ demo: 5000, vrai: 1000, feuilles: 5000 \};/.test(page));
verifie('les feuilles : 14 × 18 px, contour de leur couleur, coin plié, dans la bulle (zone de hauteur fixe)',
  /\.tc-attente-anim \{ height:22px; display:flex; align-items:center; \}/.test(page)
  && /\.tc-feuilles \{ position:relative; display:block; width:96px; height:22px; overflow:hidden; \}/.test(page)
  && /\.tc-feuilles span \{[^}]*width:14px; height:18px;[^}]*border:1\.5px solid var\(--bord\)/.test(page)
  && /\.tc-feuilles span::after \{/.test(page));
// Mission 111 (Charles) : quatre feuilles, les quatre couleurs du logo en pastel, dans l'ordre bleu, rouge, jaune, vert.
verifie('quatre feuilles pastel : bleu, rouge, jaune, vert (fond pastel, contour plus soutenu)',
  /\.tc-feuilles span \{ --bord:#7baaf7; --fond:#e8f0fe;/.test(page) && /span:nth-child\(2\) \{ --bord:#f28b82; --fond:#fce8e6;/.test(page)
  && /span:nth-child\(3\) \{ --bord:#f2bf2e; --fond:#fef7e0;/.test(page) && /span:nth-child\(4\) \{ --bord:#81c995; --fond:#e6f4ea;/.test(page)
  && /<span><\/span><span><\/span><span><\/span><span><\/span><\/div>'/.test(page));
verifie('« Réduire les animations » : les feuilles ne sont plus cachées', !/\.tc-feuilles \{ display:none; \}/.test(page));
verifie('l appel au modèle : ce qu il fait, deviné d après la phrase', /tcDefinirStatutCharly\(typeof tcTexteAttente === 'function' \? tcTexteAttente\(tcDevinerAttente\(text\)\) : 'Charly cherche…', true\);/.test(page)
  && (page.match(/tcDefinirStatutCharly\('Charly cherche dans ton agenda…', true\);/g) || []).length === 3);   // consultation, suppression, et « vendredi » dans la démonstration (mission 110)

console.log('-- 2. Les mots et les durées --');
const ctx = { String, Array, Date, tcSansAccents: (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() };
vm.createContext(ctx);
vm.runInContext(['tcAttentePrenoms', 'tcTexteAttente', 'tcDevinerAttente', 'tcAttenteDuree'].map(fonction).join('\n')
  + '\nvar TC_ATTENTE_DUREES = { demo: 5000, vrai: 1000, feuilles: 5000 }; var _demo = false; function tcDemoActive() { return _demo; }', ctx);
const T = (q, n) => vm.runInContext('tcTexteAttente(' + JSON.stringify(q) + ', ' + JSON.stringify(n || []) + ')', ctx);
const vus = [T('agenda'), T('contacts'), T('agendaDe', ['Michel Virtuel']), T('agendaDe', ['Alice', 'Chloé']), T('agendaDe', ['Éric Durand']), T('envoi', ['Paul Virtuel']), T('reponse', ['Paul Virtuel']), T('reponse', ['Alice', 'Chloé']), T('range'), T(''), T('envoi', [])];
verifie('chaque mot suit l action', JSON.stringify(vus) === JSON.stringify(['Charly cherche dans ton agenda…', 'Charly cherche dans tes contacts…', 'Charly regarde l’agenda de Michel…', 'Charly regarde les agendas…', 'Charly regarde l’agenda d’Éric…', 'Charly envoie à Paul…', 'Paul répond…', 'Alice et Chloé répondent…', 'Charly range ton agenda…', 'Charly cherche…', 'Charly cherche…']), JSON.stringify(vus));
const D = (t) => vm.runInContext('tcDevinerAttente(' + JSON.stringify(t) + ')', ctx);
const devines = [D('Qu’est-ce que j’ai demain ?'), D('donne-moi le numéro de Hugo'), D('Préviens Paul que j’arrive'), D('Raconte-moi une blague')];
verifie('deviné : agenda, contacts ; jamais « envoie » sans envoi ; sinon « Charly cherche… »', JSON.stringify(devines) === JSON.stringify(['agenda', 'contacts', '', '']), JSON.stringify(devines));
const du = vm.runInContext('[tcAttenteDuree({}), tcAttenteDuree({ sorte: "envoi" }), tcAttenteDuree({ sorte: "reception" }), (_demo = true, tcAttenteDuree({})), tcAttenteDuree({ sorte: "envoi" })]', ctx);
verifie('durées : 1 s, 5 s, 5 s en vrai ; 5 s pour tout dans la démonstration (mission 110)', JSON.stringify(du) === '[1000,5000,5000,5000,5000]', JSON.stringify(du));

console.log('-- 3. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (corps, calme, taille) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var cliquer = function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); return !!b; };
      var bulle = function () { var b = document.getElementById('charlyAttente'); if (!b) return null; var f = b.querySelector('.tc-feuilles'); var r = b.firstElementChild.getBoundingClientRect();
        var sp = f ? f.querySelector('span') : null, rs = sp ? sp.getBoundingClientRect() : null, cs = sp ? getComputedStyle(sp) : null;
        return { texte: b.innerText.replace(/\\s+/g, ' ').trim(), anim: f ? (f.classList.contains('retour') ? 'reception' : 'envoi') : (b.querySelector('.tc-points') ? 'points' : 'rien'),
          feuillesVisibles: f ? getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().width > 80 : false,
          feuille: sp ? [sp.offsetWidth, sp.offsetHeight] : null, bord: cs ? cs.borderTopColor : null, couleurs: f ? Array.prototype.map.call(f.querySelectorAll('span'), function (x) { return getComputedStyle(x).borderTopColor; }) : null, mouvement: cs ? cs.animationName : null,
          opacite: cs ? cs.opacity : null, fleche: f ? getComputedStyle(f, '::after').content : null,
          l: Math.round(r.width), h: Math.round(r.height), sous: document.getElementById('charlyStatus').textContent }; };
      // Le film de la bulle : un relevé toutes les 100 ms, gardé à chaque changement de texte ou de feuilles.
      var film = [], t0 = Date.now();
      var filmer = setInterval(function () { var b = bulle(); var k = b ? b.texte + '|' + b.anim : 'rien'; var d = film[film.length - 1];
        if (!d || d.k !== k) film.push({ k: k, texte: b ? b.texte : null, anim: b ? b.anim : 'rien', debut: Date.now() - t0, fin: Date.now() - t0, b: b });
        else d.fin = Date.now() - t0; }, 100);
      var dernier = function () { return String(charlyIA.history[charlyIA.history.length - 1].content || ''); };
      var fin = function (res) { clearInterval(filmer); res.film = film.map(function (x) { return { texte: x.texte, anim: x.anim, ms: x.fin - x.debut, b: x.b }; });
        var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
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
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + (taille || '390,844'), '--virtual-time-budget=200000', '--dump-dom'];
    if (calme) args.push('--force-prefers-reduced-motion');
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };
  const demo = `
        await tcOuvrirDemo();
        tcDemoJouer('retard'); await attendre(900);
        cliquer('Oui, envoie');
        await attendre(500);
        R.envoi = bulle(); R.envoiAvant = dernier();
        await attendre(14000);
        R.fini = bulle(); R.repondu = charlyIA.history.some(function (m) { return /^Paul a répondu/.test(m.content || ''); });
        R.debutMalade = film.length;
        tcDemoJouer('malade'); await attendre(900);
        cliquer('Oui, envoie');
        await attendre(30000);
        R.finMalade = film.length;
        // Mission 110 : « Quand suis-je libre ce vendredi ? » : « Charly cherche dans ton agenda… » reste 5 s dans la démonstration.
        R.debutVendredi = film.length;
        tcDemoJouer('vendredi'); await attendre(7000);
        R.finVendredi = film.length;
        tcDemoJouer('michel'); await attendre(900);
        cliquer('En personne'); await attendre(400);
        R.agenda = bulle();
        await attendre(12000);
        // La bulle des quatre points (référence de taille) : le même cadre.
        tcDefinirStatutCharly(tcTexteAttente(''), true); await attendre(100); R.points = bulle(); tcDefinirStatutCharly(TC_STATUT_REPOS, false);`;
  const bleu = 'rgb(123, 170, 247)';   // mission 111 : la première feuille, bleu pastel
  [['390,844', 'téléphone 390'], ['1280,800', 'PC 1280']].forEach(function (x) {
    const S = jouer(demo, false, x[0]), nom = x[1];
    const film = S.film || [];
    const plage = (a, b) => film.slice(a || 0, b === undefined ? film.length : b);
    const etape = (liste, re, anim) => liste.filter((e) => re.test(e.texte || '') && e.anim === anim).sort((a, b) => b.ms - a.ms)[0];
    const env = etape(plage(0, S.debutMalade), /^Charly envoie à Paul…$/, 'envoi'), rep = etape(plage(0, S.debutMalade), /^Paul répond…$/, 'reception');
    verifie(nom + ' — retard : « Charly envoie à Paul… », feuilles bleues 14 × 18 qui glissent, le sous-titre aussi ; « C’est fait » attend',
      S.envoi && S.envoi.texte === 'Charly envoie à Paul…' && S.envoi.anim === 'envoi' && S.envoi.feuillesVisibles && S.envoi.sous === 'Charly envoie à Paul…'
      && JSON.stringify(S.envoi.feuille) === '[14,18]' && S.envoi.bord === bleu && JSON.stringify(S.envoi.couleurs) === JSON.stringify(['rgb(123, 170, 247)', 'rgb(242, 139, 130)', 'rgb(242, 191, 46)', 'rgb(129, 201, 149)']) &&S.envoi.mouvement === 'tcFeuilleEnvoi' && !/C’est fait/.test(S.envoiAvant || ''), JSON.stringify([S.envoi, S.envoiAvant, S.erreur]));
    verifie(nom + ' — retard : l envoi reste 5 s, puis « Paul répond… » 5 s, feuilles de droite à gauche',
      env && env.ms >= 4800 && env.ms < 6500 && rep && rep.ms >= 4800 && rep.ms < 6500 && rep.b.mouvement === 'tcFeuilleRetour' && film.indexOf(env) < film.indexOf(rep),
      JSON.stringify(film.slice(0, 8).map((e) => [e.texte, e.anim, e.ms])));
    verifie(nom + ' — la réponse s affiche, la bulle s en va', S.fini === null && S.repondu === true, JSON.stringify([S.fini, S.repondu]));
    const envM = etape(plage(S.debutMalade, S.finMalade), /^Charly envoie à /, 'envoi'), repM = etape(plage(S.debutMalade, S.finMalade), / répond(ent)?…$/, 'reception');
    verifie(nom + ' — malade : « Charly envoie à … » 5 s, puis « … répond… » 5 s',
      envM && envM.ms >= 4800 && envM.b.feuillesVisibles && repM && repM.ms >= 4800 && repM.b.feuillesVisibles,
      JSON.stringify(plage(S.debutMalade, S.finMalade).map((e) => [e.texte, e.anim, e.ms])));
    const cherche = etape(plage(S.debutVendredi, S.finVendredi), /^Charly cherche dans ton agenda…$/, 'points');
    verifie(nom + ' — vendredi : « Charly cherche dans ton agenda… » reste 5 s (démonstration)', cherche && cherche.ms >= 4800 && cherche.ms < 6500, JSON.stringify(plage(S.debutVendredi, S.finVendredi).map((e) => [e.texte, e.anim, e.ms])));
    const lecture = etape(plage(S.finVendredi), /^Charly regarde l’agenda de Michel…$/, 'points');
    verifie(nom + ' — Michel : « Charly regarde l’agenda de Michel… » reste 5 s (démonstration)', lecture && lecture.ms >= 4800 && lecture.ms < 6500, JSON.stringify(plage(S.finVendredi).map((e) => [e.texte, e.anim, e.ms])));
    verifie(nom + ' — agenda d un contact : « Charly regarde l’agenda de Michel… », les quatre points', S.agenda && S.agenda.texte === 'Charly regarde l’agenda de Michel…' && S.agenda.anim === 'points', JSON.stringify(S.agenda));
    verifie(nom + ' — la bulle garde sa hauteur avec les feuilles, s élargit à peine', S.envoi && S.points && Math.abs(S.envoi.h - S.points.h) <= 2 && S.envoi.l <= 280, JSON.stringify([S.envoi && [S.envoi.l, S.envoi.h], S.points && [S.points.l, S.points.h]]));
  });
  const V = jouer(`
        contactsList = [{ id: 'c_m', name: 'Michel Martin', referenceCompte: 'REF-M', isTimeCool: true }];
        TC_BACKEND.proposerRdvGroupe = async function () { return { creneaux: [], invites: ['Michel'], sans_acces: [], duree: 1 }; };
        var t0 = Date.now();
        var p = tcProposerRdvGroupe(['REF-M'], 1, '', 'physique');
        await attendre(200); R.pendant = bulle();
        await p; R.ms = Date.now() - t0; R.apres = bulle();
        t0 = Date.now(); await tcEtapeAttente(tcTexteAttente('envoi', ['Paul']), 'envoi'); await attendre(100); R.calme = bulle(); await tcFinEtapes(); R.msEnvoi = Date.now() - t0;
        await tcEtapeAttente(tcTexteAttente('reponse', ['Paul']), 'reception'); await attendre(100); R.calmeRetour = bulle(); await tcFinEtapes();`, true);
  verifie('en vrai : lire un agenda, au moins 1 s, pas plus', V.pendant && V.pendant.texte === 'Charly regarde l’agenda de Michel…' && V.ms >= 950 && V.ms < 1600 && V.apres === null, JSON.stringify([V.pendant, V.ms, V.apres, V.erreur]));
  verifie('en vrai : une étape à feuilles dure 5 s', V.msEnvoi >= 4950 && V.msEnvoi < 5600, V.msEnvoi);
  verifie('« Réduire les animations » : les feuilles restent, immobiles, avec la flèche → (envoi) et ← (réponse)',
    V.calme && V.calme.texte === 'Charly envoie à Paul…' && V.calme.feuillesVisibles === true && V.calme.mouvement === 'none' && V.calme.opacite === '1' && V.calme.fleche === '"→"'
    && V.calmeRetour && V.calmeRetour.anim === 'reception' && V.calmeRetour.fleche === '"←"' && V.calmeRetour.opacite === '1', JSON.stringify([V.calme, V.calmeRetour]));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
