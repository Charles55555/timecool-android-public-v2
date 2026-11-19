// Mission 136, lot 1 (Charles, 19/11) : le métier « Coiffeur » dans la « Configuration professionnelle ». Les mêmes six étapes ; on dit
// prestation et client ; ses familles et prestations ; la consigne en tête de famille ; « Pas de rendez-vous en ligne » et
// « Seulement avec une autre prestation » ; le prix facultatif (un prix, une fourchette, « Sur devis ») ; une seule durée de
// rendez-vous ; la fiche du salon ; « Remplis à ma place » propose aussi les prestations. Bloquant : case éteinte = rien ; le
// chirurgien-dentiste déjà configuré ne bouge pas (son HTML, étape par étape, comparé à son empreinte d'avant la mission).
// Usage : node verif-config-coiffeur136.js <index.html>   (TC_CHROME ; EMPREINTES=1 : affiche les empreintes du dentiste)
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
// Le dentiste de la sonde 136 (même configuration), dessiné par la page d'avant la mission 136 (b5370cf).
const EMPREINTES = { etape2: '8dd55ae79533d431', etape3: 'be820d1237b2169a', etape4: '223210c6ecd6de22', etape5: '58c0eb983958d3aa', etape6: '43fe0864b1e29472',
  etape7: 'abb812e8f07dba34', editeurNeuf: '6a1ea468b9b27f6b', editeurQuestion: '404bc4c341d58421', remplir: '87a7c241d7821b3a', propose: 'ca2dfc56d793b727', rempli: 'd11812536b3e33e5' };
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
    // A. Case éteinte (compte ordinaire) : ni entrée de menu, ni page.
    renderMenu(); R.menuEteint = /Configuration professionnelle/.test(document.getElementById('sideMenu').innerText);
    navigate('configpro'); await attendre(200); R.pageEteinte = currentPage;
    // B. Le dentiste (avant le coiffeur : son empreinte se lit aussi sur la page d avant la mission) : ses durées (270 min refusé), et son HTML étape par étape (la configuration de la sonde 136).
    var e = { v: 1, metier: 'chirurgien-dentiste', familles: tcConfigProFamillesDuMetier('chirurgien-dentiste'), jours: tcConfigProJoursDefaut(), dureeRdv: 25, etape: 2, termine: false };
    e.familles[0].sous[6].nom = 'Panoramique'; e.familles[2].sous[2].gardee = false; e.familles[4].duree = 40;
    e.familles.push({ id: 'pfixe', nom: 'Pédodontie', propre: true, gardee: true, duree: 20, sous: [{ id: 'sfixe', nom: 'Scellement de sillons', propre: true, gardee: true, duree: 25 }] });
    e.familles[0].sous[0].question = { texte: 'Quel est l’âge du patient ?', reponses: [{ texte: '13 ans ou moins', passe: false }, { texte: 'Plus de 13 ans', passe: true }] };
    e.jours[6] = { actif: true, matin: ['09:00', '12:10'], apres: ['14:00', '13:00'] };
    e.fiche = { nom: 'Dr Charles Haddad', metier: 'Chirurgien-dentiste', adresse: '12 rue de la Paix, 75002 Paris', acces: 'Cabinet au rez-de-chaussée.', presentation: 'Bonjour.', consignes: 'Arrivez 5 minutes avant.', tarifs: 'Conventionné.', paiement: 'Carte bancaire', horaires: '', langues: 'Français', apporter: 'Votre carte Vitale.' };
    localStorage.setItem('tc_config_pro', JSON.stringify(e));
    tcOuvrirConfigPro121(); await attendre(50);
    var corps = function () { return document.getElementById('configProCorps').innerHTML; };
    var D = {};
    for (var n = 2; n <= 7; n++) { _tcConfigProEtape = n; tcRendreConfigPro121(); D['etape' + n] = corps(); }
    _tcConfigProEtape = 2; tcConfigPro121.ouvrirQuestion('consultation-dentaire', 'controle'); D.editeurNeuf = corps(); tcConfigPro121.qAnnuler();
    tcConfigPro121.ouvrirQuestion('consultation-dentaire', 'adulte'); D.editeurQuestion = corps(); tcConfigPro121.qAnnuler();
    document.getElementById('cpNouvelleFamille').value = ''; tcConfigPro121.ajouterFamille(); D.erreurFamille = _tcConfigProErreur;
    document.getElementById('cpNouvelleSous_pfixe').value = ''; tcConfigPro121.ajouterSous('pfixe'); D.erreurSous = _tcConfigProErreur;
    _tcConfigProErreur = '';
    _tcConfigProEtape = 6; _tcConfigProRemplir = true; tcRendreConfigPro121(); D.remplir = corps();
    _tcConfigProRemplir = false; _tcConfigProPropose = { nom: 'Dr Paul Martin', adresse: '1 rue A', tarifs: 'Conventionné' }; tcRendreConfigPro121(); D.propose = corps();
    _tcConfigProPropose = null; _tcConfigProRempli = 2; tcRendreConfigPro121(); D.rempli = corps();
    tcConfigPro121.duree('detartrage', null, 270); D.duree270 = String(tcConfigProLire().familles[4].duree);
    tcConfigProLire().familles.forEach(function (f) { f.gardee = false; }); _tcConfigProEtape = 2; tcConfigPro121.suivant(); D.erreurActe = _tcConfigProErreur;
    R.dentiste = D;
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; _tcConfigProEtape = 1; _tcConfigProErreur = ''; _tcConfigProRemplir = false; _tcConfigProPropose = null; _tcConfigProRempli = 0;
    // C. Le coiffeur.
    FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    R.e1 = texte();
    R.metiers = Array.prototype.map.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return b.innerText.trim(); });
    var carte = Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=button]'), function (b) { return b.innerText.trim() === 'Coiffeur'; })[0];
    if (!carte) { R.pasDeCoiffeur = true; throw new Error('pas de métier Coiffeur'); }
    carte.click(); await attendre(100); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(100);
    R.e2 = texte(); debords.push(deborde());
    R.familles = garde().familles.map(function (f) { return f.id + ':' + f.sous.length; }).join(' ');
    R.reglagesProposes = garde().familles.reduce(function (l, f) { f.sous.forEach(function (x) { if (x.pasSeule) l.push('pasSeule:' + x.id); if (x.horsLigne) l.push('horsLigne:' + x.id); }); return l; }, []).join(' ');
    var c = function (fid, sid, cle) { var b = Array.prototype.filter.call(document.querySelectorAll('#configProCorps [role=checkbox]'), function (x) { return (x.getAttribute('onclick') || '').indexOf("option('" + fid + "', '" + sid + "', '" + cle + "')") > -1; })[0]; return b ? b.getAttribute('aria-checked') : null; };
    R.cases = { soin: c('soins', 'instantane', 'pasSeule'), chignon: c('coiffure', 'chignon-mariee', 'horsLigne'), homme: c('coupes-homme', 'coupe-homme', 'horsLigne') };
    // La consigne de famille, enregistrée à chaque lettre.
    var z = document.getElementById('cpConsigne_coupes-femme'); z.value = 'Venez avec les cheveux fraîchement lavés.'; z.dispatchEvent(new Event('input')); await attendre(50);
    R.consigne = garde().familles[0].consigne || '';
    // Les deux réglages : cochés puis décochés.
    tcConfigPro121.option('coupes-homme', 'coupe-homme', 'horsLigne'); await attendre(50);
    R.horsLigneCoche = [garde().familles[1].sous[0].horsLigne === true, c('coupes-homme', 'coupe-homme', 'horsLigne')];
    tcConfigPro121.option('soins', 'instantane', 'pasSeule'); await attendre(50);
    R.pasSeuleDecoche = [garde().familles[2].sous[0].pasSeule === undefined, c('soins', 'instantane', 'pasSeule')];
    tcConfigPro121.option('soins', 'instantane', 'pasSeule'); await attendre(50);
    // Créer sa prestation ; un nom vide.
    document.getElementById('cpNouvelleSous_coupes-homme').value = ''; tcConfigPro121.ajouterSous('coupes-homme'); R.erreurSous = _tcConfigProErreur;
    document.getElementById('cpNouvelleSous_coupes-homme').value = 'Coupe enfant'; tcConfigPro121.ajouterSous('coupes-homme'); await attendre(50);
    document.getElementById('cpNouvelleFamille').value = ''; tcConfigPro121.ajouterFamille(); R.erreurFamille = _tcConfigProErreur;
    _tcConfigProErreur = '';
    // La question au client.
    tcConfigPro121.ouvrirQuestion('coupes-femme', 'premiere-visite'); await attendre(50);
    R.question = (document.getElementById('cpQuestion') || {}).innerText || ''; R.questionExemple = (document.getElementById('cpQTexte') || {}).placeholder || '';
    tcConfigPro121.qAnnuler(); await attendre(50);
    R.e2b = texte();
    // Tout décoché : « Gardez au moins une prestation. »
    var sauve = JSON.stringify(garde());
    tcConfigProLire().familles.forEach(function (f) { f.gardee = false; }); tcConfigPro121.suivant(); R.erreurActe = _tcConfigProErreur;
    _tcConfigPro = JSON.parse(sauve); _tcConfigProErreur = ''; tcConfigProSauver();
    tcConfigPro121.suivant(); await attendre(100);
    // C. Étape 3 : la durée et le prix.
    R.e3 = texte(); debords.push(deborde());
    tcConfigPro121.prixType('coupes-femme', 'entretien', 'fixe'); await attendre(30);
    var champ = document.querySelector('#configProCorps input[aria-label="Prix"]'); champ.value = '45'; champ.dispatchEvent(new Event('change')); await attendre(30);
    tcConfigPro121.prixType('balayage', 'coupe-balayage', 'fourchette'); await attendre(30);
    tcConfigPro121.prixMontant('balayage', 'coupe-balayage', 'min', '120'); tcConfigPro121.prixMontant('balayage', 'coupe-balayage', 'max', '160');
    tcConfigPro121.prixType('coiffure', 'chignon-mariee', 'devis'); await attendre(30);
    tcConfigPro121.prixType('soins', 'masque-profond', 'fixe'); tcConfigPro121.prixMontant('soins', 'masque-profond', 'min', '0');
    tcConfigPro121.duree('balayage', 'balayage-patine', 270); await attendre(30);
    R.e3b = texte(); debords.push(deborde());
    var gg = garde();
    R.prix = { entretien: gg.familles[0].sous[2].prix, fourchette: gg.familles[4].sous[1].prix, devis: gg.familles[6].sous[2].prix, zero: gg.familles[2].sous[1].prix, sans: gg.familles[0].sous[0].prix === undefined, duree270: gg.familles[4].sous[2].duree };
    R.libelles = [tcCpPrix136({ type: 'fixe', min: 45 }), tcCpPrix136({ type: 'fourchette', min: 250, max: 280 }), tcCpPrix136({ type: 'fourchette', min: 45 }), tcCpPrix136({ type: 'devis' }), tcCpPrix136(null), tcCpPrix136({ type: 'fixe' }), tcCpDuree136(270), tcCpDuree136(45), tcCpDuree136(60)];
    R.lus = [tcCpLirePrix136('80 €'), tcCpLirePrix136('de 250 € à 280 €'), tcCpLirePrix136('à partir de 45 €'), tcCpLirePrix136('Sur devis'), tcCpLirePrix136(''), tcCpLirePrix136('12,50 €')];
    tcConfigPro121.suivant(); await attendre(100);
    // D. Étapes 4 et 5.
    R.e4 = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(100);
    R.e5 = texte(); debords.push(deborde());
    tcConfigPro121.suivant(); await attendre(150);
    // E. Étape 6 : la fiche du salon ; « Remplis à ma place » avec des prestations.
    R.e6 = texte(); debords.push(deborde());
    R.nomFiche = document.getElementById('cpFiche_nom').value;
    R.champs = Array.prototype.map.call(document.querySelectorAll('#configProCorps [id^=cpFiche_]'), function (x) { return x.id.replace('cpFiche_', ''); }).join(' ');
    var envoye = '';
    callAI = async function (msgs) { envoye = JSON.stringify(msgs); return 'Voici : {"nom":"Salon Lumière","adresse":"8 rue des Lilas, 75011 Paris","acces":"Métro Voltaire","tarifs":"Conventionné","paiement":"Carte bancaire, espèces","langues":"Français, anglais","prestations":[{"famille":"Coupes femme","nom":"Coupe d’entretien","minutes":60,"prix":"50 €"},{"famille":"Barbe","nom":"Taille de barbe","minutes":20,"prix":"15 €"},{"famille":"balayage","nom":"Coupe, balayage, couleur et patine","minutes":270,"prix":"de 250 € à 280 €"},{"famille":"Soins","nom":"","minutes":10,"prix":""}]}'; };
    tcConfigPro121.ouvrirRemplir(); await attendre(50);
    R.cadre = texte();
    document.getElementById('cpTexteFiche').value = 'Salon Lumière, 8 rue des Lilas 75011 Paris. Coupe d’entretien 1 h 50 €. Taille de barbe 20 min 15 €.';
    await tcConfigPro121.remplir(); await attendre(150);
    R.propose = (document.getElementById('cpPropose') || {}).innerText || '';
    R.consigneEnvoyee = /salon de coiffure/.test(envoye) && /prestations/.test(envoye) && !/professionnel de santé/.test(envoye);
    R.avantValider = { nom: (garde().fiche || {}).nom || '', barbe: garde().familles.some(function (f) { return f.nom === 'Barbe'; }) };
    Array.prototype.filter.call(document.querySelectorAll('#configProCorps button'), function (b) { return /Valider ces réponses/.test(b.innerText); })[0].click(); await attendre(150);
    R.valide = texte(); debords.push(deborde());
    var g2 = garde();
    var fam = function (n) { return g2.familles.filter(function (f) { return (f.nom || tcConfigProNom(f, null).texte) === n; })[0]; };
    R.apres = { nom: g2.fiche.nom, tarifs: g2.fiche.tarifs || '', entretien: g2.familles[0].sous[2].prix, nbEntretien: g2.familles[0].sous.length,
      barbe: fam('Barbe') ? fam('Barbe').sous.map(function (x) { return x.nom + '|' + x.duree + '|' + JSON.stringify(x.prix); }) : null,
      balayage: g2.familles[4].sous.map(function (x) { return (x.nom || x.id) + '|' + x.duree; }).join(' ; ') };
    tcConfigPro121.suivant(); await attendre(150);
    // F. Le récapitulatif.
    R.recap = texte(); debords.push(deborde());
    R.debords = debords;
    // G. Changer de métier : les réponses proposées changent, celles écrites restent.
    tcConfigPro121.aller(1); await attendre(50);
    tcConfigPro121.choisirMetier('chirurgien-dentiste'); await attendre(50);
    var g3 = garde();
    R.versDentiste = { metier: g3.metier, familles: g3.familles.length, fiche: g3.fiche.metier, adresse: g3.fiche.adresse, presentation: g3.fiche.presentation, nom: g3.fiche.nom };
    tcConfigPro121.choisirMetier('coiffeur'); await attendre(50);
    R.versCoiffeur = { metier: garde().metier, fiche: garde().fiche.metier, presentation: garde().fiche.presentation };
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); tcConfigPro121.choisirMetier('chirurgien-dentiste'); tcConfigProFiche(tcConfigProLire()); tcConfigPro121.choisirMetier('coiffeur');
    R.drEfface = tcConfigProLire().fiche.nom;
    R.appels = appels;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-136-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 16);
if (S && S.dentiste && process.env.EMPREINTES) { console.log(JSON.stringify(Object.fromEntries(Object.entries(S.dentiste).map(([k, v]) => [k, h(v)])), null, 1)); process.exit(0); }
if (!S) verifie('la page a rejoué le parcours', false, (r.stdout || '').slice(-300));
else if (S.erreur) verifie('aucune erreur', false, S.erreur + ' ' + JSON.stringify(S.metiers || ''));
else {
  const sansActe = (t) => !/\bactes?\b/i.test(t) && !/patient/i.test(t);
  verifie('case éteinte (compte ordinaire) : ni entrée de menu, ni page', S.menuEteint === false && S.pageEteinte === 'calendar', JSON.stringify([S.menuEteint, S.pageEteinte]));
  // Mission 137 : d'autres métiers s'ajoutent (« Avocat ») ; la liste reste rangée par ordre alphabétique.
  verifie('étape 1 : « Chirurgien-dentiste » et « Coiffeur », par ordre alphabétique', S.metiers.indexOf('Chirurgien-dentiste') > -1 && S.metiers.indexOf('Coiffeur') > -1 && JSON.stringify(S.metiers) === JSON.stringify(S.metiers.slice().sort((a, b) => a.localeCompare(b, 'fr'))), JSON.stringify(S.metiers));
  verifie('étape 2 : « Quelles prestations faites-vous ? », les 7 familles et leurs 23 prestations', /Quelles prestations faites-vous \?/.test(S.e2) && S.familles === 'coupes-femme:4 coupes-homme:2 soins:4 coloration:3 balayage:3 patine-decoloration:3 coiffure:4'
    && ['Coupes femme', 'Coupe d’entretien', 'Coupes homme', 'Soins', 'Masque détox', 'Coloration', 'Coupe et coloration racines', 'Balayage', 'Balayage et patine', 'Patine et décoloration', 'Coiffure', 'Essai chignon de mariée'].every((x) => S.e2.indexOf(x) > -1), S.familles);
  verifie('étape 2 : on dit « prestation » et « client », jamais « acte » ni « patient » ; « Créer ma propre famille » et « Créer ma propre prestation »', sansActe(S.e2b) && /Créer ma propre famille/.test(S.e2b) && /Créer ma propre prestation/.test(S.e2b) && /Coupe enfant/.test(S.e2b), S.e2b.slice(0, 300));
  verifie('réglages proposés : les soins « seulement avec une autre prestation », le chignon de mariée « pas de rendez-vous en ligne »', S.reglagesProposes === 'pasSeule:instantane pasSeule:masque-profond pasSeule:masque-detox pasSeule:regenerant horsLigne:chignon-mariee' && S.cases.soin === 'true' && S.cases.chignon === 'true' && S.cases.homme === 'false', JSON.stringify([S.reglagesProposes, S.cases]));
  verifie('la consigne en tête de famille, enregistrée à chaque lettre', S.consigne === 'Venez avec les cheveux fraîchement lavés.', S.consigne);
  verifie('les deux réglages se cochent et se décochent (enregistrés)', S.horsLigneCoche[0] === true && S.horsLigneCoche[1] === 'true' && S.pasSeuleDecoche[0] === true && S.pasSeuleDecoche[1] === 'false', JSON.stringify([S.horsLigneCoche, S.pasSeuleDecoche]));
  verifie('les messages : « Écrivez le nom de votre prestation. », « … famille de prestations. », « Gardez au moins une prestation. »', S.erreurSous === 'Écrivez le nom de votre prestation.' && S.erreurFamille === 'Écrivez le nom de votre famille de prestations.' && S.erreurActe === 'Gardez au moins une prestation.', JSON.stringify([S.erreurSous, S.erreurFamille, S.erreurActe]));
  verifie('la question au client (« Cheveux courts, mi-longs ou longs ? »)', /Question au client/.test(S.question) && /cette prestation/.test(S.question) && S.questionExemple === 'Par exemple : Cheveux courts, mi-longs ou longs ?', S.question.slice(0, 200));
  verifie('étape 3 : « Combien de temps, et à quel prix ? », le prix facultatif, les durées en heures (« 2 h 30 »)', /Combien de temps, et à quel prix \?/.test(S.e3) && /Le prix est facultatif/.test(S.e3) && /2 h 30/.test(S.e3) && /Pas de prix affiché/.test(S.e3) && sansActe(S.e3), S.e3.slice(0, 300));
  verifie('les prix enregistrés : un prix (45), une fourchette (120 à 160), « Sur devis » ; 0 € n’est pas un prix ; sans prix, rien', JSON.stringify(S.prix.entretien) === '{"type":"fixe","min":45}' && JSON.stringify(S.prix.fourchette) === '{"type":"fourchette","min":120,"max":160}' && JSON.stringify(S.prix.devis) === '{"type":"devis"}' && JSON.stringify(S.prix.zero) === '{"type":"fixe"}' && S.prix.sans, JSON.stringify(S.prix));
  verifie('une prestation de 4 h 30 (270 min) pour le coiffeur', S.prix.duree270 === 270 && /4 h 30/.test(S.e3b), S.prix.duree270);
  verifie('les prix écrits : « 45 € », « de 250 € à 280 € », « à partir de 45 € », « Sur devis » ; les durées « 4 h 30 », « 45 min », « 1 h »', JSON.stringify(S.libelles) === JSON.stringify(['45 €', 'de 250 € à 280 €', 'à partir de 45 €', 'Sur devis', '', '', '4 h 30', '45 min', '1 h']), JSON.stringify(S.libelles));
  verifie('un prix lu sur une fiche : « 80 € », « de 250 € à 280 € », « à partir de 45 € », « Sur devis », rien, « 12,50 € »', JSON.stringify(S.lus) === JSON.stringify([{ type: 'fixe', min: 80 }, { type: 'fourchette', min: 250, max: 280 }, { type: 'fourchette', min: 45 }, { type: 'devis' }, null, { type: 'fixe', min: 12.5 }]), JSON.stringify(S.lus));
  verifie('étape 4 : les jours, privés (comme le dentiste)', /Quels jours travaillez-vous \?/.test(S.e4) && /restent privés/.test(S.e4), S.e4.slice(0, 200));
  verifie('étape 5 : une seule durée de rendez-vous, « quelle que soit la prestation » ; la prestation longue et « Pas de rendez-vous en ligne »', /quelle que soit la prestation/.test(S.e5) && /Une prestation longue, comme un balayage, ne prend qu’un rendez-vous\./.test(S.e5) && /« Pas de rendez-vous en ligne » \(étape 2\)/.test(S.e5) && sansActe(S.e5), S.e5.slice(0, 400));
  verifie('étape 6 : la fiche du salon (nom du salon, accès, vos clients) ; ni tarifs remboursés, ni carte Vitale, ni « à apporter »', /verront vos clients/.test(S.e6) && /Quel est le nom du salon \?/.test(S.e6) && /Comment vient-on au salon \?/.test(S.e6) && /Les horaires d’ouverture du salon/.test(S.e6) && /La photo du salon/.test(S.e6) && !/Vitale|tiers payant|Conventionn|apporter/i.test(S.e6) && S.champs === 'nom metier adresse acces presentation consignes paiement horaires langues' && sansActe(S.e6), S.champs + ' ' + S.e6.slice(0, 300));
  verifie('étape 6 : pas de « Dr » devant le nom ; le métier « Coiffeur »', S.nomFiche === '', S.nomFiche);
  verifie('« Remplis à ma place » : la consigne parle d’un salon de coiffure et de ses prestations ; le cadre le dit', S.consigneEnvoyee && /il propose aussi leurs familles, leurs durées et leurs prix/.test(S.cadre), JSON.stringify([S.consigneEnvoyee]));
  verifie('« Remplis à ma place » : les prestations lues attendent (« Vos prestations (3) », durée et prix), rien n’est enregistré avant « Valider »', /Vos prestations \(3\)/.test(S.propose) && /Barbe : Taille de barbe · 20 min · 15 €/.test(S.propose) && /4 h 30 · de 250 € à 280 €/.test(S.propose) && !/Conventionn/.test(S.propose) && S.avantValider.nom !== 'Salon Lumière' && !S.avantValider.barbe, S.propose.slice(0, 500));
  verifie('« Valider ces réponses » : la fiche remplie ; la prestation connue mise à jour (50 €), une famille neuve « Barbe », « balayage » rejoint « Balayage »', S.apres.nom === 'Salon Lumière' && S.apres.tarifs === '' && JSON.stringify(S.apres.entretien) === '{"type":"fixe","min":50}' && S.apres.nbEntretien === 4
    && JSON.stringify(S.apres.barbe) === JSON.stringify(['Taille de barbe|20|{"type":"fixe","min":15}']) && /Coupe, balayage, couleur et patine\|270/.test(S.apres.balayage) && /✅ 3 prestations, avec leur durée et leur prix\./.test(S.valide), JSON.stringify(S.apres));
  verifie('le récapitulatif : métier, prestations avec durée et prix, réglages, consigne', /Coiffeur/.test(S.recap) && /Vos prestations, leur durée et leur prix/.test(S.recap) && /Coupe d’entretien · 1 h · 50 €/.test(S.recap) && /Coupe et balayage · 3 h · de 120 € à 160 €/.test(S.recap)
    && /Chignon de mariée · 1 h 30 · Sur devis\s*📞 pas de rendez-vous en ligne/.test(S.recap) && /Soin instantané · 10 min\s*➕ seulement avec une autre prestation/.test(S.recap) && /💬 Venez avec les cheveux fraîchement lavés\./.test(S.recap) && /Taille de barbe · 20 min · 15 €/.test(S.recap) && sansActe(S.recap), S.recap.slice(0, 900));
  verifie('changer de métier : les familles du dentiste ; les réponses proposées changent, celles écrites restent', S.versDentiste.metier === 'chirurgien-dentiste' && S.versDentiste.familles === 5 && S.versDentiste.fiche === 'Chirurgien-dentiste' && S.versDentiste.adresse === '8 rue des Lilas, 75011 Paris' && /chirurgie dentaire/.test(S.versDentiste.presentation) && S.versDentiste.nom === 'Salon Lumière'
    && S.versCoiffeur.metier === 'coiffeur' && S.versCoiffeur.fiche === 'Coiffeur' && /Bienvenue au salon/.test(S.versCoiffeur.presentation) && S.drEfface === '', JSON.stringify([S.versDentiste, S.versCoiffeur, S.drEfface]));
  verifie('la page ne déborde pas sur le côté (390 px), à chaque étape', S.debords.every((x) => x <= 0), JSON.stringify(S.debords));
  verifie('aucun appel réseau', S.appels === 0, S.appels);
  const D = S.dentiste || {};
  verifie('le dentiste : 270 min refusé, ses messages d’avant (« … famille d’actes. », « … sous-famille. », « Gardez au moins un acte. »)', D.duree270 === '40' && D.erreurFamille === 'Écrivez le nom de votre famille d’actes.' && D.erreurSous === 'Écrivez le nom de votre sous-famille.' && D.erreurActe === 'Gardez au moins un acte.', JSON.stringify([D.duree270, D.erreurFamille, D.erreurSous, D.erreurActe]));
  const diff = Object.keys(EMPREINTES).filter((k) => h(D[k]) !== EMPREINTES[k]);
  verifie('le dentiste déjà configuré ne bouge pas : ses étapes 2 à 7, l’éditeur de question, « Remplis à ma place », la proposition, au caractère près', Object.keys(EMPREINTES).length === 11 && diff.length === 0, diff.join(', '));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
