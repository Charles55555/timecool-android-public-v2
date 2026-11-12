// Mission 81 (Charles, 12/11 ; exigence Google Play) : « Supprimer mon compte ».
// 1. La page (bouton, confirmation, adresse web). 2. L'API, lue. 3. Contre l'API (TC_API) : deux comptes de test.
// Usage : node verif-suppression-compte.js <index.html> <index.php>
require('./comptes-jetables');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const D = __dirname;
const page = fs.readFileSync(process.argv[2] || path.join(D, '../../app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(D, '../../backend/api/index.php'), 'utf8');
const API = process.env.TC_API || 'https://api.timecool.fr';
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + d : '')); } };

function fonction(src, nom) {
  const i = src.search(new RegExp('(async )?function ' + nom + '\\('));
  if (i < 0) return '';
  let n = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (n === 0) return src.slice(i, k + 1); }
  }
  return '';
}

// ─── 1. La page ───────────────────────────────────────────────
const reglages = fonction(page, 'renderSettingsInterne') || '';
const iDeco = page.indexOf('🚪 Se déconnecter\n    </button>');
const iSuppr = page.indexOf('id="btnSupprimerMonCompte" onclick="tcSupprimerMonCompte()"');
verifie('Paramètres : « Supprimer mon compte » tout en bas, sous « Se déconnecter »', iDeco > 0 && iSuppr > iDeco && iSuppr - iDeco < 400 && page.includes('      Supprimer mon compte\n    </button>\n  `;'));
verifie('un seul bouton « Supprimer mon compte »', (page.match(/onclick="tcSupprimerMonCompte\(\)"/g) || []).length === 1);
verifie('la page appelle POST /compte/supprimer', page.includes("tcAppel('POST', '/compte/supprimer', { confirmation: confirmation })"));
verifie('le texte de la confirmation', page.includes('Supprimer ton compte ?\\nTon agenda, tes contacts et tes messages seront effacés, sans retour possible.\\n\\nÉcris « supprimer » pour confirmer.'));
verifie('l adresse web : #supprimer-mon-compte', page.includes('/^#supprimer-mon-compte$/i.test(String(location.hash') && /setTimeout\(tcSuppressionDepuisLien, 900\);\n\}/.test(page));
verifie('vocabulaire calme (pas de « définitivement détruit »…)', !/détruit|irréversiblement|ATTENTION/.test(fonction(page, 'tcSupprimerMonCompte')));

// La confirmation, jouée.
async function jouer(saisie, echec) {
  const journal = [];
  const ctx = {
    journal, localStorage: { setItem: (k, v) => journal.push('set ' + k + '=' + v), removeItem: (k) => journal.push('rm ' + k), getItem: () => 'true' },
    TC_COMPTE_LOCAL_KEY: 'tc_compte', _tcSyncBientot: null,
    tcPrompt: async () => saisie,
    TC_BACKEND: {
      supprimerMonCompte: async (m) => { journal.push('api ' + m); if (echec) { const e = new Error(echec); throw e; } },
      deconnecter: async () => { journal.push('deconnecter'); }, estConnecte: () => true,
    },
    showToast: (t) => journal.push('toast ' + t), showAuthFlow: (p) => journal.push('auth ' + p),
    tcOublierMotDePasse: () => journal.push('oublier'), tcViderDonneesDuCompte: () => journal.push('vider'), tcViderChampsConnexion: () => journal.push('champs'),
    clearTimeout: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(fonction(page, 'tcSupprimerMonCompte') + '\nthis.f = tcSupprimerMonCompte;', ctx);
  const r = await ctx.f();
  return { r, journal };
}

// ─── 2. L'API, lue ────────────────────────────────────────────
const i = api.indexOf("case 'POST /compte/supprimer':");
const route = i < 0 ? '' : api.slice(i, api.indexOf("\n    case '", i + 10));
verifie('route POST /compte/supprimer', !!route);
verifie('route : le mot « supprimer » exigé', route.includes("if ($mot !== 'supprimer')") && route.includes("'confirmation_requise'"));
verifie('route : un administrateur refusé', route.includes("if ((int) ($moi['admin'] ?? 0) === 1)") && route.includes("'administrateur'"));
verifie('route : l accès Google rendu, sans bloquer la suppression', route.includes("googlePoster('https://oauth2.googleapis.com/revoke'") && route.includes('catch (Throwable $e)') && route.indexOf('compteEffacer((int) $moi[') > route.indexOf('catch (Throwable $e)'));
verifie('route : même effacement que l administrateur (compteEffacer)', route.includes("compteEffacer((int) $moi['id']);"));
verifie('une demande disparue : « Cette demande n’est plus valable. »', (api.match(/Cette demande n’est plus valable\./g) || []).length === 5 && !api.includes('Demande inconnue ou déjà traitée.'));

// ─── 3. Contre l'API ──────────────────────────────────────────
async function appel(m, chemin, corps, jeton) {
  const r = await fetch(API + chemin, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let d = null;
  try { d = await r.json(); } catch (e) { /* vide */ }
  return { code: r.status, d: d || {} };
}
let n = 0;
async function inscrire(prenom, email) {
  n++;
  const r = await appel('POST', '/inscription', { email: email || ('sonde.suppression.' + prenom.toLowerCase() + Date.now() + n + '@exemple-timecool.fr'), telephone: '+3363998' + String(Date.now() + n * 211).slice(-4), mot_de_passe: 'MotDePasseDeTest2026!', prenom, nom: 'Suppression', ville: 'Lyon', code_postal: '69001' });
  if (r.code !== 201 && r.code !== 200) throw new Error(prenom + ' : ' + JSON.stringify(r.d));
  return { ref: r.d.compte.reference, jeton: r.d.session.jeton, email: r.d.compte.email };
}

(async () => {
  let r = await jouer('non');
  verifie('confirmation : un autre mot, rien n est effacé', r.r === false && !r.journal.some((l) => l.startsWith('api')) && r.journal.includes('toast Rien n’est effacé : le mot ne correspond pas.'), r.journal.join(' | '));
  r = await jouer(null);
  verifie('confirmation : « Annuler », rien n est effacé', r.r === false && r.journal.length === 0, r.journal.join(' | '));
  r = await jouer(' Supprimer ', 'Ce compte est administrateur : il ne peut pas être supprimé d’ici.');
  verifie('refus du serveur : le message, l appareil garde tout', r.r === false && r.journal.includes('toast ⚠️ Ce compte est administrateur : il ne peut pas être supprimé d’ici.') && !r.journal.includes('vider'), r.journal.join(' | '));
  r = await jouer('supprimer');
  verifie('supprimé : l appareil oublie tout, retour à l accueil', r.r === true && ['api supprimer', 'deconnecter', 'set timecool_session_active=false', 'oublier', 'vider', 'rm tc_compte', 'champs', 'auth auth-welcome'].every((x) => r.journal.includes(x)) && r.journal.includes('toast Ton compte est supprimé. Merci d’avoir essayé TimeCool.'), r.journal.join(' | '));

  const lea = await inscrire('Lea');
  const marc = await inscrire('Marc');
  const dem = await appel('POST', '/rdv/demander', { reference: marc.ref }, lea.jeton);
  verifie('Léa demande un rendez-vous à Marc', dem.code === 200 && typeof dem.d.rdv === 'number', JSON.stringify(dem.d));
  let s = await appel('POST', '/compte/supprimer', { confirmation: 'oui' }, lea.jeton);
  verifie('un autre mot que « supprimer » : 400, rien n est effacé', s.code === 400 && s.d.erreur === 'confirmation_requise', JSON.stringify(s.d));
  s = await appel('POST', '/compte/supprimer', {}, undefined);
  verifie('sans session : 401', s.code === 401, String(s.code));
  s = await appel('POST', '/compte/supprimer', { confirmation: 'Supprimer' }, lea.jeton);
  verifie('« Supprimer » : le compte de Léa est supprimé', s.code === 200 && s.d.supprime === true, JSON.stringify(s.d));
  s = await appel('GET', '/moi', undefined, lea.jeton);
  verifie('sa session ne sert plus', s.code === 401, String(s.code));
  s = await appel('POST', '/connexion', { identifiant: lea.email, mot_de_passe: 'MotDePasseDeTest2026!' });
  verifie('on ne peut plus s y connecter', s.code !== 200 && !s.d.session, String(s.code));
  s = await appel('POST', '/rdv/proposer-creneau', { rdv: dem.d.rdv, date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), debut: '10:00', duree: 60 }, marc.jeton);
  verifie('chez Marc, la demande de Léa : « Cette demande n’est plus valable. »', s.code === 404 && s.d.message === 'Cette demande n’est plus valable.', JSON.stringify(s.d));
  s = await appel('GET', '/sync?depuis=0', undefined, marc.jeton);
  verifie('le compte de Marc n a pas bougé', s.code === 200, String(s.code));
  const deNouveau = await inscrire('Lea', lea.email);
  verifie('l adresse de Léa est libre : une nouvelle inscription passe', !!deNouveau.ref && deNouveau.ref !== lea.ref);

  console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
