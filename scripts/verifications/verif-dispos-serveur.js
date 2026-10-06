// Les creneaux proposes suivent « Mes disponibilites » du titulaire.
const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 220) : '')); }
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
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/usr/bin/php'].find((p) => fs.existsSync(p));
const noms = ['rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre', 'dispoPlagesDuJour', 'dispoDuCompte', 'creneauxLibres'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
verifie('/rdv/demander transmet les categories de la fiche', /categoriesPourPrendreRdv\(\(int\) \$cible\['id'\], \$moi\)/.test(api) && /creneauxLibres\(\(int\) \$cible\['id'\], 3, \$categoriesRdv\)/.test(api));
verifie('refus conserve : contact bloque ou sans categorie = liste vide, autorisation = liste non vide', /return categoriesPourPrendreRdv\(\$titulaireId, \$demandeur\) !== \[\];/.test(api) && /if \(!empty\(\$c\['blocked'\]\)\) \{\s+return \[\];/.test(api));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Db {
  public static array $lignes = [];
  public static ?array $dispo = null;
  public static function tous(string $sql, array $p = []): array { return self::$lignes; }
  public static function un(string $sql, array $p = []): ?array {
    return self::$dispo === null ? null : ['contenu' => json_encode(['id' => 'timecool_disponibilites', 'v' => json_encode(self::$dispo)])];
  }
}
${src.join('\n')}
$res = [];
function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$ouvre = static fn($d) => !in_array((int) date('w', strtotime($d)), [0, 6], true);
$iso = static function (string $d): int { $w = (int) date('w', strtotime($d)); return $w === 0 ? 7 : $w; };

// Plages d un jour
$dispo = ['travail' => [['jours' => [2, 4], 'debut' => '09:00', 'fin' => '12:00']], 'sante' => [['jours' => [2], 'debut' => '14:00', 'fin' => '16:00']], 'famille' => []];
t('mardi, travail : 9h-12h', dispoPlagesDuJour($dispo, ['travail'], 2) === [[540, 720]]);
t('lundi, travail : aucune plage (jour non coche)', dispoPlagesDuJour($dispo, ['travail'], 1) === []);
t('plusieurs categories : on additionne', dispoPlagesDuJour($dispo, ['travail', 'sante'], 2) === [[540, 720], [840, 960]]);
t('categorie vide : rien de regle (null)', dispoPlagesDuJour($dispo, ['famille'], 2) === null);
t('categorie inconnue : rien de regle (null)', dispoPlagesDuJour($dispo, ['sport'], 2) === null);
t('plage mal formee ignoree', dispoPlagesDuJour(['travail' => [['jours' => [1], 'debut' => 'x', 'fin' => '10:00'], 'oops']], ['travail'], 1) === null);
t('fin avant debut ignoree', dispoPlagesDuJour(['travail' => [['jours' => [1], 'debut' => '10:00', 'fin' => '09:00']]], ['travail'], 1) === []);

// Creneaux proposes
Db::$lignes = []; Db::$dispo = null;
$c = creneauxLibres(1, 3, ['travail']);
t('aucune dispo reglee : horaires par defaut, jours ouvres (compte neuf)', count($c) === 3 && count(array_filter(array_column($c, 'date'), $ouvre)) === 3 && in_array($c[0]['heure'], [9, 10, 11, 14, 15, 16, 17], true), json_encode($c));
$c = creneauxLibres(1, 3, []);
t('sans categorie : horaires par defaut', count($c) === 3);

Db::$dispo = ['travail' => [['jours' => [2, 4], 'debut' => '14:00', 'fin' => '16:00']]];
$c = creneauxLibres(1, 3, ['travail']);
$ok = count($c) === 3;
foreach ($c as $x) { $ok = $ok && in_array($iso($x['date']), [2, 4], true) && in_array($x['heure'], [14, 15], true); }
t('mardi et jeudi 14h-16h seulement', $ok, json_encode($c));

Db::$dispo = ['amis' => [['jours' => [6, 7], 'debut' => '11:00', 'fin' => '15:00']]];
$c = creneauxLibres(1, 3, ['amis']);
$ok = count($c) >= 1;
foreach ($c as $x) { $ok = $ok && in_array($iso($x['date']), [6, 7], true) && $x['heure'] === 11; }
t('un ami : week-end 11h-15h, jamais en semaine', $ok, json_encode($c));

Db::$dispo = ['travail' => [['jours' => [1, 2, 3, 4, 5], 'debut' => '09:30', 'fin' => '11:30']]];
$c = creneauxLibres(1, 3, ['travail']);
$ok = count($c) === 3;
foreach ($c as $x) { $ok = $ok && $x['heure'] === 10; }
t('9h30-11h30 : le seul creneau d une heure pleine est 10h', $ok, json_encode($c));

// Dispo + agenda : un rendez-vous pris retire le creneau, la suite est proposee
$d1 = date('Y-m-d', strtotime('+1 day'));
Db::$dispo = ['travail' => [['jours' => [1, 2, 3, 4, 5, 6, 7], 'debut' => '09:00', 'fin' => '12:00']]];
Db::$lignes = [['contenu' => json_encode(['date' => $d1, 'startH' => 9, 'startM' => 0, 'endH' => 10, 'endM' => 0])]];
$c = creneauxLibres(1, 3, ['travail']);
t('9h pris demain : on propose 10h demain', $c[0]['date'] === $d1 && $c[0]['heure'] === 10, json_encode($c[0]));
Db::$dispo = ['travail' => [['jours' => [1], 'debut' => '09:00', 'fin' => '10:00']]];
Db::$lignes = [];
$c = creneauxLibres(1, 3, ['travail']);
t('un seul lundi 9h dans la quinzaine : au plus 3 lundis, jamais plus', count($c) <= 3 && count($c) >= 1 && array_reduce($c, static fn($a, $x) => $a && $iso($x['date']) === 1, true));
Db::$dispo = ['travail' => [['jours' => [1], 'debut' => '09:00', 'fin' => '09:30']]];
t('plage trop courte (30 min) : aucun creneau', creneauxLibres(1, 3, ['travail']) === []);
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-dispos-' + process.pid + '.php');
  fs.writeFileSync(f, h);
  const lint = cp.spawnSync(PHP, ['-l', f], { encoding: 'utf8' });
  verifie('harnais valide', lint.status === 0, lint.stdout + lint.stderr);
  const r = cp.spawnSync(PHP, [f], { encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (e) {}
  let res = null; try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP s execute', Array.isArray(res), (r.stderr || r.stdout).slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
}
console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
