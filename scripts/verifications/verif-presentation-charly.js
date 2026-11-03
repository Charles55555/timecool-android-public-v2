// Mission 15 (Charles, 12/10), refaite par la mission 74 (textes validés par Charles le 03/11) : deux réponses fixes de la page
// (liste _faq), jamais réécrites par le modèle. Son nom, qui il est → la présentation courte ; ce qu'il sait faire, comment il
// aide, comment il optimise le temps → la liste de ce qu'il fait. Rien n'y promet ce que l'application ne fait pas (pas de
// lecture de photo : seuls un PDF avec du texte ou un fichier texte sont lus). Le classement laisse passer ces questions.
// Usage : node verif-presentation-charly.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d && !c ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 240) : '')); }
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
const NOM = 'Je m’appelle Charly, ton assistant TimeCool 😊 Je suis là pour optimiser ton temps.';
const AIDE = 'Pour la saisie d’un nouveau rendez-vous ou pour la gestion de ton agenda, je suis très rapide :\n'
  + '• Une phrase suffit : « j’ai rdv chez mon dentiste ce jeudi 16h », et le rendez-vous est créé dans ton agenda.\n'
  + '• Si tu précises l’adresse de ton rendez-vous, je te donne le temps de trajet à prévoir, et je peux même te guider pour y aller.\n'
  + '• En fonction de tes préférences enregistrées dans la page « Mes disponibilités », je sais quand tu es libre et je te propose un créneau.\n'
  + '• Un retard, un imprévu, une maladie : je préviens les personnes concernées et je décale pendant que tu travailles.\n'
  + '• À plusieurs, je trouve l’heure qui convient à tout le monde.\n'
  + '• Un PDF ou un fichier texte avec une date de rendez-vous : je le lis et j’en fais un nouveau rendez-vous dans ton agenda.\n'
  + 'Dis-moi ce que tu veux faire, ou touche un bouton en haut : je te montre.';

titre('1. Les deux textes, les deux entrées');
const constantes = page.match(/const TC_CHARLY_PRESENTATION = '[\s\S]*?je te montre\.';/);
const faq = page.match(/const _faq = \[[\s\S]*?\n  \];/);
verifie('les constantes et la liste _faq existent', !!constantes && !!faq);
if (!constantes || !faq) { console.log('\n' + (ko || 1) + ' anomalie(s).'); process.exit(1); }
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(constantes[0] + '\n' + fonction(page, 'tcContientMot') + '\nglobalThis.nom = TC_CHARLY_PRESENTATION; globalThis.aide = TC_CHARLY_CE_QUE_JE_FAIS;\n' + faq[0].replace('const _faq', 'globalThis._faq'), ctx);
verifie('son nom : le texte exact de Charles', ctx.nom === NOM, ctx.nom);
verifie('ce qu il sait faire : le texte exact de Charles (puce du fichier PDF ou texte, décision du chef)', ctx.aide === AIDE, ctx.aide);
verifie('aucune apostrophe droite, pas de tiret long', (ctx.nom + ctx.aide).indexOf("'") < 0 && (ctx.nom + ctx.aide).indexOf('—') < 0);
verifie('rien ne promet la lecture d une photo', !/photo/i.test(ctx.nom + ctx.aide));
verifie('chaque texte a une seule entrée', ctx._faq.filter((f) => f.reply === ctx.nom).length === 1 && ctx._faq.filter((f) => f.reply === ctx.aide).length === 1);
verifie('l ancien texte a disparu', page.indexOf('parce que ton temps est la seule ressource que tu ne pourras jamais fabriquer') < 0 && page.indexOf('ton assistant agenda 😊') < 0);

titre('2. La reconnaissance, rejouée comme charlySendMessage');
const repond = (texte) => { const t = texte.toLowerCase(); const f = ctx._faq.find((x) => x.keys.some((k) => ctx.tcContientMot(t, k))); return f ? f.reply : null; };
['Tu es qui ?', 'Qui es-tu ?', 'qui est Charly', 'Charly c’est qui ?', 'c’est quoi Charly ?', "c'est quoi charly", 'Comment tu t’appelles ?', "comment tu t'appelles", 'Tu t’appelles comment ?', 'C’est quoi ton nom ?', 'Comment t’appelles-tu ?'].forEach((q) => {
  verifie('« ' + q + ' » → son nom', repond(q) === ctx.nom, String(repond(q)).slice(0, 60));
});
['Comment tu peux optimiser mon temps ?', 'Comment peux-tu optimiser mon temps ?', 'Comment tu peux m’aider ?', "Comment tu peux m'aider ?", 'Comment peux-tu m’aider ?', 'Qu’est-ce que tu sais faire ?', "qu'est-ce que tu sais faire", 'que sais-tu faire ?', 'tu sais faire quoi', 'tu sers à quoi ?', 'c’est quoi TimeCool ?'].forEach((q) => {
  verifie('« ' + q + ' » → ce qu il sait faire', repond(q) === ctx.aide, String(repond(q)).slice(0, 60));
});
verifie('« rdv dentiste mardi 15h » ne déclenche rien', repond('rdv dentiste mardi 15h') === null);

titre('3. Le classement les laisse passer (un sujet sur Charly), sans toucher au reste');
const sujets = (page.match(/const TC_CLASSE_SUJETS = \[[\s\S]*?\];/) || [''])[0];
['ton nom', 'tu t appelles', 'qu est ce que tu sais faire', 'optimiser mon temps', 'comment tu peux m aider', 'comment peux tu m aider'].forEach((k) => {
  verifie('« ' + k + ' » est un sujet', sujets.indexOf("'" + k + "'") > -1);
});
verifie('« tu sais faire » seul n est pas un sujet (« tu sais faire une réservation ? » ne change pas de classement)', sujets.indexOf("'tu sais faire'") < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
