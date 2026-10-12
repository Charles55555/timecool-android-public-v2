// Mission 7 (campagnes 4 et 6, 11/10) : Charly parle faux quand il cite des rendez-vous. Date fixee : dimanche 11/10/2026
// 14h20, agenda des Testeurs (campagne 6). Les noms, jours et heures viennent de l agenda local : la page construit la
// liste et la phrase ; un rendez-vous nomme qui n existe pas → « je ne trouve pas … », rien n est fait ; « supprime tout
// mardi apres-midi » liste TOUS les rendez-vous de la plage et demande oui/non ; la date en toutes lettres = celle du bloc ;
// une nouvelle demande abandonne la confirmation qui attendait, et le dit.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 260) : '')); }
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
const NOW = new Date(2026, 9, 11, 14, 20, 0);   // dimanche 11 octobre 2026, 14h20
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW.getTime()); } static now() { return NOW.getTime(); } }
const ev = (id, date, h1, m1, h2, m2, title) => ({ id, mode: 'user', date, startH: h1, startM: m1, endH: h2, endM: m2, title });
// Campagne 6 : mardi 13 = Rdv banque 16-17, Formation 15-17, Zorglub 16-17, Dr Martin 9-10 ; lundi 12 = Atelier 9-11, Estelle 11-12, Point rapide 14-14h30 ; pas de dentiste.
const AGENDA = () => [
  ev('a1', '2026-10-12', 9, 0, 11, 0, 'Atelier d’équipe'), ev('a2', '2026-10-12', 11, 0, 12, 0, 'Rendez-vous avec Estelle'), ev('a3', '2026-10-12', 14, 0, 14, 30, 'Point rapide'),
  ev('b1', '2026-10-13', 9, 0, 10, 0, 'Rendez-vous Dr. Martin'), ev('b2', '2026-10-13', 15, 0, 17, 0, 'Formation'), ev('b3', '2026-10-13', 16, 0, 17, 0, 'Rdv banque'), ev('b4', '2026-10-13', 16, 0, 17, 0, 'Rendez-vous avec Zorglub'),
  ev('b5', '2026-10-13', 18, 30, 19, 0, 'Coiffeur'), ev('c1', '2026-10-16', 14, 0, 16, 0, 'Revue budget'),
  ev('d1', '2026-12-03', 10, 0, 11, 0, 'Ostéopathe'),
];

function contexte() {
  const ctx = {
    console, Date: DateFixe, Math, JSON, Number, String, Set, Array, RegExp, Object, Promise, parseInt,
    setTimeout: (f) => { if (f) f(); return 0; }, mode: 'user', currentPage: 'chat',
    charlyIA: { history: [] }, events: AGENDA(), contactsList: [{ id: 'c1', name: 'Paul Durand' }],
    tcPousserMessageUtilisateur: (t) => ctx.charlyIA.history.push({ role: 'user', content: t }),
    tcDefinirStatutCharly() {}, renderCharlyChat() {}, render() {}, showToast() {},
    saveEventsToStorage() {}, addDemarche() {}, tcDernierMessageCharly: () => null,
  };
  vm.createContext(ctx);
  ['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', 'const TC_JOURS_SEMAINE = [\\s\\S]*?;\\n', 'const TC_MOIS = [\\s\\S]*?;\\n', "const TC_MOTS_CREUX = new Set\\([\\s\\S]*?\\.split\\(' '\\)\\);"]
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  ['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcEvenementFin', 'tcEvenementCouvre', 'tcHeureDansTexte', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande',
    'tcBlocAgendaDepuisAnnonce', 'tcPlusieursDatesOuRelatif', 'tcCorrigerPropositionsCharly', 'tcJoursCites', 'tcAnnonceUnConflit', 'tcIgnorerFauxConflit',
    'tcQuestionRdvDuJour', 'tcDeplacementHorsJour', 'tcListeDuJourPourDeplacement', 'tcRdvNommeIntrouvable', 'tcAccorderProseAuBloc', 'tcEstDeplacement', 'tcVerbeConjugue', 'tcHeureCourte', 'tcPlagesLibresDuJour', 'tcPhraseConflitLocale',
    'tcMotsDeRdv', 'tcTitreContient', 'tcMotDeLAgenda', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'escapeHTMLSafe',
    'detecterSuppressionRdv', 'tcMemoriserSuppression', 'tcReponseOuiNon', 'tcJoursDansTexte', 'tcBorneDeFin', 'tcJoursNommes', 'tcPhraseNonCompris',
    'tcPeriodeContrainte', 'tcPeriodeCoherente', 'tcPeriodeJourNomme', 'tcGererSuppressionRdv', 'tcConfirmerSuppressionRdv', 'tcSupprimerRdvs',
    'tcAnnulerSuppressionRdv', 'tcAbandonnerAttente', 'tcEstUneNouvelleDemande', 'tcRdvDesigne', 'tcPeriodeAgenda', 'parseFrenchDateFromText']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('let _tcSuppressionEnAttente = null; let _tcSuppressionChoix = null; let _tcMarcheArriere = null; globalThis.attente = () => _tcSuppressionEnAttente;', ctx);
  return ctx;
}
const ctx = contexte();
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Un rendez-vous nomme qui n existe pas : on le dit, rien n est fait (avant l appel au modele)');
const I = (x) => ctx.tcRdvNommeIntrouvable(x, NOW, ctx.events, 'user');
verifie('« reporte mon dentiste à jeudi » (aucun dentiste) → « Je ne trouve pas de rendez-vous « dentiste » … »', I('reporte mon dentiste à jeudi') === 'Je ne trouve pas de rendez-vous « dentiste » dans ton agenda à venir. Rien n’a été changé.', I('reporte mon dentiste à jeudi'));
verifie('« décale mon ostéopathe du 3 décembre à jeudi » (existe, au-delà de 14 jours) → null (examinateur)', I('décale mon ostéopathe du 3 décembre à jeudi') === null, I('décale mon ostéopathe du 3 décembre à jeudi'));
verifie('« change la couleur de mon agenda », « change mon mot de passe », « modifie mon profil » → null (pas un rendez-vous)', I('change la couleur de mon agenda') === null && I('change mon mot de passe') === null && I('modifie mon profil') === null);
verifie('« change mon rdv dentiste à jeudi » (verbe large + rdv, aucun dentiste) → refus ; « décale mon dentiste à jeudi » aussi', /dentiste/.test(I('change mon rdv dentiste à jeudi') || '') && /dentiste/.test(I('décale mon dentiste à jeudi') || ''));
verifie('« ajoute un déplacement à Lyon jeudi 9h », « mets mon déplacement à Paris vendredi » : des NOMS, pas le verbe → null (examinateur)', I('ajoute un déplacement à Lyon jeudi 9h') === null && I('mets mon déplacement à Paris vendredi') === null, I('ajoute un déplacement à Lyon jeudi 9h'));
verifie('« ajoute un reportage photo samedi 10h » (« report ») → null ; « quels sont mes déplacements cette semaine ? » (question) → null', I('ajoute un reportage photo samedi 10h') === null && I('quels sont mes déplacements cette semaine ?') === null);
verifie('« déplace mon coiffeur à lundi » (coiffeur mardi : existe) → null (le modele travaille)', I('déplace mon coiffeur à lundi') === null);
verifie('« décale Zorglub à mardi 16h » → null ; « repousse la formation d une heure » → null', I('décale Zorglub à mardi 16h') === null && I("repousse la formation d'une heure") === null);
verifie('« Décale mon rdv de mardi à 16h » (rien de nomme) → null', I('Décale mon rdv de mardi à 16h') === null);
verifie('« déplace mes rendez-vous de demain à après-demain » → null', I('déplace mes rendez-vous de demain à après-demain') === null);
verifie('une creation (« rdv dentiste mardi 15h ») → null', I('rdv dentiste mardi 15h') === null);
const csm = fonction(page, 'charlySendMessage') || '';
verifie('charlySendMessage s arrete la avant d appeler le modele', /const introuvable = tcRdvNommeIntrouvable\(text, new Date\(\), events, mode\);\s+if \(introuvable\) \{\s+tcPousserMessageUtilisateur\(text\);\s+charlyIA\.history\.push\(\{ role: 'assistant', content: introuvable \}\);\s+renderCharlyChat\(\);\s+return;/.test(csm) && csm.indexOf('tcRdvNommeIntrouvable') < csm.indexOf('detecterDemandeCreneau(text)'));

titre('2. La liste des rendez-vous d un jour vient de l agenda local');
const L = (r, u) => ctx.tcListeDuJourPourDeplacement(r, u, NOW, ctx.events, 'user');
const l1 = L('Tu as deux rendez-vous mardi 13 à 16h : Zorglub et banque. Lequel souhaites-tu déplacer ?', 'Décale mon rdv de mardi à 16h');
verifie('« Décale mon rdv de mardi à 16h » : Charly en citait 2 sur 5 → la page liste les 5 de mardi, dans l ordre', l1 === 'Tu as 5 rendez-vous mardi 13 octobre : « Rendez-vous Dr. Martin » 9h, « Formation » 15h, « Rdv banque » 16h, « Rendez-vous avec Zorglub » 16h, « Coiffeur » 18h30 — lequel ?', l1);
verifie('avec un bloc (deplacement compris) → null ; sans jour de depart → null ; pas un deplacement → null', L('[AGENDA]\n2026-10-13 | 16:00-17:00 | Rdv banque | travail\n[/AGENDA]', 'Décale mon rdv de mardi à 16h') === null && L('Lequel ?', 'décale Zorglub à mardi 16h') === null && L('Tu as 2 rendez-vous mardi. Lequel ?', 'qu ai-je mardi ?') === null);
verifie('une reponse qui ne parle pas de rendez-vous (« à quelle heure ? ») → null', L('À quelle heure ?', 'Décale mon rdv de mardi') === null);
verifie('charlySendMessage l applique apres les garde-fous, puis accorde la prose', /reply = tcListeDuJourPourDeplacement\(reply, text, new Date\(\), events, mode\) \|\| reply;\s+reply = tcAccorderProseAuBloc\(reply\);/.test(csm));

titre('3. La date en toutes lettres est celle du bloc');
const P = (r) => ctx.tcAccorderProseAuBloc(r);
const p1 = P('Le mardi 15 octobre 2026, à 15h, c’est noté.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]');
verifie('« mardi 15 octobre 2026 » avec un bloc du 13 → « mardi 13 octobre 2026 »', /^Le mardi 13 octobre 2026, à 15h, c’est noté\./.test(p1) && /2026-10-13 \| 15:00-16:00/.test(p1), p1);
verifie('« Mardi 15 octobre » (majuscule) → « Mardi 13 octobre » ; « mardi 15 » seul → « mardi 13 octobre »', /^Mardi 13 octobre,/.test(P('Mardi 15 octobre, 15h.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n[/AGENDA]')) && /^mardi 13 octobre à 15h/.test(P('mardi 15 à 15h\n[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n[/AGENDA]')));
verifie('« mardi 15h » (une heure) n est pas touche ; un autre jour (« lundi 12 octobre ») non plus', P('mardi 15h, après lundi 12 octobre.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n[/AGENDA]').startsWith('mardi 15h, après lundi 12 octobre.'));
verifie('une prose deja juste, deux lignes, ou sans bloc : inchangees', (() => { const a = 'mardi 13 octobre.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n[/AGENDA]'; const b = 'mardi 15 octobre.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | X | rdv\n2026-10-14 | 15:00-16:00 | X | rdv\n[/AGENDA]'; return P(a) === a && P(b) === b && P('mardi 15 octobre.') === 'mardi 15 octobre.'; })());

titre('4. Un conflit annonce sans heure dans la demande : l agenda du jour, dit par la page');
const FC = (r, u) => ctx.tcIgnorerFauxConflit(r, u, NOW, ctx.events, 'user');
const f1 = FC('Tu as déjà un rendez-vous avec Paul mardi à 10h.', 'mets le rdv de Paul vendredi');
verifie('« mets le rdv de Paul vendredi » + conflit invente → l agenda de vendredi (Revue budget) et « À quelle heure ? »', f1 === 'Je ne vois pas ce rendez-vous dans ton agenda. Vendredi 16 octobre 2026, tu as : Revue budget 14h à 16h. À quelle heure ?', f1);
const f2 = FC('Tu as déjà un rendez-vous avec Paul mardi à 10h.', 'mets le rdv de Paul jeudi');
verifie('jeudi (rien) → « Jeudi 15 octobre 2026 est libre dans ton agenda. À quelle heure ? »', f2 === 'Je ne vois pas ce rendez-vous dans ton agenda. Jeudi 15 octobre 2026 est libre dans ton agenda. À quelle heure ?', f2);
verifie('une question (« est-ce que j ai quelque chose vendredi ? ») avec une reponse juste → rien (examinateur)', FC('Oui, tu as déjà Revue budget vendredi à 14h.', "est-ce que j'ai quelque chose vendredi ?") === null && FC('Tu as déjà Revue budget.', "j'ai quoi vendredi") === null);
verifie('une creation sans heure, mais la reponse cite un rendez-vous vraiment present ce jour-la → rien (elle dit vrai)', FC('Vendredi tu as déjà la revue budget à 14h, à quelle heure veux-tu Paul ?', 'mets le rdv de Paul vendredi') === null);
verifie('avec une heure : mardi 10h libre → proposition ; mardi 16h pris → la phrase de conflit de la page (mission 11)', /Je te propose/.test(FC('Tu as déjà un rendez-vous mardi à 10h.', 'rdv Paul mardi 10h') || '') && /tu as déjà «/.test(FC('Mardi 16h est pris.', 'rdv Paul mardi 16h') || ''));

titre('5. « supprime tout mardi après-midi » : TOUS les rendez-vous de la plage, et une confirmation claire');
verifie('la phrase est reconnue comme une suppression (un jour de semaine seul suffit)', !!ctx.detecterSuppressionRdv('supprime tout mardi après-midi'));
verifie('« supprime tout jeudi » aussi ; « comment supprimer un rdv ? » toujours pas', !!ctx.detecterSuppressionRdv('supprime tout jeudi') && !ctx.detecterSuppressionRdv('comment supprimer un rdv ?'));
(async () => {
  const c = contexte();
  await c.tcGererSuppressionRdv('supprime tout mardi après-midi');
  const dit = c.charlyIA.history.map((m) => m.content).join(' | ');
  const att = c.attente();
  verifie('rien n est supprime : une question attend', c.events.length === 10 && Array.isArray(att), att && att.length);
  verifie('les 4 rendez-vous de mardi apres-midi (12h-19h) : Formation 15h, banque 16h, Zorglub 16h, Coiffeur 18h30 — pas Dr Martin 9h', att && att.map((e) => e.title).join(',') === 'Formation,Rdv banque,Rendez-vous avec Zorglub,Coiffeur', att && att.map((e) => e.title).join(','));
  verifie('la question : « Tu veux annuler ces 4 rendez-vous ? … Réponds « oui » ou « non » »', /Tu veux annuler ces 4 rendez-vous \?/.test(dit) && /Formation/.test(dit) && /Réponds « oui » ou « non »/.test(dit), dit.slice(0, 200));
  c.tcAnnulerSuppressionRdv();
  verifie('« non » → « Annulation abandonnée, rien n a été touché » (pas « Ajout annulé »)', /Annulation abandonnée, rien n'a été touché/.test(c.charlyIA.history[c.charlyIA.history.length - 1].content) && c.events.length === 10);

  titre('6. Une nouvelle demande pendant qu une confirmation attend : abandonnee, et dit');
  const c2 = contexte();
  c2.tcAbandonnerAttente('annulation');
  verifie('tcAbandonnerAttente(annulation) : « D’accord, je laisse tomber l’annulation qui attendait. Je passe à ta nouvelle demande. »', c2.charlyIA.history[0].role === 'assistant' && c2.charlyIA.history[0].content === 'D’accord, je laisse tomber l’annulation qui attendait. Je passe à ta nouvelle demande.', c2.charlyIA.history[0].content);
  c2.tcAbandonnerAttente('ajout'); c2.tcAbandonnerAttente('déplacement'); c2.tcAbandonnerAttente('proposition');
  verifie('les quatre libelles (ajout et proposition : « J’ai laissé tomber la proposition précédente », mission 13)', /J’ai laissé tomber la proposition précédente/.test(c2.charlyIA.history[1].content) && /le déplacement qui attendait/.test(c2.charlyIA.history[2].content) && /J’ai laissé tomber la proposition précédente/.test(c2.charlyIA.history[3].content));
  verifie('« supprime tout mardi après-midi » est une nouvelle demande ; « pourquoi ? » n en est pas une', c2.tcEstUneNouvelleDemande('supprime tout mardi après-midi') && !c2.tcEstUneNouvelleDemande('pourquoi ?'));
  verifie('charlySendMessage : annulation en attente + autre chose → abandon dit (2 endroits), deplacement en attente aussi', (csm.match(/tcAbandonnerAttente\('annulation'\);/g) || []).length === 2 && /tcAbandonnerAttente\('déplacement'\);/.test(csm));
  verifie('charlySendMessage : conflit ou proposition en attente + nouvelle demande → resolu/valide et abandon dit', /if \(reponse === null && tcEstUneNouvelleDemande\(text\)\) \{\s+if \(conflit\) conflit\._resolu = true; else proposition\._validated = true;\s+tcAbandonnerAttente\(conflit \? 'ajout' : 'proposition'\);/.test(csm));
  verifie('l ordre : la suppression en attente est traitee AVANT le bloc conflit/proposition (un « non » vise la bonne question)', csm.indexOf('if (_tcSuppressionEnAttente) {') < csm.indexOf('const conflit = tcConflitEnAttente();'));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
