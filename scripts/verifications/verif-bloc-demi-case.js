// Tout rendez-vous de MOINS d'une heure s'affiche sur une DEMI-case (vues Semaine et Jour),
// quelle que soit sa duree (15, 30 ou 45 minutes) : Charles, 11/10 (capture : « Cours de tennis
// 14h-14h15 » avait la meme hauteur que « Inconnu Testeur 14h-15h »). Pas de hauteur proportionnelle.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && d !== '' ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* ---- Un petit navigateur de poche ---- */
const registre = {};
function element(id) {
  const e = { id: id || '', children: [], style: {}, _html: '', _classes: new Set(), className: '', textContent: '', offsetWidth: 80 };
  e.classList = { add: (c) => e._classes.add(c), remove: (c) => e._classes.delete(c),
    contains: (c) => e._classes.has(c) || e.className.split(/\s+/).includes(c) };
  Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; e.children = []; } });
  e.appendChild = (c) => { e.children.push(c); return c; };
  return e;
}
const doc = { getElementById: (id) => registre[id] || null, createElement: () => element() };
const captures = [];
const ctx = {
  String, Number, Math, Date, Array, Set, JSON, parseInt, console,
  document: doc, requestAnimationFrame: (f) => f(), currentLanguage: 'fr', mode: 'user',
  agendaStartH: 8, agendaEndH: 19, today: new Date(2026, 9, 7), viewDate: new Date(2026, 9, 7), events: [],
  tcReperesDuJour: () => [], tcEvenementsDuJour: () => [], tcAppliquerCouleurEvenement: () => {},
  tcIconeType: () => '', tcHorairePlage: (e) => e.startH + 'h-' + e.endH + 'h' + (e.endM ? e.endM : ''), tcBandeauRepere: () => element(),
  tcRendreDeplacable: (el, e, geo) => { captures.push({ el, e, geo }); },
  localStorage: { getItem: () => null }, openEventModal: () => {},
};
vm.createContext(ctx);
const constHaut = (page.match(/const TC_BLOC_HAUTEUR_HEURE = \d+;/) || [''])[0];
verifie('la hauteur d\'un rendez-vous d\'une heure est une constante nommee (42 px, l\'ancienne hauteur minimale)', /= 42;/.test(constHaut), constHaut);
try {
  vm.runInContext(constHaut.replace(/^const /, 'var '), ctx);
  ['MONTHS', 'DAYS_FULL', 'DAYS_SHORT'].forEach((c) => { const m = page.match(new RegExp('const ' + c + ' = [\\s\\S]*?;\\n')); vm.runInContext(m[0].replace(/^const /, 'var '), ctx); });
  ['fmt', 'sameDay', 'isProClosed', 'escapeHTMLSafe', 'tcDayShort', 'tcPremierJourSemaine', 'tcDecalageSemaine', 'tcHauteurBloc', 'renderWeek', 'renderDay']
    .forEach((n) => { const s = extraire(n); if (!s) throw new Error('fonction introuvable : ' + n); vm.runInContext(s, ctx); });
} catch (e) {
  console.log('  KO  chargement : ' + e.message);
  console.log(''); console.log('1 anomalie(s).'); process.exit(1);
}
const H = (vue, min) => ctx.tcHauteurBloc(vue, min);

titre('La fonction de hauteur : moins d\'une heure = demi-case');
['week', 'day'].forEach((vue) => {
  const nom = vue === 'week' ? 'Semaine' : 'Jour';
  [15, 30, 45, 59].forEach((m) => verifie(nom + ' : ' + m + ' min → demi-case (21 px, moitie d\'un rendez-vous d\'une heure)', H(vue, m).px === 21 && H(vue, m).court === true, JSON.stringify(H(vue, m))));
  verifie(nom + ' : 15, 30, 45 et 59 min ont EXACTEMENT la meme hauteur (pas de proportion)', new Set([15, 30, 45, 59].map((m) => H(vue, m).px)).size === 1);
  verifie(nom + ' : 60 min → 42 px (inchange), pas une demi-case', H(vue, 60).px === 42 && H(vue, 60).court === false, JSON.stringify(H(vue, 60)));
  verifie(nom + ' : 90 min → ' + (vue === 'week' ? 64 : 66) + ' px (inchange)', Math.abs(H(vue, 90).px - (vue === 'week' ? 90 * 44 / 60 - 2 : 90 * 48 / 60 - 6)) < 1e-9 && H(vue, 90).court === false, JSON.stringify(H(vue, 90)));
  verifie(nom + ' : 180 min → proportionnel comme avant', Math.abs(H(vue, 180).px - (vue === 'week' ? 180 * 44 / 60 - 2 : 180 * 48 / 60 - 6)) < 1e-9);
  verifie(nom + ' : une duree nulle ou negative n\'est pas plus haute qu\'une demi-case', H(vue, 0).px === 21 && H(vue, -30).px === 21);
});
verifie('les durees d\'une heure et plus donnent exactement l\'ancien calcul, des deux vues',
  [60, 75, 90, 120, 240].every((m) => H('week', m).px === Math.max(m * (44 / 60) - 2, 42) && H('day', m).px === Math.max(m * (48 / 60) - 6, 42)));

titre('La vue Semaine : ce que l\'on voit');
const E = (id, titre, date, h1, m1, h2, m2) => ({ id, title: titre, date, startH: h1, startM: m1, endH: h2, endM: m2, mode: 'user', cat: 'travail' });
const evSem = [
  E('tennis', '🎾 Cours de tennis', '2026-10-06', 14, 0, 14, 15),
  E('inconnu', 'Inconnu Testeur', '2026-10-07', 14, 0, 15, 0),
  E('demi', 'Dentiste', '2026-10-08', 14, 0, 14, 30),
  E('troisq', 'Reunion', '2026-10-09', 14, 0, 14, 45),
  E('court1', 'Appel', '2026-10-10', 14, 0, 14, 15),
  E('court2', 'Suivi', '2026-10-10', 14, 15, 14, 30),
  E('long', 'Atelier', '2026-10-05', 10, 0, 11, 30),
];
ctx.events = evSem;
ctx.tcEvenementsDuJour = (j, bandeau) => evSem.filter((x) => x.date === j && !bandeau);
registre.weekHeader = element('weekHeader'); registre.weekBody = element('weekBody'); registre.weekBody.offsetWidth = 50 + 7 * 48;
captures.length = 0;
ctx.renderWeek();
const bw = registre.weekBody.children.filter((c) => /week-event/.test(c.className) || c.classList.contains('week-event'));
const parId = (id) => bw.find((b) => b.innerHTML.indexOf(evSem.find((e) => e.id === id).title) >= 0);
verifie('sept rendez-vous dessines', bw.length === 7, bw.length);
const px = (id) => parseFloat(parId(id).style.height);
verifie('« Cours de tennis 14h-14h15 » : 21 px, marque « bloc-court »', px('tennis') === 21 && parId('tennis').classList.contains('bloc-court'));
verifie('« Inconnu Testeur 14h-15h » juste a cote : 42 px, le double (la capture de Charles)', px('inconnu') === 42 && !parId('inconnu').classList.contains('bloc-court'));
verifie('le tennis fait la MOITIE de l\'autre', px('tennis') * 2 === px('inconnu'));
verifie('30 et 45 minutes : la meme demi-case que 15 minutes', px('demi') === 21 && px('troisq') === 21);
verifie('90 minutes : ' + (90 * 44 / 60 - 2) + ' px, inchange', px('long') === 90 * 44 / 60 - 2 && !parId('long').classList.contains('bloc-court'));
verifie('le bloc court part de l\'heure de debut (14h00 → 264 px), comme celui d\'une heure', parId('tennis').style.top === parId('inconnu').style.top && parseFloat(parId('tennis').style.top) === 6 * 60 * 44 / 60);
verifie('14h15 : 11 px plus bas que 14h00 (la position suit l\'heure de debut, pas la hauteur)', parseFloat(parId('court2').style.top) - parseFloat(parId('court1').style.top) === 11);
verifie('le deplacement au doigt garde l\'echelle du dessin (44/60 px par minute) et la vraie duree',
  captures.length === 7 && captures.every((c) => c.geo.pxParMin === 44 / 60) && captures.find((c) => c.e.id === 'tennis').e.endM === 15 && captures.find((c) => c.e.id === 'tennis').e.endH === 14);

titre('La vue Jour : ce que l\'on voit');
const evJour = [E('j1', 'Point', '2026-10-07', 11, 0, 11, 45), E('j2', 'Tennis', '2026-10-07', 16, 0, 16, 15), E('j3', 'Reunion', '2026-10-07', 17, 0, 18, 0), E('j4', 'Atelier', '2026-10-07', 9, 0, 10, 30)];
ctx.events = evJour;
ctx.tcEvenementsDuJour = (j, bandeau) => evJour.filter((x) => x.date === j && !bandeau);
['dayDate', 'dayName', 'dayBody'].forEach((i) => { registre[i] = element(i); });
captures.length = 0;
ctx.renderDay();
const bj = registre.dayBody.children.filter((c) => /day-event/.test(c.className));
const pj = (titre2) => bj.find((b) => b.innerHTML.indexOf(titre2) >= 0);
verifie('quatre rendez-vous dessines', bj.length === 4, bj.length);
verifie('45 minutes et 15 minutes : meme demi-case (21 px)', parseFloat(pj('Point').style.height) === 21 && parseFloat(pj('Tennis').style.height) === 21 && pj('Point').classList.contains('bloc-court') && pj('Tennis').classList.contains('bloc-court'));
verifie('une heure : 42 px, inchange', parseFloat(pj('Reunion').style.height) === 42 && !pj('Reunion').classList.contains('bloc-court'));
verifie('90 minutes : 66 px, inchange', parseFloat(pj('Atelier').style.height) === 66);
verifie('position : 11h00 → (11-8)*48 + 8 = 152 px (l\'heure de debut)', parseFloat(pj('Point').style.top) === 152);
verifie('l\'echelle du glisser en vue Jour reste 48/60 px par minute', captures.every((c) => c.geo.pxParMin === 48 / 60));
verifie('le titre et l\'horaire restent dans le bloc (rien n\'est retire du contenu)', /day-event-title/.test(pj('Tennis').innerHTML) && /16:00 – 16:15/.test(pj('Tennis').innerHTML));

titre('Le texte tient dans une demi-case (le style)');
const css = (re) => (page.match(re) || [''])[0];
const ligneSemaine = css(/\.week-event\.bloc-court \{[^}]*\}/);
verifie('Semaine : deux lignes compactes (titre 9 px + horaire 8 px) dans 21 px', /padding:1px 3px/.test(ligneSemaine) && /line-height:1\.05/.test(ligneSemaine)
  && /\.week-event\.bloc-court \.week-event-title \{ font-size:9px; \}/.test(page) && /\.week-event\.bloc-court \.week-event-time \{[^}]*font-size:8px/.test(page), ligneSemaine);
const hSem = 1 * 2 + 9 * 1.05 + 8 * 1.05;
verifie('Semaine : 2 + 9×1,05 + 8×1,05 = ' + hSem.toFixed(1) + ' px ≤ 21 px : rien de coupe en hauteur', hSem <= 21, hSem);
const ligneJour = css(/\.day-event\.bloc-court \{[^}]*\}/);
verifie('Jour : une seule ligne « titre · horaire » (flex, sans retour a la ligne)', /display:flex/.test(ligneJour) && /white-space:nowrap/.test(ligneJour) && /align-items:center/.test(ligneJour), ligneJour);
const hJour = 2 * 2 + 12 * 1.25;
verifie('Jour : 4 + 12×1,25 = ' + hJour + ' px ≤ 21 px', hJour <= 21, hJour);
verifie('Jour : le titre se tronque avec des points de suspension, l\'horaire garde sa place', /\.day-event\.bloc-court \.day-event-title \{[^}]*text-overflow:ellipsis/.test(page) && /\.day-event\.bloc-court \.day-event-time \{[^}]*flex:0 0 auto/.test(page));
verifie('Jour : un point median separe le titre de l\'horaire', /\.day-event\.bloc-court \.day-event-time::before \{ content:'· '; \}/.test(page));

titre('Rien d\'autre ne change');
verifie('plus de hauteur minimale en dur dans les deux vues (une seule fonction)', !/Math\.max\(dm\*\(44\/60\)-2, 42\)/.test(page) && !/Math\.max\(dm\*\(48\/60\)-6, 42\)/.test(page));
verifie('les deux vues passent par tcHauteurBloc', /tcHauteurBloc\('week', dm\)/.test(page) && /tcHauteurBloc\('day', dm\)/.test(page));
verifie('aucun nouveau reglage', !/tc_bloc|tc_demi|tc_hauteur/.test(page));
verifie('le texte des rendez-vous d\'une heure et plus n\'est pas touche (aucune regle pour eux)', !/\.week-event:not|\.day-event:not/.test(page));

console.log('');
console.log(ko ? ko + ' anomalie(s).' : 'Tout est bon.');
process.exit(ko ? 1 : 0);
