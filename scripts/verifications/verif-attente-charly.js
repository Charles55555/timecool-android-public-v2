// Les quatre points tournent-ils pendant que Charly cherche ?
//
// Deux pannes seraient invisibles a la lecture du code : une bulle
// qui s'empile a chaque changement de texte -- Charly passe de
// « consultation de l'agenda » a « calcul du trajet » en cours de
// route -- et une bulle qui reste affichee apres la reponse, laissant
// croire que la recherche continue.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* ── Un decor minimal : juste ce que les fonctions touchent ────── */
let creations = 0;              // combien de fois la bulle est nee
let defilements = 0;
let noeuds = {};                // les elements que getElementById voit

function faireBulle() {
  creations++;
  const texte = { textContent: '' };
  return {
    id: 'charlyAttente',
    querySelector: (sel) => (sel === '.tc-attente-texte' ? texte : null),
    remove: () => { delete noeuds.charlyAttente; },
    _texte: texte
  };
}

const corps = {
  scrollHeight: 900,
  set scrollTop(v) { defilements++; },
  get scrollTop() { return 0; },
  insertAdjacentHTML: (ou, html) => {
    if (ou !== 'beforeend') throw new Error('position inattendue : ' + ou);
    if (html.indexOf('id="charlyAttente"') > -1) noeuds.charlyAttente = faireBulle();
  }
};

const ctx = {
  console,
  charlyIA: { isLoading: false },
  document: {
    getElementById: (id) => noeuds[id] || null,
    querySelectorAll: (sel) => ctx._tous(sel)
  },
  _tous: () => []
};
vm.createContext(ctx);
['tcMajAttenteCharly', 'tcDernierMessageCharly'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

function remettre(chargement, statut) {
  noeuds = { charlyChatBody: corps, charlyStatus: { textContent: statut || '' } };
  ctx.charlyIA.isLoading = chargement;
  creations = 0; defilements = 0;
}

titre('La bulle apparait quand Charly cherche');
{
  remettre(true, '⏳ Charly réfléchit…');
  ctx.tcMajAttenteCharly();
  verifie('elle est la', !!noeuds.charlyAttente);
  verifie('elle dit ce que Charly fait',
    noeuds.charlyAttente && noeuds.charlyAttente._texte.textContent.indexOf('réfléchit') > -1,
    noeuds.charlyAttente ? noeuds.charlyAttente._texte.textContent : 'absente');
  verifie('et la conversation descend jusqu a elle', defilements > 0,
    'sinon elle naitrait sous le bord de l ecran, invisible');
}

titre('Elle ne s empile pas');
{
  remettre(true, '⏳ Charly réfléchit…');
  ctx.tcMajAttenteCharly();
  noeuds.charlyStatus.textContent = '\u{1F697} Calcul du trajet vers Lyon…';
  ctx.tcMajAttenteCharly();
  ctx.tcMajAttenteCharly();
  verifie('une seule bulle malgre trois passages', creations === 1,
    creations + ' creation(s) - au-dela, les points repartiraient du bleu a chaque fois');
  verifie('mais son texte suit',
    noeuds.charlyAttente._texte.textContent.indexOf('Lyon') > -1,
    noeuds.charlyAttente._texte.textContent);
}

titre('Elle disparait quand la reponse arrive');
{
  remettre(true, 'cherche');
  ctx.tcMajAttenteCharly();
  ctx.charlyIA.isLoading = false;
  ctx.tcMajAttenteCharly();
  verifie('plus de points apres la reponse', !noeuds.charlyAttente,
    'sinon on croirait la recherche encore en cours');

  remettre(false, 'repos');
  ctx.tcMajAttenteCharly();
  verifie('et rien ne nait quand Charly se repose', !noeuds.charlyAttente);
}

titre('Aucun ecran ne casse');
{
  remettre(true, 'cherche');
  delete noeuds.charlyChatBody;      // on n est pas sur la page de Charly
  let boum = null;
  try { ctx.tcMajAttenteCharly(); } catch (e) { boum = e.message; }
  verifie('hors de la page Charly, rien ne se passe', boum === null, boum || '');

  remettre(true, null);
  delete noeuds.charlyStatus;        // bandeau absent
  boum = null;
  try { ctx.tcMajAttenteCharly(); } catch (e) { boum = e.message; }
  verifie('sans bandeau non plus', boum === null, boum || '');
  verifie('et un texte de secours s affiche',
    !!noeuds.charlyAttente && noeuds.charlyAttente._texte.textContent.length > 0,
    'une bulle muette inquieterait plus qu elle ne rassure');
}

titre('Les boutons se greffent sous le message, pas sous les points');
{
  const message = { nom: 'message' };
  ctx._tous = (sel) => {
    verifie('la bulle est ecartee de la recherche',
      sel.indexOf(':not(#charlyAttente)') > -1, sel);
    return [message];
  };
  verifie('le dernier message est bien le message',
    ctx.tcDernierMessageCharly() === message);
  ctx._tous = () => [];
  verifie('et une conversation vide ne casse rien',
    ctx.tcDernierMessageCharly() === null);
  verifie('plus personne ne lit le dernier enfant a l aveugle',
    page.indexOf("'#charlyChatBody > div:last-child'") === -1,
    'ce selecteur aurait attrape la bulle d attente');
}

titre('Les couleurs du logo, dans l ordre');
{
  const couleurs = ['--g-blue', '--g-red', '--g-yellow', '--g-green'];
  const retards = [];
  couleurs.forEach((c, i) => {
    const re = new RegExp('\\.tc-points span:nth-child\\(' + (i + 1)
      + '\\) \\{ background:var\\(' + c + '\\);\\s*animation-delay:([0-9.]+)s;');
    const m = page.match(re);
    verifie('point ' + (i + 1) + ' : ' + c.replace('--g-', ''), !!m);
    if (m) retards.push(parseFloat(m[1]));
  });
  verifie('ils s allument l un apres l autre',
    retards.length === 4 && retards.every((v, i) => i === 0 || v > retards[i - 1]),
    retards.join('s / ') + 's');
  verifie('et la boucle ne s arrete jamais',
    /\.tc-points span \{[^}]*animation: tcPointPulse [0-9.]+s [a-z-]+ infinite;/.test(page),
    'sans « infinite », les points s eteindraient avant la reponse');
  verifie('un telephone qui limite les animations les voit fixes',
    /prefers-reduced-motion: reduce\) \{ \.tc-points span \{ animation:none;/.test(page));
  verifie('aucun minuteur JavaScript derriere',
    page.indexOf('tcPointPulse') > -1
    && !/setInterval\([^)]*tcPoint/.test(page),
    'l animation doit rester du CSS pur, sinon elle pese sur la page');
}

titre('Le branchement');
verifie('changer l etat de Charly met la bulle a jour',
  /function tcDefinirStatutCharly\([\s\S]{0,400}tcMajAttenteCharly\(\);/.test(page));
verifie('et le redessin de la conversation la remet',
  /body\.innerHTML = charlyIA\.history[\s\S]{0,300}tcMajAttenteCharly\(\);/.test(page),
  'innerHTML efface tout, y compris la bulle');
verifie('plus aucun ecran ne change l etat dans son coin',
  page.indexOf("charlyStatus').textContent =") === -1,
  'dix endroits le faisaient, chacun a sa facon');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
