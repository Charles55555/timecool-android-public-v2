// « Synchroniser avec mon ancien agenda » (10/10) : le menu, l encadre rassurant sur
// les DEUX pages (Importer et Synchroniser), la carte Outlook (sans aucun appel reseau)
// et ce que disent Charly et l aide.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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
const sansBalises = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

titre('1. Le menu');
const menus = page.slice(page.indexOf('const menuItems = {'), page.indexOf('function renderMenu()'));
verifie('l entree s appelle « Synchroniser avec mon ancien agenda » (particulier ET pro), meme cle et meme place',
  (menus.match(/\{id:'google', icon:'📅', label:'Synchroniser avec mon ancien agenda'\}/g) || []).length === 2);
verifie('l ancien libelle n existe plus nulle part dans le menu ni dans la page', !/Synchroniser avec Google Agenda/.test(page));
const iSync = page.indexOf('<div class="page" id="page-google">');
const iImport = page.indexOf('<div class="page" id="page-importagenda">');
const iSuite = page.indexOf('<div class="page" id="page-dispo">');
const pageSync = page.slice(iSync, iImport);
const pageImport = page.slice(iImport, iSuite);
verifie('le titre de la page suit le menu', /page-title">📅 Synchroniser avec mon ancien agenda</.test(pageSync));
verifie('le sous-titre ne parle plus de Google seul (la page a deux cartes)', /ancien agenda \(Google ou Outlook\)/.test(pageSync));

titre('2. L encadre rassurant, en haut des DEUX pages');
const TEXTE = '🔒 Ton ancien agenda ne risque rien. TimeCool ne supprime, ne modifie et ne déplace jamais rien dans ton ancien agenda. Il lit (pour importer) ou il ajoute (pour synchroniser), c’est tout. Tu peux continuer à l’utiliser comme avant.';
const encadre = (bloc) => { const d = bloc.indexOf('<div class="tc-rassurant"'); if (d < 0) return ''; const f = bloc.indexOf('</div>\n    </div>', d); return bloc.slice(d, f + 17); };
const eS = encadre(pageSync), eI = encadre(pageImport);
verifie('il est present sur la page Synchroniser', eS !== '');
verifie('il est present sur la page Importer', eI !== '');
verifie('texte exact sur la page Synchroniser', sansBalises(eS) === TEXTE, sansBalises(eS));
verifie('texte exact sur la page Importer', sansBalises(eI) === TEXTE, sansBalises(eI));
const normal = (h) => h.replace(/ id="tcRassurant\w+"/, '');
verifie('meme dessin sur les deux pages (meme HTML, hors identifiant)', normal(eS) === normal(eI));
verifie('en haut de la page Synchroniser : avant « Comment ça marche » et avant les cartes', pageSync.indexOf('class="tc-rassurant"') > -1 && pageSync.indexOf('class="tc-rassurant"') < pageSync.indexOf('Comment ça marche') && pageSync.indexOf('class="tc-rassurant"') < pageSync.indexOf('tcGoogleAgendaZone'));
verifie('en haut de la page Importer : avant le contenu des etapes', pageImport.indexOf('class="tc-rassurant"') > -1 && pageImport.indexOf('class="tc-rassurant"') < pageImport.indexOf('id="importAgendaContent"'));
verifie('hors du contenu que les etapes reecrivent : il ne disparait pas quand on avance', !/importAgendaContent[^>]*>\s*<div class="tc-rassurant"/.test(pageImport) && /<\/div><div id="importAgendaContent"/.test(pageImport));
const css = (page.match(/\.tc-rassurant \{[^}]*\}/) || [''])[0];
verifie('cadre vert doux et cadenas bien visible (fond vert clair, bordure verte, cadenas grand)', /background:#e6f4ea/.test(css) && /border:1\.5px solid #9fd3ad/.test(css) && /\.tc-rassurant \.tc-rassurant-cadenas \{ font-size:26px/.test(page));
verifie('le titre de l encadre est en gras, le texte reste lisible (13,5 px minimum)', /\.tc-rassurant b \{[^}]*font-size:14\.5px/.test(page) && /font-size:13\.5px/.test(css));

titre('3. La carte Outlook');
const iGoogleZone = pageSync.indexOf('id="tcGoogleAgendaZone"');
const iOutlook = pageSync.indexOf('id="tcOutlookCarte"');
verifie('elle est presente, SOUS celle de Google', iOutlook > -1 && iOutlook > iGoogleZone);
const carteG = pageSync.slice(pageSync.lastIndexOf('<div style="background:#fff', iGoogleZone), pageSync.indexOf('id="tcOutlookCarte"'));
const carteO = pageSync.slice(pageSync.lastIndexOf('<div id="tcOutlookCarte"') > -1 ? pageSync.indexOf('<div id="tcOutlookCarte"') : iOutlook);
const structure = (h) => (h.match(/border-radius:12px; overflow:hidden/g) || []).length;
verifie('meme structure : cadre arrondi, en-tete colore, zone, bouton pleine largeur', structure(carteG) === 1 && structure(carteO) === 1 && /font-size:12px; font-weight:700; text-transform:uppercase/.test(carteO) && /id="tcOutlookAgendaZone"/.test(carteO) && /width:100%; padding:12px;[^"]*border-radius:10px; font-size:14px; font-weight:600/.test(carteO));
verifie('icone Microsoft (quatre carres) et nom « Outlook »', /<svg[^>]*>(<rect[^>]*>){4}<\/svg>/.test(carteO) && /Outlook/.test(sansBalises(carteO)));
verifie('le bouton porte le texte demande', />Synchroniser mon agenda TimeCool avec mon agenda Outlook</.test(carteO));
verifie('et appelle tcOutlookAgendaRelier()', /id="tcOutlookAgendaBouton" onclick="tcOutlookAgendaRelier\(\)"/.test(carteO));
verifie('la carte dit « bientôt » et ne promet pas que ca marche (aucun « Synchronisé », aucun interrupteur)', /bientôt/.test(carteO) && !/Synchronisé|Désynchroniser|checkbox/.test(carteO));
const corps = fonction(page, 'tcOutlookAgendaRelier') || '';
verifie('la fonction existe (c est elle qui deviendra la vraie liaison)', corps !== '');
verifie('elle ne fait AUCUN appel reseau ni serveur', !/fetch|tcAppel|XMLHttpRequest|sendBeacon|location|TC_BACKEND|tcJeton/.test(corps), corps.replace(/\s+/g, ' '));
const messages = [];
const ctx = { tcAlert: (m) => { messages.push(m); return Promise.resolve(); }, fetch: () => { throw new Error('appel reseau'); } };
vm.createContext(ctx);
vm.runInContext(corps, ctx);
let err = null; try { vm.runInContext('tcOutlookAgendaRelier()', ctx); } catch (e) { err = e; }
verifie('elle affiche « Outlook arrive dans une prochaine version. »', !err && messages.length === 1 && messages[0] === 'Outlook arrive dans une prochaine version.', err ? err.message : messages.join('|'));
verifie('la zone de Google n est pas touchee (elle se dessine toujours seule)', (page.match(/id="tcGoogleAgendaZone"/g) || []).length === 1 && (page.match(/id="tcOutlookAgendaZone"/g) || []).length === 1);

titre('4. Charly et l aide');
const ctx2 = {};
vm.createContext(ctx2);
vm.runInContext('function tcContientMot(texte, expression) { if (!texte || !expression) return false; const lettre = /[a-z0-9à-ÿœæ]/i; let i = texte.indexOf(expression); while (i !== -1) { const avant = i > 0 ? texte[i - 1] : ""; const apres = texte[i + expression.length] || ""; if (!lettre.test(avant) && !lettre.test(apres)) return true; i = texte.indexOf(expression, i + 1); } return false; }', ctx2);
const mTab = page.match(/const _unavailable = \[[\s\S]*?\n  \];/);
if (mTab) vm.runInContext(mTab[0], ctx2); else { ko++; console.log('  KO  la liste de Charly est introuvable'); }
const repond = (t) => vm.runInContext('(function () { const u = _unavailable.find(u => u.keys.some(k => tcContientMot(' + JSON.stringify(t.toLowerCase()) + ', k))); return u ? u.reply : null; })()', ctx2) || '';
const rOutlook = repond('est-ce que tu peux te synchroniser avec Outlook ?');
verifie('Outlook : « pas encore, bientôt », et il renvoie à la page Synchroniser', /^Pas encore, mais bientôt/.test(rOutlook) && /Synchroniser avec mon ancien agenda/.test(rOutlook) && /carte Outlook/.test(rOutlook), rOutlook.slice(0, 120));
verifie('Outlook : aucune promesse que ca marche (pas de « Oui »)', !/^Oui/.test(rOutlook) && !/ça marche|c’est possible dès maintenant/.test(rOutlook));
verifie('Outlook : il propose l import, qui marche deja', /Importer mon ancien agenda/.test(rOutlook));
verifie('Apple / iCloud restent « Pas encore, mais ça arrive bientôt » (sans Outlook)', /^Pas encore, mais ça arrive bientôt/.test(repond('et icloud ?')) && !/Outlook/.test(repond('et icloud ?')));
const rSync = repond('je veux synchroniser avec mon ancien agenda');
verifie('« synchroniser avec mon ancien agenda » mene a la bonne reponse (la page Synchroniser, carte Google)', /^Oui !/.test(rSync) && /Synchroniser avec mon ancien agenda/.test(rSync) && /Synchroniser mon agenda TimeCool avec mon agenda Google/.test(rSync), rSync.slice(0, 120));
verifie('« synchronise avec google agenda » mene toujours a la meme reponse', repond('synchronise avec google agenda') === rSync);
verifie('« synchroniser mes appareils » ne mene pas a Google', !/^Oui !/.test(repond('synchroniser mes appareils')));
verifie('l entree Outlook passe AVANT les entrees Google (sinon « Oui ! » a cote)', page.indexOf("keys: ['outlook'") > -1 && page.indexOf("keys: ['outlook'") < page.indexOf("keys: ['google calendar'"));
const prompt = page.slice(page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT'), page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT') + 40000);
verifie('le prompt de Charly : nouveau libelle, Outlook « bientôt » sans promesse', /menu ☰ → Synchroniser avec mon ancien agenda \(carte Google\)/.test(prompt) && /ne promets JAMAIS qu'elle marche déjà/.test(prompt));
const faq = (page.match(/\{q: '📅 TimeCool se synchronise-t-il avec Google Agenda \?', a: '[^']*(?:\\'[^']*)*'\}/) || [''])[0];
verifie('l aide : le nouveau libelle, et « Outlook : bientôt »', /Synchroniser avec mon ancien agenda/.test(faq) && /Outlook : bientôt, la même page montre déjà sa carte/.test(faq) && !/Synchroniser avec Google Agenda/.test(faq), faq.slice(0, 100));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
