// Mission 100, puis 102 (Charles, 16/11 : « je veux une messagerie indépendante de la page charly … comme le fait WhatsApp … qui
// pourrait servir de hotline ») : « Charly, ton aide TimeCool » s'ouvre dans l'écran de conversation de la messagerie, avec son fil à
// elle (jamais l'histoire de la page Charly IA). Les réponses d'aide d'abord, sans le modèle ; le modèle pour les autres questions
// sur l'appli ; une demande d'agenda renvoie à la page Charly IA avec un bouton, sans carte. La ligne a un fond bleu ciel.
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
verifie('la conversation d aide a sa propre clé sur l appareil (pas celle de la page Charly IA)', /const TC_CONV_CHARLY_CLE = 'timecool_charly_aide';/.test(page) && !/TC_CONV_CHARLY_CLE = 'timecool_charly_historique'/.test(page));
verifie('la page Charly IA n a plus de mode « conversation » (mission 100 retirée)', !/tc-charly-conv|tc-nom-conv|_tcCharlyEnConv|_tcPileConv/.test(page) && page.includes('<div class="conv-name">Charly IA</div><div class="conv-sub" id="charlyStatus">'));
verifie('fond bleu ciel, en clair et en sombre', /'--tc-charly-ligne':'#cdeafc'/.test(page) && /'--tc-charly-ligne':'#b9dff7'/.test(page) && /#msgCharly, #msgCharly:hover \{ background:var\(--tc-charly-ligne/.test(page));
verifie('le modèle ne lit que les 10 derniers messages de la conversation d aide, 100 gardés', /const TC_CONV_CHARLY_MAX = 100;/.test(page) && /const TC_CONV_CHARLY_MODELE_MAX = 10;/.test(page));
verifie('aucune carte de rendez-vous dans la conversation d aide : les blocs [AGENDA] du modèle sont retirés', /function tcEnvoyerConvCharly[\s\S]{0,3000}replace\(\/\\\[AGENDA\\\]/.test(page));

titre('Dans la vraie page (Chrome)');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const js = `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    window.__modele = []; window.__reponse = 'Oui. TimeCool garde ton agenda sur ton téléphone, même sans internet.';
    tcCharlyPret = function () { return true; };
    callAI = async function (msgs) { window.__modele.push(msgs); return window.__reponse; };
    hideAuthFlow();
    // L'histoire de la page Charly IA (comme sur la capture de Charles : un rendez-vous à 0h).
    var histoPage = [{ role: 'user', content: 'Dentiste demain' }, { role: 'assistant', content: 'Je te propose :\\n[AGENDA]{"title":"Dentiste","date":"2026-11-16","time":"00:00","duration":30}[/AGENDA]', tempId: 'p0' }];
    try { localStorage.setItem('timecool_charly_historique', JSON.stringify(histoPage)); localStorage.removeItem('timecool_charly_aide'); } catch (e) {}
    charlyIA.history = histoPage.slice(); charlyIA._historiqueCharge = true;
    contactsList = [{ id: 'w1', name: 'William Ayache', phone: '0611223344' }];
    messages[mode] = [{ id: 'c1', with: 'Paul Martin', avatar: 'PM', color: '#123', icon: '', unread: 0, archived: false, thread: [{ from: 'them', text: 'Salut', time: '10:00' }] }];
    var res = {};
    var body = function () { return document.getElementById('convBody'); };
    var envoyer = function (t, k) { document.getElementById('convInput').value = t; Promise.resolve(sendConvMessage()).catch(function () {}).then(function () { setTimeout(k, 400); }); };
    navigate('calendar'); navigate('messages');
    var ligne = document.getElementById('msgCharly');
    res.premier = (document.getElementById('messagesList').firstElementChild || {}).id || '';
    res.fond = ligne ? getComputedStyle(ligne).backgroundColor : '';
    res.apercuVide = (document.querySelector('#msgCharly .msg-text') || {}).innerText || '';
    ligne.click();
    setTimeout(function () {
      res.surConv = document.getElementById('page-conv').classList.contains('active') && !document.getElementById('page-assistant').classList.contains('active');
      res.nom = document.getElementById('convName').innerText;
      res.caseVisible = !!document.getElementById('convInput').offsetParent;
      res.vide = body().innerText;
      envoyer('Comment changer la langue ?', function () {
        res.aide = body().innerText; res.modeleAide = window.__modele.length;
        envoyer('Dentiste demain à 15h', function () {
          res.agendaTexte = body().innerText;
          res.agendaBouton = Array.prototype.some.call(body().querySelectorAll('button'), function (b) { return b.textContent === 'Ouvrir Charly IA'; });
          res.modeleAgenda = window.__modele.length;
          res.pageIntacte = charlyIA.history.length === 2;
          envoyer('Est-ce que TimeCool marche sans internet ?', function () {
            res.modeleLibre = window.__modele.length;
            var m = window.__modele[0] || [];
            res.consigne = (m[0] && m[0].role === 'system' && /hotline/.test(m[0].content) && /\\[PAGE_CHARLY\\]/.test(m[0].content)) || false;
            res.histoModele = m.slice(1).map(function (x) { return x.content; }).join(' | ');
            res.reponseLibre = body().innerText;
            window.__reponse = '[PAGE_CHARLY]';
            envoyer('Mets-moi un truc pour la semaine pro', function () {
              res.pageCharlyModele = (body().innerText.match(/Pour ton agenda, va sur la page Charly IA\\./g) || []).length;
              window.__reponse = 'Voici :\\n[AGENDA]{"title":"X","date":"2026-11-20","time":"10:00"}[/AGENDA]';
              envoyer('Est-ce que je peux mettre une couleur ?', function () {
                res.sansCarte = !/\\[AGENDA\\]|"title"/.test(body().innerHTML);
                tcRetourDepuisConversation();
                setTimeout(function () {
                  res.retourMessagerie = document.getElementById('page-messages').classList.contains('active');
                  res.apercu = (document.querySelector('#msgCharly .msg-text') || {}).innerText || '';
                  // Rechargement : le fil se relit sur l'appareil.
                  _tcConvCharly = null;
                  res.gardes = JSON.parse(localStorage.getItem('timecool_charly_aide') || '[]').length;
                  res.apercuRelu = tcApercuCharly();
                  document.getElementById('msgCharly').click();
                  setTimeout(function () {
                    res.reluConv = /changer la langue/i.test(body().innerText) && !/Dentiste demain\\s*$/m.test(body().innerText.split('Dentiste demain à 15h').join(''));
                    // Le bouton mène à la page Charly IA, qui retrouve son histoire à elle.
                    var b = Array.prototype.find.call(body().querySelectorAll('button'), function (x) { return x.textContent === 'Ouvrir Charly IA'; });
                    if (b) b.click();
                    setTimeout(function () {
                      res.surPageCharly = document.getElementById('page-assistant').classList.contains('active');
                      res.pageHisto = /Je te propose/.test(document.getElementById('charlyChatBody').innerText);
                      res.pageBoutons = !!document.getElementById('charlyQuickActions').offsetParent;
                      // 100 gardés, 10 au modèle.
                      _tcConvCharly = []; for (var i = 0; i < 60; i++) { _tcConvCharly.push({ from: 'me', text: 'Q' + i, time: '10:00' }, { from: 'charly', text: 'R' + i, time: '10:00' }); }
                      tcSauverConvCharly();
                      res.gardes100 = JSON.parse(localStorage.getItem('timecool_charly_aide') || '[]').length;
                      window.__modele = []; window.__reponse = 'Réponse';
                      navigate('messages'); document.getElementById('msgCharly').click();
                      envoyer('Est-ce que je peux changer le fond ?', function () {
                        var mm = window.__modele[0] || [];
                        res.auModele = mm.slice(1).filter(function (x) { return x.content !== '(début de la conversation)'; }).length;
                        // Examen : les vraies questions sur l'appli vont au modèle ; les vraies demandes à la page Charly IA.
                        res.questionsAgenda = ['Est-ce que TimeCool synchronise mon agenda Google ?', 'Ça sert à quoi la fiche contact ?', 'Le rappel arrive combien de temps avant le rendez-vous ?',
                          'TimeCool marche le dimanche ?', 'Quelle est la différence entre agenda perso et pro ?',
                          // Mission 104 : les essais de Charles (16/11, 13h) et les règles du chef.
                          'Et si je veux changer le mot d’excuse que tu vas envoyer en cas de retard je dois faire quoi ?', 'Où je vois mes rendez-vous de demain',
                          'Comment je préviens un contact de mon retard', 'Le bouton Supprimer ne marche pas ?', 'Je veux changer la photo de ma fiche contact', 'Est-ce que je peux annuler un rendez-vous jeudi ?'].filter(function (q) { return tcDemandeAgendaConvCharly(q); });
                        res.demandesRatees = ['Ajoute dentiste mardi 10h', 'Annule mon rendez-vous de demain', 'Je suis malade', 'Retrouve le numéro de Paul', 'Peux-tu décaler mon rdv de jeudi ?',
                          'Préviens Paul que j’aurai 10 minutes de retard', 'Trouve-moi un créneau jeudi avec Paul', 'Dentiste demain à 15h'].filter(function (q) { return !tcDemandeAgendaConvCharly(q); });
                        // Mission 104 : « Salut comment ca va ? » (essai de Charles) : une réponse aimable, jamais « Je ne sais pas encore répondre ».
                        res.salut = typeof tcSocialHotline === 'function' ? tcSocialHotline('Salut comment ca va ?') : null;
                        // Examen : le ménage du compte vide aussi le fil en mémoire (le compte suivant ne le récupère pas).
                        tcViderDonneesDuCompte();
                        res.apresMenage = [tcFilConvCharly().length, tcApercuCharly(), localStorage.getItem('timecool_charly_aide')];
                        var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre);
                      });
                    }, 400);
                  }, 300);
                }, 300);
              });
            });
          });
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
  verifie('la ligne est en tête, sur fond bleu ciel', R.premier === 'msgCharly' && R.fond === 'rgb(205, 234, 252)', JSON.stringify([R.premier, R.fond]));
  verifie('avant tout échange, la ligne garde sa phrase (et pas l histoire de la page Charly IA)', /Une question \? Demande-moi : « Comment changer la langue \? »/.test(norm(R.apercuVide)), R.apercuVide);
  verifie('un toucher ouvre l écran de conversation de la messagerie, pas la page Charly IA', R.surConv === true && R.nom === 'Charly, ton aide TimeCool' && R.caseVisible === true, JSON.stringify([R.surConv, R.nom, R.caseVisible]));
  verifie('conversation vide : la phrase d accueil, rien de la page Charly IA (ni le rendez-vous à 0h)', /Une question \? Demande-moi/.test(norm(R.vide)) && !/Dentiste|Je te propose/.test(R.vide || ''), R.vide);
  verifie('question d aide : la réponse de la base d aide, sans le modèle', /Paramètres/.test(R.aide || '') && /langue/i.test(R.aide || '') && R.modeleAide === 0, JSON.stringify([R.aide, R.modeleAide]));
  verifie('demande d agenda : « Pour ton agenda, va sur la page Charly IA. » et le bouton « Ouvrir Charly IA », sans le modèle', /Pour ton agenda, va sur la page Charly IA\./.test(R.agendaTexte || '') && R.agendaBouton === true && R.modeleAgenda === 0, JSON.stringify([R.agendaBouton, R.modeleAgenda]));
  verifie('rien n est ajouté à l histoire de la page Charly IA', R.pageIntacte === true);
  verifie('autre question sur l appli : le modèle répond, avec la consigne de la hotline', R.modeleLibre === 1 && R.consigne === true && /même sans internet/.test(R.reponseLibre || ''), JSON.stringify([R.modeleLibre, R.consigne]));
  verifie('le modèle ne reçoit que ce fil (rien de la page Charly IA)', !/Dentiste demain\b(?! à 15h)|Je te propose/.test(R.histoModele || '') && /changer la langue/.test(R.histoModele || ''), R.histoModele);
  verifie('le modèle qui répond [PAGE_CHARLY] : la même phrase et le bouton', R.pageCharlyModele === 2, R.pageCharlyModele);
  verifie('une carte écrite par le modèle n apparaît jamais : la phrase et le bouton à la place', R.sansCarte === true && /Pour ton agenda/.test(R.apercu || ''), R.apercu);
  verifie('la flèche ramène à la messagerie ; l aperçu montre le dernier message de cette conversation', R.retourMessagerie === true && R.apercu.length > 0 && !/Je te propose/.test(R.apercu), JSON.stringify([R.retourMessagerie, R.apercu]));
  verifie('le fil reste sur l appareil et se relit en rouvrant', R.gardes === 10 && R.apercuRelu === R.apercu && R.reluConv === true, JSON.stringify([R.gardes, R.apercuRelu, R.reluConv]));
  verifie('« Ouvrir Charly IA » : la page Charly IA, comme avant, avec son histoire à elle', R.surPageCharly === true && R.pageHisto === true && R.pageBoutons === true, JSON.stringify([R.surPageCharly, R.pageHisto, R.pageBoutons]));
  verifie('100 messages gardés, 10 envoyés au modèle', R.gardes100 === 100 && R.auModele === 10, JSON.stringify([R.gardes100, R.auModele]));
  verifie('une vraie question sur l appli (« Ça sert à quoi la fiche contact ? », « …je dois faire quoi ? »…) reçoit une réponse, pas la page Charly IA', Array.isArray(R.questionsAgenda) && R.questionsAgenda.length === 0, JSON.stringify(R.questionsAgenda));
  verifie('une vraie demande (« Ajoute dentiste mardi 10h », « Je suis malade »…) va à la page Charly IA', Array.isArray(R.demandesRatees) && R.demandesRatees.length === 0, JSON.stringify(R.demandesRatees));
  verifie('« Salut comment ca va ? » : réponse aimable puis « Pose-moi ta question sur TimeCool. » (mission 104)', /^Très bien, merci ! .* Pose-moi ta question sur TimeCool\.$/.test(R.salut || ''), R.salut);
  verifie('le ménage du compte vide aussi la conversation d aide en mémoire', Array.isArray(R.apresMenage) && R.apresMenage[0] === 0 && R.apresMenage[1] === '' && R.apresMenage[2] === null, JSON.stringify(R.apresMenage));
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
