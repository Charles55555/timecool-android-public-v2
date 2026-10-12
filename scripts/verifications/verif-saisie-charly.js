// Mission 35 (Charles, 12/10) : page Charly, zone d ecriture longue : la zone grandit jusqu a 3 lignes puis defile en
// interne ; le bas de la conversation suit la hauteur reelle de la barre (le dernier message reste visible).
// Usage : node verif-saisie-charly.js <index.html>
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

// Un textarea factice : 14 px, interligne 20 px, 10 px de marge haut et bas, 1,5 px de bordure → 3 lignes = 83 px.
const champ = { style: {}, scrollHeight: 0 };
const corps = { style: {}, scrollHeight: 2000, scrollTop: 0, clientHeight: 600 };
const barre = { offsetHeight: 120 };
const ctx = {
  console, Math, parseFloat, String,
  getComputedStyle: () => ({ lineHeight: '20px', fontSize: '14px', paddingTop: '10px', paddingBottom: '10px', borderTopWidth: '1.5px', borderBottomWidth: '1.5px' }),
  document: { getElementById: (id) => (id === 'charlyChatBody' ? corps : (id === 'charlyInputBar' ? barre : null)) }
};
vm.createContext(ctx);
const mConst = page.match(/const TC_SAISIE_LIGNES_MAX = [^;]*;/);
if (mConst) vm.runInContext(mConst[0], ctx); else { ko++; console.log('  KO  TC_SAISIE_LIGNES_MAX introuvable'); }
['tcHauteurMaxSaisie', 'autoResizeCharly', 'tcCalerBasConversation'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. La zone grandit avec le texte, jusqu a 3 lignes, puis defile en interne');
verifie('3 lignes au plus (TC_SAISIE_LIGNES_MAX = 3) : hauteur maximale = 3 × 20 + 23 = 83 px', vm.runInContext('TC_SAISIE_LIGNES_MAX', ctx) === 3 && ctx.tcHauteurMaxSaisie(champ) === 83, ctx.tcHauteurMaxSaisie(champ));
champ.scrollHeight = 43;   // une ligne
ctx.autoResizeCharly(champ);
verifie('une ligne : la zone fait sa hauteur de contenu (43 px), sans defilement', champ.style.height === '43px' && champ.style.overflowY === 'hidden', JSON.stringify(champ.style));
champ.scrollHeight = 63;   // deux lignes
ctx.autoResizeCharly(champ);
verifie('deux lignes : 63 px, sans defilement', champ.style.height === '63px' && champ.style.overflowY === 'hidden');
champ.scrollHeight = 123;  // cinq lignes saisies
ctx.autoResizeCharly(champ);
verifie('cinq lignes saisies : la zone s arrete a 3 lignes (83 px) et defile en interne', champ.style.height === '83px' && champ.style.overflowY === 'auto', JSON.stringify(champ.style));
verifie('la hauteur est remise a « auto » avant la mesure (la zone peut aussi retrecir)', /el\.style\.height = 'auto';/.test(fonction(page, 'autoResizeCharly')));

titre('2. Le bas de la conversation suit la hauteur reelle de la barre');
corps.scrollTop = corps.scrollHeight - corps.clientHeight;   // au bas
barre.offsetHeight = 140;
ctx.tcCalerBasConversation();
verifie('la place reservee en bas = hauteur de la barre + 12 px (152 px pour une barre de 140)', corps.style.paddingBottom === '152px', corps.style.paddingBottom);
verifie('la conversation, qui etait au bas, y reste (le dernier message reste visible)', corps.scrollTop === corps.scrollHeight);
corps.scrollTop = 100;   // l utilisateur lisait plus haut
barre.offsetHeight = 90;
ctx.tcCalerBasConversation();
verifie('si l utilisateur lisait plus haut, la position n est pas forcee ; la place reservee suit (102 px)', corps.style.paddingBottom === '102px' && corps.scrollTop === 100);
verifie('autoResizeCharly recale le bas a chaque frappe', /tcCalerBasConversation\(\);/.test(fonction(page, 'autoResizeCharly')));
verifie('le champ garde oninput="autoResizeCharly(this)" (zone d ecriture de Charly)', /<textarea id="charlyInput"[^>]*oninput="autoResizeCharly\(this\)"/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
