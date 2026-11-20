// Mission 148 (Charles, 20/11) : « Configuration professionnelle », une étape « Vos règles de réservation » pour tous les métiers, après
// les jours et les horaires, avant la durée d'un rendez-vous. Quatre réglages facultatifs, avec leur valeur de départ : jusqu'à quand on
// peut réserver (au plus tôt 60 jours avant, au plus tard 1 heure avant), des journées aux horaires différents ou fermées (sans toucher à la
// semaine habituelle ; la liste, avec « Retirer »), une pause entre deux rendez-vous (aucune), un maximum de rendez-vous par jour (aucun).
// Le compteur « Étape N sur … », « Suivant », « ← Retour » et le récapitulatif suivent ; « Votre métier : … » en haut. Enregistré dans
// tc_config_pro, par métier ; « Voir tous les métiers » n'enregistre rien. Ces règles ne changent encore aucune prise de rendez-vous (les
// créneaux de l'étape d'après restent les mêmes ; aucun autre code ne les lit). Case éteinte : rien. Aucun appel réseau.
// Usage : node verif-config-regles148.js <index.html>   (TC_CHROME)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); };
const J = (x) => JSON.stringify(x);

console.log('-- Le code --');
const debutZone = page.indexOf('const TC_CONFIG_PRO_CLE'), finZone = page.indexOf('// ═══ fin mission 121 ═══');
const hors = page.slice(0, Math.max(0, debutZone)) + page.slice(Math.max(0, finZone));
verifie('les règles (regles148) ne sont lues nulle part ailleurs que dans « Configuration professionnelle » (aucune prise de rendez-vous, ni la démonstration du dentiste)',
  debutZone > -1 && finZone > debutZone && /regles148/.test(page.slice(debutZone, finZone)) && !/regles148|Regles148|REGLES148/.test(hors));

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }

/** Dans la page : le parcours. */
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
    const compteur = () => { const m = /tape (\d) sur (\d)/i.exec(texte()); return m ? m[1] + '/' + m[2] : ''; };
    const deborde = () => { const c = document.getElementById('page-configpro'); return Math.max(c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); };
    const cartes = () => Array.prototype.map.call(corps().querySelectorAll('.cp-regle148'), (c) => ({ id: c.id, titre: c.children[0].innerText.trim(), phrase: c.children[1].innerText.trim() }));
    const neuf = (id) => { localStorage.removeItem('tc_config_pro'); _tcConfigPro = null; tcOuvrirConfigPro121(); tcConfigPro121.choisirMetier(id); };
    const debords = [];
    // A. Case éteinte (compte ordinaire) : ni entrée de menu, ni page.
    renderMenu(); R.menuEteint = /Configuration professionnelle/.test(document.getElementById('sideMenu').innerText);
    navigate('configpro'); await attendre(200); R.pageEteinte = currentPage;
    FEATURES.CONFIG_PRO = true; navigate('configpro'); await attendre(300);
    // B. Le dentiste : après les horaires, l'étape des règles, avec ses valeurs de départ.
    neuf('chirurgien-dentiste'); tcConfigPro121.aller(4); await attendre(30);
    R.d4 = compteur();
    tcConfigPro121.suivant(); await attendre(30);
    R.regles = { compteur: compteur(), etape: _tcConfigProEtape, texte: texte(), cartes: cartes(), rappel: !!document.getElementById('cpRappelMetier141'),
      avance: (document.getElementById('cpAvance148') || {}).value, delai: (document.getElementById('cpDelai148') || {}).value,
      coches: Array.prototype.map.call(corps().querySelectorAll('.cp-regle148 [role=checkbox]'), (x) => x.getAttribute('aria-checked')), pause: !!document.getElementById('cpPause148'), max: !!document.getElementById('cpMax148'),
      gardeAvant: garde().regles148 === undefined };
    debords.push(deborde());
    tcConfigPro121.retour(); await attendre(30); R.retour = [compteur(), _tcConfigProEtape];
    tcConfigPro121.suivant(); await attendre(30); tcConfigPro121.suivant(); await attendre(30);
    R.d6 = [compteur(), _tcConfigProEtape, /Combien de temps dure un rendez-vous/.test(texte())]; R.departs = garde().regles148;
    const totalAvant = (texte().match(/En tout : (\d+) créneau/) || [])[1];
    tcConfigPro121.suivant(); await attendre(30); R.d7 = [compteur(), _tcConfigProEtape];
    // C. Les quatre réglages.
    tcConfigPro121.aller(4.5); await attendre(30);
    tcConfigPro121.avance148('90'); tcConfigPro121.delai148('120'); await attendre(20);
    tcConfigPro121.ajouterJour148(); R.errDate = _tcConfigProErreur;
    tcConfigPro121.brouillon148('date', 0, '2026-12-24'); tcConfigPro121.ajouterJour148(); await attendre(20);
    tcConfigPro121.brouillon148('ferme', 0, 'ouvert'); await attendre(20); R.formOuvert = texte();
    tcConfigPro121.brouillon148('date', 0, '2026-12-26'); tcConfigPro121.brouillon148('matin', 0, '09:00'); tcConfigPro121.brouillon148('matin', 1, '12:00'); tcConfigPro121.brouillon148('apres', 0, '14:00'); tcConfigPro121.brouillon148('apres', 1, '16:00');
    tcConfigPro121.ajouterJour148(); await attendre(20); R.deuxJours = texte();
    tcConfigPro121.brouillon148('date', 0, '2026-12-27'); tcConfigPro121.brouillon148('ferme', 0, 'ouvert'); tcConfigPro121.brouillon148('matin', 0, '12:00'); tcConfigPro121.brouillon148('matin', 1, '09:00');
    tcConfigPro121.ajouterJour148(); R.errHeures = _tcConfigProErreur;
    tcConfigPro121.brouillon148('matin', 0, ''); tcConfigPro121.brouillon148('matin', 1, ''); tcConfigPro121.brouillon148('apres', 0, ''); tcConfigPro121.brouillon148('apres', 1, '');
    tcConfigPro121.ajouterJour148(); R.errVide = _tcConfigProErreur;
    tcConfigPro121.brouillon148('date', 0, '2026-12-24'); tcConfigPro121.brouillon148('matin', 0, '09:00'); tcConfigPro121.brouillon148('matin', 1, '12:00');
    tcConfigPro121.ajouterJour148(); await attendre(20); R.remplace = garde().regles148.jours;
    tcConfigPro121.retirerJour148('2026-12-26'); await attendre(20);
    tcConfigPro121.pause148(); await attendre(20); R.pauseDepart = garde().regles148.pause; R.pauseChamp = !!document.getElementById('cpPause148');
    tcConfigPro121.pauseDuree148('15'); tcConfigPro121.pauseDuree148('7'); await attendre(20);
    tcConfigPro121.max148(); await attendre(20); R.maxDepart = garde().regles148.max;
    tcConfigPro121.maxNombre148('80'); R.max80 = garde().regles148.max; tcConfigPro121.maxNombre148('0'); R.max0 = garde().regles148.max;
    tcConfigPro121.maxNombre148('12'); await attendre(20);
    R.regles2 = garde().regles148; R.texte2 = texte(); debords.push(deborde());
    tcConfigPro121.aller(5); await attendre(30);
    R.totalApres = [(texte().match(/En tout : (\d+) créneau/) || [])[1], totalAvant];
    tcConfigPro121.aller(7); await attendre(30); R.recap = texte(); debords.push(deborde());
    const mod = document.querySelector('#cpRecapRegles148 button'); if (mod) { mod.click(); await attendre(30); } R.modifier = [compteur(), _tcConfigProEtape];
    // D. Chaque métier garde ses règles.
    // (Un métier jamais configuré part de la configuration en cours, comme ses jours et ses horaires : mission 139.)
    tcConfigPro121.aller(1); tcConfigPro121.choisirMetier('coiffeur'); await attendre(20); R.coiffeur = tcCpRegles148(tcConfigProLire());
    tcConfigPro121.aller(4.5); await attendre(20); R.coiffeurCompteur = compteur();
    tcConfigPro121.avance148('30'); tcConfigPro121.max148(); await attendre(20);
    tcConfigPro121.aller(1); tcConfigPro121.choisirMetier('chirurgien-dentiste'); await attendre(20); R.dentisteRevenu = tcConfigProLire().regles148;
    tcConfigPro121.aller(1); tcConfigPro121.choisirMetier('coiffeur'); await attendre(20); R.coiffeurRevenu = tcConfigProLire().regles148;
    tcConfigPro121.aller(1); tcConfigPro121.choisirMetier('chirurgien-dentiste'); await attendre(20);
    // E. « Voir tous les métiers » : changer une règle en regardant n'enregistre rien.
    const g = garde(); g.termine = true; localStorage.setItem('tc_config_pro', JSON.stringify(g)); const AVANT = brut();
    _tcConfigPro = null; tcOuvrirConfigPro121(); await attendre(20);
    tcConfigPro121.tousMetiers(); tcConfigPro121.choisirMetier('avocat'); tcConfigPro121.aller(4.5); await attendre(20);
    R.avocat = [compteur(), /Vos règles de réservation/.test(texte())];
    tcConfigPro121.avance148('7'); tcConfigPro121.pause148(); await attendre(20);
    R.regard = brut() === AVANT;
    tcConfigPro121.retourConfig(); await attendre(20); R.retourConfig = [brut() === AVANT, /^Votre configuration/.test(texte())];
    // F. Les autres métiers : un générique (sept étapes), la mairie (six, sans prix).
    neuf('osteopathe'); tcConfigPro121.aller(4.5); await attendre(20); R.osteo = [compteur(), /Votre métier\s*:\s*Ostéopathe/.test(texte())];
    // Examen de la 148 : une date passée est refusée ; aujourd'hui est accepté ; une journée passée déjà enregistrée reste, marquée.
    const n0 = new Date(), hier = tcISO(new Date(n0.getFullYear(), n0.getMonth(), n0.getDate() - 1)), auj = tcISO(n0);
    R.min = [(document.getElementById('cpDate148') || { getAttribute: () => null }).getAttribute('min'), auj];
    tcConfigPro121.brouillon148('date', 0, hier); tcConfigPro121.ajouterJour148(); await attendre(20);
    R.hier = [_tcConfigProErreur, (garde().regles148 || {}).jours === undefined || garde().regles148.jours.length === 0];
    tcConfigPro121.brouillon148('date', 0, '2020-01-15'); tcConfigPro121.ajouterJour148(); R.annee = _tcConfigProErreur;
    tcConfigPro121.brouillon148('date', 0, auj); tcConfigPro121.ajouterJour148(); await attendre(20);
    R.auj = [_tcConfigProErreur, garde().regles148.jours.map((j) => j.date)];
    const ro = tcCpReglesEcrire148(tcConfigProLire()); ro.jours = [{ date: hier, ferme: true }].concat(ro.jours); tcRendreConfigPro121(); await attendre(20);
    R.passee = [/\(date passée\)/.test(texte()), tcCpRegles148(tcConfigProLire()).jours.length];
    tcConfigPro121.aller(7); await attendre(20); R.passeeRecap = /\(date passée\)/.test(texte());
    neuf('mairie'); tcConfigPro121.aller(4.5); await attendre(20); R.mairie = compteur(); tcConfigPro121.retour(); await attendre(20); R.mairieRetour = [compteur(), _tcConfigProEtape];
    R.sousTitre = (document.querySelector('#page-configpro .page-subtitle') || {}).innerText || '';
    R.appels = appels; R.debords = debords;
  } catch (x) { R.erreur = String(x && x.stack || x); }
  const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
}

const jouer = (largeur) => {
  const js = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + parcours.toString() + ')(); }, 1200); });</script>';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-148-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + largeur + ',900', '--virtual-time-budget=30000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 27 });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  try { return m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : { erreur: (r.stdout || '').slice(-300) }; } catch (e) { return { erreur: String(e) }; }
};

console.log('-- Dans la page (Chrome), 390 px et 1280 px --');
const S = jouer(390), P = jouer(1280);
if (S.erreur || P.erreur) verifie('la page a rejoué le parcours', false, S.erreur || P.erreur);
else {
  verifie('case éteinte (compte ordinaire) : ni entrée de menu, ni page', S.menuEteint === false && S.pageEteinte !== 'configpro', J([S.menuEteint, S.pageEteinte]));
  const G = S.regles;
  verifie('le dentiste : les horaires « Étape 4 sur 7 », puis « Vos règles de réservation » en « Étape 5 sur 7 », avec « Votre métier : … » en haut',
    S.d4 === '4/7' && G.compteur === '5/7' && G.etape === 4.5 && /Vos règles de réservation/.test(G.texte) && G.rappel && /Votre métier\s*:\s*Chirurgien-dentiste/.test(G.texte), J([S.d4, G.compteur, G.etape, G.rappel]));
  verifie('quatre cartes, chacune avec son titre et une seule phrase d’explication, simple', J(G.cartes.map((c) => c.titre)) === J(['Jusqu’à quand peut-on réserver ?', 'Une journée avec des horaires différents', 'Une pause entre deux rendez-vous', 'Un nombre maximum de rendez-vous par jour'])
    && G.cartes.every((c) => /\.$/.test(c.phrase) && (c.phrase.match(/[.!?]/g) || []).length === 1 && c.phrase.length <= 110), J(G.cartes));
  verifie('valeurs de départ : au plus tôt 60 jours avant, au plus tard 1 heure avant ; aucune journée ; pas de pause ; pas de limite (cases décochées) ; rien d’écrit avant « Suivant »',
    G.avance === '60' && G.delai === '60' && /Aucune journée pour l’instant\./.test(G.texte) && J(G.coches) === J(['false', 'false']) && !G.pause && !G.max && G.gardeAvant
    && /Au plus tôt\s*7 jours[\s\S]*60 jours[\s\S]*avant le rendez-vous\./.test(G.texte) && /Au plus tard[\s\S]*1 heure[\s\S]*avant le rendez-vous\./.test(G.texte), J([G.avance, G.delai, G.coches, G.gardeAvant]));
  verifie('« ← Retour » revient aux horaires (4 sur 7) ; « Suivant » mène à la durée (6 sur 7), puis à la fiche (7 sur 7) ; les valeurs de départ sont enregistrées',
    J(S.retour) === J(['4/7', 4]) && J(S.d6) === J(['6/7', 5, true]) && J(S.d7) === J(['7/7', 6]) && J(S.departs) === J({ avance: 60, delai: 60, jours: [], pause: 0, max: 0 }), J([S.retour, S.d6, S.d7, S.departs]));
  verifie('une journée sans date : « Choisissez une date. » ; des horaires à l’envers ou vides : « Vérifiez les horaires : la fin doit venir après le début. »',
    S.errDate === 'Choisissez une date.' && S.errHeures === 'Vérifiez les horaires : la fin doit venir après le début.' && S.errVide === S.errHeures, J([S.errDate, S.errHeures, S.errVide]));
  verifie('« Avec ces horaires » : le matin et l’après-midi à remplir ; la liste : « jeudi 24 décembre 2026 : fermé », « samedi 26 décembre 2026 : 9h à 12h, puis 14h à 16h », chacune avec « Retirer »',
    /Le matin/.test(S.formOuvert) && /L’après-midi/.test(S.formOuvert) && /jeudi 24 décembre 2026 : fermé/.test(S.deuxJours) && /samedi 26 décembre 2026 : 9h à 12h, puis 14h à 16h/.test(S.deuxJours) && (S.deuxJours.match(/Retirer/g) || []).length === 2, S.deuxJours.slice(0, 600));
  verifie('la même date à nouveau la remplace (une seule ligne) ; « Retirer » l’enlève', J(S.remplace) === J([{ date: '2026-12-24', matin: ['09:00', '12:00'], apres: ['', ''] }, { date: '2026-12-26', matin: ['09:00', '12:00'], apres: ['14:00', '16:00'] }]) && S.regles2.jours.length === 1, J([S.remplace, S.regles2.jours]));
  verifie('la pause : cochée, 10 minutes au départ, puis 15 (une durée hors liste est refusée) ; le maximum : coché, 8 au départ, puis 12 (borné de 1 à 50)',
    S.pauseDepart === 10 && S.pauseChamp && S.regles2.pause === 15 && S.maxDepart === 8 && S.max80 === 50 && S.max0 === 1 && S.regles2.max === 12, J([S.pauseDepart, S.regles2.pause, S.maxDepart, S.max80, S.max0, S.regles2.max]));
  verifie('enregistré dans tc_config_pro : { avance: 90, delai: 120, jours: [24/12, 9h à 12h], pause: 15, max: 12 }', J(S.regles2) === J({ avance: 90, delai: 120, jours: [{ date: '2026-12-24', matin: ['09:00', '12:00'], apres: ['', ''] }], pause: 15, max: 12 }), J(S.regles2));
  verifie('ces règles ne changent encore aucune prise de rendez-vous : les créneaux de l’étape d’après restent les mêmes (pause et maximum compris)', S.totalApres[0] && S.totalApres[0] === S.totalApres[1], J(S.totalApres));
  verifie('récapitulatif : « Vos règles de réservation » : au plus tôt 90 jours, au plus tard 2 heures, la journée, la pause, le maximum ; « ✏️ Modifier » ramène à l’étape (5 sur 7)',
    /Vos règles de réservation/.test(S.recap) && /On peut réserver au plus tôt 90 jours avant le rendez-vous, et au plus tard 2 heures avant\./.test(S.recap) && /jeudi 24 décembre 2026 : 9h à 12h/.test(S.recap)
    && /Une pause de 15 minutes entre deux rendez-vous\./.test(S.recap) && /Au plus 12 rendez-vous par jour\./.test(S.recap) && J(S.modifier) === J(['5/7', 4.5]), J([S.recap.slice(S.recap.indexOf('Vos règles'), S.recap.indexOf('Vos règles') + 400), S.modifier]));
  verifie('chaque métier garde ses règles : le coiffeur (« Étape 5 sur 7 ») part de celles en cours, comme ses jours ; changées, elles sont à lui ; revenir au dentiste rend les siennes, puis au coiffeur les siennes',
    J(S.coiffeur) === J(S.regles2) && S.coiffeurCompteur === '5/7' && J(S.dentisteRevenu) === J(S.regles2) && S.coiffeurRevenu && S.coiffeurRevenu.avance === 30 && S.coiffeurRevenu.max === 0
    && S.regles2.max === 12, J([S.coiffeur, S.coiffeurCompteur, S.dentisteRevenu, S.coiffeurRevenu]));
  verifie('« Voir tous les métiers » : l’avocat a l’étape (5 sur 7) ; changer ses règles en regardant n’enregistre rien ; « Retour à ma configuration » : tout tel quel',
    J(S.avocat) === J(['5/7', true]) && S.regard && J(S.retourConfig) === J([true, true]), J([S.avocat, S.regard, S.retourConfig]));
  verifie('tous les métiers : l’ostéopathe (« Étape 5 sur 7 », « Votre métier : Ostéopathe »), la mairie sans étape des prix (« Étape 4 sur 6 », « ← Retour » : ses jours, 3 sur 6)',
    J(S.osteo) === J(['5/7', true]) && S.mairie === '4/6' && J(S.mairieRetour) === J(['3/6', 4]), J([S.osteo, S.mairie, S.mairieRetour]));
  verifie('examen : une date passée (hier, une faute d’année) : « Choisissez une date à venir. », rien d’enregistré ; aujourd’hui : accepté ; le calendrier commence aujourd’hui',
    J(S.hier) === J(['Choisissez une date à venir.', true]) && S.annee === 'Choisissez une date à venir.' && S.auj[0] === '' && J(S.auj[1]) === J([S.min[1]]) && S.min[0] === S.min[1], J([S.hier, S.annee, S.auj, S.min]));
  verifie('examen : une journée passée déjà enregistrée reste (rien n’est effacé seul), marquée « (date passée) » à l’étape et au récapitulatif', S.passee[0] && S.passee[1] === 2 && S.passeeRecap, J([S.passee, S.passeeRecap]));
  verifie('le sous-titre de la page ne compte plus les étapes (six ou sept selon le métier) : « Votre agenda professionnel et votre fiche, étape par étape. »', S.sousTitre === 'Votre agenda professionnel et votre fiche, étape par étape.', S.sousTitre);
  verifie('aucun appel réseau', S.appels === 0 && P.appels === 0, J([S.appels, P.appels]));
  verifie('aucun débordement sur le côté, à 390 px et à 1280 px (l’étape, ses horaires ouverts, le récapitulatif)', S.debords.concat(P.debords).every((x) => x <= 0), J([S.debords, P.debords]));
}
if (!ok && !ko) { console.log('NON JOUÉ : 0 vérification'); process.exit(1); }
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
