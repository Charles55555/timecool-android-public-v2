// Google Agenda : la synchronisation ne regarde que ce qui se passe APRÈS
// sa mise en route, et « Relier » devient « Synchroniser ».
//
// Charles, 07/10 : « il faut que la synchronisation puisse se faire et
// prendre en compte que les modifications réalisées dans TimeCool après la
// date et l'heure de synchronisation ; tout ce qui s'est passé avant dans
// TimeCool ne regarde pas Google Agenda. »
// Seule exception posée par prudence : ce qui vient d'un fichier .ics n'est
// jamais renvoyé (Google en a déjà l'original : ce serait un doublon).
//
// La décision est une fonction PHP pure : elle est exécutée pour de vrai
// avec le PHP du serveur, pas seulement lue.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

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
  const d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}

// Le PHP de Plesk (le serveur n'a pas de « php » dans son PATH).
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/opt/plesk/php/8.1/bin/php', '/usr/bin/php']
  .find((p) => fs.existsSync(p));

titre('L API est du PHP valide');
verifie('un PHP est disponible pour exécuter la règle', !!PHP, 'cherché : /opt/plesk/php/8.x/bin/php');
if (PHP) {
  const lint = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' });
  verifie('php -l : aucune erreur de syntaxe', lint.status === 0, (lint.stdout || lint.stderr || '').trim());
}

titre('La règle, exécutée sous PHP');
const source = fonction(api, 'googleAgendaDoitEnvoyer');
verifie('la fonction googleAgendaDoitEnvoyer existe', !!source);
if (PHP && source) {
  const depuis = '2026-10-16 08:00:00';
  const cas = [
    ['déjà recopié : oui, toujours (pour le tenir à jour)', { rdv: {}, uid: 'a1', google_id: 'g1', maj_le: '2026-10-01 00:00:00', depuis }, true],
    ['déjà recopié, même importé : oui (il l\'était déjà)', { rdv: { importe: true }, uid: 'ics_1_0', google_id: 'g1', maj_le: '2026-10-01 00:00:00', depuis }, true],
    ['importé d\'un fichier (marque) : jamais', { rdv: { importe: true }, uid: 'x9', google_id: null, maj_le: '2026-10-17 09:00:00', depuis }, false],
    ['importé d\'un fichier (identifiant ics_) : jamais, même modifié après', { rdv: {}, uid: 'ics_1790000_3', google_id: null, maj_le: '2026-10-17 09:00:00', depuis }, false],
    ['créé dans TimeCool AVANT le départ : ne regarde pas Google', { rdv: { title: 'Dentiste' }, uid: 'n1', google_id: null, maj_le: '2026-10-10 12:00:00', depuis }, false],
    ['créé APRÈS le départ (10h, le 16) : part', { rdv: { title: 'Nouveau' }, uid: 'n2', google_id: null, maj_le: '2026-10-16 10:00:00', depuis }, true],
    ['modifié APRÈS le départ : part', { rdv: { title: 'Modifié' }, uid: 'n3', google_id: null, maj_le: '2026-10-16 08:00:01', depuis }, true],
    ['exactement à l\'heure du départ : pas encore (strictement après)', { rdv: {}, uid: 'n4', google_id: null, maj_le: depuis, depuis }, false],
    ['une seconde avant le départ : non', { rdv: {}, uid: 'n5', google_id: null, maj_le: '2026-10-16 07:59:59', depuis }, false],
    ['date d\'écriture inconnue : non, dans le doute on n\'envoie pas', { rdv: {}, uid: 'n6', google_id: null, maj_le: null, depuis }, false],
    ['passage à minuit : le lendemain 00h00 est après la veille 23h59', { rdv: {}, uid: 'n7', google_id: null, maj_le: '2026-10-17 00:00:00', depuis: '2026-10-16 23:59:59' }, true],
    ['ancienne liaison (pas de départ) : comme avant, tout part', { rdv: {}, uid: 'n8', google_id: null, maj_le: '2026-09-01 00:00:00', depuis: null }, true],
    ['ancienne liaison, mais importé : jamais', { rdv: { importe: true }, uid: 'n9', google_id: null, maj_le: '2026-09-01 00:00:00', depuis: null }, false],
  ];
  const harnais = '<?php\ndeclare(strict_types=1);\n' + source + '\n'
    + '$cas = json_decode((string) stream_get_contents(STDIN), true);\n'
    + '$r = [];\nforeach ($cas as $c) { $r[] = googleAgendaDoitEnvoyer($c["rdv"], $c["uid"], $c["google_id"], $c["maj_le"], $c["depuis"]); }\n'
    + 'echo json_encode($r);\n';
  const fichier = path.join(os.tmpdir(), 'verif-google-depart-' + process.pid + '.php');
  fs.writeFileSync(fichier, harnais);
  const r = cp.spawnSync(PHP, [fichier], { input: JSON.stringify(cas.map((c) => c[1])), encoding: 'utf8' });
  try { fs.unlinkSync(fichier); } catch (e) {}
  let obtenus = null;
  try { obtenus = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP exécute la fonction sans erreur (mode strict)', Array.isArray(obtenus) && obtenus.length === cas.length, (r.stderr || r.stdout || '').slice(0, 160));
  if (Array.isArray(obtenus)) cas.forEach((c, i) => verifie(c[0], obtenus[i] === c[2], 'obtenu ' + obtenus[i]));

  // La chronologie de Charles : 30 rendez-vous importés à minuit, synchronisation à 8h,
  // un nouveau rendez-vous créé à 10h. Aucun doublon : seul le nouveau part.
  const scenario = [];
  for (let i = 0; i < 30; i++) scenario.push({ rdv: { importe: true, title: 'Importé ' + i }, uid: 'ics_17_' + i, google_id: null, maj_le: '2026-10-15 00:00:05', depuis });
  for (let i = 0; i < 5; i++) scenario.push({ rdv: { title: 'Mien ' + i }, uid: 'm' + i, google_id: null, maj_le: '2026-10-12 18:00:00', depuis });
  scenario.push({ rdv: { title: 'Créé à 10h' }, uid: 'neuf', google_id: null, maj_le: '2026-10-16 10:00:00', depuis });
  scenario.push({ rdv: { importe: true, title: 'Importé puis déplacé à 11h' }, uid: 'ics_17_3', google_id: null, maj_le: '2026-10-16 11:00:00', depuis });
  const f2 = path.join(os.tmpdir(), 'verif-google-depart2-' + process.pid + '.php');
  fs.writeFileSync(f2, harnais);
  const r2 = cp.spawnSync(PHP, [f2], { input: JSON.stringify(scenario), encoding: 'utf8' });
  try { fs.unlinkSync(f2); } catch (e) {}
  let res2 = null;
  try { res2 = JSON.parse(r2.stdout); } catch (e) {}
  const partis = Array.isArray(res2) ? scenario.filter((c, i) => res2[i]).map((c) => c.rdv.title) : null;
  verifie('chronologie de Charles : 30 importés + 5 anciens + 1 créé à 10h + 1 importé déplacé → seul « Créé à 10h » part chez Google', partis !== null && partis.length === 1 && partis[0] === 'Créé à 10h', JSON.stringify(partis));
}

titre('Le départ est posé au bon moment (l\'API)');
const recopier = fonction(api, 'googleAgendaRecopier') || '';
verifie('la recopie ramène la date d\'écriture de chaque rendez-vous (e.maj_le)', /SELECT e\.uid, e\.contenu, e\.maj_le, g\.google_id, g\.empreinte/.test(recopier));
verifie('et applique la règle avant de fabriquer l\'événement', recopier.indexOf('googleAgendaDoitEnvoyer(') > -1 && recopier.indexOf('googleAgendaDoitEnvoyer(') < recopier.indexOf('googleAgendaEvenement('));
verifie('avec le départ de la liaison ($l[\'depuis\'])', /\$l\['depuis'\]/.test(recopier));
verifie('relier pose le départ (NOW()), sans le déplacer si le compte est déjà relié (COALESCE)', /acces_expire_le, depuis\)/.test(api) && /DATE_ADD\(NOW\(\), INTERVAL \? SECOND\), NOW\(\)\)/.test(api) && /depuis = COALESCE\(depuis, NOW\(\)\)/.test(api));
const reglages = api.slice(api.indexOf("case 'POST /google/agenda/reglages':"), api.indexOf("case 'POST /google/agenda/deconnecter':"));
verifie('« Envoyer » remis en marche (0 → 1) repose le départ', /!empty\(\$corps\['envoyer'\]\) && \(int\) \$liaison\['envoyer'\] !== 1/.test(reglages) && /\$champs\[\] = 'depuis = NOW\(\)';/.test(reglages));
verifie('mais pas quand on l\'éteint, ni quand il était déjà en marche', reglages.indexOf("!empty($corps['envoyer'])") > -1 && /!== 1\)/.test(reglages));
const etat = api.slice(api.indexOf("case 'GET /google/agenda/etat':"), api.indexOf("case 'POST /google/agenda/lien':"));
verifie('l\'état dit depuis quand (secondes Unix lues par la base, sans décalage de fuseau)', /'depuis'\s+=> \$l !== null \? googleAgendaDepuis\(/.test(etat) && /UNIX_TIMESTAMP\(depuis\)/.test(api));
const migration = fs.existsSync(path.join(path.dirname(apiChemin), '..', 'sql', '009_google_agenda_depart.sql'))
  ? fs.readFileSync(path.join(path.dirname(apiChemin), '..', 'sql', '009_google_agenda_depart.sql'), 'utf8') : '';
verifie('la migration 009 ajoute la colonne « depuis » (NULL = anciennes liaisons)', /ALTER TABLE google_agenda\s+ADD COLUMN depuis DATETIME NULL/.test(migration));
verifie('l\'API ne dit plus « relié » (messages et page de retour de Google)', !/relié à TimeCool|Rien n’a été relié|n’est pas relié|Google Agenda est relié|La liaison n’a pas abouti/.test(api));

titre('Les deux imports marquent leurs rendez-vous');
verifie('les deux chemins d\'import (rapide et assistant) ajoutent « importe: true »', (page.match(/importe: true,\n\s+id: 'ics_'/g) || []).length === 2);

titre('« Relier » devient « Synchroniser » (la page)');
const debutZone = page.indexOf('async function tcGoogleAgendaAfficher()');
const finZone = page.indexOf('async function tcGoogleAgendaDelier(');
const zone = debutZone > -1 && finZone > debutZone ? page.slice(debutZone, page.indexOf('\n}\n', finZone) + 3) : '';
verifie('le bloc Google Agenda des Paramètres est trouvé', zone.length > 3000, zone.length + ' caractères');
verifie('le bouton dit « Synchroniser mon agenda TimeCool avec mon agenda Google », et après un échec il reprend son libellé d avant (pas un texte figé)', (zone.match(/Synchroniser mon agenda TimeCool avec mon agenda Google/g) || []).length === 1 && /bouton\.textContent = libelle;/.test(zone));
verifie('« Synchroniser à nouveau », « ✅ Synchronisé », « Désynchroniser »', /Synchroniser à nouveau/.test(zone) && /✅ Synchronisé/.test(zone) && />Désynchroniser<\/button>/.test(zone) && /textContent = 'Désynchroniser'/.test(zone));
verifie('plus de « Relier », « Reliez », « Relié » ni « Délier » visibles dans le bloc', !/Relier |Reliez|Relié|Délier|n’est plus relié|délier pour/.test(zone), (zone.match(/Relier |Reliez|Relié|Délier|n’est plus relié|délier pour/) || [''])[0]);
verifie('le texte avant la liaison explique la règle : ce qui existait avant n’est pas envoyé', /Synchronisez votre Google Agenda avec TimeCool/.test(zone) && /ce qui existait avant n’est pas envoyé/.test(zone));
verifie('une fois synchronisé, l\'écran dit depuis quand (« depuis le 7 octobre à 09h30 »)', /depuisTexte = ' depuis le ' \+ d\.getDate\(\)/.test(zone) && /MONTHS\[d\.getMonth\(\)\]\.toLowerCase\(\)/.test(zone) && /Les rendez-vous créés ou modifiés' \+ depuisTexte/.test(zone));
verifie('l\'avertissement « ce qui existait avant n’est pas envoyé » n\'apparaît que s\'il y a un départ (pas pour les anciennes liaisons)', /\(depuisTexte \? ' Ce qui existait avant n’est pas envoyé\.' : ''\)/.test(zone));

titre('L\'aide et Charly disent la vérité');
const faq = (page.match(/\{q: '📅 TimeCool se synchronise-t-il avec Google Agenda \?', a: '([^\n]*)'\}/) || [])[1] || '';
verifie('l\'aide parle de « Synchroniser mon agenda TimeCool avec mon agenda Google » et d\'« Importer mon agenda existant »', /Synchroniser mon agenda TimeCool avec mon agenda Google/.test(faq) && /Importer mon agenda existant/.test(faq), faq.slice(0, 80));
verifie('l\'aide promet « pas de doublons » et ne parle plus de la case « Laisser Charly lire » (pas construite)', /pas de doublons/.test(faq) && !/Deux cases|Laisser Charly lire|Relier/.test(faq));
const iCle = page.indexOf("{ keys: ['google calendar','google agenda','agenda google','calendrier google','calendrier de google','importer agenda','importer mes rdv','synchroniser avec mon ancien agenda','synchroniser mon ancien agenda'],");
const reponse = iCle > -1 ? page.slice(page.indexOf("reply: '", iCle), page.indexOf("' },", page.indexOf("reply: '", iCle))) : '';
verifie('Charly ne répond plus « Pas encore » à une question sur Google Agenda : il explique où synchroniser', /^reply: 'Oui !/.test(reponse) && /Synchroniser mon agenda TimeCool avec mon agenda Google/.test(reponse) && !/Pas encore/.test(reponse), reponse.slice(0, 80));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
