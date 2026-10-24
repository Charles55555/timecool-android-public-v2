// « Charly ne répond que s'il est sûr d'avoir compris, sinon il demande » (mission 50, chef, 24/10, ok de Charles).
//
// Avant tout détecteur et avant le modèle, charlySendMessage classe le message (tcClasserMessage) : « claire » (il suit
// son chemin) ou « pas sûr » (contestation, doute, remerciement, salutation, réaction, mot seul, hors sujet) : une seule
// phrase calme qui demande, aucune action. Du code, le même quel que soit le modèle, un score d'indices et un seuil.
// Garde-fou : au moins 20 phrases pièges qui doivent produire une question, 10 demandes claires qui doivent passer.
// Usage : node verif-classement-charly.js <index.html>
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : ''));
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
function extraireConst(nom, fin) {
  const m = page.match(new RegExp('const ' + nom + ' = [\\s\\S]*?' + (fin || ';\\n')));
  return m ? m[0] : null;
}

titre('0. La page : le bloc, sa place dans charlySendMessage, la nature des réponses');
const debutBloc = page.indexOf('   CLASSER AVANT DE RÉPONDRE (mission 50');
const finBloc = page.indexOf("/** La phrase de Charly quand il n'a pas compris, avec sa question de reformulation. */");
const bloc = (debutBloc > -1 && finBloc > debutBloc) ? page.slice(page.lastIndexOf('/*', debutBloc), finBloc) : '';
verifie('le bloc « classer avant de répondre » existe, juste avant tcPhraseNonCompris', bloc.length > 2000 && bloc.indexOf('function tcClasserMessage(') > -1 && bloc.indexOf('const TC_CLASSE_SEUIL = ') > -1, bloc.length);
verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page (Safari)', bloc.indexOf('—') < 0 && !/\(\?<[=!]/.test(page));
const csm = extraire('charlySendMessage') || '';
const iClasse = csm.indexOf('const _classe = tcClasserMessage(text, charlyIA.history);');
const iSalut = csm.indexOf('if (_isGreet && _isFirst) {');
const iPrev = csm.indexOf('const _prevenance = tcDetecterPrevenance(text);');
const iModele = csm.indexOf('reply = await callOpenAI(messages);');
verifie('charlySendMessage classe le message après la salutation du premier message, avant le premier détecteur et le modèle', iClasse > -1 && iSalut > -1 && iPrev > -1 && iSalut < iClasse && iClasse < iPrev && iPrev < iModele, [iSalut, iClasse, iPrev, iModele].join(' '));
verifie('« pas sûr » : la bulle de l utilisateur, la question (nature question), et on s arrête (return), sans rien d autre', /if \(_classe\.classe !== 'claire'\) \{\s+tcPousserMessageUtilisateur\(text\);\s+await new Promise\(r => setTimeout\(r, 400\)\);\s+charlyIA\.history\.push\(\{ role: 'assistant', content: _classe\.question, nature: _classe\.classe === 'au_revoir' \? 'reponse' : 'question', _classement: _classe\.classe \}\);\s+renderCharlyChat\(\);\s+return;\s+\}/.test(csm));
const attentes = ['if (_tcQuestionnaire) {', 'if (_tcDeplacementEnAttente) {', 'if (_tcSuppressionEnAttente) {', 'const conflit = tcConflitEnAttente();'];
verifie('les réponses attendues (questionnaire, déplacement, annulation, proposition) sont lues AVANT le classement', attentes.every((a) => csm.indexOf(a) > -1 && csm.indexOf(a) < iClasse), attentes.map((a) => csm.indexOf(a)).join(' '));
verifie('la réponse du modèle porte sa nature (charlySendMessage et charlyProcessMessage)', (page.match(/charlyIA\.history\.push\(\{role:'assistant', content:tcReplyOuRepli\(reply\), tempId, nature: tcNatureReponse\(reply\)\}\);/g) || []).length === 2);

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id, title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
const agenda = () => [
  ev('dentiste', 'Dentiste', 1, 15, 0, 16, 0, { contact: 'c1' }),
  ev('golf', 'Partie de golf', 4, 14, 0, 16, 0),
  ev('dejeuner', 'Déjeuner avec Sophie', 5, 12, 30, 14, 0, { contact: 'c2' })
];
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, Set, Math, JSON, parseInt, isNaN, Date: DateFixe,
  mode: 'user', events: agenda(), charlyIA: { history: [] }, currentLanguage: 'fr',
  contactsList: [{ id: 'c1', name: 'Marc Dupont', phone: '06' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }, { id: 'c3', name: 'Paul Martin', referenceCompte: 'R3' }],
  setTimeout: (f) => { if (f) f(); return 0; }, localStorage: { getItem: () => null },
  tcFormaterDateHumaine: (d) => d, escapeHTMLSafe: (t) => String(t), renderCharlyChat() {}, tcDefinirStatutCharly() {}
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcSuppressionChoix = null;', ctx);
['TC_JOURS_SEMAINE', 'TC_MOIS', 'TC_PROFESSIONS', 'TC_TRAJET_DECLENCHEURS', 'TC_WEB_DECLENCHEURS', 'TC_MOTS_CREUX', 'TC_VERBES_DE_DEMANDE', 'TC_JOURS_FR', 'TC_MOIS_FR', 'TC_PETITS_MOTS'].forEach((c) => {
  const src = extraireConst(c, c === 'TC_MOTS_CREUX' ? "\\.split\\(' '\\)\\);\\n" : (/DECLENCHEURS|PROFESSIONS|VERBES_DE_DEMANDE|PETITS_MOTS/.test(c) ? '\\];\\n' : ';\\n'));
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  constante introuvable : ' + c); }
});
['tcSansAccents', 'tcISO', 'tcContientMot', 'tcHeureDansTexte', 'tcHorairePlage', 'tcFormaterHeure', 'tcComparerEvenements',
 'tcPeriodeAgenda', 'tcJoursNommes', 'tcPeriodeContrainte', 'tcPeriodeJourNomme', 'tcPeriodeCoherente', 'tcBorneDeFin', 'tcJoursDansTexte',
 'parseFrenchDateFromText', 'tcContactDuRdv', 'tcMotsDeRdv', 'tcTitreContient', 'tcMotDeLAgenda', 'tcPlageImprevu',
 'tcDetecterMalade', 'tcDetecterContrainte', 'detecterSuppressionRdv', 'tcDetecterPrevenance',
 'detecterConsultationAgenda', 'detecterDemandeCreneau',
 'extraireLieuDuTexte', 'detecterRechercheProfessionnel', 'extraireAdresseDuTexte', 'detecterDemandeTrajet', 'detecterRechercheWeb',
 'tcEstDeplacement', 'tcVerbeConjugue', 'tcDetecterMarcheArriere', 'tcEstUneReprise',
 'tcCreationLocale', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcJoursCites', 'tcDateEnLettres',
 'tcMotsUtiles', 'tcContactsParMots', 'tcLangueCourante', 'tcDetecterRdvGroupe', 'tcMotsDuTexte', 'tcComptesCitesDansTexte'
].forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (bloc) vm.runInContext(bloc, ctx);
if (ko) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }

verifie('les détecteurs chargés répondent (tcCreationLocale sur « rdv coiffeur mardi 15h » propose un bloc)', /\[AGENDA\]/.test(ctx.tcCreationLocale('rdv coiffeur mardi 15h', new DateFixe())), ctx.tcCreationLocale('rdv coiffeur mardi 15h', new DateFixe()));

const classer = (t, histoire) => ctx.tcClasserMessage(t, histoire || []);
const estQuestion = (r) => r.classe !== 'claire' && typeof r.question === 'string' && /\?$/.test(r.question.trim()) && r.question.indexOf('[AGENDA]') < 0 && r.question.split(/[.!?]\s+/).length <= 2;

titre('1. Les phrases pièges : une question, jamais une action');
const pieges = [
  'Cv ?', 'Je t’ai pas demandé quand je suis libre ?', 'ok', '??', 'et ?', 'non pas ça', 'tu es sûr ?', 'merci', 'lundi', '14h',
  '?', 'ah bon', 'Dermatologue', 'Mercredi 15h', 'c’est pas ça', 'n’importe quoi', 'je ne t’ai rien demandé', 'hein ?', 'quoi ?',
  'il fait beau dehors', 'la vie est belle aujourd’hui', 'mdr', 'oui', 'non', 'bof', 'et alors ?', 'super', 'pourquoi ?', 'Demain',
  'vraiment ?', 'Demain après-midi', 'Marc', 'je sais pas', 'c’est tout', 'tu n’as rien compris', 'ça n’a rien à voir', 'bonjour Charly', 'cc'
];
let nbPieges = 0;
pieges.forEach((p) => {
  const r = classer(p);
  const ok = estQuestion(r);
  if (ok) nbPieges++;
  if (!ok) { ko++; console.log('  KO  piège « ' + p + ' » → ' + r.classe + ' : ' + (r.question || '(suit son chemin)') + (r.indices ? ' score ' + r.indices.score : '')); }
});
verifie(nbPieges + ' phrases pièges sur ' + pieges.length + ' produisent une question (au moins 20)', nbPieges === pieges.length && pieges.length >= 20);
verifie('« Cv ? » : pas compris, une question', classer('Cv ?').question === 'Sauf erreur de ma part, je n\'ai pas bien compris : qu’est-ce que tu veux que je fasse ?', classer('Cv ?').question);
verifie('« Je t’ai pas demandé quand je suis libre ? » : contestation, une excuse et la question de ce qu il voulait, jamais les créneaux', classer('Je t’ai pas demandé quand je suis libre ?').classe === 'contestation' && classer('Je t’ai pas demandé quand je suis libre ?').question === 'Pardon, j’ai répondu à côté : qu’est-ce que tu voulais ?', classer('Je t’ai pas demandé quand je suis libre ?').question);
verifie('« non pas ça », « c’est pas ça », « je ne t’ai rien demandé » : contestation', ['non pas ça', 'c’est pas ça', 'je ne t’ai rien demandé', 'n’importe quoi', 'tu n’as rien compris'].every((p) => classer(p).classe === 'contestation'));
verifie('« tu es sûr ? », « vraiment ? » : doute, Charly ne répète pas, il demande ce qui cloche', classer('tu es sûr ?').classe === 'doute' && classer('vraiment ?').question === 'Je peux me tromper : qu’est-ce qui ne te semble pas juste ?', classer('tu es sûr ?').question);
verifie('« merci », « super » : avec plaisir, et une question', classer('merci').question === 'Avec plaisir, tu veux autre chose ?' && classer('super').classe === 'remerciement');
verifie('« ok » : d accord, et une question', classer('ok').question === 'D’accord, tu veux autre chose ?');
verifie('« bonjour Charly » (pas le premier message) : bonjour, et une question', /^Bonjour ! Qu’est-ce que je peux faire pour toi \?$/.test(classer('bonjour Charly').question), classer('bonjour Charly').question);
verifie('« laisse tomber » : d accord, je laisse tomber, et une question', classer('laisse tomber').classe === 'abandon' && /\?$/.test(classer('laisse tomber').question));
verifie('« au revoir » : à bientôt, sans question (ce n est pas un doute)', classer('au revoir').classe === 'au_revoir' && !/\?/.test(classer('au revoir').question), classer('au revoir').question);

titre('2. La question dit ce que le message dit déjà : le moment, le contact, le métier');
verifie('« lundi » → « tu veux noter quelque chose lundi, ou autre chose ? »', classer('lundi').question === 'Sauf erreur de ma part, je n\'ai pas bien compris : tu veux noter quelque chose lundi, ou autre chose ?', classer('lundi').question);
verifie('« 14h » → « … à 14h, ou autre chose ? »', /tu veux noter quelque chose à 14h, ou autre chose \?$/.test(classer('14h').question), classer('14h').question);
verifie('« Mercredi 15h » → « … mercredi à 15h … »', /quelque chose mercredi à 15h, ou autre chose \?$/.test(classer('Mercredi 15h').question), classer('Mercredi 15h').question);
verifie('« Demain après-midi » → « … demain … »', /quelque chose demain, ou autre chose \?$/.test(classer('Demain après-midi').question), classer('Demain après-midi').question);
verifie('« Marc » → « … avec Marc Dupont … »', /quelque chose avec Marc Dupont, ou autre chose \?$/.test(classer('Marc').question), classer('Marc').question);
verifie('« Dermatologue » → « tu veux noter un rendez-vous « Dermatologue », ou autre chose ? »', /noter un rendez-vous « Dermatologue », ou autre chose \?$/.test(classer('Dermatologue').question), classer('Dermatologue').question);
verifie('« il fait beau dehors » (hors sujet) → la question générale', classer('il fait beau dehors').classe === 'hors_sujet' && /qu’est-ce que tu veux que je fasse \?$/.test(classer('il fait beau dehors').question));

titre('3. Les demandes claires passent (elles suivent leur chemin : détecteur ou modèle)');
const claires = [
  'mes rdv de demain', 'annule le golf', 'dentiste mardi 15h', 'propose-moi un créneau demain', 'préviens Marc que j’aurai 10 min de retard',
  'je suis malade', 'décale le golf à 15h', 'quand suis-je libre cette semaine ?', 'qu’est-ce que j’ai demain ?', 'je voudrais un rdv chez mon dentiste demain',
  'c’est gratuit ?', 'remets-les', 'ajoute un déjeuner avec ma mère samedi midi', 'je vais chez le dentiste mardi à 15h', 'trouve-nous un créneau avec Marc Dupont et Sophie Anceau',
  'qui es-tu ?', 'tu sais faire quoi ?', 'et demain ?', 'cette semaine ?', 'annule', 'je ne pourrai pas honorer mes rdv demain', 'j’ai un imprévu',
  'rdv coiffeur jeudi 18h', 'combien de temps pour aller à la gare ?', 'peux-tu me rappeler mon prochain rendez-vous ?', 'Je veux créer un nouveau rendez-vous',
  'mets-moi un rendez-vous cet après-midi à 15h chez mon avocat', 'pas ça, annule plutôt le golf', 'synchronise avec google agenda', 'dentiste demain'
];
let nbClaires = 0;
claires.forEach((p) => {
  const r = classer(p);
  if (r.classe === 'claire') nbClaires++;
  else { ko++; console.log('  KO  demande claire « ' + p + ' » → ' + r.classe + ' : ' + r.question + (r.indices ? ' score ' + r.indices.score : '')); }
});
verifie(nbClaires + ' demandes claires sur ' + claires.length + ' passent (au moins 10)', nbClaires === claires.length && claires.length >= 10);
verifie('« pas ça, annule plutôt le golf » : la nouvelle demande après la contestation passe', classer('pas ça, annule plutôt le golf').classe === 'claire');

titre('4. Le contexte : une réponse à la question de Charly passe ; après ma propre question, on redemande avec des exemples');
const apresModele = [{ role: 'user', content: 'Demain 16h' }, { role: 'assistant', content: 'C’est pour quoi, à 16h ?' }];
verifie('« dentiste » après « C’est pour quoi, à 16h ? » : une réponse, elle passe', classer('dentiste', apresModele).classe === 'claire' && classer('dentiste', apresModele).raison === 'reponse');
verifie('« oui » et « lundi » après une question du modèle : des réponses, elles passent', classer('oui', apresModele).classe === 'claire' && classer('lundi', apresModele).classe === 'claire');
verifie('mais « c’est pas ça » et « tu es sûr ? » restent une contestation et un doute', classer('c’est pas ça', apresModele).classe === 'contestation' && classer('tu es sûr ?', apresModele).classe === 'doute');
verifie('et « merci » reste un remerciement', classer('merci', apresModele).classe === 'remerciement');
const apresMaQuestion = [{ role: 'user', content: 'Cv ?' }, { role: 'assistant', content: 'Sauf erreur de ma part, je n\'ai pas bien compris : qu’est-ce que tu veux que je fasse ?', nature: 'question', _classement: 'court' }];
verifie('« cv » encore, après ma question : la même question, avec deux exemples', classer('cv', apresMaQuestion).classe !== 'claire' && classer('cv', apresMaQuestion).question === 'Qu’est-ce que tu veux que je fasse, par exemple « mes rendez-vous de demain » ou « dentiste mardi 15h » ?', classer('cv', apresMaQuestion).question);
verifie('« mes rdv de demain » après ma question : claire', classer('mes rdv de demain', apresMaQuestion).classe === 'claire');
verifie('« dentiste » après ma question : toujours pas sûr, la question dit le métier (« tu veux noter un rendez-vous « dentiste » … »)', classer('dentiste', apresMaQuestion).classe === 'court' && /« dentiste », ou autre chose \?$/.test(classer('dentiste', apresMaQuestion).question), classer('dentiste', apresMaQuestion).question);
verifie('« lundi » après ma question : la question avec le moment, pas le modèle', classer('lundi', apresMaQuestion).classe === 'court' && /lundi, ou autre chose \?$/.test(classer('lundi', apresMaQuestion).question));
verifie('« il fait beau dehors » après ma question : la question générale ne se répète pas, les deux exemples', classer('il fait beau dehors', apresMaQuestion).classe === 'hors_sujet' && /par exemple/.test(classer('il fait beau dehors', apresMaQuestion).question));
verifie('« ok » et « oui » après ma question : encore la question avec exemples (je ne devine pas)', ['ok', 'oui'].every((p) => classer(p, apresMaQuestion).classe === 'reaction' && /par exemple/.test(classer(p, apresMaQuestion).question)));
verifie('« ok » après une question du modèle : une réponse, elle passe', classer('ok', apresModele).classe === 'claire');
const apresListe = [{ role: 'user', content: 'quand suis-je libre ?' }, { role: 'assistant', content: 'Voici des créneaux libres cette semaine : lundi 9h, 10h, 11h, mardi 14h, 15h.' }];
verifie('après une liste de créneaux (pas une question), « Je t’ai pas demandé quand je suis libre ? » : excuse, pas de nouvelle liste', classer('Je t’ai pas demandé quand je suis libre ?', apresListe).classe === 'contestation');
verifie('après une liste de créneaux, « lundi » seul : la question (ce n est pas une réponse attendue)', classer('lundi', apresListe).classe === 'court');

titre('5. La langue, le seuil, la nature des réponses');
ctx.currentLanguage = 'en';
verifie('dans une autre langue, le classement s efface (le modèle garde la main)', classer('Cv ?').classe === 'claire' && classer('Cv ?').raison === 'langue');
ctx.currentLanguage = 'fr';
verifie('le seuil est 2 : « dentiste demain » (agenda + moment) passe, « dentiste » seul (1) non, « Mercredi 15h » (un seul moment) non', vm.runInContext('TC_CLASSE_SEUIL', ctx) === 2 && classer('dentiste demain').indices.score >= 2 && classer('dentiste').indices.score === 1 && classer('Mercredi 15h').indices.score === 1, [classer('dentiste demain').indices.score, classer('dentiste').indices.score, classer('Mercredi 15h').indices.score].join(' '));
verifie('tcNatureReponse : bloc [AGENDA] → action ; « Sauf erreur de ma part » → question ; sinon réponse', ctx.tcNatureReponse('ok\n[AGENDA]\n2026-10-16 | 10:00-11:00 | X | rdv\n[/AGENDA]') === 'action' && ctx.tcNatureReponse('Sauf erreur de ma part, je n’ai pas bien compris ta demande. Tu veux dire … ?') === 'question' && ctx.tcNatureReponse('Tu as un rendez-vous demain à 15h.') === 'reponse');
verifie('aucune question du bloc ne fait plus d une phrase (un seul point final, hors « Bonjour ! »)', (bloc.match(/question: '[^']*'/g) || []).every((q) => q.indexOf('. ') < 0 || /Bonjour|Bonsoir|bientôt/.test(q)), (bloc.match(/question: '[^']*'/g) || []).filter((q) => q.indexOf('. ') > -1).join(' | '));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
