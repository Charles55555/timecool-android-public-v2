// « Envoyer les créneaux » — le cas du contact qui n'a pas TimeCool.
//
// Un lien à usage unique est créé sur le serveur, puis proposé par SMS,
// e-mail ou WhatsApp. Deux façons de tromper Charles sans que rien ne le
// signale : dire « envoyé » quand rien n'est parti, et laisser un canal
// muet. Les deux s'étaient produites.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const java = fs.readFileSync(process.argv[3], 'utf8');

const d = html.indexOf('async function sendCreneauxDirect(');
const f = html.indexOf('\n}', html.indexOf('showToast(\'❌ Envoi impossible')) + 2;
if (d < 0 || f < d) { console.log('ERREUR: sendCreneauxDirect introuvable'); process.exit(1); }

// La mise en forme du prenom vit ailleurs dans le fichier : on la joint,
// sinon la fonction testee s'executerait sans elle.
// Depuis tcLienSms : les aides d envoi vivent juste avant la mise en
// forme du prenom, et la fonction testee s en sert.
const dp = html.indexOf('function tcLienSms(');
const fp = html.indexOf('/** Aucune application pour ouvrir');
if (dp < 0 || fp < dp) { console.log('ERREUR: tcPrenomPresentable introuvable'); process.exit(1); }

// La mise au format international du numero vit ailleurs aussi.
const dn = html.indexOf('function tcNormaliserTelephone(');
const fn = html.indexOf('\n}', dn) + 2;
if (dn < 0) { console.log('ERREUR: tcNormaliserTelephone introuvable'); process.exit(1); }

const SOURCE = html.slice(dn, fn) + '\n' + html.slice(dp, fp) + '\n' + html.slice(d, f);

let ko = 0;
function verifie(libelle, condition, detail) {
  if (!condition) ko++;
  console.log(`  ${condition ? 'OK ' : 'KO '}${libelle}${detail ? '  — ' + detail : ''}`);
}

const LIEN = 'https://api.timecool.fr/rdv/K7M2QX9F4BCD';

// Trois creneaux, comme en vrai : c'est le nombre que propose l'ecran.
const CRENEAUX = [
  { date: '2026-09-08', h: 10, m: 30, label: 'Mardi 8 septembre' },
  { date: '2026-09-09', h: 14, m: 0,  label: 'Mercredi 9 septembre' },
  { date: '2026-09-10', h: 9,  m: 0,  label: 'Jeudi 10 septembre' },
];

/** Rejoue l'envoi et rend { ouvert, message }. */
function envoi(contact, canal, echoue) {
  let ouvert = null, message = null, ferme = false;
  const ctx = {
    console: { warn: () => {} },
    contactsList: [contact],
    userAccount: { firstname: 'Charles' },
    showToast: (m) => { message = m; },
    encodeURIComponent,
    TC_BACKEND: {
      createRdvLink: async () => {
        if (echoue) throw new Error('reseau');
        return { url: LIEN };
      },
    },
    document: {
      getElementById: () => ({ _slots: CRENEAUX, remove: () => { ferme = true; } }),
    },
    // Un Android : c'est le séparateur « ? » qu'attendent ces cas.
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140' },
    window: { open: (u) => { ouvert = u; return { ok: true }; } },
  };
  ctx.window.location = { set href(v) { ouvert = v; }, get href() { return ouvert; } };
  vm.createContext(ctx);
  vm.runInContext(SOURCE + '\nglobalThis._e = sendCreneauxDirect;', ctx);
  return ctx._e('1', canal).then(() => ({ ouvert, message, ferme }));
}

(async function () {
  const complet = { id: '1', name: 'Julian Haddad', phone: '+33 6 07 78 65 12',
                    email: 'julian@exemple.fr' };

  console.log('\n── Les trois canaux ──');
  const sms = await envoi(complet, 'sms');
  verifie('SMS : la messagerie s ouvre avec le lien',
    (sms.ouvert || '').indexOf('sms:+33607786512?body=') === 0
    && decodeURIComponent(sms.ouvert).indexOf(LIEN) > 0);

  const mail = await envoi(complet, 'email');
  verifie('Email : le courrier s ouvre avec le lien',
    (mail.ouvert || '').indexOf('mailto:julian@exemple.fr?') === 0
    && decodeURIComponent(mail.ouvert).indexOf(LIEN) > 0);

  const wa = await envoi(complet, 'whatsapp');
  verifie('WhatsApp : wa.me avec le numero sans espaces',
    (wa.ouvert || '').indexOf('https://wa.me/33607786512?text=') === 0
    && decodeURIComponent(wa.ouvert).indexOf(LIEN) > 0);

  // La plupart des contacts d'un carnet francais sont dans cette forme.
  // wa.me la rejette : il lui faut l'international.
  const national = await envoi(
    { id: '1', name: 'Julian', phone: '06 07 78 65 12', email: 'j@x.fr' }, 'whatsapp');
  verifie('WhatsApp : un numero « 06… » est mis au format international',
    (national.ouvert || '').indexOf('https://wa.me/33607786512?text=') === 0,
    (national.ouvert || '').split('?')[0]);

  console.log('\n── Le meme texte partout ──');
  const corpsSms = decodeURIComponent(sms.ouvert.split('?body=')[1]);
  const corpsMail = decodeURIComponent(mail.ouvert.split('&body=')[1]);
  const corpsWa = decodeURIComponent(wa.ouvert.split('?text=')[1]);
  verifie('SMS, e-mail et WhatsApp disent la meme chose',
    corpsSms === corpsMail && corpsMail === corpsWa,
    'ils disaient trois choses differentes');

  console.log('\n── Ce que le contact recevra ──');
  console.log(corpsSms.split('\n').map(l => '      ' + l).join('\n'));

  console.log('\n── Mot pour mot ──');
  [
    'Salut Julian,',
    'Comme convenu tu trouveras ci dessous les 3 suggestions de rendez-vous que je peux te proposer:',
    'En cliquant sur l\'un de ces 3 liens le rendez vous sera confirmé dans mon agenda TimeCool.',
    'Tu peux aussi télécharger l\'application gratuite TimeCool, je la trouve exceptionnelle.',
    'Crois moi tu vas être surpris !',
    'Rejoins-moi sur TimeCool, on va optimiser notre temps : https://timecool.fr',
  ].forEach((ligne) => {
    verifie('« ' + ligne.slice(0, 44) + (ligne.length > 44 ? '…' : '') + ' »',
      corpsSms.indexOf(ligne) >= 0);
  });

  console.log('\n── Chaque suggestion a son propre lien ──');
  verifie('la suggestion porte la date, l heure et le lien',
    corpsSms.indexOf('Mardi 8 septembre 10h30 : ' + LIEN + '?c=1') >= 0,
    corpsSms.split('\n')[3]);
  verifie('les trois portent un rang different',
    corpsSms.indexOf('?c=1') > 0 && corpsSms.indexOf('?c=2') > 0
    && corpsSms.indexOf('?c=3') > 0,
    'sinon les trois liens meneraient au meme choix');
  verifie('les trois suggestions sont la, dans l ordre',
    corpsSms.indexOf('Mardi 8 septembre 10h30') <
    corpsSms.indexOf('Mercredi 9 septembre 14h00')
    && corpsSms.indexOf('Mercredi 9 septembre 14h00') <
       corpsSms.indexOf('Jeudi 10 septembre 09h00'));

  console.log('\n── L application laisse sortir ces liens ──');
  verifie('http(s) part vers l application du telephone',
    /url\.startsWith\("https:\/\/"\)/.test(java),
    'sans quoi WhatsApp ne faisait rien du tout');

  console.log('\n── Ce qui manque au contact se dit ──');
  const sansMail = await envoi({ id: '1', name: 'Enzo', phone: '0600000000', email: '' }, 'email');
  verifie('pas d adresse : rien ne s ouvre',
    sansMail.ouvert === null, String(sansMail.ouvert));
  verifie('et on le dit, au lieu de « envoyé »',
    /adresse e-mail/.test(sansMail.message || ''), sansMail.message);

  const sansTel = await envoi({ id: '1', name: 'Enzo', phone: '', email: 'e@x.fr' }, 'sms');
  verifie('pas de numero : on le dit aussi',
    sansTel.ouvert === null && /num[ée]ro/.test(sansTel.message || ''), sansTel.message);

  console.log('\n── Quand le serveur ne repond pas ──');
  const panne = await envoi(complet, 'sms', true);
  verifie('on parle de connexion, pas de fonction a venir',
    /connexion/.test(panne.message || '')
    && !/bient[oô]t disponible/.test(panne.message || ''), panne.message);

  console.log('\n── Un contact en majuscules ne se fait pas hurler dessus ──');
  const criard = await envoi({ id: '1', name: 'CHARLY DUPONT', phone: '0600000000',
                               email: 'c@x.fr' }, 'sms');
  const corpsCriard = decodeURIComponent(criard.ouvert.split('?body=')[1]);
  verifie('« Salut Charly, » et non « Salut CHARLY, »',
    corpsCriard.indexOf('Salut Charly,') === 0, corpsCriard.split('\n')[0]);

  console.log('\n── Rien n est promis a tort ──');
  verifie('le message ne dit plus « envoyés »',
    html.indexOf("Créneaux envoyés à ' + prenom") < 0,
    'c est la messagerie qui envoie, pas TimeCool');

  console.log(`\n${ko} anomalie(s).`);
  process.exit(ko ? 1 : 0);
})();
