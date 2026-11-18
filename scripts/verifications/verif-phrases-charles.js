// Mission 117 (Charles, 17/11 : « on règle un sujet, un mois plus tard le même problème revient ») : le garde-fou durable.
// Chaque phrase de phrases-charles.txt, et ses variantes fabriquées ici (sans accents, sans tirets, en minuscules, sans
// ponctuation, avec « et » ou « stp » devant), est rejouée sur le moteur local de Charly, dans l'agenda d'exemple de la
// démonstration, sans réseau et sans modèle. Une phrase qui passe par le modèle échoue (sauf « modele » dans l'attendu).
// Usage : node verif-phrases-charles.js <index.html> [phrases-charles.txt]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
const fichier = process.argv[3] || path.join(__dirname, 'phrases-charles.txt');
let ko = 0, ok = 0;
const echecs = [];
const verifie = (l, c, d) => { if (c) ok++; else { ko++; echecs.push(l); console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 500) : '')); } };

// 1. Les phrases.
const lignes = fs.readFileSync(fichier, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*#/.test(l));
const cas = lignes.map((l) => {
  const [phrase, contexte, attendu] = l.split('|').map((x) => (x || '').trim());
  // Lot 118 : « {date:+8} » devient « 25 novembre », « {jourdate:+8} » « mercredi 25 novembre » (la phrase garde son sens chaque jour).
  const dater = (x) => String(x || '').replace(/\{(date|jourdate):([+-]\d+)\}/g, function (m, sorte, n) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + Number(n));
    const J = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return (sorte === 'jourdate' ? J[d.getDay()] + ' ' : '') + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + M[d.getMonth()];
  });
  return { phrase: dater(phrase), contexte: contexte ? contexte.split('⏎').map((x) => dater(x.trim())).filter(Boolean) : [], attendu: attendu || '' };
});
const sansAccents = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function variantes(p) {
  const v = [p, sansAccents(p), p.replace(/-/g, ' '), p.toLowerCase(), p.replace(/[?!.,;:«»"]/g, ' ').replace(/\s+/g, ' ').trim(),
    'et ' + p.charAt(0).toLowerCase() + p.slice(1), 'stp ' + p.charAt(0).toLowerCase() + p.slice(1)];
  return v.filter((x, i) => v.indexOf(x) === i);
}
const essais = [];
cas.forEach((c, i) => variantes(c.phrase).forEach((v, j) => essais.push({ i, j, phrase: v, contexte: c.contexte })));
console.log('-- ' + cas.length + ' phrases, ' + essais.length + ' essais (phrases et variantes) --');

// 2. Les dates attendues.
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
function jourAttendu(spec) {
  const d = new Date(aujourdhui);
  let m;
  if ((m = spec.match(/^([+-]\d+)$/))) d.setDate(d.getDate() + Number(m[1]));
  else if ((m = spec.match(/^([a-z]+)-$/))) { const k = JOURS.indexOf(m[1]); d.setDate(d.getDate() - (((d.getDay() - k + 7) % 7) || 7)); }
  else if ((m = spec.match(/^([a-z]+)(\+\d+)?$/))) { const k = JOURS.indexOf(m[1]); let diff = (k - d.getDay() + 7) % 7; if (diff === 0) diff = 7; d.setDate(d.getDate() + diff + (m[2] ? Number(m[2]) : 0)); }
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return { iso, texte: JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()] };
}
function juger(c, r) {
  const rep = (r.reponses || []).join('\n');
  const bas = rep.toLowerCase();
  const raisons = [];
  if (r.erreur) raisons.push('erreur : ' + r.erreur);
  c.attendu.split('&&').map((x) => x.trim()).filter(Boolean).forEach((cond) => {
    let m;
    if ((m = cond.match(/^jour:(.+)$/))) { const j = jourAttendu(m[1]); if (bas.indexOf(j.texte) < 0 && rep.indexOf(j.iso) < 0) raisons.push('ne parle pas de ' + j.texte); }
    else if ((m = cond.match(/^texte:(.+)$/))) { if (!new RegExp(m[1], 'im').test(rep)) raisons.push('pas « ' + m[1] + ' »'); }
    else if ((m = cond.match(/^sans:(.+)$/))) { if (new RegExp(m[1], 'im').test(rep)) raisons.push('dit « ' + m[1] + ' »'); }
    // Lot 118 : ce que reçoit le modèle (la phrase entière, son lieu compris), quand la phrase passe par lui.
    else if ((m = cond.match(/^envoi:(.+)$/))) { if (!r.modele || !new RegExp(m[1], 'im').test(r.envoi || '')) raisons.push('le modèle ne reçoit pas « ' + m[1] + ' »'); }
  });
  if (r.modele && !/\bmodele\b/.test(c.attendu)) raisons.push('passe par le modèle');
  return raisons;
}

// 3. Le moteur local, dans Chrome.
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
} else {
  const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
    var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
    var ESSAIS = ${JSON.stringify(essais.map((e) => ({ phrase: e.phrase, contexte: e.contexte })))};
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(2500); };
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
      var R = [];
      for (var k = 0; k < ESSAIS.length; k++) {
        var e = ESSAIS[k], res = {};
        try {
          if (typeof _tcDemo !== 'undefined' && _tcDemo) { tcQuitterDemo({ sansRetour: true }); await attendre(200); }
          await tcOuvrirDemo(); await attendre(200);
          if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 50; TC_ATTENTE_DUREES.vrai = 50; TC_ATTENTE_DUREES.feuilles = 50; TC_ATTENTE_DUREES.consulte = 50; }
          var modele = 0, neutre = callAI;
          callAI = async function () { modele++; try { window.__envoi = JSON.stringify(arguments[0] || ''); } catch (x) {} return neutre.apply(this, arguments); };
          // Mission 122 : « @validation:Michel,Virginie » : ces amis gardent « Toujours attendre ma validation » (agenda non lisible).
          for (var c = 0; c < e.contexte.length; c++) {
            var dv = /^@validation:(.+)$/.exec(e.contexte[c]);
            if (!dv) { await taper(e.contexte[c]); continue; }
            var norm = function (t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
            var bloques = dv[1].split(',').map(norm);
            TC_BACKEND.demanderRdv = async function (ref, titre, type, souhait) { window.__souhait = souhait || ''; return { mode: 'messagerie', rdv: 1, reprise: false }; };
            var ori = TC_BACKEND.proposerRdvGroupe;
            TC_BACKEND.proposerRdvGroupe = async function (refs, duree, type, options) {
              var lisibles = [], sans = [];
              (refs || []).forEach(function (ref) { var ct = contactsList.find(function (x) { return x.referenceCompte === ref; }); var p = ct ? String(ct.name).split(' ')[0] : ''; if (bloques.indexOf(norm(p)) > -1) sans.push(p); else lisibles.push(ref); });
              var r = lisibles.length ? await ori.call(this, lisibles, duree, type, options) : { creneaux: [], invites: [], sans_acces: [], duree: duree, type: type || 'physique' };
              r = Object.assign({}, r); r.sans_acces = (r.sans_acces || []).concat(sans); return r;
            };
          }
          var n0 = charlyIA.history.length, m0 = modele;
          await taper(e.phrase);
          res.modele = modele > m0;
          res.envoi = res.modele ? String(window.__envoi || '').slice(-3000) : '';
          res.reponses = charlyIA.history.slice(n0).filter(function (m) { return m && m.role !== 'user' && !(m._demo && m._demo.phrases); })
            .map(function (m) { return String(m.content || '').replace(/<[^>]+>/g, ' ') + (m._groupe ? ' [groupe ' + (m._groupe.creneaux || []).map(function (x) { return x.date; }).join(',') + ']' : '') + (m._questionnaire ? ' [questionnaire ' + String(m._questionnaire.question || '') + ']' : '') + ((m._groupe || m._demande122) ? ' ' + String(renderChatMessage(m)).replace(/<[^>]+>/g, ' ') : ''); });
        } catch (er) { res.erreur = String(er && er.message || er); }
        R.push(res);
      }
      fin(R);
    } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-phrases-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=' + (essais.length * 12000 + 20000), '--dump-dom'];
  const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 1800000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let R = null;
  try { R = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { R = null; }
  if (!Array.isArray(R)) verifie('le moteur a rejoué les phrases', false, JSON.stringify(R).slice(0, 300));
  else essais.forEach((e, k) => {
    const raisons = juger(cas[e.i], R[k] || {});
    verifie('« ' + e.phrase + ' »' + (e.contexte.length ? ' (après « ' + e.contexte.join(' / ') + ' »)' : ''), !raisons.length, raisons.join(' ; ') + ' — ' + JSON.stringify((R[k] || {}).reponses || []).slice(0, 300));
  });
}

if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification (' + cas.length + ' phrases, ' + essais.length + ' essais)'); process.exit(1); }
if (ok + ko < essais.length) ko++;   // chaque essai doit avoir été jugé
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications (' + cas.length + ' phrases, ' + essais.length + ' essais)');
process.exit(ko ? 1 : 0);
