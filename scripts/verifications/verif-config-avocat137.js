// Mission 137 (Charles, 19/11) : le métier « Avocat » dans la « Configuration professionnelle ». Mêmes six étapes ; « domaine » et
// « mission » ; 14 domaines (décochés au départ), les 11 missions du divorce, 6 missions générales ailleurs ; ses deux rendez-vous
// (premier contact par téléphone, gratuit au départ ; rendez-vous au cabinet, prix facultatif ; « Un nouveau client ne prend seul
// que le premier contact », cochée), une seule durée de 30 minutes ; la fiche (« Maître … », barreau, honoraires, aide
// juridictionnelle oui ou non, ses domaines) ; « Remplis à ma place » coche aussi les domaines. Bloquant : case éteinte = rien ;
// le dentiste (verif-config-coiffeur136) et le coiffeur déjà configurés ne bougent pas (empreinte du coiffeur, ici).
// Usage : node verif-config-avocat137.js <index.html>   (TC_CHROME ; EMPREINTES=1 : affiche les empreintes du coiffeur)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
// Un coiffeur déjà configuré (à plusieurs, prix, réglages, consigne), dessiné par la page de la mission 136.
const EMPREINTES = { etape2: '1ce1dbbb9bd27b9e', etape3: 'a7b76be281a7c6b6', etape4: '1bb23a3ac4419ff5', etape5: 'aa3a880c1e0a2a65', etape6: '969feceb028b7852',
  etape7: '8b0c4264f43dc7fd', etape4julien: 'cb30611638b1881a', remplir: '45f6b6642a416a9c' };
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
    var texte = function () { return document.getElementById('configProCorps').innerText; };
    var garde = function () { return JSON.parse(localStorage.getItem('tc_config_pro') || 'null') || {}; };
    var deborde = function () { var c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    var debords = [];
    // A. Case éteinte : rien.
    renderMenu(); R.menuEteint = /Configuration professionnelle/.test(document.getElementById('sideMenu').innerText);
    // B. Le coiffeur déjà configuré (avant l'avocat : son empreinte se lit aussi sur la page d'avant la mission).
    var c = { v: 1, metier: 'coiffeur', familles: tcConfigProFamillesDuMetier('coiffeur'), jours: tcConfigProJoursDefaut(), dureeRdv: 30, etape: 2, termine: false };
    c.familles[0].consigne = 'Venez avec les cheveux lavés.'; c.familles[0].sous[2].prix = { type: 'fixe', min: 45 }; c.familles[4].sous[1].prix = { type: 'fourchette', min: 120, max: 160 };
    c.familles[6].sous[2].prix = { type: 'devis' }; c.familles[1].sous[0].horsLigne = true; c.familles[4].sous[2].duree = 270;
    c.familles.push({ id: 'pbarbe', nom: 'Barbe', propre: true, gardee: true, duree: 20, sous: [{ id: 'sbarbe', nom: 'Taille de barbe', propre: true, gardee: true, duree: 20, prix: { type: 'fixe', min: 15 } }] });
    c.equipe = { mode: 'plusieurs', coiffeurs: [{ id: 'cA', prenom: 'Marie', jours: tcConfigProJoursDefaut(), sans: ['balayage/balayage'] }, { id: 'cB', prenom: 'Julien', jours: tcConfigProJoursDefaut(), sans: [] }] };
    c.equipe.coiffeurs[1].jours[1].apres = ['14:00', '16:00']; c.equipe.coiffeurs[0].jours[6] = { actif: true, matin: ['09:00', '12:00'], apres: ['14:00', '18:00'] };
    c.fiche = { nom: 'Salon Lumière', metier: 'Coiffeur', adresse: '8 rue des Lilas', acces: 'Métro Voltaire', presentation: 'Bienvenue.', consignes: 'Prévenez 24 h avant.', paiement: 'Carte bancaire', horaires: '', langues: 'Français' };
    localStorage.setItem('tc_config_pro', JSON.stringify(c));
    tcOuvrirConfigPro121(); await attendre(50);
    // Mission 139 : l'empreinte se lit sans le bouton « Voir tous les métiers » (le reste ne bouge pas).
    // Mission 141 : et sans la ligne « Votre métier : … » des étapes 2 à 6 (verif-rappel-metier141 la vérifie).
    // Mission 143 : et sans les blocs des titres d'étape (verif-titres-etapes143 les vérifie).
    var corps = function () { return document.getElementById('configProCorps').innerHTML.replace(new RegExp('<button id="cpTousMetiers139"[^>]*>[^<]*</button>'), '').replace(new RegExp('<div id="cpRappelMetier141"[^>]*>.*?</div>'), '').replace(new RegExp('<span class="cp-bloc143"[^>]*>([^<]*)</span>', 'g'), '$1'); };
    var C = {};
    for (var n = 2; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); C['etape' + n] = corps(); }
    _tcConfigProEtape = 4; tcConfigPro121.choisirCoiffeur('cB'); C.etape4julien = corps();
    _tcConfigProEtape = 6; _tcConfigProRemplir = true; tcRendreConfigPro121(); C.remplir = corps(); _tcConfigProRemplir = false;
    R.coiffeur = C;
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; _tcConfigProEtape = 1; _tcConfigProErreur = ''; _tcConfigProCoiffeur136 = null;
    // C. L'avocat.
    FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    R.metiers = Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return /choisirMetier/.test(b.getAttribute('onclick') || ''); }).map(function (b) { return b.innerText.trim(); });
    var carte = Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return b.innerText.trim() === 'Avocat'; })[0];
    if (!carte) throw new Error('pas de métier Avocat');
    carte.click(); await attendre(80);
    R.e1 = texte(); R.duree = garde().dureeRdv; debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(80);
    R.e2 = texte(); debords.push(deborde());
    R.domaines = garde().familles.map(function (f) { return f.id + ':' + f.sous.length + ':' + (f.gardee ? 1 : 0); }).join(' ');
    tcConfigPro121.suivant(); await attendre(50); R.aucunDomaine = _tcConfigProErreur; _tcConfigProErreur = '';
    tcConfigPro121.basculer('divorce'); tcConfigPro121.basculer('travail'); await attendre(50);
    R.e2b = texte(); debords.push(deborde());
    document.getElementById('cpNouvelleFamille').value = ''; tcConfigPro121.ajouterFamille(); R.erreurDomaine = _tcConfigProErreur;
    document.getElementById('cpNouvelleSous_divorce').value = ''; tcConfigPro121.ajouterSous('divorce'); R.erreurMission = _tcConfigProErreur;
    _tcConfigProErreur = '';
    tcConfigPro121.ouvrirQuestion('divorce', 'amiable'); await attendre(30);
    R.question = (document.getElementById('cpQuestion') || {}).innerText || ''; R.questionExemple = (document.getElementById('cpQTexte') || {}).placeholder || '';
    tcConfigPro121.qAnnuler(); await attendre(30);
    tcConfigPro121.suivant(); await attendre(80);
    // D. Étape 3 : les deux rendez-vous.
    R.e3 = texte(); debords.push(deborde());
    R.e3defaut = { contact: (document.getElementById('cpPrix137_contact') || {}).value, cabinet: (document.getElementById('cpPrix137_cabinet') || {}).value, case: (document.querySelector('#configProCorps .cp-nouveau137') || { getAttribute: function () { return null; } }).getAttribute('aria-checked'), garde: garde().rdv137 === undefined };
    tcConfigPro121.rdvPrixType('contact', 'fixe'); tcConfigPro121.rdvPrixMontant('contact', 'min', '30');
    tcConfigPro121.rdvPrixType('cabinet', 'fourchette'); tcConfigPro121.rdvPrixMontant('cabinet', 'min', '150'); tcConfigPro121.rdvPrixMontant('cabinet', 'max', '200');
    tcConfigPro121.rdvNouveauSeul(); R.caseDecochee = garde().rdv137.nouveauContactSeul; tcConfigPro121.rdvNouveauSeul(); await attendre(30);
    R.rdv = garde().rdv137;
    R.e3b = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(80);
    R.e4 = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(80);
    R.e5 = texte(); R.selectRdv = (document.getElementById('cpDureeRdv') || {}).value; debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(120);
    // E. Étape 6 : la fiche.
    R.e6 = texte(); debords.push(deborde());
    R.nom = document.getElementById('cpFiche_nom').value;
    R.champs = Array.prototype.map.call(document.querySelectorAll('#configProCorps [id^=cpFiche_]'), function (x) { return x.id.replace('cpFiche_', ''); }).join(' ');
    tcConfigPro121.ficheChoix('aideJuridictionnelle', 'oui'); await attendre(30);
    R.oui = [garde().fiche.aideJuridictionnelle, (Array.prototype.filter.call(document.querySelectorAll('#configProCorps .cp-ouinon137 [role=radio]'), function (b) { return b.getAttribute('aria-checked') === 'true'; })[0] || {}).innerText];
    tcConfigPro121.ficheChoix('aideJuridictionnelle', 'non'); R.non = garde().fiche.aideJuridictionnelle;
    tcConfigPro121.ficheChoix('aideJuridictionnelle', 'non'); R.aucune = garde().fiche.aideJuridictionnelle;
    var envoye = '';
    callAI = async function (msgs) { envoye = JSON.stringify(msgs); return '{"nom":"Maître Paul Martin","barreau":"Barreau de Paris","adresse":"3 quai des Orfèvres, 75001 Paris","honoraires":"200 € de l’heure","aideJuridictionnelle":true,"langues":"Français, anglais","tarifs":"Conventionné","domaines":["Droit du travail et licenciement","Droit de la famille"]}'; };
    tcConfigPro121.ouvrirRemplir(); await attendre(30);
    R.cadre = texte();
    document.getElementById('cpTexteFiche').value = 'Maître Paul Martin, avocat au barreau de Paris. Droit du travail, droit de la famille. Aide juridictionnelle acceptée.';
    await tcConfigPro121.remplir(); await attendre(120);
    R.propose = (document.getElementById('cpPropose') || {}).innerText || '';
    R.consigne = /d’un avocat/.test(envoye) && /domaines/.test(envoye) && /aideJuridictionnelle/.test(envoye);
    R.avantValider = garde().familles.some(function (f) { return f.nom === 'Droit de la famille'; });
    Array.prototype.filter.call(document.querySelectorAll('#configProCorps button'), function (b) { return /Valider ces réponses/.test(b.innerText); })[0].click(); await attendre(120);
    R.valide = texte(); debords.push(deborde());
    var g = garde();
    R.apres = { nom: g.fiche.nom, barreau: g.fiche.barreau, aide: g.fiche.aideJuridictionnelle, tarifs: g.fiche.tarifs || '', famille: g.familles.filter(function (f) { return f.nom === 'Droit de la famille'; }).map(function (f) { return f.gardee + ':' + f.sous.length; }).join(''), travail: g.familles.filter(function (f) { return f.id === 'travail'; })[0].gardee };
    tcConfigPro121.suivant(); await attendre(120);
    R.recap = texte(); debords.push(deborde());
    // F. Changer de métier : « Maître » et « Dr » suivent le métier ; ce qui est écrit reste.
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121();
    tcConfigPro121.choisirMetier('avocat'); tcConfigProFiche(tcConfigProLire()); R.maitre = tcConfigProLire().fiche.nom;
    tcConfigPro121.choisirMetier('chirurgien-dentiste'); R.versDentiste = [tcConfigProLire().fiche.nom, tcConfigProLire().dureeRdv];
    tcConfigPro121.choisirMetier('avocat'); R.versAvocat = [tcConfigProLire().fiche.nom, tcConfigProLire().dureeRdv, tcConfigProLire().fiche.metier];
    R.debords = debords;
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-137-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 16);
if (S && S.coiffeur && process.env.EMPREINTES) { console.log(JSON.stringify(Object.fromEntries(Object.entries(S.coiffeur).map(([k, v]) => [k, h(v)])), null, 1)); process.exit(0); }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur + ' ' + JSON.stringify(S.metiers || ''));
else {
  const sansMots = (t) => !/\bactes?\b/i.test(t) && !/patient/i.test(t) && !/prestation/i.test(t);
  verifie('case éteinte (compte ordinaire) : pas d’entrée de menu', S.menuEteint === false, S.menuEteint);
  // Mission 147 : d'autres métiers s'ajoutent, rangés par catégories (verif-config-metiers147 vérifie l'ordre de chaque catégorie).
  verifie('étape 1 : « Avocat », « Chirurgien-dentiste », « Coiffeur » sont dans la liste ; pas de « seul ou à plusieurs » pour l’avocat', ['Avocat', 'Chirurgien-dentiste', 'Coiffeur'].every((x) => S.metiers.indexOf(x) > -1) && !/plusieurs/.test(S.e1), JSON.stringify(S.metiers));
  verifie('l’avocat : une seule durée de 30 minutes (choisie pour lui à l’étape 5)', S.duree === 30 && S.selectRdv === '30', JSON.stringify([S.duree, S.selectRdv]));
  verifie('étape 2 : « Quels domaines d’activité pratiquez-vous ? » (mission 142), les 14 domaines décochés au départ, sans leurs missions', /Quels domaines d’activité pratiquez-vous \?/.test(S.e2) && S.domaines === 'divorce:11:0 successions:6:0 locataire:6:0 immobilier:6:0 travail:6:0 harcelement:6:0 fiscalite:6:0 routier:6:0 penal:6:0 etrangers:6:0 commercial:6:0 administratif:6:0 entreprise:6:0 autres:6:0'
    && ['Divorce et garde d’enfants', 'Droit des successions', 'Pénal : crimes et délits', 'Création et gestion d’entreprise', 'Autres'].every((x) => S.e2.indexOf(x) > -1) && !/Donner une consultation juridique/.test(S.e2), S.domaines);
  verifie('aucun domaine coché : « Cochez au moins un domaine et une mission. »', S.aucunDomaine === 'Cochez au moins un domaine et une mission.', S.aucunDomaine);
  verifie('le divorce : ses 11 missions ; le droit du travail : les 6 missions générales', ['Rédiger une convention de divorce', 'Mener une procédure de divorce à l’amiable', 'Mener une procédure de divorce pour altération du lien conjugal', 'Mener une procédure de divorce pour faute', 'Mener une procédure suite à une séparation de corps', 'Être assisté pour une convocation au tribunal ou au commissariat', 'Connaître ses honoraires'].every((x) => S.e2b.indexOf(x) > -1)
    && (S.e2b.match(/Donner une consultation juridique/g) || []).length === 2 && (S.e2b.match(/Reprendre une procédure en cours/g) || []).length === 2, S.e2b.slice(0, 400));
  verifie('étape 2 : « domaine » et « mission » (ni acte, ni patient, ni prestation) ; « Un domaine qui manque ? », « Créer mon propre domaine », « Créer ma propre mission »', sansMots(S.e2b) && /Un domaine qui manque \?/.test(S.e2b) && /Créer mon propre domaine/.test(S.e2b) && /Créer ma propre mission/.test(S.e2b), S.e2b.slice(-300));
  verifie('les messages : « Écrivez le nom de votre domaine. », « Écrivez le nom de votre mission. » ; la question au client', S.erreurDomaine === 'Écrivez le nom de votre domaine.' && S.erreurMission === 'Écrivez le nom de votre mission.' && /Question au client/.test(S.question) && /cette mission/.test(S.question) && S.questionExemple === 'Par exemple : Avez-vous des enfants mineurs ?', JSON.stringify([S.erreurDomaine, S.erreurMission, S.questionExemple]));
  verifie('étape 3 : « Vos deux rendez-vous » : premier contact par téléphone (gratuit), rendez-vous au cabinet (sans prix), « Un nouveau client ne prend seul que le premier contact » cochée ; 30 minutes chacun', /Vos deux rendez-vous/.test(S.e3) && /📞 Premier contact par téléphone/.test(S.e3) && /🏛️ Rendez-vous au cabinet/.test(S.e3) && (S.e3.match(/Un rendez-vous de 30 minutes \(étape 5\)/g) || []).length === 2
    && S.e3defaut.contact === 'gratuit' && S.e3defaut.cabinet === '' && S.e3defaut.case === 'true' && S.e3defaut.garde && /Un nouveau client ne prend seul que le premier contact/.test(S.e3) && sansMots(S.e3), JSON.stringify(S.e3defaut));
  verifie('les deux rendez-vous enregistrés : le premier contact à 30 €, le cabinet de 150 à 200 €, la case décochée puis recochée', JSON.stringify(S.rdv) === JSON.stringify({ contact: { prix: { type: 'fixe', min: 30 } }, cabinet: { prix: { type: 'fourchette', min: 150, max: 200 } }, nouveauContactSeul: true }) && S.caseDecochee === false, JSON.stringify([S.rdv, S.caseDecochee]));
  verifie('étape 4 : comme avant (« Quels jours travaillez-vous ? », privés)', /Quels jours travaillez-vous \?/.test(S.e4) && /restent privés/.test(S.e4) && !/coiffeur/i.test(S.e4), S.e4.slice(0, 200));
  verifie('étape 5 : une seule durée, « le premier contact par téléphone comme le rendez-vous au cabinet »', /le premier contact par téléphone comme le rendez-vous au cabinet/.test(S.e5) && sansMots(S.e5), S.e5.slice(0, 300));
  verifie('étape 6 : « Maître Charles Haddad » ; barreau, honoraires, aide juridictionnelle (Oui / Non), ses domaines ; ni carte Vitale, ni tiers payant, ni « à apporter »', S.nom === 'Maître Charles Haddad' && S.champs === 'nom metier barreau adresse acces presentation honoraires paiement horaires langues'
    && /À quel barreau êtes-vous inscrit \?/.test(S.e6) && /Vos honoraires/.test(S.e6) && /Acceptez-vous l’aide juridictionnelle \?\s*Oui\s*Non/.test(S.e6) && /Vos domaines[\s\S]*Divorce et garde d’enfants[\s\S]*Droit du travail et licenciement[\s\S]*Changer mes domaines/.test(S.e6) && !/Vitale|tiers payant|Conventionn|apporter/i.test(S.e6) && /verront vos clients/.test(S.e6), S.champs + ' ' + S.nom);
  verifie('l’aide juridictionnelle : « Oui » (enregistré, le bouton allumé), puis « Non », puis plus de réponse', S.oui[0] === 'oui' && S.oui[1] === 'Oui' && S.non === 'non' && S.aucune === '', JSON.stringify([S.oui, S.non, S.aucune]));
  verifie('« Remplis à ma place » : la consigne parle d’un avocat et de ses domaines ; le cadre dit qu’il coche les domaines', S.consigne && /il les coche aussi/.test(S.cadre), S.consigne);
  verifie('« Remplis à ma place » : les domaines lus attendent (« Vos domaines (2) »), rien n’est enregistré avant « Valider »', /Vos domaines \(2\)/.test(S.propose) && /Droit de la famille/.test(S.propose) && /Barreau : Barreau de Paris/.test(S.propose) && !S.avantValider, S.propose.slice(0, 400));
  verifie('« Valider ces réponses » : la fiche remplie (barreau, aide juridictionnelle « oui ») ; le droit du travail reste coché, « Droit de la famille » est créé et coché', S.apres.nom === 'Maître Paul Martin' && S.apres.barreau === 'Barreau de Paris' && S.apres.aide === 'oui' && S.apres.tarifs === '' && S.apres.famille === 'true:0' && S.apres.travail === true && /✅ 2 domaines cochés à l’étape 2\./.test(S.valide), JSON.stringify(S.apres));
  verifie('le récapitulatif : ses domaines et missions (sans durée), ses deux rendez-vous, la fiche', /Vos domaines et vos missions/.test(S.recap) && /Divorce et garde d’enfants\s*• Donner une consultation juridique/.test(S.recap) && !/Donner une consultation juridique · /.test(S.recap)
    && /📞 Premier contact par téléphone · 30 min · 30 €/.test(S.recap) && /🏛️ Rendez-vous au cabinet · 30 min · de 150 € à 200 €/.test(S.recap) && /🔒 Un nouveau client ne prend seul que le premier contact\./.test(S.recap)
    && /Aide juridictionnelle : Oui/.test(S.recap) && /Barreau : Barreau de Paris/.test(S.recap) && /Domaines : Divorce et garde d’enfants, Droit du travail et licenciement, Droit de la famille/.test(S.recap) && sansMots(S.recap), S.recap.slice(0, 1200));
  verifie('changer de métier : « Maître » pour l’avocat, « Dr » pour le dentiste ; 30 minutes pour l’avocat', S.maitre === 'Maître Charles Haddad' && S.versDentiste[0] === 'Dr Charles Haddad' && S.versAvocat[0] === 'Maître Charles Haddad' && S.versAvocat[1] === 30 && S.versAvocat[2] === 'Avocat', JSON.stringify([S.maitre, S.versDentiste, S.versAvocat]));
  verifie('la page ne déborde pas sur le côté (390 px), à chaque étape', S.debords.every((x) => x <= 0), JSON.stringify(S.debords));
  verifie('aucun appel réseau', S.appels === 0, S.appels);
  const diff = Object.keys(EMPREINTES).filter((k) => h((S.coiffeur || {})[k]) !== EMPREINTES[k]);
  verifie('le coiffeur déjà configuré ne bouge pas : ses étapes 2 à 7 (à plusieurs, les jours de Julien), « Remplis à ma place », au caractère près', Object.keys(EMPREINTES).length === 8 && diff.length === 0, diff.join(', '));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
