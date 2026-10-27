// Campagne 5 (11/10), mission 5 : Charly citait un rendez-vous d un autre jour comme conflit, et deplacait a tort.
// Date fixee : dimanche 11 octobre 2026, 14h20. Agenda des Testeurs rejoue (compte D).
//  1. L agenda transmis est classe jour par jour sur 14 jours, les jours libres dits libres, le reste a plat.
//  2. Un conflit annonce qui n existe pas dans l agenda local est ignore : on propose le creneau.
//  3. Un deplacement ne porte que sur un rendez-vous present le jour dit, sinon Charly demande lequel.
//  4. Jour absent de la demande → Charly demande le jour, ne le choisit pas.
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
const NOW = new Date(2026, 9, 11, 14, 20, 0);   // dimanche 11 octobre 2026, 14h20
const ev = (id, date, h1, m1, h2, m2, title) => ({ id, mode: 'user', date, startH: h1, startM: m1, endH: h2, endM: m2, title });
// L agenda de Damien au moment des tests (lundi 12 : atelier, Estelle, Zorglub ; mardi 13 : banque, formation ; lundi 19 : notaire).
const AGENDA = [
  ev('a1', '2026-10-12', 9, 0, 11, 0, 'Atelier d’équipe'),
  ev('a2', '2026-10-12', 11, 0, 12, 0, 'Rendez-vous avec Estelle'),
  ev('a3', '2026-10-12', 15, 0, 16, 0, 'Rendez-vous avec Zorglub'),
  ev('a4', '2026-10-13', 10, 0, 11, 0, 'Rdv banque'),
  ev('a5', '2026-10-13', 15, 0, 17, 0, 'Formation'),
  ev('a6', '2026-10-19', 11, 0, 12, 0, 'Notaire'),
  ev('a7', '2026-12-25', 20, 0, 21, 0, 'Réveillon'),
  ev('a8', '2026-10-10', 9, 0, 10, 0, 'Hier matin'),
  Object.assign(ev('a9', '2026-10-14', 0, 0, 0, 0, 'Férié'), { allDay: true }),
];
const ctx = { console, Number, String, Date, RegExp, Array, Object, Math, events: AGENDA.map((e) => Object.assign({}, e)), mode: 'user' };
vm.createContext(ctx);
['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', "const TC_MOTS_CREUX = new Set\\([\\s\\S]*?\\.split\\(' '\\)\\);"].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcComparerEvenements', 'tcEvenementFin', 'tcEvenementCouvre', 'tcHeureDansTexte', 'tcMotsDeRdv', 'tcTitreContient', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcBlocAgendaDepuisAnnonce',
  'tcPlusieursDatesOuRelatif', 'tcCorrigerPropositionsCharly', 'tcAgendaSnapshotPourIA', 'tcJoursCites', 'tcAnnonceUnConflit', 'tcIgnorerFauxConflit',
  'tcQuestionJourManquant', 'tcQuestionRdvDuJour', 'tcDeplacementHorsJour', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'tcHeureCourte', 'tcPlagesLibresDuJour', 'tcPhraseConflitLocale', 'tcVerbeConjugue', 'tcEstDeplacement',
  'tcEstUneDuree', 'tcDureeForte', 'tcHeuresCitees', 'tcDureeDemandee', 'tcAnnonceAutreCreneau', 'tcBlocAvecFauxConflit']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. L agenda transmis a Charly : jour par jour');
const ag = ctx.tcAgendaSnapshotPourIA(NOW);
const lignes = ag.split('\n').filter((l) => /^• /.test(l));
verifie('15 lignes « • » : aujourd hui (dimanche 11) puis les 14 jours suivants, jusqu au dimanche 25', lignes.length === 15 && /^• dimanche 11\/10 \(2026-10-11, aujourd’hui\)/.test(lignes[0]) && /^• dimanche 25\/10 \(2026-10-25\)/.test(lignes[14]), lignes[0] + ' … ' + lignes[14]);
verifie('lundi 12 : ses trois rendez-vous, dans l ordre, sur UNE ligne', /^• lundi 12\/10 \(2026-10-12, demain\) : 09:00-11:00 Atelier d’équipe ; 11:00-12:00 Rendez-vous avec Estelle ; 15:00-16:00 Rendez-vous avec Zorglub$/.test(lignes[1]), lignes[1]);
verifie('mardi 13 : banque et formation', /^• mardi 13\/10 \(2026-10-13\) : 10:00-11:00 Rdv banque ; 15:00-17:00 Formation$/.test(lignes[2]), lignes[2]);
verifie('mercredi 14 : la journee entiere', /^• mercredi 14\/10 \(2026-10-14\) : \(journée entière\) Férié$/.test(lignes[3]), lignes[3]);
verifie('un jour sans rien est dit libre (jeudi 15)', /^• jeudi 15\/10 \(2026-10-15\) : rien, journée libre$/.test(lignes[4]), lignes[4]);
verifie('lundi 19 : le notaire, dans la fenetre', /^• lundi 19\/10 \(2026-10-19\) : 11:00-12:00 Notaire$/.test(lignes[8]), lignes[8]);
verifie('hors fenetre : hier et le 25 decembre, a plat', /HORS DE CES JOURS[^\n]*\n2026-10-10 \(samedi\) 09:00-10:00 — Hier matin\n2026-12-25 \(vendredi\) 20:00-21:00 — Réveillon/.test(ag), ag.slice(ag.indexOf('HORS'), ag.indexOf('HORS') + 160));
verifie('la regle : un conflit n existe que le MEME JOUR, un autre jour n est jamais un conflit ; deplacer = un rdv du jour dit', /LE MÊME JOUR/.test(ag) && /n[’']est JAMAIS un conflit/.test(ag) && /demande lequel/.test(ag) && /la liste ci-dessus a raison, pas ta memoire/.test(ag));
verifie('sans date injectee : la vraie date du jour (pas d erreur)', /^• /m.test(ctx.tcAgendaSnapshotPourIA()));
verifie('les deux appels du modele envoient toujours tcAgendaSnapshotPourIA()', (page.match(/volatil: dateContext \+ '\\n\\n' \+ tcAgendaSnapshotPourIA\(\)/g) || []).length === 2);

titre('2. Les jours que cite une phrase');
const J = (x) => ctx.tcJoursCites(x, NOW).join(',');
verifie('« Décale mon rdv de mardi à 16h » → mardi 13', J('Décale mon rdv de mardi à 16h') === '2026-10-13', J('Décale mon rdv de mardi à 16h'));
verifie('« déplacer … pour demain pour après-demain » → lundi 12 ET mardi 13', J('les déplacer en fait pour demain pour après-demain à la même heure') === '2026-10-12,2026-10-13', J('les déplacer en fait pour demain pour après-demain à la même heure'));
verifie('« lundi 19 à 11h » → le 19 ; « le 20 … le 19 » → 20 et 19 ; « 25 décembre » ; « 19/10 »', J('notaire lundi 19 à 11h') === '2026-10-19' && J("le 20 j'ai une réunion, bloque le 19 à 9h") === '2026-10-20,2026-10-19' && J('rdv le 25 décembre à 20h') === '2026-12-25' && J('le 19/10 à 11h') === '2026-10-19');
verifie('« mardi 15 heures » : un seul jour, mardi 13 ; « appel avec Paul 14h » : aucun', J('mardi 15 heures') === '2026-10-13' && J('appel téléphonique avec Paul 14h') === '');
const JD = (x) => ctx.tcJoursCites(x, NOW, true).join(',');
verifie('jours de DEPART seulement : « décale Zorglub à mardi 16h » → aucun (mardi est la destination)', JD('décale Zorglub à mardi 16h') === '', JD('décale Zorglub à mardi 16h'));
verifie('« repousse mon rdv de jeudi à vendredi » → jeudi seulement', JD('repousse mon rdv de jeudi à vendredi') === '2026-10-15', JD('repousse mon rdv de jeudi à vendredi'));
verifie('« reporte mon dentiste à jeudi », « déplace-le pour lundi », « vers mardi », « jusqu’à vendredi » → aucun', JD('reporte mon dentiste à jeudi') === '' && JD('déplace-le pour lundi') === '' && JD('mets-le vers mardi') === '' && JD('décale jusqu’à vendredi') === '');
verifie('« décale mon rdv de lundi à mardi » → lundi (départ), pas mardi', JD('décale mon rdv de lundi à mardi') === '2026-10-12', JD('décale mon rdv de lundi à mardi'));

titre('2b. Un evenement sur plusieurs jours (dateFin) compte chaque jour');
{
  const avec = AGENDA.map((e) => Object.assign({}, e));
  avec.push(Object.assign(ev('s1', '2026-10-12', 9, 0, 17, 0, 'Séminaire'), { dateFin: '2026-10-14' }));
  avec.push(Object.assign(ev('s2', '2026-10-09', 8, 0, 18, 0, 'Salon'), { dateFin: '2026-10-11' }));
  ctx.events = avec;
  const ag2 = ctx.tcAgendaSnapshotPourIA(NOW);
  const l2 = ag2.split('\n').filter((l) => /^• /.test(l));
  verifie('le seminaire du 12 au 14 est ecrit lundi, mardi ET mercredi (plus de « journee libre » a tort)', /Séminaire \(du 2026-10-12 au 2026-10-14\)/.test(l2[1]) && /Séminaire/.test(l2[2]) && /Séminaire/.test(l2[3]) && !/journée libre/.test(l2[2]), l2[2]);
  verifie('un salon commence avant la fenetre et finit aujourd hui : ecrit aujourd hui, pas dans « hors de ces jours »', /Salon \(du 2026-10-09 au 2026-10-11\)/.test(l2[0]) && !/HORS DE CES JOURS[^\n]*\n[^\n]*Salon/.test(ag2), l2[0]);
  const fs1 = ctx.tcIgnorerFauxConflit('Tu as déjà le séminaire mardi à 10h.', 'rdv Dr. Martin mardi 10h', NOW, ctx.events, 'user');
  verifie('conflit local : le seminaire couvre mardi 10h → vrai conflit, la page cite le seminaire (mission 11)', /tu as déjà « Séminaire »/.test(fs1 || ''), fs1);
  const sem = ctx.events.find((e) => e.id === 's1');
  verifie('deplacement : « mon rdv de mardi » peut viser le seminaire (il couvre mardi) → null', ctx.tcDeplacementHorsJour([{ ev: sem, p: {} }], 'décale mon rdv de mardi à 16h', NOW, ctx.events, 'user') === null);
  const q4 = ctx.tcDeplacementHorsJour([{ ev: ctx.events.find((e) => e.id === 'a6'), p: {} }], 'décale mon rdv de mercredi à 16h', NOW, ctx.events, 'user');
  verifie('« mon rdv de mercredi » mais Charly vise le notaire : la question liste le seminaire (present mercredi)', !!q4 && /Séminaire/.test(q4), q4);
  ctx.events = AGENDA.map((e) => Object.assign({}, e));
}

titre('3. Un conflit annonce qui n existe pas est ignore (on propose le creneau)');
const FC = (r, u) => ctx.tcIgnorerFauxConflit(r, u, NOW, ctx.events, 'user');
const f1 = FC('Mardi à 9h, tu as déjà un atelier d’équipe. Tu veux un autre créneau ?', 'rdv Dr. Martin mardi 9h');
verifie('« rdv Dr. Martin mardi 9h » : mardi 9h est libre (l atelier est lundi) → on propose mardi 13 a 9h', !!f1 && /Ce créneau est libre dans ton agenda : mardi 13 octobre 2026 à 9h/.test(f1) && /\[AGENDA\]\n2026-10-13 \| 09:00-10:00 \| Dr Martin \| rdv\n\[\/AGENDA\]/.test(f1), f1);
const f2 = FC('Demain à 15h, tu as déjà un rendez-vous avec la banque.', 'rdv avec Zorglub demain 15h');
verifie('« demain 15h » : Zorglub y est deja (lundi 15h-16h) → vrai conflit, la phrase de la page (mission 11)', /^Lundi 12 octobre 2026 à 15h, tu as déjà « Rendez-vous avec Zorglub » \(15h-16h\)\./.test(f2 || ''), f2);
ctx.events = ctx.events.filter((e) => e.id !== 'a3');
const f2b = FC('Demain à 15h, tu as déjà un rendez-vous avec la banque.', 'rdv avec Paul demain 15h');
verifie('sans Zorglub, lundi 15h est libre (la banque est mardi) → on propose lundi 12 a 15h, titre Paul', !!f2b && /lundi 12 octobre 2026 à 15h/.test(f2b) && /2026-10-12 \| 15:00-16:00 \| Paul \| rdv/.test(f2b), f2b);
ctx.events = AGENDA.map((e) => Object.assign({}, e));
verifie('« rdv dentiste mardi 15h » : la formation est bien mardi 15h-17h → vrai conflit : la page cite la Formation, pas Zorglub', /tu as déjà « Formation » \(15h-17h\)/.test(FC('Mardi 15h est déjà occupé par un rendez-vous avec Zorglub.', 'rdv dentiste mardi 15h') || ''));
verifie('« rdv dentiste lundi 15h » : Zorglub est bien lundi 15h → la page cite Zorglub, pas le notaire', /tu as déjà « Rendez-vous avec Zorglub »/.test(FC('Lundi 15h est déjà occupé par un rendez-vous chez le notaire.', 'rdv dentiste lundi 15h') || ''));
verifie('une journee entiere ne compte pas comme conflit d heure (mercredi 14 10h)', /2026-10-14 \| 10:00-11:00/.test(FC('Mercredi tu as déjà quelque chose.', 'rdv coach mercredi 10h') || ''));
verifie('une reponse sans annonce de conflit : rien', FC('Quel jour exactement ?', 'rdv dentiste 15h') === null);
verifie('une reponse avec un bloc : rien (le filet de la mission 4 s en occupe)', FC('Déjà pris, mais voici :\n[AGENDA]\n2026-10-13 | 16:00-17:00 | Dentiste | sante\n[/AGENDA]', 'rdv dentiste mardi 15h') === null);
verifie('une consultation (« est-ce que j ai quelque chose vendredi ? ») avec une reponse juste n est pas reecrite (mission 7)', FC('Oui, tu as déjà Revue budget vendredi à 14h.', "est-ce que j'ai quelque chose vendredi ?") === null);
verifie('sans jour dans la demande : rien ; avec un jour mais sans heure : l agenda du jour dit par la page et « À quelle heure ? » (mission 7)', FC('Tu as déjà un rendez-vous.', 'rdv dentiste 15h') === null && /Je ne vois pas ce rendez-vous dans ton agenda\. Mardi 13 octobre 2026, tu as : .*À quelle heure \?$/.test(FC('Tu as déjà un rendez-vous.', 'rdv dentiste mardi') || ''));
verifie('un deplacement ou une annulation : rien', FC('Mardi 16h est déjà pris.', 'Décale mon rdv de mardi à 16h') === null);
verifie('deux demandes (« dentiste demain 10h et coach jeudi 14h ») : le conflit de jeudi est vrai, on ne reecrit rien', FC('Jeudi à 14h, tu as déjà un rendez-vous avec Estelle.', 'ajoute dentiste demain à 10h et coach jeudi à 14h') === null);
verifie('creneau libre mais passe (aujourd hui 10h) : refus calme du filet, proposition demain', /déjà passé/.test(FC('Aujourd’hui à 10h tu as déjà un rendez-vous.', 'rdv aujourd hui 10h avec le plombier') || ''));
verifie('charlySendMessage applique ce garde-fou apres le filet', /reply = tcIgnorerFauxConflit\(reply, text, new Date\(\), events, mode\) \|\| reply;/.test(fonction(page, 'charlySendMessage') || ''));

titre('3b. Mission 62 : un conflit ne vient que de l agenda, une duree n est pas une heure (#405)');
{
  // Le passage 17 : mercredi, le dejeuner avec Paul de 12h a 13h ; « bloque 1h pour le devis de M. Garcia mercredi 16h ».
  ctx.events = [ev('dj', '2026-10-14', 12, 0, 13, 0, 'Déjeuner avec Paul'), ev('rv', '2026-10-14', 17, 0, 18, 0, 'Revue')];
  const T = 'bloque 1h pour le devis de M. Garcia mercredi 16h';
  const faux = 'Mercredi 14 octobre 2026 à 16h, tu as une rencontre avec Paul pour le déjeuner de 12h à 13h. Je te propose donc de bloquer le créneau suivant : 15h-16h pour le devis de M. Garcia. Ça te convient ?';
  const f1 = FC(faux, T);
  verifie('#405 : « à 16h, tu as … le déjeuner de 12h à 13h. Je te propose donc … 15h-16h » → la page propose mercredi 16h-17h (libre), titre du devis', !!f1 && /^Ce créneau est libre dans ton agenda : mercredi 14 octobre 2026 à 16h\./.test(f1) && /2026-10-14 \| 16:00-17:00 \| Devis Garcia \| rdv/.test(f1) && !/15h|déjeuner/.test(f1), f1);
  const f2 = FC('Tu as déjà le déjeuner avec Paul. Je te propose plutôt :\n[AGENDA]\n2026-10-14 | 15:00-16:00 | Devis Garcia | rdv\n[/AGENDA]', T);
  const f3 = FC('Tu as déjà quelque chose ce jour-là, je l’ajoute quand même :\n[AGENDA]\n2026-10-14 | 16:00-17:00 | Devis Garcia | rdv\n[/AGENDA]', T);
  verifie('le meme faux conflit avec un bloc a 15h : le bloc du modele tombe, la page propose 16h-17h ; un bloc a 16h (l heure demandee) garde la reponse du modele', !!f2 && /2026-10-14 \| 16:00-17:00 \| Devis Garcia \| rdv/.test(f2) && !/15:00/.test(f2) && f3 === null, [f2, f3].join(' || '));
  const f4 = FC('Tu as déjà quelque chose, je te propose 19h.', 'bloque 2h pour le devis mercredi 16h');
  verifie('« bloque 2h … 16h » chevauche la Revue de 17h : vrai conflit, la page cite la Revue', !!f4 && /tu as déjà « Revue » \(17h-18h\)/.test(f4), f4);
  const f5 = FC('Tu as déjà quelque chose, je te propose 19h.', 'bloque 2h pour le devis mercredi 14h');
  verifie('« bloque 2h … 14h » (libre de 14h a 16h) → bloc 14h-16h', !!f5 && /2026-10-14 \| 14:00-16:00 \| /.test(f5), f5);
  const f6 = FC('À 12h30, tu as le déjeuner. Je te propose 14h :\n[AGENDA]\n2026-10-14 | 14:00-15:00 | Devis | rdv\n[/AGENDA]', 'rdv devis mercredi 12h30');
  verifie('un vrai conflit avec un bloc ailleurs (12h30, pendant le dejeuner) : la reponse du modele reste', f6 === null, f6);
  verifie('sans heure dans la demande, « tu as …, je te propose 14h » n est pas reecrit ; une reponse sans conflit non plus',
    FC('Mercredi tu as le déjeuner avec Paul, je te propose 14h ?', 'ajoute le devis mercredi') === null && FC('16h est libre, je te propose ce créneau.', T) === null);
  verifie('« bloque 1h demain » garde 1h (pas d autre heure) ; « réserve-moi 1h30 vendredi à 9h » → 9h, 90 min',
    ctx.tcHeureDansTexte('bloque 1h demain').h === 1 && ctx.tcHeureDansTexte('réserve-moi 1h30 vendredi à 9h').h === 9 && ctx.tcDureeDemandee('réserve-moi 1h30 vendredi à 9h') === 90);
  // Examen, 1er passage : une plage ou un choix n'est jamais une duree, ni plus de 8 h.
  const HD = (t) => { const h = ctx.tcHeureDansTexte(t); return (h ? h.h + 'h' + (h.m || '') : 'null') + '/' + ctx.tcDureeDemandee(t); };
  const plages = [['bloque 14h à 16h lundi', '14h/120'], ['bloque 14h-16h lundi', '14h/120'], ['réserve 10h-11h mardi', '10h/60'], ['bloque 9h et 14h lundi', '9h/0'],
    ['réserve 10h pour le dentiste, ou 11h', '10h/0'], ['bloque 10h demain jusqu’à 12h', '10h/0'], ['bloque 12h pour Paul lundi 9h', '12h/0'], ['bloque 1h30 pour le devis mercredi 16h', '16h/90'], ['pendant 1h30 à 9h vendredi', '9h/90']];
  const malLues = plages.filter(([t, a]) => HD(t) !== a);
  verifie('(examen) « bloque 14h à 16h », « 14h-16h », « 10h-11h », « 9h et 14h », « 10h …, ou 11h », « 10h demain jusqu’à 12h », « bloque 12h pour Paul lundi 9h » : la premiere heure (une plage dure ce qu elle dit, le reste aucune duree) ; « bloque 1h30 … 16h » → 16h, 90 min', !malLues.length, malLues.map(([t]) => t + ' → ' + HD(t)).join(' | '));
  ctx.events = AGENDA.map((e) => Object.assign({}, e));
  const z = FC('Lundi tu as déjà quelque chose, je te propose 17h.', 'bloque 14h-16h lundi');
  verifie('(examen) « bloque 14h-16h lundi » avec Zorglub lundi 15h-16h : le conflit de 15h reste vu (jamais « libre … à 16h »)', !z || !/libre/.test(z), z);
  ctx.events = [ev('dj', '2026-10-14', 12, 0, 13, 0, 'Déjeuner avec Paul')];
  const f7 = FC('Il y a un bouchon prévu, je te propose de partir plus tôt :\n[AGENDA]\n2026-10-14 | 13:00-14:00 | Rdv Paul | rdv\n[/AGENDA]', 'rdv Paul mercredi 13h');
  verifie('(examen) un bloc a l heure demandee garde la reponse du modele (sa remarque, son titre)', f7 === null, f7);
  ctx.events = AGENDA.map((e) => Object.assign({}, e));
}

titre('4. Un deplacement ne porte que sur un rendez-vous present le jour dit');
const zorglub = ctx.events.find((e) => e.id === 'a3');
const D = (liste, u) => ctx.tcDeplacementHorsJour(liste, u, NOW, ctx.events, 'user');
const q1 = D([{ ev: zorglub, p: { date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0 } }], 'Décale mon rdv de mardi à 16h');
verifie('« mon rdv de mardi » mais Charly vise Zorglub (lundi) → rien ne bouge, Charly demande lequel des 2 rdv de mardi', !!q1 && /Tu as 2 rendez-vous mardi 13 octobre : « Rdv banque » 10h, « Formation » 15h — lequel \?/.test(q1), q1);
const notaire = ctx.events.find((e) => e.id === 'a6');
const q2 = D([{ ev: notaire, p: { date: '2026-10-16', startH: 11, startM: 0, endH: 12, endM: 0 } }], 'repousse mon rdv de jeudi à vendredi');
verifie('« mon rdv de jeudi » (rien jeudi) → « je ne trouve aucun rendez-vous jeudi 15 octobre »', !!q2 && /Je ne trouve aucun rendez-vous jeudi 15 octobre/.test(q2), q2);
const banque = ctx.events.find((e) => e.id === 'a4');
verifie('le rendez-vous vise est bien mardi → null (le deplacement se fait)', D([{ ev: banque, p: { date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0 } }], 'Décale mon rdv de mardi à 16h') === null);
verifie('« demain → après-demain » avec des rdv de lundi → null (les deux jours sont cites)', D([{ ev: zorglub, p: {} }], 'déplace mes rendez-vous de demain à après-demain') === null);
verifie('aucun jour dans la demande (« décale Zorglub à 16h ») → null (on fait confiance au titre)', D([{ ev: zorglub, p: {} }], 'décale le rdv Zorglub à 16h') === null);
verifie('« décale Zorglub à mardi 16h » : mardi est la DESTINATION, le titre fait foi → null (examinateur)', D([{ ev: zorglub, p: { date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0 } }], 'décale Zorglub à mardi 16h') === null);
verifie('« reporte mon dentiste à jeudi » (dentiste aujourd hui) → null', D([{ ev: ev('d1', '2026-10-11', 16, 0, 17, 0, 'Dentiste'), p: {} }], 'reporte mon dentiste à jeudi') === null);
const q3 = D([{ ev: zorglub, p: {} }], 'repousse mon rdv de lundi 19 à 14h');
verifie('« lundi 19 » (un seul rdv ce jour-la : le notaire) → « un seul rendez-vous … c est celui-la ? »', !!q3 && /Tu as un seul rendez-vous lundi 19 octobre : « Notaire » 11h\. C’est celui-là \?/.test(q3), q3);
const td = fonction(page, 'tcTraiterDeplacement') || '';
verifie('tcTraiterDeplacement pose la question et ne deplace rien dans ce cas', /const question = tcDeplacementHorsJour\(liste, text, new Date\(\), events, mode === 'pro' \? 'pro' : 'user'\);/.test(td) && td.indexOf('const question') < td.indexOf('tcExecuterDeplacement(liste)') && /if \(question\) \{\s+msg\._validated = true;\s+if \(String\(msg\.content \|\| ''\)\.trim\(\) !== question\.trim\(\)\) charlyIA\.history\.push\(\{ role: 'assistant', content: question \}\);\s+return true;/.test(td));

titre('5. Jour absent : Charly demande le jour, ne le choisit pas');
const Q = (r, u, prec) => ctx.tcQuestionJourManquant(r, u, prec || [], NOW);
verifie('« appel téléphonique avec Paul 14h » + bloc du mardi → « Pour quel jour ? »', Q('Vendredi 14h, c’est noté.\n[AGENDA]\n2026-10-16 | 14:00-15:00 | Appel Paul | travail\n[/AGENDA]', 'appel téléphonique avec Paul 14h') === 'Pour quel jour ? (par exemple « demain » ou « mardi »)');
verifie('meme chose si Charly annonce un conflit un jour qu il a choisi', Q('Mardi à 14h, tu as déjà un rendez-vous.', 'appel téléphonique avec Paul 14h') === 'Pour quel jour ? (par exemple « demain » ou « mardi »)');
verifie('le jour est dans la demande → rien', Q('[AGENDA]\n2026-10-13 | 14:00-15:00 | Appel Paul | travail\n[/AGENDA]', 'appel avec Paul mardi 14h') === null);
verifie('le jour etait dans le message precedent (« mardi » puis « 14h ») → rien', Q('[AGENDA]\n2026-10-13 | 14:00-15:00 | Appel Paul | travail\n[/AGENDA]', 'appel avec Paul 14h', ['mets un rdv mardi', 'À quelle heure ?']) === null);
verifie('une periode (« la semaine prochaine 10h ») → rien, Charly gere', Q('[AGENDA]\n2026-10-13 | 10:00-11:00 | X | rdv\n[/AGENDA]', 'rdv la semaine prochaine 10h') === null);
verifie('sans heure, sans bloc ni conflit, ou plusieurs lignes, ou un deplacement → rien', Q('Quel jour ?', 'appel avec Paul 14h') === null && Q('[AGENDA]\n2026-10-13 | 14:00-15:00 | X | rdv\n[/AGENDA]', 'appel avec Paul') === null && Q('[AGENDA]\n2026-10-13 | 08:00-09:00 | X | rdv\n2026-10-14 | 08:00-09:00 | X | rdv\n[/AGENDA]', 'tous les jours a 8h') === null && Q('[AGENDA]\n2026-10-13 | 16:00-17:00 | X | rdv\n[/AGENDA]', 'décale le rdv à 16h') === null);
verifie('charlySendMessage applique ce garde-fou avec les deux messages precedents', /reply = tcQuestionJourManquant\(reply, text, charlyIA\.history\.filter\(m => m\.role === 'user'\)\.slice\(-3, -1\)\.map\(m => m\.content\), new Date\(\)\) \|\| reply;/.test(fonction(page, 'charlySendMessage') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
