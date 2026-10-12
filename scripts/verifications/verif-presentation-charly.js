// Mission 15 (Charles, 12/10) : « Tu es qui ? », « c est quoi Charly ? », « que sais-tu faire ? » rendent le texte exact de
// presentation, une seule reponse fixe de la page (liste _faq), jamais reecrite par le modele.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 240) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
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
const ATTENDU = 'Je suis Charly, ton assistant personnel créé par TimeCool pour t’aider à optimiser ton temps, parce que ton temps est la seule ressource que tu ne pourras jamais fabriquer.\n'
  + 'Dis-moi, et je fais :\n'
  + '• créer tes rendez-vous, à 2 comme à 10 personnes ;\n'
  + '• prévenir d’un retard, annuler ou décaler un rendez-vous en m’excusant pour toi ;\n'
  + '• te dire ce que tu as, quand tu es libre, et le temps de trajet pour y aller ;\n'
  + '• changer la langue et tes réglages (bientôt).\n'
  + 'Parle-moi, j’exécute en un temps record. Et bien plus encore…';

titre('1. Le texte, une seule constante, les deux entrees');
const constante = page.match(/const TC_CHARLY_PRESENTATION = '[\s\S]*?encore…';/);
verifie('la constante TC_CHARLY_PRESENTATION existe', !!constante);
const faq = page.match(/const _faq = \[[\s\S]*?\n  \];/);
verifie('la liste _faq existe', !!faq);
if (!constante || !faq) { console.log('\n' + (ko || 1) + ' anomalie(s).'); process.exit(1); }
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(constante[0] + '\n' + fonction(page, 'tcContientMot') + '\nglobalThis.presentation = TC_CHARLY_PRESENTATION;\n' + faq[0].replace('const _faq', 'globalThis._faq'), ctx);
verifie('le texte est exactement celui de Charles (apostrophes typographiques, 7 lignes)', ctx.presentation === ATTENDU, ctx.presentation);
verifie('aucune apostrophe droite dans le texte', ctx.presentation.indexOf("'") < 0);
const entrees = ctx._faq.filter((f) => f.reply === ctx.presentation);
verifie('les deux entrees (« que sais-tu faire » et « qui es-tu ») rendent ce texte', entrees.length === 2);
verifie('l ancien texte a disparu', !/assistant intelligent créé par TIMECOOL/.test(faq[0]) && !/ton assistant agenda 😊/.test(faq[0]));

titre('2. La reconnaissance, rejouee comme charlySendMessage');
const repond = (texte) => { const t = texte.toLowerCase(); const f = ctx._faq.find((x) => x.keys.some((k) => ctx.tcContientMot(t, k))); return f ? f.reply : null; };
['Tu es qui ?', 'c’est quoi Charly ?', "c'est quoi charly", 'que sais-tu faire ?', 'Qui es-tu ?', 'tu sais faire quoi', 'qui est Charly', 'Charly c’est qui ?', 'c est quoi charly'].forEach((q) => {
  verifie('« ' + q + ' » → la presentation', repond(q) === ctx.presentation, String(repond(q)).slice(0, 60));
});
verifie('« rdv dentiste mardi 15h » ne la declenche pas', repond('rdv dentiste mardi 15h') === null);
verifie('« c’est quoi TimeCool » : meme reponse (TimeCool et Charly se presentent ensemble)', repond('c’est quoi timecool') === ctx.presentation);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
