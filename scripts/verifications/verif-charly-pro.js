// Mission 127 (Charles, 18/11) : « Charly Pro IA », la même page que Charly IA, derrière la case CHARLY_PRO (Configuration IA,
// mode développeur, juste sous « Configuration professionnelle »).
// Case décochée : rien (ni entrée de menu, ni page, ni observateur ; la page Charly IA telle quelle ; « Version complète » ne
// l'allume pas). Case cochée : l'entrée juste sous « Charly IA » (même éclair), la même page sous le nom « Charly Pro IA », la même
// réponse, une conversation à part (sa clé, ses questions en attente), la démonstration ; la case éteinte et la déconnexion
// ramènent à Charly IA. Usage : node verif-charly-pro.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); };

console.log('-- Le code --');
verifie('la case CHARLY_PRO existe, éteinte par défaut, juste sous CONFIG_PRO, avec l’éclair',
  /CONFIG_PRO:\s+false,\s+\/\/ Mission 121[^\n]*\n\s*CHARLY_PRO:\s+false\s+\/\/ Mission 127/.test(page)
  && /CONFIG_PRO:\s+\{ icon:'🩺', name:'Configuration professionnelle' \},\n\s*CHARLY_PRO:\s+\{ icon:'⚡', name:'Charly Pro IA' \}/.test(page));
verifie('une seule page Charly : rien n’est recopié (ni page, ni moteur)',
  (page.match(/id="page-assistant"/g) || []).length === 1 && !/page-assistantpro|page-charlypro/.test(page) && (page.match(/function renderCharlyChat\(/g) || []).length === 1);
verifie('« Version complète » garde l’état de CHARLY_PRO', /CONFIG_PRO: !!FEATURES\.CONFIG_PRO, CHARLY_PRO: !!FEATURES\.CHARLY_PRO \};/.test(page) && /_gardes\.CONFIG_PRO \|\| _gardes\.CHARLY_PRO\)/.test(page));
verifie('les anciens modules restent éteints (MODE_PRO, CARNET_PROS)', /MODE_PRO:\s+false,/.test(page) && /CARNET_PROS:\s+false,/.test(page));
verifie('la conversation de Charly Pro IA a sa clé, au préfixe de celle de Charly IA (effacée à la déconnexion)', /TC_CHARLY_HISTORIQUE_CLE \+ '_pro'/.test(page) && /const TC_CHARLY_HISTORIQUE_CLE = 'timecool_charly_historique';/.test(page));
verifie('la déconnexion oublie aussi l’autre conversation', /function tcViderDonneesDuCompte\(\) \{[\s\S]*?tcCharlyVarianteOublier\(\);[\s\S]*?\n\}\n/.test(page));

verifie('mission 128 : la ligne « Charly Pro IA » du menu en bleu ciel (clair et sombre) ; « Charly IA » garde son jaune',
  page.indexOf("if (it.id === 'assistantpro') extraStyle = 'background:linear-gradient(90deg,var(--menu-charly-pro, #e1f5fe),var(--bg, #fff)); border-left:3px solid #4fc3f7;';") > -1
  && page.indexOf("'--menu-charly-pro':'#1d3442'") > -1 && page.indexOf("'--menu-charly-pro':'#e1f5fe'") > -1
  && page.indexOf("extraStyle = 'background:linear-gradient(90deg,var(--menu-charly, #fff4e0),var(--bg, #fff)); border-left:3px solid var(--g-yellow);';") > -1);
verifie('mission 128 : sur Charly Pro IA seulement, les ronds de l’éclair en bleu et rouge (en-tête, accueil, bulles)',
  page.indexOf('#page-assistant.tc-charly-pro .tc-rond-charly { background:linear-gradient(135deg, var(--g-blue), var(--g-red)) !important; }') > -1
  && page.split('tc-rond-charly"').length - 1 === 4);
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
    hideAuthFlow();
    if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 50; TC_ATTENTE_DUREES.vrai = 50; TC_ATTENTE_DUREES.feuilles = 50; TC_ATTENTE_DUREES.consulte = 50; }
    var entrees = function () { renderMenu(); return Array.prototype.map.call(document.querySelectorAll('#menuItems .menu-item'), function (x) { var s = x.querySelectorAll('span'); return [s[0] ? s[0].textContent.trim() : '', s[1] ? s[1].textContent.trim() : '']; }); };
    var entree = function (nom) { renderMenu(); return Array.prototype.filter.call(document.querySelectorAll('#menuItems .menu-item'), function (x) { var s = x.querySelectorAll('span'); return s[1] && s[1].textContent.trim() === nom; })[0]; };
    var nomPage = function () { return document.querySelector('#page-assistant .conv-name').textContent; };
    var textePage = function () { return document.getElementById('page-assistant').innerText; };
    var boutons = function () { return document.getElementById('charlyQuickActions').innerText + ' / ' + document.getElementById('charlyQuickActions2').innerText; };
    var pied = function () { return document.getElementById('charlyInputBar').innerText; };
    var corps = function () { return document.getElementById('charlyChatBody').innerText; };
    var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(1500); };
    var dernier = function () { var h = charlyIA.history.filter(function (m) { return m && m.role === 'assistant'; }); var m = h[h.length - 1]; return m ? String(m.content || '') : ''; };
    var parle = function (re) { return charlyIA.history.some(function (m) { return m && re.test(String(m.content || '')); }); };
    // Mission 128 : les couleurs calculées (ronds de l'éclair de la page, lignes du menu).
    var ronds = function () { return Array.prototype.map.call(document.querySelectorAll('#page-assistant .tc-rond-charly'), function (x) { return getComputedStyle(x).backgroundImage; }); };
    var fond = function (el) { if (!el) return ''; var cs = getComputedStyle(el); return cs.backgroundImage + ' | ' + cs.borderLeftColor; };
    // Mission 129 et son examen : ce qui est une durée en minutes, et ce qui n'en est pas une.
    R.durees = [
      "Crée-moi un nouveau rendez-vous avec mon commercial demain à 15h durant 30 minutes",
      "Crée-moi un nouveau rendez-vous avec mon commercial demain à 15h pendant 30 min",
      "Crée-moi un nouveau rendez-vous avec mon commercial demain à 15h de 30 mn",
      "Crée-moi un nouveau rendez-vous de 30mn avec mon commercial demain à 15h",
      "Réunion demain à 10h d’une durée de 45 minutes",
      "Réunion de 45 minutes demain à 10h",
      "Réserve la salle pour 30 minutes demain à 10h",
      "Réunion 45 minutes demain à 10h",
      "Rendez-vous demain à 9h, le cabinet est à 15 minutes",
      "Rendez-vous kiné demain à 9h, j’ai 15 minutes de pause",
      "Rendez-vous demain à 15h à 10 minutes de chez moi",
      "Rendez-vous demain à 9h, il me faut 15 minutes pour y aller",
      "Rendez-vous demain à 9h, c’est 15 minutes en métro",
      "Rendez-vous demain à 9h, c’est 20 minutes en bus",
      "Rendez-vous demain à 9h, pour 25 minutes en train",
      "Rendez-vous demain à 9h, c’est 10 minutes à vélo",
      "Rendez-vous demain à 9h, c’est 12 minutes en taxi",
      "Rendez-vous demain à 9h, pendant 15 minutes de trajet",
      "Rappelle-moi le dentiste 30 minutes avant",
      "J’aurai 10 minutes de retard",
      "Rendez-vous dans 20 minutes",
      "Dentiste demain 15h 30mn",
      "Bois de l’eau toutes les 30 minutes",
      "Avance la réunion de 15 minutes",
      "Décale le rendez-vous de 30 minutes"
    ].map(function (t) { var d = typeof tcDureeMinutes129 === 'function' ? tcDureeMinutes129(t) : 'absente'; return d && d.minutes ? d.minutes : d; });
    // 1. Case décochée (compte ordinaire) : rien.
    R.defaut = FEATURES.CHARLY_PRO;
    R.menuEteint = entrees();
    var d = document.createElement('div'); d.innerHTML = renderDevModeBlock(); R.dev = d.textContent;
    navigate('assistantpro'); await attendre(200);
    R.pageEteinte = [currentPage, tcCharlyVariante];
    // 2. Charly IA, telle qu'avant.
    navigate('assistant'); await attendre(300);
    R.ia = { nom: nomPage(), obs: _tcCharlyProObservateur === null, boutons: boutons(), pied: pied(), corps: corps() };
    R.iaRondsAccueil = ronds();
    await taper('Qu’est-ce que j’ai demain ?');
    R.iaReponse = dernier();
    R.iaRonds = ronds();
    R.iaLongueur = charlyIA.history.length;
    // 3. « Version complète » ne l'allume pas.
    resetFeatureOverrides(); await attendre(100);
    R.apresVersionComplete = FEATURES.CHARLY_PRO;
    // 4. Case cochée, enregistrée : l'entrée juste sous « Charly IA ».
    toggleFeature('CHARLY_PRO'); commitFeatureOverrides(); await attendre(100);
    R.garde = JSON.parse(localStorage.getItem('timecool_features_override') || '{}').CHARLY_PRO;
    R.menuAllume = entrees();
    R.menuFonds = { ia: fond(entree('Charly IA')), pro: fond(entree('Charly Pro IA')) };
    applyTheme('dark'); R.menuSombre = fond(entree('Charly Pro IA')); applyTheme('light');
    // 5. L'entrée du menu ouvre la page, sous le nom Charly Pro IA.
    entree('Charly Pro IA').click(); await attendre(400);
    R.pro = { page: currentPage, variante: tcCharlyVariante, nom: nomPage(), texte: textePage(), boutons: boutons(), pied: pied(), corps: corps(), obs: _tcCharlyProObservateur !== null };
    R.proRondsAccueil = ronds();
    // 6. La même réponse ; une conversation à part.
    await taper('Qu’est-ce que j’ai demain ?');
    R.proReponse = dernier();
    R.proTexte = textePage();
    R.proRonds = ronds();
    R.proAccueilGarde = charlyIA.history.length > 2 && tcEstAccueilCharly(charlyIA.history[0]);
    await taper('Qu’est-ce que j’ai après-demain ?');
    R.cles = { pro: localStorage.getItem('timecool_charly_historique_pro') || '', ia: localStorage.getItem('timecool_charly_historique') || '' };
    // Mission 129 : l'exemple de l'accueil, mot pour mot, sur un compte sans contact : la carte, puis le rendez-vous validé.
    var essaiExemple = async function () {
      var garde = contactsList; contactsList = [];
      var n0 = charlyIA.history.length;
      await taper('Crée-moi un nouveau rendez-vous avec mon commercial demain à 15h durant 30 minutes');
      var neufs = charlyIA.history.slice(n0).filter(function (m) { return m && m.role === 'assistant'; });
      var carte = neufs.filter(function (m) { return m.tempId; }).pop();
      var res = { textes: neufs.map(function (m) { return String(m.content || ''); }).join(' / '), carte: !!carte };
      if (carte) { validateAgendaProposal(carte.tempId); await attendre(800); }
      var dem = new Date(); dem.setDate(dem.getDate() + 1);
      var iso = dem.getFullYear() + '-' + String(dem.getMonth() + 1).padStart(2, '0') + '-' + String(dem.getDate()).padStart(2, '0');
      var ev = (Array.isArray(events) ? events : []).filter(function (e) { return e && e.date === iso && e.title === 'Commercial' && Number(e.startH) === 15; }).pop();
      res.ev = ev ? [ev.date, Number(ev.startH), Number(ev.startM || 0), Number(ev.endH), Number(ev.endM || 0), ev.title] : null;
      if (ev) events = events.filter(function (e) { return e !== ev; });
      charlyIA.history.splice(n0); renderCharlyChat();
      contactsList = garde;
      return res;
    };
    R.exemplePro = await essaiExemple();
    // 7. Les questions en attente restent avec leur page.
    _tcSuppressionEnAttente = { essai: 'pro' };
    entree('Charly IA').click(); await attendre(400);
    R.retourIA = { variante: tcCharlyVariante, nom: nomPage(), texte: textePage(), pied: pied(), obs: _tcCharlyProObservateur === null, attente: _tcSuppressionEnAttente, longueur: charlyIA.history.length, apresDemain: parle(/après-demain/), demain: parle(/j’ai demain/) };
    R.retourIARonds = ronds();
    R.exempleIA = await essaiExemple();
    entree('Charly Pro IA').click(); await attendre(400);
    R.retourPro = { nom: nomPage(), attente: _tcSuppressionEnAttente && _tcSuppressionEnAttente.essai, apresDemain: parle(/après-demain/) };
    _tcSuppressionEnAttente = null;
    // 8. Charly au travail : sa réponse se termine d'abord, dans sa conversation.
    charlyIA.isLoading = true;
    var p = tcPasserCharlyVariante('ia');
    await attendre(500);
    R.travail = [tcCharlyVariante];
    charlyIA.isLoading = false;
    await p;
    R.travail.push(tcCharlyVariante);
    await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(200);
    // 9. La démonstration, sur Charly Pro IA.
    await tcOuvrirDemo(); await attendre(400);
    R.demo = { nom: nomPage(), demo: !!_tcDemo, corps: corps().slice(0, 300) };
    navigate('calendar'); await attendre(150); navigate('assistant'); await attendre(200);
    R.demoRetour = { nom: nomPage(), demo: !!_tcDemo, variante: tcCharlyVariante };
    R.debord = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    tcQuitterDemo(); await attendre(300);
    R.demoQuitte = { demo: !!_tcDemo, variante: tcCharlyVariante, nom: nomPage(), apresDemain: parle(/après-demain/) };
    // 10. La case éteinte : retour à Charly IA, plus d'entrée, plus de page.
    toggleFeature('CHARLY_PRO'); commitFeatureOverrides(); await attendre(300);
    R.eteinte = { variante: tcCharlyVariante, menu: entrees(), nom: nomPage(), texte: textePage(), obs: _tcCharlyProObservateur === null, longueur: charlyIA.history.length };
    navigate('assistantpro'); await attendre(200);
    R.eteintePage = currentPage;
    // 11. Rallumée : la conversation de Charly Pro IA est toujours là.
    toggleFeature('CHARLY_PRO'); await tcPasserCharlyVariante('pro', { ouvrir: true }); await attendre(300);
    R.rallumee = { nom: nomPage(), apresDemain: parle(/après-demain/) };
    // Mission 128 : « Charly IA » décochée, « Charly Pro IA » cochée : Pro seul (la capture de Charles, compte AdminCharly).
    FEATURES.CHARLY_IA = false; R.sansIA = entrees(); FEATURES.CHARLY_IA = true; renderMenu();
    // 12. Déconnexion (ménage du compte) : tout part, retour à Charly IA.
    tcViderDonneesDuCompte(); await attendre(300);
    R.menage = { variante: tcCharlyVariante, conv: Object.keys(_tcCharlyConversations).length, cle: localStorage.getItem('timecool_charly_historique_pro'), nom: nomPage(), obs: _tcCharlyProObservateur === null, apresDemain: parle(/après-demain/) };
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
for (const [taille, w] of [['téléphone', 390], ['PC', 1366]]) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-127-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + w + ',844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let S = null;
  try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
  const n = taille + ' — ';
  if (!S) { verifie(n + 'la page a rejoué le parcours', false, (r.stdout || '').slice(-300)); continue; }
  if (S.erreur) { verifie(n + 'aucune erreur', false, S.erreur); continue; }
  const libelles = (l) => (l || []).map((x) => x[1]);
  verifie(n + 'case décochée par défaut : ni entrée de menu, ni page (retour à l’agenda)', S.defaut === false && libelles(S.menuEteint).indexOf('Charly Pro IA') < 0 && S.pageEteinte[0] === 'calendar' && S.pageEteinte[1] === 'ia', JSON.stringify([S.defaut, libelles(S.menuEteint), S.pageEteinte]));
  verifie(n + 'MODE DÉVELOPPEUR : la case « Charly Pro IA » juste sous « Configuration professionnelle »', /🩺 Configuration professionnelle\s+⚡ Charly Pro IA\s/.test(S.dev), S.dev.replace(/\s+/g, ' ').slice(-400));
  verifie(n + 'case décochée : Charly IA telle quelle (son nom, aucun observateur, l’accueil)', S.ia.nom === 'Charly IA' && S.ia.obs === true && /Charly IA est une intelligence artificielle/.test(S.ia.pied) && /Je suis Charly, ton assistant TimeCool\./.test(S.ia.corps) && !/Charly Pro IA/.test(S.ia.pied + S.ia.corps), JSON.stringify(S.ia).slice(0, 300));
  verifie(n + '« Version complète » ne l’allume pas', S.apresVersionComplete === false, S.apresVersionComplete);
  const lm = libelles(S.menuAllume), i = lm.indexOf('Charly IA');
  verifie(n + 'case cochée et enregistrée : l’entrée « Charly Pro IA » juste sous « Charly IA », le même éclair', S.garde === true && i > -1 && lm[i + 1] === 'Charly Pro IA' && S.menuAllume[i][0] === '⚡' && S.menuAllume[i + 1][0] === '⚡', JSON.stringify([S.garde, S.menuAllume]));
  verifie(n + 'l’entrée ouvre la page Charly, sous le nom « Charly Pro IA »', S.pro.page === 'assistant' && S.pro.variante === 'pro' && S.pro.nom === 'Charly Pro IA' && S.pro.obs === true, JSON.stringify([S.pro.page, S.pro.variante, S.pro.nom]));
  verifie(n + '« Charly Pro IA » partout où la page disait « Charly IA » (en tête, avertissement du bas)', !/Charly IA/.test(S.pro.texte) && /Charly Pro IA est une intelligence artificielle/.test(S.pro.pied) && !/Charly IA/.test(S.proTexte), S.pro.texte.slice(0, 300));
  verifie(n + 'la même page : les mêmes boutons, son accueil (mission 129), sa démonstration', S.pro.boutons === S.ia.boutons && /Je suis Charly Pro IA, ton assistant TimeCool\./.test(S.pro.corps) && /contacts clients d’exemple/.test(S.pro.corps) && /Voir la démonstration/.test(S.pro.corps), JSON.stringify([S.pro.boutons, S.ia.boutons, S.pro.corps.slice(0, 200)]));
  verifie(n + 'Charly Pro IA répond exactement comme Charly IA', S.iaReponse.length > 10 && S.proReponse === S.iaReponse, JSON.stringify([S.iaReponse, S.proReponse]).slice(0, 400));
  verifie(n + 'une conversation à part : rien de Charly IA sur Charly Pro IA, et sa propre clé', !/j’ai demain/.test(S.pro.corps) && /après-demain/.test(S.cles.pro) && !/après-demain/.test(S.cles.ia) && /j’ai demain/.test(S.cles.ia), JSON.stringify([S.cles.pro.slice(0, 120), S.cles.ia.slice(0, 120)]));
  verifie(n + '« Charly IA » au menu : la conversation de Charly IA revient, telle quelle, sous son nom', S.retourIA.variante === 'ia' && S.retourIA.nom === 'Charly IA' && !/Charly Pro IA/.test(S.retourIA.texte) && /Charly IA est une intelligence artificielle/.test(S.retourIA.pied) && S.retourIA.obs === true && S.retourIA.longueur === S.iaLongueur && S.retourIA.demain === true && S.retourIA.apresDemain === false, JSON.stringify(S.retourIA).slice(0, 400));
  verifie(n + 'les questions en attente restent avec leur page', S.retourIA.attente === null && S.retourPro.attente === 'pro' && S.retourPro.apresDemain === true && S.retourPro.nom === 'Charly Pro IA', JSON.stringify([S.retourIA.attente, S.retourPro]));
  verifie(n + 'Charly au travail : sa réponse se termine d’abord, puis la page change', S.travail[0] === 'pro' && S.travail[1] === 'ia', JSON.stringify(S.travail));
  verifie(n + 'la démonstration sur Charly Pro IA : son nom reste, l’agenda d’exemple et retour', S.demo.demo === true && S.demo.nom === 'Charly Pro IA' && S.demoRetour.demo === true && S.demoRetour.nom === 'Charly Pro IA' && S.demoRetour.variante === 'pro', JSON.stringify([S.demo, S.demoRetour]).slice(0, 400));
  verifie(n + '« Quitter » la démonstration : la conversation de Charly Pro IA revient', S.demoQuitte.demo === false && S.demoQuitte.variante === 'pro' && S.demoQuitte.nom === 'Charly Pro IA' && S.demoQuitte.apresDemain === true, JSON.stringify(S.demoQuitte));
  verifie(n + 'la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
  verifie(n + 'la case éteinte : retour à Charly IA, plus d’entrée, plus de page', S.eteinte.variante === 'ia' && libelles(S.eteinte.menu).indexOf('Charly Pro IA') < 0 && S.eteinte.nom === 'Charly IA' && !/Charly Pro IA/.test(S.eteinte.texte) && S.eteinte.obs === true && S.eteinte.longueur === S.iaLongueur && S.eteintePage === 'calendar', JSON.stringify([S.eteinte.variante, libelles(S.eteinte.menu), S.eteinte.nom, S.eteinte.longueur, S.iaLongueur, S.eteintePage]));
  verifie(n + 'rallumée : la conversation de Charly Pro IA est toujours là', S.rallumee.nom === 'Charly Pro IA' && S.rallumee.apresDemain === true, JSON.stringify(S.rallumee));
  const BLEU = 'rgb(26, 115, 232)', JAUNE = 'rgb(251, 188, 4)', ROUGE = 'rgb(234, 67, 53)';
  const jaunes = (l, k) => Array.isArray(l) && l.length >= k && l.every((x) => x.indexOf(BLEU) > -1 && x.indexOf(JAUNE) > -1 && x.indexOf(ROUGE) < 0);
  const rouges = (l, k) => Array.isArray(l) && l.length >= k && l.every((x) => x.indexOf(BLEU) > -1 && x.indexOf(ROUGE) > -1 && x.indexOf(JAUNE) < 0);
  const mf = S.menuFonds || { ia: '', pro: '' };
  verifie(n + 'mission 128 : menu, « Charly Pro IA » en bleu ciel dégradé, liseré bleu ciel ; « Charly IA » garde son jaune', mf.pro.indexOf('rgb(225, 245, 254)') > -1 && mf.pro.indexOf('rgb(79, 195, 247)') > -1 && mf.ia.indexOf('rgb(255, 244, 224)') > -1 && mf.ia.indexOf(JAUNE) > -1, JSON.stringify(mf));
  verifie(n + 'mission 128 : en thème sombre, la ligne « Charly Pro IA » en bleu nuit', String(S.menuSombre || '').indexOf('rgb(29, 52, 66)') > -1, S.menuSombre);
  verifie(n + 'mission 128 : Charly IA, les ronds de l’éclair restent bleu et jaune (en-tête, accueil, bulles)', jaunes(S.iaRondsAccueil, 2) && jaunes(S.iaRonds, 3) && jaunes(S.retourIARonds, 3), JSON.stringify([S.iaRondsAccueil, S.iaRonds]).slice(0, 300));
  verifie(n + 'mission 128 : Charly Pro IA, les ronds de l’éclair en bleu et rouge (en-tête, accueil, bulles)', rouges(S.proRondsAccueil, 2) && rouges(S.proRonds, 3), JSON.stringify([S.proRondsAccueil, S.proRonds]).slice(0, 300));
  verifie(n + 'mission 128 : sur Charly Pro IA comme sur Charly IA, l’accueil reste en tête après le premier message', S.proAccueilGarde === true, S.proAccueilGarde);
  const si = libelles(S.sansIA), kp = si.indexOf('Charly Pro IA');
  verifie(n + 'mission 128 : « Charly IA » décochée, « Charly Pro IA » cochée : Pro seul, entre « Synchroniser… » et « Mes contacts » (capture de Charles)', kp > 0 && si.indexOf('Charly IA') < 0 && si[kp - 1].indexOf('Synchroniser') === 0 && si[kp + 1] === 'Mes contacts', JSON.stringify(si));
  const exOk = (x) => !!x && x.carte === true && Array.isArray(x.ev) && x.ev[1] === 15 && x.ev[2] === 0 && x.ev[3] === 15 && x.ev[4] === 30 && x.textes.indexOf('Commercial, ') === 0 && x.textes.indexOf(' à 15h : je te propose ceci') > -1 && x.textes.indexOf('?') < 0 && !/je ne peux|pas bien compris/i.test(x.textes);
  verifie(n + 'mission 129 : l’exemple de l’accueil, mot pour mot, sur Charly Pro IA (compte sans contact) : « Commercial » demain 15h → 15h30, validé', exOk(S.exemplePro), JSON.stringify(S.exemplePro).slice(0, 400));
  verifie(n + 'mission 129 : le même exemple sur Charly IA : « Commercial » demain 15h → 15h30, validé', exOk(S.exempleIA), JSON.stringify(S.exempleIA).slice(0, 400));
  verifie(n + 'mission 129 et son examen : une durée n’est lue que dite comme telle (durant, pendant, d’une durée de, « de N minutes » collé au rendez-vous ou à l’heure, pour N minutes) ; une distance, une pause, un trajet, un retard, un rappel, un déplacement : la durée par défaut', JSON.stringify(S.durees) === JSON.stringify([30,30,30,30,45,45,30,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]), JSON.stringify(S.durees));
  verifie(n + 'déconnexion : les deux conversations partent, retour à Charly IA', S.menage.variante === 'ia' && S.menage.conv === 0 && S.menage.cle === null && S.menage.nom === 'Charly IA' && S.menage.obs === true && S.menage.apresDemain === false, JSON.stringify(S.menage));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
