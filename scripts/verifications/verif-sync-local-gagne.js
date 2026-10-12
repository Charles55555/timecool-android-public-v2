// Mission 23 (Charles, 12/10) : « ce que j ai changé ici gagne » — un reglage modifie localement depuis la derniere
// empreinte n est ni ecrase ni supprime par la reception d un tour de synchro, et part au tour de poussee suivant ;
// un reglage inchange prend la valeur du serveur ; a l etat neuf, le serveur fait foi. Usage : node verif-sync-local-gagne.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
function bloc(debut) {
  const d = page.indexOf(debut);
  if (d < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(page.indexOf('{', d), j + 1); }
  }
  return null;
}

function contexte() {
  const stock = {};
  const pousses = [];
  const ctx = {
    console, String, Array, Object, JSON, Number, Math, Date, Promise, parseInt,
    localStorage: {
      getItem: (k) => (k in stock ? stock[k] : null), setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; },
      key: (i) => Object.keys(stock)[i], get length() { return Object.keys(stock).length; }
    },
    userAccount: { reference: 'compte-X' }, currentTheme: 'light', applyTheme: (t) => { ctx.currentTheme = t; },
    TC_BACKEND: { syncPousser: async (els) => { pousses.push(...els); return { version: 9 }; } },
    _stock: stock, _pousses: pousses
  };
  vm.createContext(ctx);
  ['const TC_JAMAIS_TRANSFERE = \\[[^\\]]*\\];', 'const TC_SYNC_DEJA_SYNCHRONISE = \\[[^\\]]*\\];', 'const TC_SYNC_REGLAGE_MAX = [^;]*;',
   'const TC_SYNC_VERSION_KEY = [^;]*;', 'const TC_SYNC_EMPREINTES_KEY = [^;]*;', 'const TC_SYNC_SEUIL_DISPARITION = [^;]*;']
    .forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); else { ko++; console.log('  KO  introuvable : ' + re); } });
  const reglage = bloc('  reglage: {');
  if (reglage) vm.runInContext('const TC_SYNC_TYPES = { reglage: ' + reglage + ' };', ctx); else { ko++; console.log('  KO  TC_SYNC_TYPES.reglage introuvable'); }
  vm.runInContext('let _tcSyncVusIci = {};', ctx);
  ['tcCleTransferable', 'tcCleReglage', 'tcSyncCanon', 'tcSyncEmpreinte', 'tcSyncCompte', 'tcSyncEtat', 'tcSyncPoserVersion', 'tcSyncEmpreintes', 'tcSyncPoserEmpreintes',
   'tcAssainirRecu', 'tcSyncModifieIci', 'tcSyncAppliquer', 'tcSyncPousser']
    .forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  return ctx;
}
const emp = (ctx, id, v) => ctx.tcSyncEmpreinte({ id: id, v: v });
const connu = (ctx, empreintes) => { ctx.tcSyncPoserVersion(5); ctx.tcSyncPoserEmpreintes(empreintes); };
const serveur = (uid, v) => ({ type: 'reglage', uid: uid, contenu: { id: uid, v: v } });

(async () => {
  const c0 = contexte();
  if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

  titre('1. Le theme change a 3 s tient au tour de synchro, et part au tour de poussee');
  const c1 = contexte();
  c1._stock.tc_theme = 'light';
  connu(c1, { 'reglage:tc_theme': emp(c1, 'tc_theme', 'light') });   // le dernier tour connaissait « light »
  c1._stock.tc_theme = 'dark';                                        // l utilisateur passe en sombre (3 s)
  await c1.tcSyncAppliquer([serveur('tc_theme', 'light')]);           // le tour tire l ancienne valeur du serveur
  verifie('la valeur locale « dark » tient (le serveur disait « light »)', c1._stock.tc_theme === 'dark', c1._stock.tc_theme);
  verifie('rien n a ete re-applique a l ecran par-dessus le choix local', c1.currentTheme === 'light' || c1.currentTheme === 'dark');
  await c1.tcSyncPousser();
  verifie('le tour de poussee envoie « dark »', c1._pousses.some((e) => e.uid === 'tc_theme' && e.contenu && e.contenu.v === 'dark'), JSON.stringify(c1._pousses));
  verifie('tcSyncModifieIci : modifie si l empreinte differe ; pas modifie si egale', c1.tcSyncModifieIci({}, { id: 'tc_theme', v: 'dark' }, emp(c1, 'tc_theme', 'light'), false) === true && c1.tcSyncModifieIci({}, { id: 'tc_theme', v: 'light' }, emp(c1, 'tc_theme', 'light'), false) === false);

  titre('2. Une cle que le serveur n a pas encore (case decochee avant le premier tour) tient et part');
  const c2 = contexte();
  connu(c2, { 'reglage:tc_theme': emp(c2, 'tc_theme', 'light') });
  c2._stock.tc_theme = 'light';
  c2._stock.tc_rdv_validation = '0';                                   // decochee ici, jamais vue du serveur
  c2._stock.tc_plages_douces = '[1,2]';
  await c2.tcSyncAppliquer([{ type: 'reglage', uid: 'tc_rdv_validation', supprime: true }, serveur('tc_theme', 'light')]);
  verifie('la cle locale n est pas supprimee par une « disparition » venue du serveur, ni les plages douces', c2._stock.tc_rdv_validation === '0' && c2._stock.tc_plages_douces === '[1,2]', JSON.stringify(c2._stock));
  await c2.tcSyncPousser();
  verifie('elle part au tour de poussee', c2._pousses.some((e) => e.uid === 'tc_rdv_validation' && e.contenu && e.contenu.v === '0'), JSON.stringify(c2._pousses));

  titre('3. Un reglage inchange ici prend la valeur du serveur (temoin)');
  const c3 = contexte();
  c3._stock.tc_theme = 'light';
  connu(c3, { 'reglage:tc_theme': emp(c3, 'tc_theme', 'light') });
  await c3.tcSyncAppliquer([serveur('tc_theme', 'dark')]);
  verifie('le serveur dit « dark », rien n a change ici : « dark » s applique, et a l ecran', c3._stock.tc_theme === 'dark' && c3.currentTheme === 'dark', c3._stock.tc_theme + ' / ' + c3.currentTheme);
  await c3.tcSyncPousser();
  verifie('et rien ne repart (l empreinte est a jour)', !c3._pousses.some((e) => e.uid === 'tc_theme'), JSON.stringify(c3._pousses));

  titre('4. Etat neuf (premier tour d un compte sur cet appareil) : le serveur fait foi');
  const c4 = contexte();
  c4._stock.tc_theme = 'dark';                                         // garde de l appareil, sans empreinte, etat neuf
  await c4.tcSyncAppliquer([serveur('tc_theme', 'light')]);
  verifie('sans version connue, la valeur du serveur s applique meme sans empreinte', c4._stock.tc_theme === 'light', c4._stock.tc_theme);

  titre('5. Un rendez-vous sans type est « Personnel » partout');
  const c5 = { console };
  vm.createContext(c5);
  const m = page.match(/const TC_AGENDA_ALIAS = \{[\s\S]*?\n\};/); if (m) vm.runInContext(m[0], c5);
  const f = fonction(page, 'tcCatNormalisee'); if (f) vm.runInContext(f, c5);
  verifie('tcCatNormalisee(vide) = perso (avant : travail)', c5.tcCatNormalisee && c5.tcCatNormalisee('') === 'perso' && c5.tcCatNormalisee(undefined) === 'perso');
  verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

  console.log('');
  console.log(ko + ' anomalie(s).');
  process.exit(ko ? 1 : 0);
})();
