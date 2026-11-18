// Mission 121, morceau A : la page « Configuration professionnelle » (TimeCool Pro).
// L'essentiel : case éteinte = rien de visible (ni menu, ni page) ; « Version complète » ne l'allume pas ; case allumée = les cinq
// étapes, les créneaux comptés (un créneau incomplet ne compte pas, jamais de nombre négatif), le récapitulatif, l'enregistrement
// dans tc_config_pro ; rien de MODE_PRO ni de CARNET_PROS. Usage : node verif-config-pro.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); };

console.log('-- Le code --');
verifie('la case CONFIG_PRO existe, éteinte par défaut', /CONFIG_PRO:\s+false\s+\/\/ Mission 121/.test(page) && /CONFIG_PRO:\s+\{ icon:'🩺', name:'Configuration professionnelle' \}/.test(page));
verifie('« Version complète » garde l’état de CONFIG_PRO, MODE_PRO et CARNET_PROS', /const _gardes = \{ MODE_PRO: !!FEATURES\.MODE_PRO, CARNET_PROS: !!FEATURES\.CARNET_PROS, CONFIG_PRO: !!FEATURES\.CONFIG_PRO \};/.test(page));
verifie('la fiche ne reprend jamais les horaires de l’étape 4', !/fiche[\s\S]{0,80}jours\[/.test((page.match(/function tcConfigProFiche[\s\S]*?\n\}/) || [''])[0]) && /horaires: ''/.test((page.match(/function tcConfigProFiche[\s\S]*?\n\}/) || [''])[0]));
verifie('les anciens modules restent éteints par défaut (MODE_PRO, CARNET_PROS)', /MODE_PRO:\s+false,/.test(page) && /CARNET_PROS:\s+false,/.test(page));
verifie('la page ne se rattache à aucun ancien module', !/MODE_PRO|CARNET_PROS|switchMode/.test((page.match(/MISSION 121 \(Charles, 18\/11\)[\s\S]*?fin mission 121/) || [''])[0]));

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
    hideAuthFlow();
    var menu = function () { renderMenu(); return document.getElementById('sideMenu').innerText; };
    var texte = function () { return document.getElementById('configProCorps').innerText; };
    var bouton = function (re) { return Array.prototype.slice.call(document.querySelectorAll('#configProCorps button, #configProCorps [role=button], #configProCorps [role=checkbox]')).filter(function (b) { return re.test(b.innerText); })[0]; };
    // 1. Case éteinte (compte ordinaire) : rien.
    R.defaut = FEATURES.CONFIG_PRO;
    R.menuEteint = /Configuration professionnelle/.test(menu());
    navigate('configpro'); await attendre(200);
    R.pageEteinte = [currentPage, document.getElementById('page-configpro').classList.contains('active')];
    FEATURES.MODE_PRO = true;
    resetFeatureOverrides(); await attendre(100);
    R.apresVersionComplete = FEATURES.CONFIG_PRO;
    R.modeProGarde = FEATURES.MODE_PRO; R.carnetGarde = FEATURES.CARNET_PROS;
    FEATURES.CONFIG_PRO = false; FEATURES.MODE_PRO = false; FEATURES.CARNET_PROS = false; saveFeatureOverrides();
    // 2. Case cochée : l'entrée de menu, la page.
    FEATURES.CONFIG_PRO = true;
    R.menuAllume = /Configuration professionnelle/.test(menu());
    navigate('configpro'); await attendre(300);
    R.page = currentPage;
    R.e1 = texte();
    bouton(/Suivant/).click(); await attendre(100);
    R.sansMetier = texte();
    bouton(/Chirurgien-dentiste/).click(); await attendre(100);
    bouton(/Suivant/).click(); await attendre(100);
    // Étape 2 : cinq familles ; renommer ; créer sa famille et une sous-famille ; décocher une sous-famille.
    R.e2 = texte();
    tcConfigPro121.renommer('consultation-dentaire', 'radio'); await attendre(50);
    document.getElementById('cpNom').value = 'Panoramique'; tcConfigPro121.validerNom(); await attendre(50);
    tcConfigPro121.basculer('chirurgie', 'implant'); await attendre(50);
    document.getElementById('cpNouvelleFamille').value = 'Pédodontie'; tcConfigPro121.ajouterFamille(); await attendre(50);
    var propre = tcConfigProLire().familles.filter(function (f) { return f.propre; })[0];
    document.getElementById('cpNouvelleSous_' + propre.id).value = 'Scellement de sillons'; tcConfigPro121.ajouterSous(propre.id); await attendre(50);
    R.e2b = texte();
    bouton(/Suivant/).click(); await attendre(100);
    R.e3 = texte();
    tcConfigPro121.duree('detartrage', null, 40); await attendre(50);
    bouton(/Suivant/).click(); await attendre(100);
    // Étape 4 : le samedi en plus ; lundi matin 9h à 12h10 ; mardi après-midi : la fin avant le début.
    R.e4 = texte();
    tcConfigPro121.jour(6); tcConfigPro121.heure(1, 'matin', 1, '12:10'); tcConfigPro121.heure(2, 'apres', 1, '13:00'); tcConfigPro121.heure(3, 'matin', 1, '09:00'); await attendre(50);
    bouton(/Suivant/).click(); await attendre(100);
    tcConfigPro121.dureeRdv(20); await attendre(50);
    R.e5 = texte();
    R.debord = (function () { var c = document.getElementById('page-configpro'); return c.scrollWidth - c.clientWidth; })();
    bouton(/Suivant/).click(); await attendre(150);
    // Étape 6 : la fiche ; « Remplis à ma place » avec un texte collé (le modèle simulé).
    R.e6 = texte();
    R.horairesFiche = document.getElementById('cpFiche_horaires').value;
    callAI = async function () { return 'Voici : {"nom":"Dr Paul Martin","adresse":"12 rue de la Paix, 75002 Paris","paiement":"Carte bancaire, espèces","horaires":"Lundi au vendredi, 8h à 19h","langues":"Français, anglais"}'; };
    bouton(/Remplis à ma place/).click(); await attendre(100);
    document.getElementById('cpTexteFiche').value = 'Dr Paul Martin, chirurgien-dentiste, 12 rue de la Paix 75002 Paris. Paiement : carte bancaire, espèces. Ouvert du lundi au vendredi de 8h à 19h. Langues : français, anglais.';
    await tcConfigPro121.remplir(); await attendre(150);
    R.e6b = texte();
    R.fiche = { nom: document.getElementById('cpFiche_nom').value, adresse: document.getElementById('cpFiche_adresse').value, horaires: document.getElementById('cpFiche_horaires').value, presentation: document.getElementById('cpFiche_presentation').value };
    document.getElementById('cpFiche_langues').value = 'Français, anglais, espagnol'; tcConfigPro121.fiche('langues', 'Français, anglais, espagnol');
    callAI = async function () { throw new Error('hors ligne'); };
    bouton(/Remplis à ma place/).click(); await attendre(50);
    document.getElementById('cpTexteFiche').value = 'Un texte de fiche assez long pour être lu par Charly Pro IA.';
    await tcConfigPro121.remplir(); await attendre(100);
    R.e6panne = texte();
    bouton(/récapitulatif/).click(); await attendre(150);
    R.recap = texte();
    R.garde = JSON.parse(localStorage.getItem('tc_config_pro') || 'null');
    // Au retour sur la page : le récapitulatif.
    navigate('calendar'); await attendre(100); navigate('configpro'); await attendre(200);
    R.retour = texte().slice(0, 80);
    // La case éteinte pendant qu'on est sur la page : elle se ferme.
    toggleFeature('CONFIG_PRO'); await attendre(150);
    R.fermee = [FEATURES.CONFIG_PRO, currentPage, /Configuration professionnelle/.test(menu())];
  } catch (e) { R.erreur = String(e && e.stack || e); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
for (const [taille, w] of [['téléphone', 390], ['PC', 1366]]) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-121-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + w + ',844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let S = null;
  try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
  const n = taille + ' — ';
  if (!S) { verifie(n + 'la page a rejoué le parcours', false, (r.stdout || '').slice(-300)); continue; }
  if (S.erreur) verifie(n + 'aucune erreur', false, S.erreur);
  verifie(n + 'case éteinte par défaut : ni entrée de menu, ni page (retour à l’agenda)', S.defaut === false && S.menuEteint === false && S.pageEteinte[0] === 'calendar' && S.pageEteinte[1] === false, JSON.stringify([S.defaut, S.menuEteint, S.pageEteinte]));
  verifie(n + '« Version complète » ne l’allume pas, et laisse MODE_PRO et CARNET_PROS comme ils étaient', S.apresVersionComplete === false && S.modeProGarde === true && S.carnetGarde === false, JSON.stringify([S.apresVersionComplete, S.modeProGarde, S.carnetGarde]));
  verifie(n + 'case cochée : l’entrée « Configuration professionnelle » et la page', S.menuAllume === true && S.page === 'configpro' && /Quel est votre métier \?/.test(S.e1) && /Chirurgien-dentiste/.test(S.e1), JSON.stringify([S.menuAllume, S.page]));
  verifie(n + 'étape 1 : sans métier, « Choisissez votre métier. »', /Choisissez votre métier\./.test(S.sansMetier));
  verifie(n + 'étape 2 : les cinq familles du chirurgien-dentiste, et « Créer ma propre famille »', ['Consultation dentaire', 'Consultation d’orthodontie', 'Consultation de chirurgie', 'Consultation d’esthétique dentaire', 'Détartrage'].every((x) => S.e2.indexOf(x) > -1) && /Créer ma propre famille/.test(S.e2) && /Adulte - Consultation dentaire/.test(S.e2), S.e2.slice(0, 400));
  verifie(n + 'étape 2 : renommer, créer sa famille et sa sous-famille', /Panoramique/.test(S.e2b) && /Pédodontie/.test(S.e2b) && /Scellement de sillons/.test(S.e2b), S.e2b.slice(-400));
  verifie(n + 'étape 3 : une durée par acte gardé (pas l’implant décoché)', /Combien de temps vous faut-il \?/.test(S.e3) && /Panoramique/.test(S.e3) && !/Pose d’un implant/.test(S.e3) && /Scellement de sillons/.test(S.e3), S.e3.slice(0, 300));
  verifie(n + 'étape 4 : les jours, et « restent privés »', /Quels jours travaillez-vous \?/.test(S.e4) && /Lundi/.test(S.e4) && /Dimanche/.test(S.e4) && /restent privés/.test(S.e4));
  verifie(n + 'étape 5 : lundi 9h à 12h10 en 20 min = 9 créneaux (le créneau incomplet ne compte pas)', /Lundi\s*Le matin : 9 créneaux\s*L’après-midi : 12 créneaux/.test(S.e5), S.e5);
  verifie(n + 'étape 5 : une fin avant le début donne un message, jamais un nombre négatif', /L’après-midi : pas de créneau \(la fin est avant le début\)/.test(S.e5) && !/-\d+ créneau/.test(S.e5), S.e5);
  verifie(n + 'étape 5 : 9h à 9h : « la fin est la même que le début »', /Le matin : pas de créneau \(la fin est la même que le début\)/.test(S.e5), S.e5);
  verifie(n + 'étape 5 : le total de la semaine (lundi à samedi)', /En tout : 105 créneaux par semaine\./.test(S.e5), S.e5.slice(-200));
  verifie(n + 'étape 6 : la fiche, question par question, « Remplis à ma place » en haut', /Étape 6 sur 6/i.test(S.e6) && /Votre fiche professionnelle/.test(S.e6) && /Remplis à ma place/.test(S.e6) && /Quelle est l’adresse du cabinet \?/.test(S.e6) && /Que doit apporter le patient \?/.test(S.e6), S.e6.slice(0, 300));
  verifie(n + 'étape 6 : les horaires du cabinet vides au départ (jamais ceux de l’étape 4)', S.horairesFiche === '', S.horairesFiche);
  verifie(n + '« Remplis à ma place » : la fiche remplie depuis le texte collé, ce qui manque garde la réponse proposée', S.fiche && S.fiche.nom === 'Dr Paul Martin' && S.fiche.adresse === '12 rue de la Paix, 75002 Paris' && S.fiche.horaires === 'Lundi au vendredi, 8h à 19h' && /cabinet de chirurgie dentaire/.test(S.fiche.presentation) && /Charly Pro IA a rempli 5 réponses/.test(S.e6b), JSON.stringify(S.fiche));
  verifie(n + '« Remplis à ma place » sans réponse du modèle : un message simple, rien d’effacé', /Je n’arrive pas à lire ce texte pour le moment/.test(S.e6panne) && !/je ne peux pas/i.test(S.e6panne), S.e6panne.slice(-200));
  verifie(n + 'la page ne déborde pas sur le côté', S.debord <= 0, S.debord);
  verifie(n + 'le récapitulatif : métier, actes, jours, rendez-vous', /Votre configuration/.test(S.recap) && /Chirurgien-dentiste/.test(S.recap) && /Détartrage · 40 min/.test(S.recap) && /Samedi/.test(S.recap) && /Chaque rendez-vous dure 20 minutes\./.test(S.recap) && /Votre fiche professionnelle/.test(S.recap) && /Dr Paul Martin/.test(S.recap) && /Français, anglais, espagnol/.test(S.recap), S.recap.slice(0, 500));
  const g = S.garde || {};
  verifie(n + 'enregistré dans tc_config_pro (métier, actes, jours, durée)', g.metier === 'chirurgien-dentiste' && g.fiche && g.fiche.langues === 'Français, anglais, espagnol' && g.dureeRdv === 20 && g.termine === true && g.jours && g.jours['6'].actif === true && g.jours['1'].matin[1] === '12:10' && g.familles.length === 6, JSON.stringify(g).slice(0, 300));
  verifie(n + 'au retour sur la page : le récapitulatif', /^Votre configuration/.test(S.retour), S.retour);
  verifie(n + 'la case éteinte sur la page : la page se ferme, l’entrée disparaît', S.fermee && S.fermee[0] === false && S.fermee[1] === 'calendar' && S.fermee[2] === false, JSON.stringify(S.fermee));
}
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
