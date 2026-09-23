// Le prompt de Charly IA doit venir du code, pas d'une copie gardée par
// l'appareil. C'est cette copie qui empêchait les corrections
// d'atteindre les téléphones déjà installés.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

const debutPrompt = html.indexOf('const TC_DEFAULT_SYSTEM_PROMPT = `');
const finPrompt = html.indexOf('`;', debutPrompt) + 2;
const source = html.slice(debutPrompt, finPrompt) + '\n'
  + html.slice(html.indexOf('/* Change de valeur à chaque fois'),
    html.indexOf('function saveDemarches()'))
  + '\nglobalThis._p = { defaut: TC_DEFAULT_SYSTEM_PROMPT, lire: tcPromptSysteme,'
  + ' perso: tcPromptPersonnalise, charger: loadCharlyIAConfig,'
  + ' version: TC_PROMPT_VERSION };';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(50)} ${detail || ''}`);
};

function appareil(stockInitial) {
  const stock = Object.assign({}, stockInitial);
  const ctx = {
    JSON, Object, String, console, parseInt,
    localStorage: {
      getItem: (k) => (k in stock ? stock[k] : null),
      setItem: (k, v) => { stock[k] = String(v); },
    },
    charlyIA: { config: { systemPrompt: null, claudeModel: 'claude-sonnet-5' }, callCount: 0 },
    demarches: [],
    tcMigrateClaudeModel: (m) => m,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  ctx.stock = stock;
  return ctx;
}

const VIEUX = 'Tu es Charly. Version périmée gardée par l appareil.';

console.log('Le prompt vient du code :');
const neuf = appareil({});
neuf._p.charger();
dire(neuf._p.lire() === neuf._p.defaut, 'appareil vierge : prompt du code');

console.log('\nUne copie périmée est jetée, une seule fois :');
const perime = appareil({
  timecool_ai_config: JSON.stringify({ systemPrompt: VIEUX }),
  timecool_prompt_version: 'v6.4',
});
perime._p.charger();
dire(perime._p.lire() === perime._p.defaut,
  'la copie périmée ne sert plus', 'c est ce qui bloquait les corrections');
dire(perime.stock.timecool_prompt_version === perime._p.version,
  'la version est notée', perime.stock.timecool_prompt_version);
dire(JSON.parse(perime.stock.timecool_ai_config).systemPrompt === null,
  'et elle est effacée du stockage', 'elle ne se propagera pas par la synchronisation');

console.log('\nUne modification volontaire, elle, est conservée :');
// La version est lue dans le code, jamais recopiee ici : ecrite en dur,
// ce cas casserait a chaque fois qu'on jette les copies figees, en
// laissant croire qu'une modification volontaire n'est plus gardee.
const perso = appareil({
  timecool_ai_config: JSON.stringify({ systemPrompt: 'Réponds toujours en vers.' }),
});
perso.stock.timecool_prompt_version = perso._p.version;
perso._p.charger();
dire(perso._p.lire() === 'Réponds toujours en vers.', 'le texte saisi à la main est gardé',
  perso._p.lire());

console.log('\nRecopier le défaut n est pas une modification :');
dire(neuf._p.perso(neuf._p.defaut) === null,
  'texte identique au défaut : aucune copie gardée',
  'sinon l appareil se figerait de nouveau');
dire(neuf._p.perso('   ') === null, 'texte vide : aucune copie non plus');
dire(neuf._p.perso('Sois bref.') === 'Sois bref.', 'un vrai texte est retenu');

console.log('\nLes règles corrigées sont bien dans le prompt du code :');
const p = neuf._p.defaut;
dire(p.includes('n’est PAS un conflit') || p.includes("n'est PAS un conflit"),
  'un autre RDV le même jour n est pas un conflit',
  'le cas signalé : 10h demandé, 15h existant');
dire(p.includes('se croisent réellement'), 'le chevauchement est défini par les horaires');
dire(p.includes('EST claire : tu l’exécutes') || p.includes("EST claire : tu l'exécutes"),
  'objet + jour + heure : on exécute, on ne demande pas');
dire(p.includes('SAUF quand tu viens'),
  'et on ne termine plus par une question après avoir agi');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
