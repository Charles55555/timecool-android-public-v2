// Mission 13 (campagne 9, 12/10) : date fixee dimanche 11/10/2026 14h20, agenda de la campagne 9.
//  1. Une proposition non validee ne part plus au modele ; une nouvelle demande la ferme (« J ai laisse tomber la proposition
//     precedente ») et est traitee normalement ; « annule le dentiste » n est plus pris pour le choix d une carte de periode.
//  2. « decale mon rdv de mardi a 16h » quand le modele vise un rendez-vous inexistant → « lequel ? » avec la liste reelle.
//  3. Conflit local sur une proposition → phrase de la page seule ; « C est fait » filtre sans action.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 280) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const NOW = new Date(2026, 9, 11, 14, 20, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW.getTime()); } static now() { return NOW.getTime(); } }
const ev = (id, date, h1, m1, h2, m2, title) => ({ id, mode: 'user', date, startH: h1, startM: m1, endH: h2, endM: m2, title });
// Campagne 9 (apres suppression du dentiste) : mardi 13 = Rdv banque 10-11, Formation 15-17, Dr. Martin 16-17 ; vendredi 16 = Revue budget 14-16, coiffeur 17-18.
const AGENDA = () => [
  ev('b1', '2026-10-13', 10, 0, 11, 0, 'Rdv banque'), ev('b3', '2026-10-13', 15, 0, 17, 0, 'Formation'), ev('b4', '2026-10-13', 16, 0, 17, 0, 'Rendez-vous Dr. Martin'),
  ev('c1', '2026-10-16', 14, 0, 16, 0, 'Revue budget'), ev('c2', '2026-10-16', 17, 0, 18, 0, 'Rendez-vous coiffeur'),
];
const ctx = { console, Number, String, Date: DateFixe, RegExp, Array, Object, Math, JSON, Set, events: AGENDA(), mode: 'user', charlyIA: { history: [] }, periodeCtx: null,
  tcPeriodeContexte: () => ctx.periodeCtx, tcContactDuRdv: () => null, tcAppliquerDeplacement() { ctx.applique = true; }, _tcLigneRdv: (e) => e.title };
vm.createContext(ctx);
['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', "const TC_MOTS_CREUX = new Set\\([\\s\\S]*?\\.split\\(' '\\)\\);"]
  .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcEvenementFin', 'tcEvenementCouvre', 'tcHeureDansTexte', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande',
  'tcBlocAgendaDepuisAnnonce', 'tcPlusieursDatesOuRelatif', 'tcCorrigerPropositionsCharly', 'tcJoursCites', 'tcMotsDeRdv', 'tcTitreContient', 'tcFormaterHeure', 'tcFormaterDateHumaine',
  'tcVerbeConjugue', 'tcEstDeplacement', 'tcHeureCourte', 'tcPlagesLibresDuJour', 'tcPhraseConflitLocale', 'tcQuestionRdvDuJour', 'tcDeplacementHorsJour', 'tcRdvRemplace',
  'extractAgendaProposals', 'tcDeplacementsProposes', 'tcTraiterDeplacement', 'tcHistoriquePourIA', 'tcChoixPeriode', 'tcAbandonnerAttente', 'tcEstUneNouvelleDemande',
  'tcReponseConflitLocale', 'tcSansFormulesFaites']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Une proposition non validee n existe pas pour la suite');
const carte = 'Le mardi 13 octobre 2026 à 15h, c’est noté.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]';
ctx.charlyIA.history = [{ role: 'user', content: 'rdv dentiste mardi 15h' }, { role: 'assistant', content: carte, tempId: 't1' }, { role: 'user', content: 'décale mon rdv de mardi à 16h' }];
let envoye = ctx.tcHistoriquePourIA().map((m) => m.content).join('\n');
verifie('la carte NON validee ne part plus au modele (remplacee par une mention « non ajoutee »)', envoye.indexOf('2026-10-13 | 15:00-16:00') < 0 && /proposition d'agenda NON ajoutee/.test(envoye), envoye.slice(0, 200));
ctx.charlyIA.history[1]._validated = true;
envoye = ctx.tcHistoriquePourIA().map((m) => m.content).join('\n');
verifie('la carte validee non plus (comme avant), la prose reste', envoye.indexOf('2026-10-13 | 15:00-16:00') < 0 && /proposition d'agenda faite/.test(envoye) && /c’est noté/.test(envoye));
ctx.charlyIA.history = [];
ctx.tcAbandonnerAttente('proposition'); ctx.tcAbandonnerAttente('ajout'); ctx.tcAbandonnerAttente('annulation');
verifie('une nouvelle demande ferme la proposition : « J’ai laissé tomber la proposition précédente. Je passe à ta nouvelle demande. »', ctx.charlyIA.history[0].content === 'J’ai laissé tomber la proposition précédente. Je passe à ta nouvelle demande.' && ctx.charlyIA.history[1].content === ctx.charlyIA.history[0].content && /l’annulation qui attendait/.test(ctx.charlyIA.history[2].content));
const csm = fonction(page, 'charlySendMessage') || '';
const blocAbandon = csm.slice(csm.indexOf("if (reponse === null && tcEstUneNouvelleDemande(text)) {"), csm.indexOf("if (reponse === null && tcEstUneNouvelleDemande(text)) {") + 260);
verifie('…puis la nouvelle demande continue son chemin (pas de return apres l abandon)', blocAbandon.indexOf('tcAbandonnerAttente(') > -1 && !/return;/.test(blocAbandon.slice(0, blocAbandon.indexOf('}') + 1)));
ctx.periodeCtx = { contrainte: false };
verifie('carte de periode en attente : « annule le dentiste » n est PAS le choix « annuler » (nouvelle demande)', ctx.tcChoixPeriode('annule le dentiste') === null && ctx.tcChoixPeriode('rdv coach vendredi 15h') === null);
verifie('mais « annule », « annule-les », « 2 », « rien », « déplace-les » restent des choix', ctx.tcChoixPeriode('annule') === 'annuler' && ctx.tcChoixPeriode('annule-les') === 'annuler' && ctx.tcChoixPeriode('2') === 'annuler' && ctx.tcChoixPeriode('rien') === 'rien' && ctx.tcChoixPeriode('déplace-les') === 'deplacer');
ctx.periodeCtx = null;

titre('2. « décale mon rdv de mardi à 16h » : jamais une creation');
ctx.charlyIA.history = []; ctx.applique = false;
const reponseModele = { role: 'assistant', content: 'Tu as un rendez-vous chez le dentiste mardi à 15h. Je le décale à 16h tout de suite.\n[AGENDA]\n2026-10-13 | 16:00-17:00 | Rendez-vous dentiste | sante\n[/AGENDA]' };
const pris = ctx.tcTraiterDeplacement(reponseModele, 'décale mon rdv de mardi à 16h');
verifie('le modele vise un dentiste qui n existe pas → la page demande lequel des 3 rendez-vous reels de mardi', pris === true && reponseModele._validated === true && ctx.charlyIA.history.length === 1 && ctx.charlyIA.history[0].content === 'Tu as 3 rendez-vous mardi 13 octobre : « Rdv banque » 10h, « Formation » 15h, « Rendez-vous Dr. Martin » 16h — lequel ?', ctx.charlyIA.history[0] && ctx.charlyIA.history[0].content);
verifie('rien n est cree ni deplace', ctx.events.length === 5 && !ctx.applique && !ctx.events.some((e) => /dentiste/i.test(e.title)));
ctx.charlyIA.history = [];
verifie('sans jour de depart (« décale le dentiste à 16h ») : pas un deplacement, creation ordinaire (comme avant)', ctx.tcTraiterDeplacement({ role: 'assistant', content: reponseModele.content }, 'décale le dentiste à 16h') === false);

titre('3. Conflit local → la phrase de la page seule ; « C est fait » filtre');
const C = (r, u) => ctx.tcReponseConflitLocale(r, u, NOW, ctx.events, 'user');
const r1 = C('Pour annuler le rendez-vous chez le dentiste, écris-moi par exemple : "annule le rdv dentiste mardi 15h." Je l’ajoute pour toi.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]\nC’est fait ! 😊', 'rdv dentiste mardi 15h');
verifie('« rdv dentiste mardi 15h » en conflit avec Formation → phrase de la page + bloc, sans la prose du modele', r1 === 'Mardi 13 octobre 2026 à 15h, tu as déjà « Formation » (15h-17h). Ce jour-là, il reste : 8h-10h, 11h-15h, 17h-19h. Dis-moi quel créneau te va.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]', r1);
const r2 = C('Vendredi 16 octobre 2026 à 15h. C’est parti !\n[AGENDA]\n2026-10-16 | 15:00-16:00 | Coach | sport\n[/AGENDA]\nC’est fait !', 'rdv coach vendredi 15h');
verifie('« rdv coach vendredi 15h » (Revue budget 14h-16h) → Revue budget cite, plages libres (8h-14h, 16h-17h, 18h-19h)', /^Vendredi 16 octobre 2026 à 15h, tu as déjà « Revue budget » \(14h-16h\)\. Ce jour-là, il reste : 8h-14h, 16h-17h, 18h-19h\./.test(r2 || ''), r2);
verifie('creneau libre, deplacement, deux lignes ou periode → rien', C('[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]', 'rdv X mardi 11h') === null && C('[AGENDA]\n2026-10-13 | 16:00-17:00 | Rdv banque | travail\n[/AGENDA]', 'décale mon rdv de mardi à 16h') === null && C('[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n2026-10-14 | 15:00-16:00 | X | rdv\n[/AGENDA]', 'x') === null && C('[AGENDA]\n2026-10-13 | 00:00-23:59 | Voyage | voyages\n[/AGENDA]', 'voyage mardi') === null);
const F = (r) => ctx.tcSansFormulesFaites(r);
verifie('« C’est fait ! », « C’est noté », « C’est parti ! », « je l’ai ajouté » sont retires quand un bloc attend', F('Je l’ajoute pour toi.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]\nC’est fait ! 😊') === 'Je l’ajoute pour toi.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]' && !/noté|parti|ajouté/.test(F('C’est noté. C’est parti ! Je l’ai ajouté.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]')), F('Je l’ajoute pour toi.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]\nC’est fait ! 😊'));
verifie('sans bloc, la reponse est laissee telle quelle (« C’est fait » d un vrai compte rendu de la page n est pas touche)', F('C’est fait, rendez-vous déplacé.') === 'C’est fait, rendez-vous déplacé.');
verifie('charlySendMessage applique les deux apres l accord de la prose', /reply = tcAccorderProseAuBloc\(reply\);\n(\s*\/\/[^\n]*\n)*\s+reply = tcReponseConflitLocale\(reply, text, new Date\(\), events, mode\) \|\| reply;\s+reply = tcSansFormulesFaites\(reply\);/.test(csm));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
