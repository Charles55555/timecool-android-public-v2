// « Créer un nouveau rdv » : Charly pose une seule question qui demande tout.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
function extraire(nom) {
  const d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}
const q = (page.match(/const TC_QUESTION_NOUVEAU_RDV = '([^']*)'/) || [])[1] || '';
verifie('la question demande le jour, l heure et avec qui / pour quoi', /jour/.test(q) && /heure/.test(q) && /avec qui/.test(q), q);
verifie('une seule question', (q.match(/\?/g) || []).length === 1, q);

const ctx = { charlyIA: { history: [] }, rendu: 0, renderCharlyChat() { ctx.rendu++; } };
vm.createContext(ctx);
vm.runInContext('const TC_QUESTION_NOUVEAU_RDV = ' + JSON.stringify(q) + ';' + extraire('tcDemarrerNouveauRdv'), ctx);
ctx.tcDemarrerNouveauRdv();
verifie('Charly parle le premier, rien n est envoye en son nom', ctx.charlyIA.history.length === 1 && ctx.charlyIA.history[0].role === 'assistant' && ctx.charlyIA.history[0].content === q);
verifie('l ecran est rafraichi', ctx.rendu === 1);

const act = extraire('charlyQuickAction') || '';
verifie('l onglet rdv appelle cette fonction', /action === 'rdv'\) \{ tcDemarrerNouveauRdv\(\); return; \}/.test(act));
verifie('l ancienne phrase « Pose-moi les questions » pour rdv a disparu', !/rdv: "J'aimerais prendre un rendez-vous/.test(page));

const c2 = { charlyIA: { history: [{ role: 'assistant', content: q }, { role: 'user', content: 'demain 14h30 dentiste' }] } };
vm.createContext(c2);
vm.runInContext(extraire('tcHistoriquePourIA'), c2);
const h = vm.runInContext('tcHistoriquePourIA()', c2);
verifie('la conversation envoyee au modele commence par l utilisateur', h.length === 3 && h[0].role === 'user' && h[1].role === 'assistant' && h[2].role === 'user');
c2.charlyIA.history = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }];
verifie('inchangee quand elle commence deja par l utilisateur', vm.runInContext('tcHistoriquePourIA()', c2).length === 2);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
