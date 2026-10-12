// Mission 32 (Charles, 12/10) : vue Semaine, bande « toute la journee » : un evenement sur plusieurs jours garde la meme
// ligne tous les jours ; les evenements d un jour et les fetes vont en dessous, jamais au-dessus.
// Usage : node verif-bande-semaine.js <index.html>
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
const ctx = { console, String, Array, Object, JSON };
vm.createContext(ctx);
['tcEvenementFin', 'tcEvenementCouvre', 'tcLignesBandeSemaine'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

// Semaine 46 de 2026 : lundi 9 → dimanche 15 novembre. Voyage « RYDER CUP » du 11 au 15, ferie « Armistice 1918 » le 11.
const JOURS = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
const ryder = { id: 'v1', title: 'RYDER CUP 2026', date: '2026-11-11', dateFin: '2026-11-15', allDay: true, cat: 'voyages', mode: 'user' };
const bande = (evts, fetes) => ctx.tcLignesBandeSemaine(JOURS, (j) => evts.filter((e) => ctx.tcEvenementCouvre(e, j)), (j) => fetes[j] || []);
const titresLigne = (b, r) => b.map((l) => (l[r] && l[r].type === 'evt' ? l[r].e.title : (l[r] && l[r].type === 'fete' ? l[r].r.nom : (l[r] ? '+' + l[r].n : '·')))).join(' | ');

titre('1. Le scenario de la capture de Charles (semaine 46)');
const b1 = bande([ryder], { '2026-11-11': [{ nom: 'Armistice 1918', couleur: '#1a73e8' }] });
verifie('le voyage est sur la ligne du haut les 5 jours (11 → 15)', [2, 3, 4, 5, 6].every((i) => b1[i][0] && b1[i][0].type === 'evt' && b1[i][0].e.id === 'v1'), titresLigne(b1, 0));
verifie('« Armistice 1918 » est EN DESSOUS le 11 (ligne 2), jamais au-dessus', b1[2][1] && b1[2][1].type === 'fete' && b1[2][1].r.nom === 'Armistice 1918', titresLigne(b1, 1));
verifie('lundi 9 et mardi 10 : rien (aucune ligne vide inutile)', b1[0].length === 0 && b1[1].length === 0);
verifie('le voyage occupe une seule ligne sur toute la semaine : jamais deux pastilles le meme jour', b1.every((l) => l.filter((x) => x && x.type === 'evt' && x.e.id === 'v1').length <= 1));

titre('2. Une fete un jour libre prend la ligne du haut (pas de trou) ; un 2e voyage prend la 2e ligne');
const fetes2 = { '2026-11-09': [{ nom: 'Férié test', couleur: '#000' }], '2026-11-11': [{ nom: 'Armistice 1918', couleur: '#1a73e8' }] };
const salon = { id: 'v2', title: 'Salon', date: '2026-11-10', dateFin: '2026-11-12', allDay: true, cat: 'travail', mode: 'user' };
const b2 = bande([ryder, salon], fetes2);
verifie('lundi 9 : la fete est sur la ligne du haut (aucun voyage ce jour-la)', b2[0][0] && b2[0][0].type === 'fete', titresLigne(b2, 0));
verifie('« Salon » (10 → 12) commence avant : ligne du haut les 10, 11, 12 ; « RYDER CUP » (11 → 15) en 2e ligne du 11 au 15, la meme partout', [1, 2, 3].every((i) => b2[i][0] && b2[i][0].e && b2[i][0].e.id === 'v2') && [2, 3, 4, 5, 6].every((i) => b2[i][1] && b2[i][1].e && b2[i][1].e.id === 'v1'), titresLigne(b2, 0) + ' // ' + titresLigne(b2, 1));
verifie('le 13, la 1re ligne est vide (reservee au Salon qui est fini) : un espace, pour que RYDER reste en 2e ligne', b2[4][0] === null && b2[4][1].e.id === 'v1');
verifie('« Armistice 1918 » le 11 passe en 3e ligne, sous les deux voyages', b2[2][2] && b2[2][2].type === 'fete');

titre('3. Un evenement d un seul jour « toute la journee » suit la meme regle ; plus de deux fetes → « +n »');
const anniv = { id: 'a1', title: 'Anniversaire Léa', date: '2026-11-12', allDay: true, cat: 'famille', mode: 'user' };
const b3 = bande([ryder, anniv], { '2026-11-12': [{ nom: 'F1' }, { nom: 'F2' }, { nom: 'F3' }] });
verifie('le 12 : RYDER, puis F1, F2, « +1 », puis l anniversaire (un jour)', b3[3][0].e.id === 'v1' && b3[3][1].r.nom === 'F1' && b3[3][2].r.nom === 'F2' && b3[3][3].type === 'reste' && b3[3][3].n === 1 && b3[3][4].e.id === 'a1', titresLigne(b3, 1) + ' / ' + titresLigne(b3, 4));

titre('4. renderWeek s en sert, et garde l alignement avec des espaces invisibles');
const rw = fonction(page, 'renderWeek') || '';
verifie('renderWeek calcule la bande pour la semaine entiere avant les colonnes', /const bande = tcLignesBandeSemaine\(joursISO, function \(j\) \{ return tcEvenementsDuJour\(j, true\); \}, tcReperesDuJour\);/.test(rw) && rw.indexOf('const bande = ') < rw.indexOf('for (let i=0; i<7; i++)'));
verifie('chaque colonne rend ses lignes dans l ordre, une ligne vide = un espace invisible de meme hauteur', /bande\[i\]\.forEach\(function \(slot\) \{\s+if \(!slot\) \{[\s\S]*?vide\.className = 'tc-chip-evt';\s+vide\.style\.visibility = 'hidden';/.test(rw));
verifie('les fetes gardent leur rendu (nom, couleur) et l en-tete reste cliquable quand il porte un repere', /slot\.type === 'fete'/.test(rw) && /if \(fetes\.length\) \{\s+col\.style\.cursor = 'pointer';/.test(rw));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
