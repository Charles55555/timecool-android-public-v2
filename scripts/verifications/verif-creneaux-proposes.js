// Les créneaux proposés sont-ils vraiment libres ?
//
// Une erreur ici ne se voit pas : Charly annonce « mardi de 14h à
// 16h », l'utilisateur y met un rendez-vous, et découvre le
// chevauchement le jour même. Chaque cas est donc joué sur de vraies
// données — plages ouvertes, agenda, heure qu'il est.
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

const ctx = {
  console, Date, Math, String, Array, Object, parseInt, isNaN, RegExp,
  events: [], mode: 'user',
  _dispoData: {},
  loadDispo: () => {},
  charlyIA: { history: [] },
  renderCharlyChat: () => {},
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); }
};
vm.createContext(ctx);
['tcISO', 'tcFormaterDateHumaine', 'tcEvenementFin', 'tcEvenementCouvre',
 'tcMinutesDeHeure', 'tcHeureLisible', 'tcPlagesDuJour', 'tcOccupationsDuJour',
 'tcCreneauxDisponibles', 'tcPeriodeAgenda', 'detecterDemandeCreneau',
 'tcGererDemandeCreneau'].forEach((n) => {
  const src = extraire(n);
  if (src) {
    try { vm.runInContext(src, ctx); }
    catch (e) { ko++; console.log('  KO  ' + n + ' : ' + e.message); }
  } else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

/* ── Un décor daté : un lundi lointain, pour ne dépendre de rien ── */
const LUNDI = new Date(2026, 10, 9);            // lundi 9 novembre 2026
const iso = (d) => ctx.tcISO(d);
const jourPlus = (n) => new Date(2026, 10, 9 + n);

function decor(plages) {
  ctx.events = [];
  ctx._dispoData = plages ? { travail: plages } : {};
  ctx.charlyIA.history = [];
}
const SEMAINE = { debut: LUNDI, fin: jourPlus(6), label: 'la semaine prochaine' };
const OUVERT_9_18 = [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '18:00' }];

titre('Lire une heure');
verifie('« 09:00 » vaut 540 minutes', ctx.tcMinutesDeHeure('09:00') === 540);
verifie('« 14:30 » vaut 870', ctx.tcMinutesDeHeure('14:30') === 870);
verifie('une heure absurde est refusée',
  ctx.tcMinutesDeHeure('25:00') === null && ctx.tcMinutesDeHeure('09:77') === null,
  'sinon elle deviendrait un creneau le lendemain');
verifie('et une saisie vide aussi',
  ctx.tcMinutesDeHeure('') === null && ctx.tcMinutesDeHeure(null) === null);
verifie('540 se relit « 9h »', ctx.tcHeureLisible(540) === '9h');
verifie('870 se relit « 14h30 »', ctx.tcHeureLisible(870) === '14h30');

titre('Les plages ouvertes du jour');
{
  decor(OUVERT_9_18);
  const lundi = ctx.tcPlagesDuJour(LUNDI);
  verifie('le lundi est ouvert', lundi.plages.length === 1 && lundi.plages[0].debut === 540);
  verifie('et ce sont bien tes plages', lundi.defaut === false);

  const samedi = ctx.tcPlagesDuJour(jourPlus(5));
  verifie('le samedi ne l est pas', samedi.defaut === true,
    'aucune plage ce jour-la : on le dit au lieu de rien proposer');

  decor([
    { jours: [1], debut: '09:00', fin: '12:00' },
    { jours: [1], debut: '11:00', fin: '15:00' }
  ]);
  const fusion = ctx.tcPlagesDuJour(LUNDI);
  verifie('deux plages qui se chevauchent n en font qu une',
    fusion.plages.length === 1 && fusion.plages[0].debut === 540 && fusion.plages[0].fin === 900,
    'sinon le meme creneau serait propose deux fois');

  decor([
    { jours: [1], debut: '14:00', fin: '15:00' },
    { jours: [1], debut: '09:00', fin: '10:00' }
  ]);
  const deux = ctx.tcPlagesDuJour(LUNDI);
  verifie('deux plages distinctes le restent, dans l ordre',
    deux.plages.length === 2 && deux.plages[0].debut === 540,
    deux.plages.map((p) => p.debut).join(' / '));

  decor([{ jours: [1], debut: '18:00', fin: '09:00' }]);
  verifie('une plage qui finit avant de commencer est ignorée',
    ctx.tcPlagesDuJour(LUNDI).defaut === true);
}

titre('Les créneaux d une journée');
{
  decor(OUVERT_9_18);
  let r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('journée vide : une seule grande plage',
    r.creneaux.length === 1 && r.creneaux[0].debut === 540 && r.creneaux[0].fin === 1080,
    r.creneaux.map((c) => c.debut + '-' + c.fin).join(' / '));

  ctx.events = [{ date: iso(LUNDI), mode: 'user', startH: 12, startM: 0, endH: 14, endM: 0, title: 'Déjeuner' }];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('un rendez-vous au milieu coupe en deux',
    r.creneaux.length === 2
    && r.creneaux[0].fin === 720 && r.creneaux[1].debut === 840,
    r.creneaux.map((c) => ctx.tcHeureLisible(c.debut) + '-' + ctx.tcHeureLisible(c.fin)).join(' / '));

  ctx.events = [{ date: iso(LUNDI), mode: 'user', startH: 9, startM: 0, endH: 18, endM: 0, title: 'Séminaire' }];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('une journée pleine ne propose rien', r.creneaux.length === 0);

  ctx.events = [{ date: iso(LUNDI), mode: 'user', allDay: true, startH: 0, startM: 0, endH: 23, endM: 59, title: 'Congé' }];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('une journée entière non plus', r.creneaux.length === 0,
    'un congé bloque la journée aussi surement qu une reunion');

  ctx.events = [
    { date: iso(LUNDI), mode: 'user', startH: 9, startM: 0, endH: 12, endM: 30, title: 'A' },
    { date: iso(LUNDI), mode: 'user', startH: 13, startM: 0, endH: 18, endM: 0, title: 'B' }
  ];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('un trou de 30 min n est pas proposé', r.creneaux.length === 0,
    'on ne case rien dans une demi-heure entre deux rendez-vous');

  ctx.events = [
    { date: iso(LUNDI), mode: 'user', startH: 10, startM: 0, endH: 11, endM: 0, title: 'A' },
    { date: iso(LUNDI), mode: 'user', startH: 13, startM: 0, endH: 14, endM: 0, title: 'B' }
  ];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('au plus deux créneaux par jour', r.creneaux.length === 2,
    'trois trous existent, mais une liste ne se lit plus au-dela');

  ctx.events = [{ date: iso(LUNDI), mode: 'pro', startH: 9, startM: 0, endH: 18, endM: 0, title: 'Autre mode' }];
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('l agenda de l autre mode n entre pas en compte',
    r.creneaux.length === 1, 'les deux agendas sont separes');
}

titre('Les créneaux d une période');
{
  decor(OUVERT_9_18);
  let r = ctx.tcCreneauxDisponibles(SEMAINE, 5);
  verifie('cinq jours ouverts donnent cinq propositions',
    r.creneaux.length === 5, r.creneaux.length + ' — lundi à vendredi');
  verifie('elles sont dans l ordre du temps',
    r.creneaux.every((c, i) => i === 0 || c.date >= r.creneaux[i - 1].date),
    r.creneaux.map((c) => c.date.slice(8)).join(' '));
  verifie('et aucune ne déborde la période',
    r.creneaux.every((c) => c.date >= iso(LUNDI) && c.date <= iso(jourPlus(6))));
  verifie('le samedi et le dimanche sont écartés',
    !r.creneaux.some((c) => c.date === iso(jourPlus(5)) || c.date === iso(jourPlus(6))),
    'aucune plage ouverte ces jours-la');

  r = ctx.tcCreneauxDisponibles(SEMAINE, 2);
  verifie('la limite demandée est tenue', r.creneaux.length === 2);

  decor(null);
  r = ctx.tcCreneauxDisponibles({ debut: LUNDI, fin: LUNDI }, 5);
  verifie('sans aucune plage déclarée, on propose quand même',
    r.creneaux.length === 1 && r.defaut === true,
    'et « defaut » permet de le dire plutot que de le taire');
}

titre('Aujourd hui, le passé ne compte pas');
{
  decor([{ jours: [1, 2, 3, 4, 5, 6, 7], debut: '00:00', fin: '23:59' }]);
  const maintenant = new Date();
  const auj = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const r = ctx.tcCreneauxDisponibles({ debut: auj, fin: auj }, 5);
  const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();
  verifie('aucun créneau ne commence avant l heure qu il est',
    r.creneaux.every((c) => c.debut >= minutesActuelles),
    r.creneaux.map((c) => ctx.tcHeureLisible(c.debut)).join(' / ') || 'aucun (fin de journee)');
}

titre('Reconnaître la demande');
{
  const d = ctx.detecterDemandeCreneau;
  verifie('« tu peux me donner un rendez-vous de la semaine prochaine »',
    d('tu peux me donner un rendez-vous de la semaine prochaine') !== null);
  verifie('et la période est comprise',
    (d('tu peux me donner un rendez-vous de la semaine prochaine').periode || {}).label === 'la semaine prochaine');
  verifie('« propose-moi un créneau »', d('propose-moi un créneau') !== null);
  verifie('« trouve-moi un moment cette semaine »', d('trouve-moi un moment cette semaine') !== null);
  verifie('« quand est-ce que je peux te voir »', d('quand est-ce que je peux te voir') !== null);

  verifie('mais pas « mets-moi un rdv demain à 15h »',
    d('mets-moi un rdv demain à 15h') === null,
    'l heure est donnee : il n y a rien a proposer');
  verifie('ni « ajoute un rendez-vous demain »',
    d('ajoute un rendez-vous demain') === null,
    'c est une creation, Charly doit demander l heure');
  verifie('ni « annule mon rendez-vous »', d('annule mon rendez-vous') === null);
  verifie('ni une phrase sans rapport', d('tu t appelles comment') === null);
  verifie('ni une phrase vide', d('') === null && d(null) === null);
}

titre('Chercher un professionnel, ou poser un rendez-vous');
{
  // TC_PROFESSIONS et extraireLieuDuTexte vivent a cote du detecteur.
  const ctxP = { console, RegExp, String };
  vm.createContext(ctxP);
  const liste = page.match(/const TC_PROFESSIONS = \[[\s\S]*?\];/);
  if (liste) vm.runInContext(liste[0].replace('const ', 'var '), ctxP);
  else { ko++; console.log('  KO  TC_PROFESSIONS introuvable'); }
  ['extraireLieuDuTexte', 'detecterRechercheProfessionnel'].forEach((n) => {
    const src = extraire(n);
    if (src) vm.runInContext(src, ctxP);
    else { ko++; console.log('  KO  ' + n + ' introuvable'); }
  });
  const d = ctxP.detecterRechercheProfessionnel;

  // La phrase exacte qui partait chercher des avocats sur Google.
  const vraie = "Tu peux me mettre un rendez-vous pour aujourd'hui à 14h, j'ai rendez-vous "
    + "chez mon avocat, il s'appelle William Ayache et il se trouve au 36 avenue des Champs-Élysées à Paris";
  verifie('« il se trouve au 36 avenue » ne cherche plus un avocat',
    d(vraie) === null,
    'le verbe « trouve » seul suffisait, et la recherche est facturée');

  verifie('poser un rendez-vous chez son médecin non plus',
    d('ajoute un rendez-vous chez mon médecin demain') === null);
  verifie('ni « mets-moi un RDV chez le dentiste »',
    d('mets-moi un rdv chez le dentiste jeudi') === null);
  verifie('ni une personne déjà nommée',
    d('je cherche un avocat, il s’appelle William Ayache') === null,
    'elle est connue : il n y a rien a chercher');

  verifie('mais « je cherche un avocat à Paris » cherche bien',
    d('je cherche un avocat à Paris') !== null);
  verifie('et la profession est reconnue',
    (d('je cherche un avocat à Paris') || {}).profession === 'avocat');
  verifie('« trouve-moi un dentiste » aussi',
    d('trouve-moi un dentiste pas loin') !== null);
  verifie('« connais-tu un bon plombier ? » aussi',
    d('connais-tu un bon plombier ?') !== null);
  verifie('« il me faut un kiné » aussi',
    d('il me faut un kiné') !== null);
  verifie('et « j’ai besoin d’un notaire »',
    d('j’ai besoin d’un notaire') !== null);

  verifie('une phrase sans métier ne cherche rien',
    d('je cherche mes clés') === null);
  verifie('et une phrase vide non plus',
    d('') === null);
}

titre('Ce que Charly répond');
{
  decor(OUVERT_9_18);
  ctx.tcGererDemandeCreneau('donne-moi un rendez-vous la semaine prochaine',
    { periode: SEMAINE });
  const reponse = ctx.charlyIA.history.filter((m) => m.role === 'assistant').pop();
  verifie('il répond sans appeler le modèle', !!reponse);
  verifie('il nomme la période', reponse.content.indexOf('la semaine prochaine') > -1);
  verifie('il donne de vraies heures', /\d{1,2}h/.test(reponse.content),
    reponse.content.split('\n')[1] || '');
  verifie('et il demande avec qui',
    reponse.content.indexOf('avec qui') > -1,
    'sans cela le rendez-vous naitrait encore sans personne');

  decor(OUVERT_9_18);
  ctx.events = [{ date: iso(LUNDI), mode: 'user', allDay: true, startH: 0, startM: 0, endH: 23, endM: 59, title: 'Congé' }];
  ctx.tcGererDemandeCreneau('donne-moi un créneau lundi', { periode: { debut: LUNDI, fin: LUNDI, label: 'lundi' } });
  const vide = ctx.charlyIA.history.filter((m) => m.role === 'assistant').pop();
  verifie('sans créneau, il le dit et propose de chercher plus loin',
    vide.content.indexOf('aucun créneau libre') > -1 && vide.content.indexOf('plus loin') > -1,
    vide.content);

  decor(null);
  ctx.tcGererDemandeCreneau('donne-moi un créneau lundi', { periode: { debut: LUNDI, fin: LUNDI, label: 'lundi' } });
  const repli = ctx.charlyIA.history.filter((m) => m.role === 'assistant').pop();
  verifie('et quand il invente la journée, il le dit',
    repli.content.indexOf('Mes disponibilités') > -1,
    'proposer 9h-18h en silence ferait passer un defaut pour un reglage');
}

titre('Le tic de langage');
verifie('la formule est réservée aux contradictions',
  page.indexOf('"Sauf erreur de ma part" est RESERVEE') > -1
  && page.indexOf('En cas de doute ou d\'incompréhension, utilise la formule') === -1,
  'elle s appliquait a toute question, donc a presque tout');
verifie('une info manquante se demande sans préambule',
  page.indexOf('sans préambule') > -1);
verifie('et jamais deux fois de suite',
  page.indexOf('Ne commence JAMAIS deux réponses de suite par la même formule') > -1);

titre('Le branchement');
verifie('la demande est interceptée avant le modèle',
  /const _creneau = detecterDemandeCreneau\(text\);\s*if \(_creneau\) \{\s*await tcGererDemandeCreneau/.test(page));
verifie('et avant les API Google, qui sont payantes',
  page.indexOf('const _creneau = detecterDemandeCreneau(text);')
    < page.indexOf('const _recherchePro = detecterRechercheProfessionnel(text);'),
  'ce calcul ne sort pas de l appareil et ne coute rien');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
