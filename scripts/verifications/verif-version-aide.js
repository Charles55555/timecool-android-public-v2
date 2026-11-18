// Livraison après la 122 (Charles, 18/11) : en bas de « Aide et commentaires », la vraie version (celle de l'application,
// sinon la date de la page web publiée), jamais « v4.0 » écrit en dur ; le sous-titre « … envoi d’un commentaire ».
// Usage : node verif-version-aide.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + d : '')); };
function extraire(nom) { const d = page.indexOf('function ' + nom + '('); if (d < 0) return null; let n = 0; for (let j = page.indexOf('{', d); j < page.length; j++) { if (page[j] === '{') n++; else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); } } return null; }
verifie('plus de « TimeCool v4.0 » en dur', page.indexOf('TimeCool v4.0') < 0);
verifie('le sous-titre : « Questions fréquentes et envoi d’un commentaire »', page.indexOf('Questions fréquentes et envoi d’un commentaire') > -1 && page.indexOf('envoi de feedback') < 0);
verifie('le cadre vert lit tcVersionAide123', /<b>TimeCool<\/b>\$\{typeof tcVersionAide123 === 'function' && tcVersionAide123\(\)/.test(page));
const jouer = function (natif, deploiement) {
  const ctx = { window: { TimeCoolNatif: natif ? { obtenirInfosVersion: () => JSON.stringify({ version: natif }) } : undefined }, TC_DEPLOIEMENT: deploiement, Date: Date, JSON: JSON, Number: Number, String: String };
  vm.createContext(ctx);
  vm.runInContext(['tcInfosVersion', 'tcVersionPourRapport', 'tcVersionAide123'].map(extraire).join('\n'), ctx);
  return ctx.tcVersionAide123();
};
verifie('dans l’application : « v2.0.447 » (le numéro du build installé)', jouer('2.0.447', '__TC_DEPLOIEMENT__') === 'v2.0.447', jouer('2.0.447', '__TC_DEPLOIEMENT__'));
verifie('sur le web publié : « version web du 18/11/2026 02h15 »', /^version web du 18\/11\/2026 02h15$/.test(jouer(null, '1794964500')), jouer(null, '1794964500'));
verifie('la page non publiée : rien (jamais un faux numéro)', jouer(null, '__TC_DEPLOIEMENT__') === '', jouer(null, '__TC_DEPLOIEMENT__'));
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
