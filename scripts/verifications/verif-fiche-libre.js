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
  'TC_FICHE_LIBRE_VERBE', 'TC_FICHE_LIBRE_AUTRE', 'TC_FICHE_LIBRE_TITRES', 'TC_FICHE_LIBRE_OUTILS'].forEach(constante);
['tcSansAccents', 'tcClasseNormaliser', 'tcMotsUtiles', 'tcContactsParMots', 'tcClasserContacts', 'tcDesignationSansPetitMot', 'tcFicheNomTape', 'tcFicheNomJoli', 'tcFicheNomPossible', 'tcDetecterFicheContact', 'tcFicheCategories', 'tcFicheTexte', 'tcPousserFiches', 'tcPousserFicheAbsente',
  'tcGererFicheContact', 'tcRendreFiches', 'escapeHTMLSafe', 'tcFicheLibreGroupes', 'tcDetecterFicheLibre', 'tcGererFicheLibre'].forEach((n) => { const s = fonction(n); if (s) vm.runInContext(s, ctx); else verifie(n + ' existe', false); });
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
const rates = pieges.filter((p) => { ctx.contactsList = carnet(); ctx.charlyIA.history = []; const l = ctx.tcDetecterFicheLibre(p); return !!l && ctx.tcGererFicheLibre(p, l); });
verifie('la phrase libre laisse passer ces ' + pieges.length + ' phrases, rien n’est poussé', rates.length === 0, rates.join(' / '));
verifie('Mission 66 : « retrouve Zoé » seul reste « Je ne trouve pas « Zoé » dans tes contacts. »', dire('retrouve Zoé').c === 'Je ne trouve pas « Zoé » dans tes contacts.', dire('retrouve Zoé').c);
verifie('Mission 66 : « la fiche de Zoé » garde « Ajouter Zoé »', dire('la fiche de Zoé').der._fiches.ajouter === 'Zoé');
verifie('Mission 69 n’a pas de bouton « Ajouter » : un nom absent n’est pas proposé', !dire('Zoé tu peux me la retrouver dans mes contacts').der._fiches.ajouter);

console.log('\n-- 4. La page --');
verifie('la phrase libre passe juste après la mission 66, avant le modèle', /if \(_fiche && tcGererFicheContact\(text, _fiche\)\) return;\s+\/\/[^\n]*\s+const _ficheLibre = tcDetecterFicheLibre\(text\);\s+if \(_ficheLibre && tcGererFicheLibre\(text, _ficheLibre\)\) return;/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
