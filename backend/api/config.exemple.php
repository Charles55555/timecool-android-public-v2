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
     * Poivre applicatif des empreintes d'identifiants.
     *
     * Il est concaténé au téléphone / à l'email avant hachage, ce qui
     * empêche de retrouver un numéro à partir de la seule base.
     *
     * Générer une fois :  openssl rand -hex 32
     *
     * ATTENTION : le modifier invalide TOUTES les empreintes existantes
     * et casse la détection des contacts déjà inscrits. Il se sauvegarde
     * au même titre que le keystore Android.
     */
    'poivre' => 'A_RENSEIGNER',

    // Durée de validité d'une session de connexion, en jours.
    'session_jours' => 30,

    // Durée de validité d'un lien de réponse RDV, en heures.
    // La spec « Réponse contact sans app » retient 48 h.
    'lien_rdv_heures' => 48,

    // Durée de validité d'un code d'appairage, en minutes.
    'appairage_minutes' => 10,

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
