// Verifie la page Taches : validation du formulaire, tri, modification,
// et report dans l'agenda uniquement quand cela a un sens.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const stock = {};
let dernierHTML = '';
let cree = [];
const faux = () => {
  const el = {
    style: {}, className: '', textContent: '', value: '', type: '', placeholder: '',
    children: [], appendChild(c) { this.children.push(c); }, focus() {}, click() {},
    classList: { add() {}, remove() {} },
    set innerHTML(v) { dernierHTML = v; }, get innerHTML() { return dernierHTML; },
  };
  cree.push(el);
  return el;
};
const ctx = {
  Date, Math, JSON, Object, Array, String, Number, parseInt, isNaN, Promise, console,
  setTimeout: (f) => f(), requestAnimationFrame: (f) => f(),
  localStorage: {
    getItem: (k) => (k in stock ? stock[k] : null),
    setItem: (k, v) => { stock[k] = String(v); },
  },
  document: {
    getElementById: () => faux(), createElement: () => faux(), body: faux(),
    addEventListener() {}, removeEventListener() {},
  },
  escapeHTMLSafe: (x) => String(x),
  showToast: () => {},
  saveTasks: () => {},
  saveBirthdays: () => {},
  tcConfirm: async () => true,
  currentPage: 'tasks',
  tasksList: [],
  birthdays: [],
  tcFetesDuJour: () => [],
  tcTradition: (t) => ({ couleur: '#000', fond: '#fff', label: t }),
};
ctx.globalThis = ctx;
vm.createContext(ctx);

const D = html.indexOf('/* Tri de la liste, retenu d un passage a l autre.');
const F = html.indexOf('// ═══ RECHERCHE v4.1');
vm.runInContext(html.slice(D, F), ctx);
vm.runInContext(html.slice(html.indexOf('function tcReperesDuJour('),
  html.indexOf('function renderDay() {')), ctx);

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ko && !ok) {} // rien : le compteur suffit
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(44)} ${detail || ''}`);
};

/**
 * Ouvre une boite, remplit ses champs, valide. `ouvrir` recoit la
 * promesse ; on rend aussi le message d'erreur affiche, s'il y en a un.
 */
function saisir(ouvrir, { titre, note, date }) {
  cree = [];
  const p = ouvrir();
  const champs = cree.filter((e) => e.className === 'tc-mod-in');
  const [cTitre, cNote, cDate] = champs;
  cTitre.value = titre; cNote.value = note || ''; cDate.value = date || '';
  const err = cree.find((e) => e.style.cssText && e.style.cssText.includes('#ea4335'));
  cree.find((e) => e.className === 'tc-mod-ok').onclick();
  return { p, refus: err.style.display === 'block' ? err.textContent : null };
}
const nouvelle = (v) => saisir(() => ctx.ouvrirFormulaireTache(null), v);

(async () => {
  console.log('Le formulaire refuse ce qui est inexploitable :');
  dire(nouvelle({ titre: '   ' }).refus, 'titre vide',
    nouvelle({ titre: '' }).refus);
  dire(nouvelle({ titre: 'Pain', date: '12/09/2026' }).refus, 'format JJ/MM/AAAA',
    nouvelle({ titre: 'Pain', date: '12/09/2026' }).refus);
  dire(nouvelle({ titre: 'Pain', date: '2026-02-31' }).refus, '31 février',
    nouvelle({ titre: 'Pain', date: '2026-02-31' }).refus);
  dire(nouvelle({ titre: 'Pain', date: '2026-13-01' }).refus, '13e mois');

  console.log('\nEt accepte le reste :');
  const sansDate = nouvelle({ titre: '  Acheter du pain  ', note: '  chez Paul  ' });
  dire(!sansDate.refus, 'sans échéance');
  const avecDate = nouvelle({ titre: 'Appeler le médecin', date: '2026-09-20' });
  dire(!avecDate.refus, 'avec échéance');
  const v = await sansDate.p;
  dire(v.titre === 'Acheter du pain' && v.note === 'chez Paul' && v.echeance === null,
    'espaces retirés, échéance nulle', JSON.stringify(v));
  dire((await avecDate.p).echeance === '2026-09-20', 'échéance rendue telle quelle');

  // ── Tri ───────────────────────────────────────────────────────────
  ctx.tasksList = [
    { id: 't1', title: 'Zoo', dueDate: '2026-09-05', done: false, notes: '', agenda: false },
    { id: 't2', title: 'Avion', dueDate: '2026-12-01', done: false, notes: '', agenda: false },
    { id: 't3', title: 'Manger', dueDate: null, done: false, notes: '', agenda: false },
    { id: 't4', title: 'Aaa terminée', dueDate: '2026-09-01', done: true, notes: '', agenda: false },
  ];
  const titres = () => (dernierHTML.match(/Zoo|Avion|Manger|Aaa terminée/g) || []);

  console.log('\nTri par échéance :');
  ctx.tcDefinirTriTaches('date');
  dire(JSON.stringify(titres()) === JSON.stringify(['Zoo', 'Avion', 'Manger', 'Aaa terminée']),
    'datées, puis sans date, puis terminées', titres().join(' < '));

  console.log('\nTri alphabétique :');
  ctx.tcDefinirTriTaches('alpha');
  dire(JSON.stringify(titres()) === JSON.stringify(['Avion', 'Manger', 'Zoo', 'Aaa terminée']),
    'A→Z, la terminée reste en dernier', titres().join(' < '));
  dire(stock.tc_tri_taches === 'alpha', 'choix retenu', stock.tc_tri_taches);

  // ── Agenda ────────────────────────────────────────────────────────
  console.log('\nDans l agenda, seulement quand cela a un sens :');
  dire(ctx.tcReperesDuJour('2026-09-05').length === 0, 'rien tant que rien n est ajouté');
  ctx.tcBasculerTacheAgenda('t1');
  const r = ctx.tcReperesDuJour('2026-09-05');
  dire(r.length === 1 && r[0].nom === 'Zoo', 'Zoo apparaît le 5 septembre',
    r.map((x) => x.nom).join(', '));
  dire(ctx.tcReperesDuJour('2026-09-06').length === 0, 'et nulle part ailleurs');

  ctx.tcBasculerTacheAgenda('t3');
  dire(!ctx.tasksList[2].agenda, 'une tâche sans échéance est refusée',
    'aucun jour où l afficher');

  ctx.toggleTask('t1');
  dire(ctx.tcReperesDuJour('2026-09-05').length === 0, 'une tâche cochée quitte l agenda');
  ctx.toggleTask('t1');
  dire(ctx.tcReperesDuJour('2026-09-05').length === 1, 'et revient si on la décoche');

  // ── Modification ──────────────────────────────────────────────────
  console.log('\nModification :');
  cree = [];
  const pEdit = ctx.editTask('t1');
  const champs = cree.filter((e) => e.className === 'tc-mod-in');
  dire(champs[0].value === 'Zoo' && champs[2].value === '2026-09-05',
    'les champs partent de l existant', champs[0].value + ' / ' + champs[2].value);
  champs[0].value = 'Zoo rénové';
  champs[2].value = '2026-10-08';
  cree.find((e) => e.className === 'tc-mod-ok').onclick();
  await pEdit;
  dire(ctx.tasksList[0].title === 'Zoo rénové', 'titre modifié', ctx.tasksList[0].title);
  dire(ctx.tcReperesDuJour('2026-09-05').length === 0
    && ctx.tcReperesDuJour('2026-10-08').length === 1, 'l agenda suit la nouvelle date');

  cree = [];
  const pVide = ctx.editTask('t1');
  cree.filter((e) => e.className === 'tc-mod-in')[2].value = '';
  cree.find((e) => e.className === 'tc-mod-ok').onclick();
  await pVide;
  dire(!ctx.tasksList[0].agenda && ctx.tcReperesDuJour('2026-10-08').length === 0,
    'échéance effacée : la tâche quitte l agenda');

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
