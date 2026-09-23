// Le lieu se voit-il, et le rappel a-t-il cesse d'etre un rendez-vous ?
//
// Les deux defauts etaient silencieux. L'adresse etait bien enregistree
// mais jamais montree : on validait sans pouvoir la relire. Et le
// « rappel » cree par Charly etait un second rendez-vous de quinze
// minutes qui ne sonnait pas.
const fs = require('fs');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

titre('Le lieu sur la carte de proposition');
verifie('il est affiche', page.indexOf('p.lieu ?') > -1);
verifie('et echappe', page.indexOf('escapeHTMLSafe(p.lieu)') > -1,
  'le texte vient de la reponse de Charly, pas de nous');
verifie('rien ne s affiche quand il n y a pas de lieu',
  page.indexOf("p.lieu ? `<div") > -1 && page.indexOf(": ''") > -1,
  'une ligne vide sous chaque creneau alourdirait la carte');

titre('Charly ne propose plus un rappel deja pose');
// La phrase subsiste a l'interieur de l'interdiction : c'est la
// consigne « Puis propose » qui devait disparaitre, pas le texte cite.
verifie('elle n est plus donnee comme consigne',
  page.indexOf('Puis propose : "Tu veux que je te rappelle') === -1);
verifie('il annonce le rappel au lieu de le proposer',
  page.indexOf('Je te préviendrai avant') > -1
  && page.indexOf('Je te préviendrai 1 heure avant') === -1,
  'il annonce, mais sans chiffrer un delai qu il ne voit pas');
verifie('et on le lui interdit explicitement',
  page.indexOf('INTERDIT de demander "Tu veux que je te rappelle ce RDV ?"') > -1,
  'une consigne negative tient mieux qu une reformulation seule');

titre('Plus de creneau « Rappel » a cote d un rendez-vous');
verifie('l interdiction est posee',
  page.indexOf('n\'ajoute JAMAIS de créneau "Rappel ..."') > -1);
verifie('la raison est donnee a Charly',
  page.indexOf('porte déjà son propre rappel') > -1,
  'une regle sans raison se contourne');

titre('Les rappels autonomes restent possibles');
verifie('la regle distingue les deux cas',
  page.indexOf('un rappel AUTONOME') > -1);
verifie('l exemple des medicaments est conserve',
  page.indexOf('rappelle-moi de prendre mes') > -1,
  'la il n y a aucun rendez-vous derriere, le creneau a un sens');

titre('Les appareils jetteront leur copie du prompt');
verifie('la version a change',
  page.indexOf("TC_PROMPT_VERSION = 'v10-rappels'") > -1,
  'sans quoi ils garderaient l ancienne consigne des mois');

titre('Le rappel reel existe bien');
// Le delai est devenu reglable : ce n'est plus une liste figee
// qu'il faut chercher, mais le delai choisi par l'utilisateur.
verifie('les notifications sont programmees par rendez-vous',
  page.indexOf('const reminderTimes = [choisi];') > -1
  && page.indexOf('function tcRappelDuRdv(') > -1,
  'c est ce qui rend le faux creneau inutile');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
