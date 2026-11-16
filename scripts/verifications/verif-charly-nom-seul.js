// Mission 99 (Charles, 16/11) : Charly retrouve un contact par son prénom seul. Après « Retrouver un contact », le nom tapé est
// cherché sur place ; « William » tout seul montre les fiches ; jusqu'à 10 fiches, au-delà « Voir les N » ; le modèle n'a pas le
// carnet et ne dit jamais qu'un contact manque ; une carte à 0h sans heure demandée devient « À quelle heure ? ».
// Usage : node verif-charly-nom-seul.js <index.html>   (Chrome du poste, ou TC_CHROME ; sans Chrome, la partie Chrome est sautée)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 600) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let d = page.indexOf('function ' + nom + '(');
  if (d < 0) return '';
  if (page.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return '';
}

titre('Dans la page');
verifie('la phrase du bouton « Retrouver un contact » attend un nom', /if \(action === 'contact'\) _phrase\._ficheAttente = \{ etape: 'nom' \};/.test(fonction('charlyQuickAction')));
verifie('jusqu à 10 fiches, plus de « Voici les 5 plus probables »', fonction('tcPousserFiches').includes('const TC_FICHES_MAX = 10;') && !page.includes('Voici les 5 plus probables'));
verifie('« Lequel ? » se répond de 1 à 10', fonction('tcRepondreFicheContact').includes('/^(10|[1-9])( ?(er|ere|e|eme))?$/') && fonction('tcRepondreFicheContact').includes('dixieme: 10'));
verifie('le nom seul passe après les questions en cours et avant le modèle', /tcGererFicheLibre\(text, _ficheLibre\)\) return;\n[^\n]*\n    if \(typeof tcDetecterNomSeul === 'function'\)/.test(page));
const prompt = (page.match(/const TC_DEFAULT_SYSTEM_PROMPT = `[\s\S]*?`;/) || [''])[0];
verifie('le modèle sait qu il n a pas le carnet, ne dit jamais qu un contact manque, ne propose jamais de l ajouter',
  prompt.includes('Tu n\'as PAS le carnet de contacts de l\'utilisateur : ne dis jamais qu\'un contact n\'existe pas ou est introuvable, et ne propose jamais de l\'ajouter.'));
verifie('le modèle renvoie vers « Retrouve <son nom> » ; un nom seul n est jamais un rendez-vous', prompt.includes('« Écris-moi : Retrouve <son nom>. »') && prompt.includes('Un nom seul n\'est jamais un rendez-vous : aucun bloc [AGENDA].'));
verifie('la carte à 0h devient « À quelle heure ? » (question) juste avant d être montrée',
  page.includes("if (_minuitInvente) { _tcHeureEnAttente = { texte: text }; reply = 'À quelle heure ?'; }") && page.includes("    if (_minuitInvente) charlyIA.history[charlyIA.history.length - 1].nature = 'question';"));

titre('Une carte à 0h sans heure demandée');
const ctx = {};
vm.createContext(ctx);
try { vm.runInContext([fonction('tcSansAccents'), fonction('tcHeureDansTexte'), fonction('tcCarteMinuitSansHeure')].join('\n'), ctx); } catch (e) { verifie('les fonctions se chargent', false, e.message); }
const bloc = (h) => 'Voici.\n[AGENDA]\n2026-11-16 | ' + h + ' | William Ayache\n[/AGENDA]';
const m0 = (r, t) => { try { return vm.runInContext('tcCarteMinuitSansHeure', ctx)(r, t); } catch (e) { return 'erreur ' + e.message; } };
verifie('« William ayache » et une carte à 00:00 : question', m0(bloc('00:00-01:00'), 'William ayache') === true);
verifie('« 0h », « minuit », « 00h30 » dans la phrase : la carte reste', m0(bloc('00:00-01:00'), 'fête à 0h') === false && m0(bloc('00:00-01:00'), 'fête à minuit') === false && m0(bloc('00:00-01:00'), 'fête à 00h') === false);
verifie('une journée entière (00:00-23:59) : la carte reste', m0(bloc('00:00-23:59'), 'Vacances lundi') === false);
verifie('« toute la journée » ou « journée entière » dans la phrase : la carte reste', m0(bloc('00:00-23:00'), 'salon demain toute la journée') === false && m0(bloc('00:00-23:00'), 'salon demain, journée entière') === false);
verifie('une carte à 14h : la carte reste', m0(bloc('14:00-15:00'), 'William ayache') === false);
verifie('sans carte : rien', m0('Bonjour', 'William') === false);

titre('Dans la vraie page (Chrome), carnet de 3 316 contacts dont 25 William');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const ESSAIS = [
    ['bouton', 'William'], ['', 'William'], ['', 'william ayache'], ['', 'Hélène'], ['', 'helene'], ['', 'Sport'], ['', 'Super'], ['', 'Golf'], ['', 'Will'],
    ['', 'Paul demain'], ['', 'annule'], ['', 'rappel'], ['', 'Bureau'], ['', 'Retrouve William'], ['bouton', 'Gaston'], ['question', 'William'], ['', 'Dentiste demain à 15h']
  ];
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    var prenoms = ['Paul', 'Marie', 'Hugo', 'Sophie', 'Léa', 'Jean', 'Hélène', 'Marc', 'Inès', 'Zoé', 'Lucas', 'Emma'];
    var noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];
    contactsList = [];
    for (var i = 0; i < 3290; i++) contactsList.push({ id: 'k' + i, name: prenoms[i % 12] + ' ' + noms[(i * 7) % 10] + ' ' + i, phone: '06' + String(10000000 + i) });
    for (var j = 0; j < 25; j++) contactsList.push({ id: 'w' + j, name: 'William ' + (j === 0 ? 'Ayache' : noms[j % 10] + j), phone: '07' + String(10000000 + j) });
    contactsList.push({ id: 'cs', name: 'Sport Club Lilas', phone: '0100000000' }, { id: 'an', name: 'Annie Annule' }, { id: 'ra', name: 'Rappel Auto' }, { id: 'bu', name: 'Bureau Vallée' }, { id: 'go', name: 'Golf Club' });
    events.push({ id: 'g_golf', title: 'Golf', date: '2026-11-21', start: '10:00', end: '12:00' });
    events.push({ id: 'charly_ai_sport', mode: 'user', title: 'Sport', date: '2026-11-20', start: '18:00', end: '19:00' });
    window.__modele = 0;
    tcCharlyPret = function () { return true; };
    tcRelais = async function () { window.__modele++; throw new Error('modele'); };
    hideAuthFlow();
    var res = { essais: [] };
    var E = ${JSON.stringify(ESSAIS)}, i = 0;
    function suivant() {
      if (i >= E.length) return fin();
      charlyIA.history = []; try { _tcQuestionnaire = null; _tcHeureEnAttente = null; } catch (e) {}
      if (E[i][0] === 'bouton') charlyQuickAction('contact');
      if (E[i][0] === 'question') charlyIA.history.push({ role: 'assistant', nature: 'question', content: 'Avec qui ?' });
      var avant = window.__modele, n0 = charlyIA.history.length;
      document.getElementById('charlyInput').value = E[i][1];
      Promise.resolve(charlySendMessage()).catch(function () {}).then(function () {
        setTimeout(function () {
          var d = charlyIA.history.slice(n0).filter(function (m) { return m.role === 'assistant'; });
          var der = d[d.length - 1] || {}, f = der._fiches || {};
          res.essais.push({ q: E[i][1], c: E[i][0], modele: window.__modele - avant, fiches: (f.ids || []).length, voir: f.voir ? f.voir.ids.length : 0, texte: String(der.content || '').split('\\n')[0] });
          i++; suivant();
        }, 1500);
      });
    }
    function fin() {
      charlyIA.history = [];
      document.getElementById('charlyInput').value = 'William';
      Promise.resolve(charlySendMessage()).then(function () { setTimeout(function () {
        var html = (document.getElementById('charlyChatBody') || {}).innerHTML || '';
        res.bouton = (html.match(/Voir les \\d+/) || [''])[0];
        var m = charlyIA.history[charlyIA.history.length - 1];
        tcOuvrirContactsNom(m._fiches.voir.nom, m._fiches.voir.ids);
        setTimeout(function () {
          res.pageContacts = document.querySelectorAll('[id^=ctFiche_]').length;
          res.recherche = contactsSearchQuery;
          contactsSearchQuery = 'Willia'; renderContactsList();
          contactsList.push({ id: 'wnew', name: 'William Nouveau' });
          contactsSearchQuery = 'William'; renderContactsList();
          res.apresChangement = document.querySelectorAll('[id^=ctFiche_]').length;
          var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
        }, 800);
      }, 1500); });
    }
    navigate('assistant');
    setTimeout(suivant, 500);
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-nom-seul-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=90000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const e = (q, c) => (res && res.essais.find((x) => x.q === q && x.c === (c || ''))) || {};
  verifie('après le bouton, « William » : 10 fiches, « Voir les 25 », sans le modèle', e('William', 'bouton').fiches === 10 && e('William', 'bouton').voir === 25 && e('William', 'bouton').modele === 0, JSON.stringify(e('William', 'bouton')));
  verifie('« William » tout seul : les mêmes fiches, sans le modèle', e('William').fiches === 10 && e('William').voir === 25 && e('William').modele === 0 && e('William').texte === 'Tu as 25 contacts à ce nom. Voici les 10 premiers :', JSON.stringify(e('William')));
  verifie('« william ayache » : sa fiche, sans le modèle', e('william ayache').fiches === 1 && e('william ayache').modele === 0, JSON.stringify(e('william ayache')));
  verifie('« helene » sans accent et « Hélène » : les mêmes fiches', e('helene').voir > 10 && e('helene').voir === e('Hélène').voir, JSON.stringify([e('helene'), e('Hélène')]));
  verifie('« Sport », titre d un rendez-vous : pas de fiches', e('Sport').fiches === 0, JSON.stringify(e('Sport')));
  verifie('« annule », « rappel », « Bureau » (mots courants, même portés par un contact) : pas de fiches', e('annule').fiches === 0 && e('rappel').fiches === 0 && e('Bureau').fiches === 0, JSON.stringify([e('annule'), e('rappel'), e('Bureau')]));
  verifie('« Golf », titre d un rendez-vous importé : pas de fiches', e('Golf').fiches === 0, JSON.stringify(e('Golf')));
  verifie('la recherche changée puis retapée : la liste de Charly est oubliée, le nouveau William apparaît', !!res && res.apresChangement === 26, JSON.stringify(res && res.apresChangement));
  verifie('« Super », « Will », « Paul demain » : pas de fiches', e('Super').fiches === 0 && e('Will').fiches === 0 && e('Paul demain').fiches === 0, JSON.stringify([e('Super'), e('Will'), e('Paul demain')]));
  verifie('« Retrouve William » : 10 fiches et « Voir les 25 »', e('Retrouve William').fiches === 10 && e('Retrouve William').voir === 25, JSON.stringify(e('Retrouve William')));
  verifie('après le bouton, « Gaston » absent du carnet : « Je ne trouve pas « Gaston » dans tes contacts. Tu veux l’ajouter ? »', e('Gaston', 'bouton').texte === 'Je ne trouve pas « Gaston » dans tes contacts. Tu veux l’ajouter ?', JSON.stringify(e('Gaston', 'bouton')));
  verifie('une question en cours garde la priorité : « William » n y devient pas une liste de fiches', e('William', 'question').fiches === 0, JSON.stringify(e('William', 'question')));
  verifie('« Dentiste demain à 15h » garde son chemin (pas de fiches)', e('Dentiste demain à 15h').fiches === 0 && /Dentiste/.test(e('Dentiste demain à 15h').texte), JSON.stringify(e('Dentiste demain à 15h')));
  verifie('le bouton « Voir les 25 » est dessiné ; il ouvre « Mes contacts » sur ces 25 fiches', !!res && res.bouton === 'Voir les 25' && res.pageContacts === 25 && res.recherche === 'William', JSON.stringify(res && { b: res.bouton, p: res.pageContacts, r: res.recherche }));
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
