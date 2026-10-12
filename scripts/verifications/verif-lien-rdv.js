// Mission 37 (12/10) : page publique du lien recu (backend/web/rdv.html) : toucher un creneau le selectionne, le bouton
// « Confirmer ce créneau » confirme ; jamais une confirmation au premier toucher. Usage : node verif-lien-rdv.js <rdv.html>
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

titre('1. La page : un toucher selectionne, un bouton confirme');
const rs = fonction(page, 'renderSlots') || '';
verifie('chaque creneau : onclick = selectionnerCreneau(i), jamais chooseSlot', /onclick="selectionnerCreneau\(' \+ i \+ '\)"/.test(rs) && !/onclick="chooseSlot\(' \+ i \+ '\)"/.test(rs));
verifie('le bouton « Confirmer ce créneau » n apparait qu avec un creneau mis en avant, et lui seul confirme (chooseSlot(vise))', /if \(vise >= 0\) \{\s+html \+= '<button class="ok-btn" onclick="chooseSlot\(' \+ vise \+ '\)">Confirmer ce créneau<\/button>';/.test(rs) && page.indexOf('Confirmer ce rendez-vous') < 0);
verifie('le creneau touche l emporte sur celui du lien (?c=2) ; sinon celui du lien', /const vise = \(_choix >= 0 && data\.slots\[_choix\]\) \? _choix : data\.slots\.findIndex\(function \(s\) \{ return s\.rang === rangVoulu; \}\);/.test(rs));
verifie('les textes : « Touche le créneau qui te convient, puis confirme-le : » / « Confirme le créneau que tu as choisi, ou touches-en un autre : »', /Touche le créneau qui te convient, puis confirme-le :/.test(rs) && /Confirme le créneau que tu as choisi, ou touches-en un autre :/.test(rs));
verifie('« Aucun de ces créneaux ne me convient » reste en un geste (chooseSlot(-1))', /onclick="chooseSlot\(-1\)">Aucun de ces créneaux ne me convient/.test(rs));
verifie('un creneau pris entre-temps (409) : la selection repart de zero avant de redessiner', /_currentData\.slots\.splice\(idx, 1\);\s+_choix = -1;/.test(fonction(page, 'chooseSlot') || ''));

titre('2. Simulation : trois creneaux, un toucher, le bouton, un autre toucher');
const script = (page.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/) || ['', ''])[1];
let html = '';
const ctx = { console, String, Number, Array, JSON, Math, parseInt, URLSearchParams,
  document: { getElementById: (id) => id === 'content' ? { set innerHTML(v) { html = v; }, get innerHTML() { return html; } } : null, createElement: () => { let t = ''; return { set textContent(v) { t = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }, get innerHTML() { return t; } }; } },
  window: { location: { pathname: '/rdv/ABCDEFGH', search: '' } }, fetch: async () => { throw new Error('pas de reseau dans la simulation'); } };
vm.createContext(ctx);
// Sans l appel final init() : on charge les fonctions seules.
vm.runInContext(script.replace(/\ninit\(\);\s*$/, '\n'), ctx);
if (typeof ctx.selectionnerCreneau !== 'function' || typeof ctx.renderSlots !== 'function') { ko++; console.log('  KO  selectionnerCreneau / renderSlots introuvables (page d avant)'); console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const data ={ organizerName: 'Olivia', slots: [{ rang: 1, label: 'lundi 13 octobre', h: 9, m: 0 }, { rang: 2, label: 'mardi 14 octobre', h: 14, m: 30 }, { rang: 3, label: 'jeudi 16 octobre', h: 11, m: 0 }] };
vm.runInContext('_currentData = ' + JSON.stringify(data) + ';', ctx);
ctx.renderSlots(data);
verifie('au depart : trois creneaux, aucun mis en avant, pas de bouton Confirmer, le texte « Touche le créneau … »', (html.match(/class="slot"/g) || []).length === 3 && !/class="slot vise"/.test(html) && !/ok-btn/.test(html) && /Touche le créneau qui te convient/.test(html));
ctx.selectionnerCreneau(1);
verifie('un toucher sur le 2e : il est mis en avant (✅), le bouton « Confirmer ce créneau » vise le 2e, rien n a ete envoye', (html.match(/class="slot vise"/g) || []).length === 1 && /slot vise" onclick="selectionnerCreneau\(1\)"><span class="ic">✅/.test(html) && /onclick="chooseSlot\(1\)">Confirmer ce créneau/.test(html) && /Confirme le créneau que tu as choisi/.test(html));
ctx.selectionnerCreneau(2);
verifie('un autre toucher : la mise en avant passe au 3e, le bouton suit', /slot vise" onclick="selectionnerCreneau\(2\)"/.test(html) && !/slot vise" onclick="selectionnerCreneau\(1\)"/.test(html) && /onclick="chooseSlot\(2\)">Confirmer ce créneau/.test(html));
ctx.selectionnerCreneau(7);
verifie('un index hors liste est ignore', /onclick="chooseSlot\(2\)">Confirmer ce créneau/.test(html));
vm.runInContext('_choix = -1;', ctx);
ctx.window.location.search = '?c=3';
ctx.renderSlots(data);
verifie('lien avec ?c=3 et aucun toucher : le 3e est mis en avant avec le bouton (comme avant)', /slot vise" onclick="selectionnerCreneau\(2\)"/.test(html) && /onclick="chooseSlot\(2\)">Confirmer ce créneau/.test(html));
ctx.selectionnerCreneau(0);
verifie('puis un toucher sur le 1er l emporte sur le lien', /slot vise" onclick="selectionnerCreneau\(0\)"/.test(html) && /onclick="chooseSlot\(0\)">Confirmer ce créneau/.test(html));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
