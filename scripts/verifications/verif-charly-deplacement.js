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
const noms = ['tcEstDeplacement', 'tcVerbeConjugue', 'tcDeplacementsProposes', '_tcLigneRdv', 'tcAppliquerDeplacement', 'tcExecuterDeplacement',
  'tcTraiterDeplacement', 'tcDeplacementHorsJour', 'tcJoursCites', 'tcEvenementFin', 'tcEvenementCouvre', 'tcReponsePrevenir', 'tcRepondreDeplacement', 'tcRdvRemplace', 'tcSansAccents',
  'extractAgendaProposals', 'tcFormaterDateHumaine', 'tcFormaterHeure', 'escapeHTMLSafe',
  'tcRemplirModele', 'tcValeursDuRdv', 'tcContactDuRdv',
  // Mission 73 : les propositions de créneaux.
  'tcNomsLisibles', 'tcPropositionTexte', 'tcReponseDecalage', 'tcProposerLesCreneaux', 'tcEnvoyerPropositions', 'tcLignesPropositions',
  'tcDireBilanPropositions', 'tcCreneauxPourDecalage', 'tcPropositionLibelle', 'tcMinutesLisibles', 'tcHeureSql', 'tcClasseNormaliser',
  'tcReponseOuiNon', 'tcISO', 'tcEstBandeau', 'tcEvenementSurPlusieursJours',
  // Mission 73b : le profil (1 ici : aucune clé, « Je l’envoie ? » est posé).
  'tcConfianceCharly'];
const constantes = (page.match(/^const TC_PROPOSITION_[A-Z_]+ = [^;]+;$/gm) || []).join('\n');

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
    contactsList: [{ id: 'c1', name: 'William Ayache', referenceCompte: 'REFW' }, { id: 'c2', name: 'Marie Dupont', phone: '0600000000' }],
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
    TC_BACKEND: { propositionCreer: async (corps) => { propositions.push(corps); return { rdv_id: propositions.length, url: corps.reference ? null : 'https://timecool.fr/rdv/ABCD2345' }; } },
  };
  const propositions = [];
  vm.createContext(ctx);
  vm.runInContext('let _tcDeplacementEnAttente = null; let _tcQuestionnaireNumero = 0;\n' + constantes + '\n' + noms.map(source).join('\n')
    + '\n;globalThis.attente = () => _tcDeplacementEnAttente;', ctx);
  ctx.envoyes = envoyes;
  ctx.propositions = propositions;
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
  verifie('Charly demande UN accord pour le lot, le message montré, « déjà vu » possible (mission 73)',
    /William Ayache et Marie Dupont, je ne déplace rien tout de suite : je leur propose le nouveau créneau et deux autres/.test(q)
    && /Le message pour William : « Bonjour William, je dois décaler notre rendez-vous du .+ à 10h00\. Voici ce que je peux te proposer : » suivi des créneaux à choisir\./.test(q)
    && /Je l’envoie aux 2 \? Si c’est déjà vu avec eux, dis « déjà vu » : je déplace sans prévenir\.$/.test(q), q);
  verifie('la date est en toutes lettres, pas « ' + apres + ' »', q.indexOf(apres) < 0, q);
  verifie('rien n est déplacé avant la réponse', c.events[0].date === demain && c.events[1].date === demain);

  await c.tcRepondreDeplacement('C\'est déjà vu avec eux');
  verifie('« déjà vu » : les deux sont déplacés, à la même heure',
    c.events[0].date === apres && c.events[0].startH === 10 && c.events[1].date === apres && c.events[1].startH === 16);
  verifie('ce sont les mêmes rendez-vous : identifiant, lieu et contact gardés',
    c.events.length === 3 && c.events[0].id === 'charly_ai_1' && c.events[0].lieu === '12 rue X' && c.events[0].contact === 'c1');
  verifie('le déjeuner n a pas bougé', c.events[2].date === demain);
  verifie('personne n a été prévenu', c.envoyes.length === 0);

  // « oui » (mission 73) : rien ne bouge, chacun reçoit des créneaux ; le rendez-vous est marqué en attendant la réponse.
  const c2 = contexte(true);
  c2.charlyIA.history.push(reponse);
  c2.tcTraiterDeplacement(Object.assign({}, reponse), demande);
  await c2.tcRepondreDeplacement('oui préviens-les');
  verifie('« oui » : rien n est déplacé, les deux restent à leur place, marqués', c2.events[0].date === demain && c2.events[1].date === demain
    && c2.events[0].decalage && c2.events[0].decalage.rdv === 1 && c2.events[1].decalage && c2.events[1].decalage.rdv === 2, JSON.stringify(c2.events.map(e => e.decalage)));
  const p0 = c2.propositions[0] || {}, p1 = c2.propositions[1] || {};
  verifie('une proposition chacun : William par sa messagerie TimeCool, Marie par un lien (SMS)', c2.propositions.length === 2
    && p0.reference === 'REFW' && p0.remplace === 'charly_ai_1' && p0.titre === 'Rendez-vous avocat'
    && !p1.reference && p1.canal === 'sms' && p1.prenom_destinataire === 'Marie', JSON.stringify(c2.propositions));
  verifie('trois créneaux : d abord celui demandé (après-demain 10h), puis deux autres libres', (p0.creneaux || []).length === 3
    && p0.creneaux[0].debut === apres + ' 10:00:00' && p0.creneaux[0].fin === apres + ' 11:00:00' && p0.creneaux[1].debut > p0.creneaux[0].fin, JSON.stringify(p0.creneaux));
  verifie('William et Marie n ont pas le même créneau proposé deux fois', (p1.creneaux || []).every(x => !(p0.creneaux || []).some(y => y.debut === x.debut)), JSON.stringify(p1.creneaux));
  verifie('le texte : « Je décale » avec l ancienne date, sans nouvelle date écrite (les créneaux sont des boutons)',
    /^Bonjour William, je dois décaler notre rendez-vous du .+ à 10h00\. Voici ce que je peux te proposer :$/.test(p0.texte || ''), p0.texte);
  verifie('rien n est parti par l ancien chemin (pas de fenêtre par contact)', c2.envoyes.length === 0);
  const bilan2 = c2.charlyIA.history[c2.charlyIA.history.length - 1];
  verifie('le bilan : les créneaux de chacun, William dans sa messagerie, Marie à envoyer d un geste (bouton, avec le lien)',
    /• « Rendez-vous avocat » : je propose à William Ayache /.test(bilan2.content) && /• Envoyé dans la messagerie TimeCool : William Ayache/.test(bilan2.content)
    && /• Message prêt avec le lien des créneaux, à envoyer toi-même d’un geste \(SMS ou email\) : Marie Dupont/.test(bilan2.content)
    && /restent à leur place, marqués ⏳/.test(bilan2.content) && bilan2._envois && bilan2._envois.length === 1 && / https:\/\/timecool\.fr\/rdv\/ABCD2345$/.test(bilan2._envois[0].texte), bilan2.content);

  // « non » : rien ne part, rien ne bouge.
  const c5 = contexte(true);
  c5.charlyIA.history.push(reponse);
  c5.tcTraiterDeplacement(Object.assign({}, reponse), demande);
  await c5.tcRepondreDeplacement('non');
  verifie('« non » : rien ne part, les deux restent à leur place', c5.propositions.length === 0 && c5.events[0].date === demain && c5.events[1].date === demain
    && /restent à leur place\.$/.test(c5.charlyIA.history[c5.charlyIA.history.length - 1].content), c5.charlyIA.history[c5.charlyIA.history.length - 1].content);

  verifie('« pas besoin de les prévenir » veut dire déjà vu', c2.tcReponseDecalage('pas besoin de les prévenir') === 'vu');
  verifie('« oui », « vas-y » : envoyer ; « non » : non', c2.tcReponseDecalage('oui') === 'envoyer' && c2.tcReponseDecalage('vas-y') === 'envoyer' && c2.tcReponseDecalage('non') === 'non');
  verifie('« quel temps fait-il » ne répond pas à la question', c2.tcReponseDecalage('quel temps fait-il') === null);

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
