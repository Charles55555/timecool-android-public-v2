// Deux zones en moins : l'accuse seul avant la carte, et la suite sur la notification.
const fs = require('fs'); const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
function extraire(nom) { const d = page.indexOf('function ' + nom + '('); if (d < 0) return null; let n = 0; for (let j = page.indexOf('{', d); j < page.length; j++) { if (page[j] === '{') n++; else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); } } return null; }
const ctx = {}; vm.createContext(ctx);
vm.runInContext(extraire('tcAccuseSeul') + extraire('tcSuiteSurNotification'), ctx);
const accuse = (t) => vm.runInContext('tcAccuseSeul(' + JSON.stringify(t) + ')', ctx);
const suite = (t) => vm.runInContext('tcSuiteSurNotification(' + JSON.stringify(t) + ')', ctx);
console.log('-- accuse seul --');
['C\'est noté ! 👍', 'Parfait ! 🎉 J\'ajoute ça tout de suite dans ton agenda !', 'Ok !', 'D\'accord, c\'est fait.', 'Super'].forEach((t) => verifie('masque : ' + t, accuse(t) === true));
console.log('-- vraie information : jamais masquee --');
['Ton créneau chevauche le travail de 11h à 13h : je te propose 9h-11h et 13h-18h.', 'Parfait ! Mais attention, tu as déjà un rendez-vous à 15h.', 'Parfait ! Tu veux que je l\'ajoute ?', 'Rendez-vous chez le dentiste demain.', ''].forEach((t) => verifie('gardé : ' + (t || '(vide)'), accuse(t) === false));
console.log('-- suite sur la notification --');
verifie('« Je te préviendrai avant… » écartée', suite('Je te préviendrai avant, au délai que tu as choisi dans tes réglages.'));
verifie('une autre suite gardée', !suite('Et pour quel motif ou avec qui ?'));
console.log('-- branchement --');
verifie('le filtre sert aussi à l injection (anciens messages)', /followUpMsg\._followUp && tcSuiteSurNotification\(followUpMsg\._followUp\)\) followUpMsg\._followUp = null/.test(page));
verifie('la bulle d accuse seul est masquee quand une carte suit', page.indexOf("tcAccuseSeul(cleanContent)) ? 'display:none; '") > -1);
verifie('jamais masquee tant qu un contact est attendu', /!contactAttendu && tcAccuseSeul\(cleanContent\)/.test(page));
console.log(''); console.log(ko + ' anomalie(s).'); process.exit(ko ? 1 : 0);
