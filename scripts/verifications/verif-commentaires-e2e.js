// Mission 33 (Charles, 12/10) : POST /commentaires contre l'API réelle (compte sonde jetable e2erdv.commentaire…
// @exemple-timecool.fr : enregistré en base, JAMAIS d'e-mail à l'équipe).
// À lancer APRÈS la migration 011 et la mise en ligne de l'API (ou TC_API=http://127.0.0.1:8099 avec api-locale.sh).
const API = process.env.TC_API || 'https://api.timecool.fr';

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(70)} ${detail === undefined ? '' : detail}`);
};

async function appel(methode, chemin, corps, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  let d = null;
  try { d = await r.json(); } catch (e) {}
  return { code: r.status, d };
}

async function inscrire(prenom) {
  const tel = '+336' + String(Date.now() + 731).slice(-8);
  const r = await appel('POST', '/inscription', {
    email: 'e2erdv.commentaire' + Date.now() + '@exemple-timecool.fr',
    telephone: tel, mot_de_passe: 'MotDePasseDeTest2026!',
    prenom, nom: 'Commentaire', ville: 'Lyon', code_postal: '69001',
  });
  if (r.code !== 200 && r.code !== 201) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton };
}

(async () => {
  const sonde = await inscrire('Sonde');
  dire(!!sonde.ref, 'compte sonde créé', sonde.ref);

  console.log('\nUn commentaire ordinaire :');
  const texte = '[test automatique] Le bouton Envoyer fonctionne — ' + new Date().toISOString();
  const c1 = await appel('POST', '/commentaires', { texte, version: 'e2e', appareil: 'node ' + process.version }, sonde.jeton);
  dire(c1.code === 200 && c1.d && c1.d.ok === true, 'HTTP 200, ok:true', 'HTTP ' + c1.code + ' ' + JSON.stringify(c1.d).slice(0, 160));
  dire(c1.d && typeof c1.d.id === 'number' && c1.d.id > 0, 'un numéro de commentaire est rendu', c1.d && c1.d.id);
  dire(c1.d && c1.d.compte_de_test === true && c1.d.email_envoye === false, 'compte de test : enregistré, aucun e-mail envoyé', JSON.stringify({ t: c1.d && c1.d.compte_de_test, e: c1.d && c1.d.email_envoye }));
  const c2 = await appel('POST', '/commentaires', { texte: 'second ' + texte }, sonde.jeton);
  dire(c2.code === 200 && c2.d && c2.d.id > c1.d.id, 'un second commentaire porte un numéro plus grand (version/appareil absents acceptés)', c2.d && c2.d.id);

  console.log('\nCe qui est refusé :');
  const vide = await appel('POST', '/commentaires', { texte: '   ' }, sonde.jeton);
  dire(vide.code === 400 && vide.d && vide.d.erreur === 'champs_manquants', 'texte vide → 400 champs_manquants', 'HTTP ' + vide.code + ' ' + (vide.d && vide.d.erreur));
  const long = await appel('POST', '/commentaires', { texte: 'x'.repeat(2001) }, sonde.jeton);
  dire(long.code === 400 && long.d && long.d.erreur === 'texte_trop_long', '2001 caractères → 400 texte_trop_long', 'HTTP ' + long.code + ' ' + (long.d && long.d.erreur));
  const juste = await appel('POST', '/commentaires', { texte: 'y'.repeat(2000) }, sonde.jeton);
  dire(juste.code === 200, '2000 caractères exactement → accepté', 'HTTP ' + juste.code);
  const sans = await appel('POST', '/commentaires', { texte: 'sans session' });
  dire(sans.code === 401, 'sans session → 401', 'HTTP ' + sans.code);
  const tronque = await appel('POST', '/commentaires', { texte: 'ok', version: 'v'.repeat(80), appareil: 'a'.repeat(300) }, sonde.jeton);
  dire(tronque.code === 200, 'version et appareil trop longs : tronqués, pas refusés', 'HTTP ' + tronque.code);

  console.log('\nLe plafond (5 par heure) :');
  const cinq = await appel('POST', '/commentaires', { texte: 'cinquième ' + texte }, sonde.jeton);
  dire(cinq.code === 200, 'le 5e commentaire de l’heure passe', 'HTTP ' + cinq.code);
  const six = await appel('POST', '/commentaires', { texte: 'sixième ' + texte }, sonde.jeton);
  dire(six.code === 429 && six.d && six.d.erreur === 'trop_de_demandes', 'le 6e → 429 trop_de_demandes (rafale impossible)', 'HTTP ' + six.code + ' ' + (six.d && six.d.erreur));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO  ' + e.message); process.exit(1); });
