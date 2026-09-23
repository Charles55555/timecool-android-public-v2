// « Importer mon ancien agenda » — après le retrait de l'étape de période.
//
// Elle demandait « jusqu'où remonter » : une question à laquelle personne
// ne sait répondre, et qui ne coupait que le passé — les rendez-vous à
// venir entraient de toute façon.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

console.log('\n── L étape de période a disparu, partout ──');
verifie('la liste des périodes est retirée', !/var IMPORT_PERIODS = \[/.test(html));
verifie('l écran de période est retiré', !/function renderImportStep2\(/.test(html));
verifie('plus personne ne l appelle', !/renderImportStep2\(c\)/.test(html));
verifie('la variable de période est retirée', !/var _importPeriod/.test(html));
verifie('l écran du fichier ne la cherche plus',
  !/IMPORT_PERIODS\.find/.test(html),
  'il aurait levé une erreur dès l affichage');

console.log('\n── Le parcours va droit au but ──');
verifie('choisir son agenda mène au fichier',
  /selectImportSource[\s\S]{0,400}_importStep = 3/.test(html));
verifie('et le retour saute la même étape',
  /_importStep === 3\) \? 1 :/.test(html));

console.log('\n── Tout est importé, et le passé est compté ──');
{
  // On rejoue le tri des événements du fichier, sans l'animation.
  const d = html.indexOf('  // Aucune limite de date');
  const f = html.indexOf('  // Animation de progression');
  if (d < 0 || f < d) { console.log('  ERREUR: boucle introuvable'); process.exit(1); }

  const corps = html.slice(d, f);
  const c = { Date, RegExp, parseInt, console, vevents: [], imported: 0, newEvents: [] };
  // Deux rendez-vous très anciens, un à venir.
  const an = new Date().getFullYear() + 3;
  c.vevents = [
    'DTSTART:19990101T090000\r\nSUMMARY:Très vieux',
    'DTSTART:20200601T100000\r\nSUMMARY:Ancien',
    'DTSTART:' + an + '0601T100000\r\nSUMMARY:À venir',
  ];
  vm.createContext(c);
  vm.runInContext(corps + '\nglobalThis._n = newEvents; globalThis._p = passes;', c);

  verifie('les trois entrent, même le plus ancien',
    c._n.length === 3, c._n.length + ' importé(s)');
  verifie('les deux passés sont comptés', c._p === 2, c._p + ' passé(s)');
  verifie('aucune limite de date ne subsiste', !/limitDate/.test(html));
}

console.log('\n── Le résultat dit ce qui est entré ──');
verifie('le nombre de passés est annoncé',
  /d\\u00e9j\\u00e0 pass\\u00e9/.test(html)
  && /showImportSuccess\(count, passes\)/.test(html),
  'personne ne s attend a voir dix ans d historique arriver');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
