// Ce qu'il faut à un gestionnaire de mots de passe pour proposer
// d'enregistrer : un vrai formulaire, des attributs qui nomment les
// champs, et un bouton d'envoi. Sans l'un des trois, il ne propose rien.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(50)} ${detail || ''}`);
};

function formulaire(id) {
  const i = html.indexOf('<form id="' + id + '"');
  if (i < 0) return null;
  const j = html.indexOf('</form>', i);
  return j < 0 ? null : html.slice(i, j);
}

function champ(bloc, id) {
  const m = bloc && bloc.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'));
  return m ? m[0] : null;
}

['loginForm', 'signupForm'].forEach((id) => {
  const f = formulaire(id);
  dire(!!f, id + ' : le formulaire existe',
    f ? '' : 'sans <form>, aucun gestionnaire ne propose rien');
  if (!f) return;

  dire(/onsubmit="[^"]*preventDefault/.test(f),
    id + ' : l envoi est intercepté', 'la page ne doit pas se recharger');
  dire(/<button[^>]*type="submit"/.test(f), id + ' : un bouton d envoi',
    'c est lui qui déclenche la proposition');

  // Un <button> sans type vaut « envoyer » dans un formulaire : il
  // déclencherait une connexion ou une inscription au moindre clic.
  const nus = (f.match(/<button(?![^>]*\btype=)[^>]*>/g) || []);
  dire(nus.length === 0, id + ' : aucun bouton sans type',
    nus.length ? nus[0].slice(0, 60) : 'aucun clic parasite');
});

console.log('\nChaque champ dit ce qu il contient :');
const attendus = [
  ['loginForm', 'loginEmail', 'username', 'identifiant de connexion'],
  ['loginForm', 'loginPassword', 'current-password', 'mot de passe existant'],
  ['signupForm', 'signupEmail', 'username', 'identifiant à créer'],
  ['signupForm', 'signupPassword', 'new-password', 'nouveau mot de passe'],
  ['signupForm', 'signupFirstname', 'given-name', 'prénom'],
  ['signupForm', 'signupLastname', 'family-name', 'nom'],
  ['signupForm', 'signupPhone', 'tel-national', 'téléphone'],
  ['signupForm', 'signupZip', 'postal-code', 'code postal'],
  ['signupForm', 'signupCity', 'address-level2', 'ville'],
];
attendus.forEach(([form, id, valeur, quoi]) => {
  const c = champ(formulaire(form), id);
  dire(!!c && c.includes('autocomplete="' + valeur + '"'), id, quoi + ' → ' + valeur);
  dire(!!c && /\bname="/.test(c), id + ' porte un name', 'indice supplémentaire');
});

console.log('\nCe qui doit rester HORS du formulaire de connexion :');
const login = formulaire('loginForm');
dire(!/signInWithGoogle/.test(login), 'le bouton Google',
  'dans le formulaire, il vaudrait « envoyer »');
dire(!/openDevicePairing/.test(login), 'la liaison depuis le téléphone');
dire(!/biometrieLoginZone/.test(login), 'le déverrouillage biométrique');

console.log('\nLa proposition d enregistrement :');
const fn = html.slice(html.indexOf('function tcProposerEnregistrementIdentifiants'),
  html.indexOf('function tcProposerEnregistrementIdentifiants') + 900);
dire(/TimeCoolNatif/.test(fn) && /tcOfferPasswordSave/.test(fn),
  'les deux chemins sont dans la même fonction', 'natif Android, et navigateur');
const appels = (html.match(/tcProposerEnregistrementIdentifiants\(/g) || []).length;
dire(appels >= 3, 'appelée à l inscription ET à la connexion',
  (appels - 1) + ' appel(s) + la définition');
dire(!/_tcIdentifiantsSaisis/.test(html), 'aucune variable morte laissée derrière');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
