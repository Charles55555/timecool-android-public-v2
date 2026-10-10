// « Mon profil » en cartes (10/10) : une bande compacte, des cartes cote a cote (deux colonnes des
// 700 px), un champ par ligne, « — » pour un champ vide, « Rien pour l'instant » + « Compléter »
// pour une carte entierement vide. Les memes donnees, les memes textes de confidentialite.
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 220) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const sansBalises = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

titre('1. Le style');
const css = (sel) => { const m = page.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };
verifie('une colonne par defaut (telephone)', /grid-template-columns:minmax\(0, 1fr\)/.test(css('.profil-grille')) && /display:grid/.test(css('.profil-grille')));
verifie('deux colonnes des 700 px (tablette, ordinateur, paysage)', /@media \(min-width:700px\) \{ \.profil-grille \{ grid-template-columns:repeat\(2, minmax\(0, 1fr\)\); \} \}/.test(page));
verifie('l en-tete tient sur une bande d environ 90 px (min-height:90px), avatar de 60 px', /min-height:90px/.test(css('.profil-entete')) && /width:60px; height:60px/.test(page.match(/\.profil-entete \.profile-avatar \{[^}]*\}/)[0]));
verifie('carte arrondie avec cadre', /border-radius:16px/.test(css('.profil-carte')) && /border:1px solid/.test(css('.profil-carte')));
verifie('un champ = une ligne : libelle a gauche, valeur a droite (flex, space-between)', /display:flex; justify-content:space-between/.test(css('.profil-champ')) && /text-align:right/.test(css('.profil-champ-val')));
verifie('une valeur longue se replie sous le libelle, sans deborder', /\.profil-champ\.long \{ flex-direction:column/.test(page) && /overflow-wrap:anywhere/.test(css('.profil-champ-val')) && /min-width:0/.test(css('.profil-champ-val')));
verifie('valeur vide : gris clair', /color:#bdc1c6/.test(page.match(/\.profil-champ-val\.vide \{[^}]*\}/)[0]));

titre('2. La page, executee dans la vraie fonction');
const mk = (compte, mode) => {
  const ctx = { console, mode: mode || 'user', userAccount: compte, currentProfile: { pro: 'martin' }, alertes: [], reseau: 0,
    proProfile: { name: 'Dr Martin', job: 'Dentiste', cabinet: 'Cabinet', address: 'Rue', email: 'a@b.fr', phone: '01', siret: '1', rpps: '2', hours: '9-18', closed: 'dim' },
    tcInitiales: () => 'JD', tcAlert: (m) => { ctx.alertes.push(m); }, fetch: () => { ctx.reseau++; },
    escapeHTMLSafe: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') };
  const zone = { innerHTML: '' };
  ctx.document = { getElementById: (id) => (id === 'profileContent' ? zone : null) };
  vm.createContext(ctx);
  ['renderProfile', 'tcProfilEnteteHTML', 'tcProfilVide', 'tcProfilChampHTML', 'tcProfilCarteHTML', 'tcModifierRubrique', 'infoRow']
    .forEach((n) => { const s = fonction(page, n); if (s) vm.runInContext(s, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
  vm.runInContext('renderProfile()', ctx);
  return { ctx, h: zone.innerHTML };
};
const plein = mk({ firstname: 'Jean', lastname: 'Dupont', email: 'jean.dupont@exemple.fr', phone: '6 07 78 66 26', phoneCountry: '+33', zip: '69001', city: 'Lyon',
  birth: '12 mars 1980', gender: 'Homme', ssn: '1 80 03 69 123 456 78', mutual: 'Harmonie', bloodType: 'O+', allergies: 'Pénicilline, arachides et pollens de bouleau', emergency: 'Marie 06 11 22 33 44',
  cni: '123456789', passport: '', bank: 'CIC', iban: 'FR76 3000 1007 9412 3456 7890 185', job: 'Dentiste', company: 'Cabinet Dupont', family: 'Marié', children: '2', createdAt: '2026-08-30T10:00:00Z', reference: 'MFF5ZW7QAPQF' });
const H = plein.h;
verifie('en-tete compact : initiales, nom en gras, ville dessous, « Profil protégé », dans UNE bande', /<div class="profil-entete">/.test(H) && /profile-avatar profile-avatar-user">JD</.test(H) && /profil-entete-nom">Jean Dupont</.test(H) && /profil-entete-ville">69001 Lyon</.test(H) && /🔒 Profil protégé/.test(H) && !/profile-hero/.test(H));
verifie('huit cartes dans une grille', (H.match(/class="profil-carte"/g) || []).length === 8 && /<div class="profil-grille">/.test(H));
['Identité', 'Coordonnées', 'Santé', 'Identité légale', 'Bancaire', 'Profession', 'Famille', 'Compte'].forEach((n) => verifie('carte « ' + n + ' » avec son icone', new RegExp('<span style="font-size:20px;">[^<]+</span><div class="profil-carte-titre">' + n + '</div>').test(H)));
verifie('un crayon « Modifier » en haut a droite de chaque carte modifiable (sept), pas sur « Compte »', (H.match(/class="profil-crayon"/g) || []).length === 7 && !/profilCarte_compte[^]*?profil-crayon[^]*?profilCarte_/.test(H.slice(H.indexOf('profilCarte_compte'))) );
verifie('un champ par ligne : « Mobile » a gauche, « +33 6 07 78 66 26 » a droite', /<div class="profil-champ"><div class="profil-champ-lib">Mobile<\/div><div class="profil-champ-val">\+33 6 07 78 66 26<\/div><\/div>/.test(H), sansBalises(H.slice(H.indexOf('Coordonn'), H.indexOf('Coordonn') + 400)));
verifie('plus aucun « Non renseigné »', !/Non renseign/.test(H));
verifie('champ vide : « — » en gris clair', /<div class="profil-champ-val vide">—<\/div>/.test(H) && /Passeport<\/div><div class="profil-champ-val vide">—/.test(H));
verifie('donnee sensible remplie : « 🔒 Donnée chiffrée » (securite sociale, mutuelle, CNI, IBAN) — jamais sur un champ vide', (H.match(/🔒 Donnée chiffrée/g) || []).length === 4);
verifie('valeur longue : repliee sous le libelle (classe « long »), courte : sur la meme ligne', /profil-champ long"><div class="profil-champ-lib">Allergies</.test(H) && /profil-champ long"><div class="profil-champ-lib">IBAN</.test(H) && /profil-champ"><div class="profil-champ-lib">Genre</.test(H));
verifie('les memes donnees : date de naissance, email, groupe sanguin, membre depuis, identifiant', /12 mars 1980/.test(H) && /jean\.dupont@exemple\.fr/.test(H) && />O\+</.test(H) && /30 août 2026/.test(sansBalises(H)) && /MFF5ZW7QAPQF/.test(H));
verifie('les textes de confidentialite sont gardes', /Ton profil n'affiche que ce que tu as réellement saisi\./.test(H) && /Les rubriques vides \(—\) ne sont pas encore modifiables\./.test(H));
verifie('aucune carte ne montre « Rien pour l\'instant » (tout est rempli, sauf un champ)', !/Rien pour l’instant/.test(H));

const piege = mk({ firstname: '<img src=x onerror=1>', lastname: 'A"B', email: '<b>x</b>@y.fr', phone: '', zip: '', city: '', allergies: '<script>1</script>' }).h;
verifie('le contenu saisi est echappe (nom, email, allergies)', !/<img src|<script|<b>x/.test(piege) && /&lt;img/.test(piege));

titre('3. Un profil vide (ce qu\'on a a l\'inscription)');
const vide = mk({ firstname: 'Charles', lastname: 'Haddad', email: 'c@exemple.fr', phone: '6 12 34 56 78', phoneCountry: '+33', zip: '75008', city: 'Paris' });
const V = vide.h;
verifie('les cartes sans aucune valeur : une seule ligne « Rien pour l\'instant » + « Compléter »', (V.match(/Rien pour l’instant<a onclick="tcModifierRubrique\('[a-z]+'\)">Compléter<\/a>/g) || []).length === 6, String((V.match(/Rien pour l’instant/g) || []).length));
verifie('et ces cartes n affichent aucun champ « — » repete', !/profilCarte_sante[^]*?profil-champ"[^]*?profilCarte_/.test(V.slice(V.indexOf('profilCarte_sante'), V.indexOf('profilCarte_legale'))));
verifie('« Identité », « Santé », « Identité légale », « Bancaire », « Profession », « Famille » sont vides ; « Coordonnées » est remplie', /profilCarte_coordonnees/.test(V) && sansBalises(V.slice(V.indexOf('profilCarte_coordonnees'), V.indexOf('profilCarte_sante'))).indexOf('Rien pour') === -1);
verifie('« Compte » sans date ni identifiant : la carte n apparait pas', !/profilCarte_compte/.test(V) && (V.match(/class="profil-carte"/g) || []).length === 7);
verifie('chaque carte vide garde son crayon', (V.match(/class="profil-crayon"/g) || []).length === 7);
verifie('ville vide : « — » (carte Coordonnees avec un seul champ vide)', mk({ firstname: 'A', lastname: 'B', email: 'a@b.fr', phone: '' }).h.indexOf('Ville</div><div class="profil-champ-val vide">—') > -1);

titre('4. Les boutons, et le reste ne change pas');
vm.runInContext('tcModifierRubrique("identite")', vide.ctx);
verifie('crayon et « Compléter » : un message clair, sans rien promettre ni appeler le reseau', vide.ctx.alertes.length === 1 && /La modification de ton profil arrive dans une prochaine version\./.test(vide.ctx.alertes[0]) && vide.ctx.reseau === 0, vide.ctx.alertes.join('|'));
verifie('aucun compte connecte : le meme message qu avant', /Aucun compte connecté/.test(mk(null).h) && /Connecte-toi pour retrouver ton profil\./.test(mk(null).h));
verifie('mode pro : les profils pro gardent leur page (sections et lignes d origine)', /info-section/.test(mk({}, 'pro').h) && /Cabinet/.test(mk({}, 'pro').h));
verifie('infoRow existe toujours (profils pro, fiche client)', typeof vm.runInContext('infoRow', vide.ctx) === 'function');

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
