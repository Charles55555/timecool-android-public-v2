// Mission 29 (Charles, 12/10) : Journal d activite, 2e ligne de pilules : « Du mois en cours » (defaut) / « Des 3 derniers
// mois » (periode combinee avec la categorie) / « Archiver » (les entrees affichees passent dans les Archives, rien n est
// supprime) ; bouton « Archives » a droite pour les consulter et les desarchiver. Usage : node verif-journal-periode.js <index.html>
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
// Horloge : lundi 12 octobre 2026.
const NOW = new Date(2026, 9, 12, 10, 0, 0).getTime();
const t = (a, m, j) => new Date(a, m - 1, j, 12, 0, 0).getTime();
const liste = () => [
  { id: 'a', title: 'Dentiste', categorie: 'rdv', timestamp: t(2026, 10, 3) },
  { id: 'b', title: 'Question à Charly', categorie: 'charly', timestamp: t(2026, 10, 8) },
  { id: 'c', title: 'Rdv banque', categorie: 'rdv', timestamp: t(2026, 9, 20) },
  { id: 'd', title: 'Mot de passe', categorie: 'compte', timestamp: t(2026, 8, 5) },
  { id: 'e', title: 'Coiffeur', categorie: 'rdv', timestamp: t(2026, 6, 15) },
  { id: 'f', title: 'Vieux rdv', timestamp: t(2025, 12, 1), archive: true }
];
const toasts = [];
const ctx = { console, Array, Date, Math, String, JSON, demarches: liste(), saveDemarches() { ctx._sauve = (ctx._sauve || 0) + 1; }, showToast: (x) => toasts.push(x), renderDemarches() { ctx._rendu = (ctx._rendu || 0) + 1; }, currentPage: 'demarches' };
vm.createContext(ctx);
vm.runInContext("let _demarchesFiltre = 'tout'; let _demarchesPeriode = 'mois'; let _demarchesArchives = false;", ctx);
const mP = page.match(/const TC_DEMARCHES_PERIODES = \[[\s\S]*?\];/); if (mP) vm.runInContext(mP[0], ctx); else { ko++; console.log('  KO  TC_DEMARCHES_PERIODES introuvable'); }
['tcDebutPeriodeDemarches', 'tcDemarchesVisibles', 'tcArchiverDemarches', 'tcBasculerArchivesDemarches', 'tcDesarchiverDemarche', 'setDemarchesPeriode'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const ids = (l) => l.map((d) => d.id).join('');

titre('1. La periode, combinee avec la categorie');
const jourLocal = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + d.getHours() + 'h'; };   // heure locale, jamais UTC (toISOString decale d un jour en Europe)
verifie('« Du mois en cours » commence le 1er octobre a minuit ; « 3 derniers mois » le 1er aout', jourLocal(ctx.tcDebutPeriodeDemarches('mois', NOW)) === '2026-10-01 0h' && jourLocal(ctx.tcDebutPeriodeDemarches('trois', NOW)) === '2026-08-01 0h', jourLocal(ctx.tcDebutPeriodeDemarches('mois', NOW)) + ' / ' + jourLocal(ctx.tcDebutPeriodeDemarches('trois', NOW)));
verifie('Tout + mois en cours : b, a (les plus recentes d abord) ; l entree archivee n y est pas', ids(ctx.tcDemarchesVisibles(liste(), 'tout', 'mois', false, NOW)) === 'ba', ids(ctx.tcDemarchesVisibles(liste(), 'tout', 'mois', false, NOW)));
verifie('Tout + 3 derniers mois : b, a, c, d (aout → octobre) ; pas le coiffeur de juin', ids(ctx.tcDemarchesVisibles(liste(), 'tout', 'trois', false, NOW)) === 'bacd');
verifie('Rendez-vous + 3 derniers mois : a, c', ids(ctx.tcDemarchesVisibles(liste(), 'rdv', 'trois', false, NOW)) === 'ac');
verifie('Actions sur mon compte + mois en cours : rien ; + 3 mois : d', ids(ctx.tcDemarchesVisibles(liste(), 'compte', 'mois', false, NOW)) === '' && ids(ctx.tcDemarchesVisibles(liste(), 'compte', 'trois', false, NOW)) === 'd');
verifie('Archives : les archivees seules, sans periode (f de decembre 2025)', ids(ctx.tcDemarchesVisibles(liste(), 'tout', 'mois', true, NOW)) === 'f');
verifie('une entree sans categorie compte comme Rendez-vous (comme avant)', ids(ctx.tcDemarchesVisibles(liste(), 'rdv', 'mois', true, NOW)) === 'f');

titre('2. Archiver : les entrees affichees passent dans les Archives, rien n est supprime ; Desarchiver les ramene');
vm.runInContext("_demarchesFiltre = 'rdv'; _demarchesPeriode = 'mois';", ctx);
ctx.tcArchiverDemarches();
verifie('Rendez-vous du mois en cours (Dentiste) archive ; les autres intactes ; rien de supprime', ctx.demarches.length === 6 && ctx.demarches.find((d) => d.id === 'a').archive === true && !ctx.demarches.find((d) => d.id === 'b').archive && !ctx.demarches.find((d) => d.id === 'c').archive && ctx._sauve === 1 && /1 entrée archivée/.test(toasts.join(' ')), toasts.join(' | '));
verifie('le journal ne la montre plus ; les Archives la montrent avec f', ids(ctx.tcDemarchesVisibles(ctx.demarches, 'tout', 'mois', false, NOW)) === 'b' && ids(ctx.tcDemarchesVisibles(ctx.demarches, 'tout', 'mois', true, NOW)) === 'af');
ctx.tcDesarchiverDemarche('a');
verifie('Desarchiver : Dentiste revient dans le journal', !ctx.demarches.find((d) => d.id === 'a').archive && ids(ctx.tcDemarchesVisibles(ctx.demarches, 'tout', 'mois', false, NOW)) === 'ba' && ctx._sauve === 2);
toasts.length = 0;
vm.runInContext("_demarchesFiltre = 'compte'; _demarchesPeriode = 'mois';", ctx);
ctx.tcArchiverDemarches();
verifie('rien a archiver : rien ne change, un mot le dit', ctx._sauve === 2 && /Rien à archiver/.test(toasts.join(' ')));
ctx.tcBasculerArchivesDemarches();
verifie('le bouton « Archives » bascule la vue et redessine', vm.runInContext('_demarchesArchives', ctx) === true && ctx._rendu >= 3);
ctx.setDemarchesPeriode('trois');
verifie('setDemarchesPeriode accepte mois / trois seulement', vm.runInContext('_demarchesPeriode', ctx) === 'trois' && (ctx.setDemarchesPeriode('autre'), vm.runInContext('_demarchesPeriode', ctx) === 'mois'));

titre('3. Le rendu : 2e ligne de pilules, meme style ; Archives a droite ; Desarchiver dans les Archives');
const r = fonction(page, 'renderDemarches') || '';
verifie('la 2e ligne porte les deux periodes (meme pilules : padding 8px 14px, rayon 20px, 12.5px, 600) et « 📦 Archiver »', /TC_DEMARCHES_PERIODES\.map\(p => `[\s\S]*?setDemarchesPeriode\('\$\{p\.id\}'\)[^>]*padding:8px 14px; border-radius:20px; font-size:12\.5px; font-weight:600;/.test(r) && /tcArchiverDemarches\(\)[^>]*>📦 Archiver<\/button>/.test(r));
verifie('« Archives » n apparait que s il y a des archivees, a droite (margin-left:auto), et devient « Journal » dans les Archives', /demarches\.some\(d => d\.archive === true\) \? `<button onclick="tcBasculerArchivesDemarches\(\)"[^>]*margin-left:auto;/.test(r) && /\$\{_demarchesArchives \? '↩️ Journal' : '🗂️ Archives'\}/.test(r));
verifie('la liste vient de tcDemarchesVisibles (periode + categorie, ou Archives)', /const sorted = tcDemarchesVisibles\(demarches, _demarchesFiltre, _demarchesPeriode, _demarchesArchives\);/.test(r));
verifie('chaque entree archivee a son bouton « ↩️ Désarchiver »', /\$\{d\.archive === true \? `<button onclick="tcDesarchiverDemarche\('\$\{d\.id\}'\)"[^>]*>↩️ Désarchiver<\/button>` : ''\}/.test(r));
verifie('la premiere ligne de filtres est inchangee (Tout / Rendez-vous / Recherches Charly IA / Actions sur mon compte)', /TC_DEMARCHES_CATEGORIES = \[\s*\{ id: 'tout', label: 'Tout' \},\s*\{ id: 'rdv', label: 'Rendez-vous' \},\s*\{ id: 'charly', label: 'Recherches Charly IA' \},\s*\{ id: 'compte', label: 'Actions sur mon compte' \}\s*\]/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
