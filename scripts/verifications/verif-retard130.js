// Mission 130 B (Charles, 18/11) : prévenir d'un retard plusieurs personnes, pour la PÉRIODE dite ; jamais le seul prochain rendez-vous.
// Agenda d'essai, hors démonstration : aujourd'hui, un rendez-vous à venir avec Hugo (le « prochain ») ; demain matin Paul (TimeCool),
// Marie (un numéro), Léo (ni numéro, ni e-mail), Garage (sans contact) ; demain après-midi, Garage 2 seul (sans contact).
// Usage : node verif-retard130.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };

console.log('-- Le code --');
verifie('un retard pour plusieurs personnes passe d’abord par tcRetardPeriode130 (avant le retard d’une seule personne)', /async function tcGererPrevenance\(text, intent\) \{\n[^\n]*\n[^\n]*\n  if \(intent && intent\.type === 'retard' && typeof tcRetardPeriode130 === 'function' && await tcRetardPeriode130\(text\)\) return;/.test(page));
verifie('les envois sont ceux du retard habituel (tcQuestionnaireExecuter)', (page.match(/function tcQuestionnaireRetardPeriode130\(\) \{[\s\S]*?\n\}\n/) || [''])[0].indexOf('await tcQuestionnaireExecuter(r, ') > -1);
verifie('jamais « je ne peux pas joindre »', !/[Jj]e ne peux pas joindre/.test(page));

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
    hideAuthFlow(); navigate('assistant'); await attendre(500);
    if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.vrai = 30; TC_ATTENTE_DUREES.consulte = 30; }
    window.__envoyes = [];
    tcTransmettrePrevenance = async function (c, t) { window.__envoyes.push(c.name + ' : ' + t); return 'timecool'; };
    contactsList = [
      { id: 'c_paul', name: 'Paul Martin', phone: '06 39 98 00 11', email: '', referenceCompte: 'REF-PAUL' },
      { id: 'c_marie', name: 'Marie Durand', phone: '06 39 98 00 12', email: '' },
      { id: 'c_leo', name: 'Léo Petit', phone: '', email: '' },
      { id: 'c_hugo', name: 'Hugo Blanc', phone: '06 39 98 00 13', email: '' }
    ];
    var now = new Date();
    var iso = function (n) { return tcISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n)); };
    var D0 = iso(0), D1 = iso(1), NOEL = tcJoursCites(' 28 decembre ', now, false)[0];
    var hProchain = Math.min(22, now.getHours() + 1);
    var ev = function (id, date, h1, m1, h2, m2, titre, contact) { var e = { id: id, mode: 'user', date: date, startH: h1, startM: m1, endH: h2, endM: m2, title: titre, category: 'perso' }; if (contact) e.contact = contact; return e; };
    var remettre = function () {
      events = [ev('hugo', D0, hProchain, 0, hProchain, 59, 'Café avec Hugo', 'c_hugo'),
        ev('paul', D1, 9, 0, 10, 0, 'Rendez-vous Paul', 'c_paul'), ev('marie', D1, 10, 0, 10, 30, 'Rendez-vous Marie', 'c_marie'),
        ev('leo', D1, 10, 30, 11, 0, 'Rendez-vous Léo', 'c_leo'), ev('garage', D1, 11, 30, 11, 59, 'Garage'),
        ev('garage2', D1, 15, 0, 16, 0, 'Garage 2')];
      charlyIA.history = []; tcQuestionnaireArreter(); window.__envoyes = []; renderCharlyChat();
    };
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(700); };
    var tout = function (n0) { return charlyIA.history.slice(n0).filter(function (m) { return m && m.role !== 'user'; }).map(function (m) { return String(m.content || '').replace(/<[^>]+>/g, ' '); }).join(' / '); };
    // 1. Demain matin : Paul et Marie prévenus ; Léo (sans moyen) et le Garage (sans contact) listés à part ; jamais Hugo (le prochain).
    remettre();
    var n0 = charlyIA.history.length;
    await taper('Préviens mes clients de demain matin que j’aurai 15 minutes de retard');
    R.c1 = tout(n0);
    R.boutons1 = document.querySelectorAll('#charlyChatBody .tc-ajouter-contact-130').length;
    var n1 = charlyIA.history.length;
    await taper('oui');
    R.o1 = { dit: tout(n1), envoyes: window.__envoyes.slice(), pret: JSON.stringify(charlyIA.history.filter(function (m) { return m && m._envois; }).map(function (m) { return m._envois.map(function (x) { return x.nom; }); })) };
    // 2. « J'ai 30 minutes de retard, préviens tout le monde demain matin » : même chose, 30 minutes ; « non » : rien ne part.
    remettre();
    n0 = charlyIA.history.length;
    await taper('J’ai 30 minutes de retard, préviens tout le monde demain matin');
    R.c2 = tout(n0);
    n1 = charlyIA.history.length;
    await taper('non');
    R.o2 = { dit: tout(n1), envoyes: window.__envoyes.length };
    // 3. Demain après-midi : seul le Garage 2, sans contact : listé à part, aucune question d'envoi.
    remettre();
    n0 = charlyIA.history.length;
    await taper('Préviens tous mes rendez-vous de demain après-midi que j’aurai 15 minutes de retard');
    R.c3 = tout(n0); R.q3 = !!_tcQuestionnaire;
    // 4. Une période sans rendez-vous : le dire simplement.
    remettre();
    n0 = charlyIA.history.length;
    await taper('Préviens mes patients du 28 décembre que j’aurai 10 minutes de retard');
    R.c4 = tout(n0);
    // 5. Une seule personne (contact nommé) : le chemin d'avant, inchangé.
    remettre();
    n0 = charlyIA.history.length;
    await taper('Préviens Hugo que j’aurai 10 minutes de retard');
    R.c5 = tout(n0);
    // 6. « Ajouter un contact » : la fiche du rendez-vous, modifiable, sur le choix du contact.
    remettre();
    await taper('Préviens tous mes rendez-vous de demain après-midi que j’aurai 15 minutes de retard');
    var b = document.querySelector('#charlyChatBody .tc-ajouter-contact-130');
    if (b) b.click();
    await attendre(400);
    R.ajout = { modale: !!(document.getElementById('eventModal') && document.getElementById('eventModal').classList.contains('open')), champ: !!document.getElementById('editContact'), courant: (typeof currentEvent !== 'undefined' && currentEvent) ? currentEvent.id : null };
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-130b-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=90000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) { verifie('la page a rejoué les parcours', false, (r.stdout || '').slice(-300)); }
else if (S.erreur) { verifie('aucune erreur', false, S.erreur); }
else {
  const SANS = (x) => !/Lequel|je ne peux|pas bien compris/i.test(x);
  verifie('« Préviens mes clients de demain matin… » : Paul et Marie, la période dite (« demain matin »), le message, un seul « Je leur envoie ? »', /Je préviens 2 personnes de ton retard, demain matin :/.test(S.c1) && /Paul Martin/.test(S.c1) && /Marie Durand/.test(S.c1) && /Voici le message pour Paul/.test(S.c1) && /Je serai là vers 9h15/.test(S.c1) && (S.c1.match(/Je leur envoie \?/g) || []).length === 1 && SANS(S.c1), S.c1);
  verifie('jamais le seul prochain rendez-vous (Hugo, aujourd’hui) quand une période est dite', !/Hugo/.test(S.c1) && !/Hugo/.test(S.c2) && !/Hugo/.test(S.o1.dit) && !S.o1.envoyes.some(function (x) { return /Hugo/.test(x); }), JSON.stringify([S.c1.slice(0, 200), S.o1.envoyes]));
  verifie('sans contact joignable, à part : « Pour « Rendez-vous Léo », je n’ai pas de contact. Tu veux l’ajouter ? », de même pour le Garage, avec « Ajouter un contact »', /Pour « Rendez-vous Léo », je n’ai pas de contact\. Tu veux l’ajouter\s\?/.test(S.c1) && /Pour « Garage », je n’ai pas de contact\. Tu veux l’ajouter\s\?/.test(S.c1) && S.boutons1 === 2, JSON.stringify([S.c1, S.boutons1]));
  verifie('« oui » : Paul prévenu par la messagerie TimeCool, le message de Marie prêt (SMS) ; Léo et le Garage ne reçoivent rien', S.o1.envoyes.length === 1 && /^Paul Martin : .*15 minutes de retard/.test(S.o1.envoyes[0]) && /Marie Durand/.test(S.o1.pret) && !/Léo|Garage/.test(S.o1.pret) && /C’est fait/.test(S.o1.dit) && /Prévenu par la messagerie TimeCool : Paul/.test(S.o1.dit), JSON.stringify(S.o1));
  verifie('« J’ai 30 minutes de retard, préviens tout le monde demain matin » : 30 minutes, demain matin ; « non » : rien ne part', /Je préviens 2 personnes de ton retard, demain matin/.test(S.c2) && /30 minutes de retard/.test(S.c2) && /je n’envoie rien/.test(S.o2.dit) && S.o2.envoyes === 0 && SANS(S.c2), JSON.stringify([S.c2, S.o2]));
  verifie('une période où personne n’est joignable : la ligne à part seulement, aucune question d’envoi', /Pour « Garage 2 », je n’ai pas de contact/.test(S.c3) && !/Je leur envoie|Je lui envoie/.test(S.c3) && S.q3 === false, JSON.stringify([S.c3, S.q3]));
  verifie('une période sans rendez-vous : « Tu n’as aucun rendez-vous … 28 décembre : personne à prévenir. »', /^Tu n’as aucun rendez-vous [a-z]+ 28 décembre : personne à prévenir\.$/.test(S.c4), S.c4);
  verifie('une seule personne (« Préviens Hugo… ») : le retard d’avant, inchangé', /Je préviens Hugo de ton retard/.test(S.c5) && /Je lui envoie \?/.test(S.c5), S.c5);
  verifie('« Ajouter un contact » ouvre la fiche du rendez-vous, sur le choix du contact', S.ajout.modale === true && S.ajout.champ === true && S.ajout.courant === 'garage2', JSON.stringify(S.ajout));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
