// « Mon dentiste » : Charly disait « 2 contacts portent ce nom », la
// liste disait « aucun ». Deux moteurs, deux reponses, zero dentiste
// montre sur les cinq du carnet.
//
// On execute les vraies fonctions sur un faux carnet qui reproduit le
// piege : une fiche qui contient « Mon… » et « dentiste » par hasard,
// cinq vrais dentistes, deux Michel.
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

const carnet = [
  { id: 'c1', name: 'Montreuil Clinique Dentiste', phone: '01 00 00 00 01', email: '' },   // le piege : « Mon… » + dentiste
  { id: 'c2', name: 'AHMADOU DENTISTE SENEGAL NOV 2023', phone: '+33 6 41 33 95 82', email: '' },
  { id: 'c3', name: 'ATTIAS SARAH, Conseil De L\'ordre DENTISTE', phone: '', email: 'attias@ex.fr' },
  { id: 'c4', name: 'Alain Uzan Dentiste, Golf 2017', phone: '06 44 66 27 00', email: '' },
  { id: 'c5', name: 'Aude Mateu (25 Ans), Dentiste Manin', phone: '', email: '' },
  { id: 'c6', name: 'Michel Dupont', phone: '06 12 34 56 78', email: '' },
  { id: 'c7', name: 'Michel Martin', phone: '', email: 'michel@ex.fr' },
  { id: 'c8', name: 'Simone Monge', phone: '', email: '' },                              // « Mon… » sans dentiste
  { id: 'c9', name: 'Ostéopathe Lebrun', phone: '', email: '' }
];

let retenus = [], rendus = 0, toasts = [];
const ctx = {
  console, String, Number, Array, Object, RegExp, JSON, Date,
  contactsList: carnet,
  charlyIA: { history: [] },
  events: [],
  tcDernierRdvParContact: () => ({}),
  tcRetenirSurnom: (nom, id) => { retenus.push([nom, id]); return true; },
  renderCharlyChat: () => { rendus++; },
  showToast: (t) => toasts.push(t),
  escapeHTMLSafe: (t) => String(t),
  tcMessageProposition: (id) => ctx.charlyIA.history.find((m) => m.tempId === id) || null
};
vm.createContext(ctx);
['TC_PETITS_MOTS'].forEach((n) => {
  const src = extraireConst(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
['tcSansAccents', 'tcMotsUtiles', 'tcDesignationSansPetitMot', 'tcContactsParMots', 'tcClasserContacts',
 'tcResoudreContact', 'tcContactsPourRdv', 'tcDesignationTutoyee', 'tcQuestionContact', 'tcRelierContactProposition'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Les petits mots ne comptent plus');
verifie('« mon dentiste » → ["dentiste"]', JSON.stringify(ctx.tcMotsUtiles('mon dentiste')) === '["dentiste"]');
verifie('« chez le coiffeur » → ["coiffeur"]', JSON.stringify(ctx.tcMotsUtiles('chez le coiffeur')) === '["coiffeur"]');
verifie('« Michel Dupont » garde ses deux mots', JSON.stringify(ctx.tcMotsUtiles('Michel Dupont')) === '["michel","dupont"]');
verifie('« mon » seul ne cherche rien', ctx.tcMotsUtiles('mon').length === 0);
verifie('affichage : « mon dentiste » → « dentiste »', ctx.tcDesignationSansPetitMot('mon dentiste') === 'dentiste');
verifie('affichage : « l\'ostéopathe » → « ostéopathe »', ctx.tcDesignationSansPetitMot('l\'ostéopathe') === 'ostéopathe');
verifie('affichage : « Michel » reste « Michel »', ctx.tcDesignationSansPetitMot('Michel') === 'Michel');

titre('Charly trouve les vrais dentistes');
{
  const t = ctx.tcResoudreContact('mon dentiste');
  verifie('cinq fiches avec « dentiste » (le piege Montreuil compris, il en est un)', t.length === 5, 'trouve ' + t.length + ' — avant : 2 au hasard');
  verifie('tous contiennent le mot', t.every((c) => /dentiste/i.test(c.name)));
  verifie('« Michel » : les deux Michel', ctx.tcResoudreContact('Michel').length === 2);
  verifie('« Michel Dupont » : un seul', ctx.tcResoudreContact('Michel Dupont').length === 1);
  verifie('« Simone » ne sort pas pour « mon dentiste »', !t.some((c) => c.id === 'c8'));
}

titre('La liste « Avec qui ? » cherche comme Charly');
{
  const l = ctx.tcContactsPourRdv('mon dentiste');
  verifie('meme resultat que Charly pour « mon dentiste »', l.length === 5, 'trouve ' + l.length + ' — avant : aucun');
  verifie('« dentiste » seul : pareil', ctx.tcContactsPourRdv('dentiste').length === 5);
  verifie('un numero se cherche toujours tel quel', ctx.tcContactsPourRdv('06 44').some((c) => c.id === 'c4'));
  verifie('un email aussi', ctx.tcContactsPourRdv('attias@').some((c) => c.id === 'c3'));
  verifie('vide : tout le carnet', ctx.tcContactsPourRdv('').length === carnet.length);
}

titre('La question dit la verite');
{
  const q = ctx.tcQuestionContact('mon dentiste');
  verifie('« Je vois 5 contacts avec « dentiste » »', /Je vois 5 contacts avec « dentiste »/.test(q), q.split('\n')[0]);
  verifie('plus de « portent ce nom »', !/portent ce nom/.test(q));
  verifie('a 5, on renvoie a la liste', /dans la liste/.test(q));
  const q2 = ctx.tcQuestionContact('Michel');
  verifie('a 2, on invite a toucher le bon', /Je vois 2 contacts avec « Michel »/.test(q2) && /Touche le bon/.test(q2));
  const q3 = ctx.tcQuestionContact('mon ostéopathe');
  verifie('un seul : pas de question d homonymes', !/Je vois/.test(q3));
}

titre('Toucher un candidat relie sans ouvrir la liste');
{
  const msg = { role: 'assistant', content: '', tempId: 'p1', _sansContact: { 'michel': true } };
  ctx.charlyIA.history = [msg];
  ctx.tcRelierContactProposition('p1', 'Michel', 'c7');
  verifie('relie au contact touche', msg._contacts && msg._contacts['michel'] === 'c7');
  verifie('un « sans contact » precedent est annule', !msg._sansContact['michel']);
  verifie('retenu pour la prochaine fois', retenus.some((r) => r[0] === 'Michel' && r[1] === 'c7'));
  verifie('la conversation est redessinee', rendus >= 1);
}

titre('Le branchement est dans la source');
verifie('la liste se pre-remplit du mot utile', /champ\.value = tcDesignationSansPetitMot\(nom\) \|\| nom;/.test(page));
verifie('2 ou 3 candidats : boutons en ligne', /candidats\.length >= 2 && candidats\.length <= 3/.test(page));
verifie('chaque bouton appelle tcRelierContactProposition', /onclick="tcRelierContactProposition\(/.test(page));
verifie('la reponse tapee dit aussi « Je vois »', /Je vois ' \+ trouves\.length \+ ' contacts avec/.test(page));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
