// Toutes les fleches retour ramenent a l'ecran d'ou l'on vient, jamais a un ecran fixe
// (Charles, 11/10). Une pile courte des ecrans, une seule fonction tcRetour().
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && d !== '' ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

/* ---- Le vrai code de la pile et le vrai debut de navigate(), executes ---- */
const d = page.indexOf("let _tcPagePrecedente = 'calendar';");
const LIGNE = '  currentPage = page;';
const f = page.indexOf(LIGNE, d);
if (d < 0 || f < d) { console.log('ERREUR : la pile est introuvable'); process.exit(1); }
const SOURCE = page.slice(d, f + LIGNE.length) + '\n};\n';

const PAGES = ['calendar', 'tasks', 'profile', 'pros', 'messages', 'calendars', 'conv', 'dashboard', 'premium', 'demarches', 'aiconfig', 'contacts',
  'birthdays', 'holidays', 'help', 'cgu', 'privacy', 'google', 'importagenda', 'dispo', 'settings', 'assistant', 'charly-quiz'];
function contexte(depart, pagesExistantes) {
  const existent = new Set(pagesExistantes || PAGES);
  const c = {
    console, currentPage: depart,
    document: { getElementById: (id) => (existent.has(id.replace(/^page-/, '')) ? {} : null) },
  };
  vm.createContext(c);
  try {
    vm.runInContext(SOURCE + '\nglobalThis._pile = () => _tcPileEcrans.slice();\nglobalThis._ret = tcRetour;\nglobalThis._noter = tcNoterDepart;\nglobalThis._prec = () => _tcPagePrecedente;', c);
  } catch (e) {
    console.log('  KO  la pile des ecrans n\'existe pas : ' + e.message);
    console.log('');
    console.log('1 anomalie(s).');
    process.exit(1);
  }
  c.existent = existent;
  return c;
}
const va = (c, ...pages) => pages.forEach((p) => c.navigate(p));

titre('La pile : on retient d\'ou l\'on vient');
{
  const c = contexte('calendar');
  va(c, 'contacts');
  verifie('agenda → contacts : la pile retient l\'agenda', JSON.stringify(c._pile()) === '["calendar"]', JSON.stringify(c._pile()));
  va(c, 'profile', 'settings');
  verifie('puis profil, paramètres : agenda, contacts, profil', JSON.stringify(c._pile()) === '["calendar","contacts","profile"]', JSON.stringify(c._pile()));
  verifie('la page courante n\'est pas dans la pile', c.currentPage === 'settings' && !c._pile().includes('settings'));
}
titre('Pas de doublon consécutif, pas d\'empilement par un redessin');
{
  const c = contexte('calendar');
  va(c, 'contacts', 'contacts', 'contacts');
  verifie('naviguer trois fois vers le même écran (redessin) n\'empile rien', JSON.stringify(c._pile()) === '["calendar"]', JSON.stringify(c._pile()));
  va(c, 'profile');
  c._noter('profile');
  c._noter('profile');
  verifie('quitter vers soi-même n\'empile rien', JSON.stringify(c._pile()) === '["calendar","contacts"]', JSON.stringify(c._pile()));
  // aller-retour A → B → A → B : A, B, A se suivent, jamais deux fois le même d'affilée
  const e = contexte('tasks');
  va(e, 'help', 'tasks', 'help', 'tasks');
  const p = e._pile();
  verifie('aller-retour entre deux écrans : jamais deux fois le même de suite', p.every((x, i) => i === 0 || x !== p[i - 1]), JSON.stringify(p));
  // agenda → messages → conversation → flèche (agenda) → messages : l'agenda ne s'empile pas deux fois de suite
  const g = contexte('calendar');
  va(g, 'messages');
  g.currentPage = 'conv';
  va(g, 'calendar', 'messages');
  verifie('conversation puis retour à l\'agenda puis messages : « calendar » n\'est pas empilé deux fois de suite', JSON.stringify(g._pile()) === '["calendar"]', JSON.stringify(g._pile()));
}
titre('Dix entrées au plus');
{
  const c = contexte('calendar');
  const parcours = ['tasks', 'profile', 'pros', 'messages', 'calendars', 'dashboard', 'premium', 'demarches', 'aiconfig', 'contacts', 'birthdays', 'holidays', 'help', 'google', 'dispo'];
  va(c, ...parcours);
  verifie('15 écrans visités : la pile en garde dix', c._pile().length === 10, c._pile().length);
  verifie('ce sont les dix derniers quittés (le plus ancien est oublié)', c._pile()[0] === 'calendars' && c._pile()[9] === 'google', JSON.stringify(c._pile()));
}

titre('La flèche : un écran en arrière, à chaque appui');
{
  const c = contexte('calendar');
  va(c, 'contacts', 'profile', 'settings');
  c._ret();
  verifie('agenda → contacts → profil → paramètres, flèche : profil', c.currentPage === 'profile', c.currentPage);
  c._ret();
  verifie('flèche : contacts', c.currentPage === 'contacts', c.currentPage);
  c._ret();
  verifie('flèche : agenda', c.currentPage === 'calendar', c.currentPage);
  c._ret();
  verifie('pile vide : l\'agenda (on retombe toujours sur un écran sûr)', c.currentPage === 'calendar' && c._pile().length === 0, c.currentPage);
  c._ret(); c._ret();
  verifie('et on peut insister sans casser', c.currentPage === 'calendar');
}
titre('Revenir en arrière n\'empile pas : pas d\'allers-retours');
{
  const c = contexte('calendar');
  va(c, 'contacts', 'profile');
  c._ret();
  verifie('retour de profil : contacts', c.currentPage === 'contacts');
  verifie('la pile ne contient pas l\'écran que l\'on vient de quitter', JSON.stringify(c._pile()) === '["calendar"]', JSON.stringify(c._pile()));
  c._ret();
  verifie('retour encore : agenda (et pas de nouveau profil)', c.currentPage === 'calendar', c.currentPage);
  va(c, 'help');
  verifie('un nouveau déplacement après un retour repart proprement', JSON.stringify(c._pile()) === '["calendar"]' && c.currentPage === 'help', JSON.stringify(c._pile()));
}
titre('Écran disparu ou pile vide : l\'agenda');
{
  const c = contexte('calendar');
  va(c, 'importagenda', 'settings');
  c.existent.delete('importagenda');
  c._ret();
  verifie('l\'écran d\'avant n\'existe plus : agenda', c.currentPage === 'calendar', c.currentPage);
  const v = contexte('help');
  v._ret();
  verifie('aucune pile (premier écran) : agenda', v.currentPage === 'calendar');
  const w = contexte('calendar');
  w._pile; va(w, 'tasks');
  w.existent.delete('calendar');
  w._ret();
  verifie('même l\'agenda en dernier recours : on ne plante pas', w.currentPage === 'calendar');
}
titre('Le menu latéral et la conversation n\'entrent pas dans la pile');
{
  const c = contexte('calendar');
  // le menu s'ouvre sans navigate() : rien dans la pile
  verifie('ouvrir le menu ne touche pas la pile (il n\'est pas un écran)', c._pile().length === 0);
  va(c, 'messages');
  c.currentPage = 'conv';   // openConversation() ouvre la conversation sans navigate()
  va(c, 'contacts');
  verifie('quitter une conversation n\'y laisse pas « conv »', !c._pile().includes('conv'), JSON.stringify(c._pile()));
}
titre('Les parcours de Charles');
{
  // agenda → contacts → (fiche) → conversation → flèche de la conversation → contacts → flèche → agenda
  const c = contexte('calendar');
  va(c, 'contacts');            // le menu : Contacts
  va(c, 'messages');            // messageContact() : navigate('messages')...
  c.currentPage = 'conv';       // ...puis openConversation(), qui n'utilise pas navigate()
  const origine = 'contacts';   // _convOrigine, relevée par messageContact()
  c.navigate(origine);          // tcRetourDepuisConversation()
  verifie('flèche de la conversation : retour à la fiche contact', c.currentPage === 'contacts');
  c._ret();
  verifie('flèche suivante : l\'agenda, pas la liste des messages', c.currentPage === 'calendar', c.currentPage + ' / ' + JSON.stringify(c._pile()));
  // agenda → assistant → parcours guidé → flèche → assistant → flèche → agenda
  const e = contexte('calendar');
  va(e, 'assistant');
  e._noter('charly-quiz');      // startAssistant() contourne navigate()
  e.currentPage = 'charly-quiz';
  e._ret();
  verifie('flèche du parcours guidé : l\'assistant', e.currentPage === 'assistant', e.currentPage);
  e._ret();
  verifie('flèche de l\'assistant : l\'agenda', e.currentPage === 'calendar', e.currentPage);
  // menu → assistant depuis les messages : la flèche ramène aux messages, plus à l'agenda
  const g = contexte('calendar');
  va(g, 'messages', 'assistant');
  g._ret();
  verifie('assistant ouvert depuis les messages : la flèche ramène aux messages (avant : toujours l\'agenda)', g.currentPage === 'messages', g.currentPage);
  // cgu depuis le menu du compte, ouvert depuis les contacts
  const h = contexte('calendar');
  va(h, 'contacts', 'privacy');
  h._ret();
  verifie('politique de confidentialité ouverte depuis les contacts : retour aux contacts (avant : l\'agenda)', h.currentPage === 'contacts', h.currentPage);
}

titre('Toutes les flèches du fichier');
const arrows = [...page.matchAll(/class="back-btn"\s+onclick="([^"]+)"/g)].map((m) => m[1]);
verifie('les flèches sont trouvées (13)', arrows.length === 13, arrows.length);
const auth = arrows.filter((a) => /^navigateAuth\(/.test(a));
const autres = arrows.filter((a) => !/^navigateAuth\(/.test(a));
verifie('6 écrans d\'authentification gardent leur point de départ fixe (parcours linéaire avant la connexion)', auth.length === 6, auth.join(' '));
const permis = ['tcRetour()', 'tcRetourImport()', 'tcRetourDepuisConversation()', 'closeLegalPage()'];
verifie('toutes les autres passent par une fonction de retour (jamais navigate(\'…\') en dur)', autres.length === 7 && autres.every((a) => permis.includes(a)), autres.join(' | '));
verifie('aucune flèche (ni son dessin) ne fait navigate(\'…\') en dur', !/class="back-btn"\s+onclick="navigate\(/.test(page));
// toute flèche dessinée à la main (le même dessin SVG), classe ou non
const dessins = [...page.matchAll(/<button[^>]*onclick="([^"]+)"[^>]*>\s*<svg viewBox="0 0 24 24"><path d="M20 11H7\.83/g)].map((m) => m[1]);
verifie('toutes les flèches dessinées (même sans classe) sont couvertes', dessins.length >= 13 && dessins.every((a) => /^navigateAuth\(/.test(a) || permis.includes(a)), dessins.filter((a) => !/^navigateAuth\(/.test(a) && !permis.includes(a)).join(' | '));
const annule = page.indexOf('validateAgendaChecklist()');
verifie('le bouton « Annuler » du parcours guidé revient en arrière aussi', /onclick="tcRetour\(\)" style="width:100%; padding:10px; background:transparent;/.test(page));

titre('Les cas particuliers');
const legale = fonction('closeLegalPage') || '';
verifie('pages légales : hors authentification, retour à l\'écran d\'où l\'on vient', /else \{[\s\S]*tcRetour\(\);[\s\S]*\}/.test(legale) && !/navigate\(legalReturnTo\)/.test(legale));
verifie('pages légales : depuis l\'authentification, on revient à l\'écran d\'authentification (point fixe)', /legalReturnIsAuth[\s\S]*page-' \+ legalReturnTo/.test(legale));
verifie('la conversation garde sa fonction (la fiche contact reste l\'origine)', /function tcRetourDepuisConversation\(\)/.test(page) && /_convOrigine/.test(fonction('tcRetourDepuisConversation') || ''));
verifie('le retour de l\'import recule d\'une étape puis appelle tcRetour()', /tcRetour\(\);\s*\}/.test(fonction('tcRetourImport') || ''));
verifie('le parcours guidé et l\'agenda isolé contournent navigate() : ils retiennent l\'écran quitté',
  /tcNoterDepart\('charly-quiz'\);\s*currentPage = 'charly-quiz';/.test(page) && /tcNoterDepart\('calendar'\);\s*currentPage = 'calendar';/.test(page));
verifie('navigate() retient l\'écran quitté avant de changer de page', /tcNoterDepart\(page\);\s*currentPage = page;/.test(page));
verifie('l\'ancienne mémoire à un seul cran n\'est plus la seule : plus de navigate(_tcPagePrecedente)', !/navigate\(_tcPagePrecedente/.test(page));
verifie('aucune clé de stockage, aucun réglage nouveau', !/localStorage[^;]*_tcPileEcrans/.test(page));

console.log('');
console.log(ko ? ko + ' anomalie(s).' : 'Tout est bon.');
process.exit(ko ? 1 : 0);
