// Mission 116 (Charles, 17/11 19h20) : un choix touché dans une réponse de Charly devient une bulle bleue de l'utilisateur
// (libellé du bouton, sans chiffre ni icône), avant la suite de Charly ; jamais deux bulles ; pas de bulle pour « Voir dans
// mon agenda » ni l'accueil. Démonstration et vrai.
// Usage : node verif-bulle-choix.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); } };
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

console.log('-- 1. Le libellé --');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fonction('tcLibelleChoix116'), ctx);
const L = (t) => { try { return vm.runInContext('tcLibelleChoix116({ innerText: ' + JSON.stringify(t) + ' })', ctx); } catch (e) { return null; } };
const vus = [L('1️⃣ Oui, envoie'), L('2️⃣ Non'), L('🤝 En personne'), L('📞 Par téléphone'), L('🕐 Mercredi 18 novembre · 17h–18h'), L('✅ Valider mon agenda'), L('Ajouter Gérard'), L('1️⃣ Demain')];
verifie('sans chiffre ni icône : « Oui, envoie », « Non », « En personne »…', JSON.stringify(vus) === JSON.stringify(['Oui, envoie', 'Non', 'En personne', 'Par téléphone', 'Mercredi 18 novembre · 17h–18h', 'Valider mon agenda', 'Ajouter Gérard', 'Demain']), JSON.stringify(vus));

// Examen : ce qui relit la demande de l'utilisateur (désignation, type, correction, sujets) saute les bulles de choix.
verifie('la désignation, le type, la correction et les sujets ne lisent jamais une bulle de choix', (page.match(/role === 'user' && !(?:avant\[i\]|h\[k\])\._choix/g) || []).length === 4);

console.log('-- 2. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
    var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
    var cliquer = async function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); await attendre(2500); return !!b; };
    var conv = function () { return charlyIA.history.map(function (m) { return (m.role === 'user' ? (m._choix ? '>> ' : '> ') : '') + String(m.content || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').slice(0, 60); }); };
    try {
      document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
      localStorage.setItem('tc_permissions_shown', '1');
      window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
      userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
      tcCharlyPret = function () { return true; };
      charlyIA.history = []; charlyIA._historiqueCharge = true;
      hideAuthFlow(); navigate('assistant');
      await attendre(900);
      document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
      var R = {};
      // L'accueil : « Voir la démonstration » n'écrit pas de bulle.
      renderCharlyChat(); await attendre(200);
      var bd = document.getElementById('tcBoutonDemo'); if (bd) bd.click(); await attendre(1500);
      if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 100; TC_ATTENTE_DUREES.feuilles = 100; TC_ATTENTE_DUREES.consulte = 100; }
      R.ouverture = conv();
      // La démonstration : une phrase touchée (une bulle), « Oui, envoie » (une bulle), « En personne », un créneau.
      Array.prototype.filter.call(document.querySelectorAll('.tc-demo-phrase'), function (x) { return x.getAttribute('onclick').indexOf('retard') > -1; })[0].click(); await attendre(2500);
      await cliquer('Oui, envoie'); await attendre(1500);
      await tcDemoJouer('michel'); await attendre(800);
      await cliquer('En personne');
      var g = charlyIA.history.filter(function (m) { return m._groupe; }).pop();
      await cliquer(g._groupe.creneaux[0].heure + 'h');
      var n0 = charlyIA.history.length;
      var voir = document.querySelector('#charlyChatBody .tc-voir-agenda'); if (voir) voir.click(); await attendre(800); navigate('assistant'); await attendre(300);
      R.apresVoir = charlyIA.history.length - n0;
      R.demo = conv();
      R.boutonsMarques = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return /Oui, envoie/.test(x.innerText); }).map(function (x) { return x.disabled; });
      var bulle = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody div'), function (x) { return x.style && x.style.background === 'var(--g-blue)' && /Oui, envoie/.test(x.innerText); })[0];
      if (bulle) { var r = bulle.getBoundingClientRect(), rb = document.getElementById('charlyChatBody').getBoundingClientRect(); R.aDroite = rb.right - r.right < 30; }
      tcQuitterDemo(); await attendre(500);
      // En vrai : « En visio » touché, puis la carte du groupe.
      contactsList = [{ id: 'c_m', name: 'Michel Martin', referenceCompte: 'REF-M', isTimeCool: true }];
      TC_BACKEND.proposerRdvGroupe = async function () { var d = new Date(); d.setDate(d.getDate() + 1); return { creneaux: [{ date: tcISO(d), heure: 10, minute: 0, duree: 1, libelle: 'demain', manquants: [] }], invites: ['Michel'], sans_acces: [], duree: 1 }; };
      charlyIA.history = [{ role: 'user', content: 'Trouve un rendez-vous avec Michel' }, { role: 'assistant', content: 'Par téléphone, en personne ou en visio ?', _questionType: { id: 'qv', references: ['REF-M'], duree: 1, etat: 'choix' } }];
      renderCharlyChat(); await attendre(200);
      await cliquer('En visio'); await attendre(1500);
      R.vrai = conv();
      // Examen : la carte de conflit (hors bulle) : « Ajouter quand même » donne sa bulle, avant « C'est noté ».
      var demain = new Date(); demain.setDate(demain.getDate() + 1);
      contactsList = [{ id: 'c_paul', name: 'Paul Martin', phone: '0600000000' }];
      events.push({ id: 'ev_reu', mode: 'user', date: tcISO(demain), startH: 15, startM: 0, endH: 16, endM: 0, title: 'Réunion', cat: 'travail' });
      charlyIA.history = []; renderCharlyChat();
      var i = document.getElementById('charlyInput'); i.value = 'Ajoute un rendez-vous avec Paul demain à 15h'; await charlySendMessage(); await attendre(2500);
      await cliquer('Valider mon agenda'); await attendre(1000);
      R.conflitCarte = !!Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return /Ajouter quand même/.test(x.innerText); }).length;
      await cliquer('Ajouter quand même'); await attendre(1000);
      R.conflit = conv();
      // Mission 117 : le « Valider mon agenda » périmé de la carte remplacée, encore actif : jamais une bulle sans réponse.
      var perime = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && /Valider mon agenda/.test(x.innerText); })[0];
      R.perimeActif = !!perime;
      if (perime) { perime.click(); await attendre(4000); }
      R.apresPerime = conv();
      fin(R);
    } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-choix-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=120000', '--dump-dom'];
  const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let S = {};
  try { S = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : {}; } catch (e) { S = {}; }
  if (S.erreur) verifie('le parcours a joué', false, S.erreur);
  const D = S.demo || [];
  const iEnvoie = D.indexOf('>> Oui, envoie');
  verifie('« Voir la démonstration » (l’accueil) : pas de bulle', S.ouverture && !S.ouverture.some((x) => /^>/.test(x)), JSON.stringify(S.ouverture));
  verifie('« Oui, envoie » : une bulle, juste avant « C’est fait »', iEnvoie > 0 && /^C’est fait/.test(D[iEnvoie + 1] || ''), JSON.stringify(D));
  verifie('« En personne » puis le créneau : une bulle chacun', D.indexOf('>> En personne') > 0 && D.some((x) => /^>> \S+ \d+ \S+ · \d+h/.test(x)), JSON.stringify(D));
  verifie('jamais deux bulles de suite (la phrase touchée n’en a qu’une)', !D.some((x, i) => i && /^>/.test(x) && /^>/.test(D[i - 1])) && D.filter((x) => /Préviens Paul/.test(x)).length === 1, JSON.stringify(D));
  verifie('« Voir dans mon agenda » : pas de bulle', S.apresVoir === 0, S.apresVoir);
  verifie('le bouton touché reste visible, plus touchable ; la bulle est à droite', S.boutonsMarques && S.boutonsMarques.length && S.boutonsMarques.every(Boolean) && S.aDroite === true, JSON.stringify([S.boutonsMarques, S.aDroite]));
  const V = S.vrai || [];
  verifie('en vrai : « En visio » touché, une bulle, puis la carte des créneaux', V[2] === '>> En visio' && V.length >= 4 && !/^>/.test(V[3]), JSON.stringify(V));
  const C = S.conflit || [], iq = C.indexOf('>> Ajouter quand même');
  const P = S.apresPerime || [];
  verifie('un bouton périmé encore actif : pas de bulle laissée sans réponse (mission 117)', P.length && !/^>/.test(P[P.length - 1]) && P.length === C.length, JSON.stringify([S.perimeActif, P]));
  verifie('la carte de conflit : « Ajouter quand même » donne sa bulle, juste avant la réponse', S.conflitCarte === true && iq > 0 && C[iq + 1] && !/^>/.test(C[iq + 1]), JSON.stringify([S.conflitCarte, C]));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
