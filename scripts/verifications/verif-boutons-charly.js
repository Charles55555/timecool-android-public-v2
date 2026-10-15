// Mission 22 (Charles, 12/10, vitrine) : une 2e ligne de 4 boutons sous la ligne actuelle de l ecran Charly, meme style,
// textes exacts ; chaque bouton lance le parcours existant. Usage : node verif-boutons-charly.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 240) : '')); }
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

titre('1. La 2e ligne : 4 boutons, textes exacts, meme style que la 1re');
const l1 = page.match(/<div id="charlyQuickActions" [^>]*>[\s\S]*?<\/div>/);
const l2 = page.match(/<div id="charlyQuickActions2" [^>]*>[\s\S]*?<\/div>/);
verifie('les deux lignes existent, la 2e juste sous la 1re', !!(l1 && l2) && page.indexOf(l2[0]) > page.indexOf(l1[0]) && page.slice(page.indexOf(l1[0]) + l1[0].length, page.indexOf(l2[0])).replace(/<!--[\s\S]*?-->/g, '').trim() === '');
const TEXTES = ['👥 Rendez-vous à plusieurs', '🤒 Je suis malade, décale tout', '🕐 Quand suis-je libre ?', '📸 Photo → rendez-vous'];
const ACTIONS = ['groupe', 'malade', 'libre', 'photo'];
const boutons = l2 ? (l2[0].match(/<button[^>]*>[^<]*<\/button>/g) || []) : [];
verifie('4 boutons, dans l ordre, textes exacts', boutons.length === 4 && TEXTES.every((t, i) => boutons[i].indexOf('>' + t + '</button>') > -1), boutons.map((b) => b.replace(/<button[^>]*>/, '')).join(' | '));
verifie('chaque bouton appelle charlyQuickAction avec sa cle', ACTIONS.every((a, i) => boutons[i] && boutons[i].indexOf('onclick="charlyQuickAction(\'' + a + '\')"') > -1));
const style1 = l1 ? (l1[0].match(/<button[^>]*style="([^"]*)"/) || [])[1] : '';
const styles2 = boutons.map((b) => (b.match(/style="([^"]*)"/) || [])[1] || '');
const forme = (s) => s.replace(/background:[^;]*;|color:[^;]*;|border:1px solid [^;]*;/g, '').replace(/\s+/g, ' ').trim();
verifie('meme forme que la 1re ligne (pilules : padding, rayon, taille, graisse), seules les couleurs changent', !!style1 && styles2.every((s) => forme(s) === forme(style1)), forme(style1));
verifie('les deux lignes defilent a l horizontale et ne font qu un bloc blanc (le trait est sous la 2e)', /overflow-x:auto/.test(l1[0]) && /overflow-x:auto/.test(l2[0]) && !/border-bottom/.test(l1[0].split('>')[0]) && /border-bottom:1px solid var\(--border\)/.test(l2[0].split('>')[0]));

titre('2. charlyQuickAction lance le parcours existant');
const appels = [];
const ctx = {
  console, String, Array, Object, JSON, Date,
  charlyIA: { history: [], config: { demoMode: false } },
  renderCharlyChat: () => { appels.push('render'); },
  tcGererContrainte: (t) => { appels.push('contrainte:' + t); },
  tcDemarrerMalade: (t) => { appels.push('malade:' + t); },
  charlyAttachAction: (t) => { appels.push('trombone:' + t); },
  charlySendMessage: () => { appels.push('envoi:' + ctx.document.getElementById('charlyInput').value); },
  tcPrevenirRetard: () => {}, tcDemarrerNouveauRdv: () => {}, tcDemarrerImprevu: () => {}, startAssistant: () => {}, tcDemarrerCalculTrajet: () => {},
  tcDemarrerRdvAPlusieurs: (t) => { appels.push('plusieurs:' + t); },
  tcDemarrerLibre: (t) => { appels.push('libre:' + t); },
  _agendaChecked: null, Set,
  document: { getElementById: () => ctx._champ }, _champ: { value: '' }
};
vm.createContext(ctx);
['let _tcImprevuEnAttente = 0;', 'let _tcGroupeEnAttente = 0;', 'let _tcGroupeEnAttenteDepuis = 0;'].forEach((d) => vm.runInContext(d, ctx));
{ const m = page.match(/const TC_VERBES_DE_DEMANDE = \[[^\]]*\];/); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  TC_VERBES_DE_DEMANDE introuvable'); } }
['tcSansAccents', 'tcRessembleAUneDemande', 'charlyQuickAction'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
verifie('tcRessembleAUneDemande (règle de « qui est-ce ? ») n est déclarée qu une fois dans la page : réutilisée, pas doublée', page.split('function tcRessembleAUneDemande(').length - 1 === 1);
if (!ko) {
  ctx.charlyQuickAction('groupe');
  // Mission 47 : le questionnaire guidé (tcDemarrerRdvAPlusieurs), avec la bulle du bouton.
  verifie('« Rendez-vous à plusieurs » : le questionnaire guidé démarre avec la bulle du bouton', appels.indexOf('plusieurs:Je veux un rendez-vous à plusieurs') > -1, appels.join(' ; '));
  ctx.charlyQuickAction('malade');
  // Mission 43 : le questionnaire guidé (tcDemarrerMalade) ; sans jour dans le texte du bouton, la période est demandée.
  verifie('« Je suis malade, décale tout » : le questionnaire guidé démarre avec le texte du bouton', appels.indexOf('malade:Je suis malade, décale tout') > -1, appels.find((a) => a.indexOf('malade:') === 0));
  ctx.charlyQuickAction('libre');
  // Mission 49 : le questionnaire guidé (tcDemarrerLibre), avec la bulle du bouton ; plus de phrase pré-remplie.
  verifie('« Quand suis-je libre ? » : le questionnaire guidé démarre avec la bulle du bouton', appels.indexOf('libre:Quand suis-je libre ?') > -1 && appels.indexOf('envoi:Quand suis-je libre cette semaine ?') < 0, appels.join(' ; '));
  ctx.charlyQuickAction('photo');
  verifie('« Photo → rendez-vous » : le même chemin que le trombone (Photos)', appels.indexOf('trombone:photo') > -1);
}

titre('3. L ancienne attente « Avec qui ? » (prénoms tapés, deux essais) a disparu : le bouton passe par le questionnaire (mission 47)');
const csm = fonction(page, 'charlySendMessage') || '';
verifie('plus d attente « Avec qui ? » dans charlySendMessage ni dans la page', !/_tcGroupeEnAttente|tcDemandeHorsPrenoms/.test(page) && /const _groupe = tcDetecterRdvGroupe\(text\);/.test(csm));
verifie('la phrase tapée « trouve-nous un créneau avec A et B » suit toujours son chemin (tcDetecterRdvGroupe, tcGererRdvGroupe)', /if \(_groupe\) \{\s+await tcGererRdvGroupe\(text, _groupe\);/.test(csm));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

titre('4. Une contrainte tapée (tcGererContrainte) va jusqu à la liste du jour, avec l apostrophe droite ET typographique');
// Horloge fixee : dimanche 11 octobre 2026, 14h20 ; deux rendez-vous ce jour-la, un demain.
const FIXE = new Date(2026, 9, 11, 14, 20, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const trace = { montres: [] };
const c4 = {
  console, String, Number, Array, Object, RegExp, Promise, parseInt, Date: DateFixe,
  mode: 'user', charlyIA: { history: [] }, contacts: {}, tcContactDuRdv: () => null, renderCharlyChat: () => {},
  tcMinutesDeHeure: () => 0, tcSansTempsProtege: (x) => x,
  events: [
    { id: 'a', mode: 'user', date: '2026-10-11', startH: 15, startM: 0, endH: 16, endM: 0, title: 'Dentiste' },
    { id: 'b', mode: 'user', date: '2026-10-11', startH: 17, startM: 30, endH: 18, endM: 0, title: 'Coach' },
    { id: 'c', mode: 'user', date: '2026-10-12', startH: 9, startM: 0, endH: 10, endM: 0, title: 'Demain' }
  ],
  tcPousserMessageUtilisateur: (t) => { c4.charlyIA.history.push({ role: 'user', content: t }); },
  tcComparerEvenements: (a, b) => (a.date + String(a.startH).padStart(2, '0')) < (b.date + String(b.startH).padStart(2, '0')) ? -1 : 1,
  showContrainte: (touches, label) => { trace.montres.push({ titres: touches.map((e) => e.title), label: label }); }
};
vm.createContext(c4);
let ko4 = 0;
['const TC_VERBES_DE_DEMANDE = [^;]*;', 'const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], c4); else { ko4++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcPeriodeAgenda', 'tcPeriodeContrainte', 'tcRdvDeLaPeriode', 'tcPlageImprevu', 'tcGererContrainte', 'tcViderDonneesDuCompte']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, c4); else { ko4++; console.log('  KO  ' + n + ' introuvable'); } });
ko += ko4;
if (!ko4) {
  const bouton = (fonction(page, 'charlyQuickAction') || '').match(/tcDemarrerMalade\(("|')((?:[^"\\]|\\.)*?)\1\)/);
  verifie('le texte du bouton « malade » est passé à tcDemarrerMalade (mission 43 : le questionnaire guidé)', !!bouton && /malade/.test(bouton[2]), bouton && bouton[2]);
  const essais = ["Je suis malade, décale tout aujourd'hui", 'Je suis malade, décale tout aujourd’hui'];
  (async () => {
    for (const texte of essais) {
      trace.montres.length = 0; c4.charlyIA.history.length = 0;
      await c4.tcGererContrainte(texte);
      verifie('« ' + texte + ' » → la liste des rendez-vous du jour (Dentiste, Coach), label « aujourd’hui »', trace.montres.length === 1 && JSON.stringify(trace.montres[0].titres) === JSON.stringify(['Dentiste', 'Coach']) && /aujourd/.test(trace.montres[0].label), JSON.stringify(trace.montres) + ' / ' + JSON.stringify(c4.charlyIA.history));
    }
    trace.montres.length = 0; c4.charlyIA.history.length = 0;
    await c4.tcGererContrainte('Je suis malade, décale tout');
    verifie('sans jour reconnu, Charly le dit (jamais de bulle sans réponse)', trace.montres.length === 0 && c4.charlyIA.history.length === 2 && /pas compris quel jour/.test(c4.charlyIA.history[1].content), JSON.stringify(c4.charlyIA.history));
    verifie('tcPeriodeContrainte lit « aujourd’hui » et « demain » avec l apostrophe typographique ou droite', !!c4.tcPeriodeContrainte('aujourd’hui') && !!c4.tcPeriodeContrainte("aujourd'hui") && !!c4.tcPeriodeContrainte('demain'));

    titre('5. Le ménage du compte (plus rien à remettre à zéro pour l ancienne attente)');
    verifie('le ménage du compte remet le questionnaire en cours à zéro, et plus rien pour l ancienne attente', /_tcQuestionnaire = null;/.test(fonction(page, 'tcViderDonneesDuCompte') || '') && !/_tcGroupeEnAttente/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));

    console.log('');
    console.log(ko + ' anomalie(s).');
    process.exit(ko ? 1 : 0);
  })();
} else {
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(1);
}
