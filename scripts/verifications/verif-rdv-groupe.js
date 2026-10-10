// Rendez-vous a plusieurs (08/10) : creneaux communs, reconnaissance de la
// phrase par Charly, forme des routes.
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 220) : '')); }
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
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/usr/bin/php'].find((p) => fs.existsSync(p));

titre('1. Les creneaux communs, executes sous PHP');
const noms = ['rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre', 'plagesDeCategorie', 'retirerPlages', 'dispoPlagesDuJour', 'dispoDuCompte', 'heuresPermisesDuJour', 'personneDisponible', 'creneauxCommuns'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l API', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Db {
  public static array $rdv = [];
  public static array $dispo = [];
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$rdv[$p[0]] ?? []); }
  public static function un(string $s, array $p = []): ?array {
    $d = self::$dispo[$p[0]] ?? null;
    return $d === null ? null : ['contenu' => json_encode(['id' => 'x', 'v' => json_encode($d)])];
  }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$jour = static fn(int $plus): string => date('Y-m-d', strtotime("+$plus day"));
$toutLeJour = static fn(int $de, int $a): array => ['date' => $jour($de), 'dateFin' => $jour($a), 'startH' => 0, 'startM' => 0, 'endH' => 23, 'endM' => 59, 'allDay' => true];
$A = ['id' => 2, 'prenom' => 'Alice', 'categories' => ['travail']];
$B = ['id' => 3, 'prenom' => 'Bob', 'categories' => ['travail']];
$defaut = ['travail' => [['jours' => [1, 2, 3, 4, 5], 'debut' => '09:00', 'fin' => '12:00'], ['jours' => [1, 2, 3, 4, 5], 'debut' => '14:00', 'fin' => '18:00']]];   // les plages de l ecran
$iso = static function (string $d): int { $w = (int) date('w', strtotime($d)); return $w === 0 ? 7 : $w; };

// Heures permises
t('sans disponibilite : aucune heure (plus d horaires par defaut caches)', heuresPermisesDuJour([], ['travail'], 2) === []);
t('sans disponibilite : week-end, rien', heuresPermisesDuJour([], ['travail'], 6) === [] && heuresPermisesDuJour([], ['travail'], 0) === []);
t('avec disponibilites : 14h-16h le mardi', heuresPermisesDuJour(['travail' => [['jours' => [2], 'debut' => '14:00', 'fin' => '16:00']]], ['travail'], 2) === [14, 15]);
t('avec disponibilites : le mercredi (non coche), rien', heuresPermisesDuJour(['travail' => [['jours' => [2], 'debut' => '14:00', 'fin' => '16:00']]], ['travail'], 3) === []);
t('deux plages se recouvrant : pas de doublon', heuresPermisesDuJour(['travail' => [['jours' => [1], 'debut' => '09:00', 'fin' => '11:00'], ['jours' => [1], 'debut' => '10:00', 'fin' => '12:00']]], ['travail'], 1) === [9, 10, 11]);

// Libre ?
t('deux heures de suite : 11h-13h refuse par defaut (12h non permise)', !personneDisponible([], [9, 10, 11, 14, 15], $jour(2), 11, 2));
t('deux heures de suite : 9h-11h accepte', personneDisponible([], [9, 10, 11, 14, 15], $jour(2), 9, 2));
t('une heure libre dans les plages, mais l agenda est pris : refuse', !personneDisponible(rdvOccupation(99) + [$jour(2) => [[540, 600]]], [9, 10], $jour(2), 9, 1));

// Tout le monde libre
Db::$rdv = []; Db::$dispo = [2 => $defaut, 3 => $defaut];
$c = creneauxCommuns(1, [$A, $B], 1, 3);
$dates = array_column($c, 'date');
t('agenda vide : 3 creneaux, tous complets, jours distincts', count($c) === 3 && count(array_filter($c, static fn($x) => $x['manquants'] !== [])) === 0 && count(array_unique($dates)) === 3, json_encode($c));
t('jamais le week-end sans disponibilite reglee', count(array_filter($dates, static fn($d) => $iso($d) >= 6)) === 0, json_encode($dates));
t('le premier creneau d une journee vide est 9h (organisateur libre des 8h, invites des 9h)', $c[0]['heure'] === 9);
t('chaque creneau dit sa duree', $c[0]['duree'] === 1);

// Un invite occupe tout le temps : creneaux partiels
Db::$rdv = [3 => [$toutLeJour(1, 20)]];
$c = creneauxCommuns(1, [$A, $B], 1, 3);
t('Bob est pris : on propose quand meme, en disant qu il manque', count($c) === 3 && $c[0]['manquants'] === ['Bob'], json_encode($c));

// Tous occupes : rien
Db::$rdv = [2 => [$toutLeJour(1, 20)], 3 => [$toutLeJour(1, 20)]];
t('tous les invites sont pris : aucun creneau', creneauxCommuns(1, [$A, $B], 1, 3) === []);

// L organisateur occupe : rien
Db::$rdv = [1 => [$toutLeJour(1, 20)]];
t('l organisateur est pris : aucun creneau', creneauxCommuns(1, [$A, $B], 1, 3) === []);

// Deux heures
Db::$rdv = [];
$c = creneauxCommuns(1, [$A], 2, 3);
$ok = count($c) === 3;
foreach ($c as $x) { $ok = $ok && in_array($x['heure'], [9, 10, 14, 15, 16], true) && $x['duree'] === 2; }
t('deux heures : jamais a cheval sur la pause de midi', $ok, json_encode($c));

// Les creneaux complets passent avant les partiels
$jj = 2; while ($iso($jour($jj)) >= 6) { $jj++; }
$d3 = $jour($jj);
Db::$rdv = [2 => [$toutLeJour(1, $jj - 1), $toutLeJour($jj + 1, 20)]];   // Alice libre seulement ce jour ouvre
$c = creneauxCommuns(1, [$A, $B], 1, 3);
t('le seul creneau ou Alice et Bob sont libres arrive en premier', $c[0]['manquants'] === [] && $c[0]['date'] === $d3 && $c[1]['manquants'] === ['Alice'], json_encode($c));

// Disponibilites des invites
Db::$rdv = []; Db::$dispo = [2 => ['travail' => [['jours' => [2], 'debut' => '14:00', 'fin' => '16:00']]]];
$c = creneauxCommuns(1, [$A], 1, 3);
$ok = count($c) >= 1;
foreach ($c as $x) { $ok = $ok && $iso($x['date']) === 2 && in_array($x['heure'], [14, 15], true) && $x['manquants'] === []; }
t('Alice ne reçoit que le mardi 14h-16h : seuls ces creneaux sont complets', $ok, json_encode($c));
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-groupe-' + process.pid + '.php');
  fs.writeFileSync(f, h);
  const lint = cp.spawnSync(PHP, ['-l', f], { encoding: 'utf8' });
  verifie('harnais valide', lint.status === 0, lint.stdout + lint.stderr);
  const r = cp.spawnSync(PHP, [f], { encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (e) {}
  let res = null; try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP s execute sans erreur (mode strict)', Array.isArray(res), (r.stderr || r.stdout).slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
  const lintApi = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' });
  verifie('php -l : API valide', lintApi.status === 0, lintApi.stdout + lintApi.stderr);
}

titre('2. Les routes : autorisation, verrous, verification a la confirmation');
const prop = api.slice(api.indexOf("case 'POST /rdv/groupe/proposer':"), api.indexOf("case 'POST /rdv/groupe/confirmer':"));
const conf = api.slice(api.indexOf("case 'POST /rdv/groupe/confirmer':"), api.indexOf('/* Message libre d un compte'));
verifie('proposer : passe par invitesRdvGroupe (autorisation par fiche) et creneauxCommuns', /invitesRdvGroupe\(\$moi/.test(prop) && /creneauxCommuns\(\(int\) \$moi\['id'\], \$invites, \$duree, 3\)/.test(prop));
verifie('proposer : duree bornee a 1-3 heures', /\$duree < 1 \|\| \$duree > 3/.test(prop));
const inv = fonction(api, 'invitesRdvGroupe') || '';
verifie('de 1 a 12 personnes, refus sinon', /count\(\$references\) > 12/.test(inv) && /Rep::erreur\(400, 'participants_invalides'/.test(inv));
verifie('un invite sans autorisation (ou bloque) est mis de cote sans dire pourquoi', /categoriesPourRdvAutomatique\(\(int\) \$c\['id'\], \$moi\)/.test(inv) && /\$sansAcces\[\] = texteSur/.test(inv));
verifie('soi-meme et les doublons sont ignores', /\$vus = \[\(int\) \$moi\['id'\] => true\]/.test(inv) && /isset\(\$vus\[\(int\) \$c\['id'\]\]\)/.test(inv));
verifie('confirmer : date, heure (8h-20h) et duree validees, creneau dans le futur et sous 30 jours', /\$heure < 8 \|\| \$heure \+ \$duree > 20/.test(conf) && /\$debutTs <= time\(\) \|\| \$debutTs > strtotime\('\+30 day'\)/.test(conf));
verifie('confirmer : transaction, verrous dans l ordre des identifiants', /beginTransaction\(\)/.test(conf) && /sort\(\$ids\);\s+foreach \(\$ids as \$idCompte\) \{\s+Db::un\('SELECT id FROM comptes WHERE id = \? FOR UPDATE'/.test(conf));
verifie('confirmer : l agenda de l organisateur est relu sous verrou, 409 sinon', /creneauRetenuEstLibre\(\(int\) \$moi\['id'\], \$debutSql, \$finSql\)/.test(conf) && /rollBack\(\);\s+Rep::erreur\(409, 'creneau_pris'/.test(conf));
verifie('confirmer : chaque invite est revu (disponibilites + agenda), seuls les libres sont inscrits', /heuresPermisesDuJour\(dispoDuCompte\(\$inv\['id'\]\), \$inv\['categories'\], \$jsem\)/.test(conf) && /personneDisponible\(rdvOccupation\(\$inv\['id'\]\)/.test(conf) && /\$exclus\[\] = \$inv\['prenom'\]/.test(conf));
verifie('confirmer : personne de libre = 409, rien n est ecrit', /\$inclus === \[\]/.test(conf) && conf.indexOf('$inclus === []') < conf.indexOf('elementsPoser('));
verifie('confirmer : un identifiant unique pour le rendez-vous, un message a chaque invite, puis commit', /'tc_grp_' \. bin2hex\(random_bytes\(8\)\)/.test(conf) && /messagePoser\(\s+\$moi, \$inv\['compte'\]/.test(conf) && conf.indexOf('messagePoser(') < conf.indexOf('$pdo->commit()'));
verifie('les titres passent par texteSur (nom d autrui)', (conf.match(/texteSur\(/g) || []).length >= 1 && /texteSur\(trim\(\$moi\['prenom'\]/.test(conf));

titre('3. Charly reconnait la phrase (execute dans la vraie page)');
const ctx = {}; vm.createContext(ctx);
['tcSansAccents', 'tcMotsDuTexte', 'tcComptesCitesDansTexte', 'tcDetecterRdvGroupe'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
vm.runInContext(`var contactsList = [
  { id: 'c1', name: 'William Ayache', referenceCompte: 'REFW' },
  { id: 'c2', name: 'Stéphane Levy', referenceCompte: 'REFS' },
  { id: 'c3', name: 'Marie Dupont' },
  { id: 'c4', name: 'Marc Bloque', referenceCompte: 'REFM', blocked: true },
  { id: 'c5', name: 'Paul Martin', referenceCompte: 'REFP1' },
  { id: 'c6', name: 'Paul Durand', referenceCompte: 'REFP2' }
];`, ctx);
const det = (t) => vm.runInContext('(function () { const r = tcDetecterRdvGroupe(' + JSON.stringify(t) + '); return r ? { refs: r.contacts.map(c => c.referenceCompte), duree: r.duree } : null; })()', ctx);
let r1 = det('William ayache et Stéphane levy et moi si tu peux trouver le créneau commun libre dans nos 3 agendas pour prendre un rendez vous a nous 3');
verifie('la phrase de la capture : 2 contacts reconnus, 1 heure', r1 && r1.refs.join() === 'REFW,REFS' && r1.duree === 1, JSON.stringify(r1));
let r2 = det('Prends-nous un rdv avec William et Stéphane pendant 2h');
verifie('prenoms seuls (uniques) reconnus, duree 2 h', r2 && r2.refs.join() === 'REFW,REFS' && r2.duree === 2, JSON.stringify(r2));
verifie('« deux heures » en lettres', (det('trouve un creneau pour une reunion de deux heures avec William Ayache et Stéphane Levy') || {}).duree === 2);
verifie('« de 9h à 11h » n est PAS lu comme une durée de 9 heures', (det('rendez-vous de 9h à 11h avec William Ayache et Stéphane Levy') || {}).duree === 1);
verifie('« de 2 heures » : durée 2', (det('rendez-vous de 2 heures avec William Ayache et Stéphane Levy') || {}).duree === 2);
verifie('un seul contact avec compte : le message suit son chemin habituel', det('rendez-vous avec William Ayache') === null);
verifie('un contact sans compte ne compte pas', det('rendez-vous avec William Ayache et Marie Dupont') === null);
verifie('un contact bloque ne compte pas', det('rendez-vous avec William Ayache et Marc Bloque') === null);
verifie('deux « Paul » : le prenom seul est ambigu, on ne devine pas', det('rendez-vous avec Paul et William') === null);
verifie('mais leurs noms complets suffisent', (det('rendez-vous avec Paul Martin et Paul Durand') || {}).refs.join() === 'REFP1,REFP2');
verifie('sans mot de rendez-vous : rien', det('William Ayache et Stéphane Levy') === null);
verifie('prevenir ou annuler : jamais intercepte ici', det('préviens William Ayache et Stéphane Levy que j annule le rendez-vous') === null && det('je serai en retard au rendez-vous avec William Ayache et Stéphane Levy') === null);

titre('4. Branchements dans la page');
verifie('Charly intercepte avant le modele (apres « prevenir »)', page.indexOf('const _prevenance = tcDetecterPrevenance(text);') < page.indexOf('const _groupe = tcDetecterRdvGroupe(text);') && page.indexOf('const _groupe = tcDetecterRdvGroupe(text);') < page.indexOf('// === IMPRÉVU sans jour'));
verifie('la carte est dessinee par renderChatMessage', /function renderChatMessage\(m\) \{\s+if \(m && m\._groupe\) return tcRendreGroupe\(m\);/.test(page));
verifie('les deux appels au serveur existent', /async proposerRdvGroupe\(references, duree\)/.test(page) && /\/rdv\/groupe\/proposer/.test(page) && /\/rdv\/groupe\/confirmer/.test(page));
const confirmer = fonction(page, 'tcConfirmerRdvGroupe') || '';
verifie('creneau pris (409) : la recherche est relancee seule', /e\.code === 'creneau_pris'/.test(confirmer) && /tcProposerRdvGroupe\(g\.references, g\.duree/.test(confirmer));
verifie('apres confirmation, la synchronisation ramene le rendez-vous', /tcSyncTour\(\)/.test(confirmer));
const rendre = fonction(page, 'tcRendreGroupe') || '';
verifie('tous les noms affiches sont echappes', !/\+ s\.libelle \+/.test(rendre) && /escapeHTMLSafe\(lib\)/.test(rendre) && /escapeHTMLSafe\(p\)/.test(fonction(page, 'tcListeDePrenoms') || ''));

verifie('en-tete juste : « tous libres » seulement si TOUS les creneaux sont complets', /complets === g\.creneaux\.length/.test(rendre) && /meilleurs créneaux/.test(rendre));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
