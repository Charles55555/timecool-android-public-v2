// Groupes 5 et 7 des « je ne peux pas » (chef, 18/11), ce que les phrases ne touchent pas :
//  - un contact cité sans TimeCool : « Je m’en occupe. Julien n’a pas encore TimeCool. Je lui prépare une invitation par SMS ou par
//    e-mail. » ; personne avec TimeCool : l'invitation, sans questionnaire ; sans numéro ni e-mail : Charly dit quoi ajouter ;
//  - le bouton ouvre le texte de Charles (07/09) mot pour mot ; l'e-mail porte « Rejoins-moi sur TimeCool » ;
//  - une invitation n'annonce pas de rendez-vous (pas de « Voir dans mon agenda ») ;
//  - « Créer un nouveau rdv » à plusieurs, personne de lisible : la création envoie l'invitation (Présent ou Absent), rien d'inscrit.
// Usage : node verif-invitation-sans-compte.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); };
function extraire(nom) {
  const d = page.indexOf('function ' + nom + '(');
  if (d < 0) throw new Error('introuvable : ' + nom);
  const debut = page.lastIndexOf('\n', d) + 1;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  throw new Error('fin introuvable : ' + nom);
}
const contexte = function (plus) {
  const ctx = Object.assign({ console, Date, JSON, Array, String, Object, Math, encodeURIComponent, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)' },
    charlyIA: { history: [] }, _tcQuestionnaireNumero: 0, renderCharlyChat: function () {}, tcPousserMessageUtilisateur: function () {} }, plus || {});
  vm.createContext(ctx);
  vm.runInContext(['tcPrenomPresentable', 'tcQuestionnaireNoms', 'tcTexteInvitationTimeCool', 'tcMessageInvitationSansCompte', 'tcGererPlusieursCites', 'tcMessageAnnonceRdv111', 'tcLienSms'].map(extraire).join('\n')
    + '\nglobalThis._n = function () { return _tcQuestionnaireNumero; };', ctx);
  return ctx;
};
const julien = { id: 'j', name: 'Julien Martin', phone: '06 12 34 56 78', email: 'julien@exemple-timecool.fr' };
const marc = { id: 'm', name: 'Marc Petit', phone: '', email: 'marc@exemple-timecool.fr' };
const lea = { id: 'l', name: 'Léa Roux', phone: '', email: '' };
const alice = { id: 'a', name: 'Alice Durand', phone: '06 00 00 00 01', referenceCompte: 'REFA' };

(async () => {
  // 1. Le message.
  let ctx = contexte();
  let m = ctx.tcMessageInvitationSansCompte([julien], false);
  verifie('un contact : « Je m’en occupe. / Julien n’a pas encore TimeCool. / Je lui prépare une invitation par SMS ou par e-mail. »',
    m.content === 'Je m’en occupe.\nJulien n’a pas encore TimeCool.\nJe lui prépare une invitation par SMS ou par e-mail.' && m._invitation === true, JSON.stringify(m.content));
  verifie('son bouton « Envoyer à Julien Martin (invitation TimeCool) », le texte de Charles mot pour mot, le sujet de l’e-mail',
    m._envois.length === 1 && m._envois[0].nom === 'Julien Martin' && m._envois[0].titre === 'invitation TimeCool' && m._envois[0].sujet === 'Rejoins-moi sur TimeCool'
    && /^Salut Julien,\nJ'ai testé l'application gratuite TimeCool/.test(m._envois[0].texte) && /Rejoins-moi sur TimeCool, on va optimiser notre temps : https:\/\/timecool\.fr$/.test(m._envois[0].texte), JSON.stringify(m._envois));
  m = ctx.tcMessageInvitationSansCompte([julien, marc], true);
  verifie('deux contacts : « Julien et Marc n’ont pas encore TimeCool. / Je leur prépare… / Pour les autres, on y va. », deux boutons',
    m.content === 'Je m’en occupe.\nJulien et Marc n’ont pas encore TimeCool.\nJe leur prépare une invitation par SMS ou par e-mail.\nPour les autres, on y va.' && m._envois.length === 2, JSON.stringify(m.content));
  m = ctx.tcMessageInvitationSansCompte([julien, lea], false);
  verifie('sans numéro ni e-mail (Léa) : Charly dit quoi ajouter, pas de bouton pour elle, jamais « je ne peux pas »',
    m.content === 'Je m’en occupe.\nJulien et Léa n’ont pas encore TimeCool.\nJe lui prépare une invitation par SMS ou par e-mail (Julien).\nPour Léa, ajoute son numéro ou son e-mail dans sa fiche : je lui préparerai l’invitation.'
    && m._envois.length === 1 && !/ne peux/.test(m.content), JSON.stringify(m.content));
  m = ctx.tcMessageInvitationSansCompte([lea], false);
  verifie('personne de joignable : pas de bouton du tout', !m._envois && /Pour Léa, ajoute son numéro ou son e-mail/.test(m.content), JSON.stringify(m));
  verifie('une invitation n’annonce pas de rendez-vous (pas de « Voir dans mon agenda ») ; un bilan avec envois, si',
    ctx.tcMessageAnnonceRdv111(ctx.tcMessageInvitationSansCompte([julien], false)) === false && ctx.tcMessageAnnonceRdv111({ role: 'system_info', content: 'x', _envois: [{}] }) === true);

  // 2. L'ancien chemin (deux contacts cités, dont au moins un sans TimeCool).
  let demarre = 0;
  ctx = contexte({ tcDemarrerRdvAPlusieurs: async function () { demarre++; } });
  await ctx.tcGererPlusieursCites('trouve un moment avec Julien et Marc', { contacts: [julien, marc], sansCompte: [julien, marc] });
  verifie('personne n’a TimeCool : l’invitation, et pas de questionnaire', demarre === 0 && ctx.charlyIA.history.length === 1 && /Julien et Marc n’ont pas encore TimeCool/.test(ctx.charlyIA.history[0].content) && !/ne peux|Pour les autres/.test(ctx.charlyIA.history[0].content), JSON.stringify(ctx.charlyIA.history));
  demarre = 0;
  ctx = contexte({ tcDemarrerRdvAPlusieurs: async function () { demarre++; } });
  await ctx.tcGererPlusieursCites('trouve un moment avec Alice et Julien', { contacts: [alice, julien], sansCompte: [julien] });
  verifie('Alice a TimeCool, Julien non : l’invitation de Julien, « Pour les autres, on y va. », puis le questionnaire', demarre === 1 && /Pour les autres, on y va\.$/.test(ctx.charlyIA.history[0].content), JSON.stringify(ctx.charlyIA.history));

  // 3. L'e-mail de l'invitation porte son sujet ; un message de rendez-vous garde « Notre rendez-vous ».
  const ouvrir = async function (sujet) {
    let ouvert = '';
    const c2 = { console, encodeURIComponent, navigator: { userAgent: 'x' }, TC_BACKEND: {}, _prevenirName: '', sendPrevenirMessage: function () {},
      window: { get location() { return { set href(v) { ouvert = v; } }; } } };
    vm.createContext(c2);
    vm.runInContext(extraire('tcLienSms') + '\n' + extraire('tcTransmettrePrevenance'), c2);
    const chemin = await c2.tcTransmettrePrevenance({ name: 'Marc Petit', email: 'marc@exemple-timecool.fr' }, 'Bonjour', sujet);
    return { chemin, ouvert };
  };
  const e1 = await ouvrir('Rejoins-moi sur TimeCool'), e2 = await ouvrir(undefined);
  verifie('e-mail : sujet « Rejoins-moi sur TimeCool » pour l’invitation, « Notre rendez-vous » sinon',
    e1.chemin === 'email' && e1.ouvert.indexOf('subject=' + encodeURIComponent('Rejoins-moi sur TimeCool')) > -1 && e2.ouvert.indexOf('subject=' + encodeURIComponent('Notre rendez-vous')) > -1, JSON.stringify([e1, e2]));
  verifie('le bouton passe le sujet', /tcTransmettrePrevenance\(\{ name: e\.nom, phone: e\.phone, email: e\.email \}, e\.texte, e\.sujet\)/.test(page));

  // 4. Groupe 7 : la création, personne de lisible : l'invitation, jamais l'inscription directe.
  let envoi = 0, confirme = 0;
  const c3 = { console, JSON, Math, Array, String, Object,
    tcNouveauRdvHoraire: function () { return { date: '2026-11-20', startH: 10, startM: 0, endH: 11, endM: 0 }; },
    tcQuestionnaireQuand: function () { return 'vendredi 20 novembre à 10h'; },
    tcPlusieursEnvoyer: async function () { envoi++; },
    TC_BACKEND: { confirmerRdvGroupe: async function () { confirme++; return { inclus: [], exclus: [] }; } },
    tcQuestionnaireDire: function () {}, tcSyncTour: function () {} };
  vm.createContext(c3);
  vm.runInContext(extraire('tcQuestionnaireNoms') + '\n' + extraire('tcNouveauRdvCreer'), c3);
  await c3.tcNouveauRdvCreer({ avec: 'plusieurs', _tousSansAcces: ['Alice', 'Chloé'], _invites: [alice], _titre: 'Apéro', _cat: 'perso', _dureeMin: 60 });
  verifie('« Créer un nouveau rdv » à plusieurs, personne de lisible : l’invitation part (Présent ou Absent), rien n’est inscrit', envoi === 1 && confirme === 0, JSON.stringify({ envoi, confirme }));
  envoi = 0; confirme = 0;
  await c3.tcNouveauRdvCreer({ avec: 'plusieurs', _tousSansAcces: null, _invites: [alice], _titre: 'Apéro', _cat: 'perso', _dureeMin: 60 });
  verifie('des agendas lisibles : l’inscription comme avant', envoi === 0 && confirme === 1, JSON.stringify({ envoi, confirme }));
  verifie('le récapitulatif et son bouton le disent (« Je leur envoie une invitation… », « Oui, envoie »)',
    page.indexOf("l.push('• Je leur envoie une invitation dans leur messagerie : chacun répondra Présent ou Absent") > -1 && page.indexOf("'Oui, envoie' : 'Oui, crée-le'") > -1);
  verifie('plus aucun « je ne peux pas chercher de créneau commun » ni « je ne peux pas l’inviter d’ici » affiché',
    !/tcQuestionnaireDire\('[^']*je ne peux pas chercher/.test(page) && !/' n’a pas TimeCool : je ne peux pas/.test(page) && !/pas TimeCool : je ne peux pas ' \+/.test(page));

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO exception ' + (e && e.stack || e)); console.log((ko + 1) + ' anomalie(s) : ' + ok + ' vérifications'); process.exit(1); });
