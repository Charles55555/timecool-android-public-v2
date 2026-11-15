// Mission 94 (Charles, 15/11) : « Ma messagerie sécurisée » : plus de crayon ; la recherche trouve les conversations et les
// contacts TimeCool (un toucher ouvre la conversation) ; un contact sans TimeCool n'est pas proposé, la recherche le dit ;
// la phrase sous le titre ; la page vide.
// Usage : node verif-messagerie-recherche.js <index.html>   (Chrome du poste, ou TC_CHROME ; sans Chrome, la partie Chrome est sautée)
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 400) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(nom) {
  let d = page.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (page.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = page.indexOf('{', d); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(d, j + 1); }
  }
  return null;
}

titre('L en-tête');
const entete = (page.match(/<div class="page" id="page-messages">[\s\S]*?<div class="msg-menu" id="msgMenu">/) || [''])[0];
verifie('plus de crayon ✏️ (ni « Nouveau message »)', entete.length > 0 && entete.indexOf('✏️') < 0 && entete.indexOf("msgAction('new')") < 0 && page.indexOf("if (a === 'new')") < 0);
verifie('la phrase sous le titre : « 🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool. »', entete.indexOf('<div class="page-subtitle" id="msgSousTitre">🔒 Ici, tu écris seulement à tes contacts qui ont déjà TimeCool.</div>') > -1);
verifie('la case : « Rechercher un contact TimeCool ou une conversation »', entete.indexOf('placeholder="Rechercher un contact TimeCool ou une conversation"') > -1);
verifie('(chef) « ci‑dessus » ne se coupe pas en fin de ligne (trait d union insécable)', page.indexOf('Cherche un contact TimeCool ci‑dessus pour lui écrire.') > -1 && page.indexOf('Cherche un contact TimeCool ci-dessus') < 0);
verifie('(chef) le texte gris tient sur écran étroit : marges réduites, 12,5 px sous 420, 11,5 px sous 375, 12 px sous 340 (texte court)', page.indexOf('@media (max-width:420px) { .msg-search { padding:9px 10px; gap:6px; } .msg-search > span { font-size:13px !important; } .msg-search input::placeholder { font-size:12.5px; } }') > -1 && page.indexOf('@media (max-width:375px) { .msg-search input::placeholder { font-size:11.5px; } }') > -1 && page.indexOf('@media (max-width:340px) { .msg-search input::placeholder { font-size:12px; } }') > -1 && page.indexOf('.msg-search input { min-width:0; text-overflow:ellipsis; }') > -1);
verifie('rien ne se perd : « Nouveau groupe » (conversation à plusieurs) reste dans le menu ⋮', page.indexOf(`<div class="msg-menu-item" onclick="msgAction('newgroup')"><span class="mi-ic">👥</span>Nouveau groupe</div>`) > -1);

titre('La liste, rejouée');
const liste = { innerHTML: '' };
const champ = { value: '' };
const ctx = {
  console, String, Array, Object, JSON,
  _msgFilter: 'all',
  document: { getElementById: (id) => (id === 'messagesList' ? liste : id === 'msgSearch' ? champ : null) },
  window: { innerWidth: 390 },
  contactsList: [
    { id: 'p1', name: 'Paul Martin', referenceCompte: 'REFPAUL' },
    { id: 'm1', name: 'Marie Dupont' },
    { id: 'h1', name: 'Hélène Roux', referenceCompte: 'REFHEL' },
    { id: 'b1', name: 'Bruno Bloqué', referenceCompte: 'REFBRU', blocked: true },
  ],
  conversations: [],
  tcConversationsAffichables: () => ctx.conversations,
};
vm.createContext(ctx);
['escapeHTMLSafe', 'tcSansAccents', 'tcPrenomPresentable', 'getContactInitials', 'getContactColor', 'tcContactsCherches', 'tcContactsTimeCoolCherches', 'tcTexteRechercheMessagerie', 'renderMessages']
  .forEach((n) => { const f = fonction(n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
const texte = () => liste.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const chercher = (q) => { champ.value = q; ctx.renderMessages(); return liste.innerHTML; };
if (!ko) {
  chercher('');
  verifie('page vide : « Aucun message pour l’instant. Cherche un contact TimeCool ci‑dessus pour lui écrire. »', texte() === 'Aucun message pour l’instant. Cherche un contact TimeCool ci‑dessus pour lui écrire.', texte());
  const h = chercher('paul');
  verifie('« paul » : Paul Martin (TimeCool) proposé, « Écrire un message », un toucher ouvre sa conversation (messageContact)', /onclick="messageContact\('p1'\)"/.test(h) && /Paul Martin/.test(texte()) && /Écrire un message/.test(texte()), h);
  verifie('« helene » sans accent trouve Hélène Roux', /messageContact\('h1'\)/.test(chercher('helene')), texte());
  chercher('Marie');
  verifie('« Marie » (sans TimeCool) n est pas proposée : « Marie n’a pas encore TimeCool. Tu ne peux pas lui écrire ici. »', texte() === 'Marie n’a pas encore TimeCool. Tu ne peux pas lui écrire ici.' && liste.innerHTML.indexOf('messageContact') < 0, texte());
  chercher('Bruno');
  verifie('(examen) un contact TimeCool bloqué n est jamais proposé', liste.innerHTML.indexOf('messageContact') < 0 && texte() === 'Aucun contact TimeCool à ce nom.', texte());
  chercher('Zorro');
  verifie('rien ne correspond : « Aucun contact TimeCool à ce nom. »', texte() === 'Aucun contact TimeCool à ce nom.', texte());
  ctx.conversations = [{ id: 'srv_REFPAUL', reference: 'REFPAUL', with: 'Paul Martin', avatar: 'PM', icon: '', color: '#123', unread: 0, archived: false, thread: [{ from: 'them', text: 'Salut', time: '10:00' }] }];
  const h2 = chercher('paul');
  verifie('Paul a déjà une conversation : elle seule est montrée (pas de doublon « Écrire un message »)', (h2.match(/Paul Martin/g) || []).length === 1 && /openConversation\('srv_REFPAUL'\)/.test(h2) && h2.indexOf('messageContact') < 0, h2);
  const h3 = chercher('salut');
  verifie('la recherche dans les messages garde son chemin (« salut » trouve la conversation)', /openConversation\('srv_REFPAUL'\)/.test(h3), h3);
  verifie('(chef) à 390 et 360 px, le texte de Charles dans la case', (ctx.window.innerWidth = 390, chercher(''), champ.placeholder === 'Rechercher un contact TimeCool ou une conversation') && (ctx.window.innerWidth = 360, chercher(''), champ.placeholder === 'Rechercher un contact TimeCool ou une conversation'), champ.placeholder);
  verifie('(chef) sous 340 px, « Rechercher un contact ou une conversation »', (ctx.window.innerWidth = 320, chercher(''), champ.placeholder === 'Rechercher un contact ou une conversation'), champ.placeholder);
  ctx.window.innerWidth = 390;
  ctx._msgFilter = 'archived';
  chercher('Marie');
  verifie('dans les archives, la recherche ne propose pas de contact', liste.innerHTML.indexOf('messageContact') < 0 && /Aucun résultat/.test(texte()), texte());
  ctx._msgFilter = 'all';
}

titre('Dans un vrai Chrome (compte avec Paul Martin, TimeCool, et Marie Dupont, sans)');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-msgrech-'));
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    try { localStorage.setItem('tc_permissions_shown', '1'); } catch (e) {}
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    hideAuthFlow();
    contactsList.length = 0;
    contactsList.push({ id: 'p1', name: 'Paul Martin', referenceCompte: 'REFPAUL', phone: '0611111111' }, { id: 'm1', name: 'Marie Dupont', phone: '0622222222' });
    messages[mode] = [];
    navigate('messages');
    setTimeout(function () {
      var res = {};
      res.vide = document.getElementById('messagesList').innerText.trim();
      var si = document.getElementById('msgSearch');
      si.value = 'Paul'; renderMessages();
      var ligne = document.querySelector('#messagesList [data-contact-tc="p1"]');
      res.ligne = !!ligne;
      if (ligne) ligne.click();
      setTimeout(function () {
        var cb = document.getElementById('convBody');
        res.ouverte = !!cb && document.getElementById('page-messages') !== null;
        res.titre = (document.querySelector('.conv-name, .conv-title, #convName') || {}).textContent || '';
        res.conv = (messages[mode] || []).map(function (c) { return { with: c.with, reference: c.reference || null }; });
        var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
      }, 700);
    }, 600);
  }, 1200); });</script>`;
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=15000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  verifie('page vide : la phrase qui dit quoi faire', !!res && res.vide === 'Aucun message pour l’instant. Cherche un contact TimeCool ci‑dessus pour lui écrire.', JSON.stringify(res));
  verifie('« Paul » : la ligne de Paul Martin ; un toucher ouvre sa conversation, rattachée à son compte TimeCool', !!res && res.ligne && res.ouverte && res.conv.length === 1 && res.conv[0].with === 'Paul Martin' && res.conv[0].reference === 'REFPAUL', JSON.stringify(res));
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
