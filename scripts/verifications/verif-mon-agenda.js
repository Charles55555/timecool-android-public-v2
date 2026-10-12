// Mission 14 (Charles, 12/10) : toucher « Mon agenda » dans le menu lateral sort de l isolation d un agenda secondaire
// (tous les agendas visibles reviennent, la ligne « 📍 nom » s efface). Fonctions executees.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const el = { classList: { add() {}, remove() {}, contains: () => true }, style: {}, innerHTML: '' };
const menu = { innerHTML: '' };
const titreLigne = { textContent: 'x', title: 'x', style: { display: 'x' } };
const ctx = { console, JSON, Array, mode: 'user', currentPage: 'contacts', rendus: 0, navigues: [], labels: 0,
  customCalendars: [{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: true, isDefault: true }, { id: 'cal_2', name: 'Agenda scolaire d’Élodie', color: '#34a853', visible: true }],
  isMenuItemVisible: () => true, escapeHTMLSafe: (x) => String(x),
  document: { getElementById: (id) => ({ menuItems: menu, agendaSecondaireTitre: titreLigne, 'page-calendar': el })[id] || el, querySelectorAll: () => [] },
  toggleMenu() {}, tcNoterDepart() {}, render() { ctx.rendus++; },
  navigate(p) { ctx.navigues.push(p); ctx.currentPage = p; },
};
vm.createContext(ctx);
const items = page.match(/const menuItems = \{[\s\S]*?\n\};/);
if (items) vm.runInContext(items[0], ctx); else { ko++; console.log('  KO  menuItems introuvable'); }
vm.runInContext('let _isolatedCalendarName = null; let _isolatedCalendarId = null; globalThis.isole = () => _isolatedCalendarId; globalThis.nomIsole = () => _isolatedCalendarName;', ctx);
['getCalendarById', 'isCalendarVisible', 'getVisibleCalendarIds', 'isolateCalendarView', 'updateHeaderAgendaLabel', 'tcOuvrirMonAgenda', 'tcPastilleAgendaHTML', 'renderMenu']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Le menu : « Mon agenda » passe par tcOuvrirMonAgenda, les autres entrees par navigate');
ctx.renderMenu();
verifie('« Mon agenda » appelle tcOuvrirMonAgenda()', /onclick="tcOuvrirMonAgenda\(\)"[^>]*>\s*<span[^>]*>🗓️<\/span>\s*<span>Mon agenda<\/span>/.test(menu.innerHTML), menu.innerHTML.slice(0, 200));
verifie('les autres entrees gardent navigate (Charly IA, Mes contacts…)', /onclick="navigate\('assistant'\)"/.test(menu.innerHTML) && /onclick="navigate\('contacts'\)"/.test(menu.innerHTML) && !/navigate\('calendar'\)/.test(menu.innerHTML));
verifie('les agendas secondaires du menu ouvrent toujours l isolation', /onclick="isolateCalendarView\('cal_2'\)"/.test(menu.innerHTML));

titre('2. Isolation puis « Mon agenda » : plus d isolation');
ctx.isolateCalendarView('cal_2');
verifie('agenda d Elodie ouvert : seul cal_2 est affiche, la ligne « 📍 » est posee', ctx.isole() === 'cal_2' && !ctx.isCalendarVisible('cal_default') && titreLigne.textContent === '📍 Agenda scolaire d’Élodie' && titreLigne.style.display === 'block');
ctx.navigues = []; ctx.rendus = 0;
ctx.tcOuvrirMonAgenda();
verifie('« Mon agenda » : l isolation est levee (id et nom)', ctx.isole() === null && ctx.nomIsole() === null);
verifie('tous les agendas visibles reviennent (Mon agenda et Elodie)', ctx.isCalendarVisible('cal_default') && ctx.isCalendarVisible('cal_2') && ctx.getVisibleCalendarIds().length === 2);
verifie('la ligne « 📍 nom » est masquee et vide', titreLigne.style.display === 'none' && titreLigne.textContent === '');
verifie('l agenda est ouvert et redessine', ctx.navigues.join(',') === 'calendar' && ctx.currentPage === 'calendar' && ctx.rendus >= 1);
verifie('un agenda masque a la main (pastille) le reste : seule l isolation est levee', (() => { ctx.customCalendars[1].visible = false; ctx.isolateCalendarView('cal_2'); ctx.tcOuvrirMonAgenda(); const ok = ctx.isCalendarVisible('cal_default') && !ctx.isCalendarVisible('cal_2'); ctx.customCalendars[1].visible = true; return ok; })());
verifie('sans isolation, « Mon agenda » ouvre simplement l agenda', (() => { ctx.navigues = []; ctx.tcOuvrirMonAgenda(); return ctx.navigues.join(',') === 'calendar' && ctx.isole() === null; })());

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
