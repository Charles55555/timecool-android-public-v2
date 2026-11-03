// « Charly connaît et utilise le prénom de l'utilisateur, partout où c'est naturel » (mission 72, chef, 03/11, ok de Charles).
//
// Le prénom du compte entre dans les consignes de Charly (prompt construit dans la page) et dans ses phrases fixes : accueil,
// bonjour, au revoir. Sans prénom exploitable (champ vide, prénom = nom, une adresse e-mail), Charly parle comme avant :
// jamais d'invention, jamais l'e-mail à la place. Le prénom s'écrit mot par mot, première lettre en majuscule, le reste en
// minuscules (décision du chef après l'examen : « CHARLES » → « Charles »).
// Usage : node verif-prenom-charly.js <index.html>
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0, ok = 0;
function verifie(l, c, d) {
  if (c) ok++; else ko++;
  console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : ''));
}
function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

console.log('-- 1. Le prénom du compte, ou rien --');
const ctx = { String, RegExp, userAccount: null };
vm.createContext(ctx);
['tcPrenomUtilisateur', 'tcConsignePrenom'].forEach((n) => {
  const src = extraire(n);
  verifie(n + ' existe dans la page', !!src);
  if (src) vm.runInContext(src, ctx);
});
if (ko) { console.log(ko + ' anomalie(s).'); process.exit(1); }
const prenom = (compte) => { ctx.userAccount = compte; return ctx.tcPrenomUtilisateur(); };
const cas = [
  [{ firstname: 'Charles', lastname: 'Haddad', email: 'c@x.fr' }, 'Charles', 'prénom normal'],
  [{ firstname: 'charles', lastname: 'Haddad' }, 'Charles', 'saisi en minuscules : première lettre en majuscule'],
  [{ firstname: 'élodie', lastname: 'Martin' }, 'Élodie', 'première lettre accentuée'],
  [{ firstname: 'jean-pierre', lastname: 'Roux' }, 'Jean-Pierre', 'prénom composé avec un trait d union'],
  [{ firstname: 'JEAN PIERRE', lastname: 'Roux' }, 'Jean Pierre', 'deux mots en majuscules'],
  [{ firstname: 'CHARLES', lastname: 'Haddad' }, 'Charles', 'un mot en majuscules'],
  [{ firstname: 'ÉLODIE', lastname: 'Martin' }, 'Élodie', 'un mot en majuscules accentué'],
  [{ firstname: 'mArIe', lastname: 'Martin' }, 'Marie', 'casse mélangée'],
  [{ firstname: '  Marie   Claire ', lastname: 'Dupont' }, 'Marie Claire', 'espaces en trop retirés'],
  [{ firstname: 'Inès' }, 'Inès', 'sans nom'],
  [{ firstName: 'Paul', lastName: 'Martin' }, 'Paul', 'champ firstName'],
  [{ prenom: 'Zoé', nom: 'Petit' }, 'Zoé', 'champ prenom'],
  [{ firstname: 'Lo', lastname: 'X' }, 'Lo', 'prénom court'],
  [{ firstname: 'A', lastname: 'B' }, 'A', 'une seule lettre majuscule (pas un mot en majuscules)'],
  [{ firstname: '', lastname: 'Haddad', email: 'charles@x.fr' }, '', 'champ vide : rien, pas l e-mail'],
  [{ firstname: '   ', lastname: 'Haddad' }, '', 'champ blanc'],
  [{ lastname: 'Haddad', email: 'charles@x.fr' }, '', 'pas de champ prénom'],
  [{ firstname: 'Haddad', lastname: 'Haddad' }, '', 'prénom = nom'],
  [{ firstname: 'haddad', lastname: 'HADDAD' }, '', 'prénom = nom, casse différente'],
  [{ firstname: 'Hélène', lastname: 'Helene' }, '', 'prénom = nom, accents différents'],
  [{ firstname: 'charles@exemple.fr' }, '', 'une adresse e-mail'],
  [{ firstname: 'charles.haddad' }, '', 'un identifiant avec un point'],
  [{ firstname: 'Test123' }, '', 'des chiffres'],
  [{ firstname: 'Abcdefghijabcdefghijabcdefghijabcdefghijk' }, '', 'plus de 40 caractères'],
  [null, '', 'pas de compte']
];
cas.forEach(([compte, attendu, l]) => { const r = prenom(compte); verifie(l + ' : « ' + attendu + ' »', r === attendu, r); });

console.log('-- 2. La consigne donnée à Charly --');
ctx.userAccount = { firstname: 'charles', lastname: 'Haddad' };
const consigne = ctx.tcConsignePrenom();
verifie('elle donne le prénom avec la majuscule', /l’utilisateur s’appelle Charles\./.test(consigne), consigne);
verifie('le bonjour attendu : « Bonjour Charles ! Qu’est-ce que je peux faire pour toi ? »', consigne.indexOf('« Bonjour Charles ! Qu’est-ce que je peux faire pour toi ? »') > -1, consigne);
verifie('« C’est noté, Charles » et « Bonne journée, Charles »', consigne.indexOf('« C’est noté, Charles »') > -1 && consigne.indexOf('« Bonne journée, Charles »') > -1, consigne);
verifie('jamais à chaque phrase, jamais dans un titre ni un bloc [AGENDA], jamais dans un message pour une autre personne', /Jamais à chaque phrase/.test(consigne) && /titre d’un rendez-vous/.test(consigne) && /\[AGENDA\]/.test(consigne) && /message écrit pour une autre personne/.test(consigne), consigne);
verifie('pas de tiret long, pas d apostrophe droite', consigne.indexOf('—') < 0 && consigne.indexOf("'") < 0, consigne);
[{ firstname: '', email: 'charles@x.fr' }, { firstname: 'charles@x.fr' }, { firstname: 'Haddad', lastname: 'Haddad' }, null].forEach((c) => {
  ctx.userAccount = c;
  verifie('sans prénom exploitable (' + JSON.stringify(c) + ') : aucune consigne, Charly parle comme avant', ctx.tcConsignePrenom() === '');
});

console.log('-- 3. La page --');
const appels = (page.match(/tcPromptSysteme\(\) \+ tcConsignePrenom\(\) \+ tcLangInstruction\(\)/g) || []).length;
verifie('les trois appels du modèle ajoutent la consigne du prénom', appels === 3 && page.indexOf('tcPromptSysteme() + tcLangInstruction()') < 0, appels);
verifie('le prompt modifiable dans les réglages ne contient pas la consigne (elle s ajoute à l envoi)', /escapeHTMLSafe\(tcPromptSysteme\(\)\)/.test(page) && extraire('tcPromptSysteme').indexOf('Prenom') < 0);
verifie('l accueil à la connexion (deux chemins) prend tcPrenomUtilisateur, plus le champ brut', page.indexOf('const fname = tcPrenomUtilisateur();') > -1 && page.indexOf('const fnameG = tcPrenomUtilisateur();') > -1 && page.indexOf('userAccount ? userAccount.firstname :') < 0);
verifie('le premier bonjour met le prénom', /const _prenom = tcPrenomUtilisateur\(\);\s+const _reply = _sal \+ \(_prenom \? ' ' \+ _prenom : ''\) \+ ' ! 😊 Je suis Charly,/.test(page));
verifie('pas d assertion arrière dans la page (Safari)', !/\(\?<[=!]/.test(page));

console.log(ko ? ko + ' anomalie(s).' : ok + ' vérifications, aucune anomalie.');
process.exit(ko ? 1 : 0);
