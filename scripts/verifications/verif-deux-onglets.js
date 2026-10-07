// Deux onglets sur le meme compte (07/10) : un onglet en retard annoncait au
// serveur la « suppression » d un rendez-vous cree dans l autre. Verifie la
// forme du correctif ; le comportement a ete rejoue dans un vrai Chrome
// (sonde-garde-suppression : avant = SUPPR a tort, apres = rien).
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : '')); }
function fonction(texte, nom) {
  const d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const pousser = fonction(page, 'tcSyncPousser') || '';
verifie('le registre des objets vus dans cet onglet existe', /const _tcSyncVusIci = \{\};/.test(page));
verifie('tout objet present a l envoi est note comme vu', /presentes\[cle\] = emp;\s+_tcSyncVusIci\[cle\] = true;/.test(pousser));
verifie('tout objet recu du serveur est note comme vu', /empreintes\[cle\] = tcSyncEmpreinte\(contenuSur\);\s+_tcSyncVusIci\[cle\] = true;/.test(page));
verifie('une suppression n est annoncee que pour un objet vu ici', /if \(!_tcSyncVusIci\[cle\]\) return;\s+const v = vues\[type\];/.test(pousser));
verifie('la garde vient APRES le test « present » et AVANT le seuil de disparition', pousser.indexOf('presentes[cle] !== undefined) return;') < pousser.indexOf('_tcSyncVusIci[cle]) return;') && pousser.indexOf('_tcSyncVusIci[cle]) return;') < pousser.indexOf('v.presentes === 0'));
const demarrer = fonction(page, 'tcSyncDemarrer') || '';
verifie('au demarrage, l existant est note avant le premier tour', /tcSyncNoterVus\(\);[\s\S]*?tcSyncTour\(\);/.test(demarrer) && demarrer.indexOf('tcSyncNoterVus()') < demarrer.indexOf('  tcSyncTour();'));
verifie('l onglet ecoute les enregistrements de l autre (evenement storage)', /addEventListener\('storage'/.test(demarrer));
['TC_EVENTS_KEY', 'TC_TASKS_KEY', "'timecool_birthdays'", "'timecool_contacts'"].forEach((k) => verifie('il surveille ' + k, demarrer.indexOf(k) > -1));
verifie('il recharge les rendez-vous, taches, anniversaires, contacts', /loadEventsFromStorage\(\)/.test(demarrer) && /loadTasks\(\)/.test(demarrer) && /loadBirthdays\(\)/.test(demarrer) && /loadContacts\(\)/.test(demarrer));
verifie('le rechargement est regroupe (une seule fois pour une rafale d ecritures)', /clearTimeout\(_tcRechargeAutreOnglet\)/.test(demarrer));
verifie('puis il redessine l ecran', /if \(typeof render === 'function'\) render\(\);/.test(demarrer));
console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
