// Mission 146 (chef, 19/11, validée par Charles) : Charly comprend le jour dit dans « je suis malade ». « Je suis malade mercredi,
// annule (ou décale) mes rendez-vous » : le prochain mercredi à venir, sans la question « pour quand ? » ; pareil pour chaque jour
// de la semaine, « après-demain », et un jour avec sa moitié (« mercredi matin », « jeudi après-midi »). Le jour dit tombe
// aujourd'hui : c'est aujourd'hui. Phrase ambiguë : la question reste, avec ses choix. Ensuite, tout comme « demain ».
// 1. La lecture de la phrase, horloge réglée sur chacun des sept jours de la semaine (moteur seul, sans page).
// 2. Le vrai parcours dans Chrome, sans réseau : « mercredi » un jeudi soir donne mot pour mot les cartes, les messages et les
//    propositions de « demain » un mardi ; mercredi est libéré (annule) ou marqué ⏳ (décale).
// Usage : node verif-malade-jour146.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 400) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}

/* ── 1. La lecture de la phrase ─────────────────────────────── */
titre('1. La phrase lue, chaque jour de la semaine');
const ctx = { console, String, Number, Array, Object, RegExp, Math, JSON, Date };
vm.createContext(ctx);
const debutP = page.indexOf('const TC_MALADE_PERIODES = {');
const finP = debutP > -1 ? page.indexOf('\n})();', debutP) : -1;
const blocP = (debutP > -1 && finP > debutP) ? page.slice(debutP, finP + 6) : '';
const blocPOk = /TC_MALADE_PERIODES\['jour_' \+ n\]/.test(blocP) && blocP.indexOf('/** « Malade » dans la phrase') < 0;
verifie('les périodes « malade » et les jours nommés (jour_N) sont dans la page', blocPOk);
if (!blocPOk) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }
vm.runInContext(blocP, ctx);
['tcSansAccents', 'tcJoursCites', 'tcMaladeMoitie146', 'tcMaladeJourDit146', 'tcMaladeDansLaPhrase'].forEach((n) => {
  const f = fonction(page, n);
  if (f) vm.runInContext(f, ctx); else verifie(n + ' est dans la page', false);
});
if (ko) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }

const NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const horloge = (y, m, d, h, mi) => { const F = new Date(y, m, d, h, mi, 0).getTime(); return class extends Date { constructor(...a) { if (a.length) super(...a); else super(F); } static now() { return F; } }; };
const lire = (p, drapeau) => JSON.stringify(ctx.tcMaladeDansLaPhrase(p, drapeau === undefined ? true : drapeau));
const P = () => vm.runInContext('TC_MALADE_PERIODES', ctx);
const ecart = (w, auj) => (w - auj + 7) % 7;
let jourKo = 0;
const vrai = (l, c, d) => { if (!c) { jourKo++; verifie(l, false, d); } };
// Du lundi 23 au dimanche 29 novembre 2026, le matin (8h) et le soir (20h30).
for (let jj = 23; jj <= 29; jj++) {
  for (const [h, mi] of [[8, 0], [20, 30]]) {
    ctx.Date = horloge(2026, 10, jj, h, mi);
    const auj = new ctx.Date().getDay();
    const ici = NOMS[auj] + ' ' + jj + '/11 ' + h + 'h' + (mi || '') + ' : ';
    for (let w = 0; w < 7; w++) {
      const n = ecart(w, auj), nom = NOMS[w];
      vrai(ici + '« malade ' + nom + ', annule »', lire('Je suis malade ' + nom + ', annule mes rendez-vous') === JSON.stringify({ periode: 'jour_' + n, action: 'supprimer' }), lire('Je suis malade ' + nom + ', annule mes rendez-vous'));
      vrai(ici + '« malade ' + nom + ', décale »', lire('Je suis malade ' + nom + ', décale mes rendez-vous') === JSON.stringify({ periode: 'jour_' + n, action: 'decaler' }), lire('Je suis malade ' + nom + ', décale mes rendez-vous'));
      vrai(ici + '« ' + nom + ' matin »', JSON.parse(lire('je suis malade ' + nom + ' matin, décale tout')).periode === 'jour_' + n + '_matin', lire('je suis malade ' + nom + ' matin, décale tout'));
      ['après-midi', 'apres midi', 'aprem'].forEach((a) => vrai(ici + '« ' + nom + ' ' + a + ' »', JSON.parse(lire('Je suis malade ' + nom + ' ' + a + ', annule')).periode === 'jour_' + n + '_apresmidi', lire('Je suis malade ' + nom + ' ' + a + ', annule')));
      vrai(ici + '« ' + nom + ' prochain »', JSON.parse(lire('Je suis malade ' + nom + ' prochain, annule')).periode === 'jour_' + (n || 7), lire('Je suis malade ' + nom + ' prochain, annule'));
      vrai(ici + '« JE SUIS MALADE ' + nom.toUpperCase() + ' » (majuscules, sans ponctuation)', JSON.parse(lire('JE SUIS MALADE ' + nom.toUpperCase() + ' DECALE MES RDV')).periode === 'jour_' + n);
      vrai(ici + '« depuis ce matin, annule ' + nom + ' » : toute la journée', JSON.parse(lire('Je suis malade depuis ce matin, annule mes rendez-vous de ' + nom)).periode === 'jour_' + n, lire('Je suis malade depuis ce matin, annule mes rendez-vous de ' + nom));
    }
    const demainNom = NOMS[(auj + 1) % 7], autreNom = NOMS[(auj + 3) % 7], apresNom = NOMS[(auj + 4) % 7];
    vrai(ici + '« demain ' + demainNom + ' » (le même jour) : demain', JSON.parse(lire('Je suis malade demain ' + demainNom + ', annule')).periode === 'jour_1');
    const d2 = JSON.parse(lire('Je suis malade demain ' + autreNom + ', annule'));
    vrai(ici + '« demain ' + autreNom + ' » (deux jours différents) : la question reste', !d2.periode && !d2._periodesDites, JSON.stringify(d2));
    vrai(ici + '« ' + autreNom + ' ou ' + apresNom + ' » : Charly demande lequel, avec eux seuls', JSON.stringify(JSON.parse(lire('Je suis malade ' + autreNom + ' ou ' + apresNom + ', décale'))._periodesDites) === JSON.stringify(['jour_3', 'jour_4']), lire('Je suis malade ' + autreNom + ' ou ' + apresNom + ', décale'));
    vrai(ici + '« demain ou ' + autreNom + ' » : « Demain » garde son mot', JSON.stringify(JSON.parse(lire('Je suis malade demain ou ' + autreNom + ', décale'))._periodesDites) === JSON.stringify(['demain', 'jour_3']), lire('Je suis malade demain ou ' + autreNom + ', décale'));
    vrai(ici + '« après-demain » : comme avant', lire('Je suis malade après-demain, décale tout') === '{"periode":"apres_demain","action":"decaler"}');
    vrai(ici + '« après-demain matin » : la matinée', JSON.parse(lire('Je suis malade après-demain matin, décale tout')).periode === 'jour_2_matin');
    vrai(ici + '« après-demain après-midi » : l’après-midi', JSON.parse(lire('Je suis malade apres demain apres-midi, annule')).periode === 'jour_2_apresmidi');
    // Ambiguë : la question « pour quand ? » reste.
    ['Je suis malade lundi et mardi, annule mes rendez-vous', 'Je suis malade de lundi à mercredi, annule tout', 'Je suis malade jusqu’à vendredi, décale tout',
     'J’étais malade mercredi dernier, décale', 'Je suis malade toute la semaine sauf mercredi, annule', 'Je suis malade depuis lundi, décale mes rendez-vous',
     'Je suis malade mercredi de la semaine prochaine, annule', 'Je suis malade entre mardi et jeudi, annule', 'Je suis malade mercredi, jeudi et vendredi, annule'
    ].forEach((p) => { const r = JSON.parse(lire(p)); vrai(ici + '« ' + p + ' » : la question reste', !r.periode && !r._periodesDites, JSON.stringify(r)); });
  }
}
verifie('du lundi 23 au dimanche 29 novembre, matin et soir : chaque jour de la semaine, ses moitiés, « prochain », « ou », « après-demain » et les phrases ambiguës', jourKo === 0, jourKo + ' écart(s)');

titre('2. Les phrases déjà comprises restent comprises');
ctx.Date = horloge(2026, 10, 19, 20, 30);
const AVANT = [
  ['Je suis malade', '{}'], ['Je suis malade aujourd’hui, annule mes rendez-vous', '{"periode":"aujourdhui","action":"supprimer"}'],
  ['Je suis malade, décale tout ce qui reste ce soir', '{"periode":"aujourdhui","action":"decaler"}'],
  ['Je suis malade demain, décale mes rendez-vous', '{"periode":"demain","action":"decaler"}'], ['je suis malade demain matin, annule', '{"periode":"demain_matin","action":"supprimer"}'],
  ['Je suis malade demain après-midi, décale', '{"periode":"demain_apresmidi","action":"decaler"}'],
  ['Je suis malade pour les 2 ou 3 prochains jours, décale', '{"periode":"prochains_jours","action":"decaler"}'],
  ['Je suis malade cette semaine, annule tout', '{"periode":"semaine","action":"supprimer"}'],
  ['Je suis malade aujourd’hui et demain, décale', '{"periode":"aujourdhui_demain","action":"decaler"}'],
  ['Je suis malade, décale ma journée de demain, d’après-demain ou de cette semaine', '{"_periodesDites":["demain","apres_demain","semaine"],"action":"decaler"}'],
  ['Je suis malade après-demain, décale tout', '{"periode":"apres_demain","action":"decaler"}']
];
AVANT.forEach(([p, att]) => verifie('« ' + p + ' » : ' + att + ' (comme avant, avec et sans le parcours « malade »)', lire(p) === att && lire(p, false) === att, lire(p) + ' / ' + lire(p, false)));
// Examen 146 : un jour passé dit quand on est tombé malade ; le moment demandé reste celui d'avant (mesuré sur f58e22b).
[['Je suis malade depuis lundi, annule mes rendez-vous de demain', '{"periode":"demain","action":"supprimer"}'],
 ['Je suis malade depuis mardi, décale ce qui reste aujourd’hui', '{"periode":"aujourdhui","action":"decaler"}'],
 ['J’ai attrapé froid mercredi dernier, annule demain', '{"periode":"demain","action":"supprimer"}'],
 ['Je suis malade depuis mercredi dernier, annule mes rendez-vous de demain', '{"periode":"demain","action":"supprimer"}'],
 ['Je suis malade depuis hier soir, décale demain matin', '{"periode":"demain_matin","action":"decaler"}'],
 ['Je suis malade depuis avant-hier, annule cette semaine', '{"periode":"semaine","action":"supprimer"}'],
 ['Je suis malade depuis lundi matin, décale aujourd’hui', '{"periode":"aujourdhui","action":"decaler"}'],
 ['J’étais malade mardi passé, annule mes rendez-vous de demain', '{"periode":"demain","action":"supprimer"}']
].forEach(([p, att]) => verifie('« ' + p + ' » : le jour passé ne compte pas, ' + att + ' (comme sur f58e22b)', lire(p) === att && lire(p, false) === att, lire(p) + ' / ' + lire(p, false)));
// … et un jour à venir dit en plus reste compris (jeudi 19 : mercredi = jour_6, vendredi = jour_1).
verifie('« Je suis malade depuis lundi, annule mes rendez-vous de mercredi » : mercredi 25 (jour_6), pas lundi',
  lire('Je suis malade depuis lundi, annule mes rendez-vous de mercredi') === '{"periode":"jour_6","action":"supprimer"}', lire('Je suis malade depuis lundi, annule mes rendez-vous de mercredi'));
verifie('« depuis mercredi dernier, décale vendredi matin » : vendredi 20 au matin (jour_1_matin), « depuis lundi matin » ne donne pas sa matinée',
  JSON.parse(lire('Je suis malade depuis mercredi dernier, décale vendredi matin')).periode === 'jour_1_matin' && JSON.parse(lire('Je suis malade depuis lundi matin, annule vendredi')).periode === 'jour_1',
  lire('Je suis malade depuis mercredi dernier, décale vendredi matin') + ' / ' + lire('Je suis malade depuis lundi matin, annule vendredi'));
verifie('sans le parcours « malade » (l’imprévu de la mission 131) : un jour de la semaine ne change rien', lire('Demain j’ai un imprévu, décale tous mes rendez-vous de mercredi', false) === lire('Demain j’ai un imprévu, décale tous mes rendez-vous', false)
  && !JSON.parse(lire('J’ai un imprévu mercredi, décale tous mes rendez-vous', false)).periode && JSON.parse(lire('après-demain matin, décale', false)).periode === 'apres_demain');
verifie('« je suis malade » passe le drapeau (tcDemarrerMalade), l’imprévu 131 non', /await tcQuestionnaireDemarrer\(TC_QUESTIONNAIRE_MALADE, tcMaladeDansLaPhrase\(text, true\)\);/.test(page)
  && /const connu = tcMaladeDansLaPhrase\(text\);\n  if \(!connu\.periode \|\| connu\._periodesDites\) return false;/.test(page));

titre('3. Les périodes des jours nommés');
const per = P();
let perOk = true;
for (let n = 0; n <= 7; n++) {
  const a = per['jour_' + n], b = per['jour_' + n + '_matin'], c = per['jour_' + n + '_apresmidi'];
  perOk = perOk && a && b && c && a.cache && b.cache && c.cache && JSON.stringify([a.jours, b.jours, c.jours]) === JSON.stringify([[n, n], [n, n], [n, n]])
    && a.debut === 0 && a.fin === 1440 && b.debut === 0 && b.fin === 720 && c.debut === 720 && c.fin === 1440;
}
verifie('jour_0 à jour_7 : un jour entier, sa matinée (jusqu’à midi) et son après-midi, comme « demain » ; aucun bouton de plus', perOk);
verifie('« pour quand ? » garde ses cinq boutons', JSON.stringify(Object.keys(per).filter((k) => !per[k].cache)) === '["aujourdhui","demain_matin","demain_apresmidi","demain","prochains_jours"]', JSON.stringify(Object.keys(per).filter((k) => !per[k].cache)));
verifie('jeudi 19 : Charly dit la date : jour_6 « mercredi 25 novembre », jour_6_matin « Mercredi 25 novembre, le matin », jour_0 « jeudi 19 novembre », jour_7 « jeudi 26 novembre », jour_1_apresmidi « vendredi 20 novembre, l’après-midi »',
  per.jour_6.label === 'mercredi 25 novembre' && per.jour_6_matin.texte === 'Mercredi 25 novembre, le matin' && per.jour_0.label === 'jeudi 19 novembre' && per.jour_7.label === 'jeudi 26 novembre' && per.jour_1_apresmidi.label === 'vendredi 20 novembre, l’après-midi',
  [per.jour_6.label, per.jour_6_matin.texte, per.jour_0.label, per.jour_7.label, per.jour_1_apresmidi.label].join(' / '));
verifie('une réponse tapée « mercredi » désigne le bouton « Mercredi »', per.jour_6.mots.test('mercredi') && !per.jour_6.mots.test('jeudi') && per.jour_6_apresmidi.mots.test('mercredi apres midi'));

/* ── 2. Le vrai parcours, dans Chrome ───────────────────────── */
titre('4. Le vrai parcours dans Chrome, sans réseau');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('NON JOUÉ : pas de Chrome sur ce poste (sur le serveur : bash scripts/verifications/installer-chrome-serveur.sh, puis TC_CHROME=~/outils-tc/chrome)');
  process.exit(1);
}
const CONTACTS = [
  { id: 'c146_hugo', name: 'Hugo Coach', phone: '06 39 98 21 11', email: 'hugo.coach.essai@exemple-timecool.fr' },
  { id: 'c146_maman', name: 'Maman', phone: '06 39 98 21 22', email: 'maman.essai@exemple-timecool.fr' },
  { id: 'c146_camille', name: 'Camille Guitare', phone: '06 39 98 21 33', email: 'camille.guitare.essai@exemple-timecool.fr' }
];
const R = (date, h, m, h2, m2, title, contact) => Object.assign({ date, startH: h, startM: m, endH: h2, endM: m2, title, cat: 'blue', mode: 'user', id: 'v146_' + date + '_' + h + m }, contact ? { contact } : {});
const SEMAINE = [
  R('2026-11-23', 9, 0, 10, 0, 'Réunion d’équipe'), R('2026-11-23', 14, 0, 15, 0, 'Dentiste'), R('2026-11-23', 19, 0, 20, 30, 'Foot entre amis'),
  R('2026-11-24', 8, 30, 9, 30, 'Point projet'), R('2026-11-24', 12, 30, 13, 30, 'Déjeuner avec Léa'), R('2026-11-24', 17, 0, 17, 30, 'Pressing'),
  R('2026-11-25', 9, 0, 10, 0, 'Séance de sport avec Hugo', 'c146_hugo'), R('2026-11-25', 12, 30, 13, 30, 'Déjeuner chez Maman', 'c146_maman'), R('2026-11-25', 18, 0, 19, 0, 'Cours de guitare avec Camille', 'c146_camille'),
  R('2026-11-26', 10, 0, 11, 0, 'Banque'), R('2026-11-26', 15, 0, 16, 0, 'Appel client'), R('2026-11-26', 20, 0, 22, 0, 'Cinéma'),
  R('2026-11-27', 9, 30, 10, 30, 'Réunion client'), R('2026-11-27', 13, 0, 14, 0, 'Courses'), R('2026-11-27', 18, 30, 20, 0, 'Apéro entre collègues')
];
const JEUDI = '2026-11-19T20:30:00', MARDI = '2026-11-24T10:00:00';
const SCENARIOS = [
  { nom: 'annule-mercredi', horloge: JEUDI, phrase: 'Je suis malade mercredi, annule mes rendez-vous', boutons: ['Oui, vas-y'] },
  { nom: 'annule-demain', horloge: MARDI, phrase: 'Je suis malade demain, annule mes rendez-vous', boutons: ['Oui, vas-y'] },
  { nom: 'decale-mercredi', horloge: JEUDI, phrase: 'Je suis malade mercredi, décale mes rendez-vous', boutons: ['Oui, envoie'] },
  { nom: 'decale-demain', horloge: MARDI, phrase: 'Je suis malade demain, décale mes rendez-vous', boutons: ['Oui, envoie'] },
  { nom: 'aujourdhui', horloge: '2026-11-25T08:00:00', phrase: 'Je suis malade mercredi, annule mes rendez-vous', boutons: [] },
  { nom: 'jeudi-apresmidi', horloge: '2026-11-23T08:00:00', phrase: 'Je suis malade jeudi après-midi, annule mes rendez-vous', boutons: [] },
  { nom: 'jeudi-soir-jeudi', horloge: JEUDI, phrase: 'Je suis malade jeudi, annule mes rendez-vous', boutons: [] },
  { nom: 'ambigu', horloge: JEUDI, phrase: 'Je suis malade lundi et mardi, annule mes rendez-vous', boutons: [] },
  { nom: 'ou', horloge: JEUDI, phrase: 'Je suis malade mercredi ou vendredi, annule mes rendez-vous', boutons: ['Mercredi'] }
];

/** Dans la page : chaque scénario sur la même semaine, l'horloge réglée, la phrase tapée, les boutons touchés. */
async function scenariosDansLaPage(D) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const fin = (res) => { const pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  const boutons = () => Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter((x) => !x.disabled && x.offsetParent).map((x) => x.innerText.trim());
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    if (typeof hideAuthFlow === 'function') hideAuthFlow();
    tcCharlyPret = function () { return true; };
    D.contacts.forEach((c) => contactsList.push(c)); saveContacts();
    window.__corps = [];
    TC_BACKEND.propositionCreer = async function (corps) { window.__corps.push(corps); return { rdv_id: 900 + window.__corps.length, url: 'https://timecool.fr/rdv/LIEN-ESSAI-' + window.__corps.length, creneaux: corps.creneaux.map((c, i) => ({ rang: i + 1, libelle: c.libelle })) }; };
    navigate('assistant'); await attendre(900);
    document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach((e) => { e.style.display = 'none'; });
    const R = [];
    for (const s of D.scenarios) {
      const res = { nom: s.nom, etapes: [] };
      try {
        window.__tcHorloge(s.horloge);
        if (typeof tcQuestionnaireArreter === 'function') tcQuestionnaireArreter();
        events = events.filter((e) => e && !/^v146_/.test(String(e.id)) && (e.allDay || /^bh_|^fete|ferie/i.test(String(e.id))));
        D.semaine.forEach((e) => events.push(Object.assign({}, e)));
        await saveEventsToStorage();
        charlyIA.history = []; window.__corps = [];
        renderCharlyChat();
        let vu = 0;
        const lire = () => { const h = charlyIA.history.slice(vu); vu = charlyIA.history.length; return { msgs: h.filter((m) => m && m.role !== 'user').map((m) => String(m.content || '')), boutons: boutons().slice(-8) }; };
        document.getElementById('charlyInput').value = s.phrase;
        await charlySendMessage(); await attendre(3000);
        res.etapes.push(lire());
        for (const b of s.boutons) {
          const re = new RegExp(b);
          const l = Array.prototype.slice.call(document.querySelectorAll('#charlyChatBody button')).filter((x) => !x.disabled && x.offsetParent && re.test(x.innerText.trim()));
          if (!l.length) { res.erreur = 'pas de bouton ' + b; break; }
          l[l.length - 1].click(); await attendre(4000);
          res.etapes.push(lire());
        }
        const sem = events.filter((e) => /^v146_/.test(String(e.id)));
        res.mercredi = sem.filter((e) => e.date === '2026-11-25').map((e) => e.startH + 'h' + (e.startM || '') + ' ' + e.title + (e.decalage ? ' ⏳' : ''));
        res.autres = sem.filter((e) => e.date !== '2026-11-25' && e.date === String(e.id).slice(5, 15)).length;
        res.corps = window.__corps;
      } catch (er) { res.erreur = String(er && er.stack || er); }
      R.push(res);
    }
    fin(R);
  } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
}

const compte = JSON.stringify({ firstname: 'Lucie', lastname: 'Essai', email: 'lucie.essai146@exemple-timecool.fr', reference: 'REFESSAI146' });
const tete = '<script>(function () { var V = Date; var ecart = 0;'
  + ' class D extends V { constructor(...a) { if (a.length === 0) super(V.now() + ecart); else super(...a); } static now() { return V.now() + ecart; } }'
  + ' window.Date = D; window.__tcHorloge = function (iso) { ecart = new V(iso).getTime() - V.now(); }; window.__tcHorloge(' + JSON.stringify(JEUDI) + ');'
  + ' window.fetch = function () { return Promise.reject(new Error("hors ligne")); };'
  + ' try { localStorage.clear(); localStorage.setItem("timecool_user_account", ' + JSON.stringify(compte) + '); localStorage.setItem("timecool_session_active", "true");'
  + ' localStorage.setItem("tc_onboarding_done", "1"); localStorage.setItem("tc_permissions_shown", "1"); localStorage.setItem("tc_session_jeton", "jeton-essai-146"); } catch (e) {}'
  + ' })();</script>';
const corpsJs = '<script>window.addEventListener("load", function () { setTimeout(function () { (' + scenariosDansLaPage.toString() + ')('
  + JSON.stringify({ contacts: CONTACTS, semaine: SEMAINE, scenarios: SCENARIOS }) + '); }, 1500); });</script>';
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-malade146-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + tete).replace('</body>', () => corpsJs + '</body>'));
const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--host-resolver-rules=MAP * ~NOTFOUND', '--user-data-dir=' + path.join(dossier, 'pr'),
  '--window-size=390,844', '--virtual-time-budget=' + (SCENARIOS.length * 15000 + 30000), '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')];
const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { TZ: 'Europe/Paris' }) });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let res = null;
try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
if (!Array.isArray(res)) {
  verifie('Chrome a joué les scénarios', false, JSON.stringify(res) || String(r.stderr || '').slice(0, 300));
} else {
  const S = {}; res.forEach((x) => { S[x.nom] = x; });
  const tout = (x) => (x && x.etapes ? x.etapes.map((e) => e.msgs.join('\n')).join('\n') : '');
  const msgs = (x) => JSON.stringify(x && x.etapes ? x.etapes.map((e) => e.msgs) : null);
  res.forEach((x) => { if (x.erreur) verifie('scénario « ' + x.nom + ' » sans erreur', false, x.erreur); });
  const a = S['annule-mercredi'], b = S['annule-demain'], c = S['decale-mercredi'], d = S['decale-demain'];
  verifie('« Je suis malade mercredi, annule mes rendez-vous » (jeudi soir) : pas de « pour quand ? », la carte supprime les trois rendez-vous du mercredi 25',
    a && !/pour quand/.test(tout(a)) && (tout(a).match(/Je supprime « [^»]+ » \(mercredi 25 novembre/g) || []).length === 3, tout(a).slice(0, 300));
  verifie('… après « Oui, vas-y » : « C’est fait. Repose-toi. », mercredi est vide, les douze autres rendez-vous n’ont pas bougé, aucune proposition envoyée',
    a && /C’est fait\. Repose-toi\./.test(tout(a)) && a.mercredi && a.mercredi.length === 0 && a.autres === 12 && a.corps.length === 0, a && JSON.stringify([a.mercredi, a.autres]));
  verifie('… les trois messages sont prêts, à envoyer d’un geste (« ✉️ Envoyer à … »), rien ne part tout seul',
    a && ['Hugo Coach', 'Maman', 'Camille Guitare'].every((n) => a.etapes[a.etapes.length - 1].boutons.some((t) => t === '✉️ Envoyer à ' + n)), a && JSON.stringify(a.etapes[a.etapes.length - 1].boutons));
  verifie('« mercredi » un jeudi soir = « demain » un mardi, mot pour mot (carte, message, compte rendu)', a && b && msgs(a) === msgs(b) && JSON.stringify(b.mercredi) === '[]', msgs(a) + ' ≠ ' + msgs(b));
  verifie('« Je suis malade mercredi, décale mes rendez-vous » : la carte « Tu es malade. Je déplace 3 rendez-vous. », sans « pour quand ? »',
    c && !/pour quand/.test(tout(c)) && /Tu es malade\. Je déplace 3 rendez-vous\./.test(tout(c)), tout(c).slice(0, 300));
  verifie('… après « Oui, envoie » : les trois restent à leur place, marqués ⏳ ; trois propositions préparées (le serveur ne fait que ranger le lien)',
    c && JSON.stringify(c.mercredi) === JSON.stringify(['9h Séance de sport avec Hugo ⏳', '12h30 Déjeuner chez Maman ⏳', '18h Cours de guitare avec Camille ⏳']) && c.corps.length === 3 && c.autres === 12, c && JSON.stringify([c.mercredi, c.corps.length]));
  verifie('« mercredi » un jeudi soir = « demain » un mardi, mot pour mot : la carte, le compte rendu, les messages et les créneaux proposés',
    c && d && msgs(c) === msgs(d) && JSON.stringify(c.corps) === JSON.stringify(d.corps) && JSON.stringify(c.mercredi) === JSON.stringify(d.mercredi), msgs(c).slice(0, 200) + ' ≠ ' + msgs(d).slice(0, 200));
  const e = S.aujourdhui;
  verifie('le jour dit tombe aujourd’hui (« mercredi », mercredi 8h) : c’est aujourd’hui, les trois rendez-vous du jour', e && !/pour quand/.test(tout(e)) && (tout(e).match(/Je supprime « [^»]+ » \(mercredi 25 novembre/g) || []).length === 3, tout(e).slice(0, 300));
  const f = S['jeudi-apresmidi'];
  verifie('« jeudi après-midi » (lundi 8h) : seulement l’après-midi du jeudi 26 (Appel client, Cinéma ; pas la Banque de 10h)',
    f && /Je supprime « Appel client »/.test(tout(f)) && /Je supprime « Cinéma »/.test(tout(f)) && !/Banque/.test(tout(f)) && !/pour quand/.test(tout(f)), tout(f).slice(0, 300));
  const g = S['jeudi-soir-jeudi'];
  verifie('« jeudi » dit un jeudi soir : aujourd’hui, où rien ne reste : « Rien à décaler jeudi 19 novembre. Repose-toi. »', g && /Rien à décaler jeudi 19 novembre\. Repose-toi\./.test(tout(g)) && !/pour quand/.test(tout(g)), tout(g));
  const h = S.ambigu;
  verifie('« lundi et mardi » : ambigu, la question « pour quand ? » reste avec ses cinq choix',
    h && /Je m’occupe de ton agenda pour quand/.test(tout(h)) && ['Ce qui reste aujourd’hui', 'Demain matin', 'Demain après-midi', 'Demain toute la journée', 'Les 2 ou 3 prochains jours'].every((t) => h.etapes[0].boutons.some((x) => x.endsWith(t))), h && JSON.stringify(h.etapes[0]));
  const o = S.ou;
  verifie('« mercredi ou vendredi » : Charly demande lequel, avec « Mercredi » et « Vendredi » seuls ; « Mercredi » touché : la carte des trois',
    o && /pour quand/.test(o.etapes[0].msgs.join(' ')) && o.etapes[0].boutons.some((x) => /Mercredi 25 novembre$/.test(x)) && o.etapes[0].boutons.some((x) => /Vendredi 20 novembre$/.test(x)) && !o.etapes[0].boutons.some((x) => /Demain/.test(x))
      && o.etapes[1] && (o.etapes[1].msgs.join('\n').match(/Je supprime « [^»]+ » \(mercredi 25 novembre/g) || []).length === 3, o && JSON.stringify(o.etapes));
}

console.log('');
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
