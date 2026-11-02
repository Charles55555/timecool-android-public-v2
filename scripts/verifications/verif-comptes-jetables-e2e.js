// Mission 70, contre l'API réelle : un compte de test s'efface lui-même, avec ses données, et son identité se libère.
require('./comptes-jetables');
const API = process.env.TC_API || 'https://api.timecool.fr';

let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + ' ' + (d || '')); } };

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

(async () => {
  const stamp = Date.now();
  const identite = { email: 'sonde.jetable' + stamp + '@exemple-timecool.fr', telephone: '+336' + String(stamp).slice(-8), mot_de_passe: 'MotDePasseDeTest2026!', prenom: 'Jetable', nom: 'Verif', ville: 'Lyon', code_postal: '69001' };
  const a = await appel('POST', '/inscription', identite);
  verifie('compte créé', a.code === 200 || a.code === 201, JSON.stringify(a.d));
  const jeton = a.d.session.jeton;

  const sans = await appel('POST', '/compte/effacer-test', {});
  verifie('sans session : refusé', sans.code === 401, 'HTTP ' + sans.code);

  const e = await appel('POST', '/compte/effacer-test', {}, jeton);
  verifie('le compte de test s efface', e.code === 200, 'HTTP ' + e.code);
  const apres = await appel('GET', '/compte', undefined, jeton);
  verifie('sa session est partie avec lui', apres.code === 401, 'HTTP ' + apres.code);
  const co = await appel('POST', '/connexion', { identifiant: identite.email, mot_de_passe: identite.mot_de_passe });
  verifie('plus de connexion possible', co.code !== 200, 'HTTP ' + co.code);
  const b = await appel('POST', '/inscription', identite);
  verifie('l e-mail et le téléphone sont libres', b.code === 200 || b.code === 201, JSON.stringify(b.d));

  console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
  process.exit(ko ? 1 : 0);
})().catch((x) => { console.log('  KO ' + x.message); process.exit(1); });
