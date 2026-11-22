// Mission 106, revue par la 107 (Charles, 17/11, textes validés mot pour mot) : l'accueil de la page Charly IA, une idée par
// ligne, un exemple, puis l'invitation à la démonstration et son bouton ; seul dans la conversation (ou conversation vide), il
// est au milieu de la page. Texte de l'app : traduit ligne par ligne, jamais envoyé au modèle, jamais lu comme une proposition.
// Usage : node verif-accueil-charly.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}
const tableau = (nom) => { const m = page.match(new RegExp('const ' + nom + ' = \\[[\\s\\S]*?\\n\\];')); return m ? m[0].replace('const ', 'var ') : ''; };

const NB = String.fromCharCode(160);
const ATTENDU = [
  'Bonjour Charles ! 😊',
  'Je suis Charly, ton assistant TimeCool.',
  'Je peux t’aider à organiser ton agenda, gérer tes rappels et bien plus encore.',
  'Par exemple, écris-moi ou dis-moi ci-dessous' + NB + ':',
  '«' + NB + 'Crée-moi un nouveau rendez-vous demain à 15h chez mon dentiste' + NB + '»',
  'Tu veux voir tout ce dont je suis capable' + NB + '?',
  'Je te montre avec un agenda d’exemple et des contacts d’exemple.',
  'Voir la démonstration'
];

let heure = 10;
const DateFixe = function () { return { getHours: () => heure }; };
const traduits = [];
const ctx = {
  console, JSON, Array, Object, String, Promise, Date: DateFixe,
  userAccount: { firstname: 'Charles' }, currentLanguage: 'fr', TC_TRANSLATE_CACHE: {},
  tcPrenomUtilisateur: () => (ctx.userAccount && ctx.userAccount.firstname) || '',
  escapeHTML: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  tcBulleCharly: (h) => '<bulle>' + h + '</bulle>',
  translateText: (t, l) => { traduits.push(t); const r = '[' + l + '] ' + t; ctx.TC_TRANSLATE_CACHE[l + ':' + t] = r; return Promise.resolve(r); },
  charlyIA: { history: [] }, rendus: 0, renderCharlyChat: () => { ctx.rendus++; }
};
vm.createContext(ctx);
// Mission 129 : les listes de Charly Pro IA, et le choix des listes.
const code = [tableau('TC_CHARLY_ACCUEIL_LIGNES'), tableau('TC_CHARLY_ACCUEIL_EXEMPLES'), tableau('TC_CHARLY_ACCUEIL_DEMO'),
  tableau('TC_CHARLY_PRO_ACCUEIL_LIGNES'), tableau('TC_CHARLY_PRO_ACCUEIL_EXEMPLES'), tableau('TC_CHARLY_PRO_ACCUEIL_DEMO')].concat(
  ['tcAccueilEstPro', 'tcListesAccueilCharly', 'tcLignesAccueilCharly', 'tcMessageAccueilCharly', 'tcEstAccueilCharly', 'tcTraduireAccueilCharly', 'tcRendreAccueilCharly', 'tcRendreAccueilCharlyVide'].map(fonction));
verifie('les textes et les six fonctions de l accueil sont dans la page', code.every(Boolean), code.map((c) => !!c).join(','));
try { vm.runInContext(code.join('\n'), ctx); } catch (e) { verifie('chargement des fonctions', false, e.message); }

(async () => {
  console.log('-- 1. Le texte, mot pour mot --');
  const lignes = vm.runInContext('tcLignesAccueilCharly()', ctx);
  verifie('huit lignes, dans l ordre validé (une idée par ligne, l exemple, l invitation, le bouton)', JSON.stringify(lignes) === JSON.stringify(ATTENDU), JSON.stringify(lignes));
  heure = 19;
  verifie('le soir : « Bonsoir Charles ! 😊 » (comme l accueil d avant)', vm.runInContext('tcLignesAccueilCharly()[0]', ctx) === 'Bonsoir Charles ! 😊');
  heure = 10;
  ctx.userAccount = { firstname: '' };
  verifie('sans prénom : « Bonjour ! 😊 »', vm.runInContext('tcLignesAccueilCharly()[0]', ctx) === 'Bonjour ! 😊');
  ctx.userAccount = { firstname: 'Charles' };
  const msg = vm.runInContext('tcMessageAccueilCharly()', ctx);
  verifie('le message rangé : texte de l app (appText, fr) marqué accueil, version 107, une ligne par idée', msg.role === 'assistant' && msg.appText === true && msg.accueil === true && msg.v === 107 && msg.fr === ATTENDU.join('\n') && msg.content === msg.fr, JSON.stringify(msg));

  console.log('-- 2. Le dessin --');
  const seul = vm.runInContext('tcRendreAccueilCharly(tcMessageAccueilCharly(), true)', ctx);
  verifie('seul : au milieu de la page (horizontalement et verticalement)', /id="tcAccueilCharly" style="min-height:100%;[^"]*display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;/.test(seul), seul.slice(0, 300));
  verifie('seul : largeur bornée, rien ne dépasse (retour à la ligne)', /max-width:560px; overflow-wrap:break-word;/.test(seul));
  verifie('l exemple en texte simple ; un seul bouton : « Voir la démonstration »', (seul.match(/class="tc-accueil-exemple"/g) || []).length === 1 && (seul.match(/<button/g) || []).length === 1 && /<button id="tcBoutonDemo" onclick="tcDemanderAccordDemo\(\)"[^>]*>Voir la démonstration<\/button>/.test(seul));   // 22/11 : l'accord d'abord
  verifie('chaque ligne a son bloc', ATTENDU.slice(0, -1).every((l) => seul.indexOf('>' + l + '</div>') > -1));
  const bulle = vm.runInContext('tcRendreAccueilCharly(tcMessageAccueilCharly(), false)', ctx);
  verifie('dans une conversation commencée : la même chose dans une bulle de Charly (le bouton aussi)', /^<bulle>/.test(bulle) && (bulle.match(/tc-accueil-exemple/g) || []).length === 1 && /tcBoutonDemo/.test(bulle) && bulle.indexOf('tcAccueilCharly') < 0);
  const ancien = vm.runInContext("tcRendreAccueilCharly({ content: 'Bonjour ! 😊\\nJe suis Charly, ton assistant TimeCool.\\na\\nb\\n« 1 »\\n« 2 »\\n« 3 »', accueil: true }, false)", ctx);
  verifie('un accueil de la 106 déjà dans une conversation : ses lignes, sans bouton', (ancien.match(/tc-accueil-exemple/g) || []).length === 3 && ancien.indexOf('tcBoutonDemo') < 0, ancien.slice(0, 300));
  verifie('vide : le même accueil, avec le prénom', vm.runInContext('tcRendreAccueilCharlyVide()', ctx) === seul);
  verifie('l ancien accueil d une ligne est reconnu ; une réponse ordinaire non', vm.runInContext("tcEstAccueilCharly({ role: 'assistant', appText: true, fr: 'Bonjour ! 😊 Je suis Charly, ton assistant TimeCool. Je peux…' }) && !tcEstAccueilCharly({ role: 'assistant', content: 'Je suis Charly' }) && !tcEstAccueilCharly({ role: 'user', appText: true, content: 'Je suis Charly' })", ctx) === true);

  console.log('-- 3. Les langues --');
  const t = await vm.runInContext("tcTraduireAccueilCharly(tcMessageAccueilCharly().fr, 'en')", ctx);
  verifie('traduit ligne par ligne : huit lignes traduites (le bouton aussi), chacune à sa place', t.split('\n').length === 8 && t.split('\n').every((l, i) => l === '[en] ' + ATTENDU[i]) && traduits.length === 8, t);
  ctx.currentLanguage = 'en';
  const vide = vm.runInContext('tcRendreAccueilCharlyVide()', ctx);
  verifie('conversation vide en anglais : les lignes déjà traduites (cache) s affichent tout de suite', vide.indexOf('[en] ' + ATTENDU[1]) > -1 && vide.indexOf('>[en] Voir la démonstration</button>') > -1);
  ctx.currentLanguage = 'de'; ctx.translateText = (x) => Promise.resolve(x); ctx.rendus = 0;
  vm.runInContext('tcRendreAccueilCharlyVide()', ctx);
  await new Promise((r) => setTimeout(r, 10));
  verifie('traduction en échec : pas de redessin en boucle', ctx.rendus === 0, ctx.rendus);
  ctx.currentLanguage = 'fr';

  console.log('-- 4. La page --');
  const rendu = fonction('renderCharlyChat');
  verifie('renderCharlyChat : vide → accueil au milieu ; rien que l accueil → au milieu ; sinon les bulles', /if \(!charlyIA\.history\.length\) \{ body\.innerHTML = tcRendreAccueilCharlyVide\(\); return; \}/.test(rendu) && /if \(charlyIA\.history\.length === 1 && tcEstAccueilCharly\(charlyIA\.history\[0\]\)\) \{ body\.innerHTML = tcRendreAccueilCharly\(charlyIA\.history\[0\], true\); return; \}/.test(rendu));
  verifie('un accueil d avant (d une ligne, ou de la 106), seul, est remplacé par le nouveau (avant l enregistrement)', /tcChargerHistoriqueCharly\(\);\s+\/\/ Missions 106 et 107[^\n]*\n\s+if \(charlyIA\.history\.length === 1 && tcEstAccueilCharly\(charlyIA\.history\[0\]\) && charlyIA\.history\[0\]\.v !== 107\) \{\s+charlyIA\.history\[0\] = tcMessageAccueilCharly\(\);\s+setTimeout\(tcSyncCharlyGreeting, 0\);\s+\}\s+tcSauverHistoriqueCharly\(\);/.test(rendu));
  verifie('plus d ancien accueil « Bonjour, je suis Charly IA »', page.indexOf('Bonjour, je suis Charly IA') < 0);
  verifie('dans la conversation, l accueil ne passe jamais par la lecture des propositions (15h…)', /function renderChatMessage\(m\) \{\n  if \(m && m\.accueil\) return tcRendreAccueilCharly\(m, false\);/.test(page));
  verifie('les deux chemins de connexion rangent ce même accueil, seulement si la conversation est vide', (page.match(/if \(!charlyIA\.history\.length\) charlyIA\.history\.push\(tcMessageAccueilCharly\(\)\);/g) || []).length === 2 && page.indexOf('const _accueil') < 0);
  verifie('la traduction de l accueil passe ligne par ligne', fonction('tcSyncCharlyGreeting').indexOf('(msg.accueil ? tcTraduireAccueilCharly(msg.fr, currentLanguage) : translateText(msg.fr, currentLanguage))') > -1);
  verifie('le modèle ne reçoit jamais l accueil (texte de l app)', /\.filter\(m => m && \(m\.role === 'user' \|\| m\.role === 'assistant'\) && !m\.appText && !m\._app\)/.test(page));

  console.log('-- 4. Mission 129 : l accueil de Charly Pro IA (celui de Charly IA ne change pas d un mot) --');
  const ATTENDU_PRO = [
    'Bonjour Charles ! 😊',
    'Je suis Charly Pro IA, ton assistant TimeCool.',
    'Je peux t’aider à organiser ton agenda, prévenir tes clients d’un retard, décaler tes rendez-vous de la matinée, de la journée ou de la semaine et bien plus encore.',
    'Par exemple, écris-moi ou dis-moi ci-dessous' + NB + ':',
    '«' + NB + 'Crée-moi un nouveau rendez-vous avec mon commercial demain à 15h durant 30 minutes' + NB + '»',
    'Tu veux voir tout ce dont je suis capable' + NB + '?',
    'Je te montre avec un agenda d’exemple et des contacts clients d’exemple.',
    'Voir la démonstration'
  ];
  ctx.tcCharlyVariante = 'pro';
  const lignesPro = vm.runInContext('tcLignesAccueilCharly()', ctx);
  verifie('Charly Pro IA : huit lignes, le texte dicté par Charles, mot pour mot (même salutation)', JSON.stringify(lignesPro) === JSON.stringify(ATTENDU_PRO), JSON.stringify(lignesPro));
  const msgPro = vm.runInContext('tcMessageAccueilCharly()', ctx);
  const seulPro = vm.runInContext('tcRendreAccueilCharly(tcMessageAccueilCharly(), true)', ctx);
  verifie('Charly Pro IA : l accueil rangé est marqué pro, dessiné avec ses lignes, son exemple et le bouton', msgPro.pro === true && msgPro.v === 107 && seulPro.indexOf('Je suis Charly Pro IA') > -1 && seulPro.indexOf('tc-accueil-exemple') > -1 && seulPro.indexOf('mon commercial demain à 15h durant 30 minutes') > -1 && seulPro.indexOf('contacts clients d’exemple') > -1 && seulPro.indexOf('tcDemanderAccordDemo()') > -1, seulPro.slice(0, 300));
  ctx.tcCharlyVariante = 'ia';
  const lignesIA = vm.runInContext('tcLignesAccueilCharly()', ctx);
  verifie('Charly IA : son accueil ne change pas d un mot (et n est pas marqué pro)', JSON.stringify(lignesIA) === JSON.stringify(ATTENDU) && !vm.runInContext('tcMessageAccueilCharly()', ctx).pro, JSON.stringify(lignesIA));

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO ' + e.message); process.exit(1); });
