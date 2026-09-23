// Un rendez-vous sait-il avec qui il est, et peut-on prevenir ?
//
// Trois pannes seraient silencieuses et couteuses : relier le premier
// des douze Michel sans rien demander, annoncer « Michel prevenu(e) »
// alors que rien n'est parti, et perdre le lien des rendez-vous
// d'avant en changeant la facon de les retrouver.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  const asy = page.indexOf('async function ' + nom + '(');
  const debut = asy > -1 ? asy : page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

let envoyes = [];          // ce qui est parti par TimeCool
let ouvertures = [];       // ce que le telephone a ouvert
let traces = [];           // ce qui est ecrit dans la conversation locale
let toasts = [];
let echecReseau = false;

const ctx = {
  console, Date, JSON, RegExp, String, Array, Math, parseInt, isNaN,
  contactsList: [], events: [], mode: 'user',
  charlyIA: { history: [] },
  _prevenirName: '',
  escapeHTMLSafe: (t) => String(t == null ? '' : t),
  escapeHTML: (t) => String(t == null ? '' : t),
  showToast: (t) => { toasts.push(t); },
  sendPrevenirMessage: (nom, texte) => { traces.push({ nom, texte }); },
  tcLienSms: (num, txt) => 'sms:' + String(num).replace(/\s/g, '') + '?body=' + encodeURIComponent(txt),
  encodeURIComponent,
  tcLangueForceePour: () => null,
  TC_BACKEND: {
    envoyerMessage: async (ref, texte) => {
      if (echecReseau) throw new Error('reseau');
      envoyes.push({ ref, texte });
      return true;
    }
  },
  window: { get location() { return ctx._loc; }, set location(v) { ctx._loc = v; } },
  _loc: { set href(u) { ouvertures.push(u); }, get href() { return ''; } }
};
ctx.window.location = ctx._loc;
vm.createContext(ctx);

['tcSansAccents', 'tcDernierRdvParContact', 'tcClasserContacts', 'tcResoudreContact',
 'tcContactsPourRdv', 'tcContactDuRdv', 'tcContactDeProposition', 'tcLigneContactProposition',
 'extractAgendaProposals', 'findUpcomingEventForContact', 'tcTransmettrePrevenance',
 'tcDirePrevenance'].forEach((n) => {
  const src = extraire(n);
  if (src) {
    try { vm.runInContext(src, ctx); }
    catch (e) { ko++; console.log('  KO  ' + n + ' : ' + e.message); }
  } else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

/* ── Un carnet avec ce qui fait mal : des homonymes ───────────── */
function carnet() {
  ctx.contactsList = [
    { id: 'c1', name: 'Michel Dupont',      phone: '06 11 11 11 11' },
    { id: 'c2', name: 'Michel Berger',      email: 'mb@ex.fr', referenceCompte: 'REF-MB' },
    { id: 'c3', name: 'Jean-Michel Aubert', phone: '06 33 33 33 33' },
    { id: 'c4', name: 'Michèle Carmin',     phone: '06 44 44 44 44' },
    { id: 'c5', name: 'Carmichel Sanchez',  phone: '06 55 55 55 55' },
    { id: 'c6', name: 'Sophie Anceau' }
  ];
  ctx.events = [];
  envoyes = []; ouvertures = []; traces = []; toasts = []; echecReseau = false;
}

titre('Retrouver la personne dans trois mille contacts');
{
  carnet();
  const trouves = ctx.tcResoudreContact('Michel').map((c) => c.id);
  verifie('« Michel » trouve les Michel', trouves.indexOf('c1') > -1 && trouves.indexOf('c2') > -1);
  verifie('et les Jean-Michel', trouves.indexOf('c3') > -1,
    'le prenom compose reste un Michel');
  verifie('mais pas Carmichel', trouves.indexOf('c5') === -1,
    'sinon un prenom court ramenerait la moitie du carnet');
  verifie('« Michele » trouve « Michèle »',
    ctx.tcResoudreContact('Michele').some((c) => c.id === 'c4'),
    'personne ne tape les accents');
  verifie('un nom complet reste precis',
    ctx.tcResoudreContact('Michel Dupont').length === 1);
  verifie('un nom inconnu ne trouve rien',
    ctx.tcResoudreContact('Gontran').length === 0);
  verifie('un nom vide non plus, sans planter',
    ctx.tcResoudreContact('').length === 0 && ctx.tcResoudreContact(null).length === 0);
}

titre('Le plus probable en tete');
{
  carnet();
  ctx.events = [
    { date: '2026-09-01', contact: 'c3', mode: 'user', title: 'x' },
    { date: '2026-09-20', contact: 'c1', mode: 'user', title: 'y' }
  ];
  const ordre = ctx.tcResoudreContact('Michel').map((c) => c.id);
  verifie('celui vu le plus recemment passe devant', ordre[0] === 'c1', ordre.join(' > '));
  verifie('puis l autre deja rencontre', ordre[1] === 'c3', ordre.join(' > '));
  verifie('puis celui qui est sur TimeCool', ordre[2] === 'c2', ordre.join(' > '));
}

titre('Douze Michel : on ne devine pas');
{
  carnet();
  const p = { contact: 'Michel' };
  verifie('aucun n est choisi tout seul',
    ctx.tcContactDeProposition({}, p) === null,
    'relier le premier venu enverrait l annulation a un inconnu');
  const ligne = ctx.tcLigneContactProposition({}, p, 't1');
  verifie('la carte propose de choisir', ligne.indexOf('choisir') > -1);
  // Quatre : les trois Michel, et Michele dont « Michel » est le debut.
  // C'est voulu — il s'agit de faire choisir, pas de deviner.
  verifie('et dit combien ils sont', ligne.indexOf('4 contacts') > -1, ligne.slice(0, 120));

  const msg = { _contacts: { michel: 'c2' } };
  verifie('une fois designe, c est lui',
    ctx.tcContactDeProposition(msg, p).id === 'c2');
  verifie('et la carte le montre',
    ctx.tcLigneContactProposition(msg, p, 't1').indexOf('Michel Berger') > -1);
}

titre('Un seul Michel : on relie, mais on le montre');
{
  carnet();
  const p = { contact: 'Sophie' };
  verifie('le seul possible est retenu',
    ctx.tcContactDeProposition({}, p) && ctx.tcContactDeProposition({}, p).id === 'c6');
  const ligne = ctx.tcLigneContactProposition({}, p, 't1');
  verifie('son nom est affiche', ligne.indexOf('Sophie Anceau') > -1,
    'pour se corriger d un doigt si ce n est pas la bonne');
  verifie('et il reste changeable', ligne.indexOf('changer') > -1);
}

titre('Aucun Michel : le rendez-vous se cree quand meme');
{
  carnet();
  const p = { contact: 'Gontran' };
  verifie('personne n est relie', ctx.tcContactDeProposition({}, p) === null);
  verifie('et on le dit sans bloquer',
    ctx.tcLigneContactProposition({}, p, 't1').indexOf('pas dans tes contacts') > -1);
  verifie('une proposition sans personne n affiche rien',
    ctx.tcLigneContactProposition({}, { title: 'Dentiste' }, 't1') === '');
}

titre('Ce que Charly ecrit, et ce qu on en lit');
{
  const bloc = '[AGENDA]\n'
    + '2026-09-24 | 14:00-15:00 | Rendez-vous dentiste | rdv | 37 rue Cartier-Bresson | Michel\n'
    + '[/AGENDA]';
  const p = ctx.extractAgendaProposals(bloc)[0];
  verifie('le contact est lu', p && p.contact === 'Michel', p ? String(p.contact) : 'rien');
  verifie('le lieu aussi', p && p.lieu === '37 rue Cartier-Bresson');
  verifie('le titre n a pas mange le reste', p && p.title === 'Rendez-vous dentiste');

  const sansLieu = ctx.extractAgendaProposals(
    '[AGENDA]\n2026-09-24 | 14:00-15:00 | Dentiste | rdv | - | Michel\n[/AGENDA]')[0];
  verifie('le tiret ne devient pas une adresse', sansLieu && sansLieu.lieu === null,
    'sinon « Y aller » ouvrirait une carte sur un tiret');
  verifie('et le contact est quand meme la', sansLieu && sansLieu.contact === 'Michel');

  const ancien = ctx.extractAgendaProposals(
    '[AGENDA]\n2026-09-24 | 14:00-15:00 | Dentiste | rdv | 12 rue de Paris\n[/AGENDA]')[0];
  verifie('les lignes sans contact restent comprises',
    ancien && ancien.lieu === '12 rue de Paris' && !ancien.contact,
    'tout l historique est ecrit dans cet ancien format');

  const nu = ctx.extractAgendaProposals('[AGENDA]\n2026-09-24 | 14:00-15:00 | Dentiste | rdv\n[/AGENDA]')[0];
  verifie('et les plus courtes aussi', nu && nu.title === 'Dentiste' && !nu.lieu && !nu.contact);
}

titre('Retrouver le prochain rendez-vous avec quelqu un');
{
  carnet();
  const demain = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const hier = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  ctx.events = [
    { date: hier,   contact: 'c1', mode: 'user', title: 'Passe', startH: 9, startM: 0 },
    { date: demain, contact: 'c1', mode: 'user', title: 'Dentiste', startH: 14, startM: 0 },
    { date: demain, title: 'Michel Dupont', mode: 'user', startH: 8, startM: 0 }
  ];
  const t = ctx.findUpcomingEventForContact(ctx.contactsList[0]);
  verifie('on le trouve par sa reference', t && t.title === 'Dentiste',
    t ? t.title : 'rien');
  verifie('le passe est ignore', !t || t.date >= demain);

  ctx.events = [{ date: demain, title: 'Michel Dupont', mode: 'user', startH: 8, startM: 0 }];
  const ancien = ctx.findUpcomingEventForContact(ctx.contactsList[0]);
  verifie('les rendez-vous d avant restent trouvables par leur titre',
    ancien && ancien.title === 'Michel Dupont',
    'des milliers existent deja, crees avant que le lien existe');

  ctx.events = [];
  verifie('et rien ne casse quand il n y en a pas',
    ctx.findUpcomingEventForContact(ctx.contactsList[0]) === null);
}

titre('Le message part vraiment');
{
  carnet();
  return ctx.tcTransmettrePrevenance(ctx.contactsList[1], 'Je serai en retard').then((chemin) => {
    verifie('sur TimeCool, il part par la messagerie', chemin === 'timecool', chemin);
    verifie('et arrive bien au bon compte',
      envoyes.length === 1 && envoyes[0].ref === 'REF-MB');
    verifie('avec une trace dans la conversation', traces.length === 1);
    return suiteSms();
  });
}

function suiteSms() {
  carnet();
  return ctx.tcTransmettrePrevenance(ctx.contactsList[0], 'Je serai en retard').then((chemin) => {
    verifie('sans TimeCool, le telephone prend le relais', chemin === 'sms', chemin);
    verifie('l application SMS s ouvre avec le texte',
      ouvertures.length === 1 && ouvertures[0].indexOf('sms:') === 0
      && ouvertures[0].indexOf('retard') > -1,
      ouvertures[0] || 'rien');
    verifie('rien n a ete envoye par le serveur', envoyes.length === 0,
      'ce contact n est pas sur TimeCool');
    return suiteEmail();
  });
}

function suiteEmail() {
  carnet();
  const sansTel = { id: 'cx', name: 'Paul', email: 'paul@ex.fr' };
  return ctx.tcTransmettrePrevenance(sansTel, 'Je serai en retard').then((chemin) => {
    verifie('sans numero, le mail', chemin === 'email', chemin);
    verifie('avec un objet et le texte',
      ouvertures[0] && ouvertures[0].indexOf('mailto:paul@ex.fr') === 0
      && ouvertures[0].indexOf('body=') > -1);
    return suiteRien();
  });
}

function suiteRien() {
  carnet();
  const muet = { id: 'cy', name: 'Inconnu' };
  return ctx.tcTransmettrePrevenance(muet, 'Je serai en retard').then((chemin) => {
    verifie('sans rien, on ne fait pas semblant', chemin === 'aucun', chemin);
    verifie('rien n est parti', envoyes.length === 0 && ouvertures.length === 0);
    toasts = [];
    ctx.tcDirePrevenance('aucun', 'Inconnu');
    verifie('et on ne dit surtout pas « prévenu »',
      toasts.length === 1 && toasts[0].indexOf('prévenu') === -1,
      toasts[0] || 'rien dit');
    verifie('on dit ce qui manque',
      toasts[0].indexOf('numéro') > -1 || toasts[0].indexOf('email') > -1,
      toasts[0]);
    return suiteReseau();
  });
}

function suiteReseau() {
  carnet();
  echecReseau = true;
  const surTimeCoolAvecTel = { id: 'cz', name: 'Luc', referenceCompte: 'REF-L', phone: '06 99 99 99 99' };
  return ctx.tcTransmettrePrevenance(surTimeCoolAvecTel, 'Je serai en retard').then((chemin) => {
    verifie('reseau coupe : le SMS prend le relais', chemin === 'sms', chemin);
    verifie('le message n est pas perdu', ouvertures.length === 1);
    toasts = [];
    ctx.tcDirePrevenance('sms', 'Luc');
    verifie('et on dit qu il reste a envoyer',
      toasts[0] && toasts[0].indexOf('envoie') > -1, toasts[0] || 'rien dit');
    fin();
  });
}

function fin() {
  titre('Le branchement dans les ecrans');
  verifie('la fiche porte le champ « Avec qui ? »',
    page.indexOf('AVEC QUI ? (facultatif)') > -1
    && page.indexOf('id="editContact"') > -1);
  verifie('et l enregistre',
    page.indexOf("if (champContact.value) e.contact = champContact.value;") > -1);
  verifie('le rendez-vous affiche la personne',
    page.indexOf('${tcContactDuRdv(e) ? `<div class="event-detail-row"') > -1);
  verifie('« Prévenir » part du contact, plus du titre',
    page.indexOf('openPrevenirSheet(currentEvent.title, currentEvent)') === -1,
    'il proposait de prevenir quelqu un nomme « Rendez-vous dentiste »');
  verifie('la validation emporte la personne',
    page.indexOf('...(tcContactDeProposition(msg, p) ? { contact: tcContactDeProposition(msg, p).id } : {})') > -1);
  verifie('Charly sait qu il ne choisit pas',
    page.indexOf('Tu ne cherches JAMAIS dans ses contacts') > -1,
    'sinon il inventerait un nom de famille');
  verifie('et le prompt ne promet plus quatre sonneries',
    page.indexOf('1 heure, 30, 15 et 5 minutes avant') === -1,
    'le rappel est unique depuis la fusion des reglages');

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
}
