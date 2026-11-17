// Mission 110 (Charles, 17/11 16h25) : les six phrases de TikTok, TAPÉES mot pour mot, aboutissent toutes, dans la
// démonstration (seules, et juste après une autre proposition en cours) et en vrai. « Quel type de professionnel ? »
// ne sort jamais quand un prénom de contact est dans la phrase ; un contact inconnu : « Je m'en occupe. Je ne trouve pas … ».
// Usage : node verif-phrases-tiktok.js <index.html>
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else { ko++; console.log('  KO ' + l + (d !== undefined ? ' : ' + String(d).slice(0, 900) : '')); } };

const PHRASES = [
  'Saisis dans mon agenda : rendez-vous dentiste mardi à 15h',
  'Demande un rendez-vous demain à mon ami Michel',
  'Excuse-moi auprès de Paul et préviens-le que j’aurai 10 minutes de retard',
  'Quand suis-je libre ce vendredi ?',
  'Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine, pour aller boire un verre après le boulot',
  'Je suis malade, décale ma journée de demain, d’après-demain ou de cette semaine'
];

console.log('-- 1. Dans le code --');
verifie('une carte proposée qui attend n’empêche plus « Demande un rendez-vous … à Michel » (elle tombe, puis les créneaux communs)',
  /tcUneReponseAttendueM64\(true\)\) return false;/.test(page) && /function tcLaisserTomberCarte110\(\)/.test(page));
verifie('dans la démonstration, jamais les réponses simulées du vieux « mode démo »', /\} else if \(charlyIA\.config\.demoMode && !\(typeof tcDemoActive === 'function' && tcDemoActive\(\)\)\) \{/.test(page));
verifie('« Quel type de professionnel ? » jamais quand un contact est nommé', /&& !\(typeof tcPhraseNommeUnContact110 === 'function' && tcPhraseNommeUnContact110\(userText\)\)\) \{\s*return `Parfait\. Pour préparer ta demande de rendez-vous/.test(page));
verifie('le serveur : « des » (après le boulot = 18h) jusqu’à creneauxCommuns', /'par_jour', 'des'\]/.test(page));

console.log('-- 2. Dans la vraie page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) {
  console.log('  (non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  const jouer = (corps) => {
    const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
      var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
      var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(3000); };
      var boutons = function () { return Array.prototype.filter.call(document.querySelectorAll('#charlyChatBody button'), function (x) { return !x.disabled && x.offsetParent && !/« /.test(x.innerText); }); };
      // Avance comme quelqu'un qui touche le bouton évident : le mode, l'envoi, le premier moment proposé, le premier créneau commun.
      var avancer = async function () {
        var pref = ['En personne', 'Oui, envoie', 'Oui, place-le', 'Demain', 'Valider mon agenda'];
        for (var k = 0; k < 6; k++) {
          var g = charlyIA.history.filter(function (m) { return m._groupe && m._groupe.etat === 'choix'; }).pop();
          if (g) { await tcConfirmerRdvGroupe(g._groupe.id, 0); await attendre(2500); continue; }
          var b = null, bs = boutons().slice(-8);
          for (var i = 0; i < pref.length && !b; i++) b = bs.filter(function (x) { return x.innerText.indexOf(pref[i]) > -1; }).pop() || null;
          if (!b) return;
          b.click(); await attendre(4000);
        }
      };
      var textes = function (depuis) { return charlyIA.history.slice(depuis).map(function (m) { return (m.role === 'user' ? '> ' : '') + String(m.content || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' '); }); };
      try {
        document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        localStorage.setItem('tc_permissions_shown', '1');
        window.fetch = function () { return Promise.reject(new Error('hors ligne')); };
        userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
        tcCharlyPret = function () { return true; };
        charlyIA.history = []; charlyIA._historiqueCharge = true;
        hideAuthFlow();
        await attendre(900);
        document.querySelectorAll('#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
        if (typeof TC_ATTENTE_DUREES !== 'undefined') { TC_ATTENTE_DUREES.demo = 100; TC_ATTENTE_DUREES.vrai = 100; TC_ATTENTE_DUREES.feuilles = 100; }
        var R = {};
        ${corps}
        fin(R);
      } catch (e) { fin({ erreur: String(e && e.stack || e) }); }
    }, 1200); });</script>`;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-tiktok-'));
    fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
    const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=400000', '--dump-dom'];
    const r = spawnSync(exe, args.concat(['file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')]), { encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 28 });
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0')) : {}; } catch (e) { return {}; }
  };

  // Chaque phrase dans une démonstration neuve, seule puis juste après « Quand suis-je libre ce vendredi ? » (carte en cours).
  const demo = (apres) => `
        var PHRASES = ${JSON.stringify(PHRASES)};
        R.p = [];
        for (var n = 0; n < PHRASES.length; n++) {
          if (n) { tcQuitterDemo({ sansRetour: true }); await attendre(300); }
          await tcOuvrirDemo(); await attendre(300);
          ${apres ? "tcDemoJouer('vendredi'); await attendre(2500);" : ''}
          var avant = !!(typeof tcPropositionEnAttente === 'function' && tcPropositionEnAttente());
          var d0 = charlyIA.history.length, e0 = events.map(function (e) { return e.id; });
          await taper(PHRASES[n]);
          var premiers = textes(d0);
          var qq = charlyIA.history.filter(function (m) { return m._questionnaire; }).pop();
          var choixMalade = qq && qq._questionnaire.choix ? qq._questionnaire.choix.map(function (c) { return c.texte; }) : null;
          await avancer();
          var groupes = charlyIA.history.slice(d0).filter(function (m) { return m._groupe; }).map(function (m) { return { invites: m._groupe.invites, c: (m._groupe.creneaux || []).map(function (x) { return [x.date, x.heure]; }), etat: m._groupe.etat }; });
          var nouveaux = events.filter(function (e) { return e0.indexOf(e.id) < 0; }).map(function (e) { return [e.date, e.startH, e.title]; });
          R.p.push({ avant: avant, premiers: premiers, tout: textes(d0), choixMalade: choixMalade, groupes: groupes, nouveaux: nouveaux,
            deplaces: events.filter(function (e) { return e.id === 'demo_dejeuner'; }).map(function (e) { return e.date; }) });
        }
        // Un contact inconnu : jamais un questionnaire.
        tcQuitterDemo({ sansRetour: true }); await attendre(300); await tcOuvrirDemo(); await attendre(300);
        var d1 = charlyIA.history.length;
        await taper('Demande un rendez-vous demain à mon ami Gérard');
        R.inconnu = textes(d1); R.boutonAjouter = boutons().some(function (b) { return /Ajouter\\s+Gérard/.test(b.innerText); });
        var now = new Date(), mardi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var diff = (2 - mardi.getDay() + 7) % 7; if (diff === 0 && now.getHours() >= 15) diff = 7; mardi.setDate(mardi.getDate() + diff);
        R.mardi = tcISO(mardi);
        var dim = new Date(now.getFullYear(), now.getMonth(), now.getDate()); dim.setDate(dim.getDate() + (dim.getDay() === 0 ? 0 : 7 - dim.getDay()));
        R.dimanche = tcISO(dim);
        R.demain = tcISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));`;
  const PRO = /Quel type de professionnel/;
  const LIBRE = /Dans la démonstration, je te montre ces phrases/;
  [[false, 'seule'], [true, 'après une proposition en cours']].forEach(function (x) {
    const S = jouer(demo(x[0])), P = S.p || [], qui = ' (démonstration, ' + x[1] + ')';
    if (!P.length) { verifie('la démonstration a joué' + qui, false, JSON.stringify(S).slice(0, 600)); return; }
    if (x[0]) verifie('une proposition était bien en cours avant chaque phrase' + qui, P.every(function (p) { return p.avant; }), JSON.stringify(P.map(function (p) { return p.avant; })));
    P.forEach(function (p) { verifie('jamais « Quel type de professionnel ? » ni « je te montre ces phrases »' + qui, !p.tout.some(function (t) { return PRO.test(t) || LIBRE.test(t); }), JSON.stringify(p.tout)); });
    const [p1, p2, p3, p4, p5, p6] = P;
    verifie('1. « Saisis dans mon agenda : … dentiste mardi à 15h » : « Dentiste », mardi ' + S.mardi + ' à 15h, dans l’agenda' + qui,
      p1.nouveaux.some(function (e) { return e[0] === S.mardi && e[1] === 15 && e[2] === 'Dentiste'; }), JSON.stringify([p1.nouveaux, p1.tout]));
    verifie('2. « Demande un rendez-vous demain à mon ami Michel » : les créneaux communs de demain avec Michel, puis calé' + qui,
      p2.groupes.length === 1 && p2.groupes[0].invites.join() === 'Michel' && p2.groupes[0].c.length && p2.groupes[0].c.every(function (c) { return c[0] === S.demain; })
      && p2.nouveaux.some(function (e) { return /Michel Virtuel/.test(e[2]) && e[0] === S.demain; }), JSON.stringify([p2.groupes, p2.nouveaux, p2.tout]));
    verifie('3. « Excuse-moi auprès de Paul … 10 minutes de retard » : le message part, Paul répond' + qui,
      p3.tout.some(function (t) { return /^C’est fait/.test(t) && /Retard d’environ 10 minutes/.test(t); }) && p3.tout.some(function (t) { return /^Paul a répondu/.test(t); }), JSON.stringify(p3.tout));
    verifie('4. « Quand suis-je libre ce vendredi ? » : les moments libres de vendredi' + qui, p4.tout.some(function (t) { return /^Voici ce qui est libre ce vendredi/.test(t); }), JSON.stringify(p4.tout));
    verifie('5. « Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine, … après le boulot » : cette semaine, à partir de 18h, puis calé' + qui,
      p5.groupes.length === 1 && p5.groupes[0].c.length && p5.groupes[0].c.every(function (c) { return c[1] >= 18 && c[0] <= S.dimanche; })
      && p5.nouveaux.some(function (e) { return /Alice Virtuelle/.test(e[2]) && e[1] >= 18; }), JSON.stringify([p5.groupes, p5.nouveaux, p5.tout]));
    verifie('6. « Je suis malade, décale ma journée de demain, d’après-demain ou de cette semaine » : « pour quand ? » avec ces trois moments, puis décalé' + qui,
      JSON.stringify(p6.choixMalade) === JSON.stringify(['Demain', 'Après-demain', 'Toute la semaine']) && p6.tout.some(function (t) { return /^C’est fait\. Repose-toi\./.test(t); })
      && p6.deplaces.length === 1 && p6.deplaces[0] !== S.demain, JSON.stringify([p6.choixMalade, p6.deplaces, p6.tout]));
    if (!x[0]) verifie('contact inconnu : « Je m’en occupe. Je ne trouve pas Gérard dans tes contacts. », le bouton « Ajouter Gérard », jamais de questionnaire',
      (S.inconnu || []).some(function (t) { return /^Je m’en occupe\. Je ne trouve pas Gérard dans tes contacts\./.test(t); }) && S.boutonAjouter && !(S.inconnu || []).some(function (t) { return PRO.test(t); }), JSON.stringify([S.inconnu, S.boutonAjouter]));
  });

  // En vrai (hors démonstration) : une carte proposée en cours, puis « Demande un rendez-vous demain à mon ami Michel » : la carte
  // tombe et Charly cherche les créneaux communs, sans passer par le modèle.
  const V = jouer(`
        contactsList = [{ id: 'c_m', name: 'Michel Martin', referenceCompte: 'REF-M', isTimeCool: true }];
        var appels = [];
        TC_BACKEND.proposerRdvGroupe = async function (refs, duree, type, o) { appels.push({ refs: refs, o: o }); var d = new Date(); d.setDate(d.getDate() + 1); return { creneaux: [{ date: tcISO(d), heure: 10, minute: 0, duree: 1, libelle: 'demain', manquants: [] }], invites: ['Michel'], sans_acces: [], duree: 1 }; };
        var modele = 0; callAI = async function () { modele++; return 'réponse du modèle'; };
        var demain = new Date(); demain.setDate(demain.getDate() + 1);
        charlyIA.history.push({ role: 'assistant', content: 'Coiffeur, demain à 10h : je te propose ceci.\\n[AGENDA]\\n' + tcISO(demain) + ' | 10:00-11:00 | Coiffeur | rdv\\n[/AGENDA]' });
        R.avant = !!tcPropositionEnAttente();
        var d0 = charlyIA.history.length;
        await taper('Demande un rendez-vous demain à mon ami Michel');
        await avancer();
        R.tout = textes(d0); R.modele = modele; R.appels = appels; R.apres = !!tcPropositionEnAttente();
        var d1 = charlyIA.history.length;
        await taper('Demande un rendez-vous demain à mon ami Gérard');
        R.inconnu = textes(d1); R.modele2 = modele;
        var d2 = charlyIA.history.length;
        await taper('Saisis dans mon agenda : rendez-vous dentiste mardi à 15h');
        R.dentiste = textes(d2); R.modele3 = modele;
        // Un métier ou un lieu n'est pas un contact introuvable (examen de la mission 110) : leur chemin d'avant.
        R.metiers = [];
        var ph = ['Demande un rendez-vous avec mon dentiste demain 15h', 'Demande un rendez-vous à la mairie', 'Demande un rendez-vous avec le dentiste'];
        for (var q = 0; q < ph.length; q++) {
          if (q === 2) charlyIA.history.push({ role: 'assistant', content: 'Coiffeur, demain à 10h : je te propose ceci.\\n[AGENDA]\\n' + tcISO(demain) + ' | 10:00-11:00 | Coiffeur | rdv\\n[/AGENDA]' });
          var dq = charlyIA.history.length; await taper(ph[q]); R.metiers.push(textes(dq));
        }
        // Personne n'est libre le soir : les autres créneaux communs, et Charly le dit.
        contactsList.push({ id: 'c_a', name: 'Alice Martin', referenceCompte: 'REF-A', isTimeCool: true });
        var soirs = [];
        TC_BACKEND.proposerRdvGroupe = async function (refs, duree, type, o) { soirs.push(o && o.des || 0); return { creneaux: o && o.des ? [] : [{ date: tcISO(demain), heure: 11, minute: 0, duree: 1, libelle: 'demain', manquants: [] }], invites: ['Alice'], sans_acces: [], duree: 1 }; };
        await tcProposerRdvGroupe(['REF-A'], 1, '', 'physique', { des: 18 });
        var gs = charlyIA.history.filter(function (m) { return m._groupe; }).pop();
        R.soir = { appels: soirs, preambule: gs && gs._groupe.preambule, n: gs && gs._groupe.creneaux.length, carte: document.getElementById('charlyChatBody').innerText.indexOf('Personne n’est libre après 18h') > -1 };`);
  const M = V.metiers || [];
  verifie('« Demande un rendez-vous avec mon dentiste demain 15h » : la carte du rendez-vous, jamais « je ne trouve pas Dentiste »',
    M[0] && !M[0].some(function (t) { return /Je ne trouve pas/.test(t); }) && M[0].some(function (t) { return /\[AGENDA\][^\n]*15:00/.test(t) || /\[AGENDA\]/.test(t); }), JSON.stringify(M[0]));
  verifie('« Demande un rendez-vous à la mairie », « … avec le dentiste » (carte en cours) : jamais « je ne trouve pas … dans tes contacts »',
    M[1] && M[2] && !M[1].concat(M[2]).some(function (t) { return /Je ne trouve pas .* dans tes contacts/.test(t); }), JSON.stringify([M[1], M[2]]));
  verifie('en vrai, personne de libre après 18h : les autres créneaux communs, et la carte le dit',
    V.soir && JSON.stringify(V.soir.appels) === '[18,0]' && V.soir.n === 1 && /^Personne n’est libre après 18h sur cette période\./.test(V.soir.preambule || '') && V.soir.carte, JSON.stringify(V.soir));
  verifie('en vrai, carte en cours : la carte tombe, les créneaux communs avec Michel (demain), sans le modèle',
    V.avant === true && V.apres === false && V.modele === 0 && V.appels && V.appels.length === 1 && V.appels[0].refs.join() === 'REF-M' && V.appels[0].o && V.appels[0].o.depuis === V.appels[0].o.jusqua
    && V.tout.some(function (t) { return /laissé tomber la proposition précédente/.test(t); }) && !V.tout.some(function (t) { return /Quel type de professionnel/.test(t); }), JSON.stringify(V));
  verifie('en vrai, contact inconnu : « Je m’en occupe. Je ne trouve pas Gérard dans tes contacts. », sans le modèle',
    V.modele2 === 0 && (V.inconnu || []).some(function (t) { return /^Je m’en occupe\. Je ne trouve pas Gérard dans tes contacts\./.test(t); }), JSON.stringify(V.inconnu));
  verifie('en vrai, « Saisis dans mon agenda : … dentiste mardi à 15h » : la carte « Dentiste », sans le modèle',
    V.modele3 === 0 && (V.dentiste || []).some(function (t) { return /^Dentiste, mardi \d+ \S+ \d{4} à 15h : je te propose ceci\./.test(t); }), JSON.stringify(V.dentiste));
}

console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
