// Le bouton « Inviter sur TimeCool ».
//
// Il n'envoie rien lui-meme : il ouvre la messagerie du telephone avec
// le texte pret, et c'est Charles qui appuie. Deux facons de casser ca
// sans que rien ne le signale — les deux s'etaient produites.
const fs = require('fs');
const https = require('https');

const html = fs.readFileSync(process.argv[2], 'utf8');
const java = fs.readFileSync(process.argv[3], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

console.log('\n── L application laisse partir ce qui ne la concerne pas ──');
[['sms:', 'inviter par message'], ['tel:', 'appeler un contact'],
 ['mailto:', 'lui ecrire']].forEach(([schema, role]) => {
  verifie(schema.padEnd(9) + role,
    new RegExp('startsWith\\("' + schema + '"\\)').test(java));
});
verifie('elle ouvre vraiment l application visee',
  /Intent sortie = new Intent\(Intent\.ACTION_VIEW, Uri\.parse\(url\)\)/.test(java),
  'avant, elle disait « je m en occupe » puis n en faisait rien');
verifie('et le dit si rien ne peut ouvrir',
  /tcOuvertureImpossible/.test(java) && /function tcOuvertureImpossible\(/.test(html));

console.log('\n── L adresse envoyee aux invites ──');
// Seuls les LIENS comptent : le nom peut rester dans un commentaire qui
// explique justement qu'il n'existe pas.
verifie('plus aucun lien vers app.timecool.fr',
  !/https?:\/\/app\.timecool\.fr/.test(html),
  'ce nom n a jamais ete enregistre');
// Chercher DANS la fonction, pas sur une seule ligne : le message est
// assemble en plusieurs morceaux depuis que Charles l'a reecrit, et un
// motif d'une ligne ne le voyait plus.
const bloc = html.slice(html.indexOf('function inviteContact(contactId) {'),
                        html.indexOf('function toggleContactMenu('));
// Le SITE, pas l'application : celui qui recoit decouvre TimeCool et
// doit d'abord savoir de quoi il s'agit. Le site mene ensuite a l'app.
verifie('l invitation pointe vers le site timecool.fr',
  /https:\/\/timecool\.fr'/.test(bloc));

// L'invitation ne vaut que si le lien repond : le verifier pour de vrai.
const lien = (bloc.match(/(https:\/\/[^\s'"]+)/) || [])[1];
console.log('\n── Le lien repond-il vraiment ? ──');
https.get(lien, (r) => {
  verifie('l adresse de l invitation est vivante',
    r.statusCode >= 200 && r.statusCode < 400, lien + ' → ' + r.statusCode);
  r.destroy();
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
}).on('error', (e) => {
  verifie('l adresse de l invitation est vivante', false, lien + ' → ' + e.message);
  console.log(`\n${ko} anomalie(s).`);
  process.exit(1);
});
