// La fiche d'un rendez-vous montre toujours Lieu et Avec, avec un crayon.
const fs = require('fs'); const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
function extraire(nom) { const d = page.indexOf('function ' + nom + '('); if (d < 0) return null; let n = 0; for (let j = page.indexOf('{', d); j < page.length; j++) { if (page[j] === '{') n++; else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); } } return null; }
const el = { emTitle: {}, emBody: {}, emActions: {}, emPrevenirRow: { style: {} } };
const ctx = {
  document: { getElementById: (id) => el[id] || (el[id] = { style: {} }) },
  escapeHTML: (t) => String(t), tcPeriodeLisible: () => 'mercredi 7 octobre', currentEvent: null,
  tcContactDuRdv: (e) => (e.contact ? { name: 'Marc Dupont' } : null),
  tcRappelDuRdv: () => 0, TC_DELAIS_RAPPEL: [], tcLigneContactHTML: () => '', tcEstPrevenable: () => false
};
vm.createContext(ctx);
vm.runInContext(['tcCrayonFiche', 'tcLigneVideFiche'].map(extraire).join('\n'), ctx);
const corps = extraire('openEventModal');
verifie('openEventModal trouvée', !!corps);
let rendu = '';
try { vm.runInContext(corps.replace(/const actions[\s\S]*$/, '') + '}', ctx); } catch (e) { console.log('  (extraction : ' + e.message + ')'); }
function fiche(e) { try { ctx.openEventModal(e); } catch (x) { return 'ERREUR ' + x.message; } return el.emBody.innerHTML; }
const vide = fiche({ title: 'Travail', date: '2026-10-07', startH: 11, startM: 0, endH: 13, endM: 0 });
verifie('vide : la ligne Lieu apparaît, avec « Ajouter un lieu »', /Ajouter un lieu/.test(vide), vide.slice(0, 80));
verifie('vide : la ligne Avec apparaît, avec « Ajouter un contact »', /Ajouter un contact/.test(vide));
verifie('vide : quatre crayons (date, horaire, lieu, avec)', (vide.match(/✏️/g) || []).length === 4);
verifie('vide : les deux phrases d aide (Charles, 05/10)', /Si tu précises le lieu, Charly pourra te guider/.test(vide) && /Si tu précises le contact, Charly pourra le prévenir/.test(vide));
verifie('vide : le crayon mène au bon champ', /openEditEventModal\('lieu'\)/.test(vide) && /openEditEventModal\('contact'\)/.test(vide));
const plein = fiche({ title: 'Dentiste', date: '2026-10-07', startH: 11, startM: 0, endH: 13, endM: 0, lieu: '12 rue des Lilas', contact: 'c1' });
verifie('rempli : le lieu et le contact sont montrés', /12 rue des Lilas/.test(plein) && /Marc Dupont/.test(plein));
verifie('rempli : plus d invitation', !/Ajouter un lieu/.test(plein) && !/Ajouter un contact/.test(plein));
verifie('rempli : plus de phrase d aide non plus', !/Si tu précises/.test(plein));
verifie('rempli : un crayon sur chaque ligne modifiable (date, horaire, lieu, avec)', (plein.match(/✏️/g) || []).length === 4);
verifie('rempli : « Y aller » est toujours là', /Y aller/.test(plein));
verifie('Modifier va droit au champ : lieu', /champ === 'lieu'[\s\S]*editLieu[\s\S]*focus\(\)/.test(extraire('openEditEventModal')));
verifie('Modifier va droit au champ : contact', /champ === 'contact'[\s\S]*tcChoisirContactRdv\(\)/.test(extraire('openEditEventModal')));
const edit = extraire('openEditEventModal') || '';
verifie('aide sous « Avec qui ? » (Charles, 05/10)', edit.indexOf("Si tu précises le contact, Charly pourra le prévenir en cas d'imprévu.") > -1);
verifie('aide sous « Lieu »', edit.indexOf('Si tu précises le lieu, Charly pourra te guider et calculer le temps de trajet.') > -1);
verifie('chacune juste apres son champ', edit.indexOf('tcLigneContactHTML(e.contact)') < edit.indexOf('Si tu précises le contact') && edit.indexOf('id="editLieu"') < edit.indexOf('Si tu précises le lieu'));
console.log(''); console.log(ko + ' anomalie(s).'); process.exit(ko ? 1 : 0);
