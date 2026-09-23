// Suppression d'un compte et désignation d'un administrateur, contre
// l'API réelle. Le point qui compte : la suppression libère bien l'email
// et le téléphone, ce que le blocage ne fait pas.
const API = 'https://api.timecool.fr';
const ADMIN_REF = process.argv[2];
const ADMIN_JETON = process.argv[3];

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(48)} ${detail || ''}`);
};

async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' },
      jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}

let compteur = 0;
async function inscrire(prenom, identite) {
  const id = identite || {
    email: 'e2e' + Date.now() + (compteur++) + '@exemple-timecool.fr',
    telephone: '+336' + String(Date.now() + compteur).slice(-8),
  };
  const r = await appel('POST', '/inscription', {
    email: id.email, telephone: id.telephone,
    mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Verif', ville: 'Lyon', code_postal: '69001',
  });
  return { code: r.code, d: r.d, identite: id };
}

(async () => {
  console.log('Qui a le droit de supprimer :');
  const simple = await inscrire('Simple');
  const refus = await appel('POST', '/admin/supprimer',
    { reference: simple.d.compte.reference }, simple.d.session.jeton);
  dire(refus.code === 403, 'un compte ordinaire ne peut pas', 'HTTP ' + refus.code);
  const anonyme = await appel('POST', '/admin/supprimer',
    { reference: simple.d.compte.reference });
  dire(anonyme.code === 401, 'sans session non plus', 'HTTP ' + anonyme.code);
  const soi = await appel('POST', '/admin/supprimer',
    { reference: ADMIN_REF }, ADMIN_JETON);
  dire(soi.code === 400, 'l administrateur ne se supprime pas lui-même', 'HTTP ' + soi.code);

  console.log('\nLa suppression libère l identité — ce que le blocage ne fait pas :');
  const victime = await inscrire('Victime');
  const ident = victime.identite;
  const refVictime = victime.d.compte.reference;

  // D'abord la preuve que bloquer ne suffit pas.
  await appel('POST', '/admin/bloquer', { reference: refVictime, bloquer: true }, ADMIN_JETON);
  const bloqueeReprise = await inscrire('Reprise', ident);
  dire(bloqueeReprise.code === 409, 'compte bloqué : l email reste pris',
    'HTTP ' + bloqueeReprise.code + ' ' + (bloqueeReprise.d ? bloqueeReprise.d.erreur : ''));

  const sup = await appel('POST', '/admin/supprimer', { reference: refVictime }, ADMIN_JETON);
  dire(sup.code === 200, 'suppression acceptée', 'HTTP ' + sup.code);

  const reprise = await inscrire('Reprise', ident);
  dire(reprise.code === 200 || reprise.code === 201,
    'le même email et le même téléphone se réinscrivent',
    'HTTP ' + reprise.code);
  dire(reprise.d && reprise.d.compte
    && reprise.d.compte.reference !== refVictime, 'et c est bien un nouveau compte',
    reprise.d && reprise.d.compte ? reprise.d.compte.reference : '');

  const liste = await appel('GET', '/admin/utilisateurs', undefined, ADMIN_JETON);
  dire(!liste.d.utilisateurs.some((x) => x.reference === refVictime),
    'l ancien compte a disparu de la liste');
  dire(liste.d.moi === ADMIN_REF, 'la liste dit à l écran quelle fiche est la sienne',
    liste.d.moi);

  const introuvable = await appel('POST', '/admin/supprimer',
    { reference: 'ZZZZZZZZZZZZ' }, ADMIN_JETON);
  dire(introuvable.code === 404, 'référence inconnue refusée', 'HTTP ' + introuvable.code);

  console.log('\nDésigner un administrateur :');
  const promu = await inscrire('Promu');
  const refPromu = promu.d.compte.reference;
  const jetonPromu = promu.d.session.jeton;

  const avant = await appel('GET', '/admin/utilisateurs', undefined, jetonPromu);
  dire(avant.code === 403, 'avant, il ne voit pas la liste', 'HTTP ' + avant.code);

  const donne = await appel('POST', '/admin/administrateur',
    { reference: refPromu, administrateur: true }, ADMIN_JETON);
  dire(donne.code === 200 && donne.d.administrateur === true, 'accès donné', 'HTTP ' + donne.code);

  const apres = await appel('GET', '/admin/utilisateurs', undefined, jetonPromu);
  dire(apres.code === 200, 'après, il la voit', 'HTTP ' + apres.code);
  dire((apres.d.utilisateurs.find((x) => x.reference === refPromu) || {}).admin == 1,
    'et la liste le marque administrateur');

  const retire = await appel('POST', '/admin/administrateur',
    { reference: refPromu, administrateur: false }, ADMIN_JETON);
  dire(retire.code === 200 && retire.d.administrateur === false, 'accès retiré');
  const finPromu = await appel('GET', '/admin/utilisateurs', undefined, jetonPromu);
  dire(finPromu.code === 403, 'il ne la voit plus', 'HTTP ' + finPromu.code);

  const autoRetrait = await appel('POST', '/admin/administrateur',
    { reference: ADMIN_REF, administrateur: false }, ADMIN_JETON);
  dire(autoRetrait.code === 400,
    'on ne peut pas se retirer le droit à soi-même', 'HTTP ' + autoRetrait.code);
  const parUnSimple = await appel('POST', '/admin/administrateur',
    { reference: refPromu, administrateur: true }, jetonPromu);
  dire(parUnSimple.code === 403, 'et un compte ordinaire ne promeut personne',
    'HTTP ' + parUnSimple.code);

  console.log('\nÀ supprimer : ' + [simple.d.compte.reference,
    reprise.d.compte.reference, refPromu, ADMIN_REF].join(', '));
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
