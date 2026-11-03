// « Ma confiance en Charly » et les propositions de créneaux (mission 73, chef, 03/11, ok de Charles).
//
// 73a : le réglage (premier bloc des Paramètres, caché derrière TC_CONFIANCE_VISIBLE tant que les trois profils ne sont pas
// faits ; profil 1 au départ ; clé de compte synchronisée) et le profil 1. Un rendez-vous qui concerne un contact ne se
// déplace plus d'office : Charly propose 2 ou 3 créneaux (carte à boutons chez un contact TimeCool, lien sinon), le
// rendez-vous reste en place, marqué ⏳, et chaque réponse demande un accord avant d'écrire dans l'agenda. « Aucun ne me
// va » ou pas de réponse sous 24 h : Charly le dit et propose la suite.
// Usage : node verif-confiance-charly.js <index.html>
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0, ok = 0;
function verifie(l, c, d) {
  if (c) ok++; else ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 400) : ''));
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
const noms = ['tcConfianceCharly', 'tcChoisirConfiance', 'tcBlocConfiance', 'tcMinutesLisibles', 'tcPropositionLibelle', 'tcNomsLisibles',
  'tcCreneauxPourDecalage', 'tcPropositionTexte', 'tcHeureSql', 'tcEnvoyerPropositions', 'tcLignesPropositions', 'tcProposerLesCreneaux',
  'tcDireBilanPropositions', 'tcReponseDecalage', 'tcRdvDeProposition', 'tcCreneauDeProposition', 'tcReponseCreneauEnAttente',
  'tcPoserReponseCreneau', 'tcSuivrePropositions', 'tcRepondreReponseCreneau', 'tcChoisirReponseCreneau', 'tcExecuterReponseCreneau',
  'tcRendreReponseCreneau', 'tcPropositionRecue', 'tcCadrePropositionCreneaux', 'tcRepondreProposition', 'tcMarqueDecalage',
  'tcGenesDuCreneau', 'tcReposerReponseCreneau', 'tcDireSuiteAuContact',
  'tcIdsQuestion', 'tcRetirerQuestionsDe', 'tcPoserLotCreneaux', 'tcReproposerSeul', 'tcExecuterLotCreneaux', 'tcDireSuitesAuxContacts', 'tcExecuterDeplacement', 'tcGenesDuLot',
  'tcPrisTexte', 'tcPrisParentheses', 'tcTraiterSeul', 'tcSuitesEnLignes', 'tcProposerEnvoi', 'tcExecuterEnvoi',
  'tcSauverAClore', 'tcEchecClore', 'tcCloreEnAttente', 'tcNoterPourMarcheArriere', 'tcMaintenirPropositions',
  'tcCreneauxReproposes', 'tcDeplacerDansLeLot', 'tcNomsDeFiche'];
const absentes = noms.filter((n) => !extraire(n));
verifie('les fonctions de la mission 73 existent, chacune une fois', !absentes.length && noms.every((n) => page.split('function ' + n + '(').length === 2), absentes.join(', '));
if (absentes.length) { console.log(ko + ' anomalie(s).'); process.exit(1); }
verifie('les trois profils sont faits : le bloc est visible (TC_CONFIANCE_VISIBLE = true, 73c), en tête des Paramètres, avant « Sauvegarde & Restauration »',
  /const TC_CONFIANCE_VISIBLE = true;/.test(page) && /function renderSettingsInterne\(\) \{\s+document\.getElementById\('settingsContent'\)\.innerHTML = `\s+\$\{TC_CONFIANCE_VISIBLE \? tcBlocConfiance\(\) : ''\}\s+<div[^>]*>\s+<div[^>]*>💾 Sauvegarde & Restauration/.test(page));
verifie('la clé tc_confiance_charly suit le compte (synchronisée : absente de TC_JAMAIS_TRANSFERE)', /var TC_CONFIANCE_KEY = 'tc_confiance_charly';/.test(page) && !/TC_JAMAIS_TRANSFERE = \[[^\]]*tc_confiance_charly/.test(page));
const csm = extraire('charlySendMessage') || '';
const iRep = csm.indexOf('await tcRepondreReponseCreneau(text)) return;');
verifie('« je le place ? » : la réponse est lue avant « J’envoie ? » et avant le classement', iRep > -1 && iRep < csm.indexOf('await tcRepondreEnvoi(text)) return;') && iRep < csm.indexOf('const _classe = tcClasserMessage(text, charlyIA.history);'));
verifie('la question à boutons a son rendu ; la carte du contact est dans la conversation', /if \(m && m\._reponseCreneau\) return tcRendreReponseCreneau\(m\);/.test(page) && /if \(propositionRecue\) body\.innerHTML \+= tcCadrePropositionCreneaux\(propositionRecue, msg\.with\);/.test(page));
verifie('la pastille ⏳ : vue semaine, vue jour (« en cours de décalage »), fiche', /week-event-title">\$\{tcMarqueDecalage\(e\)\}/.test(page) && /\$\{tcMarqueDecalage\(e\) \? ' · en cours de décalage' : ''\}/.test(page) && /textContent = tcMarqueDecalage\(e\) \+ tcIconeType\(e\) \+ e\.title/.test(page));
verifie('plus de fenêtre de confirmation par contact pour un décalage (tcPrevenirDecalages a disparu)', page.indexOf('function tcPrevenirDecalages(') < 0 && page.indexOf("tcConfirm('Prévenir ' + c.name") < 0);
verifie('la sonde des réponses : toutes les 30 s, seulement si une proposition attend et que l application est visible', /setInterval\(function \(\) \{ if \(typeof document === 'undefined' \|\| !document\.hidden\) tcSuivrePropositions\(false\); \}, TC_PROPOSITION_SONDE_MS\);/.test(page) && /const TC_PROPOSITION_SONDE_MS = 30000;/.test(page));
verifie('pas de tiret long dans le bloc, pas d assertion arrière dans la page', !/—/.test(page.slice(page.indexOf('PROPOSITIONS DE CRÉNEAUX DE CHARLY'), page.indexOf('/** Un contact vraiment prévenu'))) && !/\(\?<[=!]/.test(page));

/* Horloge fixée : jeudi 15 octobre 2026, 10h00. */
const FIXE = new Date(2026, 9, 15, 10, 0, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const iso = (n) => { const d = new Date(2026, 9, 15 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const stock = {};
const trace = { panne: null, maintenus: [], prevenances: [], syncs: 0, saves: 0, toasts: [], creees: [], traitees: [], choisies: [], deplaces: [], decisions: [] };
let reponses = [];
const ctx = {
  console, Date: DateFixe, mode: 'user', currentPage: 'assistant', events: [], charlyIA: { history: [] },
  contactsList: [{ id: 'c1', name: 'Paul Martin', referenceCompte: 'REFP' }, { id: 'c2', name: 'Chloé Roux', phone: '06' }],
  localStorage: { getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); } },
  document: { getElementById: () => null, hidden: false },
  tcSyncBientot() { trace.syncs++; }, saveEventsToStorage() { trace.saves++; }, render() {}, renderCharlyChat() {}, showToast(t) { trace.toasts.push(t); },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcModeleMessage: () => 'Bonjour [Prénom], je dois décaler notre rendez-vous du [date] à [heure]. Voici ce que je peux te proposer :',
  tcVouvoiement: () => false,
  escapeHTMLSafe: (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  tcBulleCharly: (x) => '<bulle>' + x + '</bulle>',
  _tcLigneRdv: (e) => '« ' + e.title + ' »',
  tcAppliquerDeplacement(liste) { liste.forEach((x) => { Object.assign(x.ev, { date: x.p.date, startH: x.p.startH, startM: x.p.startM, endH: x.p.endH, endM: x.p.endM }); trace.deplaces.push(x.ev.id); }); ctx.charlyIA.history.push({ role: 'system_info', content: 'C’est fait, rendez-vous déplacé' }); },
  tcSyncTour: async () => {}, openConversation() {}, _currentConvId: null,
  tcTransmettrePrevenance: async (c, t) => { trace.prevenances.push([c.name, t]); return c.referenceCompte ? 'timecool' : 'sms'; },
  setTimeout: () => 0,
  TC_BACKEND: {
    estConnecte: () => true,
    propositions: async () => reponses.slice(),
    propositionMaintenir: async (id) => {
      if (trace.panne === id) throw new Error('réseau');
      trace.maintenus.push(id);
      return { maintenu: true, messagerie: id !== 902, message: 'Finalement, le rendez-vous du jeudi 15 octobre à 15h est maintenu.' };
    },
    propositionTraiter: async (id, decision) => {
      if (trace.panne === id) throw new Error('réseau');
      trace.traitees.push(id); trace.decisions.push(decision);
      const p = reponses.find((x) => x.rdv_id === id) || {};
      reponses = reponses.filter((x) => x.rdv_id !== id);
      return { traite: true, messagerie: !!p.reference, message: decision === 'place' ? 'Rendez-vous déplacé : ici.' : (decision === 'laisse' ? 'Finalement, le rendez-vous reste en place.' : null) };
    },
    propositionCreer: async (corps) => { trace.creees.push(corps); return { rdv_id: 100 + trace.creees.length, url: corps.reference ? null : 'https://timecool.fr/rdv/ABCD2345' }; },
    propositionChoisir: async (rdv, rang) => { trace.choisies.push([rdv, rang]); if (rang === 9) { const e = new Error('pris'); e.code = 'creneau_pris'; throw e; } if (rang === 8) { const e = new Error('deja'); e.code = 'deja_repondu'; throw e; } if (rang === 7) { const e = new Error('ferme'); e.code = 'plus_valable'; throw e; } return { enregistre: true }; }
  }
};
vm.createContext(ctx);
const constantes = (page.match(/^const TC_(PROPOSITION_[A-Z_]+|CONFIANCE_VISIBLE) = [^;\n]+;$/gm) || []).join('\n');
const profils = (page.match(/const TC_CONFIANCE_PROFILS = \[[\s\S]*?\n\];/) || [''])[0];
vm.runInContext('let _tcQuestionnaireNumero = 0; let _tcPropositionsEnCours = false; let _tcDeplacementEnAttente = null; var _tcPropositionsRepondues = {}; var _tcPropositionsPris = {}; var _tcAClore = []; var TC_A_CLORE_KEY = \'tc_propositions_a_clore\'; let _tcMarcheArriere = null;\nvar TC_CONFIANCE_KEY = \'tc_confiance_charly\';\n' + constantes + '\n' + profils + '\n'
  + ['tcSansAccents', 'tcISO', 'tcClasseNormaliser', 'tcReponseOuiNon', 'tcRemplirModele', 'tcValeursDuRdv', 'tcContactDuRdv', 'tcEstBandeau', 'tcEvenementSurPlusieursJours', 'tcEvenementFin', 'tcEvenementCouvre']
    .concat(noms).map(extraire).join('\n'), ctx);

titre('1. Le réglage « Ma confiance en Charly »');
verifie('profil 1 au départ, pour tout compte ; une valeur illisible vaut 1', ctx.tcConfianceCharly() === 1 && (stock.tc_confiance_charly = 'x', ctx.tcConfianceCharly() === 1) && (delete stock.tc_confiance_charly, true));
const bloc = ctx.tcBlocConfiance();
const texte = bloc.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
verifie('titre « 🤝 MA CONFIANCE EN CHARLY » (en capitales à l écran) et sous-titre « Jusqu’où Charly peut agir sans moi ? »', /\|🤝 Ma confiance en Charly\|/.test(texte) && /text-transform:uppercase/.test(bloc) && /\|Jusqu’où Charly peut agir sans moi \?\|/.test(texte), texte.slice(0, 200));
verifie('les trois profils, textes exacts, chacun avec sa phrase grise', texte.indexOf('|Charly attend ma validation à chaque étape avant de passer à la suivante.|Pour te rassurer : tu vois tout, tu décides tout.|') > -1
  && texte.indexOf('|Charly réalise toutes les étapes et attend ma validation pour la dernière, avant d’écrire dans mon agenda.|Quand tu seras rassuré : il travaille, tu gardes le dernier mot.|') > -1
  && texte.indexOf('|Charly valide seul toutes les étapes et me laisse travailler tranquillement.|Quand tu seras convaincu de ses compétences : il fait tout et te fait un compte rendu.|') > -1, texte);
verifie('un seul choix possible (radiogroup), le profil 1 sélectionné', (bloc.match(/role="radio" aria-checked="true"/g) || []).length === 1 && /aria-checked="true" onclick="tcChoisirConfiance\(1\)"/.test(bloc));
ctx.tcChoisirConfiance(2);
verifie('choisir le profil 2 : enregistré dans la clé du compte, synchronisé, sélectionné', stock.tc_confiance_charly === '2' && trace.syncs === 1 && ctx.tcConfianceCharly() === 2 && /aria-checked="true" onclick="tcChoisirConfiance\(2\)"/.test(ctx.tcBlocConfiance()));
ctx.tcChoisirConfiance(7);
verifie('une valeur hors des trois est ignorée', stock.tc_confiance_charly === '2' && trace.syncs === 1);
delete stock.tc_confiance_charly;

titre('2. Les créneaux proposés');
const ev = (id, title, jour, h, m, hf, mf, extra) => Object.assign({ id, title, date: iso(jour), startH: h, startM: m, endH: hf, endM: mf, mode: 'user' }, extra || {});
ctx.events = [ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1' }), ev('o', 'Occupé', 1, 12, 0, 13, 30), ev('p', 'Pro', 1, 14, 0, 15, 0, { mode: 'pro' })];
let cr = ctx.tcCreneauxPourDecalage(ctx.events[0], { date: iso(1), startH: 10, startM: 0, endH: 11, endM: 0 }, []);
verifie('d abord le créneau prévu, puis deux autres libres de même durée, à deux heures d écart au moins, sans chevaucher « Occupé » 12h-13h30 (l agenda pro ne compte pas)',
  cr.map((c) => c.date + ' ' + c.startH + ':' + c.startM + '-' + c.endH + ':' + c.endM).join(' | ') === iso(1) + ' 10:0-11:0 | ' + iso(1) + ' 13:30-14:30 | ' + iso(1) + ' 15:30-16:30', JSON.stringify(cr));
cr = ctx.tcCreneauxPourDecalage(ctx.events[0], null, [], null);
verifie('sans créneau prévu : dès maintenant (10h, pas avant), le rendez-vous lui-même ne gêne pas', cr[0].date === iso(0) && cr[0].startH === 10 && cr.every((c) => c.startH >= 8 && c.endH <= 19), JSON.stringify(cr));
cr = ctx.tcCreneauxPourDecalage(ctx.events[0], null, [{ date: iso(0), debut: 600, fin: 900 }], null);
verifie('un créneau déjà proposé à un autre est évité', cr[0].date === iso(0) && cr[0].startH === 15, JSON.stringify(cr));
verifie('« mardi 20 octobre à 10h30 » : le libellé', ctx.tcPropositionLibelle({ date: '2026-10-20', startH: 10, startM: 30 }) === 'mardi 20 octobre à 10h30');
verifie('« déjà vu » / « oui » / « non » / autre chose', ctx.tcReponseDecalage('c’est déjà réglé avec eux') === 'vu' && ctx.tcReponseDecalage('ok') === 'envoyer' && ctx.tcReponseDecalage('non merci') === 'non' && ctx.tcReponseDecalage('et demain ?') === null);

titre('3. L’envoi : TimeCool par la messagerie, sinon un lien à envoyer d’un geste ; le rendez-vous est marqué');
(async () => {
  ctx.events = [ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1' }), ev('k', 'Kiné', 0, 17, 0, 18, 0, { contact: 'c2' })];
  const env = await ctx.tcProposerLesCreneaux([{ ev: ctx.events[0], p: { date: iso(1), startH: 9, startM: 0, endH: 10, endM: 0 } }, { ev: ctx.events[1], p: { date: iso(1), startH: 10, startM: 0, endH: 11, endM: 0 } }]);
  const [cp, cc] = trace.creees;
  verifie('Paul : sa référence, le rendez-vous remplacé, le texte « Je décale », 3 créneaux avec libellés', cp.reference === 'REFP' && cp.remplace === 'a' && cp.titre === 'Avocat' && /^Bonjour Paul, je dois décaler notre rendez-vous du jeudi 15 octobre à 15h00\. Voici ce que je peux te proposer :$/.test(cp.texte)
    && cp.creneaux.length === 3 && cp.creneaux[0].debut === iso(1) + ' 09:00:00' && cp.creneaux[0].libelle === 'vendredi 16 octobre à 9h', JSON.stringify(cp));
  verifie('Chloé (sans TimeCool) : un lien par SMS, son prénom ; jamais le créneau prévu pour Paul', !cc.reference && cc.canal === 'sms' && cc.prenom_destinataire === 'Chloé' && cc.creneaux[0].debut === iso(1) + ' 10:00:00' && cc.creneaux.every((x) => !cp.creneaux.some((y) => y.debut === x.debut)), JSON.stringify(cc));
  verifie('les deux rendez-vous restent à leur place, marqués (⏳ sur la carte)', ctx.events[0].date === iso(0) && ctx.events[0].decalage.rdv === 101 && ctx.events[1].decalage.rdv === 102 && ctx.tcMarqueDecalage(ctx.events[0]) === '⏳ ' && ctx.tcMarqueDecalage({}) === '');
  verifie('le bilan dit ce qui part et ce qui reste à envoyer soi-même, sans rien promettre de plus', env.lignes.join('\n') === '• « Avocat » : je propose à Paul Martin vendredi 16 octobre à 9h, vendredi 16 octobre à 11h ou vendredi 16 octobre à 13h\n• « Kiné » : je propose à Chloé Roux vendredi 16 octobre à 10h, vendredi 16 octobre à 12h ou vendredi 16 octobre à 14h\n• Envoyé dans la messagerie TimeCool : Paul Martin\n• Message prêt avec le lien des créneaux, à envoyer toi-même d’un geste (SMS ou email) : Chloé Roux\nCes rendez-vous restent à leur place, marqués ⏳, jusqu’à la réponse. Quand elle arrive, je te demande avant de l’écrire dans ton agenda.', env.lignes.join(' / '));
  verifie('le bouton « Envoyer à Chloé Roux » porte le texte et le lien', env.res.envois.length === 1 && env.res.envois[0].texte === cc.texte + ' https://timecool.fr/rdv/ABCD2345' && env.res.envois[0].titre === '');
  ctx.contactsList.push({ id: 'c3', name: 'Zoé Sans' });
  ctx.events.push(ev('z', 'Zumba', 2, 9, 0, 10, 0, { contact: 'c3' }));
  const ctxBackend = ctx.TC_BACKEND.propositionCreer;
  ctx.TC_BACKEND.propositionCreer = async () => { throw new Error('réseau'); };
  const env2 = await ctx.tcProposerLesCreneaux([{ ev: ctx.events[2], p: null }, { ev: ctx.events[0], p: null }]);
  ctx.TC_BACKEND.propositionCreer = ctxBackend;
  verifie('sans numéro ni email : rien ne part, c est dit ; connexion manquée : c est dit, le rendez-vous n est pas marqué', /Sans numéro ni email dans ta fiche contact, rien n’est parti : Zoé Sans/.test(env2.lignes.join('\n')) && /Pas envoyé, la connexion a manqué : Paul Martin/.test(env2.lignes.join('\n')) && !ctx.events[2].decalage, env2.lignes.join(' / '));

  titre('4. La réponse revient : un accord avant d’écrire (profil 1), une à la fois');
  ctx.charlyIA.history = [];
  ctx.events = [ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1', decalage: { rdv: 101 } }), ev('k', 'Kiné', 0, 17, 0, 18, 0, { contact: 'c2', decalage: { rdv: 102 } })];
  reponses = [
    { rdv_id: 101, titre: 'Avocat', remplace: 'a', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', debut: iso(1) + ' 11:00:00', fin: iso(1) + ' 12:00:00' },
    { rdv_id: 102, titre: 'Kiné', remplace: 'k', etat: 'refuse', qui: 'Chloé', reference: null, debut: null, fin: null }
  ];
  await ctx.tcSuivrePropositions(false);
  let q = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('« Paul Martin a choisi vendredi 16 octobre à 11h pour « Avocat ». Je le place dans ton agenda ? », deux boutons', q && q.content === 'Paul Martin a choisi vendredi 16 octobre à 11h pour « Avocat ». Je le place dans ton agenda ?' && q.nature === 'question'
    && /tcChoisirReponseCreneau\(101, 'placer'\)"[^>]*>Oui, place-le</.test(ctx.tcRendreReponseCreneau(q)) && /tcChoisirReponseCreneau\(101, 'laisser'\)"[^>]*>Non, je le laisse où il est</.test(ctx.tcRendreReponseCreneau(q)), q && q.content);
  await ctx.tcSuivrePropositions(false);
  verifie('une à la fois : tant que la question attend, la suivante ne vient pas', ctx.charlyIA.history.length === 1);
  verifie('rien n est écrit avant l accord', ctx.events[0].date === iso(0) && trace.deplaces.length === 0);
  verifie('« quel temps fait-il » ne répond pas à la question', await ctx.tcRepondreReponseCreneau('quel temps fait-il') === false);
  verifie('« oui » tapé : placé à 11h-12h (même rendez-vous), plus de pastille, la proposition est close sur le serveur', await ctx.tcRepondreReponseCreneau('oui') === true && ctx.events[0].date === iso(1) && ctx.events[0].startH === 11 && ctx.events[0].endH === 12 && !ctx.events[0].decalage && trace.traitees.join() === '101' && !/place-le/.test(ctx.tcRendreReponseCreneau(q)));
  await ctx.tcSuivrePropositions(false);
  q = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('la suivante : « Chloé Roux n’a choisi aucun des créneaux proposés pour « Kiné ». Je propose d’autres moments, ou je laisse le rendez-vous à sa place ? »', q.content === 'Chloé Roux n’a choisi aucun des créneaux proposés pour « Kiné ». Je propose d’autres moments, ou je laisse le rendez-vous à sa place ?'
    && /Propose d’autres moments/.test(ctx.tcRendreReponseCreneau(q)) && /Je le laisse à sa place/.test(ctx.tcRendreReponseCreneau(q)), q.content);
  verifie('« oui » seul ne tranche pas entre les deux : la phrase suit son chemin', await ctx.tcRepondreReponseCreneau('oui') === false);
  const avant = trace.creees.length;
  await ctx.tcChoisirReponseCreneau(102, 'autres');
  const nouvelle = trace.creees[trace.creees.length - 1];
  verifie('« Propose d’autres moments » : une nouvelle proposition à Chloé, dès demain, le rendez-vous reste marqué ; l ancienne est close', trace.creees.length === avant + 1 && nouvelle.remplace === 'k' && nouvelle.creneaux[0].debut >= iso(1) && ctx.events[1].date === iso(0) && ctx.events[1].decalage && ctx.events[1].decalage.rdv === 100 + trace.creees.length && trace.traitees.join() === '101,102', JSON.stringify(nouvelle));
  reponses = [{ rdv_id: 103, titre: 'Kiné', remplace: 'k', etat: 'sans_reponse', qui: 'Chloé', debut: null, fin: null }];
  await ctx.tcSuivrePropositions(false);
  q = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('pas de réponse sous 24 h : « Chloé Roux n’a pas répondu depuis 24 h pour « Kiné ». … »', /^Chloé Roux n’a pas répondu depuis 24 h pour « Kiné »\. Je propose d’autres moments, ou je laisse le rendez-vous à sa place \?$/.test(q.content), q.content);
  verifie('« laisse-le » : le rendez-vous reste, la pastille part, c est dit', await ctx.tcRepondreReponseCreneau('laisse-le') === true && ctx.events[1].date === iso(0) && !ctx.events[1].decalage && ctx.charlyIA.history.slice(-2).some((m) => /« Kiné » reste à sa place\.$/.test(m.content)));
  let dern = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('Chloé (sans TimeCool) l apprend : « Finalement… » prêt à envoyer d un geste, bouton « Envoyer à Chloé Roux » ; le serveur a reçu « laisse »', trace.decisions[trace.decisions.length - 1] === 'laisse' && dern._envois && dern._envois[0].nom === 'Chloé Roux' && dern._envois[0].texte === 'Finalement, le rendez-vous reste en place.' && /Message prêt pour Chloé Roux, à envoyer toi-même d’un geste/.test(dern.content), JSON.stringify(dern));
  reponses = [{ rdv_id: 104, titre: 'Dentiste', remplace: 'disparu', etat: 'choisi', qui: 'Paul Martin', debut: iso(2) + ' 09:00:00', fin: iso(2) + ' 10:00:00' }];
  ctx.events.push(ev('x', 'Marqué', 3, 9, 0, 10, 0, { decalage: { rdv: 999 } }));
  await ctx.tcSuivrePropositions(false);
  await ctx.tcRepondreReponseCreneau('oui');
  verifie('le rendez-vous d origine n est plus dans l agenda : rien n est placé, c est dit', /« Dentiste » n’est plus dans ton agenda : je n’ai rien placé\.$/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));
  const n = ctx.charlyIA.history.length;
  reponses = [{ rdv_id: 104, titre: 'Dentiste', remplace: 'disparu', etat: 'choisi', qui: 'Paul Martin', debut: iso(2) + ' 09:00:00', fin: iso(2) + ' 10:00:00' }];
  await ctx.tcSuivrePropositions(true);
  verifie('une réponse déjà montrée n est jamais reposée', ctx.charlyIA.history.length === n);
  ctx.events = [];
  let appels = 0; const avantProp = ctx.TC_BACKEND.propositions; ctx.TC_BACKEND.propositions = async () => { appels++; return []; };
  await ctx.tcSuivrePropositions(false);
  verifie('la sonde ne coûte rien quand aucune proposition n attend (aucun appel)', appels === 0);
  ctx.TC_BACKEND.propositions = avantProp;

  titre('5. Chez le contact : la carte à boutons');
  const msg = { serveur: true, thread: [{ from: 'them', genre: 'proposition_creneaux', rdv: 7, texte: 'x', creneaux: [{ rang: 1, debut: iso(1) + ' 09:00:00', libelle: 'vendredi 16 octobre à 9h' }, { rang: 2, debut: iso(1) + ' 14:00:00', libelle: 'vendredi 16 octobre à 14h' }] }] };
  const p = ctx.tcPropositionRecue(msg);
  verifie('la proposition reçue est trouvée ; celle qu on a envoyée (from me) ou une conversation locale, non', p && p.rdv === 7 && !ctx.tcPropositionRecue({ serveur: true, thread: [Object.assign({}, msg.thread[0], { from: 'me' })] }) && !ctx.tcPropositionRecue({ thread: msg.thread }));
  const carte = ctx.tcCadrePropositionCreneaux(p, 'Inès Martin');
  verifie('« 📅 Inès te propose un autre moment », un bouton par créneau, « Aucun ne me va »', /📅 Inès te propose un autre moment/.test(carte) && /onclick="tcRepondreProposition\(7, 1\)">vendredi 16 octobre à 9h</.test(carte) && /onclick="tcRepondreProposition\(7, 2\)">vendredi 16 octobre à 14h</.test(carte) && /onclick="tcRepondreProposition\(7, -1\)">Aucun ne me va</.test(carte), carte);
  await ctx.tcRepondreProposition(7, 2);
  verifie('touché : le choix part au serveur, la carte le dit (plus de boutons)', trace.choisies.join('|') === '7,2' && /✅ Merci, ton choix est bien noté : vendredi 16 octobre à 14h\. Inès doit encore le confirmer : tu recevras un message dès que c’est fait\. En attendant, ton rendez-vous actuel reste en place\./.test(ctx.tcCadrePropositionCreneaux(p, 'Inès Martin')) && !/confirmé/.test(ctx.tcCadrePropositionCreneaux(p, 'Inès Martin')) && !/<button/.test(ctx.tcCadrePropositionCreneaux(p, 'Inès Martin')));
  verifie('le choix déjà enregistré par le serveur (autre appareil) : pas de boutons', /✅ Tu as répondu qu’aucun de ces moments ne te va\./.test(ctx.tcCadrePropositionCreneaux(Object.assign({}, p, { rdv: 8, choix: -1 }), 'Inès')));
  await ctx.tcRepondreProposition(9, 9);
  verifie('créneau pris entre-temps : « choisis-en un autre », les boutons restent', /Ce créneau vient d’être pris/.test(trace.toasts[trace.toasts.length - 1]) && /<button/.test(ctx.tcCadrePropositionCreneaux(Object.assign({}, p, { rdv: 9 }), 'Inès')));
  await ctx.tcRepondreProposition(10, 8);
  verifie('déjà répondu : la carte le dit', /Cette proposition a déjà reçu une réponse\./.test(ctx.tcCadrePropositionCreneaux(Object.assign({}, p, { rdv: 10 }), 'Inès')));
  const card = (o) => ctx.tcCadrePropositionCreneaux(Object.assign({}, p, o), 'Inès Martin');
  verifie('avec le rendez-vous d avant : « En attendant, le rendez-vous du jeudi 15 octobre à 15h reste en place. »', card({ rdv: 20, avant: 'jeudi 15 octobre à 15h', choix: 2 }).indexOf('✅ Merci, ton choix est bien noté : vendredi 16 octobre à 14h. Inès doit encore le confirmer : tu recevras un message dès que c’est fait. En attendant, le rendez-vous du jeudi 15 octobre à 15h reste en place.') > -1);
  verifie('placé : « ✅ Rendez-vous déplacé : vendredi 16 octobre à 14h. »', /✅ Rendez-vous déplacé : vendredi 16 octobre à 14h\./.test(card({ rdv: 20, avant: 'jeudi 15 octobre à 15h', choix: 2, suite: 'place' })));
  verifie('laissé : « 📅 Finalement, le rendez-vous du jeudi 15 octobre à 15h reste en place. »', /📅 Finalement, le rendez-vous du jeudi 15 octobre à 15h reste en place\./.test(card({ rdv: 20, avant: 'jeudi 15 octobre à 15h', suite: 'laisse' })));
  verifie('reproposé ou fermé : « n’est plus valable », plus de boutons', ['autres', 'ferme'].every((s) => /Cette proposition n’est plus valable\./.test(card({ rdv: 21, suite: s })) && !/<button/.test(card({ rdv: 21, suite: s }))));
  await ctx.tcRepondreProposition(22, 7);
  verifie('touchée après la fermeture (410 plus_valable) : la carte le dit', /Cette proposition n’est plus valable\./.test(card({ rdv: 22 })));

  titre('6. Après l’examen : une vraie demande n’est pas une réponse ; la suite est dite au contact');
  const rt = (nom, ph) => vm.runInContext('TC_PROPOSITION_REPONSE_' + nom + '.test(tcClasseNormaliser(' + JSON.stringify(ph) + '))', ctx);
  const poser = async (prop) => { reponses = [prop]; ctx.charlyIA.history.push({ role: 'system_info', content: 'fin' }); await ctx.tcSuivrePropositions(true); return ctx.charlyIA.history[ctx.charlyIA.history.length - 1]; };
  ctx.events = [ev('k', 'Kiné', 0, 17, 0, 18, 0, { contact: 'c2', decalage: { rdv: 201 } }), ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1', decalage: { rdv: 202 } }), ev('o', 'Occupé', 1, 11, 0, 11, 30)];
  q = await poser({ rdv_id: 201, titre: 'Kiné', remplace: 'k', etat: 'refuse', qui: 'Chloé', reference: null, debut: null, fin: null });
  const avantT = trace.traitees.length;
  const phrases = ['ajoute un autre rdv demain à 10h avec Marie', 'propose un créneau à Marie pour jeudi', 'garde-moi une place vendredi pour le sport', 'rien de spécial, merci', 'oui ajoute le dentiste demain', 'non mais rappelle-moi Paul demain', 'laisse un message à Paul'];
  const prises = [];
  for (const ph of phrases) if (await ctx.tcRepondreReponseCreneau(ph)) prises.push(ph);
  verifie('une phrase qui contient une autre demande ne répond pas à la question : rien ne part au serveur (examen 73a, défaut 1)', !prises.length && trace.traitees.length === avantT, prises.join(' / '));
  verifie('« propose d’autres moments », « Propose-lui d’autres créneaux », « d’autres moments stp », « relance-la », « propose » : d’autres moments', ['propose d’autres moments', 'Propose-lui d’autres créneaux', 'd’autres moments stp', 'relance-la', 'propose'].every((ph) => rt('AUTRES', ph)));
  verifie('« laisse-le », « Non, je le laisse où il est », « garde-le », « on le laisse comme ça », « rien », « laisse tomber » : laisser', ['laisse-le', 'Non, je le laisse où il est', 'garde-le', 'on le laisse comme ça', 'rien', 'laisse tomber', 'Je le laisse à sa place'].every((ph) => rt('LAISSER', ph)));
  verifie('« oui », « ok vas-y », « Oui, place-le », « c’est bon merci » : placer ; « non », « ok non merci » : non', ['oui', 'ok vas-y', 'Oui, place-le', 'c’est bon merci'].every((ph) => rt('PLACER', ph)) && ['non', 'ok non merci', 'non merci'].every((ph) => rt('NON', ph)) && !rt('PLACER', 'oui ajoute le dentiste demain'));
  verifie('« non » à « je propose d’autres moments ? » vaut « je le laisse » (défaut 1)', await ctx.tcRepondreReponseCreneau('non') === true && trace.decisions[trace.decisions.length - 1] === 'laisse' && !ctx.events[0].decalage);
  q = await poser({ rdv_id: 202, titre: 'Avocat', remplace: 'a', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', debut: iso(1) + ' 11:00:00', fin: iso(1) + ' 12:00:00' });
  verifie('le chevauchement est dit dans la question, avant l accord (remarque de l examen)', q.content === 'Paul Martin a choisi vendredi 16 octobre à 11h pour « Avocat ». Attention, ce créneau chevauche « Occupé ». Je le place dans ton agenda ?', q.content);
  const tout = ctx.setTimeout;
  ctx.setTimeout = (f) => { f(); return 0; };
  ctx.charlyIA.history.push({ role: 'user', content: 'ajoute le sport demain' }, { role: 'assistant', nature: 'reponse', content: 'C’est noté.' });
  ctx.tcReposerReponseCreneau(q);
  dern = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('après l autre demande, Charly repose sa question ; l ancienne n a plus de boutons', dern !== q && dern._reponseCreneau && dern._reponseCreneau.p.rdv_id === 202 && q._reponseCreneau._resolu && !/<button/.test(ctx.tcRendreReponseCreneau(q)) && /<button/.test(ctx.tcRendreReponseCreneau(dern)), dern.content);
  const q2 = dern;
  ctx.charlyIA.history.push({ role: 'user', content: 'écris à Léa' }, { role: 'assistant', nature: 'question', content: 'J’envoie ?' });
  ctx.tcReposerReponseCreneau(q2);
  ctx.setTimeout = tout;
  verifie('jamais par-dessus une autre question qui attend', ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content === 'J’envoie ?');
  verifie('et « oui » va à cette autre question, pas à « je le place ? »', await ctx.tcRepondreReponseCreneau('oui') === false && ctx.events[1].date === iso(0));
  await ctx.tcSuivrePropositions(true);
  verifie('la sonde non plus ne pose rien par-dessus « J’envoie ? »', ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content === 'J’envoie ?');
  await ctx.tcChoisirReponseCreneau(202, 'placer');
  dern = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('placé : le serveur reçoit « place », « Rendez-vous déplacé » part dans la messagerie TimeCool de Paul, c est dit', trace.decisions[trace.decisions.length - 1] === 'place' && ctx.events[1].date === iso(1) && dern.content === '✉️ Message envoyé à Paul Martin dans sa messagerie TimeCool : « Rendez-vous déplacé : ici. »', dern.content);
  verifie('profil 1 : décaler un rendez-vous avec un contact demande toujours « Je l’envoie ? »', (ctx.charlyIA.history = [], ctx.tcExecuterDeplacement([{ ev: ev('t', 'Tennis', 3, 9, 0, 10, 0, { contact: 'c1' }), p: { date: iso(3), startH: 11, startM: 0, endH: 12, endM: 0 } }]), /Je l’envoie \?/.test(ctx.charlyIA.history[0].content)) && vm.runInContext('_tcDeplacementEnAttente !== null', ctx));
  vm.runInContext('_tcDeplacementEnAttente = null', ctx);
  verifie('le rendez-vous d avant est envoyé avec la proposition (« avant »)', trace.creees.every((c) => /^[a-z]+ \d+ [a-zéû]+ à \d+h(\d\d)?$/.test(c.avant)), JSON.stringify(trace.creees.map((c) => c.avant)));


  titre('7. Profil 2 (73b) : Charly envoie seul, demande avant d’écrire, repropose seul une fois');
  const last = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  stock.tc_confiance_charly = '2';
  ctx.charlyIA.history = [];
  ctx.events = [ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1' }), ev('k', 'Kiné', 0, 17, 0, 18, 0, { contact: 'c2' }), ev('g', 'Gym', 0, 12, 0, 13, 0)];
  const nCreees = trace.creees.length, nDepl = trace.deplaces.length;
  await ctx.tcExecuterDeplacement([{ ev: ctx.events[0], p: { date: iso(2), startH: 9, startM: 0, endH: 10, endM: 0 } }, { ev: ctx.events[1], p: { date: iso(2), startH: 14, startM: 0, endH: 15, endM: 0 } }, { ev: ctx.events[2], p: { date: iso(2), startH: 18, startM: 0, endH: 19, endM: 0 } }]);
  dern = last();
  verifie('pas de « Je l’envoie ? » : les deux propositions partent, Gym (sans contact) se déplace, Avocat et Kiné restent marqués ⏳, le bilan le dit avec le bouton pour Chloé',
    !ctx.charlyIA.history.some((m) => /Je l’envoie/.test(m.content || '')) && trace.creees.length === nCreees + 2 && trace.deplaces.slice(nDepl).join() === 'g' && vm.runInContext('_tcDeplacementEnAttente', ctx) === null
    && dern._envois && dern._envois[0].nom === 'Chloé Roux' && /Envoyé dans la messagerie TimeCool : Paul Martin/.test(dern.content) && ctx.events[0].date === iso(0) && ctx.events[0].decalage && ctx.events[1].decalage, dern.content);
  const idA = ctx.events[0].decalage.rdv, idK = ctx.events[1].decalage.rdv;
  reponses = [
    { rdv_id: idA, titre: 'Avocat', remplace: 'a', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(2) + ' 09:00:00', fin: iso(2) + ' 10:00:00' },
    { rdv_id: idK, titre: 'Kiné', remplace: 'k', etat: 'choisi', qui: 'Chloé', reference: null, tours: 1, debut: iso(2) + ' 18:00:00', fin: iso(2) + ' 19:00:00' }];
  await ctx.tcSuivrePropositions(true);
  q = last();
  const l9 = ctx.tcPropositionLibelle({ date: iso(2), startH: 9, startM: 0 }), l18 = ctx.tcPropositionLibelle({ date: iso(2), startH: 18, startM: 0 });
  verifie('deux réponses arrivées : un seul accord pour le lot, le chevauchement dit dans la question', q.content === '• Paul Martin a choisi ' + l9 + ' pour « Avocat ».\n• Chloé Roux a choisi ' + l18 + ' pour « Kiné » (attention, ça chevauche « Gym »).\nJe les place dans ton agenda ?'
    && /tcChoisirReponseCreneau\(\d+, 'placer'\)"[^>]*>Oui, place-les</.test(ctx.tcRendreReponseCreneau(q)) && /Non, je les laisse où ils sont</.test(ctx.tcRendreReponseCreneau(q)), q.content);
  verifie('rien n est écrit avant ce oui', ctx.events[0].date === iso(0) && ctx.events[1].date === iso(0));
  verifie('« place-les » : les deux sont placés, chaque proposition close (« place »), Paul par sa messagerie, Chloé par un bouton « Envoyer à … »',
    await ctx.tcRepondreReponseCreneau('place-les') === true && ctx.events[0].date === iso(2) && ctx.events[1].startH === 18 && !ctx.events[0].decalage && !ctx.events[1].decalage && trace.decisions.slice(-2).join() === 'place,place'
    && last()._envois && last()._envois.length === 1 && last()._envois[0].nom === 'Chloé Roux' && /✉️ Message envoyé à Paul Martin dans sa messagerie TimeCool/.test(last().content) && /Message prêt pour Chloé Roux/.test(last().content), JSON.stringify(last()));
  ctx.events.push(ev('d', 'Dentiste', 3, 10, 0, 11, 0, { contact: 'c2', decalage: { rdv: 300 } }));
  reponses = [{ rdv_id: 300, titre: 'Dentiste', remplace: 'd', etat: 'refuse', qui: 'Chloé', reference: null, tours: 1, debut: null, fin: null }];
  const nC = trace.creees.length;
  await ctx.tcSuivrePropositions(true);
  verifie('« aucun ne me va » (1re fois) : Charly propose seul d’autres moments et le dit ; rien à trancher', ctx.charlyIA.history.some((m) => m.content === 'Chloé Roux n’a choisi aucun des créneaux proposés pour « Dentiste » : je lui propose d’autres moments.')
    && trace.creees.length === nC + 1 && trace.creees[nC].remplace === 'd' && trace.decisions[trace.decisions.length - 1] === 'autres' && ctx.tcReponseCreneauEnAttente() === null && last()._envois, JSON.stringify(last()));
  reponses = [{ rdv_id: 301, titre: 'Dentiste', remplace: 'd', etat: 'sans_reponse', qui: 'Chloé', reference: null, tours: 2, debut: null, fin: null }];
  await ctx.tcSuivrePropositions(true);
  q = last();
  verifie('la 2e fois (tours 2) : Charly demande, comme au profil 1', /^Chloé Roux n’a pas répondu depuis 24 h pour « Dentiste »\. Je propose d’autres moments, ou je laisse le rendez-vous à sa place \?$/.test(q.content), q.content);
  await ctx.tcRepondreReponseCreneau('laisse-le');
  ctx.events.push(ev('e', 'Essai', 4, 9, 0, 10, 0, { contact: 'c1', decalage: { rdv: 400 } }), ev('f', 'Foot', 4, 15, 0, 16, 0, { contact: 'c1', decalage: { rdv: 401 } }));
  reponses = [{ rdv_id: 400, titre: 'Essai', remplace: 'e', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(5) + ' 09:00:00', fin: iso(5) + ' 10:00:00' },
    { rdv_id: 401, titre: 'Foot', remplace: 'f', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(5) + ' 15:00:00', fin: iso(5) + ' 16:00:00' }];
  await ctx.tcSuivrePropositions(true);
  verifie('« je les laisse où ils sont », « non je les laisse », « place-les » : des réponses', rt('LAISSER', 'je les laisse où ils sont') && rt('LAISSER', 'non je les laisse') && rt('PLACER', 'place-les'));
  await ctx.tcRepondreReponseCreneau('Non, je les laisse où ils sont');
  verifie('laissés : rien ne bouge, « restent à leur place », chaque proposition close (« laisse »), Paul l apprend', ctx.events.find((e) => e.id === 'e').date === iso(4) && !ctx.events.find((e) => e.id === 'f').decalage
    && trace.decisions.slice(-2).join() === 'laisse,laisse' && ctx.charlyIA.history.some((m) => m.content === 'D’accord, « Essai », « Foot » restent à leur place.') && /✉️ Message envoyé à Paul Martin dans sa messagerie TimeCool : « Finalement/.test(last().content), JSON.stringify(last()));
  titre('8. Examen de la 73b : les chevauchements dans un lot');
  await ctx.tcRepondreReponseCreneau('non');
  ctx.contactsList.push({ id: 'c4', name: 'Léa Bon', referenceCompte: 'REFL' }, { id: 'c5', name: 'Max Roy', referenceCompte: 'REFM' });
  ctx.events.push(ev('l', 'Café Léa', 7, 9, 0, 10, 0, { contact: 'c4', decalage: { rdv: 600 } }), ev('m', 'Café Max', 7, 12, 0, 13, 0, { contact: 'c5', decalage: { rdv: 601 } }), ev('n', 'Café Noé', 7, 16, 0, 17, 0, { contact: 'c1', decalage: { rdv: 602 } }));
  reponses = [{ rdv_id: 600, titre: 'Café Léa', remplace: 'l', etat: 'choisi', qui: 'Léa Bon', reference: 'REFL', tours: 1, debut: iso(8) + ' 12:00:00', fin: iso(8) + ' 13:00:00' },
    { rdv_id: 601, titre: 'Café Max', remplace: 'm', etat: 'choisi', qui: 'Max Roy', reference: 'REFM', tours: 1, debut: iso(8) + ' 12:00:00', fin: iso(8) + ' 13:00:00' },
    { rdv_id: 602, titre: 'Café Noé', remplace: 'n', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(7) + ' 12:30:00', fin: iso(7) + ' 13:30:00' }];
  await ctx.tcSuivrePropositions(true);
  q = last();
  const lignesQ = q.content.split('\n');
  verifie('Léa et Max ont choisi le même moment : la question le dit sur les deux lignes', /pour « Café Léa » \(attention, ça chevauche « Café Max »\)\.$/.test(lignesQ[0]) && /pour « Café Max » \(attention, ça chevauche « Café Léa »\)\.$/.test(lignesQ[1]), q.content);
  verifie('Noé prend l ancienne place de « Café Max », qui va bouger : pas d alerte (remarque 1)', /pour « Café Noé »\.$/.test(lignesQ[2]), lignesQ[2]);
  await ctx.tcRepondreReponseCreneau('oui');
  verifie('« oui » : placés, et l alerte le redit une seule fois pour la paire', ctx.charlyIA.history.some((m) => m.content === '⚠️ Attention, ça chevauche : « Café Léa » et « Café Max ».'), JSON.stringify(ctx.charlyIA.history.slice(-4).map((m) => m.content)));
  ctx.events.push(ev('h', 'Hockey', 5, 9, 0, 10, 0, { contact: 'c1', decalage: { rdv: 500 } }));
  reponses = [{ rdv_id: 500, titre: 'Hockey', remplace: 'h', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(6) + ' 09:00:00', fin: iso(6) + ' 10:00:00' }];
  await ctx.tcSuivrePropositions(true);
  verifie('une seule réponse : la question simple « Je le place dans ton agenda ? »', /a choisi .* pour « Hockey »\. Je le place dans ton agenda \?$/.test(last().content) && !last()._reponseCreneau.lot, last().content);
  delete stock.tc_confiance_charly;

  titre('9. Profil 3 (73c) : tout seul, puis un compte rendu ; deux contacts sur le même créneau ; les messages partent seuls');
  stock.tc_confiance_charly = '3';
  ctx.charlyIA.history = [];
  ctx.events = [ev('a', 'Avocat', 0, 15, 0, 16, 0, { contact: 'c1', decalage: { rdv: 700 } }), ev('k', 'Kiné', 0, 17, 0, 18, 0, { contact: 'c2', decalage: { rdv: 701 } }),
    ev('d', 'Dentiste', 1, 10, 0, 11, 0, { contact: 'c2', decalage: { rdv: 702 } }), ev('z', 'Zen', 1, 14, 0, 15, 0, { contact: 'c1', decalage: { rdv: 703 } })];
  const lot3 = () => [
    { rdv_id: 700, titre: 'Avocat', remplace: 'a', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(3) + ' 09:00:00', fin: iso(3) + ' 10:00:00', pris: [] },
    { rdv_id: 701, titre: 'Kiné', remplace: 'k', etat: 'choisi', qui: 'Chloé', reference: null, tours: 1, debut: iso(3) + ' 14:00:00', fin: iso(3) + ' 15:00:00', pris: [{ libelle: 'mardi à 9h', par: 'Paul Martin' }] },
    { rdv_id: 702, titre: 'Dentiste', remplace: 'd', etat: 'refuse', qui: 'Chloé', reference: null, tours: 1, debut: null, fin: null, pris: [] },
    { rdv_id: 703, titre: 'Zen', remplace: 'z', etat: 'sans_reponse', qui: 'Paul Martin', reference: 'REFP', tours: 2, debut: null, fin: null, pris: [] }];
  reponses = lot3();
  const nCr = trace.creees.length, nDec = trace.decisions.length;
  await ctx.tcSuivrePropositions(true);
  const cr3 = last();
  verifie('aucune question : Avocat et Kiné placés, Dentiste reproposé (1er tour), Zen laissé (2e tour) ; décisions place, place, autres, laisse',
    !ctx.charlyIA.history.some((m) => m.nature === 'question') && ctx.events[0].date === iso(3) && ctx.events[1].date === iso(3) && ctx.events[1].startH === 14
    && trace.creees.length === nCr + 1 && trace.creees[nCr].remplace === 'd' && trace.decisions.slice(nDec).join() === 'place,place,autres,laisse' && !ctx.events[3].decalage && ctx.events[2].decalage, trace.decisions.slice(nDec).join());
  verifie('une seule carte « 📋 Compte rendu de Charly » : déplacés, reproposé, laissé, ce qui attend, le créneau pris dit', cr3._compteRendu && /^📋 Compte rendu de Charly\n/.test(cr3.content)
    && /• Déplacé : « Avocat »\n/.test(cr3.content) && /• Déplacé : « Kiné » \(Paul Martin avait déjà pris mardi à 9h\)/.test(cr3.content) && /• Reproposé à Chloé Roux : « Dentiste »/.test(cr3.content)
    && /• Laissé à sa place : « Zen » \(aucun créneau retenu après deux propositions\)/.test(cr3.content) && /• En attente d’une réponse : 1 rendez-vous/.test(cr3.content) && /remets-les/.test(cr3.content), cr3.content);
  verifie('les contacts l apprennent dans la même carte : Paul par sa messagerie, Chloé par deux boutons (le nouveau lien, le « déplacé »)', /✉️ Message envoyé à Paul Martin dans sa messagerie TimeCool : « Rendez-vous déplacé : ici\. »/.test(cr3.content)
    && cr3._envois && cr3._envois.length === 2 && cr3._envois.some((e) => e.texte === 'Rendez-vous déplacé : ici.') && cr3._envois.some((e) => /rdv\/ABCD2345$/.test(e.texte)), JSON.stringify(cr3._envois));
  const nH = ctx.charlyIA.history.length;
  reponses = lot3().slice(0, 1);
  await ctx.tcSuivrePropositions(true);
  verifie('ce qui est traité ne revient pas (la carte le marque)', ctx.charlyIA.history.length === nH);

  stock.tc_confiance_charly = '1';
  ctx.charlyIA.history = [];
  ctx.events.push(ev('m2', 'Marie', 2, 9, 0, 10, 0, { contact: 'c2', decalage: { rdv: 710 } }));
  const pris = [{ libelle: 'mardi à 10h', par: 'Paul Martin' }];
  reponses = [{ rdv_id: 710, titre: 'Marie', remplace: 'm2', etat: 'choisi', qui: 'Marie', reference: null, tours: 1, debut: iso(4) + ' 11:00:00', fin: iso(4) + ' 12:00:00', pris: pris }];
  await ctx.tcSuivrePropositions(true);
  verifie('profil 1 : « Marie a choisi … pour « Marie » (Paul Martin avait déjà pris mardi à 10h). Je le place dans ton agenda ? »', /^Marie a choisi .* pour « Marie » \(Paul Martin avait déjà pris mardi à 10h\)\. Je le place dans ton agenda \?$/.test(last().content), last().content);
  await ctx.tcRepondreReponseCreneau('non');
  reponses = [{ rdv_id: 711, titre: 'Marie', remplace: 'm2', etat: 'refuse', qui: 'Marie', reference: null, tours: 1, debut: null, fin: null, pris: pris, tous_pris: true }];
  await ctx.tcSuivrePropositions(true);
  verifie('tous pris : « Paul Martin a pris mardi à 10h : plus aucun créneau proposé n’est libre pour Marie (« Marie »). Je propose d’autres moments… ? »', last().content === 'Paul Martin a pris mardi à 10h : plus aucun créneau proposé n’est libre pour Marie (« Marie »). Je propose d’autres moments, ou je laisse le rendez-vous à sa place ?', last().content);
  await ctx.tcRepondreReponseCreneau('non');
  stock.tc_confiance_charly = '2';
  reponses = [{ rdv_id: 712, titre: 'Marie', remplace: 'm2', etat: 'refuse', qui: 'Marie', reference: null, tours: 1, debut: null, fin: null, pris: pris, tous_pris: true }];
  await ctx.tcSuivrePropositions(true);
  verifie('profil 2 : « Paul Martin a pris mardi à 10h : je repropose à Marie d’autres moments pour « Marie ». » (chef)', ctx.charlyIA.history.some((m) => m.content === 'Paul Martin a pris mardi à 10h : je repropose à Marie d’autres moments pour « Marie ».'));
  const carteP = (o) => ctx.tcCadrePropositionCreneaux(Object.assign({}, p, o), 'Inès Martin');
  verifie('carte du contact : un créneau pris n est plus proposé, elle le dit', /Ce créneau vient d’être pris : choisis-en un autre\./.test(carteP({ rdv: 30, pris: [1] })) && !/tcRepondreProposition\(30, 1\)/.test(carteP({ rdv: 30, pris: [1] })) && /tcRepondreProposition\(30, 2\)/.test(carteP({ rdv: 30, pris: [1] })));
  verifie('tous pris : « Les créneaux proposés viennent d’être pris : Inès en est informé(e). », plus de boutons', /Les créneaux proposés viennent d’être pris : Inès en est informé\(e\)\./.test(carteP({ rdv: 31, pris: [1, 2] })) && !/<button/.test(carteP({ rdv: 31, pris: [1, 2] })));

  const paul = { name: 'Paul Martin', referenceCompte: 'REFP' };
  stock.tc_confiance_charly = '1'; ctx.charlyIA.history = [];
  await ctx.tcProposerEnvoi(paul, 'Je serai en retard.', false, { retardDe: { title: 'Avocat' } });
  verifie('profil 1 : « J’envoie ? » posé, rien ne part', /J’envoie \?/.test(last().content) && trace.prevenances.length === 0);
  stock.tc_confiance_charly = '2'; ctx.charlyIA.history = [];
  await ctx.tcProposerEnvoi(paul, 'Je serai en retard.', false, { retardDe: { title: 'Avocat' } });
  verifie('profil 2 : le message part seul, Charly le dit avec le texte', trace.prevenances.length === 1 && ctx.charlyIA.history.some((m) => m.content === 'C’est envoyé à Paul Martin. « Je serai en retard. »') && !ctx.charlyIA.history.some((m) => m.nature === 'question'), JSON.stringify(ctx.charlyIA.history));
  ctx.charlyIA.history = [];
  await ctx.tcProposerEnvoi(paul, 'J’annule.', false, { supprimer: { id: 'x', title: 'X' } });
  verifie('profil 2 : un envoi qui supprime un rendez-vous attend le oui (dernière étape : l’agenda)', /J’envoie \?/.test(last().content) && trace.prevenances.length === 1);
  stock.tc_confiance_charly = '3'; ctx.charlyIA.history = [];
  await ctx.tcProposerEnvoi(paul, 'J’annule.', false, { supprimer: { id: 'x', title: 'X' } });
  verifie('profil 3 : il part seul, même avec la suppression', trace.prevenances.length === 2 && !ctx.charlyIA.history.some((m) => m.nature === 'question'));
  titre('10. Examen de la 73c : la connexion manque au moment de clore ; « remets-les » prévient');
  stock.tc_confiance_charly = '3'; ctx.charlyIA.history = [];
  ctx.events = [ev('l', 'Déj Léa', 2, 12, 0, 13, 0, { contact: 'c4', decalage: { rdv: 800 } })];
  const lea = () => [{ rdv_id: 800, titre: 'Déj Léa', remplace: 'l', etat: 'choisi', qui: 'Léa Bon', reference: 'REFL', tours: 1, debut: iso(3) + ' 12:00:00', fin: iso(3) + ' 13:00:00', pris: [] }];
  reponses = lea(); trace.panne = 800;
  const nDep = trace.deplaces.length;
  await ctx.tcSuivrePropositions(true);
  verifie('panne sur traiter : le rendez-vous est déplacé, et le compte rendu dit « Je n’ai pas pu prévenir Léa Bon, je réessaie. »', ctx.events[0].date === iso(3) && /• Je n’ai pas pu prévenir Léa Bon, je réessaie\./.test(last().content) && last()._traites.indexOf(800) < 0, last().content);
  verifie('la proposition attend d’être close, gardée sur l’appareil', vm.runInContext('_tcAClore.length === 1 && _tcAClore[0].id === 800 && _tcAClore[0].decision === "place"', ctx) && /"id":800/.test(stock.tc_propositions_a_clore || ''));
  const nHist = ctx.charlyIA.history.length;
  await ctx.tcSuivrePropositions(false);
  verifie('panne encore : rien n’est redéplacé, pas de nouvelle carte', trace.deplaces.length === nDep + 1 && ctx.charlyIA.history.length === nHist, trace.deplaces.length - nDep);
  trace.panne = null;
  await ctx.tcSuivrePropositions(false);
  verifie('la connexion revient : traiter part une fois (« place »), Léa est prévenue, c’est dit ; rien n’est redéplacé', trace.decisions[trace.decisions.length - 1] === 'place' && trace.deplaces.length === nDep + 1 && vm.runInContext('_tcAClore.length', ctx) === 0
    && ctx.charlyIA.history.some((m) => m.content === 'La connexion est revenue : je préviens Léa Bon.') && /✉️ Message envoyé à Léa Bon dans sa messagerie TimeCool/.test(last().content), JSON.stringify(ctx.charlyIA.history.slice(-2)));
  trace.panne = 801;
  ctx.tcEchecClore({ rdv_id: 801, qui: 'Max Roy' }, null, 'laisse', false);
  for (let i = 0; i < 6; i++) await ctx.tcCloreEnAttente();
  verifie('5 essais manqués : « Je n’ai toujours pas pu prévenir Max Roy : je réessaierai à la prochaine ouverture de TimeCool. », une seule fois', ctx.charlyIA.history.filter((m) => m.content === '⚠️ Je n’ai toujours pas pu prévenir Max Roy : je réessaierai à la prochaine ouverture de TimeCool.').length === 1);
  vm.runInContext('_tcAClore = []', ctx); trace.panne = null;
  stock.tc_confiance_charly = '1'; ctx.charlyIA.history = [];
  ctx.events.push(ev('o2', 'Opéra', 4, 20, 0, 21, 0, { contact: 'c1', decalage: { rdv: 810 } }));
  reponses = [{ rdv_id: 810, titre: 'Opéra', remplace: 'o2', etat: 'choisi', qui: 'Paul Martin', reference: 'REFP', tours: 1, debut: iso(5) + ' 18:00:00', fin: iso(5) + ' 19:00:00', pris: [] }];
  await ctx.tcSuivrePropositions(true);
  trace.panne = 810;
  await ctx.tcRepondreReponseCreneau('oui');
  verifie('profil 1, panne au « oui » : placé, et « ⚠️ Je n’ai pas pu prévenir Paul Martin, je réessaie. »', ctx.events[1].date === iso(5) && ctx.charlyIA.history.some((m) => m.content === '⚠️ Je n’ai pas pu prévenir Paul Martin, je réessaie.') && vm.runInContext('_tcAClore.length', ctx) === 1);
  trace.panne = null; vm.runInContext('_tcAClore = []', ctx);
  vm.runInContext('_tcMarcheArriere = { type: "deplacement", rdvs: [{ id: "q1" }, { id: "q2" }, { id: "q3" }] }', ctx);
  ctx.events.push(ev('q1', 'Q1', 6, 9, 0, 10, 0, { contact: 'c1' }), ev('q2', 'Q2', 6, 11, 0, 12, 0, { contact: 'c2' }), ev('q3', 'Q3', 6, 14, 0, 15, 0, { contact: 'c4' }));
  ctx.tcNoterPourMarcheArriere({ rdv_id: 901, qui: 'Paul Martin' }, ctx.events.find((e) => e.id === 'q1'));
  ctx.tcNoterPourMarcheArriere({ rdv_id: 902, qui: 'Chloé' }, ctx.events.find((e) => e.id === 'q2'));
  ctx.tcNoterPourMarcheArriere({ rdv_id: 903, qui: 'Léa Bon' }, ctx.events.find((e) => e.id === 'q3'));
  ctx.tcEchecClore({ rdv_id: 903, qui: 'Léa Bon' }, ctx.events.find((e) => e.id === 'q3'), 'place', false);
  verifie('les créneaux placés sont notés pour « remets-les » (et le « pense à prévenir » manuel ne vaut plus pour eux)', vm.runInContext('_tcMarcheArriere.propositions.length === 3 && _tcMarcheArriere.prevenus.length === 0', ctx));
  ctx.charlyIA.history = [];
  await ctx.tcMaintenirPropositions(vm.runInContext('_tcMarcheArriere.propositions', ctx));
  verifie('« remets-les » : Paul (messagerie) et Chloé (bouton) lisent « Finalement, le rendez-vous du … est maintenu. »', trace.maintenus.join() === '901,902' && /✉️ Message envoyé à Paul Martin dans sa messagerie TimeCool : « Finalement, le rendez-vous du jeudi 15 octobre à 15h est maintenu\. »/.test(last().content)
    && last()._envois && last()._envois[0].nom === 'Chloé Roux' && last()._envois[0].texte === 'Finalement, le rendez-vous du jeudi 15 octobre à 15h est maintenu.', JSON.stringify(last()));
  verifie('Léa n’avait rien reçu (connexion manquée) : pas de « maintenu » ; sa proposition se ferme en « laissé »', trace.maintenus.indexOf(903) < 0 && vm.runInContext('_tcAClore.length === 1 && _tcAClore[0].decision === "laisse"', ctx));
  verifie('tcMarcheArriere appelle tcMaintenirPropositions pour les créneaux placés', /if \(Array\.isArray\(m\.propositions\) && m\.propositions\.length && typeof tcMaintenirPropositions === 'function'\) await tcMaintenirPropositions\(m\.propositions\);/.test(extraire('tcMarcheArriere') || ''));
  vm.runInContext('_tcAClore = []; _tcMarcheArriere = null', ctx);
  verifie('profil 3 : le questionnaire saute « Oui, vas-y » ; ses questions de cadrage restent', page.indexOf("if (etape === TC_ETAPE_RECAP && typeof tcConfianceCharly === 'function' && (tcConfianceCharly() === 3 || ") > -1);
  delete stock.tc_confiance_charly;

  titre('11. Campagne TESTEURS du 03/11 : créneaux hors indisponibilité, profil 2, bilan par profil, marche arrière du lot, nom de la fiche');
  const lignesDe = () => ctx.tcLignesPropositions({ details: ['• x'], proposes: [], envois: [], echecs: [], sansMoyen: [] });
  stock.tc_confiance_charly = '3';
  verifie('profil 3 : le bilan dit « je place le créneau choisi dans ton agenda et je te fais un compte rendu »', lignesDe().some((l) => /Quand elle arrive, je place le créneau choisi dans ton agenda et je te fais un compte rendu\.$/.test(l)), lignesDe().join(' / '));
  stock.tc_confiance_charly = '2';
  verifie('profils 1 et 2 : « je te demande avant de l’écrire dans ton agenda »', lignesDe().some((l) => /Quand elle arrive, je te demande avant de l’écrire dans ton agenda\.$/.test(l)) && (stock.tc_confiance_charly = '1', lignesDe().some((l) => /je te demande avant de l’écrire/.test(l))));
  verifie('profil 2 : le questionnaire saute « Oui, vas-y » quand Charly propose aux contacts ; il le garde pour le reste (supprimer, prévenir soi-même)', page.indexOf("(tcConfianceCharly() === 2 && q.reponses.action === 'decaler' && q.reponses.prevenir === 'charly'))) { q.reponses.recap = 'oui'; continue; }") > -1);
  const em = ev('m1', 'Malade', 1, 10, 0, 11, 0, { contact: 'c1', lotDecalage: { id: 'L1', apres: iso(2) } });
  ctx.events = [em];
  const r1 = ctx.tcCreneauxReproposes(em);
  verifie('créneaux reproposés : jamais avant le premier jour possible du lot (le jour malade, même libéré)', r1.length === 3 && r1.every((c) => c.date >= iso(2)), JSON.stringify(r1));
  const en = ev('m2', 'Sans lot', 1, 10, 0, 11, 0, { contact: 'c1' });
  ctx.events = [en];
  const r2 = ctx.tcCreneauxReproposes(en);
  verifie('sans lot : dès demain, jamais la place actuelle du rendez-vous', r2.length === 3 && r2[0].date === iso(1) && !r2.some((c) => c.date === iso(1) && c.startH === 10), JSON.stringify(r2));
  const el = ev('m3', 'Lot', 1, 9, 0, 10, 0, { contact: 'c1' });
  ctx.events = [el];
  await ctx.tcProposerLesCreneaux([{ ev: el, p: { date: iso(3), startH: 9, startM: 0, endH: 10, endM: 0 } }], { lot: 'L7', apres: iso(3) });
  verifie('le lot et son premier jour sont gardés sur le rendez-vous', !!el.lotDecalage && el.lotDecalage.id === 'L7' && el.lotDecalage.apres === iso(3), JSON.stringify(el.lotDecalage));
  await ctx.tcEnvoyerPropositions([{ ev: el, contact: ctx.contactsList[0], creneaux: ctx.tcCreneauxReproposes(el) }]);
  verifie('un nouveau tour garde le lot ; ses créneaux restent après le premier jour', el.lotDecalage.id === 'L7' && trace.creees[trace.creees.length - 1].creneaux.every((c) => c.debut.slice(0, 10) >= iso(3)), JSON.stringify(trace.creees[trace.creees.length - 1].creneaux));
  const ex = extraire('tcExecuterReponseCreneau') || '', ts = extraire('tcTraiterSeul') || '', qe = extraire('tcQuestionnaireExecuter') || '';
  verifie('les nouveaux tours (profils 1, 2 et 3) passent par tcCreneauxReproposes ; le questionnaire donne au lot son premier jour', ex.indexOf('tcCreneauxReproposes(ev)') > -1 && ts.indexOf('tcCreneauxReproposes(x.ev)') > -1 && qe.indexOf('await tcProposerLesCreneaux(aProposer, { apres: r._depuis || null, lot: lotId })') > -1 && page.indexOf('r._depuis = tcISO(depuisMalade);') > -1);
  ctx.addDemarche = () => {};
  vm.runInContext(extraire('tcAppliquerDeplacement'), ctx);
  const a1 = ev('a1', 'A1', 2, 9, 0, 10, 0, { contact: 'c1', lotDecalage: { id: 'L9' } }), a2 = ev('a2', 'A2', 2, 11, 0, 12, 0, { contact: 'c2', lotDecalage: { id: 'L9' } }), sp = ev('sp', 'Sport', 2, 17, 0, 18, 0);
  ctx.events = [a1, a2, sp];
  ctx.tcAppliquerDeplacement([{ ev: sp, p: { date: iso(4), startH: 9, startM: 0, endH: 10, endM: 0 } }], { silencieux: true });
  vm.runInContext('_tcMarcheArriere.lot = "L9"', ctx);
  ctx.tcDeplacerDansLeLot([{ ev: a1, p: { date: iso(5), startH: 9, startM: 0, endH: 10, endM: 0 } }]);
  ctx.tcNoterPourMarcheArriere({ rdv_id: 501, qui: 'Paul Martin' }, a1);
  ctx.tcDeplacerDansLeLot([{ ev: a2, p: { date: iso(5), startH: 11, startM: 0, endH: 12, endM: 0 } }]);
  ctx.tcNoterPourMarcheArriere({ rdv_id: 502, qui: 'Chloé Roux' }, a2);
  const ma = vm.runInContext('_tcMarcheArriere', ctx);
  verifie('profil 1, deux « Oui, place-le » du même lot : « remets-les » garde les trois rendez-vous (Sport compris), chacun à sa place d’avant, et les deux créneaux placés (« maintenu » à chacun)', ma.lot === 'L9' && ma.rdvs.map((r) => r.id + '@' + r.date + ' ' + r.startH).join() === ['sp@' + iso(2) + ' 17', 'a1@' + iso(2) + ' 9', 'a2@' + iso(2) + ' 11'].join() && ma.propositions.map((x) => x.p.rdv_id).join() === '501,502', JSON.stringify(ma));
  const b1 = ev('b1', 'B1', 3, 9, 0, 10, 0, { contact: 'c1', lotDecalage: { id: 'L10' } });
  ctx.events.push(b1);
  ctx.tcDeplacerDansLeLot([{ ev: b1, p: { date: iso(6), startH: 9, startM: 0, endH: 10, endM: 0 } }]);
  verifie('un autre lot repart de zéro', vm.runInContext('_tcMarcheArriere.rdvs.length === 1 && _tcMarcheArriere.lot === "L10" && !_tcMarcheArriere.propositions', ctx));
  verifie('les trois chemins qui placent (un créneau, un lot, le profil 3) passent par tcDeplacerDansLeLot', page.split('tcDeplacerDansLeLot(').length - 1 === 4 && ex.indexOf('tcDeplacerDansLeLot([{ ev: ev, p: c }]);') > -1 && ts.indexOf('tcDeplacerDansLeLot(presents.map(') > -1 && (extraire('tcExecuterLotCreneaux') || '').indexOf('tcDeplacerDansLeLot(liste);') > -1);
  vm.runInContext('_tcMarcheArriere = null', ctx);
  ctx.contactsList.push({ id: 'cg', name: 'Gaëlle Perrin', referenceCompte: 'REFG' }, { id: 'cj', name: 'Jules Fictif', phone: '07' });
  ctx.events = [ev('g1', 'Visite Gaëlle', 2, 9, 0, 10, 0, { contact: 'cg', decalage: { rdv: 601 } })];
  const ln = ctx.tcNomsDeFiche([{ rdv_id: 601, remplace: 'g1', qui: 'Gaelle Perrin', pris: [{ libelle: 'x', par: 'Gaelle Perrin' }, { libelle: 'y', par: 'Jules' }] }, { rdv_id: 602, remplace: 'zz', qui: 'Jules' }]);
  verifie('le nom de la fiche contact, jamais celui du compte : « Gaëlle Perrin » (pas « Gaelle Perrin »), « Jules Fictif » (pas « Jules »), aussi dans « … avait déjà pris »', ln[0].qui === 'Gaëlle Perrin' && ln[0].pris[0].par === 'Gaëlle Perrin' && ln[0].pris[1].par === 'Jules Fictif' && ln[1].qui === 'Jules Fictif', JSON.stringify(ln));
  verifie('tcSuivrePropositions prend les noms de la fiche dès la lecture', /try \{ liste = await TC_BACKEND\.propositions\(\); \} catch \(e\) \{ liste = \[\]; \}\s+tcNomsDeFiche\(liste\);/.test(extraire('tcSuivrePropositions') || ''));
  ctx.contactsList.splice(2);
  delete stock.tc_confiance_charly;

  console.log('');
  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO exception ' + e.stack); console.log((ko + 1) + ' anomalie(s).'); process.exit(1); });
