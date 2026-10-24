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
verifie('« pas sûr » : la bulle de l utilisateur, la question (nature question, proposition et texte gardés), et on s arrête (return)', /if \(_classe\.classe !== 'claire'\) \{\s+tcPousserMessageUtilisateur\(text\);\s+await new Promise\(r => setTimeout\(r, 400\)\);\s+charlyIA\.history\.push\(\{ role: 'assistant', content: _classe\.question, nature: _classe\.classe === 'au_revoir' \? 'reponse' : 'question', _classement: _classe\.classe, _proposition: _classe\.proposition \|\| null, _texte: text \}\);\s+renderCharlyChat\(\);\s+return;\s+\}/.test(csm));
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
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); }
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
 'tcDetecterMalade', 'tcDetecterContrainte', 'detecterSuppressionRdv', 'tcDetecterPrevenance', 'tcReponseOuiNon',
 'detecterConsultationAgenda', 'tcGererConsultationAgenda', 'detecterDemandeCreneau',
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
  ['où aller manger ce soir ?', 'où on va en vacances ?'].forEach((p) => { const r = classer(p); verifie('« ' + p + ' » : hors agenda, Charly dit ce dont il s occupe et demande', r.classe === 'hors_agenda' && r.question === 'Je m’occupe seulement de ton agenda : je peux noter, décaler ou annuler un rendez-vous, prévenir quelqu’un ou trouver un créneau, qu’est-ce que je fais pour toi ?', r.classe + ' ' + (r.question || '')); });
  { const r = classer('c’est où la pharmacie la plus proche ?'); verifie('« c’est où la pharmacie la plus proche ? » : hors agenda, ou la recherche de professionnel (jamais le lieu d un rendez-vous)', r.classe === 'hors_agenda' || (r.classe === 'claire' && r.indices && r.indices.detecteur && !!ctx.detecterRechercheProfessionnel('c’est où la pharmacie la plus proche ?')), r.classe); }
  { const r = classer('pharmacie de garde à côté'); verifie('« pharmacie de garde à côté » : plus « quel jour et à quelle heure » ; hors agenda ou la recherche de professionnel', r.classe === 'hors_agenda' || (r.classe === 'claire' && r.indices && r.indices.detecteur), r.classe + ' ' + (r.question || '')); }
  verifie('tcDetecterPrevenance : « Marc est en retard », « tu es en retard », « Sophie a du retard », « le train en retard », « pas de retard », « en retard ? » ne sont pas MON retard', ['Marc est en retard', 'tu es en retard', 'Sophie a du retard', 'le train en retard', 'pas de retard', 'en retard ?'].every((p) => !ctx.tcDetecterPrevenance(p)));
  verifie('tcDetecterPrevenance : « retard », « retard 10 min », « 10 min de retard », « retard de 10 minutes », « je suis en retard », « j’ai 10 min de retard » le sont', ['retard', 'retard 10 min', '10 min de retard', 'retard de 10 minutes', 'je suis en retard', 'j’ai 10 min de retard'].every((p) => ctx.tcDetecterPrevenance(p) && ctx.tcDetecterPrevenance(p).type === 'retard'));
  verifie('« Marc est en retard » → « D’accord : je décale ton rendez-vous avec Marc Dupont, ou je préviens quelqu’un ? »', classer('Marc est en retard').classe === 'retard_autre' && classer('Marc est en retard').question === 'D’accord : je décale ton rendez-vous avec Marc Dupont, ou je préviens quelqu’un ?', classer('Marc est en retard').question);
  verifie('« le train est en retard » → « D’accord : je décale un rendez-vous, ou je préviens quelqu’un ? » ; puis « décale le dentiste » passe', classer('le train est en retard').question === 'D’accord : je décale un rendez-vous, ou je préviens quelqu’un ?' && classer('décale le dentiste', bulle('le train est en retard')).classe === 'claire', classer('le train est en retard').question);
  verifie('« pas de retard » n est pas un retard à traiter (classé comme un autre message)', classer('pas de retard').classe !== 'retard_autre' && classer('pas de retard').classe !== 'claire');
  verifie('« pas ça mardi, mercredi » : « pas » ne devient pas l objet', !/« pas »/.test(classer('pas ça mardi, mercredi').question || ''), classer('pas ça mardi, mercredi').question);
  verifie('« Sophie demain » → « À quelle heure, avec Sophie Anceau demain ? »', classer('Sophie demain').question === 'À quelle heure, avec Sophie Anceau demain ?', classer('Sophie demain').question);
  const apresRien = [{ role: 'user', content: 'non' }, { role: 'system_info', content: '❌ Annulation abandonnée, rien n\'a été touché.' }];
  verifie('en cours de conversation (après un résultat), « Marc est en retard » reste le retard d un autre et « où aller manger ce soir ? » hors agenda ; « Marc vient ? » reste une suite qui passe', classer('Marc est en retard', apresRien).classe === 'retard_autre' && classer('où aller manger ce soir ?', apresRien).classe === 'hors_agenda' && classer('Marc vient ?', apresRien).classe === 'claire' && classer('c’est où ?', apresRien).classe === 'claire', [classer('Marc est en retard', apresRien).classe, classer('où aller manger ce soir ?', apresRien).classe, classer('Marc vient ?', apresRien).classe, classer('c’est où ?', apresRien).classe].join(' '));

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
