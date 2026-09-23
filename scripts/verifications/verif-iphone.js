// Les envois vus depuis un iPhone.
//
// Deux différences d'Apple, invisibles depuis un Android : le séparateur
// du corps d'un SMS, et le blocage des ouvertures de fenêtre après une
// attente. Aucune des deux ne se voit en testant sur un seul téléphone.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

const d = html.indexOf('function tcLienSms(');
const f = html.indexOf('/**\n * Un prenom presentable');
if (d < 0 || f < d) { console.log('ERREUR: aides introuvables'); process.exit(1); }
const SOURCE = html.slice(d, f);

function avec(agent) {
  const c = { navigator: { userAgent: agent }, encodeURIComponent, String, console };
  c.window = { location: { href: '' }, open: () => c._ouvert };
  vm.createContext(c);
  vm.runInContext(SOURCE
    + '\nglobalThis._s = tcLienSms; globalThis._o = tcOuvrirAilleurs;', c);
  return c;
}

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) Chrome/140';
const IPHONE  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Safari/605';
const IPAD    = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605';

console.log('\n── Le corps du SMS, selon le téléphone ──');
{
  const a = avec(ANDROID)._s('+33 6 07 78 65 12', 'Bonjour');
  verifie('Android : séparateur « ? »', a === 'sms:+33607786512?body=Bonjour', a);

  const i = avec(IPHONE)._s('+33 6 07 78 65 12', 'Bonjour');
  verifie('iPhone : séparateur « & »', i === 'sms:+33607786512&body=Bonjour', i);

  const p = avec(IPAD)._s('0607786512', 'Bonjour');
  verifie('iPad en mode bureau : « & » aussi',
    p === 'sms:0607786512&body=Bonjour', p);
}

console.log('\n── Le texte reste intact ──');
{
  const c = avec(IPHONE);
  const lien = c._s('0600000000', 'Salut Julian, mardi 10h30 : https://x.fr/a?c=1');
  const corps = decodeURIComponent(lien.split('&body=')[1]);
  verifie('accents, virgules et lien passent',
    corps === 'Salut Julian, mardi 10h30 : https://x.fr/a?c=1', corps);
}

console.log('\n── WhatsApp quand Safari bloque la fenêtre ──');
{
  const c = avec(IPHONE);
  c._ouvert = null;                    // Safari a refusé
  c._o('https://wa.me/33600000000?text=Bonjour');
  verifie('on se rabat sur une navigation',
    c.window.location.href === 'https://wa.me/33600000000?text=Bonjour',
    c.window.location.href || '(rien)');

  const c2 = avec(ANDROID);
  c2._ouvert = { ok: true };           // la fenêtre s'est ouverte
  c2._o('https://wa.me/33600000000?text=Bonjour');
  verifie('sinon on ne quitte pas la page',
    c2.window.location.href === '', JSON.stringify(c2.window.location.href));
}

console.log('\n── Plus de lien écrit en dur ──');
const enDur = html.match(/=\s*['"`]sms:/g) || [];
verifie('aucun lien SMS ecrit a la main',
  enDur.length === 0,
  'définition + créneaux + invitation');
verifie('plus de « ?body= » écrit en dur',
  !/'sms:' \+ [^\n]*\?body=/.test(html));
verifie('WhatsApp passe par l ouverture protégée',
  /tcOuvrirAilleurs\('https:\/\/wa\.me\//.test(html));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
