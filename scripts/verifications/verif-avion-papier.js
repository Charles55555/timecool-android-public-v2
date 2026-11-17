// Mission 107c (Charles, 17/11 : « comme ça on ne comprend pas bien ce que fait Charly IA ») : l'avion en papier. ALLER juste
// après « Oui, envoie », avant « C'est fait » ; RETOUR juste avant « Paul a répondu », la réponse à l'atterrissage. Grand, il
// traverse la zone de conversation ; 5 s dans la démonstration, 2 s en vrai (une constante par contexte) ; « Réduire les
// animations » : le texte seul ; le doigt passe à travers ; « Quitter » pendant le vol reste propre.
// Usage : node verif-avion-papier.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); } };

console.log('-- 1. La page --');
verifie('une constante par contexte : 5 s dans la démonstration, 2 s en vrai', /const TC_AVION_DUREES = \{ demo: 5000, vrai: 2000 \};/.test(page));
verifie('les textes : « Message envoyé à Paul », « Demande envoyée à Michel », « Paul répond… », « Alice, Chloé et Virginie répondent… »', /\(quoi === 'demande' \? 'Demande envoyée à ' : 'Message envoyé à '\)/.test(page) && /' répondent…' : ' répond…'/.test(page));
verifie('le doigt passe à travers le vol, « Réduire les animations » coupe le vol', /pointer-events:none;/.test(page.slice(page.indexOf('function tcAvionVoler'), page.indexOf('function tcAvionVoler') + 4000)) && /prefers-reduced-motion: reduce/.test(page));
verifie('ALLER avant « C’est fait » (questionnaire), ALLER puis RETOUR autour de la lecture des agendas', /await tcAvionPapier\(\{ sens: 'aller', noms: _envoles, quoi: 'message' \}\);\n  if \(!envois\.length\) \{ tcQuestionnaireDire/.test(page) && /r = await TC_BACKEND\.proposerRdvGroupe\(references, duree, type, options \|\| undefined\);\n    await _vol;\n    if \(_avion\) await tcAvionPapier\(\{ sens: 'retour', noms: _noms, quoi: 'agenda' \}\);/.test(page)
  && /const _avion = _noms\.length && typeof tcAvionPapier === 'function' && typeof tcDemoActive === 'function' && tcDemoActive\(\);/.test(page));
// Décision du chef (17/11) : les mots de Charles sur la lecture d'agenda.
{
  const vm = require('vm');
  const corps = (nom) => { const i = page.indexOf('function ' + nom + '('); if (i < 0) return ''; let n = 0; for (let k = page.indexOf('{', i); k < page.length; k++) { if (page[k] === '{') n++; else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); } } return ''; };
  const ctx = { String, Array };
  vm.createContext(ctx);
  try { vm.runInContext(corps('tcAvionPrenoms') + corps('tcAvionTexte'), ctx); } catch (e) {}
  const t = (sens, noms, quoi) => { try { return vm.runInContext('tcAvionTexte(' + JSON.stringify(sens) + ', ' + JSON.stringify(noms) + ', ' + JSON.stringify(quoi) + ')', ctx); } catch (e) { return String(e); } };
  const vus = [t('aller', ['Michel Virtuel'], 'agenda'), t('retour', ['Michel Virtuel'], 'agenda'), t('aller', ['Alice V', 'Chloé V', 'Virginie V'], 'agenda'), t('retour', ['Alice V', 'Chloé V', 'Virginie V'], 'agenda'), t('aller', ['Alice V'], 'agenda'), t('retour', ['Alice V'], 'agenda')];
  verifie('lecture d agenda, mots de Charles : « Je demande à l’agenda de Michel », « L’agenda de Michel a répondu », « Je demande aux agendas d’Alice, Chloé et Virginie », « Les agendas ont répondu »',
    JSON.stringify(vus) === JSON.stringify(['Je demande à l’agenda de Michel', 'L’agenda de Michel a répondu', 'Je demande aux agendas d’Alice, Chloé et Virginie', 'Les agendas ont répondu', 'Je demande à l’agenda d’Alice', 'L’agenda d’Alice a répondu']), JSON.stringify(vus));
}
verifie('RETOUR avant la réponse d un contact d exemple ; en vrai, avant la question « … a choisi » (pas deux fois dans la démonstration)', /await tcAvionPapier\(\{ sens: 'retour', noms: \[c\.name\] \}\);\n      if \(_tcDemo !== etat\) return;/.test(page) && /!\(typeof tcDemoActive === 'function' && tcDemoActive\(\)\)\s+&& typeof currentPage !== 'undefined' && currentPage === 'assistant'\)/.test(page));
verifie('« Quitter » retire l avion', /tcDemoBandeau\(false\);\n  \{ const avion = document\.getElementById\('tcAvion'\); if \(avion\) avion\.remove\(\); \}/.test(page));

console.log('-- 2. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (corps, calme) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var cliquer = function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); return !!b; };
      var avion = function () { var a = document.getElementById('tcAvion'); return a ? a.innerText.replace(/\\s+/g, ' ').trim() : null; };
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
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-avion-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=90000', '--dump-dom'];
    if (calme) args.push('--force-prefers-reduced-motion');
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 240000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };
  // Démonstration, retard de Paul : l'ordre exact et les durées (5 s).
  const D = jouer(`
        await tcOuvrirDemo();
        tcDemoJouer('retard'); await attendre(900);
        cliquer('Oui, envoie');
        await attendre(2500);
        R.aller = avion(); R.allerAvant = dernier();
        var bande = document.getElementById('tcAvion');
        R.traverse = bande ? Math.round(bande.getBoundingClientRect().width) : 0;
        R.zone = Math.round(document.getElementById('charlyChatBody').getBoundingClientRect().width);
        R.doigt = bande ? getComputedStyle(bande).pointerEvents : null;
        R.vol = !!(bande && bande.querySelector('.tc-avion-svg') && getComputedStyle(bande.querySelector('.tc-avion-svg')).display !== 'none');
        // Toucher l'écran pendant le vol : rien ne casse.
        document.getElementById('charlyChatBody').click(); renderCharlyChat();
        await attendre(3300);
        R.apresAller = dernier(); R.retour = avion();
        await attendre(2500);
        R.retourAvant = dernier();
        await attendre(3500);
        R.atterri = avion(); R.reponse = charlyIA.history.some(function (m) { return /^Paul a répondu/.test(m.content || ''); });
        // « Quitter » pendant un vol (Michel : la demande part).
        tcDemoJouer('michel'); await attendre(900);
        cliquer('En personne'); await attendre(1500);
        R.michel = avion();
        tcQuitterDemo(); await attendre(12000);
        R.apresQuitter = { avion: avion(), demo: tcDemoActive(), bandeau: !!document.getElementById('tcDemoBandeau') };`);
  verifie('ALLER : « Message envoyé à Paul », pendant que « C’est fait » attend', /Message envoyé à Paul/.test(D.aller || '') && !/C’est fait/.test(D.allerAvant || ''), JSON.stringify([D.aller, D.allerAvant, D.erreur]));
  verifie('le vol traverse la zone de conversation (pas une petite icône) ; le doigt passe à travers', D.traverse >= D.zone - 40 && D.zone > 300 && D.doigt === 'none' && D.vol === true, JSON.stringify([D.traverse, D.zone, D.doigt, D.vol]));
  verifie('5 s après : « C’est fait », puis le RETOUR « Paul répond… » avant la réponse', /^C’est fait/.test(D.apresAller || '') && /Paul répond…/.test(D.retour || '') && !/Paul a répondu/.test(D.retourAvant || ''), JSON.stringify([D.apresAller, D.retour, D.retourAvant]));
  verifie('à l atterrissage : « Paul a répondu », plus d avion', D.atterri === null && D.reponse === true, JSON.stringify([D.atterri, D.reponse]));
  verifie('Michel : « Je demande à l’agenda de Michel » ; « Quitter » pendant le vol : plus d avion, démonstration fermée', /Je demande à l’agenda de Michel/.test(D.michel || '') && D.apresQuitter && D.apresQuitter.avion === null && D.apresQuitter.demo === false && D.apresQuitter.bandeau === false, JSON.stringify([D.michel, D.apresQuitter]));
  // Vraie vie : 2 s ; « Réduire les animations » : le texte seul.
  const V = jouer(`
        R.duree = tcAvionDuree();
        var p = tcAvionPapier({ sens: 'aller', noms: ['Alice Martin', 'Chloé Durand', 'Virginie Roy'], quoi: 'message' });
        await attendre(300);
        R.texte = avion();
        var svg = document.querySelector('#tcAvion .tc-avion-svg');
        R.vol = !!(svg && getComputedStyle(svg).display !== 'none');
        await attendre(1500); R.encore = !!avion();
        await p; R.fini = avion();
        R.retour = tcAvionTexte('retour', ['Alice Martin', 'Chloé Durand', 'Virginie Roy']);
        // Décision du chef : en vrai, la recherche des créneaux communs reste immédiate, sans avion.
        contactsList = [{ id: 'c_m', name: 'Michel Martin', referenceCompte: 'REF-M', isTimeCool: true }];
        TC_BACKEND.proposerRdvGroupe = async function () { return { creneaux: [], invites: ['Michel'], sans_acces: [], duree: 1 }; };
        var t0 = Date.now(), vu = false;
        var guet = setInterval(function () { if (document.getElementById('tcAvion')) vu = true; }, 20);
        await tcProposerRdvGroupe(['REF-M'], 1, '', 'physique');
        clearInterval(guet);
        R.rechercheMs = Date.now() - t0; R.rechercheAvion = vu;`, true);
  verifie('en vrai : 2 s', V.duree === 2000 && V.encore === true && V.fini === null, JSON.stringify([V.duree, V.encore, V.fini, V.erreur]));
  verifie('en vrai, créneaux communs : pas d avion, la recherche reste immédiate', V.rechercheAvion === false && V.rechercheMs < 500, JSON.stringify([V.rechercheAvion, V.rechercheMs]));
  verifie('plusieurs personnes : « Message envoyé à Alice, Chloé et Virginie » ; retour « … répondent… »', /Message envoyé à Alice, Chloé et Virginie/.test(V.texte || '') && V.retour === 'Alice, Chloé et Virginie répondent…', JSON.stringify([V.texte, V.retour]));
  verifie('« Réduire les animations » : pas de vol, le texte seul', V.vol === false && /Message envoyé/.test(V.texte || ''), JSON.stringify([V.vol, V.texte]));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
