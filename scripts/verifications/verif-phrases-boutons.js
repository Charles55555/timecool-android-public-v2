// Mission 93 : les boutons de Charly donnent une phrase d'exemple ; chaque exemple, tapé tel quel, aboutit simplement,
// sans passer par le modèle, sur un compte neuf (aucun contact, aucun rendez-vous) et sur un compte rempli.
// Complément (Charles, 15/11) : « Crée-moi un rendez-vous demain à 15h chez mon dentiste » : compte sans contact, la carte
// tout de suite ; compte avec des contacts, « C’est avec quelqu’un de tes contacts ? » (« 👤 Choisir un contact » / « Non, personne »).
// Usage : node verif-phrases-boutons.js <index.html>   (Chrome du poste, ou TC_CHROME ; sans Chrome, seule la partie fixe est jouée)
// TC_DUMP=1 : affiche ce que Charly répond, cas par cas.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d !== undefined && !c ? '  - ' + String(d).slice(0, 500) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
const N = '\u00a0';

titre('Les sept phrases des boutons, mot pour mot (Charles, 15/11)');
const BOUTONS = {
  rdv: ['Créer un nouveau rdv', 'Pour créer un nouveau rendez-vous, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Dentiste demain à 15h.'],
  impprevu: ['Gérer un imprévu', 'Pour gérer un imprévu, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Décale mon dentiste de demain à vendredi.'],
  retard: ['Prévenir d\'un retard','Pour prévenir d’un retard, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Préviens Paul que j’aurai 10 minutes de retard.'],
  groupe: ['Rendez-vous à plusieurs', 'Pour un rendez-vous à plusieurs, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Dîner avec Paul et Marie samedi soir.'],
  malade: ['Je suis malade, décale tout', 'Si tu es malade, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Je suis malade, décale mes rendez-vous d’aujourd’hui ou de demain.'],
  libre: ['Quand suis-je libre', 'Pour savoir quand tu es libre, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Quand suis-je libre mardi, jeudi ou cette semaine' + N + '?'],
  contact: ['Retrouver un contact', 'Pour retrouver un contact, écris-moi ou dis-moi ci-dessous, par exemple' + N + ': Retrouve Paul.'],
};
const bloc = (page.match(/const TC_PHRASES_BOUTONS = \{[\s\S]*?\n\};/) || [''])[0];
Object.keys(BOUTONS).forEach((k) => {
  verifie('« ' + BOUTONS[k][0] + ' » : la phrase exacte', bloc.indexOf('\n  ' + k + ": '" + BOUTONS[k][1] + "'") > -1);
  verifie('« ' + BOUTONS[k][0] + ' » : le bouton est toujours là', new RegExp("charlyQuickAction\\('" + k + "'\\)[^>]*>[^<]*" + BOUTONS[k][0]).test(page));
});

// Ce que l'utilisateur tape : l'exemple de chaque bouton (sans le point final), puis l'exemple de l'accueil (mission 92).
const PHRASES = [
  'Dentiste demain à 15h',
  'Décale mon dentiste de demain à vendredi',
  "Préviens Paul que j'aurai 10 minutes de retard",
  'Dîner avec Paul et Marie samedi soir',
  "Je suis malade, décale mes rendez-vous d'aujourd'hui ou de demain",
  'Quand suis-je libre mardi, jeudi ou cette semaine ?',
  'Retrouve Paul',
  'Crée-moi un rendez-vous demain à 15h chez mon dentiste',
];
// Examen de la 93 : des questions ou des mots qui ne sont pas un rendez-vous : ni carte, ni « À quelle heure ? » (le chemin
// habituel : la consultation de l'agenda, une question de Charly, ou le modèle).
const AU_MODELE = [
  "Qu'est-ce que j'ai avec Paul samedi",
  'Combien de rendez-vous avec Paul lundi',
  'Je suis avec Paul samedi',
  'libre demain 15h',
  'pas dispo demain 15h',
  'occupé demain 15h',
  'rien demain 15h',
];
const TOUTES = PHRASES.concat(AU_MODELE);

const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } });
if (!exe) {
  console.log('');
  console.log('  (Chrome non joué : pas de Chrome sur ce poste ; à rejouer avec TC_CHROME sur un poste qui en a un)');
} else {
  // Une page par compte ; les phrases s'y suivent, chacune sur un agenda remis à neuf. Rien n'est envoyé : le modèle et le
  // serveur sont remplacés (un appel au modèle est compté).
  const js = (compte) => `<script>window.addEventListener('load', function () { setTimeout(function () {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    try { localStorage.setItem('tc_permissions_shown', '1'); } catch (e) {}
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    window.__modele = 0;
    tcCharlyPret = function () { return true; };
    tcRelais = async function () { window.__modele++; throw new Error('modele'); };
    TC_BACKEND.propositionLibres = async function (r, c) { return { libres: c.map(function (x, i) { return i; }) }; };
    hideAuthFlow();
    var PHRASES = ${JSON.stringify(TOUTES)};
    var j = function (n) { var x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    function remettre() {
      events.length = 0; contactsList.length = 0;
      if (${JSON.stringify(compte)} === 'rempli') {
        contactsList.push({ id: 'p1', name: 'Paul Martin', referenceCompte: 'REFPAUL', phone: '0611111111' }, { id: 'm1', name: 'Marie Dupont', phone: '0622222222' }, { id: 'd1', name: 'Dr Lefèvre', phone: '0633333333' });
        events.push({ id: 'e1', title: 'Dentiste', date: j(1), startH: 10, startM: 0, endH: 11, endM: 0, mode: 'user', contact: 'd1' },
          { id: 'e2', title: 'Kiné', date: j(0), startH: Math.min(new Date().getHours() + 1, 23), startM: 0, endH: Math.min(new Date().getHours() + 1, 23), endM: 30, mode: 'user', contact: 'p1' },
          { id: 'e3', title: 'Réunion', date: j(1), startH: 14, startM: 0, endH: 15, endM: 0, mode: 'user', contact: 'p1' });
      }
      try { if (_tcQuestionnaire) tcQuestionnaireArreter(); } catch (e) {}
      try { _tcDeplacementEnAttente = null; } catch (e) {}
      charlyIA.history = [];
    }
    var res = [];
    var i = 0;
    function suivante() {
      if (i >= PHRASES.length) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); return; }
      remettre();
      var avant = window.__modele;
      var hm = typeof tcHeureManquante === 'function' ? tcHeureManquante(PHRASES[i]) : false;
      document.getElementById('charlyInput').value = PHRASES[i];
      Promise.resolve(charlySendMessage()).catch(function (e) { res.push({ erreur: String(e) }); }).then(function () {
        setTimeout(function () {
          var h = charlyIA.history.map(function (m) {
            var html = '';
            try { html = renderChatMessage(m) || ''; } catch (e) { html = ''; }
            return { role: m.role, texte: String(m.content || ''), cases: m._questionnaire ? m._questionnaire.choix.map(function (c) { return c.texte; }) : null,
              envoi: m._boutonsEnvoi ? [m._boutonsEnvoi.oui, m._boutonsEnvoi.non] : null, carte: /\\[AGENDA\\]/.test(m.content || ''),
              boutons: (html.match(/<button[^>]*>[\\s\\S]*?<\\/button>/g) || []).map(function (b) { return b.replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim(); }),
              question: (function () { var d = document.createElement('div'); d.innerHTML = html; var t = d.textContent.replace(/\\s+/g, ' ').trim(); return t.slice(0, 300); })() };
          });
          res.push({ phrase: PHRASES[i], modele: window.__modele - avant, hm: hm, h: h, nbEvents: events.length });
          i++;
          suivante();
        }, 1500);
      });
    }
    setTimeout(suivante, 800);
  }, 1200); });</script>`;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-phrases-'));
  const lire = (compte) => {
    fs.writeFileSync(path.join(dossier, compte + '.html'), page.replace('</body>', () => js(compte) + '</body>'));
    const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr-' + compte), '--window-size=390,844', '--virtual-time-budget=60000', '--dump-dom', 'file:///' + path.join(dossier, compte + '.html').replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
    const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
    try { return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { return null; }
  };
  const R = { neuf: lire('neuf'), rempli: lire('rempli') };
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  if (process.env.TC_DUMP) console.log(JSON.stringify(R, null, 1));
  // Ce que chaque phrase doit donner (d : la dernière réponse de Charly ; tout : toutes ses réponses).
  const Q = '[  ]\\?';
  const carte = (d) => d.carte && /\| Dentiste \| rdv/.test(d.texte) && d.boutons.indexOf('✅ Valider mon agenda') > -1;
  const attentes = {
    neuf: [
      { dit: 'la carte du rendez-vous tout de suite', test: (d) => carte(d) },
      { dit: '« Je ne trouve pas de rendez-vous « dentiste »… Rien n’a été changé. »', test: (d) => /^Je ne trouve pas de rendez-vous « dentiste » dans ton agenda à venir\. Rien n’a été changé\.$/.test(d.texte) },
      { dit: '« Tu n’as plus de rendez-vous aujourd’hui : personne à prévenir. »', test: (d) => d.texte === 'Tu n’as plus de rendez-vous aujourd’hui : personne à prévenir.' },
      { dit: '« À quelle heure ? »', test: (d) => new RegExp('^À quelle heure' + Q + '$').test(d.texte) },
      { dit: '« Rien à décaler pour aujourd’hui et demain. Repose-toi. »', test: (d) => d.texte === 'Rien à décaler pour aujourd’hui et demain. Repose-toi.' },
      { dit: 'la liste de ce qui est libre cette semaine', test: (d) => /^Voici ce qui est libre cette semaine/.test(d.texte) },
      { dit: '« Je ne trouve pas « Paul » dans tes contacts. »', test: (d) => d.texte === 'Je ne trouve pas « Paul » dans tes contacts.' },
      { dit: '(complément) compte sans contact : aucune question, la carte tout de suite, « sans contact · relier »', test: (d, tout) => carte(d) && tout.length === 1 && /mon dentiste — sans contact · relier/.test(d.question) && !/C’est avec quelqu’un|qui est-ce/.test(d.question) },
    ],
    rempli: [
      { dit: 'la carte du rendez-vous tout de suite', test: (d) => carte(d) },
      { dit: 'la carte simple du déplacement (Dr Lefèvre, vendredi), « Oui, envoie » / « Non »', test: (d) => /^Je déplace ton rendez-vous « Dentiste » avec Dr Lefèvre\.\n/.test(d.texte) && new RegExp('\\nJe lui envoie' + Q + '$').test(d.texte) && JSON.stringify(d.envoi) === '["Oui, envoie","Non"]' },
      { dit: 'la carte du retard pour Paul (Kiné dans l heure qui vient), « Oui, envoie » / « Non »', test: (d) => /^Tu seras en retard de 10 minutes à « Kiné »\.\nTu arriveras vers \d{1,2}h10\.\nJe préviens Paul\.\nLe message : « /.test(d.texte) && JSON.stringify(d.cases) === '["Oui, envoie","Non"]' },
      { dit: '« À quelle heure ? »', test: (d) => new RegExp('^À quelle heure' + Q + '$').test(d.texte) },
      { dit: 'aujourd’hui et demain : trois rendez-vous, puis la carte « Tu es malade. Je déplace 3 rendez-vous. … Je leur envoie ? »', test: (d, tout) => tout.some((m) => /^Voici tes rendez-vous pour aujourd’hui et demain/.test(m.texte)) && /^Tu es malade\. Je déplace 3 rendez-vous\.\n/.test(d.texte) && new RegExp('\\nJe leur envoie' + Q + '$').test(d.texte) && JSON.stringify(d.cases) === '["Oui, envoie","Non"]' },
      { dit: 'la liste de ce qui est libre cette semaine (le dentiste de demain retiré)', test: (d) => /^Voici ce qui est libre cette semaine/.test(d.texte) },
      { dit: 'la fiche de Paul Martin, « Ouvrir la fiche »', test: (d) => /^Paul Martin : 0611111111/.test(d.texte) && d.boutons.indexOf('Ouvrir la fiche') > -1 },
      { dit: '(complément) compte avec des contacts : « C’est avec quelqu’un de tes contacts ? », « 👤 Choisir un contact » / « Non, personne »', test: (d) => new RegExp('C’est avec quelqu’un de tes contacts' + Q).test(d.question) && JSON.stringify(d.boutons) === '["👤 Choisir un contact","Non, personne"]' && !/Si non|ni annuler/.test(d.question) },
    ],
  };
  ['neuf', 'rempli'].forEach((compte) => {
    titre('Compte ' + (compte === 'neuf' ? 'neuf (aucun contact, aucun rendez-vous)' : 'rempli (Paul, Marie, Dr Lefèvre ; Dentiste demain 10h, Réunion demain 14h)'));
    const liste = R[compte];
    verifie('les ' + TOUTES.length + ' phrases ont été jouées', Array.isArray(liste) && liste.length === TOUTES.length, JSON.stringify(liste));
    if (!Array.isArray(liste)) return;
    liste.forEach((x, i) => {
      const charly = (x.h || []).filter((m) => m.role !== 'user');
      const dernier = charly[charly.length - 1] || { texte: '', boutons: [] };
      if (i >= PHRASES.length) {
        verifie('« ' + TOUTES[i] + ' » : pas une demande sans heure (tcHeureManquante), ni carte ni « À quelle heure ? » (examen)', x.hm === false && !charly.some((m) => m.carte || /^À quelle heure/.test(m.texte)), JSON.stringify({ hm: x.hm, r: charly.map((m) => m.texte) }));
        return;
      }
      verifie('« ' + PHRASES[i] + ' » : sans le modèle', x.modele === 0, JSON.stringify(x));
      const a = attentes[compte][i];
      verifie('« ' + PHRASES[i] + ' » : ' + a.dit, a.test(dernier, charly, x), JSON.stringify(charly.map((m) => ({ t: m.texte, b: m.boutons, c: m.cases, e: m.envoi }))));
    });
  });
}
console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
