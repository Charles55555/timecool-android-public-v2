// Mission 147 (Charles, 20/11, lot 1) : « Configuration professionnelle », étape 1 « Quel est votre métier ? » : tous les métiers à
// rendez-vous de l'ébauche du 18/11, rangés par catégories dépliables (fermées au départ, celle du métier choisi ouverte), par ordre
// alphabétique dans chaque catégorie, et une case pour chercher. Lot 1 : la santé et la beauté (et l'avocat déjà codé).
// Un métier pas encore codé suit le parcours du coiffeur, en version générique : familles et prestations de l'ébauche (cocher,
// renommer, retirer, créer), une seule durée pour tout, un prix facultatif, seul ou à plusieurs, la fiche avec « Remplis à ma place »,
// avec les mots de sa catégorie (santé : patient, acte, motif de consultation ; beauté : client, prestation). Le dentiste, le
// coiffeur et l'avocat gardent leur parcours (leurs empreintes, étapes 2 à 7 : verif-titres-etapes143 et les suites 136, 137, 141).
// « Voir tous les métiers » n'enregistre rien ; chaque métier garde sa configuration. Case éteinte : rien. Aucun appel réseau.
// Usage : node verif-config-metiers147.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }

// Les métiers attendus (ébauche du 18/11), par catégorie.
const ATTENDUS = {
  sante: ['Allergologue', 'Audioprothésiste', 'Cardiologue', 'Centre d’imagerie', 'Chirurgien', 'Chirurgien-dentiste', 'Dermatologue', 'Diététicien', 'Endocrinologue',
    'Ergothérapeute', 'Gastro-entérologue', 'Gynécologue', 'Infirmier', 'Laboratoire d’analyses', 'Masseur-kinésithérapeute', 'Médecin du sport', 'Médecin généraliste',
    'Neurologue', 'Ophtalmologue', 'Opticien', 'ORL', 'Orthophoniste', 'Orthoptiste', 'Ostéopathe', 'Pédiatre', 'Pédicure-podologue', 'Pneumologue', 'Psychiatre',
    'Psychologue', 'Psychomotricien', 'Radiologue', 'Rhumatologue', 'Sage-femme', 'Urologue'],
  beaute: ['Barbier', 'Centre de bronzage', 'Centre d’épilation au laser', 'Coach de vie', 'Coiffeur', 'Esthétique des sourcils et maquillage permanent', 'Hypnothérapeute',
    'Institut de beauté', 'Manucure', 'Massothérapeute', 'Naturopathe', 'Perceur', 'Réflexologue', 'Sophrologue', 'Spa', 'Tatoueur'],
  // Lot 2 : les huit autres catégories (une ligne de l'ébauche à plusieurs métiers en donne un par nom).
  droit: ['Avocat', 'Commissaire de justice', 'Conseiller en gestion de patrimoine', 'Courtier en assurance', 'Courtier en crédit', 'Expert-comptable', 'Notaire'],
  banque: ['Agent d’assurance', 'Agent immobilier', 'Conseiller bancaire', 'Diagnostiqueur immobilier'],
  auto: ['Auto-école', 'Centre de contrôle technique', 'Garagiste', 'Lavage et préparation'],
  artisans: ['Carreleur', 'Chauffagiste', 'Électricien', 'Jardinier', 'Maçon', 'Ménage et aide à domicile', 'Menuisier', 'Paysagiste', 'Peintre', 'Plombier',
    'Réparateur d’électroménager', 'Réparateur d’ordinateur', 'Réparateur de téléphone', 'Serrurier'],
  loisirs: ['Coach sportif', 'Moniteur d’équitation', 'Moniteur de ski', 'Moniteur de tennis', 'Moniteur de voile', 'Photographe', 'Professeur de musique', 'Professeur de pilates',
    'Professeur de yoga', 'Professeur particulier'],
  commerce: ['Architecte', 'Bijoutier', 'Boutique de robes de mariée', 'Commercial', 'Consultant', 'Décorateur', 'Formateur', 'Recruteur', 'Tailleur'],
  animaux: ['Éducateur canin', 'Garde d’animaux', 'Toiletteur', 'Vétérinaire'],
  administration: ['Association', 'Mairie']
};
const CATEGORIES = [['sante', 'Santé'], ['beaute', 'Beauté et bien-être'], ['droit', 'Droit et chiffre'], ['banque', 'Banque, assurance, immobilier'], ['auto', 'Automobile'],
  ['artisans', 'Artisans et dépannage à domicile'], ['loisirs', 'Enseignement, sport, loisirs'], ['commerce', 'Commerce et conseil'], ['animaux', 'Animaux'], ['administration', 'Administration et associations']];
const toutes = (ouverte) => CATEGORIES.map((c) => c[0] + ':' + (c[0] === ouverte));

/** Dans la page : le parcours, de bout en bout. */
async function parcours() {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const R = {};
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    let appels = 0; window.fetch = function () { appels++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow();
    const corps = () => document.getElementById('configProCorps');
    const texte = () => corps().innerText;
    const brut = () => localStorage.getItem('tc_config_pro');
    const garde = () => JSON.parse(brut() || 'null') || {};
    const deborde = () => { const c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    const lignes = () => Array.prototype.filter.call(corps().querySelectorAll('[role=button]'), (b) => /choisirMetier/.test(b.getAttribute('onclick') || ''));
    const visibles = () => lignes().filter((b) => b.offsetParent).map((b) => b.innerText.trim());
    const categories = () => Array.prototype.map.call(corps().querySelectorAll('.cp-categorie147'), (c) => { const b = c.querySelector('button'); return { id: c.getAttribute('data-categorie'), titre: b.innerText.replace(/\s+/g, ' ').trim(), ouverte: b.getAttribute('aria-expanded') === 'true',
      metiers: Array.prototype.filter.call(c.querySelectorAll('[role=button]'), (x) => /choisirMetier/.test(x.getAttribute('onclick') || '')).map((x) => x.textContent.trim()) }; });
    const entete = (id) => corps().querySelector('.cp-categorie147[data-categorie="' + id + '"] button');
    const ligne = (nom) => { const l = lignes().filter((b) => b.textContent.trim() === nom)[0]; if (!l) throw new Error('pas de métier ' + nom); return l; };
    const chercher = async (v) => { const i = document.getElementById('cpCherche147'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); await attendre(30); return { visibles: visibles(), focus: document.activeElement && document.activeElement.id, cats: categories().map((c) => c.titre), texte: texte() }; };
    const debords = [];
    // A. Case éteinte (compte ordinaire) : ni entrée de menu, ni page.
    renderMenu(); R.menuEteint = /Configuration professionnelle/.test(document.getElementById('sideMenu').innerText);
    navigate('configpro'); await attendre(200); R.pageEteinte = currentPage;
    // B. Un compte neuf : l'étape 1, catégories fermées.
    FEATURES.CONFIG_PRO = true; localStorage.removeItem('tc_config_pro'); navigate('configpro'); await attendre(300);
    R.neuf = { texte: texte(), cats: categories(), visibles: visibles(), cherche: !!document.getElementById('cpCherche147'), place: (document.getElementById('cpCherche147') || {}).placeholder, garde: brut() };
    debords.push(deborde());
    R.lesMetiers = TC_PRO_METIERS.filter((m) => m.generique147).map((m) => ({ id: m.id, nom: m.nom, v: m.generique147, c: m.categorie147, f: m.familles.map((f) => f.id + ':' + f.nom + ':' + f.sous.map((x) => x[0] + '=' + x[1]).join(';')) }));
    R.anciens = ['chirurgien-dentiste', 'coiffeur', 'avocat'].map((id) => { const m = tcConfigProMetier(id); return [id, !!m, m && m.generique147 === undefined, m && m.categorie147 === undefined]; });
    // C. Ouvrir, fermer.
    entete('sante').click(); await attendre(30);
    R.ouvert = { cats: categories().map((c) => c.id + ':' + c.ouverte), visibles: visibles() }; debords.push(deborde());
    entete('sante').click(); await attendre(30);
    R.referme = { cats: categories().map((c) => c.id + ':' + c.ouverte), visibles: visibles().length };
    // D. Chercher.
    R.kine = await chercher('kiné'); R.derm = await chercher('DERMATO'); R.sante = await chercher('santé'); R.coiffure = await chercher('coiffure');
    R.deux = await chercher('médecin sport'); R.rien = await chercher('zzz');
    R.ma = await chercher('ma'); entete('sante').click(); await attendre(30); R.maFerme = { cats: categories().map((c) => c.id + ':' + c.ouverte), focus: document.activeElement && document.activeElement.id };
    R.vide = await chercher(''); R.videCats = categories().map((c) => c.id + ':' + c.ouverte);
    // E. Un métier de santé : l'ostéopathe, choisi après une recherche.
    await chercher('osteo'); ligne('Ostéopathe').click(); await attendre(50);
    R.osteo1 = { garde: garde(), texte: texte(), cats: categories().map((c) => c.id + ':' + c.ouverte), coche: lignes().filter((b) => /border-color:\s*var\(--g-blue\)/.test(b.getAttribute('style') || '')).map((b) => b.textContent.trim()), cherche: document.getElementById('cpCherche147').value };
    await chercher(''); R.osteo1b = { cats: categories().map((c) => c.id + ':' + c.ouverte), visibleOsteo: visibles().indexOf('Ostéopathe') > -1 };
    tcConfigPro121.equipeMode('plusieurs'); await attendre(30);
    R.osteoEquipe = texte();
    tcConfigPro121.suivant(); await attendre(30); R.osteoErreurEquipe = _tcConfigProErreur;
    document.getElementById('cpNouveauCoiffeur').value = ''; tcConfigPro121.ajouterCoiffeur(); R.osteoErreurPrenom = _tcConfigProErreur;
    document.getElementById('cpNouveauCoiffeur').value = 'Léa'; tcConfigPro121.ajouterCoiffeur(); document.getElementById('cpNouveauCoiffeur').value = 'Tom'; tcConfigPro121.ajouterCoiffeur();
    tcConfigPro121.suivant(); await attendre(30);
    R.osteo2 = texte(); debords.push(deborde());
    document.getElementById('cpNouvelleFamille').value = ''; tcConfigPro121.ajouterFamille(); R.osteoErreurFamille = _tcConfigProErreur;
    document.getElementById('cpNouvelleFamille').value = 'Bilan'; tcConfigPro121.ajouterFamille();
    const fb = garde().familles.filter((f) => f.nom === 'Bilan')[0];
    document.getElementById('cpNouvelleSous_' + fb.id).value = 'Bilan postural'; tcConfigPro121.ajouterSous(fb.id);
    tcConfigPro121.renommer('consultation', 'adulte'); document.getElementById('cpNom').value = 'Adulte (plus de 16 ans)'; tcConfigPro121.validerNom();
    tcConfigPro121.basculer('consultation', 'nourrisson');
    const cTom = garde().equipe.coiffeurs.filter((c) => c.prenom === 'Tom')[0];
    tcConfigPro121.quiLaFait('consultation', 'enfant', cTom.id);
    tcConfigPro121.option('consultation', 'femme-enceinte', 'horsLigne');
    R.osteo2b = texte();
    tcConfigPro121.suivant(); await attendre(30);
    R.osteo3 = { texte: texte(), prix: corps().querySelectorAll('.cp-prix147').length, durees: corps().querySelectorAll('select[aria-label="Durée"]').length, actes: tcConfigProActes(tcConfigProLire()).length };
    const sp = garde().familles.filter((f) => f.nom === 'Bilan')[0].sous[0];
    tcConfigPro121.prixType('consultation', 'adulte', 'fixe'); tcConfigPro121.prixMontant('consultation', 'adulte', 'min', '55');
    tcConfigPro121.prixType(fb.id, sp.id, 'fourchette'); tcConfigPro121.prixMontant(fb.id, sp.id, 'min', '40'); tcConfigPro121.prixMontant(fb.id, sp.id, 'max', '60');
    R.osteo3b = texte();
    tcConfigPro121.suivant(); await attendre(30); R.osteo4 = texte();
    tcConfigPro121.suivant(); await attendre(30);   // mission 148 : « Vos règles de réservation », avec ses valeurs de départ
    tcConfigPro121.suivant(); await attendre(30); R.osteo5 = { texte: texte(), note: !!corps().querySelector('.cp-note136') };
    tcConfigPro121.suivant(); await attendre(30); R.osteo6 = texte(); R.osteoFiche = JSON.parse(JSON.stringify(tcConfigProLire().fiche || {}));
    // « Remplis à ma place » : le modèle est remplacé ici ; rien ne part.
    callAI = async function (m) { window.__consigne = m[0].content; return JSON.stringify({ nom: 'Marie Martin', adresse: '1 rue des Lilas, 75011 Paris', tarifs: 'Non conventionné', prestations: [{ famille: 'Consultation', nom: 'Adulte (plus de 16 ans)', minutes: 45, prix: '60 €' }, { famille: '', nom: 'Séance pour sportif de haut niveau', minutes: null, prix: '' }] }); };
    _tcConfigProRemplir = true; tcRendreConfigPro121(); document.getElementById('cpTexteFiche').value = 'Marie Martin, ostéopathe, 1 rue des Lilas, Paris. Adulte 60 €.';
    await tcConfigPro121.remplir(); await attendre(30);
    R.propose = { texte: texte(), consigne: window.__consigne || '' };
    tcConfigPro121.validerPropose(); await attendre(30);
    R.rempli = { texte: texte(), familles: garde().familles.map((f) => (f.nom || f.id) + ':' + f.sous.filter((x) => x.gardee).map((x) => (x.nom || x.id) + (x.prix ? '=' + JSON.stringify(x.prix) : '')).join(';')), nom: garde().fiche.nom };
    tcConfigPro121.suivant(); await attendre(30);
    R.osteo7 = { texte: texte(), termine: garde().termine, metier: garde().metier };
    debords.push(deborde());
    // F. Un métier de beauté : la manucure (configuration neuve).
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(30);
    R.manu0 = categories().map((c) => c.id + ':' + c.ouverte);
    entete('beaute').click(); await attendre(30); ligne('Manucure').click(); await attendre(30);
    tcConfigPro121.equipeMode('plusieurs'); await attendre(30); R.manu1 = texte();
    document.getElementById('cpNouveauCoiffeur').value = 'Inès'; tcConfigPro121.ajouterCoiffeur(); document.getElementById('cpNouveauCoiffeur').value = 'Sam'; tcConfigPro121.ajouterCoiffeur();
    tcConfigPro121.aller(2); await attendre(30); R.manu2 = texte();
    const cSam = garde().equipe.coiffeurs.filter((c) => c.prenom === 'Sam')[0];
    tcConfigPro121.quiLaFait('ongles', 'pose-de-gel', cSam.id); tcConfigPro121.option('mains', 'depose', 'pasSeule');
    tcConfigPro121.aller(4); await attendre(30); R.manu4 = texte();
    tcConfigPro121.aller(5); await attendre(30); R.manu5 = texte();
    tcConfigPro121.aller(6); await attendre(30); R.manu6 = { texte: texte(), fiche: JSON.parse(JSON.stringify(tcConfigProLire().fiche || {})) };
    tcConfigPro121.aller(7); await attendre(30); R.manu7 = texte();
    tcConfigPro121.equipeMode('seul'); await attendre(30);
    // G. Chaque métier garde sa configuration ; « Voir tous les métiers » n'enregistre rien.
    tcConfigPro121.aller(1); ligne('Ostéopathe').click(); await attendre(30); tcConfigPro121.aller(2); tcConfigPro121.basculer('urgence');
    tcConfigPro121.aller(1); ligne('Manucure').click(); await attendre(30);
    const gm = garde(); R.garde = { metier: gm.metier, sam: (((gm.equipe || {}).coiffeurs || []).filter((c) => c.prenom === 'Sam')[0] || {}).sans, osteo: !!(gm.metiers139 && gm.metiers139.osteopathe) };
    gm.termine = true; localStorage.setItem('tc_config_pro', JSON.stringify(gm)); const AVANT = brut();
    _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(30);
    document.getElementById('cpTousMetiers139').click(); await attendre(30);
    R.tous = { cats: categories().map((c) => c.id + ':' + c.ouverte), coche: lignes().filter((b) => /border-color:\s*var\(--g-blue\)/.test(b.getAttribute('style') || '')).map((b) => b.textContent.trim()) };
    entete('sante').click(); await attendre(20); ligne('Rhumatologue').click(); await attendre(30); tcConfigPro121.aller(2); await attendre(30);
    R.rhumato = { texte: texte(), inchange: brut() === AVANT };
    document.getElementById('cpRetourConfig139').click(); await attendre(30);
    R.retour = { inchange: brut() === AVANT, recap: /^Votre configuration/.test(texte()), metier: tcConfigProLire().metier };
    // H. Le coiffeur, le dentiste, l'avocat : leurs mots d'avant.
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(30);
    tcConfigPro121.choisirMetier('coiffeur'); tcConfigPro121.equipeMode('plusieurs'); R.coiffeur1 = texte();
    tcConfigPro121.suivant(); R.coiffeurErreur = _tcConfigProErreur;
    document.getElementById('cpNouveauCoiffeur').value = 'Marie'; tcConfigPro121.ajouterCoiffeur(); tcConfigPro121.aller(2); R.coiffeur2 = texte();
    tcConfigPro121.aller(3); R.coiffeur3 = texte(); tcConfigPro121.aller(4); R.coiffeur4 = texte(); tcConfigPro121.aller(5); R.coiffeur5 = texte();
    tcConfigPro121.choisirMetier('chirurgien-dentiste'); tcConfigPro121.aller(3); R.dentiste3 = texte();
    tcConfigPro121.choisirMetier('avocat'); tcConfigPro121.aller(3); R.avocat3 = texte();
    // I. Lot 2 : un métier de chaque nouveau vocabulaire (et deux métiers aux mots d'une autre catégorie), de l'étape 1 à la fiche.
    const essayer = async (id) => {
      localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
      tcConfigPro121.choisirMetier(id); tcConfigPro121.equipeMode('plusieurs'); await attendre(20);
      const o = { e1: texte().split('Vous travaillez seul, ou à plusieurs ?')[1] || '' };
      for (const n of [2, 3, 4, 5, 6, 7]) { tcConfigPro121.aller(n); await attendre(20); o['e' + n] = texte(); }
      o.fiche = JSON.parse(JSON.stringify(tcConfigProLire().fiche || {}));
      o.familles = tcConfigProLire().familles.map((f) => (f.nom || f.id) + ':' + f.sous.map((x) => x.id).join(','));
      o.consigne = tcCpConsigneRemplir136(tcConfigProLire());
      debords.push(deborde());
      return o;
    };
    R.lot2 = {};
    for (const id of ['plombier', 'notaire', 'mairie', 'veterinaire', 'auto-ecole', 'garagiste']) R.lot2[id] = await essayer(id);
    // Examen du lot 2 (chef) : la mairie n'a pas d'étape des prix ; le compteur, « Suivant » et « ← Retour » suivent.
    const compteur = () => { const m = /tape (\d) sur (\d)/i.exec(texte()); return m ? m[1] + '/' + m[2] : ''; };
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
    tcConfigPro121.choisirMetier('mairie'); await attendre(20);
    const nav = { e1: compteur() };
    tcConfigPro121.suivant(); await attendre(20); nav.e2 = [compteur(), _tcConfigProEtape];
    tcConfigPro121.suivant(); await attendre(20); nav.e3 = [compteur(), _tcConfigProEtape, /Quels jours travaillez-vous \?/.test(texte())];
    tcConfigPro121.retour(); await attendre(20); nav.retour = [compteur(), _tcConfigProEtape];
    tcConfigPro121.suivant(); tcConfigPro121.suivant(); await attendre(20); nav.e4 = [compteur(), _tcConfigProEtape, /Vos règles de réservation/.test(texte())];   // mission 148
    tcConfigPro121.suivant(); await attendre(20); nav.e5 = [compteur(), _tcConfigProEtape];
    tcConfigPro121.suivant(); await attendre(20); nav.e6 = [compteur(), _tcConfigProEtape];
    tcConfigPro121.suivant(); await attendre(20); nav.recap = texte(); nav.fin = _tcConfigProEtape;
    tcConfigPro121.aller(3); await attendre(20); nav.aller3 = [compteur(), _tcConfigProEtape];
    R.nav = nav;
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
    tcConfigPro121.choisirMetier('notaire'); tcConfigPro121.suivant(); tcConfigPro121.suivant(); await attendre(20);
    R.navNotaire = [compteur(), _tcConfigProEtape, /Quels prix affichez-vous \?/.test(texte())];
    // Examen du correctif du lot 2 : chaque renvoi « (étape N) » désigne l'étape affichée « Étape N sur … » de ce sujet (à plusieurs,
    // de l'étape 1 au récapitulatif, et le message de « Remplis à ma place »).
    const pagesDe = async (id) => {
      localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
      tcConfigPro121.choisirMetier(id); tcConfigPro121.equipeMode('plusieurs'); await attendre(20);
      document.getElementById('cpNouveauCoiffeur').value = 'Léa'; tcConfigPro121.ajouterCoiffeur(); await attendre(20);
      const pages = [];
      for (const n of [1, 2, 3, 4, 5, 6, 7]) { tcConfigPro121.aller(n); await attendre(20); pages.push({ interne: _tcConfigProEtape, compteur: compteur(), texte: texte() }); }
      _tcConfigProPrestations136 = 2; tcConfigPro121.aller(6); await attendre(20); pages.push({ interne: 6, compteur: compteur(), texte: texte() }); _tcConfigProPrestations136 = 0;
      return pages;
    };
    R.renvois = { mairie: await pagesDe('mairie'), notaire: await pagesDe('notaire'), coiffeur: await pagesDe('coiffeur') };
    localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
    entete('artisans').click(); await attendre(20); R.artisans = visibles();
    R.appels = appels; R.debords = debords;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}

const jouer = (largeur) => {
  const js = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + parcours.toString() + ')(); }, 1200); });</script>';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-147-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + largeur + ',900', '--virtual-time-budget=40000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 27 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  try { return m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { erreur: (r.stdout || '').slice(-300) }; } catch (e) { return { erreur: String(e) }; }
};

const J = (x) => JSON.stringify(x);
const S = jouer(390), P = jouer(1280);
console.log('-- Dans la page (Chrome), 390 px et 1280 px --');
if (S.erreur || P.erreur) verifie('la page a rejoué le parcours', false, S.erreur || P.erreur);
else {
  verifie('case éteinte (compte ordinaire) : ni entrée de menu, ni page', S.menuEteint === false && S.pageEteinte !== 'configpro', J([S.menuEteint, S.pageEteinte]));
  // 1. L'étape 1.
  const N = S.neuf;
  verifie('étape 1 : « Quel est votre métier ? », « Tapez votre métier, ou touchez sa catégorie. », la case « Cherchez votre métier »', /Quel est votre métier \?/.test(N.texte) && /Tapez votre métier, ou touchez sa catégorie\./.test(N.texte) && N.cherche && /Cherchez votre métier/.test(N.place || ''), N.place);
  const titresAttendus = CATEGORIES.map((c) => { const n = ATTENDUS[c[0]].length; return c[0] + ' ' + c[1] + ' ' + n + ' métier' + (n > 1 ? 's' : '') + ' ▸'; });
  verifie('les dix catégories, dans l’ordre demandé, avec leur nombre de métiers (Santé 34, Beauté et bien-être 16, Droit et chiffre 7, …, Administration et associations 2)', J(N.cats.map((c) => c.id + ' ' + c.titre)) === J(titresAttendus), J(N.cats.map((c) => c.titre)));
  verifie('compte neuf : toutes fermées, aucun métier visible ; rien d’écrit', N.cats.every((c) => !c.ouverte) && N.visibles.length === 0 && N.garde === null, J([N.visibles, N.garde]));
  const ordre = (l) => J(l) === J(l.slice().sort((a, b) => a.localeCompare(b, 'fr')));
  verifie('chaque catégorie : exactement les métiers de l’ébauche, par ordre alphabétique (les dix catégories)',
    N.cats.length === 10 && N.cats.every((c) => ordre(c.metiers) && J(c.metiers) === J(ATTENDUS[c.id].slice().sort((a, b) => a.localeCompare(b, 'fr')))), J(N.cats.map((c) => [c.id, c.metiers.filter((x) => ATTENDUS[c.id].indexOf(x) < 0), ATTENDUS[c.id].filter((x) => c.metiers.indexOf(x) < 0)])));
  const L = S.lesMetiers;
  const parId = {}; L.forEach((m) => { parId[m.id] = m; });
  const parVoc = {}; L.forEach((m) => { parVoc[m.v] = (parVoc[m.v] || 0) + 1; });
  verifie('101 métiers génériques (santé 33, beauté 15, mission 14, intervention 17, prestation 20, démarche 2), identifiants uniques ; le dentiste, le coiffeur, l’avocat restent ce qu’ils étaient',
    L.length === 101 && J(parVoc) === J({ sante: 33, beaute: 15, conseil: 14, intervention: 17, prestation: 20, demarche: 2 }) && new Set(L.map((m) => m.id)).size === 101 && S.anciens.every((x) => x[1] && x[2] && x[3]), J([L.length, parVoc, S.anciens]));
  verifie('chaque famille a au moins une prestation ; les lignes de l’ébauche à plusieurs métiers donnent un métier par nom (Ergothérapeute, Psychomotricien ; Radiologue, Centre d’imagerie)',
    L.every((m) => m.f.every((f) => f.split(':')[2].length > 0)) && ['ergotherapeute', 'psychomotricien', 'radiologue', 'centre-d-imagerie'].every((id) => parId[id]), J(L.filter((m) => m.f.some((f) => !f.split(':')[2])).map((m) => m.id)));
  verifie('médecin généraliste : ses 6 familles et 16 actes de l’ébauche', J(parId['medecin-generaliste'].f) === J(['consultation:Consultation:premiere-consultation=Première consultation;consultation-de-suivi=Consultation de suivi;renouvellement-d-ordonnance=Renouvellement d’ordonnance;resultats-d-examens=Résultats d’examens',
    'urgence:Urgence:consultation-urgente-du-jour=Consultation urgente du jour', 'enfant:Enfant:consultation-pediatrique=Consultation pédiatrique;suivi-du-nourrisson=Suivi du nourrisson;vaccination-de-l-enfant=Vaccination de l’enfant',
    'prevention:Prévention:vaccination=Vaccination;bilan-de-sante=Bilan de santé;frottis=Frottis', 'certificat:Certificat:certificat-medical-pour-le-sport=Certificat médical pour le sport;autre-certificat=Autre certificat', 'teleconsultation:Téléconsultation:consultation-video=Consultation vidéo']), J(parId['medecin-generaliste'].f));
  verifie('une ligne de l’ébauche (« Rhumatologue : première consultation ; suivi ; infiltration ») : la famille « Mes actes » ; en beauté, « Mes prestations »',
    J(parId.rhumatologue.f) === J(['mes-actes:Mes actes:premiere-consultation=Première consultation;suivi=Suivi;infiltration=Infiltration']) && J(parId['centre-de-bronzage'].f) === J(['mes-prestations:Mes prestations:seance=Séance']), J([parId.rhumatologue.f, parId['centre-de-bronzage'].f]));
  verifie('« Santé » touchée : elle s’ouvre (ses 34 métiers visibles, les autres fermées) ; touchée encore : elle se ferme',
    J(S.ouvert.cats) === J(toutes('sante')) && S.ouvert.visibles.length === 34 && J(S.referme.cats) === J(toutes('')) && S.referme.visibles === 0, J([S.ouvert.cats, S.ouvert.visibles.length, S.referme]));
  // 2. La recherche.
  verifie('« kiné » : seulement « Masseur-kinésithérapeute », dans « Santé 1 métier » ouverte ; le curseur reste dans la case', J(S.kine.visibles) === J(['Masseur-kinésithérapeute']) && J(S.kine.cats) === J(['Santé 1 métier ▾']) && S.kine.focus === 'cpCherche147', J(S.kine));
  verifie('« DERMATO » (majuscules, sans accent) : « Dermatologue » ; « santé » : les 34 de la santé ; « coiffure » : « Coiffeur »', J(S.derm.visibles) === J(['Dermatologue']) && S.sante.visibles.length === 34 && J(S.coiffure.visibles) === J(['Coiffeur']), J([S.derm.visibles, S.sante.visibles.length, S.coiffure.visibles]));
  verifie('« médecin sport » (deux mots) : « Médecin du sport » seul', J(S.deux.visibles) === J(['Médecin du sport']), J(S.deux.visibles));
  verifie('« zzz » : « Aucun métier ne correspond. Essayez un autre mot. », aucune catégorie', /Aucun métier ne correspond\.\s*Essayez un autre mot\./.test(S.rien.texte) && S.rien.cats.length === 0 && S.rien.visibles.length === 0, J(S.rien));
  verifie('pendant une recherche, une catégorie touchée se referme (les autres restent ouvertes), le curseur reste dans la case', S.ma.cats.length >= 2 && S.maFerme.cats[0] === 'sante:false' && S.maFerme.cats.slice(1).every((x) => /:true$/.test(x)) && S.maFerme.focus === 'cpCherche147', J([S.ma.cats, S.maFerme]));
  verifie('case vidée : tout se referme comme au départ', S.vide.visibles.length === 0 && S.videCats.every((x) => /:false$/.test(x)), J([S.vide.visibles.length, S.videCats]));
  // 3. Un métier de santé : l'ostéopathe.
  const O = S.osteo1;
  verifie('l’ostéopathe choisi après « osteo » : enregistré, coché (lui seul), avec les familles et les actes de l’ébauche',
    O.garde.metier === 'osteopathe' && J(O.coche) === J(['Ostéopathe']) && J((O.garde.familles || []).map((f) => f.id + ':' + f.sous.map((x) => x.id).join(','))) === J(['consultation:adulte,enfant,nourrisson,femme-enceinte,sportif', 'urgence:consultation-urgente']), J([O.garde.metier, O.coche, O.garde.familles && O.garde.familles.map((f) => f.id)]));
  verifie('la case vidée ensuite : « Santé » reste ouverte, l’ostéopathe visible', S.osteo1b.cats[0] === 'sante:true' && S.osteo1b.visibleOsteo, J(S.osteo1b));
  verifie('seul ou à plusieurs : « Plusieurs praticiens dans le cabinet », « Ajouter un praticien », « ➕ Ajouter ce praticien » ; les erreurs disent « praticien »',
    /Vous travaillez seul, ou à plusieurs \?/.test(S.osteoEquipe) && /Plusieurs praticiens dans le cabinet, chacun avec ses jours\./.test(S.osteoEquipe) && /Ajouter un praticien/.test(S.osteoEquipe) && /➕ Ajouter ce praticien/.test(S.osteoEquipe) && !/coiffeur/i.test(S.osteoEquipe)
    && S.osteoErreurEquipe === 'Ajoutez au moins un praticien, avec son prénom.' && S.osteoErreurPrenom === 'Écrivez le prénom du praticien.', J([S.osteoErreurEquipe, S.osteoErreurPrenom]));
  verifie('étape 2 : « Quels actes faites-vous ? », « motif de consultation », les familles et les actes, « ➕ Créer mon propre acte », « ➕ Créer ma propre famille »',
    /Quels actes faites-vous \?/.test(S.osteo2) && /motif de consultation/.test(S.osteo2) && ['Consultation', 'Femme enceinte', 'Sportif', 'Urgence', 'Consultation urgente', '➕ Créer mon propre acte', '➕ Créer ma propre famille'].every((x) => S.osteo2.indexOf(x) > -1) && /Votre métier\s*:\s*Ostéopathe/.test(S.osteo2), S.osteo2.slice(0, 400));
  verifie('étape 2 : « le patient appelle le cabinet », « Seulement avec un autre acte », « Qui le fait ? » ; rien du coiffeur', /Pas de rendez-vous en ligne : le patient appelle le cabinet/.test(S.osteo2) && /Seulement avec un autre acte/.test(S.osteo2) && /Qui le fait \?/.test(S.osteo2) && !/coiffeur|coupe|salon|cheveux/i.test(S.osteo2), '');
  verifie('étape 2 : créer une famille sans nom : « Écrivez le nom de votre famille d’actes. » ; renommer, décocher, créer : enregistré', S.osteoErreurFamille === 'Écrivez le nom de votre famille d’actes.' && /Adulte \(plus de 16 ans\)/.test(S.osteo2b) && /Bilan postural/.test(S.osteo2b), S.osteoErreurFamille);
  verifie('étape 3 : « Quels prix affichez-vous ? », un prix par acte gardé, aucune durée par acte', /Quels prix affichez-vous \?/.test(S.osteo3.texte) && /Tous vos rendez-vous ont la même durée \(étape 6\)/.test(S.osteo3.texte) && S.osteo3.prix === S.osteo3.actes && S.osteo3.actes === 6 && S.osteo3.durees === 0, J([S.osteo3.prix, S.osteo3.actes, S.osteo3.durees]));
  verifie('étape 4 : « Quels jours travaille chaque praticien ? », Léa et Tom', /Quels jours travaille chaque praticien \?/.test(S.osteo4) && /Choisissez un praticien, puis cochez ses jours\./.test(S.osteo4) && /Léa/.test(S.osteo4) && /Tom/.test(S.osteo4), '');
  // Examen 147 : une seule durée pour tout : le titre ne dit pas « par défaut » (un acte n'a pas d'autre durée).
  verifie('étape 5 : « Combien de temps dure un rendez-vous chez vous ? » (sans « par défaut »), une seule durée, « quel que soit l’acte », sans la note du balayage',
    /Combien de temps dure un rendez-vous chez vous \?/.test(S.osteo5.texte) && !/par défaut/.test(S.osteo5.texte) && /quel que soit l’acte/.test(S.osteo5.texte) && !S.osteo5.note && !/balayage/i.test(S.osteo5.texte), S.osteo5.texte.slice(0, 200));
  verifie('étape 6 : « Quel nom voient vos patients ? », tarifs et remboursement, « Que doit apporter le patient ? » ; nom vide (pas de « Dr »), métier « Ostéopathe », consigne proposée',
    /Quel nom voient vos patients \?/.test(S.osteo6) && /Vos tarifs et le remboursement/.test(S.osteo6) && /Que doit apporter le patient \?/.test(S.osteo6) && S.osteoFiche.nom === '' && S.osteoFiche.metier === 'Ostéopathe' && S.osteoFiche.consignes === 'Merci d’arriver 5 minutes avant votre rendez-vous.' && S.osteoFiche.horaires === '', J(S.osteoFiche));
  verifie('« Remplis à ma place » : la consigne nomme le métier et les clés de la fiche ; « Vos actes (2) », sans durée ; rien d’enregistré avant « Valider »',
    /\(Ostéopathe\)/.test(S.propose.consigne) && /nom, metier, adresse, acces, presentation, consignes, tarifs, paiement, horaires, langues, apporter, prestations/.test(S.propose.consigne) && /vouvoyant le patient/.test(S.propose.consigne)
    && /Vos actes \(2\)/.test(S.propose.texte) && !/45 min/.test(S.propose.texte) && /60 €/.test(S.propose.texte), S.propose.consigne.slice(0, 300));
  verifie('« Valider ces réponses » : « ✅ 2 actes, avec leur prix. » ; l’adulte à 60 €, le nouvel acte dans « Mes actes »',
    /✅ 2 actes, avec leur prix\./.test(S.rempli.texte) && S.rempli.familles.some((f) => /Adulte \(plus de 16 ans\)=\{"type":"fixe","min":60\}/.test(f)) && S.rempli.familles.some((f) => /^Mes actes:Séance pour sportif de haut niveau/.test(f)) && S.rempli.nom === 'Marie Martin', J(S.rempli.familles));
  const recapActes = (S.osteo7.texte.split('Vos actes et leur prix')[1] || '').split('Les jours de chaque praticien')[0];
  verifie('récapitulatif : « Vos actes et leur prix » (prix, pas de durée), « Les jours de chaque praticien », « 📞 pas de rendez-vous en ligne », « 🚫 pas fait par Tom » ; enregistré',
    /Adulte \(plus de 16 ans\) · 60 €/.test(recapActes) && /Bilan postural · de 40 € à 60 €/.test(recapActes) && !/\bmin\b/.test(recapActes) && /pas de rendez-vous en ligne/.test(recapActes) && /🚫 pas fait par Tom/.test(recapActes)
    && /Les jours de chaque praticien/.test(S.osteo7.texte) && S.osteo7.termine === true && S.osteo7.metier === 'osteopathe', recapActes.slice(0, 400));
  // 4. Un métier de beauté : la manucure.
  verifie('un compte neuf après une configuration : l’étape 1 repart fermée', S.manu0.every((x) => /:false$/.test(x)), J(S.manu0));
  const equipeManu = S.manu1.split('Vous travaillez seul, ou à plusieurs ?')[1] || '';   // sous la liste des métiers (où « Coiffeur » figure)
  verifie('manucure : « Plusieurs personnes avec vous », « Ajouter une personne », « ➕ Ajouter cette personne »', /Plusieurs personnes avec vous, chacune avec ses jours\./.test(equipeManu) && /Ajouter une personne/.test(equipeManu) && /➕ Ajouter cette personne/.test(equipeManu) && !/coiffeur|praticien/i.test(equipeManu), equipeManu.slice(0, 700));
  verifie('manucure, étape 2 : « Quelles prestations faites-vous ? », « le client vous appelle », « Seulement avec une autre prestation », « Qui la fait ? »',
    /Quelles prestations faites-vous \?/.test(S.manu2) && /le client vous appelle/.test(S.manu2) && /Seulement avec une autre prestation(?! \()/.test(S.manu2) && /Qui la fait \?/.test(S.manu2) && /Vernis semi-permanent des pieds/.test(S.manu2) && !/salon|coupe|praticien|patient/i.test(S.manu2), '');
  verifie('manucure, étapes 4, 5 et 6 : « Quels jours travaille chaque personne ? » ; « Combien de temps dure un rendez-vous chez vous ? », « quelle que soit la prestation » ; « Quel nom voient vos clients ? », sans tarifs remboursés ; consigne proposée',
    /Quels jours travaille chaque personne \?/.test(S.manu4) && /Combien de temps dure un rendez-vous chez vous \?/.test(S.manu5) && !/par défaut/.test(S.manu5) && /quelle que soit la prestation/.test(S.manu5) && /Quel nom voient vos clients \?/.test(S.manu6.texte) && !/remboursement|carte Vitale/.test(S.manu6.texte) && S.manu6.fiche.metier === 'Manucure' && S.manu6.fiche.consignes === 'Merci de prévenir au moins 24 h avant pour annuler ou déplacer votre rendez-vous.', J(S.manu6.fiche));
  verifie('manucure, récapitulatif : « Vos prestations et leur prix », « 🚫 pas faite par Sam », « ➕ seulement avec une autre prestation », « Les jours de chaque personne »',
    /Vos prestations et leur prix/.test(S.manu7) && /🚫 pas faite par Sam/.test(S.manu7) && /➕ seulement avec une autre prestation/.test(S.manu7) && /Les jours de chaque personne/.test(S.manu7), '');
  // 5. Chaque métier garde sa configuration ; « Voir tous les métiers ».
  verifie('changer de métier puis revenir : la manucure garde son équipe et ses réglages ; l’ostéopathe est rangé à part', S.garde.metier === 'manucure' && J(S.garde.sam) === J(['ongles/pose-de-gel']) && S.garde.osteo, J(S.garde));
  verifie('« Voir tous les métiers » : la catégorie du métier enregistré ouverte (lui seul coché)', J(S.tous.cats) === J(toutes('beaute')) && J(S.tous.coche) === J(['Manucure']), J(S.tous));
  verifie('regarder le rhumatologue (étape 2, « Mes actes ») n’enregistre rien ; « Retour à ma configuration » : la manucure, telle quelle',
    /Mes actes/.test(S.rhumato.texte) && /Infiltration/.test(S.rhumato.texte) && S.rhumato.inchange && S.retour.inchange && S.retour.recap && S.retour.metier === 'manucure', J([S.rhumato.inchange, S.retour]));
  // 6. Le coiffeur, le dentiste, l'avocat.
  verifie('le coiffeur garde ses mots : « Plusieurs coiffeurs dans le salon », « Ajouter un coiffeur », son erreur, « (une coupe, une couleur…) », « Quels jours travaille chaque coiffeur ? », « …, par défaut ? »',
    /Plusieurs coiffeurs dans le salon, chacun avec ses jours\./.test(S.coiffeur1) && /Ajouter un coiffeur/.test(S.coiffeur1) && S.coiffeurErreur === 'Ajoutez au moins un coiffeur, avec son prénom.'
    && /Seulement avec une autre prestation \(une coupe, une couleur…\)/.test(S.coiffeur2) && /le client appelle le salon/.test(S.coiffeur2) && /Combien de temps, et à quel prix \?/.test(S.coiffeur3) && /Quels jours travaille chaque coiffeur \?/.test(S.coiffeur4) && /Combien de temps dure un rendez-vous chez vous, par défaut \?/.test(S.coiffeur5), S.coiffeurErreur);
  verifie('le dentiste et l’avocat gardent leur étape 3 (« Combien de temps vous faut-il ? », « Vos deux rendez-vous »)', /Combien de temps vous faut-il \?/.test(S.dentiste3) && /Vos deux rendez-vous/.test(S.avocat3), '');
  // 7. Lot 2 : les mots de chaque nouvelle catégorie.
  const T = S.lot2, pl = T.plombier, no = T.notaire, ma = T.mairie, ve = T.veterinaire, ae = T['auto-ecole'], ga = T.garagiste;
  const propre = (o) => !/coiffeur|salon|cheveux|patient|praticien|la intervention|undefined|\bnull\b/i.test(o.e1 + o.e2 + o.e3 + o.e5 + o.e6);
  verifie('« Artisans et dépannage à domicile » ouverte : ses 14 métiers, un par nom (Peintre, Menuisier, Maçon, Carreleur…), par ordre alphabétique', J(S.artisans) === J(ATTENDUS.artisans.slice().sort((a, b) => a.localeCompare(b, 'fr'))), J(S.artisans));
  verifie('plombier (artisans) : « Plusieurs personnes avec vous », « Quelles interventions faites-vous ? », « Mes interventions », « le client vous appelle », « Seulement avec une autre intervention » ; étapes 3 et 5 ; la fiche demande « Où intervenez-vous ? »',
    /Plusieurs personnes avec vous/.test(pl.e1) && /Quelles interventions faites-vous \?/.test(pl.e2) && /Mes interventions/.test(pl.e2) && /Dépannage/.test(pl.e2) && /➕ Créer ma propre intervention/.test(pl.e2)
    && /Pas de rendez-vous en ligne : le client vous appelle/.test(pl.e2) && /Seulement avec une autre intervention/.test(pl.e2) && /Pour chaque intervention/.test(pl.e3)
    && /Combien de temps dure un rendez-vous chez vous \?/.test(pl.e5) && /quelle que soit l’intervention/.test(pl.e5) && /Où intervenez-vous \?/.test(pl.e6) && /Quel nom voient vos clients \?/.test(pl.e6)
    && pl.fiche.metier === 'Plombier' && propre(pl), pl.e2.slice(0, 300));
  verifie('notaire (droit et chiffre) : « Quelles missions proposez-vous ? », « Mes missions », « Succession », « ➕ Créer mon propre domaine » ; « Vos tarifs ou vos honoraires » ; Charly Pro IA vouvoie « le client »',
    /Quelles missions proposez-vous \?/.test(no.e2) && /Mes missions/.test(no.e2) && /Succession/.test(no.e2) && /➕ Créer ma propre mission/.test(no.e2) && /Un domaine qui manque \?/.test(no.e2) && /➕ Créer mon propre domaine/.test(no.e2)
    && /quelle que soit la mission/.test(no.e5) && /Vos tarifs ou vos honoraires/.test(no.e6) && /en vouvoyant le client/.test(no.consigne) && /les missions écrites dans le texte/.test(no.consigne) && propre(no), no.e2.slice(0, 300));
  verifie('mairie (administration) : « Quelles démarches proposez-vous ? », « Carte d’identité et passeport », « la personne vous appelle », « ➕ Créer mon propre service » ; la fiche, sans paiement ; Charly Pro IA vouvoie « la personne reçue »',
    /Quelles démarches proposez-vous \?/.test(ma.e2) && /Carte d’identité et passeport/.test(ma.e2) && /État civil/.test(ma.e2) && /la personne vous appelle/.test(ma.e2) && /➕ Créer mon propre service/.test(ma.e2)
    && /Quel nom voient les personnes que vous recevez \?/.test(ma.e6) && !/moyens de paiement/.test(ma.e6) && !ma.fiche.paiement && /en vouvoyant la personne reçue/.test(ma.consigne)
    && /clés : nom, metier, adresse, acces, presentation, consignes, horaires, langues, prestations/.test(ma.consigne) && !/client/i.test(ma.e2) && propre(ma), ma.e2.slice(0, 300));
  verifie('vétérinaire (animaux) : ses 3 familles et 9 prestations de l’ébauche, « Quelles prestations faites-vous ? », une fiche sans carte Vitale ni remboursement',
    J(ve.familles) === J(['consultation:premiere-consultation,consultation-de-suivi,urgence', 'prevention:vaccination,identification,vermifuge-et-antiparasitaire', 'chirurgie:sterilisation,detartrage,autre-operation'])
    && /Quelles prestations faites-vous \?/.test(ve.e2) && /Quel nom voient vos clients \?/.test(ve.e6) && !/carte Vitale|remboursement/i.test(ve.e6) && propre(ve), J(ve.familles));
  // Examen du lot 2 : à plusieurs, le texte de l'étape 1 suit le métier ; aucun « prestation » chez un métier qui n'en a pas.
  const tout7 = (o) => o.e1 + o.e2 + o.e3 + o.e4 + o.e5 + o.e6 + o.e7;
  verifie('à plusieurs : « Les missions, les prix et la fiche… » (notaire), « Les interventions… » (plombier, garagiste), « Les démarches… » (mairie) ; aucun « prestation », de l’étape 1 au récapitulatif',
    /Les missions, les prix et la fiche sont les mêmes pour tous\./.test(no.e1) && /Les interventions, les prix et la fiche sont les mêmes pour tous\./.test(pl.e1) && /Les interventions, les prix/.test(ga.e1) && /Les démarches, les prix et la fiche sont les mêmes pour tous\./.test(ma.e1)
    && [no, pl, ga, ma].every((o) => !/prestation/i.test(tout7(o))), J([no, pl, ga, ma].map((o) => (tout7(o).match(/.{0,40}prestation.{0,20}/i) || [''])[0])));
  const V = S.nav;
  // Mission 148 : « Vos règles de réservation » s'ajoute après les jours (4 sur 6) : la mairie a six étapes, sans celle des prix.
  verifie('mairie (chef) : pas d’étape des prix : « Étape 1 sur 6 », 2 sur 6, puis « Quels jours travaillez-vous ? » en « Étape 3 sur 6 » ; « ← Retour » revient à l’étape 2 ; « Vos règles de réservation » 4 sur 6, 5 sur 6, 6 sur 6, puis le récapitulatif',
    V.e1 === '1/6' && J(V.e2) === J(['2/6', 2]) && J(V.e3) === J(['3/6', 4, true]) && J(V.retour) === J(['2/6', 2]) && J(V.e4) === J(['4/6', 4.5, true]) && J(V.e5) === J(['5/6', 5]) && J(V.e6) === J(['6/6', 6]) && V.fin === 7
    && J(V.aller3) === J(['3/6', 4]), J(V));
  verifie('mairie, récapitulatif : « Vos démarches », sans « et leur prix », aucun prix nulle part ; le notaire garde son étape des prix (« Étape 3 sur 7 », « Quels prix affichez-vous ? »)',
    /Vos démarches/.test(V.recap) && !/prix/i.test(V.recap) && !/prix/i.test(ma.e7) && !/Quels prix/.test(tout7(ma)) && J(S.navNotaire) === J(['3/7', 3, true]), J([V.recap.slice(0, 300), S.navNotaire]));
  // Examen du correctif du lot 2 : les renvois « (étape N) » ; [motif, étapes internes visées].
  const PATRONS = [[/horaires(?: de travail)? \(étape (\d)\)/g, [4]], [/même durée \(étape (\d)\)/g, [5]], [/durée de vos rendez-vous \(étape (\d)\)/g, [5]],
    [/Aucun jour coché \(étape (\d)\)/g, [4]], [/corriger à l’étape (\d)/g, [2]], [/corriger aux étapes (\d) et (\d)/g, [2, 3]], [/en ligne » \(étape (\d)\)/g, [2]]];
  const renvois = (pages) => {
    const rang = {}; pages.forEach((p) => { if (p.compteur) rang[p.interne] = Number(p.compteur.split('/')[0]); });
    const tous = pages.map((p) => p.texte).join('\n'), faux = [];
    let vus = 0;
    PATRONS.forEach(([re, cibles]) => { let m; re.lastIndex = 0; while ((m = re.exec(tous))) { vus++; cibles.forEach((c, k) => { if (Number(m[k + 1]) !== rang[c]) faux.push(m[0] + ' (attendu : étape ' + rang[c] + ')'); }); } });
    if (/⟦|⟧/.test(tous)) faux.push('un renvoi non remplacé');
    return { vus, faux };
  };
  const RV = { mairie: renvois(S.renvois.mairie), notaire: renvois(S.renvois.notaire), coiffeur: renvois(S.renvois.coiffeur) };
  verifie('renvois « (étape N) » : la mairie (5 étapes) dit « étape 3 » pour ses jours, partout ; le notaire et le coiffeur (6 étapes) gardent leurs numéros ; aucun renvoi faux ni oublié',
    RV.mairie.vus >= 3 && RV.notaire.vus >= 4 && RV.coiffeur.vus >= 5 && !RV.mairie.faux.length && !RV.notaire.faux.length && !RV.coiffeur.faux.length, J(RV));
  verifie('auto-école : les mots « prestation » (des leçons, pas des interventions) ; garagiste : « Quelles interventions faites-vous ? », « Carrosserie »',
    /Quelles prestations faites-vous \?/.test(ae.e2) && /Leçon de conduite/.test(ae.e2) && !/intervention/i.test(ae.e2) && /Quelles interventions faites-vous \?/.test(ga.e2) && /Carrosserie/.test(ga.e2) && propre(ae) && propre(ga), '');
  verifie('aucun appel réseau', S.appels === 0 && P.appels === 0, J([S.appels, P.appels]));
  verifie('aucun débordement sur le côté, à 390 px et à 1280 px (étape 1 ouverte, étape 2, récapitulatif)', S.debords.concat(P.debords).every((x) => x <= 0), J([S.debords, P.debords]));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
