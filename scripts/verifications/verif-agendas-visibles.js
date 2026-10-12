// Mission 10 (Charles, 12/10, compte 53) : creer un agenda secondaire ne masque plus Mon agenda. L isolation (ouvrir un
// agenda depuis le menu) est un filtre d affichage en memoire : le reglage enregistre ne change jamais de visibilite, sauf
// par la pastille (toggleCalendarVisibility). Garde-fou au chargement. Fonctions executees.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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
function contexte(reglage) {
  const mem = {};
  if (reglage) mem.timecool_custom_calendars = JSON.stringify(reglage);
  const el = { classList: { add() {}, remove() {}, contains: () => true }, style: {} };
  const ctx = {
    console, JSON, Array, Date, String, Number,
    customCalendars: [], currentPage: 'calendar', sauvegardes: 0, rendus: 0,
    localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } }, mem,
    document: { getElementById: () => el, querySelectorAll: () => [] },
    updateHeaderAgendaLabel() {}, toggleMenu() {}, tcNoterDepart() {}, render() { ctx.rendus++; }, renderCalendarsPage() {}, renderMenu() {}, showToast() {},
    tcPrompt: async () => 'Agenda scolaire de Elodie',
  };
  vm.createContext(ctx);
  const cle = page.match(/const TC_CALENDARS_KEY = [^;]*;/); const couleurs = page.match(/const TC_CALENDAR_COLORS = [^;]*;/);
  if (cle) vm.runInContext(cle[0], ctx); else { ko++; console.log('  KO  TC_CALENDARS_KEY introuvable'); }
  if (couleurs) vm.runInContext(couleurs[0], ctx); else { ko++; console.log('  KO  TC_CALENDAR_COLORS introuvable'); }
  vm.runInContext('let _isolatedCalendarName = null; let _isolatedCalendarId = null; globalThis.isole = () => _isolatedCalendarId; globalThis.lever = () => { _isolatedCalendarId = null; _isolatedCalendarName = null; };', ctx);
  ['loadCustomCalendars', 'saveCustomCalendars', 'getVisibleCalendarIds', 'getCalendarById', 'isCalendarVisible', 'isolateCalendarView', 'toggleCalendarVisibility', 'openCreateCalendarPrompt']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('const _save = saveCustomCalendars; saveCustomCalendars = function () { sauvegardes++; return _save(); };', ctx);
  return ctx;
}
const lu = (ctx) => JSON.parse(ctx.mem.timecool_custom_calendars || '[]');

(async () => {
  titre('1. Creer un agenda ne change jamais la visibilite des autres');
  const c = contexte([{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: true, isDefault: true }]);
  if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
  c.loadCustomCalendars();
  await c.openCreateCalendarPrompt();
  verifie('apres « Créer un nouvel agenda » : Mon agenda visible, le nouveau visible, dans sa couleur', c.customCalendars.length === 2 && c.customCalendars[0].visible === true && c.customCalendars[1].visible === true && c.customCalendars[1].name === 'Agenda scolaire de Elodie' && !!c.customCalendars[1].color, JSON.stringify(c.customCalendars));
  verifie('le reglage enregistre dit la meme chose', lu(c).length === 2 && lu(c).every((x) => x.visible === true));
  verifie('les deux agendas sont affiches', c.isCalendarVisible('cal_default') && c.isCalendarVisible(c.customCalendars[1].id) && c.getVisibleCalendarIds().length === 2);

  titre('2. Ouvrir le nouvel agenda depuis le menu (isolation) : un filtre d affichage, le reglage ne bouge pas');
  const idNouveau = c.customCalendars[1].id;
  c.sauvegardes = 0;
  c.isolateCalendarView(idNouveau);
  verifie('a l ecran : seul le nouveau est affiche', !c.isCalendarVisible('cal_default') && c.isCalendarVisible(idNouveau) && JSON.stringify(c.getVisibleCalendarIds()) === JSON.stringify([idNouveau]));
  verifie('mais le reglage enregistre garde Mon agenda visible (rien n est ecrit par l isolation)', c.sauvegardes === 0 && lu(c).every((x) => x.visible === true) && c.customCalendars[0].visible === true);
  await c.openCreateCalendarPrompt();
  verifie('creer un autre agenda PENDANT l isolation : le reglage enregistre a 3 agendas, tous visibles (le cas du compte 53)', lu(c).length === 3 && lu(c).every((x) => x.visible === true), JSON.stringify(lu(c)));
  c.lever();
  verifie('isolation levee : tout revient, Mon agenda et ses rendez-vous compris', c.isCalendarVisible('cal_default') && c.getVisibleCalendarIds().length === 3);

  titre('3. La pastille reste le seul reglage a la main');
  c.toggleCalendarVisibility(idNouveau, false);
  verifie('masquer le nouveau a la main : enregistre, Mon agenda intact', lu(c).find((x) => x.id === idNouveau).visible === false && lu(c)[0].visible === true && !c.isCalendarVisible(idNouveau));
  const nav = page.slice(page.indexOf('navigate = function(page) {'), page.indexOf('navigate = function(page) {') + 2500);
  verifie('la navigation vers l agenda ne remet plus visible:true de force (elle leve seulement l isolation)', !/c\.visible = true/.test(nav) && /_isolatedCalendarId = null/.test(nav));
  verifie('isolateCalendarView n ecrit plus visible et n enregistre plus', !/c\.visible =/.test(fonction(page, 'isolateCalendarView')) && !/saveCustomCalendars\(\)/.test(fonction(page, 'isolateCalendarView')));

  titre('4. Garde-fou au chargement');
  const g1 = contexte([{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: false, isDefault: true }, { id: 'cal_x', name: 'X', color: '#34a853', visible: false }]);
  g1.loadCustomCalendars();
  verifie('Mon agenda masque et aucun agenda visible : Mon agenda redevient visible, et c est enregistre', g1.customCalendars[0].visible === true && lu(g1)[0].visible === true && g1.sauvegardes === 1);
  const g2 = contexte([{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: false, isDefault: true }, { id: 'cal_x', name: 'X', color: '#34a853', visible: true }]);
  g2.loadCustomCalendars();
  verifie('Mon agenda masque a la main a cote d un agenda visible : rien ne change (regle du chef)', g2.customCalendars[0].visible === false && g2.sauvegardes === 0);
  const g3 = contexte([{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: true, isDefault: true }]);
  g3.loadCustomCalendars();
  verifie('compte sans agenda secondaire : rien ne change, rien n est ecrit', g3.customCalendars.length === 1 && g3.customCalendars[0].visible === true && g3.sauvegardes === 0);
  const g4 = contexte(null);
  g4.loadCustomCalendars();
  verifie('aucun reglage : Mon agenda seul, visible', g4.customCalendars.length === 1 && g4.customCalendars[0].id === 'cal_default' && g4.customCalendars[0].visible === true);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
