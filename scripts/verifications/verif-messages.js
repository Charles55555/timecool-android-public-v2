// Le bon message, dans la bonne forme, part-il vraiment ?
//
// Trois erreurs seraient invisibles a la lecture : un message qui ne
// part jamais (c'etait le cas de « decaler »), une variable qui reste
// affichee telle quelle -- « Bonjour [Prenom] » -- et un avocat
// tutoye parce que la forme a ete devinee au mauvais endroit.
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

let memoire = {};
const ctx = {
  console, String, Object, Array, Date, RegExp, isNaN,
  contactsList: [],
  localStorage: {
    getItem: (k) => (k in memoire ? memoire[k] : null),
    setItem: (k, v) => { memoire[k] = String(v); }
  },
  showToast: () => {},
  saveContacts: () => {},
  escapeHTMLSafe: (t) => String(t == null ? '' : t)
};
vm.createContext(ctx);
[/const TC_MSG_ACTIONS = \[[\s\S]*?\];/,
 /const TC_MSG_MODELES = \{[\s\S]*?\n\};/,
 /const TC_TITRES_VOUVOIEMENT = [^\n]+/,
 /const TC_CATEGORIES_VOUVOIEMENT = [^\n]+/].forEach((re) => {
  const m = page.match(re);
  if (m) vm.runInContext(m[0].replace('const ', 'var '), ctx);
  else { ko++; console.log('  KO  bloc introuvable : ' + re); }
});
['tcCleModele', 'tcModeleMessage', 'tcVouvoiement', 'tcVouvoiementDeduit',
 'tcRemplirModele', 'tcValeursDuRdv', 'tcBoutonsVouvoiement'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Trois messages, un par action');
{
  verifie('retard, annule, decale', ctx.TC_MSG_ACTIONS.join() === 'retard,annule,decale',
    ctx.TC_MSG_ACTIONS.join(' / '));
  ctx.TC_MSG_ACTIONS.forEach((a) => {
    const m = ctx.TC_MSG_MODELES[a];
    verifie('« ' + m.titre +' » existe dans les deux formes',
      !!m.tu && !!m.vous && m.tu !== m.vous,
      'aucune conjugaison automatique : les deux textes sont ecrits');
  });
}

titre('Les deux formes ne disent pas la meme chose');
{
  memoire = {};
  const retardTu = ctx.tcModeleMessage('retard', false);
  const retardVous = ctx.tcModeleMessage('retard', true);
  verifie('le tutoiement tutoie', /\bte\b|\bta\b/.test(retardTu), retardTu.slice(0, 50));
  verifie('le vouvoiement vouvoie', /\bvous\b|\bvotre\b/.test(retardVous), retardVous.slice(0, 50));
  verifie('et le vouvoiement ne tutoie pas',
    !/\bje te\b|\bta patience\b/.test(retardVous),
    'un avocat tutoye, ca se remarque');
}

titre('Un texte personnalise remplace le modele');
{
  memoire = {};
  memoire[ctx.tcCleModele('annule', 'vous')] = 'Mon texte a moi.';
  verifie('la forme modifiee est servie',
    ctx.tcModeleMessage('annule', true) === 'Mon texte a moi.');
  verifie('et l autre forme reste celle d origine',
    ctx.tcModeleMessage('annule', false) === ctx.TC_MSG_MODELES.annule.tu,
    'ecrire le vouvoiement ne doit pas effacer le tutoiement');
  memoire[ctx.tcCleModele('annule', 'vous')] = '   ';
  verifie('un champ vide retombe sur le modele',
    ctx.tcModeleMessage('annule', true) === ctx.TC_MSG_MODELES.annule.vous,
    'sinon un message vide partirait');
}

titre('Qui tutoie-t-on, qui vouvoie-t-on ?');
{
  verifie('un titre fait vouvoyer',
    ctx.tcVouvoiement({ name: 'Dr Benali' }) === true);
  verifie('« Maitre » aussi', ctx.tcVouvoiement({ name: 'Maître Ayache' }) === true);
  verifie('et « Mme »', ctx.tcVouvoiement({ name: 'Mme Dupont' }) === true);
  verifie('la categorie travail aussi',
    ctx.tcVouvoiement({ name: 'Paul', cats: ['travail'] }) === true);
  verifie('la sante aussi',
    ctx.tcVouvoiement({ name: 'Paul', cat: 'sante' }) === true);
  verifie('mais la famille non',
    ctx.tcVouvoiement({ name: 'Maman', cats: ['famille'] }) === false);
  verifie('ni le sport', ctx.tcVouvoiement({ name: 'Enzo', cats: ['sport'] }) === false);
  verifie('dans le doute, on tutoie',
    ctx.tcVouvoiement({ name: 'Michel' }) === false,
    'c est le cas le plus frequent, et le message est relu avant de partir');
  verifie('un choix explicite prime sur tout',
    ctx.tcVouvoiement({ name: 'Dr Benali', vouvoie: false }) === false,
    'meme contre le titre : c est l utilisateur qui sait');
  verifie('et sans contact, rien ne casse', ctx.tcVouvoiement(null) === false);
  verifie('« Michelle » n est pas un titre',
    ctx.tcVouvoiementDeduit({ name: 'Michelle Blanc' }) === false,
    'le titre doit etre un mot entier');
}

titre('Les variables sont remplacees');
{
  const ev = { date: '2026-10-15', startH: 18, startM: 0 };
  const v = ctx.tcValeursDuRdv('William Ayache', ev);
  verifie('le prenom seul est pris', v['[Prénom]'] === 'William',
    'ecrire « Bonjour William Ayache » sonne comme un courrier administratif');
  verifie('la date est lisible', /octobre/.test(v['[date]']), v['[date]']);
  verifie('et l heure aussi', v['[heure]'] === '18h00', v['[heure]']);

  const texte = ctx.tcRemplirModele(
    'Bonjour [Prénom], rendez-vous du [date] à [heure].', v);
  verifie('plus aucun crochet ne subsiste', texte.indexOf('[') === -1, texte);
  verifie('la meme variable deux fois est remplacee deux fois',
    ctx.tcRemplirModele('[Prénom] et [Prénom]', v) === 'William et William');
  verifie('sans rendez-vous, seul le prenom est connu',
    !ctx.tcValeursDuRdv('Paul', null)['[date]'],
    'un retard se signale aussi sans rendez-vous en vue');
}

titre('Le message complet, de bout en bout');
{
  memoire = {};
  const avocat = { id: 'c1', name: 'Maître Ayache' };
  const texte = ctx.tcRemplirModele(
    ctx.tcModeleMessage('retard', ctx.tcVouvoiement(avocat)),
    { '[Prénom]': 'Maître', '[minutes]': '10' });
  verifie('l avocat est vouvoye', /vous/.test(texte), texte);
  verifie('les minutes sont dedans', texte.indexOf('10') > -1);
  verifie('et aucune variable ne reste', texte.indexOf('[') === -1);
}

titre('Les boutons de la fiche contact');
{
  const html = ctx.tcBoutonsVouvoiement({ id: 'c1', name: 'Dr Benali' });
  verifie('les deux choix sont proposes',
    html.indexOf('>tu<') > -1 && html.indexOf('>vous<') > -1);
  verifie('« vous » est actif pour un docteur',
    html.indexOf('tcDefinirVouvoiement(\'c1\', true)') > -1
    && html.split('>vous<')[0].lastIndexOf('var(--g-blue); color:#fff') > html.split('>tu<')[0].lastIndexOf('var(--g-blue); color:#fff'),
    'le bouton actif doit etre celui qui correspond');
  verifie('le clic n ouvre pas la fiche derriere',
    html.indexOf('event.stopPropagation()') > -1);
}

titre('Ce qui est branche dans les ecrans');
{
  verifie('« je decale » envoie enfin un message',
    /async function prevenirDecaler\(\)[\s\S]{0,700}tcTransmettrePrevenance/.test(page),
    '« Modifier l heure » ne prevenait personne');
  verifie('et ouvre l ecran de modification ensuite',
    /prevenirDecaler[\s\S]{0,900}openEditEventModal\(\)/.test(page));
  verifie('« j annule » supprime le rendez-vous',
    /async function prevenirAnnuler\(\)[\s\S]{0,600}events\.splice/.test(page));
  verifie('le retard est montre avant de partir',
    /confirmerRetard[\s\S]{0,700}await tcConfirm/.test(page),
    'il etait le seul a s envoyer sans avoir ete lu');
  verifie('plus aucune decoupe par expression reguliere',
    page.indexOf('Je te recontacte prochainement[^.]*') === -1
    && page.indexOf("getMsgTemplate") === -1,
    'une reformulation de l utilisateur faisait rater la decoupe');
  verifie('le champ mort a disparu',
    page.indexOf('tcMsgTemplateReact') === -1,
    'il etait affiche, modifiable, et utilise nulle part');
  verifie('les trois champs s affichent dans les parametres',
    page.indexOf('function tcRendreModelesMessages()') > -1
    && page.indexOf('tcChoisirFormeMessages(_tcFormeAffichee)') > -1);
  verifie('et la fiche contact porte le choix',
    page.indexOf('tcBoutonsVouvoiement(c)') > -1);
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
