// Fiche d'un rendez-vous : un crayon sur chaque ligne modifiable (Date, Horaire, Lieu, Avec).
// Le crayon ouvre « Modifier » directement sur le champ.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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
const ouvre = fonction(page, 'openEventModal') || '';
const edite = fonction(page, 'openEditEventModal') || '';

console.log('\n-- La fiche --');
verifie('la ligne Date porte un crayon (champ « date »)', /event-detail-label" style="display:flex; justify-content:space-between; align-items:center;">Date\$\{tcCrayonFiche\('date'\)\}<\/div>/.test(ouvre));
verifie('la ligne Horaire porte un crayon (champ « horaire »)', /event-detail-label" style="display:flex; justify-content:space-between; align-items:center;">Horaire\$\{tcCrayonFiche\('horaire'\)\}<\/div>/.test(ouvre));
verifie('Lieu et Avec gardent le leur', /Lieu\$\{tcCrayonFiche\('lieu'\)\}/.test(ouvre) && /tcCrayonFiche\('contact'\)/.test(ouvre));
verifie('le crayon est a droite de la ligne (le contenu prend la place : flex:1)', (ouvre.match(/<svg viewBox="0 0 24 24"><path d="[^"]*"\/><\/svg><div style="flex:1;"><div class="event-detail-label" style="display:flex/g) || []).length >= 2);
verifie('la ligne Confidentialite n a pas de crayon (rien a modifier)', !/Confidentialité\$\{tcCrayonFiche/.test(ouvre));

console.log('\n-- Le crayon ouvre « Modifier » sur le bon champ --');
verifie('« date » : le champ date est mis en vue et selectionne', /champ === 'date'[\s\S]{0,120}getElementById\('editDate'\)[\s\S]{0,120}focus\(\)/.test(edite));
verifie('« horaire » : l heure de debut (ou la case « Journee entiere » si c en est une)', /champ === 'horaire'[\s\S]{0,260}e\.allDay \? document\.getElementById\('editAllDay'\) : document\.getElementById\('editStartH'\)/.test(edite));
verifie('« lieu » et « contact » marchent toujours', /champ === 'lieu'/.test(edite) && /champ === 'contact'/.test(edite));

console.log('\n-- Execution : le crayon appelle bien openEditEventModal --');
const ctx = { appels: [], event: { stopPropagation() {} }, openEditEventModal: (c) => ctx.appels.push(c) };
vm.createContext(ctx);
vm.runInContext(fonction(page, 'tcCrayonFiche'), ctx);
const crayon = (c) => vm.runInContext('tcCrayonFiche(' + JSON.stringify(c) + ')', ctx);
['date', 'horaire'].forEach((c) => {
  const h = crayon(c);
  const m = h.match(/onclick="([^"]*)"/);
  verifie('crayon « ' + c + ' » : arrete la propagation puis ouvre « Modifier » sur ce champ', m && m[1] === "event.stopPropagation(); openEditEventModal('" + c + "')" && /✏️/.test(h), m && m[1]);
  vm.runInContext(m[1].replace('event.stopPropagation(); ', ''), ctx);
});
verifie('et il appelle bien les deux champs', ctx.appels.join(',') === 'date,horaire', ctx.appels.join(','));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
