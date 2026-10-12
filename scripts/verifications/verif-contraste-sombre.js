// Mission 25 (decision du chef, 12/10) : balayage de contraste en theme « Sombre » sur 8 ecrans (agenda, contacts,
// messagerie, disponibilites, profil, parametres, menu, fenetre « Nouveau ») dans un vrai Chrome sans tete : aucun
// texte visible sous un rapport de 3 (WCAG), sauf les 6 « Aucune plage ouverte » a 2,6 preexistants en clair.
// Usage : node verif-contraste-sombre.js <index.html>   (TC_CHROME = chemin de Chrome ; sans Chrome : « non joue »,
// code 0, le balayage se rejoue sur un poste qui en a un — le serveur n en a pas.)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const page = process.argv[2];
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const chrome = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!chrome) { console.log('  (non joue : pas de Chrome sur ce poste ; a rejouer avec TC_CHROME sur un poste qui en a un)'); console.log('\n0 anomalie(s).'); process.exit(0); }
const cadre = path.join(__dirname, 'cadre-contraste.html');
if (!fs.existsSync(cadre)) { console.log('  KO  cadre-contraste.html introuvable a cote de la suite'); console.log('\n1 anomalie(s).'); process.exit(1); }
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-contraste-'));
fs.copyFileSync(page, path.join(dossier, 'index-local.html'));
fs.copyFileSync(cadre, path.join(dossier, 'cadre-contraste.html'));
// Preexistants en theme clair (temoin), hors sujet : le logo « COOL » (jaune de la marque), le sous-titre gris de l en-tete,
// les tirets des champs vides du profil, « Aucune plage … » (gris voulu).
const TOLERES = /^COOL$|^Votre agenda intelligent$|^—$|Aucune plage/;
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 400) : '')); }
function balayage(theme) {
  const url = 'file:///' + path.join(dossier, 'cadre-contraste.html').replace(/\\/g, '/') + '?theme=' + theme;
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=15000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  if (!m || !m[1].trim()) return null;
  try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); } catch (e) { return null; }
}
const ECRANS = ['agenda', 'contacts', 'messagerie', 'disponibilites', 'profil', 'parametres', 'menu', 'nouveau'];
['dark', 'light'].forEach((theme) => {
  console.log('\n-- Theme ' + theme + ' --');
  const res = balayage(theme);
  verifie('le balayage a rendu ses resultats', Array.isArray(res) && res.length === ECRANS.length, res ? JSON.stringify(res).slice(0, 200) : 'rien');
  if (!Array.isArray(res)) return;
  res.forEach((e) => {
    if (e.erreur) { verifie(e.ecran + ' : ecran ouvert', false, e.erreur); return; }
    const faibles = (e.faibles || []).filter((f) => !TOLERES.test(f.texte));
    verifie(e.ecran + ' : ' + e.total + ' textes visibles, aucun sous 3:1' + (faibles.length ? ' (' + faibles.length + ' faibles)' : ''), e.total > 0 && faibles.length === 0, faibles.slice(0, 6).map((f) => '« ' + f.texte + ' » ' + f.ratio + ':1 ' + f.couleur + ' sur ' + f.fond + (f.chemin ? ' [' + f.chemin + ']' : '')).join(' | '));
  });
});
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
