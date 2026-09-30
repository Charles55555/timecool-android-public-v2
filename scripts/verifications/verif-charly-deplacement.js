// Rejoue « déplace mes deux rendez-vous de demain à après-demain, même
// heure » (30/09/2026) : Charly déplace sans carte « Valider », demande
// d'abord s'il faut prévenir les contacts, et garde chaque rendez-vous
// (même identifiant, même contact) au lieu d'en créer un second.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');

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
const noms = ['tcEstDeplacement', 'tcDeplacementsProposes', '_tcLigneRdv', 'tcAppliquerDeplacement',
  'tcTraiterDeplacement', 'tcReponsePrevenir', 'tcRepondreDeplacement', 'tcRdvRemplace', 'tcSansAccents',
  'extractAgendaProposals', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'escapeHTMLSafe',
  'tcRemplirModele', 'tcValeursDuRdv', 'tcContactDuRdv'];

let ko = 0;
function verifie(nom, ok, pourquoi) {
  console.log((ok ? '  OK ' : '  KO ') + nom + (ok || !pourquoi ? '' : '  - ' + pourquoi));
  if (!ok) ko++;
}
function iso(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const demain = iso(1), apres = iso(2);

function contexte(avecContacts) {
  const envoyes = [];
  const ctx = {
    console, Date, Math, JSON, Number, String, Set, Array, RegExp, Object, Promise, parseInt,
    mode: 'user', currentPage: 'chat', charlyIA: { history: [] },
    contactsList: [{ id: 'c1', name: 'William Ayache' }, { id: 'c2', name: 'Marie Dupont' }],
    events: [
      { id: 'charly_ai_1', mode: 'user', date: demain, startH: 10, startM: 0, endH: 11, endM: 0,
        title: 'Rendez-vous avocat', lieu: '12 rue X', ...(avecContacts ? { contact: 'c1' } : {}) },
      { id: 'charly_ai_2', mode: 'user', date: demain, startH: 16, startM: 0, endH: 17, endM: 0,
        title: 'Rendez-vous dermatologue', ...(avecContacts ? { contact: 'c2' } : {}) },
      { id: 'autre', mode: 'user', date: demain, startH: 12, startM: 0, endH: 13, endM: 0, title: 'Déjeuner' },
    ],
    tcPousserMessageUtilisateur: (t) => ctx.charlyIA.history.push({ role: 'user', content: t }),
    renderCharlyChat() {}, render() {}, showToast() {}, saveEventsToStorage() {}, addDemarche() {},
    tcModeleMessage: () => 'Bonjour [Prénom], je dois décaler notre rendez-vous du [date] à [heure]. Voici ce que je peux te proposer :',
    tcVouvoiement: () => false,
    tcConfirm: async () => true,
    tcTransmettrePrevenance: async (c, texte) => { envoyes.push({ nom: c.name, texte }); return 'sms'; },
    tcDirePrevenance() {},
  };
  vm.createContext(ctx);
  vm.runInContext('let _tcDeplacementEnAttente = null;\n' + noms.map(source).join('\n')
    + '\n;globalThis.attente = () => _tcDeplacementEnAttente;', ctx);
  ctx.envoyes = envoyes;
  return ctx;
}

const demande = 'Les deux sont concernés en fait pour l\'imprévu donc si tu peux les déplacer en fait pour demain pour après-demain à la même heure';
const reponse = { role: 'assistant', content: 'Je m\'en occupe 👍\n[AGENDA]\n'
  + apres + ' | 10:00-11:00 | Rendez-vous avocat | rdv\n'
  + apres + ' | 16:00-17:00 | Rendez-vous dermatologue | rdv\n[/AGENDA]' };

(async () => {
  // Avec contacts : une question, rien ne bouge encore
  const c = contexte(true);
  c.charlyIA.history.push(reponse);
  verifie('la demande est reconnue comme un déplacement', c.tcTraiterDeplacement(reponse, demande) === true);
  verifie('pas de carte « Valider » à cliquer', reponse._deplacement === true);
  const q = c.charlyIA.history[c.charlyIA.history.length - 1].content;
  verifie('Charly demande : les prévenir, ou déjà vu ?',
    /William Ayache et Marie Dupont/.test(q) && /déjà vu le sujet avec eux/.test(q), q);
  verifie('la date est en toutes lettres, pas « ' + apres + ' »', q.indexOf(apres) < 0, q);
  verifie('rien n est déplacé avant la réponse', c.events[0].date === demain && c.events[1].date === demain);

  await c.tcRepondreDeplacement('C\'est déjà vu avec eux');
  verifie('« déjà vu » : les deux sont déplacés, à la même heure',
    c.events[0].date === apres && c.events[0].startH === 10 && c.events[1].date === apres && c.events[1].startH === 16);
  verifie('ce sont les mêmes rendez-vous : identifiant, lieu et contact gardés',
    c.events.length === 3 && c.events[0].id === 'charly_ai_1' && c.events[0].lieu === '12 rue X' && c.events[0].contact === 'c1');
  verifie('le déjeuner n a pas bougé', c.events[2].date === demain);
  verifie('personne n a été prévenu', c.envoyes.length === 0);

  // « Préviens-les » : déplacés, puis un message chacun, ancienne et nouvelle date
  const c2 = contexte(true);
  c2.charlyIA.history.push(reponse);
  c2.tcTraiterDeplacement(Object.assign({}, reponse), demande);
  await c2.tcRepondreDeplacement('oui préviens-les');
  verifie('« préviens-les » : déplacés aussi', c2.events[0].date === apres && c2.events[1].date === apres);
  verifie('un message à chacun', c2.envoyes.length === 2
    && c2.envoyes[0].nom === 'William Ayache' && c2.envoyes[1].nom === 'Marie Dupont');
  const m0 = (c2.envoyes[0] || {}).texte || '';
  verifie('le message cite l ancienne date puis la nouvelle',
    /Bonjour William/.test(m0) && /à 10h00\. Voici ce que je peux te proposer : le .+ à 10h00\.$/.test(m0), m0);

  verifie('« pas besoin de les prévenir » veut dire déjà vu', c2.tcReponsePrevenir('pas besoin de les prévenir') === 'vu');
  verifie('« quel temps fait-il » ne répond pas à la question', c2.tcReponsePrevenir('quel temps fait-il') === null);

  // Sans contact : déplacé tout de suite, sans question
  const c3 = contexte(false);
  c3.tcTraiterDeplacement(Object.assign({}, reponse), demande);
  verifie('sans contact : déplacé tout de suite', c3.events[0].date === apres && !c3.attente());
  verifie('et Charly dit « C est fait »', /C'est fait/.test(c3.charlyIA.history.map(m => m.content).join(' ')));

  // Une création ordinaire n est pas un déplacement
  const c4 = contexte(true);
  const creation = { role: 'assistant', content: '[AGENDA]\n' + apres + ' | 09:00-10:00 | Dentiste | rdv\n[/AGENDA]' };
  verifie('« ajoute un dentiste » reste une création', c4.tcTraiterDeplacement(creation, 'ajoute un dentiste après-demain 9h') === false);

  verifie('le prompt ne demande plus l accord avant de déplacer',
    page.indexOf('Toute modification nécessite TOUJOURS l\'accord') < 0 && page.indexOf('AUCUNE question, AUCUNE demande d\'accord') > -1);

  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  KO ' + e.message); process.exit(1); });
