// « Savoir QUI m'écrit » (10/10) : la carte d'identité d'un demandeur inconnu, le bouton
// « ➕ Ajouter à mes contacts », l'ajout automatique à la proposition d'un créneau, et le
// nouveau texte de la demande. Règles exécutées sous PHP, carte et bouton dans la vraie page.
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

titre('1. Le serveur, execute sous PHP');
const noms = ['texteSur', 'memeReference', 'ficheContactDe', 'messageDemandeRdv', 'identiteDemandeur', 'creerFicheContact', 'messagePoser'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l API', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Empreinte {
  public static function normaliserTelephone(string $tel, string $indicatifDefaut = '+33'): string { $t = preg_replace('/[^0-9+]/', '', $tel) ?? ''; if (str_starts_with($t, '00')) { $t = '+' . substr($t, 2); } if (!str_starts_with($t, '+')) { $t = $indicatifDefaut . ltrim($t, '0'); } return $t; }
  public static function normaliserEmail(string $e): string { return strtolower(trim($e)); }
}
class Db {
  public static array $fiches = [];
  public static function tous(string $s, array $p = []): array { return array_map(static fn($c) => ['contenu' => json_encode($c)], self::$fiches); }
  public static function un(string $s, array $p = []): ?array { return null; }
}
$ecritures = [];
function elementsPoser(array $e): void { global $ecritures; foreach ($e as $x) { $ecritures[] = $x; if ($x['type'] === 'contact') { Db::$fiches[] = $x['contenu']; } } }
function traduire(string $t, string $a, string $b, int $c): ?string { return null; }
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$demandeur = ['id' => 7, 'prenom' => 'Inès', 'nom' => 'Testeur', 'telephone' => '+33611223344', 'email' => 'ines@exemple.fr', 'reference' => 'REFINES', 'cree_le' => '2026-09-05 10:00:00', 'langue' => 'fr'];
$titulaire = ['id' => 1, 'prenom' => 'Charles', 'nom' => 'Haddad', 'telephone' => '+33699999999', 'email' => 'charles@exemple.fr', 'reference' => 'REFCH', 'langue' => 'fr'];

// Le texte de la demande
$m = messageDemandeRdv($demandeur, $titulaire);
t('le nouveau texte, mot pour mot', $m === "Salut Charles 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool. Tu me proposes un créneau ? Merci !", $m);
t('plus un mot sur « agenda pas configuré »', !str_contains($m, 'configur') && !str_contains($m, 'instantané'));

// La carte d identite
Db::$fiches = [];
$id = identiteDemandeur(1, $demandeur);
t('inconnu : ses coordonnees d inscription', $id !== null && $id['prenom'] === 'Inès' && $id['telephone'] === '+33611223344' && $id['email'] === 'ines@exemple.fr', json_encode($id));
$pirate = array_merge($demandeur, ['nom' => '<b>Testeur</b>']);
$idp = identiteDemandeur(1, $pirate);
t('son nom passe par texteSur (aucune balise)', !str_contains($idp['nom'], '<') && !str_contains($idp['nom'], '>'), $idp['nom']);
t('« depuis le » : une date ISO lisible', str_starts_with($id['cree_le'], '2026-09-05'), $id['cree_le']);
Db::$fiches = [['id' => 'c1', 'phone' => '06 11 22 33 44']];
t('deja dans le carnet par le telephone : pas de carte', identiteDemandeur(1, $demandeur) === null);
Db::$fiches = [['id' => 'c1', 'email' => 'INES@exemple.fr']];
t('deja dans le carnet par l email : pas de carte', identiteDemandeur(1, $demandeur) === null);
Db::$fiches = [['id' => 'c1', 'referenceCompte' => 'REFINES']];
t('deja dans le carnet par la reference de compte : pas de carte', identiteDemandeur(1, $demandeur) === null);
Db::$fiches = [['id' => 'c9', 'phone' => '0600000000', 'email' => 'autre@exemple.fr']];
t('un autre contact ne cache pas la carte', identiteDemandeur(1, $demandeur) !== null);

// Le message : le « demandeur » n arrive que chez le titulaire
Db::$fiches = []; $ecritures = [];
messagePoser($demandeur, $titulaire, $m, 5, null, 'demande_rdv', identiteDemandeur(1, $demandeur));
$chezT = null; $chezD = null;
foreach ($ecritures as $e) {
  if ($e['type'] !== 'conversation') { continue; }
  if ($e['compte_id'] === 1) { $chezT = $e['contenu']; }
  if ($e['compte_id'] === 7) { $chezD = $e['contenu']; }
}
$ligneT = $chezT['thread'][0] ?? []; $ligneD = $chezD['thread'][0] ?? [];
t('chez le titulaire : la ligne porte « demandeur », la marque « demande_rdv » et l identifiant', ($ligneT['demandeur']['telephone'] ?? '') === '+33611223344' && $ligneT['genre'] === 'demande_rdv' && $ligneT['rdv'] === 5 && $ligneT['from'] === 'them', json_encode($ligneT));
t('chez le demandeur : AUCUN « demandeur », il ne recoit rien sur le titulaire', !array_key_exists('demandeur', $ligneD) && $ligneD['from'] === 'me' && !str_contains(json_encode($chezD), '+33699999999') && !str_contains(json_encode($chezD), 'charles@exemple.fr'), json_encode($ligneD));
$ecritures = [];
messagePoser($demandeur, $titulaire, 'Un message libre', null, null, null, null);
t('sans identite (contact deja enregistre) : aucune cle « demandeur »', !array_key_exists('demandeur', $ecritures[0]['contenu']['thread'][0] ?? []) && !array_key_exists('demandeur', $ecritures[1]['contenu']['thread'][0] ?? []));

// L ajout automatique
Db::$fiches = []; $ecritures = [];
$fid = creerFicheContact($titulaire, $demandeur);
$fiche = $ecritures[0]['contenu'];
t('la fiche est creee chez le titulaire (type contact)', $ecritures[0]['compte_id'] === 1 && $ecritures[0]['type'] === 'contact' && $ecritures[0]['uid'] === $fid && $fiche['id'] === $fid);
t('nom, telephone, email et reference de compte', $fiche['name'] === 'Inès Testeur' && $fiche['phone'] === '+33611223344' && $fiche['email'] === 'ines@exemple.fr' && $fiche['referenceCompte'] === 'REFINES', json_encode($fiche));
t('inscrite TimeCool, SANS categorie (elle reste en messagerie)', $fiche['isTimeCool'] === true && !array_key_exists('categories', $fiche) && !array_key_exists('blocked', $fiche));
t('ficheContactDe la retrouve tout de suite (le rendez-vous s y rattache)', ficheContactDe(1, $demandeur) === $fid);
t('une seconde demande ne fait plus apparaitre de carte', identiteDemandeur(1, $demandeur) === null);

echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-quiecrit-' + process.pid + '.php');
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

titre('2. Les routes');
const dem = api.slice(api.indexOf("case 'POST /rdv/demander':"), api.indexOf("case 'POST /rdv/choisir':"));
const prop = api.slice(api.indexOf("case 'POST /rdv/proposer-creneau':"), api.indexOf("case 'POST /rdv/refuser':"));
const ref = api.slice(api.indexOf("case 'POST /rdv/refuser':"), api.indexOf('// SYNCHRONISATION ENTRE APPAREILS'));
verifie('/rdv/demander : les coordonnees sont jointes au message « demande_rdv » (identiteDemandeur)', /'demande_rdv',\s+identiteDemandeur\(\(int\) \$cible\['id'\], \$moi\)\)/.test(dem));
verifie('messagePoser : « demandeur » ne va QUE dans l exemplaire du destinataire (sens « them »)', /if \(\$sens === 'them' && \$demandeur !== null\) \{\s+\$sienne\['demandeur'\] = \$demandeur;/.test(fonction(api, 'messagePoser') || ''));
verifie('la reponse au demandeur ne contient aucune coordonnee du titulaire', !/telephone|email/.test(dem.slice(dem.indexOf("'mode'    => 'messagerie'"), dem.indexOf('foreach ($creneaux as $rang'))));
verifie('proposer-creneau : une personne hors carnet entre dans le carnet, DANS la transaction, avant l ecriture du rendez-vous', /ficheContactDe\(\(int\) \$moi\['id'\], \$demandeur\) === null\) \{\s+creerFicheContact\(\$moi, \$demandeur\);/.test(prop) && prop.indexOf('beginTransaction()') < prop.indexOf('creerFicheContact(') && prop.indexOf('creerFicheContact(') < prop.indexOf('elementsPoser([') && prop.indexOf('elementsPoser([') < prop.indexOf('$pdo->commit()'));
verifie('proposer-creneau : le rendez-vous est rattache a la fiche (ficheContactDe apres creation)', /'contenu' => \$entree\(texteSur\(\$demandeur\['prenom'\] \. ' ' \. \$demandeur\['nom'\]\), ficheContactDe\(\(int\) \$moi\['id'\], \$demandeur\)\)/.test(prop));
verifie('refuser : pas d ajout automatique (bloquerContact cree deja sa fiche bloquee)', !/creerFicheContact/.test(ref) && /bloquerContact\(\$moi, \$demandeur\)/.test(ref));
verifie('la fiche creee ne porte aucune categorie ni drapeau de blocage', !/'categories'/.test(fonction(api, 'creerFicheContact') || '') && !/'blocked'/.test(fonction(api, 'creerFicheContact') || ''));

titre('3. La carte et le bouton (executes dans la vraie page)');
const sauvegardes = [];
const ctx = {
  console, _currentConvId: 'srv_REFINES', ouvertes: 0, classer: [], toasts: [],
  contactsList: [{ id: 'k1', name: 'Marie', phone: '06 12 00 00 00', email: 'marie@exemple.fr' }],
  DISPO_CATEGORIES: [
    { id: 'travail', icon: 'T', label: 'Mon travail', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sante', icon: 'S', label: 'Ma santé', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'famille', icon: 'F', label: 'Ma famille', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'amis', icon: 'A', label: 'Mes amis et loisirs', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sport', icon: 'P', label: 'Mon sport', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'personnel', icon: 'L', label: 'Mon temps libre', color: '#aaa', bg: '#bbb', texte: '#333' },
  ],
  saveContacts: () => sauvegardes.push(JSON.stringify(ctx.contactsList.length)),
  showToast: (m) => ctx.toasts.push(m),
  openConversation: (id) => { ctx.ouvertes++; },
  document: { createElement: () => ({ style: {}, remove() {} }), body: { appendChild: (o) => { ctx.__overlay = o; } }, getElementById: () => null },
};
const demandeur = { prenom: 'Inès', nom: 'Testeur', telephone: '+33611223344', email: 'ines@exemple.fr', cree_le: '2026-09-05T10:00:00+02:00' };
const demande = { from: 'them', rdv: 42, genre: 'demande_rdv', traite: false, demandeur };
ctx.tcConversationParId = () => ({ serveur: true, reference: 'REFINES', with: 'Inès Testeur', thread: [demande] });
ctx.escapeHTMLSafe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
vm.createContext(ctx);
vm.runInContext('var _tcRdvTraites = {};', ctx);
['tcNormaliserTelephone', 'tcContactConnu', 'tcCarteDemandeurHTML', 'tcDemandeRdvEnAttente', 'tcAjouterDemandeur', 'tcProposerClasserContact', 'tcFermerClasserContact', 'tcClasserContact', 'tcCadreDemandeRdv']
  .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const carte = vm.runInContext('tcCarteDemandeurHTML(' + JSON.stringify(demande) + ', "REFINES")', ctx);
const texte = carte.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
verifie('inconnu : la carte montre prenom nom, telephone, email et « sur TimeCool depuis le 05/09/2026 »', /Inès Testeur/.test(texte) && /\+33611223344/.test(texte) && /ines@exemple\.fr/.test(texte) && /Sur TimeCool depuis le 05\/09\/2026/.test(texte), texte);
verifie('et « Pas dans tes contacts. »', /Pas dans tes contacts\./.test(texte));
verifie('le bouton « ➕ Ajouter à mes contacts » est la, branche', /onclick="tcAjouterDemandeur\(\)"[^>]*>➕ Ajouter à mes contacts<\/button>/.test(carte));
const piege = vm.runInContext('tcCarteDemandeurHTML({demandeur: {prenom: "<img src=x onerror=1>", nom: "A", telephone: "+33600000000", email: "a@b.fr", cree_le: ""}}, "R")', ctx);
verifie('les coordonnees d un inconnu sont echappees (nom d autrui)', !/<img/.test(piege) && /&lt;img/.test(piege));
const conn = (d, r) => vm.runInContext('tcContactConnu(' + JSON.stringify(d) + ', ' + JSON.stringify(r) + ')', ctx);
verifie('PAS de carte pour un contact deja enregistre : meme telephone ecrit autrement', conn({ telephone: '+33612000000', email: 'x@y.fr' }, 'AUTRE') === true);
verifie('PAS de carte : meme email, casse differente', conn({ telephone: '+33699000000', email: 'MARIE@exemple.fr' }, 'AUTRE') === true);
ctx.contactsList.push({ id: 'k2', name: 'Par reference', referenceCompte: 'REFZ' });
verifie('PAS de carte : meme reference de compte', conn({ telephone: '+33688000000', email: 'n@n.fr' }, 'REFZ') === true);
verifie('carte pour un inconnu', conn(demandeur, 'REFINES') === false);
verifie('sans « demandeur » (ancienne demande) : aucune carte', vm.runInContext('tcCarteDemandeurHTML({}, "R")', ctx) === '' && vm.runInContext('tcCarteDemandeurHTML({demandeur: null}, "R")', ctx) === '');
verifie('la carte est dans le cadre « Demande de rendez-vous », avant les deux boutons', (() => { const c = vm.runInContext('tcCadreDemandeRdv(' + JSON.stringify(demande) + ', "Inès Testeur", "REFINES")', ctx); return c.indexOf('tcCarteDemandeur') > -1 && c.indexOf('tcCarteDemandeur') < c.indexOf('Proposer un créneau'); })());

vm.runInContext('tcAjouterDemandeur()', ctx);
const nouveau = ctx.contactsList[ctx.contactsList.length - 1];
verifie('« Ajouter » cree la fiche : nom, telephone, email, reference de compte, inscrit TimeCool', nouveau && nouveau.name === 'Inès Testeur' && nouveau.phone === '+33611223344' && nouveau.email === 'ines@exemple.fr' && nouveau.referenceCompte === 'REFINES' && nouveau.isTimeCool === true, JSON.stringify(nouveau));
verifie('sans categorie (facultatif), et enregistree/synchronisee comme les autres contacts', !nouveau.categories && sauvegardes.length === 1);
verifie('la conversation est redessinee (la carte disparait : la fiche existe)', ctx.ouvertes === 1 && conn(demandeur, 'REFINES') === true);
verifie('un second clic ne cree pas de doublon', (() => { const n = ctx.contactsList.length; vm.runInContext('tcAjouterDemandeur()', ctx); return ctx.contactsList.length === n; })());
const o = ctx.__overlay;
verifie('on propose tout de suite de la classer : panneau centre, 5 categories (jamais « temps libre »), « Plus tard »', !!o && /align-items:center;justify-content:center;padding:16px/.test(o.style.cssText) && ['Mon travail', 'Ma santé', 'Ma famille', 'Mes amis et loisirs', 'Mon sport'].every((l) => o.innerHTML.indexOf(l) > -1) && !/Mon temps libre/.test(o.innerHTML) && /Plus tard/.test(o.innerHTML) && /Facultatif/.test(o.innerHTML));
vm.runInContext('tcClasserContact("' + nouveau.id + '", "famille")', ctx);
verifie('choisir « Ma famille » classe le contact (categories = [famille]) et l enregistre', JSON.stringify(nouveau.categories) === '["famille"]' && sauvegardes.length === 2 && /classé : Ma famille/.test(ctx.toasts[ctx.toasts.length - 1]), ctx.toasts.join('|'));
verifie('« Plus tard » ne classe personne : une fiche ajoutee sans categorie reste en messagerie', !/tcClasserContact\([^)]*personnel/.test(o.innerHTML));

titre('4. Branchements');
verifie('les messages gardent « demandeur » (que le serveur n envoie qu au titulaire)', /demandeur: \(t\.demandeur && typeof t\.demandeur === 'object'\) \? t\.demandeur : null/.test(page));
verifie('openConversation passe la reference de la conversation au cadre', /tcCadreDemandeRdv\(demandeRdv, msg\.with, msg\.reference\)/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
