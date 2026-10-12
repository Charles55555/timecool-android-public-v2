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
  charlyAttachAction: (t) => { appels.push('trombone:' + t); },
  charlySendMessage: () => { appels.push('envoi:' + ctx.document.getElementById('charlyInput').value); },
  tcPrevenirRetard: () => {}, tcDemarrerNouveauRdv: () => {}, tcDemarrerImprevu: () => {}, startAssistant: () => {}, tcDemarrerCalculTrajet: () => {},
  _agendaChecked: null, Set,
  document: { getElementById: () => ctx._champ }, _champ: { value: '' }
};
vm.createContext(ctx);
['let _tcImprevuEnAttente = 0;', 'let _tcGroupeEnAttente = 0;'].forEach((d) => vm.runInContext(d, ctx));
['tcDemarrerRdvAPlusieurs', 'charlyQuickAction'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (!ko) {
  ctx.charlyQuickAction('groupe');
  verifie('« Rendez-vous à plusieurs » : Charly demande « Avec qui ? » et attend les prénoms (2 essais)', ctx.charlyIA.history.length === 1 && /^Avec qui \?/.test(ctx.charlyIA.history[0].content) && vm.runInContext('_tcGroupeEnAttente', ctx) === 2 && appels.indexOf('render') > -1, ctx.charlyIA.history[0] && ctx.charlyIA.history[0].content);
  ctx.charlyQuickAction('malade');
  // Apostrophe droite obligatoire : tcPeriodeAgenda lit /aujourd'?hui/ sur le texte brut.
  verifie('« Je suis malade, décale tout » : la contrainte du jour (liste des rendez-vous, puis annuler / déplacer et s’excuser), avec « aujourd\'hui » reconnu, et l attente « Avec qui ? » tombe', appels.indexOf("contrainte:Je suis malade, décale tout aujourd'hui") > -1 && /aujourd'?hui/.test(appels.find((a) => a.indexOf('contrainte:') === 0) || '') && vm.runInContext('_tcGroupeEnAttente', ctx) === 0, appels.find((a) => a.indexOf('contrainte:') === 0));
  ctx.charlyQuickAction('libre');
  verifie('« Quand suis-je libre ? » : la question est pré-remplie et envoyée', appels.indexOf('envoi:Quand suis-je libre cette semaine ?') > -1, appels.join(' ; '));
  ctx.charlyQuickAction('photo');
  verifie('« Photo → rendez-vous » : le même chemin que le trombone (Photos)', appels.indexOf('trombone:photo') > -1);
}

titre('3. La réponse à « Avec qui ? » dans charlySendMessage');
const csm = fonction(page, 'charlySendMessage') || '';
verifie('avec deux contacts cités, le parcours « à plusieurs » démarre sans mot de rendez-vous, avant la détection habituelle', /if \(_tcGroupeEnAttente > 0\) \{\s+const cites = tcComptesCitesDansTexte\(text\);\s+if \(cites\.length >= 2\) \{ _tcGroupeEnAttente = 0; await tcGererRdvGroupe\(text, \{ contacts: cites, duree: 1 \}\); return; \}[\s\S]*?\}\s+const _groupe = tcDetecterRdvGroupe\(text\);/.test(csm));
verifie('sans deux prénoms, Charly redemande une fois puis laisse le message suivre son chemin', /_tcGroupeEnAttente -= 1;\s+if \(_tcGroupeEnAttente > 0\) \{[\s\S]*?tcPhraseNonCompris\('Avec qui \?/.test(csm));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
