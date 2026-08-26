/* ══════════════════════════════════════════════════════════════
   TC_BACKEND — branchement réel sur api.timecool.fr

   Remplace le bloc de stubs de app/src/main/assets/index.html.
   Conserve exactement la signature des 7 fonctions d'origine, pour
   que le reste du fichier n'ait pas à changer, et ajoute les
   fonctions d'inscription, de connexion et de synchronisation.

   Le jeton de session est conservé en localStorage. Les empreintes
   d'identifiants sont calculées ici, côté appareil : le carnet
   d'adresses n'est jamais transmis en clair au serveur.
   ══════════════════════════════════════════════════════════════ */

const TC_API = 'https://api.timecool.fr';
const TC_JETON_CLE = 'tc_session_jeton';

/** Au-delà, l'appel est abandonné et signalé comme tel. */
const TC_DELAI_MS = 20000;

function tcJeton() {
  try { return localStorage.getItem(TC_JETON_CLE); } catch (e) { return null; }
}

function tcPoserJeton(jeton) {
  try {
    if (jeton) localStorage.setItem(TC_JETON_CLE, jeton);
    else localStorage.removeItem(TC_JETON_CLE);
  } catch (e) { /* stockage indisponible : session non persistée */ }
}

/**
 * Appel HTTP unique de l'API.
 * Lève une Error portant le code d'erreur applicatif, pour que les
 * appelants puissent distinguer « lien expiré » d'une panne réseau.
 */
async function tcAppel(methode, chemin, corps, avecAuth = true) {
  const entetes = { 'Content-Type': 'application/json' };
  if (avecAuth) {
    const j = tcJeton();
    if (j) entetes['Authorization'] = 'Bearer ' + j;
  }

  /* Délai d'expiration obligatoire. Sans lui, un réseau mobile qui
     décroche laisse la promesse fetch en suspens indéfiniment : tout
     verrou d'interface posé avant l'appel ne serait jamais relâché, et
     le bouton correspondant resterait mort jusqu'au redémarrage. */
  const ctrl = new AbortController();
  const minuteur = setTimeout(function () { ctrl.abort(); }, TC_DELAI_MS);

  let reponse;
  try {
    reponse = await fetch(TC_API + chemin, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: ctrl.signal
    });
  } catch (e) {
    const expire = (e && e.name === 'AbortError');
    const err = new Error(expire ? 'Le serveur met trop de temps à répondre' : 'Serveur injoignable');
    err.code = expire ? 'delai_depasse' : 'reseau';
    throw err;
  } finally {
    clearTimeout(minuteur);
  }

  let data = {};
  try { data = await reponse.json(); } catch (e) { /* corps non JSON */ }

  if (!reponse.ok || data.ok === false) {
    const err = new Error(data.message || ('HTTP ' + reponse.status));
    err.code = data.erreur || ('http_' + reponse.status);
    // Session invalidée côté serveur : on nettoie pour forcer la reconnexion.
    if (reponse.status === 401) tcPoserJeton(null);
    throw err;
  }
  return data;
}

/**
 * Empreinte SHA-256 d'un identifiant normalisé.
 *
 * Volontairement sans secret : l'application est distribuée en APK
 * public, tout secret qu'elle embarquerait serait extractible. Le
 * serveur applique son propre poivre — qui ne quitte jamais le serveur —
 * sur ce qu'il reçoit, avant de stocker et de comparer.
 */
async function tcEmpreinte(valeurNormalisee) {
  const octets = new TextEncoder().encode(valeurNormalisee);
  const condensat = await crypto.subtle.digest('SHA-256', octets);
  return Array.from(new Uint8Array(condensat))
    .map(o => o.toString(16).padStart(2, '0'))
    .join('');
}

function tcNormaliserEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Téléphone au format E.164, aligné sur la normalisation serveur. */
function tcNormaliserTelephone(tel, indicatifDefaut = '+33') {
  let t = String(tel || '').replace(/[^0-9+]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (!t.startsWith('+')) t = indicatifDefaut + t.replace(/^0+/, '');
  return t;
}

const TC_BACKEND = {

  // ─── Compte ──────────────────────────────────────────────────

  /**
   * Paramètres publics de parcours, décidés par le serveur.
   * @returns {Object} { verification_obligatoire, mode_test }
   *
   * En cas d'échec réseau, on retourne le réglage le plus strict :
   * mieux vaut demander une vérification de trop que d'en sauter une.
   */
  async parametres() {
    try {
      const d = await tcAppel('GET', '/parametres', undefined, false);
      return {
        verification_obligatoire: d.verification_obligatoire !== false,
        mode_test: d.mode_test === true
      };
    } catch (e) {
      return { verification_obligatoire: true, mode_test: false };
    }
  },

  /**
   * Demande l'envoi d'un code de vérification.
   *
   * @param {'sms'|'email'} canal
   * @param {string} destination  numéro ou adresse
   * @returns {Object} { reference, expire_dans_minutes, code_test? }
   *
   * code_test n'est présent que si le serveur est en mode test. En
   * production il est absent, et l'application n'a donc rien à afficher.
   */
  async demanderVerification(canal, destination) {
    return await tcAppel('POST', '/verification/demander', {
      canal: canal,
      destination: destination
    }, false);
  },

  /** Valide le code et retourne la preuve à présenter à l'inscription. */
  async validerVerification(reference, code) {
    const d = await tcAppel('POST', '/verification/valider', {
      reference: reference,
      code: code
    }, false);
    return d.preuve;
  },

  /**
   * Inscription. Ouvre la session et conserve le jeton.
   * champs.preuve est omis quand le serveur n'exige pas de
   * vérification préalable.
   */
  async inscrire(champs) {
    const d = await tcAppel('POST', '/inscription', {
      preuve: champs.preuve || undefined,
      email: champs.email,
      telephone: champs.telephone,
      mot_de_passe: champs.motDePasse,
      prenom: champs.prenom,
      nom: champs.nom,
      ville: champs.ville,
      code_postal: champs.codePostal,
      pays: champs.pays || 'FR',
      langue: champs.langue || 'fr',
      appareil: navigator.userAgent.slice(0, 160)
    }, false);
    tcPoserJeton(d.session.jeton);
    return d.compte;
  },

  /** Connexion par email ou téléphone. */
  async connecter(identifiant, motDePasse) {
    const d = await tcAppel('POST', '/connexion', {
      identifiant: identifiant,
      mot_de_passe: motDePasse,
      appareil: navigator.userAgent.slice(0, 160)
    }, false);
    tcPoserJeton(d.session.jeton);
    return d.compte;
  },

  async deconnecter() {
    try { await tcAppel('POST', '/deconnexion'); } finally { tcPoserJeton(null); }
  },

  /** Compte courant, ou null si aucune session valable. */
  async moi() {
    if (!tcJeton()) return null;
    try {
      return (await tcAppel('GET', '/moi')).compte;
    } catch (e) {
      if (e.code === 'non_authentifie' || e.code === 'session_invalide') return null;
      throw e;
    }
  },

  estConnecte() { return !!tcJeton(); },

  // ─── Synchronisation entre utilisateurs ──────────────────────

  /**
   * Détermine lesquels de ces contacts ont déjà TimeCool.
   * Seules des empreintes quittent l'appareil.
   *
   * @param {Array} contacts  objets { id, email, telephone }
   * @returns {Map} id du contact -> { reference, prenom }
   */
  async detecterContactsInscrits(contacts) {
    const parEmpreinte = new Map();
    const empreintes = [];

    for (const c of contacts) {
      if (c.email) {
        const e = await tcEmpreinte(tcNormaliserEmail(c.email));
        parEmpreinte.set(e, c.id);
        empreintes.push(e);
      }
      if (c.telephone) {
        const e = await tcEmpreinte(tcNormaliserTelephone(c.telephone));
        parEmpreinte.set(e, c.id);
        empreintes.push(e);
      }
    }
    if (!empreintes.length) return new Map();

    const resultat = new Map();
    // Le serveur plafonne à 500 empreintes par appel.
    for (let i = 0; i < empreintes.length; i += 500) {
      const lot = empreintes.slice(i, i + 500);
      const d = await tcAppel('POST', '/contacts/detecter', { empreintes: lot });
      for (const ins of d.inscrits) {
        const idContact = parEmpreinte.get(ins.empreinte);
        if (idContact !== undefined) {
          resultat.set(idContact, { reference: ins.reference, prenom: ins.prenom });
        }
      }
    }
    return resultat;
  },

  // ─── Clés API de l'utilisateur ───────────────────────────────

  /**
   * Liste des clés enregistrées, SANS leur valeur.
   * @returns {Array} [{ service, indice, maj_le }]
   */
  async listerClesApi() {
    return (await tcAppel('GET', '/cles-api')).cles;
  },

  /** Valeur en clair d'une clé. Retourne null si aucune n'est enregistrée. */
  async lireCleApi(service) {
    try {
      const d = await tcAppel('GET', '/cles-api/valeur?service=' + encodeURIComponent(service));
      return d.valeur;
    } catch (e) {
      if (e.code === 'cle_absente') return null;
      throw e;
    }
  },

  /** Enregistre ou remplace la clé d'un service. */
  async enregistrerCleApi(service, valeur) {
    const d = await tcAppel('POST', '/cles-api', { service: service, valeur: valeur });
    return d.indice;
  },

  async supprimerCleApi(service) {
    await tcAppel('POST', '/cles-api/supprimer', { service: service });
    return true;
  },

  // ─── Appairage d'appareils ───────────────────────────────────

  async createPairingSession() {
    const d = await tcAppel('POST', '/appairage/creer', {}, false);
    return { code: d.code, sessionId: d.sessionId };
  },

  async approvePairing(code) {
    await tcAppel('POST', '/appairage/approuver', { code: code });
    return true;
  },

  /**
   * Interroge l'état de l'appairage depuis le nouvel appareil.
   * Une fois approuvé, la session est ouverte et le jeton conservé.
   * @returns {'attente'|'expire'|'approuve'}
   */
  async checkPairingStatus(sessionId) {
    const d = await tcAppel('GET', '/appairage/statut?sessionId=' + encodeURIComponent(sessionId), undefined, false);
    if (d.statut === 'approuve') {
      tcPoserJeton(d.session.jeton);
      return { statut: 'approuve', compte: d.compte };
    }
    return { statut: d.statut };
  },

  // ─── Clés publiques ──────────────────────────────────────────

  async publierClePublique(cleJwk) {
    await tcAppel('POST', '/cles/publier', {
      cle_jwk: cleJwk,
      appareil: navigator.userAgent.slice(0, 160)
    });
    return true;
  },

  /** Clés publiques d'un contact, par sa référence de compte. */
  async exchangePublicKey(referenceCompte) {
    const d = await tcAppel('GET', '/cles/recuperer?reference=' + encodeURIComponent(referenceCompte));
    return d.cles;
  },

  // ─── Lien de réponse RDV — contact sans application ──────────

  /**
   * @param {Object} payload { contactId, titre, lieu, canal, prenomDestinataire
   *                           ou contactPrenom, slots }
   *
   * Les créneaux sont acceptés sous les deux formes : celle produite par
   * tcFreeSlots() dans l'application ({ date, h, m, label }) et la forme
   * directe ({ debut, fin, libelle }). Le site d'appel existant n'a donc
   * rien à changer.
   */
  async createRdvLink(payload) {
    const creneaux = (payload.slots || []).map(s => {
      if (s.debut && s.fin) {
        return { debut: s.debut, fin: s.fin, libelle: s.libelle ?? s.label ?? null };
      }
      // Forme tcFreeSlots : une date, une heure de début, durée d'une heure.
      const hh = String(s.h).padStart(2, '0');
      const mm = String(s.m).padStart(2, '0');
      const finH = String((s.h + 1) % 24).padStart(2, '0');
      return {
        debut: s.date + ' ' + hh + ':' + mm + ':00',
        fin:   s.date + ' ' + finH + ':' + mm + ':00',
        libelle: s.label ?? null
      };
    });

    const d = await tcAppel('POST', '/rdv/lien/creer', {
      contact_id: payload.contactId ?? null,
      titre: payload.titre ?? null,
      lieu: payload.lieu ?? null,
      canal: payload.canal || 'sms',
      prenom_destinataire: payload.prenomDestinataire ?? payload.contactPrenom ?? null,
      creneaux: creneaux
    });
    return { token: d.token, url: d.url };
  },

  /** Lecture publique. Retourne null si absent, expiré ou déjà utilisé. */
  async fetchRdvLink(token) {
    try {
      return await tcAppel('GET', '/rdv/lien?jeton=' + encodeURIComponent(token), undefined, false);
    } catch (e) {
      if (e.code === 'lien_expire' || e.code === 'lien_inconnu') return null;
      throw e;
    }
  },

  /** choiceIndex : 1 à 3, ou -1 pour « aucun ne convient ». */
  async submitRdvChoice(token, choiceIndex) {
    await tcAppel('POST', '/rdv/lien/choix', { jeton: token, rang: choiceIndex }, false);
    return true;
  }
};
