// navigate() est surchargé quatre fois. Une seule de ces versions
// s'exécute réellement : c'est elle qui doit tout contenir.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

let ko = 0;
const dire = (ok, libelle, detail) => {
  if (!ok) ko++;
  console.log(`  ${ok ? 'OK ' : 'KO '}${libelle.padEnd(52)} ${detail || ''}`);
};

// La chaîne des surcharges, dans l'ordre du fichier.
const positions = [...html.matchAll(/\nnavigate = function\(page\) \{/g)].map((m) => m.index);
dire(positions.length === 4, 'quatre surcharges de navigate', positions.length + ' trouvée(s)');

// La dernière qui s'exécute vraiment est la première de la chaîne : les
// suivantes rappellent la précédente, elle non.
const fin = html.indexOf('\n};', positions[0]);
const premiere = html.slice(positions[0], fin);

console.log('\nLa surcharge qui remplace l originale doit tout porter :');
dire(/tcRafraichirBadgesContacts\(\)/.test(premiere),
  'la détection des contacts inscrits',
  'sans elle, aucun badge TimeCool n apparaît jamais');
dire(/_isolatedCalendarName = null/.test(premiere),
  'la sortie du mode agenda isolé',
  'sinon la vue reste filtrée sur un seul agenda');
dire(/c\.visible === false/.test(premiere),
  'le rétablissement des agendas masqués');

console.log('\nLes trois autres surcharges rappellent bien la précédente :');
positions.slice(1).forEach((p, i) => {
  const bloc = html.slice(p, html.indexOf('\n};', p));
  dire(/_origNavigate_v\d+\(page\)/.test(bloc), 'surcharge ' + (i + 2),
    bloc.match(/_origNavigate_v\d+/) ? bloc.match(/_origNavigate_v\d+/)[0] : '');
});

console.log('\nAucune variable morte qui laisse croire à une délégation :');
dire(!/const origNavigate = navigate;/.test(html),
  'origNavigate retirée', 'elle était capturée puis jamais appelée');

console.log('\nL originale est signalée comme supplantée :');
const avant = html.slice(Math.max(0, html.indexOf('function navigate(page) {') - 400),
  html.indexOf('function navigate(page) {'));
dire(/NE S'ÉXECUTE PLUS|NE S'EXÉCUTE PLUS/.test(avant),
  'un avertissement précède sa définition',
  'pour qu on n y ajoute pas du code sans effet');

console.log(`\n${ko} anomalie(s).`);
process.exit(ko ? 1 : 0);
