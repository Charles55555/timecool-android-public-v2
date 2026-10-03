// La conversation avec Charly survit a une mise a jour.
//
// Elle n'etait enregistree nulle part, et la connexion la vidait expres.
// Charles, 04/10 : « Ne plus vider jamais les echanges avec charly et
// garder les 10 derniers messages ».
//
// On execute les vraies fonctions sur un faux stockage, et on verifie
// dans la source que plus rien ne vide la conversation sauf le bouton
// « Recommencer ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}
function extraireConst(nom) {
  const debut = page.indexOf('const ' + nom + ' = ');
  if (debut < 0) return null;
  return page.slice(debut, page.indexOf(';\n', debut) + 1);
}

let memoire = {};
const ctx = {
  console, String, Number, Array, Object, JSON,
  charlyIA: { history: [] },
  localStorage: {
    getItem: (k) => (k in memoire ? memoire[k] : null),
    setItem: (k, v) => { memoire[k] = String(v); },
    removeItem: (k) => { delete memoire[k]; }
  }
};
vm.createContext(ctx);
['TC_CHARLY_HISTORIQUE_CLE', 'TC_CHARLY_HISTORIQUE_MAX'].forEach((n) => {
  const src = extraireConst(n);
  // « var » et non « const » : un const execute dans le bac a sable
  // n'apparait pas sur l'objet ctx, et la suite doit lire la cle.
  if (src) vm.runInContext(src.replace('const ', 'var '), ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
['tcSauverHistoriqueCharly', 'tcChargerHistoriqueCharly', 'tcEffacerHistoriqueCharly'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Dix messages, pas un de plus, les derniers');
{
  ctx.charlyIA.history = [];
  for (let i = 1; i <= 25; i++) ctx.charlyIA.history.push({ role: i % 2 ? 'user' : 'assistant', content: 'message ' + i });
  ctx.tcSauverHistoriqueCharly();
  const garde = JSON.parse(memoire[ctx.TC_CHARLY_HISTORIQUE_CLE]);
  verifie('dix messages enregistres', garde.length === 10, 'trouve ' + garde.length);
  verifie('ce sont les dix derniers, dans l ordre', garde[0].content === 'message 16' && garde[9].content === 'message 25');
  verifie('la cle n a pas le prefixe tc_ (ni synchronisee ni purgee)', !/^tc_/.test(ctx.TC_CHARLY_HISTORIQUE_CLE), ctx.TC_CHARLY_HISTORIQUE_CLE);
}

titre('Ce qui revient apres une mise a jour');
{
  ctx.charlyIA = { history: [] };           // la page repart a zero
  ctx.tcChargerHistoriqueCharly();
  verifie('la conversation revient', ctx.charlyIA.history.length === 10);
  verifie('avec son contenu', ctx.charlyIA.history[9].content === 'message 25');
  verifie('une seule fois : un second chargement ne double rien', (ctx.tcChargerHistoriqueCharly(), ctx.charlyIA.history.length === 10));
}

titre('Une conversation en cours n est pas ecrasee par l enregistrement');
{
  ctx.charlyIA = { history: [{ role: 'assistant', content: 'Bonjour !' }] };
  ctx.tcChargerHistoriqueCharly();
  verifie('si des messages existent deja, on les garde', ctx.charlyIA.history.length === 1 && ctx.charlyIA.history[0].content === 'Bonjour !');
}

titre('Ce qui ne se rejoue pas n est pas enregistre');
{
  const prop = { role: 'assistant', content: '[AGENDA]x[/AGENDA]', tempId: 'p1', _validated: true };
  ctx.charlyIA = { history: [prop, { role: 'system_info', content: '⚠️ conflit', conflictData: { conflicts: [], msg: prop } }, { role: 'system', content: 'interne' }] };
  ctx.tcSauverHistoriqueCharly();
  const garde = JSON.parse(memoire[ctx.TC_CHARLY_HISTORIQUE_CLE]);
  verifie('les boutons d un conflit (conflictData) sont laisses de cote', garde.every((m) => !('conflictData' in m)));
  verifie('les messages internes (role system) ne sont pas gardes', garde.every((m) => m.role !== 'system'));
  verifie('la carte validee garde son etat', garde[0]._validated === true && garde[0].tempId === 'p1',
    'sinon le bouton vert redeviendrait actif apres une mise a jour');
}

titre('Seul « Recommencer » efface');
{
  ctx.tcEffacerHistoriqueCharly();
  verifie('Recommencer efface aussi l enregistrement', !(ctx.TC_CHARLY_HISTORIQUE_CLE in memoire));
  const remises = (page.match(/charlyIA\.history = \[\];/g) || []).length;
  verifie('une seule remise a zero dans toute la page', remises === 1, 'trouve ' + remises + ' — la connexion en avait deux de plus');
  const reset = extraire('resetCharlyChat') || '';
  verifie('et c est celle du bouton Recommencer', /charlyIA\.history = \[\];\s*tcEffacerHistoriqueCharly\(\);/.test(reset));
  const auth = extraire('hideAuthFlow') || '';
  verifie('la connexion recharge au lieu de vider', /tcChargerHistoriqueCharly\(\);/.test(auth) && !/charlyIA\.history = \[\]/.test(auth));
  verifie('et n ajoute l accueil que si la conversation est vide', /if \(!charlyIA\.history\.length\) charlyIA\.history\.push\(\{role:'assistant', content: _accueil,/.test(auth));
  const bienvenue = extraire('showWelcomeSplash') || '';
  verifie('l ecran de bienvenue aussi', /tcChargerHistoriqueCharly\(\);/.test(bienvenue) && !/charlyIA\.history = \[\]/.test(bienvenue));
}

titre('Chaque affichage enregistre');
{
  const rendu = extraire('renderCharlyChat') || '';
  verifie('renderCharlyChat charge puis enregistre en premier',
    /^function renderCharlyChat\(\) \{[\s\S]{0,300}?tcChargerHistoriqueCharly\(\);\s*tcSauverHistoriqueCharly\(\);/.test(rendu));
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
