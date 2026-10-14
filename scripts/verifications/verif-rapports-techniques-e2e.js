// Mission 41 (14/10) : POST /rapports-techniques et GET /sante contre l'API réelle. Sans session, puis avec un compte
// sonde jetable (…@exemple-timecool.fr). À lancer APRÈS la migration 014 et la mise en ligne de l'API
// (ou TC_API=http://127.0.0.1:8099 avec api-locale.sh).
const API = process.env.TC_API || 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(70)} ${detail === undefined ? '' : detail}`);
};

async function appel(methode, chemin, corps, jeton, brut) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: brut !== undefined ? brut : (corps === undefined ? undefined : JSON.stringify(corps)),
  });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}

async function inscrire(prenom) {
  const tel = '+336' + String(Date.now() + 947).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.rapport' + Date.now() + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Rapport', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton };
}

const rapport = (contexte) => ({
  contexte, version: 'page e2e', navigateur: 'node ' + process.version, compte: null, en_ligne: true,
  adresse: 'https://timecool.fr/app/', natif: false, test_connexion: { resultat: 'serveur_ok' },
  requetes: [{ t: new Date().toISOString(), m: 'POST', c: '/connexion', s: 'reseau', ms: 20000 }],
  erreurs: [], envoye_le: new Date().toISOString(),
});

(async () => {
  console.log('Le test de connexion :');
  const sante = await appel('GET', '/sante');
  dire(sante.code === 200 && sante.d && sante.d.ok === true, 'GET /sante répond 200 sans session', 'HTTP ' + sante.code);

  console.log('\nUn rapport sans session :');
  const r1 = await appel('POST', '/rapports-techniques', rapport('connexion'));
  dire(r1.code === 200 && r1.d && r1.d.ok === true && typeof r1.d.id === 'number' && r1.d.id > 0, 'HTTP 200, un numéro de rapport', 'HTTP ' + r1.code + ' ' + JSON.stringify(r1.d).slice(0, 120));
  dire(r1.d && r1.d.compte === false, 'aucun compte rattaché', JSON.stringify(r1.d && r1.d.compte));

  console.log('\nUn rapport avec un jeton valable, puis un jeton faux :');
  const sonde = await inscrire('Sonde');
  const r2 = await appel('POST', '/rapports-techniques', Object.assign(rapport('boucle'), { compte: sonde.ref }), sonde.jeton);
  dire(r2.code === 200 && r2.d && r2.d.compte === true && r2.d.id > r1.d.id, 'jeton valable : compte rattaché, numéro plus grand', 'HTTP ' + r2.code + ' ' + JSON.stringify(r2.d));
  const r3 = await appel('POST', '/rapports-techniques', rapport('boucle'), 'f'.repeat(64));
  dire(r3.code === 200 && r3.d && r3.d.compte === false, 'jeton inconnu : accepté quand même, sans compte (jamais de 401)', 'HTTP ' + r3.code + ' ' + JSON.stringify(r3.d));

  console.log('\nLes refus :');
  const vide = await appel('POST', '/rapports-techniques', undefined, undefined, '');
  dire(vide.code === 400 && vide.d && vide.d.erreur === 'rapport_vide', 'corps vide : 400 rapport_vide', 'HTTP ' + vide.code + ' ' + JSON.stringify(vide.d));
  const gros = await appel('POST', '/rapports-techniques', Object.assign(rapport('boucle'), { bourrage: 'x'.repeat(40000) }));
  dire(gros.code === 413 && gros.d && gros.d.erreur === 'rapport_trop_gros', 'plus de 32 Ko : 413 rapport_trop_gros', 'HTTP ' + gros.code + ' ' + JSON.stringify(gros.d));

  console.log('\nLe plafond (10 par heure et par adresse) :');
  let dernier = null;
  for (let i = 0; i < 9; i++) dernier = await appel('POST', '/rapports-techniques', rapport('plafond'));
  dire(dernier.code === 429 && dernier.d && dernier.d.erreur === 'trop_de_demandes', 'au-delà de 10 dans l’heure : 429 trop_de_demandes (3 déjà envoyés + 9)', 'HTTP ' + dernier.code + ' ' + JSON.stringify(dernier.d));

  console.log('\n' + ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
