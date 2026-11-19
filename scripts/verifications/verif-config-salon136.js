// Mission 136, lot 2 (Charles, 18/11) : « 1 salon peut avoir plusieurs coiffeurs différents qu'il faudra préciser par le salon ».
// Après le métier : « Vous travaillez seul, ou à plusieurs ? ». Seul : rien ne change. À plusieurs : les coiffeurs un par un
// (prénom, photo s'il veut) ; « Qui la fait ? » sous chaque prestation ; les jours de chaque coiffeur ; ses créneaux ; le
// récapitulatif. Le dentiste n'a pas la question. Usage : node verif-config-salon136.js <index.html>   (TC_CHROME)
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
    hideAuthFlow(); FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    var texte = function () { return document.getElementById('configProCorps').innerText; };
    var garde = function () { return JSON.parse(localStorage.getItem('tc_config_pro') || 'null') || {}; };
    var deborde = function () { var c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    var debords = [];
    // Le dentiste : pas de question.
    tcConfigPro121.choisirMetier('chirurgien-dentiste'); await attendre(50);
    R.dentiste = texte();
    // Le coiffeur, seul par défaut.
    tcConfigPro121.choisirMetier('coiffeur'); await attendre(50);
    R.seul = texte(); debords.push(deborde());
    if (!/à plusieurs/.test(R.seul)) throw new Error('pas de question « seul ou à plusieurs »');
    R.seulCoche = Array.prototype.map.call(document.querySelectorAll('#configProCorps .cp-equipe-choix136'), function (b) { return b.style.borderColor; });
    tcConfigPro121.aller(4); await attendre(50); R.seul4 = texte();
    tcConfigPro121.aller(1); await attendre(50);
    // À plusieurs : les messages, deux coiffeurs, une photo.
    tcConfigPro121.equipeMode('plusieurs'); await attendre(50);
    R.plusieurs = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(50); R.sansCoiffeur = _tcConfigProErreur;
    document.getElementById('cpNouveauCoiffeur').value = ''; tcConfigPro121.ajouterCoiffeur(); R.prenomVide = _tcConfigProErreur;
    document.getElementById('cpNouveauCoiffeur').value = 'Marie'; tcConfigPro121.ajouterCoiffeur(); await attendre(30);
    document.getElementById('cpNouveauCoiffeur').value = 'Julien'; tcConfigPro121.ajouterCoiffeur(); await attendre(30);
    var l = garde().equipe.coiffeurs, marie = l[0].id, julien = l[1].id;
    var champ = document.getElementById('cpPrenom_' + julien); champ.value = ''; champ.dispatchEvent(new Event('input'));
    tcConfigPro121.suivant(); await attendre(50); R.prenomManquant = _tcConfigProErreur;
    champ = document.getElementById('cpPrenom_' + julien); champ.value = 'Julien'; champ.dispatchEvent(new Event('input'));
    var image = await new Promise(function (ok) { var c = document.createElement('canvas'); c.width = 900; c.height = 900; var x = c.getContext('2d'); x.fillStyle = '#c2185b'; x.fillRect(0, 0, 900, 900); c.toBlob(function (b) { ok(new File([b], 'marie.png', { type: 'image/png' })); }, 'image/png'); });
    tcConfigPro121.photoCoiffeur(marie, { files: [image] });
    var photos = {};
    for (var k = 0; k < 50 && !photos[marie]; k++) { await attendre(100); photos = JSON.parse(localStorage.getItem('tc_config_pro_photos') || '{}'); }
    await attendre(100);
    R.photo = { garde: !!photos[marie], taille: (photos[marie] || '').length, affichee: !!document.querySelector('#configProCorps .cp-coiffeur136 img') };
    R.equipe = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(50);
    // Étape 2 : « Qui la fait ? ».
    R.e2 = texte(); debords.push(deborde());
    R.quiNb = document.querySelectorAll('#configProCorps .cp-qui136').length;
    tcConfigPro121.quiLaFait('balayage', 'balayage', julien); await attendre(30);
    var b = Array.prototype.filter.call(document.querySelectorAll('#configProCorps .cp-qui136 button'), function (x) { return (x.getAttribute('onclick') || '').indexOf("'balayage', 'balayage', '" + julien + "'") > -1; })[0];
    R.qui = { sans: garde().equipe.coiffeurs[1].sans, presse: b ? b.getAttribute('aria-pressed') : null, marie: garde().equipe.coiffeurs[0].sans };
    tcConfigPro121.aller(4); await attendre(50);
    // Étape 4 : un coiffeur à la fois.
    R.e4 = texte(); debords.push(deborde());
    R.onglets = Array.prototype.map.call(document.querySelectorAll('#configProCorps .cp-onglets136 button'), function (x) { return (x.querySelector('[data-notranslate]') || x).innerText.trim() + ':' + x.getAttribute('aria-pressed') + (x.querySelector('img') ? ':photo' : ''); }).join(' ');
    tcConfigPro121.jour(6); await attendre(30);
    tcConfigPro121.choisirCoiffeur(julien); await attendre(30);
    R.e4julien = texte();
    [1, 2, 3, 4, 5].forEach(function (j) { tcConfigPro121.jour(j); });
    tcConfigPro121.suivant(); await attendre(50);
    R.sansJour = [_tcConfigProErreur, (document.querySelector('#configProCorps .cp-onglets136 button[aria-pressed=true]') || {}).innerText];
    tcConfigPro121.jour(1); tcConfigPro121.heure(1, 'apres', 1, '16:00'); await attendre(30);
    var g = garde();
    R.jours = { marieSamedi: g.equipe.coiffeurs[0].jours['6'].actif, julienSamedi: g.equipe.coiffeurs[1].jours['6'].actif, julienLundi: g.equipe.coiffeurs[1].jours['1'].apres[1], julienMardi: g.equipe.coiffeurs[1].jours['2'].actif, salonSamedi: g.jours['6'].actif };
    tcConfigPro121.suivant(); await attendre(50);
    // Étape 5 : les créneaux de chaque coiffeur.
    R.e5 = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(50); tcConfigPro121.suivant(); await attendre(80);
    // Le récapitulatif.
    R.recap = texte(); debords.push(deborde());
    // Retirer Julien ; revenir à « Seul » : les jours du professionnel, comme avant.
    tcConfigPro121.aller(1); await attendre(30);
    tcConfigPro121.retirerCoiffeur(julien); await attendre(30);
    R.retire = garde().equipe.coiffeurs.map(function (c) { return c.prenom; }).join(',');
    tcConfigPro121.equipeMode('seul'); await attendre(30);
    tcConfigPro121.aller(4); await attendre(30); R.seulApres = texte();
    tcConfigPro121.aller(7); await attendre(30); R.recapSeul = texte();
    // Examen de la 136 : seul, il décoche ses 5 jours ; puis à plusieurs, Julien coche le mardi : « Suivant » mène à l'étape 5.
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121();
    tcConfigPro121.choisirMetier('coiffeur'); tcConfigPro121.aller(4); [1, 2, 3, 4, 5].forEach(function (j) { tcConfigPro121.jour(j); });
    tcConfigPro121.suivant(); await attendre(30); R.impasseSeul = [_tcConfigProEtape, _tcConfigProErreur];
    tcConfigPro121.aller(1); tcConfigPro121.equipeMode('plusieurs');
    document.getElementById('cpNouveauCoiffeur').value = 'Julien'; tcConfigPro121.ajouterCoiffeur();
    tcConfigPro121.aller(4); tcConfigPro121.jour(2); await attendre(30);
    tcConfigPro121.suivant(); await attendre(50);
    R.impasse = [_tcConfigProEtape, _tcConfigProErreur, Object.keys(garde().jours).filter(function (j) { return garde().jours[j].actif; }).join(','), Object.keys(garde().equipe.coiffeurs[0].jours).filter(function (j) { return garde().equipe.coiffeurs[0].jours[j].actif; }).join(',')];
    R.debords = debords;
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-136b-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur);
else {
  verifie('le chirurgien-dentiste n’a pas la question « seul ou à plusieurs »', !/plusieurs/.test(S.dentiste), S.dentiste.slice(-200));
  verifie('le coiffeur : « Vous travaillez seul, ou à plusieurs ? », « Seul » choisi au départ', /Vous travaillez seul, ou à plusieurs \?/.test(S.seul) && /Un seul agenda : le vôtre\./.test(S.seul) && S.seulCoche.length === 2 && S.seulCoche[0] !== S.seulCoche[1] && !/Ajouter un coiffeur/.test(S.seul), JSON.stringify(S.seulCoche));
  verifie('seul : l’étape 4 comme avant (« Quels jours travaillez-vous ? »)', /Quels jours travaillez-vous \?/.test(S.seul4) && !/Choisissez un coiffeur/.test(S.seul4), S.seul4.slice(0, 200));
  verifie('à plusieurs : les coiffeurs un par un ; les prestations, les prix et la fiche sont ceux du salon ; chaque coiffeur a ses jours', /Ajoutez vos coiffeurs, un par un/.test(S.plusieurs) && /les mêmes pour tous/.test(S.plusieurs) && /Ajouter un coiffeur/.test(S.plusieurs) && /Ajouter ce coiffeur/.test(S.plusieurs), S.plusieurs.slice(-400));
  verifie('les messages : « Ajoutez au moins un coiffeur, avec son prénom. », « Écrivez le prénom du coiffeur. », « Écrivez le prénom de chaque coiffeur. »', S.sansCoiffeur === 'Ajoutez au moins un coiffeur, avec son prénom.' && S.prenomVide === 'Écrivez le prénom du coiffeur.' && S.prenomManquant === 'Écrivez le prénom de chaque coiffeur.', JSON.stringify([S.sansCoiffeur, S.prenomVide, S.prenomManquant]));
  verifie('la photo d’un coiffeur : réduite (moins de 40 000 caractères), gardée, montrée', S.photo.garde && S.photo.taille > 500 && S.photo.taille < 40000 && S.photo.affichee, JSON.stringify(S.photo));
  verifie('étape 2 : « Qui la fait ? » sous chaque prestation (23), un bouton par coiffeur', S.quiNb === 23 && /Qui la fait \?\s*✓ Marie\s*✓ Julien/.test(S.e2), S.quiNb);
  verifie('« Qui la fait ? » : Julien ne fait pas le balayage (enregistré, bouton relâché) ; Marie le fait', JSON.stringify(S.qui.sans) === '["balayage/balayage"]' && S.qui.presse === 'false' && JSON.stringify(S.qui.marie) === '[]', JSON.stringify(S.qui));
  verifie('étape 4 : « Quels jours travaille chaque coiffeur ? », un bouton par coiffeur (Marie d’abord)', /Quels jours travaille chaque coiffeur \?/.test(S.e4) && /Choisissez un coiffeur, puis cochez ses jours\./.test(S.e4) && /restent privés/.test(S.e4) && S.onglets === 'Marie:true:photo Julien:false', S.onglets);
  verifie('les jours de chacun : le samedi de Marie, le lundi de Julien jusqu’à 16h ; ni Julien ni le salon n’ont changé avec Marie', S.jours.marieSamedi === true && S.jours.julienSamedi === false && S.jours.julienLundi === '16:00' && S.jours.julienMardi === false && S.jours.salonSamedi === false, JSON.stringify(S.jours));
  verifie('un coiffeur sans jour : « Cochez au moins un jour pour Julien. », et ses jours s’affichent', S.sansJour[0] === 'Cochez au moins un jour pour Julien.' && /Julien/.test(S.sansJour[1] || ''), JSON.stringify(S.sansJour));
  // Marie : lundi à samedi, 9h-12h et 14h-18h en 20 min = 9 + 12 = 21 par jour, 6 jours = 126 ; Julien : lundi 9h-12h et 14h-16h = 9 + 6 = 15.
  verifie('étape 5 : les créneaux de chaque coiffeur (Marie 126, Julien 15) et le total du salon (141)', /Marie · 126 créneaux/.test(S.e5) && /Julien · 15 créneaux/.test(S.e5) && /En tout : 141 créneaux par semaine\./.test(S.e5), S.e5.slice(-500));
  verifie('le récapitulatif : « À plusieurs : Marie, Julien », les jours de chaque coiffeur, « pas faite par Julien »', /À plusieurs : Marie, Julien/.test(S.recap) && /Les jours de chaque coiffeur/.test(S.recap) && /Marie\s*Lundi : 9h à 12h, puis 14h à 18h[\s\S]*Samedi/.test(S.recap) && /Julien\s*Lundi : 9h à 12h, puis 14h à 16h/.test(S.recap) && /Balayage · 2 h 30\s*✂️ pas faite par Julien/.test(S.recap) && /En tout : 141 créneaux par semaine\./.test(S.recap), S.recap.slice(0, 1200));
  verifie('retirer un coiffeur ; revenir à « Seul » : les jours du professionnel et le récapitulatif d’avant', S.retire === 'Marie' && /Quels jours travaillez-vous \?/.test(S.seulApres) && /Vos jours et vos horaires/.test(S.recapSeul) && !/À plusieurs|pas faite par/.test(S.recapSeul), S.retire + ' ' + S.recapSeul.slice(0, 300));
  verifie('seul, sans jour : « Cochez au moins un jour. » (comme avant)', S.impasseSeul[0] === 4 && S.impasseSeul[1] === 'Cochez au moins un jour.', JSON.stringify(S.impasseSeul));
  verifie('à plusieurs, le salon sans jour et Julien avec le mardi : « Suivant » mène à l’étape 5 (pas d’impasse)', S.impasse[0] === 5 && S.impasse[1] === '' && S.impasse[2] === '' && S.impasse[3] === '2', JSON.stringify(S.impasse));
  verifie('la page ne déborde pas sur le côté (390 px), à chaque étape', S.debords.every((x) => x <= 0), JSON.stringify(S.debords));
  verifie('aucun appel réseau', S.appels === 0, S.appels);
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
