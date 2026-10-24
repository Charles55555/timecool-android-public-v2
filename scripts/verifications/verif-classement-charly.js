// « Charly ne répond que s'il est sûr d'avoir compris, sinon il demande » (mission 50, chef, 24/10, ok de Charles).
//
// Avant tout détecteur et avant le modèle, charlySendMessage classe le message (tcClasserMessage). Trois niveaux (décision du
// chef, 24/10) : (1) intention claire et complète : le message suit son chemin ; (2) intention claire mais une pièce manque
// (« golf samedi », « anniversaire de Marc », « Dermatologue ») : Charly demande LA pièce ; (3) vraiment pas sûr (« cv ? »,
// « et ? », « ok », contestation, hors sujet) : une seule phrase calme qui demande, aucune action. Le fil compte : une courte
// suite après une question ou un résultat de Charly se lit avec le message précédent, et ce qui a été dit est gardé.
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
verifie('le bloc « classer avant de répondre » existe, juste avant tcPhraseNonCompris', bloc.length > 2000 && bloc.indexOf('function tcClasserMessage(') > -1 && bloc.indexOf('function tcClassePieceManquante(') > -1 && bloc.indexOf('const TC_CLASSE_SEUIL = ') > -1, bloc.length);
verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page (Safari)', bloc.indexOf('—') < 0 && !/\(\?<[=!]/.test(page));
const csm = extraire('charlySendMessage') || '';
const iClasse = csm.indexOf('const _classe = tcClasserMessage(text, charlyIA.history);');
const iSalut = csm.indexOf('if (_isGreet && _isFirst) {');
const iPrev = csm.indexOf('const _prevenance = tcDetecterPrevenance(text);');
const iModele = csm.indexOf('reply = await callOpenAI(messages);');
verifie('charlySendMessage classe le message après la salutation du premier message, avant le premier détecteur et le modèle', iClasse > -1 && iSalut > -1 && iPrev > -1 && iSalut < iClasse && iClasse < iPrev && iPrev < iModele, [iSalut, iClasse, iPrev, iModele].join(' '));
verifie('« pas sûr » : la bulle de l utilisateur, la question (nature question, proposition et texte gardés), et on s arrête (return)', /if \(_classe\.classe !== 'claire'\) \{\s+tcPousserMessageUtilisateur\(text\);\s+await new Promise\(r => setTimeout\(r, 400\)\);\s+charlyIA\.history\.push\(\{ role: 'assistant', content: _classe\.question, nature: _classe\.nature \|\| 'question', _classement: _classe\.classe, _proposition: _classe\.proposition \|\| null, _texte: text \}\);\s+renderCharlyChat\(\);\s+return;\s+\}/.test(csm));
const attentes = ['if (_tcQuestionnaire) {', 'if (_tcDeplacementEnAttente) {', 'if (_tcSuppressionEnAttente) {', 'const conflit = tcConflitEnAttente();'];
verifie('les réponses attendues (questionnaire, déplacement, annulation, proposition) sont lues AVANT le classement', attentes.every((a) => csm.indexOf(a) > -1 && csm.indexOf(a) < iClasse), attentes.map((a) => csm.indexOf(a)).join(' '));
verifie('la réponse du modèle porte sa nature (charlySendMessage et charlyProcessMessage)', (page.match(/charlyIA\.history\.push\(\{role:'assistant', content:tcReplyOuRepli\(reply\), tempId, nature: tcNatureReponse\(reply\)\}\);/g) || []).length === 2);

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id, title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
const agenda = () => [
  ev('dentiste', 'Dentiste', 1, 15, 0, 16, 0, { contact: 'c1', lieu: '12 rue de la Paix, Paris' }),
  ev('golf', 'Partie de golf', 4, 14, 0, 16, 0),
  ev('dejeuner', 'Déjeuner avec Sophie', 5, 12, 30, 14, 0, { contact: 'c2' })
];
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, Set, Math, JSON, parseInt, isNaN, Date: DateFixe,
  mode: 'user', events: agenda(), charlyIA: { history: [] }, currentLanguage: 'fr',
  contactsList: [{ id: 'c1', name: 'Marc Dupont', phone: '06' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }, { id: 'c3', name: 'Paul Martin', referenceCompte: 'R3' }],
  setTimeout: (f) => { if (f) f(); return 0; }, localStorage: { getItem: () => null },
  tcFormaterDateHumaine: (d) => d, escapeHTMLSafe: (t) => String(t), renderCharlyChat() {}, tcDefinirStatutCharly() {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  currentPage: 'chat', render() {}, saveEventsToStorage() {}, addDemarche() {}, showToast() {}
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcSuppressionChoix = null; let _tcDeplacementEnAttente = null;', ctx);
['TC_JOURS_SEMAINE', 'TC_MOIS', 'TC_PROFESSIONS', 'TC_TRAJET_DECLENCHEURS', 'TC_WEB_DECLENCHEURS', 'TC_MOTS_CREUX', 'TC_VERBES_DE_DEMANDE', 'TC_JOURS_FR', 'TC_MOIS_FR', 'TC_PETITS_MOTS'].forEach((c) => {
  const src = extraireConst(c, c === 'TC_MOTS_CREUX' ? "\\.split\\(' '\\)\\);\\n" : (/DECLENCHEURS|PROFESSIONS|VERBES_DE_DEMANDE|PETITS_MOTS/.test(c) ? '\\];\\n' : ';\\n'));
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  constante introuvable : ' + c); }
});
['tcSansAccents', 'tcISO', 'tcContientMot', 'tcHeureDansTexte', 'tcHorairePlage', 'tcFormaterHeure', 'tcComparerEvenements',
 'tcPeriodeAgenda', 'tcJoursNommes', 'tcPeriodeContrainte', 'tcPeriodeJourNomme', 'tcPeriodeCoherente', 'tcBorneDeFin', 'tcJoursDansTexte',
 'parseFrenchDateFromText', 'tcContactDuRdv', 'tcMotsDeRdv', 'tcTitreContient', 'tcMotDeLAgenda', 'tcPlageImprevu',
 'tcDetecterMalade', 'tcDetecterContrainte', 'detecterSuppressionRdv', 'tcDetecterPrevenance', 'tcReponseOuiNon',
 'detecterConsultationAgenda', 'tcGererConsultationAgenda', 'detecterDemandeCreneau',
 'extraireLieuDuTexte', 'detecterRechercheProfessionnel', 'extraireAdresseDuTexte', 'detecterDemandeTrajet', 'detecterRechercheWeb',
 'tcEstDeplacement', 'tcVerbeConjugue', 'tcDetecterMarcheArriere', 'tcEstUneReprise',
 'tcCreationLocale', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcJoursCites', 'tcDateEnLettres',
 'tcMotsUtiles', 'tcContactsParMots', 'tcLangueCourante', 'tcDetecterRdvGroupe', 'tcMotsDuTexte', 'tcComptesCitesDansTexte',
 'tcAppliquerDeplacement', 'tcExecuterDeplacement', '_tcLigneRdv', 'tcRdvDesigne'
].forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (bloc) vm.runInContext(bloc, ctx);
if (ko) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }

verifie('les détecteurs chargés répondent (tcCreationLocale sur « rdv coiffeur mardi 15h » propose un bloc)', /\[AGENDA\]/.test(ctx.tcCreationLocale('rdv coiffeur mardi 15h', new DateFixe())), ctx.tcCreationLocale('rdv coiffeur mardi 15h', new DateFixe()));

const classer = (t, histoire) => ctx.tcClasserMessage(t, histoire || []);
const estQuestion = (r) => r.classe !== 'claire' && typeof r.question === 'string' && /\?$/.test(r.question.trim()) && r.question.indexOf('[AGENDA]') < 0 && r.question.split(/[.!?]\s+/).length <= 2;
/* La bulle que charlySendMessage pousse après un classement « pas sûr », pour rejouer la suite de la conversation. */
const bulle = (texte) => { const r = classer(texte); return [{ role: 'user', content: texte }, { role: 'assistant', content: r.question, nature: 'question', _classement: r.classe, _proposition: r.proposition || null, _texte: texte }]; };
const NC = 'Sauf erreur de ma part, je n\'ai pas bien compris : ';

titre('1. Les phrases pièges (niveau 3) : une question, jamais une action');
const pieges = [
  'Cv ?', 'Je t’ai pas demandé quand je suis libre ?', 'ok', '??', 'et ?', 'non pas ça', 'tu es sûr ?', 'merci', 'lundi', '14h',
  '?', 'ah bon', 'Mercredi 15h', 'c’est pas ça', 'n’importe quoi', 'je ne t’ai rien demandé', 'hein ?', 'quoi ?',
  'il fait beau dehors', 'la vie est belle aujourd’hui', 'mdr', 'oui', 'non', 'bof', 'et alors ?', 'super', 'pourquoi ?', 'Demain',
  'vraiment ?', 'Demain après-midi', 'je sais pas', 'c’est tout', 'tu n’as rien compris', 'ça n’a rien à voir', 'bonjour Charly', 'cc', 'pas du tout', 'non non'
];
let nbPieges = 0;
pieges.forEach((p) => {
  const r = classer(p);
  const ok = estQuestion(r);
  if (ok) nbPieges++;
  if (!ok) { ko++; console.log('  KO  piège « ' + p + ' » → ' + r.classe + ' : ' + (r.question || '(suit son chemin)') + (r.indices ? ' score ' + r.indices.score : '')); }
});
verifie(nbPieges + ' phrases pièges sur ' + pieges.length + ' produisent une question (au moins 20)', nbPieges === pieges.length && pieges.length >= 20);
verifie('« Cv ? » : pas compris, une question', classer('Cv ?').question === NC + 'qu’est-ce que tu veux que je fasse ?', classer('Cv ?').question);
verifie('« Je t’ai pas demandé quand je suis libre ? » : contestation, une excuse et la question de ce qu il voulait, jamais les créneaux', classer('Je t’ai pas demandé quand je suis libre ?').classe === 'contestation' && classer('Je t’ai pas demandé quand je suis libre ?').question === 'Pardon, j’ai répondu à côté : qu’est-ce que tu voulais ?', classer('Je t’ai pas demandé quand je suis libre ?').question);
verifie('« non pas ça », « c’est pas ça », « je ne t’ai rien demandé », « n’importe quoi », « pas du tout » : contestation', ['non pas ça', 'c’est pas ça', 'je ne t’ai rien demandé', 'n’importe quoi', 'tu n’as rien compris', 'pas du tout', 'à côté de la plaque'].every((p) => classer(p).classe === 'contestation'));
verifie('« tu es sûr ? », « vraiment ? » : doute, Charly ne répète pas, il demande ce qui cloche', classer('tu es sûr ?').classe === 'doute' && classer('vraiment ?').question === 'Je peux me tromper : qu’est-ce qui ne te semble pas juste ?', classer('tu es sûr ?').question);
verifie('« merci », « super » : avec plaisir, et une question', classer('merci').question === 'Avec plaisir, tu veux autre chose ?' && classer('super').classe === 'remerciement');
verifie('« ok » : d accord, et une question', classer('ok').question === 'D’accord, tu veux autre chose ?');
verifie('« bonjour Charly » (pas le premier message) : bonjour, et une question', /^Bonjour ! Qu’est-ce que je peux faire pour toi \?$/.test(classer('bonjour Charly').question), classer('bonjour Charly').question);
verifie('« laisse tomber » : d accord, je laisse tomber, et une question', classer('laisse tomber').classe === 'abandon' && /\?$/.test(classer('laisse tomber').question));
verifie('« au revoir » : à bientôt, sans question (ce n est pas un doute)', classer('au revoir').classe === 'au_revoir' && !/\?/.test(classer('au revoir').question), classer('au revoir').question);
verifie('« lundi » → « tu veux noter quelque chose lundi, ou autre chose ? »', classer('lundi').question === NC + 'tu veux noter quelque chose lundi, ou autre chose ?', classer('lundi').question);
verifie('« 14h » → « … à 14h … » ; « Mercredi 15h » → « … mercredi à 15h … » ; « Demain après-midi » → « … demain … »', /à 14h, ou autre chose \?$/.test(classer('14h').question) && /mercredi à 15h, ou autre chose \?$/.test(classer('Mercredi 15h').question) && /quelque chose demain, ou autre chose \?$/.test(classer('Demain après-midi').question), classer('Mercredi 15h').question);
verifie('« il fait beau dehors » (hors sujet) → la question générale', classer('il fait beau dehors').classe === 'hors_sujet' && /qu’est-ce que tu veux que je fasse \?$/.test(classer('il fait beau dehors').question));

titre('2. Une information n est pas une contestation (examinateur) : « à côté du bureau », « rien à voir » dans une phrase, « pas ça mardi »');
['trouve-moi un restaurant à côté du bureau demain midi', 'réserve un dentiste à côté de chez moi mardi', 'je cherche un kiné à côté de la gare', 'mets un rdv au café à côté du travail jeudi 10h', 'pharmacie de garde à côté', 'pas ça mardi, mercredi', 'le golf n’a rien à voir avec le tennis, note-le samedi 14h']
  .forEach((p) => { const r = classer(p); verifie('« ' + p + ' » n est pas une contestation (' + r.classe + ')', r.classe !== 'contestation', r.question || ''); });
verifie('les quatre demandes « à côté » passent (claire)', ['trouve-moi un restaurant à côté du bureau demain midi', 'réserve un dentiste à côté de chez moi mardi', 'je cherche un kiné à côté de la gare', 'mets un rdv au café à côté du travail jeudi 10h'].every((p) => classer(p).classe === 'claire'));
verifie('« c’est pas ça, annule plutôt le golf » : la nouvelle demande après la contestation passe', classer('c’est pas ça, annule plutôt le golf').classe === 'claire');

titre('3. Niveau 2 (chef) : intention claire, une pièce manque : Charly demande LA pièce, jamais « pas compris »');
verifie('« golf samedi » → « À quelle heure, pour « golf » samedi ? »', classer('golf samedi').classe === 'piece_manquante' && classer('golf samedi').question === 'À quelle heure, pour « golf » samedi ?', classer('golf samedi').question);
verifie('« foot 14h » → « Quel jour, pour « foot » à 14h ? »', classer('foot 14h').question === 'Quel jour, pour « foot » à 14h ?', classer('foot 14h').question);
verifie('« anniversaire de Marc » → « Quel jour et à quelle heure, pour « anniversaire de Marc » ? »', classer('anniversaire de Marc').question === 'Quel jour et à quelle heure, pour « anniversaire de Marc » ?', classer('anniversaire de Marc').question);
verifie('« Dermatologue » → « Quel jour et à quelle heure, pour « Dermatologue » ? »', classer('Dermatologue').question === 'Quel jour et à quelle heure, pour « Dermatologue » ?', classer('Dermatologue').question);
verifie('« Marc » → « Quel jour et à quelle heure, avec Marc Dupont ? »', classer('Marc').question === 'Quel jour et à quelle heure, avec Marc Dupont ?', classer('Marc').question);
verifie('« dentiste demain » → « À quelle heure, pour « dentiste » demain ? »', classer('dentiste demain').question === 'À quelle heure, pour « dentiste » demain ?', classer('dentiste demain').question);
verifie('« dentiste mardi 15h » (objet, jour, heure) passe', classer('dentiste mardi 15h').classe === 'claire' && classer('dentiste mardi 15h').raison === 'objet_moment');
verifie('« retard 10 min » : le détecteur de prévenance le prend (le questionnaire retard demande à qui), il passe', !!ctx.tcDetecterPrevenance('retard 10 min') && ctx.tcDetecterPrevenance('retard 10 min').minutes === 10 && classer('retard 10 min').classe === 'claire', JSON.stringify(ctx.tcDetecterPrevenance('retard 10 min')));
verifie('« où est mon rdv ? » et « c’est où ? » : question d information (lieu), reconnues et passent', classer('où est mon rdv ?').classe === 'claire' && ctx.detecterConsultationAgenda('où est mon rdv ?') && ctx.detecterConsultationAgenda('où est mon rdv ?').type === 'lieu' && ctx.detecterConsultationAgenda('c’est où ?').type === 'lieu' && ctx.detecterConsultationAgenda('où est mon rdv de demain ?').periode && ctx.detecterConsultationAgenda('où est mon rdv de demain ?').periode.label === 'demain', JSON.stringify(ctx.detecterConsultationAgenda('où est mon rdv ?')));
(async () => {
  ctx.charlyIA.history = []; ctx.events = agenda();
  await ctx.tcGererConsultationAgenda('où est mon rdv ?', ctx.detecterConsultationAgenda('où est mon rdv ?'));
  const rep = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('le lieu du prochain rendez-vous : « Dentiste, <demain> 15h : 12 rue de la Paix, Paris. »', /^Dentiste, .*15h.* : 12 rue de la Paix, Paris\.$/.test(rep), rep);
  ctx.charlyIA.history = [];
  await ctx.tcGererConsultationAgenda('où est mon rdv de lundi ?', ctx.detecterConsultationAgenda('où est mon rdv de lundi ?'));
  const rep2 = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('sans lieu noté (le golf de lundi) : « … : aucun lieu noté. »', /^Partie de golf, .* : aucun lieu noté\.$/.test(rep2), rep2);

  titre('4. Les demandes claires passent (elles suivent leur chemin : détecteur ou modèle)');
  const claires = [
    'mes rdv de demain', 'annule le golf', 'dentiste mardi 15h', 'propose-moi un créneau demain', 'préviens Marc que j’aurai 10 min de retard',
    'je suis malade', 'décale le golf à 15h', 'quand suis-je libre cette semaine ?', 'qu’est-ce que j’ai demain ?', 'je voudrais un rdv chez mon dentiste demain',
    'c’est gratuit ?', 'remets-les', 'ajoute un déjeuner avec ma mère samedi midi', 'je vais chez le dentiste mardi à 15h', 'trouve-nous un créneau avec Marc Dupont et Sophie Anceau',
    'qui es-tu ?', 'tu sais faire quoi ?', 'et demain ?', 'cette semaine ?', 'annule', 'je ne pourrai pas honorer mes rdv demain', 'j’ai un imprévu',
    'rdv coiffeur jeudi 18h', 'combien de temps pour aller à la gare ?', 'peux-tu me rappeler mon prochain rendez-vous ?', 'Je veux créer un nouveau rendez-vous',
    'mets-moi un rendez-vous cet après-midi à 15h chez mon avocat', 'synchronise avec google agenda', 'où est mon rdv ?', 'retard 10 min', 'je serai en retard'
  ];
  let nbClaires = 0;
  claires.forEach((p) => {
    const r = classer(p);
    if (r.classe === 'claire') nbClaires++;
    else { ko++; console.log('  KO  demande claire « ' + p + ' » → ' + r.classe + ' : ' + r.question + (r.indices ? ' score ' + r.indices.score : '')); }
  });
  verifie(nbClaires + ' demandes claires sur ' + claires.length + ' passent (au moins 10)', nbClaires === claires.length && claires.length >= 10);

  titre('5. Le fil de conversation : la réponse à une question de Charly passe ; après ma proposition, « oui » demande ce qui manque et un complément passe');
  const apresModele = [{ role: 'user', content: 'Demain 16h' }, { role: 'assistant', content: 'C’est pour quoi, à 16h ?' }];
  verifie('« dentiste », « oui », « lundi », « ok » après « C’est pour quoi, à 16h ? » (le modèle) : des réponses, elles passent', ['dentiste', 'oui', 'lundi', 'ok'].every((p) => classer(p, apresModele).classe === 'claire' && classer(p, apresModele).raison === 'reponse'));
  verifie('mais « c’est pas ça » et « tu es sûr ? » restent une contestation et un doute, « merci » un remerciement', classer('c’est pas ça', apresModele).classe === 'contestation' && classer('tu es sûr ?', apresModele).classe === 'doute' && classer('merci', apresModele).classe === 'remerciement');
  const h1 = bulle('Mercredi 15h');
  verifie('« Mercredi 15h » puis « oui » → « D’accord : qu’est-ce que je note mercredi à 15h ? » (le mercredi 15h n est pas perdu)', classer('oui', h1).classe === 'suite_proposition' && classer('oui', h1).question === 'D’accord : qu’est-ce que je note mercredi à 15h ?' && classer('ok', h1).question === 'D’accord : qu’est-ce que je note mercredi à 15h ?', classer('oui', h1).question);
  verifie('« Mercredi 15h » puis « dentiste » ou « un rdv dentiste » : un complément, il passe (le modèle a l historique)', classer('dentiste', h1).classe === 'claire' && classer('dentiste', h1).raison === 'complement' && classer('un rdv dentiste', h1).classe === 'claire');
  const h1b = h1.concat([{ role: 'user', content: 'oui' }, Object.assign({ role: 'assistant', content: classer('oui', h1).question, nature: 'question', _classement: 'suite_proposition', _proposition: classer('oui', h1).proposition, _texte: 'oui' })]);
  verifie('puis « dentiste » après « qu’est-ce que je note mercredi à 15h ? » : il passe ; « oui » encore : la même question précise ; « cv » : les exemples', classer('dentiste', h1b).classe === 'claire' && classer('oui', h1b).classe === 'suite_proposition' && classer('oui', h1b).question === 'D’accord : qu’est-ce que je note mercredi à 15h ?' && /par exemple/.test(classer('cv', h1b).question), classer('oui', h1b).question);
  const h2 = bulle('Dermatologue');
  verifie('« Dermatologue » puis « oui mardi 15h » : un complément, il passe (le Dermatologue n est pas oublié : le modèle a l historique)', classer('oui mardi 15h', h2).classe === 'claire' && classer('mardi 15h', h2).classe === 'claire' && classer('demain à 10h', h2).classe === 'claire');
  verifie('« Dermatologue » puis « oui » seul : la même question précise (le jour et l heure), le Dermatologue gardé', classer('oui', h2).classe === 'suite_proposition' && classer('oui', h2).question === 'Quel jour et à quelle heure, pour « Dermatologue » ?' && classer('oui', h2).proposition && classer('oui', h2).proposition.titre === 'Dermatologue', classer('oui', h2).question);
  const h2b = h2.concat([{ role: 'user', content: 'oui' }, { role: 'assistant', content: classer('oui', h2).question, nature: 'question', _classement: 'suite_proposition', _proposition: classer('oui', h2).proposition, _texte: 'oui' }]);
  verifie('puis « mardi 15h » : un complément, il passe (le Dermatologue est dans l historique)', classer('mardi 15h', h2b).classe === 'claire' && classer('mardi 15h', h2b).raison === 'complement');
  verifie('« Dermatologue » puis « non » ou « cv » : jamais une question générale « pas compris » à la place, les exemples, la proposition gardée', classer('non', h2).classe === 'reaction' && /par exemple/.test(classer('non', h2).question) && /par exemple/.test(classer('cv', h2).question) && classer('cv', h2).proposition && classer('cv', h2).proposition.titre === 'Dermatologue');
  const h3 = bulle('Marc');
  verifie('« Marc » puis « samedi 14h » : il passe', classer('samedi 14h', h3).classe === 'claire' && classer('samedi 14h', h3).raison === 'complement');
  const hGen = bulle('Cv ?');
  verifie('après la question générale (« Cv ? »), « cv » ou « ok » encore : la même question avec deux exemples', classer('cv', hGen).question === 'Qu’est-ce que tu veux que je fasse, par exemple « mes rendez-vous de demain » ou « dentiste mardi 15h » ?' && /par exemple/.test(classer('ok', hGen).question), classer('cv', hGen).question);
  verifie('après la question générale, « mes rdv de demain » passe ; « dentiste » reçoit la question de la pièce ; « lundi » celle du moment', classer('mes rdv de demain', hGen).classe === 'claire' && classer('dentiste', hGen).question === 'Quel jour et à quelle heure, pour « dentiste » ?' && /lundi, ou autre chose \?$/.test(classer('lundi', hGen).question), classer('dentiste', hGen).question);
  verifie('après la question générale, « il fait beau dehors » : les deux exemples, pas la même phrase', /par exemple/.test(classer('il fait beau dehors', hGen).question));

  titre('6. Une courte suite après un résultat de Charly (sans « ? ») passe : le modèle a l historique (examinateur)');
  const apresResultat = [{ role: 'user', content: 'mes rdv de demain' }, { role: 'assistant', content: 'Demain, tu as Dentiste à 15h.' }];
  ['et à 15h ?', 'plutôt 16h', 'et après ?', 'avec qui ?', 'c’est où ?', 'il dure combien de temps ?', 'Marc vient ?', 'le golf', 'où ça ?']
    .forEach((p) => { const r = classer(p, apresResultat); verifie('« ' + p + ' » après « Demain, tu as Dentiste à 15h. » passe', r.classe === 'claire' && (r.raison === 'suite' || r.raison === null), r.classe + ' ' + (r.question || '')); });
  verifie('mais « lundi » seul après un résultat : la question (ce n est pas une suite) ; « ok », « merci », « tu es sûr ? » gardent leur réponse', classer('lundi', apresResultat).classe === 'court' && classer('ok', apresResultat).classe === 'acquiescement' && classer('merci', apresResultat).classe === 'remerciement' && classer('tu es sûr ?', apresResultat).classe === 'doute');
  const apresListe = [{ role: 'user', content: 'quand suis-je libre ?' }, { role: 'assistant', content: 'Voici des créneaux libres cette semaine : lundi 9h, 10h, 11h, mardi 14h, 15h.' }];
  verifie('après une liste de créneaux, « Je t’ai pas demandé quand je suis libre ? » : excuse, pas de nouvelle liste', classer('Je t’ai pas demandé quand je suis libre ?', apresListe).classe === 'contestation');

  titre('6b. Troisième passage (examinateur, chef) : question ouverte, lieu, retard, hors agenda, détails');
  const apresAccueil = [{ role: 'user', content: 'bonjour' }, { role: 'assistant', content: 'Bonjour ! 😊 Je suis Charly, ton assistant TimeCool. J’espère que tu vas bien ! Qu’est-ce que je peux faire pour toi aujourd’hui ?' }];
  verifie('après l accueil (question ouverte), « Cv ? », « lundi », « ok », « mdr », « hein », « Dermatologue », « il fait beau dehors » se classent (aucun ne passe au modèle)', ['Cv ?', 'lundi', 'ok', 'mdr', 'hein', 'Dermatologue', 'il fait beau dehors'].every((p) => classer(p, apresAccueil).classe !== 'claire'), ['Cv ?', 'lundi', 'ok', 'mdr', 'hein', 'Dermatologue', 'il fait beau dehors'].map((p) => classer(p, apresAccueil).classe).join(' '));
  verifie('après « Bonjour » puis « Cv ? » : la question « pas compris »', classer('Cv ?', apresAccueil).question === NC + 'qu’est-ce que tu veux que je fasse ?');
  const apresAutreChose = [{ role: 'user', content: 'merci' }, { role: 'assistant', content: 'Avec plaisir, tu veux autre chose ?', nature: 'question', _classement: 'remerciement' }];
  verifie('après « tu veux autre chose ? », « lundi » et « Dermatologue » se classent, « mes rdv de demain » passe', classer('lundi', apresAutreChose).classe === 'court' && classer('Dermatologue', apresAutreChose).classe === 'piece_manquante' && classer('mes rdv de demain', apresAutreChose).classe === 'claire');
  verifie('une question PRÉCISE du modèle (« C’est pour quoi, à 16h ? », « Quel jour ? ») laisse passer la réponse', classer('dentiste', apresModele).classe === 'claire' && classer('lundi', [{ role: 'assistant', content: 'Quel jour ?' }]).classe === 'claire');
  verifie('« Tu es libre demain ! 🎉 Tu veux qu’on planifie quelque chose ? » : « oui » passe (le modèle enchaîne)', classer('oui', [{ role: 'assistant', content: 'Tu es libre demain ! 🎉 Tu veux qu’on planifie quelque chose ?' }]).classe === 'claire');
  const horsLieu = ['où aller manger ce soir ?', 'c’est où la pharmacie la plus proche ?', 'où je vais trouver un dentiste ?', 'où on va en vacances ?'];
  verifie('le type lieu ne prend plus « où aller manger », « c’est où la pharmacie », « où trouver un dentiste », « où on va en vacances »', horsLieu.every((p) => { const d = ctx.detecterConsultationAgenda(p); return !d || d.type !== 'lieu'; }), horsLieu.map((p) => JSON.stringify(ctx.detecterConsultationAgenda(p))).join(' '));
  verifie('mais garde « où est mon rdv ? », « où est mon rendez-vous de demain ? », « c’est où ? », « où ça ? », « où est mon dentiste ? » (titre de l agenda)', ['où est mon rdv ?', 'où est mon rendez-vous de demain ?', 'c’est où ?', 'où ça ?', 'où est mon dentiste ?'].every((p) => ctx.detecterConsultationAgenda(p) && ctx.detecterConsultationAgenda(p).type === 'lieu'));
  ['où aller manger ce soir ?', 'où on va en vacances ?'].forEach((p) => { const r = classer(p); verifie('« ' + p + ' » : hors agenda, la phrase du chef (nature réponse)', r.classe === 'hors_agenda' && r.nature === 'reponse' && r.question === 'Je m’occupe de ton agenda : rendez-vous, créneaux, retards, trajets, météo et recherche d’un professionnel. Je ne peux pas t’aider pour ça.', r.classe + ' ' + (r.question || '')); });
  { const r = classer('c’est où la pharmacie la plus proche ?'); verifie('« c’est où la pharmacie la plus proche ? » : hors agenda, ou la recherche de professionnel (jamais le lieu d un rendez-vous)', r.classe === 'hors_agenda' || (r.classe === 'claire' && r.indices && r.indices.detecteur && !!ctx.detecterRechercheProfessionnel('c’est où la pharmacie la plus proche ?')), r.classe); }
  { const r = classer('pharmacie de garde à côté'); verifie('« pharmacie de garde à côté » : plus « quel jour et à quelle heure », et pas hors agenda sur un mot de lieu (pas sûr, ou la recherche de professionnel)', r.classe !== 'piece_manquante' && r.classe !== 'hors_agenda', r.classe + ' ' + (r.question || '')); }
  verifie('tcDetecterPrevenance : « Marc est en retard », « tu es en retard », « Sophie a du retard », « le train en retard », « pas de retard », « en retard ? » ne sont pas MON retard', ['Marc est en retard', 'tu es en retard', 'Sophie a du retard', 'le train en retard', 'pas de retard', 'en retard ?'].every((p) => !ctx.tcDetecterPrevenance(p)));
  verifie('tcDetecterPrevenance : « retard », « retard 10 min », « 10 min de retard », « retard de 10 minutes », « je suis en retard », « j’ai 10 min de retard » le sont', ['retard', 'retard 10 min', '10 min de retard', 'retard de 10 minutes', 'je suis en retard', 'j’ai 10 min de retard'].every((p) => ctx.tcDetecterPrevenance(p) && ctx.tcDetecterPrevenance(p).type === 'retard'));
  verifie('« Marc est en retard » → « D’accord : je décale ton rendez-vous avec Marc Dupont, ou je préviens quelqu’un ? »', classer('Marc est en retard').classe === 'retard_autre' && classer('Marc est en retard').question === 'D’accord : je décale ton rendez-vous avec Marc Dupont, ou je préviens quelqu’un ?', classer('Marc est en retard').question);
  verifie('« le train est en retard » → « D’accord : je décale un rendez-vous, ou je préviens quelqu’un ? » ; puis « décale le dentiste » passe', classer('le train est en retard').question === 'D’accord : je décale un rendez-vous, ou je préviens quelqu’un ?' && classer('décale le dentiste', bulle('le train est en retard')).classe === 'claire', classer('le train est en retard').question);
  verifie('« pas de retard », « finalement pas de retard » → « Bien noté, pas de retard. » (une phrase, aucun questionnaire, nature réponse)', ['pas de retard', 'finalement pas de retard'].every((p) => classer(p).classe === 'retard_annule' && classer(p).question === 'Bien noté, pas de retard.' && classer(p).nature === 'reponse'), classer('pas de retard').question);
  verifie('après l accueil (question ouverte), la « suite » ne s applique pas : « il fait beau ? », « la vie est belle », « Dermatologue ? », « le dentiste », « golf samedi », « pour lundi » se classent', ['il fait beau ?', 'la vie est belle', 'Dermatologue ?', 'le dentiste', 'golf samedi', 'pour lundi'].every((p) => classer(p, apresAccueil).classe !== 'claire'), ['il fait beau ?', 'la vie est belle', 'Dermatologue ?', 'le dentiste', 'golf samedi', 'pour lundi'].map((p) => classer(p, apresAccueil).classe).join(' '));
  verifie('et reçoivent la même question que sans historique (« golf samedi » → heure, « Dermatologue ? » → jour et heure, « il fait beau ? » → pas compris)', classer('golf samedi', apresAccueil).question === 'À quelle heure, pour « golf » samedi ?' && classer('Dermatologue ?', apresAccueil).question === 'Quel jour et à quelle heure, pour « Dermatologue » ?' && /pas bien compris/.test(classer('il fait beau ?', apresAccueil).question));
  verifie('« météo demain », « sms demain » : un sujet qui se suffit, jamais « à quelle heure pour météo » : ils passent (la météo, « pas encore » pour le sms)', classer('météo demain').classe === 'claire' && classer('sms demain').classe === 'claire' && classer('météo').classe === 'claire', classer('météo demain').classe + ' ' + (classer('météo demain').question || ''));
  verifie('« pas ça mardi, mercredi » : « pas » ne devient pas l objet', !/« pas »/.test(classer('pas ça mardi, mercredi').question || ''), classer('pas ça mardi, mercredi').question);
  verifie('« Sophie demain » → « À quelle heure, avec Sophie Anceau demain ? »', classer('Sophie demain').question === 'À quelle heure, avec Sophie Anceau demain ?', classer('Sophie demain').question);
  verifie('le hors agenda l emporte sur le fil : « où aller manger ce soir ? » après ma question « je décale…, ou je préviens quelqu’un ? », après « Quel jour… Dermatologue ? » ou après la question précise du modèle', classer('où aller manger ce soir ?', bulle('Marc est en retard')).classe === 'hors_agenda' && classer('où aller manger ce soir ?', h2).classe === 'hors_agenda' && classer('où aller manger ce soir ?', apresModele).classe === 'hors_agenda', [classer('où aller manger ce soir ?', bulle('Marc est en retard')).classe, classer('où aller manger ce soir ?', h2).classe, classer('où aller manger ce soir ?', apresModele).classe].join(' '));
  verifie('un rendez-vous complet avec un lieu n est jamais hors agenda : « dermato à côté de la gare mardi 15h », « chez le dermato à côté de la gare mardi 15h », « déjeuner au resto à côté du bureau samedi midi » passent', ['dermato à côté de la gare mardi 15h', 'chez le dermato à côté de la gare mardi 15h', 'déjeuner au resto à côté du bureau samedi midi'].every((p) => classer(p).classe === 'claire'), ['dermato à côté de la gare mardi 15h', 'chez le dermato à côté de la gare mardi 15h', 'déjeuner au resto à côté du bureau samedi midi'].map((p) => classer(p).classe + (classer(p).raison ? '/' + classer(p).raison : '')).join(' '));
  const apresOuLieu = [{ role: 'user', content: 'déjeuner samedi midi' }, { role: 'assistant', content: 'Où a lieu le déjeuner ?' }];
  verifie('un lieu donné en réponse à « Où a lieu le déjeuner ? » passe : « au restaurant à côté du bureau », « à côté de la gare », « pharmacie de garde à côté », « où tu veux »', ['au restaurant à côté du bureau', 'à côté de la gare', 'pharmacie de garde à côté', 'où tu veux'].every((p) => classer(p, apresOuLieu).classe === 'claire'), ['au restaurant à côté du bureau', 'à côté de la gare', 'pharmacie de garde à côté', 'où tu veux'].map((p) => classer(p, apresOuLieu).classe).join(' '));
  verifie('« courses au supermarché le plus proche » après « C’est pour quoi, à 16h ? » passe ; « chez le dermato à côté de la gare mardi 15h » après « … Dermatologue ? » passe ; mais « où aller manger ce soir ? » reste hors agenda dans ces deux fils', classer('courses au supermarché le plus proche', apresModele).classe === 'claire' && classer('chez le dermato à côté de la gare mardi 15h', h2).classe === 'claire' && classer('où aller manger ce soir ?', apresModele).classe === 'hors_agenda' && classer('où aller manger ce soir ?', h2).classe === 'hors_agenda');
  verifie('le hors agenda ne se décide jamais sur un mot de lieu (chef) : « courses au supermarché le plus proche », « à la pharmacie », « chez Paul », « aller manger avec Marc » ne sont pas hors agenda', ['courses au supermarché le plus proche', 'à la pharmacie', 'chez Paul', 'aller manger avec Marc'].every((p) => classer(p).classe !== 'hors_agenda'), ['courses au supermarché le plus proche', 'à la pharmacie', 'chez Paul', 'aller manger avec Marc'].map((p) => classer(p).classe).join(' '));
  verifie('« dermato à côté de la gare mardi » (jour sans heure, phrase longue) : jamais hors agenda (elle passe, le modèle demande l heure)', classer('dermato à côté de la gare mardi').classe !== 'hors_agenda', classer('dermato à côté de la gare mardi').classe + ' ' + classer('dermato à côté de la gare mardi').question);
  const apresRien = [{ role: 'user', content: 'non' }, { role: 'system_info', content: '❌ Annulation abandonnée, rien n\'a été touché.' }];
  verifie('en cours de conversation (après un résultat), « Marc est en retard » reste le retard d un autre et « où aller manger ce soir ? » hors agenda ; « Marc vient ? » reste une suite qui passe', classer('Marc est en retard', apresRien).classe === 'retard_autre' && classer('où aller manger ce soir ?', apresRien).classe === 'hors_agenda' && classer('Marc vient ?', apresRien).classe === 'claire' && classer('c’est où ?', apresRien).classe === 'claire', [classer('Marc est en retard', apresRien).classe, classer('où aller manger ce soir ?', apresRien).classe, classer('Marc vient ?', apresRien).classe, classer('c’est où ?', apresRien).classe].join(' '));

  titre('8. Mission 51 : les ratés de la batterie des TESTEURS, six groupes');
  // Groupe 2 : abréviations et fautes courantes, corrigées avant tout.
  const corr = (t) => ctx.tcCorrigerAbreviations(t);
  verifie('« rdv dentiste dem 14h » → « rdv dentiste demain 14h » ; « rdv coiffeur sam 10h » → samedi ; « rdv w hugo mar 9h » → « avec hugo mardi » ; « déj gaëlle ven 12h30 » → « déjeuner gaëlle vendredi »', corr('rdv dentiste dem 14h') === 'rdv dentiste demain 14h' && corr('rdv coiffeur sam 10h') === 'rdv coiffeur samedi 10h' && corr('rdv w hugo mar 9h') === 'rdv avec hugo mardi 9h' && corr('déj gaëlle ven 12h30') === 'déjeuner gaëlle vendredi 12h30', [corr('rdv dentiste dem 14h'), corr('rdv w hugo mar 9h'), corr('déj gaëlle ven 12h30')].join(' | '));
  verifie('« déj avec Sam ven 12h » : Sam reste un prénom, ven devient vendredi ; « SAM » en majuscules aussi', corr('déj avec Sam ven 12h') === 'déjeuner avec Sam vendredi 12h' && corr('rdv SAM 10h') === 'rdv SAM 10h', corr('déj avec Sam ven 12h'));
  verifie('fautes : « anule mon rendevous de lundi » → « annule mon rendez-vous de lundi » (annulation reconnue) ; « suprime le kiné de jeudi » ; « decalle la reunion » ; « je sui en retar » ; « quesque jai de prévu lundi » (consultation)', corr('anule mon rendevous de lundi') === 'annule mon rendez-vous de lundi' && !!ctx.detecterSuppressionRdv(corr('anule mon rendevous de lundi')) && corr('suprime le kiné de jeudi') === 'supprime le kiné de jeudi' && corr('decalle la reunion de mardi a jeudi meme heure') === 'décale la reunion de mardi a jeudi meme heure' && corr('je sui en retar de 10 minute pour le dentiste') === 'je suis en retard de 10 minute pour le dentiste' && !!ctx.detecterConsultationAgenda(corr('quesque jai de prévu lundi')), corr('quesque jai de prévu lundi'));
  verifie('« rdv dentiste dem 14h » corrigé est complet et passe ; « merci bcp », « jsuis en retard » corrigés aussi', classer(corr('rdv dentiste dem 14h')).classe === 'claire' && classer(corr('merci bcp')).classe === 'remerciement' && !!ctx.tcDetecterPrevenance(corr('jsuis en retard')), classer(corr('rdv dentiste dem 14h')).classe);
  verifie('une adresse mail ou un lien ne sont pas touchés', corr('écris à mar@exemple.fr') === 'écris à mar@exemple.fr');
  const intacts = ['au bord de la mer samedi 14h', 'aller à la mer dimanche', 'soirée jeu samedi 20h', 'jeu de société samedi 20h', 'Sam vient demain à 10h', 'rappelle Sam demain', 'rdv avec le Pr Martin mardi 15h', 'mets Paul en cc', 'w end à Lyon', 'w-e à Lyon', 'un jeu pour les enfants', 'la mer est belle'];
  verifie('les phrases normales ne sont pas abîmées (mer, jeu, Sam, Pr, cc, w end)', intacts.every((p) => corr(p) === p), intacts.filter((p) => corr(p) !== p).map((p) => corr(p)).join(' | '));
  ctx.contactsList.push({ id: 'cs', name: 'Sam Leroy', phone: '06' });
  verifie('« rdv sam 10h » : Sam est un contact connu, le mot reste ; sans ce contact, « sam » suivi d une heure devient samedi ; « sam » seul aussi', corr('rdv sam 10h') === 'rdv sam 10h' && (ctx.contactsList.pop(), corr('rdv sam 10h') === 'rdv samedi 10h') && corr('sam') === 'samedi' && corr('ven') === 'vendredi', corr('rdv sam 10h'));
  verifie('« il fait quel temps demain », « t’es une IA ? » : un sujet qui se suffit, ils passent (météo, présentation)', classer('il fait quel temps demain').classe === 'claire' && classer('t’es une IA ?').classe === 'claire', classer('il fait quel temps demain').classe + ' ' + (classer('il fait quel temps demain').question || ''));
  verifie('charlySendMessage lit le message corrigé dès le départ, garde le texte tapé pour la bulle, et lit un complément avec ce qui a été dit', /const texteTape = inp\.value\.trim\(\);\s+let text = tcCorrigerAbreviations\(texteTape\);\s+_tcTexteTape = \{ tape: texteTape, corrige: text \};/.test(csm) && /if \(_classe\.compose\) \{ text = _classe\.compose; _tcTexteTape = \{ tape: texteTape, corrige: text \}; \}/.test(csm));
  verifie('les cinq bulles de l utilisateur montrent le texte tapé (tcBulleTapee), le texte corrigé part au modèle (_corrige, tcHistoriquePourIA)', (page.match(/charlyIA\.history\.push\(\{role:'user', content:tcBulleTapee\(text\), _corrige: text\}\);/g) || []).length === 5 && !/charlyIA\.history\.push\(\{role:'user', content:text\}\);/.test(page) && /String\(m\._corrige \|\| m\.content \|\| ''\)/.test(extraire('tcHistoriquePourIA') || ''));
  vm.runInContext("_tcTexteTape = { tape: 'rdv coiffeur dem 10h', corrige: 'rdv coiffeur demain 10h' };", ctx);
  verifie('tcBulleTapee : la bulle montre « rdv coiffeur dem 10h » pour le texte corrigé, puis plus rien ; un autre texte reste tel quel', ctx.tcBulleTapee('rdv coiffeur demain 10h') === 'rdv coiffeur dem 10h' && ctx.tcBulleTapee('rdv coiffeur demain 10h') === 'rdv coiffeur demain 10h' && (vm.runInContext("_tcTexteTape = { tape: 'dem', corrige: 'demain' };", ctx), ctx.tcBulleTapee('Je veux créer un nouveau rendez-vous') === 'Je veux créer un nouveau rendez-vous'));
  verifie('un complément se compose : « Dermatologue » puis « mardi 15h » → « Dermatologue mardi 15h » ; « Mercredi 15h » + oui + « dentiste » → « Mercredi 15h dentiste »', classer('mardi 15h', h2).compose === 'Dermatologue mardi 15h' && classer('dentiste', h1b).compose === 'Mercredi 15h dentiste', classer('mardi 15h', h2).compose);
  verifie('« supprime mon compte », « annule mon abonnement », « annule la synchro » : le compte, Charly oriente vers le profil (nature réponse)', ['supprime mon compte', 'annule mon abonnement', 'annule la synchro', 'change mon mot de passe'].every((p) => classer(p).classe === 'compte' && classer(p).nature === 'reponse' && /profil/.test(classer(p).question)), classer('supprime mon compte').question);
  verifie('« annule tout », « efface tout mon agenda » → « Tous tes rendez-vous, mais de quel jour ? » ; puis « demain » se compose en « annule tout demain » (annulation ciblée)', classer('annule tout').question === 'Tous tes rendez-vous, mais de quel jour ?' && classer('efface tout mon agenda').classe === 'piece_manquante' && classer('demain', bulle('annule tout')).compose === 'annule tout demain' && !!ctx.detecterSuppressionRdv('annule tout demain'), classer('demain', bulle('annule tout')).compose);
  verifie('tcDetecterInfoAnnulation : « le match est annulé », « la réunion a été annulée », « les cours sont annulés » oui ; « annule le match », « je suis annulé » non', ctx.tcDetecterInfoAnnulation('le match est annulé') === 'match' && ctx.tcDetecterInfoAnnulation('la réunion a été annulée') === 'reunion' && ctx.tcDetecterInfoAnnulation('les cours sont annulés') === 'cours' && !ctx.tcDetecterInfoAnnulation('annule le match') && !ctx.tcDetecterInfoAnnulation('pourquoi tu as annulé ?'), ctx.tcDetecterInfoAnnulation('la réunion a été annulée'));
  ctx.events = agenda().concat([ev('match', 'Match de foot', 3, 18, 0, 20, 0)]); ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null;', ctx);
  await ctx.tcGererInfoAnnulation('le match est annulé', 'match');
  verifie('« le match est annulé » → « Je retire « Match de foot » de ton agenda ? » (oui/non), rien n est retiré avant la réponse', /Je retire « Match de foot » de ton agenda \?/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionEnAttente', ctx).length === 1 && ctx.events.some((e) => e.id === 'match'), ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
  ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null;', ctx);
  await ctx.tcGererInfoAnnulation('le concert est annulé', 'concert');
  verifie('« le concert est annulé » (pas dans l agenda) → « rien à retirer »', /rien à retirer/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionEnAttente', ctx) === null);
  verifie('charlySendMessage : l information d annulation passe avant l annulation sans cible, chaque bloc une seule fois', csm.indexOf('const _objetAnnule = tcDetecterInfoAnnulation(text);') > csm.indexOf('if (detecterSuppressionRdv(text)) {') && csm.indexOf('const _objetAnnule = tcDetecterInfoAnnulation(text);') < csm.indexOf('if (tcDetecterSuppressionSansCible(text)) {') && (csm.match(/if \(tcDetecterSuppressionSansCible\(text\)\) \{/g) || []).length === 1 && (csm.match(/tcDetecterInfoAnnulation\(text\)/g) || []).length === 1);
  verifie('« la réunion a été annulée », « la séance est annulée », « le match est annulé » : reconnues par le classement (détecteur), jamais une pièce manquante', ['la réunion a été annulée', 'la séance est annulée', 'le match est annulé', 'le dîner est annulé'].every((p) => classer(p).classe === 'claire' && classer(p).indices && classer(p).indices.detecteur), ['la réunion a été annulée', 'la séance est annulée'].map((p) => classer(p).classe + ' ' + (classer(p).question || '')).join(' | '));
  ctx.events = agenda().concat([ev('golf2', 'Partie de golf', 11, 9, 0, 10, 0)]); ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null; _tcSuppressionChoix = null;', ctx);   // deux golfs : lundi 19 à 14h, lundi 26 à 9h
  await ctx.tcGererInfoAnnulation('le golf du 26 est annulé', 'golf du 26');
  verifie('« le golf du 26 est annulé » : le jour écrit filtre, c est le golf du 26 (9h) qui est proposé', /Je retire « Partie de golf »/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionEnAttente', ctx)[0].id === 'golf2', ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
  ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null;', ctx);
  await ctx.tcGererInfoAnnulation('le golf de la semaine prochaine est annulé', 'golf de la semaine prochaine');
  verifie('« le golf de la semaine prochaine est annulé » : la période filtre (le golf du 19)', vm.runInContext('_tcSuppressionEnAttente', ctx) && vm.runInContext('_tcSuppressionEnAttente', ctx)[0].id === 'golf', JSON.stringify((vm.runInContext('_tcSuppressionEnAttente', ctx) || []).map((e) => e.id)));
  ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null; _tcSuppressionChoix = null;', ctx);
  await ctx.tcGererInfoAnnulation('le golf est annulé', 'golf');
  verifie('« le golf est annulé » sans jour, deux golfs : « Lequel ? » numéroté, rien n est retiré', /^Lequel \?\n1\. Partie de golf : .*\n2\. Partie de golf : .*\nDis-moi son numéro/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionChoix', ctx).length === 2 && vm.runInContext('_tcSuppressionEnAttente', ctx) === null, ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
  ctx.events = agenda();
  verifie('la composition ne colle le contexte qu à une pièce : après « Marc est en retard » (choix d action), « préviens Sophie » et « décale le dentiste » partent seuls ; après « Dermatologue », « en fait non, laisse tomber, mes rdv de demain » part seul ; après « golf samedi », « non dimanche plutôt » aussi', !classer('préviens Sophie', bulle('Marc est en retard')).compose && classer('préviens Sophie', bulle('Marc est en retard')).classe === 'claire' && !classer('décale le dentiste', bulle('Marc est en retard')).compose && !classer('en fait non, laisse tomber, mes rdv de demain', h2).compose && classer('en fait non, laisse tomber, mes rdv de demain', h2).classe === 'claire' && !classer('non dimanche plutôt', bulle('golf samedi')).compose, [classer('préviens Sophie', bulle('Marc est en retard')).compose, classer('décale le dentiste', bulle('Marc est en retard')).compose, classer('en fait non, laisse tomber, mes rdv de demain', h2).compose, classer('non dimanche plutôt', bulle('golf samedi')).compose].join(' | '));
  ctx.events = agenda().concat([ev('golf2', 'Partie de golf', 11, 9, 0, 10, 0)]); ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionEnAttente = null; _tcSuppressionChoix = null;', ctx);
  await ctx.tcGererInfoAnnulation('le golf du 20 est annulé', 'golf du 20');
  verifie('« le golf du 20 est annulé » (aucun golf le 20) : Charly le dit et propose le golf du 19 (« c’est celui-là que je retire ? »), rien en silence', /Je ne trouve pas de « golf » (2026-10-20|mardi 20 octobre)\. Tu as <b>Partie de golf<\/b> (2026-10-19|lundi 19 octobre) .* : c’est celui-là que je retire \?/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionEnAttente', ctx)[0].id === 'golf', ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
  verifie('après « Marc est en retard » → « je décale…, ou je préviens quelqu’un ? », « préviens Sophie » est la réponse : prévenir Sophie du retard de Marc (retardAutre), pas une composition', !!classer('préviens Sophie', bulle('Marc est en retard')).retardAutre && classer('préviens Sophie', bulle('Marc est en retard')).retardAutre.texte === 'Marc est en retard' && !classer('préviens Sophie', bulle('Marc est en retard')).compose && !classer('préviens Sophie', h2).retardAutre);
  { const envois = []; ctx.tcConfirm = async () => true; ctx.tcTransmettrePrevenance = async (c, t) => { envois.push([c.name, t]); return 'sms'; }; ctx.tcDirePrevenance = (chemin, nom) => { ctx.charlyIA.history.push({ role: 'assistant', content: 'Envoyé à ' + nom + ' (' + chemin + ').' }); };
    ctx.userAccount = { firstname: 'Inès' }; ctx.events = agenda();
    ctx.charlyIA.history = [];
    await ctx.tcPrevenirRetardAutre('préviens Sophie', classer('préviens Sophie', bulle('Marc est en retard')).retardAutre);
    verifie('tcPrevenirRetardAutre : le message rédigé par Charly « Bonjour Sophie, Inès me demande de te prévenir : Marc Dupont a du retard pour « Dentiste », <date> 15h à 16h. » part à Sophie Anceau après confirmation', envois.length === 1 && envois[0][0] === 'Sophie Anceau' && envois[0][1] === 'Bonjour Sophie, Inès me demande de te prévenir : Marc Dupont a du retard pour « Dentiste », ' + iso(1) + ' 15h à 16h.' && /Envoyé à Sophie Anceau/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content), JSON.stringify(envois));
    ctx.charlyIA.history = []; envois.length = 0;
    await ctx.tcPrevenirRetardAutre('préviens le', classer('préviens Sophie', bulle('Marc est en retard')).retardAutre);
    verifie('sans personne nommée : « Qui veux-tu prévenir ? », rien ne part', envois.length === 0 && /Qui veux-tu prévenir \?/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));
    { const hQui = bulle('Marc est en retard').concat([{ role: 'user', content: 'préviens' }, ctx.charlyIA.history[ctx.charlyIA.history.length - 1]]);
      verifie('la réponse « Sophie » ou « Sophie Anceau » à « Qui veux-tu prévenir ? » retrouve le chemin (retardAutre, proposition gardée)', !!classer('Sophie', hQui).retardAutre && classer('Sophie', hQui).retardAutre.texte === 'Marc est en retard' && !!classer('Sophie Anceau', hQui).retardAutre && !classer('mes rdv de demain', hQui).retardAutre, JSON.stringify(classer('Sophie', hQui)));
      ctx.charlyIA.history = []; envois.length = 0;
      await ctx.tcPrevenirRetardAutre('Sophie', classer('Sophie', hQui).retardAutre);
      verifie('et « Sophie » envoie bien à Sophie Anceau le message rédigé', envois.length === 1 && /^Bonjour Sophie, Inès me demande de te prévenir : Marc Dupont a du retard pour « Dentiste »/.test(envois[0][1]), JSON.stringify(envois)); }
    ctx.charlyIA.history = []; envois.length = 0;
    await ctx.tcPrevenirRetardAutre('préviens Sophie', classer('préviens Sophie', bulle('le train est en retard')).retardAutre);
    verifie('« le train est en retard » puis « préviens Sophie » → « Bonjour Sophie, Inès me demande de te prévenir : le train a du retard. »', envois.length === 1 && envois[0][1] === 'Bonjour Sophie, Inès me demande de te prévenir : le train a du retard.', JSON.stringify(envois));
    ctx.userAccount = null; ctx.charlyIA.history = []; envois.length = 0;
    await ctx.tcPrevenirRetardAutre('préviens Sophie', classer('préviens Sophie', bulle('le train est en retard')).retardAutre);
    verifie('sans prénom connu : « je suis chargé de te prévenir »', envois.length === 1 && envois[0][1] === 'Bonjour Sophie, je suis chargé de te prévenir : le train a du retard.', JSON.stringify(envois));
    ctx.userAccount = { firstname: 'Inès' };
    verifie('« tu es en retard » tapé à Charly : une remarque, pas un retard à annoncer : Charly demande ce qu il veut dire', classer('tu es en retard').classe === 'doute' && /trop tard, ou que quelqu’un est en retard \?$/.test(classer('tu es en retard').question) && classer('t’es en retard').classe === 'doute', classer('tu es en retard').question);
    ctx.charlyIA.history = []; envois.length = 0;
    await ctx.tcPrevenirRetardAutre('préviens Sophie', classer('préviens Sophie', bulle('en retard ?')).retardAutre);
    verifie('« en retard ? » puis « préviens Sophie » : retardataire inconnu, Charly demande qui est en retard, jamais une question recopiée', envois.length === 0 && /Je ne sais pas qui est en retard/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content), ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
    ctx.charlyIA.history = []; envois.length = 0;
    await ctx.tcPrevenirRetardAutre('préviens Marc', classer('préviens Marc', bulle('Marc est en retard')).retardAutre);
    verifie('« Marc est en retard » puis « préviens Marc » : « Marc Dupont est en retard ; tu veux prévenir quelqu’un d’autre, ou lui écrire ? », rien ne part', envois.length === 0 && /^Marc Dupont est en retard ; tu veux prévenir quelqu’un d’autre, ou lui écrire \?$/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content), ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content);
    ctx.charlyIA.history = []; ctx.tcConfirm = async () => false;
    await ctx.tcPrevenirRetardAutre('préviens Sophie', classer('préviens Sophie', bulle('Marc est en retard')).retardAutre);
    verifie('s il refuse la confirmation : rien ne part', envois.length === 0 && /je ne préviens personne/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));
    delete ctx.tcConfirm; delete ctx.tcTransmettrePrevenance; delete ctx.tcDirePrevenance; }
  verifie('charlySendMessage appelle tcPrevenirRetardAutre sur la réponse « préviens X »', /if \(_classe\.retardAutre\) \{ await tcPrevenirRetardAutre\(text, _classe\.retardAutre\); return; \}/.test(csm));
  ctx.events = agenda();
  verifie('mais « mardi 15h » après « Dermatologue », « 14h » après « golf samedi », « demain » après « annule tout » se composent toujours', classer('mardi 15h', h2).compose === 'Dermatologue mardi 15h' && classer('14h', bulle('golf samedi')).compose === 'golf samedi 14h' && classer('demain', bulle('annule tout')).compose === 'annule tout demain');
  // Groupe 1 : les petites phrases sociales, une réponse, jamais « pas compris ».
  const sociaux = { 'tkt': /Merci/, 'mdr': /😄/, 'ptdr': /😄/, '😂': /😊/, '👍': /😊/, 'ras': /Je suis là/, 'ça va et toi': /Très bien, merci/, 'rien': /Je suis là/, 'tu sers à rien': /Pardon, je fais de mon mieux/, 'je t’ai pas parlé': /je me tais/,
    'raconte une blague': /blagues/, 'écris-moi un petit poème': /poésie/, 'mets de la musique': /musique/, 'je m’ennuie': /agenda/, 't’es nul': /Pardon/, 'tu dors jamais ?': /Jamais/, 'tu parles anglais ?': /langue/, 'tu m’aimes ?': /Je t’aime bien/,
    'quelle heure il est': /^Il est 10h00\./, 'quel jour on est': /^Nous sommes le jeudi 15 octobre 2026\./, 'on sera quel jour demain': /^Demain, c’est vendredi 16 octobre\./, 'c’est quand Noël': /25 décembre : dans 71 jours/, 'combien de jours avant Noël': /dans 71 jours/, 'combien font 12 fois 7': /12 fois 7 font 84/ };
  let nbSociaux = 0;
  Object.keys(sociaux).forEach((p) => { const r = classer(p); const ok = r.classe === 'social' && r.nature === 'reponse' && sociaux[p].test(r.question); if (ok) nbSociaux++; else { ko++; console.log('  KO  social « ' + p + ' » → ' + r.classe + ' : ' + r.question); } });
  verifie(nbSociaux + ' phrases sociales sur ' + Object.keys(sociaux).length + ' reçoivent une réponse courte (nature réponse)', nbSociaux === Object.keys(sociaux).length);
  verifie('chaque réponse sociale finit par la question ouverte « Je peux t’aider pour un rendez-vous ? » ou « Je suis là si tu as besoin de moi. »', Object.keys(sociaux).every((p) => /(je peux t’aider pour un rendez-vous \?|Je suis là si tu as besoin de moi\.|pour ton agenda \?|décaler \?)$/i.test(classer(p).question)), Object.keys(sociaux).filter((p) => !/(je peux t’aider pour un rendez-vous \?|Je suis là si tu as besoin de moi\.|pour ton agenda \?|décaler \?)$/i.test(classer(p).question)).map((p) => classer(p).question).join(' | '));
  verifie('après une réponse sociale (question ouverte), « Cv ? » se classe encore', classer('Cv ?', [{ role: 'user', content: 'tkt' }, { role: 'assistant', content: classer('tkt').question, nature: 'reponse', _classement: 'social' }]).classe === 'reaction');
  verifie('« dacc », « ah oui c’est vrai », « t’es génial », « merci bcp » : acquiescement ou remerciement, nature réponse', classer('dacc').classe === 'acquiescement' && classer('dacc').nature === 'reponse' && classer('ah oui c’est vrai').classe === 'acquiescement' && ['remerciement', 'social'].indexOf(classer('t’es génial').classe) > -1 && classer('t’es génial').nature === 'reponse' && classer('merci bcp').classe === 'remerciement' && classer('merci bcp').nature === 'reponse', [classer('dacc').classe, classer('ah oui c’est vrai').classe, classer('t’es génial').classe, classer('merci bcp').classe].join(' '));
  verifie('« c’est pas la question » : contestation ; après une liste, « c’est tout ? » passe (suite)', classer('c’est pas la question').classe === 'contestation' && classer('c’est tout ?', apresResultat).classe === 'claire');
  verifie('« pourquoi jeudi ? » n est plus une consultation de l agenda', !ctx.detecterConsultationAgenda('pourquoi jeudi ?'));
  // Groupe 3 : annuler sans cible.
  verifie('tcDetecterSuppressionSansCible : « Annule », « stp annule », « Annule ça », « Marc a annulé », « supprime stp » oui ; « annule le golf », « annule la suppression », « annule ce que tu viens de faire », « supprime le rendez-vous stp » (l annulation ciblée le prend) non', ['Annule', 'stp annule', 'Annule ça', 'Marc a annulé', 'supprime stp'].every((p) => ctx.tcDetecterSuppressionSansCible(p)) && ['annule le golf', 'annule la suppression', 'annule ce que tu viens de faire', 'supprime le rendez-vous stp'].every((p) => !ctx.tcDetecterSuppressionSansCible(p)), ['Annule', 'stp annule', 'Annule ça', 'Marc a annulé', 'supprime stp'].map((p) => ctx.tcDetecterSuppressionSansCible(p)).join(' '));
  const autresCibles = ['supprime mon compte', 'annule mon abonnement', 'annule la synchro', 'efface le message', 'efface tout', 'annule tout', 'le match est annulé', 'pourquoi tu as annulé ?', 'Hugo a annulé'];
  verifie('un autre objet (compte, abonnement, synchro, message, tout), une information ou une question ne sont pas « sans cible » ; « Hugo a annulé » sans contact Hugo non plus', autresCibles.every((p) => !ctx.tcDetecterSuppressionSansCible(p)), autresCibles.filter((p) => ctx.tcDetecterSuppressionSansCible(p)).join(' | '));
  const noelRdv = ['dîner de Noël chez maman le 24 à 20h', 'réveillon de Noël samedi 19h', 'marché de Noël dimanche 15h'];
  verifie('« Noël » dans un rendez-vous n est pas la question sociale ; « Noël chez mamie » en réponse au modèle passe ; « Noël c’est quand ? » reste social', noelRdv.every((p) => classer(p).classe !== 'social') && classer('Noël chez mamie', apresModele).classe === 'claire' && classer('Noël c’est quand ?').classe === 'social', noelRdv.map((p) => classer(p).classe).join(' '));
  ctx.events = agenda();
  verifie('tcDeplacementLocal ne déplace rien sur une création : « mets un rdv dentiste mardi 15h », « mets dentiste samedi 9h », « remets un golf samedi 10h »', ['mets un rdv dentiste mardi 15h', 'mets dentiste samedi 9h', 'remets un golf samedi 10h'].every((p) => ctx.tcDeplacementLocal(p, new DateFixe()) === null), ['mets un rdv dentiste mardi 15h', 'mets dentiste samedi 9h', 'remets un golf samedi 10h'].map((p) => JSON.stringify(ctx.tcDeplacementLocal(p, new DateFixe()))).join(' '));
  verifie('tcDetecterMarcheArriere : « annule ce que tu viens de faire », « défais ce que tu as fait »', ctx.tcDetecterMarcheArriere('annule ce que tu viens de faire') && ctx.tcDetecterMarcheArriere('défais ce que tu as fait'));
  ctx.charlyIA.history = []; ctx.events = agenda(); vm.runInContext('_tcSuppressionChoix = null; _tcSuppressionEnAttente = null;', ctx);
  await ctx.tcGererSuppressionSansCible('Annule');
  { const d = ctx.charlyIA.history[ctx.charlyIA.history.length - 1]; const choix = vm.runInContext('_tcSuppressionChoix', ctx);
    verifie('« Annule » → « Lequel ? » avec les 3 prochains rendez-vous numérotés (Dentiste, Partie de golf, Déjeuner avec Sophie), nature question', /^Lequel \?\n1\. Dentiste : .*\n2\. Partie de golf : .*\n3\. Déjeuner avec Sophie : .*\nDis-moi son numéro, son heure ou son nom\.$/.test(d.content) && d.nature === 'question' && choix && choix.length === 3, d.content);
    verifie('« 2 », « le deuxième », « le golf », « 14h » désignent la Partie de golf', ctx.tcRdvDesigne(choix, '2') === choix[1] && ctx.tcRdvDesigne(choix, 'le deuxième') === choix[1] && ctx.tcRdvDesigne(choix, 'le golf') === choix[1] && ctx.tcRdvDesigne(choix, '14h') === choix[1]); }
  ctx.charlyIA.history = []; vm.runInContext('_tcSuppressionChoix = null;', ctx);
  await ctx.tcGererSuppressionSansCible('Marc a annulé');
  verifie('« Marc a annulé » (un seul rendez-vous avec Marc) : la confirmation oui/non sur le Dentiste', /Tu veux annuler ce rendez-vous \?/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && /Dentiste/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content) && vm.runInContext('_tcSuppressionEnAttente', ctx).length === 1);
  ctx.charlyIA.history = []; ctx.events = []; vm.runInContext('_tcSuppressionEnAttente = null;', ctx);
  await ctx.tcGererSuppressionSansCible('annule ça');
  verifie('sans rendez-vous à venir : « rien à annuler »', /rien à annuler/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));
  // Groupe 4 : déplacer un rendez-vous existant, sans le modèle.
  const agendaDep = () => agenda().concat([ev('reunion', 'Réunion équipe', 5, 14, 0, 15, 0)]);   // mardi 20 octobre 14h
  const dep = (t) => { ctx.events = agendaDep(); return ctx.tcDeplacementLocal(t, new DateFixe()); };
  const pl = (r) => r && r.liste ? r.liste[0].ev.title + ' → ' + r.liste[0].p.date + ' ' + r.liste[0].p.startH + ':' + String(r.liste[0].p.startM).padStart(2, '0') + '-' + r.liste[0].p.endH + ':' + String(r.liste[0].p.endM).padStart(2, '0') : JSON.stringify(r);
  verifie('« déplace le dentiste à mercredi à 10h » → Dentiste mercredi 21 octobre 10h-11h (jamais une carte)', pl(dep('déplace le dentiste à mercredi à 10h')) === 'Dentiste → 2026-10-21 10:00-11:00', pl(dep('déplace le dentiste à mercredi à 10h')));
  verifie('« Avance le déjeuner avec Sophie à 11h30 » → même jour, 11h30-13h00', pl(dep('Avance le déjeuner avec Sophie à 11h30')) === 'Déjeuner avec Sophie → ' + iso(5) + ' 11:30-13:00', pl(dep('Avance le déjeuner avec Sophie à 11h30')));
  verifie('« Mets le dentiste de vendredi à 11h » → vendredi 16 octobre 11h-12h', pl(dep('Mets le dentiste de vendredi à 11h')) === 'Dentiste → ' + iso(1) + ' 11:00-12:00', pl(dep('Mets le dentiste de vendredi à 11h')));
  verifie('« Reporte la réunion de mardi à la semaine prochaine même heure » → mardi 27 octobre 14h-15h', pl(dep('Reporte la réunion de mardi à la semaine prochaine même heure')) === 'Réunion équipe → 2026-10-27 14:00-15:00', pl(dep('Reporte la réunion de mardi à la semaine prochaine même heure')));
  verifie('« décale la réunion de mardi à jeudi même heure » → jeudi 22 octobre 14h ; la faute « decalle … a jeudi meme heure » aussi, une fois corrigée', pl(dep('décale la réunion de mardi à jeudi même heure')) === 'Réunion équipe → 2026-10-22 14:00-15:00' && pl(dep(corr('decalle la reunion de mardi a jeudi meme heure'))) === 'Réunion équipe → 2026-10-22 14:00-15:00', pl(dep('décale la réunion de mardi à jeudi même heure')));
  verifie('sans destination (« décale le dentiste »), ou sans rendez-vous connu (« déplace le piano à 10h ») : null, le chemin habituel', dep('décale le dentiste') === null && dep('déplace le piano à 10h') === null);
  ctx.events = agendaDep().concat([ev('dej2', 'Déjeuner équipe', 6, 12, 0, 13, 0)]);
  { const r = ctx.tcDeplacementLocal('décale le déjeuner à 13h', new DateFixe()); verifie('deux déjeuners conviennent : la page demande lequel, rien n est déplacé', r && r.question && /2 rendez-vous qui conviennent/.test(r.question) && /Lequel veux-tu déplacer \?$/.test(r.question), r && r.question); }
  // L exécution : sans contact, déplacé tout de suite ; avec un contact, la question « prévenir ? ».
  ctx.events = agendaDep(); ctx.charlyIA.history = []; vm.runInContext('_tcDeplacementEnAttente = null;', ctx);
  await ctx.tcGererDeplacementLocal('décale le golf à 15h', ctx.tcDeplacementLocal('décale le golf à 15h', new DateFixe()));
  { const golf = ctx.events.find((e) => e.id === 'golf'); const d = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
    verifie('« décale le golf à 15h » : le golf (sans contact) est déplacé à 15h-17h, « C’est fait, rendez-vous déplacé », marche arrière possible', golf.startH === 15 && golf.endH === 17 && golf.date === iso(4) && /C'est fait, rendez-vous déplacé/.test(d.content) && vm.runInContext('_tcMarcheArriere', ctx) && vm.runInContext('_tcMarcheArriere', ctx).type === 'deplacement', d.content); }
  ctx.events = agendaDep(); ctx.charlyIA.history = [];
  await ctx.tcGererDeplacementLocal('déplace le dentiste à mercredi à 10h', ctx.tcDeplacementLocal('déplace le dentiste à mercredi à 10h', new DateFixe()));
  { const d = ctx.charlyIA.history[ctx.charlyIA.history.length - 1]; const att = vm.runInContext('_tcDeplacementEnAttente', ctx);
    verifie('« déplace le dentiste à mercredi à 10h » (contact Marc Dupont) : « Je déplace : … Veux-tu que je prévienne Marc Dupont … ? », rien n est déplacé avant la réponse', /^Je déplace :\n• « Dentiste » : .*\n\nVeux-tu que je prévienne Marc Dupont, ou as-tu déjà vu le sujet ensemble \?$/.test(d.content) && d.nature === 'question' && att && att.liste.length === 1 && ctx.events.find((e) => e.id === 'dentiste').date === iso(1), d.content); }
  verifie('charlySendMessage : le déplacement local passe après « rendez-vous introuvable » et avant la demande de créneau ; tcTraiterDeplacement partage tcExecuterDeplacement', csm.indexOf('const _local = tcDeplacementLocal(text, new Date());') > csm.indexOf('const introuvable = tcRdvNommeIntrouvable(') && csm.indexOf('const _local = tcDeplacementLocal(text, new Date());') < csm.indexOf('const _creneau = detecterDemandeCreneau(text);') && /tcExecuterDeplacement\(liste\);\s+return true;\s+\}/.test(extraire('tcTraiterDeplacement') || ''));
  verifie('charlySendMessage : après « Lequel ? », le rendez-vous désigné passe par le « oui / non » (jamais de suppression immédiate)', /if \(_tcSuppressionChoix\) \{\s+const choisi = tcRdvDesigne\(_tcSuppressionChoix, text\);\s+_tcSuppressionChoix = null;\s+if \(choisi\) \{\s+tcPousserMessageUtilisateur\(text\);[\s\S]{0,200}_tcSuppressionEnAttente = \[choisi\];/.test(csm) && !/tcSupprimerRdvs\(\[choisi\]\)/.test(csm));
  verifie('charlySendMessage : l annulation sans cible passe juste après l annulation ciblée', csm.indexOf('if (tcDetecterSuppressionSansCible(text)) {') > csm.indexOf('if (detecterSuppressionRdv(text)) {') && csm.indexOf('if (tcDetecterSuppressionSansCible(text)) {') < csm.indexOf('const _consultation = detecterConsultationAgenda(text);'));
  // Groupe 5 : à plusieurs.
  ctx.contactsList = ctx.contactsList.concat([{ id: 'h', name: 'Hugo Besnard', referenceCompte: 'HQ1' }, { id: 'g', name: 'Gaëlle Perrin', referenceCompte: 'GP1' }]);
  verifie('« Trouve-nous un moment avec Hugo, Gaëlle et Paul cette semaine » et « Propose un déjeuner à Hugo et Gaëlle » : rendez-vous à plusieurs (deux comptes), pas les créneaux perso', !!ctx.tcDetecterRdvGroupe('Trouve-nous un moment avec Hugo, Gaëlle et Paul cette semaine') && ctx.tcDetecterRdvGroupe('Trouve-nous un moment avec Hugo, Gaëlle et Paul cette semaine').contacts.length >= 2 && !!ctx.tcDetecterRdvGroupe('Propose un déjeuner à Hugo et Gaëlle'), JSON.stringify(ctx.tcDetecterRdvGroupe('Trouve-nous un moment avec Hugo, Gaëlle et Paul cette semaine')));
  verifie('mais « trouve-moi un moment cette semaine » (personne) reste une demande de créneau perso', !ctx.tcDetecterRdvGroupe('trouve-moi un moment cette semaine'));

  titre('7. La langue, le seuil, « où », la nature des réponses');
  ctx.currentLanguage = 'en';
  verifie('dans une autre langue, le classement s efface (le modèle garde la main)', classer('Cv ?').classe === 'claire' && classer('Cv ?').raison === 'langue');
  ctx.currentLanguage = 'fr';
  verifie('le seuil est 2 : « Mercredi 15h » (un seul moment) reste à 1, « il fait beau dehors » à 0', vm.runInContext('TC_CLASSE_SEUIL', ctx) === 2 && classer('Mercredi 15h').indices.score === 1 && classer('il fait beau dehors').indices.score === 0, [classer('Mercredi 15h').indices.score, classer('il fait beau dehors').indices.score].join(' '));
  verifie('« où » compte comme mot de question (ù n est pas une lettre pour \\b)', classer('où est mon rdv ?').indices === null || classer('où est mon rdv ?').classe === 'claire');
  verifie('tcNatureReponse : bloc [AGENDA] → action ; « Sauf erreur de ma part » → question ; sinon réponse', ctx.tcNatureReponse('ok\n[AGENDA]\n2026-10-16 | 10:00-11:00 | X | rdv\n[/AGENDA]') === 'action' && ctx.tcNatureReponse('Sauf erreur de ma part, je n’ai pas bien compris ta demande. Tu veux dire … ?') === 'question' && ctx.tcNatureReponse('Tu as un rendez-vous demain à 15h.') === 'reponse');
  verifie('aucune question du bloc ne fait plus d une phrase (un seul point final, hors « Bonjour ! »)', (bloc.match(/question: '[^']*'/g) || []).every((q) => q.indexOf('. ') < 0 || /Bonjour|Bonsoir|bientôt/.test(q)), (bloc.match(/question: '[^']*'/g) || []).filter((q) => q.indexOf('. ') > -1).join(' | '));
  verifie('« noté » avec accent ne traîne plus dans les acquiescements (norm est sans accents)', bloc.indexOf("'noté'") < 0);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
