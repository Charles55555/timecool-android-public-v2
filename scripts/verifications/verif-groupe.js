// Peut-on composer un groupe dans un carnet de trois mille fiches ?
//
// Le piege n'est pas la recherche : c'est qu'un membre deja coche
// disparaisse de l'ecran des qu'on cherche le suivant. On le croit
// perdu, on recommence, et on se retrouve avec des doublons ou un
// groupe incomplet.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* Un faux morceau de page : la zone de liste, le champ, le bouton. */
const zone = { innerHTML: '' };
const champ = { value: '' };
const bouton = { textContent: '' };
const ctx = {
  console, Array, String,
  _tcGroupSelected: [],
  contactsList: [],
  getContactColor: () => '#000',
  getContactInitials: (n) => (n || '?').slice(0, 2).toUpperCase(),
  escapeHTMLSafe: (t) => String(t),
  document: {
    getElementById: (id) => ({
      newGroupList: zone, newGroupSearch: champ, newGroupBtn: bouton
    }[id] || null)
  }
};
vm.createContext(ctx);
['tcLigneMembreGroupe', 'tcRendreMembresGroupe', 'toggleGroupContact']
  .forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx);
                    else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

ctx.contactsList = [
  { id: 'c1', name: 'ABITBOL Gilles' },
  { id: 'c2', name: 'ABITBOL Stéphane' },
  { id: 'c3', name: 'DUPONT Jean', phone: '0612345678' },
  { id: 'c4', name: 'MARTIN Paul', email: 'paul@exemple.fr' }
];

titre('A l ouverture, rien n est construit');
{
  champ.value = '';
  ctx.tcRendreMembresGroupe();
  verifie('aucune fiche affichee',
    zone.innerHTML.indexOf('data-cid') === -1,
    'construire 3 313 lignes rendait l ouverture penible');
  verifie('mais une invitation a chercher',
    zone.innerHTML.indexOf('Cherche un contact') > -1);
}

titre('La recherche');
{
  champ.value = 'abitbol';
  ctx.tcRendreMembresGroupe();
  const n = (zone.innerHTML.match(/data-cid/g) || []).length;
  verifie('elle trouve les deux Abitbol', n === 2, n + ' resultat(s)');

  champ.value = '0612';
  ctx.tcRendreMembresGroupe();
  verifie('elle cherche aussi dans le telephone',
    zone.innerHTML.indexOf('DUPONT') > -1);

  champ.value = 'paul@';
  ctx.tcRendreMembresGroupe();
  verifie('et dans l email', zone.innerHTML.indexOf('MARTIN') > -1);

  champ.value = 'zzzz';
  ctx.tcRendreMembresGroupe();
  verifie('un nom absent le dit',
    zone.innerHTML.indexOf('Aucun contact') > -1);
}

titre('Un membre coche ne disparait jamais');
{
  champ.value = 'abitbol';
  ctx.tcRendreMembresGroupe();
  ctx.toggleGroupContact('c1');
  verifie('cocher l ajoute a la selection',
    ctx._tcGroupSelected.length === 1 && ctx._tcGroupSelected[0] === 'c1');

  champ.value = 'DUPONT';
  ctx.tcRendreMembresGroupe();
  verifie('il reste visible en cherchant un autre nom',
    zone.innerHTML.indexOf('ABITBOL Gilles') > -1,
    'sinon on le croit perdu et on recommence');
  verifie('et il est annonce comme choisi',
    zone.innerHTML.indexOf('Choisis (1)') > -1);
  verifie('sans etre propose une seconde fois',
    // Chaque ligne cite l identifiant deux fois, dans data-cid et
    // dans l appel : on compte les lignes, pas les occurrences.
    (zone.innerHTML.match(/data-cid="c1"/g) || []).length === 1,
    'il apparaitrait dans les choisis ET dans les resultats');
}

titre('Decocher');
{
  ctx.toggleGroupContact('c1');
  verifie('le retire de la selection', ctx._tcGroupSelected.length === 0);
}

titre('Le compteur du bouton');
{
  ctx._tcGroupSelected = [];
  champ.value = '';
  ctx.tcRendreMembresGroupe();
  verifie('sans membre, pas de nombre', bouton.textContent === 'Créer le groupe',
    bouton.textContent);
  ctx.toggleGroupContact('c1');
  ctx.toggleGroupContact('c3');
  verifie('avec deux membres, il les compte',
    bouton.textContent.indexOf('(2)') > -1, bouton.textContent);
}

titre('Un carnet vide');
{
  ctx.contactsList = [];
  ctx.tcRendreMembresGroupe();
  verifie('renvoie vers Mes contacts',
    zone.innerHTML.indexOf('Mes contacts') > -1);
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
