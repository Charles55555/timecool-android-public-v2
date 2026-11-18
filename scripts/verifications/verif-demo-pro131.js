// Mission 131 (Charles, 18/11) : la démonstration du chirurgien-dentiste, dans Charly Pro IA ; celle de Charly IA ne change pas.
// Le titre (deux lignes au téléphone, une au PC), les six phrases dans l'ordre, l'agenda du cabinet et les contacts d'exemple, les
// garanties de la 107 (rien écrit sur l'appareil, aucun appel réseau, le profil 2 seulement dans la démonstration), et les phrases
// 1 à 3 jouées jusqu'au bout, dans la démonstration ET en vrai (hors démonstration, un compte sans données d'exemple).
// Usage : node verif-demo-pro131.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
const NB = String.fromCharCode(160);
const PHRASES = [
  'Note-moi un rendez-vous demain avec mon commercial Matériaux',
  'Préviens mes patients à venir et excuse-moi auprès d’eux' + NB + ': j’ai un retard de 30 minutes',
  'Demain j’ai un imprévu et je ne pourrai pas travailler. Préviens tous mes patients de la matinée, excuse-moi auprès d’eux et décale tous leurs rendez-vous',
  'Quand suis-je libre vendredi pour une urgence' + NB + '?',
  'Trouve une réunion commune avec mon assistante et mon prothésiste',
  'Je suis malade, décale tous mes patients de la semaine'
];

console.log('-- Le code --');
verifie('la démonstration de Charly IA garde ses cinq phrases', /const TC_DEMO_PHRASES = \[\n  \{ id: 'michel', texte: 'Demande un rendez-vous demain à mon ami Michel' \},/.test(page) && /\{ id: 'malade', texte: 'Je suis malade, décale ma journée de demain' \}\n\];/.test(page));
verifie('les phrases de la démonstration suivent la démonstration ouverte (tcDemoPhrases), jamais la liste de Charly IA en dur', (page.match(/TC_DEMO_PHRASES\.(filter|find|forEach)\(/g) || []).length === 0);

console.log('-- Dans la page (Chrome) --');
// Mission 134 : la page joue à 10h du jour même (ses rendez-vous d'aujourd'hui sont placés une heure plus tard) : la suite reste
// vraie à toute heure (après 21h30, un rendez-vous d'aujourd'hui était déjà fini).
const DIX_HEURES = `<script>(function () { var V = Date, n = new V(), dec = new V(n.getFullYear(), n.getMonth(), n.getDate(), 10, 0, 0).getTime() - n.getTime();
  class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + dec); else super(...a); } static now() { return V.now() + dec; } }
  window.Date = D; })();</script>`;
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const js = (largeur) => `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    tcCharlyPret = function () { return true; };
    hideAuthFlow(); navigate('assistant'); await attendre(500);
    if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 40; TC_ATTENTE_DUREES.vrai = 40; TC_ATTENTE_DUREES.feuilles = 40; TC_ATTENTE_DUREES.consulte = 40; }
    var phrases = function () { return Array.prototype.map.call(document.querySelectorAll('#charlyChatBody .tc-demo-phrase'), function (b) { return b.textContent.replace(/^«./, '').replace(/.»$/, ''); }); };
    var pastille = function () { var p = document.querySelector('#tcDemoBandeau .tc-demo-pastille'); if (!p) return null; var r = p.getBoundingClientRect(); return { texte: p.innerText, h: Math.round(r.height), l: Math.round(r.width), gauche: Math.round(r.left), droite: Math.round(r.right), police: getComputedStyle(p).fontSize }; };
    var tout = function (n0) { return charlyIA.history.slice(n0).filter(function (m) { return m && m.role !== 'user'; }).map(function (m) { return (m.role === 'tiers' ? 'VERT ' : '') + String(m.content || '').replace(/<[^>]+>/g, ' ') + (m._questionnaire && m._questionnaire.question ? ' ' + m._questionnaire.question : ''); }).join(' / '); };
    // 1. Charly IA : sa démonstration, telle qu'avant.
    await tcOuvrirDemo(); await attendre(400);
    R.ia = { pastille: pastille(), phrases: phrases(), contacts: contactsList.map(function (c) { return c.name; }) };
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    // 2. Charly Pro IA : la démonstration du dentiste. Le vrai stockage n'est jamais écrit pendant la démonstration.
    FEATURES.CHARLY_PRO = true;
    await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    var vraiSet = Storage.prototype.setItem, ecrits = [];
    var espion = function (k) { if (_tcDemo) ecrits.push(String(k)); return vraiSet.apply(this, arguments); };
    Storage.prototype.setItem = espion;
    var appels0 = appels;
    var vraiProfil = localStorage.getItem('tc_confiance_charly');
    await tcOuvrirDemo(); await attendre(400);
    R.pro = { pastille: pastille(), phrases: phrases(), contacts: contactsList.map(function (c) { return [c.name, c.phone, c.email, !!c.referenceCompte]; }), events: events.map(function (e) { return [e.date, e.startH, e.startM, e.title]; }), profil: tcConfianceCharly(), demain: tcISO(tcDemoJour(1)) };
    // 3. Phrase 1, dans la démonstration : la carte au premier moment libre de demain, puis « Valider » : « C'est noté », « Voir dans mon agenda ».
    var n0 = charlyIA.history.length;
    await tcDemoJouer('commercial'); await attendre(3000);
    R.p1 = tout(n0);
    var carte = charlyIA.history.filter(function (m) { return m && m.tempId && /Commercial Matériaux/.test(m.content || ''); }).pop();
    if (carte) { validateAgendaProposal(carte.tempId); await attendre(2500); }
    R.p1b = { dit: tout(n0), rdv: events.filter(function (e) { return /Commercial Matériaux/.test(e.title || ''); }).map(function (e) { return [e.date, e.startH, e.startM, e.endH, e.endM]; }), voir: !!document.querySelector('#charlyChatBody .tc-voir-agenda') };
    // 4. Phrase 3, dans la démonstration : la carte, un seul oui, leurs choix, le compte rendu, l'agenda mis à jour.
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    await tcOuvrirDemo(); await attendre(400);
    n0 = charlyIA.history.length;
    await tcDemoJouer('imprevu'); await attendre(9000);
    R.p3 = tout(n0);
    var q = charlyIA.history.filter(function (m) { return m && m._questionnaire && m._questionnaire.etat === 'choix'; }).pop();
    if (q) { await tcQuestionnaireRepondre(q._questionnaire.id, 0); await attendre(20000); }
    R.p3b = { dit: tout(n0), claire: events.filter(function (e) { return e.id === 'demo_claire_dem'; }).map(function (e) { return e.date + ' ' + e.startH; })[0] };
    tcQuitterDemo({ sansRetour: true }); await attendre(400);
    Storage.prototype.setItem = vraiSet;
    R.garanties = { ecrits: ecrits.filter(function (k) { return k !== 'timecool_charly_historique_pro' && k !== 'timecool_charly_historique'; }), appels: appels - appels0, profilApres: localStorage.getItem('tc_confiance_charly'), vraiProfil: vraiProfil, contactsApres: contactsList.length, eventsApres: events.filter(function (e) { return e && e.demo; }).length };
    // 5. En vrai (hors démonstration), un compte sans contact : phrase 1 au premier moment libre ; phrases 2 et 3 avec leurs excuses.
    var now = new Date(), iso = function (n) { return tcISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n)); };
    var ev = function (id, date, h1, m1, h2, m2, titre, contact) { var e = { id: id, mode: 'user', date: date, startH: h1, startM: m1, endH: h2, endM: m2, title: titre, category: 'sante' }; if (contact) e.contact = contact; return e; };
    var hP = Math.min(22, now.getHours() + 1);
    contactsList = [{ id: 'c_a', name: 'Anne Durand', phone: '06 39 98 00 31', email: '', vouvoie: true }, { id: 'c_b', name: 'Bruno Petit', phone: '06 39 98 00 32', email: '', vouvoie: true }];
    events = [ev('v1', iso(1), 9, 0, 12, 0, 'Bloc opératoire'), ev('v2', iso(0), hP, 0, hP, 30, 'RDV Anne Durand : contrôle', 'c_a'), ev('v3', iso(1), 9, 0, 9, 30, 'RDV Bruno Petit : détartrage', 'c_b')];
    charlyIA.history = []; renderCharlyChat();
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(1500); };
    n0 = charlyIA.history.length; await taper('Note-moi un rendez-vous demain avec mon commercial Matériaux'); R.v1 = tout(n0);
    n0 = charlyIA.history.length; await taper('Préviens mes patients à venir et excuse-moi auprès d’eux : j’ai un retard de 30 minutes'); R.v2 = tout(n0);
    tcQuestionnaireArreter();
    n0 = charlyIA.history.length; await taper('Demain j’ai un imprévu et je ne pourrai pas travailler. Préviens tous mes patients de la matinée, excuse-moi auprès d’eux et décale tous leurs rendez-vous'); R.v3 = tout(n0);
    tcQuestionnaireArreter();
    // Examen : un seul rendez-vous visé, un moment vague, l'après-midi.
    n0 = charlyIA.history.length; await taper('J’ai un imprévu demain, décale mon rendez-vous de 9h à vendredi'); R.e1 = tout(n0); tcQuestionnaireArreter();
    n0 = charlyIA.history.length; await taper('Je suis empêché demain, décale le rendez-vous Bruno à vendredi'); R.e1b = tout(n0); tcQuestionnaireArreter();
    n0 = charlyIA.history.length; await taper('Ajoute un rendez-vous avec Bruno demain en fin de journée'); R.e2 = tout(n0);
    n0 = charlyIA.history.length; await taper('Mets une réunion avec l’équipe demain après-midi'); R.e3 = tout(n0);
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
for (const [taille, w] of [['téléphone', 390], ['PC', 1366]]) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-131-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + DIX_HEURES).replace('</body>', () => js(w) + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + w + ',844', '--virtual-time-budget=120000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let S = null;
  try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, NB).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
  const n = taille + ' — ';
  if (!S) { verifie(n + 'la page a rejoué les parcours', false, (r.stdout || '').slice(-300)); continue; }
  if (S.erreur) { verifie(n + 'aucune erreur', false, S.erreur); continue; }
  const SANS = (x) => !/je ne peux|pas bien compris|Lequel|À quelle heure/.test(x);
  verifie(n + 'Charly IA : sa démonstration telle qu’avant (« Démonstration », ses cinq phrases, Michel, Paul…)', /^🎬 Démonstration\s*Quitter$/.test(S.ia.pastille.texte) && S.ia.pastille.h === 40 && S.ia.phrases.length === 5 && /Michel/.test(S.ia.phrases[0]) && S.ia.contacts.indexOf('Michel Virtuel') > -1, JSON.stringify(S.ia));
  const p = S.pro.pastille;
  verifie(n + 'Charly Pro IA : « Démonstration pour un chirurgien-dentiste » (avec « Quitter »), aucun mot retiré, la taille du texte inchangée', /Démonstration\s+pour un chirurgien-dentiste/.test(p.texte) && /Quitter/.test(p.texte) && p.police === S.ia.pastille.police, JSON.stringify(p));
  verifie(n + (taille === 'téléphone' ? 'au téléphone : sur deux lignes (« Démonstration » / « pour un chirurgien-dentiste »), dans l’écran' : 'au PC : sur une ligne'), taille === 'téléphone' ? (/Démonstration\npour un chirurgien-dentiste/.test(p.texte) && p.h > 40 && p.gauche >= 0 && p.droite <= 390) : (p.h === 40 && !/Démonstration\npour/.test(p.texte)), JSON.stringify(p));
  verifie(n + 'les six phrases du dentiste, dans l’ordre, texte de Charles', JSON.stringify(S.pro.phrases) === JSON.stringify(PHRASES), JSON.stringify(S.pro.phrases));
  const cs = S.pro.contacts;
  verifie(n + 'les contacts d’exemple : 54 patients (mission 133), l’assistante, le prothésiste, le commercial Matériaux (Virtuel·le, 06 39 98 00 xx, @exemple-timecool.fr)', cs.length === 57 && cs.every(function (c) { return /Virtuel(?:le)?\b/.test(c[0]) && /^06 39 98 00 \d\d$/.test(c[1]) && /@exemple-timecool\.fr$/.test(c[2]); }) && cs.some(function (c) { return /\(assistante\)/.test(c[0]); }) && cs.some(function (c) { return /\(prothésiste\)/.test(c[0]); }) && cs.some(function (c) { return /\(commercial Matériaux\)/.test(c[0]) && !c[3]; }), cs.length + ' : ' + JSON.stringify(cs.filter(function (c) { return !(/Virtuel(?:le)?\b/.test(c[0]) && /^06 39 98 00 \d\d$/.test(c[1]) && /@exemple-timecool\.fr$/.test(c[2])); })));
  const evs = S.pro.events, dem = evs.filter(function (e) { return e[0] === S.pro.demain; });
  verifie(n + 'l’agenda du cabinet (mission 133) : demain, 8 patients le matin (jusqu’à 13h) et 6 l’après-midi, titres « RDV Prénom Virtuel·le : acte » (actes de la liste)', dem.filter(function (e) { return e[1] < 13; }).length === 8 && dem.filter(function (e) { return e[1] >= 14; }).length === 6 && evs.every(function (e) { return /^RDV [A-ZÀ-Ý][a-zà-ÿ]+ Virtuel(?:le)? : (détartrage|consultation de contrôle|soin d’une carie|pose d’une couronne|urgence dentaire|dévitalisation|empreinte pour une couronne|extraction d’une dent|contrôle après extraction|radio panoramique|blanchiment|pose d’un implant|contrôle de l’appareil)$/.test(e[3]); }), JSON.stringify([dem.length, evs.filter(function (e) { return !/^RDV [A-ZÀ-Ý][a-zà-ÿ]+ Virtuel(?:le)? : (détartrage|consultation de contrôle|soin d’une carie|pose d’une couronne|urgence dentaire|dévitalisation|empreinte pour une couronne|extraction d’une dent|contrôle après extraction|radio panoramique|blanchiment|pose d’un implant|contrôle de l’appareil)$/.test(e[3]); })]));
  verifie(n + 'la démonstration du dentiste se joue au profil 2 (dans sa copie), le vrai réglage ne bouge pas', S.pro.profil === 2 && S.garanties.profilApres === S.garanties.vraiProfil, JSON.stringify([S.pro.profil, S.garanties]));
  verifie(n + 'garanties : rien écrit sur l’appareil, aucun appel réseau ; « Quitter » : plus aucune donnée d’exemple', S.garanties.ecrits.length === 0 && S.garanties.appels === 0 && S.garanties.eventsApres === 0, JSON.stringify(S.garanties));
  verifie(n + 'phrase 1 (démonstration) : la carte au premier moment libre de demain (15h, les cases « RDV disponible »), sans « À quelle heure ? »', /^Commercial Matériaux, .* à 15h : je te propose ceci/.test(S.p1) && SANS(S.p1), S.p1);
  verifie(n + 'phrase 1 : « Valider » : le rendez-vous demain 15h-16h, « C’est noté », « Voir dans mon agenda »', JSON.stringify(S.p1b.rdv) === JSON.stringify([[S.pro.demain, 15, 0, 16, 0]]) && /C.est noté/.test(S.p1b.dit) && S.p1b.voir === true, JSON.stringify(S.p1b));
  verifie(n + 'phrase 3 (démonstration) : « Tu as un imprévu. Je déplace 8 rendez-vous. » (la matinée du cabinet, jusqu’à 13h), les créneaux de chacun selon les préférences, le message avec les excuses, un seul « Oui »', /Tu as un imprévu\. Je déplace 8 rendez-vous\./.test(S.p3) && /selon tes préférences et tes disponibilités/.test(S.p3) && /Le message pour Claire : « [\s\S]*Toutes mes excuses\. »/.test(S.p3) && !/Léa|Tom/.test(S.p3) && SANS(S.p3), S.p3);
  verifie(n + 'phrase 3 : après le oui, leurs réponses (vert), le compte rendu (« Claire a choisi … J’ai déplacé … »), l’agenda mis à jour', /VERT C’est bon pour/.test(S.p3b.dit) && /Claire a choisi .*J’ai déplacé « RDV Claire Virtuelle : détartrage »/.test(S.p3b.dit) && S.p3b.claire && S.p3b.claire.indexOf(S.pro.demain) !== 0, JSON.stringify(S.p3b).slice(0, 700));
  verifie(n + 'en vrai, phrase 1 : le premier moment libre de demain (12h, après le bloc 9h-12h), sans « À quelle heure ? »', /^Commercial Matériaux, .* à 12h : je te propose ceci/.test(S.v1) && SANS(S.v1), S.v1);
  verifie(n + 'en vrai, phrase 2 : les patients à venir, le message avec « Toutes mes excuses. », un seul « Je lui envoie ? »', /Je préviens 1 personne de ton retard/.test(S.v2) && /Anne Durand/.test(S.v2) && /Toutes mes excuses\./.test(S.v2) && SANS(S.v2), S.v2);
  verifie(n + 'en vrai, phrase 3 : « Tu as un imprévu. », le rendez-vous de demain matin avec Bruno, les excuses', /Tu as un imprévu\./.test(S.v3) && /Bruno/.test(S.v3) && /Toutes mes excuses\./.test(S.v3) && SANS(S.v3), S.v3);
  verifie(n + 'examen : un imprévu qui vise UN rendez-vous (« décale mon rendez-vous de 9h à vendredi », « … le rendez-vous Bruno à vendredi ») : jamais le parcours de toute la journée', !/Tu as un imprévu|Qui prévient/.test(S.e1) && !/Tu as un imprévu|Qui prévient/.test(S.e1b), JSON.stringify([S.e1, S.e1b]));
  verifie(n + 'examen : « … demain en fin de journée » : « À quelle heure ? », jamais 12h', /À quelle heure/.test(S.e2) && !/à 12h|Fin journée/.test(S.e2), S.e2);
  verifie(n + 'examen : « … demain après-midi » : le premier moment libre à partir de 14h', /à 14h : je te propose ceci/.test(S.e3), S.e3);
  verifie(n + 'la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
