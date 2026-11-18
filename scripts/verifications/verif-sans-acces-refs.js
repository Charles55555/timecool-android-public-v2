// Chef, 18/11 : (1) « Lui envoyer la demande » vise la RÉFÉRENCE que le serveur rend (sans_acces_refs), pas un prénom : deux
// contacts « Alice », l'une lisible, l'autre non, ne se confondent plus ; une ancienne réponse sans références garde l'ancien
// chemin. (2) La notification du compte rendu est discrète : ni nom ni rendez-vous sur l'écran verrouillé, seulement
// « Charly a avancé : son compte rendu t’attend » ; rien si la page Charly IA est sous les yeux ; rien sans permission.
// Usage : node verif-sans-acces-refs.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + d : '')); };
function extraire(nom) {
  const d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  const debut = page.lastIndexOf('\n', d) + 1;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

// 1. Les références.
const envoyer = async function (g) {
  const envois = [];
  const ctx = {
    console, Promise, Array, String, JSON, Object,
    contactsList: [
      { name: 'Alice Martin', referenceCompte: 'REF_ALICE_LISIBLE' },
      { name: 'Alice Roux', referenceCompte: 'REF_ALICE_SANS' },
      { name: 'Chloé Durand', referenceCompte: 'REF_CHLOE' }
    ],
    charlyIA: { history: [{ role: 'assistant', content: 'Rendez-vous à plusieurs', _groupe: g }] },
    renderCharlyChat: function () {},
    tcTexteAttente: function () { return ''; },
    tcQuandSouhaite122: function () { return ''; },
    TC_BACKEND: { demanderRdv: async function (ref) { envois.push(ref); return { mode: 'messagerie' }; } }
  };
  vm.createContext(ctx);
  const code = [extraire('tcSansAccents') || "function tcSansAccents(t) { return String(t).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase(); }", extraire('tcDemandeSansAcces122')].join('\n');
  vm.runInContext(code, ctx);
  await ctx.tcDemandeSansAcces122(g.id);
  return { envois, etat: g.demandeSansAcces };
};

// 2. La notification.
const notifier = async function (opts) {
  const vues = [];
  const ctx = {
    currentPage: opts.page, document: { visibilityState: opts.visible ? 'visible' : 'hidden' }, String, Math, Date,
    window: {}
  };
  if (opts.android) {
    ctx.window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
      checkPermissions: async () => ({ display: opts.permis ? 'granted' : 'denied' }),
      schedule: async (o) => { o.notifications.forEach((x) => vues.push({ titre: x.title, corps: x.body })); }
    } } };
  } else {
    ctx.Notification = function (titre, o) { vues.push({ titre: titre, corps: o && o.body }); };
    ctx.Notification.permission = opts.permis ? 'granted' : 'denied';
  }
  vm.createContext(ctx);
  vm.runInContext(extraire('tcNotifierCompteRendu'), ctx);
  await ctx.tcNotifierCompteRendu(opts.texte);
  return vues;
};

(async () => {
  verifie('la page garde sansAccesRefs (réponse du serveur) dans la carte « Rendez-vous à plusieurs »', /sansAccesRefs: Array\.isArray\(r\.sans_acces_refs\) \? r\.sans_acces_refs : null/.test(page));
  const g1 = { id: 'g1', references: ['REF_ALICE_LISIBLE', 'REF_ALICE_SANS', 'REF_CHLOE'], invites: ['Alice', 'Chloé'], sansAcces: ['Alice'], sansAccesRefs: ['REF_ALICE_SANS'], options: null, type: 'physique' };
  const r1 = await envoyer(g1);
  verifie('deux « Alice » : la demande part à la seule Alice sans accès (sa référence), jamais à l’autre', JSON.stringify(r1.envois) === '["REF_ALICE_SANS"]' && r1.etat === 'fait', JSON.stringify(r1));
  const g2 = { id: 'g2', references: ['REF_ALICE_LISIBLE', 'REF_CHLOE'], invites: ['Alice'], sansAcces: ['Chloé'], sansAccesRefs: null, options: null, type: 'physique' };
  const r2 = await envoyer(g2);
  verifie('ancienne réponse sans références : le prénom sert encore (Chloé seule)', JSON.stringify(r2.envois) === '["REF_CHLOE"]', JSON.stringify(r2));

  const texte = 'Charly a avancé : son compte rendu t’attend';
  const appels = page.split('tcNotifierCompteRendu(').length - 1;
  verifie('un seul appel, avec le texte fixe (ni nom ni rendez-vous)', appels === 2 && page.indexOf("tcNotifierCompteRendu('" + texte + "')") > -1, appels + ' occurrence(s)');
  const n1 = await notifier({ page: 'calendar', visible: true, permis: true, texte });
  verifie('navigateur, permission donnée, hors de la page Charly IA : « TimeCool » / « ' + texte + ' »', n1.length === 1 && n1[0].titre === 'TimeCool' && n1[0].corps === texte, JSON.stringify(n1));
  const n2 = await notifier({ page: 'calendar', visible: true, permis: true, texte, android: true });
  verifie('Android, permission donnée : la même notification discrète', n2.length === 1 && n2[0].titre === 'TimeCool' && n2[0].corps === texte, JSON.stringify(n2));
  const n3 = await notifier({ page: 'assistant', visible: true, permis: true, texte });
  verifie('la page Charly IA sous les yeux : aucune notification', n3.length === 0, JSON.stringify(n3));
  const n4 = await notifier({ page: 'calendar', visible: true, permis: false, texte, android: true });
  const n5 = await notifier({ page: 'calendar', visible: true, permis: false, texte });
  verifie('sans permission (Android ou navigateur) : aucune notification', n4.length === 0 && n5.length === 0, JSON.stringify([n4, n5]));

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('  KO exception ' + (e && e.stack || e)); console.log((ko + 1) + ' anomalie(s) : ' + ok + ' vérifications'); process.exit(1); });
