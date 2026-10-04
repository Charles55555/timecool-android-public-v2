// « Gérer un imprévu » : une question posée par Charly (jour + partie de la
// journée), puis l'agenda est regardé seul et le questionnaire à trois choix
// s'affiche.
//
// Charles, 04/10 : « Tu veux réorganiser ton agenda ! Quel jour ? Que le
// matin ? Que l'après-midi ? Quelle heure ? »
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

/* Horloge fixee : lundi 5 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 5, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}

const trace = { montres: [], messages: [] };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, parseInt, Date: DateFixe,
  mode: 'user', events: [], charlyIA: { history: [] },
  contacts: {},
  tcContactDuRdv: () => null,
  renderCharlyChat: () => {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcComparerEvenements: (a, b) => (a.date + String(a.startH).padStart(2, '0')) < (b.date + String(b.startH).padStart(2, '0')) ? -1 : 1,
  showContrainte: (touches, label) => { trace.montres.push({ titres: touches.map((e) => e.title), label: label }); }
};
vm.createContext(ctx);
const q = (page.match(/const TC_QUESTION_IMPREVU = '((?:[^'\\]|\\.)*)'/) || [])[1] || '';
vm.runInContext('const TC_QUESTION_IMPREVU = \'' + q + '\'; let _tcImprevuEnAttente = 0;', ctx);
['tcSansAccents', 'tcISO', 'tcPeriodeAgenda', 'tcPeriodeContrainte', 'tcRdvDeLaPeriode', 'tcPhraseNonCompris',
 'tcDemarrerImprevu', 'tcPlageImprevu', 'tcPeriodeImprevu', 'tcRepondreImprevu'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const jourPlus = (n) => iso(new Date(2026, 9, 5 + n));
const ev = (title, date, h, m, hf, mf, extra) => Object.assign({ id: title, title: title, date: date, startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
const attente = () => vm.runInContext('_tcImprevuEnAttente', ctx);
const reinit = (liste) => { ctx.events = liste; ctx.charlyIA.history = []; trace.montres = []; vm.runInContext('_tcImprevuEnAttente = 0', ctx); };
const dernier = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1];

(async () => {
  titre('La question');
  verifie('elle annonce : Tu veux réorganiser ton agenda !', q.indexOf('Tu veux réorganiser ton agenda !') === 0, q);
  verifie('elle demande le jour, le matin, l après-midi, la journée, l heure', /jour/.test(q) && /matin/.test(q) && /après-midi/.test(q) && /toute la journée/.test(q) && /quelle heure/.test(q));
  reinit([]);
  ctx.tcDemarrerImprevu();
  verifie('Charly parle le premier, rien n est envoye en son nom', ctx.charlyIA.history.length === 1 && ctx.charlyIA.history[0].role === 'assistant');
  verifie('une reponse est attendue (2 essais)', attente() === 2);

  titre('Les parties de la journée');
  const plage = (t) => vm.runInContext('tcPlageImprevu(' + JSON.stringify(t) + ')', ctx);
  verifie('apres-midi : 12h-18h', plage('demain après-midi').debut === 720 && plage('demain après-midi').fin === 1080);
  verifie('matin : 0h-12h', plage('demain matin').debut === 0 && plage('demain matin').fin === 720);
  verifie('soir : 18h-24h', plage('ce soir').debut === 1080);
  verifie('à partir de 15h', plage('demain à partir de 15h').debut === 900 && plage('demain à partir de 15h').fin === 1440);
  verifie('à partir de 15h30', plage('à partir de 15h30').debut === 930);
  verifie('jusqu\'à 11h', plage('jusqu\'à 11h').fin === 660 && plage('jusqu\'à 11h').debut === 0);
  verifie('sans precision : toute la journée', plage('demain').debut === 0 && plage('demain').fin === 1440 && plage('demain').precise === false);
  verifie('« toute la journée » : toute la journée', plage('toute la journée demain').precise === false);

  titre('La réponse : Charly regarde l agenda seul');
  const lundi = jourPlus(0), demain = jourPlus(1);
  const agenda = () => [
    ev('Dentiste', demain, 14, 30, 15, 30), ev('Cours de tennis', demain, 9, 0, 10, 30),
    ev('Coiffeur', demain, 17, 0, 18, 0), ev('Diner', demain, 20, 0, 22, 0), ev('Apres-demain', jourPlus(2), 14, 0, 15, 0)
  ];
  reinit(agenda()); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  let pris = await ctx.tcRepondreImprevu('Demain après-midi');
  verifie('réponse prise', pris === true);
  verifie('seulement l après-midi de demain : Dentiste et Coiffeur', trace.montres.length === 1 && trace.montres[0].titres.join(',') === 'Dentiste,Coiffeur', trace.montres[0] && trace.montres[0].titres.join(','));
  verifie('le libellé dit demain l après-midi', trace.montres[0] && trace.montres[0].label === 'demain l\'après-midi', trace.montres[0] && trace.montres[0].label);
  verifie('l attente est terminee', attente() === 0);

  reinit(agenda()); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain matin');
  verifie('le matin : seulement le tennis', trace.montres[0] && trace.montres[0].titres.join(',') === 'Cours de tennis');

  reinit(agenda()); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain');
  verifie('le jour seul : les quatre rendez-vous de demain, pas ceux d après-demain', trace.montres[0] && trace.montres[0].titres.length === 4 && trace.montres[0].titres.indexOf('Apres-demain') === -1);

  reinit(agenda()); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain à partir de 17h');
  verifie('à partir de 17h : Coiffeur et Diner', trace.montres[0] && trace.montres[0].titres.join(',') === 'Coiffeur,Diner', trace.montres[0] && trace.montres[0].titres.join(','));

  reinit([ev('Reunion', lundi, 15, 0, 16, 0), ev('Matin', lundi, 8, 0, 9, 0)]); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('cet après-midi');
  verifie('« cet après-midi » sans jour : aujourd\'hui', trace.montres[0] && trace.montres[0].titres.join(',') === 'Reunion', trace.montres[0] && JSON.stringify(trace.montres[0]));

  reinit([Object.assign(ev('Journee', demain, 0, 0, 23, 59), { allDay: true })]); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain matin');
  verifie('une journée entière est touchée par n importe quelle partie', trace.montres[0] && trace.montres[0].titres.join(',') === 'Journee');

  titre('Rien à réorganiser');
  reinit([ev('Plus tard', jourPlus(3), 10, 0, 11, 0)]); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain après-midi');
  verifie('aucun questionnaire', trace.montres.length === 0);
  verifie('Charly le dit', /aucun rendez-vous demain l'après-midi : rien à réorganiser/.test(dernier().content), dernier().content);
  reinit([ev('Midi', demain, 11, 0, 12, 0)]); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  await ctx.tcRepondreImprevu('demain après-midi');
  verifie('un rendez-vous du matin ne compte pas pour l après-midi', trace.montres.length === 0);

  titre('Une réponse incomprise');
  reinit(agenda()); vm.runInContext('_tcImprevuEnAttente = 2', ctx);
  pris = await ctx.tcRepondreImprevu('euh je sais pas');
  verifie('première fois : il redemande avec « Sauf erreur de ma part »', pris === true && /^Sauf erreur de ma part, je n'ai pas bien compris ta demande\. Quel jour veux-tu réorganiser \?/.test(dernier().content), dernier().content);
  verifie('et attend encore', attente() === 1);
  pris = await ctx.tcRepondreImprevu('toujours pas');
  verifie('deuxième fois : il laisse le message suivre son chemin', pris === false && attente() === 0);

  titre('Branché');
  const act = extraire('charlyQuickAction') || '';
  verifie('l onglet imprévu appelle tcDemarrerImprevu', /action === 'impprevu'\) \{ tcDemarrerImprevu\(\); return; \}/.test(act));
  verifie('tout autre onglet efface l attente', /^function charlyQuickAction\(action\) \{\s*_tcImprevuEnAttente = 0;/.test(act));
  verifie('l ancienne phrase « J\'ai un imprévu… Aide-moi » a disparu', page.indexOf('J\'ai un imprévu et je dois réorganiser ma journée. Aide-moi.') === -1);
  const envoi = extraire('charlySendMessage') || '';
  verifie('la réponse est lue avant la clé API du modèle', envoi.indexOf('_tcImprevuEnAttente > 0') > -1 && envoi.indexOf('_tcImprevuEnAttente > 0') < envoi.indexOf('Aucune clé API'));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
