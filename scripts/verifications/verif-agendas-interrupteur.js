// Mission 38 (12/10) : l interrupteur afficher / masquer par agenda revient : la pastille (menu « Mes agendas », page
// « Créer un nouvel agenda ») commande visible ; « Mon agenda » ne se masque pas ; navigate('calendar') ne remet plus
// tout visible ; accord « 1 rendez-vous sera transféré ». Usage : node verif-agendas-interrupteur.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
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

(async () => {
titre('1. La page');
const nav = fonction(page, 'navigate') || '';
verifie('navigate(\'calendar\') ne remet plus visible:true de force (un agenda masque a la main le reste)', !/c\.visible = true/.test(nav) && !/rien ne reste masqué/.test(nav));
const menu = fonction(page, 'renderMenu') || '';
verifie('menu « Mes agendas » : la pastille (tcPastilleAgendaHTML) commande, le nom ouvre l agenda seul, un agenda masque est grise « (masqué) »', /\$\{tcPastilleAgendaHTML\(cal, 14\)\}/.test(menu) && /onclick="isolateCalendarView\('\$\{cal\.id\}'\)"/.test(menu) && /\(masqué\)/.test(menu));
const pageAg = fonction(page, 'renderCalendarsPage') || '';
verifie('« Créer un nouvel agenda » : la pastille (18 px) commande, le nom ouvre l agenda seul, « (masqué) », le mot d explication', /\$\{tcPastilleAgendaHTML\(cal, 18\)\}/.test(pageAg) && /\(masqué\)/.test(pageAg) && /Tape sur sa pastille pour l'afficher ou le masquer ; « Mon agenda » reste toujours affiché\./.test(pageAg) && /l'activer ou le désactiver à tout moment/.test(pageAg));
verifie('accord : « 1 rendez-vous sera transféré » / « N rendez-vous seront transférés »', /\(count > 1 \? 'seront transférés' : 'sera transféré'\)/.test(fonction(page, 'deleteCustomCalendar') || ''));

titre('2. Simulation : la pastille, Mon agenda, l affichage');
const rendus = []; const toasts = [];
const ctx = { console, String, Number, Array, JSON, Object, Math, currentPage: 'calendar', _isolatedCalendarId: null, _isolatedCalendarName: null,
  customCalendars: [{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: true, isDefault: true }, { id: 'cal_2', name: 'Planning scolaire', color: '#EA4335', visible: true }, { id: 'cal_3', name: 'Projet', color: '#34A853' }],
  events: [{ id: 'e1', calendarId: 'cal_2', title: 'Cours' }], escapeHTMLSafe: (x) => String(x), showToast: (m) => toasts.push(m),
  saveCustomCalendars() { rendus.push('save'); }, renderCalendarsPage() { rendus.push('page'); }, renderMenu() { rendus.push('menu'); }, render() { rendus.push('agenda'); },
  document: { getElementById: () => ({}) }, tcConfirm: async (m) => { ctx._question = m; return false; }, saveEventsToStorage() {} };
vm.createContext(ctx);
['getCalendarById', 'isCalendarVisible', 'tcPastilleAgendaHTML', 'toggleCalendarVisibility', 'deleteCustomCalendar'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const p1 = ctx.tcPastilleAgendaHTML(ctx.customCalendars[1], 14);
verifie('pastille d un agenda affiche : pleine (fond = couleur), role switch coche, « Masquer cet agenda », toucher → toggle(false) sans ouvrir (stopPropagation)', /background:#EA4335;/.test(p1) && /aria-checked="true"/.test(p1) && /Masquer cet agenda/.test(p1) && /onclick="event\.stopPropagation\(\); toggleCalendarVisibility\('cal_2', false\)"/.test(p1) && /width:14px/.test(p1), p1);
ctx.toggleCalendarVisibility('cal_2', false);
verifie('toucher la pastille : l agenda est masque, enregistre, menu / page / agenda redessines, ses rendez-vous n apparaissent plus', ctx.customCalendars[1].visible === false && rendus.join() === 'save,page,menu,agenda' && ctx.isCalendarVisible('cal_2') === false && ctx.isCalendarVisible('cal_default') === true, rendus.join());
const p2 = ctx.tcPastilleAgendaHTML(ctx.customCalendars[1], 18);
verifie('pastille d un agenda masque : cercle vide (fond transparent, bord couleur), « Afficher cet agenda », toucher → toggle(true)', /background:transparent;/.test(p2) && /border:2\.5px solid #EA4335/.test(p2) && /aria-checked="false"/.test(p2) && /toggleCalendarVisibility\('cal_2', true\)/.test(p2) && /width:18px/.test(p2));
ctx.toggleCalendarVisibility('cal_2', true);
verifie('un second toucher le remontre', ctx.customCalendars[1].visible === true && ctx.isCalendarVisible('cal_2') === true);
rendus.length = 0;
ctx.toggleCalendarVisibility('cal_default', false);
verifie('« Mon agenda » ne se masque pas : rien ne change, un mot le dit', ctx.customCalendars[0].visible === true && rendus.length === 0 && /« Mon agenda » reste toujours affiché/.test(toasts.join(' ')));
verifie('un agenda sans champ visible compte comme affiche', ctx.isCalendarVisible('cal_3') === true && /aria-checked="true"/.test(ctx.tcPastilleAgendaHTML(ctx.customCalendars[2], 14)));
await ctx.deleteCustomCalendar('cal_2');
verifie('supprimer avec 1 rendez-vous : « 1 rendez-vous sera transféré vers "Mon agenda". »', /Supprimer "Planning scolaire" \? 1 rendez-vous sera transféré vers "Mon agenda"\./.test(ctx._question), ctx._question);
ctx.events.push({ id: 'e2', calendarId: 'cal_2', title: 'Sport' });
await ctx.deleteCustomCalendar('cal_2');
verifie('avec 2 : « 2 rendez-vous seront transférés »', /2 rendez-vous seront transférés vers "Mon agenda"\./.test(ctx._question), ctx._question);
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
