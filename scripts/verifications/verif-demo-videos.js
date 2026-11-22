// Démonstration « Valérie », les 12 vidéos (Charles, 22/11/2026) : chaque phrase de la liste se joue dans la démonstration,
// dans l'ordre de Charles, et montre ce que la vidéo doit filmer. Rien ne sort (aucun appel réseau, aucun lien ouvert), rien
// n'est écrit sur l'appareil. Le vrai parcours dans Chrome, sans réseau, sur un compte d'essai ; une démonstration neuve par vidéo.
// Usage : node verif-demo-videos.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 700) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
}

const NB = '\u00a0';
const PHRASES = ['Je suis malade, décale ma journée de demain', 'Je suis en retard de 10 minutes, préviens tout le monde', 'Organise un dîner entre copines avec Emma, Léa et Inès',
  'Note un cours de piano avec Clara mercredi à 17h', 'Envoie trois créneaux à Julien pour un déjeuner', 'Dis à Sophie que je l’appelle mardi soir',
  'Comment je vais chez le dentiste mardi' + NB + '?', 'Montre-moi mes disponibilités', 'Qui m’a demandé un rendez-vous' + NB + '?', 'Invite ma voisine Jeanne sur TimeCool',
  'Qu’est-ce que tu as le droit de faire' + NB + '?', 'C’est gratuit' + NB + '?'];

/** Dans la page : les 12 vidéos, chacune dans une démonstration neuve. */
async function dansLaPage(D) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const fin = (res) => { const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  const R = { videos: {} };
  const plat = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const depuis = (n0) => charlyIA.history.slice(n0).map((m) => ({ r: m.role, c: plat(m.content), k: Object.keys(m).filter((k) => k.charAt(0) === '_' && m[k]).join(',') }));
  const ouvrir = async () => {
    if (tcDemoActive()) { tcQuitterDemo({ sansRetour: true }); await attendre(400); }
    navigate('assistant'); await attendre(200);
    await tcDemanderAccordDemo(); await tcRepondreAccordDemo(true); await attendre(1200);
    TC_ATTENTE_DUREES.demo = 200; TC_ATTENTE_DUREES.feuilles = 200; TC_ATTENTE_DUREES.consulte = 200;
  };
  const dire = async (t) => { const i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(5000); };
  const toucher = async (t) => { const b = Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter((x) => !x.disabled && x.textContent.indexOf(t) > -1).pop(); if (!b) return false; b.click(); await attendre(5000); return true; };
  const boutons = () => Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).map((b) => b.textContent.trim());
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    if (typeof hideAuthFlow === 'function') hideAuthFlow();
    const href = location.href;
    await ouvrir();
    R.phrases = Array.prototype.slice.call(document.querySelectorAll('.tc-demo-phrase')).map((b) => b.textContent.trim());
    // 1. Malade.
    let n0 = charlyIA.history.length;
    await dire('Je suis malade, décale ma journée de demain'); const m1 = depuis(n0);
    await toucher('Oui, envoie');
    R.videos.malade = { avant: m1, apres: depuis(n0) };
    // 2. Retard.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Je suis en retard de 10 minutes, préviens tout le monde'); const m2 = depuis(n0);
    await toucher('Oui, envoie-leur');
    R.videos.retard = { avant: m2, apres: depuis(n0), noms: charlyIA.history.slice(n0).filter((m) => m._tiers).map((m) => m._tiers.prenom) };
    // 3. Dîner entre copines.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Organise un dîner entre copines avec Emma, Léa et Inès');
    const m3 = depuis(n0);
    await toucher('En personne');
    const g = charlyIA.history.filter((m) => m._groupe).pop();
    R.videos.copines = { avant: m3, creneaux: g && g._groupe && Array.isArray(g._groupe.creneaux) ? g._groupe.creneaux.length : 0 };
    // 4. Je parle, Charly note.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Note un cours de piano avec Clara mercredi à 17h');
    R.videos.note = { apres: depuis(n0) };
    // 5. Trois créneaux.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Envoie trois créneaux à Julien pour un déjeuner'); await attendre(3000);
    R.videos.creneaux = { apres: depuis(n0), rdv: events.filter((e) => e.exemple && e.title === 'Déjeuner avec Julien' && /^demo_v_julien_/.test(e.id)).length };
    // 6. En anglais à Sophie.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Dis à Sophie que je l’appelle mardi soir'); await dire('oui'); await attendre(3000);
    R.videos.anglais = { apres: depuis(n0) };
    // 7. Y aller.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Comment je vais chez le dentiste mardi ?');
    R.videos.trajet = { apres: depuis(n0), boutons: boutons() };
    // 8. Les disponibilités, puis leur page (la démonstration reste ouverte).
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Montre-moi mes disponibilités');
    const b8 = boutons();
    await toucher('Ouvrir mes disponibilités'); await attendre(500);
    loadDispo();
    R.videos.dispos = { apres: depuis(n0), boutons: b8, page: currentPage, demo: tcDemoActive(), dispo: JSON.stringify(_dispoData && _dispoData.travail) };
    navigate('assistant'); await attendre(300);
    // 9. Les demandes reçues, puis la messagerie.
    n0 = charlyIA.history.length;
    await dire('Qui m’a demandé un rendez-vous ?');
    navigate('messages'); await attendre(500);
    R.videos.demandes = { apres: depuis(n0), page: currentPage, demo: tcDemoActive(), liste: (document.getElementById('page-messages') || document.body).innerText.indexOf('Bastien Morel') > -1 };
    navigate('assistant'); await attendre(300);
    // 10. L'invitation à Jeanne.
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Invite ma voisine Jeanne sur TimeCool'); await attendre(3000);
    const jeanne = contactsList.find((c) => c.id === 'demo_v_jeanne');
    R.videos.inviter = { apres: depuis(n0), inscrite: !!(jeanne && jeanne.isTimeCool) };
    // 11. La confiance, puis les paramètres (la démonstration reste ouverte).
    await ouvrir(); n0 = charlyIA.history.length;
    await dire('Qu’est-ce que tu as le droit de faire ?');
    const b11 = boutons();
    await toucher('Ouvrir les paramètres'); await attendre(500);
    R.videos.confiance = { apres: depuis(n0), boutons: b11, page: currentPage, demo: tcDemoActive() };
    navigate('assistant'); await attendre(300);
    // 12. Gratuit.
    n0 = charlyIA.history.length;
    await dire('C’est gratuit ?');
    R.videos.gratuit = { apres: depuis(n0), boutons: boutons() };
    // Rien n'est sorti, rien n'est resté.
    tcQuitterDemo({ sansRetour: true }); await attendre(400);
    let traces = 0; for (let i = 0; i < localStorage.length; i++) { const v = localStorage.getItem(localStorage.key(i)) || ''; if (/demo_v_|DEMO-V-|"exemple":true/.test(v)) traces++; }
    R.fin = { appels: window.__appels, href: location.href === href, traces: traces, erreurs: window.__erreurs };
    fin(R);
  } catch (e) { fin({ erreur: String(e && e.stack || e), R }); }
}

function jouer(largeur) {
  const compte = JSON.stringify({ firstname: 'Valérie', lastname: 'Essai', email: 'valerie.essai.videos@exemple-timecool.fr', reference: 'REFESSAIVIDEOS' });
  const tete = '<script>(function () { window.__appels = 0; window.__erreurs = [];'
    + ' window.addEventListener("error", function (e) { window.__erreurs.push(String(e && e.message)); });'
    + ' window.fetch = function () { window.__appels++; return Promise.reject(new Error("hors ligne")); };'
    + ' try { localStorage.clear(); localStorage.setItem("timecool_user_account", ' + JSON.stringify(compte) + '); localStorage.setItem("timecool_session_active", "true");'
    + ' localStorage.setItem("tc_onboarding_done", "1"); localStorage.setItem("tc_permissions_shown", "1"); } catch (e) {}'
    + ' })();</script>';
  // Les appels d'avant l'ouverture (chargement, synchronisation) ne comptent pas : remis à zéro juste avant la première démonstration.
  const corpsJs = '<script>window.addEventListener("load", function () { setTimeout(function () { window.__appels = 0; (' + dansLaPage.toString() + ')({}); }, 1500); });</script>';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-videos-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + tete).replace('</body>', () => corpsJs + '</body>'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'),
    '--hide-scrollbars', '--window-size=' + largeur + ',900', '--virtual-time-budget=240000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')];
  const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&nbsp;/g, '\u00a0').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  if (process.env.TC_VOIR) console.log(largeur, JSON.stringify(res, null, 1));
  return res || { erreur: 'Chrome n a rien rendu (code ' + r.status + ' ' + (r.signal || '') + ', ' + String(r.stdout || '').length + ' caractères)' };
}

const tout = (l) => (l || []).map((m) => m.c).join(' | ');
const tiers = (l) => (l || []).filter((m) => m.r === 'tiers').map((m) => m.c);

const T = jouer(390);
if (T.erreur || !T.videos) {
  verifie('Chrome a joué les 12 vidéos', false, T.erreur || JSON.stringify(T.R || T).slice(0, 700));
} else {
  const V = T.videos;
  titre('0. La liste');
  verifie('les 12 phrases, une par vidéo, dans l’ordre de Charles', JSON.stringify(T.phrases.map((x) => x.replace(/^«[\s\u00a0]/, '').replace(/[\s\u00a0]»$/, ''))) === JSON.stringify(PHRASES), T.phrases.join(' | '));
  titre('1 à 4. Le vrai moteur de Charly');
  verifie('1. malade : la journée de demain décalée, les messages préparés ; « Oui, envoie » : c’est fait, les contacts répondent',
    /Tu es malade\. Je déplace \d+ rendez-vous/.test(tout(V.malade.avant)) && /C’est fait/.test(tout(V.malade.apres)) && tiers(V.malade.apres).length >= 1, tout(V.malade.apres));
  verifie('2. retard : Emma, le restaurant Chez Marguerite (et Sophie) prévenus ; ils répondent, Sophie en anglais',
    /Je préviens \d+ personnes de ton retard/.test(tout(V.retard.avant)) && /Emma Leroy, Chez Marguerite/.test(tout(V.retard.avant))
    && tiers(V.retard.apres).some((t) => /Pas de souci/.test(t)) && tiers(V.retard.apres).some((t) => /No worries/.test(t)), tout(V.retard.apres));
  verifie('2. chef : le restaurant répond comme un commerce, au vouvoiement, sous son nom entier ; puis la route jusqu’à lui et « Y aller »',
    tiers(V.retard.apres).some((t) => /^C’est noté, nous gardons votre table\.$/.test(t)) && V.retard.noms.indexOf('Chez Marguerite') > -1 && V.retard.noms.indexOf('Chez') < 0
    && /Pour y aller\s*: Chez Marguerite, 9 rue Montorgueil, 75002 Paris, à 10 minutes à pied de chez toi\./.test(tout(V.retard.apres)), JSON.stringify(V.retard.noms) + ' ' + tout(V.retard.apres));
  verifie('1. chef : le patron (vouvoyé) choisit son créneau à sa façon', tiers(V.malade.apres).some((t) => /^Très bien, .* me convient\.$/.test(t)), tiers(V.malade.apres).join(' | '));
  verifie('3. dîner entre copines : la question du type, puis des créneaux communs', /Par téléphone, en personne ou en visio/.test(tout(V.copines.avant)) && V.copines.creneaux >= 1, tout(V.copines.avant) + ' / ' + V.copines.creneaux);
  verifie('4. Charly note : le cours de piano, chez Clara (son adresse)', /Cours piano avec Clara/.test(tout(V.note.apres)) && /64 rue de Sèvres, 75007 Paris/.test(tout(V.note.apres)), tout(V.note.apres));
  titre('5 à 12. Les scènes de la démonstration');
  verifie('5. trois créneaux à Julien, selon tes préférences et tes disponibilités enregistrées ; il choisit ; c’est dans l’agenda',
    /Je propose à Julien trois créneaux pour déjeuner, selon tes préférences et tes disponibilités enregistrées/.test(tout(V.creneaux.apres)) && (tout(V.creneaux.apres).match(/• \S+ \d+ \S+ à \d+h/g) || []).length === 3
    && tiers(V.creneaux.apres).length === 1 && /Julien a choisi .* C’est dans ton agenda\./.test(tout(V.creneaux.apres)) && V.creneaux.rdv === 1, tout(V.creneaux.apres) + ' / ' + V.creneaux.rdv);
  verifie('6. Sophie : le message part dans sa langue, elle répond en anglais, Charly traduit', /C’est envoyé à Sophie Carter/.test(tout(V.anglais.apres))
    && tiers(V.anglais.apres).some((t) => /Great, talk to you on Tuesday/.test(t)) && /Hi Sophie, Valérie asked me to tell you that you’ll get a call on Tuesday evening\./.test(tout(V.anglais.apres)) && /Super, à mardi/.test(tout(V.anglais.apres)), tout(V.anglais.apres));
  verifie('7. le trajet jusqu’au dentiste, depuis chez Valérie, l’heure de départ, « Y aller »', /Dentiste, Dr Fontaine/.test(tout(V.trajet.apres)) && /27 rue de Turbigo/.test(tout(V.trajet.apres))
    && /rue de Rivoli/.test(tout(V.trajet.apres)) && /Pars à \d+h\d\d/.test(tout(V.trajet.apres)) && V.trajet.boutons.some((b) => /Y aller/.test(b)), tout(V.trajet.apres));
  verifie('8. les disponibilités par catégorie et le temps libre protégé ; leur page s’ouvre, dans la démonstration', /Mon travail.*Ma santé.*Ma famille.*Mes amis et loisirs.*Mon sport.*temps libre est protégé/.test(tout(V.dispos.apres))
    && V.dispos.page === 'dispo' && V.dispos.demo === true && /"09:00"/.test(V.dispos.dispo), JSON.stringify([V.dispos.page, V.dispos.demo, V.dispos.dispo]) + ' ' + tout(V.dispos.apres));
  verifie('9. les deux demandes reçues (Maman, un inconnu) ; la messagerie s’ouvre, dans la démonstration', /2 demandes de rendez-vous en attente\s*: Monique Roux .*Bastien Morel/.test(tout(V.demandes.apres))
    && V.demandes.page === 'messages' && V.demandes.demo === true && V.demandes.liste === true, JSON.stringify([V.demandes.page, V.demandes.demo, V.demandes.liste]) + ' ' + tout(V.demandes.apres));
  verifie('10. l’invitation à Jeanne (le texte de Charles) ; elle s’inscrit', /Jeanne n’a pas encore TimeCool/.test(tout(V.inviter.apres)) && /Salut Jeanne/.test(tout(V.inviter.apres))
    && tiers(V.inviter.apres).some((t) => /je viens de m’inscrire/.test(t)) && /Jeanne est maintenant sur TimeCool/.test(tout(V.inviter.apres)) && V.inviter.inscrite === true, tout(V.inviter.apres));
  verifie('11. les trois niveaux de confiance, le niveau choisi ; les paramètres s’ouvrent, dans la démonstration', /1\. Charly attend ma validation.*2\. Charly réalise toutes les étapes.*3\. Charly valide seul/.test(tout(V.confiance.apres))
    && /c’est le niveau 1/.test(tout(V.confiance.apres)) && V.confiance.page === 'settings' && V.confiance.demo === true, JSON.stringify([V.confiance.page, V.confiance.demo]) + ' ' + tout(V.confiance.apres));
  verifie('12. gratuit, sans publicité et sans cookie ; Maya ; l’installation', /TimeCool est gratuit, sans publicité et sans cookie/.test(tout(V.gratuit.apres)) && /Maya/.test(tout(V.gratuit.apres))
    && V.gratuit.boutons.some((b) => /Parler à Maya/.test(b)), tout(V.gratuit.apres));
  titre('Rien ne sort, rien ne reste');
  verifie('aucun appel réseau, aucun lien ouvert (SMS, e-mail, GPS) pendant les 12 vidéos', T.fin.appels === 0 && T.fin.href === true, JSON.stringify(T.fin));
  verifie('après « Tout supprimer » : aucune trace sur l’appareil', T.fin.traces === 0, T.fin.traces);
  verifie('aucune erreur dans la page', !T.fin.erreurs.length, T.fin.erreurs.join(' | '));
}
verifie('« sans cookie » est vrai : l’appli n’écrit aucun cookie et ne charge aucun traceur', !/document\.cookie|googletagmanager|google-analytics|gtag\(|fbq\(|hotjar/.test(page));

titre('Le prénom seul (chef, 22/11) : un commerce garde son nom, un docteur devient « Dr Fontaine »');
{
  const vm = require('vm');
  const corps = (nom) => { const d = page.indexOf('function ' + nom + '('); if (d < 0) return ''; let n = 0; for (let j = page.indexOf('{', d); j < page.length; j++) { if (page[j] === '{') n++; else if (page[j] === '}' && --n === 0) return page.slice(d, j + 1); } return ''; };
  const ctx = vm.createContext({});
  vm.runInContext(['tcPrenomOuNom', 'tcPrenomPresentable', 'tcValeursDuRdv', 'tcAttentePrenoms', 'tcTiers120'].map(corps).join('\n'), ctx);
  const f = (s) => vm.runInContext(s, ctx);
  const cas = [['Chez Marguerite', 'Chez Marguerite'], ['Le Comptoir Bleu', 'Le Comptoir Bleu'], ['La Table de Lison', 'La Table de Lison'], ['Salon Nicolas Durand', 'Salon Nicolas Durand'],
    ['Dr Claire Fontaine', 'Dr Fontaine'], ['Emma Leroy', 'Emma'], ['Léa Marchand', 'Léa'], ['Lucas', 'Lucas']];
  const faux = cas.filter(([n, a]) => f('tcPrenomOuNom(' + JSON.stringify(n) + ')') !== a);
  // Examen : tcPrenomPresentable ne change pas (il décide aussi de l'invitation amicale : jamais pour un docteur).
  verifie('tcPrenomPresentable ne change pas : le premier mot (« Dr », « Chez »), comme avant', f("tcPrenomPresentable('Dr Martin')") === 'Dr' && f("tcPrenomPresentable('JEAN-LUC DUPONT')") === 'Jean-Luc'
    && corps('tcPrenomPresentable').indexOf('tcPrenomOuNom') < 0);
  verifie('dans un message (« Bonjour … »), la bulle d’attente et la bulle de réponse', !faux.length
    && f("tcValeursDuRdv('Chez Marguerite')['[Prénom]']") === 'Chez Marguerite' && f("tcAttentePrenoms(['Emma Leroy', 'Chez Marguerite'])") === 'Emma et Chez Marguerite'
    && f("tcTiers120('Dr Claire Fontaine').prenom") === 'Dr Fontaine' && f("tcTiers120('Emma Leroy').prenom") === 'Emma', JSON.stringify(faux));
}

console.log('');
console.log(ko ? ko + ' anomalie(s) sur ' + (ok + ko) + ' vérifications.' : 'OK : ' + ok + ' vérifications.');
process.exit(ko ? 1 : 0);
