// Charly ne doit plus citer un rendez-vous supprime a la main.
//
// Capture du 04/10 : « tu as deja ton travail note de 11h a 13h ce
// vendredi-la » -- supprime cinq minutes plus tot. L'agenda reel etait a
// jour ; mais la carte [AGENDA] de son ancien message partait aussi,
// et il a cru sa memoire.
//
// On rejoue le scenario sur les vraies fonctions : une conversation ou
// Charly a cree le rendez-vous, un agenda d'ou il a disparu, et ce qui
// part au modele.
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

const FIXE = new Date(2026, 9, 4, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}

const carte = 'Parfait ! 🎉\n[AGENDA]\n2026-10-16 | 11:00-13:00 | Travail | travail\n2026-10-17 | 11:00-13:00 | Travail | travail\n[/AGENDA]\nAutre chose à ajouter ?';
const ctx = {
  console, String, Number, Array, Object, RegExp, JSON, Date: DateFixe,
  mode: 'user',
  events: [],
  charlyIA: { history: [] }
};
vm.createContext(ctx);
['tcISO', 'tcComparerEvenements', 'tcHistoriquePourIA', 'tcAgendaSnapshotPourIA'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Le scenario de Charles : cree par Charly, supprime a la main');
{
  ctx.charlyIA.history = [
    { role: 'user', content: 'tous les jours de 11h à 13h travail jusqu\'à fin octobre' },
    { role: 'assistant', content: carte, tempId: 't1', _validated: true },
    { role: 'system_info', content: '✅ 2 créneaux ajoutés à ton agenda — 16 oct. 2026, 17 oct. 2026' },
    { role: 'user', content: 'Le vendredi 16 octobre bloque-moi de 9h à 18h pour mon temps libre' }
  ];
  // Le 16 a ete supprime a la main : seul le 17 reste.
  ctx.events = [{ date: '2026-10-17', startH: 11, startM: 0, endH: 13, endM: 0, title: 'Travail', mode: 'user' }];

  const envoyes = ctx.tcHistoriquePourIA();
  const texte = envoyes.map((m) => m.content).join('\n');
  verifie('le 16 octobre ne part plus dans l historique', texte.indexOf('2026-10-16') < 0,
    'avant : la carte entiere partait, et le modele la croyait');
  verifie('la carte est remplacee par une mention', /proposition d'agenda faite/.test(texte));
  verifie('la prose de Charly est conservee', /Parfait/.test(texte) && /Autre chose/.test(texte));
  verifie('les messages de l utilisateur partent intacts', envoyes[0].content === ctx.charlyIA.history[0].content);
  verifie('system_info ne part pas', envoyes.length === 3);
  verifie('l ordre est garde', envoyes[0].role === 'user' && envoyes[1].role === 'assistant' && envoyes[2].role === 'user');

  const agenda = ctx.tcAgendaSnapshotPourIA();
  verifie('l agenda reel ne liste pas le 16', agenda.indexOf('2026-10-16') < 0);
  verifie('mais liste bien le 17', agenda.indexOf('2026-10-17') > -1);
  verifie('et dit que sa memoire ne fait pas foi', /la liste ci-dessus a raison, pas ta mémoire|la liste ci-dessus a raison, pas ta memoire/.test(agenda));
}

titre('Un message sans carte est inchange');
{
  ctx.charlyIA.history = [{ role: 'assistant', content: 'Bonjour ! Que puis-je faire ?' }];
  verifie('rien a retirer, rien retire', ctx.tcHistoriquePourIA()[0].content === 'Bonjour ! Que puis-je faire ?');
}

titre('Les deux chemins (OpenAI, Anthropic) passent par le meme filtre');
{
  const n = (page.match(/\.\.\.tcHistoriquePourIA\(\)/g) || []).length;
  verifie('deux sites d appel utilisent tcHistoriquePourIA', n === 2, 'trouve ' + n);
  verifie('plus aucun envoi direct de charlyIA.history au modele',
    !/charlyIA\.history\.filter\(m => m\.role==='user' \|\| m\.role==='assistant'\)\.map\(m => \(\{role:m\.role, content:m\.content\}\)\)/.test(page));
}

titre('Plus de « Sauf erreur de ma part »');
{
  const n = (page.match(/Sauf erreur de ma part, /g) || []).length;
  verifie('aucune phrase ne commence plus par la formule', n === 0, 'reste ' + n);
  verifie('la consigne l interdit', /Ne dis JAMAIS "Sauf erreur de ma part"/.test(page));
  verifie('la consigne ne la RESERVE plus', !/est RESERVEE aux cas/.test(page));
  verifie('les phrases en dur reprennent une majuscule', /"Je ne vois aucun rendez-vous correspondant/.test(page) && /"Tu as plusieurs rendez-vous/.test(page));
}

titre('Le chevauchement donne une carte, pas une question');
{
  verifie('la regle CHEVAUCHEMENT est dans la consigne', /CHEVAUCHEMENT : si un créneau demandé recouvre/.test(page));
  verifie('avec l exemple 9h-18h autour de 11h-13h', /09:00-11:00 et 13:00-18:00/.test(page));
  verifie('et l interdiction de la question en texte', /ne pose JAMAIS la question en texte/.test(page));
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
