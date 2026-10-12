// Mission 27a (12/10) : messagerie, « Contacts bloqués » liste les vrais contacts bloques (fiches blocked = true) avec
// « Débloquer » ; la phrase vraie sur les donnees aux deux endroits ; plus de lignes « Confirmations de lecture » /
// « Appareils connectés ». Usage : node verif-contacts-bloques.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const PHRASE = 'Tes messages et rendez-vous passent par les serveurs TimeCool, chiffrés en transit, et ne sont jamais vendus ni partagés.';

titre('1. Les textes');
verifie('la phrase vraie est definie une fois (TC_PHRASE_CONFIDENTIALITE) et mot pour mot', page.split("const TC_PHRASE_CONFIDENTIALITE = '" + PHRASE + "';").length === 2);
verifie('feuille de la messagerie : la phrase (plus « restent sur ton appareil » ni « bout en bout en développement »)', /msg-sheet-h">🔒 Confidentialité &amp; sécurité<\/div>' \+\s+'<div[^>]*>' \+ TC_PHRASE_CONFIDENTIALITE \+ '<\/div>'/.test(page) && page.indexOf('Tes messages restent sur ton appareil') < 0);   // (la reponse de demonstration de Charly, ligne « Tes données restent… », est hors perimetre : notee au chef)
verifie('Paramètres → Confidentialité & Sécurité : la phrase (plus « Stockage local sur votre appareil »)', /🔒 Tes données<\/div>\s+<div[^>]*>\$\{TC_PHRASE_CONFIDENTIALITE\}<\/div>/.test(page) && page.indexOf('Stockage local sur votre appareil') < 0 && page.indexOf('ne sont ni partagés ni vendus') < 0);
verifie('plus de lignes « Confirmations de lecture » / « Appareils connectés » (rien derriere)', page.indexOf('Confirmations de lecture') < 0 && page.indexOf('Appareils connectés') < 0 && page.indexOf("showToast('Aucun contact bloqué')") < 0);

titre('2. Les contacts bloques : liste, Débloquer');
const toasts = []; const feuilles = []; let sauves = 0, rendus = 0;
const ctx = { console, String, Array, JSON, contactsList: [
    { id: 'c1', name: 'Zoé Martin', blocked: true }, { id: 'c2', name: 'Alain Dupont' }, { id: 'c3', name: 'Bernard Petit', blocked: true }, { id: 'c4', name: 'Chloé', blocked: false }
  ],
  escapeHTMLSafe: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  showToast: (m) => toasts.push(m), saveContacts() { sauves++; }, renderContactsList() { rendus++; }, _closeSheet() {},
  document: { createElement: () => { const el = { className: '', id: '', innerHTML: '', remove() { el._enleve = true; } }; return el; }, body: { appendChild: (el) => feuilles.push(el) }, getElementById: (id) => feuilles.slice().reverse().find((f) => f.id === id && !f._enleve) || null } };
vm.createContext(ctx);
let manque = 0;
['tcContactsBloques', 'openMsgPrivacy', 'openContactsBloques', 'tcDebloquerContact'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manque++; console.log('  KO  ' + n + ' introuvable'); } });
const mC = page.match(/const TC_PHRASE_CONFIDENTIALITE = [^;]*;/); if (mC) vm.runInContext(mC[0], ctx); else { ko++; manque++; console.log('  KO  TC_PHRASE_CONFIDENTIALITE introuvable'); }
if (manque) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
verifie('tcContactsBloques : les fiches blocked === true, par nom (Bernard, Zoé) ; false / absent exclus', ctx.tcContactsBloques().map((c) => c.id).join('') === 'c3c1');
ctx.openMsgPrivacy();
const f1 = feuilles[feuilles.length - 1].innerHTML;
verifie('feuille Confidentialité : la phrase, « Contacts bloqués (2) », aucune autre ligne', f1.indexOf(PHRASE) > 0 && /Contacts bloqués \(2\)/.test(f1) && (f1.match(/msg-sheet-i/g) || []).length === 1 && /openContactsBloques\(\)/.test(f1));
ctx.openContactsBloques();
const f2 = feuilles[feuilles.length - 1];
verifie('liste : Bernard Petit puis Zoé Martin, un bouton « Débloquer » chacun, le mot d explication', /Bernard Petit[\s\S]*Zoé Martin/.test(f2.innerHTML) && (f2.innerHTML.match(/✅ Débloquer/g) || []).length === 2 && /tcDebloquerContact\('c1'\)/.test(f2.innerHTML) && /Cette personne ne peut plus t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas\./.test(f2.innerHTML) && f2.id === 'contactsBloquesOv');   // depuis la 27b le serveur retient aussi ses messages : phrase complete
ctx.tcDebloquerContact('c1');
verifie('Débloquer Zoé : blocked = false, sauve (saveContacts → synchro), page Contacts redessinee, toast, liste redessinee avec Bernard seul', ctx.contactsList[0].blocked === false && sauves === 1 && rendus === 1 && /Zoé Martin débloqué/.test(toasts.join(' ')) && f2._enleve === true && /Bernard Petit/.test(feuilles[feuilles.length - 1].innerHTML) && !/Zoé/.test(feuilles[feuilles.length - 1].innerHTML));
ctx.tcDebloquerContact('c3');
verifie('plus aucun bloque : « Aucun contact bloqué. » et pas de bouton', /Aucun contact bloqué\./.test(feuilles[feuilles.length - 1].innerHTML) && !/Débloquer/.test(feuilles[feuilles.length - 1].innerHTML));
ctx.tcDebloquerContact('inconnu');
verifie('un identifiant inconnu : rien ne se passe', sauves === 2);
ctx.openMsgPrivacy();
verifie('feuille Confidentialité sans bloque : « Contacts bloqués » sans compteur', /Contacts bloqués<\/div>/.test(feuilles[feuilles.length - 1].innerHTML));
verifie('la page Contacts garde son propre geste (toggleContactBlock) inchange', /function toggleContactBlock\(contactId\) \{\s+const contact = contactsList\.find\(c => c\.id === contactId\);/.test(page));
verifie('la carte rouge de la fiche dit la meme phrase que la liste (mission 30, ajout du chef)', /Acc\\u00e8s bloqu\\u00e9\.<\/b> Cette personne ne peut plus t\\u2019\\u00e9crire ni prendre rendez-vous avec toi, et elle ne le sait pas\./.test(page) && page.indexOf('Ses demandes de rendez-vous ne t\\u2019arrivent plus, et cette personne') < 0);
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
