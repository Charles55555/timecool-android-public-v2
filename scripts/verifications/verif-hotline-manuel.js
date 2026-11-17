// Mission 104 (Charles, 16/11 : « répondre à toutes les questions techniques ») : la hotline « Charly, ton aide TimeCool » s'appuie
// sur la fiche du manuel (bloc de données en fin de page, lu à la première question). Politesses : une réponse courte, puis
// « Pose-moi ta question sur TimeCool. » ; une question écrite comme dans la fiche : sa réponse sans le modèle ; sinon le modèle reçoit
// les 12 entrées les plus proches. La réponse « photo » de la base d'aide dit ce que le code fait aujourd'hui.
// Usage : node verif-hotline-manuel.js <index.html>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 400) : '')); } };
function fonction(nom) {
  const i = page.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = page.indexOf('{', i); k < page.length; k++) {
    if (page[k] === '{') n++;
    else if (page[k] === '}') { n--; if (n === 0) return page.slice(i, k + 1); }
  }
  return '';
}
const constante = (nom) => { const i = page.indexOf('const ' + nom + ' = '); return i < 0 ? '' : page.slice(i, page.indexOf(';\n', i) + 1).replace('const ', 'var '); };

// ── Le bloc de données ──
const m = page.match(/<script type="application\/json" id="tcFicheHotline">([\s\S]*?)<\/script>/);
let fiche = [];
try { fiche = m ? JSON.parse(m[1]) : []; } catch (e) { fiche = []; }
verifie('la fiche est dans la page, en données (jamais exécutée au chargement)', !!m && fiche.length > 150, fiche.length);
verifie('poids ajouté raisonnable (moins de 130 Ko)', !!m && m[1].length < 130000, m && m[1].length);
verifie('chaque entrée : identifiant, question, autres façons, réponse', fiche.every((e) => Array.isArray(e) && e.length === 4 && /^Q\d+\.\d+$/.test(e[0]) && e[1] && Array.isArray(e[2]) && e[3]));
const tout = fiche.map((e) => e[3]).join('\n');
verifie('aucune réponse ne dit où sont gardées les données (point gardé pour Charles)', !/Allemagne|h[ée]bergeur|serveurs? (de TimeCool )?(situ|en Europe)|stock[ée]es? (en|sur|dans) /i.test(tout), (tout.match(/.{60}(Allemagne|h[ée]bergeur).{60}/i) || [])[0]);
verifie('lien public : « Cette fonction n’existe pas dans TimeCool. »', /Cette fonction n.existe pas dans TimeCool\./.test(tout));
verifie('aucune réponse ne promet la lecture des photos', !/Charly lit la date et l.heure/.test(tout) && !/lit (la|ta) photo/i.test(tout));
verifie('la réponse « photo » de la base d aide (96) dit ce que le code fait aujourd hui', /id: 'photo'[\s\S]{0,700}Charly ne sait pas encore lire les photos/.test(page) && !/Prends en photo une invitation ou un papier : Charly lit la date/.test(page));

// ── Les fonctions, exécutées ──
const ctx = { console, Set, Math, JSON, Array, Object, String, document: { getElementById: (id) => (id === 'tcFicheHotline' && m ? { textContent: m[1] } : null) }, userAccount: { firstname: 'Charles' }, TC_AIDE: [{ q: 'aide 96', a: 'réponse 96' }] };
vm.createContext(ctx);
try {
  vm.runInContext([constante('TC_HOTLINE_FIN'), constante('TC_HOTLINE_DESOLE'), constante('TC_HOTLINE_TANT_MIEUX'), fonction('tcCavaHotline'), fonction('tcReponseCavaHotline'), constante('TC_HOTLINE_MOTS_VIDES'), 'var _tcFicheHotline = null;',
    ...['tcSansAccents', 'tcPhraseHotline', 'tcMotsHotline', 'tcFicheHotline', 'tcChercherFicheHotline', 'tcReponseDirecteHotline', 'tcSocialHotline', 'tcConsigneConvCharly'].map(fonction)].join('\n'), ctx);
} catch (e) { verifie('les fonctions se chargent', false, e.message); }
const appel = (code) => { try { return vm.runInContext(code, ctx); } catch (e) { return 'erreur ' + e.message; } };

const social = (t) => appel('tcSocialHotline(' + JSON.stringify(t) + ')');
const FIN = 'Pose-moi ta question sur TimeCool.';
[['Bonjour', 'Bonjour !'], ['Bonsoir Charly', 'Bonjour !'], ['Merci beaucoup', 'Avec plaisir !'],
 ['Au revoir', 'À bientôt !'], ['Tu es un robot ?', 'intelligence artificielle'], ['T’es humain ?', 'intelligence artificielle'], ['Qui es-tu ?', 'Je m’appelle Maya']].forEach(([q, debut]) => {
  const r = social(q);
  verifie('« ' + q + ' » : réponse courte et aimable, puis « ' + FIN + ' »', typeof r === 'string' && r.includes(debut) && r.endsWith(FIN) && !/Je ne sais pas encore/.test(r), r);
});
// Mission 105 (Charles, 16/11) : « Ça va ? » reçoit « Très bien, merci Charles ! 😊 Et toi, ça va ? », avec le prénom du compte.
['Ça va ?', 'comment ça va ?', 'salut ça va', 'tu vas bien ?', 'Salut comment ca va ?', 'Ca va'].forEach((q) => {
  verifie('« ' + q + ' » : « Très bien, merci Charles ! 😊 Et toi, ça va ? »', social(q) === 'Très bien, merci Charles ! 😊 Et toi, ça va ?', social(q));
});
ctx.userAccount = { firstname: '' };
verifie('sans prénom : « Très bien, merci ! 😊 Et toi, ça va ? »', social('Ça va ?') === 'Très bien, merci ! 😊 Et toi, ça va ?', social('Ça va ?'));
ctx.userAccount = { firstname: 'Charles' };
const cava = (t) => appel('tcReponseCavaHotline(' + JSON.stringify(t) + ')');
['oui', 'Oui ça va', 'bien', 'super', 'très bien et toi ?', 'ça va merci', 'pas mal', 'nickel'].forEach((q) => {
  verifie('après « Et toi, ça va ? », « ' + q + ' » : « Tant mieux ! Pose-moi ta question sur TimeCool. »', cava(q) === 'Tant mieux ! Pose-moi ta question sur TimeCool.', cava(q));
});
['non', 'bof', 'pas trop', 'ça va pas', 'pas du tout', 'mal'].forEach((q) => {
  verifie('après « Et toi, ça va ? », « ' + q + ' » : « Mince. Dis-moi ce qui ne va pas avec TimeCool, je t’aide. »', cava(q) === 'Mince. Dis-moi ce qui ne va pas avec TimeCool, je t’aide.', cava(q));
});
['Comment je change la langue ?', 'oui, comment j’ajoute un contact ?', 'Annule mon dentiste demain'].forEach((q) => {
  verifie('après « Et toi, ça va ? », « ' + q + ' » : traitement normal', cava(q) === null, cava(q));
});
verifie('« Ok super merci » (remarque de la 104) : « Avec plaisir ! 😊 », sans le modèle', /^Avec plaisir ! /.test(social('Ok super merci') || ''), social('Ok super merci'));
// Examen : un mécontentement n'est jamais une politesse gaie.
['Ça va pas', 'Ça va pas du tout', 'Pas super', 'Pas top'].forEach((q) => {
  const r = social(q);
  verifie('« ' + q + ' » : « Mince. Dis-moi ce qui ne va pas avec TimeCool, je t’aide. », jamais une réponse gaie', r === 'Mince. Dis-moi ce qui ne va pas avec TimeCool, je t’aide.', r);
});
['Salut, comment je change la langue ?', 'Merci, et comment je supprime un contact ?', 'Bonjour, je veux importer mon agenda'].forEach((q) => {
  verifie('« ' + q + ' » : une vraie question derrière la politesse, pas seulement « bonjour »', social(q) === null, social(q));
});

// Une question écrite comme dans la fiche (sa question ou une autre façon) : sa réponse, sans le modèle.
const e0 = fiche.find((e) => e[2].length > 1) || fiche[0] || ['', '', ['', ''], ''];
const directe = (t) => appel('(tcReponseDirecteHotline(' + JSON.stringify(t) + ') || {}).id');
verifie('la question de la fiche, telle quelle, trouve son entrée', directe(e0[1]) === e0[0], e0[1] + ' → ' + directe(e0[1]));
verifie('une autre façon de la poser aussi (majuscules, accents, ponctuation à part)', directe(e0[2][1].toUpperCase() + ' ?') === e0[0], e0[2][1] + ' → ' + directe(e0[2][1]));
verifie('une question hors fiche ne trouve rien sans le modèle', directe('Quelle est la recette des crêpes ?') === undefined);

// Chef, 16/11 : le prix avec les mots du site ; « Tu peux supprimer mon compte ? » reçoit le chemin dans Paramètres (Charly ne supprime jamais un compte).
verifie('« Ça coûte combien » : « Oui, TimeCool est gratuit. Aucune carte bancaire ne te sera demandée. »', appel('(tcReponseDirecteHotline("Ça coûte combien") || {}).r') === 'Oui, TimeCool est gratuit. Aucune carte bancaire ne te sera demandée.');
verifie('« Tu peux supprimer mon compte ? » : la réponse de la fiche (Paramètres), sans le modèle', appel('(tcReponseDirecteHotline("Tu peux supprimer mon compte ?") || {}).id') === 'Q10.31');
// Le modèle reçoit les entrées les plus proches.
const proches = (t) => appel('tcChercherFicheHotline(' + JSON.stringify(t) + ', 12).map(function (e) { return e.id; })');
const contient = (q, re) => { const ids = proches(q); const textes = (Array.isArray(ids) ? ids : []).map((id) => (fiche.find((e) => e[0] === id) || [])[3] || ''); return textes.slice(0, 5).some((t) => re.test(t)); };
verifie('« je veux changer le texte quand je suis en retard » : l entrée des messages de retard parmi les 5 premières', contient('je veux changer le texte quand je suis en retard', /Je serai en retard/));
verifie('« passer en mode sombre » : l entrée du thème parmi les 5 premières', contient('passer en mode sombre', /Sombre/));
verifie('« liste des contacts bloqués » : l entrée « Contacts bloqués » parmi les 5 premières', contient('liste des contacts bloqués', /Contacts bloqués/));
const consigne = appel('tcConsigneConvCharly("Comment je passe en mode sombre ?")');
verifie('la consigne du modèle porte les entrées proches du manuel (12 au plus)', typeof consigne === 'string' && /Sombre/.test(consigne) && (consigne.match(/\n- /g) || []).length <= 12, (consigne.match(/\n- /g) || []).length);
verifie('la consigne : une question (même sur l agenda, un retard) reçoit une réponse, jamais [PAGE_CHARLY]', /reçoit une réponse, jamais \[PAGE_CHARLY\]/.test(consigne));
verifie('la consigne : jamais où sont gardées les données', /Ne dis jamais où sont gardées les données/.test(consigne));
verifie('la consigne : le vocabulaire calme (« prendre rendez-vous directement »)', /écris « prendre rendez-vous directement », avec ces mots-là/.test(consigne));
verifie('la fiche n est lue qu une fois, à la première question', /function tcFicheHotline\(\) \{\s*if \(_tcFicheHotline\) return _tcFicheHotline;/.test(page));

// L'ordre dans la conversation d'aide.
const envoi = fonction('tcEnvoyerConvCharly');
const ordre = ['tcSocialHotline(txt)', 'tcDemandeAgendaConvCharly(txt)', 'tcReponseDirecteHotline(txt)', 'tcConsigneConvCharly(txt)'].map((x) => envoi.indexOf(x));
verifie('ordre : politesse, vraie demande d action, fiche, modèle', ordre.every((v, i) => v > 0 && (i === 0 || v > ordre[i - 1])), JSON.stringify(ordre));
verifie('la base d aide (96) ne répond plus avant la fiche dans la hotline (ses mots-clés répondaient à côté)', envoi.indexOf('tcAideCharly(') < 0);
verifie('« Tu fais quoi » (que des petits mots) trouve sa réponse mot pour mot', appel('(tcReponseDirecteHotline("Tu fais quoi") || {}).id') === 'Q1.4');
verifie('« je trouve pas mes contacts » : l entrée « Mes contacts », pas une autre qui partage ses mots forts', appel('(tcReponseDirecteHotline("je trouve pas mes contacts") || {}).id') === 'Q5.1');

// Mission 105 : les cinq exemples (textes validés), touchables, une seule fois par fil.
verifie('les cinq exemples, mot pour mot', /const TC_HOTLINE_EXEMPLES_INTRO = 'Je peux t’expliquer comment faire dans TimeCool\. Par exemple :';/.test(page)
  && ['changer la langue', 'régler tes notifications', 'ajouter un contact', 'changer le message envoyé en cas de retard', 'relier ton agenda Google'].every((x) => page.includes("['" + x + "', ")));
const exemples = (page.match(/const TC_HOTLINE_EXEMPLES = \[([\s\S]*?)\n\];/) || [])[1] || '';
const questions = (exemples.match(/, '([^']+)'\]/g) || []).map((x) => x.slice(3, -2));
verifie('chaque exemple touché trouve sa réponse dans la fiche, sans le modèle', questions.length === 5 && questions.every((q) => typeof appel('(tcReponseDirecteHotline(' + JSON.stringify(q) + ') || {}).id') === 'string' && /^Q/.test(appel('(tcReponseDirecteHotline(' + JSON.stringify(q) + ') || {}).id'))), JSON.stringify(questions.map((q) => appel('(tcReponseDirecteHotline(' + JSON.stringify(q) + ') || {}).id'))));
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
