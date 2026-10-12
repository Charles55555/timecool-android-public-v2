// Mission 29 (Charles, 12/10) : Journal d activite, 2e ligne de pilules : « Ce mois » (defaut) / « 3 derniers mois »
// (periode combinee avec la categorie) / « Archiver » (confirmation, puis les entrees affichees passent dans les Archives,
// rien n est supprime) ; bouton « Archives (N) » a droite : les archivees ET les anciennes (plus de 3 mois, ou sans date),
// rien n est jamais hors d atteinte. Usage : node verif-journal-periode.js <index.html>
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
  { id: 'e', title: 'Coiffeur', categorie: 'rdv', timestamp: t(2026, 6, 15) },            // 4 mois : ancienne
  { id: 'f', title: 'Vieux rdv', timestamp: t(2025, 12, 1), archive: true },              // archivee
  { id: 'g', title: 'Très vieille entrée sans date', categorie: 'rdv' }                   // sans timestamp : ancienne
];
const toasts = [];
const ctx = { console, Array, Date, Math, String, JSON, demarches: liste(), saveDemarches() { ctx._sauve = (ctx._sauve || 0) + 1; }, showToast: (x) => toasts.push(x), renderDemarches() { ctx._rendu = (ctx._rendu || 0) + 1; }, currentPage: 'demarches',
  _confirmations: [], _reponse: true, tcConfirm: async (m, o) => { ctx._confirmations.push(m + ' | ' + JSON.stringify(o || {})); return ctx._reponse; } };
vm.createContext(ctx);
vm.runInContext("let _demarchesFiltre = 'tout'; let _demarchesPeriode = 'mois'; let _demarchesArchives = false;", ctx);
const mP = page.match(/const TC_DEMARCHES_PERIODES = \[[\s\S]*?\];/); if (mP) vm.runInContext(mP[0], ctx); else { ko++; console.log('  KO  TC_DEMARCHES_PERIODES introuvable'); }
['tcDebutPeriodeDemarches', 'tcDemarcheAncienne', 'tcDemarchesVisibles', 'tcArchiverDemarches', 'tcBasculerArchivesDemarches', 'tcDesarchiverDemarche', 'setDemarchesPeriode'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const ids = (l) => l.map((d) => d.id).join('');
const V = (f, p, a, l) => ids(ctx.tcDemarchesVisibles(l || liste(), f, p, a, NOW));

(async () => {
titre('1. La periode, combinee avec la categorie ; Archives = archivees + anciennes');
const jourLocal = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + d.getHours() + 'h'; };   // heure locale, jamais UTC (toISOString decale d un jour en Europe)
verifie('« Ce mois » commence le 1er octobre a minuit ; « 3 derniers mois » le 1er aout', jourLocal(ctx.tcDebutPeriodeDemarches('mois', NOW)) === '2026-10-01 0h' && jourLocal(ctx.tcDebutPeriodeDemarches('trois', NOW)) === '2026-08-01 0h', jourLocal(ctx.tcDebutPeriodeDemarches('mois', NOW)) + ' / ' + jourLocal(ctx.tcDebutPeriodeDemarches('trois', NOW)));
const libelles = vm.runInContext('TC_DEMARCHES_PERIODES.map(function (p) { return p.label; }).join(" / ")', ctx);
verifie('libelles courts : « Ce mois », « 3 derniers mois »', libelles === 'Ce mois / 3 derniers mois', libelles);
verifie('Tout + ce mois : b, a (les plus recentes d abord) ; ni archivee ni ancienne', V('tout', 'mois', false) === 'ba', V('tout', 'mois', false));
verifie('Tout + 3 derniers mois : b, a, c, d (aout → octobre) ; pas le coiffeur de juin ni l entree sans date', V('tout', 'trois', false) === 'bacd', V('tout', 'trois', false));
verifie('Rendez-vous + 3 derniers mois : a, c', V('rdv', 'trois', false) === 'ac');
verifie('Actions sur mon compte + ce mois : rien ; + 3 mois : d', V('compte', 'mois', false) === '' && V('compte', 'trois', false) === 'd');
verifie('Archives (Tout) : l ancienne de juin (e), l archivee (f), l entree sans date (g) : rien n est hors d atteinte', V('tout', 'mois', true) === 'efg', V('tout', 'mois', true));
verifie('Archives (Rendez-vous) : e, f (sans categorie = Rendez-vous, comme avant), g', V('rdv', 'mois', true) === 'efg');
verifie('tcDemarcheAncienne : e (4 mois) oui, g (sans date) oui, d (aout) non, f (archivee) non', ctx.tcDemarcheAncienne(liste()[4], NOW) === true && ctx.tcDemarcheAncienne(liste()[6], NOW) === true && ctx.tcDemarcheAncienne(liste()[3], NOW) === false && ctx.tcDemarcheAncienne(liste()[5], NOW) === false);
verifie('journal et Archives se completent : chaque entree est visible dans exactement l un des deux (3 derniers mois)', liste().every((d) => (V('tout', 'trois', false).includes(d.id) ? 1 : 0) + (V('tout', 'trois', true).includes(d.id) ? 1 : 0) === 1));

titre('2. Archiver : confirmation, puis les entrees affichees passent dans les Archives ; Desarchiver les ramene');
vm.runInContext("_demarchesFiltre = 'rdv'; _demarchesPeriode = 'mois';", ctx);
ctx._reponse = false;
await ctx.tcArchiverDemarches();
verifie('on demande avant : « Archiver cette entrée ? … Elle reste consultable dans Archives. » (Oui / Non) ; « Non » → rien ne change', ctx._confirmations.length === 1 && /^Archiver cette entrée \?\nElle reste consultable dans Archives\. \| .*"libelleValider":"Oui".*"libelleAnnuler":"Non"/.test(ctx._confirmations[0]) && !ctx.demarches.find((d) => d.id === 'a').archive && !ctx._sauve, ctx._confirmations[0]);
ctx._reponse = true;
await ctx.tcArchiverDemarches();
verifie('« Oui » : Rendez-vous de ce mois (Dentiste) archive ; les autres intactes ; rien de supprime', ctx.demarches.length === 7 && ctx.demarches.find((d) => d.id === 'a').archive === true && !ctx.demarches.find((d) => d.id === 'b').archive && !ctx.demarches.find((d) => d.id === 'c').archive && ctx._sauve === 1 && /1 entrée archivée/.test(toasts.join(' ')), toasts.join(' | '));
verifie('le journal ne la montre plus ; les Archives la montrent avec e, f, g', V('tout', 'mois', false, ctx.demarches) === 'b' && V('tout', 'mois', true, ctx.demarches) === 'aefg');
vm.runInContext("_demarchesFiltre = 'tout'; _demarchesPeriode = 'trois';", ctx);
await ctx.tcArchiverDemarches();
verifie('plusieurs : « Archiver ces 3 entrées ? … Elles restent consultables dans Archives. »', /^Archiver ces 3 entrées \?\nElles restent consultables dans Archives\./.test(ctx._confirmations[2] || ''), ctx._confirmations[2]);
ctx.demarches = liste(); ctx.demarches.find((d) => d.id === 'a').archive = true; ctx._sauve = 1;
ctx.tcDesarchiverDemarche('a');
verifie('Desarchiver : Dentiste revient dans le journal', !ctx.demarches.find((d) => d.id === 'a').archive && V('tout', 'mois', false, ctx.demarches) === 'ba' && ctx._sauve === 2);
toasts.length = 0;
vm.runInContext("_demarchesFiltre = 'compte'; _demarchesPeriode = 'mois';", ctx);
const nConf = ctx._confirmations.length;
await ctx.tcArchiverDemarches();
verifie('rien a archiver : rien ne change, un mot le dit, aucune question', ctx._sauve === 2 && /Rien à archiver/.test(toasts.join(' ')) && ctx._confirmations.length === nConf);
ctx.tcBasculerArchivesDemarches();
verifie('le bouton « Archives » bascule la vue et redessine', vm.runInContext('_demarchesArchives', ctx) === true && ctx._rendu >= 3);
ctx.tcDesarchiverDemarche('f');
verifie('desarchiver f (decembre 2025) : elle reste atteignable dans Archives comme ancienne, avec e et g → on reste dans Archives', vm.runInContext('_demarchesArchives', ctx) === true && !ctx.demarches.find((d) => d.id === 'f').archive && V('tout', 'mois', true, ctx.demarches) === 'efg', V('tout', 'mois', true, ctx.demarches));
ctx.demarches = [{ id: 'a', title: 'Dentiste', categorie: 'rdv', timestamp: t(2026, 10, 3) }, { id: 'h', title: 'Récent archivé', categorie: 'rdv', timestamp: t(2026, 10, 5), archive: true }];
ctx.tcDesarchiverDemarche('h');
verifie('desarchiver la DERNIERE entree d Archives ramene au journal (sinon un ecran vide, sans bouton de retour)', vm.runInContext('_demarchesArchives', ctx) === false && V('tout', 'mois', true, ctx.demarches) === '');
ctx.setDemarchesPeriode('trois');
verifie('setDemarchesPeriode accepte mois / trois seulement', vm.runInContext('_demarchesPeriode', ctx) === 'trois' && (ctx.setDemarchesPeriode('autre'), vm.runInContext('_demarchesPeriode', ctx) === 'mois'));

titre('3. Le rendu : 2e ligne sans defilement ; « Archives (N) » a droite ; Desarchiver / « plus de 3 mois » dans les Archives');
const r = fonction(page, 'renderDemarches') || '';
const ligne = r.slice(r.indexOf('${TC_DEMARCHES_PERIODES.map('), r.indexOf('${TC_DEMARCHES_PERIODES.map(') + 1600);
verifie('la 2e ligne porte les deux periodes (meme pilules : padding 8px 14px, rayon 20px, 12.5px, 600) et « Archiver »', /TC_DEMARCHES_PERIODES\.map\(p => `[\s\S]*?setDemarchesPeriode\('\$\{p\.id\}'\)[^>]*padding:8px 14px; border-radius:20px; font-size:12\.5px; font-weight:600;/.test(r) && /tcArchiverDemarches\(\)[^>]*>Archiver<\/button>/.test(r));
verifie('la ligne ne defile pas : flex-wrap:wrap (deux lignes au besoin), aucun overflow-x', /flex-wrap:wrap; padding-bottom:12px; margin-bottom:4px;">\s+\$\{TC_DEMARCHES_PERIODES\.map\(/.test(r) && !/overflow-x:auto;[^>]*>\s+\$\{TC_DEMARCHES_PERIODES/.test(r));
verifie('« Archives (N) » des qu Archives a quelque chose (archivees ou anciennes), a droite, et « Journal » dans les Archives', /\$\{tcDemarchesVisibles\(demarches, 'tout', _demarchesPeriode, true\)\.length \? `<button onclick="tcBasculerArchivesDemarches\(\)"[^>]*margin-left:auto;/.test(ligne) && /\$\{_demarchesArchives \? '↩️ Journal' : 'Archives \(' \+ tcDemarchesVisibles\(demarches, 'tout', _demarchesPeriode, true\)\.length \+ '\)'\}/.test(ligne));
verifie('la liste vient de tcDemarchesVisibles (periode + categorie, ou Archives)', /const sorted = tcDemarchesVisibles\(demarches, _demarchesFiltre, _demarchesPeriode, _demarchesArchives\);/.test(r));
verifie('archivee : bouton « ↩️ Désarchiver » ; ancienne (dans Archives) : mention « plus de 3 mois »', /\$\{d\.archive === true \? `<button onclick="tcDesarchiverDemarche\('\$\{d\.id\}'\)"[^>]*>↩️ Désarchiver<\/button>` : \(_demarchesArchives \? `<span[^>]*>plus de 3 mois<\/span>` : ''\)\}/.test(r));
verifie('texte de liste vide dans Archives : « archivée ni ancienne »', /Aucune entrée archivée ni ancienne dans cette catégorie\./.test(r));
verifie('tcArchiverDemarches passe par tcConfirm (jamais confirm())', /await tcConfirm\(/.test(fonction(page, 'tcArchiverDemarches') || '') && !/[^a-zA-Z]confirm\(/.test(fonction(page, 'tcArchiverDemarches') || ''));
verifie('la premiere ligne de filtres est inchangee (Tout / Rendez-vous / Recherches Charly IA / Actions sur mon compte)', /TC_DEMARCHES_CATEGORIES = \[\s*\{ id: 'tout', label: 'Tout' \},\s*\{ id: 'rdv', label: 'Rendez-vous' \},\s*\{ id: 'charly', label: 'Recherches Charly IA' \},\s*\{ id: 'compte', label: 'Actions sur mon compte' \}\s*\]/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.stack); process.exit(1); });
