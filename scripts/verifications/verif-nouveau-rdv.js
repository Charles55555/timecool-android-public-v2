// La fenetre « Nouveau » s'ouvre-t-elle sur le bon jour ?
//
// Elle proposait « 22/04/2026 », une date de demonstration ecrite en
// dur. Le piege, maintenant qu'elle est calculee : oublier de remettre
// a zero la periode et la case « journee entiere », qui se
// recopieraient alors d'un rendez-vous au suivant sans qu'on le voie.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

// Un faux morceau de page : juste les champs que la fonction touche.
function fauxDocument() {
  const champs = {
    newEvtTitle: { value: 'reste du precedent' },
    newEvtDesc: { value: 'reste aussi' },
    newEvtCalendar: { innerHTML: '' },
    newEvtDate: { value: '2026-04-22' },
    newEvtDateFin: { value: '2026-12-31' },
    newEvtAllDay: { checked: true },
    newEvtHeures: { style: { display: 'none' } },
    newEvtStart: { value: '14:00' },
    newEvtEnd: { value: '15:00' },
    createModal: { classList: { add() {}, remove() {} } }
  };
  return { getElementById: (id) => champs[id] || null, _champs: champs };
}

/**
 * @param {Date} jour     le jour affiche
 * @param {Date} [instant] l'heure qu'il est, pour ne pas dependre de
 *   l'horloge de la machine qui lance le controle.
 */
function ouvrir(jour, instant) {
  const doc = fauxDocument();
  const Horloge = instant
    ? new Proxy(Date, {
        construct: (cible, args) => (args.length ? new cible(...args) : new cible(instant.getTime()))
      })
    : Date;
  const ctx = {
    document: doc, Date: Horloge, console,
    viewDate: jour,
    customCalendars: [{ id: 'cal_default', name: 'Mon agenda' }],
    escapeHTMLSafe: (t) => t,
    fmt: (d) => d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0')
  };
  vm.createContext(ctx);
  ['tcMajJourneeEntiere', 'openCreateModal'].forEach((n) => {
    const src = extraire(n);
    if (src) vm.runInContext(src, ctx);
    else { ko++; console.log('  KO  ' + n + ' introuvable'); }
  });
  ctx.openCreateModal();
  return doc._champs;
}

const auj = new Date();
const fmt = (d) => d.getFullYear() + '-'
  + String(d.getMonth() + 1).padStart(2, '0') + '-'
  + String(d.getDate()).padStart(2, '0');

console.log('\n── Plus aucune date de demonstration ──');
verifie('le formulaire n en porte plus',
  page.indexOf('id="newEvtDate" value="2026-04-22"') === -1);

console.log('\n── En regardant aujourd hui ──');
{
  const dixHeures = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate(), 10, 12);
  const c = ouvrir(auj, dixHeures);
  verifie('la date proposee est celle du jour', c.newEvtDate.value === fmt(auj),
    c.newEvtDate.value);
  verifie('l heure proposee est ronde', /:00$/.test(c.newEvtStart.value),
    c.newEvtStart.value + ' → ' + c.newEvtEnd.value);
  verifie('et dure une heure',
    parseInt(c.newEvtEnd.value) - parseInt(c.newEvtStart.value) === 1,
    c.newEvtStart.value + ' → ' + c.newEvtEnd.value);
}

console.log('\n── Tard le soir ──');
{
  const presqueMinuit = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate(), 23, 10);
  const c = ouvrir(auj, presqueMinuit);
  verifie('le rendez-vous ne deborde pas sur le lendemain',
    c.newEvtEnd.value <= '23:59',
    c.newEvtStart.value + ' → ' + c.newEvtEnd.value);
  verifie('et la fin reste apres le debut',
    c.newEvtEnd.value > c.newEvtStart.value,
    c.newEvtStart.value + ' → ' + c.newEvtEnd.value);
}

console.log('\n── En regardant un autre jour ──');
{
  const novembre = new Date(2026, 10, 14);
  const c = ouvrir(novembre);
  verifie('c est ce jour-la qui est propose', c.newEvtDate.value === '2026-11-14',
    c.newEvtDate.value);
  verifie('et la journee commence a 9h', c.newEvtStart.value === '09:00',
    c.newEvtStart.value);
}

console.log('\n── Rien ne reste du rendez-vous precedent ──');
{
  const c = ouvrir(auj);
  verifie('le titre est vide', c.newEvtTitle.value === '');
  verifie('la note aussi', c.newEvtDesc.value === '');
  verifie('la periode est effacee', c.newEvtDateFin.value === '',
    'sinon elle se recopierait en silence');
  verifie('la journee entiere est decochee', c.newEvtAllDay.checked === false);
  verifie('et les heures redeviennent visibles',
    c.newEvtHeures.style.display === 'flex',
    'elles avaient ete masquees par la journee entiere precedente');
}

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
