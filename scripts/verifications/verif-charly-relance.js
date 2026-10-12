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
['tcSansAccents', 'tcISO', 'tcDateEnLettres', 'tcContexteDatePourIA', 'tcTitreDuBloc', 'tcMotsDuSujet', 'tcEstHorsSujet', 'tcEstUneReprise', 'tcDerniereQuestion', 'tcLibelleSujet', 'tcSujetsOuverts', 'tcSansRelance', 'tcAbandonnerAttente']
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
verifie('le rappel est fait une seule fois : la reponse suivante (« merci ») ne porte plus la ligne, la relance reste retiree', question._rappele === true && ctx.tcSansRelance('Avec plaisir ! Et ton sport régulier, c’est quel jour ?', 'merci', h) === 'Avec plaisir !');
delete question._rappele;
verifie('une reponse sans relance garde sa prose et recoit la ligne (une fois)', ctx.tcSansRelance('Pas de souci, ça arrive 😊', 'désolé', h) === 'Pas de souci, ça arrive 😊\nReste à voir : ton sport régulier.');
delete question._rappele;
verifie('sans sujet ouvert, rien ne change', ctx.tcSansRelance('Pas de souci !', 'désolé', [{ role: 'user', content: 'bonjour' }, { role: 'assistant', content: 'Bonjour !' }, { role: 'user', content: 'désolé' }]) === 'Pas de souci !');
// Defaut 1 de l examen : l utilisateur reprend avec ses mots → rien n est retire, pas de ligne, sujet clos.
const rLui = ctx.tcSansRelance('Super ! Combien de fois par semaine pratiques-tu ton sport régulier ?', 'je fais du sport 3 fois par semaine', h);
verifie('« je fais du sport 3 fois par semaine » : la reponse du modele est gardee entiere, sans « Reste à voir », et le sujet est repris', rLui === 'Super ! Combien de fois par semaine pratiques-tu ton sport régulier ?' && question._repris === true && ctx.tcSujetsOuverts(h).length === 0, rLui);
delete question._repris;
const rEt = ctx.tcSansRelance('Tu fais du sport régulièrement, à quelle fréquence ?', 'et pour le sport ?', h);
verifie('« et pour le sport ? » : idem, la question du modele est gardee', rEt === 'Tu fais du sport régulièrement, à quelle fréquence ?' && question._repris === true, rEt);
delete question._repris;
const q2 = { role: 'assistant', content: 'Tu fais du sport régulièrement ?' };
const h3 = [q2, { role: 'user', content: 'Désolé, erreur de ma part' }];
verifie('sans possessif, le libelle est la question entiere : « Reste à voir : Tu fais du sport régulièrement ? »', ctx.tcSansRelance('Pas de souci.', 'Désolé, erreur de ma part', h3) === 'Pas de souci.\nReste à voir : Tu fais du sport régulièrement ?');
verifie('« on reprend » est une reprise ; « on continue », « reprenons », « continuons », « revenons à mon agenda » aussi ; « on reprend le rdv dentiste mardi 15h… » (long), « continue la recherche de créneaux », « reprends mon rdv de mardi » non', ctx.tcEstUneReprise('on reprend') && ctx.tcEstUneReprise('On continue !') && ctx.tcEstUneReprise('reprenons') && ctx.tcEstUneReprise('continuons') && ctx.tcEstUneReprise('revenons à mon agenda') && !ctx.tcEstUneReprise('on reprend le rdv dentiste mardi 15h à Lyon demain') && !ctx.tcEstUneReprise('rdv dentiste mardi 15h') && !ctx.tcEstUneReprise('continue la recherche de créneaux') && !ctx.tcEstUneReprise('reprends mon rdv de mardi'));
const csm = fonction(page, 'charlySendMessage') || '';
verifie('charlySendMessage : « on reprend » → la page repond « On reprend : <sujet>. <question> » sans le modele, et marque le sujet repris', /if \(tcEstUneReprise\(text\)\) \{\s+const sujets = tcSujetsOuverts\(charlyIA\.history\);\s+if \(sujets\.length\) \{[\s\S]*?dernier\.msg\._repris = true;[\s\S]*?content: 'On reprend : ' \+ dernier\.libelle \+ '\.' \+ \(dernier\.question \? ' ' \+ dernier\.question : ''\)[\s\S]*?return;/.test(csm));
question._repris = true;
verifie('une fois repris, le sujet n est plus ouvert (plus de « Reste à voir »)', ctx.tcSujetsOuverts(h).length === 0 && ctx.tcSansRelance('Quel(s) jour(s) ?', 'lundi', h) === 'Quel(s) jour(s) ?');
delete question._repris;
verifie('une reponse qui n est pas hors sujet ferme la question (pas un sujet ouvert)', ctx.tcSujetsOuverts([question, { role: 'user', content: 'le lundi et le jeudi' }]).length === 0);

titre('2. Les propositions abandonnees (mission 13) ne sont jamais relancees, ni rappelees par « Reste à voir »');
ctx.charlyIA.history = [];
const prop = { role: 'assistant', content: 'C’est noté.\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Rendez-vous dentiste | sante\n[/AGENDA]', tempId: 't1' };
ctx.tcAbandonnerAttente('proposition', prop);
verifie('tcAbandonnerAttente marque la proposition comme sujet ouvert « la proposition « Rendez-vous dentiste » »', prop._sujetOuvert === 'la proposition « Rendez-vous dentiste »' && /J’ai laissé tomber la proposition précédente/.test(ctx.charlyIA.history[0].content));
const h2 = [{ role: 'user', content: 'rdv dentiste mardi 15h' }, prop, { role: 'user', content: 'annule le coach' }];
verifie('elle est un sujet ouvert, sans question', JSON.stringify(ctx.tcSujetsOuverts(h2).map((s) => s.libelle)) === JSON.stringify(['la proposition « Rendez-vous dentiste »']));
const r2 = ctx.tcSansRelance('Le coach est annulé. Tu veux que je reprenne le rendez-vous chez le dentiste mardi à 15h ?', 'annule le coach', h2);
verifie('la relance de la proposition par le modele est retiree, SANS ligne « Reste à voir » (elle a ete abandonnee)', r2 === 'Le coach est annulé.', r2);
verifie('« merci » ensuite : rien n est ajoute', ctx.tcSansRelance('Avec plaisir !', 'merci', h2.concat([{ role: 'assistant', content: 'Le coach est annulé.' }, { role: 'user', content: 'merci' }])) === 'Avec plaisir !');
verifie('charlySendMessage passe la proposition abandonnee a tcAbandonnerAttente', /tcAbandonnerAttente\(conflit \? 'ajout' : 'proposition', conflit \? conflit\.conflictData\.msg : proposition\);/.test(csm));

titre('3. Le modele est prevenu, et le filtre est applique a chaque reponse');
verifie('le contexte envoye au modele porte la regle (ne relance jamais, seul l utilisateur reprend)', /tu ne relances JAMAIS un sujet précédent de toi-même/.test(ctx.tcContexteDatePourIA(NOW)) && /Seul l’utilisateur reprend/.test(ctx.tcContexteDatePourIA(NOW)));
// Mission 34 : tcSansNotesInternes s intercale entre les formules et la relance.
verifie('charlySendMessage applique tcSansRelance en dernier (apres tcSansFormulesFaites et tcSansNotesInternes)', /reply = tcSansFormulesFaites\(reply\);\n\s+reply = tcSansNotesInternes\(reply\);\n(\s*\/\/[^\n]*\n)*\s+reply = tcSansRelance\(reply, text, charlyIA\.history\);/.test(csm));
verifie('un bloc [AGENDA] dans la reponse est conserve tel quel', /\[AGENDA\]\n2026-10-13 \| 11:00-12:00 \| X \| rdv\n\[\/AGENDA\]/.test(ctx.tcSansRelance('Voici.\n[AGENDA]\n2026-10-13 | 11:00-12:00 | X | rdv\n[/AGENDA]', 'rdv X mardi 11h', h)));
verifie('« Désolé », « erreur de ma part », « oups », « pardon » sont hors sujet ; « le lundi » non', ctx.tcEstHorsSujet('Désolé c’est une erreur de ma part') && ctx.tcEstHorsSujet('oups') && ctx.tcEstHorsSujet('pardon, mauvais message') && ctx.tcEstHorsSujet('désolé pour ça') && !ctx.tcEstHorsSujet('le lundi et le jeudi'));
// Defaut 3 de l examen : une excuse suivie d une vraie demande n est pas hors sujet.
verifie('« Désolé du retard, ajoute un rdv dentiste mardi 15h », « pardon, tu peux ajouter un rdv demain ? », « ok désolé je vais y réfléchir » ne sont PAS hors sujet', !ctx.tcEstHorsSujet('Désolé du retard, ajoute un rdv dentiste mardi 15h') && !ctx.tcEstHorsSujet('pardon, tu peux ajouter un rdv demain ?') && !ctx.tcEstHorsSujet('ok désolé je vais y réfléchir') && !ctx.tcEstHorsSujet('désolé, 16h plutôt'));
verifie('« erreur de ma part » et « ignore ce message » le sont meme dans une phrase longue', ctx.tcEstHorsSujet('bon en fait c’était une erreur de ma part, ce document ne te concernait pas') && ctx.tcEstHorsSujet('ignore ce message s’il te plaît'));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
