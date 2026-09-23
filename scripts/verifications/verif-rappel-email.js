// Les rappels par email partent-ils une fois, au bon moment ?
//
// Trois erreurs seraient silencieuses : envoyer deux fois le meme
// rappel, laisser tomber celui d'un rendez-vous regle sur « aucun
// rappel », et ouvrir au monde entier une route censee ne repondre
// qu'au serveur.
const fs = require('fs');

const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

titre('La route ne repond qu au serveur');
verifie('elle existe', api.indexOf("case 'GET /taches/rappels':") > -1);
verifie('elle verifie qui appelle',
  api.indexOf("in_array($ip, ['127.0.0.1', '::1', '82.165.253.73'], true)") > -1);
verifie('et repond « inconnue » au reste du monde',
  api.indexOf("Rep::erreur(404, 'route_inconnue'") > -1,
  'inutile d annoncer que cette route existe');
verifie('aucun secret ecrit dans un fichier public',
  api.indexOf('TACHE_JETON') === -1 && api.indexOf('$_GET[\'secret\']') === -1);

titre('Un rappel ne part qu une fois');
verifie('la trace est ecrite avant l envoi',
  /INSERT INTO rappels_envoyes[\s\S]{0,400}rappelEnvoyerUn/.test(api),
  'ecrite apres, un email en echec serait renvoye chaque minute');
verifie('le doublon est bloque par la cle primaire',
  api.indexOf('PRIMARY KEY (compte_id, uid)') > -1);
verifie('un doublon passe sans bruit',
  /catch \(PDOException \$e\) \{\s*\n\s*continue;/.test(api));
verifie('changer de delai autorise un nouvel envoi',
  api.indexOf("$cle = $ligne['uid'] . '@' . $delai;") > -1,
  'sinon avancer un rappel deja envoye ne donnerait rien');

titre('La trace ne redescend pas sur les appareils');
verifie('elle a sa propre table',
  api.indexOf('CREATE TABLE IF NOT EXISTS rappels_envoyes') > -1);
verifie('et ne passe pas par elements',
  !/elementsPoser\([\s\S]{0,200}rappel_envoye/.test(api),
  'elle serait synchronisee sur tous les appareils pour rien');

titre('Qui recoit, et quand');
verifie('seuls les comptes qui l ont demande',
  api.indexOf("e.uid = 'tc_rappel_email'") > -1);
verifie('un compte clos est ecarte', api.indexOf('c.cloture_le IS NULL') > -1);
verifie('un compte sans email aussi', api.indexOf("c.email <> ''") > -1);
verifie('« aucun rappel » est respecte',
  api.indexOf('if ($delai <= 0) {') > -1,
  'un rendez-vous regle sur le silence ne doit pas envoyer d email');
verifie('le delai du rendez-vous prime sur celui du compte',
  api.indexOf("isset($rdv['rappel']) && is_int($rdv['rappel']) ? $rdv['rappel'] : $defaut") > -1);
verifie('la fenetre laisse deux minutes de retard',
  api.indexOf("modify('-2 minutes')") > -1,
  'une minute juste perdrait un rappel des que la tache traine');
{
  // La liste de reference est celle de l'application, pas une copie.
  const m = page.match(/const TC_DELAIS_RAPPEL = \[([\s\S]*?)\];/);
  const attendus = m ? (m[1].match(/minutes:\s*(\d+)/g) || [])
    .map((x) => parseInt(x.replace(/\D/g, ''), 10)) : [];
  const g = api.match(/in_array\(\$minutes, \[([^\]]*)\], true\) \? \$minutes : 60/);
  const acceptes = g ? g[1].split(',').map((x) => parseInt(x.trim(), 10)) : [];
  verifie('un delai abime retombe sur une heure', g !== null);
  verifie('le serveur accepte exactement les delais proposes',
    attendus.length > 0 && attendus.join() === acceptes.join(),
    'appli ' + attendus.join('/') + '  vs  serveur ' + acceptes.join('/')
      + ' - un delai connu de l un seul serait ignore sans rien dire');

  const cle = page.match(/TC_RAPPEL_DELAI_KEY = '([^']+)'/);
  verifie('et il lit la cle ou l application ecrit',
    cle !== null && api.indexOf("uid = '" + cle[1] + "'") > -1,
    cle ? cle[1] : 'cle introuvable');
}

titre('Un envoi rate n empeche pas les suivants');
verifie('chaque envoi est isole',
  /rappelEnvoyerUn\([\s\S]{0,120}catch \(Throwable \$e\)/.test(api));
verifie('et journalise', api.indexOf("error_log('rappel non envoye") > -1);

titre('Le reglage cote application');
verifie('l interrupteur existe', page.indexOf('function tcDefinirRappelEmail(') > -1);
verifie('il est enregistre sous une cle qui remonte au serveur',
  page.indexOf("TC_RAPPEL_EMAIL_CLE = 'tc_rappel_email'") > -1,
  'sans le prefixe tc_, le serveur ne le verrait jamais');
verifie('et la synchronisation est declenchee aussitot',
  /tcDefinirRappelEmail\(actif\) \{[\s\S]{0,300}tcSyncTour\(\)/.test(page),
  'sinon le serveur ignorerait le choix jusqu au prochain tour');
verifie('le texte dit d ou part l email',
  page.indexOf('part de nos serveurs') > -1);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
