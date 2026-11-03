// « Je les déplace » fait le travail : Charly demande « Vers quand ? »,
// déplace lui-même les rendez-vous de la liste, et propose le message au
// contact que Charles valide. Taper « 1 », « 2 », « 3 » vaut les boutons.
//
// Charles, 05/10 : « il te fait le travail à l'envers » → « Oui je valide ».
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

/* Horloge fixée : lundi 5 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 5, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}
const iso = (n) => { const d = new Date(2026, 9, 5 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id: id, title: title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});

const trace = { confirms: [], envois: [], orig: 0, saves: 0, propositions: [] };
let reponses = [];
const ctx = {
  console, Date: DateFixe,
  mode: 'user', currentPage: 'chat', events: [], charlyIA: { history: [] },
  contactsList: [{ id: 'c1', name: 'Marc Dupont', phone: '06' }],
  renderCharlyChat() {}, render() {}, showToast() {}, saveEventsToStorage() { trace.saves++; }, addDemarche() {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcFormaterDateHumaine: (d) => d,
  escapeHTMLSafe: (t) => String(t),
  tcVouvoiement: () => false,
  tcModeleMessage: () => 'Bonjour [Prénom], désolé(e), je dois décaler notre rendez-vous du [date] à [heure]. Voici ce que je peux te proposer :',
  tcConfirm: async (t) => { trace.confirms.push(t); return reponses.length ? reponses.shift() : true; },
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'sms'; },
  tcDirePrevenance() {},
  _origValidateAgendaProposalFromMsg() { trace.orig++; },
  // Mission 73 : la proposition de créneaux part au serveur ; Marc n'a pas TimeCool, il reçoit un lien.
  TC_BACKEND: { propositionCreer: async (corps) => { trace.propositions.push(corps); return { rdv_id: trace.propositions.length, url: 'https://timecool.fr/rdv/ABCD2345' }; } }
};
vm.createContext(ctx);
vm.runInContext('let _tcDeplacementPeriode = null; let _tcDeplacementEnAttente = null; let _tcQuestionnaireNumero = 0; let _tcMarcheArriere = null;\n'
  + (page.match(/^const TC_PROPOSITION_[A-Z_]+ = [^;]+;$/gm) || []).join('\n'), ctx);
['tcSansAccents', 'tcISO', 'tcHeureDansTexte', 'tcHorairePlage', 'tcFormaterHeure', 'tcComparerEvenements',
 'tcPeriodeAgenda', 'tcJoursNommes', 'tcPeriodeContrainte', 'tcPeriodeJourNomme', 'parseFrenchDateFromText', 'tcPhraseNonCompris',
 'tcContactDuRdv', 'tcRemplirModele', 'tcValeursDuRdv', '_tcLigneRdv', 'tcAppliquerDeplacement',
 'tcPeriodeContexte', 'tcPeriodeDeplacer', 'tcRepondreDeplacementPeriode', 'tcChoixPeriode',
 // Mission 73 : un accord pour le lot, puis des créneaux proposés.
 'tcExecuterDeplacement', 'tcConfianceCharly', 'tcRepondreDeplacement', 'tcReponseDecalage', 'tcNomsLisibles', 'tcPropositionTexte', 'tcProposerLesCreneaux',
 'tcEnvoyerPropositions', 'tcLignesPropositions', 'tcDireBilanPropositions', 'tcCreneauxPourDecalage', 'tcPropositionLibelle',
 'tcMinutesLisibles', 'tcHeureSql', 'tcClasseNormaliser', 'tcReponseOuiNon', 'tcEstBandeau', 'tcEvenementSurPlusieursJours', 'tcEvenementFin', 'tcEvenementCouvre'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

const attente = () => vm.runInContext('_tcDeplacementPeriode', ctx);
const dernier = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1] || { content: '' };
const horaire = (e) => e.date + ' ' + e.startH + ':' + String(e.startM).padStart(2, '0') + '-' + e.endH + ':' + String(e.endM).padStart(2, '0');
function scene(contrainte) {
  const travail = ev('travail', 'Travail', 2, 11, 0, 13, 0);
  const coiffeur = ev('coiffeur', 'Coiffeur', 2, 17, 0, 18, 0, { contact: 'c1' });
  const dentiste = ev('dentiste', 'Dentiste', 3, 15, 0, 16, 0);
  ctx.events = [travail, coiffeur, dentiste];
  ctx.charlyIA.history = [Object.assign({ role: 'system_info', content: '', periode: true, touches: [coiffeur, travail] },
    contrainte ? { contrainte: true } : { conflictData: { msg: { content: 'x' } } })];
  Object.assign(trace, { confirms: [], envois: [], orig: 0, saves: 0, propositions: [] });
  vm.runInContext('_tcDeplacementEnAttente = null', ctx);
  reponses = [];
  vm.runInContext('_tcDeplacementPeriode = null', ctx);
  return { travail, coiffeur, dentiste };
}

(async () => {
  titre('« Je les déplace » demande vers quand');
  let sc = scene(true);
  ctx.tcPeriodeDeplacer();
  verifie('Charly demande « Vers quand ? », avec un exemple', /^Vers quand \? .*jeudi 15h/.test(dernier().content), dernier().content);
  verifie('rien n est deplace, rien ne part', horaire(sc.travail) === iso(2) + ' 11:00-13:00' && trace.envois.length === 0);
  verifie('la liste attend la reponse (2 essais)', attente() && attente().touches.length === 2 && attente().essais === 2);

  titre('« jeudi 15h » : dans l ordre, en gardant les durées ; un accord pour le lot, le message montré (mission 73)');
  let pris = await ctx.tcRepondreDeplacementPeriode('jeudi 15h');
  verifie('reponse prise', pris === true && attente() === null);
  verifie('et signale le chevauchement avec le dentiste', ctx.charlyIA.history.some((m) => /chevauche.*Dentiste/.test(m.content)), ctx.charlyIA.history.map((m) => m.content).join(' | '));
  verifie('plus de fenêtre de confirmation par contact', trace.confirms.length === 0);
  verifie('Charly montre le plan (le travail jeudi 15h-17h) et le message à Marc (désolé(e), l ancienne date), un seul accord',
    /^Je déplace :\n• « Travail »/.test(dernier().content) && /Pour Marc Dupont, je ne déplace rien tout de suite : je lui propose le nouveau créneau \(jeudi 8 octobre à 17h\) et deux autres/.test(dernier().content)
    && /« Bonjour Marc, désolé\(e\), je dois décaler notre rendez-vous du mercredi 7 octobre à 17h00\. Voici ce que je peux te proposer : » suivi des créneaux à choisir/.test(dernier().content)
    && /Je l’envoie \?/.test(dernier().content), dernier().content);
  verifie('rien n a bougé avant la réponse', horaire(sc.travail) === iso(2) + ' 11:00-13:00' && horaire(sc.coiffeur) === iso(2) + ' 17:00-18:00');
  await ctx.tcRepondreDeplacement('oui');
  verifie('« oui » : le travail (2 h) passe jeudi 15h-17h', horaire(sc.travail) === iso(3) + ' 15:00-17:00', horaire(sc.travail));
  verifie('le coiffeur reste à sa place, marqué, en attendant le choix de Marc', horaire(sc.coiffeur) === iso(2) + ' 17:00-18:00' && sc.coiffeur.decalage && sc.coiffeur.decalage.rdv === 1, horaire(sc.coiffeur));
  verifie('le dentiste de jeudi n a pas bouge', horaire(sc.dentiste) === iso(3) + ' 15:00-16:00');
  verifie('Charly dit que c est fait', ctx.charlyIA.history.some((m) => /rendez-vous déplacé/.test(m.content)));
  const p = trace.propositions[0] || {};
  verifie('Marc reçoit des créneaux : d abord jeudi 17h-18h (à la suite du travail), puis d autres libres', trace.propositions.length === 1 && p.canal === 'sms'
    && p.creneaux.length === 3 && p.creneaux[0].debut === iso(3) + ' 17:00:00' && p.creneaux[0].fin === iso(3) + ' 18:00:00' && p.remplace === 'coiffeur', JSON.stringify(p));
  verifie('rien n est parti par l ancien chemin ; le message avec le lien attend son bouton', trace.envois.length === 0 && dernier()._envois && dernier()._envois.length === 1
    && / https:\/\/timecool\.fr\/rdv\/ABCD2345$/.test(dernier()._envois[0].texte), dernier().content);
  verifie('enregistre', trace.saves >= 1);

  titre('« demain même heure » : le jour change, les horaires restent ; « déjà vu » : tout se déplace sans prévenir');
  sc = scene(true); ctx.tcPeriodeDeplacer();
  await ctx.tcRepondreDeplacementPeriode('demain même heure');
  await ctx.tcRepondreDeplacement('c’est déjà vu avec lui');
  verifie('travail mardi 11h-13h', horaire(sc.travail) === iso(1) + ' 11:00-13:00', horaire(sc.travail));
  verifie('coiffeur mardi 17h-18h', horaire(sc.coiffeur) === iso(1) + ' 17:00-18:00', horaire(sc.coiffeur));
  verifie('rien ne part', trace.propositions.length === 0 && trace.envois.length === 0);
  verifie('pas de chevauchement signale', !ctx.charlyIA.history.some((m) => /chevauche/.test(m.content)));

  titre('« à 16h » : le jour reste, les horaires s enchaînent');
  sc = scene(true); ctx.tcPeriodeDeplacer();
  await ctx.tcRepondreDeplacementPeriode('à 16h');
  await ctx.tcRepondreDeplacement('déjà vu');
  verifie('travail mercredi 16h-18h', horaire(sc.travail) === iso(2) + ' 16:00-18:00', horaire(sc.travail));
  verifie('coiffeur mercredi 18h-19h', horaire(sc.coiffeur) === iso(2) + ' 18:00-19:00', horaire(sc.coiffeur));

  titre('« 12 octobre 9h30 » : une date');
  sc = scene(true); ctx.tcPeriodeDeplacer();
  await ctx.tcRepondreDeplacementPeriode('le 12 octobre à 9h30');
  await ctx.tcRepondreDeplacement('oui');
  verifie('travail le 12 a 9h30-11h30', horaire(sc.travail) === '2026-10-12 9:30-11:30', horaire(sc.travail));

  titre('S il refuse le message au contact');
  sc = scene(true); ctx.tcPeriodeDeplacer();
  await ctx.tcRepondreDeplacementPeriode('jeudi 9h');
  await ctx.tcRepondreDeplacement('non');
  verifie('« non » : le travail se déplace, le coiffeur reste à sa place, rien ne part', horaire(sc.travail) === iso(3) + ' 09:00-11:00'.replace(' 09', ' 9')
    && horaire(sc.coiffeur) === iso(2) + ' 17:00-18:00' && trace.envois.length === 0 && trace.propositions.length === 0
    && /« Coiffeur » reste à sa place\.$/.test(dernier().content), horaire(sc.travail) + ' ' + horaire(sc.coiffeur) + ' ' + dernier().content);

  titre('Reponse incomprise');
  sc = scene(true); ctx.tcPeriodeDeplacer();
  pris = await ctx.tcRepondreDeplacementPeriode('euh je sais pas');
  verifie('premiere fois : « Sauf erreur de ma part… Vers quand ? »', pris === true && /^Sauf erreur de ma part, je n'ai pas bien compris ta demande\. Vers quand \?/.test(dernier().content), dernier().content);
  verifie('rien n a bouge', horaire(sc.travail) === iso(2) + ' 11:00-13:00' && attente() && attente().essais === 1);
  pris = await ctx.tcRepondreDeplacementPeriode('bof');
  verifie('deuxieme fois : le message suit son chemin, plus d attente', pris === false && attente() === null);

  titre('Le cas voyage : le voyage est noté, puis la meme question');
  sc = scene(false);
  ctx.tcPeriodeDeplacer();
  verifie('le voyage est ajoute', trace.orig === 1);
  verifie('et Charly demande vers quand', /^Vers quand \?/.test(dernier().content));

  titre('« 1 », « 2 », « 3 » tapes valent les boutons');
  scene(true);
  const choix = (t) => ctx.tcChoixPeriode(t);
  verifie('contrainte : 1 annule, 2 deplace, 3 rien', choix('1') === 'annuler' && choix('2') === 'deplacer' && choix('3') === 'rien');
  verifie('en toutes lettres', choix('je les déplace') === 'deplacer' && choix('Je les annule') === 'annuler' && choix('rien') === 'rien' && choix('je ne touche à rien') === null || choix('je ne touche à rien') === 'rien');
  verifie('une vraie demande n est pas un choix', choix('annule mon rdv dentiste de demain') === null);
  verifie('n importe quoi non plus', choix('bonjour') === null);
  scene(false);
  verifie('voyage : 1 rien, 2 annule, 3 deplace', choix('1') === 'rien' && choix('2') === 'annuler' && choix('3') === 'deplacer');
  ctx.charlyIA.history[0]._resolu = true;
  verifie('question deja reglee : plus de choix', choix('1') === null);

  titre('Branché dans le chat');
  const envoi = extraire('charlySendMessage') || '';
  const iV = envoi.indexOf('tcRepondreDeplacementPeriode(text)'), iC = envoi.indexOf('tcChoixPeriode(text)'), iP = envoi.indexOf('tcDetecterPrevenance(text)'), iS = envoi.indexOf('detecterSuppressionRdv(text)');
  verifie('la reponse « vers quand » est lue avant tout le reste', iV > -1 && iV < iP && iV < iS);
  verifie('le choix tape aussi, avant la suppression (« annule » seul)', iC > -1 && iC < iS);
  verifie('les trois choix sont executes', /choix === 'annuler'\) await tcPeriodeAnnuler\(\);/.test(envoi) && /tcPeriodeDeplacer\(\);/.test(envoi) && /else tcPeriodeRien\(\);/.test(envoi));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
