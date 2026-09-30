// Rejoue les demandes de suppression et de décalage faites à Charly :
// la bonne cible, un « oui » tapé au clavier, jamais un rendez-vous
// pris au hasard. Le 30/09/2026, « supprime le rdv demain matin 10h »
// suivi d'un « oui » tapé n'a rien supprimé, et Charly a dit « c'est fait ».
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');

// Source d'une fonction de premier niveau, accolades équilibrées.
function source(nom) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + nom + '\\s*\\(');
  const m = re.exec(page);
  if (!m) throw new Error('fonction introuvable : ' + nom);
  let i = page.indexOf('{', m.index), n = 0;
  for (let j = i; j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}' && --n === 0) return page.slice(m.index, j + 1);
  }
  throw new Error('fonction non fermée : ' + nom);
}

const noms = ['detecterSuppressionRdv', 'tcHeureDansTexte', 'tcReponseOuiNon', 'tcSansAccents',
  'tcGererSuppressionRdv', 'tcConfirmerSuppressionRdv', 'tcAnnulerSuppressionRdv', 'tcRdvRemplace',
  'tcPeriodeAgenda', 'tcISO', 'parseFrenchDateFromText', 'tcComparerEvenements',
  'tcFormaterDateHumaine', 'tcFormaterHeure', 'escapeHTMLSafe'];

let ko = 0;
function verifie(nom, ok, pourquoi) {
  console.log((ok ? '  OK ' : '  KO ') + nom + (ok || !pourquoi ? '' : '  - ' + pourquoi));
  if (!ok) ko++;
}

function contexte() {
  const ctx = {
    console, Date, Math, JSON, Number, String, Set, Array, RegExp, Object, Promise,
    setTimeout: (f) => { if (f) f(); return 0; }, mode: 'user', currentPage: 'chat',
    charlyIA: { history: [] }, events: [], contactsList: [],
    tcPousserMessageUtilisateur: (t) => ctx.charlyIA.history.push({ role: 'user', content: t }),
    tcDefinirStatutCharly() {}, renderCharlyChat() {}, render() {}, showToast() {},
    saveEventsToStorage() {}, addDemarche() {}, tcDernierMessageCharly: () => null,
  };
  vm.createContext(ctx);
  vm.runInContext(noms.map(source).join('\n') +
    '\n;globalThis.attente = () => _tcSuppressionEnAttente;', ctx);
  vm.runInContext('let _tcSuppressionEnAttente = null;', ctx);
  return ctx;
}

(async () => {
  const demain = new Date(); demain.setDate(demain.getDate() + 1);
  const d = demain.getFullYear() + '-' + String(demain.getMonth() + 1).padStart(2, '0') + '-' + String(demain.getDate()).padStart(2, '0');
  const agenda = () => [
    { id: 'charly_ai_1', mode: 'user', date: d, startH: 10, startM: 0, endH: 11, endM: 0, title: 'Essai agenda Google' },
    { id: 'charly_ai_2', mode: 'user', date: d, startH: 16, startM: 0, endH: 17, endM: 0, title: 'Rendez-vous dermatologue', contact: 'c1' },
    { id: 'manuel_3', mode: 'user', date: d, startH: 8, startM: 30, endH: 9, endM: 0, title: 'Kiné' },
  ];

  // Reconnaissance de la demande
  const c0 = contexte();
  verifie('« supprime le rdv demain matin 10h » est une suppression', !!c0.detecterSuppressionRdv('supprime le rdv demain matin 10h'));
  verifie('« supprime celui de demain 10h » aussi, sans le mot rdv', !!c0.detecterSuppressionRdv('supprime celui de demain 10h'),
    'partait au modèle, qui répondait « c est fait »');
  verifie('« comment supprimer un rdv ? » n en est pas une', !c0.detecterSuppressionRdv('comment supprimer un rdv ?'));
  verifie('« le 10 » n est pas une heure', c0.tcHeureDansTexte('supprime le rdv du 10 octobre') === null);
  verifie('« 10h30 » en est une', JSON.stringify(c0.tcHeureDansTexte('à 10h30')) === '{"h":10,"m":30}');

  // Le scénario du 30/09, jusqu'au bout
  const c = contexte();
  c.events = agenda();
  await c.tcGererSuppressionRdv('supprime le rdv demain matin 10h');
  const cibles = c.attente() || [];
  verifie('seul le rendez-vous de 10h est visé', cibles.length === 1 && cibles[0].id === 'charly_ai_1',
    'visés : ' + cibles.map(e => e.title).join(', '));
  verifie('« oui » se reconnaît', c.tcReponseOuiNon('Oui') === true && c.tcReponseOuiNon('oui vas-y') === true);
  verifie('« non » aussi', c.tcReponseOuiNon('non merci') === false);
  verifie('« juste celui de 10h » n est ni l un ni l autre', c.tcReponseOuiNon('juste celui de 10h') === null);
  c.tcConfirmerSuppressionRdv();
  verifie('après « oui », il a vraiment disparu', !c.events.some(e => e.id === 'charly_ai_1') && c.events.length === 2);

  // La page traite bien le « oui » tapé avant le modèle
  verifie('un « oui » tapé confirme, sans passer par le modèle',
    page.indexOf('if (reponse) tcConfirmerSuppressionRdv();') > -1
    && page.indexOf('if (_tcSuppressionEnAttente) {') < page.indexOf('const activeKey = charlyIA.config.provider'));

  // Décalage : le bon rendez-vous, jamais le premier venu
  const c2 = contexte();
  const ev = agenda();
  verifie('décaler « Rendez-vous dermatologue » vise le dermatologue',
    c2.tcRdvRemplace(ev, 'Rendez-vous dermatologue', d, 'user') === 1,
    'avant : le premier créé par Charly ce jour-là, ici l essai de 10h');
  verifie('« RDV dermato » le retrouve aussi', c2.tcRdvRemplace(ev, 'RDV dermato', d, 'user') === 1);
  verifie('un titre inconnu ne retire rien', c2.tcRdvRemplace(ev, 'Dîner chez Paul', d, 'user') === -1,
    'un rendez-vous pris au hasard serait perdu');

  // Charly ne peut plus prétendre avoir supprimé
  verifie('le prompt lui interdit d annoncer une suppression',
    page.indexOf('Tu ne supprimes JAMAIS un rendez-vous de l\'agenda') > -1);

  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO ' + e.message); process.exit(1); });
