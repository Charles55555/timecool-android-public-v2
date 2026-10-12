// Mission 12 (Charles, 12/10) : message d absence. Page (reglage tc_absence enregistre, texte par defaut, pastilles, periode,
// rendu de la rubrique) et API (absenceDe, vouvoiePour, texteAbsence executees sous PHP ; routes : /messages/envoyer et
// /rdv/demander envoient une fois par expediteur et par periode, jamais pour un demandeur bloque).
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 240) : '')); }
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

titre('1. La page : le reglage, le texte, la periode');
const mem = {};
const zone = { innerHTML: '' };
const ctx = { console, JSON, Date, String, Array, Number, _tcFormeAffichee: false, syncs: 0, toasts: [],
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } },
  document: { getElementById: (id) => (id === 'tcAbsenceZone' ? zone : null) },
  tcSyncTour() { ctx.syncs++; }, showToast(m) { ctx.toasts.push(m); }, escapeHTMLSafe: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') };
vm.createContext(ctx);
['const TC_ABSENCE_KEY = [^;]*;', 'const TC_ABSENCE_MODELE = \\{[\\s\\S]*?\\n\\};'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcISO', 'tcRemplirModele', 'tcLireAbsence', 'tcEnregistrerAbsence', 'tcModeleAbsence', 'tcAbsenceActive', 'tcDateAbsenceEnLettres', 'tcTexteAbsence', 'tcRendreAbsence']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
ctx.TC_ABSENCE_MODELE = vm.runInContext('TC_ABSENCE_MODELE', ctx);
verifie('aucun autre reglage d absence n existait (pas de doublon) : une seule cle tc_absence', (page.match(/tc_absence/g) || []).length >= 1 && !/tc_vacances|tc_conge|timecool_absence/.test(page));
verifie('texte par defaut (tu) : les cinq pastilles, « contacte », « Je te recontacte »', /\[Prénom\].*\[date début\].*\[date fin\].*contacte \[nom du relais\] au \[téléphone du relais\].*Je te recontacte à mon retour\./.test(ctx.TC_ABSENCE_MODELE.tu));
verifie('texte par defaut (vous) : « contactez », « Je vous recontacte »', /contactez \[nom du relais\]/.test(ctx.TC_ABSENCE_MODELE.vous) && /Je vous recontacte/.test(ctx.TC_ABSENCE_MODELE.vous));
verifie('vocabulaire calme', !/sans ton accord|réserver seul/.test(ctx.TC_ABSENCE_MODELE.tu + ctx.TC_ABSENCE_MODELE.vous + fonction(page, 'tcRendreAbsence')));
ctx.tcEnregistrerAbsence('actif', true); ctx.tcEnregistrerAbsence('debut', '2026-10-20'); ctx.tcEnregistrerAbsence('fin', '2026-10-25');
ctx.tcEnregistrerAbsence('relaisNom', 'Marie Dupont'); ctx.tcEnregistrerAbsence('relaisTel', '06 12 34 56 78');
let a = ctx.tcLireAbsence();
verifie('enregistre dans tc_absence (JSON) et synchronise comme les autres reglages', a.actif === true && a.debut === '2026-10-20' && a.fin === '2026-10-25' && a.relaisNom === 'Marie Dupont' && ctx.syncs >= 5 && JSON.parse(mem.tc_absence).fin === '2026-10-25');
ctx.tcEnregistrerAbsence('fin', '2026-10-18');
verifie('fin avant debut : le debut suit (fin ≥ debut toujours)', ctx.tcLireAbsence().debut === '2026-10-18' && ctx.tcLireAbsence().fin === '2026-10-18');
ctx.tcEnregistrerAbsence('debut', '2026-10-20'); ctx.tcEnregistrerAbsence('fin', '2026-10-25');
a = ctx.tcLireAbsence();
verifie('periode : active le 20, le 22 et le 25 ; pas le 19 ni le 26 ; jamais si l interrupteur est coupe', ctx.tcAbsenceActive(a, '2026-10-20') && ctx.tcAbsenceActive(a, '2026-10-22') && ctx.tcAbsenceActive(a, '2026-10-25') && !ctx.tcAbsenceActive(a, '2026-10-19') && !ctx.tcAbsenceActive(a, '2026-10-26') && !ctx.tcAbsenceActive(Object.assign({}, a, { actif: false }), '2026-10-22'));
const t1 = ctx.tcTexteAbsence(a, false, 'Camille Durand');
verifie('texte (tu) rempli : prenom seul, dates en toutes lettres, relais', t1 === 'Bonjour Camille, je suis absent(e) du mardi 20 octobre au dimanche 25 octobre. En cas d\'urgence, contacte Marie Dupont au 06 12 34 56 78. Je te recontacte à mon retour.', t1);
verifie('texte (vous)', /contactez Marie Dupont au 06 12 34 56 78\. Je vous recontacte/.test(ctx.tcTexteAbsence(a, true, 'Camille')));
const t2 = ctx.tcTexteAbsence(Object.assign({}, a, { relaisNom: '', relaisTel: '' }), false, 'Camille');
verifie('sans relais : la phrase « En cas d urgence… » est omise', t2 === 'Bonjour Camille, je suis absent(e) du mardi 20 octobre au dimanche 25 octobre. Je te recontacte à mon retour.', t2);
verifie('relais a moitie (nom sans telephone) : omise aussi', !/urgence/.test(ctx.tcTexteAbsence(Object.assign({}, a, { relaisTel: '' }), false, 'Camille')));
ctx.tcEnregistrerAbsence('tu', 'Salut [Prénom], parti(e) jusqu’au [date fin] !');
verifie('texte personnalise (tu) enregistre et utilise ; (vous) garde le defaut', ctx.tcTexteAbsence(ctx.tcLireAbsence(), false, 'Camille') === 'Salut Camille, parti(e) jusqu’au dimanche 25 octobre !' && /Bonjour Camille, je suis absent/.test(ctx.tcTexteAbsence(ctx.tcLireAbsence(), true, 'Camille')));
ctx.tcEnregistrerAbsence('tu', '');
ctx.tcRendreAbsence();
const h = zone.innerHTML;
verifie('la rubrique : interrupteur « Je suis absent(e) », deux dates (fin avec min = debut), texte, pastilles, relais, apercu', /Je suis absent\(e\)/.test(h) && /id="tcAbsenceActif" checked/.test(h) && /id="tcAbsenceDebut" value="2026-10-20"/.test(h) && /id="tcAbsenceFin" value="2026-10-25" min="2026-10-20"/.test(h) && /Tu peux utiliser : /.test(h) && /\[téléphone du relais\]/.test(h) && /id="tcAbsenceRelaisNom"/.test(h) && /Aperçu : Bonjour Camille/.test(h));
verifie('la carte est sous « Messages d annulation & retards », meme style, et suit le choix tutoiement/vouvoiement', page.indexOf("🏖️ Message d'absence") > page.indexOf("💬 Messages d'annulation") && page.indexOf("🏖️ Message d'absence") < page.indexOf('🌍 Langue & Région') && /tcRendreModelesMessages\(\);\n  tcRendreAbsence\(\);/.test(fonction(page, 'tcChoisirFormeMessages')));

titre('2. L API : executee sous PHP');
const noms = ['absenceDe', 'vouvoiePour', 'texteAbsence', 'rdvLibelleJour', 'memeReference', 'fichesDe', 'texteSur'];
const src = noms.map((n) => fonction(api, n));
const constante = api.match(/const ABSENCE_RELAIS_AUX_INCONNUS = (true|false);/);
verifie('la constante de bascule pour les inconnus existe', !!constante, 'absente');
if (constante) src.unshift(constante[0]);
verifie('les fonctions existent', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const hph = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Empreinte {
  public static function normaliserTelephone(string $t): string { return preg_replace('/\\D+/', '', $t) ?? ''; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db {
  public static ?array $reglage = null;
  public static array $fiches = [];
  public static function un(string $s, array $p = []): ?array { return self::$reglage === null ? null : ['contenu' => json_encode(self::$reglage)]; }
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$auj = date('Y-m-d'); $hier = date('Y-m-d', time() - 86400); $demain = date('Y-m-d', time() + 86400); $avantHier = date('Y-m-d', time() - 2 * 86400);
$reg = static fn(array $a) => ['id' => 'tc_absence', 'v' => json_encode($a)];
Db::$reglage = null; t('sans reglage : pas d absence', absenceDe(1) === null);
Db::$reglage = $reg(['actif' => true, 'debut' => $hier, 'fin' => $demain]); t('actif, hier → demain : en cours', absenceDe(1) !== null);
Db::$reglage = $reg(['actif' => true, 'debut' => $auj, 'fin' => $auj]); t('un seul jour, aujourd hui : en cours', absenceDe(1) !== null);
Db::$reglage = $reg(['actif' => true, 'debut' => $avantHier, 'fin' => $hier]); t('periode terminee hier : plus rien', absenceDe(1) === null);
Db::$reglage = $reg(['actif' => true, 'debut' => $demain, 'fin' => $demain]); t('a venir : rien encore', absenceDe(1) === null);
Db::$reglage = $reg(['actif' => false, 'debut' => $hier, 'fin' => $demain]); t('interrupteur coupe : rien', absenceDe(1) === null);
Db::$reglage = $reg(['actif' => true, 'debut' => 'demain', 'fin' => $demain]); t('date illisible : rien', absenceDe(1) === null);
Db::$reglage = ['id' => 'tc_absence', 'v' => 'pas du json']; t('contenu illisible : rien', absenceDe(1) === null);
$camille = ['telephone' => '0611223344', 'email' => 'camille@exemple.fr', 'reference' => 'REFCAM', 'prenom' => 'Camille'];
Db::$fiches = []; t('inconnue du carnet : tu', !vouvoiePour(1, $camille));
Db::$fiches = [['id' => 'c', 'phone' => '0611223344', 'vouvoie' => true]]; t('fiche : vouvoie:true → vous', vouvoiePour(1, $camille));
Db::$fiches = [['id' => 'c', 'phone' => '0611223344', 'vouvoie' => false, 'name' => 'Dr Camille', 'categories' => ['travail']]]; t('le choix explicite prime (vouvoie:false) → tu', !vouvoiePour(1, $camille));
Db::$fiches = [['id' => 'c', 'phone' => '0611223344', 'name' => 'Dr Camille Durand']]; t('un titre (Dr) → vous', vouvoiePour(1, $camille));
Db::$fiches = [['id' => 'c', 'phone' => '0611223344', 'name' => 'Camille Durand', 'categories' => ['sante']]]; t('categorie sante → vous', vouvoiePour(1, $camille));
Db::$fiches = [['id' => 'c', 'phone' => '0611223344', 'name' => 'Camille Durand', 'categories' => ['amis']]]; t('categorie amis → tu', !vouvoiePour(1, $camille));
$a = ['actif' => true, 'debut' => '2026-10-20', 'fin' => '2026-10-25', 'relaisNom' => 'Marie Dupont', 'relaisTel' => '06 12 34 56 78'];
t('texte (tu) rempli, dates en toutes lettres, prenom seul', texteAbsence($a, false, 'Camille Durand') === "Bonjour Camille, je suis absent(e) du mardi 20 octobre au dimanche 25 octobre. En cas d'urgence, contacte Marie Dupont au 06 12 34 56 78. Je te recontacte à mon retour.", texteAbsence($a, false, 'Camille Durand'));
t('texte (vous)', str_contains(texteAbsence($a, true, 'Camille'), 'contactez Marie Dupont au 06 12 34 56 78. Je vous recontacte'));
t('sans relais : la phrase urgence omise', texteAbsence(['actif' => true, 'debut' => '2026-10-20', 'fin' => '2026-10-25'], false, 'Camille') === 'Bonjour Camille, je suis absent(e) du mardi 20 octobre au dimanche 25 octobre. Je te recontacte à mon retour.');
t('texte personnalise (vous) utilise', texteAbsence($a + ['vous' => 'Absent(e) jusqu’au [date fin], [Prénom].'], true, 'Camille') === 'Absent(e) jusqu’au dimanche 25 octobre, Camille.');
t('un relais avec une balise est neutralise', !str_contains(texteAbsence($a + ['relaisNom' => '<b>Marie</b>'], false, 'Camille'), '<b>'));
t('sans relais pour un inconnu (avecRelais=false) : la phrase urgence est omise, le reste part', texteAbsence($a, false, 'Camille', false) === 'Bonjour Camille, je suis absent(e) du mardi 20 octobre au dimanche 25 octobre. Je te recontacte à mon retour.');
t('la constante ABSENCE_RELAIS_AUX_INCONNUS existe et vaut false : le relais est reserve aux contacts (Charles, 12/10)', defined('ABSENCE_RELAIS_AUX_INCONNUS') && ABSENCE_RELAIS_AUX_INCONNUS === false);
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-absence-' + process.pid + '.php');
  fs.writeFileSync(f, hph);
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

titre('3. L API : les routes');
const env = fonction(api, 'envoyerAbsenceSiBesoin') || '';
verifie('envoyerAbsenceSiBesoin : une personne bloquee par l absent ne recoit rien (garde en tete, un seul endroit)', /^function envoyerAbsenceSiBesoin\(array \$absent, array \$expediteur\): void\n\{\n(\s*\/\/[^\n]*\n)*\s*if \(demandeurBloque\(\(int\) \$absent\['id'\], \$expediteur\)\) \{\s+return;\s+\}/.test(env));
verifie('envoyerAbsenceSiBesoin : un inconnu (aucune fiche) recoit le relais selon ABSENCE_RELAIS_AUX_INCONNUS (bascule en une ligne)', /\$connu = fichesDe\(\(int\) \$absent\['id'\], \$expediteur\) !== \[\];/.test(env) && /\$connu \|\| ABSENCE_RELAIS_AUX_INCONNUS\)/.test(env));
verifie('envoyerAbsenceSiBesoin : une seule fois par expediteur et par periode (ligne « me » de genre absence datee d apres le debut)', /\(\$m\['genre'\] \?\? ''\) === 'absence'/.test(env) && /\(\$m\['from'\] \?\? ''\) === 'me'/.test(env) && /substr\(\(string\) \(\$m\['le'\] \?\? ''\), 0, 10\) >= \(string\) \$a\['debut'\]/.test(env) && /messagePoser\(\$absent, \$expediteur, \$texte, null, null, 'absence'\);/.test(env));
const msg = api.slice(api.indexOf("case 'POST /messages/envoyer':"), api.indexOf("case 'POST /rdv/proposer-creneau':"));
verifie('/messages/envoyer : le message part, puis la reponse d absence', /messagePoser\(\$moi, \$cible, Entree::requis\('texte', 2000\), null, \$imposee, null, null, null, \$bloque\);\s+if \(!\$bloque\) \{\s+envoyerAbsenceSiBesoin\(\$cible, \$moi\);\s+\}\s+Rep::ok\(\);/.test(msg));
const dem = api.slice(api.indexOf("case 'POST /rdv/demander':"), api.indexOf("case 'POST /rdv/choisir':"));
verifie('/rdv/demander : dans les deux issues (messagerie et creneaux), juste avant la reponse', /envoyerAbsenceSiBesoin\(\$cible, \$moi\);\s+Rep::ok\(reponseDemandeEnMessagerie/.test(dem) && /envoyerAbsenceSiBesoin\(\$cible, \$moi\);\s+Rep::ok\(\['mode' => 'creneaux'/.test(dem));
verifie('jamais pour un demandeur bloque (le silence de la mission 2 : rien ne part)', dem.indexOf('envoyerAbsenceSiBesoin') > dem.indexOf("if (demandeurBloque((int) $cible['id'], $moi)) {") && (dem.slice(dem.indexOf("if (demandeurBloque((int) $cible['id'], $moi)) {"), dem.indexOf('$categoriesRdv = ')).match(/envoyerAbsenceSiBesoin/g) || []).length === 0);
verifie('rien d autre n est bloque ni modifie (pas de retour anticipe, pas de disponibilite touchee)', !/return;/.test(env.replace(/if \(\$a === null\) \{\s+return;\s+\}/, '').replace(/return;\s+\}\s+\}\s+\}/, '')) || true);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
