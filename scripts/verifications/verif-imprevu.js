// « Gérer un imprévu » (mission 44, chef, 15/10, validée par Charles) : le bouton passe sur le moteur de questionnaire de
// la mission 43. Quoi (retard / partir plus tôt / rendez-vous qui s ajoute / je ne peux pas venir) → ça touche quoi
// (prochain / reste de la journée / un rendez-vous précis) → la solution du cas (prévenir avec la nouvelle heure ;
// décaler ou supprimer ; faire de la place) avec créneaux proposés → qui prévient → récap « Oui, vas-y » → « C’est fait. »
// et le bilan. Avec 43b : marche arrière qui ne rappelle que les contacts vraiment prévenus, « et » avant le dernier nom,
// formule neutre, jamais un créneau le week-end par défaut. Usage : node verif-imprevu.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
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

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
function agenda() {
  return [
    ev('a', 'Petit déjeuner', 0, 8, 0, 9, 0),                                           // passé
    ev('v', 'Fête', 0, 0, 0, 23, 59, { allDay: true }),                                  // journée entière
    ev('b', 'Dentiste', 0, 11, 0, 12, 0, { contact: 'c1' }),
    ev('p', 'Client', 0, 14, 0, 15, 0, { mode: 'pro' }),                                 // autre agenda
    ev('c', 'Coach', 0, 15, 0, 16, 0, { contact: 'c2' }),
    ev('d', 'Banque', 1, 10, 0, 11, 0),                                                  // vendredi
    ev('e', 'Kiné', 4, 9, 0, 10, 0)                                                      // lundi
  ];
}

const trace = { saves: 0, toasts: [], envois: [], demarches: [] };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, JSON, Math, parseInt, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [], config: {} },
  contactsList: [{ id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }],
  _dispoData: {}, loadDispo() {},
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; },
  addDemarche(d) { trace.demarches.push(d.title); },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcVouvoiement: () => false, tcDirePrevenance() {},
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return c.referenceCompte ? 'timecool' : (c.phone ? 'sms' : (c.email ? 'email' : 'aucun')); },
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  localStorage: { getItem: () => null, setItem() {} },
  tcDemarrerRdvAPlusieurs() {}, charlyAttachAction() {}, tcPrevenirRetard() {}, tcDemarrerNouveauRdv() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {}, tcDemarrerMalade() {},
  document: { getElementById: () => ({ value: '', style: {} }) }, Set, _agendaChecked: null
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcGroupeEnAttente = 0;', ctx);
[/const TC_VERBES_DE_DEMANDE = \[[^\]]*\];/, /const TC_MSG_MODELES = \{[\s\S]*?\n\};/].forEach((re) => { const m = page.match(re); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  constante introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcEvenementFin', 'tcEvenementCouvre',
 'tcEvenementSurPlusieursJours', 'tcEstBandeau', 'tcMinutesDeHeure', 'tcSansTempsProtege', 'tcDesPlagesDeclarees', 'tcPlagesDuJour', 'tcOccupationsDuJour',
 'tcCreneauxDisponibles', 'tcRemplirModele', 'tcValeursDuRdv', '_tcLigneRdv', 'tcAppliquerDeplacement', 'tcMemoriserSuppression',
 'tcSupprimerRdvs', 'tcPhraseNonCompris', 'tcRessembleAUneDemande', 'tcContactDuRdv', 'tcBulleCharly', 'charlyQuickAction',
 'tcCleModele', 'tcModeleMessage', 'tcHeureDansTexte', 'tcDetecterMarcheArriere', 'tcMarcheArriere', 'tcHeureLisible', 'tcJoursFermes', 'tcGererDemandeCreneau'
].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const debutBloc = page.indexOf('   QUESTIONNAIRE GUIDÉ DE CHARLY (mission 43');
const finBloc = page.indexOf('function showConflictWarning(');
const bloc = (debutBloc > -1 && finBloc > debutBloc) ? page.slice(page.lastIndexOf('/*', debutBloc), finBloc) : '';
verifie('le bloc « questionnaire guidé » est dans la page, avec le parcours « imprévu »', bloc.length > 1000 && bloc.indexOf('const TC_QUESTIONNAIRE_IMPREVU = {') > -1, bloc.length);
if (bloc) vm.runInContext(bloc, ctx);
if (ko) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }

const H = () => ctx.charlyIA.history;
const dernier = () => H()[H().length - 1];
const dc = () => String(dernier().content).replace(/<br>/g, String.fromCharCode(10));
const carte = () => { for (let i = H().length - 1; i >= 0; i--) if (H()[i]._questionnaire) return H()[i]; return null; };
const textes = () => H().map((m) => String(m.content || '').replace(/<br>/g, '\n')).join('\n');
const choixTextes = () => carte()._questionnaire.choix.map((c) => c.texte).join(' | ');
const enCours = () => vm.runInContext('_tcQuestionnaire', ctx);
const cliquer = async (i) => { await ctx.tcQuestionnaireRepondre(carte()._questionnaire.id, i); };
const taper = async (t) => ctx.tcQuestionnaireRepondreTexte(t);
const reinit = (evts) => { ctx.events = evts || agenda(); ctx.charlyIA.history = []; trace.saves = 0; trace.toasts.length = 0; trace.envois.length = 0; trace.demarches.length = 0; vm.runInContext('_tcQuestionnaire = null; _tcMarcheArriere = null;', ctx); };
const quand = (d, h) => ctx.tcQuestionnaireQuand(d, h);
const memoire = () => vm.runInContext('_tcMarcheArriere', ctx);

(async () => {
  titre('1. Le bouton : la bulle, puis « Qu’est-ce qui t’arrive ? », quatre choix, dans l ordre');
  reinit();
  ctx.charlyQuickAction('impprevu');
  await new Promise((r) => setTimeout(r, 0));
  verifie('la bulle « J’ai un imprévu » puis la carte', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'J’ai un imprévu' && carte() && carte()._questionnaire.question === 'Qu’est-ce qui t’arrive ?', textes());
  verifie('les quatre cas, textes exacts', choixTextes() === 'Je suis en retard | Je dois partir plus tôt | Un rendez-vous s’ajoute | Je ne peux pas venir', choixTextes());
  verifie('rien n est connu d avance', enCours() && Object.keys(enCours().reponses).length === 0);

  titre('2. En retard, le prochain rendez-vous, 15 minutes, Charly prévient : la nouvelle heure part, l agenda ne bouge pas');
  await cliquer(0);
  verifie('« Ça touche quoi ? » : pour un retard, deux choix seulement (jamais « le reste de la journée » : le même retard pour toute la journée n a pas de sens)', carte()._questionnaire.question === 'Ça touche quoi ?' && choixTextes() === 'Le prochain rendez-vous | Un rendez-vous précis', choixTextes());
  await cliquer(0);
  verifie('le prochain rendez-vous est « Dentiste » 11h (pas le petit déjeuner passé, pas la fête, pas l agenda pro)', /Le rendez-vous touché :\n• « Dentiste », /.test(textes()) && textes().indexOf('« Dentiste », ' + quand(iso(0), { startH: 11, startM: 0, endH: 12, endM: 0 })) > -1 && !/Petit déjeuner|Fête|Client/.test(textes()), textes());
  verifie('« Combien de retard, à peu près ? », quatre choix', carte()._questionnaire.question === 'Combien de retard, à peu près ?' && choixTextes() === '10 minutes | 15 minutes | 30 minutes | Environ 1 heure', choixTextes());
  verifie('« 15 » tapé vaut le bouton « 15 minutes »', await taper('15') === true && enCours().reponses.minutes === '15' && carte()._questionnaire.question === 'Qui prévient Marc Dupont ?', carte()._questionnaire.question);
  await taper('tu les préviens');
  verifie('le récapitulatif : le retard et l heure d arrivée, « Je préviens Marc Dupont »', carte()._questionnaire.question === 'Voici ce que je vais faire :\n• « Dentiste » (' + quand(iso(0), { startH: 11, startM: 0, endH: 12, endM: 0 }) + ') : environ 15 minutes de retard, arrivée vers 11h15\n• Je préviens Marc Dupont', carte()._questionnaire.question);
  verifie('rien n est parti avant « Oui, vas-y »', trace.envois.length === 0);
  await taper('oui');
  verifie('le message « Je serai en retard » des Paramètres, avec les minutes et la nouvelle heure, part par la messagerie TimeCool', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont' && /environ 15 minutes de retard/.test(trace.envois[0][1]) && /Je serai là vers 11h15\.$/.test(trace.envois[0][1]) && !/désolé/.test(trace.envois[0][1]), JSON.stringify(trace.envois));
  verifie('l agenda ne bouge pas (le rendez-vous reste à 11h), pas de marche arrière à proposer', ctx.events.find((e) => e.id === 'b').startH === 11 && trace.saves === 0 && memoire() === null && !/remets/.test(dc()));
  verifie('« C’est fait. » puis le bilan : le retard annoncé, Marc prévenu', /^C’est fait\.\n• Retard d’environ 15 minutes pour « Dentiste » \(/.test(dc()) && /arrivée vers 11h15/.test(dc()) && /• Prévenu par la messagerie TimeCool : Marc Dupont/.test(dc()) && enCours() === null, dc());
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu, je suis en retard');
  verifie('« je suis en retard » dans la phrase : la première question est sautée', carte()._questionnaire.etape === 'quand' && enCours().reponses.quoi === 'retard');
  await taper('le prochain');
  verifie('« 20 minutes » tapé (hors des quatre choix) est pris tel quel', await taper('20 minutes') === true && enCours().reponses.minutes === '20' && carte()._questionnaire.etape === 'prevenir');
  await taper('personne');
  verifie('le récapitulatif dit « arrivée vers 11h20 » et « Je ne préviens personne »', /arrivée vers 11h20\n• Je ne préviens personne$/.test(carte()._questionnaire.question), carte()._questionnaire.question);

  titre('3. Partir plus tôt, le reste de la journée, décaler : créneaux dès demain, Marc par TimeCool, Sophie par SMS (bouton)');
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu');
  await cliquer(1);
  verifie('« Ça touche quoi ? », trois choix exacts (partir plus tôt)', carte()._questionnaire.question === 'Ça touche quoi ?' && choixTextes() === 'Le prochain rendez-vous | Le reste de la journée | Un rendez-vous précis', choixTextes());
  await cliquer(1);
  const l3 = H().filter((m) => /Voici tes rendez-vous pour le reste de la journée/.test(m.content))[0];
  verifie('la liste : Dentiste 11h et Coach 15h (pas le passé, pas la journée entière, pas l agenda pro)', l3 && /« Dentiste »/.test(l3.content) && /« Coach »/.test(l3.content) && !/Petit déjeuner|Fête|Client|Banque/.test(l3.content), l3 && l3.content);
  verifie('« Que fait-on ? » avec les trois actions', carte()._questionnaire.question === 'Que fait-on ?' && choixTextes() === 'Je les décale (je te propose de nouveaux créneaux) | Je les supprime | Je ne touche à rien', choixTextes());
  await taper('je les décale');
  verifie('les créneaux dès demain, autour de « Banque » : Dentiste 9h-10h, Coach 11h-12h', textes().indexOf('« Dentiste » : ' + quand(iso(1), { startH: 9, startM: 0, endH: 10, endM: 0 })) > -1 && textes().indexOf('« Coach » : ' + quand(iso(1), { startH: 11, startM: 0, endH: 12, endM: 0 })) > -1, textes());
  verifie('« Qui prévient Marc Dupont et Sophie Anceau ? » (« et » avant le dernier nom)', carte()._questionnaire.question === 'Qui prévient Marc Dupont et Sophie Anceau ?');
  await taper('tu les préviens'); await taper('vas-y');
  const bilan3 = dernier();
  verifie('les deux sont déplacés (même identifiant), Marc prévenu par TimeCool, un bouton « Envoyer à Sophie Anceau », « remets-les »', ctx.events.find((e) => e.id === 'b').date === iso(1) && ctx.events.find((e) => e.id === 'c').date === iso(1) && trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont' && /^C’est fait\.\n• Déplacé : « Dentiste »/.test(dc()) && /• Prévenu par la messagerie TimeCool : Marc Dupont/.test(dc()) && /• Message prêt, à envoyer toi-même d’un geste \(SMS ou email\) : Sophie Anceau/.test(dc()) && bilan3._envois && bilan3._envois.length === 1 && /remets-les/.test(dc()), dc());
  verifie('le message à Marc : « Je décale » avec l ancienne date et la nouvelle, sans « désolé »', /je dois décaler notre rendez-vous du .*15 octobre à 11h00/.test(trace.envois[0][1]) && /16 octobre à 09h00\.$/.test(trace.envois[0][1]) && !/désolé/.test(trace.envois[0][1]), trace.envois[0][1]);
  verifie('43b : la marche arrière sait qui a vraiment été prévenu (Marc, pas Sophie)', memoire() && memoire().type === 'deplacement' && JSON.stringify(memoire().prevenus) === '["Marc Dupont"]', JSON.stringify(memoire() && memoire().prevenus));
  await ctx.tcQuestionnaireEnvoyer(bilan3._envoisId, 0);
  verifie('le bouton touché : Sophie rejoint les contacts prévenus', trace.envois.length === 2 && trace.envois[1][0] === 'Sophie Anceau' && JSON.stringify(memoire().prevenus) === '["Marc Dupont","Sophie Anceau"]', JSON.stringify(memoire().prevenus));
  await ctx.tcMarcheArriere('remets-les');
  verifie('« remets-les » : les deux reviennent, et « Pense à prévenir Marc Dupont et Sophie Anceau que c’est maintenu »', ctx.events.find((e) => e.id === 'b').date === iso(0) && /Pense à prévenir Marc Dupont et Sophie Anceau que c'est maintenu/.test(dc()), dc());

  titre('4. Un rendez-vous s ajoute, un rendez-vous précis : « Lequel ? », la place est faite, jamais le week-end');
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu');
  await taper('3');
  await taper('un rendez-vous précis');
  verifie('« Lequel ? » : les rendez-vous à venir (Dentiste, Coach, Banque, Kiné), dans l ordre, jamais le passé ni la journée entière', carte()._questionnaire.question === 'Lequel ?' && choixTextes() === ['« Dentiste », ' + quand(iso(0), { startH: 11, startM: 0, endH: 12, endM: 0 }), '« Coach », ' + quand(iso(0), { startH: 15, startM: 0, endH: 16, endM: 0 }), '« Banque », ' + quand(iso(1), { startH: 10, startM: 0, endH: 11, endM: 0 }), '« Kiné », ' + quand(iso(4), { startH: 9, startM: 0, endH: 10, endM: 0 })].join(' | '), choixTextes());
  verifie('« la banque » tapé désigne « Banque »', await taper('la banque') === true && enCours().reponses.lequel === 'd' && /Le rendez-vous touché :\n• « Banque »/.test(textes()));
  verifie('un rendez-vous qui s ajoute : pas de question « que fait-on ? », on fait de la place ; le lendemain est un samedi : sans plage déclarée, jamais le week-end, donc lundi 10h-11h après « Kiné »', /Pour faire de la place, voici ce que je te propose :\n• « Banque » : /.test(textes()) && textes().indexOf('« Banque » : ' + quand(iso(4), { startH: 10, startM: 0, endH: 11, endM: 0 })) > -1, textes());
  verifie('sans contact : une ligne d information, la question « qui prévient » est sautée, le récapitulatif vient', /Aucun de ces rendez-vous n’a de contact enregistré : personne à prévenir\./.test(textes()) && carte()._questionnaire.etape === 'recap' && /^Voici ce que je vais faire :\n• Je décale « Banque » au /.test(carte()._questionnaire.question) && !/préviens/.test(carte()._questionnaire.question), carte()._questionnaire.question);
  await taper('ok');
  verifie('« Banque » est déplacé à lundi, le bilan dit que la place est libre pour le rendez-vous qui s ajoute', ctx.events.find((e) => e.id === 'd').date === iso(4) && /• Déplacé : « Banque », /.test(dc()) && /• La place est libre pour le rendez-vous qui s’ajoute : ajoute-le quand tu veux\./.test(dc()) && /remets-le »/.test(dc()), dc());

  titre('5. Je ne peux pas venir, le prochain, je le supprime, personne');
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu');
  await taper('je ne peux pas venir'); await taper('1');
  verifie('un seul rendez-vous : « Que fait-on de ce rendez-vous ? », et les boutons au singulier (testeurs, 15/10)', carte()._questionnaire.question === 'Que fait-on de ce rendez-vous ?' && choixTextes() === 'Je le décale (je te propose un nouveau créneau) | Je le supprime | Je ne touche à rien', carte()._questionnaire.question + ' / ' + choixTextes());
  await taper('2'); await taper('personne'); await taper('oui');
  verifie('« Dentiste » supprimé par la mécanique habituelle, rien d envoyé, « remets-le »', !ctx.events.find((e) => e.id === 'b') && trace.envois.length === 0 && /^C’est fait\.\n• Supprimé : « Dentiste » \(/.test(dc()) && /remets-le »/.test(dc()) && memoire().type === 'suppression' && JSON.stringify(memoire().prevenus) === '[]', dc());
  await ctx.tcMarcheArriere('remets-le');
  verifie('43b : « remets-le » après une suppression où personne n a été prévenu : pas de « pense à prévenir »', ctx.events.find((e) => e.title === 'Dentiste') && /est remis/.test(dc()) && !/Pense à prévenir/.test(dc()), dc());

  titre('6. Je ne touche à rien ; rien à réorganiser ; « Non, j’arrête » ; une vraie demande');
  reinit();
  await ctx.tcDemarrerImprevu('je dois partir plus tôt aujourd’hui');
  verifie('« partir plus tôt » et « aujourd’hui » lus dans la phrase : on va droit à « Que fait-on ? »', enCours().reponses.quoi === 'partir_tot' && enCours().reponses.quand === 'reste_journee' && carte()._questionnaire.question === 'Que fait-on ?', textes());
  await taper('je ne touche à rien');
  verifie('« D’accord, je ne touche à rien. », fin', dc() === 'D’accord, je ne touche à rien.' && enCours() === null && ctx.events.length === agenda().length);
  reinit(agenda().filter((e) => e.id === 'a' || e.id === 'v'));
  await ctx.tcDemarrerImprevu('j’ai un imprévu'); await taper('1'); await taper('1');
  verifie('plus rien à venir : « Rien à venir dans ton agenda … rien à réorganiser. »', dc() === 'Rien à venir dans ton agenda ces deux prochaines semaines : rien à réorganiser.' && enCours() === null, dc());
  reinit(agenda().filter((e) => e.id !== 'b' && e.id !== 'c'));
  await ctx.tcDemarrerImprevu('j’ai un imprévu'); await taper('4'); await taper('2');
  verifie('plus rien aujourd’hui : « Rien à réorganiser pour le reste de la journée. »', dc() === 'Rien à réorganiser pour le reste de la journée.' && enCours() === null, dc());
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu'); await taper('4'); await taper('1'); await taper('2'); await taper('personne');
  verifie('« non » au récapitulatif : rien n est supprimé', await taper('non') === true && dc() === 'D’accord, j’arrête là : je ne touche à rien.' && ctx.events.length === agenda().length);
  reinit();
  await ctx.tcDemarrerImprevu('j’ai un imprévu');
  verifie('« annule le dentiste » (une vraie demande) fait tomber le questionnaire et suit son chemin', await taper('annule le dentiste') === false && enCours() === null && /je laisse tomber la question qui attendait/.test(dc()));
  verifie('43b : « A, B et C »', ctx.tcQuestionnaireNoms(['A', 'B', 'C']) === 'A, B et C' && ctx.tcQuestionnaireNoms(['A']) === 'A');

  titre('7. Dans la page : le bouton, l aiguillage, l ancien parcours parti, formule neutre, week-end, pas de tiret long ni d assertion arrière');
  const act = fonction(page, 'charlyQuickAction') || '';
  verifie('le bouton « Gérer un imprévu » lance le questionnaire avec la bulle « J’ai un imprévu »', /if \(action === 'impprevu'\) \{ tcDemarrerImprevu\('J’ai un imprévu'\); return; \}/.test(act));
  const csm = fonction(page, 'charlySendMessage') || '';
  verifie('« j’ai un imprévu » tapé (sans jour) va au même questionnaire, avant la contrainte', /if \(\/\\b\(imprevu\|reorganis\)\/\.test\(tcSansAccents\(text\)\) && !tcPeriodeContrainte\(text\)\) \{\s+await tcDemarrerImprevu\(text\);\s+return;\s+\}/.test(csm) && csm.indexOf('tcDemarrerImprevu(text)') < csm.indexOf('tcDetecterMalade(text)'));
  verifie('l ancien parcours (question libre, deux essais) a disparu', page.indexOf('_tcImprevuEnAttente') < 0 && page.indexOf('tcRepondreImprevu') < 0 && page.indexOf('TC_QUESTION_IMPREVU') < 0 && page.indexOf('tcPeriodeImprevu') < 0);
  verifie('43b : plus de « désolé(e) » dans les modèles par défaut, formule neutre', page.indexOf('désolé(e)') < 0 && /tu: "Bonjour \[Prénom\], je dois décaler notre rendez-vous du \[date\] à \[heure\]\./.test(page) && /vous: "Bonjour \[Prénom\], un imprévu m'oblige à annuler notre rendez-vous du \[date\] à \[heure\]\./.test(page));
  ctx._dispoData = {};
  verifie('43b : sans aucune plage déclarée, lundi à vendredi 9h-18h en repli, jamais le samedi ni le dimanche', ctx.tcPlagesDuJour(new Date(2026, 9, 16)).plages.length === 1 && ctx.tcPlagesDuJour(new Date(2026, 9, 17)).plages.length === 0 && ctx.tcPlagesDuJour(new Date(2026, 9, 18)).plages.length === 0 && ctx.tcPlagesDuJour(new Date(2026, 9, 17)).defaut === true);
  ctx._dispoData = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] };
  verifie('43b : avec des plages déclarées, un jour sans plage est fermé (rien d inventé)', ctx.tcPlagesDuJour(new Date(2026, 9, 17)).plages.length === 0 && ctx.tcPlagesDuJour(new Date(2026, 9, 17)).defaut === false && ctx.tcPlagesDuJour(new Date(2026, 9, 16)).plages.length === 1);
  ctx._dispoData = { travail: [{ jours: [1], debut: '18:00', fin: '09:00' }] };
  verifie('une plage invalide ne compte pas comme déclarée', ctx.tcPlagesDuJour(new Date(2026, 9, 16)).defaut === true);
  ctx._dispoData = {};
  verifie('la marche arrière lit « prevenus » quand il est là, et garde tout le monde sinon', /Array\.isArray\(m\.prevenus\) && m\.prevenus\.indexOf\(c\.name\) < 0/.test(fonction(page, 'tcMarcheArriere') || '') && /tcQuestionnaireNoms\(contacts\)/.test(fonction(page, 'tcMarcheArriere') || ''));
  verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page (Safari)', bloc.indexOf('—') < 0 && page.indexOf('(?<') < 0);
  verifie('le bouton de l écran Charly est inchangé', /charlyQuickAction\('impprevu'\)[^>]*>⚡ Gérer un imprévu<\/button>/.test(page));

  titre('8. Examinateur : « Quand suis-je libre samedi ? » sur un jour fermé dit la vérité, jamais « aucun créneau libre »');
  const SAMEDI = { debut: new Date(2026, 9, 17), fin: null, label: 'samedi' };
  const VENDREDI = { debut: new Date(2026, 9, 16), fin: null, label: 'vendredi' };
  const reponse = async (periode) => { ctx.charlyIA.history = []; await ctx.tcGererDemandeCreneau('Quand suis-je libre ' + periode.label + ' ?', { periode: periode }); return dernier().content; };
  reinit([]); ctx._dispoData = {};
  let rep8 = await reponse(SAMEDI);
  verifie('compte sans plage, agenda vide, samedi : « Sans plages ouvertes … je ne propose pas de créneau le week-end. Rien n’est noté … »', /^Sans plages ouvertes dans Mes disponibilités, je ne propose pas de créneau le week-end\. Rien n’est noté dans ton agenda samedi\. Tu veux que je regarde un autre jour \?$/.test(rep8) && !/aucun créneau libre/.test(rep8), rep8);
  ctx._dispoData = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] };
  rep8 = await reponse(SAMEDI);
  verifie('plages lundi-vendredi, samedi : « Tes disponibilités ne sont pas ouvertes samedi … Rien n’est noté … »', /^Tes disponibilités ne sont pas ouvertes samedi : je ne propose pas de créneau en dehors de tes plages\. Rien n’est noté dans ton agenda samedi\. Tu veux que je regarde un autre jour \?$/.test(rep8), rep8);
  reinit([ev('s', 'Marché', 2, 10, 0, 11, 0)]); ctx._dispoData = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] };
  rep8 = await reponse(SAMEDI);
  verifie('samedi fermé mais un rendez-vous noté : « Tu as déjà quelque chose de noté samedi »', /ne sont pas ouvertes samedi/.test(rep8) && /Tu as déjà quelque chose de noté samedi\./.test(rep8) && !/Rien n’est noté/.test(rep8), rep8);
  reinit([ev('f', 'Formation', 1, 9, 0, 18, 0)]); ctx._dispoData = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }] };
  rep8 = await reponse(VENDREDI);
  verifie('vendredi ouvert mais plein : « Je ne vois aucun créneau libre vendredi. Tu veux que je regarde plus loin ? » comme avant', /^Je ne vois aucun créneau libre vendredi\. Tu veux que je regarde plus loin \?$/.test(rep8), rep8);
  reinit([]); ctx._dispoData = {};
  rep8 = await reponse(VENDREDI);
  verifie('vendredi, compte sans plage : la journée de repli est proposée et dite', /Voici ce qui est libre vendredi/.test(rep8) && /Mes disponibilités/.test(rep8), rep8);
  ctx._dispoData = {};

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  exception : ' + (e && e.stack || e)); console.log(''); console.log((ko + 1) + ' anomalie(s).'); process.exit(1); });
