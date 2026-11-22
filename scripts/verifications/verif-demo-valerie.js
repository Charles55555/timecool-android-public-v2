// Démonstration « Valérie » (Charles, 22/11/2026), socle : la démonstration de Charly IA montre tout, avec des données
// inventées et cohérentes, dans le bac à sable de la 107 (rien n'est écrit pendant la démonstration, rien ne sort).
// - « Voir la démonstration » : Charly demande d'abord l'accord (texte exact) : « C'est parti » · « Pas maintenant ».
// - 25 contacts complets (20 avec TimeCool), la semaine en cours et la suivante, un rendez-vous dans l'heure, les
//   disponibilités d'exemple, deux demandes dans la messagerie (Maman, un inconnu) ; le mot « Exemple » partout.
// - « Stopper la démo » : « Tout supprimer » (aucune trace, ses réglages intacts) ou « Garder les exemples » (sur cet appareil
//   seulement : ni serveur, ni appairage, ni rappel, et rien ne leur est jamais envoyé) ; « Supprimer les exemples ».
// Le vrai parcours dans Chrome, sans réseau, sur un compte d'essai.
// Usage : node verif-demo-valerie.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 600) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
}

const NB = '\u00a0';
const ACCORD = 'Je te montre tout ce que je sais faire' + NB + '? Pour ça, j’ai besoin de ton accord pour' + NB + ':\n1. ajouter 25 contacts inventés' + NB + ';\n2. remplir ton agenda d’une semaine de rendez-vous inventés, pour simuler différentes actions' + NB + ';\n3. simuler le paramétrage de tes disponibilités en fonction de tes contacts.\nPas d’inquiétude' + NB + ': tes vrais contacts et tes vrais rendez-vous ne bougent pas. Quand tu arrêtes la démo, tout peut disparaître d’un seul geste.';
const QUESTION = 'Tu veux que je supprime tout, ou tu préfères garder ces exemples pour t’en inspirer' + NB + '? De toute façon, tu pourras les supprimer quand tu voudras.';

/** Dans la page : le parcours complet. */
async function dansLaPage(D) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const fin = (res) => { const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  const R = {};
  const choix = () => Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody .tc-demo-choix button')).map((b) => b.textContent.trim());
  const toucher = (re) => { const b = Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody .tc-demo-choix button')).find((x) => re.test(x.textContent)); if (!b) throw new Error('bouton absent : ' + re); b.click(); };
  const traces = () => { let n = 0; for (let i = 0; i < localStorage.length; i++) { const v = localStorage.getItem(localStorage.key(i)) || ''; if (/demo_v_|DEMO-V-|"exemple":true/.test(v)) n++; } return n; };
  const dernier = () => (charlyIA.history[charlyIA.history.length - 1] || {}).content || '';
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    if (typeof hideAuthFlow === 'function') hideAuthFlow();
    // Le téléphone : ses rappels sont notés ici (aucun ne doit viser un exemple).
    window.__rappels = [];
    window.TimeCoolNatif = Object.assign(window.TimeCoolNatif || {}, { programmerRappels: function (j) { try { window.__rappels.push(JSON.parse(j)); } catch (e) { window.__rappels.push(j); } } });
    events.push({ id: 'vrai_rdv_1', mode: 'user', date: tcISO(new Date()), startH: 7, startM: 0, endH: 7, endM: 30, title: 'Vrai rendez-vous', cat: 'perso' });
    navigate('assistant'); await attendre(400);
    R.avant = { contacts: contactsList.map((c) => c.id), dispo: localStorage.getItem('timecool_disponibilites'), validation: localStorage.getItem('tc_rdv_validation') };
    // 1. L'accord.
    document.getElementById('tcBoutonDemo').click(); await attendre(600);
    R.accord = { demo: tcDemoActive(), texte: dernier(), choix: choix() };
    toucher(/Pas maintenant/); await attendre(300);
    R.plusTard = { demo: tcDemoActive(), texte: dernier(), choix: choix() };
    tcDemanderAccordDemo(); await attendre(600);
    toucher(/parti/); await attendre(1500);
    // 2. Dedans.
    loadDispo();
    const maintenant = Date.now();
    const bientot = events.find((e) => e.id === 'demo_v_bientot');
    const debutBientot = bientot ? new Date(bientot.date + 'T' + String(bientot.startH).padStart(2, '0') + ':' + String(bientot.startM).padStart(2, '0') + ':00').getTime() : 0;
    const lundi = new Date(); lundi.setHours(0, 0, 0, 0); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
    const dimancheSuivant = new Date(lundi); dimancheSuivant.setDate(lundi.getDate() + 13);
    const ex = events.filter((e) => e.id !== 'demo_v_bientot');
    R.dedans = {
      demo: tcDemoActive(), valerie: !!_tcDemo.valerie, bandeau: (document.querySelector('#tcDemoBandeau button') || {}).textContent,
      contacts: contactsList.length, avecTC: contactsList.filter((c) => c.isTimeCool && c.referenceCompte).length,
      fiches: contactsList.filter((c) => c.exemple && /^06 39 98 10 \d\d$/.test(c.phone) && /^[a-z.]+@exemple-timecool\.fr$/.test(c.email) && c.address && c.categories.length === 1
        && typeof c.vouvoie === 'boolean' && c.firstname).length,
      noms: contactsList.map((c) => c.name),
      langues: contactsList.filter((c) => c.langue).map((c) => c.name + ':' + c.langue),
      vous: contactsList.filter((c) => c.vouvoie).map((c) => c.name),
      events: events.length, evExemple: events.filter((e) => e.exemple && /^demo_v_/.test(e.id)).length,
      premier: ex.length ? ex[0].date : '', dernier: ex.length ? ex[ex.length - 1].date : '', lundi: tcISO(lundi), dimancheSuivant: tcISO(dimancheSuivant),
      parJour: (function () { const n = {}; ex.forEach((e) => { n[e.date] = (n[e.date] || 0) + 1; }); return Object.keys(n).map((k) => n[k]); })(),
      sansLieu: ex.filter((e) => !e.lieu && e.type !== 'telephone').map((e) => e.title),
      couleurs: ex.filter((e) => ['travail', 'sante', 'famille', 'amis', 'sport'].indexOf(e.cat) < 0).map((e) => e.title),
      bientotMin: Math.round((debutBientot - maintenant) / 60000), bientotAvec: bientot ? (bientot.invites || []).map((i) => i.prenom).join(',') : '', bientotTitre: bientot ? bientot.title : '',
      dureeMin: Math.min.apply(null, events.map((e) => (e.endH * 60 + e.endM) - (e.startH * 60 + e.startM))),
      dispo: JSON.stringify(_dispoData), validation: localStorage.getItem('tc_rdv_validation'),
      demandes: tcConversationsAffichables().filter((m) => tcDemandeRdvEnAttente(m)).map((m) => m.with + (tcDemandeRdvEnAttente(m).demandeur ? ' (inconnu)' : '')),
      phrases: Array.prototype.slice.call(document.querySelectorAll('.tc-demo-phrase')).map((b) => b.textContent.trim()),
      stockage: traces()
    };
    navigate('calendar'); await attendre(500);
    R.marque = /tc-exemple/.test(tcMarqueExemple(events[0])) && tcMarqueExemple({ id: 'x', title: 'Vrai' }) === '';
    navigate('contacts'); await attendre(500);
    R.marquesFiches = document.querySelectorAll('#contactsListContainer [id^="ctFiche_"] .tc-exemple').length;
    R.nFiches = document.querySelectorAll('#contactsListContainer [id^="ctFiche_"]').length;
    // Une demande de la messagerie, acceptée : le rendez-vous dans l'agenda d'exemple, rien ne sort.
    const avantHref = location.href;
    const nEv = events.length;
    await TC_BACKEND.proposerCreneauRdv(990001, tcISO(dimancheSuivant), '12:00', 60, 'physique');
    R.demande = { events: events.length - nEv, rdv: (events[events.length - 1] || {}).title, exemple: (events[events.length - 1] || {}).exemple, reste: tcConversationsAffichables().filter((m) => tcDemandeRdvEnAttente(m)).length };
    // Dans la démo : une invitation et un message à un contact sans TimeCool ne partent pas (aucun SMS).
    inviteContact('demo_v_jeanne');
    R.prevenanceDemo = await tcTransmettrePrevenance(contactsList.find((c) => c.id === 'demo_v_nadia'), 'Je serai en retard', 'x');
    R.hrefDemo = location.href === avantHref;
    // 3. « Stopper la démo » → « Tout supprimer ».
    document.querySelector('#tcDemoBandeau button').click(); await attendre(600);
    R.question = { page: currentPage, texte: dernier(), choix: choix() };
    toucher(/Tout supprimer/); await attendre(600);
    _dispoData = null; loadDispo();
    R.supprime = {
      demo: tcDemoActive(), contacts: contactsList.map((c) => c.id), vraiRdv: events.some((e) => e.id === 'vrai_rdv_1'), exemples: events.filter((e) => e.exemple).length,
      dispo: localStorage.getItem('timecool_disponibilites'), validation: localStorage.getItem('tc_rdv_validation'), traces: traces(),
      demandes: tcConversationsAffichables().filter((m) => tcDemandeRdvEnAttente(m)).length, textes: charlyIA.history.slice(-2).map((m) => m.content)
    };
    // 4. De nouveau, puis « Garder les exemples » (un rendez-vous déplacé pendant la démonstration reste déplacé).
    tcDemanderAccordDemo(); await attendre(500);
    tcRepondreAccordDemo(true); await attendre(1500);
    const coiffeur = events.find((e) => e.exemple && e.title === 'Coiffeur');
    coiffeur.startH = 16; coiffeur.startM = 0; coiffeur.endH = 16; coiffeur.endM = 45;
    await tcDemanderStopDemo(); await attendre(400);
    toucher(/Garder/); await attendre(1000);
    const paquet = tcReglagesTransferables();
    window.__rappels = []; tcProgrammerRappels();
    const rappels = JSON.stringify(window.__rappels);
    R.garde = {
      demo: tcDemoActive(), contacts: contactsList.length, gardes: tcExemplesGardes(), vrai: contactsList.some((c) => c.id === 'c_vrai1'), vraiRdv: events.some((e) => e.id === 'vrai_rdv_1'),
      stockes: JSON.parse(localStorage.getItem('timecool_contacts') || '[]').filter((c) => c.exemple).length,
      syncContacts: TC_SYNC_TYPES.contact.lire().map((c) => c.id), syncRdv: TC_SYNC_TYPES.rdv.lire().filter((e) => e.exemple).length,
      ignore: TC_SYNC_TYPES.contact.ignorer('demo_v_emma') === true && TC_SYNC_TYPES.contact.ignorer('c_vrai1') === false,
      paquet: JSON.parse(paquet.timecool_contacts || '[]').map((c) => c.id), paquetRdv: tcRassemblerDonnees().evenements.filter((e) => e.exemple).length,
      rappelsExemple: /demo_v_|Exemple|Coiffeur|Réunion d’équipe|Brunch/.test(rappels),
      coiffeur: events.filter((e) => e.exemple && e.title === 'Coiffeur').map((e) => e.startH).sort().join(','),
      dispo: localStorage.getItem('timecool_disponibilites'), texte: dernier(),
      bouton: !!Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).find((b) => /Supprimer les exemples/.test(b.textContent))
    };
    // La synchronisation pose la liste du serveur : les exemples gardés restent.
    TC_SYNC_TYPES.contact.poser([{ id: 'c_vrai1', name: 'Réel Essai', categories: ['travail'] }]);
    R.apresPoser = { exemples: contactsList.filter((c) => c.exemple).length, vrais: contactsList.filter((c) => !c.exemple).length };
    // 5. Garde-fous : rien ne part vers un exemple gardé.
    const G = {};
    for (const [nom, f] of [['message', () => TC_BACKEND.envoyerMessage('DEMO-V-EMMA', 'test')], ['demande', () => TC_BACKEND.demanderRdv('DEMO-V-EMMA', 'test')],
      ['groupe', () => TC_BACKEND.proposerRdvGroupe(['DEMO-V-EMMA', 'DEMO-V-LEA'], 1)], ['confirmer', () => TC_BACKEND.confirmerRdvGroupe(['DEMO-V-EMMA'], '2030-01-01', 10, 1)],
      ['proposition', () => TC_BACKEND.propositionCreer({ reference: 'DEMO-V-EMMA', creneaux: [] })], ['libres', () => TC_BACKEND.propositionLibres('DEMO-V-EMMA', [])]]) {
      try { await f(); G[nom] = 'parti'; } catch (e) { G[nom] = e.code || e.message; }
    }
    const href = location.href;
    inviteContact('demo_v_jeanne');
    G.prevenanceSans = await tcTransmettrePrevenance(contactsList.find((c) => c.id === 'demo_v_nadia'), 'test', 'x');
    G.prevenanceAvec = await tcTransmettrePrevenance(contactsList.find((c) => c.id === 'demo_v_emma'), 'test', 'x');
    G.href = location.href === href;
    // Un vrai contact, lui, passe toujours par le serveur (ici coupé : le refus n'est pas « exemple »).
    try { await TC_BACKEND.envoyerMessage('REF-VRAI', 'test'); G.vrai = 'parti'; } catch (e) { G.vrai = e.code === 'exemple' ? 'exemple' : 'serveur'; }
    // Examen : un décalage proposé à un exemple gardé (« je suis malade » après « Garder ») : aucun appel, aucun bouton d'envoi.
    let appels = 0;
    const f0 = window.fetch;
    window.fetch = function () { appels++; return f0.apply(this, arguments); };
    const evNadia = events.find((e) => e.exemple && /Nadia Cohen/.test(e.title));
    const evEmma = events.find((e) => e.exemple && e.contact === 'demo_v_emma');
    const creneau = [{ date: '2030-01-07', startH: 10, startM: 0, endH: 11, endM: 0 }];
    const rp = await tcEnvoyerPropositions([{ ev: evNadia, contact: contactsList.find((c) => c.id === 'demo_v_paul'), creneaux: creneau },
      { ev: evEmma, contact: contactsList.find((c) => c.id === 'demo_v_emma'), creneaux: creneau }]);
    try { await TC_BACKEND.propositionCreer({ remplace: 'demo_v_x', canal: 'sms', prenom_destinataire: 'Paul', creneaux: [] }); G.remplace = 'parti'; } catch (e) { G.remplace = e.code; }
    window.fetch = f0;
    G.decalage = { appels, envois: rp.envois.length, proposes: rp.proposes.length, echecs: rp.echecs.length, exemples: rp.exemples || null,
      marque: !!(evNadia && evNadia.decalage) || !!(evEmma && evEmma.decalage), ligne: tcLignesPropositions(rp, 1).join(' ') };
    R.gardeFous = G;
    // 6. Paramètres : « Supprimer les exemples ».
    navigate('settings'); await attendre(500);
    R.cadre = !!document.getElementById('tcCadreExemples');
    await tcSupprimerExemples(); await attendre(400);
    R.apresSuppression = { gardes: tcExemplesGardes(), vrai: contactsList.map((c) => c.id), vraiRdv: events.some((e) => e.id === 'vrai_rdv_1'), cadre: !!document.getElementById('tcCadreExemples'), traces: traces() };
    fin(R);
  } catch (e) { fin({ erreur: String(e && e.stack || e), R }); }
}

function jouer(largeur) {
  const compte = JSON.stringify({ firstname: 'Tom', lastname: 'Essai', email: 'tom.essai.demo@exemple-timecool.fr', reference: 'REFESSAIDEMO' });
  const vrais = JSON.stringify([{ id: 'c_vrai1', name: 'Réel Essai', phone: '06 39 98 00 91', email: 'reel.essai@exemple-timecool.fr', categories: ['travail'], createdAt: '2025-01-01T10:00:00.000Z' }]);
  const dispo = JSON.stringify({ travail: [{ jours: [3], debut: '08:00', fin: '09:00' }] });
  const tete = '<script>(function () { window.fetch = function () { return Promise.reject(new Error("hors ligne")); };'
    + ' try { localStorage.clear(); localStorage.setItem("timecool_user_account", ' + JSON.stringify(compte) + '); localStorage.setItem("timecool_session_active", "true");'
    + ' localStorage.setItem("tc_onboarding_done", "1"); localStorage.setItem("tc_permissions_shown", "1"); localStorage.setItem("tc_rappels_actifs", "1");'
    + ' localStorage.setItem("timecool_contacts", ' + JSON.stringify(vrais) + '); localStorage.setItem("timecool_disponibilites", ' + JSON.stringify(dispo) + '); } catch (e) {}'
    + ' })();</script>';
  const corpsJs = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + dansLaPage.toString() + ')({}); }, 1500); });</script>';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-valerie-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + tete).replace('</body>', () => corpsJs + '</body>'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'),
    '--hide-scrollbars', '--window-size=' + largeur + ',900', '--virtual-time-budget=90000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')];
  const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) });
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  if (process.env.TC_VOIR) console.log(largeur, JSON.stringify(res, null, 1));
  return res || { erreur: 'Chrome n a rien rendu (code ' + r.status + ' ' + (r.signal || '') + ', ' + String(r.stdout || '').length + ' caractères)' };
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOMS = ['Philippe Garnier', 'Sarah Benali', 'Marc Dubois', 'Dr Claire Fontaine', 'Dr Antoine Mercier', 'Monique Roux', 'Julien Roux', 'Camille Roux', 'Emma Leroy', 'Léa Marchand',
  'Sophie Carter', 'Inès Moreau', 'Thomas Petit', 'Lucas Bernard', 'Karim Haddou', 'Maria Lopez', 'Salon Nicolas Durand', 'Clara Simon', 'Chez Marguerite', 'Le Comptoir Bleu',
  'Nadia Cohen', 'Paul Girard', 'Hugo Roux', 'Jeanne Lambert', 'La Table de Lison'];

titre('0. Dans la page');
verifie('le bouton « Voir la démonstration » demande d’abord l’accord', /<button id="tcBoutonDemo" onclick="tcDemanderAccordDemo\(\)"/.test(page));
verifie('le texte de l’accord, mot pour mot (Charles, 22/11)', page.indexOf("accord: '" + ACCORD.replace(/\n/g, '\\n') + "'") > -1);
verifie('la question de la sortie, mot pour mot', page.indexOf("question: '" + QUESTION + "'") > -1);
verifie('rien de la démonstration au chargement : ses données sont fabriquées à l’ouverture seulement', (page.match(/tcDemoDonneesValerie\(\)/g) || []).length === 2
  && /function tcDemoDonneesValerie\(\)/.test(page) && /\(_valerie \? tcDemoDonneesValerie\(\) : tcDemoDonnees\(\)\)/.test(page));
verifie('le mot « Exemple » sur un rendez-vous (semaine, jour, mois, détail) et sur une fiche',
  (page.match(/<\/span>\$\{typeof tcMarqueExemple === 'function' \? tcMarqueExemple\((e|ev)\) : ''\}<\/div>/g) || []).length === 3
  && page.indexOf("+ (e && e.exemple && typeof tcDemoTexte === 'function' ? ' · ' + tcDemoTexte(TC_DEMO_V_TEXTES.exemple) : '');") > -1
  && page.indexOf("TIMECOOL</span>' : ''}${typeof tcMarqueExemple === 'function' ? tcMarqueExemple(c) : ''}</div>") > -1);

const T = jouer(390);
if (T.erreur || !T.dedans) {
  verifie('Chrome a joué le parcours', false, T.erreur || JSON.stringify(T.R || T).slice(0, 600));
} else {
  titre('1. L’accord');
  verifie('Charly demande l’accord, avec « C’est parti » et « Pas maintenant » ; la démonstration n’est pas encore ouverte', T.accord.demo === false && T.accord.texte === ACCORD && eq(T.accord.choix, ['C’est parti', 'Pas maintenant']), JSON.stringify(T.accord));
  verifie('« Pas maintenant » : rien ne s’ouvre, Charly répond simplement, les boutons partent', T.plusTard.demo === false && /Quand tu veux/.test(T.plusTard.texte) && T.plusTard.choix.length === 0, JSON.stringify(T.plusTard));
  verifie('« C’est parti » : la démonstration de Valérie s’ouvre, avec « Stopper la démo »', T.dedans.demo === true && T.dedans.valerie === true && T.dedans.bandeau === 'Stopper la démo', JSON.stringify([T.dedans.demo, T.dedans.valerie, T.dedans.bandeau]));
  titre('2. Les données de Valérie');
  const D = T.dedans;
  verifie('25 contacts, ceux de Charles, dans l’ordre de sa liste', eq(D.noms, NOMS), D.noms.join(' | '));
  verifie('20 avec TimeCool, 5 sans', D.avecTC === 20 && D.contacts === 25, D.avecTC + ' / ' + D.contacts);
  verifie('chaque fiche complète : 06 39 98 10 xx, e-mail @exemple-timecool.fr, adresse, catégorie, tu ou vous, « Exemple »', D.fiches === 25, D.fiches);
  verifie('Sophie en anglais, Maria en espagnol', eq(D.langues, ['Sophie Carter:en', 'Maria Lopez:es']), D.langues.join(' | '));
  verifie('« vous » au patron, aux docteurs, aux commerces, à la cliente, au kiné, à la professeure', eq(D.vous, ['Philippe Garnier', 'Dr Claire Fontaine', 'Dr Antoine Mercier', 'Salon Nicolas Durand', 'Clara Simon', 'Chez Marguerite', 'Le Comptoir Bleu', 'Nadia Cohen', 'Paul Girard', 'La Table de Lison']), D.vous.join(' | '));
  verifie('la semaine en cours, du lundi, et la suivante, jusqu’au dimanche : 3 à 5 rendez-vous par jour', D.premier === D.lundi && D.dernier === D.dimancheSuivant && D.parJour.length === 14 && D.parJour.every((n) => n >= 3 && n <= 5), D.premier + ' → ' + D.dernier + ' ' + JSON.stringify(D.parJour));
  verifie('chaque rendez-vous : un lieu à Paris (sauf un appel), la couleur de sa catégorie, « Exemple »', !D.sansLieu.length && !D.couleurs.length && D.evExemple === D.events, JSON.stringify([D.sansLieu, D.couleurs, D.evExemple, D.events]));
  verifie('toujours un rendez-vous dans l’heure qui vient : « Café avec Emma, Chez Marguerite », avec Emma et le restaurant', D.bientotMin >= 25 && D.bientotMin <= 40 && D.bientotAvec === 'Emma,Chez Marguerite' && D.bientotTitre === 'Café avec Emma, Chez Marguerite', D.bientotMin + ' min, ' + D.bientotAvec + ', ' + D.bientotTitre);
  verifie('chaque rendez-vous d’exemple dure au moins une heure (titre et « Exemple » lisibles dans la semaine)', D.dureeMin >= 60, D.dureeMin);
  verifie('les disponibilités d’exemple, actives (« Toujours attendre ma validation » décoché, dans la démonstration seulement)', /"travail":\[\{"jours":\[1,2,3,4,5\],"debut":"09:00","fin":"12:00"\}/.test(D.dispo) && /"personnel":\[\{"jours":\[7\]/.test(D.dispo) && D.validation === '0', D.dispo + ' / ' + D.validation);
  verifie('deux demandes dans la messagerie : Maman, et un inconnu avec sa carte', eq(D.demandes, ['Monique Roux', 'Bastien Morel (inconnu)']), D.demandes.join(' | '));
  verifie('les phrases de la démonstration parlent des contacts de Valérie (une par vidéo : verif-demo-videos)', D.phrases.length === 12 && /Je suis malade/.test(D.phrases[0]) && /Emma, Léa et Inès/.test(D.phrases[2]), D.phrases.join(' | '));
  verifie('le mot « Exemple » sur chaque fiche', T.marquesFiches === T.nFiches && T.nFiches > 0 && T.marque === true, T.marquesFiches + ' / ' + T.nFiches + ' / ' + T.marque);
  verifie('rien n’est écrit sur l’appareil pendant la démonstration', D.stockage === 0, D.stockage);
  verifie('une demande acceptée : le rendez-vous entre dans l’agenda d’exemple, la demande est traitée', T.demande.events === 1 && /Monique Roux/.test(T.demande.rdv) && T.demande.exemple === true && T.demande.reste === 1, JSON.stringify(T.demande));
  verifie('dans la démonstration, une invitation ou un retard à un contact sans TimeCool : rien ne part (aucun SMS)', T.prevenanceDemo === 'exemple' && T.hrefDemo === true, T.prevenanceDemo + ' / ' + T.hrefDemo);
  titre('3. « Stopper la démo » → « Tout supprimer »');
  verifie('Charly pose la question, avec « Tout supprimer » et « Garder les exemples »', T.question.page === 'assistant' && T.question.texte === QUESTION && eq(T.question.choix, ['Tout supprimer', 'Garder les exemples']), JSON.stringify(T.question));
  const S = T.supprime;
  verifie('plus aucune trace : contacts, rendez-vous, demandes, stockage', S.demo === false && eq(S.contacts, ['c_vrai1']) && S.exemples === 0 && S.demandes === 0 && S.traces === 0, JSON.stringify(S));
  verifie('ses propres réglages, intacts (disponibilités, validation), et son vrai rendez-vous', S.dispo === T.avant.dispo && S.validation === T.avant.validation && S.vraiRdv === true, JSON.stringify([S.dispo, S.validation, S.vraiRdv]));
  verifie('Charly le dit simplement', /tout est supprimé/.test(S.textes[0]), S.textes.join(' | '));
  titre('4. « Garder les exemples »');
  const K = T.garde;
  verifie('les 25 contacts et les rendez-vous d’exemple restent, à côté des vrais', K.demo === false && K.gardes.contacts === 25 && K.gardes.events === 49 && K.vrai && K.vraiRdv && K.stockes === 25, JSON.stringify(K.gardes) + ' ' + K.stockes);
  verifie('tels qu’à la sortie (le coiffeur déplacé à 16h reste à 16h)', K.coiffeur === '16,17', K.coiffeur);
  verifie('ses disponibilités restent les siennes', K.dispo === T.avant.dispo, K.dispo);
  verifie('jamais envoyés au serveur : la synchronisation les laisse de côté, et ne les efface pas', eq(K.syncContacts, ['c_vrai1']) && K.syncRdv === 0 && K.ignore && T.apresPoser.exemples === 25 && T.apresPoser.vrais === 1, JSON.stringify([K.syncContacts, K.syncRdv, K.ignore, T.apresPoser]));
  verifie('jamais recopiés à l’appairage', eq(K.paquet, ['c_vrai1']) && K.paquetRdv === 0, JSON.stringify([K.paquet, K.paquetRdv]));
  verifie('jamais de rappel sur le téléphone pour un rendez-vous d’exemple', K.rappelsExemple === false);
  verifie('Charly le dit, avec « Supprimer les exemples »', /C’est gardé/.test(K.texte) && K.bouton, K.texte);
  titre('5. Rien ne part vers un exemple gardé');
  const G = T.gardeFous;
  verifie('ni message, ni demande, ni rendez-vous à plusieurs, ni proposition de créneaux', ['message', 'demande', 'groupe', 'confirmer', 'proposition', 'libres'].every((k) => G[k] === 'exemple'), JSON.stringify(G));
  verifie('ni invitation, ni SMS, ni e-mail (on voit le message préparé)', G.prevenanceSans === 'exemple' && G.prevenanceAvec === 'exemple' && G.href === true, JSON.stringify(G));
  verifie('un vrai contact, lui, passe toujours par le serveur', G.vrai === 'serveur', G.vrai);
  const P = G.decalage || {};
  verifie('examen : un décalage proposé à un exemple gardé (sans TimeCool ou avec) : aucun appel, aucun bouton d’envoi, rendez-vous non marqué, et le bilan le dit',
    P.appels === 0 && P.envois === 0 && P.proposes === 0 && P.echecs === 0 && P.marque === false && eq(P.exemples, ['Paul Girard', 'Emma Leroy']) && /Rien n’est envoyé à un exemple : Paul Girard et Emma Leroy/.test(P.ligne), JSON.stringify(P));
  verifie('examen : une proposition qui remplace un rendez-vous d’exemple ne part pas, même sans référence', G.remplace === 'exemple', G.remplace);
  titre('6. « Supprimer les exemples »');
  verifie('dans Paramètres, seulement quand des exemples sont gardés', T.cadre === true && T.apresSuppression.cadre === false, JSON.stringify([T.cadre, T.apresSuppression.cadre]));
  verifie('ils partent tous ; ses vrais contacts et rendez-vous restent', T.apresSuppression.gardes.total === 0 && eq(T.apresSuppression.vrai, ['c_vrai1']) && T.apresSuppression.vraiRdv && T.apresSuppression.traces === 0, JSON.stringify(T.apresSuppression));
}

console.log('');
console.log(ko ? ko + ' anomalie(s) sur ' + (ok + ko) + ' vérifications.' : 'OK : ' + ok + ' vérifications.');
process.exit(ko ? 1 : 0);
