// Mission 26 (Charles, 12/10) : sous la ligne du mois, « Semaine 42 » et « 🌍 GMT+02 · Europe/Paris » sur UNE ligne
// centree ; sur 320 px le fuseau se raccourcit en « GMT+02 » ; la ligne « 📍 agenda secondaire » reste au-dessus.
// Usage : node verif-ligne-semaine.js <index.html>
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
const ctx = { console, String, Array };
vm.createContext(ctx);
const f = fonction(page, 'tcLigneSemaineEtFuseau');
if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  tcLigneSemaineEtFuseau introuvable'); }
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. La ligne composee');
verifie('390 px : « Semaine 42 · 🌍 GMT+02 · Europe/Paris »', ctx.tcLigneSemaineEtFuseau('Semaine 42', '🌍 GMT+02 · Europe/Paris', 390) === 'Semaine 42 · 🌍 GMT+02 · Europe/Paris', ctx.tcLigneSemaineEtFuseau('Semaine 42', '🌍 GMT+02 · Europe/Paris', 390));
verifie('320 px : le nom du fuseau tombe, « Semaine 42 · 🌍 GMT+02 »', ctx.tcLigneSemaineEtFuseau('Semaine 42', '🌍 GMT+02 · Europe/Paris', 320) === 'Semaine 42 · 🌍 GMT+02', ctx.tcLigneSemaineEtFuseau('Semaine 42', '🌍 GMT+02 · Europe/Paris', 320));
verifie('sans fuseau connu : « Semaine 42 » seul ; sans largeur : contenu complet', ctx.tcLigneSemaineEtFuseau('Semaine 42', '', 320) === 'Semaine 42' && ctx.tcLigneSemaineEtFuseau('Semaine 42', '🌍 GMT+02 · Europe/Paris', 0) === 'Semaine 42 · 🌍 GMT+02 · Europe/Paris');
verifie('un fuseau a plusieurs segments (America/Argentina/Buenos_Aires) se raccourcit aussi', ctx.tcLigneSemaineEtFuseau('Semaine 3', '🌍 GMT-03 · America/Argentina/Buenos_Aires', 320) === 'Semaine 3 · 🌍 GMT-03');

titre('2. L affichage : en vue Semaine une seule ligne, le badge du fuseau se tait ; ailleurs l inverse');
const bloc = page.slice(page.indexOf("const wnBadge = document.getElementById('weekNumberBadge');"), page.indexOf("const wnBadge = document.getElementById('weekNumberBadge');") + 1200);
verifie('en vue Semaine : wnBadge = tcLigneSemaineEtFuseau(semaine, texte du fuseau, largeur) et timezoneBadge cache', /wnBadge\.textContent = tcLigneSemaineEtFuseau\(semaine, tzBadge \? tzBadge\.textContent : '', [^)]*innerWidth[^)]*\);/.test(bloc) && /if \(tzBadge\) tzBadge\.style\.display = 'none';/.test(bloc));
verifie('hors vue Semaine : wnBadge cache, timezoneBadge visible (comme avant)', /wnBadge\.style\.display = 'none';\s+if \(tzBadge\) tzBadge\.style\.display = '';/.test(bloc));
verifie('meme police et meme gris : les deux badges gardent color:var(--text-sec), centres ; la ligne 📍 reste au-dessus', /id="agendaSecondaireTitre"[^>]*>[\s\S]{0,400}id="weekNumberBadge" style="[^"]*text-align:center;[^"]*color:var\(--text-sec\)/.test(page) && /id="timezoneBadge" style="[^"]*text-align:center;[^"]*color:var\(--text-sec\)/.test(page));
verifie('updateTimezoneBadge ecrit toujours « 🌍 GMT+02 · Europe/Paris » dans timezoneBadge (source de la ligne)', /badge\.textContent = '🌍 ' \+ info\.label \+ \(info\.tz \? ' · ' \+ info\.tz : ''\);/.test(fonction(page, 'updateTimezoneBadge') || ''));
verifie('le fuseau est calcule AVANT la ligne de semaine (sinon la premiere ligne serait sans fuseau)', page.indexOf('  updateTimezoneBadge();') > 0 && page.indexOf('  updateTimezoneBadge();') < page.indexOf("const wnBadge = document.getElementById('weekNumberBadge');") && page.split('  updateTimezoneBadge();').length === 2);
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
