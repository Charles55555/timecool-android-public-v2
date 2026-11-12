#!/usr/bin/env node
// Mission 75 (Charles, 03/11/2026) : la page Paramètres dans l'ordre voulu, une seule ligne « Langue ».
// Usage : node verif-parametres-ordre.js app/src/main/assets/index.html
const fs = require('fs');
const page = fs.readFileSync(process.argv[2] || 'app/src/main/assets/index.html', 'utf8');
let ok = 0, ko = 0;
function verifie(nom, cond, detail) {
  if (cond) { ok++; console.log('  ok ' + nom); } else { ko++; console.log('  KO ' + nom + (detail ? ' :: ' + detail : '')); }
}
function fonction(nom) {
  const i = page.indexOf('function ' + nom + '(');
  if (i < 0) return '';
  const j = page.indexOf('\n}\n', i);
  return j < 0 ? '' : page.slice(i, j + 2);
}
const rsi = fonction('renderSettingsInterne');
const pos = (t) => rsi.indexOf(t);
const titres = ["${TC_CONFIANCE_VISIBLE ? tcBlocConfiance() : ''}", "💬 Messages d'annulation &amp; retards", "🏖️ Message d'absence", '🔔 Notifications', '🎨 Affichage',
  '🌍 Langue & Région', '💾 Sauvegarde & Restauration', '🔐 Compte & sécurité', '📱 Application', '🔒 Confidentialité & Sécurité', 'ℹ️ À propos',
  // Mission 83 (Charles, 12/11) : tout en bas, « Supprimer mon compte » à la place du gros « Se déconnecter ».
  '"Ton temps est la seule ressource', 'onclick="tcSupprimerMonCompte()"'];
const p = titres.map(pos);
verifie('les 12 blocs (et la citation) sont là, chacun une fois', titres.every((t) => rsi.split(t).length === 2), titres.filter((t) => rsi.split(t).length !== 2).join(' | '));
verifie('ordre : Confiance, Messages, Absence, Notifications, Affichage, Langue & Région, Sauvegarde, Compte, Application, Confidentialité, À propos, citation, Supprimer mon compte',
  p.every((x, k) => x > -1 && (k === 0 || x > p[k - 1])), p.join(','));
const aff = rsi.slice(pos('🎨 Affichage'), pos('🌍 Langue & Région'));
verifie('Affichage : thème, fuseau horaire, plage horaire de ma journée, premier jour de la semaine ; plus de ligne « Langue »',
  ["openSettingsModal('theme')", "openSettingsModal('timezone')", "openSettingsModal('hours')", "openSettingsModal('weekstart')"].every((x) => aff.indexOf(x) > -1)
  && aff.indexOf("openSettingsModal('language')") < 0 && aff.indexOf('settings_lang_label') < 0 && !/>Langue</.test(aff));
const lr = rsi.slice(pos('🌍 Langue & Région'), pos('💾 Sauvegarde & Restauration'));
verifie('Langue & Région : langue de l application et format des dates, seul endroit de la langue', /onclick="openLanguageSelector\(\)"/.test(lr) && /Langue de l'application/.test(lr) && /Format des dates/.test(lr)
  && rsi.split("Langue de l'application").length === 2 && rsi.indexOf("openSettingsModal('language')") < 0);
verifie('les deux anciennes lignes commandaient le même réglage : selectLanguageFromSettings, clé timecool_language',
  /onclick="selectLanguageFromSettings\('\$\{lang\.code\}'\)"/.test(fonction('openLanguageSelector')) && /setItem\('timecool_language', code\)/.test(fonction('selectLanguageFromSettings')));
verifie('la langue reçue du compte met à jour la ligne qui reste (initLanguageDisplay → settingsLangDisplay)', /initLanguageDisplay\(\)/.test(fonction('tcAppliquerLangueRecue')) && /settingsLangDisplay/.test(fonction('initLanguageDisplay')));
const reglages = ['exportTimeCoolData()', 'id="importFileInput"', 'id="importIcsInput"', 'autoBackupFreq', 'updateBannerZone', 'autoUpdateToggle', 'checkForUpdates(true)', 'tcMsgFormes', 'tcMsgModeles', 'tcAbsenceZone',
  'settingsLangDisplay', 'rappelsToggle', 'tcChoisirDelaiRappel()', 'sonneriesToggle', 'settings_theme_label', 'settings_tz_label', 'settings_hours_label', 'settings_weekstart_label',
  'TC_PHRASE_CONFIDENTIALITE', "openLegalPage('cgu'", "openLegalPage('privacy'", 'mdpAffichageTexte', 'tcModifierMotDePasse()', 'tcRenderBiometrieToggle()'];
verifie('aucun réglage perdu (mêmes identifiants et mêmes actions)', reglages.every((x) => rsi.split(x).length === 2), reglages.filter((x) => rsi.split(x).length !== 2).join(' '));
const gab = rsi.slice(rsi.indexOf('innerHTML = `'), rsi.indexOf('`;'));
verifie('le gabarit est équilibré (autant de <div que de </div>)', (gab.match(/<div\b/g) || []).length === (gab.match(/<\/div>/g) || []).length,
  (gab.match(/<div\b/g) || []).length + ' / ' + (gab.match(/<\/div>/g) || []).length);
console.log((ko ? 'ECHEC ' : '') + ok + '/' + (ok + ko) + ' verifications passees');
process.exit(ko ? 1 : 0);
