// Mission 69 (02/11, chef, validée par Charles) : retrouver un contact, le nom placé n'importe où dans la phrase.
// Jamais la question « prendre rendez-vous ou vérifier ? » quand verbe de recherche + mot de contact sont là. Usage : node verif-fiche-libre.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 400) : '')); }
function fonction(nom) {
  const d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}
const ctx = { console, Array, Math, String, JSON, RegExp, Object, Number, charlyIA: { history: [] }, contactsList: [], events: [], tcDernierRdvParContact: () => ({}),
  renderCharlyChat() {}, tcPousserMessageUtilisateur(x) { ctx.charlyIA.history.push({ role: 'user', content: x }); }, tcBulleCharly: (x) => x, tcFormulaireContact() {}, charlyQuickAction() {} };
vm.createContext(ctx);
const constante = (nom) => {
  const d = page.indexOf('const ' + nom + ' = ');
  if (d < 0) { verifie(nom + ' existe', false); return; }
  const f = page.indexOf(';\n', d);
  vm.runInContext(page.slice(d, f + 1), ctx);
};
vm.runInContext('var DISPO_CATEGORIES = [];', ctx);
['TC_PETITS_MOTS', 'TC_PROFESSIONS', 'TC_FICHE_PAS_UN_NOM', 'TC_FICHE_LIENS', 'TC_FICHE_RELATION', 'TC_FICHE_UN_LIEN', 'TC_FICHE_MOT_CONTACT', 'TC_FICHE_DE_CHOSE', 'TC_FICHE_DETERMINANT', 'TC_FICHE_QUANTITE', 'TC_FICHE_PASSE',
  'TC_FICHE_LIBRE_VERBE', 'TC_FICHE_LIBRE_AUTRE', 'TC_FICHE_LIBRE_TITRES', 'TC_FICHE_LIBRE_LIAISON', 'TC_FICHE_LIBRE_REPRISE', 'TC_FICHE_LIBRE_PARTICULE', 'TC_FICHE_LIBRE_OUTILS'].forEach(constante);
['tcSansAccents', 'tcClasseNormaliser', 'tcMotsUtiles', 'tcContactsParMots', 'tcClasserContacts', 'tcDesignationSansPetitMot', 'tcFicheNomTape', 'tcFicheNomJoli', 'tcFicheNomPossible', 'tcDetecterFicheContact', 'tcFicheCategories', 'tcFicheTexte', 'tcPousserFiches', 'tcPousserFicheAbsente',
  'tcGererFicheContact', 'tcRendreFiches', 'escapeHTMLSafe', 'tcFicheLibreMots', 'tcFicheLibreOutil', 'tcFicheLibreTitre', 'tcFicheLibreNom', 'tcFicheLibreApresTitre', 'tcFicheLibreSuite', 'tcFicheLibreRelation', 'tcFicheLibreExacts', 'tcFicheLibreRepris', 'tcFicheLibreAvant', 'tcFicheLibreApres', 'tcFicheLibreParTitre', 'tcDetecterFicheLibre', 'tcGererFicheLibre'].forEach((n) => { const s = fonction(n); if (s) vm.runInContext(s, ctx); else verifie(n + ' existe', false); });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

const carnet = () => [{ id: 's', name: 'Dr Sellam', phone: '0655500001' }, { id: 'h', name: 'Hugo Besnard', phone: '0655507777' }, { id: 'g', name: 'Gaëlle Perrin' }, { id: 'p1', name: 'Paul Fictif' }, { id: 'p2', name: 'Paul Martin' }, { id: 'mm', name: 'Marie Martin' }, { id: 'pl', name: 'Marc Plombier' }];
// Le même ordre que la page : la mission 66 d'abord, la phrase libre ensuite.
const dire = (p, liste) => {
  ctx.contactsList = liste || carnet(); ctx.charlyIA.history = [];
  const d = ctx.tcDetecterFicheContact(p);
  let pris = !!d && ctx.tcGererFicheContact(p, d);
  let libre = false;
  if (!pris) { const l = ctx.tcDetecterFicheLibre(p); libre = !!l; pris = !!l && ctx.tcGererFicheLibre(p, l); }
  const der = ctx.charlyIA.history[ctx.charlyIA.history.length - 1] || {};
  return { pris, libre, der, ids: der._fiches ? der._fiches.ids.join() : '', c: der.content || '' };
};

console.log('\n-- 1. Le nom avant ou après le verbe --');
const SELLAM = 'La Banane Dr Sellam tu peux me retrouver dans mes contacts en fait ce contact là';
for (const [p, id] of [[SELLAM, 's'], ['Dr Sellam tu peux me le retrouver dans mes contacts', 's'], ['tu peux me retrouver Dr Sellam dans mes contacts en fait', 's'], ['le docteur Sellam, trouve-moi sa fiche', 's'], ['sellam tu peux le chercher dans mes contacts stp', 's'],
  ['Hugo Besnard, montre-moi sa fiche', 'h'], ['Hugo tu me le retrouves dans mes contacts', 'h'], ['Gaëlle je la cherche dans mes contacts', 'g'], ['gaelle tu peux afficher sa fiche', 'g'], ['Besnard montre-moi ce contact', 'h'], ['Marc mon plombier tu peux me le retrouver', 'pl']]) {
  const r = dire(p);
  verifie(p + ' → la carte', r.pris && r.ids === id && !/rendez-vous ou/.test(r.c), r.ids + ' ' + r.c);
}
const fin = dire(SELLAM);
verifie('une fiche : pas de question après la carte', fin.der.nature === 'reponse' && fin.c === 'Dr Sellam : 0655500001', fin.c);

console.log('\n-- 2. Plusieurs, aucun, dernier mot seul --');
const plusieurs = dire('Paul tu peux me le retrouver dans mes contacts');
verifie('plusieurs : la liste et « Lequel ? », une carte par contact', plusieurs.ids.split(',').length === 2 && /Lequel \?$/.test(plusieurs.c) && plusieurs.der._ficheAttente.etape === 'choix', plusieurs.c);
const absent = dire('Dr Zorglub tu peux me le retrouver dans mes contacts');
verifie('aucun : « Je n’ai trouvé personne qui s’appelle Dr Zorglub dans tes contacts. »', absent.pris && absent.c === 'Je n’ai trouvé personne qui s’appelle Dr Zorglub dans tes contacts.' && !absent.der._ficheAttente, absent.c);
const html = ctx.tcRendreFiches(absent.der);
verifie('aucun : le bouton « 👤 Retrouver un contact », aucun « Ajouter »', /charlyQuickAction\('contact'\)/.test(html) && /👤 Retrouver un contact/.test(html) && !/Ajouter/.test(html), html);
const minus = dire('zorglub tu peux le retrouver dans mes contacts');
verifie('aucun, en minuscules : « Zorglub »', minus.c === 'Je n’ai trouvé personne qui s’appelle Zorglub dans tes contacts.', minus.c);
const proche = dire('Hugo Sellam tu peux me le retrouver dans mes contacts');
verifie('prénom et nom pas ensemble : la fiche montrée, « C’est cette personne ? », jamais à la place de la personne cherchée', proche.ids === 's' && /^Je ne trouve pas « Hugo Sellam » dans tes contacts\. J’ai :/.test(proche.c) && /C’est cette personne \?$/.test(proche.c) && proche.der._ficheAttente.etape === 'proche', proche.c);
const proches = dire('Jean Martin je le cherche dans mes contacts');
verifie('dernier mot, plusieurs fiches : la liste et « Lequel ? »', proches.ids.split(',').length === 2 && /Lequel \?$/.test(proches.c), proches.c);
const marie = dire('Marie tu peux la retrouver dans mes contacts');
verifie('« Marie » reste Marie (mission 66 : jamais « Rie »)', marie.ids === 'mm', marie.c);
const marie2 = dire('Marie Dupont tu peux la retrouver dans mes contacts');
verifie('« Marie Dupont » : ni Marie Martin à sa place, ni « Rie »', marie2.c === 'Je n’ai trouvé personne qui s’appelle Marie Dupont dans tes contacts.', marie2.c);

console.log('\n-- 3. Ce qui n est pas une recherche de fiche : le chemin habituel --');
const pieges = ['trouve la fiche de paie', 'Montre-moi la fiche de paie de Hugo', 'Hugo tu peux retrouver ma fiche de paie', 'où est ma fiche de présence ? cherche-la', 'cherche la fiche de présence dans mes contacts', 'la fiche de poste, tu peux la retrouver',
  'rendez-vous avec Dr Sellam', 'trouve un rendez-vous avec Dr Sellam', 'cherche un créneau avec mon client Hugo', 'montre-moi mes rendez-vous avec mon dentiste', 'trouve un moment libre avec mon patron', 'affiche mes contacts', 'montre-moi tous mes contacts', 'trouve les doublons dans mes contacts',
  'cherche dans mes contacts', 'retrouve un contact', 'combien de contacts j’ai ? montre', 'ajoute Hugo à mes contacts et cherche Paul', 'envoie un message à mon client, trouve les mots', 'cherche un ami pour jouer', 'trouve un cadeau pour mon patron', 'affiche le 12 mon client', 'bonjour', 'ça va ?', 'montre-moi ma semaine'];
pieges.push(
  // Examen 1, défaut 1 : aucun mot ordinaire ne devient un nom.
  'Je n’arrive pas à trouver un contact', 'Aide-moi à retrouver mes contacts', 'où puis-je trouver mes contacts ?', 'j’ai perdu mes contacts, retrouve-les', 'retrouve mes contacts perdus', 'retrouve les contacts supprimés', 'affiche les contacts bloqués',
  'montre mes contacts famille', 'montre mes contacts du travail', 'montre mes contacts professionnels', 'trouve mes contacts favoris', 'trouve mon contact préféré', 'montre mes contacts par ordre alphabétique', 'montre mes contacts qui ont TimeCool', 'montre les contacts sans téléphone',
  'affiche mes contacts Google', 'retrouve mes derniers contacts', 'affiche mes contacts récemment ajoutés', 'cherche les médecins dans mes contacts', 'trouve la fiche météo',
  // Examen 1, défaut 5 : le verbe dans un autre sens.
  'Hugo a trouvé un client', 'Hugo cherche un client', 'Le patient Hugo trouve que c’est cher', 'Trouve un client pour Hugo', 'trouve un cadeau pour mon ami Hugo', 'Ne cherche pas Hugo dans mes contacts', 'montre à Hugo mes contacts', 'Mon client Paul cherche un plombier',
  'Super, montre-moi mes contacts', 'Parfait trouve-moi ce contact', 'Allez montre-moi ce contact', 'Ensuite montre-moi mes contacts', 'Après, montre-moi mes contacts', 'D’accord, montre-moi mes contacts', 'Aide-moi, montre-moi mes contacts', 'Dis, tu peux retrouver un contact', 'Écoute, je cherche un contact', 'Regarde, montre mes contacts',
  'Les médecins tu peux me les retrouver dans mes contacts', 'Mes amis tu peux me les retrouver dans mes contacts', 'Les contacts bloqués tu peux me les montrer', 'Mes contacts perdus tu peux me les retrouver', 'Mes contacts famille, montre-les', 'cherche dans mes contacts Google', 'Sur mon téléphone, retrouve mes contacts', 'ne montre pas la fiche de Hugo', 'Hugo ne cherche pas de contact',
  'Trouve un hôtel à Lyon pour mon client', 'Je cherche un ami à Lyon', 'J’ai trouvé une cliente à Paris', 'Trouve un restaurant avec mon client', 'Cherche le meilleur plombier pour mon client');
const rates = pieges.filter((p) => { ctx.contactsList = carnet(); ctx.charlyIA.history = []; const l = ctx.tcDetecterFicheLibre(p); return !!l && ctx.tcGererFicheLibre(p, l); });
verifie('la phrase libre laisse passer ces ' + pieges.length + ' phrases, rien n’est poussé', rates.length === 0, rates.join(' / '));
verifie('Mission 66 : « retrouve Zoé » seul reste « Je ne trouve pas « Zoé » dans tes contacts. »', dire('retrouve Zoé').c === 'Je ne trouve pas « Zoé » dans tes contacts.', dire('retrouve Zoé').c);
verifie('Mission 66 : « la fiche de Zoé » garde « Ajouter Zoé »', dire('la fiche de Zoé').der._fiches.ajouter === 'Zoé');
verifie('Mission 69 n’a pas de bouton « Ajouter » : un nom absent n’est pas proposé', !dire('Zoé tu peux me la retrouver dans mes contacts').der._fiches.ajouter);

console.log('\n-- 3 bis. Examen 1 --');
const large = () => carnet().concat([{ id: 'jp', name: 'Jean-Pierre Dupont' }, { id: 'lg', name: 'Dr Le Gall' }, { id: 'lc', name: 'Lucie Classe' }, { id: 'ps', name: 'Paul Sellam' }]);
for (const [p, ids] of [['Jean-Pierre tu peux le retrouver dans mes contacts', 'jp'], ['Jean-Pierre Dupont tu peux me le retrouver dans mes contacts', 'jp'], ['Dr Le Gall tu peux me le retrouver dans mes contacts', 'lg'], ['Lucie Classe tu peux la retrouver dans mes contacts', 'lc'], ['Dr Sellam tu peux me le retrouver dans mes contacts', 's']]) {
  const r = dire(p, large());
  verifie(p + ' → cette fiche seule', r.pris && r.ids === ids && !/J’ai/.test(r.c), r.ids + ' ' + r.c);
}
const deux = dire('Dr Sellam et Hugo Besnard tu peux me les retrouver dans mes contacts');
verifie('deux noms : les deux fiches', deux.ids.split(',').sort().join() === 'h,s', deux.c);
const un2 = dire('Dr Sellam et Dr Zorglub tu peux me les retrouver dans mes contacts');
verifie('deux noms, un absent : la fiche, et Charly le dit', un2.ids === 's' && /^Je n’ai trouvé personne qui s’appelle Dr Zorglub dans tes contacts\. J’ai :/.test(un2.c), un2.c);
const oui = dire('Hugo mon client tu peux me le retrouver');
verifie('« client » reste un mot de contact quand la phrase reprend la personne', oui.ids === 'h', oui.c);
verifie('« Dr Martin » sans contact à ce titre : Marie et Paul Martin restent montrés', dire('Dr Martin tu peux me le retrouver dans mes contacts').ids.split(',').length === 2);

console.log('\n-- 3 ter. Examen 2 --');
const large2 = () => large().concat([{ id: 'mp', name: 'Maître Personne' }, { id: 'pb', name: 'Paul Bon' }]);
for (const [p, ids] of [['Dr Sellam retrouve-le dans mes contacts', 's'], ['Hugo retrouve-le dans mes contacts', 'h'], ['Dr Sellam cherche-le dans mes contacts', 's'], ['Dr Sellam cherche dans mes contacts', 's'], ['Dr Sellam retrouve sa fiche', 's'], ['Hugo retrouve sa fiche', 'h'], ['Banane Dr Sellam dans mes contacts je le cherche', 's'],
  ['dans mes contacts retrouve Hugo', 'h'], ['dans mes contacts tu peux retrouver Hugo', 'h'], ['retrouve le contact hugo', 'h'], ['trouve la fiche contact de Hugo', 'h'], ['je ne trouve pas Dr Sellam dans mes contacts', 's'], ['je ne trouve plus Hugo dans mes contacts', 'h'], ['Dr Sellam je ne le trouve plus dans mes contacts', 's'],
  ['Hugo je n’arrive pas à le retrouver dans mes contacts', 'h'], ['La Banane Dr Sellam je ne le trouve pas dans mes contacts tu peux me le retrouver', 's'], ['Mon ami Hugo tu peux me le retrouver dans mes contacts', 'h'], ['Hugo Besnard le plombier tu peux le retrouver dans mes contacts', 'h'], ['Hugo tu peux me retrouver dans mes contacts', 'h']]) {
  const r = dire(p);
  verifie(p + ' → la carte', r.pris && r.ids === ids, r.ids + ' ' + r.c);
}
verifie('« Hugo, retrouve le contact de Paul » : les Paul', dire('Hugo, retrouve le contact de Paul').ids.split(',').sort().join() === 'p1,p2', dire('Hugo, retrouve le contact de Paul').c);
const trois = dire('Dr Sellam, Hugo et Marie Martin, trouve-les dans mes contacts');
verifie('trois noms : les trois fiches', trois.ids.split(',').sort().join() === 'h,mm,s', trois.c);
const mp = dire('Maître Personne tu peux le retrouver dans mes contacts', large2());
verifie('« Maître Personne » : sa fiche', mp.ids === 'mp', mp.c);
const pb = dire('Paul Bon tu peux le retrouver dans mes contacts', large2());
verifie('« Paul Bon » : le nom complet gagne, Paul Bon seul', pb.ids === 'pb', pb.c);

console.log('\n-- 3 quater. Examen 3 --');
for (const p of ['je cherche mon ami Hugo dans mes contacts', 'je ne trouve pas mon ami Hugo dans mes contacts', 'je ne trouve pas mon client Hugo dans mes contacts', 'je n’ai pas trouvé Hugo dans mes contacts', 'je n’ai pas retrouvé Hugo dans mes contacts', 'Hugo je ne l’ai pas trouvé dans mes contacts']) {
  const r = dire(p);
  verifie(p + ' → la carte de Hugo', r.pris && r.ids === 'h', r.ids + ' ' + r.c);
}
const sansNom = ['La dame de la banque tu peux me la retrouver dans mes contacts', 'Cette dame tu peux me la retrouver dans mes contacts', 'Le gars du garage tu peux me le retrouver dans mes contacts', 'Le comptable tu peux me le retrouver dans mes contacts', 'Ce message tu peux le retrouver dans mes contacts', 'Cette photo tu peux la retrouver dans mes contacts', 'J’ai trouvé un contact',
  'retrouve-le dans mes contacts', 'retrouve-la dans mes contacts', 'cherche-le dans mes contacts', 'Attends, retrouve-le dans mes contacts'].filter((p) => dire(p).pris);
verifie('ces phrases gardent le chemin habituel : ni « Dame », ni « Ajouter Le »', sansNom.length === 0, sansNom.join(' / '));
verifie('« Mon comptable tu peux me le retrouver dans mes contacts » reste une recherche', dire('Mon comptable tu peux me le retrouver dans mes contacts').pris);
verifie('« Le Gall » garde sa fiche : après un titre et en nom complet', dire('Dr Le Gall tu peux me le retrouver dans mes contacts', [{ id: 'lg', name: 'Dr Le Gall' }]).ids === 'lg' && dire('Anne Le Gall tu peux la retrouver dans mes contacts', [{ id: 'al', name: 'Anne Le Gall' }]).ids === 'al');

console.log('\n-- 4. La page --');
verifie('la phrase libre passe juste après la mission 66, avant le modèle', /if \(_fiche && tcGererFicheContact\(text, _fiche\)\) return;\s+\/\/[^\n]*\s+const _ficheLibre = tcDetecterFicheLibre\(text\);\s+if \(_ficheLibre && tcGererFicheLibre\(text, _ficheLibre\)\) return;/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
