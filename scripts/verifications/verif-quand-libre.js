// « Quand suis-je libre ? » (bouton Charly) sur le moteur de questionnaire (mission 49, chef, 15/10, validée par Charles).
//
// Quand (Aujourd'hui / Demain / Cette semaine / Semaine prochaine / Je choisis une date, ou une date tapée qui peut dire la
// durée), pour combien de temps (30 min / 1 h / 2 h / Une demi-journée), la liste des créneaux libres (Mes disponibilités :
// sans plage, lundi-vendredi 9h-18h, jamais le week-end, jamais le passé, hors rendez-vous notés), six au plus, étalés,
// regroupés par jour ; rien → « Rien de libre … » et la période suivante ; « Tu veux y mettre quelque chose ? » → Oui :
// le créneau (numéro ou heure tapée) puis « Créer un nouveau rdv » avec le jour, l'heure et la durée déjà remplis (il reste
// quoi, avec qui, récapitulatif, « Oui, crée-le ») ; Non : « D'accord. ». Rien n'est créé avant « Oui, crée-le ».
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

titre('0. La page');
const act = extraire('charlyQuickAction') || '';
verifie('l onglet « Quand suis-je libre ? » lance le questionnaire avec sa bulle, sans phrase pré-remplie', /action === 'libre'\) \{ tcDemarrerLibre\('Quand suis-je libre \?'\); return; \}/.test(act) && act.indexOf("libre: 'Quand suis-je libre cette semaine ?'") < 0);
verifie('tcNouveauRdvPropositions prend le nombre voulu (six pour la liste)', /function tcNouveauRdvPropositions\(r, combien\)/.test(page) && /tcNouveauRdvPropositions\(r, 6\)/.test(page));

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user', cat: 'perso' }, extra || {});
function agenda() {
  return [
    ev('a', 'Petit déjeuner', 0, 8, 0, 9, 0),                                           // passé
    ev('b', 'Dentiste', 0, 11, 0, 12, 0, { contact: 'c1', cat: 'sante' }),
    ev('p', 'Client', 0, 14, 0, 15, 0, { mode: 'pro' }),                                 // autre agenda
    ev('c', 'Coach', 0, 15, 0, 16, 0, { contact: 'c2' }),
    ev('k', 'Kiné', 0, 17, 30, 18, 30),
    ev('d', 'Banque', 1, 10, 0, 11, 0),                                                  // vendredi
    ev('demo_1', 'Démo', 4, 9, 0, 12, 0)                                                 // lundi : la démo compte comme occupée
  ];
}

const trace = { saves: 0, toasts: [], envois: [], demarches: [] };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, JSON, Math, parseInt, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [], config: {} }, viewDate: null,
  contactsList: [{ id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }],
  AGENDA_CATEGORIES: [{ id: 'travail', label: 'Travail' }, { id: 'sante', label: 'Santé' }, { id: 'famille', label: 'Famille' }, { id: 'amis', label: 'Amis & Loisirs' }, { id: 'perso', label: 'Personnel' }],
  _dispoData: {}, loadDispo() {},
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; },
  addDemarche(d) { trace.demarches.push(d.title); }, tcSyncTour() {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcVouvoiement: () => false, tcDirePrevenance() {}, tcContactDuSurnom: () => null,
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'timecool'; },
  TC_BACKEND: { estConnecte: () => false },
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  tcDemarrerRdvAPlusieurs() {}, charlyAttachAction() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {}, tcDemarrerMalade() {}, tcDemarrerImprevu() {}, tcPrevenirRetard() {}, tcDemarrerNouveauRdv() {},
  document: { getElementById: () => ({ value: '', style: {} }) }, Set, _agendaChecked: null
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null;', ctx);
[/const TC_VERBES_DE_DEMANDE = \[[^\]]*\];/, /const TC_MSG_MODELES = \{[\s\S]*?\n\};/, /const TC_JOURS_FR = [^;]*;/, /const TC_MOIS_FR = [^;]*;/, /const TC_PETITS_MOTS = \[[^\]]*\];/].forEach((re) => { const m = page.match(re); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  constante introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcEvenementFin', 'tcEvenementCouvre',
 'tcEvenementSurPlusieursJours', 'tcEstBandeau', 'tcMinutesDeHeure', 'tcSansTempsProtege', 'tcDesPlagesDeclarees', 'tcPlagesDuJour', 'tcOccupationsDuJour',
 'tcCreneauxDisponibles', 'tcRemplirModele', 'tcValeursDuRdv', 'tcPhraseNonCompris', 'tcRessembleAUneDemande', 'tcContactDuRdv', 'tcBulleCharly', 'charlyQuickAction',
 'tcCleModele', 'tcModeleMessage', 'tcHeureDansTexte', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcCategorieDuTitre', 'tcDureeLisible',
 'tcMotsDuTexte', 'tcComptesCitesDansTexte', 'tcMotsUtiles', 'tcContactsParMots', 'tcDernierRdvParContact', 'tcClasserContacts', 'tcResoudreContact',
 'tcAppliquerDeplacement', 'tcMemoriserSuppression', 'tcSupprimerRdvs', 'tcDetecterMarcheArriere', 'tcMarcheArriere', '_tcLigneRdv'
].forEach((n) => { const f = extraire(n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const debutBloc = page.indexOf('   QUESTIONNAIRE GUIDÉ DE CHARLY (mission 43');
const finBloc = page.indexOf('function showConflictWarning(');
const bloc = (debutBloc > -1 && finBloc > debutBloc) ? page.slice(page.lastIndexOf('/*', debutBloc), finBloc) : '';
verifie('le bloc « questionnaire guidé » porte le parcours « libre »', bloc.length > 1000 && bloc.indexOf('const TC_QUESTIONNAIRE_LIBRE = {') > -1, bloc.length);
verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page (Safari)', bloc.indexOf('—') < 0 && !/\(\?<[=!]/.test(page));
if (bloc) vm.runInContext(bloc, ctx);
if (ko) { console.log(''); console.log(ko + ' anomalie(s).'); process.exit(1); }

const H = () => ctx.charlyIA.history;
const dernier = () => H()[H().length - 1];
const dc = () => String(dernier().content).replace(/<br>/g, String.fromCharCode(10));
const carte = () => { for (let i = H().length - 1; i >= 0; i--) if (H()[i]._questionnaire) return H()[i]; return null; };
const question = () => (carte() ? carte()._questionnaire.question : '');
const textes = () => H().map((m) => String(m.content || '').replace(/<br>/g, '\n')).join('\n');
const choixTextes = () => carte()._questionnaire.choix.map((c) => c.texte).join(' | ');
const enCours = () => vm.runInContext('_tcQuestionnaire', ctx);
const cliquer = async (i) => { await ctx.tcQuestionnaireRepondre(carte()._questionnaire.id, i); };
const taper = async (t) => ctx.tcQuestionnaireRepondreTexte(t);
const infos = () => H().filter((m) => m.role === 'system_info' && !m._questionnaire).map((m) => String(m.content).replace(/<br>/g, '\n'));
const reinit = (evts) => {
  ctx.events = evts || agenda(); ctx.charlyIA.history = []; ctx.viewDate = null;
  trace.saves = 0; trace.toasts.length = 0; trace.envois.length = 0; trace.demarches.length = 0;
  vm.runInContext('_tcQuestionnaire = null; _tcMarcheArriere = null;', ctx);
};
const bouton = async () => { ctx.charlyQuickAction('libre'); await new Promise((r) => setTimeout(r, 0)); };
const nouveaux = () => ctx.events.filter((e) => String(e.id).indexOf('charly_ai_') === 0);

(async () => {
  titre('1. L onglet : la bulle, « Quand ? » (cinq choix), « Pour combien de temps ? » (quatre choix)');
  reinit();
  await bouton();
  verifie('la bulle de l utilisateur puis la carte', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'Quand suis-je libre ?' && carte() && question() === 'Quand ?', textes());
  verifie('les cinq choix, textes exacts', choixTextes() === 'Aujourd’hui | Demain | Cette semaine | Semaine prochaine | Je choisis une date', choixTextes());
  await cliquer(1);
  verifie('« Pour combien de temps ? » : 30 min / 1 h / 2 h / Une demi-journée', question() === 'Pour combien de temps ?' && choixTextes() === '30 min | 1 h | 2 h | Une demi-journée', question() + ' / ' + choixTextes());

  titre('2. Demain pour 1 h : six créneaux étalés sur la journée, hors Banque 10h-11h ; y mettre quelque chose → « Créer un nouveau rdv » avec le jour, l heure et la durée déjà remplis');
  await cliquer(1);
  verifie('la liste, regroupée par jour, six créneaux du début à la fin de la journée (9h-18h sans plage déclarée)', infos().pop() === 'Voici tes créneaux libres demain pour 1 h :\n• vendredi 16 octobre : 09h00, 12h00, 13h00, 14h30, 15h30 et 17h00', infos().pop());
  verifie('« Tu veux y mettre quelque chose ? » Oui / Non', question() === 'Tu veux y mettre quelque chose ?' && choixTextes() === 'Oui | Non', question() + ' / ' + choixTextes());
  await taper('oui');
  verifie('« Lequel ? » : les six créneaux numérotés', question() === 'Lequel ? Touche un créneau, ou tape une heure (ex : 14h30).' && choixTextes() === 'vendredi 16 octobre à 09h00 | vendredi 16 octobre à 12h00 | vendredi 16 octobre à 13h00 | vendredi 16 octobre à 14h30 | vendredi 16 octobre à 15h30 | vendredi 16 octobre à 17h00', question() + ' / ' + choixTextes());
  await cliquer(3);
  verifie('le questionnaire « Créer un nouveau rdv » enchaîne : « C’est quel rendez-vous ? » ; le jour, l heure (14h30) et la durée (1 h) sont déjà remplis', question().indexOf('C’est quel rendez-vous ?') === 0 && enCours() && enCours().def.nom === 'nouveau_rdv' && enCours().reponses.date === iso(1) && enCours().reponses.creneau.debut === 870 && enCours().reponses.duree === '60', question() + ' ' + JSON.stringify(enCours() && enCours().reponses));
  await cliquer(1);
  await taper('personne');
  verifie('ni « Quand ? » ni « Combien de temps ? » : droit au récapitulatif, 14h30 à 15h30 (1 h)', question() === 'Voici ce que je vais faire :\n• « Médecin » (Santé)\n• Vendredi 16 octobre, 14h30 à 15h30 (1 h)' && H().filter((m) => m._questionnaire && /^Combien de temps \?/.test(m._questionnaire.question)).length === 0 && H().filter((m) => m._questionnaire && m._questionnaire.question === 'Quand ?').length === 1, textes());
  verifie('rien n est créé avant « Oui, crée-le »', nouveaux().length === 0 && trace.saves === 0);
  await taper('oui');
  verifie('créé 14h30-15h30 demain, Santé', nouveaux().length === 1 && nouveaux()[0].date === iso(1) && nouveaux()[0].startH === 14 && nouveaux()[0].startM === 30 && nouveaux()[0].endH === 15 && nouveaux()[0].endM === 30 && nouveaux()[0].cat === 'sante' && dc() === 'C’est noté.\n• « Médecin », vendredi 16 octobre, 14h30 à 15h30', dc());

  titre('3. Non ; une heure tapée ; « Non » à « y mettre quelque chose »');
  reinit(); await bouton(); await taper('demain'); await taper('2h'); await taper('non');
  verifie('« Non » : « D’accord. », rien n est créé', dc() === 'D’accord.' && enCours() === null && nouveaux().length === 0, dc());
  reinit(); await bouton(); await cliquer(1); await cliquer(1); await cliquer(0); await taper('16h');
  verifie('« 16h » tapé à « Lequel ? » : la suite avec 16h', enCours() && enCours().def.nom === 'nouveau_rdv' && enCours().reponses.creneau.debut === 960, JSON.stringify(enCours() && enCours().reponses));

  titre('4. Cette semaine, une demi-journée : six créneaux, un par jour ouvré (jamais le week-end, jamais le passé, la démo du lundi compte), puis le deuxième');
  reinit(); await bouton(); await cliquer(2); await cliquer(3);
  verifie('la liste par jour : rien aujourd hui (4 h ne tiennent pas entre Dentiste, Coach et Kiné), demain 11h00 et 14h00 (Banque 10h-11h), lundi 12h00 et 14h00 (démo 9h-12h), mardi 09h00, mercredi 09h00 ; six au plus, répartis entre les jours et dans la journée',
    infos().pop() === 'Voici tes créneaux libres cette semaine pour 4 h :\n• vendredi 16 octobre : 11h00 et 14h00\n• lundi 19 octobre : 12h00 et 14h00\n• mardi 20 octobre : 09h00\n• mercredi 21 octobre : 09h00', infos().pop());

  titre('5. Rien de libre : la période suivante ; puis rien non plus ; « Non, merci »');
  reinit(); await bouton(); await cliquer(4);
  verifie('« Je choisis une date » : Charly demande le jour', question() === 'Quel jour ? Tape une date (ex : mardi, le 20 octobre, 20/10).', question());
  await taper('samedi'); await cliquer(1);
  verifie('samedi (fermé sans plage) : « Rien de libre le samedi 17 octobre dans tes disponibilités. Je regarde les sept jours suivants ? »', question() === 'Rien de libre le samedi 17 octobre dans tes disponibilités. Je regarde les sept jours suivants ?' && choixTextes() === 'Oui, regarde | Non, merci', question() + ' / ' + choixTextes());
  await cliquer(0);
  verifie('les sept jours suivants : la liste (dimanche sauté, lundi 12h00 et 17h00 après la démo, puis un par jour)', infos().pop() === 'Voici tes créneaux libres les sept jours suivants pour 1 h :\n• lundi 19 octobre : 12h00 et 17h00\n• mardi 20 octobre : 09h00\n• mercredi 21 octobre : 09h00\n• jeudi 22 octobre : 09h00\n• vendredi 23 octobre : 09h00' && question() === 'Tu veux y mettre quelque chose ?', infos().pop());
  reinit(); await bouton(); await cliquer(4); await taper('samedi'); await cliquer(1); await cliquer(1);
  verifie('« Non, merci » : « D’accord. »', dc() === 'D’accord.' && enCours() === null, dc());
  reinit([ev('x', 'Journée', 0, 0, 0, 23, 59, { allDay: true }), ev('y', 'Journée', 1, 0, 0, 23, 59, { allDay: true })]);
  await bouton(); await cliquer(0); await cliquer(1);
  verifie('aujourd hui tout pris : « Rien de libre aujourd’hui … Je regarde demain ? »', question() === 'Rien de libre aujourd’hui dans tes disponibilités. Je regarde demain ?', question());
  await taper('oui');
  verifie('demain tout pris aussi : « Rien de libre non plus demain dans tes disponibilités. », fin', dc() === 'Rien de libre non plus demain dans tes disponibilités.' && enCours() === null, dc());

  titre('6. Une phrase qui dit tout, la semaine prochaine');
  reinit(); await bouton(); await taper('mardi pendant 2 h');
  verifie('« mardi pendant 2 h » : le jour et la durée sont connus, la liste vient (mardi 20 octobre, 2 h)', /^Voici tes créneaux libres le mardi 20 octobre pour 2 h :\n• mardi 20 octobre : 09h00, /.test(infos().pop()) && question() === 'Tu veux y mettre quelque chose ?', infos().pop());
  reinit(); await bouton(); await cliquer(3); await cliquer(0);
  verifie('la semaine prochaine, 30 min : du lundi 19 au vendredi 23, un créneau par jour puis le deuxième du lundi', infos().pop() === 'Voici tes créneaux libres la semaine prochaine pour 30 min :\n• lundi 19 octobre : 12h00 et 17h30\n• mardi 20 octobre : 09h00\n• mercredi 21 octobre : 09h00\n• jeudi 22 octobre : 09h00\n• vendredi 23 octobre : 09h00', infos().pop());

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + (e && e.stack || e)); process.exit(1); });
