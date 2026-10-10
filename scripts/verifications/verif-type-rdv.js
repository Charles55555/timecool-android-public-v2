// LE TYPE D'UN RENDEZ-VOUS (etape 1) : « 📞 Par téléphone » · « 🤝 En personne » · « 🎥 En visio ».
// Valeurs : telephone | physique | visio. Pas de lieu, de lien ni de duree dans cette etape.
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
const route = (debut, fin) => api.slice(api.indexOf(debut), api.indexOf(fin, api.indexOf(debut) + 1));

titre('1. Le serveur, execute sous PHP');
const noms = ['typeRdvValide', 'motTypeRdv', 'motTypeMessage', 'messageDemandeRdv', 'texteSur', 'messagePoser'];
const src = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l API', src.every(Boolean), noms.filter((n, i) => !src[i]).join(','));
if (PHP && src.every(Boolean)) {
  const h = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Db { public static function un(string $s, array $p = []): ?array { return null; } }
$ecritures = [];
function elementsPoser(array $e): void { global $ecritures; foreach ($e as $x) { $ecritures[] = $x; } }
function traduire(string $t, string $a, string $b, int $c): ?string { return null; }
${src.join('\n')}
$res = []; function t(string $n, bool $ok, string $d = ''): void { global $res; $res[] = [$n, $ok, $d]; }
$de = ['id' => 7, 'prenom' => 'Inès', 'nom' => 'T', 'reference' => 'RD', 'langue' => 'fr'];
$vers = ['id' => 1, 'prenom' => 'Charles', 'nom' => 'H', 'reference' => 'RV', 'langue' => 'fr'];

t('typeRdvValide : les trois types passent', typeRdvValide('telephone') === 'telephone' && typeRdvValide('physique') === 'physique' && typeRdvValide('visio') === 'visio');
t('typeRdvValide : tout le reste devient null (inconnu, vide, nombre, tableau, casse)', typeRdvValide('Visio') === null && typeRdvValide('') === null && typeRdvValide(null) === null && typeRdvValide(3) === null && typeRdvValide(['visio']) === null && typeRdvValide('skype') === null);
t('les mots : par téléphone / en personne / en visio, vide si inconnu', motTypeRdv('telephone') === 'par téléphone' && motTypeRdv('physique') === 'en personne' && motTypeRdv('visio') === 'en visio' && motTypeRdv(null) === '' && motTypeRdv('x') === '');
t('motTypeMessage : le mot precede d une espace, ou rien', motTypeMessage('telephone') === ' par téléphone' && motTypeMessage(null) === '');
t('la demande SANS type : le texte d avant, inchange', messageDemandeRdv($de, $vers) === "Salut Charles 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool. Tu me proposes un créneau ? Merci !");
t('la demande par telephone', messageDemandeRdv($de, $vers, 'telephone') === "Salut Charles 👋 Je voudrais prendre rendez-vous avec toi sur TimeCool, par téléphone. Tu me proposes un créneau ? Merci !", messageDemandeRdv($de, $vers, 'telephone'));
t('la demande en personne / en visio', str_contains(messageDemandeRdv($de, $vers, 'physique'), 'sur TimeCool, en personne. Tu me proposes') && str_contains(messageDemandeRdv($de, $vers, 'visio'), 'sur TimeCool, en visio. Tu me proposes'));
$confirmation = static fn(?string $ty) => 'Rendez-vous confirmé' . motTypeMessage($ty) . ' : mardi 13 octobre à 15h00.';
t('la confirmation : « Rendez-vous confirmé par téléphone : mardi 13 octobre à 15h00. »', $confirmation('telephone') === 'Rendez-vous confirmé par téléphone : mardi 13 octobre à 15h00.');
t('la confirmation : « en personne », « en visio », et sans type comme avant', $confirmation('physique') === 'Rendez-vous confirmé en personne : mardi 13 octobre à 15h00.' && $confirmation('visio') === 'Rendez-vous confirmé en visio : mardi 13 octobre à 15h00.' && $confirmation(null) === 'Rendez-vous confirmé : mardi 13 octobre à 15h00.');
// Le type voyage avec la demande, chez les deux
messagePoser($de, $vers, 'Salut', 5, null, 'demande_rdv', null, 'telephone');
$types = [];
foreach ($ecritures as $e) { if ($e['type'] === 'conversation') { $types[$e['compte_id']] = $e['contenu']['thread'][0]['type'] ?? null; } }
t('la ligne du message porte le type (chez le titulaire ET chez le demandeur)', ($types[1] ?? null) === 'telephone' && ($types[7] ?? null) === 'telephone', json_encode($types));
$ecritures = [];
messagePoser($de, $vers, 'Salut', 5, null, 'demande_rdv', null, null);
$sans = true; foreach ($ecritures as $e) { if ($e['type'] === 'conversation' && array_key_exists('type', $e['contenu']['thread'][0])) { $sans = false; } }
t('sans type : aucune cle « type » dans la ligne', $sans);
// Le type de proposer-creneau : le choix du titulaire prime sur celui de la demande
$corps = ['type' => 'visio']; $rdv = ['type' => 'telephone'];
t('proposer-creneau : le type choisi par le titulaire (visio) prime sur celui de la demande (telephone)', (typeRdvValide($corps['type'] ?? null) ?? typeRdvValide($rdv['type'] ?? null)) === 'visio');
$corps = []; t('proposer-creneau : sans choix, le type de la demande', (typeRdvValide($corps['type'] ?? null) ?? typeRdvValide($rdv['type'] ?? null)) === 'telephone');
$corps = ['type' => 'n importe quoi']; $rdv = ['type' => null]; t('proposer-creneau : un type invalide et pas de type de demande : null (rien d invente)', (typeRdvValide($corps['type'] ?? null) ?? typeRdvValide($rdv['type'] ?? null)) === null);
t('groupe : « physique » par defaut', (typeRdvValide(null) ?? 'physique') === 'physique' && (typeRdvValide('visio') ?? 'physique') === 'visio');
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-type-' + process.pid + '.php');
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

titre('2. Le serveur : le type de la demande a l ecriture dans les deux agendas');
const dem = route("case 'POST /rdv/demander':", "case 'POST /rdv/choisir':");
const cho = route("case 'POST /rdv/choisir':", "case 'POST /rdv/groupe/proposer':");
const pro = route("case 'POST /rdv/proposer-creneau':", "case 'POST /rdv/refuser':");
const gp = route("case 'POST /rdv/groupe/proposer':", "case 'POST /rdv/groupe/confirmer':");
const gc = route("case 'POST /rdv/groupe/confirmer':", "case 'POST /messages/envoyer':");
verifie('/rdv/demander : le type du corps est valide, enregistre sur la ligne rdv (INSERT ... type)', /\$typeRdv = typeRdvValide\(Entree::corps\(\)\['type'\] \?\? null\);/.test(dem) && /INSERT INTO rdv \(organisateur_id, invite_compte_id, titre, statut, type\)\s+VALUES \(\?, \?, \?, "attente", \?\)/.test(dem));
verifie('/rdv/demander : une demande reprise recoit le nouveau type', /UPDATE rdv SET type = \? WHERE id = \?/.test(dem));
verifie('/rdv/demander : le texte et la ligne du message portent le type', /messageDemandeRdv\(\$moi, \$cible, \$typeRdv\)/.test(dem) && /identiteDemandeur\(\(int\) \$cible\['id'\], \$moi\), \$typeRdv\)/.test(dem));
verifie('/rdv/choisir : le type de la demande est ecrit dans les DEUX agendas (meme fermeture $entree)', /\$typeRdv = typeRdvValide\(\$rdv\['type'\] \?\? null\);/.test(cho) && /\.\.\.\(\$typeRdv !== null \? \['type' => \$typeRdv\] : \[\]\)/.test(cho) && (cho.match(/\$entree\(/g) || []).length >= 2);
verifie('/rdv/choisir : la confirmation dit le mot (« Rendez-vous confirmé par téléphone : »)', /'Rendez-vous confirmé' \. motTypeMessage\(\$typeRdv\) \. ' : '/.test(cho));
verifie('/rdv/proposer-creneau : le choix du titulaire prime, sinon celui de la demande', /\$typeRdv = typeRdvValide\(\$corps\['type'\] \?\? null\) \?\? typeRdvValide\(\$rdv\['type'\] \?\? null\);/.test(pro));
verifie('/rdv/proposer-creneau : le type est garde sur la ligne rdv, ecrit dans les deux agendas, dit dans la confirmation et rendu', /UPDATE rdv SET type = \? WHERE id = \?/.test(pro) && /\.\.\.\(\$typeRdv !== null \? \['type' => \$typeRdv\] : \[\]\)/.test(pro) && /'Rendez-vous confirmé' \. motTypeMessage\(\$typeRdv\) \. ' : '/.test(pro) && /'type'    => \$typeRdv,/.test(pro));
verifie('/rdv/proposer-creneau : le type est ecrit dans la transaction, avant le commit', pro.indexOf('UPDATE rdv SET type') > pro.indexOf('beginTransaction()') && pro.indexOf('UPDATE rdv SET type') < pro.indexOf('$pdo->commit()'));
verifie('/rdv/groupe/proposer et /confirmer : le type est dans le corps, « physique » par defaut', /\$typeRdv = typeRdvValide\(\$corps\['type'\] \?\? null\) \?\? 'physique';/.test(gp) && /\$typeRdv = typeRdvValide\(\$corps\['type'\] \?\? null\) \?\? 'physique';/.test(gc) && /'type'       => \$typeRdv,/.test(gp));
verifie('/rdv/groupe/confirmer : le type est ecrit dans chaque agenda et dit dans le message', /'id'     => \$uid,\s+'type'   => \$typeRdv,/.test(gc) && /'Rendez-vous confirmé' \. motTypeMessage\(\$typeRdv\) \. ' : '/.test(gc));
const mig = fs.existsSync(path.join(path.dirname(apiChemin), '..', 'sql', '010_type_rendez_vous.sql')) ? fs.readFileSync(path.join(path.dirname(apiChemin), '..', 'sql', '010_type_rendez_vous.sql'), 'utf8') : '';
verifie('migration 010_type_rendez_vous.sql : colonne rdv.type ENUM(telephone, physique, visio) NULL', /ENUM\(''telephone'',''physique'',''visio''\) NULL/.test(mig) && /ALTER TABLE rdv ADD COLUMN type/.test(mig));
verifie('et rejouable sans degat (la colonne n est ajoutee que si elle manque)', /information_schema\.COLUMNS/.test(mig) && /IF\(@existe = 0/.test(mig) && /'DO 0'/.test(mig));

titre('3. Les pastilles et les mots (executes dans la vraie page)');
const ctx = { console, charlyIA: { history: [] }, tcSansAccents: (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '') };
const zone = { innerHTML: '' }, champ = { value: '' };
ctx.document = { getElementById: (id) => (id === 'zT' + 'Zone' ? zone : id === 'zT' ? champ : null) };
vm.createContext(ctx);
vm.runInContext(page.match(/const TC_TYPES_RDV = \[[\s\S]*?\n\];/)[0], ctx);
['tcTypeRdvValide', 'tcIconeType', 'tcTypePastillesHTML', 'tcTypeBlocHTML', 'tcTypePastilleClic', 'tcTypeDansTexte', 'tcTypeDeProposition']
  .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const ev = (s) => vm.runInContext(s, ctx);
verifie('trois types, trois icones : 📞 téléphone, 🤝 en personne, 🎥 visio', ev('TC_TYPES_RDV.map(x => x.id + x.icone).join()') === 'telephone📞,physique🤝,visio🎥' && ev('TC_TYPES_RDV.map(x => x.libelle).join("|")') === 'Par téléphone|En personne|En visio');
verifie('tcTypeRdvValide : trois valeurs, le reste vide', ev('[tcTypeRdvValide("visio"), tcTypeRdvValide("x"), tcTypeRdvValide(undefined), tcTypeRdvValide("")].join("|")') === 'visio||' + '|');
verifie('l icone devant le titre : 📞 / 🤝 / 🎥 ; rendez-vous sans type : rien (aucun titre existant ne change)', ev('[tcIconeType({type:"telephone"}), tcIconeType({type:"physique"}), tcIconeType({type:"visio"}), tcIconeType({}), tcIconeType(null), tcIconeType({type:"autre"})].join("|")') === '📞 |🤝 |🎥 |||');
const pastilles = ev('tcTypePastillesHTML("visio", (id) => "choisir(\'" + id + "\')")');
verifie('trois pastilles en ligne, celle choisie est « enfoncée »', (pastilles.match(/<button/g) || []).length === 3 && /aria-pressed="true"[^>]*>🎥 En visio/.test(pastilles) && (pastilles.match(/aria-pressed="false"/g) || []).length === 2);
verifie('chaque pastille appelle la fonction avec son type', /choisir\('telephone'\)/.test(pastilles) && /choisir\('physique'\)/.test(pastilles) && /choisir\('visio'\)/.test(pastilles));
const bloc = ev('tcTypeBlocHTML("zT", "")');
verifie('un formulaire neuf ou ancien sans type : « En personne » est montre comme pre-selection', /aria-pressed="true"[^>]*>🤝 En personne/.test(bloc));
verifie('mais la valeur ecrite reste vide tant qu on n a rien touche (un vieux rendez-vous ne gagne pas de type)', /<input type="hidden" id="zT" value="">/.test(bloc) && /<input type="hidden" id="zT" value="visio">/.test(ev('tcTypeBlocHTML("zT", "visio")')));
ev('tcTypePastilleClic("zT", "telephone")');
verifie('un clic : la valeur est posee et les pastilles redessinees', champ.value === 'telephone' && /aria-pressed="true"[^>]*>📞 Par téléphone/.test(zone.innerHTML));
ev('tcTypePastilleClic("zT", "n importe quoi")');
verifie('un type inconnu ne se pose pas', champ.value === '');
const dit = (t) => ev('tcTypeDansTexte(' + JSON.stringify(t) + ')');
[['appelle-moi demain à 10h', 'telephone'], ['Appelle moi lundi', 'telephone'], ['un rendez-vous par téléphone avec Marie', 'telephone'], ['on se parle au téléphone', 'telephone'], ['un coup de fil à Michel', 'telephone'],
  ['rendez-vous en visio avec Paul', 'visio'], ['une visioconférence mardi', 'visio'], ['réunion visio à 14h', 'visio'], ['sur Zoom jeudi', 'visio'],
  ['on se voit mardi à 15h', 'physique'], ['rendez-vous chez toi samedi', 'physique'], ['viens chez moi vendredi', 'physique'], ['rendez-vous en personne avec Léa', 'physique'],
  ['dentiste demain à 9h', ''], ['faire les courses', ''], ['rappelle-moi de prendre mes médicaments', '']].forEach(([phrase, attendu]) =>
  verifie('Charly : « ' + phrase + ' » → ' + (attendu || 'aucun type (pas de question, physique par defaut)'), dit(phrase) === attendu, dit(phrase)));
verifie('une proposition qui porte son type l emporte sur les mots de la phrase', ev('tcTypeDeProposition({}, {type: "visio"})') === 'visio');
ctx.msgA = { role: 'assistant' };
ctx.charlyIA.history = [{ role: 'user', content: 'appelle-moi demain à 10h' }, ctx.msgA];
verifie('sinon le type vient de la demande de l utilisateur', ev('tcTypeDeProposition(msgA, {})') === 'telephone');
ctx.charlyIA.history = [{ role: 'user', content: 'dentiste demain' }, ctx.msgA];
verifie('sinon rien : « en personne » par defaut, sans question ni icone', ev('tcTypeDeProposition(msgA, {})') === '');

titre('4. Les trois endroits ou on choisit');
// 4a. La fiche contact
const fait = { zones: [], appels: [] };
const c1 = {
  console, contactsList: [{ id: 'c1', name: 'Jean Dupont', referenceCompte: 'REFJ' }, { id: 'c2', name: 'Sans compte' }], _tcZonesRdv: {}, escapeHTMLSafe: (s) => String(s),
  tcSyncTour() {}, tcPoserZoneRdv: (id, h, rdv) => { fait.zones.push(h); c1._tcZonesRdv[id] = h ? { html: h, rdv } : undefined; },
  TC_BACKEND: { demanderRdv: async (ref, titre, type) => { fait.appels.push([ref, titre, type]); return { mode: 'messagerie', rdv: 1, message: 'ok' }; } },
};
vm.createContext(c1);
vm.runInContext(page.match(/const TC_TYPES_RDV = \[[\s\S]*?\n\];/)[0], c1);
['tcTypeRdvValide', 'tcTypePastillesHTML', 'requestRdvContact'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c1); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
(async () => {
  await vm.runInContext('requestRdvContact("c1")', c1);
  const z = fait.zones[fait.zones.length - 1] || '';
  verifie('fiche contact, « Demander un rendez-vous » : trois pastilles + « Annuler », SANS appeler le serveur', (z.match(/requestRdvContact\('c1','(telephone|physique|visio)'\)/g) || []).length === 3 && /Annuler/.test(z) && fait.appels.length === 0 && /📞 Par téléphone/.test(z) && /🤝 En personne/.test(z) && /🎥 En visio/.test(z));
  await vm.runInContext('requestRdvContact("c1")', c1);
  verifie('« Annuler » (ou un second clic) replie la zone, toujours sans serveur', c1._tcZonesRdv.c1 === undefined && fait.appels.length === 0);
  await vm.runInContext('requestRdvContact("c1", "telephone")', c1);
  verifie('le choix part avec la demande : demanderRdv(reference, rien, « telephone »)', fait.appels.length === 1 && fait.appels[0][0] === 'REFJ' && fait.appels[0][2] === 'telephone', JSON.stringify(fait.appels));
  await vm.runInContext('requestRdvContact("c1", "n importe quoi")', c1);
  verifie('un type invalide ne part pas : on redemande', fait.appels.length === 1);
  verifie('un contact sans compte : le message habituel, pas de pastilles', await (async () => { fait.zones.length = 0; await vm.runInContext('requestRdvContact("c2", "visio")', c1); return /pas encore de compte TimeCool/.test(fait.zones[0] || '') && fait.appels.length === 1; })());

  // 4b. Les appels au serveur
  verifie('TC_BACKEND : le type part dans le corps de /rdv/demander, /rdv/proposer-creneau, /rdv/groupe/proposer et /confirmer, seulement s il est valide',
    (page.match(/if \(tcTypeRdvValide\(type\)\) corps\.type = type;/g) || []).length === 4);
  // 4c. La messagerie : « Proposer un creneau »
  verifie('messagerie : « Proposer un créneau » transmet le type de la demande (message de genre demande_rdv), vide si inconnu', /tcProposerCreneauRdv\(' \+ demande\.rdv \+ ',\\'' \+ tcTypeRdvValide\(demande\.type\) \+ '\\'\)/.test(page) && /type: typeof t\.type === 'string' \? t\.type : ''/.test(page));
  const cr = fonction(page, 'tcProposerCreneauRdv') || '';
  verifie('la fenetre de creneau : les trois pastilles EN HAUT (avant le jour), pre-selection = le type demande, sinon « En personne »', cr.indexOf("tcTypeBlocHTML('tcCrType', tcTypeRdvValide(typeDemande) || 'physique')") > cr.indexOf('Choisis le créneau') && cr.indexOf("tcTypeBlocHTML('tcCrType'") < cr.indexOf('id="tcRdvDate"'));
  verifie('« Confirmer » envoie le type choisi (prioritaire sur celui de la demande)', /proposerCreneauRdv\(rdv, date, heure, duree, \(document\.getElementById\('tcCrType'\) \|\| \{\}\)\.value\)/.test(fonction(page, 'tcEnvoyerCreneauRdv') || ''));
  // 4d. Le formulaire du rendez-vous a la main
  verifie('creation : un bloc « Comment », « En personne » pre-selectionne a chaque ouverture, et le type est ecrit sur l evenement', /id="newEvtComment"/.test(page) && /innerHTML = tcTypeBlocHTML\('newEvtTypeRdv', 'physique'\)/.test(fonction(page, 'openCreateModal') || '') && /tcTypeRdvValide\(\(document\.getElementById\('newEvtTypeRdv'\) \|\| \{\}\)\.value\) \? \{ type: document\.getElementById\('newEvtTypeRdv'\)\.value \} : \{\}/.test(fonction(page, 'saveNewEvent') || ''));
  const edit = fonction(page, 'openEditEventModal') || '';
  verifie('modification : « COMMENT » avec les trois pastilles, pre-rempli avec le type du rendez-vous', /COMMENT<\/div>/.test(edit) && /tcTypeBlocHTML\('editTypeRdv', e\.type\)/.test(edit));
  verifie('modification : seul un type valide s ecrit ; un ancien rendez-vous ouvert pour changer l heure reste sans type', /if \(champType && tcTypeRdvValide\(champType\.value\)\) e\.type = champType\.value;/.test(fonction(page, 'saveEventEdit') || ''));
  verifie('la categorie du formulaire (« Type » : personnel, santé…) n est pas touchee ; le nouveau champ s appelle « Comment »', /<div class="info-label">Type<\/div>\s*<select id="newEvtType"/.test(page) && /<div class="info-label">Comment<\/div>/.test(page));
  // 4e. Les icones
  verifie('vue semaine, vue jour et fiche : l icone du type devant le titre', /week-event-title">\$\{tcIconeType\(e\)\}\$\{escapeHTMLSafe\(e\.title\)\}/.test(page) && /day-event-title">\$\{tcIconeType\(e\)\}\$\{escapeHTMLSafe\(e\.title\)\}/.test(page) && /emTitle'\)\.textContent = tcIconeType\(e\) \+ e\.title;/.test(page));

  titre('5. Charly');
  const rx = page.match(/let m1 = line\.match\((\/[^\n]*\/)\);/);
  verifie('le lecteur des lignes [AGENDA] est la', !!rx);
  const re = rx ? vm.runInContext(rx[1], ctx) : null;
  const ligne = (l) => (re ? l.match(re) : null);
  const l7 = ligne('2026-10-13 | 15:00-15:30 | Appel Michel | travail | - | Michel | telephone');
  verifie('une ligne [AGENDA] a 7 champs : le type est le 11e groupe', !!l7 && l7[7] === 'Appel Michel' && l7[9] === '-' && l7[10] === 'Michel' && l7[11] === 'telephone', l7 && JSON.stringify(l7.slice(7)));
  const l6 = ligne('2026-10-13 | 15:00-16:00 | Dentiste | sante | 12 rue X | Michel');
  verifie('une ancienne ligne a 6 champs se lit comme avant (pas de type)', !!l6 && l6[10] === 'Michel' && !l6[11]);
  const l3 = ligne('2026-10-13 | 15:00-16:00 | Courses');
  verifie('et une ligne de 3 champs aussi', !!l3 && l3[7] === 'Courses' && !l3[11]);
  verifie('la proposition porte le type lu (valide) dans le champ « type »', /type: m1\[11\] \? tcTypeRdvValide\(m1\[11\]\.trim\(\)\.toLowerCase\(\)\) : ''/.test(page));
  verifie('l evenement cree porte le type de la proposition (ou celui de la demande)', /\.\.\.\(tcTypeDeProposition\(msg, p\) \? \{ type: tcTypeDeProposition\(msg, p\) \} : \{\}\),/.test(page));
  const prompt = page.slice(page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT'), page.indexOf('const TC_DEFAULT_SYSTEM_PROMPT') + 40000);
  verifie('le prompt de Charly decrit le 7e champ, les mots reconnus, et « sans precision : pas de question »', /TYPE \(7e champ, facultatif\)/.test(prompt) && /appelle-moi/.test(prompt) && /visioconférence/.test(prompt) && /on se voit/.test(prompt) && /chez toi/.test(prompt) && /NE POSE PAS de question/.test(prompt));
  verifie('les appareils jettent leur ancien prompt (version changee)', /TC_PROMPT_VERSION = 'v11-type-rdv'/.test(page));

  // Rendez-vous entre comptes : la question
  const gc2 = { console, histo: [], rendus: 0, appels: [] };
  const c3 = { console, charlyIA: { history: [] }, appels: [], rendus: 0, tcPousserMessageUtilisateur() {}, renderCharlyChat() { c3.rendus++; }, tcSansAccents: ctx.tcSansAccents,
    tcProposerRdvGroupe: async (refs, duree, preambule, type) => { c3.appels.push([refs.join(), duree, preambule, type]); }, tcBulleCharly: (h) => h };
  vm.createContext(c3);
  vm.runInContext(page.match(/const TC_TYPES_RDV = \[[\s\S]*?\n\];/)[0], c3);
  ['tcTypeRdvValide', 'tcTypeDansTexte', 'tcGererRdvGroupe', 'tcRendreQuestionType', 'tcRepondreTypeGroupe'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c3); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  const intention = { contacts: [{ referenceCompte: 'R1' }, { referenceCompte: 'R2' }], duree: 2 };
  await vm.runInContext('tcGererRdvGroupe("trouve-nous un rdv en visio avec A et B", ' + JSON.stringify(intention) + ')', c3);
  verifie('rendez-vous a plusieurs : le type dit dans la phrase part directement avec la recherche, sans question', c3.appels.length === 1 && c3.appels[0][3] === 'visio' && c3.charlyIA.history.length === 0, JSON.stringify(c3.appels));
  c3.appels.length = 0;
  await vm.runInContext('tcGererRdvGroupe("trouve-nous un rdv avec A et B", ' + JSON.stringify(intention) + ')', c3);
  const q = c3.charlyIA.history[0];
  verifie('sinon UNE question : « Par téléphone, en personne ou en visio ? », rien n est cherche avant la reponse', c3.appels.length === 0 && q && q.content === 'Par téléphone, en personne ou en visio ?' && q._questionType.etat === 'choix');
  const carte = vm.runInContext('tcRendreQuestionType(charlyIA.history[0])', c3);
  verifie('la carte porte trois boutons (📞 🤝 🎥)', (carte.match(/tcRepondreTypeGroupe\('/g) || []).length === 3 && /📞 Par téléphone/.test(carte) && /🎥 En visio/.test(carte));
  await vm.runInContext('tcRepondreTypeGroupe(' + JSON.stringify(q._questionType.id) + ', "telephone")', c3);
  verifie('la reponse lance la recherche avec le type, une seule fois, et la question se ferme', c3.appels.length === 1 && c3.appels[0][3] === 'telephone' && c3.appels[0][0] === 'R1,R2' && c3.appels[0][1] === 2 && q._questionType.etat === 'fait');
  await vm.runInContext('tcRepondreTypeGroupe(' + JSON.stringify(q._questionType.id) + ', "visio")', c3);
  verifie('un second toucher ne relance rien', c3.appels.length === 1);
  verifie('le type suit jusqu au serveur : proposer, confirmer, et la recherche relancee si le creneau est pris', /proposerRdvGroupe\(references, duree, type\)/.test(page) && /confirmerRdvGroupe\(g\.references, s\.date, s\.heure, g\.duree, g\.type\)/.test(page) && /tcProposerRdvGroupe\(g\.references, g\.duree, 'Ce créneau vient d’être pris\. Je relance la recherche :', g\.type\)/.test(page));
  verifie('la carte est dessinee dans la conversation', /if \(m && m\._questionType\) return tcRendreQuestionType\(m\);/.test(page));

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
