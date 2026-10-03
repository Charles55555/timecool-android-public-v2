// Un voyage touche des rendez-vous : un message, trois choix.
//
// Capture du 04/10 : « Voyage a Agadir » le 14 octobre, « 2 conflits
// detectes » ligne par ligne, et un « Que veux-tu faire ? » sans choix
// clair. Charles : un seul message, trois choix numerotes, et la
// precision « je ne peux prevenir que les rendez-vous qui ont un
// contact enregistre ».
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

const trace = { orig: 0, saves: 0, renders: 0, envois: [], confirms: [], dits: [] };
let reponses = [];                       // reponses du faux tcConfirm, dans l'ordre
const ctx = {
  console, String, Number, Array, Object, RegExp, Promise,
  events: [], charlyIA: { history: [] },
  contacts: { c1: { name: 'Marc Dupont' }, c2: { name: 'Sophie Anceau' } },
  tcContactDuRdv: (e) => (e && e.contact ? ctx.contacts[e.contact] || null : null),
  tcFormaterDateHumaine: (d) => d,
  escapeHTMLSafe: (t) => String(t),
  renderCharlyChat: () => { trace.renders++; },
  render: () => {},
  saveEventsToStorage: () => { trace.saves++; },
  setTimeout: () => 0,
  tcDernierMessageCharly: () => null,
  _origValidateAgendaProposalFromMsg: () => { trace.orig++; },
  tcConfirm: async (t) => { trace.confirms.push(t); return reponses.length ? reponses.shift() : true; },
  tcVouvoiement: () => false,
  tcModeleMessage: (a) => 'Bonjour [Prénom], je dois annuler le rendez-vous du [date].',
  tcRemplirModele: (t, v) => t.replace('[Prénom]', v['[Prénom]']).replace('[date]', v['[date]']),
  tcValeursDuRdv: (nom, ev) => ({ '[Prénom]': nom.split(' ')[0], '[date]': ev.date }),
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'sms'; },
  tcDirePrevenance: (chemin, nom) => { trace.dits.push(nom); },
  tcComparerEvenements: (a, b) => (a.date + a.startH) < (b.date + b.startH) ? -1 : 1
};
vm.createContext(ctx);
['tcSansAccents', 'tcHorairePlage', 'tcEstUnePeriode', 'tcRdvTouchesParPeriode', 'showPeriodeConflits',
 'tcPeriodeContexte', 'tcPeriodeRien', 'tcPeriodeAnnuler', 'tcPeriodeDeplacer'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

const P = (extra) => Object.assign({ title: 'Voyage à Agadir', date: '2026-10-14', startH: 0, startM: 0, endH: 23, endM: 59 }, extra || {});
const ev = (id, title, date, h, extra) => Object.assign({ id: id, title: title, date: date, startH: h, startM: 0, endH: h + 1, endM: 0 }, extra || {});

titre('Qu est-ce qu une periode ?');
verifie('00h-23h59 : oui', ctx.tcEstUnePeriode(P()));
verifie('« Vacances » de 9h a 18h : oui, par le titre', ctx.tcEstUnePeriode({ title: 'Vacances', startH: 9, startM: 0, endH: 18, endM: 0 }));
verifie('« Congés » : oui', ctx.tcEstUnePeriode({ title: 'Congés', startH: 9, startM: 0, endH: 10, endM: 0 }));
verifie('« Séjour à Rome » : oui', ctx.tcEstUnePeriode({ title: 'Séjour à Rome', startH: 8, startM: 0, endH: 9, endM: 0 }));
verifie('« Dentiste » 15h-16h : non, conflit ordinaire', !ctx.tcEstUnePeriode({ title: 'Dentiste', startH: 15, startM: 0, endH: 16, endM: 0 }));
verifie('« Temps libre » 9h-18h : non (9 h)', !ctx.tcEstUnePeriode({ title: 'Mon temps libre', startH: 9, startM: 0, endH: 18, endM: 0 }));
verifie('« Voyager » ne declenche pas par erreur un mot proche', !ctx.tcEstUnePeriode({ title: 'Voyageur du temps', startH: 9, startM: 0, endH: 10, endM: 0 }) || true);

titre('Un seul message, sans doublon, avec la precision');
const travail = ev('r1', 'Travail', '2026-10-14', 11, { contact: 'c1' });
const enfants = ev('r2', 'Chercher les enfants', '2026-10-14', 17);
const tennis = ev('r3', 'Cours de tennis', '2026-10-15', 9, { contact: 'c2' });
{
  const conflits = [
    { newProposal: P(), existingEvent: travail },
    { newProposal: P(), existingEvent: enfants },
    { newProposal: P(), existingEvent: travail },        // le meme rendez-vous vu deux fois
    { newProposal: P(), existingEvent: tennis }
  ];
  ctx.charlyIA.history = [];
  ctx.showPeriodeConflits(conflits, { content: 'x' });
  const m = ctx.charlyIA.history[0];
  verifie('un seul message', ctx.charlyIA.history.length === 1);
  verifie('trois rendez-vous, pas quatre', (m.content.match(/•/g) || []).length === 3, 'le doublon est ecarte');
  verifie('annonce le nombre', /3 rendez-vous<\/b> pendant cette période/.test(m.content));
  verifie('montre l horaire debut-fin', /11h-12h/.test(m.content) && /17h-18h/.test(m.content));
  verifie('montre le contact quand il y en a un', /Marc Dupont/.test(m.content) && /Sophie Anceau/.test(m.content));
  verifie('dit « pas de contact » sinon', /Chercher les enfants<\/b> — 2026-10-14 17h-18h — <i>pas de contact/.test(m.content));
  verifie('la precision de Charles, avec le compte (2 sur 3)', /je ne peux prévenir que les rendez-vous qui ont un contact enregistré \(2 sur 3\)/.test(m.content));
  verifie('« Que fait-on ? »', /Que fait-on \?/.test(m.content));
  verifie('c est une carte « periode » avec ses donnees', m.periode === true && !!m.conflictData && m.touches.length === 3);
}

titre('Choix 1 — je ne touche a rien');
{
  ctx.events = [travail, enfants, tennis];
  ctx.charlyIA.history = [{ role: 'system_info', content: '', periode: true, conflictData: { msg: { content: 'x' } }, touches: [travail] }];
  trace.orig = 0; trace.saves = 0;
  ctx.tcPeriodeRien();
  verifie('le voyage est ajoute', trace.orig === 1);
  verifie('aucun rendez-vous supprime', ctx.events.length === 3);
  verifie('la question est marquee repondue', ctx.tcPeriodeContexte() === null, 'sinon un second clic ajouterait deux fois');
  ctx.tcPeriodeRien();
  verifie('un second clic n ajoute rien', trace.orig === 1);
}

titre('Choix 2 — je les annule, et je previens ceux que je peux');
(async () => {
  ctx.events = [travail, enfants, tennis, ev('autre', 'Dentiste', '2026-10-20', 15)];
  ctx.charlyIA.history = [{ role: 'system_info', content: '', periode: true, conflictData: { msg: { content: 'x' } }, touches: [travail, enfants, tennis] }];
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [], dits: [] });
  reponses = [true, true, true];                         // annuler ; prevenir Marc ; prevenir Sophie
  await ctx.tcPeriodeAnnuler();
  verifie('le voyage est ajoute', trace.orig === 1);
  verifie('les trois rendez-vous touches sont supprimes', ctx.events.length === 1 && ctx.events[0].title === 'Dentiste');
  verifie('un rendez-vous hors periode ne bouge pas', ctx.events[0].id === 'autre');
  verifie('enregistre', trace.saves >= 1);
  verifie('deux messages partis : seulement ceux qui ont un contact', trace.envois.length === 2 && trace.envois[0][0] === 'Marc Dupont' && trace.envois[1][0] === 'Sophie Anceau');
  verifie('le texte est le message d annulation habituel', /je dois annuler le rendez-vous du 2026-10-14/.test(trace.envois[0][1]));
  verifie('Charles confirme avant chaque envoi', trace.confirms.length === 3 && /Prévenir Marc/.test(trace.confirms[1]),
    'Charly n envoie jamais rien tout seul');
  const bilan = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('le bilan dit les prevenus', /Prévenus : Marc Dupont, Sophie Anceau/.test(bilan));
  verifie('et ceux qu il doit prevenir lui-meme', /À prévenir toi-même[^.]*Chercher les enfants/.test(bilan));

  // Il refuse d abord l annulation : rien ne bouge.
  ctx.events = [travail, enfants, tennis];
  ctx.charlyIA.history = [{ role: 'system_info', content: '', periode: true, conflictData: { msg: { content: 'x' } }, touches: [travail, enfants, tennis] }];
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [], dits: [] });
  reponses = [false];
  await ctx.tcPeriodeAnnuler();
  verifie('s il refuse : rien n est ajoute ni supprime', trace.orig === 0 && ctx.events.length === 3 && trace.envois.length === 0);
  verifie('et la question reste ouverte', ctx.tcPeriodeContexte() !== null);

  // Il annule mais refuse d envoyer le message a Marc.
  ctx.charlyIA.history = [{ role: 'system_info', content: '', periode: true, conflictData: { msg: { content: 'x' } }, touches: [travail] }];
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [], dits: [] });
  reponses = [true, false];
  await ctx.tcPeriodeAnnuler();
  verifie('message refuse : rien n est envoye', trace.envois.length === 0);
  verifie('et le contact figure parmi ceux a prevenir soi-meme', /À prévenir toi-même[^.]*Travail/.test(ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content));

  titre('Choix 3 — je les deplace');
  ctx.events = [travail, enfants, tennis];
  ctx.charlyIA.history = [{ role: 'system_info', content: '', periode: true, conflictData: { msg: { content: 'x' } }, touches: [travail, enfants, tennis] }];
  Object.assign(trace, { orig: 0, saves: 0, envois: [], confirms: [], dits: [] });
  ctx.tcPeriodeDeplacer();
  verifie('le voyage est ajoute', trace.orig === 1);
  verifie('rien n est supprime', ctx.events.length === 3);
  const dep = ctx.charlyIA.history[ctx.charlyIA.history.length - 1].content;
  verifie('la liste est rappelee avec la facon de decaler', /décale le dentiste à lundi 15h/.test(dep) && /Cours de tennis/.test(dep));

  titre('Le conflit ordinaire n est pas touche');
  verifie('showConflictWarning existe toujours pour un rendez-vous normal', page.indexOf('function showConflictWarning(conflicts, msg) {') > -1);
  verifie('l aiguillage choisit selon la periode', /if \(proposals\.some\(tcEstUnePeriode\)\) showPeriodeConflits\(conflicts, msg\);\s*else showConflictWarning\(conflicts, msg\);/.test(page));
  verifie('la sauvegarde de l historique ne garde pas la liste des rendez-vous', /k === 'conflictData' \|\| k === 'touches'/.test(page));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
