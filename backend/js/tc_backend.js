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

/** Poivre public des empreintes — doit être identique à config.php. */
const TC_POIVRE = 'A_RENSEIGNER';

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

  let reponse;
  try {
    reponse = await fetch(TC_API + chemin, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps)
    });
  } catch (e) {
    const err = new Error('Serveur injoignable');
    err.code = 'reseau';
    throw err;
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

/** Empreinte SHA-256 d'un identifiant normalisé, préfixée du poivre. */
async function tcEmpreinte(valeurNormalisee) {
  const octets = new TextEncoder().encode(TC_POIVRE + '|' + valeurNormalisee);
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

  /** Inscription. Ouvre la session et conserve le jeton. */
  async inscrire(champs) {
    const d = await tcAppel('POST', '/inscription', {
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
   * @param {Object} payload { contactId, titre, lieu, canal, prenomDestinataire,
   *                           slots: [{ debut, fin, libelle }] }
   */
  async createRdvLink(payload) {
    const d = await tcAppel('POST', '/rdv/lien/creer', {
      contact_id: payload.contactId ?? null,
      titre: payload.titre ?? null,
      lieu: payload.lieu ?? null,
      canal: payload.canal || 'sms',
      prenom_destinataire: payload.prenomDestinataire ?? null,
      creneaux: (payload.slots || []).map(s => ({
        debut: s.debut, fin: s.fin, libelle: s.libelle ?? null
      }))
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
