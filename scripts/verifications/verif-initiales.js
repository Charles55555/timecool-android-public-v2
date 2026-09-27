// Les deux avatars montrent-ils la meme chose ?
//
// L'entete affichait CC, le menu AA, pour le meme compte. Cinq
// endroits ecrivaient cet avatar, chacun a sa facon. Une divergence
// pareille ne casse rien : elle fait simplement douter l'utilisateur
// de savoir sur quel compte il se trouve.
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
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

let avatar = { textContent: '' };
const ctx = {
  console, String,
  userAccount: null,
  document: { getElementById: (id) => (id === 'headerAvatar' ? avatar : null) }
};
vm.createContext(ctx);
['tcInitiales', 'tcMajAvatarEntete'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Les trois orthographes du meme compte');
{
  ctx.userAccount = { firstname: 'AdminCharly', lastname: 'AdminCharly' };
  verifie('firstname / lastname', ctx.tcInitiales() === 'AA', String(ctx.tcInitiales()));

  ctx.userAccount = { firstName: 'AdminCharly', lastName: 'AdminCharly' };
  verifie('firstName / lastName, ecrites par la connexion Google',
    ctx.tcInitiales() === 'AA', String(ctx.tcInitiales()));

  ctx.userAccount = { prenom: 'Charles', nom: 'Bernard' };
  verifie('prenom / nom, telles que les renvoie le serveur',
    ctx.tcInitiales() === 'CB', String(ctx.tcInitiales()));
}

titre('Quand le nom manque');
{
  ctx.userAccount = { firstname: 'Charles' };
  verifie('le prenom seul suffit', ctx.tcInitiales() === 'C', String(ctx.tcInitiales()));

  ctx.userAccount = { email: 'william@exemple.fr' };
  verifie('a defaut, la premiere lettre de l email',
    ctx.tcInitiales() === 'W', String(ctx.tcInitiales()));

  ctx.userAccount = {};
  verifie('et sans rien, on ne devine pas', ctx.tcInitiales() === null);
  ctx.userAccount = null;
  verifie('sans compte non plus', ctx.tcInitiales() === null);
}

titre('L entete suit le compte, jamais la demonstration');
{
  avatar = { textContent: 'JD' };
  ctx.userAccount = { firstname: 'AdminCharly', lastname: 'AdminCharly' };
  verifie('un compte connecte impose ses initiales',
    ctx.tcMajAvatarEntete() === true && avatar.textContent === 'AA',
    avatar.textContent);

  avatar = { textContent: 'JD' };
  ctx.userAccount = null;
  verifie('sans compte, l entete est laisse a l appelant',
    ctx.tcMajAvatarEntete() === false && avatar.textContent === 'JD',
    'c est lui qui decide de poser une valeur de demonstration');
}

titre('Plus personne ne calcule dans son coin');
{
  verifie('le menu compte passe par la source unique',
    /avatarEl\.textContent = tcInitiales\(\)/.test(page));
  verifie('la page Mon profil aussi',
    /const initiales = tcInitiales\(\)/.test(page));
  verifie('et le demarrage',
    page.indexOf('(userAccount.firstname[0] + userAccount.lastname[0])') === -1,
    'ce calcul plantait si le nom de famille manquait');

  // Les valeurs de demonstration restent, mais sous condition.
  const demos = page.match(/avatar\.textContent = (m==='user'\?'JD':'TM'|'JD'|p\.initials)/g) || [];
  const gardees = page.match(/if \(!tcMajAvatarEntete\(\)\) avatar\.textContent =/g) || [];
  verifie('chaque valeur de demonstration est conditionnee',
    demos.length === gardees.length && demos.length === 4,
    demos.length + ' valeur(s), ' + gardees.length + ' sous condition');
}

titre('La connexion Google ecrit ce que le reste sait lire');
{
  const bloc = page.slice(page.indexOf('  userAccount = {\n'), page.indexOf('loginMethod'));
  verifie('les deux orthographes sont ecrites',
    bloc.indexOf('firstname:') > -1 && bloc.indexOf('firstName:') > -1,
    'sinon Mon profil affichait des initiales vides apres Google');
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
