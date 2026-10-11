// Mission 6 (Charles, 11/10) : dans le menu latéral, la rubrique « Mes agendas » (agendas secondaires) est juste sous
// « Mon agenda », avant « Synchroniser avec mon ancien agenda » ; « Se déconnecter » et « Créer un nouvel agenda » restent
// en bas ; sans agenda secondaire, pas de rubrique. renderMenu est executee.
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
const zone = { innerHTML: '' };
const ctx = { console, mode: 'user', isMenuItemVisible: () => true, escapeHTMLSafe: (x) => String(x), customCalendars: [],
  document: { getElementById: (id) => (id === 'menuItems' ? zone : null) } };
vm.createContext(ctx);
const items = page.match(/const menuItems = \{[\s\S]*?\n\};/);
if (items) vm.runInContext(items[0], ctx); else { ko++; console.log('  KO  menuItems introuvable'); }
const rm = fonction(page, 'renderMenu');
if (rm) vm.runInContext(rm, ctx); else { ko++; console.log('  KO  renderMenu introuvable'); }
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const pos = (h, s) => h.indexOf(s);

titre('1. Avec deux agendas secondaires');
ctx.customCalendars = [
  { id: 'principal', name: 'Mon agenda', color: '#1a73e8', isDefault: true },
  { id: 'cal_elodie', name: 'Agenda scolaire de Elodie', color: '#34a853' },
  { id: 'cal_asso', name: 'Asso', color: '#fbbc04' },
];
ctx.renderMenu();
let h = zone.innerHTML;
const iMon = pos(h, '>Mon agenda<'), iRub = pos(h, 'Mes agendas'), iSync = pos(h, 'Synchroniser avec mon ancien agenda'), iImport = pos(h, 'Importer mon ancien agenda');
const iDeco = pos(h, 'Se déconnecter'), iCreer = pos(h, 'Créer un nouvel agenda'), iCharly = pos(h, 'Charly IA');
verifie('« Mon agenda » est la premiere ligne', iMon > -1 && iMon < iRub && iMon < iImport && iMon < iSync);
verifie('la rubrique « Mes agendas » vient JUSTE apres, avant « Importer » et « Synchroniser avec mon ancien agenda »', iRub > iMon && iRub < iImport && iRub < iSync, [iMon, iRub, iImport, iSync].join(','));
verifie('les deux agendas sont dans la rubrique, avant « Synchroniser »', pos(h, 'Agenda scolaire de Elodie') > iRub && pos(h, 'Agenda scolaire de Elodie') < iSync && pos(h, '>Asso<') > iRub && pos(h, '>Asso<') < iSync);
verifie('meme rendu : pastille de couleur + nom, meme action au clic (isolateCalendarView)', /background:#34a853;[^>]*><\/span>\s*<span[^>]*>Agenda scolaire de Elodie<\/span>/.test(h) && /onclick="isolateCalendarView\('cal_elodie'\)"/.test(h));
verifie('l agenda principal (isDefault) n y est pas', (h.match(/Mon agenda/g) || []).length === 1);
verifie('le reste du menu suit dans le meme ordre (Charly IA apres Synchroniser)', iCharly > iSync);
verifie('« Se déconnecter » puis « Créer un nouvel agenda » restent tout en bas', iDeco > iCharly && iCreer > iDeco && iCreer === h.lastIndexOf('Créer un nouvel agenda') && h.slice(iCreer).indexOf('menu-item') < 0);
verifie('plus rien apres « Créer un nouvel agenda »', !/Mes agendas/.test(h.slice(iCreer)));
const liste = ['Mon agenda', 'Mes agendas', 'Agenda scolaire de Elodie', 'Asso', 'Importer mon ancien agenda', 'Synchroniser avec mon ancien agenda', 'Charly IA', 'Mes contacts', 'Se déconnecter', 'Créer un nouvel agenda'];
verifie('ordre complet : ' + liste.join(' > '), liste.map((x) => pos(h, x)).every((p, i, a) => p > -1 && (i === 0 || p > a[i - 1])), liste.map((x) => pos(h, x)).join(','));

titre('2. Sans agenda secondaire');
ctx.customCalendars = [{ id: 'principal', name: 'Mon agenda', color: '#1a73e8', isDefault: true }];
ctx.renderMenu();
h = zone.innerHTML;
verifie('pas de rubrique « Mes agendas »', !/Mes agendas/.test(h));
verifie('le menu est intact : Mon agenda, Importer, Synchroniser, … Se déconnecter, Créer un nouvel agenda', pos(h, '>Mon agenda<') < pos(h, 'Importer mon ancien agenda') && pos(h, 'Se déconnecter') < pos(h, 'Créer un nouvel agenda'));
ctx.customCalendars = [];
ctx.renderMenu();
verifie('aucun agenda du tout : pareil, pas d erreur', !/Mes agendas/.test(zone.innerHTML) && /Mon agenda/.test(zone.innerHTML));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
