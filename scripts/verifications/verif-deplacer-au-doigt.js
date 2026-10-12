// Deplacer un rendez-vous au doigt (vue Jour et vue Semaine), comme dans Google Agenda.
// Appui long, glissement aimante sur 15 minutes et de jour en jour, relachement :
// deplace avec « Annuler » ; un rendez-vous pris avec un autre compte TimeCool
// ouvre « Je decale » au lieu de bouger. Meme geste a la souris.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* ---- Un petit navigateur de poche ---- */
const registre = {};
function element(id) {
  const e = { id: id || '', children: [], style: {}, _html: '', _classes: new Set(), className: '', textContent: '', offsetWidth: 80,
    isConnected: true, parentNode: null, ecouteurs: {}, captures: 0 };
  e.classList = {
    add: (c) => e._classes.add(c), remove: (c) => e._classes.delete(c),
    contains: (c) => e._classes.has(c) || e.className.split(/\s+/).includes(c),
  };
  Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; e.children = []; } });
  e.appendChild = (c) => { e.children.push(c); c.parentNode = e; if (c.id) registre[c.id] = c; return c; };
  e.removeChild = (c) => { e.children = e.children.filter((x) => x !== c); if (c.id && registre[c.id] === c) delete registre[c.id]; c.parentNode = null; };
  e.addEventListener = (t, f) => { (e.ecouteurs[t] = e.ecouteurs[t] || []).push(f); };
  e.removeEventListener = (t, f) => { e.ecouteurs[t] = (e.ecouteurs[t] || []).filter((x) => x !== f); };
  e.setPointerCapture = () => { e.captures++; };
  e.getBoundingClientRect = () => ({ left: 100, top: 200, width: 40, height: 40 });
  return e;
}
const doc = element('document');
doc.body = element('body');
doc.createElement = () => element();
doc.getElementById = (id) => registre[id] || null;
function declenche(cible, type, ev) { (cible.ecouteurs[type] || []).slice().forEach((f) => f(ev)); }
function ecouteursDocument() { return ['pointermove', 'pointerup', 'pointercancel'].map((t) => (doc.ecouteurs[t] || []).length).join('/'); }

/* ---- Des minuteries qu'on avance a la main ---- */
let horloge = 0, noMinuteur = 0, minuteurs = [];
const faux = {
  setTimeout: (fn, ms) => { const id = ++noMinuteur; minuteurs.push({ id, fn, a: horloge + ms }); return id; },
  clearTimeout: (id) => { minuteurs = minuteurs.filter((m) => m.id !== id); },
};
function avance(ms) {
  horloge += ms;
  minuteurs.filter((m) => m.a <= horloge).sort((a, b) => a.a - b.a).forEach((m) => { minuteurs = minuteurs.filter((x) => x.id !== m.id); m.fn(); });
}

const jaune = { sauvegardes: 0, rendus: 0, toasts: [], envois: [], editions: 0, confirmations: [] };
const ctx = {
  String, Number, Math, Date, Array, Set, JSON, parseInt, console, Promise,
  setTimeout: faux.setTimeout, clearTimeout: faux.clearTimeout,
  document: doc, window: { innerWidth: 390 }, navigator: {},
  currentPage: 'calendar', mode: 'user', events: [], contactsList: [],
  agendaStartH: 8, agendaEndH: 19, currentLanguage: 'fr',
  saveEventsToStorage: () => { jaune.sauvegardes++; }, render: () => { jaune.rendus++; },
  showToast: (m) => jaune.toasts.push(m),
  requestAnimationFrame: (f) => f(),
  tcReperesDuJour: () => [], tcEvenementsDuJour: () => [], tcAppliquerCouleurEvenement: () => {},
  tcIconeType: () => '', tcHorairePlage: () => '', tcBandeauRepere: () => element(), isCategoryVisible: () => true,
  tcTirerCacher: () => { jaune.tirerCache = (jaune.tirerCache || 0) + 1; },
  _tirerDepart: { x: 1, y: 1 }, _swipeActive: true,
  tcConfirm: async (m) => { jaune.confirmations.push(m); return ctx._reponseConfirm !== false; },
  _reponseConfirm: true,
  tcTransmettrePrevenance: async (contact, texte) => { jaune.envois.push({ contact, texte }); return 'timecool'; },
  tcDirePrevenance: () => {}, _closeAllSheets: () => {},
  tcVouvoiement: () => false,
  openEditEventModal: () => {
    jaune.editions++;
    ['editDate', 'editStartH', 'editEndH'].forEach((i) => { registre[i] = element(i); registre[i].value = ''; });
  },
  today: new Date(2026, 9, 7), viewDate: new Date(2026, 9, 7),
};
ctx.jaune = jaune;
vm.createContext(ctx);

/* Le modele « Je decale » de la page, tel quel. */
const modeleDecale = (page.match(/decale: \{[\s\S]*?tu: "([^"]+)"/) || [])[1];
ctx.tcModeleMessage = () => modeleDecale;
verifie('le modele « Je decale » de la page est trouve et finit par « proposer : »', !!modeleDecale && /proposer :$/.test(modeleDecale), modeleDecale);

const debutBloc = page.indexOf('const TC_DEPLACER_PAS');
const finBloc = page.indexOf('let _tcCliqueIgnoreJusqua = 0;');
verifie('le bloc de constantes du deplacement est trouve', debutBloc > 0 && finBloc > debutBloc);
vm.runInContext('var _prevenirContact = null, _prevenirName = "", _prevenirEventRef = null, _prevenirCible = null, currentEvent = null;', ctx);
vm.runInContext(page.slice(debutBloc, finBloc + 'let _tcCliqueIgnoreJusqua = 0;'.length), ctx);

const noms = ['fmt', 'sameDay', 'isProClosed', 'escapeHTMLSafe', 'tcEvenementFin', 'tcEvenementSurPlusieursJours', 'tcEstBandeau', 'tcContactDuRdv',
  'tcRemplirModele', 'tcValeursDuRdv', 'tcRdvAvecAutreCompte', 'tcRdvDeplacable', 'tcCibleDeplacement', 'tcMemeCreneau', 'tcLibelleCreneau',
  'tcEcrireDeplacementDoigt', 'tcMontrerDeplacement', 'tcCacherBarreDeplacement', 'tcAnnulerDeplacement', 'tcTerminerDeplacement',
  'tcDecalerVers', 'tcPreRemplirCreneau', 'tcRendreDeplacable', 'tcDeplacerDebut', 'tcDeplacerNettoyer', 'tcDeplacerSoulever',
  'tcDeplacerBouge', 'tcDeplacerLacher', 'tcDeplacerAbandon', 'tcDeplacerEtiquette', 'tcAvalerCliqueApresDeplacement', 'prevenirDecaler',
  'tcPremierJourSemaine', 'tcDecalageSemaine', 'tcDayShort', 'tcHauteurBloc', 'tcLignesBandeSemaine', 'renderWeek', 'renderDay'];
vm.runInContext('var TC_BLOC_HAUTEUR_HEURE = 42;', ctx);
noms.forEach((n) => {
  const src = extraire(n);
  if (!src) { ko++; console.log('  KO  fonction introuvable : ' + n); return; }
  try { vm.runInContext(src, ctx); } catch (e) { ko++; console.log('  KO  chargement de ' + n + ' : ' + e.message); }
});
['DAYS_SHORT', 'DAYS_FULL', 'MONTHS'].forEach((c) => {
  const m = page.match(new RegExp('const ' + c + ' = [\\s\\S]*?;\\n'));
  if (m) vm.runInContext(m[0].replace(/^const /, 'var '), ctx); else { ko++; console.log('  KO  constante introuvable : ' + c); }
});
if (ko) { console.log(''); console.log(ko + ' anomalie(s) au chargement.'); process.exit(1); }
ctx.localStorage = { getItem: () => null };

const lire = (expr) => vm.runInContext(expr, ctx);
const ev = (id, date, h1, m1, h2, m2, plus) => Object.assign({ id, title: 'ASSURANCES', date, startH: h1, startM: m1, endH: h2, endM: m2, mode: 'user', cat: 'travail' }, plus || {});
const sem = { vue: 'week', pxParMin: 44 / 60, colWidth: 48, di: 3 };
const jour = { vue: 'day', pxParMin: 48 / 60, colWidth: 0, di: 0 };
const px = (minutes, geo) => minutes * geo.pxParMin;

/* ---- L'aimantation et le calcul du jour et de l'heure ---- */
titre('Le calcul : pas de 15 minutes, jour par jour');
const e1 = ev('a1', '2026-10-08', 11, 0, 12, 0);   // jeudi 8 octobre, 11h-12h
const c0 = ctx.tcCibleDeplacement(e1, 0, 0, sem);
verifie('sans glisser : meme creneau', c0.date === '2026-10-08' && c0.startH === 11 && c0.startM === 0 && c0.endH === 12 && c0.endM === 0 && c0.jours === 0 && c0.minutes === 0);
const c75 = ctx.tcCibleDeplacement(e1, 0, px(75, sem), sem);
verifie('glisser de 75 minutes : 12h15 – 13h15, meme duree', c75.startH === 12 && c75.startM === 15 && c75.endH === 13 && c75.endM === 15 && c75.minutes === 75, JSON.stringify(c75));
const cj = ctx.tcCibleDeplacement(e1, 48, 0, sem);
verifie('glisser d\'une colonne a droite : vendredi 9, meme heure', cj.date === '2026-10-09' && cj.startH === 11 && cj.jours === 1);
const cjm = ctx.tcCibleDeplacement(e1, -48 * 3, 0, sem);
verifie('trois colonnes a gauche : lundi 5', cjm.date === '2026-10-05' && cjm.jours === -3);
const cjh = ctx.tcCibleDeplacement(e1, 48, px(75, sem), sem);
verifie('un jour ET 75 minutes ensemble : vendredi 9 octobre, 12h15 (le geste de la video)', cjh.date === '2026-10-09' && cjh.startH === 12 && cjh.startM === 15);
const pas = [];
for (let m = -60; m <= 60; m += 1) { const c = ctx.tcCibleDeplacement(e1, 0, px(m, sem), sem); if (c.minutes % 15 !== 0) pas.push(m); }
verifie('toutes les positions du doigt (-60 a +60 minutes) tombent sur un multiple de 15 minutes', pas.length === 0, pas.slice(0, 5).join(','));
verifie('7 minutes : on reste ; 8 minutes : on passe au pas suivant', ctx.tcCibleDeplacement(e1, 0, px(7, sem), sem).minutes === 0 && ctx.tcCibleDeplacement(e1, 0, px(8, sem), sem).minutes === 15);
verifie('un quart de colonne : on reste dans le jour ; plus de la moitie : on change', ctx.tcCibleDeplacement(e1, 11, 0, sem).jours === 0 && ctx.tcCibleDeplacement(e1, 25, 0, sem).jours === 1);
verifie('la semaine affichee est une limite : colonne 0 → pas plus a gauche, colonne 6 → pas plus a droite',
  ctx.tcCibleDeplacement(e1, -9999, 0, { ...sem, di: 0 }).jours === 0 && ctx.tcCibleDeplacement(e1, 9999, 0, { ...sem, di: 6 }).jours === 0
  && ctx.tcCibleDeplacement(e1, 9999, 0, sem).jours === 3 && ctx.tcCibleDeplacement(e1, -9999, 0, sem).jours === -3);
verifie('vue Jour : jamais de changement de jour, meme en glissant de cote', ctx.tcCibleDeplacement(e1, 500, px(30, jour), jour).jours === 0 && ctx.tcCibleDeplacement(e1, 500, px(30, jour), jour).startM === 30);
const tard = ev('a2', '2026-10-08', 23, 0, 23, 45);
const ct = ctx.tcCibleDeplacement(tard, 0, 9999, sem);
verifie('en bas de la journee : il s\'arrete avant minuit, duree gardee', ct.endH === 23 && ct.endM === 59 && (ct.endH * 60 + ct.endM) - (ct.startH * 60 + ct.startM) === 45, JSON.stringify(ct));
const tot = ev('a3', '2026-10-08', 0, 30, 1, 30);
const cto = ctx.tcCibleDeplacement(tot, 0, -9999, sem);
verifie('en haut de la journee : il s\'arrete a 0h00', cto.startH === 0 && cto.startM === 0 && cto.endH === 1 && cto.endM === 0, JSON.stringify(cto));
const fm = ev('a4', '2026-10-31', 10, 0, 11, 0);
verifie('fin de mois : le 31 octobre + 1 jour = 1er novembre', ctx.tcCibleDeplacement(fm, 48, 0, { ...sem, di: 5 }).date === '2026-11-01');
const fa = ev('a5', '2026-12-31', 10, 0, 11, 0);
verifie('fin d\'annee : le 31 decembre + 1 jour = 1er janvier 2027', ctx.tcCibleDeplacement(fa, 48, 0, { ...sem, di: 3 }).date === '2027-01-01');
const hd = ev('a6', '2026-03-28', 10, 0, 11, 0);
verifie('changement d\'heure (28 → 29 mars 2026) : le jour suivant est bien le 29', ctx.tcCibleDeplacement(hd, 48, 0, { ...sem, di: 5 }).date === '2026-03-29');
verifie('le libelle : « vendredi 9 octobre, 12h15 »', ctx.tcLibelleCreneau(cjh) === 'vendredi 9 octobre, 12h15', ctx.tcLibelleCreneau(cjh));
verifie('et pour le message : « vendredi 9 octobre à 12h15 »', ctx.tcLibelleCreneau(cjh, ' à ') === 'vendredi 9 octobre à 12h15');

titre('Qui peut bouger');
verifie('un rendez-vous du vrai agenda se deplace', ctx.tcRdvDeplacable(ev('b1', '2026-10-08', 9, 0, 10, 0)) === true);
verifie('une journee entiere : non', ctx.tcRdvDeplacable(ev('b2', '2026-10-08', 0, 0, 23, 59, { allDay: true })) === false);
verifie('une periode sur plusieurs jours : non', ctx.tcRdvDeplacable(ev('b3', '2026-10-08', 9, 0, 10, 0, { dateFin: '2026-10-10' })) === false);
verifie('un rendez-vous de demonstration (mode pro) : non', ctx.tcRdvDeplacable(ev('b4', '2026-10-08', 9, 0, 10, 0, { mode: 'pro' })) === false);
verifie('un rendez-vous de Charly se deplace', ctx.tcRdvDeplacable(ev('charly_ai_7', '2026-10-08', 9, 0, 10, 0, { mode: 'pro' })) === true);
verifie('« tc_rdv_42 » et « tc_grp_x » sont pris avec un autre compte ; un rendez-vous local, non',
  ctx.tcRdvAvecAutreCompte({ id: 'tc_rdv_42' }) && ctx.tcRdvAvecAutreCompte({ id: 'tc_grp_ab12' }) && !ctx.tcRdvAvecAutreCompte({ id: 'ev_17' }) && !ctx.tcRdvAvecAutreCompte({ id: undefined }) && !ctx.tcRdvAvecAutreCompte(null));

/* ---- Relacher : deplace, rien, ou « Je decale » ---- */
titre('Relacher : deplace avec « Annuler », ou rien');
function remet() { jaune.sauvegardes = 0; jaune.rendus = 0; jaune.toasts = []; jaune.envois = []; jaune.editions = 0; jaune.confirmations = []; ctx.events = []; ctx.contactsList = []; }
remet();
const local = ev('l1', '2026-10-08', 11, 0, 12, 0);
ctx.events = [local];
verifie('meme creneau : rien (ni sauvegarde ni message)', ctx.tcTerminerDeplacement(local, c0) === 'rien' && jaune.sauvegardes === 0 && !registre.tcDeplaceBarre);
const res = ctx.tcTerminerDeplacement(local, cjh);
verifie('autre creneau : « deplace »', res === 'deplace');
verifie('le rendez-vous a son nouvel horaire, meme duree', local.date === '2026-10-09' && local.startH === 12 && local.startM === 15 && local.endH === 13 && local.endM === 15, JSON.stringify(local));
verifie('il est sauvegarde une fois (la synchro, Google compris, suit) et l\'agenda redessine', jaune.sauvegardes === 1 && jaune.rendus === 1);
const barre = registre.tcDeplaceBarre;
verifie('le message : « Déplacé vers vendredi 9 octobre, 12h15 » avec le bouton Annuler', !!barre && /Déplacé vers vendredi 9 octobre, 12h15/.test(barre.innerHTML) && /Annuler/.test(barre.innerHTML) && /onclick="tcAnnulerDeplacement\(\)"/.test(barre.innerHTML) && barre.classList.contains('show'), barre && barre.innerHTML);
avance(5000);
verifie('il reste affiche quelques secondes (5 s)', barre.classList.contains('show'));
avance(1500);
verifie('puis il disparait seul (6 s)', !barre.classList.contains('show'));
// Annuler
remet(); ctx.events = [local];
const ancienne = { ...local };
ctx.tcTerminerDeplacement(local, ctx.tcCibleDeplacement(local, 0, px(30, sem), sem));
verifie('deuxieme deplacement : 12h45', local.startH === 12 && local.startM === 45);
const avant = jaune.sauvegardes;
verifie('« Annuler » remet l\'ancien horaire', ctx.tcAnnulerDeplacement() === true && local.date === ancienne.date && local.startH === 12 && local.startM === 15 && local.endH === 13 && local.endM === 15, JSON.stringify(local));
verifie('et le sauvegarde (donc la synchro et Google aussi)', jaune.sauvegardes === avant + 1);
verifie('un second « Annuler » ne fait rien', ctx.tcAnnulerDeplacement() === false && local.startM === 15);
// Annuler complet : revenir au tout premier horaire
remet(); ctx.events = [local];
const origine = { date: local.date, startH: local.startH, startM: local.startM, endH: local.endH, endM: local.endM };
ctx.tcTerminerDeplacement(local, ctx.tcCibleDeplacement(local, 48 * 2, px(-135, sem), sem));
verifie('deplacement de 2 jours et -135 min', local.date === '2026-10-11' && local.startH === 10 && local.startM === 0, JSON.stringify(local));
ctx.tcAnnulerDeplacement();
verifie('« Annuler » restaure date, debut et fin exactement', JSON.stringify({ date: local.date, startH: local.startH, startM: local.startM, endH: local.endH, endM: local.endM }) === JSON.stringify(origine));
// Annuler apres une synchro qui a remplace l'objet
remet(); ctx.events = [local];
ctx.tcTerminerDeplacement(local, ctx.tcCibleDeplacement(local, 0, px(60, sem), sem));
const remplace = { ...local };
ctx.events = [remplace];
verifie('si la synchro a remplace l\'objet entre-temps, « Annuler » retrouve le rendez-vous par son identifiant', ctx.tcAnnulerDeplacement() === true && remplace.startH === origine.startH && remplace.startM === origine.startM, JSON.stringify(remplace));
// Annuler apres suppression
remet(); ctx.events = [local];
ctx.tcTerminerDeplacement(local, ctx.tcCibleDeplacement(local, 0, px(60, sem), sem));
ctx.events = [];
verifie('si le rendez-vous a ete supprime entre-temps, « Annuler » ne fait rien et ne plante pas', ctx.tcAnnulerDeplacement() === false);

titre('Relacher : rendez-vous avec un autre compte → « Je decale »');
remet();
const lie = ev('tc_rdv_42', '2026-10-08', 11, 0, 12, 0, { contact: 'c_marie' });
ctx.events = [lie];
ctx.contactsList = [{ id: 'c_marie', name: 'Marie Durand', referenceCompte: 'TC-123' }];
vm.runInContext('currentEvent = null;', ctx);
registre.eventModal = element('eventModal');   // fermee : la fiche n'est pas ouverte derriere le glissement
const cibleLie = ctx.tcCibleDeplacement(lie, 48, px(75, sem), sem);
const sorti = ctx.tcTerminerDeplacement(lie, cibleLie);
verifie('le geste rend « decale »', sorti === 'decale');
verifie('le rendez-vous n\'a PAS bouge (ni sauvegarde, ni redessin, pas de barre Annuler)', lie.date === '2026-10-08' && lie.startH === 11 && jaune.sauvegardes === 0 && jaune.rendus === 0 && !(registre.tcDeplaceBarre && registre.tcDeplaceBarre.classList.contains('show')));
verifie('« Je decale » est ouvert pour ce contact et ce rendez-vous',
  lire('_prevenirEventRef') === lie && lire('_prevenirContact').id === 'c_marie' && lire('_prevenirName') === 'Marie Durand');
(async () => {
  await new Promise((r) => setTimeout(r, 20));
  verifie('la confirmation montre le message avec le creneau propose',
    jaune.confirmations.length === 1 && /Voici ce que je peux te proposer : vendredi 9 octobre à 12h15\./.test(jaune.confirmations[0]), jaune.confirmations[0]);
  verifie('le message part chez Marie avec le creneau propose', jaune.envois.length === 1 && jaune.envois[0].contact.id === 'c_marie' && /proposer : vendredi 9 octobre à 12h15\.$/.test(jaune.envois[0].texte), jaune.envois[0] && jaune.envois[0].texte);
  verifie('la modification s\'ouvre sur ce rendez-vous, pre-remplie avec le creneau vise',
    jaune.editions === 1 && registre.eventModal.classList.contains('open') && lire('currentEvent') === lie && registre.editDate.value === '2026-10-09' && registre.editStartH.value === '12:15' && registre.editEndH.value === '13:15',
    registre.editDate && [registre.editDate.value, registre.editStartH.value, registre.editEndH.value].join(' '));
  verifie('et le rendez-vous reste a sa place tant qu\'on n\'a pas enregistre', lie.date === '2026-10-08' && lie.startH === 11 && jaune.sauvegardes === 0);
  verifie('la cible est consommee : un « Je decale » ordinaire ne la reprend pas', lire('_prevenirCible') === null);

  // Refus de la confirmation : rien ne part, rien ne s'ouvre
  remet(); ctx._reponseConfirm = false;
  ctx.events = [lie]; ctx.contactsList = [{ id: 'c_marie', name: 'Marie Durand', referenceCompte: 'TC-123' }];
  ctx.tcTerminerDeplacement(lie, cibleLie);
  await new Promise((r) => setTimeout(r, 20));
  verifie('si on refuse de prevenir : aucun message, pas de modification, rien ne bouge', jaune.envois.length === 0 && jaune.editions === 0 && lie.startH === 11 && jaune.sauvegardes === 0);
  ctx._reponseConfirm = true;

  // Un rendez-vous de groupe
  remet();
  const groupe = ev('tc_grp_9f3a', '2026-10-08', 14, 0, 15, 0);
  ctx.events = [groupe];
  verifie('un rendez-vous a plusieurs (« tc_grp_ ») suit le meme chemin', ctx.tcTerminerDeplacement(groupe, ctx.tcCibleDeplacement(groupe, 0, px(30, sem), sem)) === 'decale' && groupe.startH === 14 && groupe.startM === 0);
  await new Promise((r) => setTimeout(r, 20));
  // Sans contact dans le carnet : la modification s'ouvre quand meme
  remet(); ctx.events = [lie]; ctx.contactsList = [];
  ctx.tcTerminerDeplacement(lie, cibleLie);
  await new Promise((r) => setTimeout(r, 20));
  verifie('contact absent du carnet : le message est tente (aucun chemin), la modification s\'ouvre quand meme, rien n\'a bouge', jaune.editions === 1 && lie.startH === 11 && jaune.sauvegardes === 0);

  suite();
})();

function suite() {
  /* ---- Le geste complet, au doigt et a la souris ---- */
  function rien() { /* nettoie d'une seance a l'autre */ ctx.events = []; remet(); }
  function geste(nom, fn) { rien(); document_reset(); console.log(''); console.log('-- ' + nom + ' --'); fn(); }
  function document_reset() { ['tcDeplaceEtiquette', 'tcDeplaceBarre'].forEach((i) => delete registre[i]); doc.body._classes = new Set(); ctx._swipeActive = true; ctx._tirerDepart = { x: 1, y: 1 }; vm.runInContext('_tcDrag = null; _tcCliqueIgnoreJusqua = 0;', ctx); minuteurs = []; }
  const ptr = (type, x, y, plus) => Object.assign({ type, pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: x, clientY: y }, plus || {});
  function bloc(e, geo) {
    const el = element('bloc_' + e.id);
    el.className = 'week-event';
    ctx.tcRendreDeplacable(el, e, geo);
    return el;
  }

  geste('Appui long, glisser d\'un jour et de 75 minutes, relacher (souris)', () => {
    const e = ev('g1', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    verifie('le bloc ecoute pointerdown, touchmove (non passif) et contextmenu', (el.ecouteurs.pointerdown || []).length === 1 && (el.ecouteurs.touchmove || []).length === 1 && (el.ecouteurs.contextmenu || []).length === 1);
    verifie('rien n\'ecoute le document tant qu\'on ne touche pas (pas de poids sur le defilement)', ecouteursDocument() === '0/0/0');
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    verifie('au toucher : un chronometre d\'appui long, pas encore souleve', !el.classList.contains('tc-deplace') && minuteurs.length === 1 && minuteurs[0].a - horloge === 500);
    avance(499);
    verifie('a 499 ms : pas encore', !el.classList.contains('tc-deplace'));
    avance(2);
    verifie('a 500 ms : le bloc se souleve (classe + leger agrandissement), le corps de page ne se selectionne plus',
      el.classList.contains('tc-deplace') && /scale\(1\.03\)/.test(el.style.transform) && doc.body.classList.contains('tc-deplacement'));
    verifie('glissement d\'une semaine a l\'autre et tirer-pour-rafraichir coupes', ctx._swipeActive === false && ctx._tirerDepart === null && jaune.tirerCache >= 1);
    verifie('une etiquette dit deja ou il est : « jeu. 8 · 11h00 – 12h00 »', registre.tcDeplaceEtiquette && /jeu\. 8 · 11h00 – 12h00/.test(registre.tcDeplaceEtiquette.textContent), registre.tcDeplaceEtiquette && registre.tcDeplaceEtiquette.textContent);
    const t0 = el.style.transform;
    declenche(doc, 'pointermove', ptr('pointermove', 100 + 48, 300 + 55));
    verifie('on glisse d\'un jour et de ~75 minutes : le bloc suit (transform), aimante : 48 px a droite, 75 min plus bas',
      /translate3d\(48px,55px,0\)/.test(el.style.transform), el.style.transform);
    verifie('l\'etiquette suit en direct : « ven. 9 · 12h15 – 13h15 »', /ven\. 9 · 12h15 – 13h15/.test(registre.tcDeplaceEtiquette.textContent), registre.tcDeplaceEtiquette.textContent);
    verifie('rien n\'est redessine ni sauvegarde pendant le glissement', jaune.rendus === 0 && jaune.sauvegardes === 0 && e.startH === 11);
    declenche(doc, 'pointermove', ptr('pointermove', 100 + 48, 300 + 56));
    verifie('un pixel de plus, meme creneau : le style n\'est pas reecrit', el.style.transform !== undefined && /translate3d\(48px,55px,0\)/.test(el.style.transform));
    declenche(doc, 'pointerup', ptr('pointerup', 100 + 48, 300 + 55));
    verifie('au relachement : deplace vendredi 9 octobre 12h15 – 13h15', e.date === '2026-10-09' && e.startH === 12 && e.startM === 15 && e.endH === 13 && e.endM === 15, JSON.stringify(e));
    verifie('le bloc retombe (plus de classe ni de transform), plus d\'etiquette, le document n\'est plus ecoute',
      !el.classList.contains('tc-deplace') && el.style.transform === '' && !doc.body.classList.contains('tc-deplacement') && !registre.tcDeplaceEtiquette && ecouteursDocument() === '0/0/0');
    verifie('le message « Déplacé vers vendredi 9 octobre, 12h15 » + Annuler est la', registre.tcDeplaceBarre && /Déplacé vers vendredi 9 octobre, 12h15/.test(registre.tcDeplaceBarre.innerHTML) && /Annuler/.test(registre.tcDeplaceBarre.innerHTML));
    verifie('le clic qui suit le glissement est avale (la fiche ne s\'ouvre pas)', vm.runInContext('_tcCliqueIgnoreJusqua', ctx) > Date.now());
    const clic = (cible) => ({ target: cible, arrete: false, empeche: false, stopPropagation() { this.arrete = true; }, preventDefault() { this.empeche = true; } });
    const surBarre = clic({ closest: (s) => (s === '#tcDeplaceBarre' ? {} : null) });
    ctx.tcAvalerCliqueApresDeplacement(surBarre);
    verifie('mais « Annuler » reste cliquable aussitot : un clic sur la barre n\'est pas avale', !surBarre.arrete && !surBarre.empeche && vm.runInContext('_tcCliqueIgnoreJusqua', ctx) > Date.now());
    const surAgenda = clic({ closest: () => null });
    ctx.tcAvalerCliqueApresDeplacement(surAgenda);
    verifie('un clic ailleurs (la fiche du bloc) est avale, une seule fois', surAgenda.arrete && surAgenda.empeche && vm.runInContext('_tcCliqueIgnoreJusqua', ctx) === 0);
    const apres = clic({ closest: () => null });
    ctx.tcAvalerCliqueApresDeplacement(apres);
    verifie('et le clic suivant passe normalement', !apres.arrete && !apres.empeche);
    verifie('le geste est termine (rien en cours)', vm.runInContext('_tcDrag', ctx) === null);
    ctx.tcAnnulerDeplacement();
    verifie('« Annuler » remet jeudi 8 octobre 11h00 – 12h00', e.date === '2026-10-08' && e.startH === 11 && e.startM === 0 && e.endH === 12 && e.endM === 0);
  });

  geste('Au doigt (pointeur tactile) : meme chose', () => {
    const e = ev('g2', '2026-10-08', 9, 30, 10, 30); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 50, 400, { pointerType: 'touch', pointerId: 7 }));
    avance(500);
    verifie('le doigt souleve le bloc apres 500 ms', el.classList.contains('tc-deplace'));
    const tm = { cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
    declenche(el, 'touchmove', tm);
    verifie('le defilement de la page est bloque pendant le geste (touchmove annule)', tm.prevented === true);
    declenche(doc, 'pointermove', ptr('pointermove', 50 - 48 * 2, 400 + px(45, sem), { pointerType: 'touch', pointerId: 7 }));
    declenche(doc, 'pointerup', ptr('pointerup', 50 - 48 * 2, 400 + px(45, sem), { pointerType: 'touch', pointerId: 7 }));
    verifie('deux colonnes a gauche, 45 minutes plus bas : mardi 6 octobre, 10h15', e.date === '2026-10-06' && e.startH === 10 && e.startM === 15 && e.endH === 11 && e.endM === 15, JSON.stringify(e));
  });

  geste('Un simple toucher garde le comportement d\'aujourd\'hui', () => {
    const e = ev('g3', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    const tm = { cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(120);
    declenche(doc, 'pointerup', ptr('pointerup', 100, 300));
    verifie('toucher bref : rien ne se souleve, rien ne bouge, le chronometre est annule', !el.classList.contains('tc-deplace') && e.startH === 11 && minuteurs.length === 0 && ecouteursDocument() === '0/0/0');
    verifie('et le clic n\'est pas avale : le rendez-vous s\'ouvre comme avant', vm.runInContext('_tcCliqueIgnoreJusqua', ctx) === 0);
    declenche(el, 'touchmove', tm);
    verifie('hors geste, le defilement n\'est jamais bloque', tm.prevented === false);
    avance(1000);
    verifie('et plus tard, rien ne se declenche tout seul', !el.classList.contains('tc-deplace'));
  });

  geste('Un defilement (le doigt bouge avant l\'appui long) n\'est pas un deplacement', () => {
    const e = ev('g4', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300, { pointerType: 'touch' }));
    avance(200);
    declenche(doc, 'pointermove', ptr('pointermove', 100, 330, { pointerType: 'touch' }));
    verifie('le doigt a glisse de 30 px avant 500 ms : geste abandonne, chronometre annule, document libere', vm.runInContext('_tcDrag', ctx) === null && minuteurs.length === 0 && ecouteursDocument() === '0/0/0');
    avance(1000);
    verifie('aucun soulevement plus tard', !el.classList.contains('tc-deplace') && e.startH === 11);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300, { pointerType: 'touch' }));
    declenche(doc, 'pointermove', ptr('pointermove', 104, 304, { pointerType: 'touch' }));
    avance(500);
    verifie('un doigt un peu tremblant (5 px) n\'empeche pas l\'appui long', el.classList.contains('tc-deplace'));
    declenche(doc, 'pointercancel', ptr('pointercancel', 104, 304, { pointerType: 'touch' }));
    verifie('si le navigateur reprend la main (pointercancel), tout est remis en etat, rien n\'a bouge', !el.classList.contains('tc-deplace') && el.style.transform === '' && e.startH === 11 && vm.runInContext('_tcDrag', ctx) === null && !doc.body.classList.contains('tc-deplacement'));
  });

  geste('Appui long sans glisser, puis relacher', () => {
    const e = ev('g5', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(600);
    declenche(doc, 'pointerup', ptr('pointerup', 100, 300));
    verifie('rien ne bouge, pas de message, bloc remis a plat', e.startH === 11 && e.date === '2026-10-08' && jaune.sauvegardes === 0 && !registre.tcDeplaceBarre && !el.classList.contains('tc-deplace'));
    verifie('et le clic suit : le rendez-vous s\'ouvre comme aujourd\'hui', vm.runInContext('_tcCliqueIgnoreJusqua', ctx) === 0);
  });

  geste('Glisser puis relacher sur le meme creneau = rien', () => {
    const e = ev('g6', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(500);
    declenche(doc, 'pointermove', ptr('pointermove', 100 + 48, 300 + 55));
    declenche(doc, 'pointermove', ptr('pointermove', 100 + 2, 300 - 3));
    declenche(doc, 'pointerup', ptr('pointerup', 100 + 2, 300 - 3));
    verifie('on revient a sa place : aucune sauvegarde, aucun message, rien n\'a bouge', e.date === '2026-10-08' && e.startH === 11 && jaune.sauvegardes === 0 && jaune.rendus === 0 && !registre.tcDeplaceBarre);
    verifie('le clic apres un vrai glissement est avale quand meme', vm.runInContext('_tcCliqueIgnoreJusqua', ctx) > Date.now());
  });

  geste('Vue Jour : seulement vers le haut et le bas', () => {
    const e = ev('g7', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, jour);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(500);
    declenche(doc, 'pointermove', ptr('pointermove', 100 + 200, 300 + px(45, jour)));
    verifie('le bloc ne glisse pas de cote, seulement de 45 minutes', /translate3d\(0px,36px,0\)/.test(el.style.transform), el.style.transform);
    declenche(doc, 'pointerup', ptr('pointerup', 100 + 200, 300 + px(45, jour)));
    verifie('11h45 – 12h45 le meme jour', e.date === '2026-10-08' && e.startH === 11 && e.startM === 45 && e.endH === 12 && e.endM === 45);
  });

  geste('Rendez-vous avec un autre compte : le geste ouvre « Je decale »', () => {
    const e = ev('tc_rdv_77', '2026-10-08', 11, 0, 12, 0, { contact: 'c_marie' }); ctx.events = [e];
    ctx.contactsList = [{ id: 'c_marie', name: 'Marie Durand', referenceCompte: 'TC-123' }];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(500);
    declenche(doc, 'pointermove', ptr('pointermove', 148, 355));
    declenche(doc, 'pointerup', ptr('pointerup', 148, 355));
    verifie('le rendez-vous ne bouge pas, le bloc retombe', e.date === '2026-10-08' && e.startH === 11 && jaune.sauvegardes === 0 && !el.classList.contains('tc-deplace') && el.style.transform === '');
    verifie('« Je decale » est lance avec le creneau vise', lire('_prevenirEventRef') === e && lire('_prevenirContact') && lire('_prevenirContact').id === 'c_marie');
  });

  geste('Rendez-vous qui ne se deplacent pas', () => {
    const jj = ev('h1', '2026-10-08', 0, 0, 23, 59, { allDay: true });
    const demo = ev('h2', '2026-10-08', 9, 0, 10, 0, { mode: 'pro' });
    [jj, demo].forEach((x) => { const el = bloc(x, sem); verifie('« ' + (x.allDay ? 'journee entiere' : 'demonstration') + ' » : aucun ecouteur', Object.keys(el.ecouteurs).length === 0); });
  });

  geste('Souris : le bouton droit ne declenche rien ; un second doigt est ignore', () => {
    const e = ev('g8', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300, { button: 2 }));
    verifie('bouton droit : pas de chronometre', minuteurs.length === 0 && vm.runInContext('_tcDrag', ctx) === null);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300, { isPrimary: false, pointerId: 3 }));
    verifie('deuxieme doigt : ignore', minuteurs.length === 0);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    declenche(el, 'pointerdown', ptr('pointerdown', 110, 310, { pointerId: 2, isPrimary: true }));
    verifie('un second toucher pendant un geste n\'en demarre pas un deuxieme', minuteurs.length === 1);
    declenche(doc, 'pointerup', ptr('pointerup', 100, 300, { pointerId: 9 }));
    verifie('le relachement d\'un autre pointeur ne ferme pas le geste en cours', vm.runInContext('_tcDrag', ctx) !== null);
    declenche(doc, 'pointerup', ptr('pointerup', 100, 300));
    verifie('le bon pointeur le ferme', vm.runInContext('_tcDrag', ctx) === null);
  });

  geste('La semaine est redessinee pendant le geste (synchro) : on laisse tomber', () => {
    const e = ev('g9', '2026-10-08', 11, 0, 12, 0); ctx.events = [e];
    const el = bloc(e, sem);
    declenche(el, 'pointerdown', ptr('pointerdown', 100, 300));
    avance(500);
    el.isConnected = false;
    declenche(doc, 'pointermove', ptr('pointermove', 148, 355));
    verifie('le bloc n\'est plus dans la page : le geste s\'arrete proprement, rien n\'est ecrit', vm.runInContext('_tcDrag', ctx) === null && ecouteursDocument() === '0/0/0' && e.startH === 11 && jaune.sauvegardes === 0);
  });

  /* ---- Les vues dessinent des blocs deplacables ---- */
  console.log(''); console.log('-- Les vues Semaine et Jour branchent le geste --');
  const lundi = new Date(2026, 9, 5);
  const evSem = ev('v1', '2026-10-08', 11, 0, 12, 0);
  const evLie = ev('tc_rdv_5', '2026-10-06', 9, 0, 10, 0);
  const evJournee = ev('v3', '2026-10-07', 0, 0, 23, 59, { allDay: true });
  ctx.events = [evSem, evLie, evJournee];
  ctx.tcEvenementsDuJour = (j, bandeau) => ctx.events.filter((x) => x.date === j && (!!x.allDay === bandeau));
  ctx.mode = 'user'; ctx.viewDate = new Date(2026, 9, 7); ctx.today = new Date(2026, 9, 7);
  registre.weekHeader = element('weekHeader'); registre.weekBody = element('weekBody'); registre.weekBody.offsetWidth = 50 + 7 * 48;
  ctx.renderWeek();
  const blocs = registre.weekBody.children.filter((c) => /week-event/.test(c.className));
  verifie('la vue Semaine dessine ses deux rendez-vous a heure (pas la journee entiere)', blocs.length === 2, blocs.length);
  verifie('et chacun est deplacable', blocs.every((b) => (b.ecouteurs.pointerdown || []).length === 1));
  const bJeudi = blocs.find((b) => /left/.test(b.style.left) || b.style.left === '' + (50 + 3 * 48 + 1) + 'px') || blocs.find((b) => b.style.left === (50 + 3 * 48 + 1) + 'px');
  verifie('le jeudi est la 4e colonne (index 3) a 195 px', !!bJeudi && bJeudi.style.left === '195px', bJeudi && bJeudi.style.left);
  declenche(bJeudi, 'pointerdown', ptr('pointerdown', 210, 300));
  avance(500);
  declenche(doc, 'pointermove', ptr('pointermove', 210 + 48, 300 + 55));
  declenche(doc, 'pointerup', ptr('pointerup', 210 + 48, 300 + 55));
  verifie('depuis la vue Semaine : l\'appui long + glisser deplace bien au vendredi 9, 12h15', evSem.date === '2026-10-09' && evSem.startH === 12 && evSem.startM === 15, JSON.stringify(evSem));
  document_reset();
  const bMardi = blocs.find((b) => b !== bJeudi);
  declenche(bMardi, 'pointerdown', ptr('pointerdown', 100, 300));
  avance(500);
  declenche(doc, 'pointermove', ptr('pointermove', 100 - 48 * 5, 300));
  verifie('depuis la colonne du mardi (index 1), on ne peut pas aller plus a gauche que le lundi', /translate3d\(-48px,0px,0\)/.test(bMardi.style.transform), bMardi.style.transform);
  declenche(doc, 'pointercancel', ptr('pointercancel', 0, 0));

  ctx.events = [ev('j1', '2026-10-07', 14, 0, 15, 0), ev('tc_rdv_9', '2026-10-07', 16, 0, 17, 0)];
  ctx.tcEvenementsDuJour = (j, bandeau) => ctx.events.filter((x) => x.date === j && !bandeau);
  registre.dayDate = element('dayDate'); registre.dayName = element('dayName'); registre.dayBody = element('dayBody');
  ctx.viewDate = new Date(2026, 9, 7);
  ctx.renderDay();
  const bj = registre.dayBody.children.filter((c) => /day-event/.test(c.className));
  verifie('la vue Jour dessine ses deux rendez-vous, tous deux deplacables', bj.length === 2 && bj.every((b) => (b.ecouteurs.pointerdown || []).length === 1), bj.length);

  /* ---- Dans la page : branchements, style, coupures ---- */
  console.log(''); console.log('-- Dans la page --');
  verifie('vue Semaine : le bloc est branche avec sa colonne et ses 44/60 px par minute', /tcRendreDeplacable\(evt, e, \{ vue: 'week', pxParMin: 44\/60, colWidth: colWidth, di: di \}\);/.test(page));
  verifie('vue Jour : le bloc est branche avec ses 48/60 px par minute', /tcRendreDeplacable\(evt, e, \{ vue: 'day', pxParMin: 48\/60, colWidth: 0, di: 0 \}\);/.test(page));
  verifie('les hauteurs utilisees sont celles du dessin (semaine 44/60, jour 48/60)', /evt\.style\.top = `\$\{sm\*\(44\/60\)\}px`/.test(page) && /evt\.style\.top = `\$\{sm\*\(48\/60\)\+8\}px`/.test(page));
  verifie('le clic d\'ouverture est conserve sur chaque bloc', (page.match(/evt\.onclick = \(\) => openEventModal\(e\);/g) || []).length === 2);
  verifie('le style : bloc souleve, etiquette, barre Annuler', /\.tc-deplace \{[^}]*box-shadow/.test(page) && /\.tc-deplace-etiquette \{/.test(page) && /\.tc-deplace-barre \{/.test(page) && /\.tc-deplace-barre\.show \{ display:flex; \}/.test(page));
  verifie('la barre Annuler se leve au-dessus du bandeau de mise a jour comme le message habituel', /body\.maj-visible \.tc-deplace-barre \{ bottom:152px; \}/.test(page));
  verifie('le texte des rendez-vous n\'est plus selectionnable (pas de menu d\'appui long)', /\.week-event, \.day-event \{ -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; \}/.test(page));
  verifie('l\'appui long dure 500 ms, le pas est de 15 minutes', /const TC_DEPLACER_APPUI_MS = 500;/.test(page) && /const TC_DEPLACER_PAS = 15;/.test(page));
  const corps = (extraire('tcDeplacerBouge') || '') + (extraire('tcCibleDeplacement') || '');
  verifie('pendant le glissement : aucun rendu, aucune sauvegarde, aucune lecture de mise en page', !/render\(|saveEventsToStorage|getBoundingClientRect|innerHTML|querySelector/.test(corps));
  verifie('les ecouteurs du document n\'existent que pendant un geste (pas de poids sur le defilement)', !/document\.addEventListener\('pointer/.test(page.replace(/function tcDeplacerDebut[\s\S]*?\n\}/, '')));
  verifie('le tirer-pour-rafraichir et le glissement de semaine sont coupes a l\'appui long', /_swipeActive = false;/.test(extraire('tcDeplacerSoulever') || '') && /_tirerDepart = null;/.test(extraire('tcDeplacerSoulever') || ''));
  verifie('« Je decale » ajoute le creneau a son message et pre-remplit la modification', /tcLibelleCreneau\(cible, ' à '\)/.test(extraire('prevenirDecaler') || '') && /tcPreRemplirCreneau\(cible\)/.test(extraire('prevenirDecaler') || ''));
  verifie('aucun nouveau reglage cree (aucune cle tc_ ajoutee pour ce geste)', !/tc_deplac|tc_glisser|localStorage\.setItem\('tc_(drag|deplace)/.test(page));
  verifie('le message ne parle pas « sans ton accord »', !/sans ton accord/.test(extraire('tcMontrerDeplacement') + extraire('tcAnnulerDeplacement') + extraire('prevenirDecaler')));

  const bloc2 = page.slice(debutBloc, page.indexOf('// ═══ EVENT MODAL ═══'));
  const doubles = [];
  [...bloc2.matchAll(/^(?:async )?function (\w+)\(/gm)].forEach((m) => {
    const n = (page.match(new RegExp('function ' + m[1] + '\\(', 'g')) || []).length;
    if (n !== 1) doubles.push(m[1] + ' x' + n);
  });
  verifie('aucune fonction du deplacement ne porte le nom d une autre (la derniere ecraserait la premiere)', doubles.length === 0 && bloc2.length > 1000, doubles.join(', '));

  console.log('');
  console.log(ko ? ko + ' anomalie(s).' : 'Tout est bon.');
  process.exit(ko ? 1 : 0);
}
