// Le panneau du mois, comme Google Agenda : toucher « Octobre 2026 »
// déplie la grille du mois (semaines, aujourd'hui, points), une rangée
// de mois sur cinq ans ; choisir un mois ou un jour déplace la vue du
// dessous, le panneau reste ouvert. Charles, 06/10 (vidéo).
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
const trace = { rendus: 0, ecoutes: [], retires: [] };
const panneau = { style: {}, innerHTML: '', querySelector: () => null, contains: () => false };
const sousEntete = { getBoundingClientRect: () => ({ bottom: 120 }) };
const ctx = {
  console, Date: DateFixe,
  mode: 'user', events: [], viewDate: new DateFixe(2026, 9, 6),
  render() { trace.rendus++; },
  setTimeout: (f) => { f(); return 0; },
  document: {
    getElementById: (id) => (id === 'tcMoisPanneau' ? panneau : (id === 'monthTitle' ? { nextElementSibling: null } : null)),
    querySelector: () => sousEntete,
    addEventListener: (t, f) => trace.ecoutes.push(t),
    removeEventListener: (t, f) => trace.retires.push(t)
  }
};
vm.createContext(ctx);
['MONTHS', 'TC_MOIS_COURTS'].forEach((c) => { const src = extraireConst(c); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + c + ' introuvable'); } });
vm.runInContext('let _tcMoisPanneauDate = null;', ctx);
['tcISO', 'getISOWeek', 'tcEvenementFin', 'tcJoursAvecRdv', 'tcPanneauMoisHTML', 'tcDessinerPanneauMois', 'tcBasculerPanneauMois',
 'tcFermerPanneauMois', 'tcClicHorsPanneauMois', 'tcPanneauMoisChanger', 'tcPanneauMoisChoisir', 'tcPanneauMoisAller'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const cellule = (html, iso) => { const i = html.indexOf('data-jour="' + iso + '"'); const f = html.indexOf('data-jour=', i + 10); return html.slice(i, f < 0 ? html.indexOf('id="tcMoisRangee"') : f); };
const nbPoints = (c) => (c.match(/width:4px; height:4px/g) || []).length;

titre('La grille d octobre 2026');
const html = vm.runInContext("tcPanneauMoisHTML(new Date(2026, 9, 1), '2026-10-06', new Map([['2026-10-01', 1], ['2026-10-03', 2], ['2026-10-10', 3], ['2026-10-20', 7]]), '2026-10-20')", ctx);
const semaines = (html.match(/background:#f1f3f4; border-radius:8px;">(\d+)</g) || []).map((x) => x.match(/>(\d+)</)[1]);
verifie('titre « Octobre 2026 »', /Octobre 2026/.test(html));
verifie('les semaines 40 à 44, comme Google', semaines.join(',') === '40,41,42,43,44', semaines.join(','));
verifie('l en-tête L M M J V S D', /<div><\/div>(<div[^>]*>[LMJVSD]<\/div>){7}/.test(html));
const jours = (html.match(/data-jour="(\d{4}-\d{2}-\d{2})"/g) || []).map((x) => x.slice(11, 21));
verifie('31 jours, du 1er au 31, et rien avant le jeudi 1er', jours.length === 31 && jours[0] === '2026-10-01' && jours[30] === '2026-10-31' && /border-radius:8px;">40<\/div><div><\/div><div><\/div><div><\/div><div onclick="tcPanneauMoisAller\('2026-10-01'\)"/.test(html));
verifie('aujourd hui (le 6) est entouré en bleu', /background:var\(--g-blue\); color:#fff/.test(cellule(html, '2026-10-06')));
verifie('le jour choisi (le 20) est marqué en bleu clair', /background:#e8f0fe/.test(cellule(html, '2026-10-20')) && !/background:#e8f0fe/.test(cellule(html, '2026-10-21')));
verifie('1 rendez-vous : 1 point ; 2 : 2 points ; 3 : 3 points', nbPoints(cellule(html, '2026-10-01')) === 1 && nbPoints(cellule(html, '2026-10-03')) === 2 && nbPoints(cellule(html, '2026-10-10')) === 3);
verifie('7 rendez-vous : 3 points et « + » ; aucun : rien', nbPoints(cellule(html, '2026-10-20')) === 3 && />\+<\/span>/.test(cellule(html, '2026-10-20')) && nbPoints(cellule(html, '2026-10-05')) === 0 && !/>\+</.test(cellule(html, '2026-10-10')));
verifie('toucher un jour appelle tcPanneauMoisAller avec sa date', /onclick="tcPanneauMoisAller\('2026-10-20'\)"/.test(html));

titre('La rangée des mois : cinq ans');
const rangee = html.slice(html.indexOf('id="tcMoisRangee"'));
const mois = (rangee.match(/data-mois="(\d{4}-\d{2})"/g) || []).map((x) => x.slice(11, 18));
verifie('d octobre 2024 à octobre 2029 (2 ans avant, 3 après)', mois[0] === '2024-10' && mois[mois.length - 1] === '2029-10' && mois.length === 61, mois[0] + ' … ' + mois[mois.length - 1] + ' (' + mois.length + ')');
verifie('les noms courts : sept. oct. nov. déc.', /sept\.<\/button>/.test(rangee) && /oct\.<\/button>/.test(rangee) && /déc\.<\/button>/.test(rangee));
verifie('oct. 2026 seul en bleu, marqué actif', (rangee.match(/data-actif="1"/g) || []).length === 1 && /data-mois="2026-10" data-actif="1"/.test(rangee));
verifie('les années rappelées : 2025, 2026, 2027, 2028, 2029', ['2025', '2026', '2027', '2028', '2029'].every((a) => new RegExp('padding:0 4px;">' + a + '</div>').test(rangee)));
verifie('toucher un mois le choisit', /onclick="tcPanneauMoisChoisir\(2027,0\)"/.test(rangee));

titre('Les jours avec rendez-vous, comptés');
ctx.events = [
  { id: 'a', title: 'A', date: '2026-10-03', mode: 'user' }, { id: 'b', title: 'B', date: '2026-10-03', mode: 'user' },
  { id: 'v', title: 'Voyage', date: '2026-10-10', dateFin: '2026-10-12', mode: 'user' },
  { id: 'p', title: 'Pro', date: '2026-10-20', mode: 'pro' }
];
const avec = vm.runInContext('Array.from(tcJoursAvecRdv().entries()).sort().map(([j, n]) => j + ":" + n).join(",")', ctx);
verifie('le 3 (2 rendez-vous), le voyage du 10 au 12 ; pas le rendez-vous pro', avec === '2026-10-03:2,2026-10-10:1,2026-10-11:1,2026-10-12:1', avec);

titre('Ouvrir, choisir un mois, toucher un jour, fermer');
ctx.tcBasculerPanneauMois();
verifie('le panneau s ouvre sous l en-tête, sur le mois de la vue', panneau.style.display === 'block' && panneau.style.top === '120px' && /Octobre 2026/.test(panneau.innerHTML));
verifie('un clic à côté le fermera', trace.ecoutes.indexOf('click') > -1);
ctx.tcPanneauMoisChanger(1);
verifie('mois suivant : la grille ET la vue vont au 1er novembre, le titre suit (render)', /Novembre 2026/.test(panneau.innerHTML) && ctx.viewDate.getMonth() === 10 && ctx.viewDate.getDate() === 1 && trace.rendus === 1);
ctx.tcPanneauMoisChoisir(2027, 0);
verifie('choisir janv. 2027 : la vue va au 1er janvier 2027, le panneau reste ouvert', /Janvier 2027/.test(panneau.innerHTML) && ctx.viewDate.getFullYear() === 2027 && ctx.viewDate.getMonth() === 0 && ctx.viewDate.getDate() === 1 && trace.rendus === 2 && panneau.style.display === 'block');
ctx.tcPanneauMoisChoisir(2026, 9);
verifie('revenir sur ce mois-ci : la vue va sur aujourd hui', ctx.viewDate.getFullYear() === 2026 && ctx.viewDate.getMonth() === 9 && ctx.viewDate.getDate() === 6);
ctx.tcPanneauMoisAller('2026-10-15');
verifie('toucher le 15 : la vue y va, le panneau reste ouvert et marque le 15', ctx.viewDate.getDate() === 15 && trace.rendus === 4 && panneau.style.display === 'block' && /background:#e8f0fe/.test(cellule(panneau.innerHTML, '2026-10-15')));
ctx.tcBasculerPanneauMois();
verifie('toucher le titre referme', panneau.style.display === 'none' && trace.retires.indexOf('click') > -1);
ctx.tcPanneauMoisAller('n importe quoi');
verifie('une date illisible ne fait rien', trace.rendus === 4);

titre('Branché');
verifie('le titre « Octobre 2026 » se touche', /id="monthTitle" onclick="tcBasculerPanneauMois\(\)"/.test(page));
verifie('le clic à côté est écouté en phase de capture, avant le bouton touché (sinon un mois choisi refermait le panneau — vidéo du 06/10)', (extraire('tcBasculerPanneauMois') || '').indexOf("addEventListener('click', tcClicHorsPanneauMois, true)") > -1 && (extraire('tcFermerPanneauMois') || '').indexOf("removeEventListener('click', tcClicHorsPanneauMois, true)") > -1);
verifie('le panneau existe dans la page calendrier, caché au départ', /<div id="tcMoisPanneau" style="display:none; position:fixed;/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
