// Les quatre onglets de Charly, et « Prévenir d'un retard ».
//
// Charles, 04/10 : retirer Calculer trajet et Réserver ; garder Créer
// mon agenda, Créer un nouveau rdv, Gérer un imprévu, et ajouter
// Prévenir d'un retard ; une ligne d'aide au-dessus.
// Mission 45 (chef, 15/10, validée par Charles) : l'onglet retard passe sur le moteur de questionnaire (mission 43) :
// combien (10 / 20 / 30 / plus, ou un nombre tapé), pour quel rendez-vous (le prochain, avec son heure, ou un autre du
// jour), et après (je rattrape, ou tout décale d'autant avec les nouveaux créneaux), qui prévient, récapitulatif
// « Oui, vas-y », puis « C'est fait. » et le bilan. Le modèle « Je serai en retard » des Paramètres sert toujours ; une
// phrase tapée (« je serai en retard », « préviens Marc que j'aurai 10 min de retard ») suit le même parcours avec ce
// qu'elle dit déjà. Jamais un rendez-vous passé ni une journée entière.
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

titre('Les onglets, dans l ordre');
const zone = (page.match(/<div id="charlyQuickActions"[\s\S]*?<\/div>/) || [''])[0];
const libelles = Array.from(zone.matchAll(/charlyQuickAction\('([a-z]+)'\)"[^>]*>([^<]*)<\/button>/g)).map((m) => [m[1], m[2].trim()]);
verifie('quatre onglets exactement', libelles.length === 4, libelles.length + ' : ' + libelles.map((l) => l[0]).join(','));
verifie('1. 📅 Créer mon agenda', libelles[0] && libelles[0][0] === 'agenda' && /Créer mon agenda/.test(libelles[0][1]), libelles[0] && libelles[0][1]);
verifie('2. ➕ Créer un nouveau rdv', libelles[1] && libelles[1][0] === 'rdv' && libelles[1][1] === '➕ Créer un nouveau rdv', libelles[1] && libelles[1][1]);
verifie('3. ⚡ Gérer un imprévu', libelles[2] && libelles[2][0] === 'impprevu' && libelles[2][1] === '⚡ Gérer un imprévu', libelles[2] && libelles[2][1]);
verifie('4. ⏰ Prévenir d\'un retard', libelles[3] && libelles[3][0] === 'retard' && libelles[3][1] === '⏰ Prévenir d\'un retard', libelles[3] && libelles[3][1]);
verifie('« Calculer trajet » n\'est plus un onglet', !/charlyQuickAction\('trajet'\)/.test(page));
verifie('« Réserver » n\'est plus un onglet', !/charlyQuickAction\('reserver'\)/.test(page));
verifie("« Prendre RDV » n est plus dans la barre d onglets", !/Prendre RDV/.test(zone));

titre('La ligne d aide, au-dessus des onglets');
const iAide = page.indexOf('id="charlyQuickIntro"');
const iOnglets = page.indexOf('<div id="charlyQuickActions"');
verifie('la ligne existe', iAide > -1);
verifie('elle est juste au-dessus des onglets', iAide > -1 && iAide < iOnglets && iOnglets - iAide < 400);
const aide = (page.match(/id="charlyQuickIntro"[^>]*>([^<]*)</) || [])[1] || '';
verifie('une seule ligne courte', aide.length > 0 && aide.length < 70, aide.length + ' caracteres : ' + aide);

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
    ev('k', 'Kiné', 0, 17, 30, 18, 30),
    ev('d', 'Banque', 1, 10, 0, 11, 0)                                                   // vendredi
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
  tcDemarrerRdvAPlusieurs() {}, charlyAttachAction() {}, tcDemarrerNouveauRdv() {}, startAssistant() {}, tcDemarrerCalculTrajet() {}, charlySendMessage() {}, tcDemarrerMalade() {}, tcDemarrerImprevu() {},
  tcPrevenirDepuisChat: async () => { trace.feuille = true; },
  document: { getElementById: () => ({ value: '', style: {} }) }, Set, _agendaChecked: null
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null; let _tcGroupeEnAttente = 0;', ctx);
[/const TC_VERBES_DE_DEMANDE = \[[^\]]*\];/, /const TC_MSG_MODELES = \{[\s\S]*?\n\};/, /const TC_JOURS_FR = [^;]*;/, /const TC_MOIS_FR = [^;]*;/].forEach((re) => { const m = page.match(re); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  constante introuvable : ' + re); } });
{ const d = page.indexOf('const TC_MOTS_CREUX = new Set('), f = page.indexOf('function tcMotsDeRdv('); if (d > -1 && f > d) vm.runInContext(page.slice(d, f), ctx); else { ko++; console.log('  KO  TC_MOTS_CREUX introuvable'); } }
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcEvenementFin', 'tcEvenementCouvre',
 'tcEvenementSurPlusieursJours', 'tcEstBandeau', 'tcMinutesDeHeure', 'tcSansTempsProtege', 'tcDesPlagesDeclarees', 'tcPlagesDuJour', 'tcOccupationsDuJour',
 'tcCreneauxDisponibles', 'tcRemplirModele', 'tcValeursDuRdv', '_tcLigneRdv', 'tcAppliquerDeplacement', 'tcMemoriserSuppression',
 'tcSupprimerRdvs', 'tcPhraseNonCompris', 'tcRessembleAUneDemande', 'tcContactDuRdv', 'tcBulleCharly', 'charlyQuickAction',
 'tcCleModele', 'tcModeleMessage', 'tcHeureDansTexte', 'tcDetecterMarcheArriere', 'tcMarcheArriere',
 'tcPeriodeAgenda', 'tcJoursNommes', 'tcPeriodeContrainte', 'tcPeriodeJourNomme', 'tcMotsDeRdv', 'tcTitreContient', 'tcHorairePlage', 'tcRdvVise', 'tcDetecterPrevenance', 'tcGererPrevenance'
].forEach((n) => { const f = extraire(n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const debutBloc = page.indexOf('   QUESTIONNAIRE GUIDÉ DE CHARLY (mission 43');
const finBloc = page.indexOf('function showConflictWarning(');
const bloc = (debutBloc > -1 && finBloc > debutBloc) ? page.slice(page.lastIndexOf('/*', debutBloc), finBloc) : '';
verifie('le bloc « questionnaire guidé » porte le parcours « retard »', bloc.length > 1000 && bloc.indexOf('const TC_QUESTIONNAIRE_RETARD = {') > -1, bloc.length);
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
const reinit = (evts) => { ctx.events = evts || agenda(); ctx.charlyIA.history = []; trace.saves = 0; trace.toasts.length = 0; trace.envois.length = 0; trace.demarches.length = 0; trace.feuille = false; vm.runInContext('_tcQuestionnaire = null; _tcMarcheArriere = null;', ctx); };
const quand = (d, h) => ctx.tcQuestionnaireQuand(d, h);
const memoire = () => vm.runInContext('_tcMarcheArriere', ctx);
const prevenance = async (t) => ctx.tcGererPrevenance(t, ctx.tcDetecterPrevenance(t));

(async () => {
  titre('1. L onglet : la bulle « Je vais être en retard », puis « Tu as combien de retard ? », quatre choix');
  reinit();
  ctx.charlyQuickAction('retard');
  await new Promise((r) => setTimeout(r, 0));
  verifie('la bulle puis la carte', H().length === 2 && H()[0].role === 'user' && H()[0].content === 'Je vais être en retard' && carte() && carte()._questionnaire.question === 'Tu as combien de retard ?', textes());
  verifie('les quatre choix, textes exacts', choixTextes() === '10 min | 20 min | 30 min | Plus (je tape un nombre)', choixTextes());

  titre('2. 20 min, le prochain (proposé avec son heure), tout décale d autant, Charly prévient, oui');
  await cliquer(1);
  verifie('« Pour quel rendez-vous ? » : le prochain avec son heure (Dentiste à 11h00 ; pas le petit déjeuner passé, ni la fête, ni l agenda pro), ou un autre', carte()._questionnaire.question === 'Pour quel rendez-vous ?' && choixTextes() === 'Le prochain : « Dentiste » à 11h00 | Un autre', choixTextes());
  await cliquer(0);
  verifie('le rendez-vous et l heure d arrivée, puis « Et après ? » (Coach et Kiné suivent le même jour)', /Le rendez-vous : « Dentiste », .*\(arrivée vers 11h20\)\./.test(textes()) && carte()._questionnaire.question === 'Et après ?' && choixTextes() === 'Je rattrape (les suivants ne bougent pas) | Tout décale d’autant (les rendez-vous suivants du jour aussi)', textes());
  await taper('tout décale');
  verifie('les nouveaux créneaux : Coach 15h20-16h20, Kiné 17h50-18h50 (le pro et le vendredi ne bougent pas)', textes().indexOf('Voici ce que ça donne :\n• « Coach » : ' + quand(iso(0), { startH: 15, startM: 20, endH: 16, endM: 20 }) + '\n• « Kiné » : ' + quand(iso(0), { startH: 17, startM: 50, endH: 18, endM: 50 })) > -1, textes());
  verifie('« Qui prévient Marc Dupont et Sophie Anceau ? », Kiné sans contact signalé', /Sans contact enregistré, donc personne à prévenir : « Kiné »\./.test(textes()) && carte()._questionnaire.question === 'Qui prévient Marc Dupont et Sophie Anceau ?', carte()._questionnaire.question);
  await taper('tu les préviens');
  verifie('le récapitulatif : le retard, les deux décalages, « Je préviens Marc Dupont et Sophie Anceau »', carte()._questionnaire.question === 'Voici ce que je vais faire :\n• « Dentiste » (' + quand(iso(0), { startH: 11, startM: 0, endH: 12, endM: 0 }) + ') : environ 20 minutes de retard, arrivée vers 11h20\n• Je décale « Coach » au ' + quand(iso(0), { startH: 15, startM: 20, endH: 16, endM: 20 }) + '\n• Je décale « Kiné » au ' + quand(iso(0), { startH: 17, startM: 50, endH: 18, endM: 50 }) + '\n• Je préviens Marc Dupont et Sophie Anceau', carte()._questionnaire.question);
  verifie('rien n a bougé ni n est parti avant « Oui, vas-y »', trace.saves === 0 && trace.envois.length === 0 && ctx.events.find((e) => e.id === 'c').startH === 15);
  await taper('oui');
  verifie('Dentiste reste à 11h ; Coach et Kiné sont décalés de 20 minutes (mêmes identifiants), sauvegardé, marche arrière', ctx.events.find((e) => e.id === 'b').startH === 11 && ctx.events.find((e) => e.id === 'c').startM === 20 && ctx.events.find((e) => e.id === 'k').startH === 17 && ctx.events.find((e) => e.id === 'k').startM === 50 && trace.saves === 1 && memoire() && memoire().type === 'deplacement', JSON.stringify(ctx.events.map((e) => e.id + ':' + e.startH + 'h' + e.startM)));
  verifie('Marc (TimeCool) reçoit le message « Je serai en retard » des Paramètres avec 20 minutes et « Je serai là vers 11h20 »', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont' && /environ 20 minutes de retard/.test(trace.envois[0][1]) && /Je serai là vers 11h20\.$/.test(trace.envois[0][1]), JSON.stringify(trace.envois));
  const bilan2 = dernier();
  verifie('Sophie (SMS) : un bouton « Envoyer à Sophie Anceau » avec le message « Je décale » et la nouvelle heure', bilan2._envois && bilan2._envois.length === 1 && bilan2._envois[0].nom === 'Sophie Anceau' && /je dois décaler notre rendez-vous du .*15 octobre à 15h00/.test(bilan2._envois[0].texte) && /15 octobre à 15h20\.$/.test(bilan2._envois[0].texte), JSON.stringify(bilan2._envois));
  verifie('« C’est fait. » puis le bilan : deux « Déplacé », le retard annoncé pour Dentiste seul, Marc prévenu, Sophie à envoyer, « remets-les »', /^C’est fait\.\n/.test(dc()) && (dc().match(/• Déplacé : /g) || []).length === 2 && (dc().match(/• Retard d’environ 20 minutes pour « Dentiste »/g) || []).length === 1 && !/Retard d’environ 20 minutes pour « Coach »/.test(dc()) && /• Prévenu par la messagerie TimeCool : Marc Dupont/.test(dc()) && /Message prêt, à envoyer toi-même d’un geste \(SMS ou email\) : Sophie Anceau/.test(dc()) && /remets-les »/.test(dc()) && enCours() === null, dc());
  await ctx.tcMarcheArriere('remets-les');
  verifie('« remets-les » : Coach et Kiné reviennent ; personne à rappeler (Marc n a pas bougé, Sophie n a pas été prévenue)', ctx.events.find((e) => e.id === 'c').startM === 0 && ctx.events.find((e) => e.id === 'k').startM === 30 && /2 rendez-vous remis/.test(dc()) && !/Pense à prévenir/.test(dc()), dc());

  titre('3. « Plus » puis un nombre ; « 45 » tapé d emblée ; je rattrape ; personne');
  reinit();
  await ctx.tcPrevenirRetard('Je vais être en retard');
  await cliquer(3);
  verifie('« Plus » : une carte sans bouton, « Combien de minutes ? Tape un nombre. »', carte()._questionnaire.question === 'Combien de minutes ? Tape un nombre.' && carte()._questionnaire.choix.length === 0 && !/<button/.test(ctx.tcRendreQuestionnaire(carte())), ctx.tcRendreQuestionnaire(carte()));
  verifie('« 50 » tapé : pris, puis « Pour quel rendez-vous ? »', await taper('50') === true && enCours().reponses.minutes === '50' && carte()._questionnaire.question === 'Pour quel rendez-vous ?');
  await taper('le prochain');
  await taper('je rattrape');
  verifie('« je rattrape » : rien n est décalé, « Qui prévient Marc Dupont ? » (Dentiste seul)', carte()._questionnaire.question === 'Qui prévient Marc Dupont ?' && enCours().reponses._rdvs.length === 1, textes());
  await taper('personne');
  verifie('le récapitulatif : arrivée vers 11h50, « Je ne préviens personne »', /arrivée vers 11h50\n• Je ne préviens personne$/.test(carte()._questionnaire.question), carte()._questionnaire.question);
  await taper('vas-y');
  verifie('« C’est fait. » : le retard annoncé, rien d envoyé, rien ne bouge, pas de marche arrière', /^C’est fait\.\n• Retard d’environ 50 minutes pour « Dentiste »/.test(dc()) && trace.envois.length === 0 && trace.saves === 0 && memoire() === null && !/remets/.test(dc()), dc());
  reinit();
  await ctx.tcPrevenirRetard('Je vais être en retard');
  verifie('« 45 » tapé à la première question est pris tel quel', await taper('45') === true && enCours().reponses.minutes === '45' && carte()._questionnaire.question === 'Pour quel rendez-vous ?');

  titre('4. Un autre rendez-vous du jour : « Lequel ? » ; sans autre : pas de question');
  reinit();
  await ctx.tcPrevenirRetard('Je vais être en retard');
  await taper('10'); await taper('un autre');
  verifie('« Lequel ? » : Coach et Kiné (les suivants du jour, pas le prochain, pas le pro, pas la fête)', carte()._questionnaire.question === 'Lequel ?' && choixTextes() === '« Coach », 15h à 16h | « Kiné », 17h30 à 18h30', choixTextes());
  await taper('le coach');
  verifie('le coach : « arrivée vers 15h10 », et « Et après ? » (Kiné suit)', /Le rendez-vous : « Coach », .*\(arrivée vers 15h10\)\./.test(textes()) && carte()._questionnaire.question === 'Et après ?', textes());
  reinit(agenda().filter((e) => e.id !== 'c' && e.id !== 'k'));
  await ctx.tcPrevenirRetard('Je vais être en retard');
  await taper('10');
  verifie('un seul rendez-vous possible aujourd’hui : ni « Pour quel rendez-vous ? » ni « Et après ? », droit à « Qui prévient Marc Dupont ? »', carte()._questionnaire.question === 'Qui prévient Marc Dupont ?' && !/Pour quel rendez-vous|Et après/.test(textes()), textes());
  reinit([ev('a', 'Petit déjeuner', 0, 8, 0, 9, 0), ev('v', 'Fête', 0, 0, 0, 23, 59, { allDay: true })]);
  await ctx.tcPrevenirRetard('Je vais être en retard');
  await taper('10');
  verifie('plus rien à venir : « Tu n’as aucun rendez-vous à venir : personne à prévenir. »', dc() === 'Tu n’as aucun rendez-vous à venir : personne à prévenir.' && enCours() === null, dc());

  titre('5. Les phrases tapées suivent le même parcours, avec ce qu elles disent déjà');
  reinit();
  await prevenance("préviens Marc que j'aurai 10 min de retard");
  verifie('« préviens Marc que j’aurai 10 min de retard » : minutes et rendez-vous connus, droit à « Et après ? »', H()[0].content === "préviens Marc que j'aurai 10 min de retard" && enCours().reponses.minutes === '10' && enCours().reponses._retardRdv.id === 'b' && carte()._questionnaire.question === 'Et après ?' && /arrivée vers 11h10/.test(textes()), textes());
  reinit();
  await prevenance('je serai en retard');
  verifie('« je serai en retard » : « Tu as combien de retard ? »', carte()._questionnaire.question === 'Tu as combien de retard ?');
  reinit();
  await prevenance("j'aurai un quart d'heure de retard au prochain rendez-vous");
  verifie('« un quart d’heure » et « prochain » lus : droit à « Et après ? », arrivée vers 11h15', enCours().reponses.minutes === '15' && enCours().reponses.pour === 'prochain' && carte()._questionnaire.question === 'Et après ?' && /arrivée vers 11h15/.test(textes()), textes());
  reinit();
  await prevenance('je suis en retard pour le kiné');
  await taper('20');
  verifie('« pour le kiné » (sans contact, dernier du jour) : pas de suivant, « Aucun de ces rendez-vous n’a de contact… », récapitulatif direct', enCours().reponses._retardRdv.id === 'k' && /Aucun de ces rendez-vous n’a de contact enregistré/.test(textes()) && carte()._questionnaire.etape === 'recap' && !trace.feuille, textes());
  reinit();
  await prevenance("dis à Sophie que j'annule le coach");
  verifie('une annulation tapée garde son chemin (tcPrevenirDepuisChat)', trace.feuille === true && enCours() === null);

  titre('6. Dans la page');
  const act = extraire('charlyQuickAction') || '';
  verifie('l onglet « retard » lance le questionnaire avec la bulle « Je vais être en retard »', /if \(action === 'retard'\) \{ tcPrevenirRetard\('Je vais être en retard'\); return; \}/.test(act));
  verifie('tcGererPrevenance passe tout retard au questionnaire, avec le rendez-vous visé', /if \(intent\.type === 'retard'\) \{ await tcPrevenirRetard\(text, tcRdvVise\(text\)\); return; \}/.test(extraire('tcGererPrevenance') || ''));
  verifie('tcProchainRdv ne sert plus : parti', page.indexOf('tcProchainRdv') < 0);
  verifie('le moteur pose une étape « libre » sans choix', /if \(\(!choix \|\| !choix\.length\) && typeof etape\.libre !== 'function'\) continue;/.test(extraire('tcQuestionnaireSuivant') || ''));
  verifie('pas de tiret long dans le bloc, pas d assertion arrière (Safari)', bloc.indexOf('—') < 0 && page.indexOf('(?<') < 0);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  exception : ' + (e && e.stack || e)); console.log(''); console.log((ko + 1) + ' anomalie(s).'); process.exit(1); });
