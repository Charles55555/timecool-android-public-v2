// Verifie la page Anniversaires : validation du formulaire, tri,
// abonnement a l'agenda, et report du bon jour dans les vues.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

// ── Contexte minimal : ni DOM ni navigateur, seulement ce que le code
//    touche reellement.
const stock = {};
let dernierHTML = '';
const faux = () => {
  const el = {
    style: {}, className: '', textContent: '', value: '', type: '', placeholder: '',
    children: [], appendChild(c) { this.children.push(c); }, focus() {}, click() {},
    classList: { add() {}, remove() {} },
    set innerHTML(v) { dernierHTML = v; }, get innerHTML() { return dernierHTML; },
  };
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
    getElementById: () => faux(),
    createElement: () => faux(),
    body: faux(),
    addEventListener() {}, removeEventListener() {},
  },
  Option: function (t, v) { return { text: t, value: v }; },
  escapeHTMLSafe: (x) => String(x),
  showToast: () => {},
  saveBirthdays: () => {},
  tcConfirm: async () => true,
  currentPage: 'birthdays',
  birthdays: [],
  tasksList: [],
  // Cote fetes : neutralise, on ne teste ici que les anniversaires.
  tcFetesDuJour: () => [],
  tcTradition: (t) => ({ couleur: '#000', fond: '#fff', label: t }),
};
ctx.globalThis = ctx;
vm.createContext(ctx);

// Le module Anniversaires, tel qu'il est dans la page.
const D = html.indexOf('/* Tri de la liste.');
const F = html.indexOf('// ═══ JOURS FÉRIÉS ═══');
vm.runInContext(html.slice(D, F), ctx);

// tcReperesDuJour, qui vit avec les vues.
const D2 = html.indexOf('function tcReperesDuJour(');
const F2 = html.indexOf('function renderDay() {');
vm.runInContext(html.slice(D2, F2), ctx);

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(44)} ${detail || ''}`);
};

// ── Le formulaire ───────────────────────────────────────────────────
// On ouvre la boite, on remplit les champs recuperes a la volee, on
// clique. Les elements sont ceux crees par le code lui-meme.
function remplir({ prenom, nom, jour, mois, annee }) {
  const cree = [];
  ctx.document.createElement = () => { const e = faux(); cree.push(e); return e; };
  const p = ctx.ouvrirFormulaireAnniversaire();
  const champs = cree.filter((e) => 'value' in e && e.className === 'tc-mod-in');
  const boutons = cree.filter((e) => e.className === 'tc-mod-ok' || e.className === 'tc-mod-no');
  const [cPrenom, cNom, cJour, cMois, cAnnee] = champs;
  cPrenom.value = prenom; cNom.value = nom;
  cJour.value = String(jour); cMois.value = String(mois);
  cAnnee.value = annee === null ? '' : String(annee);
  const err = cree.find((e) => e.style.cssText && e.style.cssText.includes('#ea4335'));
  boutons.find((b) => b.className === 'tc-mod-ok').onclick();
  return { p, refus: err.style.display === 'block' ? err.textContent : null };
}

console.log('Le formulaire refuse ce qui ne peut pas exister :');
dire(remplir({ prenom: '', nom: 'Dupont', jour: 12, mois: 9, annee: null }).refus,
  'prenom vide', remplir({ prenom: '', nom: '', jour: 12, mois: 9, annee: null }).refus);
dire(remplir({ prenom: 'Marie', nom: '', jour: '', mois: '', annee: null }).refus,
  'jour et mois non choisis');
dire(remplir({ prenom: 'Marie', nom: '', jour: 31, mois: 2, annee: null }).refus,
  '31 fevrier', remplir({ prenom: 'M', nom: '', jour: 31, mois: 2, annee: null }).refus);
dire(remplir({ prenom: 'Marie', nom: '', jour: 31, mois: 4, annee: null }).refus, '31 avril');
dire(remplir({ prenom: 'Marie', nom: '', jour: 29, mois: 2, annee: 1999 }).refus,
  '29 fevrier 1999, annee non bissextile');
dire(remplir({ prenom: 'Marie', nom: '', jour: 1, mois: 1, annee: 1850 }).refus, 'annee 1850');

console.log('\nEt accepte ce qui est valide :');
const okSansAnnee = remplir({ prenom: 'Marie', nom: 'Dupont', jour: 12, mois: 9, annee: null });
dire(!okSansAnnee.refus, 'annee omise');
dire(!remplir({ prenom: 'Léa', nom: '', jour: 29, mois: 2, annee: 2000 }).refus,
  '29 fevrier 2000, annee bissextile');
dire(!remplir({ prenom: 'Jean', nom: 'Martin', jour: 3, mois: 3, annee: 1990 }).refus,
  'date complete');

Promise.resolve(okSansAnnee.p).then((v) => {
  dire(v && v.prenom === 'Marie' && v.nom === 'Dupont' && v.jour === 12
    && v.mois === 9 && v.annee === null, 'valeurs rendues',
    v ? JSON.stringify(v) : 'aucune');

  // ── Le tri ────────────────────────────────────────────────────────
  // Les dates sont choisies pour que l'ordre chronologique et l'ordre
  // alphabetique different : sinon le test passerait sans rien prouver.
  // Le classement A→Z porte sur le nom affiche, « Prénom Nom », qui est
  // ce que l'utilisateur a sous les yeux.
  const auj = new Date();
  const dans = (n) => {
    const d = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + n);
    return `2000-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  ctx.birthdays = [
    { id: 'b1', name: 'Zoé Aaron', date: dans(5), year: 1990, agenda: false },
    { id: 'b2', name: 'Ana Bernard', date: dans(300), year: null, agenda: false },
    { id: 'b3', name: 'marc Colin', date: dans(40), year: 1980, agenda: false },
  ];

  const noms = () => (dernierHTML.match(/Zoé Aaron|Ana Bernard|marc Colin/g) || []);
  console.log('\nTri par date — la prochaine echeance en premier :');
  ctx.tcDefinirTriAnniversaires('date');
  dire(JSON.stringify(noms()) === JSON.stringify(['Zoé Aaron', 'marc Colin', 'Ana Bernard']),
    'ordre chronologique', noms().join(' < '));

  console.log('\nTri alphabetique — casse et accents ignores :');
  ctx.tcDefinirTriAnniversaires('alpha');
  dire(JSON.stringify(noms()) === JSON.stringify(['Ana Bernard', 'marc Colin', 'Zoé Aaron']),
    'ordre alphabetique', noms().join(' < '));
  dire(stock.tc_tri_anniversaires === 'alpha', 'choix retenu', stock.tc_tri_anniversaires);

  // ── L'agenda ──────────────────────────────────────────────────────
  console.log('\nAjout a l agenda, personne par personne :');
  const jour = (d) => `${auj.getFullYear()}-${d.slice(5)}`;
  dire(ctx.tcReperesDuJour(jour(ctx.birthdays[1].date)).length === 0,
    'rien tant que personne n est ajoute');
  ctx.tcBasculerAnniversaireAgenda('b2');
  const r = ctx.tcReperesDuJour(jour(ctx.birthdays[1].date));
  dire(r.length === 1 && r[0].nom === 'Ana Bernard', 'Ana apparait le bon jour',
    r.map((x) => x.nom).join(', '));
  dire(ctx.tcReperesDuJour(jour(ctx.birthdays[0].date)).length === 0,
    'Zoe reste absente', 'non ajoutee');
  dire(ctx.tcReperesDuJour(jour(ctx.birthdays[1].date).replace(/-\d\d$/, '-01')).length
    <= 1, 'aucun report sur un autre jour');

  console.log('\nL age affiche est celui du jour J :');
  ctx.tcBasculerAnniversaireAgenda('b1');
  const zoe = ctx.tcReperesDuJour(`2030-${ctx.birthdays[0].date.slice(5)}`)[0];
  dire(zoe && zoe.nom === 'Zoé Aaron (40 ans)', 'Zoe, nee en 1990, aura 40 ans en 2030',
    zoe ? zoe.nom : 'absente');
  const ana = ctx.tcReperesDuJour(`2030-${ctx.birthdays[1].date.slice(5)}`)[0];
  dire(ana && ana.nom === 'Ana Bernard', 'sans annee de naissance, aucun age',
    ana ? ana.nom : 'absente');

  console.log('\nRetrait :');
  ctx.tcBasculerAnniversaireAgenda('b2');
  dire(ctx.tcReperesDuJour(jour(ctx.birthdays[1].date)).length === 0, 'Ana disparait');

  // ── Modification ──────────────────────────────────────────────────
  // Une fiche ancienne ne porte qu'un nom complet, sans prenom ni nom
  // separes : c'est justement le formulaire qui permet de la reprendre.
  console.log('\nModification d une fiche ancienne :');
  ctx.birthdays = [{ id: 'b9', name: 'Jean Martin', date: '1975-04-07', year: 1975, agenda: true }];
  const champs = [];
  ctx.document.createElement = () => { const e = faux(); champs.push(e); return e; };
  const pEdit = ctx.editBirthday('b9');
  const c = champs.filter((e) => e.className === 'tc-mod-in');
  dire(c[0].value === 'Jean Martin' && c[2].value === '7' && c[3].value === '4'
    && c[4].value === '1975', 'champs pre-remplis',
    [c[0].value, c[1].value, c[2].value, c[3].value, c[4].value].join(' | '));
  c[0].value = 'Jean'; c[1].value = 'Martin';
  c[2].value = '8'; c[3].value = '4'; c[4].value = '1975';
  champs.find((e) => e.className === 'tc-mod-ok').onclick();
  Promise.resolve(pEdit).then(() => {
    const b = ctx.birthdays[0];
    dire(b.prenom === 'Jean' && b.nomFamille === 'Martin' && b.name === 'Jean Martin',
      'prenom et nom enfin separes', b.prenom + ' / ' + b.nomFamille);
    dire(b.date === '1975-04-08', 'date corrigee', b.date);
    dire(b.agenda === true, 'l abonnement a l agenda est conserve');
    dire(ctx.tcReperesDuJour('2026-04-08').length === 1
      && ctx.tcReperesDuJour('2026-04-07').length === 0,
      'l agenda suit la nouvelle date');

    console.log(`\n${ko} anomalie(s).`);
    process.exit(ko ? 1 : 0);
  });
});
