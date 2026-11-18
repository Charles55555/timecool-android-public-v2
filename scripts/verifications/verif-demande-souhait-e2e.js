require('./comptes-jetables'); // Les comptes créés ici sont effacés en fin de passage.
// Mission 122 (examen) : « Demande un rendez-vous demain à mon ami Michel » : le jour dit part avec la demande. /rdv/demander
// accepte un champ facultatif « souhait », écrit dans le message que reçoit l'ami ; une demande qui attend déjà n'est pas
// renvoyée (« reprise »). Usage : node verif-demande-souhait-e2e.js <index.html> <index.php>   (TC_API : l'API locale)
const fs = require('fs');
const path = require('path');
const api = fs.readFileSync(process.argv[3] || path.join(__dirname, '../../backend/api/index.php'), 'utf8');
const API = process.env.TC_API || '';
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); };

console.log('-- L’API --');
verifie('le souhait est facultatif, court, assaini', /\$souhait = Entree::texte\('souhait', 120\);/.test(api) && /texteSur\(trim\(\$souhait\)\)/.test(api));
verifie('il est écrit dans le message de la demande (deux chemins)', (api.match(/messageDemandeRdv\(\$moi, \$cible, \$typeRdv, \$souhait\)/g) || []).length === 2);

(async () => {
  console.log('-- Contre l’API (' + (API || 'non jouée : TC_API absent') + ') --');
  if (!API) { console.log('NON JOUÉ : TC_API absent'); process.exit(1); }
  const appel = async (methode, chemin, corps, jeton) => {
    const r = await fetch(API + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let d = null; try { d = await r.json(); } catch (e) {}
    return { code: r.status, d: d };
  };
  const inscrire = async (prenom, n) => {
    const m = 'e2esouhait' + prenom.toLowerCase() + Date.now();
    const r = await appel('POST', '/inscription', { email: m + '@exemple-timecool.fr', mot_de_passe: 'MotDePasseDeTest2026!', telephone: '+3363998' + String(Date.now() + n).slice(-4), prenom: prenom, nom: 'Verif', ville: 'Paris', code_postal: '75015' });
    return (r.code === 200 || r.code === 201) ? { jeton: r.d.session.jeton, ref: r.d.compte.reference } : null;
  };
  const A = await inscrire('Charles', 1), M = await inscrire('Michel', 2);
  verifie('deux comptes de test (Michel garde « Toujours attendre ma validation », le réglage de départ)', !!A && !!M);
  if (!A || !M) { console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications'); process.exit(1); }
  const souhait = 'J’aimerais demain (jeudi 19 novembre).';
  const r1 = await appel('POST', '/rdv/demander', { reference: M.ref, type: 'physique', souhait: souhait }, A.jeton);
  verifie('la demande part dans la messagerie de Michel, pas une reprise', r1.code === 200 && r1.d && r1.d.mode === 'messagerie' && r1.d.reprise === false, JSON.stringify(r1.d).slice(0, 200));
  const lu = await appel('GET', '/sync?depuis=0', undefined, M.jeton);
  const tout = JSON.stringify((lu.d && lu.d.elements) || []);
  verifie('Michel lit le jour souhaité dans le message', tout.indexOf('J’aimerais demain (jeudi 19 novembre).') > -1 && /Tu me proposes un créneau/.test(tout), tout.slice(0, 300));
  const r2 = await appel('POST', '/rdv/demander', { reference: M.ref, type: 'physique', souhait: 'J’aimerais vendredi.' }, A.jeton);
  verifie('une deuxième demande qui attend déjà : « reprise », rien ne repart', r2.code === 200 && r2.d && r2.d.reprise === true, JSON.stringify(r2.d).slice(0, 200));
  const r3 = await appel('POST', '/rdv/demander', { reference: M.ref, souhait: 'x'.repeat(500) }, A.jeton);
  verifie('un souhait trop long est refusé proprement (pas d’erreur 500)', r3.code !== 500, r3.code);
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO erreur : ' + (e && e.message)); process.exit(1); });
