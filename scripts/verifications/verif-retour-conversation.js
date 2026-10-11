// La fleche retour de l'ecran conversation ramene a l'ecran appelant (Charles, 11/10,
// video Android) : fiche contact si on vient des contacts, liste des messages sinon.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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

titre('1. La fleche n est plus cablee en dur vers la liste des messages');
const enTete = page.slice(page.indexOf('<div class="page" id="page-conv">'), page.indexOf('<div class="page" id="page-conv">') + 400);
verifie('la fleche appelle tcRetourDepuisConversation()', enTete.indexOf('class="back-btn" onclick="tcRetourDepuisConversation()"') > -1, enTete.slice(0, 200));
verifie('et plus navigate(\'messages\') directement', enTete.indexOf("onclick=\"navigate('messages')\"") === -1);

titre('2. La conversation retient d ou elle a ete ouverte');
const ouvre = fonction(page, 'openConversation');
verifie('openConversation accepte l origine', /function openConversation\(id, origine\)/.test(ouvre));
verifie('origine donnee : retenue', ouvre.indexOf('if (origine) _convOrigine = origine;') > -1);
verifie('sinon la page courante, sauf si c est la conversation qui se redessine', ouvre.indexOf("else if (currentPage !== 'conv') _convOrigine = currentPage;") > -1);
const depuisFiche = fonction(page, 'messageContact');
verifie('depuis la fiche contact : la page appelante est relevee avant d aller aux messages',
  depuisFiche.indexOf('const appelante = currentPage;') > -1 && depuisFiche.indexOf('const appelante') < depuisFiche.indexOf("navigate('messages')"));
verifie('et transmise a la conversation', depuisFiche.indexOf('openConversation(conv.id, appelante);') > -1);

titre('3. La fleche ramene au bon endroit (fonction executee)');
const ctx = { console, _convOrigine: 'messages', alle: null, navigate(p) { ctx.alle = p; }, document: { getElementById(id) { return ['page-contacts', 'page-messages', 'page-calendar', 'page-conv'].indexOf(id) > -1 ? {} : null; } } };
vm.createContext(ctx);
vm.runInContext(fonction(page, 'tcRetourDepuisConversation'), ctx);
ctx._convOrigine = 'contacts'; ctx.tcRetourDepuisConversation();
verifie('venu des contacts : retour a la fiche contact', ctx.alle === 'contacts', ctx.alle);
ctx._convOrigine = 'calendar'; ctx.tcRetourDepuisConversation();
verifie('venu de l agenda : retour a l agenda', ctx.alle === 'calendar', ctx.alle);
ctx._convOrigine = 'messages'; ctx.tcRetourDepuisConversation();
verifie('venu de la liste des messages : retour a la liste', ctx.alle === 'messages', ctx.alle);
ctx._convOrigine = 'conv'; ctx.tcRetourDepuisConversation();
verifie('origine = la conversation elle-meme : on ne tourne pas en rond, liste des messages', ctx.alle === 'messages', ctx.alle);
ctx._convOrigine = 'page-qui-n-existe-pas'; ctx.tcRetourDepuisConversation();
verifie('origine inconnue : liste des messages, jamais un ecran vide', ctx.alle === 'messages', ctx.alle);
ctx._convOrigine = null; ctx.tcRetourDepuisConversation();
verifie('aucune origine : liste des messages', ctx.alle === 'messages', ctx.alle);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
