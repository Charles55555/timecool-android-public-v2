// « Mon temps libre » (10/10) est du temps PROTEGE : a l envers des cinq autres blocs.
// Ses plages veulent dire « pendant ces heures, personne ne peut me prendre un
// rendez-vous, sauf les contacts que j autorise ». Regles executees sous PHP,
// structure des routes, ecran et fiche contact executes dans la vraie page.
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
const noms = ['memeReference', 'categoriesToutesPourRdv', 'categoriesPourPrendreRdv', 'rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre',
  'plagesDeCategorie', 'retirerPlages', 'dispoPlagesDuJour', 'dispoDuCompte', 'creneauDansTempsProtege', 'heuresPermisesDuJour',
  'personneDisponible', 'creneauxLibres', 'creneauxCommuns'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l API', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Empreinte {
  public static function normaliserTelephone(string $t): string { return preg_replace('/\\D+/', '', $t) ?? ''; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db {
  public static array $fiches = [];
  public static array $dispo = [];
  public static array $rdv = [];
  public static function tous(string $s, array $p = []): array {
    if (str_contains($s, 'type = "contact"')) { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
    return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$rdv[$p[0]] ?? []);
  }
  public static function un(string $s, array $p = []): ?array {
    $d = self::$dispo[$p[0]] ?? null;
    return $d === null ? null : ['contenu' => json_encode(['id' => 'x', 'v' => json_encode($d)])];
  }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$ouvrantes = ['travail', 'sante', 'famille', 'amis', 'sport'];
$avecExc = array_merge($ouvrantes, ['personnel']);
$jours = [1, 2, 3, 4, 5];

// Retirer des plages
t('13h-20h retire de 9h-19h : il reste 9h-13h', retirerPlages([[540, 1140]], [[780, 1200]]) === [[540, 780]]);
t('une plage entierement protegee disparait', retirerPlages([[840, 960]], [[780, 1200]]) === []);
t('un trou au milieu coupe en deux', retirerPlages([[540, 1080]], [[720, 780]]) === [[540, 720], [780, 1080]]);
t('une plage qui touche sans recouvrir est intacte', retirerPlages([[540, 720]], [[720, 900]]) === [[540, 720]]);
t('rien a retirer : rien ne change', retirerPlages([[540, 720]], []) === [[540, 720]]);

// Le temps libre gagne, meme si une plage ouverte le recouvre
$dispo = ['travail' => [['jours' => $jours, 'debut' => '09:00', 'fin' => '19:00']], 'personnel' => [['jours' => [5], 'debut' => '13:00', 'fin' => '20:00']]];
t('vendredi : travail 9h-19h, temps libre 13h-20h : seules 9h a 12h restent', heuresPermisesDuJour($dispo, $ouvrantes, 5) === [9, 10, 11, 12]);
t('lundi : le temps libre du vendredi ne touche pas', heuresPermisesDuJour($dispo, $ouvrantes, 1) === [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
t('un contact autorise (marqueur « personnel ») passe quand meme', heuresPermisesDuJour($dispo, $avecExc, 5) === [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
$dispo2 = ['travail' => [['jours' => $jours, 'debut' => '09:00', 'fin' => '12:00']], 'sante' => [['jours' => $jours, 'debut' => '12:00', 'fin' => '18:00']],
  'famille' => [['jours' => [5], 'debut' => '14:00', 'fin' => '16:00']], 'personnel' => [['jours' => [5], 'debut' => '13:00', 'fin' => '20:00']]];
t('plusieurs categories qui le recouvrent : le temps libre retire tout', heuresPermisesDuJour($dispo2, $ouvrantes, 5) === [9, 10, 11, 12]);
t('la categorie « personnel » seule n ouvre rien', heuresPermisesDuJour(['personnel' => [['jours' => $jours, 'debut' => '09:00', 'fin' => '19:00']]], $ouvrantes, 2) === []);
t('plage « personnel » mal formee : ignoree, rien n est retire', heuresPermisesDuJour(['travail' => [['jours' => $jours, 'debut' => '09:00', 'fin' => '11:00']], 'personnel' => [['jours' => $jours, 'debut' => 'x', 'fin' => '19:00'], 'oops']], $ouvrantes, 2) === [9, 10]);
t('temps libre vide : rien de protege', heuresPermisesDuJour(['travail' => [['jours' => $jours, 'debut' => '09:00', 'fin' => '11:00']], 'personnel' => []], $ouvrantes, 2) === [9, 10]);

// Les creneaux proposes a deux
Db::$rdv = []; Db::$fiches = [];
Db::$dispo = [1 => ['travail' => [['jours' => [5], 'debut' => '13:00', 'fin' => '19:00']], 'personnel' => [['jours' => [5], 'debut' => '13:00', 'fin' => '20:00']]]];
t('rendez-vous a deux : un vendredi enterre dans le temps libre ne donne aucun creneau', creneauxLibres(1, 3, $ouvrantes) === []);
$c = creneauxLibres(1, 3, $avecExc);
t('un contact autorise obtient des creneaux ce vendredi-la', count($c) >= 1 && $c[0]['heure'] === 13, json_encode($c));

// Les creneaux communs, a plusieurs
$A = ['id' => 2, 'prenom' => 'Alice', 'categories' => $ouvrantes];
Db::$dispo = [2 => ['travail' => [['jours' => [5], 'debut' => '13:00', 'fin' => '19:00']], 'personnel' => [['jours' => [5], 'debut' => '13:00', 'fin' => '20:00']]]];
t('rendez-vous a plusieurs : le temps libre d Alice est protege', creneauxCommuns(1, [$A], 1, 3) === []);
$A['categories'] = $avecExc;
$c = creneauxCommuns(1, [$A], 1, 3);
t('rendez-vous a plusieurs : autorisee sur la fiche, Alice peut etre derangee', count($c) >= 1 && $c[0]['heure'] === 13, json_encode($c));

// La confirmation : un creneau devenu protege est refuse
Db::$dispo = [7 => ['personnel' => [['jours' => [5], 'debut' => '13:00', 'fin' => '20:00']]]];
$v = static fn(string $d, string $f, array $cats = []): bool => creneauDansTempsProtege(7, $cats, $d, $f);
t('vendredi 12h-13h : hors du temps libre', !$v('2026-10-16 12:00:00', '2026-10-16 13:00:00'));
t('vendredi 13h-14h : dedans', $v('2026-10-16 13:00:00', '2026-10-16 14:00:00'));
t('vendredi 12h30-13h30 : chevauche, donc refuse', $v('2026-10-16 12:30:00', '2026-10-16 13:30:00'));
t('vendredi 19h-20h : dedans', $v('2026-10-16 19:00:00', '2026-10-16 20:00:00'));
t('vendredi 20h-21h : hors du temps libre', !$v('2026-10-16 20:00:00', '2026-10-16 21:00:00'));
t('lundi 14h-15h : le temps libre ne vaut que le vendredi', !$v('2026-10-12 14:00:00', '2026-10-12 15:00:00'));
t('contact autorise : meme vendredi 13h-14h passe', !$v('2026-10-16 13:00:00', '2026-10-16 14:00:00', ['sante', 'personnel']));
Db::$dispo = [];
t('aucun temps libre regle : rien de protege', !$v('2026-10-16 13:00:00', '2026-10-16 14:00:00'));

// Les fiches : la pastille « temps libre » est un marqueur, pas une limite d heures
Db::$fiches = [['id' => 'c1', 'phone' => '0611223344']];
$moi = ['telephone' => '0611223344', 'email' => '', 'reference' => 'R'];
t('aucune pastille : les cinq categories ouvrantes, jamais le temps libre', categoriesPourPrendreRdv(1, $moi) === $ouvrantes);
Db::$fiches = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['personnel']]];
t('pastille temps libre seule : toutes les heures ouvertes + « peut deranger »', categoriesPourPrendreRdv(1, $moi) === $avecExc);
Db::$fiches = [['id' => 'c1', 'phone' => '0611223344', 'categories' => ['travail', 'personnel']]];
t('travail + temps libre : limite au travail + « peut deranger »', categoriesPourPrendreRdv(1, $moi) === ['travail', 'personnel']);

echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-protege-' + process.pid + '.php');
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

titre('2. Le serveur : ou la regle est appliquee');
const choisir = api.slice(api.indexOf("case 'POST /rdv/choisir':"), api.indexOf("case 'POST /rdv/groupe/proposer':"));
const confirmer = api.slice(api.indexOf("case 'POST /rdv/groupe/confirmer':"), api.indexOf("case 'POST /messages/envoyer':"));
const proposer = api.slice(api.indexOf("case 'POST /rdv/proposer-creneau':"), api.indexOf("case 'POST /rdv/refuser':"));
verifie('« personnel » ne fait plus partie des categories ouvrantes par defaut', /return \['travail', 'sante', 'famille', 'amis', 'sport'\];/.test(api) && !/'sport', 'personnel'\]/.test(fonction(api, 'categoriesToutesPourRdv') || ''));
verifie('/rdv/choisir : creneau devenu protege (sauf contact autorise) ou contact bloque : meme 409 neutre qu un creneau pris',
  /creneauDansTempsProtege\(\(int\) \$cible\['id'\], \$catsRetenues/.test(choisir) && /\$catsRetenues === \[\]/.test(choisir)
  && /rollBack\(\);\s+Rep::erreur\(409, 'creneau_pris'/.test(choisir) && choisir.indexOf('creneauDansTempsProtege') < choisir.indexOf('elementsPoser('));
verifie('/rdv/groupe/confirmer : chaque invite est revu avec SES categories (temps libre retire des heures permises)', /heuresPermisesDuJour\(dispoDuCompte\(\$inv\['id'\]\), \$inv\['categories'\], \$jsem\)/.test(confirmer));
verifie('/rdv/proposer-creneau : le titulaire choisit lui-meme, son propre temps libre ne le bloque pas (decision documentee)', !/creneauDansTempsProtege/.test(proposer));
verifie('le message du 409 ne dit rien du temps libre', !/temps libre|prot[eé]g/i.test((choisir.match(/Rep::erreur\(409, 'creneau_pris', '[^']*'\)/) || [''])[0]) && /Rep::erreur\(409, 'creneau_pris'/.test(choisir));

titre('3. L ecran « Mes disponibilites » : le bloc « Mon temps libre »');
const mem = {};
const ctx = {
  console, _dispoData: null, _toasts: [], _sync: 0,
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
  showToast: (m) => ctx._toasts.push(m), tcSyncBientot: () => { ctx._sync++; },
  JOURS_FULL: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  DISPO_CATEGORIES: [
    { id: 'travail', icon: 'T', label: 'Mon travail', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sante', icon: 'S', label: 'Ma santé', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'famille', icon: 'F', label: 'Ma famille', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'amis', icon: 'A', label: 'Mes amis et loisirs', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sport', icon: 'P', label: 'Mon sport', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'personnel', icon: 'L', label: 'Mon temps libre', color: '#aaa', bg: '#bbb', texte: '#333' },
  ],
};
const zone = { innerHTML: '', querySelectorAll() { return { forEach() {} }; } };
ctx.document = { getElementById: (id) => (id === 'dispoContent' ? zone : null) };
vm.createContext(ctx);
['var TC_DISPO_KEY = [^;]*;', 'var TC_RDV_VALIDATION_KEY = [^;]*;', 'var TC_PLAGES_DOUCES = \\[[^;]*\\];'].forEach((re) => {
  const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); }
});
['loadDispo', 'saveDispo', 'formatJours', 'formatHeure', 'phraseDispo', 'tcValidationRdvExigee', 'tcOuvrirPlagesDouces',
  'tcCadreValidationRdv', 'tcLigneQuiPeutDeranger', 'renderDispo'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

const vendredi = { jours: [5], debut: '13:00', fin: '20:00' };
verifie('la phrase du temps libre : « Je suis tranquille le vendredi de 13h00 à 20h00 »', ctx.phraseDispo(vendredi, 'personnel') === 'Je suis tranquille le vendredi de 13h00 à 20h00', ctx.phraseDispo(vendredi, 'personnel'));
verifie('les autres blocs gardent « Je suis disponible »', ctx.phraseDispo(vendredi, 'travail') === 'Je suis disponible le vendredi de 13h00 à 20h00' && ctx.phraseDispo(vendredi) === 'Je suis disponible le vendredi de 13h00 à 20h00');

mem.tc_rdv_validation = '0';
ctx._dispoData = { travail: [{ jours: [1], debut: '09:00', fin: '12:00' }], sante: [], famille: [], amis: [], sport: [], personnel: [vendredi] };
vm.runInContext('renderDispo()', ctx);
let h = zone.innerHTML;
const bloc = (id) => { const d = h.indexOf('>' + ctx.DISPO_CATEGORIES.find((c) => c.id === id).label + '<'); const f = h.indexOf('+ Ajouter une plage', d); return h.slice(d, f); };
const libre = bloc('personnel');
verifie('le bloc dit le sens : « Pendant ces heures, personne ne peut me prendre un rendez-vous, sauf les contacts que j’autorise (ex. ma famille). »',
  /Pendant ces heures, personne ne peut me prendre un rendez-vous, sauf les contacts que j’autorise \(ex\. ma famille\)\./.test(libre));
verifie('ses plages disent « tranquille », jamais « disponible »', /Je suis tranquille le vendredi de 13h00 à 20h00/.test(libre) && !/Je suis disponible/.test(libre));
verifie('la ligne « réservent seuls » est remplacée par « 🔒 Protégé : sauf les contacts autorisés sur leur fiche »', /🔒 Protégé : sauf les contacts autorisés sur leur fiche/.test(libre) && !/r.servent seuls|peuvent r.server seuls/.test(libre));
const travail = bloc('travail');
verifie('le bloc « Mon travail » ne change pas : « disponible » et « réserver seuls »', /Je suis disponible le lundi de 09h00 à 12h00/.test(travail) && /peuvent réserver seuls dans ces heures/.test(travail) && !/Pendant ces heures, personne/.test(travail));
verifie('un seul bloc porte la phrase du temps protégé', (h.match(/Pendant ces heures, personne ne peut me prendre/g) || []).length === 1);
ctx._dispoData = { travail: [], sante: [], famille: [], amis: [], sport: [], personnel: [] };
vm.runInContext('renderDispo()', ctx);
h = zone.innerHTML;
verifie('temps libre vide : « Aucune plage protégée pour l’instant. » (pas « personne ne peut réserver »)', /Aucune plage protégée pour l’instant\./.test(bloc('personnel')) && !/personne ne peut r.server/.test(bloc('personnel')));

// Le decochage n ouvre rien dans le temps libre
ctx._dispoData = null;
delete mem.timecool_disponibilites;
vm.runInContext('loadDispo(); tcOuvrirPlagesDouces()', ctx);
verifie('décochage : les cinq autres catégories vides reçoivent les plages douces', ['travail', 'sante', 'famille', 'amis', 'sport'].every((c) => ctx._dispoData[c].length === 2));
verifie('décochage : « Mon temps libre » reste VIDE (vide = rien de protégé)', ctx._dispoData.personnel.length === 0);
ctx._dispoData = { travail: [], sante: [], famille: [], amis: [], sport: [], personnel: [vendredi] };
vm.runInContext('tcOuvrirPlagesDouces()', ctx);
verifie('un temps libre déjà réglé n est pas touché', JSON.stringify(ctx._dispoData.personnel) === JSON.stringify([vendredi]));

titre('4. Charly ne propose jamais le temps protege');
const c2 = {};
vm.createContext(c2);
vm.runInContext('var _dispoData = null; function loadDispo() {}', c2);
['tcMinutesDeHeure', 'tcSansTempsProtege', 'tcPlagesDuJour'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c2); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const VEN = new Date(2026, 9, 16);
const LUN = new Date(2026, 9, 12);
c2.d = { travail: [{ jours: [1, 2, 3, 4, 5], debut: '09:00', fin: '19:00' }], personnel: [{ jours: [5], debut: '13:00', fin: '20:00' }] };
vm.runInContext('_dispoData = d', c2);
const ven = c2.tcPlagesDuJour(VEN), lun = c2.tcPlagesDuJour(LUN);
verifie('vendredi : travail 9h-19h moins temps libre 13h-20h = 9h-13h', JSON.stringify(ven.plages) === JSON.stringify([{ debut: 540, fin: 780 }]) && ven.defaut === false, JSON.stringify(ven));
verifie('lundi : intact (9h-19h)', JSON.stringify(lun.plages) === JSON.stringify([{ debut: 540, fin: 1140 }]));
c2.d = { personnel: [{ jours: [5], debut: '13:00', fin: '20:00' }] };
vm.runInContext('_dispoData = d', c2);
const seul = c2.tcPlagesDuJour(VEN);
verifie('seul le temps libre est regle : la journee de repli (9h-18h) en est aussi privee', JSON.stringify(seul.plages) === JSON.stringify([{ debut: 540, fin: 780 }]) && seul.defaut === true, JSON.stringify(seul));

titre('5. La fiche d un contact');
verifie('la pastille dit son sens : « Même en temps libre »', /short: cat\.id === 'personnel' \? 'Même en temps libre' : cat\.label/.test(page));
verifie('une ligne d aide, en mots simples : « il peut me déranger pendant les heures que je protège »', /« Même en temps libre » : il peut me déranger pendant les heures que je protège\./.test(page));
verifie('le reste de l aide ne change pas', /Il peut me prendre un RDV\. Pour limiter /.test(page) && /toutes tes disponibilit/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
