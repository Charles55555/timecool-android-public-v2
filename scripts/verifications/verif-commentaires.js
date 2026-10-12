// Mission 33 (Charles, 12/10) : « Envoyer mon commentaire » envoie vraiment (API POST /commentaires : base + e-mail a
// social@timecool.fr), et les reponses de l aide sont justes (langues comptees, Notifications, plus de « cle », Journal).
// Usage : node verif-commentaires.js <index.html> <backend/api/index.php> <backend/sql/011_commentaires.sql>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
const sql = fs.readFileSync(process.argv[4], 'utf8');
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
function morceau(texte, debut, fin) { const d = texte.indexOf(debut); if (d < 0) return ''; const f = texte.indexOf(fin, d + debut.length); return f < 0 ? texte.slice(d) : texte.slice(d, f); }

titre('1. La page : l envoi part vers l API quand une session est ouverte');
const sf = fonction(page, 'sendFeedback') || '';
verifie('sendFeedback existe, une seule fois, et est asynchrone', page.split('function sendFeedback(').length === 2 && /^async function sendFeedback\(/.test(sf));
verifie('un texte vide est refuse comme avant', /if \(!text\) \{ showToast\('⚠️ Écris un commentaire d\\'abord'\); return; \}/.test(sf));
verifie('2000 caracteres au plus (meme limite que l API)', /text\.length > 2000/.test(sf) && /mb_strlen\(\$texte\) > 2000/.test(api));
verifie('la copie locale timecool_feedbacks est gardee (rien ne se perd hors ligne)', /localStorage\.setItem\('timecool_feedbacks'/.test(sf));
verifie('connecte : TC_BACKEND.envoyerCommentaire(text, contexte) ; deconnecte : rien n est appele', /TC_BACKEND\.estConnecte\(\)\) \{\s*try \{ await TC_BACKEND\.envoyerCommentaire\(text, tcContexteCommentaire\(\)\); envoye = true; \}/.test(sf));
verifie('un echec d envoi ne bloque pas : avertissement console, toast « enregistré »', /catch \(e\) \{ console\.warn\('Commentaire non transmis/.test(sf) && /showToast\(envoye \? '✅ Merci ! Ton commentaire a été envoyé à l’équipe' : '✅ Merci ! Ton commentaire a été enregistré'\)/.test(sf));
verifie('le champ est vide apres l envoi, comme avant', /document\.getElementById\('feedbackTextarea'\)\.value = '';/.test(sf));
const tb = morceau(page, 'async envoyerCommentaire(texte, contexte) {', '},');
verifie('TC_BACKEND.envoyerCommentaire : POST /commentaires {texte, version, appareil}', /tcAppel\('POST', '\/commentaires', \{ texte: texte, version: [^}]*appareil: [^}]*\}\)/.test(tb));
const cx = fonction(page, 'tcContexteCommentaire') || '';
verifie('le contexte : version du build (tcInfosVersion) ou « web », appareil = navigateur (120 car.), rien de personnel', /tcInfosVersion\(\)\.version/.test(cx) && /version = 'web'/.test(cx) && /navigator\.userAgent[^;]*slice\(0, 120\)/.test(cx) && !/email|telephone|prenom/.test(cx));
verifie('le bouton « Envoyer mon commentaire » appelle toujours sendFeedback', /onclick="sendFeedback\(\)"/.test(page));

titre('2. La page : les reponses de l aide');
const aide = morceau(page, "{q: '📋 Que sont les \"Journal d’activité\" ?'", 'function ');
verifie('langues : le nombre est calcule (tcNombreDeLangues), plus « 17 langues européennes » en dur', /'TimeCool est disponible en ' \+ tcNombreDeLangues\(\) \+ ' langues\./.test(page) && page.indexOf('17 langues européennes') < 0);
const ctx = { console, String, Array }; vm.createContext(ctx);
const nl = fonction(page, 'tcNombreDeLangues'); const sl = page.match(/const SUPPORTED_LANGUAGES = \[[\s\S]*?\n\];/);
if (nl && sl) { vm.runInContext(sl[0] + '\n' + nl, ctx); } else { ko++; console.log('  KO  tcNombreDeLangues ou SUPPORTED_LANGUAGES introuvable'); }
const attendu = sl ? (sl[0].match(/active:\s*true/g) || []).length : -1;
verifie('tcNombreDeLangues() = nombre de langues actives de SUPPORTED_LANGUAGES (' + attendu + ')', ctx.tcNombreDeLangues && ctx.tcNombreDeLangues() === attendu && attendu > 0, ctx.tcNombreDeLangues && ctx.tcNombreDeLangues());
verifie('rappels : « Paramètres → Notifications » (plus « Rappels »)', page.indexOf("a: 'Va dans Paramètres → Notifications. Tu choisis le délai") > 0 && page.indexOf('Va dans Paramètres → Rappels') < 0);
verifie('Charly IA : plus de phrase sur « ta propre clé » / « Configuration IA »', page.indexOf('Si tu préfères utiliser ta propre clé') < 0 && page.indexOf("L\\'intelligence artificielle est prise en charge par TimeCool.'}") > 0);
verifie('Journal : les statuts (préparée, envoyée, confirmée…), du mois ou des trois derniers mois, archiver', /Tu y retrouves chaque démarche avec son statut \(préparée, envoyée, confirmée…\)/.test(page) && page.indexOf('statut de chaque démarche en temps réel') < 0);

titre('3. L API : POST /commentaires');
const route = morceau(api, "case 'POST /commentaires':", "case 'POST /compte/langue':");
verifie('la route existe une fois, avant POST /compte/langue', api.split("case 'POST /commentaires':").length === 2 && route.length > 200);
verifie('compte obligatoire (Auth::compte), texte requis (400 champs_manquants), 2000 au plus (400 texte_trop_long)', /\$compte = Auth::compte\(\);/.test(route) && /Rep::erreur\(400, 'champs_manquants'/.test(route) && /Rep::erreur\(400, 'texte_trop_long'/.test(route));
verifie('version (40) et appareil (120) tronques, NULL si vides', /mb_substr\([^;]*'version'[^;]*, 0, 40\)/.test(route) && /mb_substr\([^;]*'appareil'[^;]*, 0, 120\)/.test(route) && /\$version !== '' \? \$version : null, \$appareil !== '' \? \$appareil : null/.test(route));
verifie('INSERT dans commentaires (compte_id, texte, version, appareil) AVANT l e-mail : la base fait foi', /INSERT INTO commentaires \(compte_id, texte, version, appareil\) VALUES \(\?, \?, \?, \?\)/.test(route) && route.indexOf('INSERT INTO commentaires') < route.indexOf('envoyerEmail('));
verifie('e-mail a social@timecool.fr, sujet « Commentaire TimeCool — Prénom Nom », dans un try/catch', /envoyerEmail\('social@timecool\.fr', 'Commentaire TimeCool — ' \. /.test(route) && /\} catch \(Throwable \$e\) \{/.test(route) && /error_log\('Commentaire '/.test(route));
verifie('e-mail parti → email_envoye = 1 ; sinon la ligne reste et la reponse dit email_envoye:false', /UPDATE commentaires SET email_envoye = 1 WHERE id = \?/.test(route) && /Rep::ok\(\['id' => \$commentaireId, 'email_envoye' => \$emailEnvoye, 'compte_de_test' => \$compteDeTest\]\)/.test(route));
verifie('un compte de test (@exemple-timecool.fr) : enregistre, jamais d e-mail (les sondes e2e ne derangent personne)', /str_ends_with\(strtolower\(\(string\) \(\$compte\['email'\] \?\? ''\)\), '@exemple-timecool\.fr'\)/.test(route) && /if \(!\$compteDeTest\) try \{/.test(route));
verifie('le corps de l e-mail : texte, compte (nom, reference, e-mail), version, appareil, date, numero', /\$texte \. "\\n\\n— Compte : "/.test(route) && /'— Version : '/.test(route) && /'— Appareil : '/.test(route) && /'— N° ' \. \$commentaireId/.test(route));

titre('4. La migration 011');
verifie('CREATE TABLE IF NOT EXISTS commentaires (rejouable)', /CREATE TABLE IF NOT EXISTS commentaires \(/.test(sql));
verifie('colonnes : id, compte_id, texte TEXT, version(40), appareil(120), email_envoye, cree_le ; index par compte', /compte_id\s+INT UNSIGNED NOT NULL/.test(sql) && /texte\s+TEXT NOT NULL/.test(sql) && /version\s+VARCHAR\(40\)/.test(sql) && /appareil\s+VARCHAR\(120\)/.test(sql) && /email_envoye TINYINT\(1\) NOT NULL DEFAULT 0/.test(sql) && /cree_le\s+DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP/.test(sql) && /KEY idx_commentaires_compte \(compte_id, cree_le\)/.test(sql));
verifie('utf8mb4', /utf8mb4_unicode_ci/.test(sql));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
