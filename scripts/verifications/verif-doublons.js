// Les doublons exacts crees par Charly disparaissent, rien d'autre.
//
// « Chercher les enfants » existait deux fois par jour, sur 21 jours,
// parce que la serie avait ete validee deux fois. Charles, 04/10 : « Ok »
// a la suppression.
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

const ctx = { console, String, Array, Object, saves: 0 };
ctx.saveEventsToStorage = () => { ctx.saves++; };
vm.createContext(ctx);
['tcSansAccents', 'tcDedoublonnerRendezVous'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
// events est une variable globale reassignee par la fonction : on la lit via le contexte.
const lire = () => vm.runInContext('events', ctx);
const poser = (l) => { ctx.events = l; vm.runInContext('events = this.events', ctx); };

const T = 'Chercher les enfants à l\'école';
const ev = (id, date, extra) => Object.assign({ id: id, date: date, title: T, startH: 17, startM: 0, endH: 18, endM: 0, cat: 'famille', mode: 'user' }, extra || {});

titre('Le cas de Charles : la serie validee deux fois');
{
  const liste = [];
  ['2026-10-12', '2026-10-13', '2026-10-14'].forEach((d, i) => {
    liste.push(ev('charly_ai_1790991076327_' + i, d));                                   // 5h31, sans adresse
    liste.push(ev('charly_ai_1790991342301_' + i, d, { lieu: '21 bd Inkerman 92200 Neuilly-sur-Seine' })); // 5h35, avec adresse
  });
  poser(liste);
  ctx.saves = 0;
  const n = ctx.tcDedoublonnerRendezVous();
  const apres = lire();
  verifie('trois doublons retires', n === 3, 'retires : ' + n);
  verifie('un exemplaire par jour', apres.length === 3);
  verifie('on garde celui qui a l adresse', apres.every((e) => !!e.lieu));
  verifie('un seul enregistrement', ctx.saves === 1);
}

titre('Le plus renseigne est garde, quel que soit l ordre');
{
  poser([ev('charly_ai_a', '2026-10-15', { lieu: 'X' }), ev('charly_ai_b', '2026-10-15')]);
  ctx.tcDedoublonnerRendezVous();
  verifie('avec adresse en premier : gardee', lire().length === 1 && lire()[0].id === 'charly_ai_a');
  poser([ev('charly_ai_a', '2026-10-15'), ev('charly_ai_b', '2026-10-15', { contact: 'c9' })]);
  ctx.tcDedoublonnerRendezVous();
  verifie('contact en second : garde', lire().length === 1 && lire()[0].id === 'charly_ai_b');
  poser([ev('charly_ai_a', '2026-10-15'), ev('charly_ai_b', '2026-10-15')]);
  ctx.tcDedoublonnerRendezVous();
  verifie('a egalite : le premier', lire().length === 1 && lire()[0].id === 'charly_ai_a');
}

titre('Rien d autre ne bouge');
{
  const manuel1 = ev('rdv_manuel_1', '2026-10-16');
  const manuel2 = ev('rdv_manuel_2', '2026-10-16');                 // deux a la main, identiques : on n y touche pas
  const autreHeure = ev('charly_ai_c', '2026-10-16', { startH: 9, endH: 10 });
  const autreJour = ev('charly_ai_d', '2026-10-17');
  const autreTitre = Object.assign(ev('charly_ai_e', '2026-10-16'), { title: 'Cours de tennis' });
  const unique = ev('charly_ai_f', '2026-10-18');
  poser([manuel1, manuel2, autreHeure, autreJour, autreTitre, unique]);
  ctx.saves = 0;
  const n = ctx.tcDedoublonnerRendezVous();
  verifie('aucun retire', n === 0 && lire().length === 6);
  verifie('ce que Charles a saisi a la main ne bouge jamais', lire().indexOf(manuel1) > -1 && lire().indexOf(manuel2) > -1);
  verifie('rien enregistre quand rien ne change', ctx.saves === 0);
}

titre('Les accents et la casse ne comptent pas');
{
  poser([ev('charly_ai_a', '2026-10-19'), Object.assign(ev('charly_ai_b', '2026-10-19'), { title: 'CHERCHER LES ENFANTS A L\'ECOLE' })]);
  verifie('« à l\'école » et « A L\'ECOLE » : meme rendez-vous', ctx.tcDedoublonnerRendezVous() === 1);
}

titre('Deuxieme passage : plus rien a faire');
{
  poser([ev('charly_ai_a', '2026-10-20'), ev('charly_ai_b', '2026-10-20')]);
  ctx.tcDedoublonnerRendezVous();
  ctx.saves = 0;
  verifie('rien de plus retire, rien enregistre', ctx.tcDedoublonnerRendezVous() === 0 && ctx.saves === 0);
}

titre('Branche au chargement');
verifie('appelee avant la reparation des categories', /tcDedoublonnerRendezVous\(\);\s*tcReparerCategories\(\);/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
