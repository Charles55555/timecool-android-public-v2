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

    /**
     * Identifiants clients Google acceptés comme audience des jetons.
     *
     * Pour Credential Manager, l'audience du jeton est l'identifiant de
     * type « Application Web », PAS celui de type « Android ». Ce dernier
     * doit exister dans le même projet — il autorise l'application par sa
     * signature — mais ce n'est pas sa valeur qu'on retrouve dans « aud ».
     */
    'google_client_ids' => [],

    /**
     * Twilio — envoi de SMS réel (voir la classe Sms dans lib.php pour
     * l'usage et pourquoi ces 3 valeurs vivent ici, jamais dans l'app).
     *   - twilio_account_sid       : console.twilio.com, page d'accueil
     *   - twilio_auth_token        : même page
     *   - twilio_numero_expediteur : numéro Twilio, format E.164 ('+33...')
     */
    'twilio_account_sid' => 'A_RENSEIGNER',
    'twilio_auth_token' => 'A_RENSEIGNER',
    'twilio_numero_expediteur' => 'A_RENSEIGNER',

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
     * Pas de réglage "mode test" ici : il est automatique, pas un
     * booléen à repasser à la main avant le lancement.
     *
     * Tant que 'twilio_account_sid' / 'twilio_auth_token' /
     * 'twilio_numero_expediteur' ci-dessus valent 'A_RENSEIGNER' (ou
     * sont vides), POST /verification/demander ne peut de toute façon
     * rien envoyer : il simule alors l'envoi avec un code fixe ("000000")
     * renvoyé dans sa réponse, plutôt que d'échouer. Idem pour l'email,
     * faute de fournisseur branché à ce jour (voir Sms dans lib.php).
     * Dès que les vraies valeurs Twilio sont renseignées, le SMS repasse
     * automatiquement en envoi réel — rien à modifier ni à retirer ici.
     *
     * Volontairement porté par le SERVEUR et non par l'application :
     * l'APK est distribué publiquement, un mode test embarqué y serait un
     * contournement d'authentification à la portée de quiconque le
     * décompile.
     */

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
