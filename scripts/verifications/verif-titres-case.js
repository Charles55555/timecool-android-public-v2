#!/usr/bin/env node
// Mission 76 (Charles, 03/11/2026) : le titre d'un rendez-vous créé par Charly garde l'essentiel (« Maman », pas
// « Rendez-vous maman ») ; dans les cases Jour / Semaine / Mois, un titre trop long est coupé au milieu, le dernier mot reste.
// Usage : node verif-titres-case.js app/src/main/assets/index.html
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || 'app/src/main/assets/index.html', 'utf8');
let ok = 0, ko = 0;
function verifie(nom, cond, detail) {
  if (cond) { ok++; console.log('  ok ' + nom); } else { ko++; console.log('  KO ' + nom + (detail ? ' :: ' + detail : '')); }
}
function fonction(nom) {
  const i = page.indexOf('function ' + nom + '(');
  if (i < 0) return '';
  const j = page.indexOf('\n}\n', i);
  return j < 0 ? '' : page.slice(i, j + 2);
}
const noms = ['tcSansAccents', 'tcTitreEssentiel', 'tcTitresEssentielsDuBloc', 'tcCouperAuMilieu', 'tcCouperALaFin', 'tcEstUnProche', 'tcLignesDuTexte', 'tcTientDansCase', 'tcAjusterTitresCases'];
const absentes = noms.filter((n) => !fonction(n));
verifie('les fonctions de la mission 76 existent', !absentes.length, absentes.join(' '));
if (absentes.length) { console.log('ECHEC ' + ok + '/' + (ok + ko) + ' verifications passees'); process.exit(1); }
const ctx = { console, String, Array, Math, Number, RegExp };
vm.createContext(ctx);
noms.forEach((n) => vm.runInContext(fonction(n), ctx));

console.log('1. Le titre garde l essentiel');
const cas = [
  ['Rendez-vous maman', 'Maman'], ['Rendez-vous chez ma maman', 'Maman'], ['RDV dentiste', 'Dentiste'], ['rdv banque', 'Banque'],
  ['Rendez-vous chez le dentiste', 'Dentiste'], ['Rendez-vous banque', 'Banque'], ['Rdv : coupe couleur Mme Martin', 'Coupe couleur Mme Martin'],
  ['Rendez-vous avec Marie', 'Marie'], ['Rendez-vous téléphonique avec Paul', 'Paul'], ['Rendez-vous d’affaires', 'Affaires'],
  ['Rendez-vous chez l’ostéopathe', 'Ostéopathe'],
  ['Dentiste', 'Dentiste'], ['Coupe couleur Mme Martin', 'Coupe couleur Mme Martin'], ['Rendez-vous', 'Rendez-vous'],
  ['Rendez-vousmaman', 'Rendez-vousmaman'], ['rdvmaman', 'rdvmaman'], ['Réunion rendez-vous client', 'Réunion rendez-vous client']];
const mauvais = cas.filter(([a, b]) => ctx.tcTitreEssentiel(a, 'tu peux me noter un rendez-vous vendredi 11h') !== b).map(([a, b]) => a + ' → ' + ctx.tcTitreEssentiel(a, '') + ' (attendu ' + b + ')');
verifie('« Rendez-vous », « RDV », « Rendez-vous chez » retirés devant, première lettre en majuscule ; les autres titres tels quels', !mauvais.length, mauvais.join(' | '));
verifie('le titre dicté mot pour mot reste : entre guillemets, ou après « intitulé » / « appelle-le »',
  ctx.tcTitreEssentiel('Rendez-vous maman', 'note vendredi 11h « Rendez-vous maman »') === 'Rendez-vous maman'
  && ctx.tcTitreEssentiel('RDV client', 'mets un truc intitulé RDV client demain 9h') === 'RDV client'
  && ctx.tcTitreEssentiel('Rendez-vous annuel', 'ajoute demain 9h et appelle-le rendez-vous annuel') === 'Rendez-vous annuel'
  && ctx.tcTitreEssentiel('Rendez-vous maman', 'note « dentiste » vendredi') === 'Maman');

// Retouche 76b (TESTEURS, passage 29) : le titre dicté reste tel quel, sans le verbe.
const dictes = [
  ['Appelle-le Point mensuel équipe', 'appelle-le "Point mensuel équipe" lundi 10h', 'Point mensuel équipe'],
  ['Point mensuel équipe', 'appelle-le "Point mensuel équipe" lundi 10h', 'Point mensuel équipe'],
  ['Intitule-le Revue budget', 'mets jeudi 15h, intitule-le « Revue budget »', 'Revue budget'],
  ['Nomme-le Point Lefebvre', 'nomme-le “Point Lefebvre” demain 9h', 'Point Lefebvre'],
  ['Titre : Bilan trimestriel', 'ajoute vendredi 14h, titre : "Bilan trimestriel"', 'Bilan trimestriel'],
  ['Intitule-le point mensuel', 'lundi 10h intitule-le point mensuel', 'Point mensuel'],
  ['Appelle le plombier', 'rappelle-moi d appeler le plombier demain 9h', 'Appelle le plombier'],
  ['Appeler Maman', 'appelle "Maman" mardi 10h', 'Appeler Maman'], ['Appeler Paul', 'appelle « Paul » demain 9h', 'Appeler Paul']];
const dictesKo = dictes.filter(([a, u, b]) => ctx.tcTitreEssentiel(a, u) !== b).map(([a, u, b]) => a + ' → ' + ctx.tcTitreEssentiel(a, u) + ' (attendu ' + b + ')');
verifie('titre dicté (« appelle-le », « intitule-le », « nomme-le », « titre : ») : les mots dictés, sans le verbe ; « Appelle le plombier » reste une tâche', !dictesKo.length, dictesKo.join(' | '));
verifie('le modèle reçoit la règle du titre dicté', /Titre dicté \(« appelle-le "Point mensuel équipe" »/.test(page));

console.log('2. La carte et la phrase « C est noté »');
const rep = 'C’est noté : **Rendez-vous maman** vendredi à 11h.\n\n[AGENDA]\n2026-11-06 | 11:00-12:00 | Rendez-vous maman | famille | 47 avenue Paul Valéry | maman\n[/AGENDA]';
const r2 = ctx.tcTitresEssentielsDuBloc(rep, 'tu peux me noter un rendez-vous vendredi 11h chez ma maman, 47 avenue Paul Valéry');
verifie('#665339 : la carte dit « Maman », la phrase aussi ; lieu, catégorie et contact intacts', r2 === 'C’est noté : **Maman** vendredi à 11h.\n\n[AGENDA]\n2026-11-06 | 11:00-12:00 | Maman | famille | 47 avenue Paul Valéry | maman\n[/AGENDA]', r2);
const r3 = ctx.tcTitresEssentielsDuBloc('Je te propose :\n[AGENDA]\n2026-11-06 | 09:00-10:00 | RDV dentiste | sante\n2026-11-07 | 10:00-11:00 | Banque | administratif\n[/AGENDA]', 'dentiste et banque');
verifie('chaque ligne d un bloc de plusieurs lignes ; un titre déjà court ne bouge pas', /\| 09:00-10:00 \| Dentiste \| sante\n/.test(r3) && /\| 10:00-11:00 \| Banque \| administratif\n/.test(r3), r3);
const r4 = 'Pas de bloc ici, rendez-vous maman demain.';
verifie('sans bloc [AGENDA], la réponse est rendue telle quelle (même objet)', ctx.tcTitresEssentielsDuBloc(r4, '') === r4);
const r5 = 'Je note le rendez-vous maman.\n[AGENDA]\n2026-11-06 | 11:00-12:00 | Rendez-vous maman | famille\n[/AGENDA]';
verifie('la prose n est changée qu entre guillemets ou en gras (jamais « le Maman » au milieu d une phrase)', ctx.tcTitresEssentielsDuBloc(r5, '').indexOf('Je note le rendez-vous maman.') === 0);
const src = fonction('charlySendMessage') || page;
verifie('le filet passe sur toutes les réponses de Charly (conversation et fichier analysé)', page.split('tcTitresEssentielsDuBloc(reply, text)').length === 2 && page.split("tcTitresEssentielsDuBloc(reply, '')").length === 2);
verifie('les exemples donnés au modèle ne commencent plus par « Rendez-vous » ; la règle est dite',
  !/\| Rendez-vous (?:médecin|dentiste|banque) \|/.test(page) && /Jamais « Rendez-vous », « RDV » ni « Rendez-vous chez » devant le titre/.test(page));

console.log('3. Dans la case : coupé au milieu, le dernier mot reste');
const largeur = (n) => (x) => x.length <= n;
verifie('« Coupe couleur Mme Martin » dans 14 lettres → « Coupe c…Martin »', ctx.tcCouperAuMilieu('Coupe couleur Mme Martin', largeur(14)) === 'Coupe c…Martin', ctx.tcCouperAuMilieu('Coupe couleur Mme Martin', largeur(14)));
verifie('un titre qui tient reste entier', ctx.tcCouperAuMilieu('Maman', largeur(14)) === 'Maman');
const t1 = ctx.tcCouperAuMilieu('Rendez-vous maman', largeur(8));
verifie('le dernier mot n est jamais perdu, même dans une case minuscule', /maman$/.test(t1) && /…/.test(t1), t1);
const t2 = ctx.tcCouperAuMilieu('Anniversaire', largeur(7));
verifie('un seul mot trop long : son début et sa fin restent', t2 === 'Ann…ire', t2);
const mesure = { measureText: (x) => ({ width: x.length * 5 }) };
verifie('retour à la ligne par mots, un mot trop long par lettres', ctx.tcLignesDuTexte(mesure, 'Coupe couleur', 40) === 2 && ctx.tcLignesDuTexte(mesure, 'Maman', 40) === 1 && ctx.tcLignesDuTexte(mesure, 'Anniversaire', 40) === 2);
// Examen du 03/11 : un dernier mot plus large que la colonne (Semaine à 390 px : environ 8 lettres par ligne) ne donne
// jamais « … » seul. Bloc de 30 min : une ligne ; bloc de 1 h : deux lignes. Mesure fictive : 5 px par lettre, 40 px.
const m5 = { measureText: (x) => ({ width: x.length * 5 }) };
const tientCase = (lignes) => (x) => ctx.tcTientDansCase(m5, x, 40, lignes);
const longs = ['Séance kinésithérapie', 'Dîner anniversaire', 'Contrôle ophtalmologie', 'Visio Ressources-Humaines', 'Point budget avec Lefebvre-Durand', 'Kinésithérapie'];
const vus = [];
[1, 2].forEach((l) => longs.forEach((t) => { const v = ctx.tcCouperAuMilieu(t, tientCase(l)); vus.push(l + ':' + v); }));
verifie('dernier mot plus large que la case (30 min et 1 h) : jamais « … » seul, le mot garde son début et sa fin, et l essai tient',
  vus.every((x) => { const v = x.slice(2), l = Number(x[0]); return /[A-Za-zÀ-ÿ]{2}…|[A-Za-zÀ-ÿ]…[A-Za-zÀ-ÿ]/.test(v) && v !== '…' && ctx.tcTientDansCase(m5, v, 40, l); }), vus.join(' | '));
verifie('« Séance kinésithérapie » en 30 min → « kiné…pie » ; « Dîner anniversaire » → « anni…ire »',
  ctx.tcCouperAuMilieu('Séance kinésithérapie', tientCase(1)) === 'kiné…pie' && ctx.tcCouperAuMilieu('Dîner anniversaire', tientCase(1)) === 'anni…ire', vus.join(' | '));
verifie('sur plusieurs lignes, un mot plus large que la case ne « tient » pas (le navigateur le casserait au hasard), même collé à « … »',
  !ctx.tcTientDansCase(m5, 'Séance kinésithérapie', 40, 2) && !ctx.tcTientDansCase(m5, '…kinésithérapie', 40, 3) && ctx.tcTientDansCase(m5, 'Coupe couleur', 40, 2));
const pires = [];
for (let n = 1; n <= 30; n++) ['Maman', 'Coupe couleur Mme Martin', 'Séance kinésithérapie', 'Kiné'].forEach((t) => { const v = ctx.tcCouperAuMilieu(t, (x) => x.length <= n); if (!/[A-Za-zÀ-ÿ]/.test(v)) pires.push(n + ':' + t + '→' + v); });
verifie('toutes largeurs de 1 à 30 lettres : jamais un titre réduit à « … »', !pires.length, pires.join(' | '));
// Retouche 76b : deux lignes « Séance / kiné…pie » quand la hauteur le permet ; Mois : le début du titre reste ; jamais « … » en tête.
verifie('« Séance kinésithérapie » sur deux lignes → « Séance kiné…pie » (Séance n est plus perdu)', ctx.tcCouperAuMilieu('Séance kinésithérapie', tientCase(2)) === 'Séance kiné…pie', ctx.tcCouperAuMilieu('Séance kinésithérapie', tientCase(2)));
verifie('Mois : « Anniversaire de mariage de Paul et Marie » → « Anniv… », « Point mensuel équipe » → « Point… »',
  ctx.tcCouperALaFin('Anniversaire de mariage de Paul et Marie', largeur(6)) === 'Anniv…' && ctx.tcCouperALaFin('Point mensuel équipe', largeur(8)) === 'Point…',
  ctx.tcCouperALaFin('Anniversaire de mariage de Paul et Marie', largeur(6)) + ' | ' + ctx.tcCouperALaFin('Point mensuel équipe', largeur(8)));
const tetes = [];
for (let n = 1; n <= 30; n++) ['Anniversaire de mariage de Paul et Marie', 'Point mensuel équipe', 'Coupe couleur Mme Martin', 'Séance kinésithérapie', 'Dentiste', 'Maman'].forEach((t) => {
  [ctx.tcCouperAuMilieu(t, largeur(n)), ctx.tcCouperALaFin(t, largeur(n))].forEach((v) => { if (/^…/.test(v) || v.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 2) tetes.push(n + ':' + t + '→' + v); });
});
verifie('toutes largeurs de 1 à 30 lettres : jamais une case qui commence par « … », deux lettres au moins', !tetes.length, tetes.join(' | '));
const aj = fonction('tcAjusterTitresCases');
verifie('Mois : la pastille coupe à la fin ; un titre qui manque de peu se resserre (« Dentiste » entier) au lieu d être coupé',
  /tcCouperALaFin\(p\.titre, tient\)/.test(aj) && /\[0, -0\.25, -0\.5\]/.test(aj) && /letterSpacing/.test(aj));
verifie('« Maman » : la question du contact seulement si un contact porte ce mot',
  ctx.tcEstUnProche('maman') && ctx.tcEstUnProche('ma maman') && ctx.tcEstUnProche('mon frère') && !ctx.tcEstUnProche('mon dentiste') && !ctx.tcEstUnProche('Michel')
  && /tcEstUnProche\(nom\) && typeof tcResoudreContact === 'function' && !tcResoudreContact\(nom\)\.length\) continue;/.test(fonction('tcAttenteContact')));
verifie('les trois vues posent le titre dans .tc-titre-case et l ajustent après le dessin',
  /<span class="tc-titre-case">\$\{escapeHTMLSafe\(ev\.title\)\}<\/span>/.test(fonction('renderMonth')) && /tcAjusterTitresCasesBientot\(body\);/.test(fonction('renderMonth'))
  && /<span class="tc-titre-case">\$\{escapeHTMLSafe\(e\.title\)\}<\/span>/.test(fonction('renderWeek')) && /tcAjusterTitresCases\(body\);/.test(fonction('renderWeek'))
  && /<span class="tc-titre-case">\$\{escapeHTMLSafe\(e\.title\)\}<\/span>/.test(fonction('renderDay')) && /tcAjusterTitresCasesBientot\(body\);/.test(fonction('renderDay')));
verifie('Semaine : le titre peut passer sur plusieurs lignes (plus de « … » en fin)', /\.week-event-title \{ font-weight:600; white-space:normal; overflow:hidden; overflow-wrap:anywhere; \}/.test(page));
verifie('mesure au canevas, lectures puis écritures (aucune mise en page par essai)', /measureText/.test(fonction('tcLignesDuTexte')) && aj.indexOf('// 1. Lectures') < aj.indexOf('// 2. Calculs') && !/offsetHeight|clientHeight|clientWidth/.test(aj.slice(aj.indexOf('// 2. Calculs'))));
console.log((ko ? 'ECHEC ' : '') + ok + '/' + (ok + ko) + ' verifications passees');
process.exit(ko ? 1 : 0);
