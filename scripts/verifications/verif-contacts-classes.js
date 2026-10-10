// Contacts CLASSES (10/10) : un contact non classe passe par la messagerie, comme un inconnu ;
// un contact classe reserve seul UNIQUEMENT dans les plages de ses categories. Le classement
// se fait en une fois, depuis « Mes disponibilites » : « 👥 Choisir qui » sous chaque bloc.
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
const noms = ['memeReference', 'validationRdvExigee', 'categoriesToutesPourRdv', 'categoriesPourPrendreRdv', 'categoriesPourRdvAutomatique',
  'autorisationPourPrendreRdv', 'rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre', 'plagesDeCategorie', 'retirerPlages', 'dispoPlagesDuJour',
  'dispoDuCompte', 'heuresPermisesDuJour', 'creneauxLibres'];
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
  public static ?array $reg = null;
  public static array $dispo = [];
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
  public static function un(string $s, array $p = []): ?array {
    if (str_contains($s, 'tc_rdv_validation')) { return self::$reg === null ? null : ['contenu' => json_encode(self::$reg)]; }
    return self::$dispo === [] ? null : ['contenu' => json_encode(['id' => 'x', 'v' => json_encode(self::$dispo)])];
  }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$moi = ['telephone' => '0611223344', 'email' => '', 'reference' => 'R'];
$fiche = static fn(array $extra = []) => [array_merge(['id' => 'c1', 'phone' => '0611223344'], $extra)];

Db::$fiches = $fiche();
t('non classe (fiche sans categorie) : []', categoriesPourPrendreRdv(1, $moi) === []);
Db::$fiches = $fiche(['categories' => []]);
t('non classe (categories vides) : []', categoriesPourPrendreRdv(1, $moi) === []);
Db::$fiches = $fiche(['categories' => ['personnel']]);
t('la pastille « temps libre » seule ne classe personne : []', categoriesPourPrendreRdv(1, $moi) === []);
Db::$fiches = $fiche(['categories' => ['voyages', 'inconnue', 5]]);
t('des categories qui n ouvrent rien (inconnues) ne classent personne : []', categoriesPourPrendreRdv(1, $moi) === []);
Db::$fiches = $fiche(['categories' => ['travail']]);
t('classe travail : [travail] seulement', categoriesPourPrendreRdv(1, $moi) === ['travail']);
Db::$fiches = $fiche(['categories' => ['famille', 'travail']]);
t('classe famille + travail : ces deux-la, dans l ordre de la fiche', categoriesPourPrendreRdv(1, $moi) === ['famille', 'travail']);
Db::$fiches = $fiche(['categories' => ['travail', 'personnel']]);
t('classe travail + temps libre : [travail, personnel] (le marqueur ne sert qu avec une categorie)', categoriesPourPrendreRdv(1, $moi) === ['travail', 'personnel']);
Db::$fiches = $fiche(['categories' => ['travail'], 'blocked' => true]);
t('bloque, meme classe : []', categoriesPourPrendreRdv(1, $moi) === []);
Db::$fiches = [];
t('inconnu du carnet : []', categoriesPourPrendreRdv(1, $moi) === []);

// Avec la validation decochee
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => '0'];
Db::$fiches = $fiche();
t('validation decochee, non classe : messagerie', categoriesPourRdvAutomatique(1, $moi) === [] && !autorisationPourPrendreRdv(1, $moi));
Db::$fiches = $fiche(['categories' => ['sport']]);
t('validation decochee, classe sport : automatique, sport seulement', categoriesPourRdvAutomatique(1, $moi) === ['sport'] && autorisationPourPrendreRdv(1, $moi));
Db::$reg = null;
t('validation jamais reglee : messagerie meme pour un contact classe', categoriesPourRdvAutomatique(1, $moi) === []);

// Les heures : un contact classe travail n entre JAMAIS dans les heures « famille »
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => '0'];
$dispo = ['travail' => [['jours' => [1, 2, 3, 4, 5], 'debut' => '09:00', 'fin' => '12:00']],
  'famille' => [['jours' => [1, 2, 3, 4, 5], 'debut' => '14:00', 'fin' => '18:00']]];
Db::$dispo = $dispo;
Db::$fiches = $fiche(['categories' => ['travail']]);
$cats = categoriesPourRdvAutomatique(1, $moi);
t('un collegue (classe travail) : seules 9h-12h sont ouvertes, jamais les heures « Ma famille »', heuresPermisesDuJour($dispo, $cats, 2) === [9, 10, 11]);
Db::$fiches = $fiche(['categories' => ['famille']]);
$cats = categoriesPourRdvAutomatique(1, $moi);
t('un proche (classe famille) : seules 14h-18h', heuresPermisesDuJour($dispo, $cats, 2) === [14, 15, 16, 17]);
Db::$fiches = $fiche(['categories' => ['travail', 'famille']]);
t('classe travail + famille : les deux plages', heuresPermisesDuJour($dispo, categoriesPourRdvAutomatique(1, $moi), 2) === [9, 10, 11, 14, 15, 16, 17]);
Db::$fiches = $fiche(['categories' => ['travail']]);
$c = creneauxLibres(1, 3, categoriesPourRdvAutomatique(1, $moi));
$ok = count($c) === 3;
foreach ($c as $x) { $ok = $ok && in_array($x['heure'], [9, 10, 11], true); }
t('les creneaux proposes a un collegue sont tous dans les heures de travail', $ok, json_encode($c));
Db::$fiches = $fiche();
t('un non classe n obtient aucun creneau', creneauxLibres(1, 3, categoriesPourRdvAutomatique(1, $moi)) === []);

echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-classes-' + process.pid + '.php');
  fs.writeFileSync(f, h);
  const lint = cp.spawnSync(PHP, ['-l', f], { encoding: 'utf8' });
  verifie('harnais valide', lint.status === 0, lint.stdout + lint.stderr);
  const r = cp.spawnSync(PHP, [f], { encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (e) {}
  let res = null; try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP s execute (mode strict)', Array.isArray(res), (r.stderr || r.stdout).slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
}

titre('2. Le serveur : ou la regle s applique');
const dem = api.slice(api.indexOf("case 'POST /rdv/demander':"), api.indexOf("case 'POST /rdv/choisir':"));
const choisir = api.slice(api.indexOf("case 'POST /rdv/choisir':"), api.indexOf("case 'POST /rdv/groupe/proposer':"));
const inv = fonction(api, 'invitesRdvGroupe') || '';
verifie('plus aucun repli « toutes les categories » pour un contact sans choix', !/return categoriesToutesPourRdv\(\);/.test(api) && /array_intersect\(\$choisies, categoriesToutesPourRdv\(\)\)/.test(api) && /return \[\];   \/\/ non classe/.test(api));
verifie('/rdv/demander : un non classe n a aucun creneau (meme chemin que l inconnu)', /categoriesPourRdvAutomatique\(\(int\) \$cible\['id'\], \$moi\)/.test(dem) && /\$categoriesRdv !== \[\] \? creneauxLibres/.test(dem));
verifie('/rdv/choisir : un contact devenu non classe depuis la proposition est refuse (409 neutre)', /\$catsRetenues === \[\]/.test(choisir) && /rollBack\(\);\s+Rep::erreur\(409, 'creneau_pris'/.test(choisir));
verifie('rendez-vous a plusieurs : un invite non classe chez le titulaire = « sans acces », meme reponse que bloque ou inconnu', /categoriesPourRdvAutomatique\(\(int\) \$c\['id'\], \$moi\);\s+if \(\$categories === \[\]\) \{\s+\$sansAcces\[\] = texteSur/.test(inv));
verifie('/rdv/groupe/confirmer : chaque invite est revu avec SES categories (heures de sa categorie seulement)', /heuresPermisesDuJour\(dispoDuCompte\(\$inv\['id'\]\), \$inv\['categories'\], \$jsem\)/.test(api));

titre('3. La liste « Choisir qui » (executee dans la vraie page)');
const faux = {};
const el = (id) => (faux[id] = faux[id] || { id, innerHTML: '', textContent: '', style: {}, remove() { delete faux[id]; }, classList: { contains: () => false } });
const ctx = {
  console, saves: 0, rendus: 0,
  DISPO_CATEGORIES: [
    { id: 'travail', icon: 'T', label: 'Mon travail', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'famille', icon: 'F', label: 'Ma famille', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'personnel', icon: 'L', label: 'Mon temps libre', color: '#aaa', bg: '#bbb', texte: '#333' },
  ],
  escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  isTimeCoolUser: (c) => !!c.tc,
  saveContacts: () => { ctx.saves++; },
  renderDispo: () => { ctx.rendus++; },
  document: {
    createElement: () => ({ style: {}, remove() {} }),
    body: { appendChild: (o) => { faux.__overlay = o; } },
    getElementById: (id) => (id === 'tcQuiOverlay' ? (faux.__overlay ? { remove() { delete faux.__overlay; } } : null) : id === 'page-dispo' ? { classList: { contains: () => true } } : el(id)),
  },
};
ctx.contactsList = [
  { id: 'a', name: 'Zoé Zèbre' }, { id: 'b', name: 'Alain Dupont', categories: ['travail'] }, { id: 'c', name: 'Marie Martin', tc: true },
  { id: 'd', name: 'Basile Roux', tc: true }, { id: 'e', name: '<b>Eve</b>', blocked: true }, { id: 'f', name: 'Charles Famille', categories: ['famille'], tc: true },
];
vm.createContext(ctx);
['tcContactsAutorises', 'tcCompterChoisis', 'tcPhraseContactsAutorises', 'tcBoutonChoisirQui', 'tcChoisirQui', 'tcQuiRendre', 'tcQuiCompteur', 'tcQuiCocher', 'tcQuiFermer']
  .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
vm.runInContext('var _tcQui = null;', ctx);
const noms2 = () => (faux.tcQuiListe.innerHTML.match(/<span style="flex:1;min-width:0[^>]*>([^<]*(?:<span[^>]*>[^<]*<\/span>)?[^<]*)/g) || []).map((x) => x.replace(/<[^>]+>/g, '').trim().replace(/ bloqué$/, ''));
vm.runInContext('tcChoisirQui("travail")', ctx);
verifie('la liste montre TOUS les contacts (6)', (faux.tcQuiListe.innerHTML.match(/type="checkbox"/g) || []).length === 6);
verifie('ordre : deja coches d abord, puis inscrits TimeCool, puis ordre alphabetique', noms2().join('|') === 'Alain Dupont|Basile Roux|Charles Famille|Marie Martin|&lt;b&gt;Eve&lt;/b&gt;|Zoé Zèbre', noms2().join('|'));
verifie('seul le contact deja classe travail est coche', /data-id="b" checked/.test(faux.tcQuiListe.innerHTML) && !/data-id="a" checked/.test(faux.tcQuiListe.innerHTML) && !/data-id="f" checked/.test(faux.tcQuiListe.innerHTML));
verifie('un contact bloque est grise et sa case est desactivee', /data-id="e" disabled/.test(faux.tcQuiListe.innerHTML) && /bloqué/.test(faux.tcQuiListe.innerHTML));
verifie('les noms sont echappes (nom d autrui)', !/<b>Eve<\/b>/.test(faux.tcQuiListe.innerHTML));
verifie('compteur : « 1 choisi »', faux.tcQuiCompteur.textContent === '1 choisi', faux.tcQuiCompteur.textContent);
vm.runInContext('tcQuiCocher("c", true)', ctx);
verifie('cocher ajoute la categorie sur la fiche (meme donnee que la pastille)', JSON.stringify(ctx.contactsList[2].categories) === '["travail"]');
verifie('et enregistre / synchronise comme d habitude (saveContacts)', ctx.saves === 1);
verifie('compteur : « 2 choisis »', faux.tcQuiCompteur.textContent === '2 choisis', faux.tcQuiCompteur.textContent);
vm.runInContext('tcQuiCocher("c", true)', ctx);
verifie('cocher deux fois ne duplique pas la categorie', JSON.stringify(ctx.contactsList[2].categories) === '["travail"]');
vm.runInContext('tcQuiCocher("b", false)', ctx);
verifie('decocher retire la categorie (les autres restent)', JSON.stringify(ctx.contactsList[1].categories) === '[]');
vm.runInContext('tcQuiCocher("f", true)', ctx);
verifie('un contact qui avait une autre categorie la garde', JSON.stringify(ctx.contactsList[5].categories) === '["famille","travail"]');
vm.runInContext('tcQuiCocher("e", true)', ctx);
verifie('un contact bloque ne peut pas etre coche', !ctx.contactsList[4].categories);
verifie('l ordre ne saute pas quand on coche (fixe a l ouverture)', noms2().join('|').startsWith('Alain Dupont|Basile Roux'));
// Recherche
faux.tcQuiRecherche = faux.tcQuiRecherche || { value: '' };
vm.runInContext('_tcQui.recherche = "ma"; _tcQui.max = 60; tcQuiRendre()', ctx);
verifie('la recherche filtre par nom (« ma » : Marie Martin et Charles Famille ... )', /Marie Martin/.test(faux.tcQuiListe.innerHTML) && !/Zoé/.test(faux.tcQuiListe.innerHTML));
vm.runInContext('_tcQui.recherche = "zzz"; tcQuiRendre()', ctx);
verifie('rien ne correspond : le dit', /Aucun contact ne correspond/.test(faux.tcQuiListe.innerHTML));
// Un grand carnet : soixante lignes a la fois
ctx.contactsList = Array.from({ length: 3313 }, (_, i) => ({ id: 'x' + i, name: 'Contact ' + String(i).padStart(4, '0') }));
vm.runInContext('tcChoisirQui("travail")', ctx);
verifie('3 313 contacts : 60 lignes dessinees seulement, et « Afficher plus (3253 restants) »', (faux.tcQuiListe.innerHTML.match(/type="checkbox"/g) || []).length === 60 && /Afficher plus \(3253 restants\)/.test(faux.tcQuiListe.innerHTML));
vm.runInContext('_tcQui.max += 60; tcQuiRendre()', ctx);
verifie('« Afficher plus » ajoute soixante lignes', (faux.tcQuiListe.innerHTML.match(/type="checkbox"/g) || []).length === 120);
// Terminé met a jour les comptes de Mes disponibilites
ctx.rendus = 0;
vm.runInContext('tcQuiFermer()', ctx);
verifie('« Terminé » ferme la liste et remet a jour les comptes de « Mes disponibilites »', ctx.rendus === 1 && !faux.__overlay);
vm.runInContext('tcChoisirQui("personnel")', ctx);
verifie('pour le temps libre : titre « Qui peut me déranger même en temps libre » et rappel qu il faut une categorie', /Qui peut me déranger même en temps libre/.test(faux.__overlay.innerHTML) && /classé dans une autre catégorie/.test(faux.__overlay.innerHTML));
verifie('le panneau est centre, 16 px de marge, defile a l interieur (la liste), bouton « Terminé »', /align-items:center;justify-content:center;padding:16px/.test(page.slice(page.indexOf('function tcChoisirQui('))) && /max-height:90vh/.test(faux.__overlay.innerHTML) && /overflow-y:auto/.test(faux.__overlay.innerHTML) && />Terminé</.test(faux.__overlay.innerHTML));
verifie('recherche en haut du panneau', faux.__overlay.innerHTML.indexOf('id="tcQuiRecherche"') < faux.__overlay.innerHTML.indexOf('id="tcQuiListe"'));

titre('4. Mes disponibilites, Mes contacts, la fenetre « douceur »');
const mem = {};
const c2 = {
  console, _dispoData: { travail: [{ jours: [2], debut: '11:00', fin: '12:00' }], sante: [], famille: [], amis: [], sport: [], personnel: [] },
  contactsList: [{ id: 'b', name: 'Alain', categories: ['travail'] }, { id: 'g', name: 'Gaston', categories: ['travail'], blocked: true }, { id: 'f', name: 'Fanny', categories: ['famille'] }],
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem() {} },
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
c2.document = { getElementById: (id) => (id === 'dispoContent' ? zone : null) };
vm.createContext(c2);
['var TC_DISPO_KEY = [^;]*;', 'var TC_RDV_VALIDATION_KEY = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], c2); });
['formatJours', 'formatHeure', 'phraseDispo', 'tcValidationRdvExigee', 'tcCadreValidationRdv', 'tcContactsAutorises', 'tcCompterChoisis', 'tcPhraseContactsAutorises',
  'tcBoutonChoisirQui', 'tcLigneQuiPeutDeranger', 'renderDispo'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c2); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
mem.tc_rdv_validation = '0';
vm.runInContext('renderDispo()', c2);
const h2 = zone.innerHTML;
['travail', 'sante', 'famille', 'amis', 'sport'].forEach((id) => verifie('un bouton « 👥 Choisir qui » sous le bloc « ' + id + ' »', new RegExp('id="tcChoisirQui_' + id + '" onclick="tcChoisirQui\\(\'' + id + '\'\\)"').test(h2) && /Choisir qui<\/span>/.test(h2)));
verifie('pas de bouton « Choisir qui » ordinaire sous « Mon temps libre » : sa ligne « me déranger quand même » ouvre la meme liste', !/id="tcChoisirQui_personnel"/.test(h2) && /id="tcQuiPeutDeranger" onclick="tcChoisirQui\('personnel'\)"/.test(h2));
verifie('le bouton dit combien sont choisis (les bloques ne comptent pas, comme dans la liste)', /id="tcChoisirQuiN_travail"[^>]*>1 choisi</.test(h2) && /id="tcChoisirQuiN_famille"[^>]*>1 choisi</.test(h2) && /id="tcChoisirQuiN_sante"[^>]*>0 choisi</.test(h2));
verifie('la ligne « N contacts peuvent réserver seuls dans ces heures » compte les classes NON BLOQUES', /1 contact peut réserver seul dans ces heures/.test(h2), '');
verifie('le cadre gris dit la regle', /Seuls les contacts que tu as classés \(avec 👥 Choisir qui, sous chaque catégorie\) réservent tout seuls, et seulement dans les plages de leur catégorie\./.test(h2) && /Un contact non classé, quelqu’un qui n’est pas dans tes contacts, ou un contact bloqué, passe toujours par ta messagerie\./.test(h2));
mem.tc_rdv_validation = '1';
vm.runInContext('renderDispo()', c2);
verifie('case cochee : les boutons « Choisir qui » restent la, et ne sont PAS dans les blocs gris (donc cliquables)', /id="tcChoisirQui_travail"/.test(zone.innerHTML) && !/id="tcChoisirQui_travail"[^>]*opacity/.test(zone.innerHTML) && /aria-disabled="true"/.test(zone.innerHTML));

const tip = page.match(/<div style="font-size:13px;color:#5f6368;margin-bottom:14px;line-height:1\.6;padding:12px 14px;background:#f8f9fa;border-radius:12px;">\s*[^\n]*\n\s*<\/div>/);
verifie('Mes contacts : le conseil est le texte de Charles, avec « Mes disponibilités » cliquable',
  !!tip && /Rien à régler : tes contacts peuvent déjà te demander un rendez-vous, tu valides dans ta messagerie\. Pour laisser ta famille, tes amis ou tes collègues réserver seuls, coche-les en une fois depuis <a href="#" onclick="navigate\('dispo'\); return false;"[^>]*>Mes disponibilités<\/a>\./.test(tip[0]), tip && tip[0].slice(0, 120));
verifie('Mes contacts : l ancien conseil a disparu', !/Choisis, pour chaque personne/.test(page));
verifie('fiche contact : « Il peut réserver seul dans les plages de : (sans choix : il passe par ma messagerie) »', /Il peut réserver seul dans les plages de :<\/div>/.test(page) && /\(sans choix : il passe par ma messagerie\)/.test(page) && !/Il peut me prendre un RDV/.test(page));
verifie('fiche contact : sans categorie, ne dit plus « ne peut pas me prendre de rendez-vous »', !/ne peut pas me prendre de rendez-vous/.test(page) && /passe par ma messagerie : je valide chaque demande/.test(page));
const douce = fonction(page, 'tcFenetreOuvertureDouce') || '';
verifie('fenetre « C\'est ouvert, en douceur » : la phrase « Pour que quelqu’un réserve seul, coche-le avec 👥 Choisir qui, sous la catégorie qui lui va. »', /Pour que quelqu’un réserve seul, coche-le avec <b>👥 Choisir qui<\/b>, sous la catégorie qui lui va\./.test(douce) && douce.indexOf('Pour que quelqu’un') < douce.indexOf("tcFenetreCentree('🎉 C’est ouvert, en douceur', corps)"));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
