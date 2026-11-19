// Mission 139 (Charles, 19/11) : « Voir tous les métiers » sur le récapitulatif de la « Configuration professionnelle ».
// Une configuration enregistrée : la page s'ouvre sur « Votre configuration », avec un gros bouton au-dessus de la carte
// « Votre métier ». Il ouvre l'étape 1 (le métier enregistré coché) ; « ← Retour à ma configuration » rend tout tel quel.
// Regarder sans aller jusqu'à « Voir le récapitulatif » n'enregistre rien (ni la configuration, ni les photos). Chaque métier
// garde sa propre configuration : le coiffeur ou l'avocat montrés, le dentiste revient avec ses actes, ses horaires, sa fiche.
// Un compte sans configuration : l'étape 1, comme avant. Bloquant : case éteinte = rien ; aucun appel réseau.
// Usage : node verif-config-metiers139.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
console.log('-- Dans la page (Chrome), 390 px --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    var appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow();
    var corps = function () { return document.getElementById('configProCorps'); };
    var texte = function () { return corps().innerText; };
    var brut = function () { return localStorage.getItem('tc_config_pro'); };
    var photo = function () { return localStorage.getItem('tc_config_pro_photo'); };
    var deborde = function () { var c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    var debords = [];
    var cartes = function () { return Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return /choisirMetier/.test(b.getAttribute('onclick') || ''); }); };
    var carte = function (nom) { var c = cartes().filter(function (b) { return b.innerText.trim() === nom; })[0]; if (!c) throw new Error('pas de métier ' + nom); return c; };
    var cliquer = async function (id) { var b = document.getElementById(id); if (!b) throw new Error('pas de bouton ' + id); b.click(); await attendre(80); };
    var champs = function (o) { return JSON.stringify({ familles: o.familles, jours: o.jours, dureeRdv: o.dureeRdv, fiche: o.fiche }); };
    // A. Case éteinte (compte ordinaire) : ni entrée de menu, ni page.
    renderMenu(); R.menuEteint = /Configuration professionnelle/.test(document.getElementById('sideMenu').innerText);
    navigate('configpro'); await attendre(200); R.pageEteinte = currentPage;
    // B. Un compte sans configuration : l'étape 1, sans bouton.
    FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    R.neuf = texte(); R.neufBoutons = [!!document.getElementById('cpTousMetiers139'), !!document.getElementById('cpRetourConfig139')]; R.neufGarde = brut();
    // C. Le dentiste déjà configuré (enregistré), avec sa photo.
    var e = { v: 1, metier: 'chirurgien-dentiste', familles: tcConfigProFamillesDuMetier('chirurgien-dentiste'), jours: tcConfigProJoursDefaut(), dureeRdv: 25, etape: 6, termine: true, maj: '2026-11-18T10:00:00.000Z' };
    e.familles[0].sous[6].nom = 'Panoramique'; e.familles[2].sous[2].gardee = false; e.familles[4].duree = 40;
    e.familles.push({ id: 'pfixe', nom: 'Pédodontie', propre: true, gardee: true, duree: 20, sous: [{ id: 'sfixe', nom: 'Scellement de sillons', propre: true, gardee: true, duree: 25 }] });
    e.familles[0].sous[0].question = { texte: 'Quel est l’âge du patient ?', reponses: [{ texte: '13 ans ou moins', passe: false }, { texte: 'Plus de 13 ans', passe: true }] };
    e.jours[6] = { actif: true, matin: ['09:00', '12:30'], apres: ['14:00', '17:00'] };
    e.fiche = { nom: 'Dr Charles Haddad', metier: 'Chirurgien-dentiste', adresse: '12 rue de la Paix, 75002 Paris', acces: 'Cabinet au rez-de-chaussée.', presentation: 'Bonjour.', consignes: 'Arrivez 5 minutes avant.', tarifs: 'Conventionné.', paiement: 'Carte bancaire', horaires: '', langues: 'Français', apporter: 'Votre carte Vitale.' };
    var PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    localStorage.setItem('tc_config_pro', JSON.stringify(e)); localStorage.setItem('tc_config_pro_photo', PHOTO);
    var AVANT = brut();
    navigate('calendar'); await attendre(150); navigate('configpro'); await attendre(300);
    R.recap = texte(); debords.push(deborde());
    var b = document.getElementById('cpTousMetiers139');
    if (b) {
      var rb = b.getBoundingClientRect(), suiv = b.nextElementSibling, rs = suiv ? suiv.getBoundingClientRect() : null;
      R.bouton = { texte: b.innerText.trim(), haut: rb.height, large: rb.width, corps: corps().clientWidth - parseFloat(getComputedStyle(corps()).paddingLeft) - parseFloat(getComputedStyle(corps()).paddingRight), fond: getComputedStyle(b).backgroundColor, couleur: getComputedStyle(b).color, police: parseFloat(getComputedStyle(b).fontSize),
        suivant: suiv ? suiv.innerText.trim().split('\\n')[0] : '', dessous: rs ? rs.top >= rb.bottom : false, ecran: rb.bottom <= window.innerHeight,
        avant: b.previousElementSibling ? b.previousElementSibling.innerText : '' };
    }
    // D. « Voir tous les métiers » : l'étape 1, le dentiste coché, le retour en haut.
    await cliquer('cpTousMetiers139');
    R.e1 = texte(); debords.push(deborde());
    R.metiers = cartes().map(function (c) { return c.innerText.trim(); });
    R.coches = cartes().filter(function (c) { return /border-color:\\s*var\\(--g-blue\\)/.test(c.getAttribute('style') || ''); }).map(function (c) { return c.innerText.trim(); });
    var r = document.getElementById('cpRetourConfig139');
    R.retour = r ? { texte: r.innerText.trim(), premier: corps().firstElementChild === r, ecran: r.getBoundingClientRect().bottom <= window.innerHeight, large: r.getBoundingClientRect().width } : null;
    // Les étapes 2, 4, 5 et 6 du dentiste, dessinées avant de montrer un autre métier (comparées en G).
    var ETAPES = {};
    [2, 4, 5, 6].forEach(function (n) { tcConfigPro121.aller(n); ETAPES[n] = corps().innerHTML; });
    tcConfigPro121.aller(1); await attendre(50);
    R.gardeE1 = brut() === AVANT;
    // E. « Retour à ma configuration » : le même récapitulatif, rien d'écrit.
    await cliquer('cpRetourConfig139');
    R.recapRetour = texte(); R.gardeRetour = brut() === AVANT; R.sansRetour = !document.getElementById('cpRetourConfig139') && !!document.getElementById('cpTousMetiers139');
    // F. Montrer le coiffeur : rien n'est écrit ; la photo retirée en regardant revient.
    await cliquer('cpTousMetiers139'); carte('Coiffeur').click(); await attendre(80);
    R.c1 = texte(); R.gardeC1 = brut() === AVANT;
    await cliquer('cpSuivant');
    R.c2 = texte(); R.gardeC2 = brut() === AVANT; R.retourC2 = !!document.getElementById('cpRetourConfig139') && corps().firstElementChild === document.getElementById('cpRetourConfig139');
    tcConfigPro121.basculer(tcConfigProLire().familles[0].id); tcConfigPro121.aller(6); await attendre(80);
    R.retourC6 = !!document.getElementById('cpRetourConfig139'); debords.push(deborde());
    tcConfigPro121.retirerPhoto(); await attendre(30); R.photoRetiree = photo() === null;
    await cliquer('cpRetourConfig139');
    R.recapF = texte(); R.gardeF = brut() === AVANT; R.photoF = photo() === PHOTO;
    // G. Coiffeur, puis retour sur le dentiste : ses actes, ses horaires, sa durée, sa fiche, tels quels.
    await cliquer('cpTousMetiers139'); carte('Coiffeur').click(); await attendre(50);
    await cliquer('cpSuivant'); tcConfigPro121.basculer(tcConfigProLire().familles[1].id);
    tcConfigPro121.aller(1); await attendre(50); carte('Chirurgien-dentiste').click(); await attendre(80);
    R.gMemoire = champs(tcConfigProLire()) === champs(JSON.parse(AVANT));
    R.gCoche = cartes().filter(function (c) { return /border-color:\\s*var\\(--g-blue\\)/.test(c.getAttribute('style') || ''); }).map(function (c) { return c.innerText.trim(); });
    await cliquer('cpSuivant'); R.g2 = texte();
    R.gEtapes = [2, 4, 5, 6].filter(function (n) { tcConfigPro121.aller(n); return corps().innerHTML !== ETAPES[n]; });
    tcConfigPro121.aller(5); await attendre(50); R.g5 = (document.getElementById('cpDureeRdv') || {}).value;
    tcConfigPro121.aller(6); await attendre(50); R.g6 = (document.getElementById('cpFiche_adresse') || {}).value;
    R.gardeG = brut() === AVANT;
    await cliquer('cpRetourConfig139'); R.recapG = texte(); R.gardeG2 = brut() === AVANT;
    // H. Valider l'avocat (jusqu'à « Voir le récapitulatif ») : il est enregistré ; le dentiste est gardé à part.
    await cliquer('cpTousMetiers139'); carte('Avocat').click(); await attendre(50);
    await cliquer('cpSuivant'); tcConfigPro121.basculer('divorce'); await attendre(30);
    for (var i = 2; i <= 5; i++) await cliquer('cpSuivant');
    R.h6 = texte().slice(0, 200); R.gardeH6 = brut() === AVANT;
    await cliquer('cpSuivant');
    var g = JSON.parse(brut() || 'null') || {};
    R.hValide = { metier: g.metier, termine: g.termine, dentiste: !!(g.metiers139 && g.metiers139['chirurgien-dentiste']) && champs(g.metiers139['chirurgien-dentiste']) === champs(JSON.parse(AVANT)),
      coiffeur: !!(g.metiers139 && g.metiers139.coiffeur), recap: texte(), bouton: !!document.getElementById('cpTousMetiers139'), retour: !!document.getElementById('cpRetourConfig139'), photo: photo() === PHOTO };
    // I. Revenir au dentiste et valider : sa configuration au caractère près, le même récapitulatif.
    await cliquer('cpTousMetiers139'); carte('Chirurgien-dentiste').click(); await attendre(50);
    R.iMemoire = champs(tcConfigProLire()) === champs(JSON.parse(AVANT));
    for (var j = 1; j <= 6; j++) await cliquer('cpSuivant');
    var g2 = JSON.parse(brut() || 'null') || {};
    R.iValide = { metier: g2.metier, termine: g2.termine, dentiste: champs(g2) === champs(JSON.parse(AVANT)), avocat: !!(g2.metiers139 && g2.metiers139.avocat && g2.metiers139.avocat.familles.some(function (f) { return f.id === 'divorce' && f.gardee; })) };
    R.recapI = texte();
    // J. Sortir de la page en regardant : rien n'a changé (configuration et photo).
    var AVANT2 = brut();
    await cliquer('cpTousMetiers139'); carte('Coiffeur').click(); await attendre(50); tcConfigPro121.aller(6); await attendre(50); tcConfigPro121.retirerPhoto(); await attendre(30);
    navigate('calendar'); await attendre(150); navigate('configpro'); await attendre(300);
    R.sortie = texte(); R.gardeSortie = brut() === AVANT2; R.photoSortie = photo() === PHOTO; R.sortieRetour = !document.getElementById('cpRetourConfig139');
    // K. Première configuration (pas encore enregistrée) : changer de métier puis revenir ne perd rien.
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(50);
    tcConfigPro121.choisirMetier('chirurgien-dentiste'); tcConfigPro121.aller(2); tcConfigPro121.basculer('detartrage'); tcConfigPro121.duree('esthetique', 'blanchiment', 90);
    tcConfigPro121.aller(1); tcConfigPro121.choisirMetier('coiffeur'); tcConfigPro121.choisirMetier('chirurgien-dentiste'); await attendre(50);
    var gk = JSON.parse(brut() || 'null') || {};
    var fk = function (id) { return (gk.familles || []).filter(function (f) { return f.id === id; })[0] || {}; };
    R.premiere = { metier: gk.metier, detartrage: fk('detartrage').gardee, blanchiment: ((fk('esthetique').sous || []).filter(function (x) { return x.id === 'blanchiment'; })[0] || {}).duree, termine: !!gk.termine, retour: !!document.getElementById('cpRetourConfig139'), bouton: !!document.getElementById('cpTousMetiers139') };
    R.debords = debords;
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-139-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=40000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else {
  if (S.erreur) verifie('le parcours sans erreur', false, S.erreur);
  verifie('case éteinte : ni entrée de menu, ni page', S.menuEteint === false && S.pageEteinte !== 'configpro', S.menuEteint + ' ' + S.pageEteinte);
  verifie('un compte sans configuration : l’étape 1, comme avant, sans bouton ; rien d’écrit', /TAPE 1 SUR 6/i.test(S.neuf || '') && /Quel est votre métier/.test(S.neuf || '') && S.neufBoutons && !S.neufBoutons[0] && !S.neufBoutons[1] && S.neufGarde === null, JSON.stringify([String(S.neuf).slice(0, 120), S.neufBoutons, S.neufGarde]));
  verifie('une configuration enregistrée : la page s’ouvre sur « Votre configuration »', /^Votre configuration/.test(S.recap || '') && /Chirurgien-dentiste/.test(S.recap || ''), String(S.recap).slice(0, 200));
  const B = S.bouton || {};
  verifie('le gros bouton « Voir tous les métiers », juste au-dessus de la carte « Votre métier »', B.texte === 'Voir tous les métiers' && B.suivant === 'Votre métier' && B.dessous === true && /Vous pouvez revenir/.test(B.avant || ''), JSON.stringify(B));
  verifie('bien visible : toute la largeur, 52 px de haut, bleu, texte blanc en 16 px, sans défiler', B.large >= B.corps - 1 && B.haut >= 52 && B.fond === 'rgb(26, 115, 232)' && B.couleur === 'rgb(255, 255, 255)' && B.police >= 16 && B.ecran === true, JSON.stringify(B));
  verifie('il ouvre la liste « Quel est votre métier ? », le métier enregistré coché (lui seul)', /TAPE 1 SUR 6/i.test(S.e1 || '') && /Quel est votre métier/.test(S.e1 || '') && JSON.stringify(S.coches) === '["Chirurgien-dentiste"]'
    && ['Avocat', 'Chirurgien-dentiste', 'Coiffeur'].every((x) => (S.metiers || []).includes(x)), JSON.stringify([S.metiers, S.coches]));
  verifie('« ← Retour à ma configuration » en haut, toute la largeur, sans défiler ; rien d’écrit en ouvrant la liste', S.retour && S.retour.texte === '← Retour à ma configuration' && S.retour.premier && S.retour.ecran && S.retour.large > 300 && S.gardeE1 === true, JSON.stringify([S.retour, S.gardeE1]));
  verifie('le retour : le même récapitulatif, au caractère près ; rien d’écrit', S.recapRetour === S.recap && S.gardeRetour === true && S.sansRetour === true, JSON.stringify([S.gardeRetour, S.sansRetour]));
  verifie('montrer le coiffeur (étapes 1 et 2, une prestation décochée) : rien n’est écrit ; le retour en haut de chaque étape', /à plusieurs/.test(S.c1 || '') && /TAPE 2 SUR 6/i.test(S.c2 || '') && /Coupe/.test(S.c2 || '') && S.gardeC1 && S.gardeC2 && S.retourC2 && S.retourC6, JSON.stringify([S.gardeC1, S.gardeC2, S.retourC2, S.retourC6, String(S.c2).slice(0, 150)]));
  verifie('la photo retirée en regardant revient au retour ; le récapitulatif du dentiste, tel quel', S.photoRetiree === true && S.photoF === true && S.gardeF === true && S.recapF === S.recap, JSON.stringify([S.photoRetiree, S.photoF, S.gardeF]));
  verifie('coiffeur puis retour au dentiste : ses actes, ses horaires, sa durée et sa fiche, tels quels', S.gMemoire === true && JSON.stringify(S.gCoche) === '["Chirurgien-dentiste"]' && /Panoramique/.test(S.g2 || '') && /Pédodontie/.test(S.g2 || '') && /Scellement de sillons/.test(S.g2 || '')
    && Array.isArray(S.gEtapes) && S.gEtapes.length === 0 && String(S.g5) === '25' && S.g6 === '12 rue de la Paix, 75002 Paris' && S.gardeG && S.gardeG2 && S.recapG === S.recap, JSON.stringify([S.gMemoire, S.gCoche, S.gEtapes, S.g5, S.g6, S.gardeG, S.gardeG2]));
  verifie('valider un autre métier (« Voir le récapitulatif ») : l’avocat enregistré, le dentiste gardé à part, rien du coiffeur regardé', S.gardeH6 === true && S.hValide && S.hValide.metier === 'avocat' && S.hValide.termine === true && S.hValide.dentiste === true && S.hValide.coiffeur === false
    && /^Votre configuration/.test(S.hValide.recap) && /Avocat/.test(S.hValide.recap) && S.hValide.bouton && !S.hValide.retour && S.hValide.photo, String(JSON.stringify(S.hValide)).slice(0, 400));
  verifie('revenir au dentiste et valider : sa configuration au caractère près, l’avocat gardé, le même récapitulatif', S.iMemoire === true && S.iValide && S.iValide.metier === 'chirurgien-dentiste' && S.iValide.termine === true && S.iValide.dentiste === true && S.iValide.avocat === true && S.recapI === S.recap, JSON.stringify([S.iMemoire, S.iValide]));
  verifie('sortir de la page en regardant : rien n’a changé (configuration et photo)', /^Votre configuration/.test(S.sortie || '') && /Chirurgien-dentiste/.test(S.sortie || '') && S.gardeSortie === true && S.photoSortie === true && S.sortieRetour === true, JSON.stringify([S.gardeSortie, S.photoSortie, S.sortieRetour]));
  verifie('première configuration : changer de métier puis revenir ne perd rien ; pas de bouton de retour', S.premiere && S.premiere.metier === 'chirurgien-dentiste' && S.premiere.detartrage === false && S.premiere.blanchiment === 90 && S.premiere.termine === false && !S.premiere.retour && !S.premiere.bouton, JSON.stringify(S.premiere));
  verifie('rien ne déborde à 390 px', Array.isArray(S.debords) && S.debords.length >= 3 && S.debords.every((x) => x <= 1), JSON.stringify(S.debords));
  verifie('aucun appel réseau', S.appels === 0, S.appels);
}
console.log('verif-config-metiers139 : ' + ok + ' OK, ' + ko + ' KO');
process.exit(ko ? 1 : 0);
