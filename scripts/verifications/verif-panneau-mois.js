// Le panneau du mois, comme Google Agenda : toucher « Octobre 2026 »
// déplie la grille du mois (semaines, aujourd'hui, points), une rangée
// de mois sur cinq ans ; choisir un mois ou un jour déplace la vue du
// dessous, le panneau reste ouvert. Charles, 06/10 (vidéo).
//
// Charles, 06/10 (capture du web) : « on ne voit plus les jours de la
// semaine de l'agenda en dessous » → l'écran se divise en deux : le
// panneau n'est plus posé par-dessus, il pousse l'agenda vers le bas.
//
// Revue indépendante du 06/10 (4 examinateurs, sceptiques) : la rangée
// des mois se centre à la main (jamais scrollIntoView, qui faisait défiler
// le panneau), reste centrée à chaque ouverture, les points suivent les
// types et agendas masqués, l'en-tête tient sur une ligne, et sous 500 px
// de haut (paysage) le panneau passe à gauche, l'agenda à droite.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 160) : ''));
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
function extraireConst(nom) { const m = page.match(new RegExp('const ' + nom + ' = [\\s\\S]*?;\\n')); return m ? m[0] : null; }

/* Horloge fixée : mardi 6 octobre 2026. */
const FIXE = new Date(2026, 9, 6, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}
const trace = { rendus: 0, ecoutes: [], retires: [], classes: new Set(), rangees: 0 };
/* Une rangée de mois qui se comporte comme dans un navigateur : cachée, son défilement vaut 0 ;
 * redessinée (innerHTML), une nouvelle rangée repart de 0. */
function nouvelleRangee() {
  trace.rangees++;
  const r = { _sl: 0, attrs: {} };
  Object.defineProperty(r, 'scrollLeft', { get() { return panneau.style.display === 'block' ? r._sl : 0; }, set(v) { r._sl = v; } });
  r.getAttribute = (k) => (k in r.attrs ? r.attrs[k] : null);
  r.setAttribute = (k, v) => { r.attrs[k] = v; };
  r.getBoundingClientRect = () => ({ left: 0, width: 300 });
  const bouton = { getBoundingClientRect: () => ({ left: 1500, width: 50 }) };
  r.querySelector = () => bouton;
  return r;
}
const panneau = {
  style: {}, _html: '', rangee: null, contains: () => false,
  get offsetWidth() { return this.style.display === 'block' ? 400 : 0; },
  get innerHTML() { return this._html; },
  set innerHTML(v) { this._html = v; this.rangee = nouvelleRangee(); },
  querySelector(sel) { return sel === '#tcMoisRangee' ? this.rangee : null; }
};
const pageCalendrier = { classList: { add: (c) => trace.classes.add(c), remove: (c) => trace.classes.delete(c) } };
/* setTimeout comme un navigateur : la fonction part APRÈS le code en cours (le panneau est alors affiché). */
const file = [];
const vider = () => { while (file.length) file.shift()(); };
const ctx = {
  console, Date: DateFixe,
  mode: 'user', events: [], viewDate: new DateFixe(2026, 9, 6),
  masquees: [], calendriersMasques: [],
  isCategoryVisible: (c) => ctx.masquees.indexOf(c) < 0,
  isCalendarVisible: (c) => ctx.calendriersMasques.indexOf(c) < 0,
  render() { trace.rendus++; },
  setTimeout: (f) => { file.push(f); return 0; },
  document: {
    getElementById: (id) => (id === 'tcMoisPanneau' ? panneau : (id === 'page-calendar' ? pageCalendrier : null)),
    querySelector: () => null,
    addEventListener: (t) => trace.ecoutes.push(t),
    removeEventListener: (t) => trace.retires.push(t)
  }
};
vm.createContext(ctx);
['MONTHS', 'TC_MOIS_COURTS'].forEach((c) => { const src = extraireConst(c); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + c + ' introuvable'); } });
vm.runInContext('let _tcMoisPanneauDate = null;', ctx);
['tcISO', 'getISOWeek', 'tcEvenementFin', 'tcJoursAvecRdv', 'tcPanneauMoisHTML', 'tcDessinerPanneauMois', 'tcBasculerPanneauMois',
 'tcFermerPanneauMois', 'tcPanneauMoisChanger', 'tcPanneauMoisChoisir', 'tcPanneauMoisAller'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const cellule = (html, iso) => { const i = html.indexOf('data-jour="' + iso + '"'); const f = html.indexOf('data-jour=', i + 10); return html.slice(i, f < 0 ? html.indexOf('id="tcMoisRangee"') : f); };
const nbPoints = (c) => (c.match(/width:4px; height:4px/g) || []).length;
const cles = (m) => Array.from(m.keys()).sort().join(',');

titre('La grille d octobre 2026');
const html = vm.runInContext("tcPanneauMoisHTML(new Date(2026, 9, 1), '2026-10-06', new Map([['2026-10-01', 1], ['2026-10-03', 2], ['2026-10-10', 3], ['2026-10-20', 7]]), '2026-10-20')", ctx);
const semaines = (html.match(/background:#f1f3f4; border-radius:8px; margin:2px 0;">(\d+)</g) || []).map((x) => x.match(/>(\d+)</)[1]);
verifie('titre « Octobre 2026 »', /Octobre 2026/.test(html));
verifie('les semaines 40 à 44, comme Google', semaines.join(',') === '40,41,42,43,44', semaines.join(','));
verifie('l en-tête L M M J V S D', /<div><\/div>(<div[^>]*>[LMJVSD]<\/div>){7}/.test(html));
const jours = (html.match(/data-jour="(\d{4}-\d{2}-\d{2})"/g) || []).map((x) => x.slice(11, 21));
verifie('31 jours, du 1er au 31, et rien avant le jeudi 1er', jours.length === 31 && jours[0] === '2026-10-01' && jours[30] === '2026-10-31' && /margin:2px 0;">40<\/div><div><\/div><div><\/div><div><\/div><div onclick="tcPanneauMoisAller\('2026-10-01'\)"/.test(html));
verifie('aujourd hui (le 6) est entouré en bleu', /background:var\(--g-blue\); color:#fff/.test(cellule(html, '2026-10-06')));
verifie('le jour choisi (le 20) est marqué en bleu clair', /background:#e8f0fe/.test(cellule(html, '2026-10-20')) && !/background:#e8f0fe/.test(cellule(html, '2026-10-21')));
verifie('1 rendez-vous : 1 point ; 2 : 2 points ; 3 : 3 points', nbPoints(cellule(html, '2026-10-01')) === 1 && nbPoints(cellule(html, '2026-10-03')) === 2 && nbPoints(cellule(html, '2026-10-10')) === 3);
verifie('7 rendez-vous : 3 points et « + » ; aucun : rien', nbPoints(cellule(html, '2026-10-20')) === 3 && />\+<\/span>/.test(cellule(html, '2026-10-20')) && nbPoints(cellule(html, '2026-10-05')) === 0 && !/>\+</.test(cellule(html, '2026-10-10')));
verifie('toucher un jour appelle tcPanneauMoisAller avec sa date', /onclick="tcPanneauMoisAller\('2026-10-20'\)"/.test(html));
verifie('le tout est centré, 480 px au plus (même sur un grand écran)', html.indexOf('<div style="max-width:480px; margin:0 auto;">') === 0 && html.endsWith('</div></div>'));

titre('La rangée des mois : cinq ans');
const rangee = html.slice(html.indexOf('id="tcMoisRangee"'));
const mois = (rangee.match(/data-mois="(\d{4}-\d{2})"/g) || []).map((x) => x.slice(11, 18));
verifie('d octobre 2024 à octobre 2029 (2 ans avant, 3 après)', mois[0] === '2024-10' && mois[mois.length - 1] === '2029-10' && mois.length === 61, mois[0] + ' … ' + mois[mois.length - 1] + ' (' + mois.length + ')');
verifie('les noms courts : sept. oct. nov. déc.', /sept\.<\/button>/.test(rangee) && /oct\.<\/button>/.test(rangee) && /déc\.<\/button>/.test(rangee));
verifie('oct. 2026 seul en bleu, marqué actif', (rangee.match(/data-actif="1"/g) || []).length === 1 && /data-mois="2026-10" data-actif="1"/.test(rangee));
verifie('les années rappelées : 2025, 2026, 2027, 2028, 2029', ['2025', '2026', '2027', '2028', '2029'].every((a) => new RegExp('padding:0 4px;">' + a + '</div>').test(rangee)));
verifie('toucher un mois le choisit', /onclick="tcPanneauMoisChoisir\(2027,0\)"/.test(rangee));
verifie('boutons de mois assez hauts pour le doigt (8 px de marge, soit ~33 px)', /padding:8px 12px; border-radius:12px/.test(rangee));

titre('Les jours avec rendez-vous, comptés comme l agenda les montre');
ctx.events = [
  { id: 'a', title: 'A', date: '2026-10-03', mode: 'user' }, { id: 'b', title: 'B', date: '2026-10-03', mode: 'user' },
  { id: 'v', title: 'Voyage', date: '2026-10-10', dateFin: '2026-10-12', mode: 'user' },
  { id: 'p', title: 'Pro', date: '2026-10-20', mode: 'pro' }
];
const avec = vm.runInContext('Array.from(tcJoursAvecRdv().entries()).sort().map(([j, n]) => j + ":" + n).join(",")', ctx);
verifie('le 3 (2 rendez-vous), le voyage du 10 au 12 ; pas le rendez-vous pro', avec === '2026-10-03:2,2026-10-10:1,2026-10-11:1,2026-10-12:1', avec);
const octobre = (liste) => { ctx.events = liste; return vm.runInContext('tcJoursAvecRdv(new Date(2026, 9, 1))', ctx); };
ctx.masquees = ['famille']; ctx.calendriersMasques = ['cal2'];
verifie('un type masqué (famille) et un agenda masqué ne laissent pas de point', cles(octobre([
  { id: 'f', date: '2026-10-19', cat: 'famille', mode: 'user' }, { id: 'c', date: '2026-10-15', calendarId: 'cal2', mode: 'user' },
  { id: 'n', date: '2026-10-16', cat: 'travail', mode: 'user' }, { id: 'v', date: '2026-10-10', dateFin: '2026-10-12', cat: 'famille', mode: 'user' }])) === '2026-10-16');
ctx.masquees = []; ctx.calendriersMasques = [];
verifie('tout visible : les quatre sont comptés', cles(octobre([
  { id: 'f', date: '2026-10-19', cat: 'famille', mode: 'user' }, { id: 'c', date: '2026-10-15', calendarId: 'cal2', mode: 'user' },
  { id: 'n', date: '2026-10-16', cat: 'travail', mode: 'user' }])) === '2026-10-15,2026-10-16,2026-10-19');
verifie('une période de 18 mois : des points tout le mois affiché (plus de plafond à 62 jours)', octobre([{ id: 'L', date: '2026-01-05', dateFin: '2027-06-30', allDay: true, mode: 'user' }]).size === 31);
verifie('et rien après sa fin (juillet 2027)', vm.runInContext('tcJoursAvecRdv(new Date(2027, 6, 1))', ctx).size === 0);
verifie('un rendez-vous de la veille du mois ne compte pas ; un voyage à cheval compte le 1er et le 2', cles(octobre([
  { id: 's', date: '2026-09-30', mode: 'user' }, { id: 'v', date: '2026-09-29', dateFin: '2026-10-02', mode: 'user' }])) === '2026-10-01,2026-10-02');

titre('Ouvrir, choisir un mois, toucher un jour, fermer');
ctx.events = [];
ctx.tcBasculerPanneauMois(); vider();
verifie('le panneau s ouvre, sur le mois de la vue', panneau.style.display === 'block' && /Octobre 2026/.test(panneau.innerHTML));
verifie('la page porte la marque « mois-ouvert » (elle efface le numéro de semaine et le fuseau)', trace.classes.has('mois-ouvert'));
verifie('plus aucun écouteur « clic à côté » : l agenda du dessous reste utilisable', trace.ecoutes.length === 0);
ctx.tcPanneauMoisChanger(1); vider();
verifie('mois suivant : la grille ET la vue vont au 1er novembre, le titre suit (render)', /Novembre 2026/.test(panneau.innerHTML) && ctx.viewDate.getMonth() === 10 && ctx.viewDate.getDate() === 1 && trace.rendus === 1);
ctx.tcPanneauMoisChoisir(2027, 0); vider();
verifie('choisir janv. 2027 : la vue va au 1er janvier 2027, le panneau reste ouvert', /Janvier 2027/.test(panneau.innerHTML) && ctx.viewDate.getFullYear() === 2027 && ctx.viewDate.getMonth() === 0 && ctx.viewDate.getDate() === 1 && trace.rendus === 2 && panneau.style.display === 'block');
verifie('la rangée va alors de janv. 2025 à janv. 2030, « 2027 » rappelé', /data-mois="2025-01"/.test(panneau.innerHTML) && /data-mois="2030-01"/.test(panneau.innerHTML) && /padding:0 4px;">2027<\/div>/.test(panneau.innerHTML));
ctx.tcPanneauMoisChoisir(2026, 9); vider();
verifie('revenir sur ce mois-ci : la vue va sur aujourd hui', ctx.viewDate.getFullYear() === 2026 && ctx.viewDate.getMonth() === 9 && ctx.viewDate.getDate() === 6);
ctx.tcPanneauMoisAller('2026-10-15'); vider();
verifie('toucher le 15 : la vue y va, le panneau reste ouvert et marque le 15', ctx.viewDate.getDate() === 15 && trace.rendus === 4 && panneau.style.display === 'block' && /background:#e8f0fe/.test(cellule(panneau.innerHTML, '2026-10-15')));
verifie('toujours la marque « mois-ouvert »', trace.classes.has('mois-ouvert'));
ctx.tcBasculerPanneauMois();
verifie('toucher le titre referme, et la marque s efface (le numéro de semaine revient)', panneau.style.display === 'none' && !trace.classes.has('mois-ouvert'));
ctx.tcBasculerPanneauMois(); vider();
verifie('et le rouvre, sur le mois de la vue', panneau.style.display === 'block' && /Octobre 2026/.test(panneau.innerHTML) && trace.classes.has('mois-ouvert'));
ctx.tcFermerPanneauMois();
ctx.tcPanneauMoisAller('n importe quoi');
verifie('une date illisible ne fait rien', trace.rendus === 4);

titre('La rangée des mois reste centrée, et le panneau ne défile pas tout seul (revue du 06/10)');
panneau.style.display = 'none'; panneau._html = ''; panneau.rangee = null; ctx.viewDate = new DateFixe(2026, 9, 6);
ctx.tcBasculerPanneauMois();
verifie('avant que le panneau soit affiché, rien n est encore centré', panneau.rangee.scrollLeft === 1375 || panneau.rangee.attrs['data-centre'] === undefined);
vider();
verifie('1re ouverture : le mois actif est centré (1500+25-150 = 1375 px)', panneau.rangee.scrollLeft === 1375 && panneau.rangee.attrs['data-centre'] === '2026-10', panneau.rangee.scrollLeft + ' / ' + panneau.rangee.attrs['data-centre']);
const rangeeOuverte = panneau.rangee;
ctx.tcBasculerPanneauMois();
verifie('fermé, le défilement d une rangée cachée vaut 0 (comme dans un navigateur)', rangeeOuverte.scrollLeft === 0);
ctx.tcBasculerPanneauMois(); vider();
verifie('rouvert sur le même mois : recentré, pas calé à gauche sur octobre 2024', panneau.rangee.scrollLeft === 1375, String(panneau.rangee.scrollLeft));
panneau.rangee.scrollLeft = 300;
ctx.tcDessinerPanneauMois(); vider();
verifie('un redessin panneau visible, même mois (synchro) : la position de la rangée est gardée', panneau.rangee.scrollLeft === 300, String(panneau.rangee.scrollLeft));
ctx.tcPanneauMoisChoisir(2026, 10); vider();
verifie('un autre mois : la rangée est recentrée', panneau.rangee.scrollLeft === 1375 && panneau.rangee.attrs['data-centre'] === '2026-11', panneau.rangee.scrollLeft + ' / ' + panneau.rangee.attrs['data-centre']);
ctx.tcFermerPanneauMois();
const dess = extraire('tcDessinerPanneauMois') || '';
verifie('plus de scrollIntoView : il faisait défiler le panneau vers le bas (titre et flèches coupés)', dess.replace(/\/\/.*$/gm, '').indexOf('scrollIntoView') === -1 && /r\.scrollLeft \+= /.test(dess));
verifie('le défilement n est relu que si le panneau est visible', /const affiche = p\.offsetWidth > 0;/.test(dess) && /\(affiche && ancienne && ancienne\.getAttribute\('data-centre'\) === cle\)/.test(dess));
verifie('et « centré » n est noté qu une fois le panneau réellement visible', /if \(p\.offsetWidth > 0\) r\.setAttribute\('data-centre', cle\);/.test(dess));

verifie('à l ouverture le panneau repart du haut (scrollTop = 0), même défilé avant d avoir été fermé', /p\.style\.display = 'block';\s*\/\/[^\n]*\n\s*p\.scrollTop = 0;/.test(extraire('tcBasculerPanneauMois') || ''));

titre('L écran en deux parties (le HTML et le CSS de la page)');
const iSous = page.indexOf('<div class="sub-header">');
const iPanneau = page.indexOf('<div id="tcMoisPanneau"');
const iBadge = page.indexOf('<div id="weekNumberBadge"');
const iTabs = page.indexOf('<div class="view-tabs">');
const iMain = page.indexOf('<div class="main">', iTabs);
const styleP = (page.match(/<div id="tcMoisPanneau" style="([^"]*)"/) || [])[1] || '';
verifie('le titre « Octobre 2026 » se touche', /id="monthTitle" onclick="tcBasculerPanneauMois\(\)"/.test(page));
verifie('le panneau est dans le flux, juste sous l en-tête du mois, avant les onglets et l agenda', iSous > -1 && iSous < iPanneau && iPanneau < iBadge && iBadge < iTabs && iTabs < iMain, [iSous, iPanneau, iBadge, iTabs, iMain].join(' < '));
verifie('il est caché au départ', /display:none/.test(styleP));
verifie('il n est plus posé par-dessus l agenda (ni fixe, ni absolu, ni flottant)', !/position:\s*(fixed|absolute)/.test(styleP) && !/z-index/.test(styleP) && !/box-shadow/.test(styleP), styleP);
verifie('il ne s écrase pas et reste limité à 46 % de l écran, avec son propre défilement', /flex-shrink:0/.test(styleP) && /max-height:46vh/.test(styleP) && /overflow-y:auto/.test(styleP), styleP);
verifie('panneau ouvert : le numéro de semaine et le fuseau s effacent', /\.mois-ouvert #weekNumberBadge, \.mois-ouvert #timezoneBadge \{ display:none !important; \}/.test(page));
verifie('aucun reste de l ancienne fermeture « clic à côté »', page.indexOf('tcClicHorsPanneauMois') === -1);

titre('Paysage et petites hauteurs : deux colonnes (revue du 06/10)');
const media = (page.match(/@media \(max-height:500px\) and \(min-width:560px\) \{[\s\S]*?\n\}\n/) || [''])[0];
verifie('sous 500 px de haut (et 560 de large) : le panneau passe à gauche, l agenda à droite', media.length > 0 && /grid-template-columns:minmax\(300px,46%\) 1fr/.test(media) && /> #tcMoisPanneau \{ grid-column:1; grid-row:2 \/ 4;/.test(media) && /> \.main \{ grid-column:2; grid-row:3;/.test(media) && /> \.view-tabs \{ grid-column:2; grid-row:2;/.test(media), media.slice(0, 80));
verifie('seulement quand la page calendrier est la page affichée (sinon elle s afficherait par-dessus les autres pages)', /#page-calendar\.active\.mois-ouvert \{ display:grid;/.test(media) && !/[^.]#page-calendar\.mois-ouvert \{ display:grid/.test(media));
verifie('le panneau n est plus borné à 46 % dans ce mode (il prend la colonne)', /max-height:none !important/.test(media));

titre('L en-tête « Octobre 2026 ▾ » tient sur une ligne (revue du 06/10)');
verifie('titre sur une ligne, tronqué plutôt qu à la ligne, 17 px', /\.month-title \{ font-size:17px; white-space:nowrap; min-width:0; overflow:hidden; text-overflow:ellipsis; \}/.test(page));
verifie('les flèches de l en-tête gardent leur taille', /\.sub-header \.nav-btn \{ flex-shrink:0; \}/.test(page));
verifie('espaces resserrés, et encore plus à 340 px de large (le ⋮ ne sort plus de l écran)', /#page-calendar \.sub-header \{ gap:4px; padding-left:10px; padding-right:10px; \}/.test(page) && /@media \(max-width:340px\) \{ #page-calendar \.sub-header \{ padding-left:8px; padding-right:8px; \} \}/.test(page));
verifie('les flèches du panneau (hors en-tête) ne sont pas touchées par la règle des flèches de l en-tête', !/^\.nav-btn \{[^}]*flex-shrink:0/m.test(page));

titre('L agenda du dessous suit la période');
const rendu = extraire('render') || '';
verifie('render() redessine le panneau quand il est ouvert, sur le mois de la vue', /panneauMois\.style\.display === 'block'/.test(rendu) && /_tcMoisPanneauDate = new Date\(viewDate\.getFullYear\(\), viewDate\.getMonth\(\), 1\);\s*tcDessinerPanneauMois\(\);/.test(rendu));
verifie('et cela avant de dessiner la vue', rendu.indexOf('tcDessinerPanneauMois()') > -1 && rendu.indexOf('tcDessinerPanneauMois()') < rendu.indexOf('renderWeek()'));
verifie('un incident du panneau ne bloque jamais l agenda (try / catch)', /try \{\s*const panneauMois[\s\S]*?\} catch \(e\) \{ console\.warn\('Panneau du mois :', e\); \}/.test(rendu) && rendu.indexOf('catch') < rendu.indexOf('renderWeek()'));
const dess2 = extraire('tcDessinerPanneauMois') || '';
verifie('la rangée des mois garde sa place quand le mois ne change pas', /getAttribute\('data-centre'\) === cle/.test(dess2) && /rangee\.scrollLeft = defilement/.test(dess2));
verifie('les points sont comptés pour le mois affiché', /tcJoursAvecRdv\(_tcMoisPanneauDate\)/.test(dess2));
const sw = extraire('switchView') || '';
verifie('« Jour » garde le jour choisi dans le panneau (il ne revient plus à aujourd hui quand le panneau est ouvert)', /v === 'day' && !keepDate && !\(panneauOuvert && panneauOuvert\.style\.display === 'block'\)\) viewDate = new Date\(\)/.test(sw));
verifie('mais revient toujours à aujourd hui quand le panneau est fermé (comportement d avant)', /if \(v === 'day' && !keepDate/.test(sw));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
