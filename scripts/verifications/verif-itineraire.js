// Peut-on partir vers un rendez-vous depuis sa fiche ?
//
// Trois silences seraient possibles : une adresse contenant une
// apostrophe qui casserait le bouton, une position refusee qui
// laisserait « Calcul en cours… » pour toujours, et une ouverture
// bloquee sans un mot dans l'application Android.
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
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

titre('Le bouton « Y aller »');
{
  let ouverte = null;
  const ctx = {
    console, encodeURIComponent,
    tcOuvrirAilleurs: (u) => { ouverte = u; }
  };
  vm.createContext(ctx);
  const src = extraire('tcYAller');
  if (!src) { ko++; console.log('  KO  tcYAller introuvable'); }
  else {
    vm.runInContext(src, ctx);
    ctx.tcYAller('88 boulevard Victor Hugo, 92200 Neuilly-sur-Seine');
    verifie('il ouvre Google Maps sur l itineraire',
      ouverte && ouverte.indexOf('google.com/maps/dir/?api=1&destination=') > -1);
    verifie('l adresse est encodee',
      ouverte && ouverte.indexOf('88%20boulevard') > -1, (ouverte || '').slice(-60));

    ouverte = null;
    ctx.tcYAller('   ');
    verifie('une adresse vide n ouvre rien', ouverte === null);
    ouverte = null;
    ctx.tcYAller(null);
    verifie('une adresse absente non plus', ouverte === null);

    ouverte = null;
    ctx.tcYAller("12 rue de l'Église, Paris");
    verifie('une apostrophe ne casse rien',
      ouverte && ouverte.indexOf('%C3%89glise') > -1, (ouverte || '').slice(-50));
  }
}

titre('L ouverture passe par le bon chemin');
{
  const src = extraire('tcYAller');
  verifie('tcOuvrirAilleurs est utilise',
    src && src.indexOf('tcOuvrirAilleurs(url)') > -1,
    'un window.open ordinaire est bloque sans un mot dans l application');
  verifie('avec un repli si elle manque',
    src && src.indexOf("window.open(url, '_blank')") > -1);
}

titre('Le temps de trajet');
{
  const src = extraire('tcTempsDeTrajet');
  verifie('il reutilise l estimation existante',
    src && src.indexOf('tcEstimerTrajet(lieu)') > -1,
    'celle du bouton « Calculer trajet » de Charly');
  verifie('une position refusee est annoncee',
    src && src.indexOf('Position indisponible') > -1,
    'sinon « Calcul en cours… » resterait pour toujours');
  verifie('une adresse introuvable aussi',
    // Les accents sont ecrits en sequences d'echappement dans la
    // page : on cherche sur la partie sans accent.
    src && src.indexOf('Aucun itin') > -1);
  verifie('une erreur est montree, pas avalee',
    src && /catch \(err\)[\s\S]{0,200}err\.message/.test(src));
  verifie('le message d erreur est echappe',
    src && src.indexOf('escapeHTMLSafe(err.message') > -1);
}

titre('Les boutons n apparaissent qu avec une adresse');
verifie('ils vivent dans la branche du lieu',
  /\$\{e\.lieu \? `[\s\S]{0,900}tcYAller\(/.test(page),
  'un bouton mort sur les autres rendez-vous n apprendrait rien');
// JSON.stringify seul ne suffisait pas : ses guillemets doubles
// refermaient l'attribut. Ils doivent devenir &quot;.
verifie('les guillemets de l adresse sont neutralises',
  page.indexOf('JSON.stringify(e.lieu).replace(/"/g, &quot;)') === -1
  && page.split('replace(/\"/g').length - 1 >= 2,
  'sans cela le bouton s affiche et ne fait rien');
verifie('la zone de reponse existe', page.indexOf('id="emTrajet"') > -1);

titre('Rien n est demande sans raison');
{
  const src = extraire('tcYAller');
  verifie('« Y aller » ne demande aucune position',
    src && src.indexOf('tcObtenirPosition') === -1,
    'c est Maps qui la reclame, sur son ecran');
}
verifie('le calcul ne part que sur clic',
  page.indexOf('onclick="tcTempsDeTrajet(') > -1
  && !/openEventModal[\s\S]{0,2000}await tcTempsDeTrajet/.test(page),
  'chaque calcul coute et reclame la position');

titre('L attribut produit se relit comme un navigateur le ferait');
{
  // La page ecrit : onclick="tcYAller(${JSON.stringify(e.lieu)...})"
  // On rejoue cette construction, puis on relit l'attribut.
  const fabriquer = (lieu) =>
    'onclick="tcYAller(' + JSON.stringify(lieu).replace(/"/g, '&quot;') + ')"';

  const decoder = (t) => t.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  [
    '88 boulevard Victor Hugo, 92200 Neuilly-sur-Seine',
    "12 rue de l'Eglise, Paris",
    'Cabinet "Le Bon Soin", Lyon',
    'Rue des Fleurs & Jardins'
  ].forEach(function (adresse) {
    const attribut = fabriquer(adresse);
    // Un attribut valide n'a que deux guillemets : ceux qui le bornent.
    const guillemets = (attribut.match(/"/g) || []).length;
    verifie('« ' + adresse.slice(0, 26) + '… » tient dans l attribut',
      guillemets === 2, guillemets + ' guillemets - il doit y en avoir 2');

    // Ce que le navigateur passera a JavaScript, une fois decode.
    const code = decoder(attribut.slice('onclick="'.length, -1));
    let recu = null;
    try {
      new Function('tcYAller', code)(function (v) { recu = v; });
    } catch (e) { recu = 'ERREUR : ' + e.message; }
    verifie('et l adresse arrive entiere', recu === adresse, String(recu));
  });
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
