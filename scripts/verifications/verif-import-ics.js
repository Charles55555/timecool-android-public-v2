// Mission 30 (12/10) : import .ics. Vraie duree (DTEND / DURATION), LOCATION → lieu, ATTENDEE → note, sans heure →
// journee entiere, doublons (meme UID, ou meme titre + meme debut) ignores, un seul lecteur pour les deux imports, pas de
// fausse recherche sur le web. Usage : node verif-import-ics.js <index.html>
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
const ctx = { console, String, Number, Array, Date, JSON, Math, Object, isNaN };
vm.createContext(ctx);
let manque = 0;
['tcISO', 'tcProprietesIcs', 'tcTexteIcs', 'tcDateIcs', 'tcDureeIcs', 'tcLireIcs', 'tcEstDoublonIcs', 'tcPreparerImportIcs'].forEach((n) => { const f = fonction(page, n); if (f) vm.runInContext(f, ctx); else { ko++; manque++; console.log('  KO  ' + n + ' introuvable'); } });
if (manque) { console.log('\n' + ko + ' anomalie(s).'); process.exit(1); }

// Un export a la Google : lignes repliees, TZID, journee entiere, periode, DURATION, UTC, lieu, invites, virgules echappees, UID double.
const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Paris:20261015T140000', 'DTEND;TZID=Europe/Paris:20261015T163000', 'UID:a1@google.com',
  'SUMMARY:Réunion d\\, équipe', 'LOCATION:12 rue des Lilas\\, Lyon', 'DESCRIPTION:Ordre du jour\\nBudget', 'ATTENDEE;CN=Paul Martin;ROLE=REQ-PARTICIPANT:mailto:paul@exemple.fr',
  'ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:rita@exemple.fr', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261020', 'DTEND;VALUE=DATE:20261021', 'UID:b2@google.com', 'SUMMARY:Anniversaire de ', ' Maman', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261224', 'DTEND;VALUE=DATE:20261227', 'UID:c3@google.com', 'SUMMARY:Vacances', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261016T090000', 'DURATION:PT1H30M', 'UID:d4@google.com', 'SUMMARY:Dentiste', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261017T100000', 'UID:e5@google.com', 'SUMMARY:Sans fin', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20260701T120000Z', 'DTEND:20260701T130000Z', 'UID:f6@google.com', 'SUMMARY:Appel UTC', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261018T230000', 'DTEND:20261019T010000', 'UID:g7@google.com', 'SUMMARY:Soirée', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261019T100000', 'UID:a1@google.com', 'SUMMARY:Doublon dans le fichier', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:h8@google.com', 'SUMMARY:Sans date', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261021T080000', 'UID:i9@google.com', 'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

titre('1. Le lecteur : duree, journee entiere, periode, lieu, invites, UTC, lignes repliees, doublons dans le fichier');
const lus = ctx.tcLireIcs(ICS);
const par = {}; lus.forEach((e) => { par[String(e.uid).split('@')[0]] = e; });
verifie('7 evenements lus (UID double, sans date, sans titre ignores)', lus.length === 7, lus.map((e) => e.uid).join(' '));
verifie('Reunion : 14:00 → 16:30 (DTEND lu, pas +1 h), virgule echappee, cat perso, importe', par.a1 && par.a1.date === '2026-10-15' && par.a1.startH === 14 && par.a1.startM === 0 && par.a1.endH === 16 && par.a1.endM === 30 && par.a1.title === 'Réunion d, équipe' && par.a1.cat === 'perso' && par.a1.importe === true, JSON.stringify(par.a1));
verifie('Reunion : LOCATION → lieu, DESCRIPTION et ATTENDEE → note (« Invités : Paul Martin, rita@exemple.fr »)', par.a1 && par.a1.lieu === '12 rue des Lilas, Lyon' && par.a1.notes === 'Ordre du jour\nBudget\nInvités : Paul Martin, rita@exemple.fr', par.a1 && par.a1.notes);
verifie('Anniversaire (VALUE=DATE, ligne repliee) : journee entiere, 0:00-23:59, un seul jour (DTEND exclusif), titre recolle', par.b2 && par.b2.allDay === true && par.b2.startH === 0 && par.b2.endH === 23 && par.b2.endM === 59 && !par.b2.dateFin && par.b2.title === 'Anniversaire de Maman', JSON.stringify(par.b2));
verifie('Vacances : journee entiere du 24 au 26 decembre (DTEND 27 exclusif → dateFin 26)', par.c3 && par.c3.allDay === true && par.c3.date === '2026-12-24' && par.c3.dateFin === '2026-12-26', JSON.stringify(par.c3));
verifie('Dentiste : DURATION PT1H30M → 9:00-10:30', par.d4 && par.d4.startH === 9 && par.d4.endH === 10 && par.d4.endM === 30);
verifie('Sans fin : +1 h (10:00-11:00), pas journee entiere', par.e5 && par.e5.startH === 10 && par.e5.endH === 11 && !par.e5.allDay);
const utc = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
verifie('Appel UTC (Z) : ramene a l heure locale (' + utc.getHours() + 'h), une heure de duree', par.f6 && par.f6.startH === utc.getHours() && par.f6.endH === (utc.getHours() + 1) % 24 && par.f6.date === ctx.tcISO(utc));
verifie('Soiree 23:00 → 01:00 le lendemain : jusqu a 23:59 le jour meme', par.g7 && par.g7.startH === 23 && par.g7.endH === 23 && par.g7.endM === 59 && par.g7.date === '2026-10-18');
verifie('tcDureeIcs : P1D, PT1H30M, P1DT2H, -PT15M, faux', ctx.tcDureeIcs('P1D') === 86400000 && ctx.tcDureeIcs('PT1H30M') === 5400000 && ctx.tcDureeIcs('P1DT2H') === 93600000 && ctx.tcDureeIcs('-PT15M') === -900000 && ctx.tcDureeIcs('1H') === null);
verifie('tcTexteIcs : « \\, » → « , », « \\; » → « ; », « \\n » → saut de ligne (ou espace dans un titre), « \\\\ » → « \\ »', ctx.tcTexteIcs('a\\,b\\;c\\nd\\\\e') === 'a,b;c\nd\\e' && ctx.tcTexteIcs('a\\nb', true) === 'a b');

titre('2. Les doublons avec l agenda, et ce qui entre');
const existants = [{ id: 'x', title: 'Dentiste', date: '2026-10-16', startH: 9, startM: 0, endH: 10, endM: 0, mode: 'user' }, { id: 'y', title: 'Autre', date: '2026-01-01', startH: 8, startM: 0, uid: 'f6@google.com', mode: 'user' }];
const r = ctx.tcPreparerImportIcs(ICS, existants, 'user');
verifie('tcPreparerImportIcs : 5 nouveaux, 2 doublons (Dentiste : meme titre + meme debut ; Appel UTC : meme UID), id et mode poses', r.lus === 7 && r.nouveaux.length === 5 && r.doublons === 2 && r.nouveaux.every((e) => /^ics_\d+_\d+$/.test(e.id) && e.mode === 'user') && !r.nouveaux.some((e) => e.uid === 'd4@google.com' || e.uid === 'f6@google.com'), JSON.stringify({ lus: r.lus, n: r.nouveaux.length, d: r.doublons }));
verifie('tcEstDoublonIcs : meme titre a la casse pres + meme jour + meme heure → oui ; meme titre un autre jour → non', ctx.tcEstDoublonIcs({ title: 'dentiste', date: '2026-10-16', startH: 9, startM: 0 }, existants) === true && ctx.tcEstDoublonIcs({ title: 'Dentiste', date: '2026-10-17', startH: 9, startM: 0 }, existants) === false);
const r2 = ctx.tcPreparerImportIcs(ICS, existants.concat(r.nouveaux), 'user');
verifie('rejouer le meme fichier : 0 nouveau, 7 doublons', r2.nouveaux.length === 0 && r2.doublons === 7);

titre('3. Les deux imports passent par le lecteur ; le web va droit au choix du fichier');
const imp = fonction(page, 'importIcsData') || '';
verifie('Parametres (importIcsData) : tcPreparerImportIcs, doublons dits dans le toast, plus de lecture maison', /const r = tcPreparerImportIcs\(e\.target\.result, events, mode\);/.test(imp) && /déjà présent/.test(imp) && !/split\('BEGIN:VEVENT'\)/.test(imp));
const pro = fonction(page, 'processIcsImport') || '';
verifie('« Importer mon ancien agenda » (processIcsImport) : tcPreparerImportIcs, passes comptes sur la date de fin, doublons passes a showImportSuccess', /var lecture = tcPreparerImportIcs\(icsText, events, mode\);/.test(pro) && /\(ev\.dateFin \|\| ev\.date\) < aujourdhui/.test(pro) && /showImportSuccess\(imported, passes, doublons\)/.test(pro) && !/substring\(9,11\)/.test(pro));
verifie('showImportSuccess dit les doublons ignores', /function showImportSuccess\(count, passes, doublons\)/.test(page) && /rendez-vous d\\u00e9j\\u00e0 pr\\u00e9sent/.test(fonction(page, 'showImportSuccess') || ''));
const scan = fonction(page, 'startIcsAutoScan') || '';
verifie('web (pas de TimeCoolNative) : startIcsAutoScan va droit au choix du fichier ; plus de faux « 2 fichiers »', /if \(!natif\) \{ renderIcsChoixFichier\(\); return; \}/.test(scan) && !/found\+\+/.test(scan) && !/fichier' \+ \(found/.test(scan));
verifie('finishIcsAutoScan sans natif : renderIcsChoixFichier (plus de faux « mon-agenda.ics »)', /renderIcsChoixFichier\(\);/.test(fonction(page, 'finishIcsAutoScan') || '') && page.indexOf("renderIcsScanResult('mon-agenda.ics'") < 0);
verifie('renderIcsChoixFichier : « Choisis ton fichier .ics », un bouton, le champ fichier → startImportProcess', /Choisis ton fichier \.ics/.test(fonction(page, 'renderIcsChoixFichier') || '') && /onchange="startImportProcess\(event\)"/.test(fonction(page, 'renderIcsChoixFichier') || ''));
verifie('aucune assertion arrière dans la page (Safari ancien)', page.indexOf('(?<') < 0);

console.log('');
console.log(ko + ' anomalie(s).');
process.exit(ko ? 1 : 0);
