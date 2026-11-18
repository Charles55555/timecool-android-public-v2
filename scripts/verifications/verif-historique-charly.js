// La conversation avec Charly survit a une mise a jour.
//
// Elle n'etait enregistree nulle part, et la connexion la vidait expres.
// Charles, 04/10 : « Ne plus vider jamais les echanges avec charly et
// garder les 10 derniers messages ». Mission 101 (16/11, « comme WhatsApp ») : 100 gardes, 10 envoyes au modele.
//
// On execute les vraies fonctions sur un faux stockage, et on verifie
// dans la source que plus rien ne vide la conversation sauf le bouton
// « Recommencer ».
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(l, c, d) {
  if (!c) ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + d : ''));
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
function extraireConst(nom) {
  const debut = page.indexOf('const ' + nom + ' = ');
  if (debut < 0) return null;
  return page.slice(debut, page.indexOf(';\n', debut) + 1);
}

let memoire = {};
const ctx = {
  console, String, Number, Array, Object, JSON,
  charlyIA: { history: [] },
  localStorage: {
    getItem: (k) => (k in memoire ? memoire[k] : null),
    setItem: (k, v) => { memoire[k] = String(v); },
    removeItem: (k) => { delete memoire[k]; }
  }
};
vm.createContext(ctx);
['TC_CHARLY_HISTORIQUE_CLE', 'TC_CHARLY_HISTORIQUE_MAX'].forEach((n) => {
  const src = extraireConst(n);
  // « var » et non « const » : un const execute dans le bac a sable
  // n'apparait pas sur l'objet ctx, et la suite doit lire la cle.
  if (src) vm.runInContext(src.replace('const ', 'var '), ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
// Mission 127 : la clé passe par tcCleHistoriqueCharly (celle de Charly IA, ou la sienne pour Charly Pro IA).
['tcCleHistoriqueCharly', 'tcSauverHistoriqueCharly', 'tcChargerHistoriqueCharly', 'tcEffacerHistoriqueCharly'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Cent messages, pas un de plus, les derniers (mission 101)');
{
  ctx.charlyIA.history = [];
  for (let i = 1; i <= 125; i++) ctx.charlyIA.history.push({ role: i % 2 ? 'user' : 'assistant', content: 'message ' + i });
  ctx.tcSauverHistoriqueCharly();
  const garde = JSON.parse(memoire[ctx.TC_CHARLY_HISTORIQUE_CLE]);
  verifie('cent messages enregistres', garde.length === 100, 'trouve ' + garde.length);
  verifie('ce sont les cent derniers, dans l ordre', garde[0].content === 'message 26' && garde[99].content === 'message 125');
  verifie('la cle n a pas le prefixe tc_ (ni synchronisee ni purgee)', !/^tc_/.test(ctx.TC_CHARLY_HISTORIQUE_CLE), ctx.TC_CHARLY_HISTORIQUE_CLE);
}

titre('Ce qui revient apres une mise a jour');
{
  ctx.charlyIA = { history: [] };           // la page repart a zero
  ctx.tcChargerHistoriqueCharly();
  verifie('la conversation revient', ctx.charlyIA.history.length === 100);
  verifie('avec son contenu', (ctx.charlyIA.history[99] || {}).content === 'message 125');
  verifie('une seule fois : un second chargement ne double rien', (ctx.tcChargerHistoriqueCharly(), ctx.charlyIA.history.length === 100));
  verifie('les messages relus sont marques : ils ne comptent pas dans la limite de la session', ctx.charlyIA.history.every((m) => m._relu === true));
  ctx.tcSauverHistoriqueCharly();
  verifie('la marque ne s enregistre pas', JSON.parse(memoire[ctx.TC_CHARLY_HISTORIQUE_CLE]).every((m) => !('_relu' in m)));
  verifie('la limite de la session ne compte que les messages tapes depuis l ouverture', /filter\(m => m\.role==='user' && !m\._relu\)\.length >= charlyIA\.config\.maxMessages/.test(page));
}

titre('Le modele ne lit que les dix derniers (mission 101)');
{
  const src = extraire('tcHistoriquePourIA');
  const c2 = { String, Array, Math, charlyIA: { history: [] } };
  vm.createContext(c2);
  const cst = extraireConst('TC_CHARLY_MODELE_MAX');
  if (cst) vm.runInContext(cst.replace('const ', 'var '), c2);
  const cfil = extraireConst('TC_CHARLY_FIL_MAX');
  if (cfil) vm.runInContext(cfil.replace('const ', 'var '), c2);
  ['tcEstQuestionCharly', 'tcDebutFilPourIA'].forEach((n) => { const x = extraire(n); if (x) vm.runInContext(x, c2); });
  if (src) vm.runInContext(src, c2);
  for (let i = 1; i <= 100; i++) c2.charlyIA.history.push({ role: i % 2 ? 'user' : 'assistant', content: 'message ' + i });
  c2.charlyIA.history.push({ role: 'assistant', _app: true, content: 'bulle d application' });
  const envoye = src && cst ? c2.tcHistoriquePourIA() : [];
  verifie('dix messages partent au modele', envoye.length === 10, 'trouve ' + envoye.length);
  verifie('ce sont les dix derniers (les bulles d application ne comptent pas)', envoye.length === 10 && envoye[0].content === 'message 91' && envoye[9].content === 'message 100', JSON.stringify(envoye.slice(0, 1)));

  // Examen : la checklist (CAS 2B) pose ses questions une par une ; le fil ne doit jamais être coupé avant la carte finale.
  const fil = [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Salut Charles ! Que puis-je faire pour toi ?' }];
  fil.push({ role: 'user', content: "Voici ce que j'ai dans ma vie quotidienne : Travail, Sport, Courses, Enfants, Lecture, Cuisine. Aide-moi à organiser mon agenda en me posant les questions nécessaires, une par une, pour chaque élément." });
  const qr = [['Quels jours travailles-tu ?', 'Du lundi au vendredi'], ['À quelles heures ?', 'De 9h à 18h'], ['Le sport, quel jour ?', 'Mardi et jeudi'], ['À quelle heure ?', '19h'],
    ['Les courses, plutôt quand ?', 'Samedi matin'], ['Les enfants, à quelle heure les récupères-tu ?', '16h30'], ['La lecture, le soir ? 📚', 'Oui, 22h']];
  qr.forEach(([q, r]) => { fil.push({ role: 'assistant', content: q }); fil.push({ role: 'user', content: r }); });
  c2.charlyIA.history = fil.slice();
  let e2 = c2.tcHistoriquePourIA();
  const txt = (l) => l.map((m) => m.content).join(' | ');
  verifie('checklist en cours, 7 questions-réponses : la checklist part au modèle', /vie quotidienne/.test(txt(e2)), txt(e2).slice(0, 200));
  verifie('et les premières réponses aussi (« Du lundi au vendredi », « De 9h à 18h »)', /Du lundi au vendredi/.test(txt(e2)) && /De 9h à 18h/.test(txt(e2)));
  verifie('ce qui précède la checklist ne part pas', !/Bonjour/.test(txt(e2)) && !/Salut Charles/.test(txt(e2)), txt(e2).slice(0, 120));
  // Une fois la carte posée, le fil est fini : retour aux 10 derniers.
  c2.charlyIA.history = fil.concat([{ role: 'assistant', content: 'Parfait ! 🎉 Voici ton agenda de la semaine !\n[AGENDA]{"title":"Travail"}[/AGENDA]' }]);
  for (let i = 0; i < 6; i++) c2.charlyIA.history.push({ role: 'user', content: 'Merci ' + i }, { role: 'assistant', content: 'Avec plaisir ' + i });
  e2 = c2.tcHistoriquePourIA();
  verifie('après la carte finale : de nouveau les 10 derniers', e2.length === 10 && !/vie quotidienne/.test(txt(e2)), e2.length + ' : ' + txt(e2).slice(0, 120));
  // Un échange de questions ordinaire n'est pas coupé au milieu.
  c2.charlyIA.history = [];
  for (let i = 0; i < 6; i++) c2.charlyIA.history.push({ role: 'user', content: 'Info ' + i }, { role: 'assistant', content: 'Noté ' + i });
  c2.charlyIA.history.push({ role: 'user', content: 'Ajoute un rendez-vous chez le dentiste' }, { role: 'assistant', content: 'Quel jour ?', nature: 'question' }, { role: 'user', content: 'Jeudi' },
    { role: 'assistant', content: 'À quelle heure ?', nature: 'question' }, { role: 'user', content: '15h' }, { role: 'assistant', content: 'Combien de temps ?', nature: 'question' }, { role: 'user', content: '30 minutes' },
    { role: 'assistant', content: 'Un titre ?', nature: 'question' }, { role: 'user', content: 'Contrôle' }, { role: 'assistant', content: 'Et une note ?', nature: 'question' }, { role: 'user', content: 'Non' });
  e2 = c2.tcHistoriquePourIA();
  verifie('questions ordinaires : la demande de départ part avec tout son fil', e2[0].content === 'Ajoute un rendez-vous chez le dentiste' && e2.length === 11, e2.length + ' : ' + txt(e2).slice(0, 120));

  // 2e examen : un « ? » final ne fait pas remonter (« Autre chose ? » à chaque réponse).
  c2.charlyIA.history = [];
  for (let i = 0; i < 50; i++) c2.charlyIA.history.push({ role: 'user', content: 'Ajoute ' + i }, { role: 'assistant', content: 'C est fait. Autre chose ?' });
  e2 = c2.tcHistoriquePourIA();
  verifie('100 réponses qui finissent par « Autre chose ? » : 10 envoyés, pas toute l histoire', e2.length === 10, 'trouve ' + e2.length);
  // Une checklist abandonnée, puis 80 messages sans carte : elle ne rouvre pas tout.
  c2.charlyIA.history = [{ role: 'user', content: "Voici ce que j'ai dans ma vie quotidienne : Travail." }, { role: 'assistant', content: 'Quels jours ?' }];
  for (let i = 0; i < 40; i++) c2.charlyIA.history.push({ role: 'user', content: 'Autre sujet ' + i }, { role: 'assistant', content: 'Réponse ' + i });
  e2 = c2.tcHistoriquePourIA();
  verifie('checklist abandonnée puis 80 messages : 10 envoyés', e2.length === 10 && !/vie quotidienne/.test(txt(e2)), 'trouve ' + e2.length);
  // Plafond dur : une chaîne de 50 questions qui attendent n en envoie jamais plus de 30.
  c2.charlyIA.history = [];
  for (let i = 0; i < 50; i++) c2.charlyIA.history.push({ role: 'assistant', content: 'Question ' + i + ' ?', nature: 'question' }, { role: 'user', content: 'Réponse ' + i });
  e2 = c2.tcHistoriquePourIA();
  verifie('jamais plus de 30 messages, même au milieu d un long fil', e2.length <= 31 && e2.length >= 29, 'trouve ' + e2.length);
  // Pas de remontée dans une session passée (messages relus de l appareil).
  c2.charlyIA.history = [];
  for (let i = 0; i < 10; i++) c2.charlyIA.history.push({ role: 'assistant', content: 'Ancienne question ' + i + ' ?', nature: 'question', _relu: true }, { role: 'user', content: 'Ancienne réponse ' + i, _relu: true });
  for (let i = 0; i < 5; i++) c2.charlyIA.history.push({ role: 'assistant', content: 'Question ' + i + ' ?', nature: 'question' }, { role: 'user', content: 'Réponse ' + i });
  e2 = c2.tcHistoriquePourIA();
  verifie('le fil ne remonte pas dans une session passée', !/Ancienne/.test(txt(e2).split(' | ').slice(1).join(' | ')) && e2.length <= 11, e2.length + ' : ' + txt(e2).slice(0, 120));
}

titre('Une conversation en cours n est pas ecrasee par l enregistrement');
{
  ctx.charlyIA = { history: [{ role: 'assistant', content: 'Bonjour !' }] };
  ctx.tcChargerHistoriqueCharly();
  verifie('si des messages existent deja, on les garde', ctx.charlyIA.history.length === 1 && ctx.charlyIA.history[0].content === 'Bonjour !');
}

titre('Ce qui ne se rejoue pas n est pas enregistre');
{
  const prop = { role: 'assistant', content: '[AGENDA]x[/AGENDA]', tempId: 'p1', _validated: true };
  ctx.charlyIA = { history: [prop, { role: 'system_info', content: '⚠️ conflit', conflictData: { conflicts: [], msg: prop } }, { role: 'system', content: 'interne' }] };
  ctx.tcSauverHistoriqueCharly();
  const garde = JSON.parse(memoire[ctx.TC_CHARLY_HISTORIQUE_CLE]);
  verifie('les boutons d un conflit (conflictData) sont laisses de cote', garde.every((m) => !('conflictData' in m)));
  verifie('les messages internes (role system) ne sont pas gardes', garde.every((m) => m.role !== 'system'));
  verifie('la carte validee garde son etat', garde[0]._validated === true && garde[0].tempId === 'p1',
    'sinon le bouton vert redeviendrait actif apres une mise a jour');
}

titre('Seul « Recommencer » efface');
{
  ctx.tcEffacerHistoriqueCharly();
  verifie('Recommencer efface aussi l enregistrement', !(ctx.TC_CHARLY_HISTORIQUE_CLE in memoire));
  const remises = (page.match(/charlyIA\.history = \[\];/g) || []).length;
  const menage = page.match(/function tcViderDonneesDuCompte\(\) \{[\s\S]*?\n\}\n/);
  const dansMenage = menage ? (menage[0].match(/charlyIA\.history = \[\];/g) || []).length : 0;
  verifie('deux remises a zero dans toute la page : « Recommencer » et le menage du compte (mission 20), aucune a la connexion', remises === 2 && dansMenage === 1, 'trouve ' + remises + ' dont ' + dansMenage + ' dans le menage — la connexion en avait deux de plus');
  const reset = extraire('resetCharlyChat') || '';
  verifie('et c est celle du bouton Recommencer', /charlyIA\.history = \[\];\s*tcEffacerHistoriqueCharly\(\);/.test(reset));
  const auth = extraire('hideAuthFlow') || '';
  verifie('la connexion recharge au lieu de vider', /tcChargerHistoriqueCharly\(\);/.test(auth) && !/charlyIA\.history = \[\]/.test(auth));
  verifie('et n ajoute l accueil que si la conversation est vide', /if \(!charlyIA\.history\.length\) charlyIA\.history\.push\(tcMessageAccueilCharly\(\)\);/.test(auth));
  const bienvenue = extraire('showWelcomeSplash') || '';
  verifie('l ecran de bienvenue aussi', /tcChargerHistoriqueCharly\(\);/.test(bienvenue) && !/charlyIA\.history = \[\]/.test(bienvenue));
}

titre('Chaque affichage enregistre');
{
  const rendu = extraire('renderCharlyChat') || '';
  verifie('renderCharlyChat charge puis enregistre en premier',
    /^function renderCharlyChat\(\) \{[\s\S]{0,300}?tcChargerHistoriqueCharly\(\);\s*(\/\/ Missions? 10[67][^\n]*\n\s*if \(charlyIA\.history\.length === 1 && tcEstAccueilCharly\(charlyIA\.history\[0\]\) && (!charlyIA\.history\[0\]\.accueil|charlyIA\.history\[0\]\.v !== 107)\) \{\s*charlyIA\.history\[0\] = tcMessageAccueilCharly\(\);\s*setTimeout\(tcSyncCharlyGreeting, 0\);\s*\}\s*)?tcSauverHistoriqueCharly\(\);/.test(rendu));
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
