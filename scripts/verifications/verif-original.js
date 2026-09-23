// Le lien « voir l'original » apparait-il au bon moment ?
//
// Deux pieges : l'afficher sur un message qui n'a pas ete traduit
// (mention inutile sous chaque phrase), et laisser passer du HTML venu
// d'un message ecrit par quelqu'un d'autre.
const fs = require('fs');
const vm = require('vm');

const page = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

function extraire(nom) {
  const debut = page.indexOf('function ' + nom + '(');
  if (debut < 0) return null;
  let n = 0;
  for (let j = page.indexOf('{', debut); j < page.length; j++) {
    if (page[j] === '{') n++;
    else if (page[j] === '}') { n--; if (n === 0) return page.slice(debut, j + 1); }
  }
  return null;
}

// La vraie fonction d'echappement de la page, pas une imitation.
const ctx = { console };
vm.createContext(ctx);
['escapeHTMLSafe', 'tcOriginalHTML', 'tcBasculerOriginal'].forEach((n) => {
  const src = extraire(n);
  if (src) vm.runInContext(src, ctx);
  else { ko++; console.log('  KO  fonction ' + n + ' introuvable'); }
});

console.log('\n── Quand le lien ne doit pas apparaitre ──');
verifie('message jamais traduit',
  ctx.tcOriginalHTML({ text: 'Bonjour' }) === '');
verifie('champ original vide',
  ctx.tcOriginalHTML({ text: 'Bonjour', original: '   ' }) === '');
verifie('traduction identique a l original',
  ctx.tcOriginalHTML({ text: 'OK', original: 'OK' }) === '',
  'relire l identique n aide personne');

console.log('\n── Quand il doit apparaitre ──');
{
  const h = ctx.tcOriginalHTML({ text: 'Hello', original: 'Bonjour' });
  verifie('le lien est la', h.indexOf('tc-orig-lien') > -1);
  verifie('le texte d origine est present', h.indexOf('Bonjour') > -1);
  verifie('mais cache au depart', /class="tc-orig-txt" hidden>/.test(h));
  verifie('la bascule est branchee', h.indexOf('tcBasculerOriginal(this)') > -1);
  verifie('les noms ne partent pas en traduction', h.indexOf('data-notranslate') > -1);
}

console.log('\n── Un message venu d ailleurs ne peut pas injecter de HTML ──');
{
  const h = ctx.tcOriginalHTML({
    text: 'Hi', original: '<img src=x onerror="alert(1)">'
  });
  verifie('la balise est neutralisee',
    h.indexOf('<img') === -1 && h.indexOf('&lt;img') > -1,
    'le texte vient de l expediteur, pas de nous');
  verifie('le gestionnaire ne survit pas',
    !/onerror="alert/.test(h));
}

console.log('\n── Les retours a la ligne sont gardes ──');
verifie('deux lignes restent deux lignes',
  ctx.tcOriginalHTML({ text: 'a', original: 'un\ndeux' }).indexOf('<br>') > -1);

console.log('\n── La bascule montre puis recache ──');
{
  // Un faux morceau de page, juste assez pour la fonction.
  const txt = { hidden: true };
  const lien = { textContent: 'Voir l\'original',
                 parentElement: { querySelector: () => txt } };
  ctx.tcBasculerOriginal(lien);
  verifie('premier clic : le texte s affiche',
    txt.hidden === false && /Masquer/.test(lien.textContent), lien.textContent);
  ctx.tcBasculerOriginal(lien);
  verifie('second clic : il se recache',
    txt.hidden === true && /Voir/.test(lien.textContent), lien.textContent);
}

console.log('\n── Branche dans la conversation ──');
verifie('le rendu appelle bien le bloc',
  page.indexOf("}${tcOriginalHTML(t)}<div class=\"conv-time\"") > -1);
verifie('le serveur transmet le texte d origine',
  /original: typeof t\.original === 'string' \? t\.original : ''/.test(page));

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
