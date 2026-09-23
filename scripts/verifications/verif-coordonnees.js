// Peut-on corriger le telephone et l'email d'un contact ?
//
// Deux erreurs seraient silencieuses : une adresse sans arobase
// acceptee -- l'invitation partirait dans le vide des semaines plus
// tard -- et un clic sur le crayon qui ouvrirait aussi la fiche
// derriere, puisque toute la carte reagit au toucher.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log('  ' + (condition ? 'OK ' : 'KO ') + libelle
    + (detail ? '  - ' + detail : ''));
}
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

function extraire(nom) {
  // « async function X( » contient « function X( » : chercher la forme
  // courte d abord amputait le mot-cle async, et le code extrait ne se
  // compilait plus.
  const asy = page.indexOf('async function ' + nom + '(');
  if (asy > -1) return extraireDepuis(asy);
  const debut = page.indexOf('function ' + nom + '(');
  return debut > -1 ? extraireDepuis(debut) : null;
}

function extraireDepuis(debut) {
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

let sauve = 0, redessine = 0, badges = 0, dernierToast = '';
let reponse = null;
const ctx = {
  console, String, RegExp,
  contactsList: [],
  tcPrompt: async () => reponse,
  saveContacts: () => { sauve++; },
  renderContacts: () => { redessine++; },
  tcRafraichirBadgesContacts: () => { badges++; },
  showToast: (t) => { dernierToast = t; },
  escapeHTMLSafe: (t) => String(t)
};
vm.createContext(ctx);
['tcModifierCoordonnee', 'tcLigneCoordonnee'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

const remettre = () => {
  ctx.contactsList = [{ id: 'c1', name: 'Enzo', phone: '+33 7 54 52 31 40' }];
  sauve = redessine = badges = 0; dernierToast = '';
};

titre('Ce que la fiche affiche');
{
  remettre();
  const c = ctx.contactsList[0];
  const tel = ctx.tcLigneCoordonnee(c, 'phone');
  verifie('le telephone est montre', tel.indexOf('+33 7 54 52 31 40') > -1);
  verifie('avec son crayon', tel.indexOf('tcModifierCoordonnee(') > -1);

  const mail = ctx.tcLigneCoordonnee(c, 'email');
  verifie('l email manquant est signale',
    mail.indexOf('Ajouter un email') > -1,
    'sans cela on ne sait pas qu il manque');
  verifie('et il est proposable', mail.indexOf("'email'") > -1);

  verifie('le crayon n ouvre pas la fiche derriere',
    tel.indexOf('event.stopPropagation()') > -1,
    'toute la carte reagit au toucher');
}

titre('Enregistrer une adresse valable');
{
  remettre();
  reponse = 'enzo@exemple.fr';
  return ctx.tcModifierCoordonnee('c1', 'email').then(() => {
    verifie('elle est retenue', ctx.contactsList[0].email === 'enzo@exemple.fr');
    verifie('le carnet est enregistre', sauve === 1);
    verifie('et la detection TimeCool relancee', badges === 1,
      'une adresse peut reveler un contact deja inscrit');
    suite();
  });
}

function suite() {
  titre('Ce qui est refuse');
  {
    remettre();
    reponse = 'enzo-sans-arobase';
    ctx.tcModifierCoordonnee('c1', 'email').then(() => {
      verifie('une adresse sans arobase est rejetee',
        !ctx.contactsList[0].email && dernierToast.indexOf('valide') > -1,
        'l erreur ne se verrait qu au moment de l envoi');
      verifie('et rien n est enregistre', sauve === 0);

      remettre();
      reponse = 'pas de chiffre ici';
      ctx.tcModifierCoordonnee('c1', 'phone').then(() => {
        verifie('un numero sans chiffre est rejete',
          ctx.contactsList[0].phone === '+33 7 54 52 31 40'
          && dernierToast.indexOf('chiffre') > -1);

        remettre();
        reponse = null;
        ctx.tcModifierCoordonnee('c1', 'phone').then(() => {
          verifie('annuler ne change rien',
            ctx.contactsList[0].phone === '+33 7 54 52 31 40' && sauve === 0);

          remettre();
          reponse = '   ';
          ctx.tcModifierCoordonnee('c1', 'phone').then(() => {
            verifie('vider la coordonnee la retire',
              !ctx.contactsList[0].phone && sauve === 1,
              'on doit pouvoir effacer un numero faux');

            remettre();
            reponse = 'x@y.fr';
            ctx.tcModifierCoordonnee('inconnu', 'email').then(() => {
              verifie('un contact introuvable ne casse rien', sauve === 0);
              fin();
            });
          });
        });
      });
    });
  }
}

function fin() {
  titre('La fiche porte les deux lignes');
  verifie('le telephone', page.indexOf("tcLigneCoordonnee(c, 'phone')") > -1);
  verifie('et l email', page.indexOf("tcLigneCoordonnee(c, 'email')") > -1);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
}
