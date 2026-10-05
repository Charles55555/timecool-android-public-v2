// Ce que Charly vient de faire se dit dans sa bulle, comme une réponse ;
// les cadres à boutons restent des cadres. Charles, 05/10 : « pourquoi
// c'est écrit en petit ? mets-le dans une bulle de dialogue ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 160) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}
/* La surcharge « renderChatMessage = function(m) {…} » qui dessine les cadres HTML. */
function extraireSurcharge() {
  const d = page.indexOf('renderChatMessage = function(m) {');
  if (d < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1) + ';'; }
  }
  return null;
}

const ctx = { console, extractAgendaProposals: () => null, tcAttenteContact: () => null, charlyIA: { history: [] } };
vm.createContext(ctx);
['escapeHTML', 'tcBulleCharly', 'tcEstUnCadreAQuestion', 'renderChatMessage'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
vm.runInContext('const _origRenderChatMessage = renderChatMessage;', ctx);
const surcharge = extraireSurcharge();
if (surcharge) vm.runInContext(surcharge, ctx); else { ko++; console.log('  KO  surcharge introuvable'); }
const rendu = (m) => vm.runInContext('renderChatMessage(' + JSON.stringify(m) + ')', ctx);
const bulle = (h) => /⚡/.test(h) && /border-radius:4px 16px 16px 16px/.test(h) && !/font-style:italic/.test(h) && !/#fff4e0/.test(h);
const cadre = (h) => /#fff4e0/.test(h) && !/⚡/.test(h);

titre('Un compte rendu en texte : une bulle de Charly');
let h = rendu({ role: 'system_info', content: '✅ C\'est fait : 3 rendez-vous supprimés. Pour revenir en arrière, dis-moi « remets-les ».' });
verifie('avatar, cadre blanc, plus de petit gris en italique', bulle(h), h);
verifie('le texte est dedans, protégé', /3 rendez-vous supprimés/.test(h) && /« remets-les »/.test(h));
h = rendu({ role: 'system_info', content: '↩️ C\'est fait : 3 rendez-vous remis :\n• Travail — mercredi\n• Dentiste — jeudi' });
verifie('les retours à la ligne deviennent des sauts de ligne', bulle(h) && (h.match(/<br>/g) || []).length === 2);
h = rendu({ role: 'system_info', content: 'Titre <script>alert(1)</script>' });
verifie('le HTML d un texte est neutralisé', /&lt;script&gt;/.test(h) && !/<script>/.test(h));

titre('Un compte rendu en HTML sans question : une bulle aussi');
h = rendu({ role: 'system_info', isHTML: true, content: '✅ <b>C\'est fait, rendez-vous déplacé :</b><br>• « Golf » : vendredi 14h<br><span>Pour revenir en arrière, dis-moi « remets-le ».</span>' });
verifie('rendez-vous déplacé : bulle de Charly, HTML conservé', bulle(h) && /<b>C'est fait, rendez-vous déplacé/.test(h), h);

titre('Une question garde son cadre jaune');
h = rendu({ role: 'system_info', isHTML: true, periode: true, contrainte: true, content: '🗓️ Tu as <b>2 rendez-vous</b> demain :<br>…<b>Que fait-on ?</b>' });
verifie('le questionnaire d une période', cadre(h));
h = rendu({ role: 'system_info', isHTML: true, content: '⚠️ <b>Tu veux annuler ces 3 rendez-vous ?</b><br>…<br>Cette action est définitive. Réponds « oui » ou « non ».' });
verifie('la confirmation oui / non', cadre(h));
h = rendu({ role: 'system_info', isHTML: true, conflictData: { msg: {} }, content: '⚠️ Conflit…' });
verifie('un conflit', cadre(h));
h = rendu({ role: 'system_info', isHTML: true, content: 'Choisis : <button onclick="x()">A</button>' });
verifie('un cadre avec des boutons', cadre(h));

titre('Le reste ne change pas');
h = rendu({ role: 'user', content: 'Bonjour' });
verifie('un message de l utilisateur : bulle bleue à droite', /justify-content:flex-end/.test(h) && /Bonjour/.test(h));
h = rendu({ role: 'user', hidden: true, content: 'x' });
verifie('un message caché reste caché', h === '');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
