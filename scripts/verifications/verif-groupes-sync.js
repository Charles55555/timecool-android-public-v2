// Mission 27c (12/10) : les groupes de la messagerie (nom, membres par identifiant, trace, convocations) sont synchronises un
// par un (famille « groupe ») et reviennent apres deconnexion / reconnexion ; le bloc timecool_messages ne voyage plus
// comme reglage ; les decomptes sont relus au chargement de la messagerie et a l ouverture du groupe.
// Usage : node verif-groupes-sync.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
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

(async () => {
titre('1. La page : famille « groupe », cles retirees des reglages, rafraichissements');
const types = (page.match(/const TC_SYNC_TYPES = \{[\s\S]*?\n\};/) || [''])[0];
verifie('TC_SYNC_TYPES a une famille groupe (lire : tcGroupesPourSync, id, poser : tcPoserGroupes)', /groupe: \{\s+lire: function \(\) \{ return typeof tcGroupesPourSync === 'function' \? tcGroupesPourSync\(\) : \[\]; \},\s+id: function \(o\) \{ return o\.id; \},\s+poser: function \(liste\) \{ if \(typeof tcPoserGroupes === 'function'\) tcPoserGroupes\(liste\); \}\s+\}/.test(types));
const deja = (page.match(/const TC_SYNC_DEJA_SYNCHRONISE = \[[^\]]*\];/) || [''])[0];
verifie('timecool_messages et timecool_convocations ne voyagent plus comme reglages (TC_SYNC_DEJA_SYNCHRONISE)', /'timecool_messages', 'timecool_convocations'/.test(deja) && deja.indexOf(']') === deja.length - 2);
verifie('renderMessages relit les decomptes (au plus une fois par minute) ; openConversation d un groupe les relit tout de suite', /tcRafraichirToutesConvocations\(false\);\s+const all = tcConversationsAffichables\(\);/.test(fonction(page, 'renderMessages') || '') && /if \(msg\.isGroup && typeof tcRafraichirToutesConvocations === 'function'\) tcRafraichirToutesConvocations\(true\);/.test(fonction(page, 'openConversation') || ''));
verifie('le decompte garde son identifiant (ov._tcConvocId) pour etre rouvert a jour', /ov\._tcConvocId = c\.id;/.test(fonction(page, 'openConvocationDashboard') || '') && /if \(ov && ov\._tcConvocId\) \{ ov\.remove\(\); openConvocationDashboard\(ov\._tcConvocId\); \}/.test(fonction(page, 'tcRafraichirToutesConvocations') || ''));
verifie('le bouton Absent de la convocation recue est « ❌ Absent »', /❌ Absent<\/button>/.test(fonction(page, 'tcCadreConvocation') || '') && page.indexOf('✕ Absent') < 0);

titre('2. Simulation : un groupe part, l appareil est vide (deconnexion), le groupe revient avec ses membres et son decompte');
const appels = [];
const ctx = { console, String, Number, Array, Date, JSON, Object, Math,
  contactsList: [{ id: 'c1', name: 'Paul Convoc', referenceCompte: 'REFPAUL' }, { id: 'c2', name: 'Sans Compte' }],
  messages: { user: [
    { id: 1, with: 'Dr. Thomas Martin', thread: [{ from: 'them', text: 'Bonjour', time: 'Lun.' }] },
    { id: 1760000000000, with: 'Équipe', isGroup: true, members: ['Paul Convoc', 'Sans Compte'], membres: [{ id: 'c1', name: 'Paul Convoc', reference: 'REFPAUL' }, { id: 'c2', name: 'Sans Compte', reference: '' }], avatar: '👥', color: '#7c3aed', icon: '👥', unread: 0, archived: false,
      thread: [{ from: 'system', text: 'Groupe créé avec Paul Convoc, Sans Compte', time: 'Maintenant' }, { from: 'me', text: 'Salut', time: '10:00' }, { from: 'system', text: '📅 Convocation "Entraînement" — jeudi 15 octobre de 18:00 à 19:00', time: 'Maintenant', convocId: 'convoc_1' }] }
  ], pro: [] },
  groupConvocations: [{ id: 'convoc_1', serveurId: 5, groupMsgId: 1760000000000, groupName: 'Équipe', title: 'Entraînement', date: '2026-10-15', start: '18:00', end: '19:00', quand: 'jeudi 15 octobre de 18:00 à 19:00', recipients: [{ id: 'c1', name: 'Paul Convoc', reference: 'REFPAUL', status: 'attente', aMain: false }, { id: 'c2', name: 'Sans Compte', reference: '', status: 'present', aMain: true }] }, { id: 'convoc_autre', serveurId: 0, groupMsgId: 42, recipients: [] }],
  saveMessagesToStorage() { appels.push('messages'); }, saveConvocations() { appels.push('convocations'); }, renderMessages() { appels.push('render'); }, currentPage: 'messages',
  document: { getElementById: () => null },
  tcRafraichirConvocation: async (c) => { appels.push('rafraichir:' + c.id); return false; } };
vm.createContext(ctx);
vm.runInContext("var _tcConvocDernierRafraichi = 0;", ctx);
['tcMembresDuGroupe', 'tcGroupesPourSync', 'tcPoserGroupes', 'tcRafraichirToutesConvocations'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const envoye = ctx.tcGroupesPourSync();
verifie('tcGroupesPourSync : un seul objet (le groupe), id grp_<cle>, mode user, nom, membres par identifiant + reference, trace = lignes systeme seulement, sa convocation (pas celle d un autre groupe)', envoye.length === 1 && envoye[0].id === 'grp_1760000000000' && envoye[0].cle === 1760000000000 && envoye[0].mode === 'user' && envoye[0].nom === 'Équipe' && JSON.stringify(envoye[0].membres) === JSON.stringify([{ id: 'c1', name: 'Paul Convoc', reference: 'REFPAUL' }, { id: 'c2', name: 'Sans Compte', reference: '' }]) && envoye[0].thread.length === 2 && envoye[0].thread.every((t) => t.from === 'system') && envoye[0].convocations.length === 1 && envoye[0].convocations[0].id === 'convoc_1', JSON.stringify(envoye).slice(0, 300));
const copie = JSON.parse(JSON.stringify(envoye));
// Deconnexion : tout est vide ; puis la synchro rapporte le groupe.
ctx.messages = { user: [], pro: [] }; ctx.groupConvocations = []; appels.length = 0;
ctx.tcPoserGroupes(copie);
await new Promise((r) => setTimeout(r, 10));
const g = ctx.messages.user.find((m) => m.isGroup);
verifie('apres deconnexion / reconnexion : le groupe est recree avec le meme identifiant, son nom, ses membres (noms et identifiants), sa trace', !!g && g.id === 1760000000000 && g.with === 'Équipe' && g.members.join() === 'Paul Convoc,Sans Compte' && g.membres[0].reference === 'REFPAUL' && g.thread.length === 2 && g.avatar === '👥', JSON.stringify(g).slice(0, 300));
verifie('sa convocation revient, rattachee au groupe, avec les statuts (noté a la main compris)', ctx.groupConvocations.length === 1 && ctx.groupConvocations[0].id === 'convoc_1' && ctx.groupConvocations[0].groupMsgId === 1760000000000 && ctx.groupConvocations[0].recipients[1].status === 'present');
verifie('tout est enregistre, la messagerie redessinee, les decomptes relus sur le serveur (serveurId 5)', appels.indexOf('messages') >= 0 && appels.indexOf('convocations') >= 0 && appels.indexOf('render') >= 0 && appels.indexOf('rafraichir:convoc_1') >= 0, appels.join(' '));
// Mise a jour : nouveau nom, un membre de plus, statut change ; un groupe absent de la liste disparait.
ctx.messages.user.push({ id: 99, with: 'Vieux groupe', isGroup: true, members: [], thread: [] });
ctx.messages.user.push({ id: 1, with: 'Dr. Thomas Martin', thread: [{ from: 'them', text: 'Bonjour', time: 'Lun.' }] });   // une conversation simple, locale
const maj = JSON.parse(JSON.stringify(copie)); maj[0].nom = 'Équipe A'; maj[0].membres.push({ id: 'c3', name: 'Rita', reference: 'REFRITA' }); maj[0].convocations[0].recipients[0].status = 'present'; maj[0].thread.push({ from: 'system', text: 'Nouvelle ligne', time: 'x' });
ctx.tcPoserGroupes(maj);
await new Promise((r) => setTimeout(r, 10));
const g2 = ctx.messages.user.find((m) => m.isGroup && m.id === 1760000000000);
verifie('mise a jour : nom, membres, trace completee sans doublon, statut de la convocation ; le groupe supprime ailleurs disparait ici', g2.with === 'Équipe A' && g2.members.length === 3 && g2.thread.length === 3 && ctx.groupConvocations[0].recipients[0].status === 'present' && !ctx.messages.user.some((m) => m.id === 99) && ctx.messages.user.some((m) => m.id === 1), JSON.stringify(g2).slice(0, 200));
verifie('la conversation simple (Dr. Martin) n est pas touchee', ctx.messages.user.find((m) => m.id === 1).thread[0].text === 'Bonjour');
appels.length = 0;
vm.runInContext('_tcConvocDernierRafraichi = 0;', ctx);
const a = await ctx.tcRafraichirToutesConvocations(false);
const b = await ctx.tcRafraichirToutesConvocations(false);
verifie('tcRafraichirToutesConvocations : relit les convocations envoyees (serveurId), au plus une fois par minute sans force', appels.filter((x) => x.indexOf('rafraichir:') === 0).length === 1 && a === false && b === false);
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
