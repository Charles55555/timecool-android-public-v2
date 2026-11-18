// Mission 130 A (Charles, 18/11) : décaler une période en une phrase (matinée, après-midi, journée, semaine), sans « Lequel ? », sans
// « je ne trouve pas », sans le modèle. Un agenda d'essai, hors démonstration : demain Kiné 9h-10h, Banque 10h30-11h, Réunion 14h-15h ;
// après-demain Garage 10h-11h ; le 28 décembre Notaire 15h-16h. Chaque parcours va jusqu'au oui (ou au non) et lit l'agenda.
// Usage : node verif-periode130.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };

console.log('-- Le code --');
verifie('la lecture d’une période est dans la page, après « décale tout lundi », avant le chemin d’un seul rendez-vous', /tcDecalerToutUnJour\(text\)\) return;\n[^\n]*\n  if \(typeof tcDecalerPeriode130 === 'function' && tcDecalerPeriode130\(text\)\) return;/.test(page));
verifie('la réponse à « Vers quand ? » d’une période passe par tcRepondrePeriode130', /if \(attente && attente\.p130 && typeof tcRepondrePeriode130 === 'function'\) return tcRepondrePeriode130\(text, attente\);/.test(page));
verifie('au oui, le déplacement habituel (profils, contacts) : la relecture tcRelireDeplacement, jamais un autre chemin', (page.match(/function tcTravaillerPeriode130[\s\S]*?\n\}\n/) || [''])[0].indexOf('tcRelireDeplacement(tcPlacesPeriode130(touches, o));') > -1);

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
    contactsList = [];
    var now = new Date();
    var iso = function (n) { return tcISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n)); };
    var plus7 = function (d) { var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + 7); return tcISO(x); };
    var D1 = iso(1), D2 = iso(2), NOEL = tcJoursCites(' 28 decembre ', now, false)[0];
    var ev = function (id, date, h1, m1, h2, m2, titre) { return { id: id, mode: 'user', date: date, startH: h1, startM: m1, endH: h2, endM: m2, title: titre, category: 'perso' }; };
    var remettre = function () {
      events = [ev('k', D1, 9, 0, 10, 0, 'Kiné'), ev('b', D1, 10, 30, 11, 0, 'Banque'), ev('r', D1, 14, 0, 15, 0, 'Réunion'), ev('g', D2, 10, 0, 11, 0, 'Garage'), ev('n', NOEL, 15, 0, 16, 0, 'Notaire')];
      charlyIA.history = []; _tcDeplacementPeriode = null; _tcDeplacementEnAttente = null; renderCharlyChat();
    };
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(500); };
    var dit = function () { return charlyIA.history.filter(function (m) { return m && m.role !== 'user'; }).slice(-2).map(function (m) { return String(m.content || '').replace(/<[^>]+>/g, ' '); }).join(' / '); };
    var place = function (id) { var e = events.filter(function (x) { return x.id === id; })[0]; return e ? [e.date, e.startH, e.startM, e.endH, e.endM].join('|') : null; };
    R.D1 = D1; R.D2 = D2; R.NOEL = NOEL; R.D1p7 = plus7(D1);
    // 1. Matinée de demain, sans destination : « Vers quand ? », puis la semaine prochaine, puis oui.
    remettre();
    await taper('Décale ma matinée de demain'); R.q1 = dit(); R.attente1 = !!(_tcDeplacementPeriode && _tcDeplacementPeriode.p130);
    await taper('à la semaine prochaine'); R.r1 = dit();
    await taper('oui'); R.o1 = { k: place('k'), b: place('b'), r: place('r'), g: place('g'), dit: dit(), voir: !!document.querySelector('#charlyChatBody .tc-voir-agenda') };
    // 2. L'après-midi de demain, d'une heure.
    remettre();
    await taper('Décale mes rendez-vous de demain après-midi d’une heure'); R.r2 = dit();
    await taper('oui'); R.o2 = { r: place('r'), k: place('k') };
    // 3. Avancer la matinée de 30 minutes : les deux glissent, aucun faux « déjà là » entre eux.
    remettre();
    await taper('Avance ma matinée de demain de 30 minutes'); R.r3 = dit();
    await taper('oui'); R.o3 = { k: place('k'), b: place('b') };
    // 4. Vers après-demain : le Garage chevauche la Banque, c'est dit.
    remettre();
    await taper('Décale ma matinée de demain à après-demain'); R.r4 = dit();
    // 5. La semaine, à la semaine prochaine : chaque rendez-vous de la semaine, sept jours plus tard.
    remettre();
    var sem = tcPeriodeAgenda('cette semaine'), d0 = tcISO(sem.debut), d9 = tcISO(sem.fin);
    var dans = events.filter(function (e) { return e.date >= d0 && e.date <= d9; }).map(function (e) { return [e.id, e.date]; });
    await taper('Décale ma semaine à la semaine prochaine'); R.r5 = dit();
    await taper('oui');
    R.o5 = dans.length > 0 && dans.every(function (x) { return place(x[0]).split('|')[0] === plus7(x[1]); }) && place('n').split('|')[0] === NOEL;
    R.n5 = dans.length;
    // 6. Matinée vide : « Tu n'as aucun rendez-vous … », la journée proposée ; oui → « Vers quand ? » ; d'une heure → relecture ; non → rien.
    remettre();
    await taper('Décale ma matinée du 28 décembre'); R.r6 = dit();
    await taper('oui'); R.r6b = dit();
    await taper('d’une heure'); R.r6c = dit();
    await taper('non'); R.o6 = { n: place('n'), dit: dit() };
    // 7. Une nouvelle demande après « Vers quand ? » : la question tombe, la demande est lue.
    remettre();
    await taper('Décale toute ma semaine'); R.q7 = dit();
    await taper('Décale mes rendez-vous de demain après-midi d’une heure'); R.r7 = dit();
    // 8. Une réponse illisible : « Vers quand ? » une fois de plus, puis « à jeudi » marche.
    remettre();
    await taper('Décale ma matinée de demain'); await taper('bof'); R.r8 = dit(); R.attente8 = !!_tcDeplacementPeriode;
    await taper('à jeudi'); R.r8b = dit();
    // 9. Pas cette demande : un seul rendez-vous, une heure, rien de dit.
    remettre();
    R.pasNous = ['Décale mon rendez-vous de demain', 'Décale le dentiste de 30 minutes', 'Décale mes rendez-vous de 9h à 10h', 'Décale tout'].map(function (t) {
      var n = charlyIA.history.length; var r = tcDecalerPeriode130(t); return r === false && charlyIA.history.length === n;
    });
    // 10. « après midi » dicté (sans trait d'union) reste l'après-midi ; « à midi » reste 12 heures.
    R.midi = [tcHeuresEnLettres('Décale mes rendez vous de cet après midi'), tcHeuresEnLettres('Rendez-vous demain à midi')];
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-130a-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=90000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) { verifie('la page a rejoué les parcours', false, (r.stdout || '').slice(-300)); }
else if (S.erreur) { verifie('aucune erreur', false, S.erreur); }
else {
  const P = (d, h1, m1, h2, m2) => [d, h1, m1, h2, m2].join('|');
  const SANS = (x) => !/Lequel|Je ne trouve pas|je ne peux|pas bien compris/.test(x);
  verifie('« Décale ma matinée de demain » : la matinée seule (Kiné, Banque ; pas la Réunion), une seule question « Vers quand ? »', /Demain matin, tu as 2 rendez-vous/.test(S.q1) && /Kiné/.test(S.q1) && /Banque/.test(S.q1) && !/Réunion/.test(S.q1) && /Vers quand je les décale \?/.test(S.q1) && S.attente1 && SANS(S.q1), S.q1);
  verifie('« à la semaine prochaine » : la relecture, avant et après, et UN seul oui', /Tu veux que je décale ces 2 rendez-vous \?/.test(S.r1) && /Avant :/.test(S.r1) && /Après :/.test(S.r1) && /Réponds « oui » ou « non »/.test(S.r1) && SANS(S.r1), S.r1);
  verifie('« oui » : Kiné et Banque sept jours plus tard, mêmes heures ; la Réunion et le Garage ne bougent pas', S.o1.k === P(S.D1p7, 9, 0, 10, 0) && S.o1.b === P(S.D1p7, 10, 30, 11, 0) && S.o1.r === P(S.D1, 14, 0, 15, 0) && S.o1.g === P(S.D2, 10, 0, 11, 0), JSON.stringify(S.o1));
  verifie('après le oui : « C’est fait » et « Voir dans mon agenda » sous la réponse', /C.est fait/.test(S.o1.dit) && S.o1.voir === true, JSON.stringify([S.o1.dit, S.o1.voir]));
  verifie('« … de demain après-midi d’une heure » : la Réunion seule, 15h à 16h, au oui', /Réunion/.test(S.r2) && !/Kiné/.test(S.r2) && /15h à 16h/.test(S.r2) && S.o2.r === P(S.D1, 15, 0, 16, 0) && S.o2.k === P(S.D1, 9, 0, 10, 0) && SANS(S.r2), JSON.stringify([S.r2, S.o2]));
  verifie('« Avance ma matinée de demain de 30 minutes » : 8h30-9h30 et 10h-10h30, aucun faux « déjà là » entre eux', !/À cette heure-là/.test(S.r3) && S.o3.k === P(S.D1, 8, 30, 9, 30) && S.o3.b === P(S.D1, 10, 0, 10, 30) && SANS(S.r3), JSON.stringify([S.r3, S.o3]));
  verifie('« … à après-demain » : le conflit est dit (« À cette heure-là, tu as déjà « Garage » »)', /Après : .*10h30 à 11h/.test(S.r4) && /À cette heure-là, tu as déjà « Garage »/.test(S.r4) && SANS(S.r4), S.r4);
  verifie('« Décale ma semaine à la semaine prochaine » : chaque rendez-vous de la semaine sept jours plus tard, le reste ne bouge pas', S.o5 === true && /Tu veux que je décale/.test(S.r5) && SANS(S.r5), JSON.stringify([S.n5, S.r5.slice(0, 200)]));
  verifie('matinée vide : « Tu n’as aucun rendez-vous … 28 décembre au matin. », puis la journée proposée', /^Tu n’as aucun rendez-vous [a-z]+ 28 décembre au matin\.\n.*28 décembre, tu as 1 rendez-vous\.\nTu veux que je décale toute ta journée \?/.test(S.r6), S.r6);
  verifie('oui → « Vers quand je le décale ? » (le Notaire) ; d’une heure → relecture 16h à 17h ; non → rien ne bouge', /Notaire/.test(S.r6b) && /Vers quand je le décale \?/.test(S.r6b) && /16h à 17h/.test(S.r6c) && S.o6.n === P(S.NOEL, 15, 0, 16, 0) && /je ne change rien/.test(S.o6.dit), JSON.stringify([S.r6b, S.r6c, S.o6]));
  verifie('une nouvelle demande après « Vers quand ? » est lue (jamais « je n’ai pas bien compris »)', /Vers quand je les décale/.test(S.q7) && /Réunion/.test(S.r7) && /16h/.test(S.r7) && SANS(S.r7), JSON.stringify([S.q7.slice(0, 120), S.r7]));
  verifie('une réponse illisible : « Vers quand ? » redemandé une fois, puis « à jeudi » mène à la relecture', /Vers quand/.test(S.r8) && S.attente8 === true && /Tu veux que je décale/.test(S.r8b) && /Après : Jeudi/.test(S.r8b), JSON.stringify([S.r8, S.r8b]));
  verifie('pas cette demande (un seul rendez-vous, une heure, « tout » sans moment) : rien ici, le chemin d’avant', S.pasNous.every(Boolean), JSON.stringify(S.pasNous));
  verifie('« après midi » dicté reste l’après-midi ; « à midi » reste 12 heures', /après midi/.test(S.midi[0]) && !/12 heures/.test(S.midi[0]) && /12 heures/.test(S.midi[1]), JSON.stringify(S.midi));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
