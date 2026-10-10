// « Prevenir » depuis la fiche d un rendez-vous (campagne 1, 07/10) :
//  - la fenetre s ouvrait DERRIERE la fiche (z-index 60 contre 200) ;
//  - un rendez-vous pris entre comptes n avait pas de contact rattache.
const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
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
console.log('-- 1. Les feuilles du bas passent au-dessus des fiches --');
const z = (sel) => { const m = page.match(new RegExp('\\' + sel + ' *\\{[^}]*z-index: *(\\d+)')); return m ? Number(m[1]) : null; };
const zFeuille = z('.msg-sheet-ov'), zFiche = z('.modal-overlay');
verifie('la feuille (' + zFeuille + ') est au-dessus de la fiche (' + zFiche + ')', zFeuille > zFiche);
verifie('mais sous les confirmations et le message (9998 et plus)', zFeuille < 9998);
console.log('-- 2. Sans contact : la fenetre « Avec qui ? » s ouvre seule --');
const f = fonction(page, 'openPrevenirFromEvent') || '';
verifie('plus de petit message avant la fenetre', !/showToast/.test(f) && /tcChoisirContactRdv\(function \(id\)/.test(f));
console.log('-- 3. Un rendez-vous pris entre comptes arrive avec son contact --');
const choisir = api.slice(api.indexOf("case 'POST /rdv/choisir':"), api.indexOf("case 'POST /messages/envoyer':"));
verifie('chaque agenda recoit la fiche de l autre', /ficheContactDe\(\(int\) \$moi\['id'\], \$cible\)/.test(choisir) && /ficheContactDe\(\(int\) \$cible\['id'\], \$moi\)/.test(choisir));
const PHP = ['/opt/plesk/php/8.3/bin/php', '/opt/plesk/php/8.2/bin/php', '/usr/bin/php'].find((p) => fs.existsSync(p));
const src = fonction(api, 'ficheContactDe');
verifie('ficheContactDe existe', !!src);
if (PHP && src) {
  const h = `<?php
declare(strict_types=1);
class Empreinte {
  public static function normaliserTelephone(string $t): string { return preg_replace('/\\D+/', '', $t) ?? ''; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db { public static array $l = []; public static function tous(string $s, array $p = []): array { return self::$l; } }
${fonction(api, 'memeReference')}
${src}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$fiche = static fn(array $c) => ['contenu' => json_encode($c)];
Db::$l = [$fiche(['id' => 'c_a', 'name' => 'Autre', 'phone' => '06 99 99 99 99']), $fiche(['id' => 'c_m', 'name' => 'Michele', 'phone' => '06 11 22 33 44', 'email' => 'Michele@Exemple.fr'])];
t('meme telephone, ecrit autrement', ficheContactDe(1, ['telephone' => '0611223344', 'email' => '']) === 'c_m');
t('meme email, casse differente', ficheContactDe(1, ['telephone' => '', 'email' => 'michele@exemple.fr']) === 'c_m');
t('personne inconnue : pas de contact', ficheContactDe(1, ['telephone' => '0700000000', 'email' => 'x@y.fr']) === null);
t('ni telephone ni email : jamais de faux rapprochement', ficheContactDe(1, ['telephone' => '', 'email' => '']) === null);
Db::$l = [$fiche(['name' => 'Sans id', 'phone' => '0611223344'])];
t('fiche sans identifiant : ignoree', ficheContactDe(1, ['telephone' => '0611223344', 'email' => '']) === null);
Db::$l = [['contenu' => 'pas du json']];
t('fiche illisible : ignoree', ficheContactDe(1, ['telephone' => '0611223344', 'email' => '']) === null);
Db::$l = [$fiche(['id' => 'c_r', 'name' => 'Par reference', 'referenceCompte' => 'REF123'])];
t('meme reference de compte : fiche reconnue', ficheContactDe(1, ['telephone' => '', 'email' => '', 'reference' => 'REF123']) === 'c_r');
t('reference differente : pas de rapprochement', ficheContactDe(1, ['telephone' => '', 'email' => '', 'reference' => 'AUTRE']) === null);
echo json_encode($res);
`;
  const fch = path.join(os.tmpdir(), 'verif-prevenir-' + process.pid + '.php');
  fs.writeFileSync(fch, h);
  const r = cp.spawnSync(PHP, [fch], { encoding: 'utf8' });
  try { fs.unlinkSync(fch); } catch (e) {}
  let res = null; try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP execute ficheContactDe', Array.isArray(res), (r.stderr || r.stdout).slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
  const lint = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' });
  verifie('php -l : API valide', lint.status === 0, lint.stdout + lint.stderr);
}
console.log('\n' + ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
