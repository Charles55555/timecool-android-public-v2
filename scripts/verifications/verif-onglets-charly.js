// Les quatre onglets de Charly, et « Prévenir d'un retard ».
//
// Charles, 04/10 : retirer Calculer trajet et Réserver ; garder Créer
// mon agenda, Créer un nouveau rdv, Gérer un imprévu, et ajouter
// Prévenir d'un retard ; une ligne d'aide au-dessus.
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

/* Horloge fixee : lundi 5 octobre 2026, 10h. */
const FIXE = new Date(2026, 9, 5, 10, 0, 0);
class DateFixe extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); }
  static now() { return FIXE.getTime(); }
}
const trace = { confirms: [], envois: [], dits: 0 };
let reponses = [];
const ctx = {
  console, String, Number, Array, Object, Promise, Date: DateFixe,
  mode: 'user', events: [], charlyIA: { history: [] },
  contacts: { c1: { name: 'Marc Dupont' } },
  tcContactDuRdv: (e) => (e && e.contact ? ctx.contacts[e.contact] || null : null),
  tcFormaterDateHumaine: (d) => d,
  renderCharlyChat: () => {},
  tcModeleMessage: (a) => 'Bonjour [Prénom], je serai en retard pour le rendez-vous du [date] à [heure].',
  tcVouvoiement: () => false,
  tcRemplirModele: (t, v) => t.replace('[Prénom]', v['[Prénom]']).replace('[date]', v['[date]']).replace('[heure]', v['[heure]']),
  tcValeursDuRdv: (nom, ev) => ({ '[Prénom]': nom.split(' ')[0], '[date]': ev.date, '[heure]': ev.startH + 'h' }),
  tcConfirm: async (t) => { trace.confirms.push(t); return reponses.length ? reponses.shift() : true; },
  tcTransmettrePrevenance: async (c, t) => { trace.envois.push([c.name, t]); return 'sms'; },
  tcDirePrevenance: () => { trace.dits++; },
  tcComparerEvenements: (a, b) => (a.date + String(a.startH).padStart(2, '0')) < (b.date + String(b.startH).padStart(2, '0')) ? -1 : 1
};
vm.createContext(ctx);
['tcISO', 'tcHorairePlage', 'tcPrevenirRetard'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const ev = (id, title, date, h, m, extra) => Object.assign({ id: id, title: title, date: date, startH: h, startM: m, endH: h + 1, endM: m, mode: 'user' }, extra || {});
const reinit = (liste, rep) => { ctx.events = liste; ctx.charlyIA.history = []; Object.assign(trace, { confirms: [], envois: [], dits: 0 }); reponses = rep || []; };
const dernier = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1];

(async () => {
  titre('Prévenir d un retard : le cas normal');
  reinit([ev('a', 'Dentiste', '2026-10-05', 15, 0, { contact: 'c1' })], [true]);
  await ctx.tcPrevenirRetard();
  verifie('Charles confirme avant l envoi, avec le rendez-vous et le texte', trace.confirms.length === 1 && /Prévenir Marc Dupont/.test(trace.confirms[0]) && /Dentiste/.test(trace.confirms[0]) && /je serai en retard/.test(trace.confirms[0]), trace.confirms[0]);
  verifie('le message part, une seule fois', trace.envois.length === 1 && trace.envois[0][0] === 'Marc Dupont');
  verifie('Charly le dit', /prévenu\(e\) de ton retard/.test(dernier().content));
  reinit([ev('a', 'Dentiste', '2026-10-05', 15, 0, { contact: 'c1' })], [false]);
  await ctx.tcPrevenirRetard();
  verifie('s il refuse, rien ne part', trace.envois.length === 0);

  titre('Quel rendez-vous ?');
  reinit([ev('lointain', 'Plus tard', '2026-10-05', 17, 0, { contact: 'c1' }), ev('proche', 'Dentiste', '2026-10-05', 11, 0, { contact: 'c1' })], [true]);
  await ctx.tcPrevenirRetard();
  verifie('le plus proche, pas le premier de la liste', /Dentiste/.test(trace.confirms[0]) && !/Plus tard/.test(trace.confirms[0]));
  reinit([ev('commence', 'Rendez-vous commence', '2026-10-05', 9, 40, { contact: 'c1' })], [true]);
  await ctx.tcPrevenirRetard();
  verifie('commence il y a 20 minutes : encore le « prochain » (c est le retard)', trace.confirms.length === 1);
  reinit([ev('passe', 'Trop tard', '2026-10-05', 8, 0, { contact: 'c1' })]);
  await ctx.tcPrevenirRetard();
  verifie('commence il y a 2 h : plus a prevenir', trace.confirms.length === 0 && /aucun rendez-vous à venir/.test(dernier().content));
  reinit([Object.assign(ev('j', 'Journee', '2026-10-05', 0, 0, { contact: 'c1' }), { allDay: true }), ev('d', 'Demain', '2026-10-06', 9, 0, { contact: 'c1' })], [true]);
  await ctx.tcPrevenirRetard();
  verifie('une journee entiere n est pas « le prochain »', /Demain/.test(trace.confirms[0]));
  reinit([Object.assign(ev('p', 'Pro', '2026-10-05', 12, 0, { contact: 'c1' }), { mode: 'pro' })]);
  await ctx.tcPrevenirRetard();
  verifie('l autre mode (pro) est ignore', trace.confirms.length === 0);

  titre('Sans contact : il le dit');
  reinit([ev('a', 'Coiffeur', '2026-10-05', 14, 0)]);
  await ctx.tcPrevenirRetard();
  verifie('aucun message, aucune confirmation', trace.envois.length === 0 && trace.confirms.length === 0);
  verifie('Charly explique et dit quoi faire', /Coiffeur/.test(dernier().content) && /pas de contact enregistré/.test(dernier().content) && /relier un/.test(dernier().content), dernier().content);
  reinit([]);
  await ctx.tcPrevenirRetard();
  verifie('aucun rendez-vous : « personne à prévenir »', /personne à prévenir/.test(dernier().content));

  titre('Branché');
  const act = extraire('charlyQuickAction') || '';
  verifie('l onglet « retard » appelle tcPrevenirRetard, avant tout envoi au modèle', /if \(action === 'retard'\) \{ tcPrevenirRetard\(\); return; \}/.test(act));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
