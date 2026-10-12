// Mission 9 (Charles, 12/10) : le nom de l agenda secondaire ouvert est sur la ligne du mois (entre le selecteur de mois et
// « Auj. »), plus dans la barre du haut ; rien pour l agenda principal ; coupe par des points de suspension sur 390 px.
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

titre('1. La page : plus rien dans la barre du haut, le nom sur la ligne du mois');
const entete = page.slice(page.indexOf('<header class="header"'), page.indexOf('</header>'));
verifie('la barre du haut n a plus d emplacement pour le nom (headerAgendaLabel)', !/headerAgendaLabel/.test(entete) && !/id="headerAgendaLabel"/.test(page));
const sousBarre = page.slice(page.indexOf('<div class="sub-header">'), page.indexOf('id="calendarViewMenuWrap"'));
const iMois = sousBarre.indexOf('id="monthTitle"'), iSuivant = sousBarre.indexOf('onclick="nextPeriod()"'), iNom = sousBarre.indexOf('id="subHeaderAgendaLabel"'), iAuj = sousBarre.indexOf('>Auj.<'), iLoupe = sousBarre.indexOf('openSearchModal()');
verifie('ordre sur la ligne du mois : mois ‹ › puis le nom, puis « Auj. », puis la loupe', iMois > -1 && iMois < iSuivant && iSuivant < iNom && iNom < iAuj && iAuj < iLoupe, [iMois, iSuivant, iNom, iAuj, iLoupe].join(','));
const style = (sousBarre.match(/id="subHeaderAgendaLabel" style="([^"]*)"/) || [])[1] || '';
verifie('il prend l espace libre (flex:1), centre, pastille + bleu, et se coupe par des points de suspension sans pousser « Auj. » (min-width:0, overflow:hidden, ellipsis, nowrap)', /flex:1;/.test(style) && /min-width:0;/.test(style) && /text-align:center;/.test(style) && /color:var\(--g-blue\);/.test(style) && /white-space:nowrap;/.test(style) && /overflow:hidden;/.test(style) && /text-overflow:ellipsis;/.test(style), style);
verifie('l ancien espaceur vide a disparu (c est lui qui tient l espace maintenant)', !/<div style="flex:1;"><\/div>\s*<button class="today-btn" onclick="goToToday\(\)">/.test(page));

titre('2. updateHeaderAgendaLabel executee');
const nom = { textContent: 'x', title: 'x' };
const menuWrap = { style: { display: '' } };
const pageCal = { classList: { contains: () => ctx.active } };
const ctx = { console, active: true, _isolatedCalendarName: null,
  document: { getElementById: (id) => ({ 'page-calendar': pageCal, subHeaderAgendaLabel: nom, calendarViewMenuWrap: menuWrap, headerAgendaLabel: null })[id] || null } };
vm.createContext(ctx);
vm.runInContext(fonction(page, 'updateHeaderAgendaLabel'), ctx);
ctx._isolatedCalendarName = 'Agenda scolaire de Elodie';
ctx.updateHeaderAgendaLabel();
verifie('agenda secondaire ouvert, sur l agenda : « 📍 Agenda scolaire de Elodie » sur la ligne du mois', nom.textContent === '📍 Agenda scolaire de Elodie' && nom.title === 'Agenda scolaire de Elodie', nom.textContent);
verifie('et le menu « types d evenements » est cache, comme avant', menuWrap.style.display === 'none');
ctx._isolatedCalendarName = null;
ctx.updateHeaderAgendaLabel();
verifie('agenda principal : rien (vide), le menu revient', nom.textContent === '' && nom.title === '' && menuWrap.style.display === '');
ctx._isolatedCalendarName = 'Asso'; ctx.active = false;
ctx.updateHeaderAgendaLabel();
verifie('agenda secondaire mais autre page : rien (comme avant)', nom.textContent === '');
verifie('la fonction n ecrit plus dans la barre du haut', !/headerAgendaLabel/.test(fonction(page, 'updateHeaderAgendaLabel') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
