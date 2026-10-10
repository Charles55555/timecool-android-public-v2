// « Toujours attendre ma validation » (10/10) : une demande de rendez-vous n'est
// automatique que si le titulaire l'a décoché ET connaît le demandeur ET ne l'a
// pas bloqué. Sinon elle arrive dans sa messagerie, où il choisit lui-même.
// Règles exécutées sous PHP, structure des routes, écran « Mes disponibilités »
// et messagerie exécutés dans la vraie page.
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

titre('1. Les règles, exécutées sous PHP');
const noms = ['memeReference', 'validationRdvExigee', 'categoriesToutesPourRdv', 'categoriesPourPrendreRdv', 'categoriesPourRdvAutomatique',
  'autorisationPourPrendreRdv', 'rdvLibelleJour', 'rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre', 'plagesDeCategorie', 'retirerPlages', 'dispoPlagesDuJour', 'dispoDuCompte',
  'heuresPermisesDuJour', 'creneauxLibres'];
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
  public static ?array $dispo = null;
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
  public static function un(string $s, array $p = []): ?array {
    if (str_contains($s, 'tc_rdv_validation')) { return self::$reg === null ? null : ['contenu' => json_encode(self::$reg)]; }
    return self::$dispo === null ? null : ['contenu' => json_encode(['id' => 'timecool_disponibilites', 'v' => json_encode(self::$dispo)])];
  }
}
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$moi = ['telephone' => '0611223344', 'email' => 'charles@exemple.fr', 'reference' => 'REFCH'];
$toutes = ['travail', 'sante', 'famille', 'amis', 'sport'];   // le temps libre (personnel) est protege, il n ouvre rien

// La matrice : seul « decoche + connu + non bloque » est automatique.
$etats = ['jamais regle' => null, 'coche' => ['id' => 'tc_rdv_validation', 'v' => '1'], 'decoche' => ['id' => 'tc_rdv_validation', 'v' => '0']];
$gens = [
  'contact classe travail' => [['id' => 'c1', 'phone' => '06 11 22 33 44', 'categories' => ['travail']]],
  'contact enregistre non classe' => [['id' => 'c1', 'phone' => '06 11 22 33 44']],
  'inconnu' => [['id' => 'c9', 'phone' => '0699999999']],
  'contact bloque' => [['id' => 'c1', 'phone' => '0611223344', 'blocked' => true]],
  'carnet vide' => [],
];
foreach ($etats as $etat => $reg) {
  foreach ($gens as $gen => $fiches) {
    Db::$reg = $reg; Db::$fiches = $fiches;
    $auto = categoriesPourRdvAutomatique(1, $moi) !== [];
    $attendu = $etat === 'decoche' && $gen === 'contact classe travail';
    t('validation ' . $etat . ', ' . $gen . ' : ' . ($attendu ? 'automatique' : 'messagerie'), $auto === $attendu);
  }
}
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => 0]; Db::$fiches = [];
t('la valeur 0 (nombre) decoche aussi', !validationRdvExigee(1));
Db::$reg = ['id' => 'tc_rdv_validation', 'v' => 'n importe quoi'];
t('une valeur inattendue laisse la validation exigee (prudence)', validationRdvExigee(1));
Db::$reg = null;
t('aucune valeur enregistree (compte neuf ou ancien) : exigee', validationRdvExigee(1));

// Plus d horaires par defaut caches
Db::$dispo = null; Db::$fiches = [];
t('aucune plage : dispoPlagesDuJour rend une liste vide, pas null', dispoPlagesDuJour([], $toutes, 2) === []);
t('aucune plage : aucune heure, semaine comme week-end', heuresPermisesDuJour([], $toutes, 2) === [] && heuresPermisesDuJour([], $toutes, 6) === []);
t('aucune plage : aucun creneau propose', creneauxLibres(1, 3, $toutes) === []);
Db::$dispo = ['travail' => [], 'sante' => [], 'famille' => [], 'amis' => [], 'sport' => [], 'personnel' => []];
t('toutes les plages supprimees : aucun creneau (la phrase de l ecran est vraie)', creneauxLibres(1, 3, $toutes) === []);
Db::$dispo = ['travail' => [['jours' => [2, 4], 'debut' => '11:00', 'fin' => '12:00'], ['jours' => [2, 4], 'debut' => '14:00', 'fin' => '15:00']]];
$c = creneauxLibres(1, 3, $toutes);
$ok = count($c) === 3;
foreach ($c as $x) { $ok = $ok && in_array($x['heure'], [11, 14], true) && (int) date('w', strtotime($x['date'])) % 6 !== 0; }
t('les deux plages « demarrer doucement » donnent des creneaux a 11h ou 14h, en semaine', $ok, json_encode($c));
t('le libelle du jour', rdvLibelleJour(strtotime('2026-10-12 10:00:00')) === 'lundi 12 octobre');

echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-validation-' + process.pid + '.php');
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
verifie('/rdv/demander : creneaux automatiques seulement via categoriesPourRdvAutomatique', /categoriesPourRdvAutomatique\(\(int\) \$cible\['id'\], \$moi\)/.test(dem) && /\$categoriesRdv !== \[\] \? creneauxLibres/.test(dem));
verifie('/rdv/demander : la demande en messagerie est marquee « demande_rdv » (de quoi y repondre)', /messagePoser\(\$moi, \$cible, messageDemandeRdv\(\$moi, \$cible\), \$rdvId, null, 'demande_rdv'\)/.test(dem));
verifie('/rdv/demander : une seule reponse pour inconnu, bloque ou validation exigee (aucune raison dite)', !/bloqu|inconnu|valid/i.test(dem.slice(dem.indexOf("'mode'    => 'messagerie'"), dem.indexOf("foreach ($creneaux as $rang"))));
verifie('rendez-vous a plusieurs : un invite qui exige sa validation, inconnu ou bloque = « sans acces »', /categoriesPourRdvAutomatique\(\(int\) \$c\['id'\], \$moi\);\s+if \(\$categories === \[\]\) \{\s+\$sansAcces\[\] = texteSur/.test(api));
verifie('plus aucun horaire par defaut dans l API', !/\[9, 10, 11, 14, 15, 16, 17\]/.test(api) && !/heuresParDefaut/.test(api));
verifie('la fiche est aussi reconnue par la reference du compte (fiche creee par un blocage)', /!\$memeTel && !\$memeMail && !memeReference\(\$c, \$demandeur\)/.test(api) && /\$memeTel \|\| \$memeMail \|\| memeReference\(\$c, \$personne\)/.test(api));

const prop = api.slice(api.indexOf("case 'POST /rdv/proposer-creneau':"), api.indexOf("case 'POST /rdv/refuser':"));
const ref = api.slice(api.indexOf("case 'POST /rdv/refuser':"), api.indexOf('// SYNCHRONISATION ENTRE APPAREILS'));
verifie('proposer-creneau : la demande doit etre la SIENNE (invite_compte_id) et en attente', /invite_compte_id = \? AND statut = "attente"/.test(prop) && /\[\$rdvId, \$moi\['id'\]\]/.test(prop));
verifie('proposer-creneau : date, heure et duree validees, creneau futur', /creneau_invalide/.test(prop) && /\$debutTs <= time\(\)/.test(prop) && /\$minutes % 15 !== 0/.test(prop));
verifie('proposer-creneau : transaction, prise atomique de la demande (rowCount)', /beginTransaction\(\)/.test(prop) && /UPDATE rdv SET statut = "choisi"/.test(prop) && /rowCount\(\) === 0/.test(prop));
verifie('proposer-creneau : les DEUX comptes verrouilles, dans l ordre des identifiants', /sort\(\$ids\);\s+foreach \(\$ids as \$idCompte\) \{\s+Db::un\('SELECT id FROM comptes WHERE id = \? FOR UPDATE'/.test(prop) && /\$ids = \[\(int\) \$moi\['id'\], \(int\) \$demandeur\['id'\]\]/.test(prop));
verifie('proposer-creneau : creneau relu dans les DEUX agendas, 409 creneau_pris, rien d ecrit avant', /creneauRetenuEstLibre\(\(int\) \$moi\['id'\]/.test(prop) && /creneauRetenuEstLibre\(\(int\) \$demandeur\['id'\]/.test(prop) && /rollBack\(\);\s+Rep::erreur\(409, 'creneau_pris'/.test(prop) && prop.indexOf("409, 'creneau_pris'") < prop.indexOf('elementsPoser('));
verifie('proposer-creneau : le rendez-vous est ecrit chez les deux, avec la fiche de l autre', /elementsPoser\(\[\s+\['compte_id' => \(int\) \$moi\['id'\]/.test(prop) && /ficheContactDe\(\(int\) \$moi\['id'\], \$demandeur\)/.test(prop) && /ficheContactDe\(\(int\) \$demandeur\['id'\], \$moi\)/.test(prop));
verifie('proposer-creneau : message de confirmation, demande marquee traitee, puis commit', prop.indexOf('messagePoser(') > 0 && prop.indexOf('demandeRdvTraitee(') > prop.indexOf('messagePoser(') && prop.indexOf('$pdo->commit()') > prop.indexOf('demandeRdvTraitee('));
verifie('proposer-creneau : les noms passent par texteSur', (prop.match(/texteSur\(/g) || []).length >= 2);
verifie('refuser : seulement SA demande en attente, close en « refuse »', /invite_compte_id = \? AND statut = "attente"/.test(ref) && /SET statut = "refuse"/.test(ref));
verifie('refuser : la personne est bloquee (fiche creee ou passee a blocked:true)', /bloquerContact\(\$moi, \$demandeur\)/.test(ref) && /\$c\['blocked'\] = true/.test(fonction(api, 'bloquerContact') || '') && /'blocked'\s+=> true/.test(fonction(api, 'bloquerContact') || ''));
verifie('refuser : rien n est envoye au demandeur (aucun message, aucune notification)', !/messagePoser\(/.test(ref) && !/envoyerEmail/.test(ref));
verifie('la fiche creee ne porte ni telephone ni email de la personne', /'phone'\s+=> ''/.test(fonction(api, 'bloquerContact') || '') && /'email'\s+=> ''/.test(fonction(api, 'bloquerContact') || ''));
verifie('la demande traitee est marquee dans la messagerie du titulaire (ses appareils la voient disparaitre)', /\['traite'\] = true/.test(fonction(api, 'demandeRdvTraitee') || ''));
verifie('les boutons de messagerie sont des routes protegees (Auth::compte)', (prop.match(/Auth::compte\(\)/g) || []).length === 1 && (ref.match(/Auth::compte\(\)/g) || []).length === 1);

titre('3. La page : le reglage et l ecran « Mes disponibilites »');
verifie('la cle tc_rdv_validation voyage comme un reglage (famille « reglage », hors liste « deja synchronise »)',
  /var TC_RDV_VALIDATION_KEY = 'tc_rdv_validation';/.test(page) && !/TC_SYNC_DEJA_SYNCHRONISE = \[[^\]]*tc_rdv_validation/.test(page));
verifie('et elle n est pas dans la liste « jamais transfere »', !/TC_JAMAIS_TRANSFERE = \[[^\]]*tc_rdv_validation/.test(page));

const mem = {};
const ctx = {
  console, contactsList: [], _dispoData: null, _toasts: [], _sync: 0,
  localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
  showToast: (m) => ctx._toasts.push(m), tcSyncBientot: () => { ctx._sync++; },
  _fenetres: [], tcFenetreOuvertureDouce: (p) => ctx._fenetres.push(p),
  _protections: 0, tcFenetreProtection: () => { ctx._protections++; },
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
const zone = { innerHTML: '', desactives: 0, querySelectorAll() { const z = this; return { forEach(f) { z.desactives = 6; } }; } };
ctx.document = { getElementById: (id) => (id === 'dispoContent' ? zone : null) };
vm.createContext(ctx);
['var TC_DISPO_KEY = [^;]*;', 'var TC_RDV_VALIDATION_KEY = [^;]*;', 'var TC_PLAGES_DOUCES = \\[[^;]*\\];'].forEach((re) => {
  const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); }
});
['loadDispo', 'saveDispo', 'formatJours', 'formatHeure', 'phraseDispo', 'tcValidationRdvExigee', 'tcOuvrirPlagesDouces', 'tcBasculerValidationRdv',
  'tcCadreValidationRdv', 'tcContactsAutorises', 'tcCompterChoisis', 'tcPhraseContactsAutorises', 'tcBoutonChoisirQui', 'tcLigneQuiPeutDeranger', 'renderDispo'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });

verifie('compte neuf (rien enregistre) : la case est cochee', vm.runInContext('tcValidationRdvExigee()', ctx) === true);
vm.runInContext('renderDispo()', ctx);
let h = zone.innerHTML;
verifie('cochee : la case est dans le HTML, cochee', /id="dispoValidation" checked /.test(h));
verifie('la case est dans un cadre bien visible, APRES le cadre gris et AVANT « Mon travail »',
  h.indexOf('tu restes ma') > -1 && h.indexOf('tu restes ma') < h.indexOf('id="dispoValidation"') && h.indexOf('id="dispoValidation"') < h.indexOf('Mon travail')
  && /border:2px solid #1a73e8/.test(h));
verifie('cochee : les six blocs sont gris et non modifiables', (h.match(/aria-disabled="true"/g) || []).length === 6 && (h.match(/pointer-events:none/g) || []).length === 6 && zone.desactives === 6);
verifie('cochee : la phrase courte de la regle', /Tes contacts te demandent un rendez-vous, tu valides dans ta messagerie\./.test(h));
verifie('cochee : le cadre gris dit la regle en vigueur (personne ne reserve seul)', /personne ne r.serve tout seul/.test(h));
verifie('l ancienne phrase fausse a disparu (« seulement aux contacts que tu choisis », « Partout ailleurs »)', !/seulement aux contacts que tu choisis/.test(h) && !/Partout ailleurs/.test(h));
verifie('rien n est ecrit quand on se contente d afficher', !('tc_rdv_validation' in mem) && ctx._sync === 0);

// On decoche, avec des plages deja posees dans une seule categorie
ctx._dispoData = null;
mem.timecool_disponibilites = JSON.stringify({ travail: [{ jours: [6], debut: '10:00', fin: '11:00' }] });
vm.runInContext('loadDispo(); tcBasculerValidationRdv(false)', ctx);
verifie('decoche : le reglage est enregistre a « 0 » et la synchronisation est lancee', mem.tc_rdv_validation === '0' && ctx._sync === 1);
verifie('decoche : une categorie qui a deja une plage n est pas touchee', JSON.stringify(ctx._dispoData.travail) === JSON.stringify([{ jours: [6], debut: '10:00', fin: '11:00' }]));
const douces = JSON.stringify([{ jours: [2, 4], debut: '11:00', fin: '12:00' }, { jours: [2, 4], debut: '14:00', fin: '15:00' }]);
verifie('decoche : chaque categorie vide (sauf le temps libre, qui reste vide) recoit 11h-12h et 14h-15h, les mardis et jeudis',
  ['sante', 'famille', 'amis', 'sport'].every((c) => JSON.stringify(ctx._dispoData[c]) === douces) && ctx._dispoData.personnel.length === 0);
verifie('et c est enregistre dans « Mes disponibilites » (ce que lit le serveur)', JSON.parse(mem.timecool_disponibilites).sante.length === 2);
verifie('decoche : la fenetre « C est ouvert, en douceur » s ouvre, en disant que des plages ont ete creees', JSON.stringify(ctx._fenetres) === '[true]' && ctx._toasts.length === 0);
const fen = fonction(page, 'tcFenetreOuvertureDouce') || '';
verifie('son texte est celui valide par Charles (mardis et jeudis, 11h-12h, 14h-15h, seulement a ces heures-la, reste ferme)',
  /C’est ouvert, en douceur/.test(fen) && /les mardis et les jeudis/.test(fen) && /de 11h à 12h/.test(fen) && /de 14h à 15h/.test(fen)
  && /mais seulement à ces heures-là/.test(fen) && /Le reste de ton agenda reste fermé/.test(fen) && /comme tu préfères, juste en dessous/.test(fen));
verifie('et si des plages existaient deja, la fenetre le dit autrement, en citant quand meme les mardis et jeudis 11h-12h / 14h-15h', /plages horaires sont déjà réglées/.test(fen) && (fen.match(/les mardis et les jeudis/g) || []).length === 2 && (fen.match(/de 14h à 15h/g) || []).length >= 1);
h = zone.innerHTML;
verifie('decoche : plus rien de grise, case decochee', !/aria-disabled="true"/.test(h) && !/id="dispoValidation" checked/.test(h) && !/opacity:0\.45/.test(h));
verifie('decoche : le cadre gris dit la regle (contacts classes seulement, dans les plages de leur categorie ; non classe, inconnu ou bloque : messagerie)', /Seuls les contacts que tu as class.s/.test(h) && /seulement dans les plages de leur cat.gorie/.test(h) && /Un contact non class., quelqu.un qui n.est pas dans tes contacts, ou un contact bloqu., passe toujours par ta messagerie/.test(h));
verifie('decoche : la ligne « N contacts peuvent réserver seuls dans ces heures » reapparait (ici : aucun contact classe)', /Aucun contact ne peut encore r.server seul dans ces heures/.test(h));
// On recoche : rien n est efface
vm.runInContext('tcBasculerValidationRdv(true)', ctx);
verifie('recoche : reglage a « 1 », aucune plage supprimee', mem.tc_rdv_validation === '1' && JSON.parse(mem.timecool_disponibilites).sante.length === 2);
verifie('recoche : la fenetre « Tu es protege » s ouvre (pas un simple message fugace)', ctx._protections === 1 && ctx._toasts.length === 0);
const prot = fonction(page, 'tcFenetreProtection') || '';
verifie('son texte est celui valide par Charles', /Tu es protégé/.test(prot) && /sans ton accord/.test(prot) && /toi qui choisis le créneau, ou qui refuses/.test(prot) && /restent enregistrées, en gris/.test(prot));
const centree = fonction(page, 'tcFenetreCentree') || '';
verifie('les deux fenetres sont au centre de l ecran, avec un bouton Compris', /align-items:center;justify-content:center/.test(centree) && /Compris/.test(centree));
// Decoche une 2e fois : ne duplique rien
vm.runInContext('tcBasculerValidationRdv(false)', ctx);
verifie('decoche une deuxieme fois : les plages ne sont pas dupliquees', JSON.parse(mem.timecool_disponibilites).sante.length === 2);
verifie('et la fenetre dit alors « plages ci-dessous » (rien de cree)', ctx._fenetres[ctx._fenetres.length - 1] === false);
// Toutes les plages supprimees a la main : la phrase de l ecran est vraie
ctx._dispoData = { travail: [], sante: [], famille: [], amis: [], sport: [], personnel: [] };
vm.runInContext('renderDispo()', ctx);
verifie('toutes les plages supprimees : « Aucune plage ouverte — personne ne peut reserver » (vrai cote serveur), et rien de protege dans le temps libre', (zone.innerHTML.match(/Aucune plage ouverte/g) || []).length === 5 && /Aucune plage prot/.test(zone.innerHTML));

titre('4. La page : la demande recue dans la messagerie');
const c2 = { _toasts: [] };
vm.createContext(c2);
vm.runInContext('var _tcRdvTraites = {};', c2);
['escapeHTMLSafe', 'tcDemandeRdvEnAttente', 'tcCadreDemandeRdv'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c2); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const conv = (thread) => ({ serveur: true, with: 'Jean <b>Dupont</b>', thread });
const demande = { from: 'them', text: 'Salut', rdv: 42, genre: 'demande_rdv', traite: false };
c2.conv = conv([demande]);
verifie('une demande recue et sans reponse est detectee', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === c2.conv.thread[0] || (vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) || {}).rdv === 42);
c2.conv = conv([{ ...demande, traite: true }]);
verifie('une demande deja traitee (sur un autre appareil) ne montre plus rien', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === null);
c2.conv = conv([{ ...demande, from: 'me' }]);
verifie('la demande qu on a SOI-MEME envoyee n a pas de boutons', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === null);
c2.conv = conv([{ from: 'them', text: 'Rendez-vous confirmé', rdv: 42, genre: '', traite: false }]);
verifie('le message de confirmation n est pas une demande', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === null);
c2.conv = { serveur: false, thread: [demande] };
verifie('une conversation locale (demo) n a pas de boutons', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === null);
c2.conv = conv([demande]);
vm.runInContext('_tcRdvTraites[42] = true', c2);
verifie('apres la reponse, le cadre disparait sans attendre la synchronisation', vm.runInContext('tcDemandeRdvEnAttente(conv)', c2) === null);
vm.runInContext('_tcRdvTraites = {}', c2);
const cadre = vm.runInContext('tcCadreDemandeRdv(conv.thread[0], conv.with)', c2);
verifie('le cadre porte « Proposer un créneau » et « Refuser et bloquer », liés à la demande', /tcProposerCreneauRdv\(42\)/.test(cadre) && /tcRefuserBloquerRdv\(42\)/.test(cadre) && /Proposer un créneau/.test(cadre) && /Refuser et bloquer/.test(cadre));
verifie('le prénom est echappe (nom d autrui)', !/<b>Dupont/.test(cadre) && /Jean/.test(cadre));
verifie('les messages gardent l identifiant de la demande', /rdv: typeof t\.rdv === 'number' \? t\.rdv : 0/.test(page) && /genre: typeof t\.genre === 'string'/.test(page) && /traite: t\.traite === true/.test(page));
verifie('openConversation affiche le cadre', /const demandeRdv = tcDemandeRdvEnAttente\(msg\);\s+if \(demandeRdv\) body\.innerHTML \+= tcCadreDemandeRdv\(demandeRdv, msg\.with\);/.test(page));
verifie('les deux appels au serveur existent', /\/rdv\/proposer-creneau/.test(page) && /\/rdv\/refuser/.test(page) && /async proposerCreneauRdv\(rdv, date, debut, duree\)/.test(page) && /async refuserRdv\(rdv\)/.test(page));
const env = fonction(page, 'tcEnvoyerCreneauRdv') || '';
verifie('creneau pris (409) ou invalide : le message du serveur s affiche dans la fenetre, rien n est ferme', /erreur\(e\.message/.test(env) && env.indexOf('tcFermerCreneauRdv()') > env.indexOf('catch'));
verifie('refuser demande confirmation avant d agir, et dit que la personne ne sera pas prevenue', /tcConfirm\('Refuser cette demande et bloquer la personne \? Elle ne sera pas pr.venue\.'\)/.test(fonction(page, 'tcRefuserBloquerRdv') || ''));
verifie('apres une reponse, la synchronisation ramene le rendez-vous', /tcSyncTour\(\)/.test(fonction(page, 'tcApresReponseRdv') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
