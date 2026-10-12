// Mission 28 (Charles, 12/10) : les agendas crees restent la apres rechargement. TC_CALENDARS_KEY est declaree AVANT
// l appel de loadCustomCalendars() au chargement du script (sinon : zone morte, repli « Mon agenda » seul, et le 2e
// agenda cree ecrasait la liste) ; un rendez-vous range dans un agenda secondaire reste visible.
// Usage : node verif-agendas-recharges.js <index.html>
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

titre('1. L ordre dans le script : la constante avant l appel au chargement');
const decl = page.indexOf("const TC_CALENDARS_KEY = 'timecool_custom_calendars';");
const appel = page.indexOf('\nloadCustomCalendars();');
verifie('la constante TC_CALENDARS_KEY est declaree une seule fois', (page.match(/const TC_CALENDARS_KEY = /g) || []).length === 1);
verifie('l appel loadCustomCalendars() au chargement du script existe, et la constante est declaree AVANT lui', decl > -1 && appel > -1 && decl < appel, 'declaration ' + decl + ' / appel ' + appel);
verifie('la constante est declaree a cote de « let customCalendars » (declare tot pour la meme raison)', Math.abs(decl - page.indexOf('let customCalendars = [];')) < 400);

titre('2. Rejeu : au chargement, les agendas enregistres sont relus ; un rendez-vous d un agenda secondaire est visible');
const stock = { timecool_custom_calendars: JSON.stringify([{ id: 'cal_default', name: 'Mon agenda', color: '#4285F4', visible: true, isDefault: true }, { id: 'cal_sport', name: 'Sport', color: '#34A853', visible: true }]) };
const ctx = { console, String, Array, Object, JSON, localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; } } };
vm.createContext(ctx);
// Dans l ordre de la page : la constante et la variable, puis les fonctions, puis l appel — comme au chargement.
const mConst = page.match(/const TC_CALENDARS_KEY = [^;]*;/);
vm.runInContext((mConst ? mConst[0] : '') + '\nlet customCalendars = [];\nlet _isolatedCalendarId = null;', ctx);
['loadCustomCalendars', 'saveCustomCalendars', 'getVisibleCalendarIds', 'isCalendarVisible'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
vm.runInContext('loadCustomCalendars();', ctx);
const cals = vm.runInContext('customCalendars', ctx);
verifie('les deux agendas sont relus (Mon agenda + Sport), plus de repli « Mon agenda » seul', JSON.stringify(cals.map((c) => c.id)) === JSON.stringify(['cal_default', 'cal_sport']), JSON.stringify(cals.map((c) => c.id)));
verifie('un rendez-vous range dans « Sport » est visible', ctx.isCalendarVisible('cal_sport') === true && ctx.getVisibleCalendarIds().indexOf('cal_sport') > -1);
// Creer un 3e agenda puis « recharger » : la liste complete est enregistree, rien n est perdu.
vm.runInContext("customCalendars.push({ id: 'cal_ecole', name: 'École', color: '#FBBC04', visible: true }); saveCustomCalendars(); customCalendars = []; loadCustomCalendars();", ctx);
const cals2 = vm.runInContext('customCalendars', ctx);
verifie('creer un 3e agenda puis recharger : les trois sont la (la liste enregistree est complete)', JSON.stringify(cals2.map((c) => c.id)) === JSON.stringify(['cal_default', 'cal_sport', 'cal_ecole']), JSON.stringify(cals2.map((c) => c.id)));
// Le defaut d avant, rejoue : la constante en zone morte au moment de l appel → repli « Mon agenda » seul.
{
  const c2 = { console, String, Array, Object, JSON, localStorage: ctx.localStorage };
  vm.createContext(c2);
  vm.runInContext('let customCalendars = []; let _isolatedCalendarId = null;', c2);
  vm.runInContext(fonction(page, 'loadCustomCalendars'), c2);
  let avant = null;
  try { vm.runInContext("loadCustomCalendars(); const TC_CALENDARS_KEY = 'timecool_custom_calendars';", c2); avant = vm.runInContext('customCalendars', c2); } catch (e) { avant = 'erreur ' + e.message; }
  verifie('(temoin du defaut) appelee avant la constante, la fonction retombe sur « Mon agenda » seul', Array.isArray(avant) && avant.length === 1 && avant[0].id === 'cal_default', JSON.stringify(avant));
}
titre('3. Controle general (examen) : aucun appel de demarrage ne lit une constante declaree plus bas');
// Chaque « nom(); » en colonne 0 est execute au chargement du script. Les constantes TC_… que lit la fonction (et les
// fonctions qu elle appelle, jusqu a 3 niveaux) doivent etre declarees AVANT cet appel : sinon, zone morte et repli silencieux.
{
  const appels = [];
  const reAppel = /^([A-Za-z_]\w*)\(\);$/gm;
  let m;
  while ((m = reAppel.exec(page)) !== null) appels.push({ nom: m[1], pos: m.index });
  const declarationDe = (nom) => { const r = page.search(new RegExp('^(?:const|let|var) ' + nom + '\\b', 'm')); return r; };
  const fautes = [];
  appels.forEach((a) => {
    const vues = {}, consts = {};
    const explorer = (nom, niveau) => {
      if (niveau > 3 || vues[nom]) return;
      vues[nom] = true;
      const src = fonction(page, nom);
      if (!src) return;
      (src.match(/\bTC_[A-Z0-9_]+\b/g) || []).forEach((c) => { consts[c] = true; });
      (src.match(/\b([A-Za-z_]\w*)\(/g) || []).map((x) => x.slice(0, -1)).forEach((f) => { if (f !== nom && page.indexOf('function ' + f + '(') > -1) explorer(f, niveau + 1); });
    };
    explorer(a.nom, 0);
    Object.keys(consts).forEach((c) => { const d = declarationDe(c); if (d > a.pos) fautes.push(a.nom + '() lit ' + c + ' declaree apres l appel'); });
  });
  verifie(appels.length + ' appels de demarrage analyses (loadCustomCalendars, loadConvocations, loadMessagesFromStorage…) : aucune constante declaree apres l appel', appels.length >= 10 && fautes.length === 0, fautes.join(' ; ') || appels.map((a) => a.nom).join(' '));
}

titre('4. Rejeu : les convocations de groupe en stockage sont relues au chargement');
{
  const stock2 = { timecool_convocations: JSON.stringify([{ id: 'g1', titre: 'Réunion parents' }, { id: 'g2', titre: 'Anniversaire' }]) };
  const c3 = { console, String, Array, Object, JSON, localStorage: { getItem: (k) => (k in stock2 ? stock2[k] : null), setItem: (k, v) => { stock2[k] = String(v); } } };
  vm.createContext(c3);
  const mC = page.match(/const TC_CONVOCATIONS_KEY = [^;]*;/);
  const declConv = page.indexOf("const TC_CONVOCATIONS_KEY = 'timecool_convocations';");
  const appelConv = page.indexOf('\nloadConvocations();');
  verifie('TC_CONVOCATIONS_KEY est declaree une fois, AVANT l appel loadConvocations() du chargement', !!mC && (page.match(/const TC_CONVOCATIONS_KEY = /g) || []).length === 1 && declConv > -1 && appelConv > -1 && declConv < appelConv, 'declaration ' + declConv + ' / appel ' + appelConv);
  vm.runInContext((mC ? mC[0] : '') + '\nlet groupConvocations = [];', c3);
  ['loadConvocations', 'saveConvocations'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, c3); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('loadConvocations();', c3);
  const convs = vm.runInContext('groupConvocations', c3);
  verifie('deux convocations en stockage → deux en memoire (plus de liste vide a chaque demarrage)', Array.isArray(convs) && convs.length === 2 && convs[1].titre === 'Anniversaire', JSON.stringify(convs));
}
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
