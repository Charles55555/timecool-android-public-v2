// Tirer vers le bas rafraichit-il, sans gener le reste ?
//
// Le risque n'est pas que le geste manque : c'est qu'il parte quand il
// ne faut pas. Un rafraichissement declenche au milieu d'une liste, ou
// pendant un glissement lateral de l'agenda, rendrait le defilement
// impraticable sans qu'on comprenne pourquoi.
//
// Les titres s'ecrivent sans echappement, et l'interligne se fait par
// un console.log vide : les sequences d'echappement ne survivent pas
// au trajet jusqu'au serveur.
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

/* -- Le geste, rejoue sur un faux document ----------------------- */
function scenario(pas, options) {
  options = options || {};
  const ecouteurs = {};
  let rafraichi = 0;
  const bandeau = { textContent: '', hidden: true, style: {}, id: 'tcTirer' };

  const ctx = {
    console, setTimeout: function () {}, Math,
    TC_TIRER_SEUIL: 70,
    _tirerDepart: null, _tirerZone: null, _tirerEnCours: false,
    getComputedStyle: () => ({ overflowY: 'auto' }),
    document: {
      _tirerInitialise: false,
      body: { appendChild() {} },
      readyState: 'complete',
      addEventListener: (n, f) => { ecouteurs[n] = f; },
      getElementById: (id) => (id === 'tcTirer' ? bandeau : null),
      querySelector: (sel) => (sel === '.modal-overlay.open' && options.fenetre ? {} : null),
      createElement: () => bandeau
    },
    tcRafraichirTout: function () { rafraichi++; }
  };
  vm.createContext(ctx);
  ['tcZoneDefilante', 'tcTirerBandeau', 'tcTirerCacher', 'tcInitTirerRafraichir']
    .forEach((n) => { const src = extraire(n); if (src) vm.runInContext(src, ctx); });
  ctx.tcInitTirerRafraichir();

  const zone = { scrollHeight: 2000, clientHeight: 500,
                 scrollTop: options.scrollTop || 0, parentElement: null };
  const cible = { scrollHeight: 0, clientHeight: 0, parentElement: zone };

  pas.forEach(function (p) {
    if (p.type === 'start') {
      ecouteurs.touchstart({ touches: [{ clientX: p.x, clientY: p.y }], target: cible });
    } else if (p.type === 'move') {
      if (p.scrollTop !== undefined) zone.scrollTop = p.scrollTop;
      ecouteurs.touchmove({ touches: [{ clientX: p.x, clientY: p.y }] });
    } else {
      ecouteurs.touchend({ changedTouches: [{ clientX: p.x, clientY: p.y }] });
    }
  });
  return { rafraichi: rafraichi, bandeau: bandeau };
}

titre('Le geste attendu');
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 150 },
    { type: 'move',  x: 200, y: 200 },
    { type: 'end',   x: 200, y: 200 }
  ]);
  verifie('tirer de 100 px rafraichit', r.rafraichi === 1, String(r.rafraichi));
}

titre('Ce qui ne doit rien declencher');
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 130 },
    { type: 'end',   x: 200, y: 130 }
  ]);
  verifie('un tirage trop court ne fait rien', r.rafraichi === 0,
    'sinon le moindre effleurement rafraichirait');
}
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'end',   x: 200, y: 20 }
  ]);
  verifie('remonter ne fait rien', r.rafraichi === 0);
}
{
  const r = scenario([
    { type: 'start', x: 100, y: 100 },
    { type: 'move',  x: 300, y: 140 },
    { type: 'end',   x: 300, y: 140 }
  ]);
  verifie('un glissement de biais ne fait rien', r.rafraichi === 0,
    'c est le geste qui change de semaine dans l agenda');
}
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 200 },
    { type: 'end',   x: 200, y: 200 }
  ], { scrollTop: 400 });
  verifie('au milieu d une liste, rien', r.rafraichi === 0,
    'tirer vers le bas doit y faire defiler');
}
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 200 },
    { type: 'end',   x: 200, y: 200 }
  ], { fenetre: true });
  verifie('par-dessus une fenetre ouverte, rien', r.rafraichi === 0);
}
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 150, scrollTop: 120 },
    { type: 'end',   x: 200, y: 220 }
  ]);
  verifie('un defilement en cours de route annule le geste', r.rafraichi === 0);
}

titre('Ce que le doigt voit');
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 140 }
  ]);
  verifie('avant le seuil : Tire pour actualiser',
    r.bandeau.textContent.indexOf('Tire pour') > -1, r.bandeau.textContent);
}
{
  const r = scenario([
    { type: 'start', x: 200, y: 100 },
    { type: 'move',  x: 200, y: 200 }
  ]);
  verifie('apres le seuil : Lache pour actualiser',
    r.bandeau.textContent.indexOf('che pour') > -1, r.bandeau.textContent);
}

titre('Ce que fait le rafraichissement');
{
  const src = extraire('tcRafraichirTout');
  verifie('il resynchronise', src && src.indexOf('tcSyncTour()') > -1);
  verifie('il ne recharge pas la page',
    src && src.indexOf('location.reload') === -1,
    'un rechargement ferait perdre ce qui est en cours de saisie');
  verifie('deux tirages a la suite n en lancent qu un',
    src && src.indexOf('if (_tirerEnCours) return;') > -1);
  verifie('il laisse la place au bandeau de mise a jour',
    src && src.indexOf("getElementById('tcBandeauMaj')") > -1);
}

titre('La bonne verification selon le support');
{
  const src = extraire('tcRafraichirTout');
  verifie('dans l application, la version de l APK',
    src && src.indexOf('checkForUpdates(false)') > -1,
    'celle du site s y arrete des sa premiere ligne');
  verifie('sur le site, celle du site',
    src && src.indexOf('tcVerifierMajWeb()') > -1);
  verifie('et jamais les deux a la fois',
    src && src.indexOf('if (dansApk) {') > -1 && src.indexOf('} else if') > -1,
    'deux bandeaux pour la meme annonce se recouvriraient');
  verifie('le support est reconnu par le pont natif',
    src && src.indexOf('window.TimeCoolNatif.telechargerEtInstallerMaj') > -1);
}

titre('Le geste du navigateur est neutralise');
verifie('overscroll-behavior-y sur les zones qui defilent',
  page.indexOf('overscroll-behavior-y: contain') > -1,
  'sinon Chrome rechargerait toute la page a notre place');

titre('Rien ne gene le defilement');
{
  const src = extraire('tcInitTirerRafraichir');
  const passifs = (src.match(/\{ passive: true \}/g) || []).length;
  verifie('les trois ecouteurs sont passifs', passifs === 3, passifs + ' sur 3');
  verifie('ils ne sont poses qu une fois',
    src && src.indexOf('if (document._tirerInitialise) return;') > -1);
}

titre('Apres le geste, un bandeau et un bouton');
{
  const src = extraire('tcRafraichirTout');
  verifie('la pastille fugace a disparu',
    src && src.indexOf('setTimeout(tcTirerCacher, 900)') === -1,
    'on tirait pour agir, et rien n etait offert');
  verifie('le meme bandeau que les mises a jour est reutilise',
    src && src.indexOf('tcAfficherBandeauMaj(') > -1);
  verifie('avec le bouton Recharger',
    src && src.indexOf("'" + 'Recharger' + "'") > -1);
  verifie('sa signature change a chaque tirage',
    src && src.indexOf('tirage-' + "'" + ' + Date.now()') > -1,
    'une croix cliquee une fois l aurait fait taire pour toujours');
  verifie('il ne passe pas devant une vraie mise a jour',
    src && src.indexOf('if (!maj || maj.hidden)') > -1);
}

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
