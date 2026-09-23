// Le pont iPhone répond-il à ce que la page demande ?
//
// Sans Mac, rien ici ne peut être compilé ni exécuté. Mais le contrat
// entre la page et le téléphone, lui, se vérifie : la page appelle des
// méthodes précises et attend des fonctions précises en retour. Une
// seule qui manque, et une fonction entière se tait sans rien dire —
// c'est exactement ce qui est arrivé au micro sur Android.
//
// Ce test compare les deux côtés, et n'a besoin de personne.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');   // index.html
const pont = fs.readFileSync(process.argv[3], 'utf8');   // ios/TimeCool/pont.js
const vue  = fs.readFileSync(process.argv[4], 'utf8');   // ios/TimeCool/VueWeb.swift

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

/* ── Le pont, exécuté pour de vrai ───────────────────────────────── */
const messages = [];
const ctx = {
  console,
  JSON,
  Object,
  String,
  window: {
    __tcEtatNatif: {
      version: '1.0.0', buildTime: '1',
      biometrie: true, notifications: false
    },
    webkit: {
      messageHandlers: {
        timecool: { postMessage: (m) => messages.push(m) }
      }
    }
  }
};
ctx.globalThis = ctx.window;
vm.createContext(ctx);
vm.runInContext(pont, ctx);
const natif = ctx.window.TimeCoolNatif;

console.log('\n── Les réponses immédiates ──');
verifie('la page sait qu elle est dans l application', natif.estNatif() === true);
{
  const infos = JSON.parse(natif.obtenirInfosVersion());
  verifie('la version est rendue tout de suite', infos.version === '1.0.0',
    JSON.stringify(infos));
}
verifie('Face ID : réponse immédiate', natif.biometrieDisponible() === true);
verifie('notifications : refusées au départ', natif.notificationsAutorisees() === false);

console.log('\n── Et elles se mettent à jour ──');
ctx.window.tcNatifMaj({ notifications: true });
verifie('une autorisation accordée est prise en compte',
  natif.notificationsAutorisees() === true,
  'sinon la page croirait toujours qu elle est refusée');

console.log('\n── Les actions partent bien vers l application ──');
messages.length = 0;
natif.programmerRappels('[{"id":1,"quand":0,"titre":"a","texte":"b"}]', true);
natif.annulerRappels();
natif.activerBiometrie('jeton-de-session');
natif.deverrouillerBiometrie();
natif.desactiverBiometrie();
natif.demanderPermissionNotifications();
const actions = messages.map((m) => m.action);
[['programmerRappels', 'les rappels partent'],
 ['annulerRappels', 'et s annulent'],
 ['activerBiometrie', 'Face ID s active'],
 ['deverrouillerBiometrie', 'et déverrouille'],
 ['desactiverBiometrie', 'et se coupe'],
 ['demanderPermissionNotifications', 'la permission se demande'],
].forEach(([a, quoi]) => verifie(quoi, actions.indexOf(a) >= 0, a));

verifie('le jeton voyage avec la demande',
  messages.some((m) => m.jeton === 'jeton-de-session'));

/* ── Le contrat, des deux côtés ──────────────────────────────────── */
console.log('\n── Rien de ce que la page appelle ne manque ──');
{
  // Ce que la page appelle réellement sur le pont.
  const appelees = [...new Set(
    (page.match(/TimeCoolNatif\.([a-zA-Z]+)/g) || [])
      .map((s) => s.split('.')[1]))].sort();

  // Ce que la version iPhone fournit — volontairement partiel : ce qui
  // n'y est pas fait retomber la page sur son comportement de
  // navigateur, et c'est le bon comportement.
  const fournies = Object.keys(natif);
  const horsPortee = ['telechargerEtInstallerMaj', 'ecrireFichierTelechargement',
                      'connexionGoogle', 'enregistrerIdentifiants',
                      'dicteeDisponible', 'demarrerDictee', 'arreterDictee'];

  const manquantes = appelees.filter(
    (m) => fournies.indexOf(m) < 0 && horsPortee.indexOf(m) < 0);
  verifie('aucune méthode attendue n est absente',
    manquantes.length === 0,
    manquantes.length ? manquantes.join(', ') : appelees.length + ' méthodes passées en revue');

  // Une méthode hors portée ne doit surtout PAS être déclarée : la page
  // teste son existence avant d'appeler, et la déclarer sans la faire
  // reviendrait à promettre une fonction qui ne répond pas.
  const promisesEnTrop = horsPortee.filter((m) => fournies.indexOf(m) >= 0);
  verifie('rien n est promis sans être fait',
    promisesEnTrop.length === 0,
    promisesEnTrop.length ? promisesEnTrop.join(', ') : 'la page retombe sur le web');
}

console.log('\n── Ce que l application rappelle dans la page existe ──');
{
  const rappelees = [...new Set(
    (vue.match(/appelerJs\("([a-zA-Z]+)"/g) || [])
      .map((s) => s.match(/"([a-zA-Z]+)"/)[1]))].sort();
  rappelees.forEach((f) => {
    verifie(f, new RegExp('function ' + f + '\\s*\\(').test(page),
      'appelée par l application');
  });
}

console.log('\n── Chaque message envoyé est traité côté Apple ──');
{
  const envoyees = [...new Set(
    (pont.match(/envoyer\('([a-zA-Z]+)'/g) || [])
      .map((s) => s.match(/'([a-zA-Z]+)'/)[1]))].sort();
  envoyees.forEach((a) => {
    verifie(a, new RegExp('case "' + a + '"').test(vue),
      'reçu par VueWeb.swift');
  });
}

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
