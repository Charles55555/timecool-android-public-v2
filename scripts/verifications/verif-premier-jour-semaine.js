// Premier jour de la semaine : Lundi (defaut), Dimanche ou Samedi.
// La vue semaine, la grille du mois et le panneau du mois suivent le reglage ;
// les disponibilites, le numero de semaine ISO et le serveur ne bougent pas.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
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

/* ---- Un petit navigateur de poche ---- */
const stockage = {};
const localStorage = {
  getItem: (k) => (k in stockage ? stockage[k] : null),
  setItem: (k, v) => { stockage[k] = String(v); },
};
function element() {
  const e = { children: [], style: {}, _html: '', _classes: new Set(), className: '', textContent: '', offsetWidth: 300 };
  e.classList = { add: (c) => e._classes.add(c), contains: (c) => e._classes.has(c) || e.className.split(/\s+/).includes(c) };
  Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; e.children = []; } });
  e.appendChild = (c) => { e.children.push(c); return c; };
  return e;
}
const els = {};
const document = {
  getElementById: (id) => els[id] || null,
  createElement: () => element(),
};
const toasts = [];
const ctx = {
  String, Number, Math, Date, Array, Set, JSON, parseInt, console, localStorage, document,
  requestAnimationFrame: () => {},
  currentLanguage: 'fr', currentPage: 'calendar', mode: 'pro', events: [],
  agendaStartH: 8, agendaEndH: 10,
  tcReperesDuJour: () => [], tcEvenementsDuJour: () => [], tcEvenementCouvre: () => false,
  isCategoryVisible: () => true, isCalendarVisible: () => true, catColor: () => '#000',
  tcTexteSombre: () => false, tcHorairePlage: () => '', tcAppliquerCouleurEvenement: () => {},
  switchView: () => {}, render: () => { ctx._rendus++; }, _rendus: 0,
  showToast: (m) => toasts.push(m), closeSettingsModal: () => {}, tcSyncBientot: () => { ctx._syncs++; }, _syncs: 0,
};
vm.createContext(ctx);

const morceaux = [
  extraireConst('MONTHS'), extraireConst('DAYS_FULL'), extraireConst('DAYS_SHORT'), extraireConst('TC_PREMIERS_JOURS'), extraireConst('TC_MOIS_COURTS'),
  ['escapeHTMLSafe', 'tcDayShort', 'fmt', 'sameDay', 'isProClosed', 'tcPremierJourSemaine', 'tcDecalageSemaine', 'tcJoursEnOrdre',
   'tcLundiDeLaSemaine', 'tcNomPremierJour', 'getISOWeek', 'tcISO', 'tcEvenementFin', 'tcLignesBandeSemaine', 'tcPanneauMoisHTML', 'renderWeek', 'renderMonth',
   'applyPremierJourSemaine', 'savePreference'].map(extraire).join('\n'),
];
['MONTHS', 'DAYS_FULL', 'DAYS_SHORT', 'TC_PREMIERS_JOURS', 'TC_MOIS_COURTS'].forEach((n, i) => { if (!morceaux[i]) { ko++; console.log('  KO  constante introuvable : ' + n); } });
['escapeHTMLSafe', 'tcDayShort', 'tcPremierJourSemaine', 'tcDecalageSemaine', 'tcJoursEnOrdre', 'tcLundiDeLaSemaine', 'tcNomPremierJour', 'tcEvenementFin', 'tcLignesBandeSemaine', 'tcPanneauMoisHTML', 'renderWeek', 'renderMonth', 'applyPremierJourSemaine']
  .forEach((n) => { if (!extraire(n)) { ko++; console.log('  KO  fonction introuvable : ' + n); } });
try {
  vm.runInContext(morceaux.filter(Boolean).join('\n').replace(/^const /gm, 'var '), ctx);
} catch (e) { ko++; console.log('  KO  chargement : ' + e.message); }

if (ko) { console.log(''); console.log(ko + ' anomalie(s) au chargement.'); process.exit(1); }

/* ---- Des references ecrites autrement, pour ne pas copier la page ---- */
const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];   // indices getDay()
const LETTRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NOMS_PREMIER = { 1: 'Lundi', 0: 'Dimanche', 6: 'Samedi' };
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function ajoute(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
function refDebutSemaine(d, p) { let x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); while (x.getDay() !== p) x = ajoute(x, -1); return x; }
function refSemaineIso(d) {   // jeudi de la semaine ISO, puis rang depuis le 4 janvier
  // le jeudi de la semaine du lundi au dimanche de d
  const lundi = ajoute(d, -((d.getDay() + 6) % 7));
  const j = ajoute(lundi, 3);
  const an = j.getFullYear();
  const lundi1 = (() => { const q = new Date(an, 0, 4); return ajoute(q, -((q.getDay() + 6) % 7)); })();
  return Math.round((lundi.getTime() - lundi1.getTime()) / (7 * 86400000)) + 1;
}
function regle(p) { stockage.tc_premier_jour_semaine = String(p); }

const AUJ = new Date(2026, 9, 7, 10, 0, 0);   // mercredi 7 octobre 2026

/* ---- La vue semaine ---- */
function semaine(viewDate, today) {
  els.weekHeader = element(); els.weekBody = element();
  ctx.viewDate = new Date(viewDate); ctx.today = new Date(today);
  ctx.renderWeek();
  return els.weekHeader.children.map((c) => {
    const nom = (c.innerHTML.match(/week-day-name"[^>]*>([^<]*)</) || [])[1];
    const num = (c.innerHTML.match(/week-day-num"[^>]*>([^<]*)</) || [])[1];
    return { nom, num: parseInt(num, 10), auj: c.classList.contains('today'), ferme: c.classList.contains('closed') };
  });
}
function corpsSemaine() { return els.weekBody.children.map((r) => r.children.map((c) => c.classList.contains('closed'))); }

/* ---- La grille du mois ---- */
function grilleMois(viewDate, today) {
  els.monthGridHeader = element(); els.monthGridBody = element();
  ctx.viewDate = new Date(viewDate); ctx.today = new Date(today);
  ctx.renderMonth();
  const entetes = [...els.monthGridHeader.innerHTML.matchAll(/<div>([^<]*)<\/div>/g)].map((m) => m[1]);
  const cases = els.monthGridBody.children.map((c) => ({
    num: parseInt((c.innerHTML.match(/month-day-number">(\d+)</) || [])[1], 10),
    autre: c.className.includes('other-month'), auj: c.className.includes('today'),
  }));
  return { entetes, cases };
}

/* ---- Le panneau du mois ---- */
function panneau(mois, today) {
  const html = ctx.tcPanneauMoisHTML(new Date(mois.getFullYear(), mois.getMonth(), 1), iso(today), new Map(), null);
  const grille = html.slice(html.indexOf('grid-template-columns:26px'), html.indexOf('id="tcMoisRangee"'));
  const lettres = [...grille.slice(0, grille.indexOf('<div onclick') > 0 ? grille.length : grille.length)
    .matchAll(/padding:2px 0;">([A-Z])<\/div>/g)].map((m) => m[1]);
  const jetons = [...grille.matchAll(/<div><\/div>|<div onclick="tcPanneauMoisAller\('([\d-]+)'\)"|background:#f1f3f4[^>]*>(\d+)<\/div>/g)];
  const rangs = [];
  let cour = null;
  jetons.forEach((m) => {
    if (m[2]) { cour = { semaine: parseInt(m[2], 10), cases: [] }; rangs.push(cour); }
    else if (cour) cour.cases.push(m[1] || null);
  });
  return { lettres, rangs };
}

const DEPARTS = [
  new Date(2026, 9, 7),   // mercredi
  new Date(2026, 9, 4),   // dimanche
  new Date(2026, 9, 3),   // samedi
  new Date(2026, 9, 5),   // lundi
  new Date(2026, 9, 6),   // mardi
  new Date(2026, 8, 30),  // fin de mois
  new Date(2026, 9, 1),   // debut de mois
  new Date(2026, 11, 31), // 31 decembre
  new Date(2027, 0, 1),   // 1er janvier
  new Date(2026, 0, 1),   // 1er janvier 2026
  new Date(2025, 11, 28), // dimanche, changement d'annee
  new Date(2028, 1, 29),  // bissextile
];

[1, 0, 6].forEach((p) => {
  const nomP = NOMS_PREMIER[p];
  titre('Premier jour : ' + nomP);
  regle(p);
  verifie('le reglage est lu : ' + nomP, ctx.tcPremierJourSemaine() === p && ctx.tcNomPremierJour() === nomP);
  verifie('les sept jours dans l\'ordre', JSON.stringify(ctx.tcJoursEnOrdre()) === JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((i) => (p + i) % 7)), JSON.stringify(ctx.tcJoursEnOrdre()));

  /* Vue semaine */
  let ok = true, detail = '', premiers = [];
  DEPARTS.forEach((vd) => {
    const cols = semaine(vd, AUJ);
    const debut = refDebutSemaine(vd, p);
    premiers.push(iso(debut));
    const attendu = [0, 1, 2, 3, 4, 5, 6].map((i) => ajoute(debut, i));
    const bon = cols.length === 7
      && cols.every((c, i) => c.num === attendu[i].getDate() && c.nom === JOURS[attendu[i].getDay()]);
    if (!bon) { ok = false; detail = iso(vd) + ' : ' + JSON.stringify(cols.map((c) => c.nom + c.num)); }
    // aucune journee sautee ni doublee : sept jours qui se suivent, la vue en fait partie
    const contient = attendu.some((d) => iso(d) === iso(vd));
    if (!contient) { ok = false; detail = iso(vd) + ' absent de sa semaine'; }
  });
  verifie('semaine : jours et noms dans le bon ordre, 12 dates dont fin de mois et 1er janvier', ok, detail || premiers.join(' '));

  // Toutes les semaines de 2026 et du debut 2027 : sept jours qui se suivent sans trou
  let trou = '';
  for (let k = 0; k < 70 && !trou; k++) {
    const vd = ajoute(new Date(2026, 0, 1), k * 7 + (k % 7));
    const cols = semaine(vd, AUJ);
    const debut = refDebutSemaine(vd, p);
    for (let i = 0; i < 7; i++) {
      const d = ajoute(debut, i);
      if (cols[i].num !== d.getDate() || cols[i].nom !== JOURS[d.getDay()]) { trou = iso(vd) + ' colonne ' + i; break; }
    }
    if (!trou && cols[0].nom !== JOURS[p]) trou = iso(vd) + ' ne commence pas par ' + JOURS[p];
  }
  verifie('semaine : 70 semaines de suite, la premiere colonne est toujours ' + JOURS[p], !trou, trou);

  // « Aujourd'hui » dans la bonne colonne
  const colsAuj = semaine(AUJ, AUJ);
  const idxAuj = (AUJ.getDay() - p + 7) % 7;
  verifie('semaine : aujourd\'hui (mercredi 7) est dans la colonne ' + (idxAuj + 1), colsAuj.filter((c) => c.auj).length === 1 && colsAuj[idxAuj].auj && colsAuj[idxAuj].num === 7 && colsAuj[idxAuj].nom === 'Mer');
  const colsAutre = semaine(ajoute(AUJ, 14), AUJ);
  verifie('semaine : deux semaines plus loin, personne n\'est « aujourd\'hui »', colsAutre.every((c) => !c.auj));

  // Les jours fermes du mode pro suivent les VRAIS jours (jeu, sam, dim), pas les colonnes
  const cols = semaine(AUJ, AUJ);
  const fermesEntete = cols.filter((c) => c.ferme).map((c) => c.nom).sort().join(',');
  verifie('semaine : jours fermes du mode pro = Jeu, Sam, Dim, quelle que soit la colonne', fermesEntete === 'Dim,Jeu,Sam', fermesEntete);
  const corps = corpsSemaine();
  const attenduCorps = cols.map((c) => c.ferme);
  verifie('semaine : les cellules des heures suivent les en-tetes', corps.length >= 1 && corps.every((r) => JSON.stringify(r) === JSON.stringify(attenduCorps)));

  /* Grille du mois */
  let okM = true, detM = '';
  [new Date(2026, 9, 1), new Date(2026, 8, 1), new Date(2026, 10, 1), new Date(2026, 11, 1), new Date(2027, 0, 1), new Date(2027, 1, 1), new Date(2028, 1, 1), new Date(2026, 1, 1)].forEach((mois) => {
    const g = grilleMois(mois, AUJ);
    const attenduEnt = [0, 1, 2, 3, 4, 5, 6].map((i) => JOURS[(p + i) % 7]);
    if (JSON.stringify(g.entetes) !== JSON.stringify(attenduEnt)) { okM = false; detM = iso(mois) + ' en-tetes ' + g.entetes.join(','); return; }
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const debut = refDebutSemaine(premier, p);
    const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
    const nb = Math.ceil(((premier.getDay() - p + 7) % 7 + dernier.getDate()) / 7) * 7;
    if (g.cases.length !== nb) { okM = false; detM = iso(mois) + ' : ' + g.cases.length + ' cases au lieu de ' + nb; return; }
    g.cases.forEach((c, i) => {
      const d = ajoute(debut, i);
      const autre = d.getMonth() !== mois.getMonth();
      if (c.num !== d.getDate() || c.autre !== autre) { okM = false; detM = iso(mois) + ' case ' + i + ' : ' + c.num + (c.autre ? ' (autre mois)' : '') + ' au lieu de ' + d.getDate(); }
      if (c.auj !== (iso(d) === iso(AUJ))) { okM = false; detM = iso(mois) + ' case ' + i + ' : mauvaise case « aujourd\'hui »'; }
    });
  });
  verifie('mois : en-tetes, premiere case, cases qui se suivent, « aujourd\'hui » (8 mois dont decembre, janvier, fevrier bissextile)', okM, detM);
  const gOct = grilleMois(new Date(2026, 9, 1), AUJ);
  verifie('mois : la case « aujourd\'hui » est dans la colonne du mercredi', gOct.cases.findIndex((c) => c.auj) % 7 === (3 - p + 7) % 7, gOct.cases.findIndex((c) => c.auj));
  verifie('mois : 1er octobre 2026 (jeudi) a ' + ((4 - p + 7) % 7) + ' case(s) du mois d\'avant', gOct.cases.filter((c, i) => i < 7 && c.autre).length === (4 - p + 7) % 7);

  /* Panneau du mois */
  let okP = true, detP = '';
  [new Date(2026, 9, 1), new Date(2026, 8, 1), new Date(2026, 10, 1), new Date(2026, 11, 1), new Date(2027, 0, 1), new Date(2026, 1, 1), new Date(2028, 1, 1), new Date(2027, 4, 1)].forEach((mois) => {
    const pn = panneau(mois, AUJ);
    if (JSON.stringify(pn.lettres) !== JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((i) => LETTRES[(p + i) % 7]))) { okP = false; detP = iso(mois) + ' lettres ' + pn.lettres.join(''); return; }
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
    const vus = [];
    pn.rangs.forEach((rg, r) => {
      if (rg.cases.length !== 7) { okP = false; detP = iso(mois) + ' rangee ' + r + ' : ' + rg.cases.length + ' cases'; return; }
      const debutRangee = ajoute(refDebutSemaine(premier, p), r * 7);
      rg.cases.forEach((iso1, j) => {
        const d = ajoute(debutRangee, j);
        const dansMois = d.getMonth() === mois.getMonth();
        if (dansMois ? iso1 !== iso(d) : iso1 !== null) { okP = false; detP = iso(mois) + ' rangee ' + r + ' colonne ' + j + ' : ' + iso1 + ' au lieu de ' + (dansMois ? iso(d) : 'vide'); }
        if (iso1) vus.push(iso1);
      });
      // Numero de semaine ISO : celui du lundi de la rangee
      const lundiRangee = ajoute(debutRangee, (8 - p) % 7);
      if (rg.semaine !== refSemaineIso(lundiRangee)) { okP = false; detP = iso(mois) + ' rangee ' + r + ' : semaine ' + rg.semaine + ' au lieu de ' + refSemaineIso(lundiRangee); }
    });
    // tous les jours du mois, une seule fois, dans l'ordre
    const tous = []; for (let d = 1; d <= dernier.getDate(); d++) tous.push(iso(new Date(mois.getFullYear(), mois.getMonth(), d)));
    if (JSON.stringify(vus) !== JSON.stringify(tous)) { okP = false; detP = iso(mois) + ' jours : ' + vus.length + ' vus pour ' + tous.length; }
    if (pn.rangs.length < 4 || pn.rangs.length > 6) { okP = false; detP = iso(mois) + ' : ' + pn.rangs.length + ' rangees'; }
  });
  verifie('panneau : lettres, rangees de sept, aucun jour saute ni double, numeros de semaine ISO (8 mois)', okP, detP);
  const pOct = panneau(new Date(2026, 9, 1), AUJ);
  verifie('panneau : octobre 2026, la premiere rangee est la semaine ISO 40', pOct.rangs[0].semaine === 40, pOct.rangs.map((r) => r.semaine).join(' '));
});

/* ---- Le numero de semaine ISO sous le titre ne change jamais ---- */
titre('Numero de semaine ISO (sous le titre du mois)');
// Depuis la mission 26, wnBadge porte « Semaine N · 🌍 fuseau » ; le numero de semaine se calcule dans « const semaine = … ».
const exprBadge = (page.match(/const semaine = ('Semaine ' \+ getISOWeek\([^;]+);/) || [])[1];
verifie('l\'expression du numero de semaine est trouvee', !!exprBadge);
function badge(vd, p) { regle(p); ctx.viewDate = new Date(vd); return vm.runInContext(exprBadge, ctx); }
verifie('lundi 5 octobre 2026 : semaine 41 avec les trois reglages (dimanche = 41, la semaine du 4 au 10)', badge(new Date(2026, 9, 5), 1) === 'Semaine 41' && badge(new Date(2026, 9, 5), 0) === 'Semaine 41' && badge(new Date(2026, 9, 5), 6) === 'Semaine 41');
verifie('mercredi 7 octobre 2026 : semaine 41 partout', [1, 0, 6].every((p) => badge(new Date(2026, 9, 7), p) === 'Semaine 41'));
verifie('dimanche 4 octobre 2026 : 40 en semaine du lundi, 41 si la semaine commence le dimanche', badge(new Date(2026, 9, 4), 1) === 'Semaine 40' && badge(new Date(2026, 9, 4), 0) === 'Semaine 41');
verifie('samedi 3 octobre 2026 : 40 (lundi), 40 (dimanche, semaine du 27 au 3), 41 (samedi, semaine du 3 au 9)', badge(new Date(2026, 9, 3), 1) === 'Semaine 40' && badge(new Date(2026, 9, 3), 0) === 'Semaine 40' && badge(new Date(2026, 9, 3), 6) === 'Semaine 41');
verifie('1er janvier 2027 (vendredi) : semaine 53 avec les trois reglages', [1, 0, 6].every((p) => badge(new Date(2027, 0, 1), p) === 'Semaine 53'), [1, 0, 6].map((p) => badge(new Date(2027, 0, 1), p)).join(' '));
let toutes = '';
for (let k = 0; k < 400 && !toutes; k++) {
  const vd = ajoute(new Date(2026, 0, 1), k);
  const att = 'Semaine ' + refSemaineIso(ajoute(refDebutSemaine(vd, 1), 0));
  if (badge(vd, 1) !== att) toutes = iso(vd);
}
verifie('en semaine du lundi : le numero est celui d\'avant sur 400 jours', !toutes, toutes);

/* ---- Le reglage ---- */
titre('Le reglage');
delete stockage.tc_premier_jour_semaine;
verifie('sans reglage : Lundi', ctx.tcPremierJourSemaine() === 1 && ctx.tcNomPremierJour() === 'Lundi');
stockage.tc_premier_jour_semaine = 'abc';
verifie('valeur absurde : Lundi', ctx.tcPremierJourSemaine() === 1);
stockage.tc_premier_jour_semaine = '0';
verifie('« 0 » : Dimanche', ctx.tcPremierJourSemaine() === 0);
stockage.tc_premier_jour_semaine = '6';
verifie('« 6 » : Samedi', ctx.tcPremierJourSemaine() === 6);
els.settings_weekstart_label = element();
ctx._rendus = 0; ctx._syncs = 0;
ctx.applyPremierJourSemaine('0');
verifie('choisir Dimanche : enregistre « 0 », le libelle suit, l\'agenda se redessine, la synchro est demandee', stockage.tc_premier_jour_semaine === '0' && els.settings_weekstart_label.textContent === 'Dimanche' && ctx._rendus === 1 && ctx._syncs === 1, JSON.stringify([stockage.tc_premier_jour_semaine, els.settings_weekstart_label.textContent, ctx._rendus, ctx._syncs]));
ctx.applyPremierJourSemaine('6');
verifie('choisir Samedi', stockage.tc_premier_jour_semaine === '6' && els.settings_weekstart_label.textContent === 'Samedi');
ctx.applyPremierJourSemaine('xyz');
verifie('une valeur inconnue retombe sur Lundi', stockage.tc_premier_jour_semaine === '1' && els.settings_weekstart_label.textContent === 'Lundi');
verifie('le message dit le jour', toasts.some((m) => /commence le samedi/.test(m)), toasts.join(' | '));

/* ---- La page : ligne, fenetre, synchronisation ---- */
titre('La page');
const iPlage = page.indexOf("openSettingsModal('hours')");
const iLigne = page.indexOf("openSettingsModal('weekstart')");
verifie('la ligne « Premier jour de la semaine » vient juste apres « Plage horaire de ma journée »', iPlage > 0 && iLigne > iPlage && iLigne - iPlage < 900 && /Premier jour de la semaine<\/div>/.test(page.slice(iLigne, iLigne + 400)));
verifie('elle porte « Modifier › »', /Modifier ›/.test(page.slice(iLigne, iLigne + 700)));
verifie('la fenetre propose Lundi, Dimanche, Samedi', /else if \(type === 'weekstart'\)/.test(page) && /\{ val: '1', nom: 'Lundi'/.test(page) && /\{ val: '0', nom: 'Dimanche'/.test(page) && /\{ val: '6', nom: 'Samedi'/.test(page));
const exclus = (page.match(/const TC_SYNC_DEJA_SYNCHRONISE = \[[\s\S]*?\];/) || [''])[0];
verifie('la cle est un reglage ordinaire (pas dans la liste des exclusions : elle voyage entre appareils)', /tc_premier_jour_semaine/.test(page) && !/tc_premier_jour_semaine/.test(exclus));
verifie('la cle commence par « tc_ » (balayee par la synchro des reglages)', /'tc_premier_jour_semaine'/.test(page));

titre('Ce qui ne doit pas bouger');
verifie('« Mes disponibilités » : lettres et noms toujours du lundi au dimanche', /var JOURS_LABELS = \['L','M','M','J','V','S','D'\];/.test(page) && /var JOURS_FULL = \['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'\];/.test(page));
const dispos = page.slice(page.indexOf('var JOURS_LABELS'), page.indexOf('var JOURS_LABELS') + 6000);
verifie('« Mes disponibilités » ne lit pas le premier jour de la semaine', !/tcPremierJourSemaine|tcJoursEnOrdre|tcDecalageSemaine/.test(dispos));
verifie('le numero de semaine ISO (getISOWeek) est inchange : lundi = 0', /const dayNum = \(d\.getUTCDay\(\) \+ 6\) % 7; \/\/ lundi = 0/.test(page));
verifie('l\'assistant Charly garde sa semaine du lundi (« cette semaine »)', /const indexSemaineLundi = \(d\) => \(d\.getDay\(\) \+ 6\) % 7;/.test(page));
verifie('plus aucun decalage « lundi » en dur dans l\'agenda : la vue semaine, la grille et le panneau passent par le reglage',
  !/const wd = \(d0\.getDay\(\)\+6\)%7/.test(page) && !/let startOffset = \(firstDay\.getDay\(\) \+ 6\) % 7/.test(page) && !/debut\.setDate\(premier\.getDate\(\) - \(\(premier\.getDay\(\) \+ 6\) % 7\)\)/.test(page));

console.log('');
console.log(ko ? ko + ' anomalie(s).' : 'Tout est bon.');
process.exit(ko ? 1 : 0);
