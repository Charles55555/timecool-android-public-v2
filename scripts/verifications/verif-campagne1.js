// Campagne de tests 1 (prise de rendez-vous), les trois défauts bloquants
// trouvés le 07/10 et corrigés ici :
//  1. double réservation (créneau déjà pris, deux demandeurs, deux choix
//     simultanés) — la règle de libre/occupé est exécutée sous PHP ;
//  2. injection de code par un prénom (XSS stockée) ;
//  3. page publique du lien : « 00h00 » partout.
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const os = require('os');
const path = require('path');

const page = fs.readFileSync(process.argv[2], 'utf8');
const apiChemin = process.argv[3];
const api = fs.readFileSync(apiChemin, 'utf8');
const rdv = fs.readFileSync(path.join(path.dirname(apiChemin), '..', 'web', 'rdv.html'), 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : ''));
}
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

titre('1. La règle « libre ou occupé », exécutée sous PHP');
verifie('un PHP est disponible', !!PHP);
const noms = ['texteSur', 'rdvPlagesParJour', 'rdvOccupation', 'creneauEstLibre', 'creneauRetenuEstLibre', 'dispoPlagesDuJour', 'dispoDuCompte', 'creneauxLibres'];
const sources = noms.map((n) => fonction(api, n));
verifie('les fonctions existent dans l\'API', sources.every(Boolean), noms.filter((n, i) => !sources[i]).join(', '));
if (PHP && sources.every(Boolean)) {
  const harnais = `<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
class Db {
  public static array $lignes = [];
  public static ?array $dispo = null;
  public static function tous(string $sql, array $p = []): array { return self::$lignes; }
  public static function un(string $sql, array $p = []): ?array { return self::$dispo === null ? null : ['contenu' => json_encode(['id' => 'x', 'v' => json_encode(self::$dispo)])]; }
}
${sources.join('\n')}
$res = [];
function t(string $nom, bool $ok, string $detail = ''): void { global $res; $res[] = [$nom, $ok, $detail]; }
$j = static fn(string $s): string => json_encode($s);

// Les plages d'un rendez-vous
$p = rdvPlagesParJour(['date' => '2026-10-12', 'startH' => 9, 'startM' => 0, 'endH' => 10, 'endM' => 30]);
t('un rendez-vous d\\'un jour : une plage', $p === ['2026-10-12' => [[540, 630]]], json_encode($p));
$p = rdvPlagesParJour(['date' => '2026-10-12', 'allDay' => true, 'startH' => 0, 'startM' => 0, 'endH' => 23, 'endM' => 59]);
t('une journée entière occupe tout le jour', $p === ['2026-10-12' => [[0, 1440]]], json_encode($p));
$p = rdvPlagesParJour(['date' => '2026-10-12', 'dateFin' => '2026-10-14', 'startH' => 15, 'startM' => 0, 'endH' => 11, 'endM' => 0]);
t('trois jours : fin du premier, tout le deuxième, début du dernier', $p === ['2026-10-12' => [[900, 1440]], '2026-10-13' => [[0, 1440]], '2026-10-14' => [[0, 660]]], json_encode($p));
$p = rdvPlagesParJour(['date' => '2026-10-24', 'dateFin' => '2026-10-26', 'startH' => 9, 'startM' => 0, 'endH' => 18, 'endM' => 0]);
t('à cheval sur le changement d\\'heure (25 octobre) : trois jours, aucun sauté ni doublé', array_keys($p) === ['2026-10-24', '2026-10-25', '2026-10-26'], json_encode(array_keys($p)));
t('une date illisible n\\'occupe rien', rdvPlagesParJour(['date' => 'demain']) === [] && rdvPlagesParJour([]) === []);
$p = rdvPlagesParJour(['date' => '2026-10-12', 'dateFin' => '2026-10-10', 'startH' => 9, 'startM' => 0, 'endH' => 10, 'endM' => 0]);
t('une fin avant le début est ignorée (un seul jour)', array_keys($p) === ['2026-10-12']);

// Libre ou occupé
$occ = ['2026-10-12' => [[540, 720]]];
t('bord à bord (12h00-13h00 après 9h-12h) : libre', creneauEstLibre($occ, '2026-10-12', 720, 780));
t('bord à bord (8h-9h avant 9h-12h) : libre', creneauEstLibre($occ, '2026-10-12', 480, 540));
t('chevauchement (11h40-12h40) : occupé', !creneauEstLibre($occ, '2026-10-12', 700, 760));
t('une minute de chevauchement : occupé', !creneauEstLibre($occ, '2026-10-12', 539, 541));
t('un autre jour : libre', creneauEstLibre($occ, '2026-10-13', 540, 600));

// Le créneau retenu, relu dans l'agenda du titulaire (ce que /rdv/choisir et /rdv/lien/choix font maintenant)
Db::$lignes = [['contenu' => json_encode(['date' => '2026-10-12', 'startH' => 9, 'startM' => 0, 'endH' => 10, 'endM' => 0, 'title' => 'Dentiste'])]];
t('le titulaire a rempli le créneau 9h entre-temps : refusé', !creneauRetenuEstLibre(1, '2026-10-12 09:00:00', '2026-10-12 10:00:00'));
t('le créneau de 10h, lui, reste libre', creneauRetenuEstLibre(1, '2026-10-12 10:00:00', '2026-10-12 11:00:00'));
Db::$lignes = [['contenu' => json_encode(['date' => '2026-10-12', 'allDay' => true, 'startH' => 0, 'startM' => 0, 'endH' => 23, 'endM' => 59])]];
t('une journée entière posée entre-temps : tout le jour est refusé', !creneauRetenuEstLibre(1, '2026-10-12 14:00:00', '2026-10-12 15:00:00'));
Db::$lignes = [['contenu' => json_encode(['date' => '2026-10-12', 'dateFin' => '2026-10-14', 'startH' => 15, 'startM' => 0, 'endH' => 11, 'endM' => 0])]];
t('un voyage posé entre-temps bloque ses jours intermédiaires', !creneauRetenuEstLibre(1, '2026-10-13 10:00:00', '2026-10-13 11:00:00') && creneauRetenuEstLibre(1, '2026-10-14 14:00:00', '2026-10-14 15:00:00'));

// Les créneaux proposés
$demain = date('Y-m-d', strtotime('+1 day'));
Db::$dispo = ['travail' => [['jours' => [1, 2, 3, 4, 5], 'debut' => '09:00', 'fin' => '18:00']]];   // les plages sont celles de l ecran : plus d horaires par defaut caches
Db::$lignes = [['contenu' => json_encode(['date' => $demain, 'dateFin' => date('Y-m-d', strtotime('+20 day')), 'startH' => 9, 'startM' => 0, 'endH' => 18, 'endM' => 0])]];
t('un rendez-vous de 20 jours bloque toute la fenêtre : aucun créneau proposé', creneauxLibres(1) === [], json_encode(creneauxLibres(1)));
$fin3 = date('Y-m-d', strtotime('+3 day'));
Db::$lignes = [['contenu' => json_encode(['date' => $demain, 'dateFin' => $fin3, 'startH' => 9, 'startM' => 0, 'endH' => 18, 'endM' => 0])]];
$c = creneauxLibres(1, 3, ['travail']);
$apres = array_filter($c, static fn($x) => $x['date'] > $fin3);
t('un voyage jusqu\\'à +3 jours : tous les créneaux proposés sont APRÈS', count($c) === 3 && count($apres) === 3, json_encode(array_column($c, 'date')));
Db::$lignes = [];
$c = creneauxLibres(1, 3, ['travail']);
$dates = array_column($c, 'date');
t('agenda vide : 3 créneaux, jours distincts, triés, jamais le week-end', count($c) === 3 && count(array_unique($dates)) === 3 && $dates === array_values($dates) && array_filter($dates, static fn($d) => in_array((int) date('w', strtotime($d)), [0, 6], true)) === [], json_encode($dates));

// Les noms : sans balise
$t1 = texteSur('<img src=x onerror=window.__pwn=1> Lien');
t('un prénom piégé perd ses balises', strpos($t1, '<') === false && strpos($t1, '>') === false, $t1);
t('les guillemets et les caractères de contrôle partent', texteSur("Jean \\"Le Bref\\"\\x00\\t") === 'Jean Le Bref', texteSur("Jean \\"Le Bref\\"\\x00\\t"));
t('les accents et les apostrophes restent', texteSur("Éloïse d'Ormesson-Çelik") === "Éloïse d'Ormesson-Çelik");
t('un texte vide reste vide', texteSur('<>') === '');
echo json_encode($res);
`;
  const f = path.join(os.tmpdir(), 'verif-campagne1-' + process.pid + '.php');
  fs.writeFileSync(f, harnais);
  const lint = cp.spawnSync(PHP, ['-l', f], { encoding: 'utf8' });
  verifie('le harnais PHP est valide (php -l)', lint.status === 0, (lint.stdout || lint.stderr || '').trim());
  const r = cp.spawnSync(PHP, [f], { encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (e) {}
  let res = null;
  try { res = JSON.parse(r.stdout); } catch (e) {}
  verifie('PHP exécute les fonctions sans erreur (mode strict)', Array.isArray(res), (r.stderr || r.stdout || '').slice(0, 300));
  if (Array.isArray(res)) res.forEach((x) => verifie(x[0], x[1] === true, x[2]));
  const lintApi = cp.spawnSync(PHP, ['-l', apiChemin], { encoding: 'utf8' });
  verifie('php -l : l\'API entière est valide', lintApi.status === 0, (lintApi.stdout || lintApi.stderr || '').trim());
}

titre('1b. Les deux routes relisent l\'agenda sous verrou, et refusent en 409');
const choisir = api.slice(api.indexOf("case 'POST /rdv/choisir':"), api.indexOf("case 'POST /messages/envoyer':"));
verifie('/rdv/choisir : transaction, prise atomique de la demande (UPDATE … AND statut = "attente", rowCount)', /beginTransaction\(\)/.test(choisir) && /UPDATE rdv SET statut = "choisi", repondu_le = NOW\(\)\s+WHERE id = \? AND organisateur_id = \? AND statut = "attente"/.test(choisir) && /rowCount\(\) === 0/.test(choisir));
verifie('/rdv/choisir : le compte du titulaire est verrouillé (FOR UPDATE) puis son agenda relu', /SELECT id FROM comptes WHERE id = \? FOR UPDATE/.test(choisir) && /creneauRetenuEstLibre\(/.test(choisir) && choisir.indexOf('FOR UPDATE') < choisir.indexOf('creneauRetenuEstLibre('));
verifie('/rdv/choisir : créneau pris → rollBack puis 409 « creneau_pris » (la demande reste en attente)', /rollBack\(\);\s*Rep::erreur\(409, 'creneau_pris'/.test(choisir));
verifie('/rdv/choisir : rien n\'est écrit avant les vérifications (elementsPoser après le 409), puis commit', choisir.indexOf("Rep::erreur(409") < choisir.indexOf('elementsPoser(') && choisir.indexOf('elementsPoser(') < choisir.indexOf('$pdo->commit()'));
const lien = api.slice(api.indexOf("case 'POST /rdv/lien/choix':"), api.indexOf("case 'GET /compte':"));
verifie('/rdv/lien/choix : le compte de l\'organisateur est verrouillé et le créneau relu AVANT d\'écrire', /SELECT id FROM comptes WHERE id = \? FOR UPDATE/.test(lien) && lien.indexOf('creneauRetenuEstLibre(') > -1 && lien.indexOf('creneauRetenuEstLibre(') < lien.indexOf('elementsPoser('));
verifie('/rdv/lien/choix : créneau pris → rollBack (le lien n\'est pas consommé) puis 409', /rollBack\(\);\s*Rep::erreur\(409, 'creneau_pris'/.test(lien));
verifie('les titres fabriqués par le serveur passent par texteSur (nom de l\'autre, prénom du destinataire)', (choisir.match(/texteSur\(/g) || []).length >= 2 && /\$qui = texteSur\(/.test(lien));
verifie('les noms sont nettoyés dès l\'inscription (prénom et nom)', /'prenom'\s+=> texteSur\(Entree::requis\('prenom', 100\)\)/.test(api) && /'nom'\s+=> texteSur\(\(string\) Entree::requis\('nom', 100\)\)/.test(api));

titre('2. L\'application : titres échappés, éléments reçus assainis');
const sites = [
  ['semaine', '<div class="week-event-title">${escapeHTMLSafe(e.title)}</div>'],
  ['jour', '<div class="day-event-title">${escapeHTMLSafe(e.title)}</div>'],
  ['journal d\'activité', "${d.icon || '📋'} ${escapeHTMLSafe(d.title)}</div>"],
  ['carte de proposition', '${escapeHTMLSafe(p.title)}${'],
  ['conflit (nouveau)', '<b>${escapeHTMLSafe(c.newProposal.title)}</b>'],
  ['conflit (existant)', '<b>${escapeHTMLSafe(c.existingEvent.title)}</b>'],
  ['rappel', '${escapeHTMLSafe(ev.title)}</div>']
];
sites.forEach(([nom, motif]) => verifie('titre échappé : ' + nom, page.indexOf(motif) > -1));
const ctx = {}; vm.createContext(ctx);
const src = fonction(page, 'tcAssainirRecu');
verifie('tcAssainirRecu existe', !!src);
if (src) {
  vm.runInContext(src, ctx);
  const f = (t, c) => vm.runInContext('tcAssainirRecu(' + JSON.stringify(t) + ', ' + JSON.stringify(c) + ')', ctx);
  const piege = '<img src=x onerror=window.__pwn=1> Lien';
  verifie('rendez-vous reçu : le titre perd ses chevrons, le reste est intact', f('rdv', { id: 'a', title: piege, date: '2026-10-12' }).title === 'img src=x onerror=window.__pwn=1 Lien' && f('rdv', { id: 'a', title: piege, date: '2026-10-12' }).date === '2026-10-12');
  verifie('le lieu et les notes aussi', f('rdv', { title: 'x', lieu: '<b>chez moi</b>', notes: '<i>n</i>' }).lieu === 'bchez moi/b' && f('rdv', { title: 'x', notes: '<i>n</i>' }).notes === 'in/i');
  verifie('conversation (with) et contact (name)', f('conversation', { with: '<script>' }).with === 'script' && f('contact', { name: 'A<b>' }).name === 'Ab');
  verifie('un contenu sain est rendu tel quel (même objet : aucune copie inutile)', (() => { const o = { title: 'Dentiste', date: '2026-10-12' }; ctx.o = o; return vm.runInContext('tcAssainirRecu("rdv", o) === o', ctx); })());
  verifie('un type inconnu ou un contenu vide ne plante pas', f('reglage', { a: '<' }).a === '<' && f('rdv', null) === null);
}
verifie('à l\'arrivée, tout élément reçu est assaini, et l\'empreinte porte sur ce qui est gardé', /const contenuSur = tcAssainirRecu\(type, e\.contenu\);\s+if \(i !== undefined\) liste\[i\] = contenuSur; else liste\.push\(contenuSur\);/.test(page) && /empreintes\[cle\] = tcSyncEmpreinte\(contenuSur\)/.test(page));

titre('3. La page publique du lien affiche les bonnes heures');
const m = rdv.match(/slots: \(d\.creneaux \|\| \[\]\)\.map\((function \(c\) \{[\s\S]*?\n      \})\)/);
verifie('le découpage des créneaux est trouvé dans rdv.html', !!m);
if (m) {
  const conv = vm.runInNewContext('(' + m[1] + ')');
  const a = conv({ rang: 1, debut: '2026-10-09 10:30:00', libelle: null });
  verifie('« 2026-10-09 10:30:00 » → 10h30 (avant : 00h00, les secondes lues comme l\'heure)', a.h === 10 && a.m === 30, JSON.stringify(a));
  verifie('le libellé de secours est « 09/10/2026 » (avant : « 30/10/2026-10-09 »)', a.label === '09/10/2026', a.label);
  const b = conv({ rang: 2, debut: '2026-10-12T14:05:00', libelle: 'lundi 12 octobre' });
  verifie('forme avec T, et libellé du serveur gardé', b.h === 14 && b.m === 5 && b.label === 'lundi 12 octobre', JSON.stringify(b));
}
verifie('la confirmation dit l\'heure retenue', /escapeHTML\(s\.label\) \+ ' à ' \+ \('0' \+ s\.h\)\.slice\(-2\) \+ 'h' \+ \('0' \+ s\.m\)\.slice\(-2\)/.test(rdv));
verifie('créneau pris (409) : on propose les autres, le lien reste valable', /e\.status === 409 && idx >= 0/.test(rdv) && /_currentData\.slots\.splice\(idx, 1\)/.test(rdv) && /renderSlots\(_currentData, 'Ce créneau vient d’être pris/.test(rdv));
verifie('et l\'erreur HTTP porte son code', /err\.status = r\.status; throw err;/.test(rdv));
verifie('renderSlots affiche l\'avertissement, échappé', /function renderSlots\(data, avertissement\)/.test(rdv) && /escapeHTML\(avertissement\)/.test(rdv));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
