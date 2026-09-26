// Le cache de prompt peut-il vraiment se declencher ?
//
// Il ne se declenche que si le debut du prompt est identique au
// caractere pres d'un appel a l'autre. Une erreur ici ne casse rien
// de visible : les reponses restent bonnes, la facture monte. Et un
// cache rate coute PLUS cher qu'un appel sans cache, l'ecriture etant
// facturee au-dessus du tarif d'entree.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  const asy = page.indexOf('async function ' + nom + '(');
  const debut = asy > -1 ? asy : page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

const ctx = { console, JSON, String, charlyIA: {}, localStorage: { setItem() {} } };
vm.createContext(ctx);
['tcSystemeAnthropic', 'tcNoterUsageIA'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Le decoupage du prompt systeme');
{
  const regles = 'REGLES DE CHARLY, CAS 1 a 16.';
  const variable = 'Heure actuelle : 14h03\nAgenda : dentiste mardi';
  const blocs = ctx.tcSystemeAnthropic({ role: 'system', content: regles, volatil: variable });

  verifie('le prompt part en deux blocs', Array.isArray(blocs) && blocs.length === 2,
    Array.isArray(blocs) ? blocs.length + ' bloc(s)' : typeof blocs);
  verifie('les regles viennent en premier', blocs[0].text === regles,
    'placees derriere la date, elles ne seraient jamais mises en cache');
  verifie('et portent la marque de cache',
    blocs[0].cache_control && blocs[0].cache_control.type === 'ephemeral');
  verifie('la partie changeante vient apres', blocs[1].text === variable);
  verifie('et ne porte aucune marque', !blocs[1].cache_control,
    'marquee, elle ferait rater le cache a chaque minute');
  verifie('les deux blocs sont du texte',
    blocs.every((b) => b.type === 'text'));
}

titre('Ce qui changerait a chaque appel reste dehors');
{
  // La partie stable ne doit contenir ni heure, ni agenda : ce sont
  // elles qui faisaient rater le cache.
  const site = page.indexOf('volatil: dateContext');
  verifie('date et agenda sont dans la partie volatile', site > -1);
  verifie('et les regles dans la partie stable',
    /content: tcPromptSysteme\(\) \+ tcLangInstruction\(\)/.test(page),
    'tcPromptSysteme ne depend ni de l heure ni de l agenda');
  verifie('plus aucun prompt ne melange les deux',
    page.indexOf("tcPromptSysteme() + '\\n\\n' + dateContext") === -1,
    'un seul bloc melange ratait le cache a chaque minute');
}

titre('Sans partie volatile, rien ne casse');
{
  const seul = ctx.tcSystemeAnthropic({ role: 'system', content: 'Regles.' });
  verifie('un seul bloc, marque', seul.length === 1 && !!seul[0].cache_control);
  const rien = ctx.tcSystemeAnthropic(null);
  verifie('et sans message systeme, un repli existe',
    rien.length === 1 && rien[0].text.indexOf('Charly') > -1, rien[0].text);
}

titre('OpenAI recolle les deux morceaux');
{
  const bout = page.slice(page.indexOf('messages: messages.map(function (m) {'), page.indexOf('max_tokens: TC_IA_JETONS_MAX', page.indexOf('messages: messages.map')));
  verifie('le recollage existe', bout.length > 0);
  verifie('et il utilise bien les deux parties',
    bout.indexOf('m.content') > -1 && bout.indexOf('m.volatil') > -1,
    'sans lui, OpenAI perdrait la date et l agenda');
}

titre('On peut verifier que le cache a servi');
{
  ctx.tcNoterUsageIA({
    input_tokens: 12, cache_creation_input_tokens: 0,
    cache_read_input_tokens: 4200, output_tokens: 80
  });
  verifie('les jetons lus en cache sont retenus',
    ctx.charlyIA.dernierUsage.cacheLu === 4200,
    'c est le seul chiffre qui prouve que le cache a servi');
  verifie('l ecriture du cache aussi',
    ctx.tcNoterUsageIA({ cache_creation_input_tokens: 4200 }) === undefined
    && ctx.charlyIA.dernierUsage.cacheEcrit === 4200);
  verifie('une reponse sans compteur ne casse rien',
    (ctx.tcNoterUsageIA(null), true));
  verifie('et le chiffre s affiche dans les statistiques',
    page.indexOf('cache lu :') > -1,
    'sinon il faudrait ouvrir la console pour le savoir');
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
