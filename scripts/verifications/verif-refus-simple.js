// Mission 24 (Charles, 12/10) : sur la carte d une demande de rendez-vous, un bouton « Refuser » simple a cote de
// « Refuser et bloquer » : refus calme, la personne est prevenue, pas bloquee, elle peut redemander.
// Usage : node verif-refus-simple.js <index.html> <backend/api/index.php>
const fs = require('fs');
const page = fs.readFileSync(process.argv[2], 'utf8');
const api = fs.readFileSync(process.argv[3], 'utf8');
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

titre('1. La carte : trois boutons, « Refuser » entre « Proposer un créneau » et « Refuser et bloquer », meme style');
const carte = fonction(page, 'tcCadreDemandeRdv') || '';
const boutons = carte.match(/<button[^>]*>[^<]*<\/button>/g) || [];
verifie('trois boutons, dans l ordre : ✅ Proposer un créneau, ✋ Refuser, 🚫 Refuser et bloquer', boutons.length === 3 && /Proposer un créneau/.test(boutons[0]) && />✋ Refuser<\/button>/.test(boutons[1]) && /Refuser et bloquer/.test(boutons[2]), boutons.map((b) => b.replace(/<button[^>]*>/, '')).join(' | '));
const forme = (b) => ((b.match(/style=\\?"([^"]*)"/) || [])[1] || '').replace(/background:[^;]*;?/g, '').replace(/\s+/g, ' ').trim();
verifie('« Refuser » a la meme forme que ses voisins (seule la couleur change : gris #9aa0a6)', boutons.length === 3 && forme(boutons[1]) === forme(boutons[2]) && /background:#9aa0a6/.test(boutons[1]), forme(boutons[1]) + ' // ' + forme(boutons[2]));
verifie('« Refuser » appelle tcRefuserRdv(<rdv>)', /onclick=\\?"tcRefuserRdv\(' \+ demande\.rdv \+ '\)\\?"/.test(boutons[1] || ''));
verifie('« Proposer un créneau » et « Refuser et bloquer » sont inchanges', /tcProposerCreneauRdv\(/.test(boutons[0] || '') && /tcRefuserBloquerRdv\(/.test(boutons[2] || ''));

titre('2. Le refus simple cote page');
const f = fonction(page, 'tcRefuserRdv') || '';
verifie('confirmation calme « Refuser cette demande ? La personne sera prévenue, sans être bloquée. »', /tcConfirm\('Refuser cette demande \? La personne sera prévenue, sans être bloquée\.'\)/.test(f));
verifie('appel refuserRdv(rdv, false), puis le cadre disparait (tcApresReponseRdv)', /TC_BACKEND\.refuserRdv\(rdv, false\)/.test(f) && /tcApresReponseRdv\(rdv\)/.test(f) && /Demande refusée, la personne est prévenue/.test(f));
const wrap = page.match(/async refuserRdv\(rdv, bloquer\) \{[\s\S]*?\n  \},/);
verifie('le champ « bloquer » n est envoye que pour un refus simple (absent = bloquer, comme avant)', !!wrap && /bloquer === false \? \{ rdv: rdv, bloquer: false \} : \{ rdv: rdv \}/.test(wrap[0]));
const fb = fonction(page, 'tcRefuserBloquerRdv') || '';
verifie('« Refuser et bloquer » appelle toujours refuserRdv(rdv) sans champ (bloque)', /TC_BACKEND\.refuserRdv\(rdv\)/.test(fb));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

titre('3. L API : champ facultatif « bloquer »');
const route = api.slice(api.indexOf("case 'POST /rdv/refuser':"), api.indexOf("case 'GET /sync/version':"));
verifie('la route lit « bloquer » (absent = true) et refuse une autre valeur qu un booleen (400 champ_invalide)', /\$bloquer = Entree::corps\(\)\['bloquer'\] \?\? true;/.test(route) && /if \(!is_bool\(\$bloquer\)\) \{\s+Rep::erreur\(400, 'champ_invalide'/.test(route));
// Mission 25 (reserves de l examen) : le message part apres la transaction (traduction = appel externe), prenom via texteSur.
verifie('bloquer = true : bloquerContact ; false : message pose chez le demandeur APRES la transaction, prenom via texteSur', /if \(\$bloquer\) \{\s+bloquerContact\(\$moi, \$demandeur\);\s+\} else \{[\s\S]*?\$prevenir = true;/.test(route) && /\$pdo->commit\(\);[\s\S]*?if \(\$prevenir\) \{\s+try \{\s+messagePoser\(\$moi, \$demandeur, texteSur\(\$moi\['prenom'\]\) \. ' ne peut pas donner suite à ta demande pour le moment\.', \$rdvId\);\s+\} catch \(Throwable \$e\) \{/.test(route) && (route.match(/messagePoser\(/g) || []).length === 1);
verifie('dans les deux cas : statut « refuse » et demande traitee', /statut = "refuse"/.test(route) && /demandeRdvTraitee\(\$moi, \$demandeur, \$rdvId\);/.test(route) && route.indexOf('demandeRdvTraitee') > route.indexOf('} else {'));

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
