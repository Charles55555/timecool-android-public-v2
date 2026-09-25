// Test de bout en bout du transfert d'agenda, contre l'API réelle.
// Simule les deux appareils : le navigateur qui demande un code, le
// téléphone qui l'approuve et envoie son agenda chiffré.
const API = 'https://api.timecool.fr';
const marque = 'e2e' + Date.now();

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
  return { code: r.status, d: d };
}

// ── Les primitives, identiques à celles de la page ────────────────────
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
async function paire() {
  const p = await crypto.subtle.generateKey(ECDH, false, ['deriveKey']);
  return { privee: p.privateKey, publique: await crypto.subtle.exportKey('jwk', p.publicKey) };
}
async function commune(privee, pubJwk) {
  const pub = await crypto.subtle.importKey('jwk', pubJwk, ECDH, false, []);
  return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, privee,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const b64 = (u8) => Buffer.from(u8).toString('base64');
const deB64 = (t) => new Uint8Array(Buffer.from(t, 'base64'));
async function chiffrer(cle, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle,
    new TextEncoder().encode(JSON.stringify(obj)));
  const tout = new Uint8Array(12 + c.byteLength);
  tout.set(iv, 0); tout.set(new Uint8Array(c), 12);
  return b64(tout);
}
async function dechiffrer(cle, t) {
  const tout = deB64(t);
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tout.subarray(0, 12) },
    cle, tout.subarray(12));
  return JSON.parse(new TextDecoder().decode(clair));
}

(async () => {
  // ── Le téléphone : un compte, donc un jeton ─────────────────────────
  console.log('Compte de test :');
  const insc = await appel('POST', '/inscription', {
    email: marque + '@exemple-timecool.fr',
    mot_de_passe: 'MotDePasseDeTest2026!',
    telephone: '+336' + String(Date.now()).slice(-8),
    prenom: 'Test', nom: 'Appairage', ville: 'Paris', code_postal: '75001',
  });
  if (insc.code !== 200 && insc.code !== 201) {
    console.log('  KO  inscription impossible :', insc.code, JSON.stringify(insc.d));
    process.exit(1);
  }
  const jeton = insc.d.session ? insc.d.session.jeton : insc.d.jeton;
  const reference = (insc.d.compte || {}).reference;
  dire(!!jeton, 'compte créé et session ouverte', reference);

  // ── Le navigateur demande un code ───────────────────────────────────
  console.log('\nLe navigateur demande un code :');
  const nav = await paire();
  const cre = await appel('POST', '/appairage/creer', { cle_publique: nav.publique });
  dire(cre.code === 201 && /^\d{6}$/.test(cre.d.code || ''), 'code à six chiffres reçu',
    cre.d.code + ' — session ' + cre.d.sessionId);
  const code = cre.d.code, sid = cre.d.sessionId;

  const att = await appel('GET', '/appairage/statut?sessionId=' + sid);
  dire(att.d && att.d.statut === 'attente', 'statut « attente » avant approbation',
    att.d && att.d.statut);

  // ── Le téléphone approuve et récupère la clé du navigateur ──────────
  console.log('\nLe téléphone approuve :');
  const app = await appel('POST', '/appairage/approuver', { code: code }, jeton);
  dire(app.code === 200, 'approbation acceptée', 'HTTP ' + app.code);
  dire(app.d && app.d.cle_publique && app.d.cle_publique.x === nav.publique.x,
    'la clé publique du navigateur est rendue',
    app.d && app.d.cle_publique ? app.d.cle_publique.crv : 'absente');

  const enCours = await appel('GET', '/appairage/statut?sessionId=' + sid);
  dire(enCours.d && enCours.d.statut === 'transfert',
    'statut « transfert » : le navigateur patiente', enCours.d && enCours.d.statut);

  // ── Le téléphone envoie son agenda chiffré ──────────────────────────
  console.log('\nLe téléphone envoie son agenda :');
  const tel = await paire();
  const cleTel = await commune(tel.privee, app.d.cle_publique);
  const agenda = {
    version: 1, cree_le: new Date().toISOString(),
    evenements: Array.from({ length: 400 }, (_, i) => ({
      id: 'evt_' + i, mode: 'user', date: '2026-09-12',
      title: 'Rendez-vous ' + i + ' — éàçù', notes: 'n'.repeat(80),
      startH: 9, startM: 0, endH: 10, endM: 0, cat: 'sante',
    })),
    taches: [{ id: 't1', title: 'Acheter du pain', dueDate: '2026-09-20', done: false }],
    anniversaires: [{ id: 'b1', name: 'Marie Dupont', date: '1990-04-08', year: 1990 }],
    reglages: { tc_fetes_dans_agenda: '["religieux-juif"]' },
  };
  const paquet = await chiffrer(cleTel, agenda);
  const dep = await appel('POST', '/appairage/donnees',
    { code: code, cle_publique: tel.publique, paquet: paquet }, jeton);
  dire(dep.code === 200, 'paquet déposé', Math.round(paquet.length / 1024) + ' Ko, HTTP ' + dep.code);

  // ── Le navigateur récupère et déchiffre ─────────────────────────────
  console.log('\nLe navigateur récupère :');
  const fin = await appel('GET', '/appairage/statut?sessionId=' + sid);
  dire(fin.d && fin.d.statut === 'approuve', 'statut « approuve »', fin.d && fin.d.statut);
  dire(fin.d && fin.d.session && fin.d.session.jeton, 'session ouverte pour le navigateur');
  dire(fin.d && fin.d.paquet === paquet, 'le paquet est rendu intact');

  const cleNav = await commune(nav.privee, fin.d.paquet_cle);
  const recu = await dechiffrer(cleNav, fin.d.paquet);
  dire(recu.evenements.length === 400 && recu.evenements[399].title === agenda.evenements[399].title,
    'déchiffré par le navigateur seul', recu.evenements[399].title);
  dire(recu.taches.length === 1 && recu.anniversaires.length === 1
    && recu.reglages.tc_fetes_dans_agenda === '["religieux-juif"]',
    'tâches, anniversaires et réglages suivent');

  // ── Le code ne resservira pas ───────────────────────────────────────
  console.log('\nUne fois consommé :');
  const rejeu = await appel('GET', '/appairage/statut?sessionId=' + sid);
  dire(rejeu.d && rejeu.d.statut !== 'approuve', 'la session ne se rejoue pas',
    'statut ' + (rejeu.d ? rejeu.d.statut : rejeu.code));
  const reApp = await appel('POST', '/appairage/approuver', { code: code }, jeton);
  dire(reApp.code === 404, 'le code ne peut plus être approuvé', 'HTTP ' + reApp.code);

  console.log('\nRefus attendus :');
  const sansAuth = await appel('POST', '/appairage/donnees',
    { code: '000000', cle_publique: tel.publique, paquet: 'x' });
  dire(sansAuth.code === 401 || sansAuth.code === 403, 'dépôt sans jeton refusé',
    'HTTP ' + sansAuth.code);
  const vide = await appel('POST', '/appairage/donnees', { code: code }, jeton);
  dire(vide.code === 400, 'dépôt sans paquet refusé', 'HTTP ' + vide.code);

  console.log('\nCompte de test à supprimer : ' + reference);
  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
