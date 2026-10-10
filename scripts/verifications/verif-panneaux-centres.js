// 10/10 : (1) « Choisir qui peut me déranger quand même » sous « Mon temps libre » et dans la
// fenêtre d'une plage ; (2) TOUT panneau s'ouvre au centre de l'écran, bords arrondis, marge
// d'au moins 16 px, défilement À L'INTÉRIEUR du panneau, plus rien ne monte du bas.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
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
const regle = (sel) => { const m = page.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };

titre('1. Les panneaux partages (CSS)');
const cssPanneaux = [['.modal-overlay', 'fiche rendez-vous, creation, groupe, client'], ['.msg-sheet-ov', 'Prevenir, Avec qui ?, contacts, messagerie (feuilles)']];
cssPanneaux.forEach(([sel, qui]) => {
  const r = regle(sel);
  verifie(sel + ' : centre verticalement et horizontalement (' + qui + ')', /align-items:center/.test(r) && /justify-content:center/.test(r) && !/flex-end/.test(r), r.trim().slice(0, 140));
  const p = Number((r.match(/padding:(\d+)px/) || [])[1]);
  verifie(sel + ' : marge d au moins 16 px autour', p >= 16, p + ' px');
  verifie(sel + ' : la page derriere ne defile pas avec le panneau (overscroll-behavior:contain)', /overscroll-behavior:contain/.test(r));
});
[['.modal', 'modal'], ['.msg-sheet', 'feuille']].forEach(([sel]) => {
  const r = regle(sel);
  verifie(sel + ' : bords arrondis sur les quatre coins', /border-radius:\d+px;/.test(r) && !/border-radius:\d+px \d+px 0 0/.test(r), (r.match(/border-radius:[^;]*/) || [''])[0]);
  verifie(sel + ' : plus haut que l ecran = defile dans le panneau (max-height 90 % + overflow-y:auto)', /max-height:90vh/.test(r) && /overflow-y:auto/.test(r) && /overscroll-behavior:contain/.test(r));
  verifie(sel + ' : largeur plafonnee, centree', /max-width:\d+px/.test(r) && /width:100%/.test(r));
  verifie(sel + ' : ouverture en fondu simple', /animation:tcFondu/.test(r));
});
verifie('plus aucune animation « monte du bas » (slideUp, tcSheetUp, translateY(100%))', !/slideUp|tcSheetUp|translateY\(100%\)/.test(page));
verifie('le fondu existe', /@keyframes tcFondu \{ from\{opacity:0;\} to\{opacity:1;\} \}/.test(page));
verifie('la poignee de feuille (decor du bas d ecran) n est plus affichee', /\.modal-handle \{ display:none; \}/.test(page));
verifie('le panneau de confirmation / d alerte (tcConfirm, tcAlert) : centre, 90 %, defile dedans', /\.tc-mod-ov \{[^}]*align-items:center[^}]*justify-content:center[^}]*padding:24px/.test(page) && /\.tc-mod \{[^}]*max-height:90vh[^}]*overflow-y:auto/.test(page));

titre('2. Les panneaux ecrits en ligne (JS et HTML)');
const ov = (re, nom) => {
  const m = page.match(re);
  verifie(nom + ' : present', !!m);
  return m ? m[0] : '';
};
const centre = (s) => /align-items:\s*center/.test(s) && /justify-content:\s*center/.test(s) && !/align-items:\s*flex-end/.test(s);
const marge = (s) => Number((s.match(/padding:\s*(\d+)px/) || [])[1]) >= 16;
[
  ['fenetre de creneau de la messagerie (tcProposerCreneauRdv)', /o\.id = 'tcCreneauRdvOverlay';\s*\n\s*o\.style\.cssText = '[^']*';/],
  ['fenetre d ajout / modification d une plage (openDispoForm)', /overlay\.id = 'dispoFormOverlay';\s*\n\s*overlay\.style\.cssText = '[^']*';/],
  ['choix de l indicatif du pays', /ov\.id = 'phoneCountryOverlay';\s*\n\s*ov\.style\.cssText = '[^']*';/],
  ['choix de la langue', /overlay\.id = 'langModalOverlay';\s*\n\s*overlay\.style\.cssText = '[^']*';/],
  ['parametres (modale)', /<div id="settingsModalOverlay"[^\n]*/],
  ['fenetre « C\'est ouvert, en douceur » / « Tu es protege »', /o\.id = 'tcOuvertureDouceOverlay';\s*\n\s*o\.style\.cssText = '[^']*';/],
  ['connexion Google (bouton de secours)', /overlay\.id = 'googleSignInOverlay';\s*\n\s*overlay\.style\.cssText = '[^']*';/],
].forEach(([nom, re]) => {
  const s = ov(re, nom);
  verifie(nom + ' : centre, marge d au moins 16 px', centre(s) && marge(s), s.slice(-150));
});
verifie('fenetre de creneau, ajout de plage, indicatif, langue, parametres : AUCUN coin carre en bas ni « 0 0 »', !/border-radius:\s*\d+px \d+px 0 0/.test(page.replace(/\.tab\.active::after[^\n]*/, '').replace(/border-radius:14px 14px 0 0; border:1px solid \$\{group\.color\}30;/, '')));
[
  ['fenetre de creneau', /<div style="background:#fff;width:100%;max-width:480px;border-radius:20px;padding:20px;max-height:90vh;overflow-y:auto;box-sizing:border-box;">/],
  ['ajout de plage', /modal\.style\.cssText = 'background:#fff;width:100%;max-width:480px;border-radius:20px;padding:20px;max-height:90vh;max-height:90dvh;overflow-y:auto;box-sizing:border-box;';/],
  ['indicatif du pays', /border-radius:20px; padding:20px; max-height:90vh; overflow-y:auto; box-sizing:border-box;">/],
  ['langue', /max-height:90vh; border-radius:20px; padding:20px 0 24px; overflow-y:auto; box-sizing:border-box;';/],
  ['parametres', /border-radius:20px; max-height:90vh; max-height:90dvh; overflow-y:auto; overscroll-behavior:contain; padding:6px 16px 24px; animation:tcFondu 0\.2s ease;/],
  ['fenetre centree (douceur / protege)', /border-radius:20px;padding:22px 20px 20px;box-shadow:0 20px 60px rgba\(0,0,0,0\.3\);max-height:90vh;overflow-y:auto;box-sizing:border-box;">/],
  ['connexion Google', /border-radius:24px; padding:32px 24px; max-height:90vh; overflow-y:auto; box-sizing:border-box; text-align:center;/],
  ['code administrateur', /width:300px; max-width:90%; max-height:90vh; overflow-y:auto; box-sizing:border-box;/],
].forEach(([nom, re]) => verifie('panneau « ' + nom + ' » : plafonne a 90 % et defile a l interieur', re.test(page)));
const toutOverlayBas = page.match(/z-index:\s*\d+;\s*display:flex;\s*align-items:\s*flex-end/g) || [];
verifie('aucun voile de panneau n aligne encore son contenu en bas', toutOverlayBas.length === 0, toutOverlayBas.join(' | '));
verifie('hors perimetre, laisses tels quels : recherche (en haut), champ de Charly, menu lateral, toasts', /id="searchModalOverlay"[^\n]*align-items:flex-start/.test(page) && /\.toast \{ position:fixed; bottom:80px/.test(page) && /id="charlyInputBar" style="position:fixed; bottom:0/.test(page));

titre('3. « Choisir qui peut me déranger quand même »');
const ctx = {
  console, contactsList: [], _dispoData: { travail: [], sante: [], famille: [], amis: [], sport: [], personnel: [{ jours: [5], debut: '13:00', fin: '20:00' }] },
  localStorage: { getItem: () => '0', setItem() {}, removeItem() {} }, tcSyncBientot() {}, showToast() {},
  JOURS_FULL: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], JOURS_LABELS: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  DISPO_CATEGORIES: [
    { id: 'travail', icon: 'T', label: 'Mon travail', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sante', icon: 'S', label: 'Ma santé', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'famille', icon: 'F', label: 'Ma famille', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'amis', icon: 'A', label: 'Mes amis et loisirs', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'sport', icon: 'P', label: 'Mon sport', color: '#aaa', bg: '#bbb', texte: '#333' },
    { id: 'personnel', icon: 'L', label: 'Mon temps libre', color: '#aaa', bg: '#bbb', texte: '#333' },
  ],
  appels: [], _formJours: [], _editingIdx: null, _editingCat: null,
};
const zone = { innerHTML: '', querySelectorAll() { return { forEach() {} }; } };
const corps = [];
const fabrique = () => ({ style: {}, innerHTML: '', kids: [], appendChild(c) { this.kids.push(c); }, remove() {} });
ctx.document = {
  getElementById: (id) => (id === 'dispoContent' ? zone : null),
  createElement: () => fabrique(),
  body: { appendChild: (c) => corps.push(c) },
};
ctx.tcChoisirQui = (c) => ctx.appels.push('qui:' + c);
vm.createContext(ctx);
['var TC_DISPO_KEY = [^;]*;', 'var TC_RDV_VALIDATION_KEY = [^;]*;'].forEach((re) => { const m = page.match(new RegExp(re)); if (m) vm.runInContext(m[0], ctx); });
['formatJours', 'formatHeure', 'phraseDispo', 'tcValidationRdvExigee', 'tcCadreValidationRdv', 'tcContactsAutorises', 'tcCompterChoisis', 'tcPhraseContactsAutorises', 'tcBoutonChoisirQui', 'tcLigneQuiPeutDeranger', 'renderDispo',
  'openDispoForm', 'tcAutoriserDepuisPlage'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
ctx.closeDispoForm = () => ctx.appels.push('ferme');
vm.runInContext('renderDispo()', ctx);
let h = zone.innerHTML;
const iLibre = h.indexOf('>Mon temps libre<');
const iCarteFin = h.indexOf('id="tcQuiPeutDeranger"');
verifie('la ligne « Choisir qui peut me déranger quand même » est presente SOUS le bloc « Mon temps libre »', iCarteFin > iLibre && iLibre > -1 && /Choisir qui peut me déranger quand même/.test(h));
verifie('elle est cliquable et branchee sur la liste « Choisir qui » de la categorie « personnel »', /id="tcQuiPeutDeranger" onclick="tcChoisirQui\('personnel'\)"/.test(h) && /role="button"/.test(h));
verifie('une seule ligne, et rien de tel sous les autres blocs', (h.match(/tcQuiPeutDeranger"/g) || []).length === 1 && h.indexOf('id="tcQuiPeutDeranger"') > h.lastIndexOf('+ Ajouter une plage') - 400);
ctx.localStorage.getItem = () => null;   // case cochee : les blocs sont gris
vm.runInContext('renderDispo()', ctx);
h = zone.innerHTML;
const iLigne = h.indexOf('id="tcQuiPeutDeranger"');
const dernierGris = h.lastIndexOf('aria-disabled="true"');
verifie('case cochee : les blocs sont gris mais la ligne reste cliquable (hors du bloc gris)', dernierGris > -1 && iLigne > -1 && h.slice(dernierGris, iLigne).split('</div>').length > 3 && !/opacity:0\.45[^>]*id="tcQuiPeutDeranger"/.test(h));
ctx.localStorage.getItem = () => '0';

vm.runInContext('openDispoForm("personnel")', ctx);
let f = corps[corps.length - 1].kids[0].innerHTML;
verifie('fenetre d une plage de « Mon temps libre » : horaires par defaut 13h-20h (temps protege)', /id="dispoDebut" value="13:00"/.test(f) && /id="dispoFin" value="20:00"/.test(f));
verifie('elle explique le sens et porte la meme ligne, branchee', /Pendant ces heures, personne ne peut te prendre un rendez-vous, sauf les contacts que tu autorises\./.test(f) && /onclick="tcAutoriserDepuisPlage\(\)"/.test(f) && /Choisir qui peut me déranger quand même/.test(f));
vm.runInContext('openDispoForm("personnel", { jours: [5], debut: "15:30", fin: "19:00" })', ctx);
f = corps[corps.length - 1].kids[0].innerHTML;
verifie('modifier une plage existante : ses heures sont gardees, la ligne est la aussi', /id="dispoDebut" value="15:30"/.test(f) && /id="dispoFin" value="19:00"/.test(f) && /tcAutoriserDepuisPlage/.test(f));
vm.runInContext('openDispoForm("travail")', ctx);
f = corps[corps.length - 1].kids[0].innerHTML;
verifie('les autres blocs gardent 9h-18h et n ont pas la ligne', /id="dispoDebut" value="09:00"/.test(f) && /id="dispoFin" value="18:00"/.test(f) && !/tcAutoriserDepuisPlage|Choisir qui peut me déranger/.test(f));
ctx.appels.length = 0;
vm.runInContext('tcAutoriserDepuisPlage()', ctx);
verifie('depuis la fenetre : elle se ferme puis ouvre la liste « Choisir qui » du temps libre', ctx.appels.join(',') === 'ferme,qui:personnel', ctx.appels.join(','));

// La liste des contacts et son bandeau
const c2 = { _contactsTimeCool: false, _contactsCategorie: 'personnel', _contactsLettre: '', contactsSearchQuery: '', isTimeCoolUser: () => false, TC_CONTACTS_SEUIL: 12, tcLettreContact: () => 'A' };
c2.DISPO_CATEGORIES = ctx.DISPO_CATEGORIES;
c2.contactsList = [
  { id: '1', name: 'Zoé' }, { id: '2', name: 'Alain', categories: ['personnel'] }, { id: '3', name: 'Marie', categories: ['travail'] }, { id: '4', name: 'Basile', categories: ['personnel', 'sante'] },
];
vm.createContext(c2);
['tcContactsParLettres', 'tcContactsAffiches', 'tcFiltreCategorieHTML'].forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, c2); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const noms = vm.runInContext('tcContactsAffiches().map(c => c.name).join(",")', c2);
verifie('« personnel » : TOUS les contacts sont la, les deja choisis d abord (sinon rien a choisir la premiere fois)', noms === 'Alain,Basile,Marie,Zoé', noms);
c2._contactsCategorie = 'travail';
verifie('une autre categorie : toujours le filtre ordinaire (seulement ceux qui y sont)', vm.runInContext('tcContactsAffiches().map(c => c.name).join(",")', c2) === 'Marie');
c2._contactsCategorie = 'personnel';
const bandeau = vm.runInContext('tcFiltreCategorieHTML()', c2);
verifie('le bandeau dit « Qui peut me déranger même en temps libre » (et plus « Qui peut réserver »)', /Qui peut me déranger même en temps libre/.test(bandeau) && !/Qui peut r.server/.test(bandeau));
verifie('il dit comment choisir et combien sont choisis', /Touche « Même en temps libre » sur la fiche d’un contact\. 2 choisis\./.test(bandeau), bandeau.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
c2.contactsList = [{ id: '1', name: 'Zoé' }];
verifie('personne choisi : « Personne pour l’instant. »', /Personne pour l’instant\./.test(vm.runInContext('tcFiltreCategorieHTML()', c2)));
c2._contactsCategorie = 'travail';
verifie('les autres bandeaux gardent « Qui peut réserver pour « Mon travail » »', /Qui peut réserver pour « Mon travail »/.test(vm.runInContext('tcFiltreCategorieHTML()', c2)));
verifie('le bouton « Tout voir » reste', /Tout voir/.test(vm.runInContext('tcFiltreCategorieHTML()', c2)));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
