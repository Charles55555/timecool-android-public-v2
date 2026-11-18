// Mission 131 (2e lot) : phrases 4 à 6 de la démonstration du dentiste, dans la démonstration ET en vrai, et les deux défauts anciens
// du retard (« Préviens Paul et Marie… » prévient les deux ; « … sauf Paul » prévient tout le monde sauf Paul).
// Usage : node verif-demo-pro131b.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700).replace(/\n/g, ' ⏎ ') : '')); };

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
    if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 40; TC_ATTENTE_DUREES.vrai = 40; TC_ATTENTE_DUREES.feuilles = 40; TC_ATTENTE_DUREES.consulte = 40; }
    var statuts = [];
    var statutOrig = tcDefinirStatutCharly;
    tcDefinirStatutCharly = function (t) { statuts.push(String(t)); return statutOrig.apply(this, arguments); };
    var tout = function (n0) { return charlyIA.history.slice(n0).filter(function (m) { return m && m.role !== 'user'; }).map(function (m) { return (m.role === 'tiers' ? 'VERT ' : '') + String(m.content || '').replace(/<[^>]+>/g, ' ') + (m._questionnaire && m._questionnaire.question ? ' ' + m._questionnaire.question : '') + (m._groupe ? ' [groupe ' + (m._groupe.creneaux || []).length + ' ' + String(renderChatMessage(m)).replace(/<[^>]+>/g, ' ') + ']' : ''); }).join(' / '); };
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(2500); };
    FEATURES.CHARLY_PRO = true;
    await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    // 1. Démonstration : phrase 5, puis « En personne » : les étapes « Charly consulte… », les créneaux communs.
    await tcOuvrirDemo(); await attendre(400);
    var n0 = charlyIA.history.length;
    await tcDemoJouer('reunion'); await attendre(2500);
    R.d5 = tout(n0);
    var n1 = charlyIA.history.length;
    statuts = [];
    await taper('En personne'); await attendre(8000);
    R.d5b = tout(n1); R.statuts5 = statuts.slice();
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // 2. Démonstration : phrase 6, puis « Oui » : les patients choisissent, le compte rendu.
    await tcOuvrirDemo(); await attendre(400);
    n0 = charlyIA.history.length;
    await tcDemoJouer('malade'); await attendre(9000);
    R.d6 = tout(n0);
    var q = charlyIA.history.filter(function (m) { return m && m._questionnaire && m._questionnaire.etat === 'choix'; }).pop();
    if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await attendre(25000); }
    R.d6b = tout(n0);
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // 3. En vrai : un compte sans données d'exemple.
    var now = new Date(), iso = function (n) { return tcISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n)); };
    var ev = function (id, date, h1, m1, h2, m2, titre, contact) { var e = { id: id, mode: 'user', date: date, startH: h1, startM: m1, endH: h2, endM: m2, title: titre, category: 'sante' }; if (contact) e.contact = contact; return e; };
    var vendredi = tcISO(tcDemoVendredi());
    var hP = Math.min(21, now.getHours() + 1);
    var remettre = function () {
      contactsList = [{ id: 'c_paul', name: 'Paul Martin', phone: '06 39 98 00 41', email: '', vouvoie: true }, { id: 'c_marie', name: 'Marie Durand', phone: '06 39 98 00 42', email: '', vouvoie: true }, { id: 'c_zoe', name: 'Zoé Petit', phone: '06 39 98 00 43', email: '', vouvoie: true },
        { id: 'c_lea', name: 'Léa Grand', phone: '06 39 98 00 44', email: '', referenceCompte: 'REF-LEA' }, { id: 'c_banque', name: 'Banque Populaire', phone: '01 00 00 00 01', email: '' }];
      events = [ev('a1', iso(0), hP, 0, hP, 30, 'RDV Paul Martin : contrôle', 'c_paul'), ev('a2', iso(0), hP, 30, hP + 1, 0, 'RDV Marie Durand : détartrage', 'c_marie'), ev('a3', iso(0), hP, 45, hP, 59, 'Banque', 'c_banque'),
        ev('b1', iso(1), 9, 0, 9, 30, 'RDV Paul Martin : soin', 'c_paul'), ev('b2', iso(1), 10, 0, 10, 30, 'RDV Marie Durand : contrôle', 'c_marie'), ev('b3', iso(1), 11, 0, 11, 30, 'RDV Zoé Petit : détartrage', 'c_zoe'),
        ev('f1', vendredi, 9, 0, 10, 0, 'RDV vendredi', null)];
      charlyIA.history = []; if (typeof tcQuestionnaireArreter === 'function') tcQuestionnaireArreter(); renderCharlyChat();
    };
    remettre(); n0 = charlyIA.history.length; await taper('Quand suis-je libre vendredi pour une urgence ?'); R.v4 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Trouve une réunion commune avec mon assistante et mon prothésiste'); R.v5 = tout(n0);
    R.v5boutons = Array.prototype.map.call(document.querySelectorAll('#charlyChatBody .tc-ajouter-fiche-131'), function (b) { return b.textContent; });
    remettre(); n0 = charlyIA.history.length; await taper('Je suis malade, décale tous mes patients de la semaine'); await attendre(3000); R.v6 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens Paul et Marie que j’ai 10 minutes de retard'); R.dA = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf Paul que j’aurai 15 minutes de retard'); R.dB = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens Paul que j’aurai 10 minutes de retard'); R.dC = tout(n0);
    // Examen du 2e lot.
    remettre(); n0 = charlyIA.history.length; await taper('Préviens Paul et Marie que j’aurai 10 minutes de retard demain'); R.x1 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens Paul que j’aurai 10 minutes de retard pour la banque'); R.x2 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf Paul Martin que j’ai 10 minutes de retard'); R.x3 = tout(n0);
    var boutons = function () { return Array.prototype.map.call(document.querySelectorAll('#charlyChatBody .tc-ajouter-fiche-131'), function (b) { return b.textContent; }); };
    remettre(); n0 = charlyIA.history.length; await taper('Trouve un créneau avec mon grand frère'); R.x4 = tout(n0); R.x4b = boutons();
    remettre(); n0 = charlyIA.history.length; await taper('Trouve un créneau avec ma femme'); R.x5 = tout(n0); R.x5b = boutons();
    remettre(); n0 = charlyIA.history.length; await taper('Organise une réunion avec mes collègues'); R.x6 = tout(n0); R.x6b = boutons();
    // Mission 132.
    var plus = function () { contactsList.push({ id: 'c_jean', name: 'Jean Lune', phone: '06 39 98 00 45', email: '', vouvoie: true }); events.push(ev('b4', iso(1), 15, 0, 15, 30, 'RDV Jean Lune : contrôle', 'c_jean')); };
    remettre(); plus(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf ceux de l’après-midi que j’ai 10 minutes de retard'); R.y1 = tout(n0);
    remettre(); plus(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf ceux du matin que j’ai 10 minutes de retard'); R.y1b = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf Bruno que j’ai 10 minutes de retard'); R.y2 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf Paul et Bruno que j’ai 10 minutes de retard'); R.y2b = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Quand suis-je libre avec ma femme ?'); R.y3 = tout(n0); R.y3b = boutons();
    remettre(); n0 = charlyIA.history.length; await taper('Quand suis-je libre avec ma femme cette semaine ?'); R.y4 = tout(n0); R.y4b = boutons();
    remettre(); n0 = charlyIA.history.length; await taper('Quand suis-je libre avec Paul ?'); R.y5 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain que j’aurai 10 minutes de retard, sauf contrordre'); R.y6 = tout(n0);
    remettre(); n0 = charlyIA.history.length; await taper('Préviens mes clients de demain sauf changement que j’ai 10 minutes de retard'); R.y6b = tout(n0);
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-131b-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=150000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) { verifie('la page a rejoué les parcours', false, (r.stdout || '').slice(-300)); }
else if (S.erreur) { verifie('aucune erreur', false, S.erreur); }
else {
  const SANS = (x) => !/je ne peux|pas bien compris|Lequel|Dans la démonstration, je te montre/.test(x);
  verifie('démonstration, phrase 5 : l’assistante et le prothésiste trouvés, « Par téléphone, en personne ou en visio ? »', /Par téléphone, en personne ou en visio/.test(S.d5) && SANS(S.d5), S.d5);
  verifie('démonstration, phrase 5, « En personne » : « Charly consulte les préférences et les disponibilités de Sophie… », « … de Marc… », puis les créneaux communs', S.statuts5.some(function (x) { return /consulte les préférences et les disponibilités de Sophie/.test(x); }) && S.statuts5.some(function (x) { return /consulte les préférences et les disponibilités de Marc/.test(x); }) && /\[groupe [1-9]/.test(S.d5b) && /vous êtes tous libres \(toi, Sophie et Marc\)/.test(S.d5b) && !/(Samedi|Dimanche) \d/.test(S.d5b) && !/· 8h/.test(S.d5b) && SANS(S.d5b), JSON.stringify([S.statuts5, S.d5b]));
  verifie('démonstration, phrase 6 : « Tu es malade. Je déplace … rendez-vous », les patients de la semaine', /Tu es malade\. Je déplace \d+ rendez-vous\./.test(S.d6) && /Claire/.test(S.d6) && SANS(S.d6), S.d6);
  verifie('démonstration, phrase 6 : après le oui, leurs choix (vert) et le compte rendu', /VERT C’est bon pour/.test(S.d6b) && /a choisi .*J’ai déplacé/.test(S.d6b), S.d6b.slice(-500));
  verifie('en vrai, phrase 4 : les créneaux libres de vendredi', /Voici ce qui est libre ce vendredi/.test(S.v4) && SANS(S.v4), S.v4);
  verifie('en vrai, phrase 5 sans fiche (décision du chef) : « Je m’en occupe. Je ne trouve pas ton assistante ni ton prothésiste dans tes contacts. », un bouton par personne, puis tes créneaux libres ; jamais le modèle', /Je m’en occupe\. Je ne trouve pas ton assistante ni ton prothésiste dans tes contacts\./.test(S.v5) && /Voici ce qui est libre/.test(S.v5) && JSON.stringify(S.v5boutons) === JSON.stringify(['Ajouter ton assistante', 'Ajouter ton prothésiste']) && SANS(S.v5), JSON.stringify([S.v5, S.v5boutons]));
  verifie('en vrai, phrase 6 : « Tu es malade. Je déplace … rendez-vous » (les patients de la semaine)', /Tu es malade\. Je déplace \d+ rendez-vous\./.test(S.v6) && SANS(S.v6), S.v6);
  verifie('défaut ancien : « Préviens Paul et Marie que j’ai 10 minutes de retard » prévient les deux (un seul « Je leur envoie ? »)', /Je préviens 2 personnes de ton retard/.test(S.dA) && /Paul Martin/.test(S.dA) && /Marie Durand/.test(S.dA) && /Je leur envoie \?/.test(S.dA) && SANS(S.dA), S.dA);
  verifie('défaut ancien : « Préviens mes clients de demain sauf Paul… » : Marie et Zoé, pas Paul, et la carte le dit', /Je préviens 2 personnes de ton retard, demain/.test(S.dB) && /Marie Durand/.test(S.dB) && /Zoé Petit/.test(S.dB) && !/• Paul Martin/.test(S.dB) && /Je ne préviens pas Paul\./.test(S.dB) && SANS(S.dB), S.dB);
  verifie('une seule personne nommée (« Préviens Paul… ») : le retard d’avant, inchangé', /Je préviens Paul de ton retard/.test(S.dC), S.dC);
  verifie('examen : « Préviens Paul et Marie… demain » : leurs rendez-vous de demain (9h10, 10h10), pas ceux d’aujourd’hui', /Je préviens 2 personnes de ton retard, demain/.test(S.x1) && /Je serai là vers 9h10/.test(S.x1) && SANS(S.x1), S.x1);
  verifie('examen : « Préviens Paul … pour la banque » : Paul seul (« la banque » n’est pas « Banque Populaire »)', /Je préviens Paul de ton retard/.test(S.x2) && !/Banque Populaire|2 personnes/.test(S.x2), S.x2);
  verifie('examen : « … sauf Paul Martin … » : Marie et Zoé, pas Paul, et la carte le dit', /Je préviens 2 personnes de ton retard, demain/.test(S.x3) && !/• Paul Martin/.test(S.x3) && /Je ne préviens pas Paul\./.test(S.x3), S.x3);
  verifie('examen et décision du chef : « Trouve un créneau avec mon grand frère » : jamais la fiche « Léa Grand » ; « Je ne trouve pas ton grand frère », « Ajouter un contact », tes créneaux libres', !/Par téléphone, en personne ou en visio|Léa/.test(S.x4) && /Je m’en occupe\. Je ne trouve pas ton grand frère dans tes contacts\./.test(S.x4) && /Voici ce qui est libre/.test(S.x4) && JSON.stringify(S.x4b) === JSON.stringify(['Ajouter un contact']), JSON.stringify([S.x4, S.x4b]));
  verifie('décision du chef : « Trouve un créneau avec ma femme » : « Je ne trouve pas ta femme dans tes contacts. », tes créneaux libres comme avant, « Ajouter un contact » (jamais seulement « ajoute sa fiche »)', /Je m’en occupe\. Je ne trouve pas ta femme dans tes contacts\./.test(S.x5) && /Voici ce qui est libre/.test(S.x5) && JSON.stringify(S.x5b) === JSON.stringify(['Ajouter un contact']) && !/Ajoute sa fiche/.test(S.x5), JSON.stringify([S.x5, S.x5b]));
  verifie('« Organise une réunion avec mes collègues » : « Je ne trouve pas tes collègues dans tes contacts. », tes créneaux libres, « Ajouter un contact »', /Je ne trouve pas tes collègues dans tes contacts/.test(S.x6) && /Voici ce qui est libre/.test(S.x6) && JSON.stringify(S.x6b) === JSON.stringify(['Ajouter un contact']), JSON.stringify([S.x6, S.x6b]));
  verifie('mission 132 : « … de demain sauf ceux de l’après-midi … » : ceux du matin seulement, et la carte le dit', /Je préviens 3 personnes de ton retard, demain matin/.test(S.y1) && !/Jean Lune/.test(S.y1) && /Je ne préviens pas ceux de l’après-midi\./.test(S.y1) && !/aucun rendez-vous/.test(S.y1), S.y1);
  verifie('mission 132 : « … de demain sauf ceux du matin … » : ceux de l’après-midi seulement, et la carte le dit', /Je préviens 1 personne de ton retard, demain après-midi/.test(S.y1b) && /Jean Lune/.test(S.y1b) && !/• Paul Martin/.test(S.y1b) && /Je ne préviens pas ceux du matin\./.test(S.y1b), S.y1b);
  verifie('mission 132 : « … sauf Bruno … » (pas une fiche) : tout le monde, et « Je ne trouve pas Bruno dans tes rendez-vous de demain. » avant « Je leur envoie ? »', /Je préviens 3 personnes de ton retard, demain :/.test(S.y2) && /Je ne trouve pas Bruno dans tes rendez-vous de demain\.[\s\S]*Je leur envoie/.test(S.y2) && !/Je ne préviens pas/.test(S.y2), S.y2);
  verifie('mission 132 : « … sauf Paul et Bruno … » : Marie et Zoé, « Je ne préviens pas Paul. » et « Je ne trouve pas Bruno… »', /Je préviens 2 personnes de ton retard, demain :/.test(S.y2b) && /Je ne préviens pas Paul\./.test(S.y2b) && /Je ne trouve pas Bruno dans tes rendez-vous de demain\./.test(S.y2b) && !/• Paul Martin/.test(S.y2b), S.y2b);
  verifie('mission 132 : « Quand suis-je libre avec ma femme ? » : comme « Trouve un créneau avec ma femme » (message, créneaux, « Ajouter un contact »)', /Je m’en occupe\. Je ne trouve pas ta femme dans tes contacts\./.test(S.y3) && /Voici ce qui est libre/.test(S.y3) && JSON.stringify(S.y3b) === JSON.stringify(['Ajouter un contact']), JSON.stringify([S.y3, S.y3b]));
  verifie('mission 132 : « Quand suis-je libre avec ma femme cette semaine ? » : pareil', /Je m’en occupe\. Je ne trouve pas ta femme dans tes contacts\./.test(S.y4) && /Voici ce qui est libre|Je ne vois aucun créneau libre/.test(S.y4) && JSON.stringify(S.y4b) === JSON.stringify(['Ajouter un contact']), JSON.stringify([S.y4, S.y4b]));
  verifie('mission 132 : « Quand suis-je libre avec Paul ? » (une fiche) : jamais « Je ne trouve pas »', !/Je ne trouve pas/.test(S.y5), S.y5);
  verifie('examen 132 : « … , sauf contrordre », « sauf changement » : tout le monde, sans « Je ne trouve pas » (un mot en minuscules n’est pas un prénom)', /Je préviens 3 personnes de ton retard, demain/.test(S.y6) && !/Je ne trouve pas|Contrordre/.test(S.y6) && /Je préviens 3 personnes de ton retard, demain/.test(S.y6b) && !/Je ne trouve pas|Changement/.test(S.y6b), JSON.stringify([S.y6, S.y6b]));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
