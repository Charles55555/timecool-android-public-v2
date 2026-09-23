// La page Configuration IA ne doit plus rien affirmer de faux.
//
// Chaque phrase retiree ici avait ete verifiee : soit contredite par le
// code lui-meme, soit par le serveur. Ce test empeche qu'elles
// reviennent par un copier-coller.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

// ── Ce qui ne doit plus s'y trouver ────────────────────────────────
const bannies = [
  ['proxy backend en production',
   "l'API autorise l'appel direct depuis un navigateur"],
  ['En test local (file:///) elle fonctionnera',
   'la version web fonctionne aussi'],
  ['CORS probable en prod',
   'mauvais diagnostic : envoyait chercher la panne ailleurs'],
  ['localement sur cet appareil uniquement',
   'les cles sont aussi sur le serveur'],
  ['elles seront stockées côté serveur',
   "ce n'est plus un projet, c'est en place"],
  ['fichier sécurisé',
   'un .json en clair, ce que la page dit elle-meme plus bas'],
  ['À chaque nouvelle version de TimeCool, importe ce fichier',
   'les cles reviennent seules'],
];

console.log('\n── Affirmations retirees ──');
bannies.forEach(([phrase, pourquoi]) => {
  verifie('« ' + phrase + ' »', html.indexOf(phrase) < 0, pourquoi);
});

// ── Ce qui doit s'y trouver a la place ─────────────────────────────
console.log('\n── Ce que la page dit maintenant ──');
const attendues = [
  ['rattachées à ton compte', 'ou sont vraiment les cles'],
  ['Appels API depuis cet appareil', 'le compteur est local'],
  ['❌ Test impossible : ', 'le test dit ce qui a echoue'],
  ["Clé Anthropic refusée", 'la cle n est mise en cause que sur un 401'],
];
attendues.forEach(([phrase, role]) => {
  verifie('« ' + phrase + ' »', html.indexOf(phrase) >= 0, role);
});

// ── Le code, lui, envoie bien l'en-tete qui rend l'appel possible ──
console.log('\n── Coherence avec le code ──');
const nb = (html.match(/anthropic-dangerous-direct-browser-access/g) || []).length;
verifie('l en-tete d acces direct est envoye (appel + test)', nb === 2, nb + ' fois');
verifie('la cle n est jugee que sur un 401', /resp\.status === 401/.test(html));

// ── Le plafond de jetons ───────────────────────────────────────────
console.log('\n── Plafond de jetons ──');
verifie('la valeur est dans le code, en un seul endroit',
  (html.match(/const TC_IA_JETONS_MAX = (\d+);/) || [])[1] >= 4000,
  (html.match(/const TC_IA_JETONS_MAX = (\d+);/) || [])[1]);
verifie('les deux appels IA s en servent',
  (html.match(/max_tokens: TC_IA_JETONS_MAX/g) || []).length === 2);
verifie('plus aucun appel ne lit un reglage',
  !/max_tokens: charlyIA\.config\.maxLength/.test(html));
verifie('le reglage a quitte la configuration par defaut',
  !/^\s*maxLength: \d+,$/m.test(html));
verifie('le message ne renvoie plus vers un champ inexistant',
  html.indexOf('augmente « longueur maximale »') < 0);
verifie('la fonction morte a disparu',
  html.indexOf('function saveAIConfigForm()') < 0);

// ── Les cles ne voyagent plus en clair ─────────────────────────────
console.log('\n── Les clés API ──');
verifie('elles ne partent plus dans le bloc de réglages',
  /'timecool_api_keys'\s*\n\];/.test(html)
  || /TC_SYNC_DEJA_SYNCHRONISE[\s\S]{0,1400}'timecool_api_keys'/.test(html),
  'le bloc les transportait sans chiffrement');
verifie('la route chiffrée les rapporte quand même',
  /tcRecupererClesDuServeur\(\)/.test(html)
  && /lireCleApi\(/.test(html),
  'sinon un nouvel appareil se retrouverait sans clés');
verifie('elles repartent aussi vers le serveur',
  /tcPousserClesVersServeur\(\)/.test(html));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
