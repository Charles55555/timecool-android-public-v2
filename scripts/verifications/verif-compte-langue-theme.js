// Mission 25 (Charles, 12/10) : (a) langue et theme suivent le compte, appliques des la connexion ; (b) champs de
// connexion vides a la deconnexion ; (c) theme sombre coherent (menu, fenetres, en-tete, page, Parametres).
// Usage : node verif-compte-langue-theme.js <index.html> <backend/api/index.php>
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
const regle = (sel) => { const m = page.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[^\\n]*')); return m ? m[0] : ''; };

titre('(c) Le theme sombre, lisible partout : menu, fenetres et cartes de Parametres suivent var(--bg) ; page et en-tete restent clairs');
['.side-menu', '.modal', '.tc-mod'].forEach((sel) => {
  const r = regle(sel);
  verifie(sel + ' : background:var(--bg)', /background:var\(--bg\)/.test(r) && !/background:#fff/.test(r), r.slice(0, 120));
});
// Choix autorise par le chef (12/10) : la page et l en-tete portent des textes a couleur sombre codee en dur et 182 fonds
// blancs en ligne : les rendre sombres donnait du sombre-sur-sombre (captures). Ils restent clairs dans les deux themes.
['.header', '.main'].forEach((sel) => { const r = regle(sel); verifie(sel + ' reste clair (background:#fff), lisible dans les deux themes', /background:#fff/.test(r), r.slice(0, 100)); });
const rsi = fonction(page, 'renderSettingsInterne') || '';
verifie('Parametres : les cartes suivent le theme (var(--bg)), plus aucune carte blanche codee en dur', (rsi.match(/background:var\(--bg\); border:1px solid var\(--border\); border-radius:12px; overflow:hidden; margin-bottom:16px;/g) || []).length >= 3 && !/background:#fff; border:1px solid var\(--border\); border-radius:12px; overflow:hidden; margin-bottom:16px;/.test(rsi));
verifie('.tc-mod-in (saisie de « Nom du nouvel agenda ») : fond et texte du theme', /background:var\(--bg\); color:var\(--text\)/.test(regle('.tc-mod-in')));
const dark = page.match(/const DARK_VARS = \{[\s\S]*?\};/);
verifie('le theme sombre definit --bg, --text, --text-sec, --border', !!dark && ['--bg', '--text', '--text-sec', '--border'].every((v) => dark[0].indexOf("'" + v + "'") > -1));
// 2e capture : l entree active du menu et le titre de page restaient illisibles en sombre.
const light = page.match(/const LIGHT_VARS = \{[\s\S]*?\};/);
verifie('l entree active du menu suit le theme (--menu-active : bleu clair en clair, bleu nuit en sombre)', !!dark && !!light && /'--menu-active':'#2b3a55'/.test(dark[0]) && /'--menu-active':'#e8f0fe'/.test(light[0]) && /background:var\(--menu-active, #e8f0fe\)/.test(regle('.menu-item.active')));
verifie('titre et sous-titre de page : couleurs fixes, la page restant claire', /color:#202124/.test(regle('.page-title')) && /color:#5f6368/.test(regle('.page-subtitle')));
// 3e capture : la mise en avant « Charly IA » du menu (degrade clair code) suit le theme.
verifie('la mise en avant « Charly IA » du menu suit le theme (--menu-charly : creme en clair, ambre sombre en sombre)', !!dark && !!light && /'--menu-charly':'#3a3222'/.test(dark[0]) && /'--menu-charly':'#fff4e0'/.test(light[0]) && /linear-gradient\(90deg,var\(--menu-charly, #fff4e0\),var\(--bg, #fff\)\)/.test(fonction(page, 'renderMenu') || '') && !/linear-gradient\(90deg,#fff4e0,#fff\)/.test(fonction(page, 'renderMenu') || ''));

titre('(a) La langue et le theme du compte s appliquent des la connexion');
const poser = (page.match(/  reglage: \{[\s\S]*?\n  \}\n\};/) || [''])[0];
verifie('reglage.poser applique le theme recu (deja) ET la langue recue (tcAppliquerLangueRecue), sans la repousser', /applyTheme\(voulus\.tc_theme\)/.test(poser) && /tcAppliquerLangueRecue\(voulus\.timecool_language\)/.test(poser));
const f = fonction(page, 'tcAppliquerLangueRecue') || '';
verifie('tcAppliquerLangueRecue : langue courante, memoire de l appareil, libelle, traduction de la page (le francais est restaure) ; jamais tcPousserLangue', /currentLanguage = code;/.test(f) && /localStorage\.setItem\('timecool_language', code\)/.test(f) && /translatePageWithGoogle\(code, true\)/.test(f) && !/tcPousserLangue/.test(f));
{
  const ctx = { console, String, Array, setTimeout: (fn) => { fn(); return 0; }, currentLanguage: 'fr', localStorage: { setItem() {} }, document: { getElementById: () => null },
    SUPPORTED_LANGUAGES: [{ code: 'fr', active: true, flag: '🇫🇷', label: 'Français' }, { code: 'en', active: true, flag: '🇬🇧', label: 'English' }, { code: 'xx', active: false }],
    tcNomDeLangue: (c, l) => l, traduites: [], translatePageWithGoogle: (c) => { ctx.traduites.push(c); } };
  vm.createContext(ctx);
  if (f) vm.runInContext(f, ctx);
  ctx.tcAppliquerLangueRecue('en');
  verifie('rejeu : « en » recu → langue courante en, page traduite en anglais', ctx.currentLanguage === 'en' && ctx.traduites.join() === 'en');
  ctx.tcAppliquerLangueRecue('xx');
  verifie('une langue inconnue ou inactive est ignoree', ctx.currentLanguage === 'en' && ctx.traduites.length === 1);
  ctx.tcAppliquerLangueRecue('fr');
  verifie('« fr » recu → le francais est restaure par translatePageWithGoogle(fr)', ctx.currentLanguage === 'fr' && ctx.traduites.join() === 'en,fr');
}
const splash = fonction(page, 'showWelcomeSplash') || '';
verifie('des la connexion (showWelcomeSplash), un tour de synchro part tout de suite : la langue et le theme du compte arrivent sans attendre', /tcSyncTour\(\)/.test(splash) && splash.indexOf('tcSyncTour()') > splash.indexOf('tcRecupererClesDuServeur();'));
verifie('avant connexion : ceux de l appareil (gardes au menage), enregistres dans le compte au premier changement (tc_reglages_gardes)', /tc_reglages_gardes/.test(fonction(page, 'tcViderDonneesDuCompte') || '') && /k !== 'timecool_language' && k !== 'tc_theme'/.test(fonction(page, 'tcViderDonneesDuCompte') || ''));

titre('(b) A la deconnexion, les champs du formulaire de connexion sont vides');
const vider = fonction(page, 'tcViderChampsConnexion') || '';
verifie('tcViderChampsConnexion vide loginEmail et loginPassword, maintenant puis apres l autocompletion (300 ms, 1200 ms)', /\['loginEmail', 'loginPassword'\]/.test(vider) && /setTimeout\(vider, 300\)/.test(vider) && /setTimeout\(vider, 1200\)/.test(vider));
{
  const champs = { loginEmail: { value: 'fanny@exemple-timecool.fr' }, loginPassword: { value: 'secret' } };
  const ctx = { console, setTimeout: (fn) => { fn(); return 0; }, document: { getElementById: (id) => champs[id] || null } };
  vm.createContext(ctx);
  if (vider) vm.runInContext(vider, ctx);
  ctx.tcViderChampsConnexion();
  verifie('rejeu : les deux champs sont vides', champs.loginEmail.value === '' && champs.loginPassword.value === '');
}
const logout = fonction(page, 'logoutUser') || '';
verifie('logoutUser vide les champs apres le menage, avant l ecran d accueil', /tcViderDonneesDuCompte\(\);[\s\S]*?tcViderChampsConnexion\(\);[\s\S]*?showAuthFlow\('auth-welcome'\)/.test(logout));
verifie('navigateAuth(auth-login) vide aussi les champs a chaque arrivee sur l ecran de connexion', /if \(pageId === 'auth-login'\) tcViderChampsConnexion\(\);/.test(fonction(page, 'navigateAuth') || ''));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
