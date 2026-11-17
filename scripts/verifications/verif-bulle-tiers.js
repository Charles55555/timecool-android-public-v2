// Mission 120 (Charles, 17/11 20h30) : la réponse d'un tiers a sa bulle verte, à gauche, avec ses initiales et son prénom ;
// seulement ses mots ; le commentaire de Charly reste dans sa bulle blanche, après. Démonstration et vrai. Le modèle ne la lit pas.
// Usage : node verif-bulle-tiers.js <index.html>   (TC_CHROME : Chrome sans tête)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); };

console.log('-- Le code --');
verifie('les quatre réponses citées en vrai (« Hugo t’a répondu ») et la liste portent leurs citations (_cites)', (page.match(/_cites: \[tcCite120\(r\)\],/g) || []).length === 4 && /_cites: qui\.map\(tcCite120\)/.test(page));
verifie('la démonstration : la réponse du contact est un message « tiers », plus « Paul a répondu : »', /tcPousserTiers120\(c\.name, texte, \{ _app: true \}\);/.test(page) && !/' a répondu\s?:/.test((page.match(/function tcDemoReponseDe[\s\S]*?\n\}/) || [''])[0]));

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
    charlyIA.history = []; charlyIA._historiqueCharge = true;
    hideAuthFlow(); navigate('assistant'); await attendre(900);
    var bulles = function () {
      return Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody .tc-tiers')).map(function (t) {
        var b = t.querySelector('.tc-bulle-tiers'), rb = b.getBoundingClientRect(), rc = document.getElementById('charlyChatBody').getBoundingClientRect(), cs = getComputedStyle(b);
        var rond = t.firstElementChild;
        return { texte: b.innerText.trim(), prenom: (t.querySelector('.tc-tiers-nom') || {}).innerText, initiales: rond.innerText.trim(), fond: cs.backgroundColor, couleur: cs.color,
          gauche: Math.round(rb.left - rc.left), large: Math.round(rb.width), rang: Math.round(rc.width), eclair: /⚡/.test(t.innerText) };
      });
    };
    // 1. Démonstration : « Préviens Paul… » ; Paul répond tout seul.
    await tcOuvrirDemo(); await attendre(300);
    TC_ATTENTE_DUREES.demo = 50; TC_ATTENTE_DUREES.vrai = 50; TC_ATTENTE_DUREES.feuilles = 50; TC_ATTENTE_DUREES.consulte = 50;
    tcDemoJouer('retard'); await attendre(900);
    var b = Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter(function (x) { return /Oui, envoie/.test(x.innerText); }).pop();
    if (b) b.click();
    await attendre(9000);
    R.demo = bulles();
    R.demoTexte = document.getElementById('charlyChatBody').innerText;
    R.pourIA = JSON.stringify(typeof tcHistoriquePourIA === 'function' ? tcHistoriquePourIA() : []);
    var dernierCharly = charlyIA.history.filter(function (m) { return m.role === 'assistant'; }).pop();
    R.dernierCharly = dernierCharly ? dernierCharly.content : '';
    tcSauverHistoriqueCharly();
    R.garde = (JSON.parse(localStorage.getItem(TC_CHARLY_HISTORIQUE_CLE) || '[]')).filter(function (m) { return m.role === 'tiers'; }).length;
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // 2. En vrai : « Hugo a répondu ? » (une réponse), puis deux réponses sans nom.
    charlyIA.history = [
      { role: 'assistant', nature: 'reponse', _cites: [tcCite120({ nom: 'Hugo Besnard', texte: 'Je te propose mardi à 16h, ça te va ?' })], content: 'Hugo Besnard t’a répondu : « Je te propose mardi à 16h, ça te va ? ». Pour lui répondre, dis-moi par exemple « ok pour Hugo ».' },
      { role: 'assistant', nature: 'question', _cites: [tcCite120({ nom: 'Hugo Besnard', texte: 'Oui' }), tcCite120({ nom: 'Lou Martin', texte: 'Plutôt jeudi' })], content: 'Hugo Besnard t’a répondu : « Oui ». Lou Martin t’a répondu : « Plutôt jeudi ». À qui je réponds ?' }
    ];
    renderCharlyChat(); await attendre(200);
    R.vrai = bulles();
    R.vraiTexte = document.getElementById('charlyChatBody').innerText;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const rgb = (t) => (String(t || '').match(/\d+/g) || []).slice(0, 3).map(Number);
const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contraste = (a, b) => { const l1 = lum(rgb(a)), l2 = lum(rgb(b)); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
for (const [taille, w] of [['téléphone', 390], ['PC', 1366]]) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-120-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + w + ',844', '--virtual-time-budget=90000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let S = null;
  try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
  const n = taille + ' — ';
  if (!S) { verifie(n + 'la page a rejoué le parcours', false, (r.stdout || '').slice(-300)); continue; }
  if (S.erreur) verifie(n + 'aucune erreur', false, S.erreur);
  const p = (S.demo || []).filter((x) => x.prenom === 'Paul')[0];
  verifie(n + 'démonstration : Paul répond dans une bulle verte, à gauche, « PV » et « Paul » au-dessus, sans éclair', !!p && p.texte.replace(/\s+/g, ' ') === 'Pas de souci, à tout à l’heure !' && p.initiales === 'PV' && p.fond === 'rgb(230, 244, 234)' && p.gauche + p.large < p.rang * 0.9 && p.gauche < p.rang / 2 && !p.eclair, JSON.stringify(S.demo));
  verifie(n + 'le vert : texte foncé lisible (contraste ≥ 4,5)', !!p && contraste(p.fond, p.couleur) >= 4.5, p && contraste(p.fond, p.couleur));
  verifie(n + 'à la taille du texte (pas toute la largeur)', !!p && p.large < p.rang * 0.75, JSON.stringify(p));
  verifie(n + 'plus de « Paul a répondu : » ; Charly continue dans sa bulle blanche', !/Paul a répondu/.test(S.demoTexte || '') && /C’est fait|Tu as tout vu|Touche une autre phrase/.test(S.demoTexte || ''), (S.demoTexte || '').slice(-300));
  verifie(n + 'ce que lit le modèle et « le dernier message de Charly » ne sont jamais la bulle de Paul', !/Pas de souci, à tout à l’heure/.test(S.pourIA) && !/Pas de souci, à tout à l’heure/.test(S.dernierCharly), JSON.stringify([S.dernierCharly]));
  verifie(n + 'la bulle est gardée avec la conversation', S.garde >= 1, S.garde);
  const h = (S.vrai || []);
  verifie(n + 'en vrai : « Hugo t’a répondu » : la bulle verte de Hugo (ses mots seulement), puis Charly en blanc sans la citation', h.length === 3 && h[0].prenom === 'Hugo' && h[0].initiales === 'HB' && h[0].texte === 'Je te propose mardi à 16h, ça te va ?' && /Pour lui répondre, dis-moi/.test(S.vraiTexte) && !/t’a répondu/.test(S.vraiTexte), JSON.stringify([h, (S.vraiTexte || '').slice(0, 300)]));
  verifie(n + 'en vrai : deux réponses, une bulle verte chacune avec son prénom, puis « À qui je réponds ? »', h.length === 3 && h[1].prenom === 'Hugo' && h[2].prenom === 'Lou' && h[2].texte === 'Plutôt jeudi' && /À qui je réponds \?/.test(S.vraiTexte), JSON.stringify(h));
}
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
