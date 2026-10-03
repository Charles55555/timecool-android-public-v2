// Une question posee par Charly ne doit pas avaler tout ce qui suit.
//
// Capture du 03/10 : « qui est-ce ? » pose, chaque message suivant
// etait pris pour un nom et cherche dans le carnet. « Note-le sans
// contact » en toutes lettres restait incompris. « Enleve-moi les
// samedis » etait perdu. Et la question n'avait pas lieu d'etre : un
// lycee n'a pas de prenom.
//
// On execute les vraies fonctions sur un faux carnet, et on regarde
// trois choses : ce qui est pris pour une reponse, ce qui est laisse
// passer, et ce qui n'est jamais demande.
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
function extraireConst(nom) {
  const debut = page.indexOf('const ' + nom + ' = [');
  if (debut < 0) return null;
  return page.slice(debut, page.indexOf('];', debut) + 2);
}

/* Le faux carnet, et ce qu'on observe. */
const carnet = [{ id: 'c1', name: 'Michel Dupont' }, { id: 'c2', name: 'Lycée Pasteur' }];
let pousses = [];
let retenus = [];
let rendus = 0;

const ctx = {
  console, String, Array, RegExp, JSON,
  contactsList: carnet,
  charlyIA: { history: [] },
  // Ce qu'on remplace par du simple : la recherche fait un contient.
  tcResoudreContact: (nom) => {
    const q = ctx.tcSansAccents(nom);
    return q ? carnet.filter((c) => ctx.tcSansAccents(c.name).indexOf(q) > -1) : [];
  },
  tcSurnoms: () => ({}),
  tcCleSurnom: (d) => ctx.tcSansAccents(d),
  tcContactDuSurnom: () => null,
  tcRetenirSurnom: (nom, id) => retenus.push([nom, id]),
  tcPousserMessageUtilisateur: (t) => pousses.push(t),
  renderCharlyChat: () => { rendus++; },
  tcChoisirContactProposition: () => {},
  document: { getElementById: () => null },
  escapeHTMLSafe: (t) => String(t)
};
vm.createContext(ctx);

['TC_LIEUX', 'TC_VERBES_DE_DEMANDE'].forEach((n) => {
  const src = extraireConst(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});
['tcSansAccents', 'tcEstUnLieu', 'tcRessembleAUneDemande', 'tcDitSansContact',
 'tcPistesDeRecherche', 'tcSurnomRefuse', 'tcDesignationDuMessage', 'tcDesignationPour',
 'tcContactDeProposition', 'tcAttenteContact', 'tcRepondreQuiEstCe'
].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  ' + n + ' introuvable'); }
});

titre('Un lieu n est pas quelqu un');
verifie('« Lycée - Cité Scolaire Pasteur » est un lieu', ctx.tcEstUnLieu('Lycée - Cité Scolaire Pasteur'));
verifie('« la mairie » aussi', ctx.tcEstUnLieu('la mairie'));
verifie('« chez Ikea »… « Ikea » aussi', ctx.tcEstUnLieu('Ikea'));
verifie('« mon ostéopathe » reste quelqu un', !ctx.tcEstUnLieu('mon ostéopathe'));
verifie('« Michel » reste quelqu un', !ctx.tcEstUnLieu('Michel'));
verifie('« Lycette Martin » n est pas un lieu', !ctx.tcEstUnLieu('Lycette Martin'),
  'le prefixe « lyc » ne suffit pas, il faut le mot entier');

titre('Un lieu ne declenche pas la question');
{
  const msg = { role: 'assistant', content: '' };
  const attente = ctx.tcAttenteContact(msg, [{ contact: 'Lycée - Cité Scolaire Pasteur' }]);
  verifie('rien n est demande pour le lycee', attente === null, 'avant : « Qui est Lycée - Cité Scolaire Pasteur ? »');
  const attente2 = ctx.tcAttenteContact(msg, [{ contact: 'Robert' }]);
  verifie('mais on demande toujours pour « Robert »', attente2 === 'Robert');
}

titre('Ce qui ressemble a une demande, et ce qui ressemble a un nom');
verifie('« enlève-moi les samedis » est une demande', ctx.tcRessembleAUneDemande('enlève-moi les samedis'));
verifie('une phrase de cinq mots ou plus est une demande',
  ctx.tcRessembleAUneDemande('J\'ai oublié de te préciser mais pour chercher les enfants'));
verifie('« Michel » est un nom', !ctx.tcRessembleAUneDemande('Michel'));
verifie('« Michel Dupont » est un nom', !ctx.tcRessembleAUneDemande('Michel Dupont'));
verifie('« c\'est mon ostéopathe » est un nom', !ctx.tcRessembleAUneDemande('c\'est mon ostéopathe'),
  'quatre mots, aucun verbe d ordre');

titre('Dire « sans contact » en toutes lettres');
verifie('« note-le sans contact »', ctx.tcDitSansContact('note-le sans contact'));
verifie('la phrase exacte de la capture',
  ctx.tcDitSansContact('Note le dans le champs contact meme s\'il ne se trouve pas dans mes contacts'));
verifie('« quand même »', ctx.tcDitSansContact('note le rendez-vous quand même'));
verifie('« Michel » ne dit pas sans contact', !ctx.tcDitSansContact('Michel'));

/* Un echange complet : la question attend sa reponse. */
function nouvelleAttente(nom) {
  const msg = { role: 'assistant', content: '', _sansContact: null, _contacts: null };
  ctx.charlyIA.history = [{ role: 'user', content: 'rdv avec ' + nom }, msg];
  ctx.tcAttenteContactEnCours = () => ({ msg, nom });
  pousses = []; retenus = []; rendus = 0;
  return msg;
}
async function repondre(texte) { return ctx.tcRepondreQuiEstCe(texte); }

(async () => {
  titre('Une autre demande n est pas avalee');
  {
    const msg = nouvelleAttente('Robert');
    const pris = await repondre('J\'ai oublié de te préciser mais pour chercher les enfants à l\'école enlève-moi le samedi');
    verifie('le message n est pas pris pour une reponse', pris === false, 'avant : « je ne trouve personne »');
    verifie('il n est pas pousse dans l historique ici', pousses.length === 0, 'sinon il apparaitrait deux fois');
    verifie('rien n a ete decide sur le contact', !msg._sansContact && !msg._contacts);
    verifie('l historique est intact', ctx.charlyIA.history.length === 2);
  }
  {
    nouvelleAttente('Robert');
    const pris = await repondre('Enlève les samedis');
    verifie('deux mots, mais un verbe d ordre : laisse passer', pris === false);
  }

  titre('« Sans contact » en toutes lettres fait ce que fait le bouton');
  {
    const msg = nouvelleAttente('Robert');
    const pris = await repondre('Note le dans le champs contact meme s\'il ne se trouve pas dans mes contacts');
    verifie('le message est pris', pris === true);
    verifie('le rendez-vous est note sans contact', msg._sansContact && msg._sansContact['robert'] === true);
    verifie('et retenu comme tel', retenus.some((r) => r[0] === 'Robert' && r[1] === false),
      'sinon la question reviendrait la semaine suivante');
    verifie('Charly le dit', ctx.charlyIA.history.some((m) => m.role === 'system_info' && /sans contact/.test(m.content)));
    verifie('le message de l utilisateur est pousse une fois', pousses.length === 1);
  }

  titre('Un vrai nom est toujours relie');
  {
    const msg = nouvelleAttente('Michel');
    const pris = await repondre('Michel Dupont');
    verifie('pris', pris === true);
    verifie('relie au bon contact', msg._contacts && msg._contacts['michel'] === 'c1');
  }

  titre('Un nom inconnu, court, reste traite comme avant');
  {
    nouvelleAttente('Robert');
    const pris = await repondre('Zorglub');
    verifie('pris', pris === true);
    verifie('Charly dit qu il ne trouve personne',
      ctx.charlyIA.history.some((m) => m.role === 'system_info' && /ne trouve personne/.test(m.content)));
  }

  titre('L appelant laisse passer ce qui n a pas ete pris');
  {
    const src = extraire('charlySendMessage') || '';
    verifie('il lit le resultat de tcRepondreQuiEstCe', /const pris = await tcRepondreQuiEstCe\(text\)/.test(src));
    verifie('et ne s arrete que si le message a ete pris', /if \(pris\) return;/.test(src),
      'un « return » inconditionnel avalait tout');
  }

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
