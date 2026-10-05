// Marche arrière : « remets-les », « je me suis trompé » remettent la
// dernière suppression ou le dernier déplacement. Charles, 05/10 : après
// « Je les annule », le modèle répondait « rien n'a été modifié ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ') : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  let debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  if (page.slice(debut - 6, debut) === 'async ') debut -= 6;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

const trace = { saves: 0, toasts: [], demarches: [] };
const ctx = {
  console,
  mode: 'user', currentPage: 'calendar', events: [], charlyIA: { history: [] },
  contactsList: [{ id: 'c1', name: 'Marc Dupont' }],
  renderCharlyChat() {}, render() {}, showToast(t) { trace.toasts.push(t); }, saveEventsToStorage() { trace.saves++; }, addDemarche(d) { trace.demarches.push(d); },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  tcFormaterDateHumaine: (d) => d,
  escapeHTMLSafe: (t) => String(t)
};
vm.createContext(ctx);
vm.runInContext('let _tcMarcheArriere = null; let _tcSuppressionEnAttente = null;', ctx);
['tcSansAccents', 'tcHeureDansTexte', 'tcFormaterHeure', 'tcContactDuRdv', '_tcLigneRdv',
 'tcMemoriserSuppression', 'tcDetecterMarcheArriere', 'tcMarcheArriere', 'tcSupprimerRdvs', 'tcAppliquerDeplacement'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
const ev = (id, title, date, h, hf, extra) => Object.assign({ id: id, title: title, date: date, startH: h, startM: 0, endH: hf, endM: 0, mode: 'user' }, extra || {});
const memoire = () => vm.runInContext('_tcMarcheArriere', ctx);
const dernier = () => ctx.charlyIA.history[ctx.charlyIA.history.length - 1] || { content: '' };
const reinit = () => {
  ctx.events = [ev('golf', 'Partie de golf', '2026-10-09', 14, 16), ev('dentiste', 'Dentiste', '2026-10-06', 15, 16, { contact: 'c1' }), ev('travail', 'Travail', '2026-10-07', 11, 13)];
  ctx.charlyIA.history = [];
  Object.assign(trace, { saves: 0, toasts: [], demarches: [] });
  vm.runInContext('_tcMarcheArriere = null', ctx);
};
const D = (t) => ctx.tcDetecterMarcheArriere(t);

(async () => {
  titre('Reconnaitre la demande');
  reinit(); ctx.tcSupprimerRdvs([ctx.events[0]]);
  verifie('« je me suis trompé, tu peux les remettre ? »', D('Je me suis trompé tu peux les remettre ?'));
  verifie('« remets-les », « remets-le », « annule la suppression », « reviens en arrière »', D('remets-les') && D('Remets-le') && D('annule la suppression') && D('reviens en arrière'));
  verifie('« c\'était une erreur », « je n\'aurais pas dû »', D("c'était une erreur") && D("je n'aurais pas dû"));
  verifie('avec une heure, c est autre chose', !D("je me suis trompé, c'est 16h"));
  verifie('« remets un rdv demain » est une creation', !D('remets un rdv demain'));
  verifie('une longue phrase n est pas une marche arriere', !D('je me suis trompé de jour pour le dentiste, il faut le mettre jeudi et pas mardi'));
  vm.runInContext('_tcMarcheArriere = null', ctx);
  verifie('sans rien a remettre : « je me suis trompé » part au modele…', !D('je me suis trompé') && !D('remets-les'));
  verifie('…mais « annule la suppression » reste explicite', D('annule la suppression'));

  titre('Une suppression simple, puis « remets-le »');
  reinit();
  ctx.tcSupprimerRdvs([ctx.events[0]]);
  verifie('le golf est supprime, et le message dit comment revenir en arriere', ctx.events.length === 2 && /est supprimé\. Pour revenir en arrière, dis-moi « remets-le »/.test(dernier().content), dernier().content);
  verifie('la suppression est en memoire', memoire() && memoire().type === 'suppression' && memoire().rdvs.length === 1 && memoire().rdvs[0].title === 'Partie de golf');
  await ctx.tcMarcheArriere('remets-le');
  verifie('le golf est remis, tel qu il etait', ctx.events.length === 3 && ctx.events.some((e) => e.id === 'golf' && e.date === '2026-10-09' && e.startH === 14));
  verifie('Charly le dit', /C'est fait : « Partie de golf » est remis/.test(dernier().content) && /2026-10-09 14h à 16h/.test(dernier().content), dernier().content);
  verifie('enregistre, trace, memoire videe', trace.saves === 2 && trace.demarches.length === 2 && memoire() === null);
  await ctx.tcMarcheArriere('remets-le');
  verifie('une seconde fois : rien a remettre', /rien à remettre/.test(dernier().content) && ctx.events.length === 3);

  titre('Plusieurs rendez-vous, dont un avec contact');
  reinit();
  ctx.tcSupprimerRdvs([ctx.events[0], ctx.events[1], ctx.events[2]]);
  verifie('les trois sont supprimes : « remets-les »', ctx.events.length === 0 && /3 rendez-vous supprimés\. Pour revenir en arrière, dis-moi « remets-les »/.test(dernier().content));
  await ctx.tcMarcheArriere('je me suis trompé, remets-les');
  verifie('les trois sont remis', ctx.events.length === 3);
  verifie('Charly les liste et rappelle de prevenir Marc que c est maintenu', /3 rendez-vous remis :/.test(dernier().content) && /Dentiste/.test(dernier().content) && /Pense à prévenir Marc Dupont que c'est maintenu/.test(dernier().content), dernier().content);

  titre('Un deplacement, puis « remets-le »');
  reinit();
  const golf = ctx.events[0];
  ctx.tcAppliquerDeplacement([{ ev: golf, p: { date: '2026-10-10', startH: 9, startM: 30, endH: 11, endM: 30 } }]);
  verifie('le golf est deplace, et le message dit comment revenir en arriere', golf.date === '2026-10-10' && golf.startH === 9 && /remets-le/.test(dernier().content), dernier().content);
  verifie('l ancienne place est en memoire', memoire() && memoire().type === 'deplacement' && memoire().rdvs[0].date === '2026-10-09' && memoire().rdvs[0].startH === 14);
  await ctx.tcMarcheArriere('remets-le où il était');
  verifie('le golf est remis a sa place, vendredi 14h-16h', golf.date === '2026-10-09' && golf.startH === 14 && golf.startM === 0 && golf.endH === 16);
  verifie('Charly le dit', /« Partie de golf » est remis à sa place/.test(dernier().content), dernier().content);

  titre('Branche');
  verifie('l annulation d une periode memorise aussi, et le dit', /tcMemoriserSuppression\(touches\);\n  events = events\.filter/.test(extraire('tcPeriodeAnnuler') || '') && /remets-les/.test(extraire('tcPeriodeAnnuler') || ''));
  const envoi = extraire('charlySendMessage') || '';
  const iM = envoi.indexOf('tcDetecterMarcheArriere(text)'), iC = envoi.indexOf('tcChoixPeriode(text)'), iP = envoi.indexOf('tcDetecterPrevenance(text)');
  verifie('dans le chat, avant les choix tapes et avant tout le reste', iM > -1 && iM < iC && iM < iP);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
