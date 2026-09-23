// Le delai de rappel est-il respecte, et un seul reglage le commande-t-il ?
//
// Il y en avait deux, chacun avec sa memoire : regler l'un laissait
// l'autre afficher autre chose, et personne ne pouvait savoir lequel
// gouvernait vraiment les notifications. Le present controle veille a
// ce que cela ne revienne pas.
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
  const asy = page.indexOf('async function ' + nom + '(');
  const debut = asy > -1 ? asy : page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

let stock = {};
const ctx = {
  console, parseInt, String,
  localStorage: {
    getItem: (k) => (k in stock ? stock[k] : null),
    setItem: (k, v) => { stock[k] = String(v); }
  },
  showToast: () => {}
};
vm.createContext(ctx);
{
  // « const » reste enferme dans le script qui l'execute : on le
  // declare en « var » pour pouvoir le relire depuis le test.
  [/const TC_DELAIS_RAPPEL = \[[\s\S]*?\];/,
   /const TC_RAPPEL_DELAI_KEY = '[^']+';/,
   /const TC_RAPPEL_EMAIL_CLE = '[^']+';/].forEach((re) => {
    const m = page.match(re);
    if (m) vm.runInContext(m[0].replace('const ', 'var '), ctx);
  });
}
['tcDelaiRappel', 'tcRappelDuRdv', 'tcLibelleRappel', 'tcRappelEmail',
 'tcDefinirRappelEmail'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Un seul reglage, pas deux');
verifie('l ancien doublon a disparu',
  page.indexOf('TC_RAPPEL_DELAIS') === -1
  && page.indexOf('tcRappelDefaut') === -1,
  'deux reglages pour la meme chose ne se parlaient pas');
verifie('une seule cle de memoire',
  page.indexOf("TC_RAPPEL_DELAI_KEY = 'tc_rappel_delai'") > -1
  && page.indexOf("TC_RAPPEL_CLE") === -1);
verifie('et une seule ligne dans les parametres',
  (page.match(/tcChoisirDelaiRappel\(\)/g) || []).length >= 1
  && page.indexOf("openSettingsModal('rappel')") === -1);

titre('Les delais proposes');
verifie('« aucun rappel » existe',
  ctx.TC_DELAIS_RAPPEL.some((d) => d.minutes === 0));
verifie('« 5 minutes avant » aussi',
  ctx.TC_DELAIS_RAPPEL.some((d) => d.minutes === 5));
verifie('et « la veille »',
  ctx.TC_DELAIS_RAPPEL.some((d) => d.minutes === 1440),
  ctx.TC_DELAIS_RAPPEL.map((d) => d.label).join(' / '));

titre('Le delai propre a un rendez-vous');
{
  stock = {}; stock[ctx.TC_RAPPEL_DELAI_KEY] = '60';
  verifie('sans reglage, celui des parametres',
    ctx.tcRappelDuRdv({ title: 'Dentiste' }) === 60,
    String(ctx.tcRappelDuRdv({ title: 'Dentiste' })));
  verifie('un rendez-vous regle sur 5 min garde 5 min',
    ctx.tcRappelDuRdv({ rappel: 5 }) === 5);
  verifie('« aucun rappel » reste aucun rappel',
    ctx.tcRappelDuRdv({ rappel: 0 }) === 0,
    'sinon il sonnerait alors qu on avait demande le silence');
  verifie('une valeur inconnue retombe sur les parametres',
    ctx.tcRappelDuRdv({ rappel: 42 }) === 60);
  verifie('un rendez-vous absent ne casse rien',
    ctx.tcRappelDuRdv(null) === 60);
}

titre('Les libelles');
verifie('zero se dit Aucun rappel', ctx.tcLibelleRappel(0) === 'Aucun rappel');
verifie('1440 se dit La veille', ctx.tcLibelleRappel(1440) === 'La veille');
verifie('un inconnu ne rend pas vide', ctx.tcLibelleRappel(999).length > 0,
  ctx.tcLibelleRappel(999));

titre('L email de rappel');
{
  stock = {};
  verifie('coupe par defaut', ctx.tcRappelEmail() === false);
  ctx.tcDefinirRappelEmail(true);
  verifie('activable', ctx.tcRappelEmail() === true);
  verifie('sous une cle qui remonte au serveur',
    ctx.TC_RAPPEL_EMAIL_CLE === 'tc_rappel_email',
    'sans le prefixe tc_, le serveur ne la verrait jamais');
  ctx.tcDefinirRappelEmail(false);
  verifie('et coupable', ctx.tcRappelEmail() === false);
}

titre('Les deux chemins de notification suivent le choix');
{
  const restant = (page.match(/const reminderTimes = \[60, 30, 15, 5\];/g) || []).length;
  verifie('plus aucune liste figee', restant === 0,
    restant + ' reste(nt) - quatre sonneries pour un rendez-vous');
  const suivent = (page.match(/const reminderTimes = \[choisi\];/g) || []).length;
  verifie('les deux chemins utilisent le delai choisi', suivent === 2,
    suivent + ' sur 2 - la page ouverte, et le telephone');
  const silences = (page.match(/if \(!choisi\) return;/g) || []).length;
  verifie('et se taisent quand on ne veut rien', silences === 2, silences + ' sur 2');
}

titre('Les ecrans');
verifie('le choix par rendez-vous existe', page.indexOf('id="editRappel"') > -1);
verifie('il suit la liste unique',
  page.indexOf('${TC_DELAIS_RAPPEL.map(d => `<option') > -1);
verifie('egal au reglage general, rien n est fige sur la fiche',
  page.indexOf('if (minutes === tcDelaiRappel()) delete e.rappel;') > -1,
  'sinon le rendez-vous ne suivrait plus un changement d avis');
verifie('l email est propose dans l ecran des delais',
  page.indexOf('tcDefinirRappelEmail(this.checked)') > -1);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
