// Mission 82 (Charles, 12/11) : la première minute d'un compte neuf. Agenda vide : l'arrivée invite à écrire son premier
// rendez-vous, « ➕ Créer mon premier rendez-vous » en premier (une phrase, puis la carte « Valider »), « Je suis malade »
// dit qu'il n'y a rien à décaler. Agenda non vide : rien ne change. « Créer mon agenda » ne change pas.
// Usage : node verif-premiere-minute.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}

// ─── La barre ─────────────────────────────────────────────────
const barre = page.slice(page.indexOf('<div id="charlyQuickActions"'), page.indexOf('<div id="charlyQuickActions2"'));
const ordre = [...barre.matchAll(/charlyQuickAction\('([a-z]+)'\)/g)].map((m) => m[1]);
verifie('la barre : nouveau rdv, mon agenda, imprévu, retard (dans cet ordre)', ordre.join(',') === 'rdv,agenda,impprevu,retard', ordre.join(','));
verifie('le premier bouton a son identifiant', barre.includes('<button id="charlyBtnRdv" onclick="charlyQuickAction(\'rdv\')"'));
const barre2 = page.slice(page.indexOf('<div id="charlyQuickActions2"'), page.indexOf('</div>', page.indexOf('<div id="charlyQuickActions2"')));
verifie('la deuxième ligne garde son ordre', [...barre2.matchAll(/charlyQuickAction\('([a-z]+)'\)/g)].map((m) => m[1]).join(',') === 'groupe,malade,libre,photo,contact');
verifie('le libellé suit l agenda à chaque affichage (Charly et agenda)', /function renderCharlyChat\(\) \{\n  try \{ tcMajBoutonPremierRdv\(\); \} catch \(e\) \{\}/.test(page) && /function render\(\) \{\n  try \{ tcMajBoutonPremierRdv\(\); \} catch \(e\) \{\}/.test(page));

// ─── Joué ─────────────────────────────────────────────────────
const journal = [];
const bouton = { textContent: '➕ Créer un nouveau rdv' };
const ctx = {
  events: [], mode: 'user', charlyIA: { history: [] }, journal,
  document: { getElementById: (id) => (id === 'charlyBtnRdv' ? bouton : (id === 'charlyInput' ? { focus: () => journal.push('focus') } : null)) },
  tcPousserMessageUtilisateur: (t) => { ctx.charlyIA.history.push({ role: 'user', content: t }); },
  renderCharlyChat: () => journal.push('render'),
  tcQuestionnaireDemarrer: async (q) => journal.push('questionnaire ' + q.nom),
  tcMaladeDansLaPhrase: () => ({}),
  TC_QUESTIONNAIRE_MALADE: { nom: 'malade' },
};
vm.createContext(ctx);
const src = page.slice(page.indexOf("const TC_PREMIER_RDV_EXEMPLE"), page.indexOf('function tcSyncCharlyGreeting() {'));
vm.runInContext(src.replace('let _tcCompteNeuf', 'var _tcCompteNeuf') + '\n' + fonction('tcDemarrerMalade') + '\nthis.tcAgendaVide = tcAgendaVide; this.tcMajBoutonPremierRdv = tcMajBoutonPremierRdv; this.tcPremierRdvInviter = tcPremierRdvInviter; this.tcDemarrerMalade = tcDemarrerMalade;', ctx);

(async () => {
  verifie('agenda vide : vide', ctx.tcAgendaVide() === true);
  ctx.tcMajBoutonPremierRdv();
  verifie('agenda vide : « ➕ Créer mon premier rendez-vous »', bouton.textContent === '➕ Créer mon premier rendez-vous', bouton.textContent);
  ctx.tcPremierRdvInviter();
  const h = ctx.charlyIA.history;
  verifie('le premier bouton : une phrase à écrire, l exemple, le curseur dans la case', h[0].content === 'Créer mon premier rendez-vous' && h[1].content === 'Écris ton rendez-vous en une phrase, par exemple : dentiste mardi 15h' && journal.includes('focus'), JSON.stringify(h));
  h.length = 0;
  await ctx.tcDemarrerMalade('Je suis malade, décale tout');
  verifie('malade, agenda vide : rien à décaler, aucune question', h[1] && h[1].content === 'Ton agenda est vide pour l’instant, il n’y a rien à décaler. Veux-tu créer ton premier rendez-vous ? Écris-le, par exemple : dentiste mardi 15h' && !journal.some((l) => l.startsWith('questionnaire')), JSON.stringify(h));
  ctx.events.push({ title: 'Anniv', mode: 'pro' });
  verifie('un rendez-vous de l autre mode ne compte pas', ctx.tcAgendaVide() === true);
  ctx.events.push({ title: 'Dentiste', mode: 'user', date: '2026-11-17' });
  verifie('un rendez-vous : plus vide', ctx.tcAgendaVide() === false);
  ctx.tcMajBoutonPremierRdv();
  verifie('après un rendez-vous : « ➕ Créer un nouveau rdv »', bouton.textContent === '➕ Créer un nouveau rdv', bouton.textContent);
  h.length = 0;
  await ctx.tcDemarrerMalade('Je suis malade, décale tout');
  verifie('malade, agenda non vide : le questionnaire, comme avant', journal.includes('questionnaire malade') && h.length === 1, JSON.stringify(h));

  // ─── Câblage ───────────────────────────────────────────────
  verifie('le bouton : agenda vide, une phrase ; sinon le questionnaire (inchangé)', page.includes("  if (action === 'rdv' && tcAgendaVide()) { tcPremierRdvInviter(); return; }\n  if (action === 'rdv') { tcDemarrerNouveauRdv('Je veux créer un nouveau rendez-vous'); return; }"));
  const arrivee = fonction('hideAuthFlow');
  verifie('l arrivée d un compte neuf, agenda vide : « Je suis Charly. Écris ton premier rendez-vous, par exemple : dentiste mardi 15h »', arrivee.includes("' ! 😊 Je suis Charly. Écris ton premier rendez-vous, par exemple : ' + TC_PREMIER_RDV_EXEMPLE") && arrivee.includes('(_tcCompteNeuf && tcAgendaVide()) ? _accueilNeuf : _accueil') && arrivee.includes('_tcCompteNeuf = false;'));
  verifie('compte neuf : posé à la création du compte seulement', (page.match(/_tcCompteNeuf = true;/g) || []).length === 1 && fonction('tcCreerCompte').includes('_tcCompteNeuf = true;'));
  verifie('une connexion garde son accueil (showWelcomeSplash inchangé)', fonction('showWelcomeSplash').includes('Je peux t’aider à organiser ton agenda, gérer tes rappels et bien plus encore. Par où on commence') && !fonction('showWelcomeSplash').includes('premier rendez-vous'));
  verifie('« Créer mon agenda » ne change pas (liste et questions)', fonction('validateAgendaChecklist').includes("Aide-moi à organiser mon agenda en me posant les questions nécessaires, une par une, pour chaque élément.") && page.includes("{ id:'meetings', label:\"J’ai des réunions / appels\", icon:'📞' }"));
  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})();
