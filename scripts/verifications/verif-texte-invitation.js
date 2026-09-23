// Le texte de l'invitation est celui que Charles a ecrit, mot pour mot.
// Il l'a dicte le 07/09 : personne ne doit le reformuler au passage.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const d = html.indexOf('function inviteContact(contactId) {');
const f = html.indexOf('function toggleContactMenu(');
if (d < 0 || f < d) { console.log('ERREUR: inviteContact introuvable'); process.exit(1); }

// La mise en forme du prenom vit ailleurs : on la joint, sinon la
// fonction testee s'executerait sans elle.
// Depuis tcLienSms : les aides d envoi vivent juste avant la mise en
// forme du prenom, et la fonction testee s en sert.
const dp = html.indexOf('function tcLienSms(');
const fp = html.indexOf('/** Aucune application pour ouvrir');
if (dp < 0 || fp < dp) { console.log('ERREUR: tcPrenomPresentable introuvable'); process.exit(1); }
const SOURCE = html.slice(dp, fp) + '\n' + html.slice(d, f);

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '\n      ' + detail : ''}`);
}

/** Rejoue inviteContact et rend l'adresse ouverte par le telephone. */
function invitation(contact) {
  let ouvert = null;
  const ctx = {
    contactsList: [contact],
    showToast: () => {},
    // Un Android : c'est le séparateur « ? » qu'attend ce cas.
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140' },
    encodeURIComponent,
    window: { get location() { return ctx._loc; } },
    console,
  };
  ctx._loc = { set href(v) { ouvert = v; }, get href() { return ouvert; } };
  vm.createContext(ctx);
  vm.runInContext(SOURCE + '\nglobalThis._i = inviteContact;', ctx);
  ctx._i(contact.id);
  return ouvert;
}

const lien = invitation({ id: '1', name: 'Julian Haddad', phone: '+33 6 07 78 65 12' });
const corps = decodeURIComponent((lien || '').split('?body=')[1] || '');

console.log('\n── Ce que le contact recevra ──');
console.log(corps.split('\n').map(l => '      ' + l).join('\n'));

console.log('\n── Mot pour mot ──');
[
  'Salut Julian,',
  "J'ai testé l'application gratuite TimeCool et je la trouve exceptionnelle.",
  'TimeCool est un agenda qui parle aux autres agendas pour simplifier la prise de rendez-vous, ou même la saisie d\'un rendez-vous grâce à Charly IA.',
  'Crois moi tu vas être surpris !',
  'Rejoins-moi sur TimeCool, on va optimiser notre temps : https://timecool.fr',
].forEach((ligne) => {
  verifie('« ' + ligne.slice(0, 46) + (ligne.length > 46 ? '…' : '') + ' »',
    corps.indexOf(ligne) >= 0);
});

console.log('\n── Le numero appele ──');
verifie('les espaces du numero sont retires',
  (lien || '').indexOf('sms:+33607786512?') === 0, lien && lien.split('?')[0]);

console.log('\n── Sans prenom connu ──');
const sansNom = invitation({ id: '2', name: '', phone: '0600000000' });
const corps2 = decodeURIComponent((sansNom || '').split('?body=')[1] || '');
verifie('« Salut, » sans virgule orpheline',
  corps2.indexOf('Salut,\n') === 0, JSON.stringify(corps2.split('\n')[0]));

console.log('\n── Sans numero ──');
const sansTel = invitation({ id: '3', name: 'Enzo', phone: '' });
verifie('rien n est ouvert', sansTel === null, String(sansTel));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
