// Le panneau du mois, comme Google Agenda : toucher « Octobre 2026 »
// déplie la grille du mois (semaines, aujourd'hui, points), une rangée
// de mois, et toucher un jour y emmène. Charles, 06/10.
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

titre('La grille d octobre 2026');
const html = vm.runInContext("tcPanneauMoisHTML(new Date(2026, 9, 1), '2026-10-06', new Set(['2026-10-01', '2026-10-03', '2026-10-20']))", ctx);
const semaines = (html.match(/background:#f1f3f4; border-radius:8px;">(\d+)</g) || []).map((x) => x.match(/>(\d+)</)[1]);
verifie('titre « Octobre 2026 »', /Octobre 2026/.test(html));
verifie('les semaines 40 à 44, comme Google', semaines.join(',') === '40,41,42,43,44', semaines.join(','));
verifie('l en-tête L M M J V S D', /<div><\/div>(<div[^>]*>[LMJVSD]<\/div>){7}/.test(html));
const jours = (html.match(/data-jour="(\d{4}-\d{2}-\d{2})"/g) || []).map((x) => x.slice(11, 21));
verifie('31 jours, du 1er au 31, et rien avant le jeudi 1er', jours.length === 31 && jours[0] === '2026-10-01' && jours[30] === '2026-10-31' && /border-radius:8px;">40<\/div><div><\/div><div><\/div><div><\/div><div onclick="tcPanneauMoisAller\('2026-10-01'\)"/.test(html));
const jour6 = html.slice(html.indexOf('data-jour="2026-10-06"'), html.indexOf('data-jour="2026-10-07"'));
verifie('aujourd hui (le 6) est entouré en bleu', /background:var\(--g-blue\); color:#fff/.test(jour6));
const jour3 = html.slice(html.indexOf('data-jour="2026-10-03"'), html.indexOf('data-jour="2026-10-04"'));
const jour5 = html.slice(html.indexOf('data-jour="2026-10-05"'), html.indexOf('data-jour="2026-10-06"'));
verifie('un point sous le 3 (rendez-vous), aucun sous le 5', /width:5px; height:5px/.test(jour3) && !/width:5px; height:5px/.test(jour5));
verifie('toucher un jour appelle tcPanneauMoisAller avec sa date', /onclick="tcPanneauMoisAller\('2026-10-20'\)"/.test(html));

titre('La rangée des mois');
const rangee = html.slice(html.indexOf('id="tcMoisRangee"'));
const mois = (rangee.match(/data-mois="(\d{4}-\d{2})"/g) || []).map((x) => x.slice(11, 18));
verifie('de juin 2026 à mai 2027 (4 avant, 7 après)', mois[0] === '2026-06' && mois[4] === '2026-10' && mois[mois.length - 1] === '2027-05' && mois.length === 12, mois.join(' '));
verifie('les noms courts : sept. oct. nov. déc.', /sept\.<\/button>/.test(rangee) && /oct\.<\/button>/.test(rangee) && /déc\.<\/button>/.test(rangee));
verifie('oct. est en bleu, les autres non', (rangee.match(/background:var\(--g-blue\)/g) || []).length === 1 && /background:var\(--g-blue\); color:#fff; font-size:13px; cursor:pointer;">oct\./.test(rangee));
verifie('« 2027 » rappelé entre déc. et janv.', /déc\.<\/button><div[^>]*>2027<\/div><button[^>]*>janv\./.test(rangee));
verifie('toucher un mois le choisit', /onclick="tcPanneauMoisChoisir\(2027,0\)"/.test(rangee));

titre('Les jours avec rendez-vous');
ctx.events = [
  { id: 'a', title: 'A', date: '2026-10-03', mode: 'user' },
  { id: 'v', title: 'Voyage', date: '2026-10-10', dateFin: '2026-10-12', mode: 'user' },
  { id: 'p', title: 'Pro', date: '2026-10-20', mode: 'pro' }
];
const avec = vm.runInContext('Array.from(tcJoursAvecRdv()).sort().join(",")', ctx);
verifie('le 3, et le voyage du 10 au 12 ; pas le rendez-vous pro', avec === '2026-10-03,2026-10-10,2026-10-11,2026-10-12', avec);

titre('Ouvrir, se déplacer, aller à un jour, fermer');
ctx.tcBasculerPanneauMois();
verifie('le panneau s ouvre sous l en-tête, sur le mois de la vue', panneau.style.display === 'block' && panneau.style.top === '120px' && /Octobre 2026/.test(panneau.innerHTML));
verifie('un clic à côté le fermera', trace.ecoutes.indexOf('click') > -1);
ctx.tcPanneauMoisChanger(1);
verifie('mois suivant : Novembre 2026', /Novembre 2026/.test(panneau.innerHTML));
ctx.tcPanneauMoisChoisir(2027, 0);
verifie('choisir janv. 2027 : la rangée va de sept. 2026 à août 2027, « 2027 » rappelé', /Janvier 2027/.test(panneau.innerHTML) && /2027<\/div>/.test(panneau.innerHTML) && /data-mois="2026-09"/.test(panneau.innerHTML) && /data-mois="2027-08"/.test(panneau.innerHTML));
ctx.tcPanneauMoisAller('2027-01-15');
verifie('toucher le 15 janvier : la vue y va, le panneau se ferme', ctx.viewDate.getFullYear() === 2027 && ctx.viewDate.getMonth() === 0 && ctx.viewDate.getDate() === 15 && trace.rendus === 1 && panneau.style.display === 'none' && trace.retires.indexOf('click') > -1);
ctx.tcBasculerPanneauMois();
ctx.tcBasculerPanneauMois();
verifie('toucher le titre deux fois ouvre puis ferme', panneau.style.display === 'none');
ctx.tcPanneauMoisAller('n importe quoi');
verifie('une date illisible ne fait rien', trace.rendus === 1);

titre('Branché');
verifie('le titre « Octobre 2026 » se touche', /id="monthTitle" onclick="tcBasculerPanneauMois\(\)"/.test(page));
verifie('le panneau existe dans la page calendrier, caché au départ', /<div id="tcMoisPanneau" style="display:none; position:fixed;/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
