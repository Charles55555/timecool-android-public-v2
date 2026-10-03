// La palette pastel : lisible, distincte, et jamais definie deux fois
// differemment. Et la reparation des categories fausses.
//
// Charles, 04/10 : des couleurs « beaucoup plus claires, agreables,
// faciles a reconnaitre », famille en orange tres clair, temps libre en
// bleu ciel deux fois plus clair ; et « chez maman » toujours rouge
// parce que le telephone avait renvoye sa copie au serveur.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

const IDS = ['travail', 'sante', 'famille', 'amis', 'sport', 'personnel', 'voyages'];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => (0.299 * rgb(h)[0] + 0.587 * rgb(h)[1] + 0.114 * rgb(h)[2]) / 255;
const dist = (a, b) => Math.sqrt(rgb(a).reduce((t, v, i) => t + Math.pow(v - rgb(b)[i], 2), 0));
function relatif(h) {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contraste = (a, b) => { const x = relatif(a), y = relatif(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const css = {}, js = {};
IDS.forEach((id) => {
  const m = page.match(new RegExp('--cat-' + id + ':\\s*(#[0-9a-fA-F]{6});\\s*--cat-' + id + '-bg:\\s*(#[0-9a-fA-F]{6});\\s*--cat-' + id + '-texte:\\s*(#[0-9a-fA-F]{6});'));
  if (m) css[id] = { color: m[1].toLowerCase(), bg: m[2].toLowerCase(), texte: m[3].toLowerCase() };
  const j = page.match(new RegExp("\\b" + id + ":\\s*\\{\\s*color:\\s*'(#[0-9a-fA-F]{6})',\\s*bg:\\s*'(#[0-9a-fA-F]{6})',\\s*texte:\\s*'(#[0-9a-fA-F]{6})'"));
  if (j) js[id] = { color: j[1].toLowerCase(), bg: j[2].toLowerCase(), texte: j[3].toLowerCase() };
});

titre('Chaque categorie : trois valeurs, deux endroits, identiques');
IDS.forEach((id) => {
  verifie(id + ' : definie en CSS et en JS', !!css[id] && !!js[id]);
  verifie(id + ' : les deux definitions sont identiques',
    !!css[id] && !!js[id] && css[id].color === js[id].color && css[id].bg === js[id].bg && css[id].texte === js[id].texte);
});

titre('Les choix de Charles');
verifie('Famille : orange tres clair', css.famille && rgb(css.famille.color)[0] > 240 && rgb(css.famille.color)[1] > 190 && rgb(css.famille.color)[2] < 160, css.famille && css.famille.color);
verifie('Mon temps libre : bleu ciel deux fois plus clair (#B3E5FC)', css.personnel && css.personnel.color === '#b3e5fc', css.personnel && css.personnel.color);
verifie('Voyages : turquoise clair', css.voyages && css.voyages.color === '#80deea');
verifie('Famille n a plus le jaune d avant', css.famille && css.famille.color !== '#f9ab00');

titre('Agreable : tout est clair, donc le texte des blocs est sombre');
IDS.forEach((id) => {
  verifie(id + ' : assez clair pour du texte sombre', css[id] && lum(css[id].color) > 0.6, css[id] && ('luminance ' + lum(css[id].color).toFixed(2)));
});
verifie('la puce du mois choisit son texte selon la luminance', /tcTexteSombre\(color\) \? ' chip-texte-sombre'/.test(page));
verifie('plus de bouton blanc sur pastel (disponibilites)', !/background:' \+ cat\.color \+ ';color:#fff/.test(page));

titre('Facile a reconnaitre : aucune paire trop proche');
let pire = 999, paire = '';
for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) {
  const d = dist(css[IDS[i]].color, css[IDS[j]].color);
  if (d < pire) { pire = d; paire = IDS[i] + ' / ' + IDS[j]; }
}
verifie('la paire la plus proche est a plus de 45', pire > 45, paire + ' : ' + Math.round(pire));

titre('Lisible : le texte sur la puce claire (WCAG, 4,5 minimum)');
IDS.forEach((id) => {
  const c = contraste(css[id].texte, css[id].bg);
  verifie(id + ' : contraste ' + c.toFixed(1), c >= 4.5);
});

titre('Le texte colore passe par la teinte sombre, pas par le pastel');
verifie('les listes copient aussi « texte »', /cat\.texte = c\.texte;/.test(page) && /c\.texte = TC_COULEURS_CATEGORIES\[c\.id\]\.texte;/.test(page));
verifie('plus de texte ecrit en cat.color dans les dispos', !/color:' \+ cat\.color \+ ';line-height/.test(page) && !/;color:' \+ cat\.color \+ ';font-size:13px/.test(page));

titre('La reparation des categories fausses');
const ctx = { console, String, RegExp, Array, saves: 0 };
ctx.events = [];
ctx.saveEventsToStorage = () => { ctx.saves++; };
vm.createContext(ctx);
['tcSansAccents', 'tcCategorieDesPersonnes', 'tcCategorieDuTitre', 'tcReparerCategories'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const ev = (id, title, cat) => ({ id: id, title: title, cat: cat });
ctx.events = [
  ev('charly_ai_1', 'Rendez-vous chez maman', 'sante'),
  ev('charly_ai_2', 'Partie de golf', 'amis'),
  ev('charly_ai_3', 'Rendez-vous avocat', 'sante'),
  ev('charly_ai_4', 'Rendez-vous dentiste', 'sante'),
  ev('charly_ai_5', 'Dîner entre amis', 'amis'),
  ev('charly_ai_6', 'Chercher les enfants à l\'école', 'famille'),
  ev('rdv_manuel', 'Rendez-vous chez maman', 'sante'),       // cree a la main
  ev('charly_ai_7', 'Cours de tennis', 'sport')
];
const n = ctx.tcReparerCategories();
const parId = (id) => ctx.events.find((e) => e.id === id).cat;
verifie('chez maman : sante → famille', parId('charly_ai_1') === 'famille');
verifie('golf : amis → sport', parId('charly_ai_2') === 'sport');
verifie('avocat : sante → travail', parId('charly_ai_3') === 'travail');
verifie('dentiste reste sante', parId('charly_ai_4') === 'sante');
verifie('diner reste amis', parId('charly_ai_5') === 'amis');
verifie('ce que Charly avait deja bien range ne bouge pas', parId('charly_ai_6') === 'famille' && parId('charly_ai_7') === 'sport');
verifie('ce que Charles a cree a la main ne bouge pas', parId('rdv_manuel') === 'sante');
verifie('trois reparations, un seul enregistrement', n === 3 && ctx.saves === 1, n + ' reparations, ' + ctx.saves + ' enregistrement(s)');
ctx.saves = 0;
verifie('deuxieme passage : rien a reparer, rien enregistre', ctx.tcReparerCategories() === 0 && ctx.saves === 0);
verifie('branchee au chargement des evenements', /events = \[\.\.\.demoEvents, \.\.\.userEvents\];\s*tcReparerCategories\(\);/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
