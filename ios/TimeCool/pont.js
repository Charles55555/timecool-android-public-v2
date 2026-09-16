/*
 * Le pont entre la page TimeCool et l'iPhone.
 *
 * Sur Android, l'application pose un objet « TimeCoolNatif » dans la
 * page et ses methodes repondent tout de suite. Sur iPhone, tout passe
 * par des messages a sens unique : rien ne peut rendre une valeur.
 *
 * Or la page pose quatre questions dont elle attend la reponse
 * immediatement — la version installee, l'autorisation des
 * notifications, la presence de Face ID, celle de la dictee. On ne peut
 * donc pas se contenter de relayer : ces reponses sont deposees dans la
 * page par l'application, et rafraichies quand elles changent.
 *
 * Ce fichier est injecte AVANT le chargement de la page : l'objet
 * existe donc quand le premier script s'execute.
 *
 * Ce qui n'est pas declare ici n'existe pas pour la page, et elle
 * retombe alors sur son comportement de navigateur — c'est voulu. La
 * premiere version iPhone ne fait que les rappels et Face ID.
 */
(function () {
  'use strict';

  /* Rempli par l'application avant l'injection de ce fichier. Les
     valeurs changent ensuite par tcNatifMaj(). */
  const etat = window.__tcEtatNatif || {};
  delete window.__tcEtatNatif;

  function envoyer(action, donnees) {
    try {
      window.webkit.messageHandlers.timecool.postMessage(
        Object.assign({ action: action }, donnees || {}));
    } catch (e) {
      console.warn('Pont natif indisponible :', action, e);
    }
  }

  window.TimeCoolNatif = {

    /* ─── Reconnaissance ─────────────────────────────────────── */

    estNatif: function () { return true; },

    /**
     * Version et date de fabrication, attendues tout de suite.
     * Deposees par l'application au demarrage.
     */
    obtenirInfosVersion: function () {
      return JSON.stringify({
        version: etat.version || null,
        buildTime: etat.buildTime || null
      });
    },

    /* ─── Rappels de rendez-vous ─────────────────────────────── */

    /** Reponse immediate attendue : valeur tenue a jour par l'application. */
    notificationsAutorisees: function () {
      return etat.notifications === true;
    },

    demanderPermissionNotifications: function () {
      envoyer('demanderPermissionNotifications');
    },

    /**
     * @param {string} rappelsJson [{ id, quand, titre, texte }, ...]
     * @param {boolean} silencieux
     */
    programmerRappels: function (rappelsJson, silencieux) {
      envoyer('programmerRappels', {
        rappels: rappelsJson,
        silencieux: silencieux === true
      });
    },

    annulerRappels: function () { envoyer('annulerRappels'); },

    /* ─── Face ID ────────────────────────────────────────────── */

    /** Reponse immediate attendue. */
    biometrieDisponible: function () {
      return etat.biometrie === true;
    },

    activerBiometrie: function (jeton) {
      envoyer('activerBiometrie', { jeton: String(jeton || '') });
    },

    deverrouillerBiometrie: function () { envoyer('deverrouillerBiometrie'); },

    desactiverBiometrie: function () { envoyer('desactiverBiometrie'); },

    /* ─── Carnet d'adresses ──────────────────────────────────── */

    /*
     * Declaree bien qu'absente de cette version : sans elle, la page
     * proposerait d'importer huit contacts d'exemple en expliquant que
     * « cette fonctionnalite necessite l'application Android » — un
     * message faux, affiche a l'interieur de l'application iPhone.
     */
    demanderContacts: function () { envoyer('contactsPasEncore'); }
  };

  /**
   * Met a jour les reponses immediates.
   *
   * L'autorisation des notifications change en cours de route : accordee
   * ou refusee par l'utilisateur, ou retiree depuis les reglages du
   * telephone pendant que l'application dormait.
   */
  window.tcNatifMaj = function (nouvel) {
    Object.assign(etat, nouvel || {});
  };
})();
