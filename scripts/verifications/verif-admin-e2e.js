// Espace administrateur, contre l'API réelle : qui voit la liste, qui
// ne la voit pas, et ce que fait vraiment le bouton « Bloquer ».
const API = 'https://api.timecool.fr';
const ADMIN_REF = process.argv[2];
const ADMIN_JETON = process.argv[3];

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(46)} ${detail || ''}`);
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

const marque = () => 'e2e' + Date.now() + Math.floor(Math.random() * 900 + 100);
async function inscrire(prenom) {
  const m = marque();
  const r = await appel('POST', '/inscription', {
    email: m + '@exemple-timecool.fr',
    mot_de_passe: 'MotDePasseDeTest2026!',
    telephone: '+336' + String(Date.now()).slice(-8),
    prenom, nom: 'Verif', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return {
    reference: r.d.compte.reference,
    email: r.d.compte.email,
    jeton: r.d.session.jeton,
  };
}

(async () => {
  console.log('Sans droit administrateur :');
  const simple = await inscrire('Simple');
  const refus = await appel('GET', '/admin/utilisateurs', undefined, simple.jeton);
  dire(refus.code === 403, 'la liste est refusée', 'HTTP ' + refus.code);
  const anonyme = await appel('GET', '/admin/utilisateurs');
  dire(anonyme.code === 401, 'et refusée sans session du tout', 'HTTP ' + anonyme.code);
  const blocageInterdit = await appel('POST', '/admin/bloquer',
    { reference: simple.reference, bloquer: true }, simple.jeton);
  dire(blocageInterdit.code === 403, 'le blocage aussi', 'HTTP ' + blocageInterdit.code);

  console.log('\nAvec le droit administrateur :');
  const liste = await appel('GET', '/admin/utilisateurs', undefined, ADMIN_JETON);
  dire(liste.code === 200 && Array.isArray(liste.d.utilisateurs),
    'la liste est rendue', (liste.d.utilisateurs || []).length + ' comptes');
  const u = (liste.d.utilisateurs || []);
  dire(u.some((x) => x.reference === simple.reference),
    'le compte inscrit à l instant y figure', simple.reference);
  dire(u.some((x) => x.prenom === 'Julian') && u.some((x) => x.prenom === 'Hadassa'),
    'Julian et Hadassa y figurent',
    u.filter((x) => ['Julian', 'Hadassa'].includes(x.prenom)).map((x) => x.prenom).join(', '));
  dire(u.length > 1 && new Date(u[0].cree_le) >= new Date(u[u.length - 1].cree_le),
    'du plus récent au plus ancien', u[0].prenom + ' … ' + u[u.length - 1].prenom);
  dire(u[0].mot_de_passe_hash === undefined && u[0].email_empreinte === undefined,
    'ni empreintes ni mots de passe dans la réponse', Object.keys(u[0]).join(','));

  // ── La provenance ─────────────────────────────────────────────────
  // La précision libre n'est conservée que pour « autre » : « TikTok »
  // se suffit à lui-même, et laisser passer un texte libre à côté d'une
  // valeur connue n'apporterait qu'du bruit dans les statistiques.
  console.log('\nLa provenance remonte au serveur :');
  const prov = await appel('POST', '/compte/provenance',
    { provenance: 'tiktok', provenance_detail: '@timecool' }, simple.jeton);
  dire(prov.code === 200, 'enregistrée', 'HTTP ' + prov.code);
  const relu = await appel('GET', '/admin/utilisateurs', undefined, ADMIN_JETON);
  const vu = relu.d.utilisateurs.find((x) => x.reference === simple.reference);
  dire(vu && vu.provenance === 'tiktok', 'et visible depuis l espace admin',
    vu ? vu.provenance : 'absent');
  dire(vu && vu.provenance_detail === null,
    'la précision est écartée pour une provenance connue', String(vu.provenance_detail));

  const libre = await appel('POST', '/compte/provenance',
    { provenance: 'autre', provenance_detail: 'Vu chez mon dentiste' }, simple.jeton);
  dire(libre.code === 200, 'provenance « autre » acceptée', 'HTTP ' + libre.code);
  const relu2 = await appel('GET', '/admin/utilisateurs', undefined, ADMIN_JETON);
  const vu2 = relu2.d.utilisateurs.find((x) => x.reference === simple.reference);
  dire(vu2 && vu2.provenance === 'autre' && vu2.provenance_detail === 'Vu chez mon dentiste',
    'et là, la précision est conservée', vu2 ? String(vu2.provenance_detail) : 'absent');

  const inventee = await appel('POST', '/compte/provenance',
    { provenance: 'canal_invente', provenance_detail: 'x' }, simple.jeton);
  dire(inventee.code === 400, 'une provenance hors liste est refusée',
    'HTTP ' + inventee.code);

  // ── Le blocage ────────────────────────────────────────────────────
  console.log('\nLe blocage agit vraiment :');
  const avant = await appel('POST', '/connexion',
    { identifiant: simple.email, mot_de_passe: 'MotDePasseDeTest2026!' });
  dire(avant.code === 200, 'la personne se connecte avant', 'HTTP ' + avant.code);

  const bloc = await appel('POST', '/admin/bloquer',
    { reference: simple.reference, bloquer: true }, ADMIN_JETON);
  dire(bloc.code === 200 && bloc.d.bloque === true, 'blocage accepté', 'HTTP ' + bloc.code);

  const apres = await appel('POST', '/connexion',
    { identifiant: simple.email, mot_de_passe: 'MotDePasseDeTest2026!' });
  dire(apres.code === 403 && apres.d.erreur === 'compte_suspendu',
    'elle ne se connecte plus, et sait pourquoi',
    'HTTP ' + apres.code + ' ' + (apres.d ? apres.d.erreur : ''));

  const sessionMorte = await appel('GET', '/admin/utilisateurs', undefined, simple.jeton);
  dire(sessionMorte.code === 401, 'sa session déjà ouverte est révoquée',
    'HTTP ' + sessionMorte.code);

  const marqueBloque = await appel('GET', '/admin/utilisateurs', undefined, ADMIN_JETON);
  const bloqueVu = marqueBloque.d.utilisateurs.find((x) => x.reference === simple.reference);
  dire(bloqueVu && bloqueVu.bloque_le, 'la liste le montre bloqué');

  // Un mot de passe faux sur un compte bloqué ne doit pas révéler le
  // blocage : la réponse reste celle d'identifiants invalides.
  const faux = await appel('POST', '/connexion',
    { identifiant: simple.email, mot_de_passe: 'MauvaisMotDePasse!!' });
  dire(faux.code === 401 && faux.d.erreur === 'identifiants_invalides',
    'sans le bon mot de passe, le blocage reste invisible',
    'HTTP ' + faux.code + ' ' + (faux.d ? faux.d.erreur : ''));

  console.log('\nDéblocage :');
  const debloc = await appel('POST', '/admin/bloquer',
    { reference: simple.reference, bloquer: false }, ADMIN_JETON);
  dire(debloc.code === 200 && debloc.d.bloque === false, 'déblocage accepté');
  const revenu = await appel('POST', '/connexion',
    { identifiant: simple.email, mot_de_passe: 'MotDePasseDeTest2026!' });
  dire(revenu.code === 200, 'la personne se reconnecte', 'HTTP ' + revenu.code);

  console.log('\nGarde-fous :');
  const soi = await appel('POST', '/admin/bloquer',
    { reference: ADMIN_REF, bloquer: true }, ADMIN_JETON);
  dire(soi.code === 400, 'l administrateur ne peut pas se bloquer lui-même',
    'HTTP ' + soi.code);
  const inconnu = await appel('POST', '/admin/bloquer',
    { reference: 'ZZZZZZZZZZZZ', bloquer: true }, ADMIN_JETON);
  dire(inconnu.code === 404, 'référence inconnue refusée', 'HTTP ' + inconnu.code);
  const malforme = await appel('POST', '/admin/bloquer',
    { reference: simple.reference }, ADMIN_JETON);
  dire(malforme.code === 400, 'champ « bloquer » obligatoire', 'HTTP ' + malforme.code);

  console.log('\nComptes de test à supprimer : ' + simple.reference + ', ' + ADMIN_REF);
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
