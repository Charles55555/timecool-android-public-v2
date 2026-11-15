// Le titre de la page Messagerie : « Ma messagerie sécurisée ».
// Charles, 04/10. Le texte affiché et sa source de traduction doivent dire la meme chose,
// sinon la traduction remplace le titre par une autre phrase que celle qu'on lit.
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
// Mission 94 : sous le titre, « 🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool. » (à la place de « Confidentielle »).
const m = page.match(/<div class="page-title" data-tc-src="([^"]*)">([^<]*)<\/div>\s*<div[^>]*>🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool\.<\/div>/);
verifie('le titre de la messagerie existe, avec « 🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool. » dessous', !!m);
verifie('il dit « Ma messagerie sécurisée »', !!m && m[2] === 'Ma messagerie sécurisée', m && m[2]);
verifie('sa source de traduction dit la meme chose', !!m && m[1] === m[2], m && (m[1] + ' / ' + m[2]));
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
