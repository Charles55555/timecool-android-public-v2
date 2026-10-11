// Campagne 4 (11/10), mission 4 : Charly et les dates. Date du jour fixee : dimanche 11 octobre 2026, 14h20.
//  - une date relative (« mardi », « demain », « dans 2 jours », « mercredi prochain », « lundi 19 ») se resout sur le
//    calendrier, jamais dans le passe ; une date-heure passee → refus calme + proposition ;
//  - le titre vient de la demande (« Coach », « Plombier », « Dentiste »), « Activité » seulement si rien ;
//  - Charly recoit la date et l'heure exactes et le calendrier des 14 prochains jours.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
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
const NOW = new Date(2026, 9, 11, 14, 20, 0);   // dimanche 11 octobre 2026, 14h20
const ctx = { console, Number, String, Date, RegExp, Array };
vm.createContext(ctx);
['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcHeureDansTexte', 'tcDateEnLettres', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcContexteDatePourIA', 'tcBlocAgendaDepuisAnnonce', 'tcCorrigerPropositionsCharly']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
const date = (txt) => { const r = ctx.tcDateDemandee(txt, NOW); return r ? (r.invalide ? 'invalide' : ctx.tcISO(r.date)) : null; };

titre('1. Les six phrases des Testeurs : la date demandee, calculee par la page');
verifie('« rdv dentiste mardi 15h » → mardi 13 octobre (pas le 15)', date('rdv dentiste mardi 15h') === '2026-10-13', date('rdv dentiste mardi 15h'));
verifie('« rendez-vous chez le notaire lundi 19 à 11h » → lundi 19 octobre (a venir, pas « passe »)', date('rendez-vous chez le notaire lundi 19 à 11h') === '2026-10-19', date('rendez-vous chez le notaire lundi 19 à 11h'));
verifie('« rdv ds 2 jours a 8h » → mardi 13 (pas aujourd hui)', date('rdv ds 2 jours a 8h') === '2026-10-13', date('rdv ds 2 jours a 8h'));
verifie('« mercredi prochain 10h30 coach » → mercredi 14 (pas dimanche 11)', date('mercredi prochain 10h30 coach') === '2026-10-14', date('mercredi prochain 10h30 coach'));
verifie('« rdv aujourd hui 10h avec le plombier » → aujourd hui (l heure passee est traitee plus bas)', date('rdv aujourd hui 10h avec le plombier') === '2026-10-11', date('rdv aujourd hui 10h avec le plombier'));
verifie('« Pourriez-vous m’ajouter un rendez-vous chez le notaire lundi 19 à 11h, je vous prie ? » → le 19', date('Pourriez-vous m’ajouter un rendez-vous chez le notaire lundi 19 à 11h, je vous prie ?') === '2026-10-19');

titre('2. Les autres formes');
verifie('« demain 9h30 » → lundi 12', date('demain 9h30 réunion avec Paul 45 min') === '2026-10-12');
verifie('« après-demain » → mardi 13', date('après-demain 10h') === '2026-10-13');
verifie('« dimanche 16h » (aujourd hui est dimanche) → aujourd hui', date('dimanche 16h') === '2026-10-11');
verifie('« dimanche prochain » → dans 7 jours', date('dimanche prochain 16h') === '2026-10-18');
verifie('« samedi matin » → samedi 17', date('rdv de 2h samedi matin avec Estelle en visio') === '2026-10-17');
verifie('« dans 1 semaine » → dimanche 18', date('dans 1 semaine 10h') === '2026-10-18');
verifie('« le 25 décembre à 20h » → 2026-12-25', date('rdv le 25 décembre à 20h') === '2026-12-25');
verifie('« le 31 février » → date inexistante', date('rdv le 31 février à 10h') === 'invalide');
verifie('« le 5 octobre » (passe ce mois-ci) → l an prochain', date('rdv le 5 octobre à 10h') === '2027-10-05');
verifie('« 19/10 » → le 19', date('rdv le 19/10 à 11h') === '2026-10-19');
verifie('« le 19 » seul → le 19', date('rdv le 19 à 11h') === '2026-10-19');
verifie('« mardi 15h » : 15 est une heure, pas un numero de jour', date('mardi 15h') === '2026-10-13');
verifie('« coiffeur mercredi 10h et comptable jeudi 14h45 » : la premiere date (mercredi)', date('mets un rdv coiffeur mercredi 10h et un rdv comptable jeudi 14h45') === '2026-10-14');
verifie('« la semaine prochaine », « rdv », « bonjour » : aucun jour', date('mets moi un rdv la semaine prochaine') === null && date('rdv') === null && date('bonjour') === null);
verifie('« décale » ne contient pas « dec » (decembre)', date('décale mon rdv à 16h') === null);

titre('3. Le titre vient de la demande');
const T = (x) => ctx.tcTitreDepuisDemande(x);
verifie('« rdv dentiste mardi 15h » → Dentiste', T('rdv dentiste mardi 15h') === 'Dentiste', T('rdv dentiste mardi 15h'));
verifie('« mercredi prochain 10h30 coach » → Coach', T('mercredi prochain 10h30 coach') === 'Coach', T('mercredi prochain 10h30 coach'));
verifie('« rdv aujourd hui 10h avec le plombier » → Plombier', T('rdv aujourd hui 10h avec le plombier') === 'Plombier', T('rdv aujourd hui 10h avec le plombier'));
verifie('« rendez-vous chez le notaire lundi 19 à 11h » → Notaire', T('rendez-vous chez le notaire lundi 19 à 11h') === 'Notaire', T('rendez-vous chez le notaire lundi 19 à 11h'));
verifie('« Pourriez-vous m’ajouter un rendez-vous chez le notaire lundi 19 à 11h, je vous prie ? » → Notaire', T('Pourriez-vous m’ajouter un rendez-vous chez le notaire lundi 19 à 11h, je vous prie ?') === 'Notaire', T('Pourriez-vous m’ajouter un rendez-vous chez le notaire lundi 19 à 11h, je vous prie ?'));
verifie('« rdv ds 2 jours a 8h » → rien (la demande ne dit pas quoi)', T('rdv ds 2 jours a 8h') === '', T('rdv ds 2 jours a 8h'));
verifie('« AJOUTE UN RDV COIFFEUR VENDREDI 17H » → COIFFEUR (tel quel)', T('AJOUTE UN RDV COIFFEUR VENDREDI 17H') === 'COIFFEUR', T('AJOUTE UN RDV COIFFEUR VENDREDI 17H'));
verifie('« appel téléphonique avec Paul 14h » → Appel téléphonique Paul (accents gardes)', T('appel téléphonique avec Paul 14h') === 'Appel téléphonique Paul', T('appel téléphonique avec Paul 14h'));

titre('4. Ce que recoit Charly : date, heure, calendrier des 14 jours, regles');
const c = ctx.tcContexteDatePourIA(NOW);
verifie('la date d aujourd hui en toutes lettres avec le jour de la semaine, et l ISO', /Aujourd’hui : dimanche 11 octobre 2026 \(2026-10-11\)/.test(c));
verifie('l heure exacte', /Heure actuelle : 14h20/.test(c));
const lignes = c.split('\n').filter((l) => /^- (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d+ \w+ 2026 → 2026-\d\d-\d\d/.test(l));
verifie('14 lignes jour → date, de demain (lundi 12) a dimanche 25', lignes.length === 14 && /^- lundi 12 octobre 2026 → 2026-10-12 \(demain\)/.test(lignes[0]) && /^- dimanche 25 octobre 2026 → 2026-10-25$/.test(lignes[13]), lignes[0] + ' … ' + lignes[13]);
verifie('mardi 13, mercredi 14, lundi 19 y sont', /- mardi 13 octobre 2026 → 2026-10-13/.test(c) && /- mercredi 14 octobre 2026 → 2026-10-14/.test(c) && /- lundi 19 octobre 2026 → 2026-10-19/.test(c));
verifie('regles : lire la table, jamais de date passee, heure passee → dire et proposer, titre = mot-cle', /JAMAIS de tête/.test(c) && /n’est JAMAIS passée/.test(c) && /heure déjà passée aujourd’hui \(avant 14h20\)/.test(c) && /"Coach"/.test(c) && /"Activité" seulement/.test(c));
verifie('le format [AGENDA] est toujours impose', /\[AGENDA\]\n2026-10-12 \| 15:00-16:00 \| Rendez-vous banque \| administratif\n\[\/AGENDA\]/.test(c));
verifie('les deux appels (conversation, fichier) utilisent ce contexte (variable dateContext conservee)', (page.match(/const dateContext = tcContexteDatePourIA\(new Date\(\)\);/g) || []).length === 2 && (page.match(/volatil: dateContext/g) || []).length === 2);
verifie('plus aucun calcul de date a la main dans ces deux appels', !/const tomorrow = new Date\(now\); tomorrow\.setDate/.test(page));

titre('5. « Je vais ajouter » sans bloc : le bloc de secours suit la demande');
const B = (u, ch) => ctx.tcBlocAgendaDepuisAnnonce(u, ch || 'Parfait, je vais ajouter ça.', NOW, 1);
verifie('« rdv ds 2 jours a 8h » → 2026-10-13 08:00-09:00, Activité (rien d autre dans la demande)', B('rdv ds 2 jours a 8h') === '\n[AGENDA]\n2026-10-13 | 08:00-09:00 | Activité | rdv\n[/AGENDA]', B('rdv ds 2 jours a 8h'));
verifie('« mercredi prochain 10h30 coach » → 2026-10-14 10:30-11:30, Coach', B('mercredi prochain 10h30 coach') === '\n[AGENDA]\n2026-10-14 | 10:30-11:30 | Coach | rdv\n[/AGENDA]', B('mercredi prochain 10h30 coach'));
verifie('« rdv aujourd hui 10h avec le plombier » → aujourd hui 10:00, Plombier (le filet traite l heure passee)', B('rdv aujourd hui 10h avec le plombier') === '\n[AGENDA]\n2026-10-11 | 10:00-11:00 | Plombier | rdv\n[/AGENDA]', B('rdv aujourd hui 10h avec le plombier'));
verifie('sans jour dans la demande : aujourd hui (comme avant)', /2026-10-11 \| 16:00-17:00/.test(B('un truc a 16h')));
verifie('sans heure : rien', B('rdv demain coach') === '');
verifie('date inexistante : rien', B('rdv le 31 février à 10h') === '');
verifie('le titre devine sur la question de Charly reste (enfants, medicaments…)', /Chercher les enfants/.test(B('a 16h30', 'À quelle heure vas-tu chercher les enfants ?')));
verifie('« tous les jours » : 7 lignes a partir de la date demandee', ctx.tcBlocAgendaDepuisAnnonce('tous les jours a 8h a partir de demain', '', NOW, 7).split('\n').filter((l) => /^2026-/.test(l)).length === 7 && /2026-10-12 \| 08:00/.test(ctx.tcBlocAgendaDepuisAnnonce('tous les jours a 8h a partir de demain', '', NOW, 7)));
verifie('charlySendMessage passe par cette fonction', /reply = reply \+ tcBlocAgendaDepuisAnnonce\(lastUserText, lastCharly, new Date\(\), isAllDaysUser \? 7 : 1\);/.test(fonction(page, 'charlySendMessage') || ''));

titre('6. Le filet sur une proposition : la date de la demande, jamais dans le passe, le titre');
const C = (r, u) => ctx.tcCorrigerPropositionsCharly(r, u, NOW);
const r1 = C('Le mardi 15 octobre à 15h, c’est noté.\n[AGENDA]\n2026-10-15 | 15:00-16:00 | Dentiste | sante\n[/AGENDA]', 'rdv dentiste mardi 15h');
verifie('« mardi » propose au 15 → ramene au mardi 13', /\[AGENDA\]\n2026-10-13 \| 15:00-16:00 \| Dentiste \| sante\n\[\/AGENDA\]/.test(r1), r1);
const r2 = C('C’est fait.\n[AGENDA]\n2026-10-12 | 11:00-12:00 | Activité | rdv\n[/AGENDA]', 'rendez-vous chez le notaire lundi 19 à 11h');
verifie('« lundi 19 » propose au 12 → le 19, et « Activité » devient Notaire', /2026-10-19 \| 11:00-12:00 \| Notaire \| rdv/.test(r2), r2);
const r3 = C('C’est fait.\n[AGENDA]\n2026-10-11 | 10:00-11:00 | Activité | rdv\n[/AGENDA]', 'rdv aujourd hui 10h avec le plombier');
verifie('aujourd hui 10h a 14h20 → refus calme, proposition demain 10h, Plombier', /Il est 14h20 : 10h aujourd’hui, c’est déjà passé\. Je te propose lundi 12 octobre 2026 à 10h — ça te va \?/.test(r3) && /\[AGENDA\]\n2026-10-12 \| 10:00-11:00 \| Plombier \| rdv\n\[\/AGENDA\]/.test(r3), r3);
const r4 = C('D’accord.\n[AGENDA]\n2026-10-11 | 08:00-09:00 | Activité | rdv\n[/AGENDA]', 'rdv ds 2 jours a 8h');
verifie('« dans 2 jours » propose aujourd hui → mardi 13 (et plus de refus : c est a venir)', /2026-10-13 \| 08:00-09:00 \| Activité \| rdv/.test(r4) && !/déjà passé/.test(r4), r4);
const r5 = C('[AGENDA]\n2026-10-11 | 10:30-11:30 | Activité | rdv\n[/AGENDA]', 'mercredi prochain 10h30 coach');
verifie('« mercredi prochain » propose dimanche → mercredi 14, Coach', /2026-10-14 \| 10:30-11:30 \| Coach \| rdv/.test(r5), r5);
const bon = 'Massage mercredi 14 octobre à 14h, c’est noté.\n[AGENDA]\n2026-10-14 | 14:00-15:00 | Massage | personnel\n[/AGENDA]';
verifie('une proposition juste n est pas touchee (meme texte)', C(bon, 'Réserve moi mercredi 14h pour un massage') === bon);
const deux = '[AGENDA]\n2026-10-14 | 10:00-11:00 | Coiffeur | personnel\n2026-10-15 | 14:45-15:45 | Comptable | travail\n[/AGENDA]';
verifie('deux lignes : rien n est touche', C(deux, 'mets un rdv coiffeur mercredi 10h et un rdv comptable jeudi 14h45') === deux);
const depl = '[AGENDA]\n2026-10-13 | 16:00-17:00 | Rdv banque | travail\n[/AGENDA]';
verifie('un deplacement (« décale ») : rien n est touche', C(depl, 'Décale mon rdv de mardi à 16h') === depl);
verifie('sans bloc : rien n est touche', C('Quel jour exactement ?', 'prends un rendé vous mardy') === 'Quel jour exactement ?');
verifie('la categorie et le lieu (champs suivants) sont conserves', /2026-10-13 \| 15:00-16:00 \| Dentiste \| sante \| 12 rue Pasteur/.test(C('[AGENDA]\n2026-10-15 | 15:00-16:00 | Dentiste | sante | 12 rue Pasteur\n[/AGENDA]', 'rdv dentiste mardi 15h')));
verifie('charlySendMessage applique le filet a chaque reponse', /reply = tcCorrigerPropositionsCharly\(reply, text, new Date\(\)\);/.test(fonction(page, 'charlySendMessage') || ''));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
