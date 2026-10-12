// Mission 31 (Charles, 12/10) : Charly n invente JAMAIS un rendez-vous. « annule le dentiste » sans dentiste → « Je ne
// trouve pas de rendez-vous « dentiste » » quel que soit le chemin (page avant le modele, et reponse du modele filtree) ;
// aucune carte « Proposition d agenda » apres une simple question. Horloge : dimanche 11/10/2026 14h20.
// Usage : node verif-charly-jamais-inventer.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
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
const ctx = { console, String, Array, Object, JSON, Date, contactsList: [{ id: 'c1', name: 'Marc Dupont' }] };
vm.createContext(ctx);
['const TC_MOTS_CREUX = [^;]*;', 'const TC_MOTS_VISEE_CREUX = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
['tcSansAccents', 'tcISO', 'tcEvenementFin', 'tcMotsDeRdv', 'tcTitreContient', 'tcVerbeConjugue', 'tcRdvViseIntrouvable', 'tcSansCarteApresQuestion'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }
// Agenda : Rdv banque mardi 13, Formation mardi 13, Rendez-vous Dr. Martin mardi 13, Coach vendredi 16. Aucun dentiste.
const events = [
  { id: 'b', mode: 'user', date: '2026-10-13', startH: 10, startM: 0, endH: 11, endM: 0, title: 'Rdv banque' },
  { id: 'f', mode: 'user', date: '2026-10-13', startH: 15, startM: 0, endH: 17, endM: 0, title: 'Formation' },
  { id: 'm', mode: 'user', date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0, title: 'Rendez-vous Dr. Martin' },
  { id: 'c', mode: 'user', date: '2026-10-16', startH: 18, startM: 0, endH: 19, endM: 0, title: 'Coach' },
  { id: 'v', mode: 'user', date: '2026-09-20', startH: 9, startM: 0, endH: 10, endM: 0, title: 'Dentiste' }   // passe : ne compte pas
];
const V = (t) => ctx.tcRdvViseIntrouvable(t, NOW, events, 'user');

titre('1. Un rendez-vous nomme qui n existe pas : la page le dit, rien n est fait');
['annule le dentiste', 'peux-tu annuler mon dentiste ?', 'supprime le rendez-vous chez le dentiste', 'décale le dentiste à jeudi', 'reporte mon dentiste', 'annule le dentiste stp'].forEach((t) => verifie('« ' + t + ' » → « Je ne trouve pas de rendez-vous « dentiste » … »', V(t) === 'Je ne trouve pas de rendez-vous « dentiste » dans ton agenda à venir. Rien n’a été changé.', V(t)));
verifie('un dentiste passe (septembre) ne compte pas : toujours introuvable a venir', V('annule le dentiste') !== null);
['annule le coach', 'décale la formation à 16h', 'annule mon rendez-vous banque', 'peux-tu annuler le rdv Dr. Martin ?'].forEach((t) => verifie('« ' + t + ' » : le rendez-vous existe → null (la page ou le modele continue)', V(t) === null, V(t)));
['annule mon rdv de mardi', 'supprime tout mardi après-midi', 'annule mon prochain rdv', 'décale mon rdv de mardi à 16h', 'quand suis-je libre ?', 'rdv dentiste mardi 15h'].forEach((t) => verifie('« ' + t + ' » : rien de nomme (ou pas d annulation) → null', V(t) === null, V(t)));
verifie('« annule Marc » : un contact nomme, traite ailleurs → null', V('annule Marc') === null && V('annule Dupont') === null);
['ajoute un déplacement à Lyon jeudi 9h', 'ajoute un reportage photo samedi 10h', 'mets mon déplacement à Paris vendredi 9h', 'quels sont mes déplacements cette semaine ?', 'rdv décalage horaire avec Tokyo mardi 9h', 'ajoute un rdv avec avancement du projet jeudi 14h', 'note une avancée du chantier lundi 8h'].forEach((t) => verifie('« ' + t + ' » : un NOM (deplacement, reportage, decalage, avancement), pas un verbe → null (la creation passe)', V(t) === null, V(t)));
['déplacez le dentiste à jeudi', 'nous annulons le dentiste', 'annuler le dentiste', 'supprimes le dentiste'].forEach((t) => verifie('« ' + t + ' » : verbe conjugue, fin de mot → refus calme', V(t) !== null && /dentiste/.test(V(t)), V(t)));

titre('2. Aucune carte apres une simple question');
const bloc = '\n[AGENDA]\n2026-10-12 | 08:30-12:00 | Rendez-vous | rdv\n[/AGENDA]';
const Q = (t, r) => ctx.tcSansCarteApresQuestion(r, t);
verifie('« quand suis-je libre lundi matin ? » : le bloc est retire, la prose reste', Q('quand suis-je libre lundi matin ?', 'Lundi matin, tu es libre de 8h30 à 12h.' + bloc) === 'Lundi matin, tu es libre de 8h30 à 12h.');
verifie('« est-ce que j ai quelque chose mardi ? » : idem', Q('est-ce que j ai quelque chose mardi ?', 'Oui : Rdv banque à 10h.' + bloc + '\nDis-moi.') === 'Oui : Rdv banque à 10h.\nDis-moi.');
verifie('« quand suis-je libre » sans « ? » : question quand meme (mot de tete)', Q('quand suis-je libre cette semaine', 'Voici.' + bloc) === 'Voici.');
verifie('« rdv dentiste mardi 15h » (pas une question) : inchange', Q('rdv dentiste mardi 15h', 'Je te propose ceci.' + bloc) === 'Je te propose ceci.' + bloc);
verifie('« peux-tu ajouter un rdv mardi 15h ? » (question AVEC verbe de creation) : la carte reste', Q('peux-tu ajouter un rdv mardi 15h ?', 'Voici :' + bloc) === 'Voici :' + bloc);
verifie('une reponse sans bloc est inchangee', Q('quand suis-je libre ?', 'Mardi de 11h à 15h.') === 'Mardi de 11h à 15h.');
['Peux-tu me mettre un rdv dentiste mardi à 15h ?', 'Peux-tu prendre rdv chez le dentiste mardi 15h ?', 'Je peux avoir un rdv dentiste mardi 15h ?', 'Peux-tu fixer un rdv mardi à 15h ?', 'Tu peux inscrire mon rdv dentiste mardi 15h ?', 'Un dentiste mardi à 15h, ça passe ?', 'Pourrais-tu me caler un dentiste ?'].forEach((t) => verifie('« ' + t + ' » : demande polie (ou jour + heure) → la carte RESTE', Q(t, 'Voici :' + bloc) === 'Voici :' + bloc));
['Y a-t-il quelque chose mardi ?', 'Combien de rendez-vous cette semaine ?', 'Suis-je libre mardi à 15h ?', 'Quels sont mes rendez-vous de mardi ?'].forEach((t) => verifie('« ' + t + ' » : question de consultation (meme avec jour et heure) → pas de carte', Q(t, 'Voici.' + bloc) === 'Voici.'));

titre('3. Les points d entree de charlySendMessage');
const csm = fonction(page, 'charlySendMessage') || '';
verifie('avant le modele : tcRdvNommeIntrouvable OU tcRdvViseIntrouvable → la page repond, rien n est fait', /const introuvable = tcRdvNommeIntrouvable\(text, new Date\(\), events, mode\) \|\| tcRdvViseIntrouvable\(text, new Date\(\), events, mode\);/.test(csm));
verifie('apres le modele : tcSansCarteApresQuestion avant tcCorrigerPropositionsCharly', /reply = tcSansCarteApresQuestion\(reply, text\);\s+\/\/[^\n]*\n\s+reply = tcCorrigerPropositionsCharly\(reply, text, new Date\(\)\);/.test(csm));
verifie('apres le modele : une confirmation d annulation / deplacement d un rendez-vous inexistant est remplacee par « Je ne trouve pas … »', /const invente = tcRdvViseIntrouvable\(text, new Date\(\), events, mode\);\s+if \(invente && \/\(annul\|supprim\|effac\|d\[ée\]plac\|d\[ée\]cal\|report\|repouss\|avanc\|reprogramm\)\/i\.test\(reply\)\) reply = invente;/.test(csm) && csm.indexOf('const invente = ') > csm.indexOf('tcSansRelance(reply, text, charlyIA.history)'));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
