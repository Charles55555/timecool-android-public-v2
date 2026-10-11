// Campagne 1 (v2.0.317), mission 1 du 11/10 :
//  1. « Envoyer un message » depuis la fiche retrouve la conversation du serveur (reference du compte,
//     puis nom), n'en cree une locale que s'il n'y en a aucune, et ne fait jamais deux conversations
//     pour la meme personne (dans les deux sens).
//  2. Une fiche bloquee n'est pas « recente ».
//  3. L'entete prend les initiales du compte des la connexion (jamais JD).
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  const d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}

// ── Un petit monde : le serveur a rapporte une conversation avec Basile ──
let stock = [];
const ctx = {
  console, JSON, Date, isNaN, Array, String, Object,
  mode: 'user', messages: { user: [] }, contactsList: [], currentPage: 'contacts',
  _msgFilter: 'x', _currentConvId: null, ouvertes: [], navigues: [],
  tcConversations() { return stock; },
  getContactColor() { return '#1a73e8'; },
  getContactInitials(n) { const p = n.trim().split(/\s+/); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); },
  saveMessagesToStorage() {}, navigate(p) { ctx.navigues.push(p); }, renderMessages() {},
  openConversation(id, o) { ctx.ouvertes.push(id); }, setTimeout() {},
  document: { getElementById() { return null; } },
};
vm.createContext(ctx);
['tcConversationsAffichables', 'tcConversationParId', 'tcConversationDuContact', 'messageContact']
  .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

const serveurBasile = () => ({
  reference: 'ref-basile', with: 'Basile Cortot', maj: '2026-10-11T10:00:00Z',
  thread: [{ from: 'them', texte: 'Demande de rendez-vous', le: '2026-10-11T09:00:00Z' }, { from: 'them', texte: 'Rendez-vous confirmé', le: '2026-10-11T10:00:00Z' }]
});
const basile = () => ({ id: 'c1', name: 'Basile Cortot', referenceCompte: 'ref-basile' });
const nbBasile = () => vm.runInContext('tcConversationsAffichables()', ctx).filter((c) => /Basile/i.test(c.with)).length;

titre('1a. Fiche -> messagerie : la conversation du serveur est retrouvee');
stock = [serveurBasile()]; ctx.messages.user = []; ctx.contactsList = [basile()]; ctx.ouvertes = [];
ctx.messageContact('c1');
verifie('ouvre la conversation du serveur (srv_ref-basile), pas une neuve', ctx.ouvertes[0] === 'srv_ref-basile', ctx.ouvertes[0]);
verifie('aucune conversation locale creee', ctx.messages.user.length === 0, ctx.messages.user.length);
const ouverte = vm.runInContext("tcConversationParId('srv_ref-basile')", ctx);
verifie('elle porte les 2 messages et l avatar BC (pas une icone generique)', ouverte.thread.length === 2 && ouverte.avatar === 'BC' && ouverte.icon === '', ouverte.avatar + '/' + ouverte.icon + '/' + ouverte.thread.length);
verifie('une seule conversation Basile dans la liste', nbBasile() === 1, nbBasile());

titre('1b. Repli : pas de reference sur la fiche, le nom suffit (casse ignoree)');
ctx.contactsList = [{ id: 'c2', name: '  basile CORTOT ' }]; ctx.ouvertes = [];
ctx.messageContact('c2');
verifie('retrouvee par le nom', ctx.ouvertes[0] === 'srv_ref-basile' && ctx.messages.user.length === 0, ctx.ouvertes[0]);

titre('1c. Personne d autre : une conversation locale, une seule');
stock = []; ctx.messages.user = []; ctx.contactsList = [{ id: 'c3', name: 'Inconnu Total' }]; ctx.ouvertes = [];
ctx.messageContact('c3'); ctx.messageContact('c3');
verifie('creee une fois, rouverte la seconde fois', ctx.messages.user.length === 1 && ctx.ouvertes[0] === ctx.ouvertes[1], ctx.messages.user.length);
verifie('sans compte TimeCool : locale pure (pas de reference)', !ctx.messages.user[0].reference && !ctx.messages.user[0].serveur);

titre('1d. Fiche d un compte TimeCool sans echange : creee avec sa reference, puis fondue dans celle du serveur');
stock = []; ctx.messages.user = []; ctx.contactsList = [basile()]; ctx.ouvertes = [];
ctx.messageContact('c1');
const locale = ctx.messages.user[0];
verifie('creee avec la reference du compte (le premier message partira par le serveur)', locale && locale.reference === 'ref-basile' && locale.serveur === true);
ctx.messageContact('c1');
verifie('un second clic ne cree pas de doublon', ctx.messages.user.length === 1 && nbBasile() === 1, nbBasile());
stock = [serveurBasile()];   // la synchro rapporte la conversation
verifie('apres la synchro : UNE seule conversation Basile dans la liste', nbBasile() === 1, nbBasile());
const fondue = vm.runInContext('tcConversationsAffichables()', ctx).find((c) => /Basile/.test(c.with));
verifie('c est celle du serveur, avec ses 2 messages', fondue.id === 'srv_ref-basile' && fondue.thread.length === 2);
verifie('l ancien identifiant local retrouve la conversation du serveur (l ecran ouvert ne se vide pas)', vm.runInContext('tcConversationParId(' + JSON.stringify(locale.id) + ')', ctx).id === 'srv_ref-basile');
ctx.ouvertes = []; ctx.messageContact('c1');
verifie('depuis la fiche, c est maintenant celle du serveur qui s ouvre', ctx.ouvertes[0] === 'srv_ref-basile', ctx.ouvertes[0]);
// Ce qui aurait ete ecrit dans la locale avant l echange passe devant
ctx.messages.user = [{ id: 5, with: 'Basile Cortot', reference: 'ref-basile', serveur: true, thread: [{ from: 'me', text: 'avant', time: '09:00' }] }];
const avec = vm.runInContext('tcConversationsAffichables()', ctx).find((c) => /Basile/.test(c.with));
verifie('un texte deja present dans la locale n est pas perdu', avec.thread.length === 3 && avec.thread[0].text === 'avant', avec.thread.length);
verifie('une conversation sans lien avec le serveur n est pas touchee', (() => { stock = [serveurBasile()]; ctx.messages.user = [{ id: 9, with: 'Autre Personne', thread: [] }]; return vm.runInContext('tcConversationsAffichables()', ctx).length === 2; })());

titre('1d bis. Un homonyme d un AUTRE compte n est pas cette personne');
stock = [serveurBasile()]; ctx.messages.user = []; ctx.ouvertes = [];
ctx.contactsList = [{ id: 'h1', name: 'Basile Cortot', referenceCompte: 'ref-B' }];
ctx.messageContact('h1');
verifie('fiche ref-B, le serveur ne connait que ref-A : on n ouvre PAS srv_ref-basile', ctx.ouvertes[0] !== 'srv_ref-basile', ctx.ouvertes[0]);
verifie('une locale ref-B est creee (le message partira chez ref-B)', ctx.messages.user.length === 1 && ctx.messages.user[0].reference === 'ref-B' && ctx.messages.user[0].serveur === true);
stock = []; ctx.messages.user = [{ id: 7, with: 'Basile Cortot', thread: [{ from: 'me', text: 'ancien', time: '08:00' }] }]; ctx.ouvertes = [];
ctx.messageContact('h1');
verifie('ancienne locale sans reference reprise : elle recoit la reference et passe par le serveur', ctx.ouvertes[0] === 7 && ctx.messages.user.length === 1 && ctx.messages.user[0].reference === 'ref-B' && ctx.messages.user[0].serveur === true && ctx.messages.user[0].thread.length === 1);

titre('1e. Dans le code : l envoi rouvre la conversation du serveur, la fiche sait chercher');
const envoi = fonction(page, 'sendConvMessage');
verifie('apres envoi par le serveur, on rouvre srv_<reference> quand elle existe', /tcConversationParId\('srv_' \+ conv\.reference\)/.test(envoi));
verifie('messageContact passe par tcConversationDuContact (plus de recherche par nom seul)', /tcConversationDuContact\(contact\)/.test(fonction(page, 'messageContact')) && !/m\.with === contact\.name/.test(fonction(page, 'messageContact')));

titre('2. « Mes contacts recents » : une fiche bloquee n est pas recente');
const ctx2 = { console, contactsList: [], Date, isNaN, Array };
vm.createContext(ctx2);
vm.runInContext(fonction(page, 'tcContactsRecents'), ctx2);
vm.runInContext(fonction(page, 'tcCompterRecents'), ctx2);
const hier = new Date(Date.now() - 86400000).toISOString();
ctx2.contactsList = [{ name: 'Ajoute a la main', createdAt: hier }, { name: 'Refuse et bloque', createdAt: hier, blocked: true }, { name: 'Debloque', createdAt: hier, blocked: false }];
verifie('seules les fiches non bloquees comptent', ctx2.tcContactsRecents().map((c) => c.name).join() === 'Ajoute a la main,Debloque', ctx2.tcContactsRecents().map((c) => c.name).join());
verifie('le compte du bouton suit (2, pas 3)', ctx2.tcCompterRecents() === 2, ctx2.tcCompterRecents());

titre('3. L entete prend les initiales du compte des la connexion');
for (const nom of ['showWelcomeSplash', 'hideAuthFlow']) {
  const f = fonction(page, nom);
  verifie(nom + ' redessine l avatar de l entete avant tout', f && /^function [^{]+\{(\s*\/\/[^\n]*)*\s*tcMajAvatarEntete\(\);/.test(f), (f || '').slice(0, 120));
}
{
  const av = { textContent: 'JD' };
  const c3 = { console, String, userAccount: null, document: { getElementById: (id) => (id === 'headerAvatar' ? av : null), querySelectorAll: () => [], querySelector: () => null } };
  vm.createContext(c3);
  ['tcInitiales', 'tcMajAvatarEntete'].forEach((n) => vm.runInContext(fonction(page, n), c3));
  // l en-tete porte JD (valeur du HTML) ; la connexion pose le compte puis appelle showWelcomeSplash
  c3.userAccount = { firstname: 'Armelle', lastname: 'Vasseur' };
  c3.tcMajAvatarEntete();
  verifie('apres connexion d Armelle Vasseur : AV, pas JD', av.textContent === 'AV', av.textContent);
}
verifie('le HTML garde JD comme simple valeur de depart, remplacee a la connexion', /id="headerAvatar"[^>]*>JD</.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
