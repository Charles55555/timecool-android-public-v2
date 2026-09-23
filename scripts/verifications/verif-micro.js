// La dictee doit dire ce qui ne va pas ET le geste qui debloque.
// Un code brut comme « not-allowed » ne sert a personne, et une
// autorisation refusee une fois n'est jamais redemandee d'elle-meme :
// sans le geste, l'utilisateur reste bloque pour de bon.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const d = html.indexOf('function tcMessageErreurMicro(');
const f = html.indexOf('/** Appelee par MainActivity quand Android refuse le micro. */');
if (d < 0 || f < d) { console.log('ERREUR: fonction introuvable'); process.exit(1); }

const ctx = {};
vm.createContext(ctx);
vm.runInContext(html.slice(d, f) + '\nglobalThis._m = tcMessageErreurMicro;', ctx);
const m = ctx._m;

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

console.log('\n── Chaque cas a sa phrase ──');
const cas = [
  ['not-allowed', /Autorisations/, 'le refus indique ou le lever'],
  ['service-not-allowed', /Autorisations/, 'meme geste'],
  ['audio-capture', /Aucun micro/, 'aucun materiel'],
  ['network', /Internet/, 'la dictee passe par le reseau'],
  ['no-speech', /rien entendu/, 'ce n est pas une panne'],
];
cas.forEach(([code, motif, role]) => {
  const msg = m(code);
  verifie(code.padEnd(22) + role, typeof msg === 'string' && motif.test(msg), msg);
});

console.log('\n── Ce qui ne doit rien afficher ──');
verifie('un arret volontaire reste silencieux', m('aborted') === null);

console.log('\n── Un code inconnu ne disparait pas ──');
const inconnu = m('quelque-chose-de-neuf');
verifie('il est repris tel quel, pas avale',
  typeof inconnu === 'string' && inconnu.indexOf('quelque-chose-de-neuf') >= 0, inconnu);

console.log('\n── Plus de code brut a l ecran ──');
verifie('« Erreur micro : » a disparu', html.indexOf('Erreur micro : ') < 0);
verifie('le refus cote Android a son message',
  /function tcMicroRefuse\(\)/.test(html));

console.log('\n── Erreurs venues d Android ──');
const d2 = html.indexOf('function tcMessageErreurDictee(');
const f2 = html.indexOf('/** Appelee par MainActivity quand Android refuse le micro. */');
const ctx2 = {};
vm.createContext(ctx2);
vm.runInContext(html.slice(d2, f2) + '\nglobalThis._d = tcMessageErreurDictee;', ctx2);
const dm = ctx2._d;
[
  ['permission', /Autorisations/, 'ou lever le refus'],
  ['indisponible', /pas de reconnaissance vocale/, 'aucun moteur installe'],
  ['rien-entendu', /rien entendu/, 'pas une panne'],
  ['reseau', /Internet/, ''],
  ['occupe', /autre application/, 'le micro est pris'],
].forEach(([code, motif, role]) => {
  const msg = dm(code);
  verifie(code.padEnd(16) + role, typeof msg === 'string' && motif.test(msg), msg);
});
verifie('un code inconnu est repris tel quel',
  dm('erreur-42').indexOf('erreur-42') >= 0);

console.log('\n── Le bouton ne peut plus clignoter dans le vide ──');
verifie('une borne existe',
  /const TC_DICTEE_ATTENTE_MAX = (\d+);/.test(html),
  (html.match(/const TC_DICTEE_ATTENTE_MAX = (\d+);/) || [])[1] + ' ms');
verifie('elle est repoussée quand la parole avance',
  (html.match(/tcDicteeArmerMinuteur\(\);\s*\/\/ la parole avance/g) || []).length === 2,
  'des deux cotes : natif et navigateur');
verifie('elle est désarmée à la fin',
  (html.match(/tcDicteeDesarmerMinuteur\(\)/g) || []).length >= 3);

console.log('\n── La dictee rend la main ──');
{
  // Le prefixe est un `let` du bloc : il faut l'ecrire DANS le contexte,
  // une variable lexicale n'etant pas une propriete de celui-ci.
  const d3 = html.indexOf('let _tcDicteeMinuteur = null;');
  const f3 = html.indexOf("/** L'application sait-elle transcrire elle-meme ? */");
  const champ = { value: '' };
  const c3 = {
    console, setTimeout, clearTimeout,
    document: { getElementById: (id) => (id === 'charlyInput' ? champ : null) },
    showToast: () => {},
    stopCharlyMic: () => {},
    charlyMicActive: false,
    window: {},
  };
  vm.createContext(c3);
  vm.runInContext(html.slice(d3, f3)
    + '\nglobalThis._t = tcDicteeTexte; globalThis._mem = tcDicteeMemoriserPrefixe;', c3);

  champ.value = '';
  c3._mem();
  verifie('champ vide : le texte dicte tel quel',
    c3._t('bonjour Charly') === 'bonjour Charly', c3._t('bonjour Charly'));

  champ.value = 'Rendez-vous jeudi';
  c3._mem();
  verifie('champ deja rempli : la voix s ajoute a la suite',
    c3._t('à 10 heures') === 'Rendez-vous jeudi à 10 heures',
    c3._t('à 10 heures'));

  champ.value = 'Rendez-vous jeudi ';
  c3._mem();
  verifie('pas de double espace au raccord',
    c3._t('à 10 heures') === 'Rendez-vous jeudi à 10 heures',
    JSON.stringify(c3._t('à 10 heures')));

  champ.value = 'Déjà écrit';
  c3._mem();
  verifie('rien de dit : l existant est intact',
    c3._t('') === 'Déjà écrit', c3._t(''));
}

verifie('la dictée n envoie plus toute seule',
  !/charlySendMessage\(\)[;,]?\s*\}, 200\)/.test(html)
  && html.indexOf('// Auto-envoi après dictée') < 0,
  'un silence suffisait a envoyer');
verifie('les deux voies rendent la main de la meme facon',
  (html.match(/tcDicteeRendreLaMain\(\);/g) || []).length === 2);
verifie('le clavier ne remonte pas sur un ecran tactile',
  /matchMedia\('\(pointer: fine\)'\)[\s\S]{0,120}if \(!souris\) return;/.test(html),
  'il recouvrait la page avant de pouvoir redicter');

console.log('\n── La voie native passe avant celle du web ──');
verifie('l application transcrit elle-meme quand elle le peut',
  html.indexOf('if (tcDicteeNativeDisponible()) {') <
  html.indexOf("if (!('webkitSpeechRecognition' in window)"));
verifie('la langue suit celle de l application',
  (html.match(/tcLangueDictee\(\)/g) || []).length === 3,
  'definition + appel natif + navigateur');
verifie('plus de francais code en dur', html.indexOf("charlyRecognition.lang = 'fr-FR'") < 0);

console.log('\n── Cote application Android ──');
const java = fs.readFileSync(process.argv[3], 'utf8');
const manifeste = fs.readFileSync(process.argv[4], 'utf8');
verifie('la permission audio est declaree',
  /android\.permission\.RECORD_AUDIO/.test(manifeste));
verifie('la WebView accepte la demande de micro',
  /RESOURCE_AUDIO_CAPTURE/.test(java));
verifie('elle repond aussi sur refus',
  /requeteMicroEnAttente\.deny\(\)/.test(java),
  'sinon la page attendrait un micro qui ne vient jamais');
verifie('la permission Android est demandee',
  /RECORD_AUDIO[\s\S]{0,80}REQ_MICRO/.test(java));

console.log('\n── La dictee native ──');
verifie('le pont l expose', /public boolean dicteeDisponible\(\)/.test(java));
verifie('elle demarre et s arrete', /public void demarrerDictee\(/.test(java)
  && /public void arreterDictee\(\)/.test(java));
verifie('elle vit sur le thread principal',
  /demarrerDictee\(final String langue\)[\s\S]{0,200}runOnUiThread/.test(java),
  'SpeechRecognizer l exige, creation comprise');
verifie('le texte partiel remonte au fil de la parole',
  /tcDicteePartielle/.test(java) && /EXTRA_PARTIAL_RESULTS/.test(java));
verifie('toute fin remonte, erreur comprise',
  /tcDicteeFinale/.test(java) && /tcDicteeErreur/.test(java),
  'sinon le bouton clignoterait a nouveau sans fin');
verifie('le micro est rendu en quittant',
  /onDestroy\(\)[\s\S]{0,200}arreterDicteeInterne\(\)/.test(java));
verifie('la page repond aux trois rappels',
  /function tcDicteePartielle\(/.test(html)
  && /function tcDicteeFinale\(/.test(html)
  && /function tcDicteeErreur\(/.test(html));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
