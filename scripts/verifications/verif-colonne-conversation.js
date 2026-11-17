// Mission 114 (Charles, 17/11 18h35) : dans la démonstration, la conversation de Charly tient dans une colonne centrée de 700 px
// au plus ; sous 700 px de large, rien ne change ; hors démonstration, rien ne change (un seul réglage pour l'étendre).
// Mission 115 (Charles, 17/11 19h) : comme WhatsApp, la bulle de Charly à la taille de son texte ; la colonne vaut aussi en vrai.
// Usage : node verif-colonne-conversation.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 700) : '')); } };

console.log('-- 1. Dans le code --');
verifie('un seul réglage : la démonstration et la vraie conversation (mission 115)', /const TC_CONV_COLONNE = \{ demo: true, vrai: true \};/.test(page));
verifie('mission 115 : la bulle à la taille de son texte (85 % au téléphone, 80 % au PC), boutons de 44 px au moins',
  /#charlyChatBody \{ --tc-bulle-max:85%; \}/.test(page) && /@media \(min-width:700px\) \{ #charlyChatBody \{ --tc-bulle-max:80%; \} \}/.test(page)
  && /#charlyChatBody \.tc-bulle-col button, #charlyChatBody \.tc-voir-agenda \{ min-height:44px; \}/.test(page) && (page.match(/class="tc-bulle-col/g) || []).length === 3);   // mission 120 : la bulle verte d'un contact aussi
verifie('une seule classe : 700 px au plus, la marge d’avant (12 px) en dessous', /#charlyChatBody\.tc-conv-colonne \{ --tc-conv-largeur:700px; padding-left:max\(12px, calc\(\(100% - var\(--tc-conv-largeur\)\) \/ 2\)\) !important; padding-right:max\(12px, calc\(\(100% - var\(--tc-conv-largeur\)\) \/ 2\)\) !important; \}/.test(page));
verifie('la classe suit l’affichage de la conversation', /if \(typeof tcMajColonneConversation === 'function'\) tcMajColonneConversation\(\);/.test(page));

console.log('-- 2. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (taille) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
      var mesure = function () {
        var b = document.getElementById('charlyChatBody'), r = b.getBoundingClientRect();
        var tous = Array.prototype.map.call(b.children, function (x) { return x.getBoundingClientRect(); }).filter(function (x) { return x.width > 0; });
        var user = Array.prototype.filter.call(b.querySelectorAll('div'), function (x) { return x.style && x.style.background === 'var(--g-blue)'; }).map(function (x) { return x.getBoundingClientRect(); });
        var boutons = Array.prototype.filter.call(b.querySelectorAll('button'), function (x) { return /Par téléphone|En personne|En visio/.test(x.innerText); }).map(function (x) { return Math.round(x.getBoundingClientRect().top); });
        return { classe: b.classList.contains('tc-conv-colonne'), largeur: Math.round(r.width), gauche: Math.round(Math.min.apply(null, tous.map(function (x) { return x.left; }))),
          droite: Math.round(Math.max.apply(null, tous.map(function (x) { return x.right; }))), userDroite: user.length ? Math.round(user[user.length - 1].right) : null, boutons: boutons };
      };
      try {
        document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        localStorage.setItem('tc_permissions_shown', '1');
        window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
        userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
        tcCharlyPret = function () { return true; };
        charlyIA.history = []; charlyIA._historiqueCharge = true;
        hideAuthFlow(); navigate('assistant');
        await attendre(900);
        document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 100; TC_ATTENTE_DUREES.consulte = 100; }
        var R = {};
        await tcOuvrirDemo(); await attendre(300);
        await tcDemoJouer('michel'); await attendre(800);
        R.demo = mesure();
        var p = document.querySelector('.tc-demo-pastille'); if (p) { var q = p.getBoundingClientRect(); R.pastille = Math.round((q.left + q.right) / 2); }
        tcQuitterDemo(); await attendre(500);
        charlyIA.history.push({ role: 'user', content: 'Bonjour Charly' }, { role: 'assistant', content: 'Bonjour !' }); renderCharlyChat(); await attendre(200);
        R.vrai = mesure();
        // Mission 115 : chaque sorte de réponse de Charly, en vrai.
        var demain = new Date(); demain.setDate(demain.getDate() + 1);
        var long = 'Voici ce que je te propose pour ta semaine : je garde tes rendez-vous du matin, je décale le coiffeur à jeudi et je te laisse ton après-midi de vendredi libre, comme tu me l’as demandé la dernière fois. Dis-moi si cela te va.';
        charlyIA.history = [
          { role: 'assistant', content: 'Paul a répondu : « Pas de souci ! »', _court: 1 },
          { role: 'user', content: 'Merci' },
          { role: 'assistant', content: long },
          { role: 'assistant', content: 'Par téléphone, en personne ou en visio ?', _questionType: { id: 'qv', references: ['R'], duree: 1, etat: 'choix' } },
          { role: 'assistant', content: 'Coiffeur, demain à 10h : je te propose ceci.\\n[AGENDA]\\n' + tcISO(demain) + ' | 10:00-11:00 | Coiffeur | rdv\\n[/AGENDA]' },
          { role: 'system_info', content: '❌ Je n’arrive pas à interroger les agendas pour le moment.' }
        ];
        renderCharlyChat(); await attendre(300);
        var b = document.getElementById('charlyChatBody');
        var bulles = Array.prototype.map.call(b.querySelectorAll('.tc-bulle-col'), function (x) { var r1 = x.getBoundingClientRect(), r2 = x.parentNode.getBoundingClientRect();
          return { l: Math.round(r1.width), rang: Math.round(r2.width), large: x.classList.contains('tc-bulle-large'), texte: x.innerText.slice(0, 30) }; });
        var choix = Array.prototype.filter.call(b.querySelectorAll('button'), function (x) { return /Par téléphone|En personne|En visio/.test(x.innerText); })
          .map(function (x) { return { h: Math.round(x.getBoundingClientRect().height), coupe: x.scrollWidth > x.clientWidth + 1 }; });
        R.sortes = { bulles: bulles, choix: choix, debord: b.scrollWidth > b.clientWidth + 1 };
        // Une langue de droite à gauche : les bulles restent à la taille du texte, rien ne déborde.
        document.documentElement.setAttribute('dir', 'rtl'); renderCharlyChat(); await attendre(200);
        var court = b.querySelector('.tc-bulle-col'); R.rtl = { l: court ? Math.round(court.getBoundingClientRect().width) : null, debord: b.scrollWidth > b.clientWidth + 1 };
        document.documentElement.removeAttribute('dir');
        // L'accueil de la conversation vide reste centré.
        charlyIA.history = []; renderCharlyChat(); await attendre(200);
        var acc = document.getElementById('tcAccueilCharly');
        if (acc) { var ra = acc.getBoundingClientRect(), rb = b.getBoundingClientRect(); R.accueil = { centre: Math.abs((ra.left + ra.right) / 2 - (rb.left + rb.right) / 2) <= 12, l: Math.round(ra.width) }; }
        fin(R);
      } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
    }, 1200); });</script>`;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-colonne-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + taille, '--virtual-time-budget=60000', '--dump-dom'];
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 240000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : {}; } catch (e) { return {}; }
  };
  [['1920,1080', 1920], ['1366,768', 1366]].forEach(function (x) {
    const S = jouer(x[0]), nom = 'PC ' + x[1] + ' — ';
    const W = S.demo ? S.demo.largeur : x[1], g = Math.round((W - 700) / 2);   // la largeur de la zone (sans la barre de défilement)
    if (S.erreur) { verifie(nom + 'le parcours a joué', false, S.erreur); return; }
    // La zone a sa propre barre de défilement (quelques px à droite) : la colonne fait 700 px moins cette barre.
    const col = S.demo ? S.demo.droite - S.demo.gauche : 0;
    verifie(nom + 'démonstration : la conversation dans une colonne de 700 px au milieu', S.demo && S.demo.classe && Math.abs(S.demo.gauche - g) <= 2 && col >= 680 && col <= 700, JSON.stringify(S.demo));
    verifie(nom + 'l’utilisateur à droite de la colonne, alignée sur la pastille « Démonstration »', S.demo && S.demo.userDroite === S.demo.droite && Math.abs(S.pastille - W / 2) <= 2 && Math.abs((S.demo.gauche + S.demo.droite) / 2 - W / 2) <= 10, JSON.stringify([S.demo, S.pastille]));
    verifie(nom + 'les trois boutons « Par téléphone / En personne / En visio » tiennent sur une ligne', S.demo && S.demo.boutons.length === 3 && new Set(S.demo.boutons).size === 1, JSON.stringify(S.demo && S.demo.boutons));
    verifie(nom + 'en vrai aussi (mission 115) : la même colonne centrée', S.vrai && S.vrai.classe && Math.abs(S.vrai.gauche - g) <= 2, JSON.stringify(S.vrai));
    bulles(S, nom, 0.8);
  });
  // Mission 115 : les bulles de Charly à la taille de leur texte.
  function bulles(S, nom, max) {
    const B = (S.sortes && S.sortes.bulles) || [];
    verifie(nom + 'une réponse courte : une petite bulle (« Paul a répondu… »)', B[0] && B[0].l < B[0].rang * 0.75 && B[0].l < 420, JSON.stringify(B[0]));
    verifie(nom + 'une réponse longue : la largeur maximum (' + Math.round(max * 100) + ' %), le texte passe à la ligne', B[1] && B[1].l <= B[1].rang * max + 2 && B[1].l >= B[1].rang * max - 30, JSON.stringify(B[1]));
    verifie(nom + 'les trois boutons de choix : dans la bulle, au moins 44 px de haut, texte jamais coupé', S.sortes && S.sortes.choix.length === 3 && S.sortes.choix.every(function (c) { return c.h >= 44 && !c.coupe; }) && B[2] && B[2].l <= B[2].rang * max + 2, JSON.stringify([S.sortes && S.sortes.choix, B[2]]));
    verifie(nom + 'la carte d’un rendez-vous proposé garde toute la colonne', B[3] && B[3].large && B[3].l >= B[3].rang - 52, JSON.stringify(B[3]));
    verifie(nom + 'un message d’erreur : sa bulle à sa taille ; rien ne déborde', B[4] && B[4].l <= B[4].rang * max + 2 && S.sortes && !S.sortes.debord, JSON.stringify([B[4], S.sortes && S.sortes.debord]));
    verifie(nom + 'de droite à gauche : la bulle courte reste petite, rien ne déborde', S.rtl && B[0] && S.rtl.l === B[0].l && !S.rtl.debord, JSON.stringify(S.rtl));
    verifie(nom + 'l’accueil de la conversation vide reste centré', S.accueil && S.accueil.centre, JSON.stringify(S.accueil));
  }
  const T = jouer('390,844');
  // Chrome sans tête ne descend pas sous 500 px de large : c'est la largeur « téléphone » de cette suite (moins de 700).
  verifie('téléphone (moins de 700 px) : rien ne change (12 px de chaque côté), démonstration comme hors démonstration', T.demo && T.demo.largeur < 700 && T.demo.gauche === 12 && T.demo.droite >= T.demo.largeur - 30 && T.vrai && T.vrai.gauche === 12 && T.vrai.droite === T.demo.droite, JSON.stringify(T));
  bulles(T, 'téléphone — ', 0.85);
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
