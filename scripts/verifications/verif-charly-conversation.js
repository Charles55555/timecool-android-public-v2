// Mission 100 (Charles, 16/11 : « comme WhatsApp ») : « Charly, ton aide TimeCool » s'ouvre comme une conversation de la messagerie
// (en-tête au nom de Charly, flèche retour, bulles, case d'écriture), Charly y répond comme sur sa page (aide sans le modèle,
// fiches, cartes), l'histoire reste et son dernier message s'affiche dans la liste ; la page de Charly ouverte autrement ne change pas.
// Usage : node verif-charly-conversation.js <index.html>   (Chrome du poste, ou TC_CHROME ; sans Chrome, la partie Chrome est sautée)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 600) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }

titre('Dans la page');
verifie('l en-tête de la page de Charly porte les deux noms (page / conversation)', page.includes('<span class="tc-nom-page">Charly IA</span><span class="tc-nom-conv">Charly, ton aide TimeCool</span>'));
verifie('le mode conversation cache les rangées de boutons et « Recommencer »', /#page-assistant\.tc-charly-conv #charlyQuickActions2,\n#page-assistant\.tc-charly-conv #charlyResetBtn \{ display:none !important; \}/.test(page));
verifie('l accueil automatique de Charly n est pas un échange : l aperçu l ignore', /function tcApercuCharly\(\)[\s\S]{0,700}m\.appText \|\| m\._app\) continue;/.test(page));
verifie('une seule histoire : la conversation utilise charlyIA.history (pas de second fil)', !/charlyConvHistory|_tcFilCharlyConv/.test(page) && page.includes('function tcApercuCharly()'));

titre('Dans la vraie page (Chrome)');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    window.__modele = 0;
    tcCharlyPret = function () { return true; };
    tcRelais = async function () { window.__modele++; throw new Error('modele'); };
    hideAuthFlow();
    try { localStorage.removeItem('timecool_charly_historique'); } catch (e) {}
    charlyIA.history = [];
    contactsList = [{ id: 'w1', name: 'William Ayache', phone: '0611223344' }, { id: 'w2', name: 'William Cohen', phone: '0655667788' }];
    messages[mode] = [{ id: 'c1', with: 'Paul Martin', avatar: 'PM', color: '#123', icon: '', unread: 0, archived: false, thread: [{ from: 'them', text: 'Salut', time: '10:00' }] }];
    var res = {};
    var pa = document.getElementById('page-assistant');
    var vu = function (id) { var e = document.getElementById(id); return !!(e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'); };
    var envoyer = function (t, k) { document.getElementById('charlyInput').value = t; Promise.resolve(charlySendMessage()).catch(function () {}).then(function () { setTimeout(k, 900); }); };
    navigate('calendar'); navigate('messages');
    res.apercuVide = (document.querySelector('#msgCharly .msg-text') || {}).innerText || '';
    document.getElementById('msgCharly').click();
    setTimeout(function () {
      res.ouverte = pa.classList.contains('active') && pa.classList.contains('tc-charly-conv');
      res.nom = (pa.querySelector('.conv-name') || {}).innerText || '';
      res.boutonsCaches = !vu('charlyQuickActions') && !vu('charlyQuickActions2') && !vu('charlyQuickIntro') && !vu('charlyResetBtn');
      res.caseVisible = vu('charlyInput') && vu('charlySendBtn');
      res.videTexte = (document.getElementById('charlyChatBody') || {}).innerText || '';
      envoyer('Comment changer la langue ?', function () {
        var d = charlyIA.history[charlyIA.history.length - 1] || {};
        res.aide = !!d._aide; res.modeleAide = window.__modele;
        envoyer('William', function () {
          var body = document.getElementById('charlyChatBody');
          res.fiches = (body.innerHTML.match(/Ouvrir la fiche/g) || []).length;
          // Ouvrir la fiche puis revenir : la conversation garde son allure.
          var b = Array.prototype.find.call(body.querySelectorAll('button'), function (x) { return /Ouvrir la fiche/.test(x.textContent); });
          if (b) b.click();
          setTimeout(function () {
            res.surContacts = document.getElementById('page-contacts').classList.contains('active');
            tcRetour();
            setTimeout(function () {
              res.retourConv = pa.classList.contains('active') && pa.classList.contains('tc-charly-conv');
              tcRetour();
              setTimeout(function () {
                res.retourMessagerie = document.getElementById('page-messages').classList.contains('active');
                var l = document.getElementById('messagesList');
                res.premier = l && l.firstElementChild ? l.firstElementChild.id : '';
                res.apercu = (document.querySelector('#msgCharly .msg-text') || {}).innerText || '';
                // L'histoire reste : la page rechargée la relit sur l'appareil.
                charlyIA.history = []; charlyIA._historiqueCharge = false;
                res.apercuApresRechargement = tcApercuCharly();
                document.getElementById('msgCharly').click();
                setTimeout(function () {
                  res.historiqueRelu = /William Ayache/.test(document.getElementById('charlyChatBody').innerHTML) && /changer la langue/i.test(document.getElementById('charlyChatBody').innerText);
                  // Ouverte autrement (menu, bouton) : la page de Charly comme avant.
                  navigate('calendar'); navigate('assistant');
                  setTimeout(function () {
                    res.pageNormale = pa.classList.contains('active') && !pa.classList.contains('tc-charly-conv') && vu('charlyQuickActions') && vu('charlyResetBtn') && /Charly IA/.test((pa.querySelector('.conv-name') || {}).innerText || '');
                    // Mission 101 : page de Charly -> messagerie -> ligne -> flèche -> flèche : la page retrouve son allure d'origine.
                    navigate('messages');
                    document.getElementById('msgCharly').click();
                    setTimeout(function () {
                      res.doubleConv = pa.classList.contains('tc-charly-conv');
                      tcRetour();
                      setTimeout(function () {
                        res.doubleMessagerie = document.getElementById('page-messages').classList.contains('active');
                        tcRetour();
                        setTimeout(function () {
                          res.doublePage = pa.classList.contains('active') && !pa.classList.contains('tc-charly-conv') && vu('charlyQuickActions') && vu('charlyResetBtn');
                          // Mission 101 : 100 messages avec des fiches et des cartes, la conversation s'ouvre vite.
                          var h = [];
                          for (var i = 0; i < 50; i++) {
                            h.push({ role: 'user', content: 'Message ' + i });
                            h.push(i % 3 === 0 ? { role: 'assistant', content: 'Voici les contacts à ce nom :', _fiches: { ids: ['w1', 'w2'] } }
                              : (i % 3 === 1 ? { role: 'assistant', content: 'Je te propose :\\n[AGENDA]{"title":"Dentiste","date":"2026-11-20","time":"15:00","duration":30}[/AGENDA]', tempId: 't' + i }
                              : { role: 'assistant', content: 'Réponse ' + i }));
                          }
                          charlyIA.history = h;
                          tcSauverHistoriqueCharly();
                          res.gardes = JSON.parse(localStorage.getItem('timecool_charly_historique') || '[]').length;
                          navigate('messages');
                          var t0 = performance.now();
                          renderCharlyChat();
                          res.msRendu = Math.round(performance.now() - t0);
                          res.bulles = document.getElementById('charlyChatBody').children.length;
                          var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
                        }, 300);
                      }, 300);
                    }, 300);
                  }, 300);
                }, 300);
              }, 300);
            }, 300);
          }, 300);
        });
      });
    }, 300);
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-charly-conv-'));
  fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
  const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
  let res = null;
  try { res = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { res = null; }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  const R = res || {};
  const norm = (t) => String(t || '').replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ');
  verifie('avant tout échange, la ligne garde sa phrase : « Une question ? Demande-moi : « Comment changer la langue ? » »', /Une question \? Demande-moi : « Comment changer la langue \? »/.test(norm(R.apercuVide)), R.apercuVide);
  verifie('un toucher ouvre la conversation : en-tête « Charly, ton aide TimeCool »', R.ouverte === true && R.nom === 'Charly, ton aide TimeCool', JSON.stringify([R.ouverte, R.nom]));
  verifie('pas de rangées de boutons ni de « Recommencer » ; la case d écriture et le bouton d envoi sont là', R.boutonsCaches === true && R.caseVisible === true, JSON.stringify([R.boutonsCaches, R.caseVisible]));
  verifie('conversation vide : la même phrase, au milieu', /Une question \? Demande-moi/.test(norm(R.videTexte)) && !/Bonjour, je suis Charly IA/.test(R.videTexte || ''), R.videTexte);
  verifie('une question d aide reçoit sa réponse (mission 96), sans le modèle', R.aide === true && R.modeleAide === 0, JSON.stringify([R.aide, R.modeleAide]));
  verifie('« William » : les fiches et leurs boutons, dans la conversation', R.fiches === 2, R.fiches);
  verifie('« Ouvrir la fiche » mène aux contacts ; la flèche retour ramène à la conversation, puis à la messagerie', R.surContacts === true && R.retourConv === true && R.retourMessagerie === true, JSON.stringify([R.surContacts, R.retourConv, R.retourMessagerie]));
  verifie('la ligne de Charly reste en tête ; son aperçu montre le dernier message', R.premier === 'msgCharly' && /contacts à ce nom/.test(R.apercu || ''), JSON.stringify([R.premier, R.apercu]));
  verifie('l histoire reste sur l appareil : aperçu et échanges relus en rouvrant', /contacts à ce nom/.test(R.apercuApresRechargement || '') && R.historiqueRelu === true, JSON.stringify([R.apercuApresRechargement, R.historiqueRelu]));
  verifie('ouverte autrement, la page de Charly est comme avant (boutons, « Recommencer », « Charly IA »)', R.pageNormale === true, JSON.stringify(R.pageNormale));
  verifie('page de Charly -> messagerie -> ligne -> flèche -> flèche : la page retrouve son allure d origine (mission 101)', R.doubleConv === true && R.doubleMessagerie === true && R.doublePage === true, JSON.stringify([R.doubleConv, R.doubleMessagerie, R.doublePage]));
  verifie('100 messages gardés sur l appareil (mission 101)', R.gardes === 100, R.gardes);
  // Le temps se mesure hors de cette suite (temps virtuel de Chrome) : 2 à 10 ms pour 100 messages et 3 316 contacts, le 16/11.
  verifie('100 messages avec fiches et cartes : les 100 bulles se dessinent', R.bulles >= 100, JSON.stringify([R.bulles, R.msRendu]));
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
