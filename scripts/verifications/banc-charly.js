// Banc d'essai de Charly : 180 façons de lui demander quelque chose, et
// où chaque phrase doit aller (suppression, prévenir, contrainte,
// consultation, créneau, Google, FAQ, « pas encore », ou le modèle).
//
// Charles, 04/10 : « formater plus vite Charly IA » — on cherche les trous
// d'un coup, au lieu d'attendre qu'il tombe dessus un par un. Chaque
// phrase corrigée reste ici pour toujours.
//
// Ne teste que l'aiguillage (quel traitement prend la phrase), pas la
// réponse du modèle. Quelques exécutions clés sont vérifiées à part :
// le golf est bien supprimé, le retard bien préparé, la contrainte
// limitée à la partie du jour.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ') : ''));
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

/* Horloge fixée : lundi 5 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 5, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}
const iso = (n) => { const d = new Date(2026, 9, 5 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
const agenda = () => [
  ev('tennis', 'Cours de tennis', 0, 9, 0, 10, 30),
  ev('reunion', 'Réunion équipe', 0, 14, 0, 15, 0),
  ev('dentiste', 'Dentiste', 1, 15, 0, 16, 0, { contact: 'c1' }),
  ev('travail', 'Travail', 2, 11, 0, 13, 0),
  ev('coiffeur', 'Coiffeur', 2, 17, 0, 18, 0),
  ev('dejeuner', 'Déjeuner avec Sophie', 3, 12, 30, 14, 0, { contact: 'c2' }),
  ev('libre', 'Mon temps libre', 4, 9, 0, 13, 0),
  ev('golf', 'Partie de golf', 4, 14, 0, 16, 0),
  ev('enfants', 'Chercher les enfants', 5, 16, 0, 17, 0),
  ev('kine', 'Kiné', 7, 10, 0, 11, 0, { contact: 'c3' })
];

const trace = { confirms: [], envois: [], feuilles: [], supprimes: [], contraintes: [], toasts: [] };
let reponses = [];
const ctx = {
  console, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: agenda(), charlyIA: { history: [] },
  contactsList: [{ id: 'c1', name: 'Marc Dupont', phone: '0600000000' }, { id: 'c2', name: 'Sophie Anceau', phone: '0600000001' }, { id: 'c3', name: 'Dr Lefèvre', email: 'l@x.fr' }],
  _prevenirName: '', _prevenirContact: null, _prevenirEventRef: null,
  setTimeout: (f) => { if (f) f(); return 0; },
  document: { getElementById: () => ({ style: {}, value: '' }) },
  localStorage: { getItem: () => null },
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() {}, addDemarche() {},
  tcDefinirStatutCharly() {}, tcDernierMessageCharly: () => null,
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcFormaterDateHumaine: (d) => d,
  escapeHTMLSafe: (t) => String(t),
  tcVouvoiement: () => false,
  tcConfirm: async (t) => { trace.confirms.push(t); return reponses.length ? reponses.shift() : true; },
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'sms'; },
  tcDirePrevenance() {},
  prevenirRetard() { trace.feuilles.push({ nom: ctx._prevenirName, titre: ctx._prevenirEventRef && ctx._prevenirEventRef.title }); },
  showContrainte: (touches, label) => { trace.contraintes.push({ titres: touches.map((e) => e.title), label: label }); },
  tcDemarrerImprevu() {}
};
vm.createContext(ctx);
['TC_JOURS_SEMAINE', 'TC_MOIS', 'TC_PROFESSIONS', 'TC_TRAJET_DECLENCHEURS', 'TC_WEB_DECLENCHEURS', 'TC_MOTS_CREUX'].forEach((c) => {
  const src = extraireConst(c, c === 'TC_MOTS_CREUX' ? "\\.split\\(' '\\)\\);\\n" : (c.indexOf('DECLENCHEURS') > -1 || c === 'TC_PROFESSIONS' ? '\\];\\n' : ';\\n'));
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  constante introuvable : ' + c); }
});
const modeles = extraireConst('TC_MSG_MODELES', '\\n\\};\\n');
if (modeles) vm.runInContext(modeles, ctx); else { ko++; console.log('  KO  TC_MSG_MODELES introuvable'); }
['_unavailable', '_faq'].forEach((nom) => {
  const m = page.match(new RegExp('const ' + nom + ' = \\[[\\s\\S]*?\\n  \\];'));
  if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  liste introuvable : ' + nom); }
});
['tcSansAccents', 'tcISO', 'tcContientMot', 'tcHeureDansTexte', 'tcHorairePlage', 'tcFormaterHeure', 'tcComparerEvenements',
 'tcPeriodeAgenda', 'tcJoursNommes', 'tcPeriodeContrainte', 'tcPeriodeJourNomme', 'tcPeriodeCoherente', 'tcBorneDeFin', 'tcJoursDansTexte',
 'tcPhraseNonCompris', 'parseFrenchDateFromText', 'tcContactDuRdv', 'tcRemplirModele', 'tcValeursDuRdv', 'tcModeleMessage',
 'tcMotsDeRdv', 'tcTitreContient', 'tcMotDeLAgenda', 'tcPlageImprevu',
 'tcDetecterContrainte', 'tcRdvDeLaPeriode', 'tcGererContrainte',
 'detecterSuppressionRdv', 'tcGererSuppressionRdv', 'tcSupprimerRdvs', 'tcRdvDesigne',
 'tcProchainRdv', 'tcRdvVise', 'tcDetecterPrevenance', 'tcGererPrevenance', 'tcPrevenirDepuisChat', 'tcPrevenirRetard',
 'detecterConsultationAgenda', 'detecterDemandeCreneau',
 'extraireLieuDuTexte', 'detecterRechercheProfessionnel', 'extraireAdresseDuTexte', 'detecterDemandeTrajet', 'detecterRechercheWeb',
 'tcEstDeplacement'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
vm.runInContext('let _tcSuppressionEnAttente = null; let _tcSuppressionChoix = null;', ctx);

/* L'aiguillage, dans l'ordre de charlySendMessage. */
const greetings = ['bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'hi', 'hey', 'yo', 'bjr', 'bsr'];
function route(text) {
  const t = text.toLowerCase();
  if (greetings.includes(t.replace(/[!?.\s]/g, '').trim())) return 'salutation';
  const r = vm.runInContext('(function (text) {' +
    "  if (tcDetecterPrevenance(text)) return 'prevenance';" +
    "  if (/\\b(imprevu|reorganis)/.test(tcSansAccents(text)) && !tcPeriodeContrainte(text)) return 'imprevu';" +
    "  if (tcDetecterContrainte(text)) return 'contrainte';" +
    "  if (detecterSuppressionRdv(text)) return 'suppression';" +
    "  if (detecterConsultationAgenda(text)) return 'consultation';" +
    "  if (detecterDemandeCreneau(text)) return 'creneau';" +
    "  if (detecterRechercheProfessionnel(text)) return 'pro';" +
    "  if (detecterDemandeTrajet(text) !== null) return 'trajet';" +
    "  if (detecterRechercheWeb(text) !== null) return 'web';" +
    "  const ressembleRdv = !!tcHeureDansTexte(text.toLowerCase()) || !!tcPeriodeAgenda(text);" +
    "  if (!ressembleRdv && _faq.find(f => f.keys.some(k => tcContientMot(text.toLowerCase(), k)))) return 'faq';" +
    "  if (_unavailable.find(u => u.keys.some(k => tcContientMot(text.toLowerCase(), k)))) return 'indispo';" +
    "  return tcEstDeplacement(text) ? 'ia+deplacement' : 'ia';" +
    '})(' + JSON.stringify(text) + ')', ctx);
  return r;
}

titre('L ordre des traitements dans l application est celui du banc');
{
  const src = extraire('charlySendMessage') || '';
  const ordre = ['tcDetecterPrevenance(text)', 'tcDemarrerImprevu()', 'tcDetecterContrainte(text)', 'detecterSuppressionRdv(text)',
    'detecterConsultationAgenda(text)', 'detecterDemandeCreneau(text)', 'detecterRechercheProfessionnel(text)',
    'detecterDemandeTrajet(text)', 'detecterRechercheWeb(text)', 'const _faqMatch', 'const _unavailMatch'];
  const pos = ordre.map((o) => src.indexOf(o));
  verifie('chaque traitement est present', pos.every((p) => p > -1), ordre.filter((o, i) => pos[i] < 0).join(', '));
  verifie('dans cet ordre', pos.every((p, i) => i === 0 || p > pos[i - 1]));
  verifie('la FAQ ne prend pas une phrase qui ressemble a un rendez-vous', /_ressembleRdv && _faq\.find/.test(src));
}

/* ── Le corpus ───────────────────────────────────────────────────── */
const corpus = [
  /* Suppression */
  ['Tu peux supprimer ma partie de golf ?', 'suppression'],
  ['annule le golf', 'suppression'],
  ['supprime mon rdv de demain', 'suppression'],
  ['annule mon rendez-vous chez le dentiste', 'suppression'],
  ['efface le coiffeur', 'suppression'],
  ['enlève le déjeuner avec Sophie', 'suppression'],
  ['retire le rdv de mardi 15h', 'suppression'],
  ['annule tout demain', 'suppression'],
  ['supprime tous mes rendez-vous de la semaine', 'suppression'],
  ['je veux annuler ma séance de kiné', 'suppression'],
  ['annule Marc Dupont', 'suppression'],
  ['peux-tu annuler le rendez-vous de jeudi ?', 'suppression'],
  ['annule mon rdv de 15h', 'suppression'],
  ["j'annule la réunion", 'suppression'],
  ['finalement supprime la partie de golf de vendredi', 'suppression'],
  ['ANNULE LE DENTISTE', 'suppression'],
  ['annule le rdv avec Sophie', 'suppression'],
  ['supprime le kiné du 12 octobre', 'suppression'],
  ['annule les enfants samedi', 'suppression'],
  ['je suis malade, annule tout demain', 'suppression'],
  ['supprime le tennis de lundi stp', 'suppression'],
  ['annule mes rendez-vous de demain après-midi', 'suppression'],
  ['tu peux enlever le rdv dentiste', 'suppression'],
  ['annule mon rdv', 'suppression'],
  ['comment annuler un rdv ?', 'faq'],
  ['annule', 'ia'],

  /* Prévenir */
  ["préviens Marc que j'aurai 10 min de retard", 'prevenance'],
  ['je vais être en retard chez le dentiste', 'prevenance'],
  ['je serai en retard', 'prevenance'],
  ["j'aurai un quart d'heure de retard", 'prevenance'],
  ['préviens Sophie que je serai en retard de 20 minutes', 'prevenance'],
  ["envoie un message à Marc pour dire que j'annule", 'prevenance'],
  ['préviens le kiné que je ne pourrai pas venir', 'prevenance'],
  ["dis à Sophie que j'annule le déjeuner", 'prevenance'],
  ['avertis Marc de mon retard', 'prevenance'],
  ['je suis en retard pour le golf', 'prevenance'],
  ["Préviens Marc que j’aurai 5 minutes de retard", 'prevenance'],
  ['envoie un sms au dentiste : 10 minutes de retard', 'prevenance'],
  ["informe Sophie que j'annule", 'prevenance'],
  ['comment prévenir un contact ?', 'ia'],
  ['préviens Marc', 'ia'],

  /* Contrainte */
  ['je ne pourrai pas honorer mes rdv demain', 'contrainte'],
  ['je ne pourrai pas honorer mes rendez-vous de la semaine', 'contrainte'],
  ["j'ai un empêchement demain", 'contrainte'],
  ['je suis malade demain', 'contrainte'],
  ['je suis indisponible mercredi', 'contrainte'],
  ['je ne peux pas aller à mes rendez-vous demain après-midi', 'contrainte'],
  ["impossible d'honorer mes engagements cette semaine", 'contrainte'],
  ['je ne pourrai pas honorer mes rdv demain à partir de 15h', 'contrainte'],
  ['je ne serai pas disponible la semaine prochaine', 'contrainte'],
  ["j'ai un imprévu demain après-midi", 'contrainte'],
  ['réorganise ma journée de demain', 'contrainte'],
  ['je ne pourrai pas être au rdv de demain 10h', 'ia'],

  /* Imprévu sans jour */
  ["j'ai un imprévu", 'imprevu'],
  ['je dois réorganiser ma journée', 'imprevu'],

  /* Consultation */
  ["qu'est-ce que j'ai demain ?", 'consultation'],
  ["j'ai quoi demain ?", 'consultation'],
  ["j'ai quoi demain", 'consultation'],
  ['je fais quoi mercredi ?', 'consultation'],
  ["c'est quoi mon programme de la semaine ?", 'consultation'],
  ['mon planning de demain', 'consultation'],
  ['montre-moi mon agenda', 'consultation'],
  ['mes rdv de la semaine prochaine', 'consultation'],
  ['je suis libre demain ?', 'consultation'],
  ['suis-je libre vendredi après-midi ?', 'consultation'],
  ['quel est mon prochain rdv ?', 'consultation'],
  ['mon prochain rendez-vous', 'consultation'],
  ['rdv avec Marc', 'consultation'],
  ["qu'est-ce qu'il y a jeudi ?", 'consultation'],
  ['cette semaine ?', 'consultation'],
  ['et demain ?', 'consultation'],
  ['affiche mon agenda de demain', 'consultation'],
  ['liste-moi mes rendez-vous', 'consultation'],
  ['mon emploi du temps de demain', 'consultation'],
  ["Qu’est-ce que j’ai demain ?", 'consultation'],
  ['je suis dispo jeudi ?', 'consultation'],
  ['mes rendez-vous de mardi', 'consultation'],
  ["dis-moi ce que j'ai cette semaine", 'consultation'],

  /* Création : au modèle, et jamais prise pour autre chose */
  ['demain 15h dentiste', 'ia'],
  ['demain à 15h, dentiste', 'ia'],
  ['rdv demain 10h avec Marc', 'ia'],
  ['mets un rdv demain 10h dans mon agenda', 'ia'],
  ['note dans mon agenda : dentiste demain 10h', 'ia'],
  ['ajoute un déjeuner avec ma mère samedi midi', 'ia'],
  ['rdv coiffeur jeudi 18h', 'ia'],
  ['mets-moi un rendez-vous cet après-midi à 15h chez mon avocat', 'ia'],
  ['crée un rdv avec Marc vendredi 9h', 'ia'],
  ['planifie une réunion lundi prochain 14h', 'ia'],
  ['bloque-moi mardi matin pour du travail', 'ia'],
  ['je vais chez le dentiste mardi à 15h', 'ia'],
  ['tous les lundis tennis 9h', 'ia'],
  ['réserve une table vendredi soir 20h', 'ia'],
  ['rdv privé demain 10h', 'ia'],
  ['le prix est de 30 euros, note-le demain 10h', 'ia'],
  ['je voudrais un rdv chez mon dentiste demain', 'ia'],
  ['mets-moi un rdv chez mon avocat demain 10h', 'ia'],
  ['Mardi 15h dr Martin', 'ia'],
  ['demain 14h30 avec William Ayache', 'ia'],
  ['Dermatologue', 'ia'],
  ['Mercredi 15h', 'ia'],
  ['rdv chez mon kiné lundi 10h', 'ia'],
  ['bonjour Charly', 'ia'],
  ['merci', 'ia'],
  ['oui', 'ia'],
  ['non', 'ia'],
  ['Demain', 'ia'],
  ['Demain après-midi', 'ia'],

  /* Déplacement : au modèle, reconnu comme tel */
  ['déplace mon rdv dentiste à 16h', 'ia+deplacement'],
  ['décale le golf à 15h', 'ia+deplacement'],
  ["change l'heure de mon rdv dentiste : 16h", 'ia+deplacement'],
  ['modifie mon rendez-vous de mardi, mets-le à 17h', 'ia+deplacement'],
  ['repousse le déjeuner avec Sophie à 13h', 'ia+deplacement'],
  ['avance le coiffeur à 16h', 'ia+deplacement'],
  ['reporte ma séance de kiné à mercredi 10h', 'ia+deplacement'],
  ['décale mon rendez-vous de jeudi à 16h', 'ia+deplacement'],
  ['bouge le tennis à 11h', 'ia+deplacement'],

  /* Créneau */
  ['propose-moi un créneau demain', 'creneau'],
  ['trouve-moi un moment cette semaine', 'creneau'],
  ['quand est-ce que je suis libre cette semaine ?', 'creneau'],
  ['donne-moi un créneau libre la semaine prochaine', 'creneau'],
  ['quand puis-je caser un rdv ?', 'creneau'],
  ['cherche-moi un horaire mardi', 'creneau'],
  ['propose-moi un créneau demain à 15h', 'ia'],

  /* Google : professionnel, trajet, web */
  ['je cherche un dentiste à Paris', 'pro'],
  ['trouve-moi un bon kiné', 'pro'],
  ['tu connais un médecin à Lyon ?', 'pro'],
  ['je voudrais prendre rdv chez un dentiste à Lyon', 'pro'],
  ['combien de temps pour aller à la gare ?', 'trajet'],
  ["temps de trajet jusqu'à la tour eiffel", 'trajet'],
  ['à quelle heure partir pour mon rdv ?', 'trajet'],
  ['calcule un trajet', 'trajet'],
  ['itinéraire pour 12 rue de la paix 75002 paris', 'trajet'],
  ['cherche sur internet les horaires de la poste', 'web'],
  ['recherche sur google la météo de demain', 'web'],

  /* FAQ */
  ["c'est gratuit ?", 'faq'],
  ['qui es-tu ?', 'faq'],
  ['comment ça marche ?', 'faq'],
  ['mes données sont sécurisées ?', 'faq'],
  ['quelle différence avec google agenda ?', 'faq'],
  ['tu sais faire quoi ?', 'faq'],
  ['comment fonctionne charly ?', 'faq'],
  ['aide moi à organiser mon agenda', 'faq'],

  /* Pas encore disponible */
  ['téléphone pour moi au dentiste', 'indispo'],
  ['envoie un email à Marc', 'indispo'],
  ['réveille-moi à 7h', 'indispo'],
  ['commande un taxi', 'indispo'],
  ['fais ma liste de courses', 'indispo'],
  ['traduis ça en anglais', 'indispo'],
  ['synchronise avec google agenda', 'indispo'],
  ['paye mon abonnement', 'faq'],

  /* Salutations */
  ['bonjour', 'salutation'],
  ['Salut !', 'salutation'],
  ['Coucou', 'salutation']
];

titre('L aiguillage : ' + corpus.length + ' phrases');
const parRoute = {};
corpus.forEach(([phrase, attendu]) => {
  ctx.events = agenda();
  let obtenu;
  try { obtenu = route(phrase); } catch (e) { obtenu = 'ERREUR ' + e.message; }
  parRoute[attendu] = (parRoute[attendu] || 0) + 1;
  if (obtenu !== attendu) { ko++; console.log('  KO  « ' + phrase + ' » → ' + obtenu + ' (attendu : ' + attendu + ')'); }
});
console.log('  ' + Object.keys(parRoute).map((k) => k + ' ' + parRoute[k]).join(' · '));
verifie('toutes les phrases vont au bon endroit', corpus.every(([p, a]) => { ctx.events = agenda(); try { return route(p) === a; } catch (e) { return false; } }));

/* ── Quelques exécutions, pas seulement l'aiguillage ─────────────── */
const reinit = () => { ctx.events = agenda(); ctx.charlyIA.history = []; Object.assign(trace, { confirms: [], envois: [], feuilles: [], supprimes: [], contraintes: [], toasts: [] }); reponses = []; vm.runInContext('_tcSuppressionEnAttente = null; _tcSuppressionChoix = null;', ctx); };
const titres = () => ctx.events.map((e) => e.title);
const dernier = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1] || { content: '' };

(async () => {
  titre('Suppression par un mot du titre');
  reinit();
  await ctx.tcGererSuppressionRdv('Tu peux supprimer ma partie de golf ?');
  verifie('le golf est supprimé, lui seul', titres().indexOf('Partie de golf') === -1 && ctx.events.length === 9, titres().join(','));
  verifie('Charly le dit', /C'est fait : « Partie de golf »/.test(dernier().content), dernier().content);
  reinit();
  await ctx.tcGererSuppressionRdv('annule le dentiste');
  verifie('« annule le dentiste » supprime le dentiste', titres().indexOf('Dentiste') === -1 && ctx.events.length === 9);
  reinit();
  await ctx.tcGererSuppressionRdv('annule le golf de jeudi');
  verifie('le golf n est pas jeudi : rien n est supprimé, Charly demande', ctx.events.length === 10 && /aucun rendez-vous correspondant/.test(dernier().content));
  reinit();
  await ctx.tcGererSuppressionRdv('annule Marc Dupont');
  verifie('« annule Marc Dupont » supprime le rendez-vous avec Marc', titres().indexOf('Dentiste') === -1 && ctx.events.length === 9);

  titre('Prévenir par écrit');
  reinit();
  await ctx.tcGererPrevenance("préviens Marc que j'aurai 10 min de retard", ctx.tcDetecterPrevenance("préviens Marc que j'aurai 10 min de retard"));
  verifie('le message dit 10 minutes de retard, et Charles valide', trace.confirms.length === 1 && /10 minutes de retard/.test(trace.confirms[0]) && /Dentiste/.test(trace.confirms[0]), trace.confirms[0]);
  verifie('il part à Marc', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont');
  reinit();
  await ctx.tcGererPrevenance('je vais être en retard chez le dentiste', ctx.tcDetecterPrevenance('je vais être en retard chez le dentiste'));
  verifie('sans le nombre de minutes : la feuille habituelle s ouvre, sur le bon rendez-vous', trace.feuilles.length === 1 && trace.feuilles[0].titre === 'Dentiste' && trace.feuilles[0].nom === 'Marc Dupont', JSON.stringify(trace.feuilles));
  verifie('et rien ne part sans elle', trace.envois.length === 0);
  reinit();
  await ctx.tcGererPrevenance('je serai en retard', ctx.tcDetecterPrevenance('je serai en retard'));
  verifie('« je serai en retard » : le prochain rendez-vous (la réunion de 14h ; le tennis de 9h a commencé depuis une heure), sans contact', /Réunion équipe/.test(dernier().content) && /pas de contact/.test(dernier().content), dernier().content);
  reinit();
  await ctx.tcGererPrevenance("dis à Sophie que j'annule le déjeuner", ctx.tcDetecterPrevenance("dis à Sophie que j'annule le déjeuner"));
  verifie('annulation : le message d annulation, et Charles valide', trace.confirms.length === 1 && /annuler « Déjeuner avec Sophie »/.test(trace.confirms[0]) && /annuler notre rendez-vous/.test(trace.confirms[0]), trace.confirms[0]);
  verifie('il part à Sophie, et le rendez-vous est retiré', trace.envois.length === 1 && trace.envois[0][0] === 'Sophie Anceau' && titres().indexOf('Déjeuner avec Sophie') === -1);
  reinit(); reponses = [false];
  await ctx.tcGererPrevenance("dis à Sophie que j'annule le déjeuner", ctx.tcDetecterPrevenance("dis à Sophie que j'annule le déjeuner"));
  verifie('s il refuse : rien ne part, rien n est retiré', trace.envois.length === 0 && ctx.events.length === 10);
  reinit();
  await ctx.tcGererPrevenance('je suis en retard pour le golf', ctx.tcDetecterPrevenance('je suis en retard pour le golf'));
  verifie('le golf n a pas de contact : Charly le dit', /Partie de golf/.test(dernier().content) && /pas de contact/.test(dernier().content));
  reinit();
  await ctx.tcGererPrevenance("informe Sophie que j'annule", ctx.tcDetecterPrevenance("informe Sophie que j'annule"));
  verifie('« informe Sophie que j annule » trouve son rendez-vous', trace.confirms.length === 1 && /Déjeuner avec Sophie/.test(trace.confirms[0]));

  titre('L onglet « Prévenir d un retard »');
  reinit();
  await ctx.tcPrevenirRetard();
  verifie('le prochain rendez-vous (la réunion de 14h), sans contact : Charly le dit', /Réunion équipe/.test(dernier().content) && /pas de contact/.test(dernier().content), dernier().content);
  reinit(); ctx.events = agenda().filter((e) => e.id !== 'tennis' && e.id !== 'reunion');
  await ctx.tcPrevenirRetard();
  verifie('avec un contact : la feuille des minutes s ouvre, rien ne part seul', trace.feuilles.length === 1 && trace.feuilles[0].titre === 'Dentiste' && trace.envois.length === 0);

  titre('Contrainte limitée à la partie du jour');
  reinit();
  await ctx.tcGererContrainte('je ne pourrai pas honorer mes rdv mercredi matin');
  verifie('mercredi matin : le travail (11h-13h), pas le coiffeur (17h)', trace.contraintes.length === 1 && trace.contraintes[0].titres.join(',') === 'Travail', JSON.stringify(trace.contraintes));
  verifie('le libellé le dit', trace.contraintes[0] && /mercredi le matin/.test(trace.contraintes[0].label), trace.contraintes[0] && trace.contraintes[0].label);
  reinit();
  await ctx.tcGererContrainte("j'ai un empêchement demain");
  verifie('« j ai un empêchement demain » : le dentiste', trace.contraintes.length === 1 && trace.contraintes[0].titres.join(',') === 'Dentiste');
  reinit();
  await ctx.tcGererContrainte('je ne pourrai pas honorer mes rdv demain à partir de 15h');
  verifie('« à partir de 15h » : le dentiste de 15h est touché', trace.contraintes.length === 1 && trace.contraintes[0].titres.join(',') === 'Dentiste');
  reinit();
  await ctx.tcGererContrainte("j'ai un empêchement samedi matin");
  verifie('rien le samedi matin : Charly le dit, sans questionnaire', trace.contraintes.length === 0 && /aucun rendez-vous .*samedi le matin/.test(dernier().content), dernier().content);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
