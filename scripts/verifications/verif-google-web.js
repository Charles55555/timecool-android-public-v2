// Connexion Google sur le site web (09/10) : meme jeton qu Android, verifie par
// le serveur. Le comportement a ete rejoue dans un vrai Chrome (sonde-google-web).
const fs = require('fs');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const racine = path.join(path.dirname(apiChemin), '..', '..');
const android = fs.readFileSync(path.join(racine, 'app/src/main/java/com/timecool/app/MainActivity.java'), 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 200) : '')); }
function fonction(texte, nom) {
  const d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const web = (page.match(/const TC_GOOGLE_CLIENT_ID_WEB = '([^']+)'/) || [])[1];
const natif = (android.match(/GOOGLE_CLIENT_ID =\s*"([^"]+)"/) || [])[1];
verifie('le client du site est CELUI d Android (meme audience, donc meme verification serveur)', !!web && web === natif, web + ' / ' + natif);
verifie('c est un identifiant Google plausible', /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(web || ''));
const entree = fonction(page, 'signInWithGoogle') || '';
verifie('dans un navigateur, « Continuer avec Google » ouvre le flux web, plus le message « application Android »', /tcConnexionGoogleWeb\(\);\s*\}$/.test(entree.trim()) && !/disponible dans l.application Android/.test(entree));
const w = fonction(page, 'tcConnexionGoogleWeb') || '';
verifie('page file:// ou Google absent : message clair, rien d autre', /location\.protocol === 'file:'/.test(w) && /typeof google === 'undefined'/.test(w));
verifie('Google est initialise avec le client du site', /google\.accounts\.id\.initialize\(\{\s+client_id: TC_GOOGLE_CLIENT_ID_WEB/.test(w));
verifie('le jeton rendu part au serveur par le chemin d Android (tcGoogleJeton), sans etre lu ici', /tcGoogleJeton\(reponse\.credential\)/.test(w) && !/tcDecodeGoogleJWT|completeGoogleSignIn/.test(w));
verifie('le bouton officiel est affiche', /tcShowGoogleFallbackButton\(\)/.test(w));
verifie('une reponse vide ne part pas au serveur', /if \(reponse && reponse\.credential\)/.test(w));
verifie('le serveur verifie bien l audience des jetons Google (inchange)', /Google::verifier\(\$idToken, \$audiences\)/.test(fs.readFileSync(apiChemin, 'utf8')));
console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
