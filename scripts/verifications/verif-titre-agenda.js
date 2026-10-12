// Mission 9 bis (Charles, 12/10) : le nom entier de l agenda secondaire ouvert est sur une ligne dediee, centree, sous la
// ligne du mois et au-dessus de « Semaine 42 » ; rien dans la barre du haut ni sur la ligne du mois ; masquee pour Mon agenda.
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

titre('1. La page : rien dans la barre du haut ni sur la ligne du mois, une ligne dediee sous le mois');
verifie('plus aucun emplacement dans la barre du haut (headerAgendaLabel) ni sur la ligne du mois (subHeaderAgendaLabel)', !/headerAgendaLabel/.test(page) && !/subHeaderAgendaLabel/.test(page));
verifie('la ligne du mois a retrouve son espaceur vide devant « Auj. »', /onclick="nextPeriod\(\)"[^\n]*\n\s*<div style="flex:1;"><\/div>\n\s*<button class="today-btn" onclick="goToToday\(\)">Auj\.<\/button>/.test(page));
const cal = page.slice(page.indexOf('<div class="page active" id="page-calendar">'), page.indexOf('<div class="view-tabs">'));
const iMois = cal.indexOf('<div class="sub-header">'), iPanneau = cal.indexOf('id="tcMoisPanneau"'), iTitre = cal.indexOf('id="agendaSecondaireTitre"'), iSemaine = cal.indexOf('id="weekNumberBadge"'), iFuseau = cal.indexOf('id="timezoneBadge"');
verifie('ordre : ligne du mois, panneau du mois, TITRE DE L AGENDA, « Semaine 42 », fuseau', iMois > -1 && iMois < iPanneau && iPanneau < iTitre && iTitre < iSemaine && iSemaine < iFuseau, [iMois, iPanneau, iTitre, iSemaine, iFuseau].join(','));
const style = (cal.match(/id="agendaSecondaireTitre" style="([^"]*)"/) || [])[1] || '';
verifie('masquee par defaut, centree, pastille + nom en bleu gras 13px, coupee par des points de suspension si vraiment trop longue', /display:none;/.test(style) && /text-align:center;/.test(style) && /font-size:13px;/.test(style) && /font-weight:700;/.test(style) && /color:var\(--g-blue\);/.test(style) && /white-space:nowrap;/.test(style) && /text-overflow:ellipsis;/.test(style), style);
verifie('elle s efface comme les badges quand le panneau du mois est ouvert', /\.mois-ouvert #agendaSecondaireTitre \{ display:none !important; \}/.test(page) && /\.mois-ouvert #weekNumberBadge, \.mois-ouvert #timezoneBadge \{ display:none !important; \}/.test(page));

titre('2. updateHeaderAgendaLabel executee');
const el = { textContent: 'x', title: 'x', style: { display: 'x' } };
const menuWrap = { style: { display: '' } };
const pageCal = { classList: { contains: () => ctx.active } };
const ctx = { console, active: true, _isolatedCalendarName: null,
  document: { getElementById: (id) => ({ 'page-calendar': pageCal, agendaSecondaireTitre: el, calendarViewMenuWrap: menuWrap })[id] || null } };
vm.createContext(ctx);
vm.runInContext(fonction(page, 'updateHeaderAgendaLabel'), ctx);
ctx._isolatedCalendarName = 'Agenda scolaire de Elodie';
ctx.updateHeaderAgendaLabel();
verifie('agenda secondaire ouvert, sur l agenda : « 📍 Agenda scolaire de Elodie » visible sur sa ligne', el.textContent === '📍 Agenda scolaire de Elodie' && el.title === 'Agenda scolaire de Elodie' && el.style.display === 'block', el.textContent + ' / ' + el.style.display);
verifie('et le menu « types d evenements » est cache, comme avant', menuWrap.style.display === 'none');
ctx._isolatedCalendarName = null;
ctx.updateHeaderAgendaLabel();
verifie('agenda principal : la ligne est masquee et vide, le menu revient', el.textContent === '' && el.style.display === 'none' && menuWrap.style.display === '');
ctx._isolatedCalendarName = 'Asso'; ctx.active = false;
ctx.updateHeaderAgendaLabel();
verifie('agenda secondaire mais autre page : masquee (comme avant)', el.style.display === 'none' && el.textContent === '');
verifie('la fonction n ecrit ni dans la barre du haut ni sur la ligne du mois', !/headerAgendaLabel|subHeaderAgendaLabel/.test(fonction(page, 'updateHeaderAgendaLabel') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
