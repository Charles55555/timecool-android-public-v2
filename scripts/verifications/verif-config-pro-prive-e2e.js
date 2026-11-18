require('./comptes-jetables'); // Les comptes créés ici sont effacés en fin de passage.
// Mission 121, règle n°1 de TimeCool Pro (cahier des charges, 6 ter) : l'emploi du temps du professionnel est privé.
// tc_config_pro (métier, actes, jours, horaires, durée des rendez-vous) est un réglage du compte : aucun autre compte ne le lit.
// 1. Dans l'API : le serveur ne nomme jamais tc_config_pro ; chaque lecture de la table elements vise un type (et, pour un
//    réglage, une clé nommée) ; la seule lecture sans type est GET /sync, limitée au compte connecté.
// 2. Contre l'API locale : A enregistre sa configuration ; B ne la reçoit jamais ; A la retrouve.
// Usage : node verif-config-pro-prive-e2e.js <index.html> <backend/api/index.php>   (TC_API : l'API locale)
const fs = require('fs');
const path = require('path');
const api = fs.readFileSync(process.argv[3] || path.join(__dirname, '../../backend/api/index.php'), 'utf8');
const API = process.env.TC_API || '';
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); };

console.log('-- L’API --');
verifie('le serveur ne lit jamais tc_config_pro', api.indexOf('tc_config_pro') < 0);
const lectures = [];
let i = -1;
while ((i = api.indexOf('FROM elements', i + 1)) > -1) lectures.push(api.slice(i, i + 420));
const CLES_LUES = ['tc_rdv_validation', 'timecool_disponibilites', 'tc_rappel_email', 'tc_rappel_delai', 'tc_absence'];
const sansType = lectures.filter((q) => !/\btype\s*=\s*["'?]/.test(q.split(/\);|\]\s*\)/)[0]));
verifie('une seule lecture sans type : GET /sync, du compte connecté seulement', sansType.length === 1 && /WHERE compte_id = \? AND version > \?/.test(sansType[0]) && /\[\$compte\['id'\], \$depuis\]/.test(sansType[0]), sansType.map((q) => q.slice(0, 160)).join(' || '));
const reglages = lectures.filter((q) => /type\s*=\s*["']reglage["']/.test(q.split(/\);|\]\s*\)/)[0]));
const nommees = reglages.map((q) => (q.match(/uid\s*=\s*["']([a-z_]+)["']/) || [])[1] || null);
verifie('chaque lecture d’un réglage nomme sa clé, et tc_config_pro n’en est pas', reglages.length >= 1 && nommees.every((c) => c && CLES_LUES.indexOf(c) > -1), JSON.stringify(nommees));

(async () => {
  console.log('-- Contre l’API (' + (API || 'non jouée : TC_API absent') + ') --');
  if (!API) { console.log('NON JOUÉ : TC_API absent'); process.exit(1); }
  const appel = async (methode, chemin, corps, jeton) => {
    const r = await fetch(API + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let d = null; try { d = await r.json(); } catch (e) {}
    return { code: r.status, d: d };
  };
  const inscrire = async (prenom, n) => {
    const m = 'e2epro' + prenom.toLowerCase() + Date.now();
    const r = await appel('POST', '/inscription', { email: m + '@exemple-timecool.fr', mot_de_passe: 'MotDePasseDeTest2026!', telephone: '+3363997' + String(Date.now() + n).slice(-4), prenom: prenom, nom: 'Verif', ville: 'Paris', code_postal: '75015' });
    return (r.code === 200 || r.code === 201) ? r.d.session.jeton : null;
  };
  const A = await inscrire('Pro', 1), B = await inscrire('Patient', 2);
  verifie('deux comptes de test', !!A && !!B);
  if (!A || !B) { console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications'); process.exit(1); }
  const marque = 'MARQUE-PRIVEE-' + Date.now();
  const config = { v: 1, metier: 'chirurgien-dentiste', dureeRdv: 20, jours: { 2: { actif: true, matin: ['09:00', '12:00'], apres: ['14:00', '18:00'] } }, familles: [], marque: marque };
  const p = await appel('POST', '/sync', { elements: [{ type: 'reglage', uid: 'tc_config_pro', contenu: { id: 'tc_config_pro', v: JSON.stringify(config) } }] }, A);
  verifie('A enregistre sa configuration professionnelle', p.code === 200, p.code + ' ' + JSON.stringify(p.d).slice(0, 200));
  const lu = async (jeton) => { const r = await appel('GET', '/sync?depuis=0', undefined, jeton); return r.code === 200 ? JSON.stringify(r.d.elements || []) : 'ERREUR ' + r.code; };
  const deA = await lu(A), deB = await lu(B);
  verifie('A la retrouve', deA.indexOf(marque) > -1 && deA.indexOf('tc_config_pro') > -1);
  verifie('B ne reçoit rien de la configuration de A (ni la clé, ni ses jours)', deB.indexOf(marque) < 0 && deB.indexOf('tc_config_pro') < 0, deB.slice(0, 200));
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO erreur : ' + (e && e.message)); process.exit(1); });
