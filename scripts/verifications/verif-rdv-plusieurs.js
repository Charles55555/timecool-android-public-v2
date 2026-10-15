// « Rendez-vous à plusieurs » (bouton Charly) sur le moteur de questionnaire (mission 47, chef, 15/10, validée par Charles).
//
// Avec qui (contacts TimeCool, plusieurs boutons puis « C'est tout », ou prénoms / numéros tapés, au moins deux), pour quoi
// (Travail / Famille / Amis / Autre, ou un sujet tapé qui peut dire le jour et l'heure), quand (Cette semaine / Semaine
// prochaine / Je choisis une date) puis trois créneaux communs du serveur (/rdv/groupe/proposer sur la période, tamisés par
// mes plages ; personne de consultable → mes créneaux, et Charly le dit), durée 1 h / 2 h / 3 h (habituelle en premier),
// récapitulatif « Oui, propose-leur » : la proposition part dans la messagerie de chacun (convocation Présent / Absent),
// rien n'est inscrit ; quand tout le monde a répondu présent, /rdv/groupe/confirmer l'inscrit chez tous avec le titre et la
// catégorie, et Charly le dit (tcPlusieursVerifier, à chaque tour de synchronisation).
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
verifie('l onglet « Rendez-vous à plusieurs » lance le questionnaire avec sa bulle', /action === 'groupe'\) \{ tcDemarrerRdvAPlusieurs\('Je veux un rendez-vous à plusieurs'\); return; \}/.test(act));
verifie('l ancienne attente « Avec qui ? » (prénoms tapés, deux essais) a disparu', page.indexOf('_tcGroupeEnAttente') < 0 && page.indexOf('tcDemandeHorsPrenoms') < 0);
verifie('les réponses sont relues à chaque tour de synchronisation', /await tcSyncPousser\(\);\s+\/\/[^\n]*\n\s+if \(typeof tcPlusieursVerifier === 'function'\) \{ try \{ await tcPlusieursVerifier\(\); \} catch \(e\) \{\} \}/.test(extraire('tcSyncTour') || ''));
verifie('les étapes de fin sont partagées entre les deux parcours', /const TC_ETAPES_NRDV_FIN = \[/.test(page) && /TC_ETAPE_NRDV_DUREE,\s+TC_ETAPE_NRDV_DUREE_AUTRE,\s+TC_ETAPE_NRDV_VERIF,/.test(page) && /TC_ETAPE_NRDV_DUREE,\s+TC_ETAPE_NRDV_VERIF,\s+TC_ETAPE_NRDV_CRENEAU_BIS,\s+TC_ETAPE_NRDV_VERIF_BIS,\s+TC_ETAPE_RECAP_PLUSIEURS/.test(page));

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user', cat: 'perso' }, extra || {});
function agenda() {
  return [
    ev('b', 'Dentiste', 0, 11, 0, 12, 0, { contact: 'c1', cat: 'sante' }),
    ev('c', 'Coach', 0, 15, 0, 16, 0, { contact: 'c2' }),
    ev('d', 'Banque', 1, 10, 0, 11, 0)
  ];
}

const stockage = {};
const trace = { saves: 0, toasts: [], propositions: [], confirmations: [], convocations: [], etats: [], messages: [], connecte: true, reponseProposer: null, reponseConfirmer: null, reponseConvocation: null, reponseEtat: null };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, JSON, Math, parseInt, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [], config: {} }, viewDate: null,
  contactsList: [
    { id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' },
    { id: 'c2', name: 'Sophie Anceau', phone: '06' },
    { id: 'c3', name: 'Paul Martin', referenceCompte: 'REF3' },
    { id: 'c4', name: 'Lucie Bernard' },
    { id: 'c5', name: 'Julie Petit', referenceCompte: 'REF5' },
    { id: 'c6', name: 'Bloqué Dupuis', referenceCompte: 'REF6', blocked: true }
  ],
  AGENDA_CATEGORIES: [{ id: 'travail', label: 'Travail' }, { id: 'sante', label: 'Santé' }, { id: 'famille', label: 'Famille' }, { id: 'amis', label: 'Amis & Loisirs' }, { id: 'perso', label: 'Personnel' }],
  _dispoData: {}, loadDispo() {},
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; },
  addDemarche() {}, tcSyncTour() {}, tcSyncBientot() {}, tcChargerHistoriqueCharly() {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcVouvoiement: () => false, tcDirePrevenance() {}, tcContactDuSurnom: () => null,
  tcTransmettrePrevenance: async () => 'timecool',
  TC_BACKEND: {
    estConnecte: () => trace.connecte,
    proposerRdvGroupe: async (refs, duree, type, options) => { trace.propositions.push({ refs: refs, duree: duree, type: type, options: options }); if (trace.reponseProposer instanceof Error) throw trace.reponseProposer; return trace.reponseProposer || { creneaux: [], invites: [], sans_acces: [] }; },
    confirmerRdvGroupe: async (refs, date, heure, duree, type, options) => { trace.confirmations.push({ refs: refs, date: date, heure: heure, duree: duree, type: type, options: options }); if (trace.reponseConfirmer instanceof Error) throw trace.reponseConfirmer; return trace.reponseConfirmer || { inclus: [], exclus: [] }; },
    envoyerConvocation: async (c) => { trace.convocations.push(c); if (trace.reponseConvocation instanceof Error) throw trace.reponseConvocation; return trace.reponseConvocation || { id: 77, quand: 'x', envoyes: [], sans_compte: [] }; },
    etatConvocation: async (id) => { trace.etats.push(id); if (trace.reponseEtat instanceof Error) throw trace.reponseEtat; return trace.reponseEtat || { membres: [] }; },
    envoyerMessage: async (ref, texte) => { trace.messages.push([ref, texte]); return true; }
  },
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  localStorage: { getItem: (k) => (k in stockage ? stockage[k] : null), setItem(k, v) { stockage[k] = String(v); }, removeItem(k) { delete stockage[k]; } },
  charlyAttachAction() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {}, tcDemarrerMalade() {}, tcDemarrerImprevu() {}, tcPrevenirRetard() {},
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
verifie('le bloc « questionnaire guidé » porte le parcours « à plusieurs »', bloc.length > 1000 && bloc.indexOf('const TC_QUESTIONNAIRE_PLUSIEURS = {') > -1, bloc.length);
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
const valider = async () => { await ctx.tcQuestionnaireValider(carte()._questionnaire.id); };
const taper = async (t) => ctx.tcQuestionnaireRepondreTexte(t);
const rendu = () => ctx.tcRendreQuestionnaire(carte());
const attente = () => ctx.tcPlusieursEnAttente();
const reinit = (evts) => {
  ctx.events = evts || agenda(); ctx.charlyIA.history = []; ctx.currentPage = 'chat';
  trace.saves = 0; trace.toasts.length = 0; trace.propositions.length = 0; trace.confirmations.length = 0; trace.convocations.length = 0; trace.etats.length = 0; trace.messages.length = 0;
  trace.connecte = true; trace.reponseProposer = null; trace.reponseConfirmer = null; trace.reponseConvocation = null; trace.reponseEtat = null;
  Object.keys(stockage).forEach((k) => delete stockage[k]);
  vm.runInContext('_tcQuestionnaire = null; _tcMarcheArriere = null; _tcPlusieursDernierControle = 0;', ctx);
};
const bouton = async () => { ctx.charlyQuickAction('groupe'); await new Promise((r) => setTimeout(r, 0)); };
const SERVEUR = () => ({ creneaux: [{ date: iso(1), heure: 14, minute: 0, manquants: [] }, { date: iso(4), heure: 9, minute: 0, manquants: ['Paul'] }, { date: iso(5), heure: 16, minute: 0, manquants: [] }], invites: ['Marc', 'Paul'], sans_acces: [] });
const CONVOC = () => ({ id: 77, quand: 'vendredi 16 octobre de 14:00 à 15:00', envoyes: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin' }], sans_compte: [] });

(async () => {
  titre('1. L onglet : la bulle, puis « Avec qui ? » avec les contacts TimeCool (ni bloqués), à plusieurs choix');
  reinit();
  await bouton();
  verifie('la bulle de l utilisateur puis la carte', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'Je veux un rendez-vous à plusieurs' && carte() && question() === 'Avec qui ? Touche les personnes (au moins deux), puis « C’est tout ». Ou tape leurs prénoms.', textes());
  verifie('les contacts TimeCool seulement (Marc, Julie, Paul ; ni Sophie, ni Lucie, ni le bloqué), Marc d abord (rendez-vous récent), puis l ordre des noms', choixTextes() === 'Marc Dupont | Julie Petit | Paul Martin', choixTextes());
  verifie('une étape à plusieurs choix, au moins deux', carte()._questionnaire.multiple === true && carte()._questionnaire.min === 2);
  verifie('le rendu : les boutons numérotés et « ✔️ C’est tout », inactif tant qu il n y a pas deux personnes', /1️⃣ Marc Dupont/.test(rendu()) && /<button disabled onclick="tcQuestionnaireValider\('[^']+'\)"[^>]*>✔️ C’est tout<\/button>/.test(rendu()), rendu());
  await cliquer(0);
  verifie('un bouton touché : la personne est notée, la question attend toujours', carte()._questionnaire.selection.join(',') === 'c1' && carte()._questionnaire.etat === 'choix' && enCours() && enCours().etape === 'qui');
  await cliquer(0);
  verifie('touché à nouveau : la personne est retirée', carte()._questionnaire.selection.length === 0);
  await cliquer(0); await cliquer(2);
  verifie('deux personnes : « C’est tout » devient actif, les deux boutons sont allumés', /<button onclick="tcQuestionnaireValider/.test(rendu()) && (rendu().match(/background:#1a73e8/g) || []).length === 2, rendu());
  await valider();
  verifie('« C’est tout » : la réponse est la liste, puis « C’est pour quoi ? »', JSON.stringify(enCours().reponses.qui) === '["c1","c3"]' && question() === 'C’est pour quoi ? Touche un bouton, ou tape le sujet (ex : Réunion projet jeudi 14h).' && choixTextes() === 'Travail | Famille | Amis | Autre', question() + ' / ' + choixTextes());

  titre('2. Les prénoms ou les numéros tapés valent les boutons');
  reinit(); await bouton();
  await taper('Marc et Paul');
  verifie('« Marc et Paul » : les deux sont pris, la question suivante vient', JSON.stringify(enCours().reponses.qui) === '["c1","c3"]' && question().indexOf('C’est pour quoi ?') === 0, textes());
  reinit(); await bouton();
  await taper('2 et 3');
  verifie('« 2 et 3 » : pareil (Julie puis Paul)', JSON.stringify(enCours().reponses.qui) === '["c5","c3"]' && question().indexOf('C’est pour quoi ?') === 0, textes());
  reinit(); await bouton();
  await taper('Marc');
  verifie('un seul prénom : Charly le note et demande qui d autre', dc() === 'J’ai noté Marc Dupont. Et qui d’autre ? Touche un bouton, ou tape un prénom.' && enCours().etape === 'qui', dc());
  await taper('c’est tout');
  verifie('« c’est tout » avec une seule personne : rien ne bouge (relance)', enCours() && enCours().etape === 'qui', textes());
  await taper('julie');
  verifie('« julie » : deux personnes, on avance', JSON.stringify(enCours().reponses.qui) === '["c1","c5"]' && question().indexOf('C’est pour quoi ?') === 0, textes());
  reinit(); await bouton();
  await taper('bof');
  verifie('rien de connu : la relance propre à cette question', dc() === ctx.tcPhraseNonCompris('Il me faut au moins deux personnes : touche leurs boutons, ou tape leurs prénoms (ex : Marc et Paul).'), dc());

  titre('3. Le parcours complet : Travail, semaine prochaine, les créneaux communs du serveur, 1 h, récapitulatif, « Oui, propose-leur »');
  reinit(); await bouton();
  trace.reponseProposer = SERVEUR();
  trace.reponseConvocation = CONVOC();
  await taper('Marc et Paul');
  await cliquer(0);
  verifie('« Quand ? » : Cette semaine / Semaine prochaine / Je choisis une date', question() === 'Quand ?' && choixTextes() === 'Cette semaine | Semaine prochaine | Je choisis une date', choixTextes());
  await cliquer(1);
  verifie('le serveur est interrogé pour les deux, du lundi 19 au dimanche 25, 1 h, dix créneaux, trois par jour', trace.propositions.length === 1 && JSON.stringify(trace.propositions[0]) === JSON.stringify({ refs: ['REF1', 'REF3'], duree: 1, type: 'physique', options: { depuis: iso(4), jusqua: iso(10), combien: 10, par_jour: 3 } }), JSON.stringify(trace.propositions));
  verifie('les créneaux de la période seulement (pas vendredi), tout le monde libre d abord, qui manque sous l autre',
    question() === 'Voici les créneaux la semaine prochaine où le plus de monde est libre. Touche-en un, ou tape une heure (ex : 14h).' && choixTextes() === 'mardi 20 octobre à 16h00 | lundi 19 octobre à 09h00 (pas libre : Paul)', question() + ' / ' + choixTextes());
  await cliquer(0);
  verifie('« Combien de temps ? » : 1 h / 2 h / 3 h, et le mot qui le dit', question() === 'Combien de temps ? À plusieurs, c’est 1 h, 2 h ou 3 h.' && choixTextes() === '1 h | 2 h | 3 h', question() + ' / ' + choixTextes());
  await taper('30 min');
  verifie('« 30 min » : refusé (le serveur inscrit des heures rondes)', dc() === ctx.tcPhraseNonCompris('Touche un bouton, ou tape son numéro (1 à 3).') && enCours() !== null, dc());
  await cliquer(0);
  verifie('le récapitulatif : qui, quoi, créneau, durée, ce qui va se passer ; « Oui, propose-leur » / « Non, j’arrête »',
    question() === 'Voici ce que je vais faire :\n• Avec Marc Dupont et Paul Martin\n• « Travail » (Travail)\n• Mardi 20 octobre, 16h à 17h (1 h)\n• Je leur envoie la proposition ; dès que tout le monde a répondu, je l’inscris dans vos agendas'
    && choixTextes() === 'Oui, propose-leur | Non, j’arrête', question() + ' / ' + choixTextes());
  verifie('rien n est envoyé ni inscrit avant « Oui »', trace.convocations.length === 0 && trace.confirmations.length === 0 && attente().length === 0);
  trace.reponseConvocation = { id: 77, quand: 'mardi 20 octobre de 16:00 à 17:00', envoyes: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin' }], sans_compte: [] };
  await taper('oui');
  verifie('la proposition part comme une convocation (titre, jour, 16:00-17:00, les deux références)', trace.convocations.length === 1 && JSON.stringify(trace.convocations[0]) === JSON.stringify({ titre: 'Travail', date: iso(5), debut: '16:00', fin: '17:00', references: ['REF1', 'REF3'] }), JSON.stringify(trace.convocations));
  verifie('« C’est envoyé. », le rendez-vous, les prévenus, la suite', dc() === 'C’est envoyé.\n• « Travail », mardi 20 octobre, 16h à 17h\n• Prévenus : Marc Dupont et Paul Martin\n• Dès que tout le monde a répondu, je l’inscris dans vos agendas et je te le dis.' && enCours() === null, dc());
  verifie('rien n est inscrit ; la proposition est gardée sur l appareil (identifiant, titre, catégorie, créneau, durée, références)',
    trace.confirmations.length === 0 && trace.saves === 0 && attente().length === 1 && attente()[0].id === 77 && attente()[0].titre === 'Travail' && attente()[0].cat === 'travail' && attente()[0].date === iso(5) && attente()[0].heure === 16 && attente()[0].duree === 1 && attente()[0].references.join(',') === 'REF1,REF3', JSON.stringify(attente()));

  titre('4. Les réponses : en attente, rien ; tout le monde présent → inscrit chez tous (titre, catégorie), Charly le dit');
  trace.reponseEtat = { membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'present' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'attente' }] };
  const n0 = H().length;
  await ctx.tcPlusieursVerifier(true);
  verifie('une réponse manque : rien n est inscrit, rien n est dit, la proposition reste', trace.etats.length === 1 && trace.confirmations.length === 0 && H().length === n0 && attente().length === 1);
  await ctx.tcPlusieursVerifier();
  verifie('au plus une fois par minute (sans force)', trace.etats.length === 1);
  trace.reponseEtat = { membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'present' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'present' }] };
  trace.reponseConfirmer = { inclus: ['Marc', 'Paul'], exclus: [] };
  ctx.currentPage = 'calendar';
  await ctx.tcPlusieursVerifier(true);
  verifie('tout le monde présent : /rdv/groupe/confirmer avec le titre et la catégorie, 16h, 1 h', trace.confirmations.length === 1 && JSON.stringify(trace.confirmations[0]) === JSON.stringify({ refs: ['REF1', 'REF3'], date: iso(5), heure: 16, duree: 1, type: 'physique', options: { titre: 'Travail', cat: 'travail' } }), JSON.stringify(trace.confirmations));
  verifie('Charly le dit, la proposition est retirée, un mot à l écran depuis une autre page', dc() === 'Tout le monde a répondu pour « Travail » : c’est confirmé, mardi 20 octobre, 16h à 17h, avec Marc et Paul. Chacun l’a dans son agenda.' && attente().length === 0 && trace.toasts.some((t) => /Charly a du nouveau sur « Travail »/.test(t)), dc() + ' / ' + JSON.stringify(trace.toasts));

  titre('5. Quelqu un absent, le créneau passé, le créneau pris, le serveur muet');
  reinit(); await bouton();
  trace.reponseProposer = SERVEUR(); trace.reponseConvocation = CONVOC();
  await taper('Marc et Paul'); await cliquer(0); await cliquer(0); await cliquer(0); await cliquer(0); await cliquer(0);
  verifie('(préparation) une proposition en attente', attente().length === 1 && attente()[0].date === iso(1), JSON.stringify(attente()));
  trace.reponseEtat = { membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'absent' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'attente' }] };
  await ctx.tcPlusieursVerifier(true);
  verifie('Marc absent : rien n est inscrit, Charly le dit, la proposition est retirée', trace.confirmations.length === 0 && dc() === 'Pour « Travail » (vendredi 16 octobre, 14h à 15h), Marc Dupont ne peut pas venir : je n’inscris rien. Relance « Rendez-vous à plusieurs » pour un autre créneau.' && attente().length === 0, dc());
  // Le créneau passé sans réponse.
  stockage[ctx.TC_PLUSIEURS_CLE || 'timecool_rdv_plusieurs'] = JSON.stringify([{ id: 78, titre: 'Travail', cat: 'travail', date: iso(-1), heure: 14, duree: 1, references: ['REF1', 'REF3'], noms: ['Marc Dupont', 'Paul Martin'], quand: 'mercredi 14 octobre, 14h à 15h', envoye: 0 }]);
  trace.reponseEtat = { membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'present' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'attente' }] };
  vm.runInContext('_tcPlusieursDernierControle = 0;', ctx);
  await ctx.tcPlusieursVerifier(true);
  verifie('le créneau est passé sans la réponse de Paul : rien n est inscrit, Charly le dit, la proposition est retirée', trace.confirmations.length === 0 && dc() === 'Le créneau de « Travail » (mercredi 14 octobre, 14h à 15h) est passé sans réponse de Paul Martin : je n’inscris rien.' && attente().length === 0, dc());
  // Le créneau pris entre-temps.
  stockage['timecool_rdv_plusieurs'] = JSON.stringify([{ id: 79, titre: 'Travail', cat: 'travail', date: iso(5), heure: 16, duree: 1, references: ['REF1', 'REF3'], noms: ['Marc Dupont', 'Paul Martin'], quand: 'mardi 20 octobre, 16h à 17h', envoye: 0 }]);
  trace.reponseEtat = { membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'present' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'present' }] };
  trace.reponseConfirmer = Object.assign(new Error('pris'), { code: 'creneau_pris' });
  vm.runInContext('_tcPlusieursDernierControle = 0;', ctx);
  await ctx.tcPlusieursVerifier(true);
  verifie('créneau pris chez quelqu un : Charly le dit, la proposition est retirée', dc() === 'Tout le monde a répondu pour « Travail », mais le créneau (mardi 20 octobre, 16h à 17h) vient d’être pris chez quelqu’un : rien n’est inscrit.' && attente().length === 0, dc());
  // Le serveur muet : on réessaie au prochain tour.
  stockage['timecool_rdv_plusieurs'] = JSON.stringify([{ id: 80, titre: 'Travail', cat: 'travail', date: iso(5), heure: 16, duree: 1, references: ['REF1', 'REF3'], noms: ['Marc Dupont', 'Paul Martin'], quand: 'mardi 20 octobre, 16h à 17h', envoye: 0 }]);
  trace.reponseConfirmer = new Error('réseau');
  const n5 = H().length;
  vm.runInContext('_tcPlusieursDernierControle = 0;', ctx);
  await ctx.tcPlusieursVerifier(true);
  verifie('serveur muet à l inscription : rien n est dit, la proposition reste pour le prochain tour', H().length === n5 && attente().length === 1);
  trace.reponseEtat = new Error('réseau');
  vm.runInContext('_tcPlusieursDernierControle = 0;', ctx);
  await ctx.tcPlusieursVerifier(true);
  verifie('serveur muet à la lecture des réponses : pareil', H().length === n5 && attente().length === 1);
  trace.connecte = false;
  verifie('hors connexion : rien', (await ctx.tcPlusieursVerifier(true)) === false);

  titre('5b. Examen (15/10) : ceux qui ont dit oui sans m avoir ouvert leurs plages ; personne de joignable ; deux onglets');
  const PROPOSITION = () => JSON.stringify([{ id: 81, titre: 'Travail', cat: 'travail', date: iso(5), heure: 16, duree: 1, references: ['REF1', 'REF3'], noms: ['Marc Dupont', 'Paul Martin'], quand: 'mardi 20 octobre, 16h à 17h', envoye: 0 }]);
  const PRESENTS = () => ({ membres: [{ reference: 'REF1', prenom: 'Marc', nom: 'Dupont', statut: 'present' }, { reference: 'REF3', prenom: 'Paul', nom: 'Martin', statut: 'present' }] });
  const relance = () => { vm.runInContext('_tcPlusieursDernierControle = 0;', ctx); };
  reinit();
  stockage['timecool_rdv_plusieurs'] = PROPOSITION();
  trace.reponseEtat = PRESENTS();
  trace.reponseConfirmer = { inclus: ['Marc'], exclus: [] };
  await ctx.tcPlusieursVerifier(true);
  verifie('un sur deux sans plages ouvertes : inscrit chez Marc ; Paul a dit oui, Charly le dit et lui écrit (un message TimeCool), la proposition est retirée',
    trace.confirmations.length === 1 && dc() === 'Tout le monde a répondu pour « Travail » : c’est confirmé, mardi 20 octobre, 16h à 17h, avec Marc. C’est dans ton agenda.\n• Paul Martin a dit oui, mais je ne peux pas écrire dans son agenda (ses plages ne me sont pas ouvertes) : je lui ai envoyé un message pour l’ajouter de son côté.'
    && trace.messages.length === 1 && trace.messages[0][0] === 'REF3' && /« Travail », mardi 20 octobre, 16h à 17h : tout le monde a dit oui\. Je ne peux pas l’écrire dans ton agenda, ajoute-le de ton côté\./.test(trace.messages[0][1]) && attente().length === 0 && ctx.events.length === 3, dc() + ' / ' + JSON.stringify(trace.messages));
  reinit();
  stockage['timecool_rdv_plusieurs'] = PROPOSITION();
  trace.reponseEtat = PRESENTS();
  trace.reponseConfirmer = Object.assign(new Error('Personne n est joignable pour ce rendez-vous.'), { code: 'creneau_pris' });
  await ctx.tcPlusieursVerifier(true);
  const chezMoi = ctx.events.filter((e) => String(e.id).indexOf('charly_ai_') === 0)[0];
  verifie('personne de joignable (tous sans plages ouvertes) : noté chez moi seulement (16h-17h, Travail), un message à chacun, Charly dit la vérité, la proposition est retirée',
    chezMoi && chezMoi.title === 'Travail avec Marc Dupont et Paul Martin' && chezMoi.date === iso(5) && chezMoi.startH === 16 && chezMoi.endH === 17 && chezMoi.cat === 'travail' && trace.saves === 1
    && dc() === 'Tout le monde a dit oui pour « Travail » (mardi 20 octobre, 16h à 17h) : c’est noté dans ton agenda. Mais je ne peux pas écrire dans l’agenda de Marc Dupont et Paul Martin (leurs plages ne me sont pas ouvertes) : je leur ai envoyé un message pour qu’ils l’ajoutent de leur côté.'
    && trace.messages.length === 2 && trace.messages.map((m) => m[0]).join(',') === 'REF1,REF3' && attente().length === 0, dc() + ' / ' + JSON.stringify(chezMoi));
  reinit();
  stockage['timecool_rdv_plusieurs'] = PROPOSITION();
  trace.reponseEtat = PRESENTS();
  trace.reponseConfirmer = { inclus: ['Marc', 'Paul'], exclus: [] };
  await Promise.all([ctx.tcPlusieursVerifier(true), ctx.tcPlusieursVerifier(true)]);
  verifie('deux onglets en même temps : une seule inscription, un seul mot de Charly', trace.confirmations.length === 1 && H().filter((m) => /c’est confirmé/.test(String(m.content))).length === 1 && attente().length === 0, trace.confirmations.length + ' ' + textes());
  reinit();
  stockage['timecool_rdv_plusieurs'] = JSON.stringify(JSON.parse(PROPOSITION()).map((p) => Object.assign(p, { enCours: vm.runInContext('Date.now()', ctx) - 30000 })));
  trace.reponseEtat = PRESENTS();
  await ctx.tcPlusieursVerifier(true);
  verifie('réservée par un autre onglet il y a 30 s : cet onglet n inscrit pas', trace.confirmations.length === 0 && attente().length === 1);
  stockage['timecool_rdv_plusieurs'] = JSON.stringify(JSON.parse(PROPOSITION()).map((p) => Object.assign(p, { enCours: vm.runInContext('Date.now()', ctx) - 5 * 60000 })));
  relance();
  await ctx.tcPlusieursVerifier(true);
  verifie('réservation vieille de cinq minutes (onglet fermé) : cet onglet inscrit', trace.confirmations.length === 1 && attente().length === 0);
  reinit();
  stockage['timecool_rdv_plusieurs'] = PROPOSITION();
  trace.reponseEtat = PRESENTS();
  trace.reponseConfirmer = new Error('réseau');
  await ctx.tcPlusieursVerifier(true);
  verifie('serveur muet à l inscription : la réservation est levée, la proposition reste', attente().length === 1 && !attente()[0].enCours);

  titre('6. Personne de consultable : mes créneaux, et Charly le dit ; moins de deux contacts TimeCool ; serveur muet');
  reinit(); await bouton();
  trace.reponseProposer = { creneaux: [], invites: [], sans_acces: ['Marc', 'Paul'] };
  await taper('Marc et Paul'); await cliquer(0); await cliquer(0);
  verifie('mes trois créneaux de la semaine (demain 9h, lundi 9h, mardi 9h : jamais le week-end, jamais le passé), et « Je n’ai pas pu regarder l’agenda de Marc et Paul : je propose quand même. »',
    question() === 'Voici des créneaux libres chez toi cette semaine. Touche-en un, ou tape une heure (ex : 14h). Je n’ai pas pu regarder l’agenda de Marc et Paul : je propose quand même.' && choixTextes() === 'jeudi 15 octobre à 12h15 | vendredi 16 octobre à 09h00 | lundi 19 octobre à 09h00', question() + ' / ' + choixTextes());
  await taper('14h30');
  verifie('une demi-heure tapée : refusée (heure ronde)', dc() === ctx.tcPhraseNonCompris('Touche un bouton, ou tape son numéro (1 à 3).'), dc());
  await taper('demain 14h');
  verifie('« demain 14h » : pris', enCours() && enCours().reponses.creneau && enCours().reponses.creneau.date === iso(1) && enCours().reponses.creneau.debut === 840 && question().indexOf('Combien de temps ?') === 0, textes());
  reinit(); await bouton();
  trace.reponseProposer = new Error('réseau');
  await taper('Marc et Paul'); await cliquer(0); await cliquer(0);
  verifie('serveur muet : Charly le dit, le questionnaire s arrête', dc() === 'Je n’arrive pas à interroger les agendas pour le moment : réessaie dans un instant.' && enCours() === null, dc());
  const sauve = ctx.contactsList;
  ctx.contactsList = [{ id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' }, { id: 'c2', name: 'Sophie Anceau', phone: '06' }];
  reinit(); await bouton();
  verifie('un seul contact TimeCool : Charly le dit, rien n est demandé', dc() === 'Il me faut au moins deux contacts qui ont TimeCool pour un rendez-vous à plusieurs. La page Contacts dit qui l’a.' && enCours() === null && carte() === null, dc());
  ctx.contactsList = sauve;

  titre('7. Une phrase qui dit tout, « Autre », une date tapée, la durée habituelle, « Non, j’arrête »');
  reinit(); await bouton();
  trace.reponseProposer = SERVEUR();
  await taper('Marc et Paul');
  await taper('Réunion projet mardi 14h');
  verifie('« Réunion projet mardi 14h » : le sujet (Travail), le jour et l heure sont connus : droit à « Combien de temps ? »', question().indexOf('Combien de temps ?') === 0 && enCours().reponses.quoi === 'Réunion projet' && enCours().reponses.date === iso(5) && enCours().reponses.creneau.debut === 840 && trace.propositions.length === 0, textes());
  await cliquer(1);
  verifie('le récapitulatif : « Réunion projet » (Travail), mardi 20 octobre, 14h à 16h (2 h)', /• « Réunion projet » \(Travail\)\n• Mardi 20 octobre, 14h à 16h \(2 h\)/.test(question()), question());
  await taper('non');
  verifie('« Non, j’arrête » : rien n est envoyé', dc() === 'D’accord, j’arrête là : rien n’est envoyé.' && trace.convocations.length === 0 && enCours() === null, dc());
  reinit(); await bouton();
  trace.reponseProposer = SERVEUR();
  await taper('Marc et Paul'); await cliquer(3);
  verifie('« Autre » : Charly demande le sujet', question() === 'D’accord. Tape le sujet du rendez-vous (ex : Anniversaire, ou Anniversaire samedi 15h).', question());
  await taper('Anniversaire');
  await cliquer(2);
  verifie('« Je choisis une date » : Charly demande le jour', question() === 'Quel jour ? Tape une date (ex : mardi, le 20 octobre, 20/10).', question());
  await taper('mardi');
  verifie('« mardi » : le serveur est interrogé sur ce seul jour, et le créneau du mardi est proposé', trace.propositions[0].options.depuis === iso(5) && trace.propositions[0].options.jusqua === iso(5) && choixTextes() === 'mardi 20 octobre à 16h00' && /le mardi 20 octobre/.test(question()), question() + ' / ' + choixTextes());
  reinit(agenda().concat([ev('x1', 'Réunion', -7, 9, 0, 11, 0, { cat: 'travail' }), ev('x2', 'Point', -3, 14, 0, 16, 0, { cat: 'travail' })]));
  await bouton();
  trace.reponseProposer = SERVEUR();
  await taper('Marc et Paul'); await cliquer(0); await cliquer(0); await cliquer(0);
  verifie('deux rendez-vous Travail de 2 h : « 2 h (comme d’habitude) » en premier', choixTextes() === '2 h (comme d’habitude) | 1 h | 3 h', choixTextes());
  verifie('le serveur a été interrogé avec cette durée (2 h)', trace.propositions[0].duree === 2, JSON.stringify(trace.propositions));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + (e && e.stack || e)); process.exit(1); });
