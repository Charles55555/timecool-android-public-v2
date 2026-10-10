// Regle du 09/10 : tout contact qui a un compte TimeCool peut demander un
// rendez-vous, sauf s il est bloque. Les categories ne sont qu une limite.
const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
const wf = fs.existsSync(path.join(path.dirname(apiChemin), '..', '..', '.github', 'workflows', 'build-apk.yml'))
  ? fs.readFileSync(path.join(path.dirname(apiChemin), '..', '..', '.github', 'workflows', 'build-apk.yml'), 'utf8') : '';
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).slice(0, 220) : '')); }
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
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/usr/bin/php'].find((p) => fs.existsSync(p));

titre('1. Qui peut demander un rendez-vous (execute sous PHP)');
const noms = ['memeReference', 'validationRdvExigee', 'categoriesToutesPourRdv', 'categoriesPourPrendreRdv', 'categoriesPourRdvAutomatique', 'autorisationPourPrendreRdv'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
class Empreinte {
  public static function normaliserTelephone(string $t): string { return preg_replace('/\\D+/', '', $t) ?? ''; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db {
  public static array $l = [];
  public static ?array $reg = null;
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$l); }
  public static function un(string $s, array $p = []): ?array { return self::$reg === null ? null : ['contenu' => json_encode(self::$reg)]; }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$moi = ['telephone' => '0611223344', 'email' => 'charles@exemple.fr', 'reference' => 'REFCH'];
$toutes = ['travail', 'sante', 'famille', 'amis', 'sport'];   // « personnel » (temps libre) n ouvre rien : il est protege
Db::$l = [];
t('aucune fiche : inconnu du carnet, la demande passe par la messagerie', categoriesPourPrendreRdv(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '06 11 22 33 44']];
t('une fiche sans categorie (contact NON CLASSE) : comme un inconnu, la demande passe par la messagerie', categoriesPourPrendreRdv(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '06 11 22 33 44', 'categories' => []]];
t('une fiche aux categories vides : non classe, messagerie', categoriesPourPrendreRdv(1, $moi) === []);
Db::$l = [['id' => 'c1', 'email' => 'Charles@Exemple.fr', 'categories' => ['sante']]];
t('une fiche avec une categorie : seulement celle-la (limite facultative)', categoriesPourPrendreRdv(1, $moi) === ['sante']);
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'blocked' => true]];
t('un contact bloque : refuse', categoriesPourPrendreRdv(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'blocked' => true, 'categories' => ['travail']]];
t('bloque, meme avec des categories cochees : refuse', categoriesPourPrendreRdv(1, $moi) === []);
Db::$l = [['id' => 'c9', 'phone' => '0699999999', 'blocked' => true]];
t('un autre contact bloque ne fait pas du demandeur un contact connu', categoriesPourPrendreRdv(1, $moi) === []);
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['travail', 5, 'sante']]];
t('des categories mal formees sont ecartees', categoriesPourPrendreRdv(1, $moi) === ['travail', 'sante']);
Db::$l = [['id' => 'c1', 'phone' => '0611223344']];
Db::$reg = null;
t('validation jamais reglee : exigee, aucune demande automatique', validationRdvExigee(1) && categoriesPourRdvAutomatique(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => '1'];
t('validation cochee : aucune demande automatique, meme pour un contact', categoriesPourRdvAutomatique(1, $moi) === []);
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => '0'];
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['travail']]];
t('validation decochee, contact classe travail : automatique, dans les plages travail SEULEMENT', !validationRdvExigee(1) && categoriesPourRdvAutomatique(1, $moi) === ['travail'] && autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '0611223344']];
t('validation decochee, contact enregistre mais NON CLASSE : messagerie', categoriesPourRdvAutomatique(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['personnel']]];
t('validation decochee, seule la pastille « temps libre » : toujours non classe, messagerie', categoriesPourRdvAutomatique(1, $moi) === []);
Db::$l = [];
t('validation decochee, inconnu du carnet : messagerie', categoriesPourRdvAutomatique(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'blocked' => true]];
t('validation decochee, contact bloque : messagerie', categoriesPourRdvAutomatique(1, $moi) === []);
Db::$l = [['id' => 'c2', 'name' => 'Par reference', 'referenceCompte' => 'REFCH', 'categories' => ['travail', 'amis']]];
t('validation decochee, fiche classee reconnue par la reference du compte : automatique, ses categories seulement', categoriesPourRdvAutomatique(1, $moi) === ['travail', 'amis']);
Db::$l = [['id' => 'c2', 'referenceCompte' => 'REFCH', 'blocked' => true]];
t('fiche bloquee reconnue par la reference : messagerie', categoriesPourRdvAutomatique(1, $moi) === []);
Db::$reg = null;
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['personnel']]];
t('pastille « temps libre » seule : ne classe personne (messagerie)', categoriesPourPrendreRdv(1, $moi) === []);
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['sante', 'personnel']]];
t('sante + temps libre : limite a la sante, et peut deranger', categoriesPourPrendreRdv(1, $moi) === ['sante', 'personnel']);
Db::$l = [['id' => 'c1', 'phone' => '0611223344', 'blocked' => true, 'categories' => ['personnel']]];
t('bloque, meme avec le temps libre : refuse', categoriesPourPrendreRdv(1, $moi) === []);
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-acces-' + process.pid + '.php');
  fs.writeFileSync(f, h);
  const lint = cp.spawnSync(PHP, ['-l', f], { encoding: 'utf8' });
  verifie('harnais valide', lint.status === 0, lint.stdout + lint.stderr);
  const r = cp.spawnSync(PHP, [f], { encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (e) {}
  let res = null; try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP s execute (mode strict)', Array.isArray(res), (r.stderr || r.stdout).slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
  const lintApi = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' });
  verifie('php -l : API valide', lintApi.status === 0, lintApi.stdout + lintApi.stderr);
}

titre('2. Les textes de l ecran disent la nouvelle regle');
verifie('l alerte rouge « aucun contact autorise — personne ne peut reserver » a disparu', !/Aucun contact autoris/.test(page));
verifie('« Mes disponibilites » : « N contacts peuvent réserver seuls dans ces heures » (le compte des contacts classés)', /contacts peuvent r.server seuls dans ces heures/.test(page) && /contact peut r.server seul dans ces heures/.test(page) && /Aucun contact ne peut encore r.server seul dans ces heures/.test(page));
verifie('fiche contact : « Il peut réserver seul dans les plages de : (sans choix : il passe par ma messagerie) »', /Il peut réserver seul dans les plages de :/.test(page) && /\(sans choix : il passe par ma messagerie\)/.test(page) && !/Il peut me prendre un RDV\. Pour limiter/.test(page));
verifie('fiche contact : la legende ne parle plus d « autorise / non autorise »', !/= autoris\\u00e9 &nbsp;/.test(page) && /= heures retenues/.test(page));

titre('3. L APK est aussi publie avec son numero de version');
verifie('le fichier permanent timecool.apk est inchange', /cp "\$SRC" dist\/timecool\.apk/.test(wf) && /releases\/latest\/download\/timecool\.apk/.test(wf));
verifie('une copie timecool-<version>.apk est preparee', /cp "\$SRC" "dist\/timecool-\$\{\{ steps\.version\.outputs\.name \}\}\.apk"/.test(wf));
verifie('et jointe a la Release', /dist\/timecool\.apk \\\s+"dist\/timecool-\$\{\{ steps\.version\.outputs\.name \}\}\.apk"/.test(wf));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
