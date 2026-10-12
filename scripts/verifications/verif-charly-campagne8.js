// Mission 11 (campagne 8, 12/10) : date fixee dimanche 11/10/2026 14h20, agenda de la campagne 8.
//  1. Un vrai conflit : la phrase est ecrite par la page (date exacte, rendez-vous reels, plages libres du jour).
//  2. « deplacement » (nom) n est jamais pris pour un ordre : « ajoute un deplacement a Lyon jeudi 9h » cree.
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
const ev = (id, date, h1, m1, h2, m2, title) => ({ id, mode: 'user', date, startH: h1, startM: m1, endH: h2, endM: m2, title });
// Campagne 8 : mardi 13 = Rdv banque 10-11, Rendez-vous dentiste 15-16, Formation 15-17, Dr. Martin 16-17 ; jeudi 15 = 5 rdv.
const AGENDA = () => [
  ev('b1', '2026-10-13', 10, 0, 11, 0, 'Rdv banque'), ev('b2', '2026-10-13', 15, 0, 16, 0, 'Rendez-vous dentiste'), ev('b3', '2026-10-13', 15, 0, 17, 0, 'Formation'), ev('b4', '2026-10-13', 16, 0, 17, 0, 'Rendez-vous Dr. Martin'),
  ev('j1', '2026-10-15', 9, 0, 10, 0, 'Appel fournisseur'), ev('j2', '2026-10-15', 11, 0, 12, 0, 'Rendez-vous avec Estelle'), ev('j3', '2026-10-15', 14, 0, 15, 0, 'Point'), ev('j4', '2026-10-15', 15, 0, 16, 0, 'Coach'), ev('j5', '2026-10-15', 17, 0, 18, 0, 'Sport'),
  Object.assign(ev('f1', '2026-10-14', 0, 0, 0, 0, 'Férié'), { allDay: true }),
];
const ctx = { console, Number, String, Date, RegExp, Array, Object, Math, events: AGENDA(), mode: 'user', charlyIA: { history: [] } };
vm.createContext(ctx);
['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', "const TC_MOTS_CREUX = new Set\\([\\s\\S]*?\\.split\\(' '\\)\\);"]
  .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcEvenementFin', 'tcEvenementCouvre', 'tcHeureDansTexte', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande',
  'tcBlocAgendaDepuisAnnonce', 'tcPlusieursDatesOuRelatif', 'tcCorrigerPropositionsCharly', 'tcJoursCites', 'tcAnnonceUnConflit', 'tcMotsDeRdv', 'tcTitreContient', 'tcFormaterHeure', 'tcFormaterDateHumaine',
  'tcVerbeConjugue', 'tcEstDeplacement', 'tcHeureCourte', 'tcPlagesLibresDuJour', 'tcPhraseConflitLocale', 'tcIgnorerFauxConflit', 'tcQuestionRdvDuJour', 'tcListeDuJourPourDeplacement', 'tcRdvNommeIntrouvable', 'tcRepondreObjetDonne']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Un seul detecteur de verbe de deplacement, conjugue');
const D = (x) => ctx.tcEstDeplacement(x);
verifie('« ajoute un déplacement à Lyon jeudi 9h », « mets mon déplacement à Paris », « un reportage photo », « une avancée » → pas un ordre', !D('ajoute un déplacement à Lyon jeudi 9h') && !D('mets mon déplacement à Paris vendredi') && !D('ajoute un reportage photo samedi 10h') && !D('note une avancée du projet lundi 9h'));
verifie('décale, déplace, les déplacer, déplaçons, reporte, repousse, avance, bouge, change, modifie, remplace, reprogramme → un ordre', ['décale mon rdv', 'déplace le dentiste', 'tu peux les déplacer', 'déplaçons le point', 'reporte mon dentiste', 'repousse la formation', 'avance le coach', 'bouge le sport', 'change le rdv', 'modifie le rdv', 'remplace le rdv', 'reprogramme la réunion'].every(D));
verifie('tcRdvNommeIntrouvable et tcListeDuJourPourDeplacement passent par le meme detecteur', /tcVerbeConjugue\('deplacement'\)/.test(fonction(page, 'tcRdvNommeIntrouvable')) && /tcVerbeConjugue\('modification'\)/.test(fonction(page, 'tcEstDeplacement')) && /tcEstDeplacement\(texte\)/.test(fonction(page, 'tcListeDuJourPourDeplacement')) && /tcEstDeplacement\(text\)/.test(fonction(page, 'tcTraiterDeplacement')));
verifie('« ajoute un déplacement à Lyon jeudi 9h » : plus de « lequel ? » (liste du jour) ni de « introuvable »', ctx.tcListeDuJourPourDeplacement('Tu as 5 rendez-vous jeudi 15 octobre : … lequel ?', 'ajoute un déplacement à Lyon jeudi 9h', NOW, ctx.events, 'user') === null && ctx.tcRdvNommeIntrouvable('ajoute un déplacement à Lyon jeudi 9h', NOW, ctx.events, 'user') === null);
const cree = ctx.tcRepondreObjetDonne('C’est pour quoi, à 9h ?', 'ajoute un déplacement à Lyon jeudi 9h', NOW);
verifie('et la page propose « Déplacement à Lyon » jeudi 15 octobre à 9h (la creation)', /2026-10-15 \| 09:00-10:00 \| Déplacement à Lyon \| rdv/.test(cree || ''), cree);

titre('2. Les plages libres d un jour, calculees par la page');
const duJour = (d) => ctx.events.filter((e) => ctx.tcEvenementCouvre(e, d));
const L = (d) => ctx.tcPlagesLibresDuJour(duJour(d)).map((l) => ctx.tcHeureCourte(l.debut) + '-' + ctx.tcHeureCourte(l.fin)).join(', ');
verifie('mardi 13 (banque 10-11, dentiste 15-16, formation 15-17, Dr Martin 16-17) → 8h-10h, 11h-15h, 17h-19h', L('2026-10-13') === '8h-10h, 11h-15h, 17h-19h', L('2026-10-13'));
verifie('jeudi 15 (5 rdv) → 8h-9h, 10h-11h, 12h-14h, 16h-17h, 18h-19h', L('2026-10-15') === '8h-9h, 10h-11h, 12h-14h, 16h-17h, 18h-19h', L('2026-10-15'));
verifie('un jour vide → 8h-19h ; une journee entiere (ferie) ne bloque pas les heures', L('2026-10-16') === '8h-19h' && L('2026-10-14') === '8h-19h');
verifie('une demi-heure se dit « 10h30 »', ctx.tcHeureCourte(630) === '10h30' && ctx.tcHeureCourte(540) === '9h');

titre('3. Un vrai conflit : la phrase de la page, pas celle du modele');
const FC = (r, u) => ctx.tcIgnorerFauxConflit(r, u, NOW, ctx.events, 'user');
const f1 = FC('Le mardi 15 octobre 2026 à 15h, il y a déjà un rendez-vous avec le dentiste de 15h à 16h. Créneaux libres autour : 10:00-11:00, 16:00-17:00', 'rdv dentiste mardi 15h');
verifie('« rdv dentiste mardi 15h » : date exacte, LES rendez-vous en conflit (dentiste ET formation), plages libres exactes', f1 === 'Mardi 13 octobre 2026 à 15h, tu as déjà « Rendez-vous dentiste » (15h-16h) et « Formation » (15h-17h). Ce jour-là, il reste : 8h-10h, 11h-15h, 17h-19h. Dis-moi quel créneau te va.', f1);
const f2 = FC('Mardi 13 octobre 2026 à 10h, il y a déjà un rendez-vous à la banque de 10h à 11h. Créneaux libres : 11:00-15:00', 'Tu peux me mettre un dentiste mardi 10h ?');
verifie('« un dentiste mardi 10h » : un seul conflit, la banque', f2 === 'Mardi 13 octobre 2026 à 10h, tu as déjà « Rdv banque » (10h-11h). Ce jour-là, il reste : 8h-10h, 11h-15h, 17h-19h. Dis-moi quel créneau te va.', f2);
verifie('la prose du modele (« mardi 15 octobre », « 10:00-11:00 ») n apparait plus', !/15 octobre|10:00-11:00/.test(f1));
verifie('un creneau libre garde la proposition de la mission 5', /Je te propose/.test(FC('Mardi 9h est déjà pris.', 'rdv dentiste mardi 9h') || ''));
verifie('pas de conflit annonce → rien ; deux demandes → rien ; un deplacement → rien', FC('C’est noté.', 'rdv dentiste mardi 15h') === null && FC('Jeudi 14h est pris.', 'dentiste demain 10h et coach jeudi 14h') === null && FC('Mardi 16h est pris.', 'décale mon rdv de mardi à 16h') === null);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
