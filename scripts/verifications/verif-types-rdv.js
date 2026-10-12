// Mission 21 (Charles, 12/10) : une seule liste de types de rendez-vous partout (formulaire « Nouveau », menu ⋮,
// Charly, fiche « Modifier ») ; les anciens identifiants sont rattaches explicitement, jamais a « Mon temps libre »
// (temps protege) par accident. Usage : node verif-types-rdv.js <index.html>
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
['var TC_COULEURS_CATEGORIES = \\{[\\s\\S]*?\\n\\};', 'const TC_AGENDA_ALIAS = \\{[\\s\\S]*?\\n\\};', 'const AGENDA_CATEGORIES = \\[[\\s\\S]*?\\n\\]']
  .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0] + (re.indexOf('AGENDA_CATEGORIES = ') > -1 ? ';' : ''), ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
const f = fonction(page, 'tcCatNormalisee'); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  tcCatNormalisee introuvable'); }
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const CATS = vm.runInContext('AGENDA_CATEGORIES', ctx);
const COULEURS = vm.runInContext('TC_COULEURS_CATEGORIES', ctx);
const ALIAS = vm.runInContext('TC_AGENDA_ALIAS', ctx);
const ids = CATS.map((c) => c.id);

titre('1. Une seule liste : le menu ⋮ (AGENDA_CATEGORIES) dans l ordre voulu');
const ATTENDU = ['Travail', 'Santé', 'Famille', 'Amis & Loisirs', 'Sport', 'Voyages & Trajets', 'Mon temps libre', 'Personnel'];
verifie('8 types, dans cet ordre : ' + ATTENDU.join(' · '), JSON.stringify(CATS.map((c) => c.label)) === JSON.stringify(ATTENDU), CATS.map((c) => c.label).join(' · '));
verifie('« Personnel » (perso) est un type a part, distinct de « Mon temps libre » (personnel, temps protege)', ids.indexOf('perso') > -1 && ids.indexOf('personnel') > -1 && CATS.find((c) => c.id === 'perso').label === 'Personnel' && CATS.find((c) => c.id === 'personnel').label === 'Mon temps libre');
verifie('chaque type a sa couleur (TC_COULEURS_CATEGORIES)', ids.every((id) => COULEURS[id] && COULEURS[id].color && COULEURS[id].bg && COULEURS[id].texte));

titre('2. Le formulaire « Nouveau » : les memes types, les memes identifiants');
const select = page.match(/<select id="newEvtType"[^>]*>([\s\S]*?)<\/select>/);
const options = select ? (select[1].match(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g) || []).map((o) => { const m = o.match(/<option value="([^"]*)"([^>]*)>([^<]*)<\/option>/); return { value: m[1], selected: /selected/.test(m[2]), label: m[3].replace(/&amp;/g, '&').replace(/^[^\wÀ-ÿ]+/, '').trim() }; }) : [];
verifie('8 options, dans le meme ordre que le menu ⋮', JSON.stringify(options.map((o) => o.value)) === JSON.stringify(ids), options.map((o) => o.value).join(' '));
verifie('chaque option porte l identifiant du type et son libelle exact', options.every((o) => { const c = CATS.find((x) => x.id === o.value); return c && c.label === o.label; }), options.map((o) => o.value + '=' + o.label).join(' | '));
verifie('« Personnel » est le type par defaut', options.filter((o) => o.selected).map((o) => o.value).join() === 'perso');
verifie('plus aucun ancien identifiant de couleur dans le formulaire', !/<option value="(blue|red|green|yellow|purple|teal|orange)"/.test(select ? select[1] : 'x'));
verifie('« Prendre rdv » (liste des pros) choisit « sante », plus « red »', /getElementById\('newEvtType'\)\.value = 'sante';/.test(page) && !/getElementById\('newEvtType'\)\.value = 'red';/.test(page));
verifie('chaque type du formulaire retombe sur le meme type dans ⋮ (tcCatNormalisee est l identite)', options.every((o) => ctx.tcCatNormalisee(o.value) === o.value));

titre('3. Les rendez-vous existants gardent un type, par correspondance explicite');
// Decision du chef (12/10) : « orange » (Service) etait « Mon temps libre » (temps protege) et le RESTE : on ne deprotege jamais.
const ANCIENS = { blue: 'perso', red: 'sante', green: 'travail', yellow: 'famille', purple: 'amis', teal: 'voyages', orange: 'personnel' };
verifie('les 7 anciens types du formulaire (blue, red, green, yellow, purple, teal, orange) ont chacun un type actuel', Object.keys(ANCIENS).every((k) => ids.indexOf(ctx.tcCatNormalisee(k)) > -1), Object.keys(ANCIENS).map((k) => k + '→' + ctx.tcCatNormalisee(k)).join(' '));
verifie('la correspondance voulue : Personnel → Personnel, Service → Mon temps libre (inchange, protege), Transport → Voyages & Trajets, Sport / Loisir → Amis & Loisirs', Object.keys(ANCIENS).every((k) => ctx.tcCatNormalisee(k) === ANCIENS[k]), Object.keys(ANCIENS).map((k) => k + '→' + ctx.tcCatNormalisee(k)).join(' '));
verifie('seul « orange » (deja temps libre) mene a « Mon temps libre » : aucun autre ancien type n est protege par accident', Object.keys(ALIAS).filter((k) => ALIAS[k] === 'personnel').join() === 'orange');
verifie('un type vide devient « Personnel » (chef, 12/10, mission 23 ; avant : travail) ; un type actuel est inchange', ctx.tcCatNormalisee('') === 'perso' && ids.every((id) => ctx.tcCatNormalisee(id) === id));

titre('4. Charly et la fiche « Modifier »');
const catMap = page.match(/const catMap = \{[\s\S]*?\};/);
verifie('Charly : « perso » (et autre, divers) donne le type neutre ; « temps_libre » reste « Mon temps libre »', !!catMap && /perso:'perso'/.test(catMap[0]) && /autre:'perso'/.test(catMap[0]) && /temps_libre:'personnel'/.test(catMap[0]));
verifie('Charly : « rdv » sans indice → Personnel, jamais Sante par defaut (chef, 12/10) ; medical / medecin / urgent restent Sante', !!catMap && /rdv:'perso'/.test(catMap[0]) && /medical:'sante'/.test(catMap[0]) && /medecin:'sante'/.test(catMap[0]));
verifie('la consigne de Charly cite « perso »', /Catégories : travail, sport, famille, sante, repas, pause, trajet, preparation, administratif, loisir, temps_libre, perso/.test(page));
const modal = fonction(page, 'openEditEventModal') || '';
verifie('la fenetre « Modifier » a un champ TYPE (AGENDA_CATEGORIES), le type actuel selectionne et garde en data-initial', /TYPE<\/div>\s*<select id="editCat" data-initial="\$\{escapeHTMLSafe\(catActuelle\)\}"/.test(modal) && /AGENDA_CATEGORIES\.map\(c => `<option value="\$\{c\.id\}"\$\{catActuelle === c\.id \? ' selected' : ''\}>\$\{c\.label\}<\/option>`\)/.test(modal));
verifie('un type inconnu est montre tel quel en premiere option « (type actuel : …) »', /catConnue \? '' : `<option value="\$\{escapeHTMLSafe\(catActuelle\)\}" selected>\(type actuel : \$\{escapeHTMLSafe\(catActuelle\)\}\)<\/option>`/.test(modal));
const save = fonction(page, 'saveEventEdit') || '';
verifie('l enregistrement n ecrit le type que s il a change par rapport a l affiche', /const champCat = document\.getElementById\('editCat'\);[\s\S]*?if \(champCat && champCat\.value && champCat\.value !== champCat\.getAttribute\('data-initial'\)\) e\.cat = champCat\.value;/.test(save));
verifie('le formulaire « Nouveau » revient a « Personnel » a chaque ouverture', /function openCreateModal\((?:prerempli)?\) \{[\s\S]*?getElementById\('newEvtType'\);\s+if \(champType\) champType\.value = 'perso';/.test(page));

titre('5. Rejeu : un rendez-vous « loisir » (type d avant) modifie par le titre garde « loisir » ; choisi « sport », il devient « sport »');
{
  const champs = {};
  const emBody = { innerHTML: '' };
  const c5 = {
    console, String, Array, Object, JSON, Number, parseInt,
    document: { getElementById: (id) => (id === 'emBody' ? emBody : (champs[id] || (champs[id] = { value: '', checked: false, getAttribute: () => null }))) },
    showToast() {}, saveEventsToStorage() {}, render() {}, closeEventModal() {}, closeModal() {}, renderEvents() {}, tcMajAvatarEntete() {},
    tcDelaiRappel: () => 15, tcRappelDuRdv: () => 15, TC_DELAIS_RAPPEL: [{ minutes: 15, label: '15 min' }], tcLigneContactHTML: () => '', tcTypeBlocHTML: () => '',
    escapeHTMLSafe: (x) => String(x), currentPage: 'calendar', events: [],
    tcAutocompleterLieu() {}, tcChoisirContactRdv() {}, setTimeout: (f) => { if (f) f(); return 0; }
  };
  vm.createContext(c5);
  ['const AGENDA_CATEGORIES = \\[[\\s\\S]*?\\n\\]', 'var TC_COULEURS_CATEGORIES = \\{[\\s\\S]*?\\n\\};', 'const TC_AGENDA_ALIAS = \\{[\\s\\S]*?\\n\\};']
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0] + (re.indexOf('AGENDA_CATEGORIES = ') > -1 ? ';' : ''), c5); });
  ['tcCatNormalisee', 'openEditEventModal', 'saveEventEdit'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, c5); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  const e = { id: 'x', cat: 'loisir', title: 'Cinéma', date: '2026-10-14', startH: 20, startM: 0, endH: 22, endM: 0, mode: 'user' };
  c5.currentEvent = e;
  // La fin de la fonction (autocompletion du lieu, etc.) ne nous concerne pas : le HTML est deja pose.
  try { c5.openEditEventModal(); } catch (err) { console.log('  (openEditEventModal, apres le HTML : ' + err.message + ')'); }
  verifie('la fenetre montre « (type actuel : loisir) » selectionne, data-initial = loisir', /data-initial="loisir"/.test(emBody.innerHTML) && /<option value="loisir" selected>\(type actuel : loisir\)<\/option>/.test(emBody.innerHTML), emBody.innerHTML.slice(0, 200));
  const stub = (val, initial) => ({ value: val, getAttribute: (a) => (a === 'data-initial' ? initial : null), checked: false });
  Object.assign(champs, { editTitle: stub('Cinéma avec Paul'), editDate: stub('2026-10-14'), editDateFin: stub(''), editAllDay: { checked: false }, editStartH: stub('20:00'), editEndH: stub('22:00'), editRappel: stub('15'), editLieu: stub(''), editContact: stub(''), editCat: stub('loisir', 'loisir') });
  try { c5.saveEventEdit(); } catch (err) { /* la fin de l enregistrement (contact, affichage) ne nous concerne pas ici */ }
  verifie('titre modifie, type inchange : e.cat reste « loisir »', e.title === 'Cinéma avec Paul' && e.cat === 'loisir', e.cat);
  champs.editCat = stub('sport', 'loisir');
  try { c5.saveEventEdit(); } catch (err) {}
  verifie('type choisi « Sport » : e.cat devient « sport »', e.cat === 'sport', e.cat);
  const e2 = { id: 'y', title: 'Sans type', date: '2026-10-14', startH: 9, startM: 0, endH: 10, endM: 0, mode: 'user' };
  c5.currentEvent = e2; emBody.innerHTML = '';
  try { c5.openEditEventModal(); } catch (err) {}
  verifie('sans type : « Personnel » est affiche, et rien n est ecrit tant qu on ne choisit pas', /data-initial="perso"/.test(emBody.innerHTML) && /<option value="perso" selected>Personnel<\/option>/.test(emBody.innerHTML) && (champs.editCat = stub('perso', 'perso'), (() => { try { c5.saveEventEdit(); } catch (err) {} return e2.cat === undefined; })()), emBody.innerHTML.slice(0, 160) + ' / cat=' + e2.cat);
}
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
