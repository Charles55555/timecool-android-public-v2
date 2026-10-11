// Campagne 3 (11/10), mission 3 :
//  1. Le toast disparu (opacity 0) restait dans la page et avalait les appuis sur les boutons du bas :
//     il ne capte plus rien, visible ou non ; les autres elements flottants ne captent rien quand ils sont caches.
//  2. Apres une inscription (ou une connexion Google, un appairage, la biometrie), recharger ouvre l agenda :
//     une session ouverte vaut accueil termine, et chaque ouverture de session pose le drapeau.
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
const regle = (sel) => { const m = page.match(new RegExp('\\n' + sel.replace(/[.\\]/g, '\\$&') + ' \\{[^\\n]*')); return m ? m[0] : ''; };

titre('1. Le toast ne capte jamais un appui');
const toast = regle('.toast');
verifie('.toast : pointer-events:none (invisible OU visible, un appui passe au travers)', /pointer-events:none/.test(toast), toast);
verifie('.toast.show ne le remet pas cliquable', !/pointer-events/.test(regle('.toast.show')), regle('.toast.show'));
verifie('il reste un simple texte (showToast ne pose aucun bouton)', /t\.textContent = msg;/.test(fonction(page, 'showToast') || '') && !/innerHTML|onclick/.test(fonction(page, 'showToast') || ''));
{
  // showToast execute : la classe show va et vient.
  const el = { textContent: '', classes: new Set(), classList: { add(c) { el.classes.add(c); }, remove(c) { el.classes.delete(c); } } };
  const minuteurs = [];
  const ctx = { console, document: { getElementById: (id) => (id === 'toast' ? el : null) }, setTimeout: (f, ms) => { minuteurs.push([f, ms]); return 1; } };
  vm.createContext(ctx);
  vm.runInContext(fonction(page, 'showToast'), ctx);
  ctx.showToast('Enregistré');
  verifie('showToast : texte pose, classe show', el.textContent === 'Enregistré' && el.classes.has('show'));
  verifie('puis retiree au bout de 2,5 s', minuteurs.length === 1 && minuteurs[0][1] === 2500 && (minuteurs[0][0](), !el.classes.has('show')));
}

titre('2. Les autres elements flottants ne captent rien quand ils sont caches');
verifie('tirer-pour-rafraichir (.tc-tirer) : pointer-events:none', /pointer-events:none/.test(page.slice(page.indexOf('\n.tc-tirer {'), page.indexOf('\n.tc-tirer {') + 400)));
verifie('etiquette du deplacement au doigt : pointer-events:none', /pointer-events:none/.test(regle('.tc-deplace-etiquette')));
verifie('barre « Déplacé vers … — Annuler » : display:none hors .show (elle a un vrai bouton quand elle est visible)', /display:none/.test(regle('.tc-deplace-barre')) && /display:flex/.test(regle('.tc-deplace-barre.show')) && /classList\.remove\('show'\)/.test(fonction(page, 'tcCacherBarreDeplacement') || ''));
verifie('bandeau de mise a jour : attribut hidden quand il est masque', /b\.hidden = true;/.test(fonction(page, 'tcMasquerBandeauMaj') || '') && /<div class="maj-bandeau" id="tcBandeauMaj" hidden>/.test(page));
verifie('voile du menu : pointer-events:none', /pointer-events:none/.test(regle('.menu-overlay')));
verifie('fenetres (tc-mod-ov) : retirees de la page a la fermeture', (page.match(/if \(ov\.parentNode\) ov\.parentNode\.removeChild\(ov\);/g) || []).length >= 3);

titre('3. Apres une inscription, recharger ouvre l agenda');
const ouvertures = page.match(/^[ \t]*localStorage\.setItem\('timecool_session_active', 'true'\);\n[ \t]*localStorage\.setItem\('tc_onboarding_done', '1'\);/gm) || [];
verifie('chaque ouverture de session pose le drapeau d accueil : inscription/saveUserAccount, connexion, Google, appairage, biometrie (5)', ouvertures.length === 5, ouvertures.length);
verifie('et c est bien la cle de l accueil', /const TC_ONBOARDING_KEY = 'tc_onboarding_done';/.test(page));
{
  const mem = {};
  const ecran = { style: { display: 'none' } };
  const ctx = { console, JSON, userAccount: null,
    localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
    document: { getElementById: (id) => (id === 'onboardingScreen' ? ecran : null) } };
  vm.createContext(ctx);
  vm.runInContext("const TC_ONBOARDING_KEY = 'tc_onboarding_done';", ctx);
  ['checkOnboarding', 'saveUserAccount'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('checkOnboarding()', ctx);
  verifie('premiere visite, sans session : l accueil s affiche', ecran.style.display === 'block');
  ecran.style.display = 'none';
  vm.runInContext("saveUserAccount({ firstname: 'Damien', lastname: 'Lefort', reference: 'REFD' })", ctx);
  verifie('l inscription (saveUserAccount) ouvre la session ET pose le drapeau', mem.timecool_session_active === 'true' && mem.tc_onboarding_done === '1');
  vm.runInContext('checkOnboarding()', ctx);
  verifie('rechargement : l accueil ne s affiche pas', ecran.style.display === 'none');
  delete mem.tc_onboarding_done;
  vm.runInContext('checkOnboarding()', ctx);
  verifie('session ouverte mais drapeau absent (ancienne inscription) : l accueil ne s affiche pas, le drapeau est pose', ecran.style.display === 'none' && mem.tc_onboarding_done === '1');
  mem.timecool_session_active = 'false'; delete mem.tc_onboarding_done;
  vm.runInContext('checkOnboarding()', ctx);
  verifie('deconnecte et jamais accueilli : l accueil s affiche', ecran.style.display === 'block');
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
