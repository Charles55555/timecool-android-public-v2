// Mission 134 (chef, 18/11) : quand Charly prévient ou décale plus de 6 personnes d'un coup, la conversation reste courte : 5 bulles
// vertes puis « … et N autres personnes ont répondu » (une seule étape d'attente) ; le récapitulatif avant le « oui », la carte du
// retard, le « C'est fait » et le compte rendu : une ligne par jour et « Voir le détail », qui déplie tout. Affichage seulement :
// le texte entier reste dans le message et tout se fait comme avant. Jamais plié : un conflit, un rendez-vous que Charly ne sait pas
// replacer, une personne non prévenue. Jusqu'à 6 personnes : rien ne change.
// Usage : node verif-pliage134.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); };
const NB = String.fromCharCode(160);
const isoDe = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// Un lundi simulé (le prochain), à 10h : la semaine la plus remplie de la démonstration du dentiste (50 patients).
const lundi = new Date(); lundi.setHours(12, 0, 0, 0); lundi.setDate(lundi.getDate() + (((8 - lundi.getDay()) % 7) || 7));
const SIM = isoDe(lundi);

console.log('-- Dans la page (Chrome), lundi simulé ' + SIM + ' à 10h --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const horloge = `<script>(function () { var V = Date, dec = new V('${SIM}T10:00:00').getTime() - V.now();
  class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + dec); else super(...a); } static now() { return V.now() + dec; } }
  window.Date = D; })();</script>`;
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.requestAnimationFrame = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    tcCharlyPret = function () { return true; };
    hideAuthFlow(); navigate('assistant'); await attendre(500);
    TC_ATTENTE_DUREES.demo = 40; TC_ATTENTE_DUREES.vrai = 40; TC_ATTENTE_DUREES.feuilles = 40; TC_ATTENTE_DUREES.consulte = 40;
    var vu = function () { var b = document.getElementById('charlyChatBody'); return b ? b.innerText : ''; };
    var calme = async function () { var k = 0; while (k++ < 600 && _tcDemo && (_tcDemo.occupe > 0 || _tcDemo.reponsesAttendues > 0)) await attendre(400); await attendre(800); };
    var question = function () { return charlyIA.history.filter(function (m) { return m && m._questionnaire && m._questionnaire.etat === 'choix'; }).pop(); };
    var detail = async function (m) { var c = m && (m._plie134 || m._resume134 || {}).cle; if (!c) return false; var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody .tc-detail134'), function (x) { return (x.getAttribute('onclick') || '').indexOf(c) > -1; })[0]; if (!b) return false; b.click(); await attendre(300); return true; };
    var receptions = 0, vraiEtape = tcEtapeAttente;
    tcEtapeAttente = async function (t, sorte) { if (sorte === 'reception') receptions++; return vraiEtape.apply(this, arguments); };
    FEATURES.CHARLY_PRO = true; await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    // A. La phrase 6 du dentiste, un lundi : 50 patients.
    await tcOuvrirDemo(); await attendre(400);
    var avant = events.map(function (e) { return e.id + '@' + e.date + ' ' + e.startH + ':' + e.startM; }).sort();
    var n0 = charlyIA.history.length;
    await tcDemoJouer('malade'); await attendre(6000);
    var q = question();
    R.recap = { contenu: q ? q.content : '', plie: !!(q && q._plie134), vu: vu(), boutonDansBulle: !!document.querySelector('#charlyChatBody .tc-detail134') && (function () { var b = document.querySelector('#charlyChatBody .tc-detail134'), o = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return /Oui, envoie/.test(x.textContent); })[0]; return !!(b && o && (b.compareDocumentPosition(o) & 4)); })() };
    R.recapOuvert = (await detail(q)) ? vu() : '';
    receptions = 0;
    if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await calme(); }
    R.receptions = receptions;
    var apresMsgs = charlyIA.history.slice(n0);
    var bilan = apresMsgs.filter(function (m) { return m && /^C.est fait\\. Repose-toi\\./.test(String(m.content || '').replace(/<br>/g, '\\n')); })[0];
    var cr = apresMsgs.filter(function (m) { return m && m._compteRendu; });
    var resume = apresMsgs.filter(function (m) { return m && m._resume134; })[0];
    R.apres = { vu: vu(), vertes: document.querySelectorAll('#charlyChatBody .tc-tiers').length, resume: resume ? resume.content : '', reponsesResumees: resume ? resume._resume134.reponses.length : 0,
      tiers: apresMsgs.filter(function (m) { return m && m.role === 'tiers' && !m._resume134; }).length, bilanContenu: bilan ? String(bilan.content).replace(/<br>/g, '\\n') : '', bilanPlie: !!(bilan && bilan._plie134),
      crContenu: cr.map(function (m) { return m.content; }).join('\\n'), crPlies: cr.filter(function (m) { return m._plie134; }).length, choisis: cr.map(function (m) { return (String(m.content).match(/ a choisi /g) || []).length; }).reduce(function (a, b) { return a + b; }, 0) };
    R.bouges = events.filter(function (e) { return avant.indexOf(e.id + '@' + e.date + ' ' + e.startH + ':' + e.startM) < 0; }).length;
    R.enAttente = events.filter(function (e) { return e && e.decalage && e.decalage.rdv; }).length;
    R.resumeOuvert = (await detail(resume)) ? document.querySelectorAll('#charlyChatBody .tc-tiers').length : -1;
    var crP = cr.filter(function (m) { return m._plie134; })[0];
    R.crOuvert = (await detail(crP)) ? vu() : '';
    R.bilanOuvert = (await detail(bilan)) ? vu() : '';
    // B. La carte du retard, 14 patients demain : pliée ; après le « oui », le « C'est fait » aussi.
    await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(300); await tcOuvrirDemo(); await attendre(300);
    n0 = charlyIA.history.length;
    var inp = document.getElementById('charlyInput'); inp.value = 'Préviens mes patients de demain que j’ai 10 minutes de retard'; await charlySendMessage(); await attendre(3000);
    q = question();
    R.retard = { contenu: q ? q.content : '', plie: !!(q && q._plie134), vu: vu() };
    if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await calme(); }
    var b2 = charlyIA.history.slice(n0).filter(function (m) { return m && /^C.est fait/.test(String(m.content || '')) && !m._questionnaire; }).pop();
    R.retardBilan = { contenu: b2 ? String(b2.content).replace(/<br>/g, '\\n') : '', plie: !!(b2 && b2._plie134), vu: vu() };
    await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // C. Jusqu'à 6 personnes : rien ne change (la démonstration de Charly IA, « malade » demain ; un retard à 6).
    await tcPasserCharlyVariante('ia', { ouvrir: true }); await attendre(300); await tcOuvrirDemo(); await attendre(300);
    n0 = charlyIA.history.length; receptions = 0;
    await tcDemoJouer('malade'); await attendre(5000);
    q = question(); if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await calme(); }
    var petits = charlyIA.history.slice(n0);
    R.petit = { plies: petits.filter(function (m) { return m && (m._plie134 || m._resume134); }).length, boutons: document.querySelectorAll('#charlyChatBody .tc-detail134').length, receptions: receptions, tiers: petits.filter(function (m) { return m && m.role === 'tiers'; }).length };
    await calme(); tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // D. Directement : ce qui ne se plie jamais, et les réponses citées en vrai.
    var L = ['Tu es malade. Je déplace 8 rendez-vous.', 'Je regarde dans ton agenda quand tu es libre.'];
    var liste = [], creneaux = [];
    for (var k = 0; k < 8; k++) { var ev = { id: 'x' + k, date: k < 4 ? '2030-01-07' : '2030-01-08', title: 'RDV P' + k }; liste.push({ ev: ev, p: k === 7 ? null : { date: '2030-01-09' } }); creneaux.push({ ev: ev, contact: { id: 'c' + k, name: 'P' + k + ' X', referenceCompte: 'R' + k }, creneaux: k === 6 ? [] : [{ date: '2030-01-09' }] }); L.push('« RDV P' + k + ' » avec P' + k + ' : mercredi 9 janvier, 9h.'); }
    L[8] = '« RDV P6 » avec P6 : pas de moment libre pour vous deux. Il reste à sa place.'; L[9] = '« RDV P7 » : pas de moment libre. Il reste à sa place.';
    L.push('Chacun choisit, selon ses préférences et ses disponibilités enregistrées.', 'Je note leurs choix dans ton agenda.', 'Je leur envoie ?');
    var pr = tcPlierRecap134({ action: 'decaler', prevenir: 'charly', _creneaux: creneaux, _liste: liste }, L.join('\\n'));
    R.jamaisRecap = pr ? pr.texte : '';
    var pc = tcPlierCompteRendu134(['📋 Compte rendu de Charly', 'C’est fait.'].concat([0, 1, 2, 3, 4, 5, 6].map(function (i) { return '• P' + i + ' a choisi lundi 7 janvier à 9h. J’ai déplacé « RDV P' + i + ' ».'; }), ['• Laissé à sa place : « RDV P7 » (pas d’autre moment libre)', '⚠️ Attention, ça chevauche : « RDV P1 » et « Dentiste ».', '• Je n’ai pas pu prévenir P8, je réessaie.']),
      [0, 1, 2, 3, 4, 5, 6].map(function (i) { return { p: { qui: 'P' + i + ' X' }, ev: { id: 'x' + i, date: '2030-01-14' } }; }), [], { x0: '2030-01-07', x1: '2030-01-07', x2: '2030-01-07', x3: '2030-01-08', x4: '2030-01-08', x5: '2030-01-08', x6: '2030-01-08' });
    R.jamaisCR = pc ? pc.texte : '';
    var cites = []; for (var k2 = 0; k2 < 8; k2++) cites.push({ nom: 'Ami' + k2 + ' Test', texte: 'D’accord ' + k2 });
    var m8 = { role: 'assistant', _cites: cites, content: cites.map(function (x) { return x.nom + ' t’a répondu : « ' + x.texte + ' ».'; }).join(' ') + ' Pour lui répondre…' };
    var div = document.createElement('div'); div.innerHTML = renderChatMessage(m8); R.cites8 = { vertes: div.querySelectorAll('.tc-tiers').length, resume: div.querySelectorAll('.tc-resume134').length, texte: div.innerText };
    var m6 = { role: 'assistant', _cites: cites.slice(0, 6), content: cites.slice(0, 6).map(function (x) { return x.nom + ' t’a répondu : « ' + x.texte + ' ».'; }).join(' ') + ' Pour lui répondre…' };
    div.innerHTML = renderChatMessage(m6); R.cites6 = { vertes: div.querySelectorAll('.tc-tiers').length, resume: div.querySelectorAll('.tc-resume134').length };
    R.appels = appels;
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-134-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + horloge).replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=400000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, NB).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) verifie('la page a rejoué les parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur);
else {
  const JOUR = /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) (1er|\d+) : /;
  const lignesVues = (t) => String(t).split('\n').map((x) => x.trim()).filter(Boolean);
  const rdvVus = (t) => (String(t).match(/« RDV [^»]+»/g) || []).length;
  // A. Le récapitulatif.
  const jr = lignesVues(S.recap.vu).filter((l) => JOUR.test(l) && / rendez-vous à décaler$/.test(l));
  const totalJr = jr.reduce((t, l) => t + Number((l.match(/ : (\d+) rendez-vous/) || [])[1] || 0), 0);
  verifie('récapitulatif avant le « oui » (50 patients) : « Je déplace 50 rendez-vous », une ligne par jour (« Lundi 23 : 2 rendez-vous à décaler »…), aucun rendez-vous listé', /Tu es malade\. Je déplace 50 rendez-vous\./.test(S.recap.vu) && jr.length >= 2 && totalJr === 50 && rdvVus(S.recap.vu) === 0 && /Je leur envoie \?/.test(S.recap.vu), JSON.stringify([jr, totalJr, rdvVus(S.recap.vu)]));
  verifie('récapitulatif : « Voir le détail » dans la bulle, au-dessus de « Oui, envoie » ; le message garde tout son texte (50 rendez-vous)', S.recap.plie && S.recap.boutonDansBulle && rdvVus(S.recap.contenu) === 50, JSON.stringify([S.recap.plie, S.recap.boutonDansBulle, rdvVus(S.recap.contenu)]));
  verifie('récapitulatif : « Voir le détail » déplie tout avant le « oui » (les 50 rendez-vous)', rdvVus(S.recapOuvert) >= 50, rdvVus(S.recapOuvert));
  // A. Après le « oui ».
  verifie('les réponses : une seule étape d’attente (« Inès, Nina… et 45 autres répondent »), pas une par personne', S.receptions === 1, S.receptions);
  verifie('les réponses : 5 bulles vertes, puis « … et 45 autres personnes ont répondu »', S.apres.tiers === 5 && S.apres.vertes === 6 && S.apres.resume === '… et 45 autres personnes ont répondu' && S.apres.reponsesResumees === 45, JSON.stringify([S.apres.tiers, S.apres.vertes, S.apres.resume, S.apres.reponsesResumees]));
  verifie('« Voir le détail » sous les réponses : les 50 bulles vertes', S.resumeOuvert === 50, S.resumeOuvert);
  verifie('rien ne change dans ce qui est fait : les 50 patients décalés, aucun en attente, aucun appel réseau', S.bouges === 50 && S.enAttente === 0 && S.apres.choisis === 50 && S.appels === 0, JSON.stringify([S.bouges, S.enAttente, S.apres.choisis, S.appels]));
  const jb = lignesVues(S.apres.vu).filter((l) => /^• (Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) (1er|\d+) : \d+ personnes? prévenues?$/.test(l));
  verifie('« C’est fait » : une ligne par jour (« • Lundi 23 : 2 personnes prévenues »), « Envoyé dans la messagerie TimeCool : 50 personnes » ; le message garde tout', S.apres.bilanPlie && jb.length >= 2 && jb.reduce((t, l) => t + Number(l.match(/ : (\d+) personne/)[1]), 0) === 50 && /Envoyé dans la messagerie TimeCool : 50 personnes/.test(S.apres.vu) && rdvVus(S.apres.bilanContenu) >= 50, JSON.stringify([S.apres.bilanPlie, jb, rdvVus(S.apres.bilanContenu)]));
  const jc = lignesVues(S.apres.vu).filter((l) => /^• (Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) (1er|\d+) : \d+ personnes? prévenues? et décalées?$/.test(l));
  verifie('compte rendu : « • Lundi 23 : 2 personnes prévenues et décalées »… (50 en tout), aucun « a choisi » affiché ; le message garde les 50', S.apres.crPlies >= 1 && jc.length >= 2 && jc.reduce((t, l) => t + Number(l.match(/ : (\d+) personne/)[1]), 0) === 50 && !/ a choisi /.test(S.apres.vu) && S.apres.choisis === 50, JSON.stringify([S.apres.crPlies, jc]));
  verifie('compte rendu : « Voir le détail » déplie les 50 « a choisi »', (S.crOuvert.match(/ a choisi /g) || []).length === 50, (S.crOuvert.match(/ a choisi /g) || []).length);
  verifie('« C’est fait » : « Voir le détail » déplie les 50 « je propose à »', (S.bilanOuvert.match(/ : je propose à /g) || []).length === 50, (S.bilanOuvert.match(/ : je propose à /g) || []).length);
  // B. Le retard.
  verifie('carte du retard (14 patients demain) : « Je préviens 14 personnes de ton retard, demain : », une ligne par jour (« … : 14 personnes »), le message, « Je leur envoie ? », aucune personne listée ; le message garde les 14', S.retard.plie && /Je préviens 14 personnes de ton retard, demain :/.test(S.retard.vu) && lignesVues(S.retard.vu).some((l) => JOUR.test(l) && / : 14 personnes$/.test(l)) && /Voici le message pour Claire/.test(S.retard.vu) && /Je leur envoie \?/.test(S.retard.vu) && !/• Claire Virtuelle \(/.test(S.retard.vu) && (S.retard.contenu.match(/^• /gm) || []).length === 14, S.retard.vu.slice(-700));
  verifie('retard : « C’est fait » plié (« • … : 14 personnes prévenues », « Prévenu par la messagerie TimeCool : 14 personnes ») ; le message garde les 14 retards', S.retardBilan.plie && lignesVues(S.retardBilan.vu).some((l) => /^• \S+ (1er|\d+) : 14 personnes prévenues$/.test(l)) && /Prévenu par la messagerie TimeCool : 14 personnes/.test(S.retardBilan.vu) && (S.retardBilan.contenu.match(/Retard d’environ/g) || []).length === 14, S.retardBilan.vu.slice(-500));
  // C. Jusqu'à 6.
  verifie('jusqu’à 6 personnes (démonstration de Charly IA, « malade » demain) : rien de plié, une étape et une bulle verte par personne', S.petit.plies === 0 && S.petit.boutons === 0 && S.petit.tiers >= 1 && S.petit.receptions === S.petit.tiers, JSON.stringify(S.petit));
  // D. Jamais plié ; les réponses citées en vrai.
  verifie('jamais plié (récapitulatif) : un rendez-vous sans moment libre reste écrit en entier', /« RDV P6 » avec P6 : pas de moment libre pour vous deux\. Il reste à sa place\./.test(S.jamaisRecap) && /« RDV P7 » : pas de moment libre\. Il reste à sa place\./.test(S.jamaisRecap) && !/« RDV P0 »/.test(S.jamaisRecap) && /Lundi 7 : 4 rendez-vous à décaler/.test(S.jamaisRecap) && /Mardi 8 : 2 rendez-vous à décaler/.test(S.jamaisRecap), S.jamaisRecap);
  verifie('jamais plié (compte rendu) : le conflit, « Laissé à sa place », « Je n’ai pas pu prévenir » restent ; les choix en lignes par jour', /⚠️ Attention, ça chevauche/.test(S.jamaisCR) && /Laissé à sa place : « RDV P7 »/.test(S.jamaisCR) && /Je n’ai pas pu prévenir P8/.test(S.jamaisCR) && /• Lundi 7 : 3 personnes prévenues et décalées/.test(S.jamaisCR) && /• Mardi 8 : 4 personnes prévenues et décalées/.test(S.jamaisCR) && !/ a choisi /.test(S.jamaisCR), S.jamaisCR);
  verifie('en vrai, 8 réponses citées : 5 bulles vertes et « … et 3 autres personnes ont répondu » ; 6 réponses : 6 bulles, rien de plié', S.cites8.vertes === 6 && S.cites8.resume === 1 && /… et 3 autres personnes ont répondu/.test(S.cites8.texte) && /Voir le détail/.test(S.cites8.texte) && S.cites6.vertes === 6 && S.cites6.resume === 0, JSON.stringify([S.cites8, S.cites6]));
  verifie('la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
