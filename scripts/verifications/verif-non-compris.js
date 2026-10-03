// Quand Charly ne comprend pas, il le dit : il ne repond pas a cote.
//
// Capture du 04/10 : « Je ne pourrai pas honorer mes rdv de ce lundi »
// avait recu une consultation du samedi 3 octobre. « mes rdv » declenche
// la consultation, aucune periode n'etait reconnue pour « ce lundi », et
// le repli etait « aujourd'hui », sans rien verifier. Charles : « s'il ne
// sait pas il y a pas pire que de sortir des conneries ».
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
  return page.slice(debut, page.indexOf(';\n', debut) + 1);
}

/* Samedi 3 octobre 2026, 10h : le jour de la capture. */
const SAMEDI = new Date(2026, 9, 3, 10, 0, 0);
class DateSamedi extends Date {
  constructor(...a) { if (a.length) super(...a); else super(SAMEDI.getTime()); }
  static now() { return SAMEDI.getTime(); }
}

const NC = "Sauf erreur de ma part, je n'ai pas bien compris ta demande.";
const supprimes = [];
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, Set, Math, JSON, isNaN, Date: DateSamedi,
  mode: 'user', events: [], contactsList: [], charlyIA: { history: [] },
  _tcSuppressionEnAttente: null, _tcSuppressionChoix: null,
  setTimeout: (f) => { if (typeof f === 'function') f(); return 0; },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcDefinirStatutCharly: () => {}, renderCharlyChat: () => {},
  tcFormaterDateHumaine: (d) => d, tcFormaterHeure: (e) => e.startH + 'h', escapeHTMLSafe: (t) => String(t),
  parseFrenchDateFromText: () => null,
  tcSupprimerRdvs: (l) => { supprimes.push(l.map((e) => e.title)); },
  tcComparerEvenements: (a, b) => (a.date + String(a.startH).padStart(2, '0')) < (b.date + String(b.startH).padStart(2, '0')) ? -1 : 1
};
vm.createContext(ctx);
['TC_JOURS_SEMAINE', 'TC_MOIS'].forEach((n) => { const src = extraireConst(n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
['tcSansAccents', 'tcISO', 'tcHeureDansTexte', 'tcPeriodeAgenda', 'tcBorneDeFin', 'tcJoursDansTexte', 'tcJoursNommes',
 'tcPhraseNonCompris', 'tcPeriodeContrainte', 'tcPeriodeCoherente', 'tcPeriodeJourNomme',
 'detecterConsultationAgenda', 'tcGererConsultationAgenda', 'tcGererSuppressionRdv'
].forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ev = (id, title, date, h) => ({ id: id, title: title, date: date, startH: h, startM: 0, endH: h + 1, endM: 0, mode: 'user', cat: 'travail' });

titre('Les jours nommes dans une phrase');
verifie('« ce lundi » → lundi', JSON.stringify(ctx.tcJoursNommes('mes rdv de ce lundi')) === '[1]');
verifie('« mardi et jeudi » → mardi, jeudi', JSON.stringify(ctx.tcJoursNommes('mardi et jeudi')) === '[2,4]');
verifie('« samedis » (pluriel) → samedi', JSON.stringify(ctx.tcJoursNommes('tous les samedis')) === '[6]');
verifie('« demain » : aucun jour nomme', ctx.tcJoursNommes('mes rdv demain').length === 0);

titre('La periode dit-elle ce que la phrase dit ?');
const sam = { debut: new Date(2026, 9, 3), fin: null };
const lun = { debut: new Date(2026, 9, 5), fin: null };
verifie('« lundi » avec un samedi : incoherent', !ctx.tcPeriodeCoherente('mes rdv de ce lundi', sam));
verifie('« lundi » avec un lundi : coherent', ctx.tcPeriodeCoherente('mes rdv de ce lundi', lun));
verifie('« lundi » avec la semaine entiere : coherent', ctx.tcPeriodeCoherente('mes rdv lundi', { debut: new Date(2026, 9, 5), fin: new Date(2026, 9, 11) }));
verifie('« mardi et jeudi » avec seulement mardi : incoherent', !ctx.tcPeriodeCoherente('mardi et jeudi', { jours: ['2026-10-06'] }));
verifie('aucun jour nomme : toujours coherent', ctx.tcPeriodeCoherente('mes rdv demain', sam));
verifie('pas de periode : coherent (rien a verifier)', ctx.tcPeriodeCoherente('lundi', null));

(async () => {
  titre('La consultation : « mes rdv de ce lundi » depuis un samedi');
  ctx.events = [ev('a', 'Chercher les enfants', '2026-10-03', 17), ev('b', 'Dentiste', '2026-10-05', 15)];
  const intent = ctx.detecterConsultationAgenda('Mes rdv de ce lundi');
  verifie('reconnue comme une consultation de periode', !!intent && intent.type === 'periode');
  verifie('la periode est le lundi 5, pas aujourd hui', intent && intent.periode.jours && intent.periode.jours[0] === '2026-10-05', intent && intent.periode.jours && intent.periode.jours.join());
  ctx.charlyIA.history = [];
  await ctx.tcGererConsultationAgenda('Mes rdv de ce lundi', intent);
  const rep = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('montre le dentiste du lundi', /Dentiste/.test(rep), rep);
  verifie('ne montre PAS le rendez-vous du samedi (la capture)', !/Chercher les enfants/.test(rep));

  titre('Si elle ne sait pas, elle le dit');
  ctx.charlyIA.history = [];
  await ctx.tcGererConsultationAgenda('Mes rdv de ce lundi', { type: 'periode', periode: { debut: new Date(2026, 9, 3), fin: null, label: null } });
  const non = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('periode incoherente : « je n\'ai pas bien compris »', non.indexOf(NC) === 0, non);
  verifie('avec une question de reformulation', /De quel jour parles-tu exactement/.test(non));
  verifie('et aucune liste inventee', !/•/.test(non));
  ctx.charlyIA.history = [];
  const intentDemain = ctx.detecterConsultationAgenda('Mes rdv demain');
  await ctx.tcGererConsultationAgenda('Mes rdv demain', intentDemain);
  verifie('« demain » (aucun jour nomme) : repond comme avant', !/Sauf erreur/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));

  titre('La suppression : meme resolution, meme verification');
  ctx.events = [ev('a', 'Chercher les enfants', '2026-10-03', 17), ev('b', 'Dentiste', '2026-10-05', 15)];
  supprimes.length = 0; ctx.charlyIA.history = [];
  await ctx.tcGererSuppressionRdv('Supprime mon rdv de ce lundi');
  verifie('« supprime ... ce lundi » vise le lundi, pas le samedi', supprimes.length === 1 && supprimes[0].join() === 'Dentiste', JSON.stringify(supprimes));
  supprimes.length = 0; ctx.charlyIA.history = [];
  await ctx.tcGererSuppressionRdv('Supprime mes rdv de ce lundi demain');
  const nonSup = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('« lundi » + « demain » (un dimanche) : incoherent, il demande', nonSup.indexOf(NC) === 0 && supprimes.length === 0, nonSup);

  titre('La formule est revenue, pour ce seul usage');
  verifie('la consigne la reserve a l incomprehension', /QUE pour dire que tu n'as pas compris/.test(page));
  verifie('« Ne devine jamais, ne réponds jamais à côté »', /Ne devine jamais, ne réponds jamais à côté/.test(page));
  const hors = (page.match(/Sauf erreur de ma part, (?!je n\\?'ai pas bien compris)/g) || []).length;
  verifie('aucune autre phrase ne commence par la formule', hors === 0, 'reste ' + hors);
  verifie('les deux interceptions utilisent la meme phrase', (page.match(/tcPhraseNonCompris\('De quel jour/g) || []).length === 2);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
