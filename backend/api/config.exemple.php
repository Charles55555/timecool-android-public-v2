<?php
/**
 * Modèle de configuration TimeCool.
 *
 * À copier en config.php sur le serveur, hors du dépôt Git.
 * config.php ne doit JAMAIS être commité : il contient le mot de passe
 * de la base et le poivre applicatif.
 *
 *   cp config.exemple.php config.php && chmod 640 config.php
 */

return [
    // Base de données — voir /root/.timecool_db.cnf sur le serveur.
    'db' => [
        'hote'      => '127.0.0.1',
        'base'      => 'timecool_prod',
        'utilisateur' => 'timecool_app',
        'mot_de_passe' => 'A_RENSEIGNER',
    ],

    /**
     * Poivre serveur des empreintes d'identifiants.
     *
     * L'application transmet un simple SHA-256 de l'identifiant
     * normalisé, sans secret — elle est distribuée en APK public, donc
     * tout secret qu'elle embarquerait serait extractible. Le serveur
     * applique ce poivre sur ce qu'il reçoit, avant stockage et
     * comparaison. Le poivre ne doit JAMAIS être exposé au client.
     *
     * Générer une fois :  openssl rand -hex 32
     *
     * ATTENTION : le modifier invalide TOUTES les empreintes existantes
     * et casse la détection des contacts déjà inscrits. Il se sauvegarde
     * au même titre que le keystore Android.
     */
    'poivre' => 'A_RENSEIGNER',

    /**
     * Clé de chiffrement des clés API des utilisateurs (AES-256-GCM).
     * 32 octets en hexadécimal, soit 64 caractères.
     *
     * Générer une fois :  openssl rand -hex 32
     *
     * ATTENTION : la perdre rend TOUTES les clés API enregistrées
     * définitivement illisibles — les utilisateurs devraient les
     * ressaisir. À sauvegarder au même titre que le poivre et le
     * keystore Android. Distincte du poivre à dessein : deux usages,
     * deux secrets.
     */
    'cle_chiffrement' => 'A_RENSEIGNER',

    // Durée de validité d'une session de connexion, en jours.
    'session_jours' => 30,

    // Durée de validité d'un lien de réponse RDV, en heures.
    // La spec « Réponse contact sans app » retient 48 h.
    'lien_rdv_heures' => 48,

    // Durée de validité d'un code d'appairage, en minutes.
    'appairage_minutes' => 10,

    /**
     * Vérification de l'identifiant à l'inscription (SMS ou email).
     *
     * À false, un compte peut être créé directement depuis le
     * formulaire, sans preuve de possession de l'email ou du numéro.
     * C'est un affaiblissement réel : n'importe qui peut alors
     * s'inscrire avec l'identifiant d'un tiers. À REPASSER À true
     * AVANT LE LANCEMENT PUBLIC.
     *
     * Porté par le serveur, donc réactivable sans republier d'APK :
     * l'application interroge ce réglage via GET /parametres.
     */
    'verification_obligatoire' => true,

    // Durée de validité d'un code de vérification, en minutes.
    'verification_minutes' => 15,

    // Nombre de demandes de code autorisées par destination et par heure.
    'verification_max_par_heure' => 5,

    /**
     * Mode test — À REPASSER À false AVANT LE LANCEMENT PUBLIC.
     *
     * Aucun service d'envoi (SendGrid, Twilio) n'étant encore branché,
     * ce réglage fait renvoyer le code de vérification directement dans
     * la réponse de l'API, pour permettre les tests.
     *
     * Il est volontairement porté par le SERVEUR et non par
     * l'application : l'APK est distribué publiquement, un mode test
     * embarqué y serait un contournement d'authentification à la portée
     * de quiconque le décompile. Ici, le basculer à false suffit — sans
     * republier d'application.
     */
    'mode_test' => false,

    // Base publique des liens envoyés par SMS / email / WhatsApp.
    'url_publique' => 'https://api.timecool.fr',

    // Origines autorisées à appeler l'API depuis un navigateur.
    // L'application Android charge ses pages en file:// : son origine
    // est la chaîne « null », qui doit donc figurer ici.
    'origines_autorisees' => [
        'null',
        'https://timecool.fr',
        'https://app.timecool.fr',
    ],
];
