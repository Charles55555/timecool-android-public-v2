// La page d'aide repond-elle, et sa recherche trouve-t-elle ?
//
// Huit sujets ont ete ajoutes le 03/10 : Google Agenda, temps de
// trajet, messages de retard, contact du rendez-vous, creneaux
// proposes, rappels, mise a jour, cout de l'IA. Avec seize questions,
// la liste ne se parcourt plus a l'oeil : un champ de recherche les
// filtre.
//
// Ce qu'on verifie ici, c'est ce qui casserait sans bruit : une
// question sans reponse, un accent qui empeche de trouver, un bloc
// masque qui reste ouvert et reapparait deplie, ou le message
// « aucune reponse » qui ne revient jamais.
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
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

titre('Les questions et leurs reponses');
// La liste vit dans renderHelp ; on l'extrait et on l'execute, plutot
// que de recopier ici seize libelles qui vieilliraient tout seuls.
const src = extraire('renderHelp');
let faq = [];
if (!src) {
  ko++; console.log('  KO  renderHelp introuvable');
} else {
  const debut = src.indexOf('const faq = [');
  const fin = src.indexOf('\n  ];', debut);
  const ctx = { faq: null };
  vm.createContext(ctx);
  vm.runInContext(src.slice(debut, fin + 5).replace('const faq', 'faq'), ctx);
  faq = ctx.faq || [];
}

verifie('seize questions', faq.length === 16, 'huit d origine, huit ajoutees ; trouve ' + faq.length);
verifie('aucune question sans reponse',
  faq.every((f) => f && typeof f.q === 'string' && f.q.trim() && typeof f.a === 'string' && f.a.trim()));
verifie('aucune question en double',
  new Set(faq.map((f) => f.q)).size === faq.length);

titre('Les huit sujets ajoutes sont bien la');
[['Google Agenda', /Google Agenda/], ['temps de trajet', /trajet/i], ['retard', /retard/i],
 ['contact du rendez-vous', /contact/i], ['creneaux', /créneaux/i], ['rappels', /rappels/i],
 ['mise a jour', /met-elle à jour/i], ['cout de l IA', /coûte/i]
].forEach(([nom, motif]) => {
  verifie(nom, faq.some((f) => motif.test(f.q)));
});

titre('Rien ne promet ce qui n existe pas');
// La synchronisation multi-appareils et la suppression de compte ne
// sont pas faites. Une aide qui les annonce se retourne contre nous.
const tout = faq.map((f) => f.q + ' ' + f.a).join(' ');
verifie('rien sur la synchronisation multi-appareils', !/plusieurs appareils|multi-appareils/i.test(tout));
verifie('rien sur la suppression de compte', !/supprimer (mon|ton) compte/i.test(tout));

titre('Les deux reponses corrigees le restent');
// Corrigees le 03/10. Elles ne cassaient rien, elles mentaient
// seulement — c'est pour ca qu'elles avaient survecu si longtemps.
{
  const vie = faq.find((f) => /privées/i.test(f.q));
  const charly = faq.find((f) => /activer Charly/i.test(f.q));

  verifie('la vie privee ne dit plus que rien ne part',
    vie && !/ne sont pas envoyées/i.test(vie.a),
    'le serveur conserve les rendez-vous ; l affirmer faux est indefendable');
  verifie('elle dit ou les rendez-vous sont conserves',
    vie && /serveurs de TimeCool/i.test(vie.a));
  verifie('elle ne nomme plus OpenAI seul',
    vie && !/OpenAI/i.test(vie.a),
    'l application appelle aussi Anthropic');

  verifie('activer Charly ne reclame plus de cle',
    charly && !/Saisis ta clé/i.test(charly.a),
    'c est TimeCool qui paie l IA pour tout le monde');
  verifie('elle dit qu il est deja actif',
    charly && /déjà actif/i.test(charly.a));
}

titre('Le champ de recherche existe');
verifie('le champ est dans la page', page.indexOf('id="tcAideRecherche"') > -1);
verifie('il appelle le filtre', page.indexOf('oninput="tcFiltrerAide(this.value)"') > -1);
verifie('le message « aucune reponse » existe', page.indexOf('id="tcAideAucun"') > -1);
verifie('chaque bloc porte le marqueur', page.indexOf('<details data-aide ') > -1);

titre('La recherche trouve pour de vrai');
{
  const filtre = extraire('tcFiltrerAide');
  const accents = extraire('tcSansAccents');
  if (!filtre || !accents) {
    ko++; console.log('  KO  tcFiltrerAide ou tcSansAccents introuvable');
  } else {
    // Un faux ecran : un bloc par question, avec son vrai texte.
    const blocs = faq.map((f) => ({
      textContent: f.q + ' ' + f.a, style: { display: '' }, open: true
    }));
    const aucun = { style: { display: 'none' } };
    const ctx = {
      console,
      document: {
        querySelectorAll: () => blocs,
        getElementById: (id) => (id === 'tcAideAucun' ? aucun : null)
      }
    };
    vm.createContext(ctx);
    vm.runInContext(accents + '\n' + filtre, ctx);

    const visibles = () => blocs.filter((b) => b.style.display !== 'none').length;

    // On verifie QUI ressort, pas combien : « google » touche aussi la
    // reponse sur la vie privee, qui parle de la recopie vers Google
    // Agenda. Compter aurait fait echouer le test a chaque fois qu'une
    // reponse mentionne le mot, ce qui est legitime.
    ctx.tcFiltrerAide('google');
    verifie('« google » fait ressortir la question Google Agenda',
      blocs.some((b) => b.style.display !== 'none' && /se synchronise-t-il avec Google Agenda/.test(b.textContent)));
    verifie('et ecarte celles qui n en parlent pas',
      blocs.some((b) => b.style.display === 'none'));

    ctx.tcFiltrerAide('creneau');
    verifie('« creneau » sans accent trouve « créneaux »', visibles() >= 1,
      'sinon il faut taper les accents a la main sur un telephone');

    ctx.tcFiltrerAide('  RETARD  ');
    verifie('les majuscules et les espaces ne genent pas', visibles() >= 1);

    ctx.tcFiltrerAide('xyzxyz');
    verifie('une recherche sans resultat masque tout', visibles() === 0);
    verifie('et affiche le message', aucun.style.display === 'block');
    verifie('un bloc masque se referme', blocs.every((b) => b.open === false),
      'sinon il reapparait deplie en effacant la recherche');

    ctx.tcFiltrerAide('');
    verifie('effacer la recherche rend les seize questions', visibles() === 16);
    verifie('et cache le message', aucun.style.display === 'none');
  }
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
