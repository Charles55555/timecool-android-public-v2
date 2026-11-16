// Mission 96 (Charles, 15/11) : la base d'aide de Charly (TC_AIDE) : au moins 20 réponses de 2 à 4 phrases, chaque mot d'écran
// cité existe dans la page ; une question d'aide reçoit sa réponse sans le modèle, une vraie demande n'est jamais prise pour
// une question d'aide ; la même liste sert la page « Aide et commentaires » ; « Charly, ton aide TimeCool » est en tête de la
// messagerie et sa flèche retour y ramène.
// Usage : node verif-aide-charly.js <index.html>   (Chrome du poste, ou TC_CHROME ; sans Chrome, la partie Chrome est sautée)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 500) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (page.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}
const norm = (x) => String(x).replace(/&amp;/g, '&').replace(/[’]/g, "'").replace(/\u00a0/g, ' ');

titre('La base');
const bloc = (page.match(/const TC_AIDE = \[[\s\S]*?\n\];/) || [''])[0];
const ctx = { console, String, Array, Object, RegExp, JSON };
vm.createContext(ctx);
let AIDE = [];
try { vm.runInContext(bloc.replace('const TC_AIDE', 'var TC_AIDE'), ctx); AIDE = ctx.TC_AIDE || []; } catch (e) { AIDE = []; }
verifie('au moins 20 réponses, chacune avec son identifiant (unique), sa question, ses mots, sa réponse', AIDE.length >= 20 && new Set(AIDE.map((x) => x.id)).size === AIDE.length && AIDE.every((x) => x.q && x.a && Array.isArray(x.mots) && x.mots.length && Array.isArray(x.ecran)), AIDE.length);
const phrases = (a) => (norm(a).replace(/«[^»]*»/g, '«»').match(/[.?!](?=\s|$)/g) || []).length;
verifie('chaque réponse fait 2 à 4 phrases (les exemples entre « » ne comptent pas)', AIDE.every((x) => phrases(x.a) >= 2 && phrases(x.a) <= 4), AIDE.filter((x) => phrases(x.a) < 2 || phrases(x.a) > 4).map((x) => x.id + ':' + phrases(x.a)).join(' '));
// La page écrit certains libellés avec des codes (« accès ») ou des apostrophes échappées : on les lit comme à l'écran.
const ailleurs = norm(page.replace(bloc, '').replace(/\\u\{([0-9a-f]+)\}/gi, (x, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (x, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\'/g, "'"));
const absents = [];
AIDE.forEach((x) => x.ecran.forEach((m) => { if (ailleurs.indexOf(norm(m)) < 0) absents.push(x.id + ' : ' + m); }));
verifie('chaque mot d écran cité (menu, bouton, ligne) existe ailleurs dans la page', absents.length === 0, absents.join(' | '));
const pasDansLaReponse = [];
AIDE.forEach((x) => x.ecran.forEach((m) => { if (norm(x.a).indexOf(norm(m).replace(/^📱 |^💌 /, '')) < 0) pasDansLaReponse.push(x.id + ' : ' + m); }));
verifie('chaque mot d écran listé est bien dans sa réponse', pasDansLaReponse.length === 0, pasDansLaReponse.join(' | '));
verifie('rien de ce qu il ne faut jamais dire : Doctolib, une synchro Outlook, « sans ton accord », « réserver seul »', !/doctolib|outlook|sans ton accord|r[ée]server seul/i.test(bloc));
verifie('« moments libres » : toujours « selon tes préférences et tes disponibilités enregistrées dans tes paramètres »', AIDE.filter((x) => /libre/.test(x.a) && /moments/.test(x.a) && x.id !== 'groupe').every((x) => norm(x.a).indexOf('selon tes préférences et tes disponibilités enregistrées dans tes paramètres') > -1));
verifie('plus de crayon ✏️ ni de « Nouveau message » (mission 94)', !/✏️|Nouveau message/.test(bloc));

titre('Reconnaître une question d aide (sans le modèle)');
vm.runInContext('var _tcMotsIgnoresAide = null;', ctx);
['tcSansAccents', 'tcMotsIgnoresAide', 'tcAideCharly'].forEach((n) => { const f = fonction(n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
// Les détecteurs de jour et d'heure de la page : rejoués dans un vrai Chrome plus bas ; ici, une version simple suffit à tester le tri.
ctx.tcHeureDansTexte = (t) => (/\b\d{1,2} ?h(\d{2})?\b|\bmidi\b/.test(t) ? { h: 1 } : null);
ctx.tcPeriodeAgenda = (t) => (/\b(aujourd|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine|\d{1,2} (janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre))/i.test(t) ? {} : null);
if (typeof ctx.tcAideCharly !== 'function') ctx.tcAideCharly = () => null;   // page d'avant : compté KO plus haut, la suite continue
ctx.tcJoursCites = (t) => (String(t).match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi) || []);
ctx.contactsList = [{ id: 'p1', name: 'Paul Martin' }];
ctx.tcDetecterMalade = (t) => /\bje suis malade\b/i.test(t) && !/comment prevenir|comment prévenir/i.test(t);
const QUESTIONS = [
  ['Comment je fais pour prendre un rendez-vous ?', 'rdv'], ['Comment changer la langue ?', 'langue'], ['Comment je change mon mot de passe ?', 'motdepasse'],
  ['Comment ajouter un contact ?', 'contact'], ["Comment inviter quelqu'un qui n'a pas TimeCool ?", 'inviter'], ['Comment régler mes disponibilités ?', 'dispos'],
  ["C'est quoi « Ma confiance en Charly » ?", 'confiance'], ['Comment recevoir un rappel avant un rendez-vous ?', 'rappel'], ['Comment importer mon ancien agenda Google ?', 'google'],
  ['Comment supprimer mon compte ?', 'compte'], ['comment on met le mode sombre', 'theme'], ["je n'arrive pas à couper le son", 'sons'], ['Comment bloquer quelqu’un ?', 'bloquer'],
  ['comment écrire à un contact dans la messagerie ?', 'messagerie'], ['Comment faire un rendez-vous à plusieurs ?', 'groupe'], ['Je suis malade, comment je fais ?', null],
  ['Comment prévenir d’un retard ?', 'retard'], ['Comment savoir quand je suis libre ?', 'libre'], ['Où est la sauvegarde de mes données ?', 'sauvegarde'],
  ['Comment connecter mon ordinateur ?', 'appareil'], ['Comment je me déconnecte ?', 'deconnexion'], ["C'est quoi photo rendez-vous ?", 'photo'],
];
const malRecues = QUESTIONS.filter(([q, id]) => { const r = ctx.tcAideCharly(q); return (r ? r.id : null) !== id; }).map(([q, id]) => q + ' → ' + ((ctx.tcAideCharly(q) || {}).id || 'rien') + ' (attendu ' + id + ')');
verifie('les questions d un nouvel utilisateur trouvent leur réponse (dont les dix de l essai du 15/11)', malRecues.length === 0, malRecues.join(' | '));
const DEMANDES = [
  'Dentiste demain à 15h', 'Ajoute un contact Paul 0611111111', 'Change la langue en anglais', 'Préviens Paul que j’aurai 10 minutes de retard',
  'Comment je fais pour décaler mon dentiste à jeudi 10h ?', 'Où est mon rendez-vous de demain ?', "C'est quoi mon prochain rendez-vous ?", 'Comment va Paul ?',
  'Je suis malade, décale mes rendez-vous d’aujourd’hui ou de demain', 'Quand suis-je libre jeudi ?', 'mets le thème sombre', 'Bloque Paul',
  // Examen (15/11) : un contact, des minutes, un jour, ou « invitation » : une vraie demande.
  "Comment je préviens Paul que j'aurai 10 minutes de retard ?", 'Comment je préviens Paul de mon retard ?', 'Comment bloquer jeudi après-midi ?',
  'Puis-je inviter Marie à dîner samedi ?', "Comment j'ajoute l'invitation de mariage à mon agenda ?",
];
const prises = DEMANDES.filter((d) => ctx.tcAideCharly(d));
verifie('une vraie demande n est jamais prise pour une question d aide', prises.length === 0, prises.map((d) => d + ' → ' + ctx.tcAideCharly(d).id).join(' | '));
// Examen : un gros carnet importé (« Mon dentiste », « Pizza pour tous », « Langue Formation ») ne coupe pas l'aide.
ctx.contactsList = [{ id: 'p1', name: 'Paul Martin' }, { id: 'd1', name: 'Mon dentiste' }, { id: 'z1', name: 'Pizza pour tous' }, { id: 'l1', name: 'Langue Formation' }, { id: 't1', name: 'Taxi des Lilas' }];
const coupees = QUESTIONS.filter(([q, id]) => { const r = ctx.tcAideCharly(q); return (r ? r.id : null) !== id; }).map(([q, id]) => q + ' → ' + ((ctx.tcAideCharly(q) || {}).id || 'rien'));
verifie('(examen) avec « Mon dentiste », « Pizza pour tous », « Langue Formation », « Taxi des Lilas » dans le carnet, les questions d aide gardent leur réponse', coupees.length === 0, coupees.join(' | '));
verifie('(examen) mais un contact vraiment nommé coupe toujours l aide (« Comment j invite Paul ? »)', ctx.tcAideCharly('Comment j’invite Paul ?') === null);

titre('Dans la page');
const csm = fonction('charlySendMessage') || '';
const iAide = csm.indexOf('if (typeof tcRepondreAide === \'function\' && tcRepondreAide(text)) return;');
verifie('Charly répond à l aide après les réponses attendues et les salutations, avant le classement (mission 50) et tout le reste', iAide > -1 && iAide > csm.indexOf('if (_isGreet && _isFirst)') && iAide > csm.indexOf('if (_tcQuestionnaire)') && iAide < csm.indexOf('CLASSER AVANT DE RÉPONDRE') && iAide < csm.indexOf('tcDetecterReglage(') && iAide < csm.indexOf('const _faq'));
const rh = fonction('renderHelp') || '';
verifie('la page « Aide et commentaires » affiche la même liste (TC_AIDE), sans doubler ses propres réponses', /const faq = TC_AIDE\.filter\(function \(x\) \{ return x\.page !== false; \}\)/.test(rh) && AIDE.filter((x) => x.page === false).map((x) => x.id).sort().join() === 'google,libre,rappel');

titre('Dans un vrai Chrome');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const ESSAI = QUESTIONS.filter((q) => q[1]).map((q) => q[0]).concat(['Dentiste demain à 15h', 'mets le thème sombre']);
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    try { localStorage.setItem('tc_permissions_shown', '1'); } catch (e) {}
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    window.__modele = 0;
    tcCharlyPret = function () { return true; };
    tcRelais = async function () { window.__modele++; throw new Error('modele'); };
    hideAuthFlow();
    var res = { reponses: [] };
    // La messagerie : Charly en tête, une conversation dessous.
    messages[mode] = [{ id: 'c1', with: 'Paul Martin', avatar: 'PM', color: '#123', icon: '', unread: 2, archived: false, thread: [{ from: 'them', text: 'Salut', time: '10:00' }] }];
    navigate('calendar'); navigate('messages');
    var l = document.getElementById('messagesList');
    res.premier = l.firstElementChild ? l.firstElementChild.id : '';
    res.texteCharly = (document.getElementById('msgCharly') || {}).innerText || '';
    res.conversations = (messages[mode] || []).length;
    document.getElementById('msgCharly').click();
    // Mission 102 : la ligne ouvre l'écran de conversation de la messagerie (plus la page Charly IA).
    res.ouverte = document.getElementById('page-conv').classList.contains('active') && document.getElementById('convName').innerText === 'Charly, ton aide TimeCool';
    tcRetourDepuisConversation();
    res.retour = document.getElementById('page-messages').classList.contains('active');
    // L'aide : chaque question, une à la fois.
    var Q = ${JSON.stringify(ESSAI)}, i = 0;
    function suivante() {
      if (i >= Q.length) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); return; }
      charlyIA.history = []; try { _tcQuestionnaire = null; } catch (e) {}
      var avant = window.__modele;
      document.getElementById('charlyInput').value = Q[i];
      Promise.resolve(charlySendMessage()).catch(function () {}).then(function () {
        setTimeout(function () {
          var d = charlyIA.history.filter(function (m) { return m.role !== 'user'; });
          res.reponses.push({ q: Q[i], aide: d.length ? (d[d.length - 1]._aide || null) : null, modele: window.__modele - avant, n: d.length });
          i++; suivante();
        }, 500);
      });
    }
    navigate('assistant');
    setTimeout(suivante, 500);
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-aide-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  verifie('la messagerie : « Charly, ton aide TimeCool » en tête, avec son exemple ; ce n est pas une conversation', !!res && res.premier === 'msgCharly' && /Charly, ton aide TimeCool/.test(res.texteCharly) && /Comment changer la langue/.test(res.texteCharly) && res.conversations === 1, JSON.stringify(res && { premier: res.premier, t: res.texteCharly, n: res.conversations }));
  verifie('un toucher ouvre la conversation « Charly, ton aide TimeCool » (mission 102) ; la flèche retour ramène à la messagerie', !!res && res.ouverte === true && res.retour === true, JSON.stringify(res && { o: res.ouverte, r: res.retour }));
  const attendu = Object.fromEntries(QUESTIONS.filter((q) => q[1]));
  const fausses = res ? res.reponses.filter((x) => attendu[x.q] ? (x.aide !== attendu[x.q] || x.modele !== 0) : x.aide !== null) : [];
  verifie('dans la vraie page, chaque question d aide reçoit sa réponse sans le modèle ; « Dentiste demain à 15h » et « mets le thème sombre » gardent leur chemin', !!res && res.reponses.length === Object.keys(attendu).length + 2 && fausses.length === 0, JSON.stringify(fausses.length ? fausses : res && res.reponses.length));
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
