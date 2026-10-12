// Mission 20 (Charles, 12/10, campagne 10) : a la deconnexion, rien du compte ne reste sur l appareil (memoire ET
// stockage) ; a la connexion, Charly est pret au premier message (cles du compte rapportees), jamais « Configuration IA ».
// Usage : node verif-deconnexion.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 240) : '')); }
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

// Un stockage local factice, et l etat d un appareil que Fanny vient de quitter.
const stock = {};
const localStorage = {
  getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; },
  key: (i) => Object.keys(stock)[i], get length() { return Object.keys(stock).length; }
};
let clesDemandees = 0;
const ctx = {
  console, String, Array, Object, JSON, localStorage,
  TC_BACKEND: { estConnecte: () => false },
  tcRecupererClesDuServeur: () => { clesDemandees++; },
  renderCharlyChat: () => {},
  charlyIA: { history: [{ role: 'assistant', content: 'Bonjour Fanny ! 😊' }], _historiqueCharge: true, config: { provider: 'openai', apiKey: 'sk-fanny', anthropicKey: 'ak-fanny' } },
  events: [{ id: 'e1', mode: 'user', title: 'Dentiste de Fanny' }, { id: 'demo1', mode: 'demo', title: 'Démo' }],
  tasksList: [{ id: 't1' }], birthdays: [{ id: 'b1' }], contactsList: [{ id: 'c1' }], messages: { user: [{ id: 'm1' }], pro: [] },
  _tcSuppressionEnAttente: { x: 1 }, _tcDeplacementEnAttente: { x: 1 }, _tcImprevuEnAttente: 2, _isolatedCalendarId: 'cal1', customCalendars: [{ id: 'cal1' }]
};
vm.createContext(ctx);
['const TC_JAMAIS_TRANSFERE = \\[[^\\]]*\\];', 'const TC_EVENTS_KEY = [^;]*;', 'const TC_TASKS_KEY = [^;]*;', 'const TC_SYNC_VERSION_KEY = [^;]*;', 'const TC_SYNC_EMPREINTES_KEY = [^;]*;', 'const TC_COMPTE_LOCAL_KEY = [^;]*;', 'const TC_CALENDARS_KEY = [^;]*;']
  .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcCleTransferable', 'tcViderDonneesDuCompte', 'tcCleActiveCharly', 'loadCustomCalendars', 'saveCustomCalendars']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Deconnexion : rien du compte precedent, ni en stockage ni en memoire');
Object.assign(stock, {
  timecool_charly_historique: '[{"role":"assistant","content":"Bonjour Fanny !"}]', tc_user_events: '[…]', tc_user_tasks: '[…]', timecool_birthdays: '[…]',
  timecool_contacts: '[…]', tc_conversations: '[…]', timecool_api_keys: '{"openai":"sk-fanny"}', tc_calendars: '[…]', tc_absence: 'x', tc_compte_local: 'fanny',
  tc_device_crypto_key: 'K', tc_device_user_id: 'D', tc_session_jeton: 'J', tc_onboarding_done: '1', tc_nettoyage: 'v1-donnees-melangees',
  timecool_language: 'en', tc_theme: 'dark'
});
ctx.tcViderDonneesDuCompte();
const restantes = Object.keys(stock).sort();
verifie('le stockage ne garde que ce qui est propre a l appareil (cle, identifiant, jeton, marqueurs, accueil termine, langue, theme, reglages gardes)', JSON.stringify(restantes) === JSON.stringify(['tc_compte_local', 'tc_device_crypto_key', 'tc_device_user_id', 'tc_nettoyage', 'tc_onboarding_done', 'tc_reglages_gardes', 'tc_session_jeton', 'tc_theme', 'timecool_language']), restantes.join(' '));
// Decision du chef de projet (12/10, mission 16) : langue et theme sont des reglages de l appareil.
verifie('la langue et le theme de l appareil restent apres le menage', stock.timecool_language === 'en' && stock.tc_theme === 'dark');
// Reserve de l examen : gardes sur l appareil, ils ne doivent pas partir dans le compte qui s ouvre comme un choix a lui.
verifie('le menage note les valeurs gardees dans tc_reglages_gardes (cle d appareil, jamais synchronisee)', stock.tc_reglages_gardes === '{"timecool_language":"en","tc_theme":"dark"}' && !ctx.tcCleTransferable('tc_reglages_gardes'), stock.tc_reglages_gardes);
{
  // reglage.lire, extrait tel quel de TC_SYNC_TYPES.
  const debut = page.indexOf('  reglage: {');
  const d = page.indexOf('lire: function () {', debut);
  let n = 0, fin = -1;
  for (let j = page.indexOf('{', d); j < page.length; j++) { if (page[j] === '{') n++; else if (page[j] === '}') { n--; if (n === 0) { fin = j + 1; break; } } }
  verifie('reglage.lire est trouvee dans TC_SYNC_TYPES', debut > -1 && d > debut && fin > d);
  const m2 = page.match(/const TC_SYNC_DEJA_SYNCHRONISE = \[[^\]]*\];/); const m3 = page.match(/const TC_SYNC_REGLAGE_MAX = [^;]*;/);
  const f2 = fonction(page, 'tcCleReglage');
  verifie('les constantes et tcCleReglage sont trouvees', !!(m2 && m3 && f2));
  if (m2 && m3 && f2 && fin > d) {
    vm.runInContext(m2[0] + '\n' + m3[0] + '\n' + f2 + '\nconst lireReglages = ' + page.slice(d, fin).replace(/^lire: /, '') + ';', ctx);
    stock.tc_rdv_validation = '1';
    const ids = () => vm.runInContext('lireReglages()', ctx).map((o) => o.id).sort();
    // tc_onboarding_done (toujours « 1 ») est un reglage lui aussi : il part, sans consequence.
    verifie('au premier tour, la langue et le theme gardes ne partent pas ; les autres reglages partent', JSON.stringify(ids()) === JSON.stringify(['tc_onboarding_done', 'tc_rdv_validation']), ids().join(' '));
    stock.tc_theme = 'light';
    verifie('le theme change ici depuis le menage part normalement, et sort des reglages gardes ; la langue reste gardee', JSON.stringify(ids()) === JSON.stringify(['tc_onboarding_done', 'tc_rdv_validation', 'tc_theme']) && stock.tc_reglages_gardes === '{"timecool_language":"en"}', ids().join(' ') + ' / ' + stock.tc_reglages_gardes);
    delete stock.tc_rdv_validation; stock.tc_theme = 'dark';
  }
}
// Examen (12/10) : l accueil termine est un reglage de l appareil ; sans lui, l appareil remontrait « Rejoins TimeCool ».
verifie('le drapeau « accueil termine » est reste a 1 : apres deconnexion, l appareil montre l ecran de connexion', stock.tc_onboarding_done === '1');
// Examen (12/10) : « Mon agenda » doit etre de retour en memoire, sinon le prochain agenda cree s enregistre seul.
verifie('« Mon agenda » (cal_default) est de retour en memoire apres le menage', ctx.customCalendars.length === 1 && ctx.customCalendars[0].id === 'cal_default' && ctx.customCalendars[0].visible === true);
ctx.customCalendars.push({ id: 'cal_sport', name: 'Sport', color: '#34A853', visible: true });
ctx.saveCustomCalendars();
ctx.customCalendars = [];
ctx.loadCustomCalendars();
verifie('creer un agenda « Sport » puis recharger : « Mon agenda » et « Sport » sont tous les deux la', JSON.stringify(ctx.customCalendars.map((c) => c.id)) === JSON.stringify(['cal_default', 'cal_sport']), JSON.stringify(ctx.customCalendars.map((c) => c.id)));
delete stock.timecool_custom_calendars;
verifie('la conversation Charly est vide en memoire et sera rechargee (vide) a la prochaine ouverture', ctx.charlyIA.history.length === 0 && ctx.charlyIA._historiqueCharge === false);
verifie('les attentes de Charly et l agenda isole sont remis a zero', ctx._tcSuppressionEnAttente === null && ctx._tcDeplacementEnAttente === null && ctx._tcImprevuEnAttente === 0 && ctx._isolatedCalendarId === null);
verifie('les cles IA du compte ne restent pas en memoire', ctx.charlyIA.config.apiKey === '' && ctx.charlyIA.config.anthropicKey === '');
verifie('rendez-vous, taches, anniversaires, contacts, messages : vides (la demo reste)', ctx.events.length === 1 && ctx.events[0].id === 'demo1' && ctx.tasksList.length === 0 && ctx.birthdays.length === 0 && ctx.contactsList.length === 0 && ctx.messages.user.length === 0);
verifie('sans session, aucune cle n est demandee au serveur', clesDemandees === 0);
ctx.TC_BACKEND.estConnecte = () => true;
ctx.tcViderDonneesDuCompte();
verifie('avec une session (menage au changement de compte), les cles du nouveau compte sont demandees au serveur', clesDemandees === 1);

titre('2. Les textes : la deconnexion fait le menage ; la connexion rapporte les cles ; jamais « Configuration IA »');
const logout = fonction(page, 'logoutUser') || '';
verifie('logoutUser appelle tcViderDonneesDuCompte() apres avoir oublie le mot de passe, et retire le marqueur de compte', /tcOublierMotDePasse\(\);[\s\S]*?tcViderDonneesDuCompte\(\);[\s\S]*?localStorage\.removeItem\(TC_COMPTE_LOCAL_KEY\)[\s\S]*?showAuthFlow\('auth-welcome'\)/.test(logout));
const csm = fonction(page, 'charlySendMessage') || '';
verifie('charlySendMessage : sans cle et avec une session, les cles sont rapportees (await) avant de juger', /let activeKey = tcCleActiveCharly\(\);\s+if \(!charlyIA\.config\.demoMode && !activeKey && TC_BACKEND\.estConnecte\(\)\) \{[\s\S]*?await tcRecupererClesDuServeur\(\);[\s\S]*?activeKey = tcCleActiveCharly\(\);/.test(csm));
verifie('charlySendMessage n ouvre plus jamais la page Configuration IA, ni ne parle de « clé API »', csm.indexOf("navigate('aiconfig')") < 0 && csm.indexOf('Aucune clé API') < 0);
const splash = fonction(page, 'showWelcomeSplash') || '';
verifie('showWelcomeSplash demande les cles du compte des la connexion', /tcRecupererClesDuServeur\(\);/.test(splash));
verifie('tcCleActiveCharly suit le fournisseur choisi', (ctx.charlyIA.config.provider = 'anthropic', ctx.charlyIA.config.anthropicKey = 'ak', ctx.tcCleActiveCharly() === 'ak') && (ctx.charlyIA.config.provider = 'openai', ctx.tcCleActiveCharly() === ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
