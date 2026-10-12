// Mission 2 (Charles, 11/10, « silence ») : un contact BLOQUE qui demande un rendez-vous ne laisse
// aucune trace chez la personne qui l a bloque (ni rendez-vous, ni message, ni notification), et
// recoit exactement la reponse d une premiere demande ordinaire. Debloque, il redevient un
// inconnu ordinaire : messagerie. Regles executees sous PHP ; structure des routes ; textes de la page.
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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

titre('1. Les regles, executees sous PHP');
const noms = ['memeReference', 'fichesDe', 'demandeurBloque', 'echoDemandeRecent', 'categoriesToutesPourRdv', 'categoriesPourPrendreRdv', 'reponseDemandeEnMessagerie'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l API', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
class Empreinte {
  public static function normaliserTelephone(string $t): string { return preg_replace('/\\D+/', '', $t) ?? ''; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db {
  public static array $fiches = [];
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
  public static ?array $conv = null;
  public static function un(string $s, array $p = []): ?array { return self::$conv === null ? null : ['contenu' => json_encode(self::$conv)]; }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
// Le bouchon Empreinte ci-dessus ne ramene pas +33 a 0 : numero deja national, comme dans les autres suites.
$clem = ['telephone' => '0611223344', 'email' => 'Clemence@Exemple.fr', 'reference' => 'REFCLEM'];
$travail = ['id' => 'c1', 'phone' => '06 11 22 33 44', 'email' => '', 'categories' => ['travail']];
$bloqueeParRef = ['id' => 'c2', 'name' => 'Clemence Ravaud', 'phone' => '', 'email' => '', 'referenceCompte' => 'REFCLEM', 'blocked' => true];

Db::$fiches = [];
t('carnet vide : pas bloquee', !demandeurBloque(1, $clem));
Db::$fiches = [$travail];
t('une fiche classee, pas bloquee', !demandeurBloque(1, $clem) && categoriesPourPrendreRdv(1, $clem) === ['travail']);
Db::$fiches = [$travail, $bloqueeParRef];
t('bloquee sur UNE fiche parmi deux (l autre classee travail) : bloquee partout', demandeurBloque(1, $clem));
t('et aucune categorie ne s ouvre (messagerie)', categoriesPourPrendreRdv(1, $clem) === []);
t('les deux fiches sont bien reconnues comme les siennes', count(fichesDe(1, $clem)) === 2);
Db::$fiches = [$travail, ['blocked' => false] + $bloqueeParRef];
t('debloquee (blocked:false) : plus bloquee, sa categorie travail s ouvre a nouveau', !demandeurBloque(1, $clem) && categoriesPourPrendreRdv(1, $clem) === ['travail']);
Db::$fiches = [['id' => 'x', 'phone' => '0699999999', 'blocked' => true]];
t('la fiche bloquee de quelqu un d autre ne la concerne pas', !demandeurBloque(1, $clem));
Db::$fiches = [['id' => 'm', 'phone' => '', 'email' => 'clemence@exemple.fr', 'blocked' => true]];
t('reconnue par l email seul (casse ignoree)', demandeurBloque(1, $clem));
Db::$fiches = [$bloqueeParRef];
t('reconnue par la reference de compte seule (fiche creee par « Refuser et bloquer »)', demandeurBloque(1, $clem));
t('sans reference chez le demandeur, la fiche par reference ne matche pas', !demandeurBloque(1, ['telephone' => '', 'email' => '']));
Db::$fiches = [['id' => 'v', 'phone' => '', 'email' => '', 'blocked' => true]];
t('une fiche sans coordonnees ni reference ne matche personne (meme vide contre vide)', !demandeurBloque(1, ['telephone' => '', 'email' => '', 'reference' => '']));
Db::$fiches = ['pas un tableau', null];
t('contenu illisible : ignore', !demandeurBloque(1, $clem));

// Deux clics de suite : le second est une « reprise », comme pour une demande ordinaire en attente.
$moi = ['id' => 7]; $armelle = ['id' => 9, 'reference' => 'REFARM'];
$txt = 'Salut Armelle 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool. Tu me proposes un créneau ? Merci !';
$il_y_a = static fn(int $h): string => date('c', time() - $h * 3600);
Db::$conv = null;
t('aucune conversation : premier clic (on ecrit l echo)', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => []];
t('conversation vide : premier clic', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => [['from' => 'me', 'texte' => $txt, 'le' => $il_y_a(2)]]];
t('le dernier message est mon echo de la meme demande, il y a 2 h : reprise (rien d ecrit)', echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => [['from' => 'me', 'texte' => $txt, 'le' => $il_y_a(8 * 24)]]];
t('le meme echo mais vieux de 8 jours : la demande ordinaire aurait expire, on reecrit', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => [['from' => 'me', 'texte' => $txt, 'le' => $il_y_a(2)], ['from' => 'them', 'texte' => 'Bonjour', 'le' => $il_y_a(1)]]];
t('un message de l autre est arrive depuis : nouvelle demande', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => [['from' => 'me', 'texte' => 'Autre chose', 'le' => $il_y_a(1)]]];
t('mon dernier message n est pas cette demande : nouvelle demande', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = ['reference' => 'REFARM', 'thread' => [['from' => 'me', 'texte' => $txt]]];
t('echo sans date : prudence, on reecrit', !echoDemandeRecent($moi, $armelle, $txt, 7));
Db::$conv = null;

$cible = ['prenom' => 'Armelle'];
$a = reponseDemandeEnMessagerie($cible, 0, false);
$b = reponseDemandeEnMessagerie($cible, 1723, false);
t('la reponse « bloque » (rdv 0) et la reponse d une premiere demande ont le meme mode et le meme texte', $a['mode'] === 'messagerie' && $a['mode'] === $b['mode'] && $a['message'] === $b['message'] && count($a) === 3);
t('le texte ne dit ni bloque, ni inconnu, ni validation', !preg_match('/bloqu|inconnu|valid/i', $a['message']));
t('la reponse de reprise (deuxieme clic) existe toujours, differente', reponseDemandeEnMessagerie($cible, 1723, true)['message'] !== $b['message']);

echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-blocage-' + process.pid + '.php');
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

titre('2. Le serveur : les routes');
const dem = api.slice(api.indexOf("case 'POST /rdv/demander':"), api.indexOf("case 'POST /rdv/choisir':"));
const garde = dem.indexOf("if (demandeurBloque((int) $cible['id'], $moi)) {");
verifie('/rdv/demander verifie le blocage', garde > -1);
const premiereEcriture = Math.min(...['Db::req(', 'INSERT INTO', 'UPDATE rdv', 'elementsPoser(', 'creneauxLibres('].map((m) => { const k = dem.indexOf(m); return k < 0 ? Infinity : k; }));
verifie('AVANT toute ecriture ou calcul de creneaux (rien n est cree : ni rdv, ni message chez lui)', garde > -1 && garde < premiereEcriture);
const blocGarde = dem.slice(garde, dem.indexOf('}', dem.indexOf('Rep::ok(reponseDemandeEnMessagerie($cible, $rdvId, $reprise))')) + 1);
verifie('dans ce cas : echo chez le demandeur SEULEMENT (messagePoser ..., true), avec rdv et genre comme l ordinaire, une seule fois (if !reprise)', /if \(!\$reprise\) \{\s+messagePoser\(\$moi, \$cible, \$texte, \$rdvId > 0 \? \$rdvId : null, null, 'demande_rdv', null, \$typeRdv, true\);/.test(blocGarde));
verifie('la reprise se lit dans sa propre messagerie (echoDemandeRecent, meme delai rdv_demande_jours que l ordinaire)', /\$reprise = echoDemandeRecent\(\$moi, \$cible, \$texte, \(int\) Conf::get\('rdv_demande_jours', 7\)\);/.test(blocGarde));
verifie('la reponse : meme fonction, identifiant de sa derniere demande vers cette personne, reprise ou non', /ORDER BY id DESC LIMIT 1/.test(blocGarde) && /Rep::ok\(reponseDemandeEnMessagerie\(\$cible, \$rdvId, \$reprise\)\);/.test(blocGarde) && (dem.match(/Rep::ok\(reponseDemandeEnMessagerie\(\$cible, \$rdvId, \$reprise\)\);/g) || []).length === 2);
verifie('et rien d autre dans ce bloc (pas d ecriture, pas d email, pas de notification)', !/envoyerEmail|notifier|INSERT|UPDATE|Db::req|elementsPoser/.test(blocGarde), blocGarde);
verifie('plus aucun texte de reponse ecrit en dur dans la route', !/Son agenda est complet/.test(dem) && (api.match(/Son agenda est complet/g) || []).length === 1);
const mp = fonction(api, 'messagePoser') || '';
verifie('messagePoser : « chez l expediteur seulement » ne garde que le cote me', /\$cotes = \$chezExpediteurSeulement \? \[\[\$de, \$vers, 'me'\]\] : \[\[\$de, \$vers, 'me'\], \[\$vers, \$de, 'them'\]\];/.test(mp) && /foreach \(\$cotes as \[\$proprietaire, \$autre, \$sens\]\)/.test(mp));
verifie('messagePoser : pas de traduction (aucun appel, aucun cout) dans ce cas', /\(\$langueVers === \$langueDe \|\| \$chezExpediteurSeulement\)/.test(mp));
verifie('messagePoser : le parametre est en dernier, facultatif, faux par defaut (les appels existants sont intacts)', /bool \$chezExpediteurSeulement = false(?:,\n(?:\s*\/\/[^\n]*\n)*\s*\?array \$complement = null)?\n\): void/.test(mp));
const choisir = api.slice(api.indexOf("case 'POST /rdv/choisir':"), api.indexOf("case 'POST /rdv/groupe/proposer':"));
verifie('/rdv/choisir : bloque entre-temps = refus neutre « creneau pris », sans rien ecrire', /categoriesPourPrendreRdv\(\(int\) \$cible\['id'\], \$moi\);\s+if \(\$catsRetenues === \[\]/.test(choisir) && choisir.indexOf("409, 'creneau_pris'") < choisir.indexOf('elementsPoser('));
verifie('rendez-vous a plusieurs : un bloque est « sans acces », rien n est ecrit chez lui', /categoriesPourRdvAutomatique\(\(int\) \$c\['id'\], \$moi\);\s+if \(\$categories === \[\]\) \{\s+\$sansAcces\[\] = texteSur/.test(fonction(api, 'invitesRdvGroupe') || ''));
verifie('categoriesPourPrendreRdv et demandeurBloque partagent la meme detection (fichesDe)', /fichesDe\(\$titulaireId, \$demandeur\)/.test(fonction(api, 'categoriesPourPrendreRdv') || '') && /fichesDe\(\$titulaireId, \$demandeur\)/.test(fonction(api, 'demandeurBloque') || ''));
// Mission 24 : le seul messagePoser de la route est dans la branche du refus simple (bloquer:false) ; en bloquant, rien.
verifie('« Refuser et bloquer » reste muet (bloquerContact, aucun message au demandeur) ; seul le refus simple previent', (function (r) { return (r.match(/messagePoser\(/g) || []).length === 1 && /if \(\$bloquer\) \{\s+bloquerContact\(\$moi, \$demandeur\);\s+\} else \{[\s\S]*?messagePoser\(/.test(r); })(api.slice(api.indexOf("case 'POST /rdv/refuser':"), api.indexOf('// SYNCHRONISATION ENTRE APPAREILS'))));

titre('3. La page : la fiche bloquee dit vrai, et on peut debloquer');
verifie('la fiche d un contact bloque : « Cette personne ne peut plus t’écrire ni prendre rendez-vous avec toi, et elle ne le sait pas » (27b : le serveur retient aussi ses messages)', /Acc\\u00e8s bloqu\\u00e9\.<\/b> Cette personne ne peut plus t\\u2019\\u00e9crire ni prendre rendez-vous avec toi, et elle ne le sait pas\. Clique sur <b>D\\u00e9bloquer l'acc\\u00e8s<\/b> pour le d\\u00e9bloquer\./.test(page));
verifie('l ancienne phrase fausse (« arriveront dans ta messagerie … attendront ta validation ») a disparu', !/arriveront dans ta messagerie/.test(page) && !/bloqu\\u00e9 volontairement/.test(page));
verifie('le message fugace du blocage dit la meme chose', /Acc\\u00e8s bloqu\\u00e9 \\u2014 ses demandes de rendez-vous ne t\\u2019arrivent plus/.test(page) && !/ses demandes passeront par ta messagerie/.test(page));
verifie('le menu de la fiche propose « Débloquer l’accès » quand le contact est bloque', /\$\{c\.blocked \? 'D\\u00e9bloquer l\\'acc\\u00e8s' : 'Bloquer l\\'acc\\u00e8s \\u00e0 mon agenda'\}/.test(page) && /toggleContactBlock\('\$\{c\.id\}'\)/.test(page));
{
  const mem = {};
  const ctx = { console, JSON, contactsList: [{ id: 'c1', name: 'Clemence Ravaud', blocked: true }], rendus: 0, toasts: [],
    localStorage: { setItem: (k, v) => { mem[k] = v; } }, renderContactsList() { ctx.rendus++; }, showToast(m) { ctx.toasts.push(m); }, syncs: 0, tcSyncBientot() { ctx.syncs++; } };
  vm.createContext(ctx);
  // Depuis la mission 27b, toggleContactBlock passe par saveContacts (stockage + synchronisation tout de suite).
  vm.runInContext(fonction(page, 'saveContacts') + '\n' + fonction(page, 'toggleContactBlock'), ctx);
  vm.runInContext("toggleContactBlock('c1')", ctx);
  verifie('« Débloquer » (toggleContactBlock) : la fiche passe a blocked:false, est enregistree, la liste est redessinee', ctx.contactsList[0].blocked === false && JSON.parse(mem.timecool_contacts)[0].blocked === false && ctx.rendus === 1 && /débloqué/.test(ctx.toasts[0]), ctx.toasts[0]);
  vm.runInContext("toggleContactBlock('c1')", ctx);
  verifie('et re-bloque : blocked:true, message « ne t’arrivent plus »', ctx.contactsList[0].blocked === true && /ne t’arrivent plus/.test(ctx.toasts[1]), ctx.toasts[1]);
}
verifie('la fiche est synchronisee vers le serveur comme tout contact (la famille « contact » voyage) : le serveur lit blocked', /contact: \{\s+lire: function \(\) \{ return typeof contactsList === 'undefined' \? \[\] : contactsList; \}/.test(page));
verifie('vocabulaire calme dans les nouveaux textes', !/sans ton accord|réserver seul/.test(page.slice(page.indexOf('Acc\\u00e8s bloqu\\u00e9.</b>'), page.indexOf('Acc\\u00e8s bloqu\\u00e9.</b>') + 300)));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
