// « 🆕 Mes contacts récents (N) » : les contacts ajoutés UN PAR UN dans les 30 derniers jours.
// Un import du téléphone n'est pas « récent » (fiche marquée, ou rafale de plus de 20 fiches
// la même minute pour les fiches importées avant la marque).
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const JOUR = 86400000;
const il_y_a = (jours, minutes) => new Date(Date.now() - jours * JOUR - (minutes || 0) * 60000).toISOString();

const ctx = {
  console, contactsList: [], contactsSearchQuery: '', _contactsLettre: '', _contactsCategorie: '', _contactsTimeCool: false, _contactsRecents: false,
  TC_CONTACTS_SEUIL: 200, rendus: 0, renderContacts() { ctx.rendus++; },
};
vm.createContext(ctx);
['isTimeCoolUser', 'tcLettreContact', 'tcContactsParLettres', 'tcContactsAffiches', 'tcCompterTimeCool', 'tcBoutonTimeCoolHTML', 'tcContactsRecents',
  'tcCompterRecents', 'tcLigneAjouteLe', 'tcBasculerRecents', 'tcBasculerTimeCool', 'tcBoutonRecentsHTML', 'tcLigneFiltresHTML']
  .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const noms = () => ctx.tcContactsRecents().map((c) => c.name).join(',');

titre('1. La regle des 30 jours, executee dans la vraie fonction');
ctx.contactsList = [
  { name: 'Manuel hier', createdAt: il_y_a(1) },
  { name: 'Manuel 10 jours', createdAt: il_y_a(10) },
  { name: 'Limite 29 jours', createdAt: il_y_a(29.5) },
  { name: 'Trop vieux 31 jours', createdAt: il_y_a(31) },
  { name: 'Vieux 65 jours', createdAt: il_y_a(65) },
  { name: 'Import marque hier', createdAt: il_y_a(1, 120), origine: 'telephone' },
  { name: 'Exemple marque', createdAt: il_y_a(2, 300), origine: 'exemple' },
  { name: 'Sans date' },
  { name: 'Date illisible', createdAt: 'demain' },
  { name: 'Dans le futur', createdAt: new Date(Date.now() + 40 * JOUR).toISOString() },
  null,
];
verifie('ajout recent : oui. 31 jours : non. Import marque : non. Sans date, date illisible, futur : non', noms() === 'Manuel hier,Manuel 10 jours,Limite 29 jours', noms());
verifie('tri : du plus recent au plus ancien', ctx.tcContactsRecents().map((c) => c.name)[0] === 'Manuel hier' && ctx.tcContactsRecents().map((c) => c.name)[2] === 'Limite 29 jours');
verifie('le compte du bouton = la liste', ctx.tcCompterRecents() === 3);

// Une rafale non marquee (fiches importees avant la marque)
// Les fiches d'une rafale partent du milieu d'une minute : elles ne passent jamais d'une minute a l'autre pendant le test.
const milieuDeMinute = (ms) => Math.floor(ms / 60000) * 60000 + 30000;
const rafale = (n, jours, minutes) => Array.from({ length: n }, (_, i) => ({ name: 'Importe ' + i, createdAt: new Date(milieuDeMinute(Date.now() - jours * JOUR - minutes * 60000) + i * 100).toISOString() }));
ctx.contactsList = [{ name: 'Seul', createdAt: il_y_a(0, 1) }].concat(rafale(25, 1, 600));
verifie('une rafale non marquee (25 fiches la meme minute) n est PAS recente', noms() === 'Seul', noms());
ctx.contactsList = [{ name: 'Seul', createdAt: il_y_a(0, 1) }].concat(rafale(20, 1, 600));
verifie('vingt fiches la meme minute restent recentes (la limite est « plus de 20 »)', ctx.tcCompterRecents() === 21, String(ctx.tcCompterRecents()));
ctx.contactsList = Array.from({ length: 3313 }, (_, i) => ({ name: 'Ancien ' + i, createdAt: new Date(milieuDeMinute(Date.now() - 65 * JOUR) + i * 5).toISOString() }));
verifie('les 3 313 contacts importes il y a deux mois : aucun', ctx.tcCompterRecents() === 0);
ctx.contactsList = ctx.contactsList.concat(Array.from({ length: 3313 }, (_, i) => ({ name: 'Nouvel import ' + i, createdAt: new Date(milieuDeMinute(Date.now() - 3600000) + i * 5).toISOString() })));
verifie('un nouvel import demain (3 313 fiches la meme minute, sans marque) ne les fait PAS remonter', ctx.tcCompterRecents() === 0, String(ctx.tcCompterRecents()));
ctx.contactsList = ctx.contactsList.concat([{ name: 'Marie ajoutee a la main', createdAt: il_y_a(0, 5) }]);
verifie('mais un ajout a la main le meme jour, hors de la rafale, remonte', noms() === 'Marie ajoutee a la main', noms());
const t0 = Date.now(); for (let i = 0; i < 5; i++) ctx.tcContactsRecents();
verifie('6 627 contacts : le calcul reste rapide (moins de 100 ms)', (Date.now() - t0) / 5 < 100, ((Date.now() - t0) / 5).toFixed(1) + ' ms');
verifie('sans carnet : liste vide, pas d erreur', (() => { ctx.contactsList = undefined; return ctx.tcContactsRecents().length === 0; })());

titre('2. Quelles fiches sont creees « une par une » et lesquelles sont marquees');
const imp = fonction(page, 'tcContactsRecus') || '';
verifie('l import du telephone (tcContactsRecus, appele par importPhoneContacts) marque ses fiches origine:\'telephone\'', /origine: 'telephone'/.test(imp), '');
verifie('les contacts d exemple sont marques origine:\'exemple\'', /\.\.\.s,\s+origine: 'exemple',\s+createdAt/.test(page));
verifie('l ajout a la main (le formulaire « Nouveau contact ») pose son createdAt : il est recent', page.indexOf("{ id: 'contact_' + Date.now(), createdAt: new Date().toISOString() }") > -1 && page.indexOf('function tcContactDepuisFormulaire(') > -1);
verifie('« Ajouter a mes contacts » (carte du demandeur) garde son createdAt', /referenceCompte: msg\.reference \|\| '',\s+isTimeCool: true,\s+createdAt: new Date\(\)\.toISOString\(\)/.test(page));
verifie('« ajouter aux contacts » depuis un lieu garde son createdAt', /name: p\.nom,\s+phone: p\.telephone \|\| '',\s+email: '',\s+createdAt: new Date\(\)\.toISOString\(\)/.test(page));
verifie('la fiche creee par le serveur a la proposition d un creneau porte createdAt (pas besoin de marque cote serveur)', /'createdAt'\s+=> date\('c'\)/.test(api.slice(api.indexOf('function creerFicheContact('), api.indexOf('function creerFicheContact(') + 900)));

titre('3. Les boutons');
ctx.contactsList = [{ name: 'Bob', isTimeCool: true }, { name: 'Alice', isTimeCool: true }, { name: 'Neuf', createdAt: il_y_a(2) }, { name: 'Neuf2', createdAt: il_y_a(3), isTimeCool: true }];
const ligne = ctx.tcLigneFiltresHTML();
verifie('une ligne a deux boutons : recents a GAUCHE, TimeCool a DROITE', ligne.indexOf('Mes contacts récents (2)') > -1 && ligne.indexOf('Mes contacts TimeCool (3)') > ligne.indexOf('Mes contacts récents (2)'), ligne.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
verifie('flex, ecart de 8 px, ils passent l un sous l autre quand l ecran est etroit (flex-wrap)', /display:flex; gap:8px; flex-wrap:wrap/.test(ligne));
verifie('deux boutons de meme style, moitie-moitie (flex:1 1 150px)', (ligne.match(/flex:1 1 150px; min-width:0;/g) || []).length === 2 && (ligne.match(/border-radius:12px; font-size:13px; font-weight:600/g) || []).length === 2);
verifie('le bouton « 🆕 » porte l emoji demande', /🆕 Mes contacts récents/.test(ligne));
ctx.contactsList = [{ name: 'Vieux', createdAt: il_y_a(90) }];
verifie('personne de recent : le bouton reste VISIBLE avec « (0) »', /🆕 Mes contacts récents \(0\)/.test(ctx.tcLigneFiltresHTML()));
verifie('aucun inscrit TimeCool : sa phrase reste (il ne s ouvre pas), le bouton recents est la aussi', /n’utilise encore TimeCool/.test(ctx.tcLigneFiltresHTML()) && /récents \(0\)/.test(ctx.tcLigneFiltresHTML()));
ctx._contactsCategorie = 'travail';
verifie('pendant un filtre par categorie, la ligne s efface (comme avant)', ctx.tcLigneFiltresHTML() === '');
ctx._contactsCategorie = '';

titre('4. Toucher, second toucher, exclusivite');
ctx.contactsList = [{ id: 'a', name: 'Neuf', createdAt: il_y_a(2) }, { id: 'b', name: 'Tc', isTimeCool: true }, { id: 'c', name: 'Vieux', createdAt: il_y_a(90) }];
ctx.rendus = 0; ctx._contactsLettre = 'B'; ctx.contactsSearchQuery = 'x'; ctx._contactsTimeCool = true;
vm.runInContext('tcBasculerRecents()', ctx);
verifie('toucher : les recents s affichent, et la lettre, la recherche et TimeCool sont effaces', ctx._contactsRecents === true && ctx._contactsTimeCool === false && ctx._contactsLettre === '' && ctx.contactsSearchQuery === '' && ctx._contactsCategorie === '' && ctx.rendus === 1);
verifie('la liste est celle des recents', ctx.tcContactsAffiches().map((c) => c.name).join(',') === 'Neuf');
verifie('le bouton propose « Tout voir »', /🆕 Tout voir/.test(ctx.tcBoutonRecentsHTML()));
vm.runInContext('tcBasculerRecents()', ctx);
verifie('second toucher : retour a la vue normale', ctx._contactsRecents === false && ctx.tcContactsAffiches().length === 3);
vm.runInContext('tcBasculerRecents()', ctx); vm.runInContext('tcBasculerTimeCool()', ctx);
verifie('exclusifs : toucher TimeCool ferme les recents', ctx._contactsRecents === false && ctx._contactsTimeCool === true);
vm.runInContext('tcBasculerRecents()', ctx);
verifie('exclusifs : toucher les recents ferme TimeCool', ctx._contactsRecents === true && ctx._contactsTimeCool === false);
ctx._contactsRecents = false;
verifie('la lettre, la categorie et la recherche quittent aussi les recents', ['tcChoisirLettre', 'tcVoirContactsDeCategorie', 'renderContactsList'].every((n) => /_contactsRecents = false/.test(fonction(page, n) || '')));
verifie('la recherche l emporte : taper un nom efface le filtre (comme TimeCool)', /if \(contactsSearchQuery\.trim\(\)\) \{ _contactsLettre = ''; _contactsTimeCool = false; _contactsRecents = false; \}/.test(page));
verifie('la reglette A-Z et l invitation a choisir une lettre s effacent pendant les recents', /if \(_contactsCategorie \|\| _contactsTimeCool \|\| _contactsRecents\) return '';/.test(page) && /!_contactsTimeCool && !_contactsRecents && tcContactsParLettres\(\)/.test(page));
verifie('le bandeau de categorie reste prioritaire (la ligne des deux boutons s efface)', /function tcLigneFiltresHTML\(\) \{\s+if \(_contactsCategorie\) return '';/.test(page));

titre('5. La date d ajout et la place dans la page');
verifie('« Ajouté le 10/10 » sous le nom', /Ajouté le 10\/10/.test(ctx.tcLigneAjouteLe({ createdAt: '2026-10-10T12:00:00Z' })), ctx.tcLigneAjouteLe({ createdAt: '2026-10-10T12:00:00Z' }));
verifie('pas de date, pas de ligne', ctx.tcLigneAjouteLe({}) === '' && ctx.tcLigneAjouteLe({ createdAt: 'x' }) === '');
verifie('la date n apparait que dans la vue des recents', /\$\{_contactsRecents \? tcLigneAjouteLe\(c\) : ''\}/.test(page));
verifie('meme rendu de fiche que d habitude : la date est dans la fiche (pastilles et menu inchanges)', page.indexOf('${_contactsRecents ? tcLigneAjouteLe(c) : \'\'}') > page.indexOf('data-notranslate>${escapeHTMLSafe(c.name)}') && page.indexOf('${_contactsRecents ? tcLigneAjouteLe(c) : \'\'}') < page.indexOf("toggleContactMenu(event, '${c.id}')"));
verifie('la ligne des deux boutons est placee au meme endroit que l ancien bouton TimeCool (avant la reglette)', page.indexOf('${tcLigneFiltresHTML()}') > page.indexOf('${tcFiltreCategorieHTML()}') && page.indexOf('${tcLigneFiltresHTML()}') < page.indexOf('${tcRegletteHTML()}'));
verifie('l en-tete (compte des contacts) n est pas touche', /\$\{tcContactsEnTeteHTML\(\)\}/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
