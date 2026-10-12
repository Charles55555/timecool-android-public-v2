// Mission 39 (12/10) : le Journal d activite enregistre aussi les rendez-vous crees / modifies / supprimes a la main (bouton +
// et fiche) et l envoi d un message d absence, au meme format que les actions de Charly. Usage : node verif-journal-manuel.js <index.html>
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

titre('1. La page : les trois gestes de la main et l absence passent par le Journal');
verifie('bouton + (saveNewEvent) : tcJournaliserRdvManuel(\'cree\', …) juste apres l enregistrement', /saveEventsToStorage\(\);\s+\/\/[^\n]*\n\s+tcJournaliserRdvManuel\('cree', events\[events\.length - 1\]\);\s+closeCreateModal\(\);/.test(fonction(page, 'saveNewEvent') || ''));
verifie('fiche (saveEventEdit) : tcJournaliserRdvManuel(\'modifie\', e) apres l enregistrement', /saveEventsToStorage\(\);\s+tcJournaliserRdvManuel\('modifie', e\);\s+scheduleAllReminders\(\);/.test(fonction(page, 'saveEventEdit') || ''));
verifie('fiche (deleteCurrentEvent) : tcJournaliserRdvManuel(\'supprime\', e) apres l enregistrement', /saveEventsToStorage\(\);\s+tcJournaliserRdvManuel\('supprime', e\);/.test(fonction(page, 'deleteCurrentEvent') || ''));
verifie('les conversations recues passent par tcJournaliserAbsencesEnvoyees avant d etre posees', /poser: function \(liste\) \{ if \(typeof tcJournaliserAbsencesEnvoyees === 'function'\) \{ try \{ tcJournaliserAbsencesEnvoyees\(liste\); \} catch \(e\) \{\} \} tcPoserConversations\(liste\); \}/.test(page));
verifie('le statut « modifiée » a son etiquette (✏️ Modifiée) et sa couleur', /'modifiee': '✏️ Modifiée'/.test(page) && /'modifiee': '#f29900'/.test(page));

titre('2. Simulation : les entrees du Journal');
const ctx = { console, String, Number, Array, Date, JSON, Math, Object, isNaN, demarches: [], currentPage: 'calendar',
  escapeHTMLSafe: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), saveDemarches() { ctx._sauves = (ctx._sauves || 0) + 1; }, renderDemarches() {} };
vm.createContext(ctx);
['tcFormaterDateHumaine', 'tcFormaterHeure', 'tcLigneRdvPourJournal', 'tcJournaliserRdvManuel', 'tcJournaliserAbsencesEnvoyees', 'addDemarche'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const rdv = { id: 'e1', title: 'Dentiste <b>', date: '2026-10-13', startH: 15, startM: 0, endH: 16, endM: 0, mode: 'user' };
verifie('tcLigneRdvPourJournal : « Mardi 13 octobre, 15h à 16h » ; journee entiere ; periode « du … au … »', ctx.tcLigneRdvPourJournal(rdv) === 'Mardi 13 octobre, 15h à 16h' && ctx.tcLigneRdvPourJournal({ date: '2026-10-13', allDay: true }) === 'Mardi 13 octobre, toute la journée' && ctx.tcLigneRdvPourJournal({ date: '2026-12-24', dateFin: '2026-12-26', allDay: true }) === 'du jeudi 24 décembre au samedi 26 décembre, toute la journée', [ctx.tcLigneRdvPourJournal(rdv), ctx.tcLigneRdvPourJournal({ date: '2026-12-24', dateFin: '2026-12-26', allDay: true })].join(' | '));
ctx.tcJournaliserRdvManuel('cree', rdv);
let d = ctx.demarches[0];
verifie('cree : « 📅 Rendez-vous créé — Dentiste <b> », statut ajoutee, categorie rdv, resume echappe, detail « Tu as créé ce rendez-vous toi-même : … », manuel', d && d.icon === '📅' && d.title === 'Rendez-vous créé — Dentiste <b>' && d.status === 'ajoutee' && d.categorie === 'rdv' && d.summary === 'Mardi 13 octobre, 15h à 16h' && /Tu as créé ce rendez-vous toi-même : Mardi 13 octobre, 15h à 16h\./.test(d.detail) && d.manuel === true && typeof d.timestamp === 'number' && /^dem_/.test(d.id), JSON.stringify(d));
ctx.tcJournaliserRdvManuel('modifie', rdv);
d = ctx.demarches[0];
verifie('modifie : ✏️, « Rendez-vous modifié — … », statut modifiee', d.icon === '✏️' && /^Rendez-vous modifié — /.test(d.title) && d.status === 'modifiee');
ctx.tcJournaliserRdvManuel('supprime', rdv);
d = ctx.demarches[0];
verifie('supprime : 🗑️, « Rendez-vous supprimé — … », statut annulee', d.icon === '🗑️' && /^Rendez-vous supprimé — /.test(d.title) && d.status === 'annulee' && ctx.demarches.length === 3);
ctx.tcJournaliserRdvManuel('cree', null);
verifie('sans rendez-vous : rien', ctx.demarches.length === 3);
const conv = [{ reference: 'REFPAUL', with: 'Paul Martin', thread: [
  { from: 'them', texte: 'Salut', le: '2026-10-12T08:00:00+02:00' },
  { from: 'me', genre: 'absence', texte: 'Je suis absent jusqu’au 20 octobre.', le: '2026-10-12T08:00:05+02:00' },
  { from: 'me', texte: 'Un message ordinaire', le: '2026-10-12T09:00:00+02:00' } ] }];
const n1 = ctx.tcJournaliserAbsencesEnvoyees(conv);
d = ctx.demarches[0];
verifie('absence envoyee : une entree « 🏖️ Message d’absence envoyé à Paul Martin », statut envoyee, categorie compte, date = celle du message, cle unique', n1 === 1 && d.icon === '🏖️' && d.title === 'Message d’absence envoyé à Paul Martin' && d.status === 'envoyee' && d.categorie === 'compte' && d.timestamp === new Date('2026-10-12T08:00:05+02:00').getTime() && d.cle === 'absence:REFPAUL:2026-10-12T08:00:05+02:00' && /Je suis absent/.test(d.summary), JSON.stringify(d));
const n2 = ctx.tcJournaliserAbsencesEnvoyees(conv);
verifie('recue une seconde fois (synchro suivante) : pas de doublon', n2 === 0 && ctx.demarches.length === 4);
verifie('les messages ordinaires et ceux des autres ne font pas d entree', !ctx.demarches.some((x) => /Un message ordinaire|Salut/.test(x.summary || '')));
ctx.tcJournaliserAbsencesEnvoyees([{ reference: 'REFLONG', with: 'Long', thread: [{ from: 'me', genre: 'absence', texte: 'a'.repeat(197) + '"""', le: '2026-10-12T10:00:00+02:00' }] }]);
const long = ctx.demarches[0];
verifie('un long texte avec des guillemets : coupe a 200 caracteres bruts PUIS echappe (jamais une entite tranchee)', long.summary === 'a'.repeat(197) + '&quot;&quot;&quot;', long.summary.slice(-30));
verifie('le resume ne contient aucune entite tranchee (« &qu » en fin)', !/&[a-z]{0,4}$/.test(long.summary));
titre('3. Le deplacement au doigt : une entree par geste termine, retiree par « Annuler »');
verifie('tcMontrerDeplacement (fin du geste) journalise une fois et garde l identifiant avec la bulle ; tcAnnulerDeplacement retire l entree', /demarcheId: typeof tcJournaliserDeplacementDoigt === 'function' \? tcJournaliserDeplacementDoigt\(e, ancien, c\) : null,/.test(fonction(page, 'tcMontrerDeplacement') || '') && /if \(typeof tcRetirerEntreeDeplacement === 'function'\) tcRetirerEntreeDeplacement\(dernier\.demarcheId\);\s+showToast\('↩️ Rendez-vous remis à sa place'\);/.test(fonction(page, 'tcAnnulerDeplacement') || ''));
verifie('rien pendant le geste : tcTerminerDeplacement n appelle la journalisation que par tcMontrerDeplacement (deplace), pas pour « rien » ni « decale »', !/tcJournaliserDeplacementDoigt/.test(fonction(page, 'tcTerminerDeplacement') || '') && !/tcJournaliserDeplacementDoigt/.test(fonction(page, 'tcEcrireDeplacementDoigt') || ''));
let manque3 = 0;
['tcLibelleCreneau', 'tcJournaliserDeplacementDoigt', 'tcRetirerEntreeDeplacement'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manque3++; console.log('  KO  ' + n + ' introuvable'); } });
if (manque3) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const avantN = ctx.demarches.length;
const idDep = ctx.tcJournaliserDeplacementDoigt({ id: 'e9', title: 'Dentiste' }, { date: '2026-10-13', startH: 15, startM: 0, endH: 16, endM: 0 }, { date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0 });
const dep = ctx.demarches[0];
verifie('deplacement : « ↔️ Rendez-vous déplacé — Dentiste », « mardi 13 octobre 15h00 → mardi 13 octobre 16h00 », statut modifiee, categorie rdv, identifiant rendu', ctx.demarches.length === avantN + 1 && typeof idDep === 'string' && dep.id === idDep && dep.icon === '↔️' && dep.title === 'Rendez-vous déplacé — Dentiste' && dep.summary === 'mardi 13 octobre 15h00 → mardi 13 octobre 16h00' && dep.status === 'modifiee' && dep.categorie === 'rdv' && /Tu as déplacé ce rendez-vous au doigt : de mardi 13 octobre 15h00 à mardi 13 octobre 16h00\./.test(dep.detail), JSON.stringify(dep));
verifie('« Annuler » : l entree est retiree, le Journal enregistre', ctx.tcRetirerEntreeDeplacement(idDep) === true && ctx.demarches.length === avantN && !ctx.demarches.some((d) => d.id === idDep));
verifie('un identifiant inconnu ou vide : rien', ctx.tcRetirerEntreeDeplacement(idDep) === false && ctx.tcRetirerEntreeDeplacement(null) === false);
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
