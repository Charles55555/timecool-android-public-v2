// « Je ne pourrai pas honorer mes rendez-vous demain / cette semaine » :
// le meme message a trois choix que pour un voyage.
//
// Charles, 04/10 : « Il faudra faire de meme si je previens d'une
// contrainte d'honorer mes rdv du lendemain ou du surlendemain ou
// carrement pour une semaine entiere ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
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

/* Horloge fixee : lundi 5 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 5, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}

const trace = { orig: 0, saves: 0, envois: [], confirms: [] };
let reponses = [];
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise, Date: DateFixe,
  mode: 'user', events: [], charlyIA: { history: [] },
  contacts: { c1: { name: 'Marc Dupont' }, c2: { name: 'Sophie Anceau' } },
  tcContactDuRdv: (e) => (e && e.contact ? ctx.contacts[e.contact] || null : null),
  tcFormaterDateHumaine: (d) => d,
  escapeHTMLSafe: (t) => String(t),
  renderCharlyChat: () => {}, render: () => {},
  saveEventsToStorage: () => { trace.saves++; },
  setTimeout: () => 0, tcDernierMessageCharly: () => null,
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  _origValidateAgendaProposalFromMsg: () => { trace.orig++; },
  tcConfirm: async (t) => { trace.confirms.push(t); return reponses.length ? reponses.shift() : true; },
  tcVouvoiement: () => false,
  tcModeleMessage: () => 'Bonjour [Prénom], je dois annuler le rendez-vous du [date].',
  tcRemplirModele: (t, v) => t.replace('[Prénom]', v['[Prénom]']).replace('[date]', v['[date]']),
  tcValeursDuRdv: (nom, ev) => ({ '[Prénom]': nom.split(' ')[0], '[date]': ev.date }),
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'sms'; },
  tcDirePrevenance: () => {},
  tcComparerEvenements: (a, b) => (a.date + String(a.startH).padStart(2, '0')) < (b.date + String(b.startH).padStart(2, '0')) ? -1 : 1
};
vm.createContext(ctx);
['tcSansAccents', 'tcISO', 'tcHeureDansTexte', 'tcHorairePlage', 'tcPeriodeAgenda', 'tcPeriodeContrainte', 'tcDetecterContrainte',
 'tcRdvDeLaPeriode', 'showContrainte', 'tcGererContrainte', 'tcPeriodeContexte', 'tcPeriodeRien', 'tcPeriodeAnnuler', 'tcPeriodeDeplacer'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const jourPlus = (n) => { const d = new Date(2026, 9, 5 + n); return iso(d); };
const ev = (id, title, date, h, extra) => Object.assign({ id: id, title: title, date: date, startH: h, startM: 0, endH: h + 1, endM: 0, mode: 'user' }, extra || {});

titre('Reconnaitre une contrainte');
const D = (t) => ctx.tcDetecterContrainte(t);
verifie('« je ne pourrai pas honorer mes rdv demain »', D('Je ne pourrai pas honorer mes rdv demain'));
verifie('« je ne pourrai pas honorer mes rendez-vous demain et après-demain »', D('Je ne pourrai pas honorer mes rendez-vous demain et après-demain'));
verifie('« je suis indisponible toute la semaine prochaine pour mes rendez-vous »', D('Je suis indisponible toute la semaine prochaine pour mes rendez-vous'));
verifie('« impossible d\'honorer mes rdv cette semaine »', D('Impossible d\'honorer mes rdv cette semaine'));
verifie('« j\'ai un empêchement jusqu\'à vendredi pour mes rendez-vous »', D('J\'ai un empêchement jusqu\'à vendredi pour mes rendez-vous'));

titre('Ne pas se declencher a tort');
verifie('« annule mes rendez-vous de demain » : c est la suppression', !D('Annule mes rendez-vous de demain'));
verifie('« qu\'ai-je demain ? » : une consultation', !D('Qu\'ai-je comme rendez-vous demain ?'));
verifie('« je ne peux pas honorer mon rdv de demain 10h » : une heure precise = UN rendez-vous', !D('Je ne peux pas honorer mon rdv de demain 10h'));
verifie('« je ne peux pas me connecter demain » : pas de rendez-vous en jeu', !D('Je ne peux pas me connecter demain'));
verifie('« je ne pourrai pas honorer mes rdv » sans periode : rien a faire d ici', !D('Je ne pourrai pas honorer mes rdv'));
verifie('« rendez-vous avec Marc demain à 15h » : une creation', !D('Rendez-vous avec Marc demain à 15h'));

titre('La periode (aujourd hui = lundi 5 octobre)');
const per = (t) => { const p = ctx.tcPeriodeContrainte(t); return p ? [iso(p.debut), iso(p.fin || p.debut)] : null; };
verifie('demain → mardi 6', JSON.stringify(per('mes rdv demain')) === JSON.stringify(['2026-10-06', '2026-10-06']));
verifie('après-demain → mercredi 7', JSON.stringify(per('mes rdv après-demain')) === JSON.stringify(['2026-10-07', '2026-10-07']));
verifie('demain et après-demain → 6 au 7', JSON.stringify(per('mes rdv demain et après-demain')) === JSON.stringify(['2026-10-06', '2026-10-07']));
verifie('cette semaine → lundi 5 au dimanche 11', JSON.stringify(per('mes rdv cette semaine')) === JSON.stringify(['2026-10-05', '2026-10-11']));
verifie('la semaine prochaine → 12 au 18', JSON.stringify(per('mes rdv la semaine prochaine')) === JSON.stringify(['2026-10-12', '2026-10-18']));
verifie('toute la semaine → cette semaine', JSON.stringify(per('mes rdv toute la semaine')) === JSON.stringify(['2026-10-05', '2026-10-11']));
verifie('jusqu\'à vendredi → aujourd hui au 9', JSON.stringify(per('mes rdv jusqu\'à vendredi')) === JSON.stringify(['2026-10-05', '2026-10-09']));
verifie('jusqu\'à lundi (aujourd hui) → aujourd hui seul', JSON.stringify(per('mes rdv jusqu\'à lundi')) === JSON.stringify(['2026-10-05', '2026-10-05']));
verifie('sans periode : null', per('mes rdv') === null);

titre('Le message : sans rien ajouter, la liste limitee a huit');
(async () => {
  // Une semaine chargee : 12 rendez-vous.
  const semaine = [];
  for (let i = 0; i < 12; i++) semaine.push(ev('r' + i, 'RDV ' + i, jourPlus(i % 5), 9 + (i % 5), i < 4 ? { contact: 'c1' } : {}));
  ctx.events = semaine.concat([ev('hors', 'Hors periode', '2026-10-20', 10)]);
  ctx.charlyIA.history = [];
  await ctx.tcGererContrainte('Je ne pourrai pas honorer mes rendez-vous cette semaine');
  const m = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('le message de l utilisateur est enregistre une fois', ctx.charlyIA.history.filter((x) => x.role === 'user').length === 1);
  verifie('annonce les 12 rendez-vous de la periode', /12 rendez-vous<\/b> cette semaine/.test(m.content));
  verifie('huit lignes seulement', (m.content.match(/•/g) || []).length === 8);
  verifie('…et 4 autres', /…et 4 autres/.test(m.content));
  verifie('la precision, avec le compte (4 sur 12)', /contact enregistré \(4 sur 12\)/.test(m.content));
  verifie('un rendez-vous hors periode n est pas compte', !/Hors periode/.test(m.content));
  verifie('c est une carte « contrainte », sans donnees de conflit', m.periode === true && m.contrainte === true && !m.conflictData);
  verifie('« Que fait-on ? »', /Que fait-on \?/.test(m.content));

  // Aucun rendez-vous : on le dit, rien d autre.
  ctx.events = [ev('loin', 'Loin', '2026-12-01', 10)];
  ctx.charlyIA.history = [];
  await ctx.tcGererContrainte('Je ne pourrai pas honorer mes rdv demain');
  const vide = ctx.charlyIA.history[ctx.charlyIA.history.length - 1];
  verifie('aucun rendez-vous : « rien a annuler », pas de carte', /aucun rendez-vous demain : rien à annuler/.test(vide.content) && !vide.periode);

  titre('Choix 1 — je maintiens tout');
  ctx.events = [ev('a', 'RDV A', jourPlus(1), 9), ev('b', 'RDV B', jourPlus(1), 14, { contact: 'c1' })];
  ctx.charlyIA.history = [];
  await ctx.tcGererContrainte('Je ne pourrai pas honorer mes rdv demain');
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [] });
  ctx.tcPeriodeRien();
  verifie('aucun voyage ajoute (il n y en a pas)', trace.orig === 0);
  verifie('rien supprime', ctx.events.length === 2);
  verifie('Charly le dit', /je ne touche à rien/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));
  verifie('la question est marquee repondue', ctx.tcPeriodeContexte() === null);

  titre('Choix 2 — j annule, et je previens ceux que je peux');
  ctx.events = [ev('a', 'RDV A', jourPlus(1), 9), ev('b', 'RDV B', jourPlus(1), 14, { contact: 'c1' }), ev('c', 'RDV C', jourPlus(3), 10)];
  ctx.charlyIA.history = [];
  await ctx.tcGererContrainte('Je ne pourrai pas honorer mes rdv demain');
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [] });
  reponses = [true, true];
  await ctx.tcPeriodeAnnuler();
  verifie('aucun voyage ajoute', trace.orig === 0);
  verifie('les deux rendez-vous de demain sont supprimes', ctx.events.length === 1 && ctx.events[0].id === 'c');
  verifie('celui d un autre jour ne bouge pas', ctx.events[0].title === 'RDV C');
  verifie('la confirmation ne parle pas de voyage', !/voyage/.test(trace.confirms[0]) && /Annuler 2 rendez-vous \?/.test(trace.confirms[0]), trace.confirms[0]);
  verifie('un seul message parti : celui qui a un contact', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont');
  verifie('Charles confirme avant l envoi', /Prévenir Marc Dupont/.test(trace.confirms[1]));
  verifie('le bilan dit qui prevenir soi-meme', /À prévenir toi-même[^.]*RDV A/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));

  titre('Choix 3 — je deplace');
  ctx.events = [ev('a', 'RDV A', jourPlus(1), 9)];
  ctx.charlyIA.history = [];
  await ctx.tcGererContrainte('Je ne pourrai pas honorer mes rdv demain');
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [] });
  ctx.tcPeriodeDeplacer();
  const dep = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('aucun voyage ajoute, rien supprime', trace.orig === 0 && ctx.events.length === 1);
  verifie('ne dit pas « Voyage noté »', !/Voyage noté/.test(dep) && /Rien n'est supprimé/.test(dep), dep.slice(0, 60));
  verifie('rappelle comment decaler', /décale le dentiste à lundi 15h/.test(dep));

  titre('Branche dans le chat, avant la suppression');
  const envoi = extraire('charlySendMessage') || '';
  const iC = envoi.indexOf('tcDetecterContrainte(text)');
  const iS = envoi.indexOf('INTERCEPTION SUPPRESSION DE RDV');
  verifie('la contrainte est reconnue dans charlySendMessage', iC > -1);
  verifie('et avant l interception de suppression', iC > -1 && iS > -1 && iC < iS, 'sinon « annule... » la prendrait');

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
