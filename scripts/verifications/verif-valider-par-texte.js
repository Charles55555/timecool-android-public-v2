// « Valide quand meme » tape au clavier doit faire ce que fait le bouton.
//
// Capture du 03/10 : conflit signale, « Que veux-tu faire ? », Charles
// ecrit « Valide quand meme », le modele repond « c'est deja fait » --
// et la serie de tennis n'a jamais ete ajoutee (un seul cours en base).
// Et le conflit lui-meme n'en etait pas un : le cours du 29 existait
// deja, a l'identique.
//
// On execute les vraies fonctions de decision sur un faux historique,
// et on verifie dans la source que le branchement existe la ou il faut.
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

let ajoutsForces = 0, annulations = 0, rendus = 0;
const ctx = {
  console, String, Number, Array, Object, RegExp, JSON,
  events: [],
  charlyIA: { history: [] },
  extractAgendaProposals: (c) => (c && c.indexOf('[AGENDA]') > -1 ? [{ title: 'x' }] : null),
  _origValidateAgendaProposalFromMsg: () => { ajoutsForces++; },
  renderCharlyChat: () => { rendus++; }
};
vm.createContext(ctx);
['tcSansAccents', 'tcReponseOuiNon', 'tcReponseValidation', 'tcConflitEnAttente', 'tcPropositionEnAttente',
 'tcDoublonExact', 'detectConflicts', 'forceAddDespiteConflict', 'cancelConflictedAdd'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Un accord tape vaut le bouton vert');
const R = (t) => ctx.tcReponseValidation(t);
verifie('« Valide quand meme » (la phrase de la capture)', R('Valide quand meme') === 'oui');
verifie('« valide »', R('valide') === 'oui');
verifie('« Valide-les »', R('Valide-les') === 'oui');
verifie('« ajoute-les »', R('ajoute-les') === 'oui');
verifie('« ok »', R('ok') === 'oui');
verifie('« oui »', R('oui') === 'oui');
verifie('« vas-y »', R('vas-y') === 'oui');
verifie('« c\'est bon »', R('c\'est bon') === 'oui');
verifie('« quand même ! »', R('quand même !') === 'oui');

titre('Un refus tape vaut l annulation');
verifie('« non »', R('non') === 'non');
verifie('« laisse tomber »', R('laisse tomber') === 'non');
verifie('« n\'ajoute pas »', R('n\'ajoute pas') === 'non');
verifie('« pas maintenant »', R('pas maintenant') === 'non');

titre('Le reste n est pas une reponse');
verifie('« enlève le samedi » n est ni oui ni non', R('enlève le samedi') === null, 'sinon une demande serait prise pour un accord');
verifie('« valide ton adresse email » non plus', R('mon email est valide') === null);
verifie('« ok mais plutôt à 10h » : c est un oui ?', R('ok mais plutôt à 10h') === 'oui',
  'commence par ok : on prend le oui ; la suite partira au modele dans un second message');

titre('Ce qui attend : proposition, conflit, ou rien');
{
  const prop = { role: 'assistant', content: 'Voilà\n[AGENDA]\n...\n[/AGENDA]', tempId: 't1' };
  ctx.charlyIA.history = [{ role: 'user', content: 'tennis' }, prop];
  verifie('une proposition non validee attend', ctx.tcPropositionEnAttente() === prop);
  prop._validated = true;
  verifie('validee, plus rien n attend', ctx.tcPropositionEnAttente() === null);

  const conflit = { role: 'system_info', content: '⚠️', conflictData: { conflicts: [], msg: prop } };
  ctx.charlyIA.history.push(conflit);
  verifie('un conflit signale attend', ctx.tcConflitEnAttente() === conflit);
  ctx.tcForceAdd = ctx.forceAddDespiteConflict;
  ctx.forceAddDespiteConflict();
  verifie('« ajouter quand meme » ajoute', ajoutsForces === 1);
  verifie('et marque le conflit repondu', conflit._resolu === true && ctx.tcConflitEnAttente() === null,
    'sinon un « oui » tape ensuite ajouterait une deuxieme fois');

  const conflit2 = { role: 'system_info', content: '⚠️', conflictData: { conflicts: [], msg: prop } };
  ctx.charlyIA.history.push(conflit2);
  ctx.cancelConflictedAdd();
  verifie('« annuler » marque aussi le conflit repondu', conflit2._resolu === true && ctx.tcConflitEnAttente() === null);
  verifie('et le dit', ctx.charlyIA.history.some((m) => /Ajout annulé/.test(m.content)));
}

titre('Un doublon exact n est pas un conflit');
{
  ctx.events = [{ date: '2026-10-29', title: 'Cours de tennis', startH: 9, startM: 0, endH: 10, endM: 30 }];
  const identique = { date: '2026-10-29', title: 'Cours de tennis', startH: 9, startM: 0, endH: 10, endM: 30 };
  const chevauche = { date: '2026-10-29', title: 'Dentiste', startH: 9, startM: 30, endH: 10, endM: 0 };
  const accents = { date: '2026-10-29', title: 'cours de TENNIS', startH: 9, startM: 0, endH: 10, endM: 30 };
  verifie('le meme cours, meme heure : deja present', ctx.tcDoublonExact('2026-10-29', identique) === true);
  verifie('majuscules et accents ne comptent pas', ctx.tcDoublonExact('2026-10-29', accents) === true);
  verifie('un autre rendez-vous qui chevauche n est pas un doublon', ctx.tcDoublonExact('2026-10-29', chevauche) === false);
  verifie('detectConflicts ne signale pas le doublon', ctx.detectConflicts([identique]).length === 0,
    'la capture : « Cours de tennis — conflit avec Cours de tennis »');
  verifie('mais signale toujours un vrai chevauchement', ctx.detectConflicts([chevauche]).length === 1);
}

titre('Le branchement est en place dans la source');
{
  const envoi = extraire('charlySendMessage') || '';
  verifie('l interception precede les salutations',
    envoi.indexOf('tcConflitEnAttente()') > -1 && envoi.indexOf('tcConflitEnAttente()') < envoi.indexOf('INTERCEPTION SALUTATIONS'));
  verifie('un oui valide la proposition par le bouton', /validateAgendaProposal\(proposition\.tempId \|\| ''\)/.test(envoi));
  verifie('un oui sur un conflit ajoute quand meme', /if \(conflit\) forceAddDespiteConflict\(\);/.test(envoi));
  verifie('un non sur un conflit annule', /if \(conflit\) \{ cancelConflictedAdd\(\); \}/.test(envoi));
  verifie('la boucle d ajout saute un doublon exact', /if \(tcDoublonExact\(dateStr, p\)\) \{ doublons\+\+; return; \}/.test(page));
  verifie('et le message final le dit', /non dupliqué/.test(page));
  verifie('tout en doublon : « rien a ajouter »', /Déjà dans ton agenda, rien à ajouter/.test(page));
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
