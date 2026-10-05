// Propositions d'adresses pendant la frappe (Google Places Autocomplete) :
// jamais avant 3 lettres, jamais sans pause de frappe, jamais sans clé ;
// toucher une proposition remplit le champ. Charles, 05/10.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ') : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
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

/* Un DOM de poche : assez pour un champ, une liste, des lignes. */
function elementFactice() {
  // style.cssText = 'display:none; …' doit se lire ensuite dans style.display, comme dans un vrai navigateur.
  const style = {};
  Object.defineProperty(style, 'cssText', { get() { return ''; }, set(v) { const m = String(v).match(/display:\s*([a-z]+)/); if (m) style.display = m[1]; } });
  const el = {
    style: style, className: '', value: '', _html: '', children: [], listeners: {}, nextSibling: null,
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    fire(t, ev) { (this.listeners[t] || []).forEach((f) => f(ev || { preventDefault() {} })); }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = v; const n = (v.match(/data-i="/g) || []).length; this.children = []; for (let i = 0; i < n; i++) this.children.push(elementFactice()); }
  });
  return el;
}

const trace = { fetchs: [], inseres: [], choix: [] };
let cle = 'AIza-test';
let reponse = { ok: true, json: async () => ({ suggestions: [
  { placePrediction: { text: { text: '12 Rue de la Paix, 75002 Paris, France' }, structuredFormat: { mainText: { text: '12 Rue de la Paix' }, secondaryText: { text: '75002 Paris, France' } } } },
  { placePrediction: { text: { text: 'Cabinet Dr Martin, 12 Rue de la Paix, Lyon' }, structuredFormat: { mainText: { text: 'Cabinet Dr Martin' }, secondaryText: { text: '12 Rue de la Paix, Lyon' } } } },
  { placePrediction: { text: { text: 'A' } } }, { placePrediction: { text: { text: 'B' } } }, { placePrediction: { text: { text: 'C' } } }, { placePrediction: { text: { text: 'D (sixième, de trop)' } } }
] }) };
const minuteries = [];
const ctx = {
  console,
  localStorage: { getItem: () => JSON.stringify({ gmaps: cle }) },
  fetch: async (url, o) => { trace.fetchs.push({ url, body: JSON.parse(o.body), cle: o.headers['X-Goog-Api-Key'] }); return reponse; },
  escapeHTMLSafe: (t) => String(t),
  setTimeout: (f, ms) => { const id = minuteries.length + 1; minuteries.push({ id, f, ms, actif: true }); return id; },
  clearTimeout: (id) => { const m = minuteries.find((x) => x.id === id); if (m) m.actif = false; },
  document: { createElement: () => elementFactice(), getElementById: () => null },
  window: { addEventListener() {} },
  crypto: { randomUUID: () => 'jeton-' + (trace.jetons = (trace.jetons || 0) + 1) },
  _tcTrajetEtapes: null
};
vm.createContext(ctx);
['tcCleGoogle', 'tcSuggestionsLieu', 'tcJetonSession', 'tcAutocompleterLieu'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const tick = async () => { const a = minuteries.filter((m) => m.actif); minuteries.length = 0; a.forEach((m) => m.f()); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); };

(async () => {
  titre('L appel a Google');
  let props = await ctx.tcSuggestionsLieu('12 rue de la paix', 'jeton-x');
  verifie('un appel, avec la cle, la saisie, le francais et le jeton de session', trace.fetchs.length === 1 && trace.fetchs[0].cle === 'AIza-test' && trace.fetchs[0].body.input === '12 rue de la paix' && trace.fetchs[0].body.languageCode === 'fr' && trace.fetchs[0].body.sessionToken === 'jeton-x', JSON.stringify(trace.fetchs[0]));
  verifie('a l adresse d autocompletion de Places', /places\.googleapis\.com\/v1\/places:autocomplete/.test(trace.fetchs[0].url));
  verifie('cinq propositions au plus, texte complet + principal + secondaire', props.length === 5 && props[0].texte === '12 Rue de la Paix, 75002 Paris, France' && props[0].principal === '12 Rue de la Paix' && props[0].secondaire === '75002 Paris, France' && props[1].principal === 'Cabinet Dr Martin', JSON.stringify(props[0]));
  verifie('sans format detaille : le texte sert de principal', props[2].principal === 'A' && props[2].secondaire === '');
  trace.fetchs = [];
  props = await ctx.tcSuggestionsLieu('12', 'j');
  verifie('moins de 3 lettres : aucun appel', trace.fetchs.length === 0 && props.length === 0);
  cle = '';
  props = await ctx.tcSuggestionsLieu('12 rue', 'j');
  verifie('sans cle Google : aucun appel, rien', trace.fetchs.length === 0 && props.length === 0);
  cle = 'AIza-test';
  reponse = { ok: false, status: 403, json: async () => ({}) };
  props = await ctx.tcSuggestionsLieu('12 rue', 'j');
  verifie('Google refuse : rien, sans erreur', props.length === 0);
  reponse = { ok: true, json: async () => ({}) };
  props = await ctx.tcSuggestionsLieu('12 rue', 'j');
  verifie('Google n a rien : rien', props.length === 0);

  titre('Sous le champ : la pause de frappe, la liste, le choix');
  reponse = { ok: true, json: async () => ({ suggestions: [
    { placePrediction: { text: { text: '12 Rue de la Paix, 75002 Paris, France' }, structuredFormat: { mainText: { text: '12 Rue de la Paix' }, secondaryText: { text: '75002 Paris' } } } },
    { placePrediction: { text: { text: 'Cabinet Dr Martin, Lyon' } } }
  ] }) };
  trace.fetchs = [];
  const champ = elementFactice();
  const parent = { enfants: [], insertBefore(el, avant) { this.enfants.push([el, avant]); } };
  champ.parentNode = parent;
  ctx.tcAutocompleterLieu(champ, { auChoix: (p) => trace.choix.push(p) });
  verifie('la liste est posee juste sous le champ, cachee', parent.enfants.length === 1 && parent.enfants[0][0].style.display === 'none');
  const liste = parent.enfants[0][0];
  champ.value = '12'; champ.fire('input');
  verifie('2 lettres : rien ne part, aucune minuterie', minuteries.filter((m) => m.actif).length === 0 && trace.fetchs.length === 0);
  champ.value = '12 r'; champ.fire('input');
  champ.value = '12 ru'; champ.fire('input');
  verifie('chaque lettre repousse la pause : une seule minuterie active, de 300 ms', minuteries.filter((m) => m.actif).length === 1 && minuteries.filter((m) => m.actif)[0].ms === 300);
  verifie('et rien n est encore parti', trace.fetchs.length === 0);
  await tick();
  verifie('apres la pause : un seul appel, avec la derniere saisie', trace.fetchs.length === 1 && trace.fetchs[0].body.input === '12 ru', JSON.stringify(trace.fetchs.map((f) => f.body.input)));
  verifie('la liste apparait avec 2 lignes', liste.style.display === 'block' && liste.children.length === 2 && /12 Rue de la Paix/.test(liste.innerHTML) && /75002 Paris/.test(liste.innerHTML));
  const jeton1 = trace.fetchs[0].body.sessionToken;
  champ.value = '12 rue'; champ.fire('input'); await tick();
  verifie('la lettre suivante garde le meme jeton de session', trace.fetchs.length === 2 && trace.fetchs[1].body.sessionToken === jeton1 && !!jeton1);
  liste.children[1].fire('click');
  verifie('toucher une ligne remplit le champ avec le texte complet', champ.value === 'Cabinet Dr Martin, Lyon');
  verifie('la liste se ferme, et le choix est signale', liste.style.display === 'none' && trace.choix.length === 1 && trace.choix[0].texte === 'Cabinet Dr Martin, Lyon');
  champ.value = 'Cab'; champ.fire('input'); await tick();
  verifie('la saisie suivante ouvre une nouvelle session', trace.fetchs.length === 3 && trace.fetchs[2].body.sessionToken !== jeton1);
  champ.value = 'Cabi'; champ.fire('input');
  champ.value = 'Ca'; champ.fire('input');
  verifie('revenir sous 3 lettres annule la minuterie et cache la liste', minuteries.filter((m) => m.actif).length === 0 && liste.style.display === 'none');
  champ.value = 'Cabin'; champ.fire('input'); await tick();
  verifie('(la liste se rouvre)', liste.style.display === 'block');
  champ.fire('blur'); await tick();
  verifie('quitter le champ ferme la liste', liste.style.display === 'none');
  champ.value = 'Cabinet Dr'; champ.fire('input');
  const n0 = trace.fetchs.length;
  champ.value = 'Cabinet Dr M';
  await tick();
  verifie('une reponse en retard (le texte a change) n est pas affichee', trace.fetchs.length === n0 + 1 && liste.style.display === 'none');
  ctx.tcAutocompleterLieu(champ, {});
  verifie('brancher deux fois ne pose qu une liste', parent.enfants.length === 1);

  titre('Seulement quand c est utile (le chat)');
  const chat = elementFactice(); chat.parentNode = parent;
  let actif = false;
  ctx.tcAutocompleterLieu(chat, { actif: () => actif, conteneur: parent, avant: null });
  trace.fetchs = [];
  chat.value = '12 rue'; chat.fire('input'); await tick();
  verifie('Charly n attend pas d adresse : rien', trace.fetchs.length === 0);
  actif = true;
  chat.value = '12 rue'; chat.fire('input'); await tick();
  verifie('Charly attend une adresse : des propositions', trace.fetchs.length === 1);

  titre('Branche');
  verifie('le champ Lieu du rendez-vous', /tcAutocompleterLieu\(document\.getElementById\('editLieu'\)\);/.test(page));
  verifie('le chat, quand Charly attend le depart ou l arrivee d un trajet, et le choix envoie', /tcAutocompleterLieu\(champ, \{[\s\S]*?_tcTrajetEtapes\.depart === null \|\| _tcTrajetEtapes\.arrivee === null[\s\S]*?auChoix: function \(\) \{ charlySendMessage\(\); \}/.test(page));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
