// Mission 16 (12/10/2026) : les ecrans d accueil ont leurs accents ; la phrase d appairage dit ou est le menu.
// Usage : node verif-accents-accueil.js <index.html>
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let erreurs = 0;
function attendu(texte) { if (page.indexOf(texte) === -1) { console.error('MANQUE : ' + texte); erreurs++; } }
function interdit(texte) { if (page.indexOf(texte) !== -1) { console.error('ENCORE LA : ' + texte); erreurs++; } }

attendu('Crée ton compte gratuitement<br>et commence à gagner du temps');
attendu('Créer mon compte');
attendu('J’ai déjà un compte');
attendu('Charly IA est prêt à t’aider à<br>organiser ton temps.');
attendu('pour parler à Charly<br>&#x2022; Ou crée ton premier RDV avec +');
attendu('Découvrir TimeCool');
attendu('Compte créé !');
attendu('Sur ton téléphone : touche tes initiales en haut à droite → <b>Lier un nouvel appareil</b>');

interdit('Cree ton compte');
interdit('Creer mon compte');
interdit("J'ai deja un compte");
interdit('est pret a t');
interdit('parler a Charly');
interdit('cree ton premier RDV');
interdit('Decouvrir TimeCool');
interdit('Sur votre téléphone : <b>menu');

if (erreurs) { console.error('verif-accents-accueil : ' + erreurs + ' erreur(s)'); process.exit(1); }
console.log('verif-accents-accueil : OK');
