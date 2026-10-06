// La synchronisation Google Agenda a sa page, ouverte depuis le menu en
// 3e position (sous « Importer mon ancien agenda »), et quitte les
// Paramètres. À la fin d'un import réussi : « Synchroniser maintenant ».
// Charles, 07/10 : argument de vente pour un nouvel utilisateur, à mettre
// en avant. Jamais de promesse sur le sens Google → TimeCool (inexistant).
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (page.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}

titre('Le menu : 3e position, juste sous « Importer mon ancien agenda », dans les deux modes');
const menus = page.slice(page.indexOf('const menuItems = {'), page.indexOf('function renderMenu()'));
const ordre = (bloc) => (bloc.match(/\{id:'([a-z]+)'/g) || []).map((x) => x.slice(5, -1));
const user = ordre(menus.slice(menus.indexOf('user: ['), menus.indexOf('pro: [')));
const pro = ordre(menus.slice(menus.indexOf('pro: [')));
verifie('mode particulier : agenda, import, google, Charly…', user.slice(0, 4).join(',') === 'calendar,importagenda,google,assistant', user.slice(0, 5).join(','));
verifie('mode pro : même place', pro.slice(0, 4).join(',') === 'calendar,importagenda,google,assistant', pro.slice(0, 5).join(','));
verifie('le libellé : « 📅 Synchroniser avec Google Agenda »', (menus.match(/\{id:'google', icon:'📅', label:'Synchroniser avec Google Agenda'\}/g) || []).length === 2);
verifie('l entrée n est pas cachée par un drapeau de fonction', !/google:\s*'/.test(page.slice(page.indexOf('const FEATURE_BY_PAGE'), page.indexOf('const FEATURE_BY_PAGE') + 200)));

titre('La page');
const iPage = page.indexOf('<div class="page" id="page-google">');
const iImport = page.indexOf('<div class="page" id="page-importagenda">');
const bloc = iPage > -1 ? page.slice(iPage, iImport) : '';
verifie('elle existe, avant la page d import', iPage > -1 && iImport > iPage);
verifie('titre « Synchroniser avec Google Agenda », sous-titre sans promesse inverse', /page-title">📅 Synchroniser avec Google Agenda</.test(bloc) && /Tes rendez-vous TimeCool apparaissent aussi dans ton Google Agenda/.test(bloc));
verifie('un bouton retour (tcRetour, comme les autres pages)', /class="back-btn" onclick="tcRetour\(\)"/.test(bloc));
verifie('elle contient la zone que dessine tcGoogleAgendaAfficher', /id="tcGoogleAgendaZone"/.test(bloc));
verifie('le mode d emploi en deux étapes : importer d abord (lien vers l import), puis synchroniser', /onclick="navigate\('importagenda'\); return false;"/.test(bloc) && /2\. Tu synchronises/.test(bloc));
verifie('il dit « pas de doublons » et que Google Agenda peut être gardé', /pas de doublons/.test(bloc) && /garder Google Agenda/.test(bloc));
verifie('il ne promet jamais le sens Google → TimeCool', !/Google (vers|→) TimeCool|dans les deux sens|aussi dans TimeCool|apparaît dans TimeCool/i.test(bloc));
verifie('la zone n existe plus qu une fois dans la page (plus dans les Paramètres)', (page.match(/id="tcGoogleAgendaZone"/g) || []).length === 1);

titre('navigate() la dessine, les Paramètres ne la dessinent plus');
verifie("navigate('google') appelle tcGoogleAgendaAfficher", /else if \(page==='google'\) tcGoogleAgendaAfficher\(\);/.test(page));
const parametres = fonction('renderSettingsInterne') || '';
verifie('renderSettingsInterne ne contient plus le bloc Google ni son appel', parametres.length > 1000 && !/Google Agenda/.test(parametres) && !/tcGoogleAgendaAfficher/.test(parametres));
const api = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
verifie('les pages de retour de Google (API) guident vers le menu, plus vers les Paramètres', api.length > 0 && !/depuis les Paramètres de TimeCool/.test(api) && /dans le menu de TimeCool/.test(api));
verifie('la page non plus ne renvoie vers les Paramètres pour Google', !/Paramètres → 📅 Google Agenda|Paramètres → Google Agenda/.test(page));

titre('À la fin d un import réussi');
const succes = fonction('showImportSuccess') || '';
const iSync = succes.indexOf("navigate(\\'google\\')");
const iCal = succes.indexOf("navigate(\\'calendar\\')");
verifie('un bouton « Synchroniser maintenant avec Google Agenda », placé AVANT « voir mon agenda »', iSync > -1 && iCal > iSync && /Synchroniser maintenant avec Google Agenda/.test(succes));
verifie('en vert (prochaine étape), et le bouton d agenda inchangé', /background:#34a853[^<]*Synchroniser maintenant/.test(succes) && /navigate\(\\'calendar\\'\)" style="width:100%;max-width:280px;padding:15px;background:#1a73e8/.test(succes));

titre('La page fonctionne (mise en scène)');
const el = {};
const ctx = {
  console, mode: 'user',
  document: { getElementById: (id) => (el[id] = el[id] || { innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {} } }) },
  escapeHTML: (t) => String(t), MONTHS: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  tcJeton: () => 'jeton', showToast() {},
  tcAppel: async (m, route) => ({ disponible: true, relie: true, email: 'test@gmail.com', envoyer: true, depuis: Math.floor(new Date(2026, 9, 7, 9, 30).getTime() / 1000) })
};
vm.createContext(ctx);
['_tcGoogleAgendaLigne', 'tcGoogleAgendaAfficher'].forEach((n) => { const src = fonction(n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
(async () => {
  await ctx.tcGoogleAgendaAfficher();
  const zone = el.tcGoogleAgendaZone.innerHTML;
  verifie('synchronisé : « ✅ Synchronisé », l adresse, et « depuis le 7 octobre à 09h30 »', /✅ Synchronisé/.test(zone) && /test@gmail\.com/.test(zone) && /depuis le 7 octobre à 09h30/.test(zone), zone.slice(0, 120));
  verifie('et « Désynchroniser »', />Désynchroniser<\/button>/.test(zone));
  ctx.tcAppel = async () => ({ disponible: true, relie: false });
  await ctx.tcGoogleAgendaAfficher();
  verifie('non synchronisé : le bouton « Synchroniser mon agenda TimeCool avec mon agenda Google »', /Synchroniser mon agenda TimeCool avec mon agenda Google<\/button>/.test(el.tcGoogleAgendaZone.innerHTML));
  ctx.tcJeton = () => '';
  await ctx.tcGoogleAgendaAfficher();
  verifie('sans compte : il dit où se connecter (Mon profil)', /Connectez-vous à votre compte TimeCool \(menu → Mon profil\)/.test(el.tcGoogleAgendaZone.innerHTML));
  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
