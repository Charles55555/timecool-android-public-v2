// Mission 19 (Charles, 12/10, campagne 10) : (a) « quand suis-je libre vendredi ? » limite au jour ; (b) toute suppression
// demande oui/non ; (c) la nature d une demande ne depend pas du message d avant (creation simple proposee par la page,
// mot inconnu → « je ne trouve pas ») ; (d) pas de phrase en double. Horloge : dimanche 11/10/2026 14h20.
// Usage : node verif-charly-campagne10.js <index.html>
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
const FIXE = new Date(2026, 9, 11, 14, 20, 0);
class DateFixe extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXE.getTime()); } static now() { return FIXE.getTime(); } }
const NOW = new DateFixe();

function contexte() {
  const ctx = {
    console, Date: DateFixe, Math, JSON, Number, String, Set, Array, RegExp, Object, Promise, parseInt,
    setTimeout: (f) => { if (f) f(); return 0; }, mode: 'user', currentPage: 'chat',
    charlyIA: { history: [] }, events: [], contactsList: [],
    tcPousserMessageUtilisateur: (t) => ctx.charlyIA.history.push({ role: 'user', content: t }),
    tcDefinirStatutCharly() {}, renderCharlyChat() {}, render() {}, showToast() {},
    saveEventsToStorage() {}, addDemarche() {}, tcDernierMessageCharly: () => null,
    tcMinutesDeHeure: () => 0, tcSansTempsProtege: (x) => x,
    tcFormaterDateHumaine: (d) => d, tcFormaterHeure: (e) => e.startH + 'h', escapeHTMLSafe: (x) => String(x)
  };
  vm.createContext(ctx);
  ['const TC_JOURS_SEMAINE = [^;]*;', 'const TC_MOIS = [^;]*;', 'const TC_JOURS_FR = [^;]*;', 'const TC_MOIS_FR = [^;]*;', 'const TC_VERBES_DE_DEMANDE = \\[[^\\]]*\\];']
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  ['tcSansAccents', 'tcISO', 'tcDateEnLettres', 'tcHeureDansTexte', 'tcReponseOuiNon', 'tcMotsDeRdv', 'tcTitreContient', 'tcMotDeLAgenda',
   'tcJoursDansTexte', 'tcBorneDeFin', 'tcJoursNommes', 'tcPhraseNonCompris', 'tcPeriodeAgenda', 'tcPeriodeContrainte', 'tcPeriodeCoherente', 'tcPeriodeJourNomme',
   'parseFrenchDateFromText', 'tcComparerEvenements', 'tcDateDemandee', 'tcTitreDepuisDemande', 'tcVerbeConjugue', 'tcEstDeplacement',
   'tcJoursCites', 'tcTitreContient', 'tcEvenementCouvre', 'tcEvenementFin',
   'detecterConsultationAgenda', 'detecterDemandeCreneau', 'tcCreationLocale',
   'tcGererSuppressionRdv', 'tcConfirmerSuppressionRdv', 'tcSupprimerRdvs', 'tcAnnulerSuppressionRdv', 'tcMemoriserSuppression', 'tcRdvDesigne', 'tcRdvRemplace']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('let _tcSuppressionEnAttente = null; let _tcSuppressionChoix = null; globalThis.attente = () => _tcSuppressionEnAttente; globalThis.choix = () => _tcSuppressionChoix;', ctx);
  return ctx;
}
const ctx = contexte();
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

// L agenda de la campagne 10 : mardi 13 = banque 10h, Formation 15-17h, Dr. Martin 16-17h ; jeudi 15 = Appel fournisseur 9h ; vendredi 16 = Revue budget 14-16h.
const agenda = () => [
  { id: 'b', mode: 'user', date: '2026-10-13', startH: 10, startM: 0, endH: 11, endM: 0, title: 'Rdv banque' },
  { id: 'f', mode: 'user', date: '2026-10-13', startH: 15, startM: 0, endH: 17, endM: 0, title: 'Formation' },
  { id: 'm', mode: 'user', date: '2026-10-13', startH: 16, startM: 0, endH: 17, endM: 0, title: 'Rendez-vous Dr. Martin' },
  { id: 'a', mode: 'user', date: '2026-10-15', startH: 9, startM: 0, endH: 9, endM: 30, title: 'Appel fournisseur' },
  { id: 'r', mode: 'user', date: '2026-10-16', startH: 14, startM: 0, endH: 16, endM: 0, title: 'Revue budget' },
  // Aujourd hui (dimanche 11, il est 14h20) : un rendez-vous ce matin, un ce soir (examen de la mission 19).
  { id: 'mt', mode: 'user', date: '2026-10-11', startH: 9, startM: 0, endH: 10, endM: 0, title: 'Marché' },
  { id: 'ci', mode: 'user', date: '2026-10-11', startH: 20, startM: 0, endH: 22, endM: 0, title: 'Ciné' }
];
const N = agenda().length;

(async () => {
  titre('(a) « Quand suis-je libre vendredi ? » : le jour demandé, rien d autre');
  const dc = ctx.detecterDemandeCreneau('quand suis-je libre vendredi ?');
  verifie('la demande est reconnue, avec la période « vendredi 16 octobre »', !!(dc && dc.periode && dc.periode.debut) && ctx.tcISO(dc.periode.debut) === '2026-10-16', JSON.stringify(dc));
  const dm = ctx.detecterDemandeCreneau('quand suis-je libre mardi ?');
  verifie('« mardi » aussi (campagne 9 : la liste partait de dimanche)', !!(dm && dm.periode && dm.periode.debut) && ctx.tcISO(dm.periode.debut) === '2026-10-13', JSON.stringify(dm));
  const gdc = fonction(page, 'tcGererDemandeCreneau') || '';
  verifie('tcGererDemandeCreneau borne une période sans fin à son seul jour avant de chercher', /if \(periode && periode\.debut && !periode\.fin\) periode = \{ debut: periode\.debut, fin: periode\.debut/.test(gdc) && gdc.indexOf('fin: periode.debut') < gdc.indexOf('tcCreneauxDisponibles(periode'));

  titre('(c) Une création simple est proposée par la page, quel que soit le message d avant');
  const cas = [
    ['rdv dentiste mardi 15h', '2026-10-13 | 15:00-16:00 | Dentiste | rdv'],
    ['ajoute un déplacement à Lyon jeudi 9h', '2026-10-15 | 09:00-10:00 | Déplacement à Lyon | rdv'],
    ['rdv coach vendredi 15h', '2026-10-16 | 15:00-16:00 | Coach | rdv'],
    ['rdv Dr. Martin mardi 9h', '2026-10-13 | 09:00-10:00 | Dr Martin | rdv']   // le point tombe (tcTitreDepuisDemande, inchange)
  ];
  cas.forEach(([texte, ligne]) => {
    const r = ctx.tcCreationLocale(texte, NOW);
    verifie('« ' + texte + ' » → bloc « ' + ligne + ' » et prose « je te propose ceci »', r.indexOf('[AGENDA]\n' + ligne + '\n[/AGENDA]') > -1 && /je te propose ceci\./.test(r), r);
  });
  ['annule le dentiste', 'décale mon rdv de mardi à 16h', 'quand suis-je libre vendredi ?', 'qu est-ce que j ai mardi ?', 'rdv dentiste mardi', 'je suis malade', 'supprime tout mardi après-midi', 'rdv dentiste tous les mardis 15h', 'rdv dentiste mardi 15h ?',
   // Examen : plage ou duree, deux demandes, phrase longue, reservation → le modele.
   'réunion mardi de 14h à 16h', 'rdv dentiste mardi de 15h à 17h', 'rdv mardi 14h-16h', 'rdv dentiste mardi 15h jusqu’à 17h', 'rdv mardi 15h pendant 2 heures',
   'ajoute dentiste demain à 10h et coach jeudi à 14h', 'rdv mardi 10h puis jeudi 14h',
   'Ajoute un rdv chez le dentiste mardi à 15h, c’est pour mes dents de sagesse et il faut apporter la radio',
   'réserve un restaurant vendredi à 20h', 'réserve une table mardi 20h']
    .forEach((texte) => verifie('« ' + texte + ' » n est pas une création simple (suit son chemin)', ctx.tcCreationLocale(texte, NOW) === '', ctx.tcCreationLocale(texte, NOW)));
  // Examen : un rendez-vous a venir porte deja le mot → deplacement, pas creation (doublon evite).
  ctx.events = agenda().concat([{ id: 'd', mode: 'user', date: '2026-10-16', startH: 11, startM: 0, endH: 12, endM: 0, title: 'Dentiste' }]);
  ['mets le dentiste à jeudi 10h', 'mets mon dentiste jeudi à 10h', 'rdv dentiste jeudi 10h'].forEach((texte) => verifie('« ' + texte + ' » avec un « Dentiste » déjà dans l agenda → rien en local', ctx.tcCreationLocale(texte, NOW) === '', ctx.tcCreationLocale(texte, NOW)));
  verifie('sans « Dentiste » dans l agenda, « rdv dentiste jeudi 10h » est bien créé en local', (ctx.events = agenda(), ctx.tcCreationLocale('rdv dentiste jeudi 10h', NOW).indexOf('2026-10-15 | 10:00-11:00 | Dentiste | rdv') > -1));
  const csm = fonction(page, 'charlySendMessage') || '';
  verifie('charlySendMessage : la création locale passe avant le modèle, puis les mêmes garde-fous (conflit local, formules)', /const _creationLocale = tcCreationLocale\(text, new Date\(\)\);\s+if \(_creationLocale\) \{\s+reply = _creationLocale;\s+\} else if \(charlyIA\.config\.demoMode\) \{/.test(csm) && csm.indexOf('reply = _creationLocale;') < csm.indexOf('reply = tcReponseConflitLocale(reply, text'));

  titre('(c) « annule le dentiste » sans dentiste : « je ne trouve pas », jamais le Dr. Martin');
  const c1 = contexte(); c1.events = agenda();
  await c1.tcGererSuppressionRdv('annule le dentiste');
  const dit1 = c1.charlyIA.history.map((m) => m.content).join(' | ');
  verifie('rien de supprimé, rien en attente, « Je ne trouve pas de rendez-vous « dentiste » »', c1.events.length === N && !c1.attente() && !c1.choix() && /Je ne trouve pas de rendez-vous « dentiste »/.test(dit1), dit1);
  // Examen : un mot de moment ou de choix n est jamais un titre introuvable.
  for (const [texte, attendu] of [['annule mon rdv de ce matin', 'Marché'], ['annule mon prochain rdv', 'Ciné'], ['annule mon dernier rdv', 'Marché'], ['annule le rdv de ce soir', 'Ciné']]) {
    const cx = contexte(); cx.events = agenda();
    await cx.tcGererSuppressionRdv(texte);
    const ditx = cx.charlyIA.history.map((m) => m.content).join(' | ');
    const vises = (cx.attente() || cx.choix() || []).map((e) => e.title);
    verifie('« ' + texte + ' » : jamais « je ne trouve pas », rien de supprimé, « ' + attendu + ' » parmi les rendez-vous visés', !/Je ne trouve pas/.test(ditx) && cx.events.length === N && vises.indexOf(attendu) > -1, ditx + ' / vises : ' + vises.join(', '));
  }

  titre('(b) Toute suppression demande « oui / non » avec la liste');
  const c2 = contexte(); c2.events = agenda();
  await c2.tcGererSuppressionRdv('annule le rendez-vous Dr. Martin');
  const dit2 = c2.charlyIA.history.map((m) => m.content).join(' | ');
  verifie('un seul rendez-vous visé : la ligne et « Tu veux annuler ce rendez-vous ? », rien de supprimé', c2.events.length === N && (c2.attente() || []).length === 1 && c2.attente()[0].id === 'm' && /Tu veux annuler ce rendez-vous \?/.test(dit2) && /Dr\. Martin/.test(dit2), dit2);
  c2.tcConfirmerSuppressionRdv();
  verifie('« oui » → supprimé', c2.events.length === N - 1 && !c2.events.some((e) => e.id === 'm'));
  const c3 = contexte(); c3.events = agenda();
  await c3.tcGererSuppressionRdv('supprime tout mardi après-midi');
  verifie('plusieurs d un coup : la liste (Formation, Dr. Martin) et « oui / non »', (c3.attente() || []).length === 2 && c3.events.length === N, JSON.stringify((c3.attente() || []).map((e) => e.title)));
  c3.tcAnnulerSuppressionRdv();
  verifie('« non » → rien n a été touché', c3.events.length === N && !c3.attente());
  verifie('plus aucune suppression immédiate dans tcGererSuppressionRdv', !/candidats\.length === 1\)\s*\{[\s\S]*?tcSupprimerRdvs\(candidats\)/.test(fonction(page, 'tcGererSuppressionRdv') || ''));

  titre('(d) Pas de phrase en double : « lequel ? » une seule fois');
  const td = fonction(page, 'tcTraiterDeplacement') || '';
  verifie('tcTraiterDeplacement ne pousse pas la question du jour si la réponse affichée est déjà cette question (2 endroits)', (td.match(/if \(String\(msg\.content \|\| ''\)\.trim\(\) !== (q|question)\.trim\(\)\) charlyIA\.history\.push/g) || []).length === 2);
  verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
