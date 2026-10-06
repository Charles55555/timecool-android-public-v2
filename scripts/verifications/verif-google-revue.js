// Les corrections de la revue indépendante de la règle de départ (07/10).
// Le défaut bloquant : la date de modification avançait à chaque
// réécriture, même sans changement, et la règle « avant le départ »
// était contournée pour tout le carnet à chaque redémarrage de l'appli.
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');

const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 200) : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}

titre('1. La date de modification ne bouge que si le contenu change (serveur)');
// Jusqu'à la fin de la chaîne SQL (la ligne maj_le contient déjà « supprime = VALUES(supprime) »).
const upserts = api.match(/ON DUPLICATE KEY UPDATE[\s\S]{0,600}?supprime = VALUES\(supprime\)'/g) || [];
verifie('les deux écritures d éléments (POST /sync et elementsPoser) sont trouvées', upserts.length === 2, upserts.length);
verifie('toutes deux posent maj_le EN PREMIER, en BINARY, inchangé si contenu et supprime sont identiques', upserts.every((u) => /ON DUPLICATE KEY UPDATE\s+(--[^\n]*\n\s*)*maj_le = IF\(BINARY contenu <=> BINARY VALUES\(contenu\) AND supprime = VALUES\(supprime\), maj_le, NOW\(\)\),\s+contenu = VALUES\(contenu\)/.test(u)));
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/usr/bin/php'].find((p) => fs.existsSync(p));
if (PHP) { const lint = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' }); verifie('php -l : aucune erreur de syntaxe', lint.status === 0, (lint.stdout || lint.stderr || '').trim()); }

titre('1b. L empreinte de synchronisation ignore les clés « undefined » (application)');
const ctx = {}; vm.createContext(ctx);
['tcSyncCanon', 'tcSyncEmpreinte'].forEach((n) => { const src = fonction(page, n); if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const emp = (o) => vm.runInContext('tcSyncEmpreinte(' + JSON.stringify(o).replace(/"__u__"/g, 'undefined') + ')', ctx);
verifie('{id, title} et {id, title, notes: undefined} ont la même empreinte (le JSON envoyé est le même)', emp({ id: 'a', title: 'Dentiste' }) === emp({ id: 'a', title: 'Dentiste', notes: '__u__' }));
verifie('mais une vraie différence change l empreinte', emp({ id: 'a', title: 'Dentiste' }) !== emp({ id: 'a', title: 'Dentiste', notes: 'x' }) && emp({ id: 'a', title: 'Dentiste' }) !== emp({ id: 'a', title: 'Dentistes' }));
verifie('et null n est pas undefined', emp({ id: 'a', title: 'D' }) !== emp({ id: 'a', title: 'D', notes: null }));

titre('2. Désynchroniser garde les liens (pour ne laisser ni orphelin ni doublon chez Google)');
const deconnecter = api.slice(api.indexOf("case 'POST /google/agenda/deconnecter':"), api.indexOf("case 'POST /google/agenda/deconnecter':") + 1200);
verifie('la ligne google_agenda est effacée…', /DELETE FROM google_agenda WHERE compte_id = \?/.test(deconnecter));
verifie('…mais plus les liens', !/DELETE FROM google_agenda_liens/.test(deconnecter));

titre('3. Charly ne répond « Oui ! … Google » qu à une question sur Google');
const liste = page.slice(page.indexOf('const _unavailable = ['), page.indexOf('const _unavailable = [') + 9000);
const iApple = liste.indexOf("keys: ['apple calendar','agenda apple'");
const iLire = liste.indexOf("keys: ['lire mon google agenda'");
const iGoogle = liste.indexOf("keys: ['google calendar','google agenda','agenda google'");
verifie('Apple / Outlook (pas encore) et « lire mon Google Agenda » (pas encore) passent AVANT l entrée Google', iApple > -1 && iLire > -1 && iGoogle > -1 && iApple < iGoogle && iLire < iGoogle);
const clesGoogle = (liste.slice(iGoogle, liste.indexOf(']', iGoogle)).match(/'([^']+)'/g) || []).map((x) => x.slice(1, -1));
verifie('les clés de l entrée Google parlent toutes de Google ou d import ; plus « synchro » seul', clesGoogle.length > 0 && clesGoogle.every((k) => /google|importer/.test(k)) && !clesGoogle.some((k) => /^synchro/.test(k)), clesGoogle.join(' | '));
verifie('la réponse Google dit « un seul sens » et renvoie à « Importer mon ancien agenda »', /un seul sens/.test(liste.slice(iGoogle, iGoogle + 600)) && /Importer mon ancien agenda/.test(liste.slice(iGoogle, iGoogle + 600)));
verifie('« lire mon Google Agenda » : TimeCool ne lit pas Google, il envoie', /il ne lit pas Google/.test(liste.slice(iLire, iLire + 700)));
// Mise en scène : quelle entrée répond ?
vm.runInContext('function tcContientMot(texte, expression) { if (!texte || !expression) return false; const lettre = /[a-z0-9à-ÿœæ]/i; let i = texte.indexOf(expression); while (i !== -1) { const avant = i > 0 ? texte[i - 1] : ""; const apres = texte[i + expression.length] || ""; if (!lettre.test(avant) && !lettre.test(apres)) return true; i = texte.indexOf(expression, i + 1); } return false; }', ctx);
const mTab = page.match(/const _unavailable = \[[\s\S]*?\n  \];/);
if (mTab) vm.runInContext(mTab[0], ctx);
const repond = (t) => vm.runInContext('(function () { const u = _unavailable.find(u => u.keys.some(k => tcContientMot(' + JSON.stringify(t.toLowerCase()) + ', k))); return u ? u.reply.slice(0, 12) : null; })()', ctx);
verifie('« peux-tu te synchroniser avec Outlook ? » → Pas encore', /^Pas encore/.test(repond('peux-tu te synchroniser avec Outlook ?') || ''), repond('peux-tu te synchroniser avec Outlook ?'));
verifie('« peux-tu lire mon Google Agenda ? » → Pas encore (il ne lit pas Google)', /^Pas encore/.test(repond('peux-tu lire mon google agenda ?') || ''), repond('peux-tu lire mon google agenda ?'));
verifie('« synchronise avec google agenda » → Oui !', /^Oui !/.test(repond('synchronise avec google agenda') || ''), repond('synchronise avec google agenda'));
verifie('« synchroniser mes appareils » → ne répond plus Google', !/^Oui !/.test(repond('synchroniser mes appareils') || ''), repond('synchroniser mes appareils'));

titre('3b. Le prompt de Charly ne dit plus que la synchro Google arrive');
const prompt = page.slice(page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT'), page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT') + 40000);
verifie('plus de « synchro Google Calendar arrive bientôt »', !/synchro Google Calendar arrive/.test(prompt));
verifie('il sait que Google Agenda existe, dans un seul sens, et qu il ne lit pas Google', /Google Agenda EXISTE déjà/.test(prompt) && /Un seul sens/.test(prompt) && /ne promets JAMAIS que tu lis Google Agenda/.test(prompt));

titre('4. « Envoyer » remis en marche : l écran relit la date de départ');
const regler = fonction(page, 'tcGoogleAgendaReglerEnvoi') || '';
verifie('après le réglage, l écran est redessiné (la date « depuis » est relue)', /await tcAppel\('POST', '\/google\/agenda\/reglages'[\s\S]*?tcGoogleAgendaAfficher\(\);/.test(regler));
verifie('le toast dit « À partir de maintenant »', /À partir de maintenant/.test(regler));
const afficher = fonction(page, 'tcGoogleAgendaAfficher') || '';
verifie('interrupteur coupé : l écran dit « Envoi en pause » au lieu de promettre l envoi', /\(envoyer \? 'Les rendez-vous créés ou modifiés'/.test(afficher) && /Envoi en pause/.test(afficher));

titre('5. Un rendez-vous importé puis modifié via Charly garde sa marque d import');
const valider = fonction(page, 'validateAgendaProposalFromMsg') || '';
verifie('la marque est lue sur le rendez-vous remplacé (importe, ou identifiant ics_)', /importeHerite = !!events\[i\]\.importe \|\| String\(events\[i\]\.id\)\.indexOf\('ics_'\) === 0;/.test(valider));
verifie('et posée sur le nouveau', /\.\.\.\(importeHerite \? \{ importe: true \} : \{\}\),/.test(valider));

titre('6. Petites choses vues par la revue');
verifie('« Synchroniser à nouveau » garde son libellé après un échec', /const libelle = bouton \? bouton\.textContent : '';/.test(fonction(page, 'tcGoogleAgendaRelier') || '') && /bouton\.textContent = libelle;/.test(fonction(page, 'tcGoogleAgendaRelier') || ''));
verifie('Désynchroniser prévient que les rendez-vous copiés restent dans Google', /resteront dans votre Google Agenda/.test(fonction(page, 'tcGoogleAgendaDelier') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
