// Mission 111 (Charles, 17/11) : « Voir dans mon agenda » sous la réponse de Charly qui crée, décale ou modifie un rendez-vous ;
// l'agenda au bon jour en Semaine, le rendez-vous à l'écran, un petit doigt 👉 collé à gauche, 5 s, puis plus rien ; plusieurs
// rendez-vous bougés : le doigt sur le premier, un contour bleu doux sur les autres ; annulé : pas de bouton ; « Réduire les
// animations » : doigt fixe. Les rendez-vous créés avec des contacts s'appellent « RDV … » (motif après « : »). Le bandeau de la
// démonstration : au-dessus de la conversation sur la page Charly, sous l'en-tête ailleurs.
// Usage : node verif-voir-agenda.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); } };

console.log('-- 1. Dans le code --');
verifie('une constante réglable : 5 s pour le doigt', /const TC_VOIR_AGENDA_MS = 5000;/.test(page));
verifie('« Réduire les animations » : le doigt reste fixe', /@media \(prefers-reduced-motion: reduce\) \{ \.tc-doigt \{ animation:none; \} \}/.test(page));
verifie('chaque case de la semaine porte l’identifiant de son rendez-vous', /evt\.setAttribute\('data-ev-id', String\(e\.id\)\)/.test(page));
verifie('« Repas de famille » devient « RDV famille » dans l’agenda d’exemple', /'RDV famille'/.test(page) && !/'Repas de famille'/.test(page));

console.log('-- 2. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (corps, calme, taille) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      // Chrome sans tête en temps virtuel ne donne pas d'image : la semaine dessine ses cases à l'image suivante.
      window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
      var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
      var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(2500); };
      var cliquer = async function (t) { var b = Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.innerText.indexOf(t) > -1; }).pop(); if (b) b.click(); await attendre(2500); return !!b; };
      var boutonsVoir = function () { return Array.prototype.map.call(document.querySelectorAll('#charlyChatBody .tc-voir-agenda'), function (b) { return JSON.parse(b.getAttribute('data-voir')); }); };
      var titre = function (id) { var e = events.find(function (x) { return String(x.id) === String(id); }); return e ? e.title : null; };
      // Ce que l'on voit dans l'agenda : la vue, le jour, le doigt collé à gauche de la case, la case à l'écran, les contours.
      var regarder = function (id) {
        var c = document.querySelector('.week-event[data-ev-id="' + CSS.escape(String(id)) + '"]'), d = document.querySelector('.tc-doigt');
        var rc = c ? c.getBoundingClientRect() : null, rd = d ? d.getBoundingClientRect() : null;
        return { page: currentPage, vue: currentView, jour: tcISO(viewDate), caseVue: !!rc && rc.top >= 0 && rc.bottom <= window.innerHeight && rc.width > 0,
          doigt: !!d, colle: !!(rc && rd) && ((rc.left - rd.right >= 10 && rc.left - rd.right <= 28 && rd.bottom > rc.top && rd.top < rc.bottom) || (d.textContent === '👇' && rc.top - rd.bottom >= 10 && rc.top - rd.bottom <= 28 && rd.right > rc.left && rd.left < rc.right)), ecart: rc && rd ? [Math.round(rc.left - rd.right), Math.round(rc.top - rd.bottom), d.textContent] : null,
          mouvement: d ? getComputedStyle(d).animationName : null, contours: document.querySelectorAll('.week-event.tc-voir-autre').length,
          cases: document.querySelectorAll('.week-event[data-ev-id="' + CSS.escape(String(id)) + '"]').length, doigts: document.querySelectorAll('.tc-doigt').length, toutes: document.querySelectorAll('.week-event').length, avecId: document.querySelectorAll('.week-event[data-ev-id]').length, ids: Array.prototype.slice.call(document.querySelectorAll('.week-event[data-ev-id]'), 0, 30).map(function (x) { return x.getAttribute('data-ev-id'); }).join(','), cherche: String(id) };
      };
      var bandeau = function () { var b = document.getElementById('tcDemoBandeau'); if (!b) return null; var r = b.getBoundingClientRect();
        return { avant: b.nextElementSibling ? b.nextElementSibling.id : null, apres: b.previousElementSibling ? (b.previousElementSibling.tagName + '.' + b.previousElementSibling.className) : null, haut: Math.round(r.top), visible: r.height > 30 && r.top >= 0 && r.bottom <= window.innerHeight,
          // Mission 112 : une pastille bleu roi centrée, rien autour.
          fond: getComputedStyle(b).backgroundColor, pastille: (function () { var p = b.querySelector('.tc-demo-pastille'); if (!p) return null; var q = p.getBoundingClientRect(), cs = getComputedStyle(p), bt = p.querySelector('button');
            return { fond: cs.backgroundColor, texte: cs.color, l: Math.round(q.width), h: Math.round(q.height), centre: Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2) <= 2, quitter: bt ? [bt.innerText.trim(), getComputedStyle(bt).backgroundColor, getComputedStyle(bt).color] : null }; })() }; };
      try {
        document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        localStorage.setItem('tc_permissions_shown', '1');
        window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
        userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
        tcCharlyPret = function () { return true; };
        charlyIA.history = []; charlyIA._historiqueCharge = true;
        hideAuthFlow();
        navigate('assistant');
        await attendre(900);
        document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 100; TC_ATTENTE_DUREES.vrai = 100; TC_ATTENTE_DUREES.feuilles = 100; TC_ATTENTE_DUREES.consulte = 100; }
        var R = {};
        ${corps}
        fin(R);
      } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
    }, 1200); });</script>`;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-voir-'));
    // Mission 135 : la page croit être le mercredi de la semaine, à 10h (chef, lot 118 : verte à toute heure et tous les jours).
    const HORLOGE_10H = '<script>(function () { var V = Date, d = new V(), base = new V(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 4) % 7), 10, 0, 0).getTime(), t0 = V.now();'
      + ' function F() { if (!(this instanceof F)) return new V(base + V.now() - t0).toString(); if (!arguments.length) return new V(base + V.now() - t0);'
      + ' return new (Function.prototype.bind.apply(V, [null].concat([].slice.call(arguments))))(); }'
      + ' F.prototype = V.prototype; F.now = function () { return base + V.now() - t0; }; F.UTC = V.UTC; F.parse = V.parse; window.Date = F; })();</script>';
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('<head>', () => '<head>' + HORLOGE_10H).replace('</body>', () => js + '</body>'));
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=' + (taille || '390,844'), '--virtual-time-budget=300000', '--dump-dom'];
    if (calme) args.push('--force-prefers-reduced-motion');
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };
  const scenario = `
        await tcOuvrirDemo(); await attendre(400);
        R.bandeauCharly = bandeau();
        // 1. « Demande un rendez-vous demain à mon ami Michel » : calé, le bouton, l'agenda, le doigt.
        await taper('Demande un rendez-vous demain à mon ami Michel');
        await cliquer('En personne');
        var g = charlyIA.history.filter(function (m) { return m._groupe; }).pop();
        await cliquer(g._groupe.creneaux[0].heure + 'h');
        R.michelVoir = boutonsVoir(); R.michelTitre = R.michelVoir.length ? titre(R.michelVoir[0][0]) : null;
        var ev = R.michelVoir.length ? events.find(function (e) { return String(e.id) === String(R.michelVoir[0][0]); }) : null;
        R.michelJour = ev ? ev.date : null;
        document.querySelector('#charlyChatBody .tc-voir-agenda').click(); await attendre(600);
        R.michelAgenda = regarder(R.michelVoir[0][0]); R.bandeauAgenda = bandeau();
        await attendre(5200);
        R.michelApres = regarder(R.michelVoir[0][0]);
        // Mission 118 : le doigt s'en va quand on touche le rendez-vous, et quand on quitte l'agenda ; il ne revient pas.
        var _case = document.querySelector('.week-event[data-ev-id="' + CSS.escape(String(R.michelVoir[0][0])) + '"]');
        if (_case) _case.dispatchEvent(new MouseEvent('click', { bubbles: true })); await attendre(200);
        try { closeEventModal(); } catch (e) {}
        R.michelTouche = !!document.querySelector('.tc-doigt');
        tcVoirDansAgenda([R.michelVoir[0][0]]); await attendre(1200);
        R.michelRevu = !!document.querySelector('.tc-doigt');
        navigate('assistant'); await attendre(200); navigate('calendar'); await attendre(300);
        R.michelQuitte = !!document.querySelector('.tc-doigt');
        navigate('assistant'); await attendre(300); R.bandeauRetour = bandeau();
        // 2. Une création tapée : « C'est noté », le bouton.
        await taper('Saisis dans mon agenda : rendez-vous dentiste mardi à 15h');
        await cliquer('Valider mon agenda');
        R.dentisteVoir = boutonsVoir().slice(-1)[0]; R.dentisteTitre = R.dentisteVoir ? titre(R.dentisteVoir[0]) : null;
        // 3. Malade : deux rendez-vous bougent (le coiffeur tout de suite, le déjeuner quand Michel a choisi).
        await taper('Je suis malade, décale ma journée de demain');
        await cliquer('Oui, envoie'); await attendre(2500);
        R.maladeVoir = boutonsVoir();
        await cliquer('Oui, place-le'); await attendre(1500);
        R.maladeVoir2 = boutonsVoir();
        // 4. Le groupe, avec le motif : « RDV … : boire un verre ».
        await taper('Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine, pour aller boire un verre après le boulot');
        await cliquer('En personne');
        var g2 = charlyIA.history.filter(function (m) { return m._groupe; }).pop();
        if (g2 && g2._groupe.creneaux.length) await cliquer(g2._groupe.creneaux[0].heure + 'h');
        var v2 = boutonsVoir().slice(-1)[0]; R.groupeTitre = v2 ? titre(v2[0]) : null;
        // 5. Plusieurs rendez-vous d'un coup : le doigt sur le premier, un contour sur les autres.
        var deux = events.filter(function (e) { return e.demo; }).slice(0, 2).map(function (e) { return e.id; });
        tcVoirDansAgenda(deux); await attendre(600);
        R.plusieurs = regarder(deux.slice().sort(function (a, b) { var x = events.find(function (e) { return e.id === a; }), y = events.find(function (e) { return e.id === b; }); return x.date < y.date ? -1 : x.date > y.date ? 1 : x.startH - y.startH; })[0]);
        await attendre(5200); R.plusieursApres = regarder(deux[0]);
        navigate('assistant'); await attendre(300);
        // 6. Une annulation : pas de bouton.
        tcQuitterDemo({ sansRetour: true }); await attendre(300); await tcOuvrirDemo(); await attendre(300);
        var n0 = document.querySelectorAll('#charlyChatBody .tc-voir-agenda').length;
        await taper('Annule le sport de vendredi');
        R.annulationBoutons = Array.prototype.map.call(document.querySelectorAll('#charlyChatBody button'), function (b) { return b.innerText; }).slice(-4);
        await cliquer('Oui');
        R.annulation = { boutons: R.annulationBoutons, avant: n0, apres: document.querySelectorAll('#charlyChatBody .tc-voir-agenda').length, sport: events.some(function (e) { return e.title === 'Sport'; }), derniers: charlyIA.history.slice(-3).map(function (m) { return String(m.content || '').slice(0, 80); }) };`;
  [['390,844', 'téléphone 390'], ['1280,800', 'PC 1280']].forEach(function (x) {
    const S = jouer(scenario, false, x[0]), nom = x[1] + ' — ';
    if (S.erreur) { verifie(nom + 'le parcours a joué', false, S.erreur); return; }
    verifie(nom + 'page Charly : le bandeau juste au-dessus de la conversation, visible, plus en haut de l’écran', S.bandeauCharly && S.bandeauCharly.avant === 'charlyChatBody' && S.bandeauCharly.visible && S.bandeauCharly.haut > 100, JSON.stringify(S.bandeauCharly));
    const P = S.bandeauCharly && S.bandeauCharly.pastille;
    verifie(nom + 'mission 112 : plus de bande ; une pastille bleu roi centrée (≤ 260 × 40), texte blanc, « Quitter » blanc à texte bleu',
      S.bandeauCharly && S.bandeauCharly.fond === 'rgba(0, 0, 0, 0)' && P && P.fond === 'rgb(26, 71, 214)' && P.texte === 'rgb(255, 255, 255)' && P.l <= 260 && P.h === 40 && P.centre
      && P.quitter && P.quitter[0] === 'Quitter' && P.quitter[1] === 'rgb(255, 255, 255)' && P.quitter[2] === 'rgb(26, 71, 214)', JSON.stringify(S.bandeauCharly));
    verifie(nom + 'Michel : « RDV Michel Virtuel », un bouton « Voir dans mon agenda »', S.michelVoir && S.michelVoir.length === 1 && S.michelTitre === 'RDV Michel Virtuel', JSON.stringify([S.michelVoir, S.michelTitre]));
    verifie(nom + 'le bouton : l’agenda en Semaine au bon jour, la case à l’écran, le doigt à gauche, à ≈ 18 px de la case', S.michelAgenda && S.michelAgenda.page === 'calendar' && S.michelAgenda.vue === 'week' && S.michelAgenda.jour === S.michelJour && S.michelAgenda.caseVue && S.michelAgenda.doigt && S.michelAgenda.colle && S.michelAgenda.mouvement === 'tcDoigt', JSON.stringify([S.michelAgenda, S.michelJour]));
    verifie(nom + 'agenda : le bandeau sous l’en-tête TimeCool', S.bandeauAgenda && /^HEADER\.header/.test(S.bandeauAgenda.apres || '') && S.bandeauAgenda.visible, JSON.stringify(S.bandeauAgenda));
    verifie(nom + 'après 5 s : le doigt reste, fixe, au même endroit', S.michelApres && S.michelApres.doigt && S.michelApres.mouvement === 'none' && S.michelApres.colle, JSON.stringify(S.michelApres));
    verifie(nom + 'le doigt s’en va quand on touche le rendez-vous, et quand on quitte l’agenda (il ne revient pas)', S.michelTouche === false && S.michelRevu === true && S.michelQuitte === false, JSON.stringify([S.michelTouche, S.michelRevu, S.michelQuitte]));
    verifie(nom + 'retour à Charly : le bandeau revient au-dessus de la conversation', S.bandeauRetour && S.bandeauRetour.avant === 'charlyChatBody', JSON.stringify(S.bandeauRetour));
    verifie(nom + 'une création tapée : le bouton ; « Dentiste » garde son titre', S.dentisteVoir && S.dentisteTitre === 'Dentiste', JSON.stringify([S.dentisteVoir, S.dentisteTitre]));
    verifie(nom + 'malade : un bouton quand le coiffeur bouge, un autre quand le déjeuner est placé', S.maladeVoir2 && S.maladeVoir2.length >= (S.maladeVoir || []).length + 1 && (S.maladeVoir || []).length >= (S.michelVoir || []).length + 1, JSON.stringify([S.maladeVoir, S.maladeVoir2]));
    verifie(nom + 'le motif reste : « RDV Alice Virtuelle, Chloé Virtuelle, Virginie Virtuelle : boire un verre »', S.groupeTitre === 'RDV Alice Virtuelle, Chloé Virtuelle, Virginie Virtuelle : boire un verre', JSON.stringify(S.groupeTitre));
    verifie(nom + 'plusieurs rendez-vous : le doigt sur le premier, un contour sur l’autre 5 s, puis le doigt reste fixe', S.plusieurs && S.plusieurs.doigt && S.plusieurs.colle && S.plusieurs.contours >= 1 && S.plusieursApres && S.plusieursApres.doigt && S.plusieursApres.mouvement === 'none' && S.plusieursApres.contours === 0, JSON.stringify([S.plusieurs, S.plusieursApres]));
    verifie(nom + 'une annulation : pas de bouton', S.annulation && S.annulation.sport === false && S.annulation.apres === S.annulation.avant, JSON.stringify(S.annulation));
  });
  const C = jouer(`
        await tcOuvrirDemo(); await attendre(400);
        var ev = events.filter(function (e) { return e.demo; })[0];
        tcVoirDansAgenda([ev.id]); await attendre(600); R.calme = regarder(ev.id);
        // Le motif après « pour » (examen de la mission 111) : jamais un moment, une date, une heure, une durée ou une période.
        R.motifs = ['Trouve un créneau avec Alice et Paul pour mardi', 'Trouve un créneau avec Alice et Paul pour lundi à 18h', 'Trouve un créneau avec Alice et Paul pour une heure',
          'Trouve un créneau avec Alice et Paul pour 2h', 'Trouve un créneau avec Alice et Paul pour le 25', 'Trouve un créneau avec Alice et Paul pour la fin du mois',
          'Demande un rendez-vous à Paul pour vendredi', 'Trouve un créneau avec Alice et Paul pour demain', 'Trouve un créneau avec Alice et Paul pour ce week-end',
          'Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine, pour aller boire un verre après le boulot', 'Trouve un créneau avec Alice et Paul pour fêter mon anniversaire après le boulot']
          .map(function (t) { return ((tcOptionsGroupeDepuisTexte(t, null) || {}).titre) || ''; });`, true);
  verifie('le motif : « boire un verre », « fêter mon anniversaire » ; jamais « mardi », « lundi à 18h », « une heure », « 2h », « le 25 », « la fin du mois », « vendredi »…',
    JSON.stringify(C.motifs) === JSON.stringify(['', '', '', '', '', '', '', '', '', 'boire un verre', 'fêter mon anniversaire']), JSON.stringify(C.motifs));
  verifie('« Réduire les animations » : le doigt est là, fixe', C.calme && C.calme.doigt && C.calme.colle && C.calme.mouvement === 'none', JSON.stringify(C));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
