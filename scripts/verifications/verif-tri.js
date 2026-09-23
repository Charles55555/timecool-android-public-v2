// Verifie les quatre tris de la liste des inscrits sur un jeu d'essai
// contenant les cas penibles : accents, date absente, provenance vide.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const debut = html.indexOf('/* Tri de la liste des inscrits.');
const fin = html.indexOf('function renderUsersTab()');
if (debut < 0 || fin < 0) { console.log('ERREUR: bloc introuvable'); process.exit(1); }

const ctx = {
  // Reproduit le comportement reel : libelle, ou « Non renseigné ».
  tcLibelleProvenance: (u) => u.provenance || 'Non renseigné',
};
vm.createContext(ctx);
vm.runInContext(
  html.slice(debut, fin)
  + '\nglobalThis._t = { trier: tcTrierUsers, set: (v) => { _tcTriUsers = v; }, tris: TC_TRIS_USERS };',
  ctx
);
const T = ctx._t;

const jeu = [
  { id: 1, firstname: 'Zoe',    lastname: 'Aubert',  registeredAt: '2026-08-26T18:31:00', provenance: 'TikTok' },
  { id: 2, firstname: 'Elodie', lastname: 'Élan',    registeredAt: '2026-08-27T09:00:00', provenance: 'Facebook' },
  { id: 3, firstname: 'Marc',   lastname: 'Blanc',   registeredAt: '2026-09-01T12:00:00' },
  { id: 4, firstname: 'Anne',   lastname: 'Zola',    registeredAt: 'date-illisible',      provenance: 'TikTok' },
];

let ko = 0;
const verifier = (libelle, obtenu, attendu) => {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(30)} ${obtenu.join(', ')}`);
  if (!ok) console.log(`       attendu : ${attendu.join(', ')}`);
};

const ids = (l) => l.map((u) => u.id);

T.set('date_desc');
verifier('Plus recents', ids(T.trier(jeu)), [3, 2, 1, 4]);

T.set('date_asc');
verifier('Plus anciens', ids(T.trier(jeu)), [4, 1, 2, 3]);

T.set('alpha');
verifier('A -> Z (accents)', ids(T.trier(jeu)), [1, 3, 2, 4]);

T.set('provenance');
verifier('Provenance', ids(T.trier(jeu)), [2, 1, 4, 3]);

// Le tableau d'origine ne doit jamais bouger.
T.set('alpha');
T.trier(jeu);
verifier('Original non modifie', ids(jeu), [1, 2, 3, 4]);

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
