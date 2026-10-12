// Mission 17 (Charles, 12/10) : Charly ne relance jamais un sujet de lui-meme ; il rappelle « Reste a voir : … » ;
// « on reprend » est traite par la page. Scenario de la capture du compte 53 : question de Charly (sport) → document hors
// sujet → « Désolé c est une erreur de ma part » → la reponse ne repose pas la question mais finit par « Reste à voir : … » ;
// puis « on reprend » → « On reprend : ton sport régulier. Quel(s) jour(s)… ? ».
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 260) : '')); }
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
const NOW = new Date(2026, 9, 11, 14, 20, 0);
const ctx = { console, String, Array, RegExp, Number, Date, JSON, charlyIA: { history: [] } };
vm.createContext(ctx);
['const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcDateEnLettres', 'tcContexteDatePourIA', 'tcTitreDuBloc', 'tcEstHorsSujet', 'tcEstUneReprise', 'tcDerniereQuestion', 'tcLibelleSujet', 'tcSujetsOuverts', 'tcSansRelance', 'tcAbandonnerAttente']
  .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. Le scenario de la capture (compte 53)');
const question = { role: 'assistant', content: 'Super ! Pour organiser ton agenda, dis-moi : quel(s) jour(s) pratiques-tu ton sport régulier ?' };
const h = [{ role: 'user', content: 'Aide-moi à organiser mon agenda' }, question, { role: 'user', content: '[document joint : facture.pdf]', hidden: true }, { role: 'assistant', content: 'Je ne vois pas de rendez-vous dans ce document.' }, { role: 'user', content: 'Désolé c’est une erreur de ma part' }];
const sujets = ctx.tcSujetsOuverts(h);
verifie('la question de Charly sur le sport, suivie d un fichier puis d un « désolé », est un sujet ouvert : « ton sport régulier »', sujets.length === 1 && sujets[0].libelle === 'ton sport régulier' && /pratiques-tu ton sport régulier \?$/.test(sujets[0].question), JSON.stringify(sujets.map((s) => s.libelle)));
const relance = 'Pas de souci ! On reprend l’organisation de ton agenda : quel(s) jour(s) et à quelle heure pratiques-tu ton sport régulier ?';
const r1 = ctx.tcSansRelance(relance, 'Désolé c’est une erreur de ma part', h);
verifie('la relance du modele est retiree, la reponse finit par « Reste à voir : ton sport régulier. »', r1 === 'Pas de souci !\nReste à voir : ton sport régulier.', r1);
verifie('une reponse sans relance garde sa prose et recoit la ligne', ctx.tcSansRelance('Pas de souci, ça arrive 😊', 'désolé', h) === 'Pas de souci, ça arrive 😊\nReste à voir : ton sport régulier.');
verifie('sans sujet ouvert, rien ne change', ctx.tcSansRelance('Pas de souci !', 'désolé', [{ role: 'user', content: 'bonjour' }, { role: 'assistant', content: 'Bonjour !' }, { role: 'user', content: 'désolé' }]) === 'Pas de souci !');
verifie('« on reprend » est une reprise ; « on continue », « reprenons », « revenons à mon agenda » aussi ; « on reprend le rdv dentiste mardi 15h » (long) non', ctx.tcEstUneReprise('on reprend') && ctx.tcEstUneReprise('On continue !') && ctx.tcEstUneReprise('reprenons') && ctx.tcEstUneReprise('revenons à mon agenda') && !ctx.tcEstUneReprise('on reprend le rdv dentiste mardi 15h à Lyon demain') && !ctx.tcEstUneReprise('rdv dentiste mardi 15h'));
const csm = fonction(page, 'charlySendMessage') || '';
verifie('charlySendMessage : « on reprend » → la page repond « On reprend : <sujet>. <question> » sans le modele, et marque le sujet repris', /if \(tcEstUneReprise\(text\)\) \{\s+const sujets = tcSujetsOuverts\(charlyIA\.history\);\s+if \(sujets\.length\) \{[\s\S]*?dernier\.msg\._repris = true;[\s\S]*?content: 'On reprend : ' \+ dernier\.libelle \+ '\.' \+ \(dernier\.question \? ' ' \+ dernier\.question : ''\)[\s\S]*?return;/.test(csm));
question._repris = true;
verifie('une fois repris, le sujet n est plus ouvert (plus de « Reste à voir »)', ctx.tcSujetsOuverts(h).length === 0 && ctx.tcSansRelance('Quel(s) jour(s) ?', 'lundi', h) === 'Quel(s) jour(s) ?');
delete question._repris;
verifie('une reponse qui n est pas hors sujet ferme la question (pas un sujet ouvert)', ctx.tcSujetsOuverts([question, { role: 'user', content: 'le lundi et le jeudi' }]).length === 0);

titre('2. Les propositions abandonnees (mission 13) apparaissent dans « Reste à voir », jamais relancees');
ctx.charlyIA.history = [];
const prop = { role: 'assistant', content: 'C’est noté.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]', tempId: 't1' };
ctx.tcAbandonnerAttente('proposition', prop);
verifie('tcAbandonnerAttente marque la proposition comme sujet ouvert « la proposition « Rendez-vous dentiste » »', prop._sujetOuvert === 'la proposition « Rendez-vous dentiste »' && /J’ai laissé tomber la proposition précédente/.test(ctx.charlyIA.history[0].content));
const h2 = [{ role: 'user', content: 'rdv dentiste mardi 15h' }, prop, { role: 'user', content: 'annule le coach' }];
verifie('elle est un sujet ouvert, sans question', JSON.stringify(ctx.tcSujetsOuverts(h2).map((s) => s.libelle)) === JSON.stringify(['la proposition « Rendez-vous dentiste »']));
const r2 = ctx.tcSansRelance('Le coach est annulé. Tu veux que je reprenne le rendez-vous chez le dentiste mardi à 15h ?', 'annule le coach', h2);
verifie('la relance de la proposition par le modele est retiree, la ligne « Reste à voir » la cite', r2 === 'Le coach est annulé.\nReste à voir : la proposition « Rendez-vous dentiste ».', r2);
verifie('charlySendMessage passe la proposition abandonnee a tcAbandonnerAttente', /tcAbandonnerAttente\(conflit \? 'ajout' : 'proposition', conflit \? conflit\.conflictData\.msg : proposition\);/.test(csm));

titre('3. Le modele est prevenu, et le filtre est applique a chaque reponse');
verifie('le contexte envoye au modele porte la regle (ne relance jamais, seul l utilisateur reprend)', /tu ne relances JAMAIS un sujet précédent de toi-même/.test(ctx.tcContexteDatePourIA(NOW)) && /Seul l’utilisateur reprend/.test(ctx.tcContexteDatePourIA(NOW)));
verifie('charlySendMessage applique tcSansRelance en dernier', /reply = tcSansFormulesFaites\(reply\);\n(\s*\/\/[^\n]*\n)*\s+reply = tcSansRelance\(reply, text, charlyIA\.history\);/.test(csm));
verifie('un bloc [AGENDA] dans la reponse est conserve tel quel', /\[AGENDA\]\n2026-10-13 \| 11:00-12:00 \| X \| rdv\n\[\/AGENDA\]/.test(ctx.tcSansRelance('Voici.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]', 'rdv X mardi 11h', h)));
verifie('« Désolé », « erreur de ma part », « oups », « pardon » sont hors sujet ; « le lundi » non', ctx.tcEstHorsSujet('Désolé c’est une erreur de ma part') && ctx.tcEstHorsSujet('oups') && ctx.tcEstHorsSujet('pardon, mauvais message') && !ctx.tcEstHorsSujet('le lundi et le jeudi'));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
