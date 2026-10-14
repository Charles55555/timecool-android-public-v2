// Mission 43 (chef, 14/10, validée par Charles) : « Je suis malade, décale tout » est un questionnaire guidé, une question
// à la fois, boutons numérotés, réponse tapée acceptée : période (sautée si la phrase la dit), liste des rendez-vous pas
// encore commencés (jamais un passé, jamais une journée entière), action (sautée si la phrase dit « décale »), créneaux
// proposés, qui prévient, récapitulatif « Oui, vas-y », puis « C’est fait. Repose-toi. » et le bilan. Le moteur
// (tcQuestionnaire…) est réutilisable pour les autres boutons de Charly. Usage : node verif-questionnaire-malade.js <index.html>
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

/* Horloge fixée : mercredi 14 octobre 2026, 20h30 (le soir du constat de Charles). */
const FIXE = new Date(2026, 9, 14, 20, 30, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 14 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
function agenda() {
  return [
    ev('a', 'Dentiste', 0, 11, 0, 12, 0), ev('b', 'Coach', 0, 14, 0, 15, 0), ev('c', 'Kiné', 0, 17, 0, 18, 0),   // passés
    ev('v', 'Voyage à Lyon', 0, 0, 0, 23, 59, { allDay: true }),                                              // journée entière
    ev('d', 'Pharmacie', 0, 21, 0, 22, 0, { contact: 'c1' }),                                                 // pas commencé
    ev('e', 'Réunion', 1, 9, 0, 10, 0, { contact: 'c2' }), ev('f', 'Dentiste', 1, 15, 0, 16, 30),
    ev('p', 'Client', 1, 11, 0, 12, 0, { mode: 'pro' }),                                                        // autre agenda
    ev('g', 'Banque', 2, 10, 0, 11, 0)
  ];
}

const trace = { saves: 0, toasts: [], envois: [], demarches: [], rendus: 0 };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, JSON, Math, parseInt, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [], config: {} },
  contactsList: [{ id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }, { id: 'c3', name: 'Paul Martin', email: 'paul@exemple.fr' }],
  _dispoData: {}, loadDispo() {},
  renderCharlyChat() { trace.rendus++; }, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; },
  addDemarche(d) { trace.demarches.push(d.title); },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcVouvoiement: () => false, tcDirePrevenance() {},
  tcModeleMessage: (action) => action === 'decale'
    ? 'Bonjour [Prénom], désolé(e), je dois décaler notre rendez-vous du [date] à [heure]. Voici ce que je peux te proposer :'
    : "Bonjour [Prénom], désolé(e), un imprévu m'oblige à annuler notre rendez-vous du [date] à [heure].",
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return c.referenceCompte ? 'timecool' : (c.phone ? 'sms' : (c.email ? 'email' : 'aucun')); },
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  // Les autres boutons de charlyQuickAction, hors sujet ici.
  tcDemarrerRdvAPlusieurs() {}, charlyAttachAction() {}, tcPrevenirRetard() {}, tcDemarrerNouveauRdv() {}, tcDemarrerImprevu() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {},
  document: { getElementById: () => ({ value: '', style: {} }) }, Set, _agendaChecked: null
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcImprevuEnAttente = 0; let _tcGroupeEnAttente = 0;', ctx);
{ const m = page.match(/const TC_VERBES_DE_DEMANDE = \[[^\]]*\];/); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  TC_VERBES_DE_DEMANDE introuvable'); } }
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcEvenementFin', 'tcEvenementCouvre',
 'tcEvenementSurPlusieursJours', 'tcEstBandeau', 'tcMinutesDeHeure', 'tcSansTempsProtege', 'tcDesPlagesDeclarees', 'tcPlagesDuJour', 'tcOccupationsDuJour',
 'tcCreneauxDisponibles', 'tcRemplirModele', 'tcValeursDuRdv', '_tcLigneRdv', 'tcAppliquerDeplacement', 'tcMemoriserSuppression',
 'tcSupprimerRdvs', 'tcPhraseNonCompris', 'tcRessembleAUneDemande', 'tcContactDuRdv', 'tcBulleCharly', 'charlyQuickAction'
].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const debutBloc = page.indexOf('   QUESTIONNAIRE GUIDÉ DE CHARLY (mission 43');
const finBloc = page.indexOf('function showConflictWarning(');
const bloc = (debutBloc > -1 && finBloc > debutBloc) ? page.slice(page.lastIndexOf('/*', debutBloc), finBloc) : '';
verifie('le bloc « questionnaire guidé » est dans la page, devant showConflictWarning', bloc.length > 1000, bloc.length);
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

(async () => {
  titre('1. Le bouton : la bulle de l utilisateur, puis la question de la période, cinq choix, dans l ordre');
  reinit();
  ctx.charlyQuickAction('malade');
  await new Promise((r) => setTimeout(r, 0));
  verifie('la bulle « Je suis malade, décale tout » puis la carte « Je m’occupe de ton agenda pour quand ? »', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'Je suis malade, décale tout' && carte() && carte()._questionnaire.question === 'Je m’occupe de ton agenda pour quand ?', textes());
  verifie('les cinq périodes, textes exacts', choixTextes() === 'Ce qui reste aujourd’hui | Demain matin | Demain après-midi | Demain toute la journée | Les 2 ou 3 prochains jours', choixTextes());
  verifie('le bouton dit déjà « décale » : l action est connue, la période ne l est pas', enCours() && enCours().reponses.action === 'decaler' && enCours().reponses.periode === undefined && enCours().etape === 'periode');
  const rendu = ctx.tcRendreQuestionnaire(carte());
  verifie('la carte : boutons numérotés 1️⃣ à 5️⃣, actifs, qui appellent tcQuestionnaireRepondre', (rendu.match(/<button onclick="tcQuestionnaireRepondre\('qq\d+-\d+', \d\)"/g) || []).length === 5 && /1️⃣ Ce qui reste aujourd’hui/.test(rendu) && /5️⃣ Les 2 ou 3 prochains jours/.test(rendu) && !/disabled/.test(rendu), rendu.slice(0, 200));

  titre('2. « Ce qui reste aujourd’hui » à 20h30 : seul le rendez-vous de 21h (jamais les passés, jamais le voyage), puis les créneaux, qui prévient, récap, fait');
  const c1 = carte();
  await cliquer(0);
  verifie('la carte est marquée répondue, ses boutons inactifs, le choix en couleur', c1._questionnaire.etat === 'fait' && c1._questionnaire.reponse === 'aujourdhui' && /disabled/.test(ctx.tcRendreQuestionnaire(c1)) && /background:#1a73e8; color:#fff;[^>]*>1️⃣/.test(ctx.tcRendreQuestionnaire(c1)), ctx.tcRendreQuestionnaire(c1).slice(0, 100));
  const liste = H().filter((m) => /Voici tes rendez-vous/.test(m.content))[0];
  verifie('la liste : « Pharmacie » seul (11h, 14h, 17h passés, voyage journée entière exclus)', liste && /pour le reste de la journée/.test(liste.content) && /Pharmacie/.test(liste.content) && !/Dentiste|Coach|Kiné|Voyage/.test(liste.content), liste && liste.content);
  verifie('la question « que fait-on ? » est sautée (le bouton disait « décale ») : les créneaux sont proposés, dès demain, dans les plages ouvertes', /Voici ce que je te propose/.test(textes()) && textes().indexOf('« Pharmacie » : ' + quand(iso(1), { startH: 10, startM: 0, endH: 11, endM: 0 })) > -1, textes());
  verifie('puis « Qui prévient Marc Dupont ? », trois choix exacts', carte()._questionnaire.etape === 'prevenir' && carte()._questionnaire.question === 'Qui prévient Marc Dupont ?' && choixTextes() === 'Je préviens les contacts moi-même | Tu les préviens | Personne', carte()._questionnaire.question + ' / ' + choixTextes());
  await cliquer(1);
  verifie('le récapitulatif : « Voici ce que je vais faire : », le déplacement et la prévenance, boutons « Oui, vas-y » / « Non, j’arrête »', carte()._questionnaire.etape === 'recap' && carte()._questionnaire.question.indexOf('Voici ce que je vais faire :\n• Je décale « Pharmacie » au ' + quand(iso(1), { startH: 10, startM: 0, endH: 11, endM: 0 }) + '\n• Je préviens Marc Dupont') === 0 && choixTextes() === 'Oui, vas-y | Non, j’arrête', carte()._questionnaire.question);
  verifie('rien n a encore bougé', ctx.events.find((e) => e.id === 'd').date === iso(0) && trace.saves === 0 && trace.envois.length === 0);
  await cliquer(0);
  const d = ctx.events.find((e) => e.id === 'd');
  verifie('« Oui, vas-y » : « Pharmacie » est déplacé à demain 10h-11h (même identifiant), sauvegardé, marche arrière possible', d && d.date === iso(1) && d.startH === 10 && d.endH === 11 && trace.saves === 1 && vm.runInContext('_tcMarcheArriere && _tcMarcheArriere.type', ctx) === 'deplacement', JSON.stringify(d));
  verifie('Marc Dupont prévenu par la mécanique habituelle : le message « Je décale » avec l ancienne date et la nouvelle', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont' && /je dois décaler notre rendez-vous du .*14 octobre à 21h00/.test(trace.envois[0][1]) && /15 octobre à 10h00\.$/.test(trace.envois[0][1]), JSON.stringify(trace.envois));
  verifie('« C’est fait. Repose-toi. » puis le bilan : déplacé, prévenu (messagerie TimeCool), marche arrière', /^C’est fait\. Repose-toi\./.test(dc()) && /Déplacé : « Pharmacie », /.test(dc()) && /Prévenu par la messagerie TimeCool : Marc Dupont/.test(dc()) && /remets-le »/.test(dc()), dc());
  verifie('un seul « C’est fait » (pas celui de tcAppliquerDeplacement), pas de toast en double, la démarche est notée', (textes().match(/C.est fait/g) || []).length === 1 && trace.toasts.length === 0 && trace.demarches.length === 1 && /Déplacement/.test(trace.demarches[0]), trace.toasts.join(' / ') + ' ' + trace.demarches.join(' / '));
  verifie('le questionnaire est terminé', enCours() === null);

  titre('3. Rien à décaler : « Rien à décaler … Repose-toi. » et le questionnaire s arrête');
  reinit(agenda().filter((e) => e.date !== iso(1) || e.allDay));
  await ctx.tcDemarrerMalade('je suis malade demain matin');
  verifie('la période est lue dans la phrase (demain matin) : aucune question, « Rien à décaler demain matin. Repose-toi. »', H().length === 2 && dc() === 'Rien à décaler demain matin. Repose-toi.' && enCours() === null && !carte(), textes());
  reinit(agenda().map((e) => (e.id === 'd' ? Object.assign(e, { startH: 20 }) : e)));   // commencé à 20h, il est 20h30
  await ctx.tcDemarrerMalade('je suis malade ce soir');
  verifie('un rendez-vous commencé (20h, il est 20h30) n est jamais listé : rien à décaler pour le reste de la journée', dc() === 'Rien à décaler pour le reste de la journée. Repose-toi.' && enCours() === null, textes());

  titre('4. Tapé « je suis malade demain » : la liste de demain, « Que fait-on ? », réponses au clavier, « Non, j’arrête »');
  reinit();
  await ctx.tcDemarrerMalade('je suis malade demain');
  const l4 = H().filter((m) => /Voici tes rendez-vous demain/.test(m.content))[0];
  verifie('la liste de demain : « Réunion » 9h puis « Dentiste » 15h (pas l agenda pro, pas de journée entière)', l4 && l4.content.indexOf('« Réunion », ' + quand(iso(1), { startH: 9, startM: 0, endH: 10, endM: 0 })) > -1 && l4.content.indexOf('« Dentiste », ' + quand(iso(1), { startH: 15, startM: 0, endH: 16, endM: 30 })) > -1 && !/Client|Pharmacie|Banque/.test(l4.content), l4 && l4.content);
  verifie('« Que fait-on ? » avec les trois actions, textes exacts', carte()._questionnaire.question === 'Que fait-on ?' && choixTextes() === 'Je les décale (je te propose de nouveaux créneaux) | Je les supprime | Je ne touche à rien', choixTextes());
  verifie('« 2 » tapé vaut le bouton « Je les supprime »', await taper('2') === true && carte()._questionnaire.etape === 'prevenir' && enCours().reponses.action === 'supprimer', textes());
  verifie('« Dentiste » sans contact : une ligne d information, sans bloquer ; la question ne cite que Sophie Anceau', /Sans contact enregistré, donc personne à prévenir : « Dentiste »\./.test(textes()) && carte()._questionnaire.question === 'Qui prévient Sophie Anceau ?', carte()._questionnaire.question);
  verifie('« personne » tapé vaut le bouton', await taper('personne') === true && carte()._questionnaire.etape === 'recap');
  verifie('le récapitulatif : deux suppressions, « Je ne préviens personne »', /• Je supprime « Réunion » \(/.test(carte()._questionnaire.question) && /• Je supprime « Dentiste » \(/.test(carte()._questionnaire.question) && /• Je ne préviens personne$/.test(carte()._questionnaire.question), carte()._questionnaire.question);
  verifie('« non » tapé : « D’accord, j’arrête là : je ne touche à rien. », rien supprimé', await taper('non') === true && dc() === 'D’accord, j’arrête là : je ne touche à rien.' && ctx.events.length === agenda().length && trace.saves === 0 && enCours() === null, dc());

  titre('5. Tapé « je suis malade, annule tout demain » : période et action connues, « Je préviens moi-même », « oui »');
  reinit();
  await ctx.tcDemarrerMalade('je suis malade, annule tout demain');
  verifie('aucune question avant « Qui prévient Sophie Anceau ? »', carte()._questionnaire.etape === 'prevenir' && H().filter((m) => m._questionnaire).length === 1, textes());
  await taper('je les préviens moi-même');
  verifie('le récapitulatif dit « Tu préviens Sophie Anceau toi-même »', carte()._questionnaire.etape === 'recap' && /• Tu préviens Sophie Anceau toi-même$/.test(carte()._questionnaire.question), carte()._questionnaire.question);
  await taper('oui');
  verifie('les deux rendez-vous de demain sont supprimés par la mécanique habituelle (tcSupprimerRdvs : sauvegarde, démarche, marche arrière), l agenda pro intact', !ctx.events.find((e) => e.id === 'e') && !ctx.events.find((e) => e.id === 'f') && ctx.events.find((e) => e.id === 'p') && trace.saves === 1 && /Annulation/.test(trace.demarches[0]) && vm.runInContext('_tcMarcheArriere && _tcMarcheArriere.type', ctx) === 'suppression', trace.demarches.join(' / '));
  verifie('aucun message envoyé ; le bilan : « C’est fait. Repose-toi. », deux « Supprimé », « À prévenir toi-même : Sophie Anceau », « remets-les »', trace.envois.length === 0 && /^C’est fait\. Repose-toi\.\n• Supprimé : « Réunion » \(/.test(dc()) && /• Supprimé : « Dentiste » \(/.test(dc()) && /• À prévenir toi-même : Sophie Anceau/.test(dc()) && /remets-les »/.test(dc()) && (textes().match(/C.est fait/g) || []).length === 1, dc());

  titre('6. « Je ne touche à rien », « Les 2 ou 3 prochains jours », une place introuvable');
  reinit();
  await ctx.tcDemarrerMalade('je suis malade');
  await taper('les 2 ou 3 prochains jours');
  const l6 = H().filter((m) => /Voici tes rendez-vous/.test(m.content))[0];
  verifie('« les 2 ou 3 prochains jours » tapé : Pharmacie, Réunion, Dentiste, Banque (aujourd’hui ce qui reste, demain, après-demain)', l6 && /pour les 3 prochains jours/.test(l6.content) && ['Pharmacie', 'Réunion', 'Dentiste', 'Banque'].every((t) => l6.content.indexOf('« ' + t + ' »') > -1) && !/Coach|Voyage|Client/.test(l6.content), l6 && l6.content);
  await taper('je ne touche à rien');
  verifie('« Je ne touche à rien » : « D’accord, je ne touche à rien. Repose-toi. », fin', dc() === 'D’accord, je ne touche à rien. Repose-toi.' && enCours() === null && ctx.events.length === agenda().length, dc());
  reinit([ev('x', 'Formation', 1, 7, 0, 17, 0, { contact: 'c2' }), ev('g', 'Banque', 2, 10, 0, 11, 0)]);
  await ctx.tcDemarrerMalade('je suis malade demain matin, décale');
  verifie('dix heures d affilée ne tiennent nulle part : « je n’ai pas trouvé de place libre … je le laisse où il est », et le récap le redit', /« Formation » : je n’ai pas trouvé de place libre dans les deux semaines, je le laisse où il est/.test(textes()) && carte()._questionnaire.etape === 'prevenir', textes());
  await taper('tu les préviens');
  verifie('récap : « Je laisse « Formation » où il est (pas de place libre dans les deux semaines) »', /• Je laisse « Formation » où il est \(pas de place libre dans les deux semaines\)/.test(carte()._questionnaire.question), carte()._questionnaire.question);
  await taper('ok');
  verifie('rien n est déplacé ni envoyé ; bilan « Laissé en place »', ctx.events.find((e) => e.id === 'x').date === iso(1) && trace.envois.length === 0 && /• Laissé en place : « Formation »/.test(dc()) && !/remets/.test(dc()), dc());
  reinit();
  await ctx.tcDemarrerMalade('je suis malade demain, décale tout');
  verifie('les créneaux s enchaînent après-demain autour de « Banque » : Réunion 9h-10h, Dentiste 11h-12h30', textes().indexOf('« Réunion » : ' + quand(iso(2), { startH: 9, startM: 0, endH: 10, endM: 0 })) > -1 && textes().indexOf('« Dentiste » : ' + quand(iso(2), { startH: 11, startM: 0, endH: 12, endM: 30 })) > -1, textes());
  await taper('tu les préviens'); await taper('vas-y');
  verifie('« Dentiste » sans contact n empêche rien : les deux déplacés ; Sophie (SMS) : rien d ouvert dans la boucle, un bouton « Envoyer à Sophie Anceau » dans le bilan', trace.envois.length === 0 && /• Message prêt, à envoyer toi-même d’un geste \(SMS ou email\) : Sophie Anceau/.test(dc()) && (dc().match(/• Déplacé : /g) || []).length === 2 && dernier()._envois && dernier()._envois.length === 1 && /✉️ Envoyer à Sophie Anceau</.test(ctx.tcRendreBilanQuestionnaire(dernier())), dc());

  reinit([ev('d', 'Pharmacie', 0, 21, 0, 22, 0, { contact: 'c1' })]);
  await ctx.tcDemarrerMalade('je suis malade'); await taper('1');
  verifie('un seul rendez-vous : « Que fait-on de ce rendez-vous ? » et les boutons au singulier (testeurs, 15/10)', carte()._questionnaire.question === 'Que fait-on de ce rendez-vous ?' && choixTextes() === 'Je le décale (je te propose un nouveau créneau) | Je le supprime | Je ne touche à rien', carte()._questionnaire.question + ' / ' + choixTextes());
  verifie('« je le supprime » tapé vaut le bouton', await taper('je le supprime') === true && enCours().reponses.action === 'supprimer');

  titre('7. Réponses pas comprises, vraie demande, deux questionnaires');
  reinit();
  await ctx.tcDemarrerMalade('je suis malade');
  verifie('« euh » : une relance, la question reste posée', await taper('euh') === true && /pas bien compris/.test(dc()) && /1 à 5/.test(dc()) && enCours() && carte()._questionnaire.etat === 'choix', dc());
  verifie('« demain » répond à la relance (toute la journée, pas le matin ni l après-midi)', await taper('demain') === true && enCours().reponses.periode === 'demain');
  reinit();
  await ctx.tcDemarrerMalade('je suis malade');
  verifie('« annule le dentiste » (une vraie demande) : le questionnaire tombe, Charly le dit, le message suit son chemin (faux)', await taper('annule le dentiste') === false && enCours() === null && /je laisse tomber la question qui attendait/.test(dc()) && carte()._questionnaire.etat === 'abandon', dc());
  reinit();
  await ctx.tcDemarrerMalade('je suis malade');
  await taper('euh');
  verifie('deux fois pas compris : le questionnaire tombe au second', await taper('bof') === false && enCours() === null);
  reinit();
  await ctx.tcDemarrerMalade('je suis malade');
  const ancienne = carte();
  await ctx.tcDemarrerMalade('je suis malade demain');
  verifie('un nouveau questionnaire remplace l ancien : l ancienne carte est abandonnée, un clic dessus ne fait rien', ancienne._questionnaire.etat === 'abandon' && (await ctx.tcQuestionnaireRepondre(ancienne._questionnaire.id, 0), enCours() && enCours().etape === 'action'));
  verifie('une carte dont le questionnaire n est plus en cours se rend inactive (après rechargement par exemple)', /disabled/.test(ctx.tcRendreQuestionnaire(ancienne)));
  verifie('« comment prévenir que je suis malade ? » n est pas un parcours malade ; « je suis malade » l est', !ctx.tcDetecterMalade('comment prévenir que je suis malade ?') && ctx.tcDetecterMalade('Je suis MALADE') && !ctx.tcDetecterMalade('maladie'));
  verifie('la phrase : « après-demain » ne force aucune période ; « demain après-midi » et « supprime » sont lus', ctx.tcMaladeDansLaPhrase('je suis malade après-demain').periode === undefined && JSON.stringify(ctx.tcMaladeDansLaPhrase('malade demain après-midi, supprime tout')) === '{"periode":"demain_apresmidi","action":"supprimer"}');

  titre('8. Dans la page : l aiguillage, le rendu, le ménage, pas de tiret long, pas d assertion arrière');
  const csm = fonction(page, 'charlySendMessage') || '';
  verifie('charlySendMessage : la réponse tapée est lue avant « Vers quand ? » (sans clé API)', /if \(_tcQuestionnaire\) \{\s+if \(await tcQuestionnaireRepondreTexte\(text\)\) return;\s+\}/.test(csm) && csm.indexOf('tcQuestionnaireRepondreTexte(text)') < csm.indexOf('_tcDeplacementPeriode') && csm.indexOf('tcQuestionnaireRepondreTexte(text)') < csm.indexOf('tcCleActiveCharly()'));
  verifie('charlySendMessage : « malade » part au questionnaire avant la contrainte, après la marche arrière et la prévenance', /if \(tcDetecterMalade\(text\)\) \{\s+await tcDemarrerMalade\(text\);\s+return;\s+\}/.test(csm) && csm.indexOf('tcDetecterMalade(text)') < csm.indexOf('tcDetecterContrainte(text)') && csm.indexOf('tcDetecterMalade(text)') > csm.indexOf('tcDetecterPrevenance(text)'));
  verifie('renderChatMessage rend la carte (_questionnaire) et le bilan à boutons (_envois) comme les autres questions à boutons', /if \(m && m\._questionType\) return tcRendreQuestionType\(m\);\s+if \(m && m\._questionnaire\) return tcRendreQuestionnaire\(m\);\s+if \(m && m\._envois\) return tcRendreBilanQuestionnaire\(m\);/.test(fonction(page, 'renderChatMessage') || ''));
  verifie('le ménage du compte arrête le questionnaire', /_tcQuestionnaire = null;/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));
  verifie('tcAppliquerDeplacement et tcSupprimerRdvs gardent leur bilan habituel sans option (les autres parcours ne changent pas)', /if \(!o\.silencieux\) charlyIA\.history\.push/.test(fonction(page, 'tcAppliquerDeplacement') || '') && /if \(!o\.silencieux\) charlyIA\.history\.push/.test(fonction(page, 'tcSupprimerRdvs') || ''));
  reinit(); vm.runInContext('_tcMarcheArriere = null;', ctx);
  ctx.tcAppliquerDeplacement([{ ev: ctx.events.find((e) => e.id === 'g'), p: { date: iso(3), startH: 9, startM: 0, endH: 10, endM: 0 } }]);
  verifie('sans option, tcAppliquerDeplacement dit « C’est fait » et montre son toast comme avant', /C\\?'est fait, rendez-vous déplacé/.test(dc()) && trace.toasts.length === 1, dc());
  verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page (Safari)', bloc.indexOf('—') < 0 && page.indexOf('(?<') < 0);
  verifie('le bouton de l écran Charly est inchangé (texte et place)', /charlyQuickAction\('malade'\)[^>]*>🤒 Je suis malade, décale tout<\/button>/.test(page));

  titre('9. Examinateur : deux contacts par SMS ou email (un bouton par message, rien d ouvert en boucle) ; un contact avec deux rendez-vous');
  reinit([ev('e', 'Réunion', 1, 9, 0, 10, 0, { contact: 'c2' }), ev('f2', 'Kiné', 1, 11, 0, 12, 0, { contact: 'c3' }), ev('g', 'Banque', 2, 10, 0, 11, 0)]);
  await ctx.tcDemarrerMalade('je suis malade demain, décale tout');
  await taper('tu les préviens'); await taper('oui');
  const bilan = dernier();
  verifie('Sophie (SMS) et Paul (email) : tcTransmettrePrevenance n est pas appelée dans la boucle, les deux sont déplacés', trace.envois.length === 0 && (dc().match(/• Déplacé : /g) || []).length === 2, dc());
  verifie('le bilan le dit : « Message prêt, à envoyer toi-même d’un geste (SMS ou email) : Sophie Anceau et Paul Martin »', /• Message prêt, à envoyer toi-même d’un geste \(SMS ou email\) : Sophie Anceau et Paul Martin/.test(dc()) && !/Message prêt à envoyer/.test(dc()), dc());
  verifie('deux boutons « Envoyer à … », un par message, avec le téléphone ou l email et le texte prêt', bilan._envois && bilan._envois.length === 2 && bilan._envois[0].nom === 'Sophie Anceau' && bilan._envois[0].phone === '06' && bilan._envois[1].nom === 'Paul Martin' && bilan._envois[1].email === 'paul@exemple.fr' && /je dois décaler notre rendez-vous du .*15 octobre à 09h00/.test(bilan._envois[0].texte) && /16 octobre à 09h00\.$/.test(bilan._envois[0].texte) && /15 octobre à 11h00/.test(bilan._envois[1].texte), JSON.stringify(bilan._envois));
  const rendu9 = ctx.tcRendreBilanQuestionnaire(bilan);
  verifie('le rendu : les lignes du bilan puis deux boutons actifs « ✉️ Envoyer à Sophie Anceau » / « ✉️ Envoyer à Paul Martin »', (rendu9.match(/<button onclick="tcQuestionnaireEnvoyer\('env\d+-\d+', \d\)"/g) || []).length === 2 && /✉️ Envoyer à Sophie Anceau<\/button>/.test(rendu9) && /✉️ Envoyer à Paul Martin<\/button>/.test(rendu9) && /C’est fait\. Repose-toi\.<br>• Déplacé/.test(rendu9), rendu9.slice(-400));
  await ctx.tcQuestionnaireEnvoyer(bilan._envoisId, 1);
  verifie('« Envoyer à Paul Martin » touché : le chemin habituel (tcTransmettrePrevenance) avec le nom, l email et le texte ; le bouton le dit et s éteint, l autre reste actif', trace.envois.length === 1 && trace.envois[0][0] === 'Paul Martin' && trace.envois[0][1] === bilan._envois[1].texte && bilan._envois[1].fait === 'email' && (ctx.tcRendreBilanQuestionnaire(bilan).match(/<button disabled onclick="tcQuestionnaireEnvoyer\('env\d+-\d+', 1\)"[^>]*>✅ Message prêt pour Paul Martin<\/button>/) || []).length === 1 && /<button onclick="tcQuestionnaireEnvoyer\('env\d+-\d+', 0\)"/.test(ctx.tcRendreBilanQuestionnaire(bilan)), JSON.stringify(trace.envois));
  await ctx.tcQuestionnaireEnvoyer(bilan._envoisId, 1);
  verifie('un second toucher du même bouton ne renvoie rien', trace.envois.length === 1);
  reinit([ev('e', 'Réunion', 1, 9, 0, 10, 0, { contact: 'c1' }), ev('e2', 'Point', 1, 14, 0, 15, 0, { contact: 'c1' }), ev('g', 'Banque', 2, 10, 0, 11, 0)]);
  await ctx.tcDemarrerMalade('je suis malade, annule tout demain');
  verifie('un seul contact pour deux rendez-vous : la question le cite une fois', carte()._questionnaire.question === 'Qui prévient Marc Dupont ?');
  await taper('tu les préviens'); await taper('oui');
  verifie('Marc Dupont (TimeCool) reçoit deux messages, un par rendez-vous supprimé (09h00 et 14h00)', trace.envois.length === 2 && trace.envois.every((x) => x[0] === 'Marc Dupont') && /15 octobre à 09h00/.test(trace.envois[0][1]) && /15 octobre à 14h00/.test(trace.envois[1][1]) && /annuler notre rendez-vous/.test(trace.envois[1][1]), JSON.stringify(trace.envois));
  verifie('le bilan : deux « Supprimé », « Prévenu par la messagerie TimeCool : Marc Dupont » une fois, pas de bouton', (dc().match(/• Supprimé : /g) || []).length === 2 && (dc().match(/Prévenu par la messagerie TimeCool : Marc Dupont/g) || []).length === 1 && !dernier()._envois, dc());

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  exception : ' + (e && e.stack || e)); console.log(''); console.log((ko + 1) + ' anomalie(s).'); process.exit(1); });
