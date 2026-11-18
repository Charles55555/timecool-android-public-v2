// Mission 118 (Charles, 17/11 19h45) : la fiche d'un rendez-vous créé par Charly montre avec qui et où.
// - « Avec » : tous les invités (démonstration et vrai) ;
// - le lieu dit dans la phrase est posé sur le rendez-vous (à plusieurs : envoyé au serveur, inscrit chez tout le monde)
//   et rappelé par Charly ; sans lieu dit, rien n'est inventé en vrai ;
// - démonstration : une adresse d'exemple à Paris pour chaque rendez-vous, « En visio » / « Par téléphone » sans trajet,
//   « Temps de trajet » répond avec une durée d'exemple depuis le 12 rue du Commerce (15e), sans aucun appel extérieur.
// Usage : node verif-lieu-avec.js <index.html> <backend/api/index.php>   (TC_CHROME : Chrome sans tête)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const page = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/index.html'), 'utf8');
const api = fs.readFileSync(process.argv[3] || path.join(__dirname, '../../backend/api/index.php'), 'utf8');
let ko = 0, ok = 0;
const verifie = (l, c, d) => { if (c) ok++; else ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (!c && d !== undefined ? ' : ' + String(d).slice(0, 600) : '')); };

console.log('-- Le code --');
verifie('le serveur garde le lieu du rendez-vous à plusieurs, chez tout le monde', /\$lieuDonne = Entree::texte\('lieu', 255\);/.test(api) && /\] \+ \(\$lieuDonne !== null \? \['lieu' => \$lieuDonne\] : \[\]\);/.test(api));
verifie('la page envoie le lieu à /rdv/groupe/confirmer', /if \(options && options\.lieu\) corps\.lieu = String\(options\.lieu\)\.slice\(0, 255\);/.test(page));
verifie('aucun appel extérieur pour le trajet de la démonstration', /if \(typeof tcDemoActive === 'function' && tcDemoActive\(\)\) return tcTrajetDemo118\(destination\);/.test(page));

console.log('-- Dans la page (Chrome) --');
const candidats = [process.env.TC_CHROME, 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const exe = candidats.find((x) => { try { return fs.existsSync(x); } catch (e) { return false; } });
if (!exe) { console.log('NON JOUÉ : pas de Chrome sur ce poste'); process.exit(1); }
const js = `<script>window.addEventListener('load', function () { setTimeout(async function () {
  var attendre = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var fin = function (res) { var pre = document.createElement('pre'); pre.id = 'res'; pre.textContent = JSON.stringify(res); document.body.appendChild(pre); };
  var taper = async function (t) { var i = document.getElementById('charlyInput'); i.value = t; await charlySendMessage(); await attendre(2500); };
  var R = {};
  // Chrome sans tête ne joue pas toujours requestAnimationFrame (la semaine y est dessinée) : un setTimeout de 16 ms le remplace.
  window.requestAnimationFrame = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
  try {
    document.querySelectorAll('#onboardingScreen,[id^=ob],#permissionsScreen,#welcomeSplash').forEach(function (e) { e.style.display = 'none'; });
    localStorage.setItem('tc_permissions_shown', '1');
    window.__exterieur = 0;
    window.fetch = function () { window.__exterieur++; return Promise.reject(new Error('hors ligne')); };
    userAccount = { firstname: 'Charles', lastname: 'Haddad', reference: 'REFTEST' };
    tcCharlyPret = function () { return true; };
    charlyIA.history = []; charlyIA._historiqueCharge = true;
    hideAuthFlow(); navigate('assistant');
    await attendre(900);
    await tcOuvrirDemo(); await attendre(300);
    TC_ATTENTE_DUREES.demo = 50; TC_ATTENTE_DUREES.vrai = 50; TC_ATTENTE_DUREES.feuilles = 50; TC_ATTENTE_DUREES.consulte = 50;
    // 1. Les rendez-vous d'exemple : une adresse à Paris chacun.
    R.exemples = events.filter(function (e) { return e.demo; }).map(function (e) { return [e.title, e.lieu || '']; });
    // 2. À plusieurs, avec un lieu dit.
    await taper('Trouve un rendez-vous commun avec Alice, Chloé et Virginie cette semaine au 25 avenue de Wagram à Paris');
    await taper('En personne');
    var g = charlyIA.history.filter(function (m) { return m && m._groupe && m._groupe.etat === 'choix'; }).pop();
    R.groupeOptions = g ? g._groupe.options : null;
    var avant = events.length;
    if (g) { await tcConfirmerRdvGroupe(g._groupe.id, 0); await attendre(600); }
    var ev = events.slice(avant).filter(function (e) { return Array.isArray(e.invites) && e.invites.length === 3; })[0];
    R.groupeLieu = ev ? ev.lieu : null;
    R.groupeCarte = g ? String(renderChatMessage(g)).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ') : '';
    if (ev) {
      openEventModal(ev); await attendre(200);
      R.ficheGroupe = document.getElementById('emBody').innerText;
      var b = Array.prototype.slice.call(document.querySelectorAll('#emBody button')).filter(function (x) { return /Combien de temps/.test(x.textContent); })[0];
      R.boutonTrajet = !!b && b.offsetParent !== null;
      if (b) { b.click(); await attendre(1600); }
      R.trajet = (document.getElementById('emTrajet') || {}).innerText || '';
      closeEventModal();
    }
    // 3. À plusieurs, en visio, sans lieu dit : « En visio », ni « Y aller » ni trajet.
    await taper('Trouve un rendez-vous commun avec Alice et Chloé');
    await taper('En visio');
    var g2 = charlyIA.history.filter(function (m) { return m && m._groupe && m._groupe.etat === 'choix'; }).pop();
    var avant2 = events.length;
    if (g2) { await tcConfirmerRdvGroupe(g2._groupe.id, 0); await attendre(600); }
    var ev2 = events.slice(avant2).filter(function (e) { return Array.isArray(e.invites) && e.invites.length === 2; })[0];
    R.visioLieu = ev2 ? ev2.lieu : null;
    if (ev2) {
      openEventModal(ev2); await attendre(200);
      R.ficheVisio = document.getElementById('emBody').innerText;
      R.visioBoutons = Array.prototype.slice.call(document.querySelectorAll('#emBody button')).filter(function (x) { return /Combien de temps|Y aller/.test(x.textContent) && x.offsetParent !== null; }).length;
      closeEventModal();
    }
    // 4. Seul, avec une adresse : la proposition porte le lieu, la réponse le rappelle.
    await taper('Dentiste demain à 15h au 12 rue de Rivoli à Paris');
    var dern = charlyIA.history.filter(function (m) { return m && m.role === 'assistant' && /\\[AGENDA\\]/.test(m.content || ''); }).pop();
    R.solo = dern ? dern.content : '';
    R.exterieur = window.__exterieur;
    // Le doigt ne recouvre jamais un voisin : au-dessus (👇) si la colonne de gauche est prise, à droite (👈) si le dessus l'est aussi.
    var doigtPour = async function (id, dessusPris) {
      var cible = events.filter(function (e) { return e.id === id; })[0];
      if (!cible) return null;
      var veille = new Date(cible.date + 'T12:00:00'); veille.setDate(veille.getDate() - 1);
      events.push({ id: 'demo_voisin_' + id, mode: 'user', date: tcISO(veille), startH: cible.startH, startM: cible.startM || 0, endH: cible.startH + 1, endM: cible.startM || 0, title: 'Voisin', cat: 'perso', notes: '', demo: true });
      // Le dessus pris aussi, le même jour, juste avant : à n'importe quelle heure de la journée (le café d'exemple bouge le soir).
      if (dessusPris) events.push({ id: 'demo_dessus_' + id, mode: 'user', date: cible.date, startH: cible.startH - 1, startM: cible.startM || 0, endH: cible.startH, endM: cible.startM || 0, title: 'Dessus', cat: 'perso', notes: '', demo: true });
      tcVoirDansAgenda([id]); await attendre(1500);
      var dg = document.querySelector('.tc-doigt');
      var cs = Array.prototype.slice.call(document.querySelectorAll('.week-event[data-ev-id="' + id + '"]')).filter(function (x) { return x.offsetParent !== null; })[0];
      var res = null;
      if (dg && cs) {
        var a = cs.getBoundingClientRect(), b = dg.getBoundingClientRect();
        var autres = Array.prototype.slice.call(document.querySelectorAll('.week-event')).filter(function (x) { return x !== cs && x.offsetParent !== null; });
        var recouvre = autres.some(function (x) { var r = x.getBoundingClientRect(); return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; });
        res = [dg.textContent, Math.round(a.top - b.bottom), Math.round(b.left - a.right), recouvre];
      }
      navigate('assistant'); await attendre(300);
      return res;
    };
    R.dessus = await doigtPour('demo_dejeuner');
    R.droite = await doigtPour('demo_coiffeur', true);
    // 5. En vrai (hors démonstration) : « Avec » montre tous les invités ; sans lieu dit, rien n'est inventé.
    tcQuitterDemo({ sansRetour: true }); await attendre(300);
    var vrai = { id: 'v118', mode: 'user', date: tcISO(new Date()), startH: 18, startM: 0, endH: 19, endM: 0, title: 'RDV Marc, Lou', cat: 'travail',
      invites: [{ reference: 'REFMARC', prenom: 'Marc' }, { reference: 'REFLOU', prenom: 'Lou' }] };
    events.push(vrai);
    openEventModal(vrai); await attendre(200);
    R.ficheVrai = document.getElementById('emBody').innerText;
    closeEventModal();
    charlyIA.history = [];
    _tcLieu118 = null;
    var n0 = charlyIA.history.length;
    await taper('Dentiste demain à 15h');
    R.vraiSansLieu = charlyIA.history.slice(n0).map(function (m) { return m.content || ''; }).join('\\n');
  } catch (e) { R.erreur = String(e && e.stack || e); }
  fin(R);
}, 1200); });</script>`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-118-'));
fs.writeFileSync(path.join(dossier, 'p.html'), page.replace('</body>', () => js + '</body>'));
const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + path.join(dossier, 'pr'), '--window-size=390,844', '--virtual-time-budget=120000', '--dump-dom', 'file:///' + path.join(dossier, 'p.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 28 });
try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
const m = (r.stdout || '').match(/<pre id="res">([\s\S]*?)<\/pre>/);
let S = null;
try { S = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null; } catch (e) { S = null; }
if (!S) { verifie('la page a rejoué le parcours', false, (r.stdout || r.stderr || '').slice(-300)); }
else {
  if (S.erreur) verifie('aucune erreur', false, S.erreur);
  verifie('démonstration : chaque rendez-vous d’exemple a une adresse à Paris écrite en entier', S.exemples.length >= 6 && S.exemples.every((x) => /^\d+ .+, 750\d\d Paris$/.test(x[1])), JSON.stringify(S.exemples));
  verifie('à plusieurs, lieu dit : il suit la recherche jusqu’à la confirmation', S.groupeOptions && S.groupeOptions.lieu === '25 avenue de Wagram, Paris', JSON.stringify(S.groupeOptions));
  verifie('à plusieurs, lieu dit : le rendez-vous le porte', S.groupeLieu === '25 avenue de Wagram, Paris', S.groupeLieu);
  verifie('à plusieurs : Charly le rappelle (« 📍 25 avenue de Wagram, Paris »)', /📍 25 avenue de Wagram, Paris/.test(S.groupeCarte), S.groupeCarte);
  verifie('fiche : « Avec » montre les trois invités', /Alice Virtuelle, Chloé Virtuelle, Virginie Virtuelle/.test(S.ficheGroupe || ''), S.ficheGroupe);
  verifie('fiche : le lieu, et le bouton « Combien de temps ? » (le même qu’en vrai)', /25 avenue de Wagram, Paris/.test(S.ficheGroupe || '') && S.boutonTrajet === true, JSON.stringify([S.ficheGroupe, S.boutonTrajet]));
  verifie('trajet d’exemple : une durée, la distance, et d’où il part (12 rue du Commerce)', /18 à 26 min de trajet/.test(S.trajet) && /6\.8 km/.test(S.trajet) && /Depuis 12 rue du Commerce, 75015 Paris/.test(S.trajet), S.trajet);
  verifie('en visio : le lieu dit « En visio », ni « Y aller » ni trajet', S.visioLieu === 'En visio' && S.visioBoutons === 0 && /En visio/.test(S.ficheVisio || ''), JSON.stringify([S.visioLieu, S.visioBoutons]));
  verifie('seul, avec une adresse : la proposition porte le lieu et la réponse le rappelle', /\| 12 rue de Rivoli, Paris/.test(S.solo) && /📍 12 rue de Rivoli, Paris/.test(S.solo), S.solo);
  verifie('démonstration : aucun appel extérieur', S.exterieur === 0, S.exterieur);
  verifie('le doigt passe au-dessus (👇), avec le même espace, quand la colonne de gauche est prise', S.dessus && S.dessus[0] === '👇' && S.dessus[1] >= 10 && S.dessus[1] <= 28 && S.dessus[3] === false, JSON.stringify(S.dessus));
  verifie('à gauche et au-dessus pris : le doigt va ailleurs (👈 à droite, sinon 👆 en dessous), sans recouvrir de voisin', S.droite && (S.droite[0] === '👈' || S.droite[0] === '👆') && S.droite[3] === false, JSON.stringify(S.droite));
  verifie('en vrai : « Avec » montre tous les invités', /Avec[\s\S]*Marc, Lou/i.test(S.ficheVrai || ''), S.ficheVrai);
  verifie('en vrai, sans lieu dit : rien n’est inventé', /Dentiste/.test(S.vraiSansLieu) && !/📍/.test(S.vraiSansLieu) && !/Wagram/.test(S.vraiSansLieu), S.vraiSansLieu);
}
console.log((ko ? ko + ' anomalie(s)' : 'OK') + ' : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
