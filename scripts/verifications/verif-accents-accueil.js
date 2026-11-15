// Mission 16 (12/10/2026) : les ecrans d accueil ont leurs accents ; la phrase d appairage dit ou est le menu.
// Usage : node verif-accents-accueil.js <index.html>
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let erreurs = 0;
function attendu(texte) { if (page.indexOf(texte) === -1) { console.error('MANQUE : ' + texte); erreurs++; } }
function interdit(texte) { if (page.indexOf(texte) !== -1) { console.error('ENCORE LA : ' + texte); erreurs++; } }

// Mission 88 (15/11) : les ecrans « Commencer », « Rejoins TimeCool » et « Charly IA est prêt » ont quitte la page ;
// leurs textes ne sont plus attendus, les interdits (sans accents) restent.
attendu('Créer mon compte');
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
