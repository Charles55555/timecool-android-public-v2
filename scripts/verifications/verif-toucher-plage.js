// Mission 36 (Charles, 12/10) : toucher une plage vide des vues Jour / Semaine ouvre « Nouveau » pre-rempli (jour touche,
// heure de la ligne arrondie au quart d heure, duree 1 h, type Personnel) ; un bloc existant, un appui long ou un
// defilement n ouvrent rien. Usage : node verif-toucher-plage.js <index.html>
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
// Un petit DOM : un corps avec des lignes et des cases, des rectangles connus, des evenements pointeur simules.
function element(className, parent, rect) {
  const el = { className: className, classList: { contains: (c) => className.split(' ').indexOf(c) > -1 }, children: [], parentElement: parent || null, _rect: rect || { top: 0, height: 44 }, _ecouteurs: {},
    getBoundingClientRect() { return { top: this._rect.top, height: this._rect.height, left: 0, width: 300 }; },
    addEventListener(t, f) { this._ecouteurs[t] = f; },
    closest(sel) { const cls = sel.split(',').map((x) => x.trim().replace(/^\./, '')); for (let n = this; n; n = n.parentElement) { if (cls.some((c) => n.classList && n.classList.contains(c))) return n; } return null; } };
  if (parent) parent.children.push(el);
  return el;
}
const ouverts = [];
const champs = { newEvtTitle: { value: '' }, newEvtDesc: { value: '' }, newEvtType: { value: '' }, newEvtComment: null, newEvtCalendar: null, newEvtDate: { value: '' }, newEvtDateFin: { value: '' }, newEvtAllDay: { checked: false }, newEvtStart: { value: '' }, newEvtEnd: { value: '' }, createModal: { classList: { add() { ouverts.push('open'); }, remove() {} } } };
const ctx = {
  console, Math, Number, String, Array, Date, JSON,
  document: { getElementById: (id) => champs[id] === undefined ? null : champs[id] },
  customCalendars: [], viewDate: new Date(2026, 9, 14), fmt: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
  tcTypeBlocHTML: () => '', tcMajJourneeEntiere() {}, escapeHTMLSafe: (x) => String(x), agendaStartH: 8
};
vm.createContext(ctx);
vm.runInContext('let _tcDrag = null;', ctx);
['const TC_TOUCHER_SEUIL_PX = [^;]*;', 'const TC_TOUCHER_DUREE_MS = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcHeureDeLaPosition', 'tcEstUnToucherDePlage', 'tcInstallerToucherDePlage', 'openCreateModal'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. L heure d une position dans une ligne : arrondie au quart d heure');
const H = (h, y, hauteur) => { const r = ctx.tcHeureDeLaPosition(h, y, hauteur); return r.heure + ':' + String(r.minute).padStart(2, '0'); };
verifie('haut de la ligne de 10h → 10:00 ; a 40 % → 10:15 ; a 55 % → 10:30 ; a 80 % → 10:45 ; tout en bas → 11:00', H(10, 0, 44) === '10:00' && H(10, 17.6, 44) === '10:15' && H(10, 24.2, 44) === '10:30' && H(10, 35.2, 44) === '10:45' && H(10, 44, 44) === '11:00', [H(10, 0, 44), H(10, 17.6, 44), H(10, 24.2, 44), H(10, 35.2, 44), H(10, 44, 44)].join(' '));
verifie('la derniere ligne (23h) ne depasse jamais 23:45', H(23, 44, 44) === '23:45');

titre('2. Le geste : court et immobile sur une case vide ; rien sur un bloc, un appui long, un defilement, un glisser');
const d0 = { x: 100, y: 200, t: 1000, cible: null };
verifie('toucher court et immobile → oui', ctx.tcEstUnToucherDePlage(d0, { x: 102, y: 203, t: 1200 }, null, false) === true);
verifie('appui long (600 ms) → non', ctx.tcEstUnToucherDePlage(d0, { x: 100, y: 200, t: 1700 }, null, false) === false);
verifie('defilement (30 px) → non', ctx.tcEstUnToucherDePlage(d0, { x: 100, y: 230, t: 1100 }, null, false) === false);
verifie('glisser-deposer en cours → non', ctx.tcEstUnToucherDePlage(d0, { x: 100, y: 200, t: 1100 }, null, true) === false);
const corpsX = element('main', null); const rowX = element('hour-row', corpsX); const cellX = element('hour-cell', rowX); const blocX = element('week-event', cellX);
verifie('sur un bloc de rendez-vous (.week-event) → non (sa fiche garde son geste)', ctx.tcEstUnToucherDePlage(d0, { x: 100, y: 200, t: 1100 }, blocX, false) === false && ctx.tcEstUnToucherDePlage(d0, { x: 100, y: 200, t: 1100 }, cellX, false) === true);

titre('3. Vue Semaine simulee : la case touchee donne le jour et l heure, et « Nouveau » s ouvre pre-rempli');
{
  const body = element('week-body', null);
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2026, 9, 12 + i));   // lundi 12 → dimanche 18 octobre
  const rows = [];
  for (let h = 8; h <= 19; h++) { const row = element('hour-row', body, { top: (h - 8) * 44, height: 44 }); element('hour-label', row); for (let i = 0; i < 7; i++) element('hour-cell', row); rows.push(row); }
  ctx.body = body; body._tcWeekDates = weekDates;
  // Le meme code que renderWeek (la suite 4 verifie qu il y est mot pour mot).
  vm.runInContext("tcInstallerToucherDePlage(body, function (cible, x, y) { const weekDates = body._tcWeekDates || [];" +
    "const cell = cible && typeof cible.closest === 'function' ? cible.closest('.hour-cell') : null; if (!cell || !cell.parentElement) return null; const row = cell.parentElement;" +
    "const colonnes = Array.prototype.slice.call(row.children).filter(function (c) { return c.classList && c.classList.contains('hour-cell'); }); const col = colonnes.indexOf(cell);" +
    "const lignes = Array.prototype.slice.call(body.children).filter(function (r) { return r.classList && r.classList.contains('hour-row'); }); const ligne = lignes.indexOf(row);" +
    "if (col < 0 || ligne < 0 || !weekDates[col]) return null; const rect = row.getBoundingClientRect(); const hm = tcHeureDeLaPosition(agendaStartH + ligne, y - rect.top, rect.height);" +
    "return { date: fmt(weekDates[col]), heure: hm.heure, minute: hm.minute }; });", ctx);
  verifie('le geste est pose une seule fois sur le corps (pointerdown / pointerup / pointercancel)', !!body._ecouteurs.pointerdown && !!body._ecouteurs.pointerup && !!body._ecouteurs.pointercancel && body._tcToucherPose === true);
  // Toucher la case du mercredi (colonne 3) dans la ligne de 14h, a 60 % de sa haueur → mercredi 14 octobre, 14:30-15:30.
  const cible = rows[6].children[3];   // ligne 14h (8 + 6), colonne mercredi (index 2 des cases = enfant 3)
  const _now = Date.now;
  ouverts.length = 0;
  body._ecouteurs.pointerdown({ pointerType: 'touch', clientX: 150, clientY: 6 * 44 + 26, target: cible });
  body._ecouteurs.pointerup({ pointerType: 'touch', clientX: 152, clientY: 6 * 44 + 27, target: cible });
  verifie('« Nouveau » s ouvre, date = mercredi 14 octobre 2026, 14:30 → 15:30, type Personnel (perso)', ouverts.length === 1 && champs.newEvtDate.value === '2026-10-14' && champs.newEvtStart.value === '14:30' && champs.newEvtEnd.value === '15:30' && champs.newEvtType.value === 'perso', JSON.stringify([champs.newEvtDate.value, champs.newEvtStart.value, champs.newEvtEnd.value, champs.newEvtType.value, ouverts.length]));
  // Semaine suivante affichee (nouveau rendu : body._tcWeekDates change, le geste reste pose une fois) : le jour suit.
  body._tcWeekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2026, 9, 19 + i));
  ouverts.length = 0;
  body._ecouteurs.pointerdown({ pointerType: 'touch', clientX: 150, clientY: 6 * 44 + 26, target: cible });
  body._ecouteurs.pointerup({ pointerType: 'touch', clientX: 152, clientY: 6 * 44 + 27, target: cible });
  verifie('apres un rendu de la semaine suivante, la meme case donne mercredi 21 octobre (jamais les jours du premier rendu)', ouverts.length === 1 && champs.newEvtDate.value === '2026-10-21', champs.newEvtDate.value);
  body._tcWeekDates = weekDates;
  ouverts.length = 0;
  body._ecouteurs.pointerdown({ pointerType: 'touch', clientX: 150, clientY: 300, target: cible });
  body._ecouteurs.pointerup({ pointerType: 'touch', clientX: 150, clientY: 340, target: cible });
  verifie('un defilement (40 px) sur la meme case n ouvre rien', ouverts.length === 0);
  const bloc = element('week-event', rows[6].children[3]);
  body._ecouteurs.pointerdown({ pointerType: 'touch', clientX: 150, clientY: 290, target: bloc });
  body._ecouteurs.pointerup({ pointerType: 'touch', clientX: 150, clientY: 290, target: bloc });
  verifie('un toucher sur un bloc existant n ouvre pas « Nouveau »', ouverts.length === 0);
  vm.runInContext('_tcDrag = { actif: true };', ctx);
  body._ecouteurs.pointerdown({ pointerType: 'touch', clientX: 150, clientY: 290, target: cible });
  body._ecouteurs.pointerup({ pointerType: 'touch', clientX: 150, clientY: 290, target: cible });
  verifie('pendant un glisser-deposer, rien', ouverts.length === 0);
  vm.runInContext('_tcDrag = null;', ctx);
  // Sans pre-remplissage, openCreateModal garde son comportement (date du jour regarde, heure ronde a venir).
  champs.newEvtDate.value = ''; ouverts.length = 0;
  ctx.openCreateModal();
  verifie('openCreateModal() sans argument : inchange (date = jour regarde, 9:00 → 10:00 un autre jour)', ouverts.length === 1 && champs.newEvtDate.value === '2026-10-14' && champs.newEvtStart.value === '09:00' && champs.newEvtEnd.value === '10:00', JSON.stringify([champs.newEvtDate.value, champs.newEvtStart.value, champs.newEvtEnd.value]));
}

titre('4. Les deux vues installent le geste ; la vue Mois est inchangee');
verifie('renderWeek installe tcInstallerToucherDePlage sur le corps de la semaine ; les jours sont relus a chaque rendu (body._tcWeekDates)', /body\._tcWeekDates = weekDates;\s+if \(typeof tcInstallerToucherDePlage === 'function'\) tcInstallerToucherDePlage\(body, function \(cible, x, y\) \{\s+const weekDates = body\._tcWeekDates \|\| \[\];\s+const cell = cible[\s\S]*?closest\('\.hour-cell'\)[\s\S]*?return \{ date: fmt\(weekDates\[col\]\), heure: hm\.heure, minute: hm\.minute \};/.test(fonction(page, 'renderWeek') || ''));
verifie('renderDay installe le geste sur le corps du jour ; le jour affiche est relu a chaque rendu (body._tcJourISO)', /body\._tcJourISO = fmt\(d\);\s+if \(typeof tcInstallerToucherDePlage === 'function'\) tcInstallerToucherDePlage\(body, function \(cible, x, y\) \{\s+const row = cible[\s\S]*?closest\('\.day-hour'\)[\s\S]*?return \{ date: body\._tcJourISO \|\| fmt\(viewDate\), heure: hm\.heure, minute: hm\.minute \};/.test(fonction(page, 'renderDay') || ''));
verifie('renderMonth n installe rien (toucher un jour fait ce qu il faisait)', !/tcInstallerToucherDePlage/.test(fonction(page, 'renderMonth') || ''));
verifie('le glisser-deposer existant (tcDeplacerDebut sur pointerdown des blocs) est intact', /el\.addEventListener\('pointerdown', function \(p\) \{ tcDeplacerDebut\(p, el, e, geo\); \}\);/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
