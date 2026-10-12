// Mission 34 (Charles, 12/10) : les notes internes de Charly ne sont jamais affichees ni imitees. (1) L historique envoye
// au modele n a ni bulles d application ni note de remplacement des cartes ; (2) a l affichage : plus de ligne entre
// crochets « [proposition d agenda… », plus de « ✅ C est noté : … » venu du modele, aucune ligne identique repetee.
// Usage : node verif-charly-notes-internes.js <index.html>
const fs = require('fs');
const vm = require('vm');
const page = fs.readFileSync(process.argv[2], 'utf8');
let ko = 0;
function verifie(l, c, d) { if (!c) ko++; console.log('  ' + (c ? 'OK ' : 'KO ') + l + (d ? '  - ' + String(d).replace(/\s*\n\s*/g, ' ').slice(0, 300) : '')); }
function titre(t) { console.log(''); console.log('-- ' + t + ' --'); }
function fonction(texte, nom) {
  let d = texte.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  if (texte.slice(d - 6, d) === 'async ') d -= 6;
  let n = 0;
  for (let j = texte.indexOf('{', d); j < texte.length; j++) {
    if (texte[j] === '{') n++;
    else if (texte[j] === '}') { n--; if (n === 0) return texte.slice(d, j + 1); }
  }
  return null;
}
const ctx = { console, String, Array, Object, JSON, charlyIA: { history: [] } };
vm.createContext(ctx);
['tcHistoriquePourIA', 'tcSansNotesInternes'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; console.log('  KO  ' + n + ' introuvable'); } });
if (ko) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

titre('1. L historique envoye au modele : ni bulles d application, ni note de remplacement');
ctx.charlyIA.history = [
  { role: 'assistant', content: 'Bonjour Alice ! 😊 Je suis Charly, ton assistant TimeCool.', appText: true, fr: 'x' },
  { role: 'user', content: 'Aide-moi à organiser mon agenda' },
  { role: 'assistant', content: 'Voici ce que je te propose :\n[AGENDA]\n2026-10-13 | 11:00-13:00 | Travail | travail\n[/AGENDA]\nÇa te va ?', _validated: true },
  { role: 'assistant', content: '✅ C’est noté : 27 créneaux ajoutés à ton agenda. Tu peux aller vérifier.', _app: true },
  { role: 'assistant', content: 'On continue : pour tes réunions et appels, quels jours et quelles heures ?', _app: true },
  { role: 'user', content: 'Du 1er novembre au 31 décembre lundi et vendredi de 13h à 13h30' },
  { role: 'assistant', content: 'Parfait, je note ça ! 📞\n[AGENDA]\n2026-11-02 | 13:00-13:30 | Appels | travail\n[/AGENDA]' }
];
const h = ctx.tcHistoriquePourIA();
const texte = JSON.stringify(h);
verifie('les bulles d application (accueil appText, « C’est noté », question de suite) ne partent pas', h.length === 4 && !/Je suis Charly|C’est noté|On continue/.test(texte), texte.slice(0, 200));
verifie('plus aucune note entre crochets : la carte est remplacee par rien, le reste de la bulle est garde', !/\[proposition|fait foi|\[AGENDA\]/.test(texte) && h[1].content === 'Voici ce que je te propose :\n\nÇa te va ?' && h[3].content === 'Parfait, je note ça ! 📞', JSON.stringify(h.map((m) => m.content)));
verifie('l ordre et les roles sont intacts (user, assistant, user, assistant)', h.map((m) => m.role).join() === 'user,assistant,user,assistant');
// Examen : un message d assistant qui n etait QUE la carte devient vide → il ne part pas ; deux messages de meme role
// qui se suivent (bulle d application retiree entre eux) sont fusionnes par un saut de ligne.
ctx.charlyIA.history = [
  { role: 'user', content: 'rdv dentiste mardi 15h' },
  { role: 'assistant', content: '[AGENDA]\n2026-10-13 | 15:00-16:00 | Dentiste | rdv\n[/AGENDA]', _validated: true },
  { role: 'assistant', content: '✅ C’est noté : rendez-vous ajouté à ton agenda.', _app: true },
  { role: 'user', content: 'et demain ?' },
  { role: 'user', content: 'enfin, mercredi' },
  { role: 'assistant', content: 'Mercredi, tu es libre toute la journée.' }
];
const h2 = ctx.tcHistoriquePourIA();
verifie('aucun message vide dans la liste envoyee ; deux messages utilisateur qui se suivent sont fusionnes', h2.every((m) => m.content.trim()) && h2.length === 2 && h2[0].role === 'user' && h2[0].content === 'rdv dentiste mardi 15h\net demain ?\nenfin, mercredi' && h2[1].role === 'assistant', JSON.stringify(h2));

titre('2. L affichage : la bulle de la capture de Charles devient propre');
const bulle = "Parfait, je note ça ! 📞\n[proposition d'agenda faite a ce moment-la - l'agenda reel ci-dessus fait foi]\nOn continue : pour les courses, quel(s) jour(s) et à quelle heure ?\n✅ C'est noté : 17 créneaux ajoutés à ton agenda. Tu peux aller vérifier.\nOn continue : pour les courses, quel(s) jour(s) et à quelle heure ?";
const r1 = ctx.tcSansNotesInternes(bulle);
verifie('note interne retiree, « C’est noté » du modele retire, question en double gardee une fois', r1 === "Parfait, je note ça ! 📞\nOn continue : pour les courses, quel(s) jour(s) et à quelle heure ?", r1);
verifie('une note entre crochets au milieu d une ligne est retiree aussi', ctx.tcSansNotesInternes("D'accord [proposition d'agenda NON ajoutee - elle n'existe pas, l'agenda reel ci-dessus fait foi] je regarde.") === "D'accord  je regarde.".replace('  ', ' ') || ctx.tcSansNotesInternes("D'accord [proposition d'agenda NON ajoutee - elle n'existe pas, l'agenda reel ci-dessus fait foi] je regarde.") === "D'accord  je regarde.");
// Une ligne courte repetee a distance n est pas une relance : elle reste (regle de l examen) ; le bloc est conserve tel quel.
verifie('un bloc [AGENDA] est conserve tel quel, et une ligne courte repetee autour reste', ctx.tcSansNotesInternes('Voici :\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Dentiste | rdv\n[/AGENDA]\nVoici :') === 'Voici :\n[AGENDA]\n2026-10-13 | 15:00-16:00 | Dentiste | rdv\n[/AGENDA]\nVoici :');
verifie('une reponse normale est inchangee', ctx.tcSansNotesInternes('Mardi 13 octobre à 15h, tu as déjà « Formation ». Dis-moi quel créneau te va.') === 'Mardi 13 octobre à 15h, tu as déjà « Formation ». Dis-moi quel créneau te va.');
verifie('une reponse vide reste telle quelle (le repli se fait ailleurs)', ctx.tcSansNotesInternes('') === '');
// Examen : jamais un fait d une liste retire (« Dentiste 10h » lundi ET mardi, « • Sport » deux fois, separateurs).
const agenda = 'Voici ton agenda :\nLundi\nDentiste 10h\nMardi\nDentiste 10h\n---\n• Sport\n• Sport\n- 10h Dentiste';
verifie('une liste d agenda avec des lignes identiques (faits) est inchangee', ctx.tcSansNotesInternes(agenda) === agenda, ctx.tcSansNotesInternes(agenda));
verifie('une ligne identique a la precedente est retiree (« Oui. / Oui. » → « Oui. »)', ctx.tcSansNotesInternes('Oui.\nOui.') === 'Oui.');
verifie('une phrase longue deja vue plus haut est retiree (la question reposee), meme separee par d autres lignes', ctx.tcSansNotesInternes('On continue : pour les courses, quel(s) jour(s) ?\nD’accord.\nOn continue : pour les courses, quel(s) jour(s) ?') === 'On continue : pour les courses, quel(s) jour(s) ?\nD’accord.');

titre('3. Les points d entree');
const csm = fonction(page, 'charlySendMessage') || '';
verifie('charlySendMessage applique tcSansNotesInternes apres tcSansFormulesFaites, avant tcSansRelance', /reply = tcSansFormulesFaites\(reply\);\s+reply = tcSansNotesInternes\(reply\);/.test(csm) && csm.indexOf('tcSansNotesInternes(reply)') < csm.indexOf('tcSansRelance(reply'));
verifie('la bulle « ✅ C’est noté : N créneaux ajoutés… » est marquee _app', /charlyIA\.history\.push\(\{_app: true, role:'assistant', content:`✅ C'est noté : /.test(page));
verifie('la question de suite remise par la page (_followUp) est marquee _app', /charlyIA\.history\.push\(\{_app: true, role:'assistant', content: followUpMsg\._followUp\}\)/.test(page));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
