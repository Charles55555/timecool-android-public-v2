#!/usr/bin/env node
// Charles, 22/11/2026 : la devise finit par un point d'exclamation, comme sur le site :
// « Ton temps est la seule ressource que tu ne pourras jamais fabriquer ! » (espace insécable avant « ! »).
// Deux endroits : l'écran d'accueil (en bas) et Paramètres (sous « À propos »). Rien d'autre ne change.
// Usage : node verif-devise.js app/src/main/assets/index.html
const fs = require('fs');
const page = fs.readFileSync(process.argv[2] || 'app/src/main/assets/index.html', 'utf8');
let ok = 0, ko = 0;
function verifie(nom, cond, detail) {
  if (cond) { ok++; console.log('  ok ' + nom); } else { ko++; console.log('  KO ' + nom + (detail ? ' :: ' + detail : '')); }
}
const DEVISE = 'Ton temps est la seule ressource que tu ne pourras jamais fabriquer !';
const compte = (t) => page.split(t).length - 1;
verifie('la devise avec « !» et l espace insécable, deux fois exactement', compte('"' + DEVISE + '"') === 2, String(compte('"' + DEVISE + '"')));
verifie('plus aucune devise qui finit par un point', compte('jamais fabriquer.') === 0, String(compte('jamais fabriquer.')));
verifie('jamais d espace ordinaire avant « ! » dans la devise', compte('jamais fabriquer !') === 0 && compte('jamais fabriquer!') === 0);
const accueil = page.indexOf('<!-- Slogan en bas -->');
verifie('écran d accueil : la devise sous « Slogan en bas »', accueil > -1 && page.indexOf('"' + DEVISE + '"', accueil) > accueil && page.indexOf('"' + DEVISE + '"', accueil) - accueil < 400);
const rsi = page.indexOf('function renderSettingsInterne(');
const fin = rsi < 0 ? -1 : page.indexOf('\n}\n', rsi);
const reglages = rsi < 0 || fin < 0 ? '' : page.slice(rsi, fin);
verifie('Paramètres : la devise une fois, juste avant « Supprimer mon compte »', reglages.split('"' + DEVISE + '"').length === 2
  && reglages.indexOf('"' + DEVISE + '"') < reglages.indexOf('onclick="tcSupprimerMonCompte()"'));
console.log(ko ? 'ÉCHEC : ' + ko + ' KO sur ' + (ok + ko) : 'OK : ' + ok + ' vérifications');
process.exit(ko ? 1 : 0);
