<?php
/**
 * Mission 71 : retire des comptes les copies des clés de l'administrateur.
 *
 * Jusqu'ici, chaque inscription recopiait ces clés dans le compte neuf, et les applications les renvoyaient au
 * serveur : elles passaient pour des clés du compte, et GET /cles-api/valeur les rendait en clair. Une clé est
 * une copie si elle vaut celle d'un administrateur, ou si plusieurs comptes ont exactement la même (ancienne clé
 * de l'administrateur). Une clé propre à un seul compte reste. Rien de sensible n'est affiché.
 *
 *   php cles-heritees.php --compter
 *   php cles-heritees.php --effacer      sauvegarde d'abord les lignes, toujours chiffrées
 *
 * TC_CONFIG : le fichier config.php (par défaut, celui de la production).
 * TC_CLES_TABLE : une autre table, pour les essais.
 */
declare(strict_types=1);

$mode = $argv[1] ?? '';
if (!in_array($mode, ['--compter', '--effacer'], true)) {
    fwrite(STDERR, "Usage : php cles-heritees.php --compter | --effacer\n");
    exit(2);
}
$config = getenv('TC_CONFIG') ?: '/var/www/vhosts/timecool.fr/private/config.php';
require dirname((string) realpath($config)) . '/lib.php';
Conf::charger($config);

$table = getenv('TC_CLES_TABLE') ?: 'cles_api';
if (!preg_match('/^[a-z0-9_]+$/', $table)) {
    fwrite(STDERR, "Table refusée.\n");
    exit(2);
}

$lignes = Db::tous(
    "SELECT k.id, k.compte_id, k.service, k.valeur_chiffree, k.indice, k.maj_le, c.admin
       FROM $table k JOIN comptes c ON c.id = k.compte_id",
    []
);

$illisibles = 0;
$deAdmin = [];     // service|empreinte des clés des administrateurs
$comptes = [];     // service|empreinte => comptes qui l'ont
foreach ($lignes as $i => $l) {
    $clair = Coffre::dechiffrer($l['valeur_chiffree']);
    if ($clair === null) {
        $illisibles++;
        $lignes[$i]['empreinte'] = null;
        continue;
    }
    $e = $l['service'] . '|' . hash('sha256', $clair);
    $lignes[$i]['empreinte'] = $e;
    $comptes[$e][(int) $l['compte_id']] = true;
    if ((int) $l['admin'] === 1) {
        $deAdmin[$e] = true;
    }
}

$copies = [];
$propres = [];
foreach ($lignes as $l) {
    if ((int) $l['admin'] === 1) {
        continue;
    }
    $e = $l['empreinte'];
    if ($e !== null && (isset($deAdmin[$e]) || count($comptes[$e]) > 1)) {
        $copies[] = $l;
    } else {
        $propres[] = $l;
    }
}

echo count($lignes) . " clés, dont " . count($copies) . " copies à retirer.\n";
$parService = [];
foreach ($copies as $l) {
    $parService[$l['service']] = ($parService[$l['service']] ?? 0) + 1;
}
ksort($parService);
foreach ($parService as $service => $n) {
    echo "  $service : $n\n";
}
echo count($propres) . " clés propres gardées (comptes : "
    . implode(', ', array_unique(array_map(static fn($l) => (string) $l['compte_id'], $propres))) . ")\n";
echo "$illisibles clés illisibles (gardées, sauf si la production les lit).\n";

if ($mode === '--compter' || $copies === []) {
    exit(0);
}

$dossier = (getenv('HOME') ?: '/tmp') . '/sauvegardes-base';
if (!is_dir($dossier)) {
    mkdir($dossier, 0700, true);
}
$fichier = $dossier . '/cles-heritees-' . date('d-m-Y-Hi') . '.json';
$ecrit = file_put_contents($fichier, json_encode($copies, JSON_UNESCAPED_UNICODE));
if ($ecrit === false || !chmod($fichier, 0600)) {
    fwrite(STDERR, "Sauvegarde en échec : rien n'est effacé.\n");
    exit(3);
}
$relu = json_decode((string) file_get_contents($fichier), true);
if (!is_array($relu) || count($relu) !== count($copies)) {
    fwrite(STDERR, "Sauvegarde illisible : rien n'est effacé.\n");
    exit(3);
}
echo "Sauvegarde : $fichier\n";

$n = 0;
foreach ($copies as $l) {
    Db::req("DELETE FROM $table WHERE id = ?", [$l['id']]);
    $n++;
}
echo "$n copies retirées.\n";
