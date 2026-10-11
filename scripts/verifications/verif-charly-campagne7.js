// Mission 8 (campagne 7, 11/10) : date fixee dimanche 11/10/2026 14h20, agenda de la campagne 7.
//  1. Conflit : « rdv dentiste mardi 15h » apres « change mon mot de passe » ne saute plus la detection (Formation 15h-17h).
//  2. Consultation : « est-ce que j ai quelque chose vendredi ? » (sans apostrophe) repond depuis l agenda local.
//  3. « ajoute un déplacement à Lyon jeudi 9h » : l objet est donne, la page propose « Déplacement à Lyon ».
//  4. « remets-les » : les rendez-vous remis portent un identifiant neuf (la synchro ne les re-supprime pas).
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
const NOW = new Date(2026, 9, 11, 14, 20, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW.getTime()); } static now() { return NOW.getTime(); } }
const ev = (id, date, h1, m1, h2, m2, title) => ({ id, mode: 'user', date, startH: h1, startM: m1, endH: h2, endM: m2, title });
// Campagne 7 : mardi 13 = Dr Martin 9h, Formation 15-17, Rdv banque 16-17, Zorglub 16-17 ; vendredi 16 = Revue budget 14-16, coiffeur 17-18.
const AGENDA = () => [
  ev('b1', '2026-10-13', 9, 0, 10, 0, 'Rendez-vous Dr. Martin'), ev('b2', '2026-10-13', 15, 0, 17, 0, 'Formation'), ev('b3', '2026-10-13', 16, 0, 17, 0, 'Rdv banque'),
  ev('b4', '2026-10-13', 16, 0, 17, 0, 'Rendez-vous avec Zorglub'), ev('c1', '2026-10-16', 14, 0, 16, 0, 'Revue budget'), ev('c2', '2026-10-16', 17, 0, 18, 0, 'Rendez-vous coiffeur'),
];
function contexte() {
  const ctx = {
    console, Date: DateFixe, Math, JSON, Number, String, Set, Array, RegExp, Object, Promise, parseInt,
    setTimeout: (f) => { if (f) f(); return 0; }, mode: 'user', currentPage: 'chat',
    charlyIA: { history: [] }, events: AGENDA(), contactsList: [],
    tcPousserMessageUtilisateur: (t) => ctx.charlyIA.history.push({ role: 'user', content: t }),
    tcDefinirStatutCharly() {}, renderCharlyChat() {}, render() {}, showToast() {}, saveEventsToStorage() {}, addDemarche() {},
    tcContactDuRdv: () => null, escapeHTMLSafe: (x) => String(x),
  };
  vm.createContext(ctx);
  ['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', 'const TC_JOURS_SEMAINE = [\\s\\S]*?;\\n', 'const TC_MOIS = [\\s\\S]*?;\\n']
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  ['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcEvenementFin', 'tcEvenementCouvre', 'tcHeureDansTexte', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande',
    'tcBlocAgendaDepuisAnnonce', 'tcPlusieursDatesOuRelatif', 'tcCorrigerPropositionsCharly', 'tcJoursCites', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcPhraseNonCompris',
    'tcEstUneCorrection', 'detectConflicts', 'tcDoublonExact', 'detecterConsultationAgenda', 'tcGererConsultationAgenda', 'tcPeriodeAgenda', 'tcPeriodeJourNomme',
    'tcPeriodeContrainte', 'tcJoursNommes', 'tcPeriodeCoherente', 'tcRepondreObjetDonne', 'tcMarcheArriere']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('let _tcMarcheArriere = null; globalThis.poserMarcheArriere = (m) => { _tcMarcheArriere = m; };', ctx);
  return ctx;
}
const ctx = contexte();
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Conflit : la detection ne saute plus a cause d un vieux « change »');
const bloc = { role: 'assistant', content: 'C’est noté.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]', tempId: 't1' };
ctx.charlyIA.history = [{ role: 'user', content: 'change mon mot de passe' }, { role: 'assistant', content: 'Ça, c’est hors de mon périmètre !' }, { role: 'user', content: 'rdv dentiste mardi 15h' }, bloc];
verifie('« change mon mot de passe » deux messages plus tot : ce n est PAS une correction', ctx.tcEstUneCorrection(bloc) === false);
ctx.charlyIA.history = [{ role: 'user', content: 'rdv dentiste mardi 15h' }, { role: 'assistant', content: '…', tempId: 't0' }, { role: 'user', content: 'non, pas à 15h, à 16h' }, bloc];
verifie('« non, pas à 15h, à 16h » juste avant : une correction', ctx.tcEstUneCorrection(bloc) === true);
ctx.charlyIA.history = [{ role: 'user', content: 'décale-la à 16h' }, bloc];
verifie('« décale-la à 16h » : une correction ; « change mon mot de passe » lui-meme comme demande : correction aussi (sans proposition, sans effet)', ctx.tcEstUneCorrection(bloc) === true);
ctx.charlyIA.history = [];
verifie('sans message utilisateur : non', ctx.tcEstUneCorrection(bloc) === false);
const conflits = ctx.detectConflicts([{ date: '2026-10-13', startH: 15, startM: 0, endH: 16, endM: 0, title: 'Rendez-vous dentiste' }]);
verifie('mardi 15h-16h contre Formation 15h-17h : un conflit detecte sur l agenda local', conflits.length === 1 && conflits[0].existingEvent.title === 'Formation', conflits.length);
const ovDebut = page.indexOf('validateAgendaProposalFromMsg = function(msg) {');
const ov = page.slice(ovDebut, page.indexOf('\n};', ovDebut) + 3);
verifie('la validation utilise tcEstUneCorrection(msg), plus les trois derniers messages', /const isModif = tcEstUneCorrection\(msg\);/.test(ov) && !/slice\(-3\)/.test(ov) && !/t\.includes\('change'\)/.test(ov));
verifie('et sans correction, detectConflicts est appele avant l ajout', ov.indexOf('const conflicts = detectConflicts(proposals);') > -1 && ov.indexOf('const conflicts = detectConflicts(proposals);') < ov.lastIndexOf('_origValidateAgendaProposalFromMsg(msg);'));

titre('2. Consultation d un jour : la liste exacte, construite par la page');
(async () => {
  for (const phrase of ["est-ce que j ai quelque chose vendredi ?", "est-ce que j'ai quelque chose vendredi ?", 'j ai quoi vendredi ?']) {
    const c = contexte();
    const intent = c.detecterConsultationAgenda(phrase);
    verifie('« ' + phrase + ' » est une consultation de periode (vendredi 16)', !!intent && intent.type === 'periode' && c.tcISO(intent.periode.debut) === '2026-10-16', JSON.stringify(intent && intent.type));
    if (intent) {
      await c.tcGererConsultationAgenda(phrase, intent);
      const rep = c.charlyIA.history[c.charlyIA.history.length - 1].content;
      verifie('la reponse liste Revue budget 14h-16h et Rendez-vous coiffeur 17h-18h, pas « tu es libre »', /\(2\)/.test(rep) && /Revue budget/.test(rep) && /Rendez-vous coiffeur/.test(rep) && !/libre/.test(rep), rep);
    }
  }
  const c2 = contexte();
  const i2 = c2.detecterConsultationAgenda('est-ce que j ai quelque chose jeudi ?');
  if (i2) { await c2.tcGererConsultationAgenda('est-ce que j ai quelque chose jeudi ?', i2); }
  verifie('jeudi (rien) : « Tu es libre ce jeudi ! »', i2 && /Tu es libre/.test(c2.charlyIA.history[c2.charlyIA.history.length - 1].content));
  verifie('« rdv dentiste mardi 15h » n est pas une consultation', ctx.detecterConsultationAgenda('rdv dentiste mardi 15h') === null);
  const formes = ['qu est ce que j ai lundi ?', "qu'est ce que j'ai lundi ?", "qu'est-ce que j'ai lundi ?", "qu'est-ce qu'il y a lundi ?", 'qu est ce qu il y a lundi ?'];
  verifie('« qu est ce que j ai lundi ? » et ses formes (apostrophes, tirets) → consultation de lundi (examinateur)', formes.every((p) => { const i = ctx.detecterConsultationAgenda(p); return i && i.type === 'periode' && ctx.tcISO(i.periode.debut) === '2026-10-12'; }), formes.map((p) => String(ctx.detecterConsultationAgenda(p) && ctx.detecterConsultationAgenda(p).type)).join(','));
  const polies = ['Tu peux ajouter un rdv demain ?', 'Peux-tu me réserver un créneau demain ?', 'Tu peux me mettre un dentiste demain ?', 'Peux-tu me mettre un rdv dentiste demain ?', 'Un dentiste demain à 10h, ça passe ?'];
  verifie('cinq creations polies terminees par « ? » ne sont PAS des consultations (examinateur)', polies.every((p) => ctx.detecterConsultationAgenda(p) === null), polies.map((p) => String(ctx.detecterConsultationAgenda(p) && ctx.detecterConsultationAgenda(p).type)).join(','));

  titre('3. L objet est donne : la page propose elle-meme');
  const R = (r, u) => ctx.tcRepondreObjetDonne(r, u, NOW);
  const r1 = R('C’est pour quoi, à 9h ?', 'ajoute un déplacement à Lyon jeudi 9h');
  verifie('« C est pour quoi, à 9h ? » + « ajoute un déplacement à Lyon jeudi 9h » → « Déplacement à Lyon », jeudi 15 octobre 2026 à 9h + bloc', r1 === 'Déplacement à Lyon, jeudi 15 octobre 2026 à 9h : je te propose ceci.\n[AGENDA]\n2026-10-15 | 09:00-10:00 | Déplacement à Lyon | rdv\n[/AGENDA]', r1);
  verifie('le titre : « Déplacement à Lyon » (le « à » devant un nom propre est garde), « Jean-Pierre » intact', ctx.tcTitreDepuisDemande('ajoute un déplacement à Lyon jeudi 9h') === 'Déplacement à Lyon' && ctx.tcTitreDepuisDemande('rdv avec Jean-Pierre vendredi 11h') === 'Jean-Pierre' && ctx.tcTitreDepuisDemande('rdv dentiste mardi 15h') === 'Dentiste');
  verifie('sans objet (« rdv jeudi 9h ») → null (Charly a raison de demander) ; sans heure → null ; autre question → null ; avec bloc → null', R('C’est pour quoi, à 9h ?', 'rdv jeudi 9h') === null && R('C’est pour quoi ?', 'déplacement à Lyon jeudi') === null && R('À quelle heure ?', 'déplacement à Lyon jeudi 9h') === null && R('C’est pour quoi ?\n[AGENDA]\n2026-10-15 | 09:00-10:00 | X | rdv\n[/AGENDA]', 'déplacement à Lyon jeudi 9h') === null);
  verifie('un deplacement de rendez-vous n est pas concerne', R('C’est pour quoi ?', 'décale mon coiffeur jeudi 9h') === null);
  verifie('une modification non plus : « modifie le titre de mon rdv jeudi 9h », « change le motif de mon rdv jeudi 9h » → null (examinateur)', R('Quel titre veux-tu ?', 'modifie le titre de mon rdv jeudi 9h') === null && R('Quel motif ?', 'change le motif de mon rdv jeudi 9h') === null);
  verifie('« modifie » et « change » ne sont plus des titres', ctx.tcTitreDepuisDemande('modifie le titre jeudi 9h') === 'Titre' && ctx.tcTitreDepuisDemande('change le motif jeudi 9h') === 'Motif');
  verifie('charlySendMessage l applique apres « Pour quel jour ? »', /reply = tcQuestionJourManquant\([^\n]*\n(\s*\/\/[^\n]*\n)*\s+reply = tcRepondreObjetDonne\(reply, text, new Date\(\)\) \|\| reply;/.test(fonction(page, 'charlySendMessage') || ''));

  titre('4. « Remets-les » apres une suppression confirmee');
  const c4 = contexte();
  const supprimes = ['b2', 'b3', 'b4'];
  const copies = c4.events.filter((e) => supprimes.indexOf(e.id) > -1).map((e) => Object.assign({}, e));
  c4.events = c4.events.filter((e) => supprimes.indexOf(e.id) < 0);
  c4.poserMarcheArriere({ type: 'suppression', rdvs: copies });
  await c4.tcMarcheArriere('remets-les');
  const remis = c4.events.filter((e) => ['Formation', 'Rdv banque', 'Rendez-vous avec Zorglub'].indexOf(e.title) > -1);
  verifie('les 3 rendez-vous sont vraiment dans l agenda', remis.length === 3 && c4.events.length === 6, c4.events.map((e) => e.title).join(','));
  verifie('avec un identifiant NEUF (l ancien est supprime sur le serveur)', remis.every((e) => supprimes.indexOf(e.id) < 0 && /^charly_ai_\d+_r\d$/.test(e.id)), remis.map((e) => e.id).join(','));
  verifie('memes dates, heures et titres', remis.every((e) => e.date === '2026-10-13') && remis.find((e) => e.title === 'Formation').startH === 15);
  verifie('et Charly dit « 3 rendez-vous remis »', /3 rendez-vous remis/.test(c4.charlyIA.history[c4.charlyIA.history.length - 1].content));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
