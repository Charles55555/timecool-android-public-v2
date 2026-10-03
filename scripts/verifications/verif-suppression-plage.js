// « Enleve-moi tous les samedis et dimanches de "chercher les enfants a
// l'ecole" jusqu'a la fin octobre. »
//
// Avant : la phrase n'etait pas comprise. Pas de filtre par jour de
// semaine, pas de borne « jusqu'a fin octobre », et le mot du titre ne
// restreignait plus des qu'une periode etait donnee.
//
// On execute la vraie tcGererSuppressionRdv sur un faux agenda, avec
// une horloge fixee -- sinon la suite casserait au 1er novembre -- et on
// regarde ce qu'elle propose de supprimer, et surtout ce qu'elle ne
// supprime pas sans demander.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  // « async function » : sans le mot-cle, les await du corps ne
  // compilent pas. On le reprend s'il precede.
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}
function extraireConst(nom) {
  const debut = page.indexOf('const ' + nom + ' = ');
  if (debut < 0) return null;
  const fin = page.indexOf(';\n', debut);
  return page.slice(debut, fin + 1);
}

/* L'horloge est fixee au samedi 3 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 3, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}

/* Le faux agenda. */
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function agenda() {
  const ev = [];
  let id = 1;
  // Chercher les enfants, tous les jours du 3 octobre au 8 novembre.
  for (let d = new Date(2026, 9, 3); d <= new Date(2026, 10, 8); d.setDate(d.getDate() + 1)) {
    ev.push({ id: 'e' + id++, mode: 'user', title: 'Chercher les enfants à l\'école', date: iso(d), startH: 16, startM: 30, endH: 17, endM: 0 });
  }
  // Piano, tous les samedis d'octobre.
  for (let d = new Date(2026, 9, 3); d <= new Date(2026, 9, 31); d.setDate(d.getDate() + 7)) {
    ev.push({ id: 'e' + id++, mode: 'user', title: 'Cours de piano', date: iso(d), startH: 11, startM: 0, endH: 12, endM: 0 });
  }
  // Un dentiste, le samedi 10 octobre.
  ev.push({ id: 'e' + id++, mode: 'user', title: 'Dentiste', date: '2026-10-10', startH: 10, startM: 0, endH: 10, endM: 30 });
  return ev;
}

let supprimes = null;
const ctx = {
  console, String, Number, Array, Object, RegExp, Set, Math, JSON, isNaN, Promise,
  setTimeout: (f) => f(),            // pas d'attente de 350 ms dans une suite
  Date: DateFixe,
  mode: 'user',
  events: [],
  contactsList: [],
  charlyIA: { history: [] },
  _tcSuppressionEnAttente: null,
  _tcSuppressionChoix: null,
  // Ce qu'on neutralise : rien de tout cela n'est l'objet du test.
  tcPeriodeAgenda: () => null,
  parseFrenchDateFromText: () => null,
  tcHeureDansTexte: () => null,
  tcDefinirStatutCharly: () => {},
  tcPousserMessageUtilisateur: () => {},
  renderCharlyChat: () => {},
  tcDernierMessageCharly: () => null,
  tcFormaterDateHumaine: (d) => d,
  tcFormaterHeure: (e) => e.startH + 'h',
  escapeHTMLSafe: (t) => String(t),
  tcSupprimerRdvs: (liste) => { supprimes = liste; }
};
vm.createContext(ctx);

['TC_JOURS_SEMAINE', 'TC_MOIS'].forEach((n) => {
  const src = extraireConst(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcJoursDansTexte', 'tcBorneDeFin', 'tcGererSuppressionRdv'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Les jours de semaine nommes');
const J = (t) => ctx.tcJoursDansTexte(t);
verifie('« les samedis et dimanches »', JSON.stringify(J('les samedis et dimanches')) === '{"0":true,"6":true}');
verifie('« le week-end »', JSON.stringify(J('le week-end')) === '{"0":true,"6":true}');
verifie('« tous les lundis »', JSON.stringify(J('tous les lundis')) === '{"1":true}');
verifie('« demain » : aucun jour nomme', J('demain') === null);
verifie('« Mardi Gras » dans un titre ne compte pas ici', J('annule le dentiste') === null);

titre('La borne de fin');
const B = (t) => { const b = ctx.tcBorneDeFin(t, FIXE); return b ? iso(b.fin) : null; };
verifie('« jusqu\'à la fin octobre »', B('jusqu\'à la fin octobre') === '2026-10-31');
verifie('« jusqu\'à fin octobre »', B('jusqu\'à fin octobre') === '2026-10-31');
verifie('« jusqu\'à la fin du mois d\'octobre »', B('jusqu\'à la fin du mois d\'octobre') === '2026-10-31');
verifie('« jusqu\'au 15 novembre »', B('jusqu\'au 15 novembre') === '2026-11-15');
verifie('« jusqu\'à fin janvier » vise l an prochain', B('jusqu\'à fin janvier') === '2027-01-31', 'janvier 2026 est passe');
verifie('« jusqu\'au 31 février » retombe sur le dernier jour', B('jusqu\'au 31 février') === '2027-02-28');
verifie('« annule demain » : pas de borne', B('annule demain') === null);
verifie('la borne commence aujourd hui', ctx.tcBorneDeFin('jusqu\'à fin octobre', FIXE).debut.getDate() === 3);

function lancer(texte) {
  ctx.events = agenda();
  ctx.charlyIA.history = [];
  ctx._tcSuppressionEnAttente = null;
  ctx._tcSuppressionChoix = null;
  supprimes = null;
  return ctx.tcGererSuppressionRdv(texte);
}
const titres = (l) => (l || []).map((e) => e.title + ' ' + e.date);

(async () => {
  titre('La phrase de Charles, mot pour mot');
  {
    await lancer('J\'ai oublié de te préciser mais pour chercher les enfants à l\'école enlève-moi le samedi et le dimanche ils ont pas école enlève-moi tous les samedis et tous les dimanches jusqu\'à la fin octobre');
    const lot = ctx._tcSuppressionEnAttente;
    verifie('Charly prepare un lot et demande confirmation', Array.isArray(lot) && lot.length > 0);
    verifie('rien n est supprime avant le « oui »', supprimes === null, 'validation de Charles du 03/10');
    verifie('neuf rendez-vous : les samedis et dimanches du 3 au 31 octobre', lot && lot.length === 9, 'trouve ' + (lot ? lot.length : 0));
    verifie('tous sont « chercher les enfants »', lot && lot.every((e) => /enfants/.test(e.title)),
      'le piano du samedi et le dentiste ne sont pas vises');
    verifie('aucun en semaine', lot && lot.every((e) => [0, 6].indexOf(new Date(e.date + 'T12:00:00').getDay()) > -1));
    verifie('aucun en novembre', lot && lot.every((e) => e.date <= '2026-10-31'));
    verifie('la liste exacte est montree', ctx.charlyIA.history.some((m) => /Tu veux annuler ces 9 rendez-vous/.test(m.content)));
  }

  titre('Sans mot de titre, tout le samedi part dans le lot');
  {
    await lancer('enlève tous les samedis jusqu\'au 31 octobre');
    const lot = ctx._tcSuppressionEnAttente;
    verifie('onze rendez-vous : 5 ecole + 5 piano + 1 dentiste', lot && lot.length === 11, 'trouve ' + (lot ? lot.length : 0));
    verifie('et confirmation demandee', supprimes === null);
  }

  titre('Un mot de titre qui ne correspond a rien ne vide pas la selection');
  {
    // « judo » seul : « les cours de judo » aurait retenu les pianos par
    // le mot « cours » -- un mot suffit, comme avant ce changement.
    await lancer('enlève le judo le samedi jusqu\'à fin octobre');
    const lot = ctx._tcSuppressionEnAttente;
    verifie('la selection reste celle du samedi (11)', lot && lot.length === 11, 'trouve ' + (lot ? lot.length : 0));
  }

  titre('Un mot de titre restreint bien quand il correspond');
  {
    await lancer('enlève les cours de piano le samedi jusqu\'à fin octobre');
    const lot = ctx._tcSuppressionEnAttente;
    verifie('cinq pianos, rien d autre', lot && lot.length === 5 && lot.every((e) => /piano/.test(e.title)), 'trouve : ' + titres(lot).join(', '));
  }

  titre('Ce qui marchait avant marche encore');
  {
    await lancer('annule le dentiste');
    verifie('un seul correspond : supprime sans redemander', supprimes && supprimes.length === 1 && supprimes[0].title === 'Dentiste',
      'choix de Charles du 30/09');
  }
  {
    await lancer('annule mon rendez-vous');
    verifie('plusieurs sans precision : Charly demande, ne devine pas', supprimes === null && ctx._tcSuppressionEnAttente === null
      && ctx.charlyIA.history.some((m) => /plusieurs rendez-vous/.test(m.content)));
  }

  titre('Les trois noms de famille ont quitte la liste des lieux');
  {
    const lieux = extraireConst('TC_LIEUX') || '';
    verifie('« marche » retire', !/'marche'/.test(lieux));
    verifie('« maison » retire', !/'maison'/.test(lieux));
    verifie('« centre » retire', !/'centre'/.test(lieux));
    verifie('« lycee » toujours la', /'lycee'/.test(lieux));
  }

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
