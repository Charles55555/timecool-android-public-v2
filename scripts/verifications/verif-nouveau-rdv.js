// « Créer un nouveau rdv » (bouton Charly) sur le moteur de questionnaire (mission 46, chef, 15/10, validée par Charles).
//
// Une question à la fois, boutons numérotés, « 2 » ou un texte tapé vaut le bouton, étapes sautées si la phrase les dit
// déjà, rien n'est créé avant « Oui, crée-le ». Chronologie : quoi (Travail / Médecin / Famille / Amis / Autre, ou un titre
// tapé), avec qui (Personne / Un contact / Plusieurs), quand (Aujourd'hui / Demain / Cette semaine / Je choisis une date)
// puis trois créneaux libres dans « Mes disponibilités » (sans plage : lundi-vendredi 9h-18h, jamais le week-end) et dans
// l'agenda du contact s'il a TimeCool et est consultable (/rdv/groupe/proposer avec une période), combien de temps
// (30 min / 1 h / 2 h / Autre, la durée habituelle de la catégorie en premier), récapitulatif « Oui, crée-le », puis
// « C'est noté. » : la proposition part au contact (messagerie TimeCool, ou message prêt par SMS / email) ; à plusieurs,
// le serveur l'inscrit chez tout le monde (/rdv/groupe/confirmer avec le titre et la catégorie).
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');
const api = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';

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

titre('0. La page et l API');
verifie('l ancienne question unique « Tu veux créer un nouveau rendez-vous ! » a disparu', page.indexOf('TC_QUESTION_NOUVEAU_RDV') < 0 && page.indexOf('Tu veux créer un nouveau rendez-vous !') < 0);
const act = extraire('charlyQuickAction') || '';
verifie('l onglet rdv lance le questionnaire avec sa bulle', /action === 'rdv'\) \{ tcDemarrerNouveauRdv\('Je veux créer un nouveau rendez-vous'\); return; \}/.test(act));
verifie('le serveur : proposerRdvGroupe accepte une période (depuis, jusqua, combien, par_jour), confirmerRdvGroupe un titre et une catégorie',
  /async proposerRdvGroupe\(references, duree, type, options\)/.test(page) && /\['depuis', 'jusqua', 'combien', 'par_jour'\]/.test(page)
  && /async confirmerRdvGroupe\(references, date, heure, duree, type, options\)/.test(page) && /if \(options && options\.titre\) corps\.titre = options\.titre;/.test(page));
if (api) {
  verifie('API : creneauxCommuns prend une période et un nombre par jour, sans changer son appel d avant',
    /function creneauxCommuns\(int \$organisateurId, array \$invites, int \$duree, int \$combien = 3, \?string \$depuis = null, \?string \$jusqua = null, int \$parJour = 1\): array/.test(api));
  verifie('API : aujourd hui, jamais une heure déjà passée', /if \(\$date === \$aujourdhui && \$h <= \$heureActuelle\) \{\s+continue;/.test(api));
  const prop = api.slice(api.indexOf("case 'POST /rdv/groupe/proposer':"), api.indexOf("case 'POST /rdv/groupe/confirmer':"));
  verifie('API : /rdv/groupe/proposer lit depuis, jusqua (jamais dans le passé, 30 jours au plus), combien (1-10) et par_jour (1-3)',
    /Entree::texte\('depuis', 10\)/.test(prop) && /Entree::texte\('jusqua', 10\)/.test(prop) && /\$depuis < date\('Y-m-d'\)/.test(prop) && /strtotime\('\+30 day', strtotime\(\$depuis\)\)/.test(prop)
    && /Entree::entier\('combien'\)/.test(prop) && /Entree::entier\('par_jour'\)/.test(prop) && /creneauxCommuns\(\(int\) \$moi\['id'\], \$invites, \$duree, \$combien, \$depuis, \$jusqua, \$parJour\)/.test(prop), prop.length);
  const conf = api.slice(api.indexOf("case 'POST /rdv/groupe/confirmer':"), api.indexOf('/* Message libre d un compte'));
  verifie('API : /rdv/groupe/confirmer lit un titre (120) et une catégorie connue ; sans eux, les prénoms et Travail comme avant',
    /Entree::texte\('titre', 120\)/.test(conf) && /Entree::texte\('cat', 20\)/.test(conf) && /\$titre = \$titreDonne !== null \? \$titreDonne \. ' avec ' \. \$noms : \$noms;/.test(conf) && /'cat'    => \$catDonnee \?\? 'travail',/.test(conf));
}

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user', cat: 'perso' }, extra || {});
function agenda() {
  return [
    ev('a', 'Petit déjeuner', 0, 8, 0, 9, 0),                                           // passé
    ev('v', 'Fête', 3, 0, 0, 23, 59, { allDay: true }),                                  // journée entière (dimanche) : elle occupe tout le jour
    ev('b', 'Dentiste', 0, 11, 0, 12, 0, { contact: 'c1', cat: 'sante' }),
    ev('p', 'Client', 0, 14, 0, 15, 0, { mode: 'pro' }),                                 // autre agenda
    ev('c', 'Coach', 0, 15, 0, 16, 0, { contact: 'c2' }),
    ev('k', 'Kiné', 0, 17, 30, 18, 30),
    ev('d', 'Banque', 1, 10, 0, 11, 0)                                                   // vendredi
  ];
}

const trace = { saves: 0, toasts: [], envois: [], demarches: [], propositions: [], confirmations: [], connecte: true, reponseProposer: null, reponseConfirmer: null };
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, JSON, Math, parseInt, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [], config: {} }, viewDate: null,
  contactsList: [
    { id: 'c1', name: 'Marc Dupont', referenceCompte: 'REF1' },
    { id: 'c2', name: 'Sophie Anceau', phone: '06' },
    { id: 'c3', name: 'Paul Martin', referenceCompte: 'REF3' },
    { id: 'c4', name: 'Lucie Bernard' }
  ],
  AGENDA_CATEGORIES: [{ id: 'travail', label: 'Travail' }, { id: 'sante', label: 'Santé' }, { id: 'famille', label: 'Famille' }, { id: 'amis', label: 'Amis & Loisirs' }, { id: 'perso', label: 'Personnel' }],
  _dispoData: {}, loadDispo() {},
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; },
  addDemarche(d) { trace.demarches.push(d.title); }, tcSyncTour() {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcVouvoiement: (c) => !!(c && c.vouvoie), tcDirePrevenance() {}, tcContactDuSurnom: () => null,
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return c.referenceCompte ? 'timecool' : (c.phone ? 'sms' : (c.email ? 'email' : 'aucun')); },
  TC_BACKEND: {
    estConnecte: () => trace.connecte,
    proposerRdvGroupe: async (refs, duree, type, options) => { trace.propositions.push({ refs: refs, duree: duree, type: type, options: options }); if (trace.reponseProposer instanceof Error) throw trace.reponseProposer; return trace.reponseProposer || { creneaux: [], invites: [], sans_acces: [] }; },
    confirmerRdvGroupe: async (refs, date, heure, duree, type, options) => { trace.confirmations.push({ refs: refs, date: date, heure: heure, duree: duree, type: type, options: options }); if (trace.reponseConfirmer instanceof Error) throw trace.reponseConfirmer; return trace.reponseConfirmer || { inclus: [], exclus: [] }; }
  },
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  localStorage: { getItem: () => null, setItem() {} },
  tcDemarrerRdvAPlusieurs() {}, charlyAttachAction() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {}, tcDemarrerMalade() {}, tcDemarrerImprevu() {}, tcPrevenirRetard() {},
  document: { getElementById: () => ({ value: '', style: {} }) }, Set, _agendaChecked: null
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcGroupeEnAttente = 0;', ctx);
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
verifie('le bloc « questionnaire guidé » porte le parcours « nouveau rendez-vous »', bloc.length > 1000 && bloc.indexOf('const TC_QUESTIONNAIRE_NOUVEAU_RDV = {') > -1, bloc.length);
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
const reinit = (evts) => {
  ctx.events = evts || agenda(); ctx.charlyIA.history = []; ctx.viewDate = null;
  trace.saves = 0; trace.toasts.length = 0; trace.envois.length = 0; trace.demarches.length = 0; trace.propositions.length = 0; trace.confirmations.length = 0;
  trace.connecte = true; trace.reponseProposer = null; trace.reponseConfirmer = null;
  vm.runInContext('_tcQuestionnaire = null; _tcMarcheArriere = null;', ctx);
};
const bouton = async () => { ctx.charlyQuickAction('rdv'); await new Promise((r) => setTimeout(r, 0)); };
const nouveaux = () => ctx.events.filter((e) => String(e.id).indexOf('charly_ai_') === 0);
const nb = () => ctx.events.length;

(async () => {
  titre('1. L onglet : la bulle, puis « C’est quel rendez-vous ? » avec cinq boutons');
  reinit();
  await bouton();
  verifie('la bulle de l utilisateur puis la carte', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'Je veux créer un nouveau rendez-vous' && carte() && question() === 'C’est quel rendez-vous ? Touche un bouton, ou tape son nom (ex : Dentiste demain 10h).', textes());
  verifie('les cinq choix, textes exacts', choixTextes() === 'Travail | Médecin | Famille | Amis | Autre', choixTextes());

  titre('2. Médecin, personne, demain, trois créneaux, 1 h, récapitulatif, « Oui, crée-le »');
  await cliquer(1);
  verifie('« Avec qui ? » : Personne / Un contact / Plusieurs', question() === 'Avec qui ?' && choixTextes() === 'Personne | Un contact | Plusieurs', choixTextes());
  await taper('personne');
  verifie('« Quand ? » : Aujourd’hui / Demain / Cette semaine / Je choisis une date', question() === 'Quand ?' && choixTextes() === 'Aujourd’hui | Demain | Cette semaine | Je choisis une date', choixTextes());
  await taper('2');
  verifie('trois créneaux demain, dans 9h-18h (sans plage déclarée), hors Banque 10h-11h : début, milieu, fin de journée',
    question() === 'Voici des créneaux libres demain. Touche-en un, ou tape une heure (ex : 14h30).' && choixTextes() === 'vendredi 16 octobre à 09h00 | vendredi 16 octobre à 14h00 | vendredi 16 octobre à 17h00', question() + ' / ' + choixTextes());
  verifie('personne n a été interrogé au serveur (pas de contact)', trace.propositions.length === 0);
  await cliquer(0);
  verifie('« Combien de temps ? » : 30 min / 1 h / 2 h / Autre (sans durée habituelle)', question() === 'Combien de temps ?' && choixTextes() === '30 min | 1 h | 2 h | Autre (je tape)', choixTextes());
  await cliquer(1);
  verifie('le récapitulatif : le titre et la catégorie, le jour, l heure et la durée ; « Oui, crée-le » / « Non, j’arrête »',
    question() === 'Voici ce que je vais faire :\n• « Médecin » (Santé)\n• Vendredi 16 octobre, 09h à 10h (1 h)' && choixTextes() === 'Oui, crée-le | Non, j’arrête', question() + ' / ' + choixTextes());
  verifie('rien n est créé avant « Oui, crée-le »', nouveaux().length === 0 && trace.saves === 0 && trace.demarches.length === 0);
  await taper('oui');
  const cree = nouveaux()[0];
  verifie('le rendez-vous est créé comme la carte « Ajouter » : mêmes champs, catégorie Santé, 9h-10h demain, sans contact, enregistré, démarche notée, agenda sur le jour',
    cree && cree.title === 'Médecin' && cree.cat === 'sante' && cree.date === iso(1) && cree.startH === 9 && cree.startM === 0 && cree.endH === 10 && cree.endM === 0 && cree.mode === 'user' && !cree.contact
    && trace.saves === 1 && trace.demarches[0] === 'Nouveau rendez-vous : Médecin' && ctx.viewDate && ctx.viewDate.getDate() === 16, JSON.stringify(cree) + ' ' + JSON.stringify(trace.demarches));
  verifie('« C’est noté. » et le rendez-vous, puis plus de question', dc() === 'C’est noté.\n• « Médecin », vendredi 16 octobre, 09h à 10h' && enCours() === null, dc());

  titre('3. « Dentiste demain 10h » tapé : le jour et l heure sont connus ; un contact tapé (SMS) ; la durée fait chevaucher Banque : on repropose');
  reinit();
  await bouton();
  await taper('Dentiste demain 10h');
  verifie('« Quand ? » et les créneaux sont sautés : droit à « Avec qui ? »', question() === 'Avec qui ?' && !/Quand \?/.test(textes()), textes());
  await taper('un contact');
  verifie('« Lequel ? » : la liste de ses contacts, puis un nom tapé', question() === 'Lequel ? Touche un contact, ou tape son nom.' && ['Marc Dupont', 'Sophie Anceau', 'Paul Martin', 'Lucie Bernard'].every((n) => choixTextes().indexOf(n) > -1), choixTextes());
  await taper('sophie');
  verifie('« Combien de temps ? » vient tout de suite (le créneau est connu)', question() === 'Combien de temps ?', textes());
  await taper('2');
  verifie('avec 1 h, 10h chevauche « Banque » : Charly le dit et repropose ce qui tient',
    question() === 'Avec 1 h, vendredi 16 octobre à 10h00 chevauche « Banque ». Voici ce qui tient. Touche-en un, ou tape une autre heure.' && choixTextes() === 'vendredi 16 octobre à 09h00 | vendredi 16 octobre à 14h00 | vendredi 16 octobre à 17h00', question() + ' / ' + choixTextes());
  await taper('11h');
  verifie('une heure tapée vaut un choix ; le récapitulatif dit avec qui et que le message sera prêt (SMS ou email)',
    question() === 'Voici ce que je vais faire :\n• « Dentiste » (Santé)\n• Avec Sophie Anceau\n• Vendredi 16 octobre, 11h à 12h (1 h)\n• Je prépare le message pour Sophie (SMS ou email), tu l’envoies d’un geste', question());
  await cliquer(0);
  const cree3 = nouveaux()[0];
  verifie('créé 11h-12h avec le contact ; rien n est parti tout seul', cree3 && cree3.contact === 'c2' && cree3.startH === 11 && cree3.endH === 12 && trace.envois.length === 0, JSON.stringify(cree3));
  const bilan3 = dernier();
  verifie('le bilan : « C’est noté. », le rendez-vous avec Sophie, « Message prêt… » et un bouton « Envoyer à Sophie Anceau » avec la proposition (tu)',
    dc() === 'C’est noté.\n• « Dentiste », vendredi 16 octobre, 11h à 12h, avec Sophie Anceau\n• Message prêt, à envoyer toi-même d’un geste (SMS ou email) : Sophie Anceau'
    && bilan3._envois && bilan3._envois.length === 1 && bilan3._envois[0].nom === 'Sophie Anceau'
    && bilan3._envois[0].texte === 'Bonjour Sophie, je te propose un rendez-vous « Dentiste » le vendredi 16 octobre à 11h00 (1 h). Dis-moi si ça te convient.', dc() + ' / ' + JSON.stringify(bilan3._envois));
  await ctx.tcQuestionnaireEnvoyer(bilan3._envoisId, 0);
  verifie('le bouton touché : le SMS part avec ce texte, le bouton s éteint', trace.envois.length === 1 && trace.envois[0][0] === 'Sophie Anceau' && bilan3._envois[0].fait === 'sms', JSON.stringify(trace.envois));

  titre('4. Un contact qui a TimeCool : le serveur est interrogé sur la période ; la proposition part par la messagerie');
  reinit();
  trace.reponseProposer = { creneaux: [{ date: iso(0), heure: 8, minute: 0, manquants: [] }, { date: iso(0), heure: 13, minute: 0, manquants: [] }, { date: iso(0), heure: 16, minute: 0, manquants: [] }], invites: ['Marc'], sans_acces: [] };
  await bouton();
  await cliquer(0);
  await taper('avec Marc');
  verifie('« avec Marc » tapé à « Avec qui ? » : le contact est trouvé, « Quand ? » suit', question() === 'Quand ?' && enCours().reponses.avec === 'contact' && enCours().reponses.contact === 'c1', textes());
  await taper("aujourd'hui");
  verifie('le serveur a été interrogé pour Marc, sur aujourd hui seulement, 1 h, dix créneaux, trois par jour',
    trace.propositions.length === 1 && JSON.stringify(trace.propositions[0]) === JSON.stringify({ refs: ['REF1'], duree: 1, type: 'physique', options: { depuis: iso(0), jusqua: iso(0), combien: 10, par_jour: 3 } }), JSON.stringify(trace.propositions));
  verifie('les heures du serveur passent par mes plages (8h est fermé) ; « Marc est libre aussi. »',
    question() === 'Voici des créneaux libres aujourd’hui. Touche-en un, ou tape une heure (ex : 14h30). Marc est libre aussi.' && choixTextes() === 'jeudi 15 octobre à 13h00 | jeudi 15 octobre à 16h00', question() + ' / ' + choixTextes());
  await cliquer(0);
  await taper('1 h');
  verifie('le récapitulatif : « J’envoie la proposition à Marc par la messagerie TimeCool »', /\n• Avec Marc Dupont\n• Jeudi 15 octobre, 13h à 14h \(1 h\)\n• J’envoie la proposition à Marc par la messagerie TimeCool$/.test(question()), question());
  await taper('oui');
  verifie('créé avec Marc, 13h-14h, Travail ; la proposition est partie par TimeCool ; « J’ai envoyé la proposition à Marc. »',
    nouveaux().length === 1 && nouveaux()[0].contact === 'c1' && nouveaux()[0].cat === 'travail' && nouveaux()[0].startH === 13
    && trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont' && trace.envois[0][1] === 'Bonjour Marc, je te propose un rendez-vous « Travail » le jeudi 15 octobre à 13h00 (1 h). Dis-moi si ça te convient.'
    && dc() === 'C’est noté.\n• « Travail », jeudi 15 octobre, 13h à 14h, avec Marc Dupont\n• J’ai envoyé la proposition à Marc.', dc() + ' / ' + JSON.stringify(trace.envois));

  titre('5. Un contact TimeCool dont l agenda n est pas consultable, ou un serveur muet : mes créneaux, et Charly le dit');
  reinit();
  trace.reponseProposer = { creneaux: [], invites: [], sans_acces: ['Marc'] };
  await bouton(); await cliquer(0); await taper('Marc Dupont'); await taper('demain');
  verifie('sans accès : mes trois créneaux de demain, « Je n’ai pas pu regarder l’agenda de Marc. »',
    question() === 'Voici des créneaux libres demain. Touche-en un, ou tape une heure (ex : 14h30). Je n’ai pas pu regarder l’agenda de Marc.' && choixTextes() === 'vendredi 16 octobre à 09h00 | vendredi 16 octobre à 14h00 | vendredi 16 octobre à 17h00', question());
  reinit();
  trace.reponseProposer = new Error('réseau');
  await bouton(); await cliquer(0); await taper('Marc Dupont'); await taper('demain');
  verifie('serveur muet : pareil', /Je n’ai pas pu regarder l’agenda de Marc\.$/.test(question()) && choixTextes().split(' | ').length === 3, question());
  reinit();
  trace.connecte = false;
  await bouton(); await cliquer(0); await taper('Marc Dupont'); await taper('demain');
  verifie('hors connexion : pas d appel, mes créneaux, et Charly le dit', trace.propositions.length === 0 && /Je n’ai pas pu regarder l’agenda de Marc\.$/.test(question()), question());

  titre('6. Plusieurs : les prénoms tapés, les créneaux communs du serveur, le serveur inscrit chez tout le monde');
  reinit();
  trace.reponseProposer = { creneaux: [{ date: iso(4), heure: 9, minute: 0, manquants: ['Paul'] }, { date: iso(1), heure: 14, minute: 0, manquants: [] }], invites: ['Marc', 'Paul'], sans_acces: [] };
  trace.reponseConfirmer = { date: iso(1), heure: '14:00', libelle: 'vendredi 16 octobre', duree: 2, type: 'physique', inclus: ['Marc', 'Paul'], exclus: [] };
  await bouton();
  await taper('Réunion projet');
  verifie('un titre tapé : « Réunion projet » rangé en Travail, puis « Avec qui ? »', question() === 'Avec qui ?' && enCours().reponses.quoi === 'Réunion projet', textes());
  await taper('Marc et Paul');
  verifie('deux contacts TimeCool cités : « plusieurs », puis « Quand ? »', question() === 'Quand ?' && enCours().reponses.avec === 'plusieurs' && enCours().reponses._groupe.length === 2, textes());
  await cliquer(2);
  verifie('le serveur est interrogé pour les deux, sur les sept jours', trace.propositions.length === 1 && trace.propositions[0].refs.join(',') === 'REF1,REF3' && trace.propositions[0].options.depuis === iso(0) && trace.propositions[0].options.jusqua === iso(6), JSON.stringify(trace.propositions));
  verifie('les créneaux communs, ceux où tout le monde est libre d abord, qui manque sous les autres',
    question() === 'Voici les créneaux cette semaine où le plus de monde est libre. Touche-en un, ou tape une heure (ex : 14h).' && choixTextes() === 'vendredi 16 octobre à 14h00 | lundi 19 octobre à 09h00 (pas libre : Paul)', question() + ' / ' + choixTextes());
  await cliquer(0);
  await taper('2h');
  verifie('le récapitulatif : avec qui, le créneau, « Je l’inscris dans l’agenda de Marc Dupont et Paul Martin »',
    question() === 'Voici ce que je vais faire :\n• « Réunion projet » (Travail)\n• Avec Marc Dupont et Paul Martin\n• Vendredi 16 octobre, 14h à 16h (2 h)\n• Je l’inscris dans l’agenda de Marc Dupont et Paul Martin', question());
  verifie('rien n est inscrit avant « Oui, crée-le »', trace.confirmations.length === 0);
  await cliquer(0);
  verifie('le serveur inscrit le rendez-vous chez tout le monde, avec le titre et la catégorie ; rien n est écrit ici (la synchronisation le ramène)',
    trace.confirmations.length === 1 && JSON.stringify(trace.confirmations[0]) === JSON.stringify({ refs: ['REF1', 'REF3'], date: iso(1), heure: 14, duree: 2, type: 'physique', options: { titre: 'Réunion projet', cat: 'travail' } })
    && nouveaux().length === 0 && trace.saves === 0, JSON.stringify(trace.confirmations));
  verifie('« C’est noté : …, avec Marc et Paul. Chacun l’a dans son agenda. »', dc() === 'C’est noté : « Réunion projet », vendredi 16 octobre, 14h à 16h, avec Marc et Paul. Chacun l’a dans son agenda.' && enCours() === null, dc());
  reinit();
  trace.reponseProposer = { creneaux: [{ date: iso(1), heure: 14, minute: 0, manquants: [] }], invites: ['Marc', 'Paul'], sans_acces: [] };
  trace.reponseConfirmer = Object.assign(new Error('pris'), { code: 'creneau_pris' });
  await bouton(); await taper('Réunion projet'); await taper('Marc et Paul'); await taper('demain'); await cliquer(0); await cliquer(1); await cliquer(0);
  verifie('créneau pris entre-temps : rien n est créé, Charly le dit', /^Ce créneau vient d’être pris chez quelqu’un : rien n’est créé\./.test(dc()) && nouveaux().length === 0, dc());
  reinit();
  await bouton(); await taper('Réunion projet'); await cliquer(2);
  verifie('« Plusieurs » : Charly demande les prénoms', question() === 'Avec qui ? Donne-moi leurs prénoms (ex : Paul et Marie), parmi tes contacts qui ont TimeCool.' && choixTextes() === '', question());
  await taper('bof');
  verifie('sans prénom connu : une relance propre à cette question', dc() === ctx.tcPhraseNonCompris('Donne-moi au moins deux prénoms de tes contacts qui ont TimeCool (ex : Paul et Marie).'), dc());
  await taper('Marc Dupont');
  verifie('un seul contact cité : on continue avec ce contact, pas à plusieurs', question() === 'Quand ?' && enCours().reponses.avec === 'contact' && enCours().reponses.contact === 'c1', textes());

  titre('7. La durée habituelle de la catégorie passe en premier');
  reinit(agenda().concat([ev('x1', 'Ostéo', -7, 9, 0, 9, 45, { cat: 'sante' }), ev('x2', 'Radio', -3, 14, 0, 14, 45, { cat: 'sante' })]));
  await bouton(); await cliquer(1); await cliquer(0); await cliquer(1); await cliquer(0);
  verifie('deux rendez-vous Santé de 45 min : « 45 min (comme d’habitude) » en premier', choixTextes() === '45 min (comme d’habitude) | 30 min | 1 h | 2 h | Autre (je tape)', choixTextes());
  await cliquer(0);
  verifie('retenue : 45 min', /09h à 09h45 \(45 min\)/.test(question()), question());
  reinit(agenda().concat([ev('x1', 'Ostéo', -7, 9, 0, 10, 0, { cat: 'sante' }), ev('x2', 'Radio', -3, 14, 0, 15, 0, { cat: 'sante' })]));
  await bouton(); await cliquer(1); await cliquer(0); await cliquer(1); await cliquer(0);
  verifie('une durée déjà proposée (1 h) : elle passe devant, sans doublon', choixTextes() === '1 h (comme d’habitude) | 30 min | 2 h | Autre (je tape)', choixTextes());

  titre('8. « Non, j’arrête », « Autre » durée, une date choisie, le week-end fermé, une heure tapée quand même');
  reinit();
  await bouton(); await cliquer(2); await cliquer(0); await cliquer(1); await cliquer(0); await cliquer(0); await taper('non');
  verifie('« Non, j’arrête » : rien n est créé', dc() === 'D’accord, j’arrête là : rien n’est créé.' && nouveaux().length === 0 && trace.saves === 0 && enCours() === null, dc());
  reinit();
  await bouton(); await cliquer(4);
  verifie('« Autre » : Charly demande le nom', question() === 'D’accord. Tape le nom du rendez-vous (ex : Coiffeur, ou Coiffeur mardi 10h).', question());
  await taper('Coiffeur');
  await cliquer(0); await cliquer(3);
  verifie('« Je choisis une date » : Charly demande le jour', question() === 'Quel jour ? Tape une date (ex : mardi, le 20 octobre, 20/10).', question());
  await taper('bof');
  verifie('un jour illisible : une relance propre à cette question', dc() === ctx.tcPhraseNonCompris('Tape un jour (ex : mardi, le 20 octobre, 20/10).'), dc());
  await taper('samedi');
  verifie('samedi, sans plage déclarée : fermé, aucun créneau, mais une heure tapée reste possible',
    question() === 'Je ne vois aucun créneau libre le samedi 17 octobre dans tes disponibilités. Tape une heure (ex : 14h30), ou un autre jour (ex : mardi 10h).' && choixTextes() === '', question());
  await taper('10h');
  await cliquer(3);
  verifie('« Autre (je tape) » : Charly demande la durée', question() === 'Combien de temps ? Tape une durée (ex : 45 min, 1h30).', question());
  await taper('1h30');
  verifie('le récapitulatif : Coiffeur (Personnel), samedi 17 octobre, 10h à 11h30 (1 h 30)', question() === 'Voici ce que je vais faire :\n• « Coiffeur » (Personnel)\n• Samedi 17 octobre, 10h à 11h30 (1 h 30)', question());
  await taper('ok');
  verifie('créé 10h-11h30 le samedi, catégorie Personnel', nouveaux().length === 1 && nouveaux()[0].date === iso(2) && nouveaux()[0].startH === 10 && nouveaux()[0].endH === 11 && nouveaux()[0].endM === 30 && nouveaux()[0].cat === 'perso', JSON.stringify(nouveaux()));
  reinit();
  await bouton(); await cliquer(2); await cliquer(0); await taper('mardi');
  verifie('« mardi » tapé à « Quand ? » : le jour est compris (mardi 20 octobre)', question() === 'Voici des créneaux libres le mardi 20 octobre. Touche-en un, ou tape une heure (ex : 14h30).' && /mardi 20 octobre à 09h00/.test(choixTextes()), question() + ' / ' + choixTextes());

  titre('9. Aujourd hui à 10h : jamais une heure passée ; ce qui est déjà noté est évité (Dentiste 11h-12h, Coach 15h-16h, Kiné 17h30)');
  reinit();
  await bouton(); await cliquer(2); await cliquer(0); await cliquer(0);
  verifie('les créneaux d aujourd hui : 12h15, 13h15, 16h15', choixTextes() === 'jeudi 15 octobre à 12h15 | jeudi 15 octobre à 13h15 | jeudi 15 octobre à 16h15', choixTextes());
  await taper('9h');
  verifie('une heure passée tapée : relance (touche un bouton ou tape son numéro)', dc() === ctx.tcPhraseNonCompris('Touche un bouton, ou tape son numéro (1 à 3).') && enCours() !== null, dc());
  await taper('14h');
  await cliquer(1);
  verifie('14h tapé : récapitulatif à 14h-15h', /Jeudi 15 octobre, 14h à 15h \(1 h\)/.test(question()), question());

  titre('10. Une vraie demande pendant le questionnaire le fait tomber ; un contact sans numéro ni email');
  reinit();
  await bouton();
  const pris = await taper('annule le dentiste');
  verifie('« annule le dentiste » : le questionnaire s arrête, le message suit son chemin', pris === false && enCours() === null && dc() === 'D’accord, je laisse tomber la question qui attendait. Je passe à ta nouvelle demande.', dc());
  reinit();
  await bouton(); await cliquer(2); await taper('Lucie'); await cliquer(1); await cliquer(0); await cliquer(1);
  verifie('le récapitulatif prévient : Lucie n a ni numéro ni email', /• Lucie n’a ni numéro ni email dans ta fiche : tu le préviens toi-même$/.test(question()), question());
  await cliquer(0);
  verifie('créé avec Lucie ; le bilan dit « À prévenir toi-même »', nouveaux().length === 1 && nouveaux()[0].contact === 'c4' && /• Sans numéro ni email dans ta fiche contact : Lucie Bernard\. À prévenir toi-même\.$/.test(dc()) && trace.envois.length === 0, dc());

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + (e && e.stack || e)); process.exit(1); });
