// Charly sait-il ecrire une periode, sans oublier ce qu'il savait deja ?
//
// Le motif qui lit ses lignes [AGENDA] a gagne un groupe. Tout groupe
// ajoute decale les suivants : une erreur ici prendrait l'heure pour
// le titre, ou le titre pour la categorie, et les rendez-vous crees
// seraient faux sans que rien ne plante.
const fs = require('fs');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

// Le vrai motif du fichier, pas une copie.
const brut = (page.match(/let m1 = line\.match\((\/.+\/)\);/) || [])[1];
if (!brut) { console.log('  KO  motif introuvable'); process.exit(1); }
const motif = new RegExp(brut.slice(1, -1));

function lire(ligne) {
  const m = ligne.match(motif);
  if (!m) return null;
  return {
    date: m[1], dateFin: m[2] || null,
    debut: m[3] + ':' + m[4], fin: m[5] + ':' + m[6],
    titre: (m[7] || '').trim(), categorie: m[8] || null,
    lieu: m[9] ? m[9].trim() : null
  };
}

console.log('\n── Une ligne a l ancien format reste comprise ──');
{
  const r = lire('2026-05-06 | 10:00-11:00 | Rendez-vous médecin | rdv');
  verifie('elle est lue', !!r);
  verifie('la date', r && r.date === '2026-05-06');
  verifie('aucune periode', r && r.dateFin === null);
  verifie('les heures', r && r.debut === '10:00' && r.fin === '11:00');
  verifie('le titre', r && r.titre === 'Rendez-vous médecin', r && r.titre);
  verifie('la categorie', r && r.categorie === 'rdv', r && r.categorie);
}

console.log('\n── Avec un lieu, toujours au bon endroit ──');
{
  const r = lire('2026-05-06 | 10:00-11:00 | Dentiste | rdv | 12 rue de Paris');
  verifie('le lieu est lu', r && r.lieu === '12 rue de Paris', r && r.lieu);
  verifie('et le titre n a pas glisse', r && r.titre === 'Dentiste', r && r.titre);
}

console.log('\n── Une periode ──');
{
  const r = lire('2026-11-11>2026-11-14 | 00:00-23:59 | Ryder Cup 2026 | loisir');
  verifie('elle est lue', !!r);
  verifie('le premier jour', r && r.date === '2026-11-11');
  verifie('le dernier', r && r.dateFin === '2026-11-14');
  verifie('le titre est intact', r && r.titre === 'Ryder Cup 2026', r && r.titre);
  verifie('la categorie aussi', r && r.categorie === 'loisir', r && r.categorie);
}

console.log('\n── Une periode avec des espaces autour du chevron ──');
{
  const r = lire('2026-08-01 > 2026-08-15 | 00:00-23:59 | Vacances | loisir');
  verifie('elle passe quand meme', r && r.dateFin === '2026-08-15', r && r.dateFin);
}

console.log('\n── Une periode avec un lieu ──');
{
  const r = lire('2026-08-01>2026-08-15 | 00:00-23:59 | Vacances | loisir | Corse');
  verifie('les cinq champs tiennent ensemble',
    r && r.dateFin === '2026-08-15' && r.titre === 'Vacances' && r.lieu === 'Corse',
    r ? [r.dateFin, r.titre, r.lieu].join(' / ') : '');
}

console.log('\n── Une fin anterieure au debut est ecartee ──');
verifie('le code la rejette',
  /dateFin: \(fin && fin > debut\) \? fin : null/.test(page),
  'sinon l evenement ne s afficherait sur aucun jour');
verifie('et ne la recopie pas non plus a la creation',
  /p\.dateFin && p\.dateFin > dateStr \? \{ dateFin: p\.dateFin \}/.test(page));

console.log('\n── Charly a recu la consigne ──');
verifie('la syntaxe lui est decrite', page.indexOf('2026-11-11>2026-11-14') > -1);
verifie('on lui interdit une ligne par jour',
  page.indexOf('surtout PAS une ligne par jour') > -1);
verifie('et on distingue periode et recurrence',
  page.indexOf('NE confonds PAS avec la récurrence') > -1);
// Le numero monte a chaque consigne nouvelle : l'epingler ici
// ferait echouer ce test a chaque fois. Seul compte qu'il ait quitte
// la version anterieure aux periodes.
verifie('la version du prompt a quitte celle d avant les periodes',
  page.indexOf("TC_PROMPT_VERSION = 'v8-copies-figees'") === -1,
  'sans quoi les appareils garderaient leur ancienne copie');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
