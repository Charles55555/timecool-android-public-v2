// Charles, 22/11/2026 : dans « Mes contacts », sous « Importer mes contacts » et « + Ajouter », une rangée de boutons pour
// trier la liste d'un geste : Tous · Mon travail · Ma santé · Ma famille · Mes amis et loisirs · Mon sport · Non classés.
// - Mêmes libellés et mêmes émojis que les pastilles « Ce contact fait partie de : » ; chacun à la couleur de sa catégorie
//   (palette existante), avec son nombre ; « Tous » allumé au départ.
// - Rangé dans deux catégories, un contact est sous les deux ; « Non classés » = aucune des cinq catégories.
// - Le tri se combine avec la recherche et avec « Mes contacts récents » ; « N contacts » en haut à droite reste le total.
// - Catégorie vide : une phrase simple. Le choix n'est pas gardé d'une visite à l'autre.
// - Téléphone : une seule ligne qui glisse au doigt, rien ne déborde à 320 px. PC : sur la ligne de « + Ajouter » si elle y tient.
// - Les libellés passent par la traduction de la page, y compris après un toucher.
// Le vrai parcours dans Chrome, sans réseau, sur un compte d'essai et des contacts d'essai ; quatre largeurs : 320, 360, 800, 1600.
// Usage : node verif-tri-contacts.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 500) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
}

// Douze contacts d'essai. Bruno (travail + sport) et David (famille + amis) sont sous deux boutons ; Hugo n'a que « Mon temps
// libre » (une permission, pas un rangement) : il est « Non classé », comme Gaston, Karim et Léo (bloqué).
let numero = 0;
const C = (id, name, categories, extra) => Object.assign({ id: 'c_' + id, name, phone: '06 39 98 00 ' + String(++numero).padStart(2, '0'),
  email: id + '.essai@exemple-timecool.fr', categories, createdAt: '2025-01-15T10:00:00.000Z' }, extra || {});
const CONTACTS = [
  C('alice', 'Alice Essai', ['travail'], { isTimeCool: true }), C('bruno', 'Bruno Essai', ['travail', 'sport']), C('chloe', 'Chloé Essai', ['sante']),
  C('david', 'David Essai', ['famille', 'amis'], { isTimeCool: true }), C('emma', 'Emma Essai', ['famille']), C('fanny', 'Fanny Essai', ['amis']),
  C('gaston', 'Gaston Essai', []), C('hugo', 'Hugo Essai', ['personnel']), C('ines', 'Inès Essai', ['sport']), C('jules', 'Jules Essai', ['famille']),
  C('karim', 'Karim Essai', []), C('leo', 'Léo Essai', [], { blocked: true })
];
const RECENTS = ['c_ines', 'c_jules', 'c_karim'];

/** Dans la page. Mesure à toutes les largeurs ; le parcours complet à 360 px. */
async function dansLaPage(D) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const fin = (res) => { const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  const R = { largeur: window.innerWidth };
  const rang = () => Array.prototype.slice.call(document.querySelectorAll('#ctTriRang > button'));
  const textes = () => rang().map((b) => b.textContent.replace(/\s+/g, ' ').trim());
  const presses = () => rang().filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent.replace(/\s+/g, ' ').trim());
  const fiches = () => Array.prototype.slice.call(document.querySelectorAll('#contactsListContainer [id^="ctFiche_"]')).map((e) => e.id.slice(8));
  const liste = () => (document.getElementById('contactsListContainer') || {}).innerText ? document.getElementById('contactsListContainer').innerText.replace(/\s+/g, ' ').trim() : '';
  const compte = () => ((document.getElementById('ctCompte') || {}).textContent || (document.querySelector('#contactsContent div[style*="margin-left:auto"]') || {}).textContent || '').trim();
  const touche = (cle) => { const n = document.getElementById('ctTriN_' + cle); if (!n) throw new Error('bouton ' + cle + ' absent'); n.parentElement.click(); };
  const chercher = (t) => { const s = document.getElementById('contactsSearchInput'); s.value = t; s.dispatchEvent(new Event('input')); };
  const boutonRecents = () => Array.prototype.slice.call(document.querySelectorAll('#contactsContent button')).find((b) => /Mes contacts récents/.test(b.textContent));
  const boutonTimeCool = () => Array.prototype.slice.call(document.querySelectorAll('#contactsContent button')).find((b) => /Mes contacts TimeCool/.test(b.textContent));
  const boite = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
  const rgb = (hex) => { const h = hex.replace('#', ''); return 'rgb(' + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')'; };
  const mesure = () => {
    const tete = document.getElementById('ctEnTete'), tri = document.getElementById('ctTri'), cpt = document.getElementById('ctCompte');
    if (!tete || !tri || !cpt) return { absent: true };
    const btn = tete.querySelectorAll(':scope > button');
    const main = document.querySelector('#page-contacts .main'), cc = document.getElementById('contactsContent');
    return {
      mode: tri.dataset.mode || '', tete: boite(tete), imp: boite(btn[0]), aj: boite(btn[1]), compte: boite(cpt), tri: boite(tri),
      lignes: Array.from(new Set(rang().map((b) => Math.round(b.getBoundingClientRect().top)))).length,
      glisse: tri.scrollWidth > tri.clientWidth + 1,
      deborde: main.scrollWidth > main.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth + 1 || cc.scrollWidth > cc.clientWidth + 1,
      dernier: boite(rang()[rang().length - 1])
    };
  };
  const remettre = async () => {
    contactsList = JSON.parse(JSON.stringify(D.contacts));
    contactsList.forEach((c) => { const i = D.recents.indexOf(c.id); if (i > -1) c.createdAt = new Date(Date.now() - (2 + i) * 86400000).toISOString(); });
    contactsSearchQuery = ''; _contactsRecents = false; _contactsTimeCool = false; _contactsCategorie = ''; _contactsLettre = '';
    navigate('calendar'); await attendre(150); navigate('contacts'); await attendre(400);
  };
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    if (typeof hideAuthFlow === 'function') hideAuthFlow();
    await remettre();
    document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    await attendre(300);
    R.depart = { textes: textes(), presses: presses(), fiches: fiches().length, compte: compte(), mesure: mesure() };
    if (!D.complet || R.depart.mesure.absent) {
      if (D.largeur >= 1000 && !R.depart.mesure.absent) {
        // La fenêtre rétrécit (ici : la zone des contacts) : la rangée redescend, puis remonte. Dans l'appli, l'observation de
        // taille appelle tcPlacerTri à l'image suivante ; ce Chrome d'essai (temps simulé) ne dessine aucune image, elle n'y part
        // jamais : on appelle ce qu'elle appelle (son branchement est vérifié dans le texte de la page).
        const cc = document.getElementById('contactsContent');
        cc.style.width = '700px'; cc.style.boxSizing = 'border-box'; tcPlacerTri(); await attendre(100);
        R.etroit = mesure();
        cc.style.width = ''; tcPlacerTri(); await attendre(100);
        R.large = mesure();
      }
      fin(R); return;
    }
    // Les pastilles d'une fiche : mêmes libellés, mêmes émojis.
    R.pastilles = Array.prototype.slice.call(document.querySelectorAll('#ctFiche_c_alice button[onclick^="toggleContactCat"]')).map((b) => b.textContent.trim());
    R.libelles = rang().map((b) => b.firstChild.textContent);
    // Les couleurs : celles de la palette des catégories.
    R.couleurs = rang().map((b) => { const s = getComputedStyle(b); return { fond: s.backgroundColor, bord: s.borderTopColor, texte: s.color }; });
    R.palette = {};
    ['travail', 'sante', 'famille', 'amis', 'sport', 'perso'].forEach((k) => { const p = TC_COULEURS_CATEGORIES[k]; R.palette[k] = { bg: rgb(p.bg), color: rgb(p.color), texte: rgb(p.texte) }; });
    R.bleu = getComputedStyle(document.querySelector('#ctEnTete > button')).backgroundColor;
    // Chaque bouton.
    R.sous = {};
    for (const cle of ['famille', 'amis', 'travail', 'sport', 'sante', 'non_classes', 'tous']) {
      touche(cle); await attendre(120);
      R.sous[cle] = { fiches: fiches(), presses: presses(), compte: compte() };
    }
    touche('famille'); await attendre(120);
    const allume = document.getElementById('ctTriN_famille').parentElement;
    R.allume = { fond: getComputedStyle(allume).backgroundColor, texte: getComputedStyle(allume).color };
    touche('famille'); await attendre(120);
    R.deuxFois = presses();
    // Avec la recherche.
    chercher('Jules'); await attendre(150);
    R.recherche = { fiches: fiches(), textes: textes(), presses: presses(), compte: compte() };
    chercher('Gaston'); await attendre(150);
    R.rechercheVide = { fiches: fiches(), liste: liste(), compte: compte() };
    chercher(''); await attendre(150);
    R.rechercheEffacee = { fiches: fiches(), textes: textes() };
    // Avec « Mes contacts récents ».
    boutonRecents().click(); await attendre(150);
    R.recents = { fiches: fiches(), presses: presses(), textes: textes(), recents: _contactsRecents };
    touche('sante'); await attendre(150);
    R.recentsVide = { liste: liste(), recents: _contactsRecents };
    touche('famille'); await attendre(120);
    boutonRecents().click(); await attendre(150);
    R.recentsFermes = { fiches: fiches(), presses: presses() };
    // Avec « Mes contacts TimeCool ».
    boutonTimeCool().click(); await attendre(150);
    R.timecool = { fiches: fiches(), presses: presses() };
    boutonTimeCool().click(); await attendre(150);
    // Un nouveau rendu de la page (synchronisation) garde le bouton ; une nouvelle visite revient sur « Tous ».
    renderContacts(); await attendre(100);
    R.rendu = presses();
    navigate('contacts'); await attendre(200);
    R.memePage = presses();
    navigate('assistant'); await attendre(300); navigate('contacts'); await attendre(300);
    R.visite = { presses: presses(), fiches: fiches().length };
    // Une pastille touchée sur une fiche : les nombres suivent.
    toggleContactCat('c_gaston', 'sport'); await attendre(150);
    R.pastille = textes();
    toggleContactCat('c_gaston', 'sport'); await attendre(100);
    // La rangée reste où le doigt l'a laissée.
    const tri = document.getElementById('ctTri');
    tri.scrollLeft = 2000; await attendre(50);
    R.glisse = tri.scrollLeft;
    touche('non_classes'); await attendre(150);
    R.apresToucher = document.getElementById('ctTri').scrollLeft;
    chercher('Essai'); await attendre(150);
    R.apresFrappe = document.getElementById('ctTri').scrollLeft;
    chercher(''); await attendre(100);
    touche('tous'); await attendre(100);
    // Catégorie vide, « Non classés » vide.
    contactsList.find((c) => c.id === 'c_chloe').categories = [];
    renderContacts(); await attendre(100);
    R.santeZero = textes();
    touche('sante'); await attendre(120);
    R.santeVide = liste();
    contactsList.forEach((c) => { if (!c.categories.some((x) => x !== 'personnel')) c.categories = c.categories.concat(['amis']); });
    touche('non_classes'); await attendre(120);
    R.rangesVide = liste();
    // Le filtre « Qui peut réserver pour … » (ouvert autrefois depuis « Mes disponibilités ») : la rangée s'efface.
    await remettre();
    _contactsCategorie = 'travail'; renderContacts(); await attendre(100);
    R.categorie = { rangee: !!document.getElementById('ctTri'), bandeau: /Qui peut réserver/.test(document.getElementById('contactsContent').innerText) };
    _contactsCategorie = ''; renderContacts(); await attendre(100);
    // Les libellés passent par la traduction de la page après un toucher (traducteur d'essai, hors ligne).
    const traducteur = translateText;
    translateText = async function (t, l) { return '[' + l + '] ' + t; };
    currentLanguage = 'de';
    touche('amis'); await attendre(800);
    R.traduits = rang().map((b) => b.firstChild.textContent);
    currentLanguage = 'fr'; translateText = traducteur;
    await translatePageWithGoogle('fr'); renderContacts(); await attendre(100);
    // Un grand carnet : 250 fiches, dont 30 dans « Ma famille ».
    const grand = [];
    for (let i = 0; i < 250; i++) grand.push({ id: 'g' + i, name: String.fromCharCode(65 + (i % 26)) + 'essai ' + i, categories: i < 30 ? ['famille'] : [] });
    contactsList = grand; _contactsTri = ''; renderContacts(); await attendre(100);
    const lettres = () => !!document.querySelector('#contactsContent [onclick^="tcChoisirLettre"]');
    R.grand = { textes: textes(), lettres: lettres(), invite: /Touche une lettre/.test(liste()), fiches: fiches().length };
    touche('famille'); await attendre(150);
    R.grandFamille = { lettres: lettres(), fiches: fiches().length };
    touche('non_classes'); await attendre(150);
    R.grandNonClasses = { lettres: lettres(), invite: /Touche une lettre/.test(liste()), fiches: fiches().length };
    tcChoisirLettre('A'); await attendre(150);
    R.grandLettreA = { fiches: fiches(), presses: presses() };
    await remettre();
    fin(R);
  } catch (e) { fin({ erreur: String(e && e.stack || e), R }); }
}

function jouer(largeur, complet) {
  const compte = JSON.stringify({ firstname: 'Tom', lastname: 'Essai', email: 'tom.essai.tri@exemple-timecool.fr', reference: 'REFESSAITRI' });
  const tete = '<script>(function () { window.fetch = function () { return Promise.reject(new Error("hors ligne")); };'
    + ' try { localStorage.clear(); localStorage.setItem("timecool_user_account", ' + JSON.stringify(compte) + '); localStorage.setItem("timecool_session_active", "true");'
    + ' localStorage.setItem("tc_onboarding_done", "1"); localStorage.setItem("tc_permissions_shown", "1"); } catch (e) {}'
    + ' })();</script>';
  const corpsJs = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + dansLaPage.toString() + ')('
    + JSON.stringify({ contacts: CONTACTS, recents: RECENTS, complet, largeur }) + '); }, 1500); });</script>';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-tri-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + tete).replace('</body>', () => corpsJs + '</body>'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'),
    '--hide-scrollbars', '--window-size=' + largeur + ',800', '--virtual-time-budget=' + (complet ? 60000 : 15000), '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')];
  const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  if (process.env.TC_VOIR) console.log(largeur, JSON.stringify(res, null, 1));
  return res || { erreur: 'Chrome n a rien rendu (code ' + r.status + ' ' + (r.signal || '') + ', ' + String(r.stdout || '').length + ' caractères)' };
}

const ATTENDUS = ['Tous (12)', '💼 Mon travail (2)', '🏥 Ma santé (1)', '👨‍👩‍👧 Ma famille (3)', '🎉 Mes amis et loisirs (2)', '🏋️ Mon sport (2)', 'Non classés (4)'];
const ids = (l) => (l || []).slice().sort().join(',');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const T = jouer(360, true);
if (T.erreur || !T.depart) {
  verifie('Chrome a joué le parcours à 360 px', false, T.erreur);
} else {
  const d = T.depart;
  titre('1. La rangée, au départ');
  verifie('sept boutons, dans l’ordre de Charles, avec leur nombre', eq(d.textes, ATTENDUS), d.textes.join(' | '));
  verifie('« Tous » est allumé, et lui seul', eq(d.presses, ['Tous (12)']), d.presses.join(' | '));
  verifie('les douze fiches sont là', d.fiches === 12, d.fiches);
  verifie('le compte en haut à droite dit le total', d.compte === '👥 12 contacts', d.compte);
  verifie('mêmes libellés et mêmes émojis que les pastilles « Ce contact fait partie de : »', T.pastilles && eq(T.libelles.slice(1, 6), T.pastilles), (T.libelles || []).join(' | ') + ' / ' + (T.pastilles || []).join(' | '));
  const P = T.palette || {}, K = T.couleurs || [];
  const cats = ['travail', 'sante', 'famille', 'amis', 'sport'];
  verifie('chaque catégorie a sa couleur : fond, bord et texte de la palette',
    cats.every((k, i) => K[i + 1] && K[i + 1].fond === P[k].bg && K[i + 1].bord === P[k].color && K[i + 1].texte === P[k].texte), JSON.stringify(K));
  verifie('« Non classés » a le gris neutre de la palette', K[6] && P.perso && K[6].fond === P.perso.bg && K[6].texte === P.perso.texte, JSON.stringify(K[6]));
  verifie('« Tous », allumé, a le bleu des boutons de la page', K[0] && K[0].fond === T.bleu && K[0].texte === 'rgb(255, 255, 255)', JSON.stringify(K[0]) + ' / ' + T.bleu);
  verifie('un bouton allumé prend la couleur foncée de sa catégorie, écrit en blanc', T.allume && T.allume.fond === P.famille.texte && T.allume.texte === 'rgb(255, 255, 255)', JSON.stringify(T.allume));

  titre('2. Chaque bouton trie la liste');
  const S = T.sous || {};
  verifie('« Ma famille » : David, Emma, Jules', ids(S.famille && S.famille.fiches) === 'c_david,c_emma,c_jules', S.famille && S.famille.fiches);
  verifie('« Mes amis et loisirs » : David (aussi dans « Ma famille ») et Fanny', ids(S.amis && S.amis.fiches) === 'c_david,c_fanny', S.amis && S.amis.fiches);
  verifie('« Mon travail » : Alice et Bruno', ids(S.travail && S.travail.fiches) === 'c_alice,c_bruno', S.travail && S.travail.fiches);
  verifie('« Mon sport » : Bruno (aussi dans « Mon travail ») et Inès', ids(S.sport && S.sport.fiches) === 'c_bruno,c_ines', S.sport && S.sport.fiches);
  verifie('« Ma santé » : Chloé', ids(S.sante && S.sante.fiches) === 'c_chloe', S.sante && S.sante.fiches);
  verifie('« Non classés » : Gaston, Hugo (seulement « Même en temps libre »), Karim, Léo (bloqué)', ids(S.non_classes && S.non_classes.fiches) === 'c_gaston,c_hugo,c_karim,c_leo', S.non_classes && S.non_classes.fiches);
  verifie('« Tous » : tout revient', S.tous && S.tous.fiches.length === 12, S.tous && S.tous.fiches.length);
  verifie('le bouton touché s’allume, et lui seul', S.famille && eq(S.famille.presses, ['👨‍👩‍👧 Ma famille (3)']) && eq(S.non_classes.presses, ['Non classés (4)']), S.famille && S.famille.presses);
  verifie('le compte en haut à droite reste le total pendant le tri', S.famille && S.famille.compte === '👥 12 contacts' && S.non_classes.compte === '👥 12 contacts', S.famille && S.famille.compte);
  verifie('toucher deux fois le même bouton le laisse allumé', eq(T.deuxFois, ['👨‍👩‍👧 Ma famille (3)']), T.deuxFois);

  titre('3. Avec la recherche');
  const Q = T.recherche || {};
  verifie('« Ma famille » + « Jules » : Jules seul', ids(Q.fiches) === 'c_jules', Q.fiches);
  verifie('les nombres suivent la recherche (ce que chaque bouton montrera)', eq(Q.textes, ['Tous (1)', '💼 Mon travail (0)', '🏥 Ma santé (0)', '👨‍👩‍👧 Ma famille (1)', '🎉 Mes amis et loisirs (0)', '🏋️ Mon sport (0)', 'Non classés (0)']), (Q.textes || []).join(' | '));
  verifie('le bouton reste allumé, le compte reste le total', eq(Q.presses, ['👨‍👩‍👧 Ma famille (1)']) && Q.compte === '👥 12 contacts', (Q.presses || []).join(' | ') + ' / ' + Q.compte);
  const V = T.rechercheVide || {};
  verifie('« Ma famille » + « Gaston » : une phrase simple', (V.fiches || []).length === 0 && /Aucun résultat dans « 👨‍👩‍👧 Ma famille »\./.test(V.liste) && /touche « Tous »/.test(V.liste), V.liste);
  verifie('recherche effacée : toute « Ma famille » revient, et les nombres aussi', T.rechercheEffacee && ids(T.rechercheEffacee.fiches) === 'c_david,c_emma,c_jules' && T.rechercheEffacee.textes[0] === 'Tous (12)', T.rechercheEffacee && T.rechercheEffacee.textes.join(' | '));

  titre('4. Avec « Mes contacts récents » et « Mes contacts TimeCool »');
  const N = T.recents || {};
  verifie('« Ma famille » + récents : Jules seul, le bouton reste allumé', N.recents === true && ids(N.fiches) === 'c_jules' && eq(N.presses, ['👨‍👩‍👧 Ma famille (1)']), JSON.stringify(N));
  verifie('les nombres comptent les récents (Inès, Jules, Karim)', N.textes && N.textes[0] === 'Tous (3)' && N.textes[5] === '🏋️ Mon sport (1)' && N.textes[6] === 'Non classés (1)', N.textes && N.textes.join(' | '));
  verifie('« Ma santé » + récents : une phrase simple', T.recentsVide && T.recentsVide.recents === true && /Aucun contact récent dans « 🏥 Ma santé »\./.test(T.recentsVide.liste), T.recentsVide && T.recentsVide.liste);
  verifie('récents fermés : « Ma famille » reste, avec ses trois fiches', T.recentsFermes && ids(T.recentsFermes.fiches) === 'c_david,c_emma,c_jules' && eq(T.recentsFermes.presses, ['👨‍👩‍👧 Ma famille (3)']), JSON.stringify(T.recentsFermes));
  verifie('« Ma famille » + inscrits TimeCool : David seul', T.timecool && ids(T.timecool.fiches) === 'c_david', JSON.stringify(T.timecool));

  titre('5. D’une visite à l’autre');
  verifie('un nouveau rendu de la page (synchronisation) garde le bouton', eq(T.rendu, ['👨‍👩‍👧 Ma famille (3)']) && eq(T.memePage, ['👨‍👩‍👧 Ma famille (3)']), (T.rendu || []).join() + ' / ' + (T.memePage || []).join());
  verifie('revenir sur la page : « Tous » est rallumé, les douze fiches sont là', T.visite && eq(T.visite.presses, ['Tous (12)']) && T.visite.fiches === 12, JSON.stringify(T.visite));
  verifie('une pastille touchée sur une fiche : les nombres suivent', T.pastille && T.pastille[5] === '🏋️ Mon sport (3)' && T.pastille[6] === 'Non classés (3)', T.pastille && T.pastille.join(' | '));

  titre('6. Catégorie vide');
  verifie('« Ma santé (0) » quand plus personne n’y est', T.santeZero && T.santeZero[2] === '🏥 Ma santé (0)', T.santeZero && T.santeZero.join(' | '));
  verifie('une phrase simple, et le geste qui y remédie', /Personne dans « 🏥 Ma santé » pour l’instant\./.test(T.santeVide) && /Pour y ranger quelqu’un, touche « Tous », puis « 🏥 Ma santé » sur sa fiche\./.test(T.santeVide), T.santeVide);
  verifie('« Non classés » vide : « Tous tes contacts sont rangés. »', /Tous tes contacts sont rangés\./.test(T.rangesVide), T.rangesVide);

  titre('7. Le reste de la page');
  verifie('le bandeau « Qui peut réserver pour … » garde son écran : la rangée s’efface', T.categorie && T.categorie.rangee === false && T.categorie.bandeau === true, JSON.stringify(T.categorie));
  verifie('après un toucher, les libellés passent par la traduction de la page', T.traduits && T.traduits.length === 7 && T.traduits.every((t) => /^\[de\] /.test(t)), (T.traduits || []).join(' | '));
  verifie('la rangée glisse au doigt', T.glisse > 0, T.glisse);
  verifie('et reste où le doigt l’a laissée, après un toucher et pendant la frappe', T.apresToucher === T.glisse && T.apresFrappe === T.glisse, T.glisse + ' / ' + T.apresToucher + ' / ' + T.apresFrappe);

  titre('8. Un grand carnet (250 fiches)');
  const G = T.grand || {};
  verifie('« Tous » : la réglette et l’invitation, comme avant', G.lettres === true && G.invite === true && G.fiches === 0, JSON.stringify(G));
  verifie('les nombres : 250, 30 dans « Ma famille », 220 non classés', G.textes && G.textes[0] === 'Tous (250)' && G.textes[3] === '👨‍👩‍👧 Ma famille (30)' && G.textes[6] === 'Non classés (220)', G.textes && G.textes.join(' | '));
  verifie('« Ma famille » (30) : la liste directement, sans réglette', T.grandFamille && T.grandFamille.lettres === false && T.grandFamille.fiches === 30, JSON.stringify(T.grandFamille));
  verifie('« Non classés » (220) : la réglette, pour ne pas tout construire', T.grandNonClasses && T.grandNonClasses.lettres === true && T.grandNonClasses.fiches === 0 && T.grandNonClasses.invite, JSON.stringify(T.grandNonClasses));
  const attendusA = []; for (let i = 30; i < 250; i++) if (i % 26 === 0) attendusA.push('g' + i);
  verifie('« Non classés » + la lettre A : ses non classés seulement', T.grandLettreA && ids(T.grandLettreA.fiches) === attendusA.sort().join(','), T.grandLettreA && T.grandLettreA.fiches.join(','));
}

titre('9. La place à l’écran');
const telephone = (L, X) => {
  if (!X || X.erreur || !X.depart || X.depart.mesure.absent) { verifie(L + ' px : la rangée est dans la page', false, X && (X.erreur || JSON.stringify(X.depart))); return; }
  const m = X.depart.mesure;
  verifie(L + ' px : « Importer mes contacts » et « + Ajouter » sur la même ligne, le compte à droite, comme avant', m.imp.t === m.aj.t && Math.abs(m.compte.r - m.tete.r) <= 1 && m.compte.t >= m.imp.b, JSON.stringify(m));
  verifie(L + ' px : la rangée est dessous, sur une seule ligne', m.mode === 'dessous' && m.tri.t >= m.compte.b && m.lignes === 1, m.mode + ', ' + m.lignes + ' ligne(s)');
  verifie(L + ' px : elle glisse au doigt, sans rien faire déborder', m.glisse === true && m.deborde === false && m.tri.l >= m.tete.l && m.tri.r <= m.tete.r, JSON.stringify(m));
};
telephone(360, T);
telephone(320, jouer(320, false));
{
  const X = jouer(1600, false);
  if (!X || X.erreur || !X.depart || X.depart.mesure.absent) verifie('PC 1600 px : la rangée est dans la page', false, X && (X.erreur || JSON.stringify(X.depart)));
  else {
    const m = X.depart.mesure;
    verifie('PC 1600 px : sur la ligne de « + Ajouter », le compte toujours à droite', m.mode === 'ligne' && m.tri.l > m.aj.r && m.compte.l > m.tri.r && Math.abs(m.compte.r - m.tete.r) <= 1
      && Math.abs((m.tri.t + m.tri.b) / 2 - (m.imp.t + m.imp.b) / 2) <= 3 && m.lignes === 1, JSON.stringify(m));
    verifie('PC 1600 px : rien ne glisse ni ne déborde', m.glisse === false && m.deborde === false, JSON.stringify(m));
    verifie('la fenêtre rétrécit : la rangée redescend sous les boutons, sans déborder', X.etroit && X.etroit.mode !== 'ligne' && X.etroit.tri.t >= X.etroit.imp.b && X.etroit.deborde === false && X.etroit.glisse === false, JSON.stringify(X.etroit));
    verifie('et remonte quand elle s’élargit', X.large && X.large.mode === 'ligne', JSON.stringify(X.large));
    verifie('la place est remesurée seule : l’observation de taille (en-tête et rangée) appelle tcPlacerTri à l’image suivante',
      /new ResizeObserver\(function \(\) \{\s*if \(_tcTriImage\) return;\s*_tcTriImage = requestAnimationFrame\(function \(\) \{ _tcTriImage = 0; tcPlacerTri\(\); \}\);/.test(page)
      && page.indexOf("_tcTriObservateur.observe(document.getElementById('ctEnTete'));") > -1 && page.indexOf("_tcTriObservateur.observe(document.getElementById('ctTriRang'));") > -1);
  }
}
{
  const X = jouer(800, false);
  if (!X || X.erreur || !X.depart || X.depart.mesure.absent) verifie('PC 800 px : la rangée est dans la page', false, X && (X.erreur || JSON.stringify(X.depart)));
  else {
    const m = X.depart.mesure;
    verifie('PC 800 px : pas la place sur la ligne : dessous, en deux lignes au plus, rien qui glisse ni déborde', m.mode !== 'ligne' && m.tri.t >= m.imp.b && m.lignes <= 2 && m.glisse === false && m.deborde === false, JSON.stringify(m));
  }
}

console.log('');
console.log(ko ? ko + ' anomalie(s) sur ' + (ok + ko) + ' vérifications.' : 'OK : ' + ok + ' vérifications.');
process.exit(ko ? 1 : 0);
