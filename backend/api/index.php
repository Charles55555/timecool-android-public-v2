<?php
/**
 * API TimeCool — point d'entrée unique.
 *
 * Sert les fonctions TC_BACKEND de l'application :
 * inscription, connexion, synchronisation entre utilisateurs,
 * appairage d'appareils, échange de clés publiques, et liens de
 * réponse RDV pour les contacts sans application.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

Conf::charger(__DIR__ . '/config.php');
Rep::entetes();

// Pré-vol CORS : répondre sans rien exécuter.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$chemin  = '/' . trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '', '/');
$route   = $methode . ' ' . $chemin;

/** Algorithme de hachage des mots de passe, Argon2id si disponible. */
function algoMotDePasse(): string
{
    return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
}

/** Ouvre une session et retourne le jeton en clair (jamais restocké). */
function ouvrirSession(int $compteId, ?string $appareil): array
{
    $jeton = Jeton::creer();
    $jours = (int) Conf::get('session_jours', 30);
    $ip    = $_SERVER['REMOTE_ADDR'] ?? null;

    Db::req(
        'INSERT INTO sessions (compte_id, jeton_hash, appareil, ip_creation, expire_le)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
        [
            $compteId,
            Jeton::hacher($jeton),
            $appareil,
            $ip !== null ? @inet_pton($ip) : null,
            $jours,
        ]
    );

    return ['jeton' => $jeton, 'expire_dans_jours' => $jours];
}

/** Vue publique d'un compte : jamais le hash ni les empreintes. */
function vueCompte(array $c): array
{
    return [
        'reference'   => $c['reference'],
        'prenom'      => $c['prenom'],
        'nom'         => $c['nom'],
        'email'       => $c['email'],
        'telephone'   => $c['telephone'],
        'ville'       => $c['ville'],
        'code_postal' => $c['code_postal'],
        'pays'        => $c['pays'],
        'langue'      => $c['langue'],
        'fuseau'      => $c['fuseau'],
    ];
}

switch ($route) {

    // ═══════════════════════════════════════════════════════════
    // INSCRIPTION
    // ═══════════════════════════════════════════════════════════
    case 'POST /inscription':
        $email = Entree::requis('email');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Rep::erreur(400, 'email_invalide', 'Adresse email invalide.');
        }
        $motDePasse = Entree::corps()['mot_de_passe'] ?? '';
        if (!is_string($motDePasse) || mb_strlen($motDePasse) < 10) {
            Rep::erreur(400, 'mot_de_passe_faible', 'Le mot de passe doit faire au moins 10 caractères.');
        }

        $telephone = Empreinte::normaliserTelephone(Entree::requis('telephone', 20));
        $emailNorm = Empreinte::normaliserEmail($email);

        $compte = [
            'reference'           => Jeton::reference(),
            'email'               => $emailNorm,
            'email_empreinte'     => Empreinte::calculer($emailNorm),
            'telephone'           => $telephone,
            'telephone_empreinte' => Empreinte::calculer($telephone),
            'mot_de_passe_hash'   => password_hash($motDePasse, algoMotDePasse()),
            'prenom'              => Entree::requis('prenom', 100),
            'nom'                 => Entree::requis('nom', 100),
            'ville'               => Entree::requis('ville', 120),
            'code_postal'         => Entree::requis('code_postal', 16),
            'pays'                => Entree::texte('pays', 2) ?? 'FR',
            'langue'              => Entree::texte('langue', 5) ?? 'fr',
            'fuseau'              => Entree::texte('fuseau', 64) ?? 'Europe/Paris',
        ];

        try {
            Db::req(
                'INSERT INTO comptes (reference, email, email_empreinte, telephone,
                     telephone_empreinte, mot_de_passe_hash, prenom, nom, ville,
                     code_postal, pays, langue, fuseau)
                 VALUES (:reference, :email, :email_empreinte, :telephone,
                     :telephone_empreinte, :mot_de_passe_hash, :prenom, :nom, :ville,
                     :code_postal, :pays, :langue, :fuseau)',
                $compte
            );
        } catch (PDOException $e) {
            // 23000 = violation de contrainte d'unicité.
            if ($e->getCode() === '23000') {
                Rep::erreur(409, 'compte_existant', 'Un compte existe déjà avec cet email ou ce numéro.');
            }
            throw $e;
        }

        $id = (int) Db::pdo()->lastInsertId();
        $ligne = Db::un('SELECT * FROM comptes WHERE id = ?', [$id]);

        Rep::ok([
            'compte'  => vueCompte($ligne),
            'session' => ouvrirSession($id, Entree::texte('appareil', 160)),
        ], 201);

    // ═══════════════════════════════════════════════════════════
    // CONNEXION
    // Accepte indifféremment un email ou un numéro de téléphone.
    // ═══════════════════════════════════════════════════════════
    case 'POST /connexion':
        $identifiant = Entree::requis('identifiant');
        $motDePasse  = Entree::corps()['mot_de_passe'] ?? '';

        $estEmail = str_contains($identifiant, '@');
        $empreinte = $estEmail
            ? Empreinte::email($identifiant)
            : Empreinte::telephone($identifiant);
        $colonne = $estEmail ? 'email_empreinte' : 'telephone_empreinte';

        $c = Db::un("SELECT * FROM comptes WHERE $colonne = ? AND cloture_le IS NULL", [$empreinte]);

        // Réponse identique que le compte existe ou non, et vérification
        // menée dans les deux cas : ni le message ni le temps de réponse
        // ne révèlent l'existence d'un compte.
        $factice = '$2y$12$' . str_repeat('a', 53);
        $valide = password_verify(
            is_string($motDePasse) ? $motDePasse : '',
            $c['mot_de_passe_hash'] ?? $factice
        );
        if ($c === null || !$valide) {
            Rep::erreur(401, 'identifiants_invalides', 'Identifiant ou mot de passe incorrect.');
        }

        if (password_needs_rehash($c['mot_de_passe_hash'], algoMotDePasse())) {
            Db::req('UPDATE comptes SET mot_de_passe_hash = ? WHERE id = ?', [
                password_hash($motDePasse, algoMotDePasse()),
                $c['id'],
            ]);
        }
        Db::req('UPDATE comptes SET derniere_connexion = NOW() WHERE id = ?', [$c['id']]);

        Rep::ok([
            'compte'  => vueCompte($c),
            'session' => ouvrirSession((int) $c['id'], Entree::texte('appareil', 160)),
        ]);

    // ═══════════════════════════════════════════════════════════
    case 'POST /deconnexion':
        $c = Auth::compte();
        Db::req('UPDATE sessions SET revoque_le = NOW() WHERE id = ?', [$c['session_id']]);
        Rep::ok();

    // ═══════════════════════════════════════════════════════════
    case 'GET /moi':
        Rep::ok(['compte' => vueCompte(Auth::compte())]);

    // ═══════════════════════════════════════════════════════════
    // SYNCHRONISATION ENTRE UTILISATEURS
    // L'application envoie des empreintes, jamais le carnet en clair.
    // Réponse : les empreintes qui correspondent à un compte inscrit.
    // ═══════════════════════════════════════════════════════════
    case 'POST /contacts/detecter':
        Auth::compte();
        $empreintes = Entree::corps()['empreintes'] ?? null;
        if (!is_array($empreintes) || $empreintes === []) {
            Rep::erreur(400, 'empreintes_manquantes', 'Fournir un tableau « empreintes ».');
        }
        if (count($empreintes) > 500) {
            Rep::erreur(413, 'trop_d_empreintes', 'Maximum 500 empreintes par appel.');
        }
        // Filtrage strict : seules des empreintes SHA-256 sont acceptées.
        $propres = array_values(array_filter(
            $empreintes,
            static fn($e) => is_string($e) && preg_match('/^[0-9a-f]{64}$/', $e) === 1
        ));
        if ($propres === []) {
            Rep::ok(['inscrits' => []]);
        }

        $trous = implode(',', array_fill(0, count($propres), '?'));
        $lignes = Db::tous(
            "SELECT reference, prenom, email_empreinte, telephone_empreinte
               FROM comptes
              WHERE cloture_le IS NULL
                AND (email_empreinte IN ($trous) OR telephone_empreinte IN ($trous))",
            array_merge($propres, $propres)
        );

        // Ne renvoie que l'empreinte fournie et le strict nécessaire pour
        // ouvrir le flux applicatif : référence opaque et prénom.
        $index = array_flip($propres);
        $inscrits = [];
        foreach ($lignes as $l) {
            foreach (['email_empreinte', 'telephone_empreinte'] as $col) {
                if (isset($index[$l[$col]])) {
                    $inscrits[] = [
                        'empreinte' => $l[$col],
                        'reference' => $l['reference'],
                        'prenom'    => $l['prenom'],
                    ];
                }
            }
        }
        Rep::ok(['inscrits' => $inscrits]);

    // ═══════════════════════════════════════════════════════════
    // APPAIRAGE D'APPAREILS — TC_BACKEND.createPairingSession
    // ═══════════════════════════════════════════════════════════
    case 'POST /appairage/creer':
        $minutes = (int) Conf::get('appairage_minutes', 10);
        // Un code court est deviné facilement : il expire vite et ne vaut
        // que pour un appairage, jamais pour une connexion.
        for ($essai = 0; $essai < 8; $essai++) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            try {
                Db::req(
                    'INSERT INTO appairages (code, expire_le)
                     VALUES (?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
                    [$code, $minutes]
                );
                Rep::ok([
                    'code'      => $code,
                    'sessionId' => (int) Db::pdo()->lastInsertId(),
                    'expire_dans_minutes' => $minutes,
                ], 201);
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') {
                    throw $e;
                }
                // Code déjà pris par un appairage en cours : on retente.
            }
        }
        Rep::erreur(503, 'appairage_indisponible', 'Réessayez dans quelques instants.');

    // TC_BACKEND.approvePairing — depuis l'appareil déjà connecté.
    case 'POST /appairage/approuver':
        $compte = Auth::compte();
        $code = Entree::requis('code', 6);

        $maj = Db::req(
            'UPDATE appairages
                SET statut = "approuve", compte_id = ?, approuve_le = NOW()
              WHERE code = ? AND statut = "attente" AND expire_le > NOW()',
            [$compte['id'], $code]
        );
        if ($maj->rowCount() === 0) {
            Rep::erreur(404, 'code_invalide', 'Code inconnu, déjà utilisé ou expiré.');
        }
        Rep::ok();

    // TC_BACKEND.checkPairingStatus — depuis le nouvel appareil.
    case 'GET /appairage/statut':
        $id = isset($_GET['sessionId']) && ctype_digit((string) $_GET['sessionId'])
            ? (int) $_GET['sessionId']
            : null;
        if ($id === null) {
            Rep::erreur(400, 'session_manquante', 'Paramètre sessionId requis.');
        }

        $a = Db::un('SELECT * FROM appairages WHERE id = ?', [$id]);
        if ($a === null) {
            Rep::erreur(404, 'appairage_inconnu', 'Appairage introuvable.');
        }
        if ($a['statut'] !== 'approuve') {
            $expire = strtotime($a['expire_le']) < time();
            Rep::ok(['statut' => $expire ? 'expire' : 'attente']);
        }

        // Approuvé : le code est consommé et échangé contre une session.
        // Il ne peut jamais servir deux fois.
        Db::req('UPDATE appairages SET statut = "annule" WHERE id = ?', [$id]);
        $c = Db::un('SELECT * FROM comptes WHERE id = ?', [$a['compte_id']]);
        if ($c === null) {
            Rep::erreur(410, 'compte_absent', 'Le compte associé n existe plus.');
        }
        Rep::ok([
            'statut'  => 'approuve',
            'compte'  => vueCompte($c),
            'session' => ouvrirSession((int) $c['id'], Entree::texte('appareil', 160)),
        ]);

    // ═══════════════════════════════════════════════════════════
    // CLÉS PUBLIQUES — TC_BACKEND.exchangePublicKey
    // Le serveur ne voit jamais de clé privée.
    // ═══════════════════════════════════════════════════════════
    case 'POST /cles/publier':
        $compte = Auth::compte();
        $jwk = Entree::corps()['cle_jwk'] ?? null;
        if (!is_array($jwk) && !is_string($jwk)) {
            Rep::erreur(400, 'cle_invalide', 'Champ cle_jwk requis.');
        }
        Db::req(
            'INSERT INTO cles_publiques (compte_id, appareil, cle_jwk) VALUES (?, ?, ?)',
            [
                $compte['id'],
                Entree::texte('appareil', 160) ?? 'inconnu',
                is_string($jwk) ? $jwk : json_encode($jwk, JSON_UNESCAPED_UNICODE),
            ]
        );
        Rep::ok([], 201);

    case 'GET /cles/recuperer':
        Auth::compte();
        $ref = $_GET['reference'] ?? '';
        if (!is_string($ref) || !preg_match('/^[0-9A-Z]{26}$/', $ref)) {
            Rep::erreur(400, 'reference_invalide', 'Référence de compte invalide.');
        }
        $cles = Db::tous(
            'SELECT k.appareil, k.cle_jwk, k.cree_le
               FROM cles_publiques k
               JOIN comptes c ON c.id = k.compte_id
              WHERE c.reference = ? AND k.revoque_le IS NULL
              ORDER BY k.cree_le DESC',
            [$ref]
        );
        Rep::ok(['cles' => $cles]);

    // ═══════════════════════════════════════════════════════════
    // LIEN DE RÉPONSE RDV — contact sans application
    // TC_BACKEND.createRdvLink
    // ═══════════════════════════════════════════════════════════
    case 'POST /rdv/lien/creer':
        $compte   = Auth::compte();
        $creneaux = Entree::corps()['creneaux'] ?? null;
        if (!is_array($creneaux) || count($creneaux) < 1 || count($creneaux) > 3) {
            Rep::erreur(400, 'creneaux_invalides', 'Fournir 1 à 3 créneaux.');
        }
        $canal = Entree::texte('canal', 10) ?? 'sms';
        if (!in_array($canal, ['sms', 'email', 'whatsapp'], true)) {
            Rep::erreur(400, 'canal_invalide', 'Canal attendu : sms, email ou whatsapp.');
        }

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            Db::req(
                'INSERT INTO rdv (organisateur_id, contact_id, titre, lieu) VALUES (?, ?, ?, ?)',
                [
                    $compte['id'],
                    Entree::entier('contact_id'),
                    Entree::texte('titre', 200),
                    Entree::texte('lieu', 255),
                ]
            );
            $rdvId = (int) $pdo->lastInsertId();

            $rang = 0;
            foreach ($creneaux as $cr) {
                $rang++;
                $debut = is_array($cr) ? ($cr['debut'] ?? null) : null;
                $fin   = is_array($cr) ? ($cr['fin'] ?? null) : null;
                if (!is_string($debut) || !is_string($fin)) {
                    throw new RuntimeException('creneau_incomplet');
                }
                Db::req(
                    'INSERT INTO rdv_creneaux (rdv_id, rang, debut, fin, libelle)
                     VALUES (?, ?, ?, ?, ?)',
                    [$rdvId, $rang, $debut, $fin, is_array($cr) ? ($cr['libelle'] ?? null) : null]
                );
            }

            $jeton  = Jeton::creer();
            $heures = (int) Conf::get('lien_rdv_heures', 48);
            Db::req(
                'INSERT INTO rdv_liens (rdv_id, jeton_hash, prenom_organisateur,
                     prenom_destinataire, canal, expire_le)
                 VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
                [
                    $rdvId,
                    Jeton::hacher($jeton),
                    // Prénom seul : la colonne du nom de famille n'existe pas.
                    $compte['prenom'],
                    Entree::texte('prenom_destinataire', 100),
                    $canal,
                    $heures,
                ]
            );
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof RuntimeException && $e->getMessage() === 'creneau_incomplet') {
                Rep::erreur(400, 'creneau_incomplet', 'Chaque créneau doit porter un début et une fin.');
            }
            throw $e;
        }

        Rep::ok([
            'token'   => $jeton,
            'url'     => rtrim((string) Conf::get('url_publique'), '/') . '/rdv/' . $jeton,
            'expire_dans_heures' => $heures,
        ], 201);

    // TC_BACKEND.fetchRdvLink — public, sans authentification.
    case 'GET /rdv/lien':
        $jeton = $_GET['jeton'] ?? '';
        if (!is_string($jeton) || !preg_match('/^[0-9a-f]{64}$/', $jeton)) {
            Rep::erreur(404, 'lien_inconnu', 'Lien invalide.');
        }
        $lien = Db::un(
            'SELECT * FROM rdv_liens WHERE jeton_hash = ?',
            [Jeton::hacher($jeton)]
        );
        // Lien absent, déjà utilisé ou expiré : réponse indifférenciée.
        if ($lien === null
            || $lien['statut'] !== 'attente'
            || strtotime($lien['expire_le']) < time()) {
            Rep::erreur(410, 'lien_expire', 'Ce lien n est plus valable.');
        }

        Rep::ok([
            'organisateur' => $lien['prenom_organisateur'],
            'destinataire' => $lien['prenom_destinataire'],
            'creneaux'     => Db::tous(
                'SELECT rang, debut, fin, libelle FROM rdv_creneaux WHERE rdv_id = ? ORDER BY rang',
                [$lien['rdv_id']]
            ),
        ]);

    // TC_BACKEND.submitRdvChoice — public, à usage unique.
    case 'POST /rdv/lien/choix':
        $jeton = Entree::requis('jeton', 64);
        if (!preg_match('/^[0-9a-f]{64}$/', $jeton)) {
            Rep::erreur(404, 'lien_inconnu', 'Lien invalide.');
        }
        $rang = Entree::corps()['rang'] ?? null;
        // -1 signifie « aucun créneau ne convient ».
        if (!is_int($rang) || ($rang !== -1 && ($rang < 1 || $rang > 3))) {
            Rep::erreur(400, 'rang_invalide', 'Rang attendu : 1 à 3, ou -1.');
        }

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            // La condition statut = "attente" dans l'UPDATE garantit
            // l'usage unique même si deux clics arrivent en même temps.
            $maj = Db::req(
                'UPDATE rdv_liens
                    SET statut = ?, choix_rang = ?, utilise_le = NOW()
                  WHERE jeton_hash = ? AND statut = "attente" AND expire_le > NOW()',
                [$rang === -1 ? 'refuse' : 'choisi', $rang, Jeton::hacher($jeton)]
            );
            if ($maj->rowCount() === 0) {
                $pdo->rollBack();
                Rep::erreur(410, 'lien_expire', 'Ce lien a déjà été utilisé ou a expiré.');
            }

            $lien = Db::un('SELECT * FROM rdv_liens WHERE jeton_hash = ?', [Jeton::hacher($jeton)]);
            if ($rang === -1) {
                Db::req(
                    'UPDATE rdv SET statut = "refuse", repondu_le = NOW() WHERE id = ?',
                    [$lien['rdv_id']]
                );
            } else {
                Db::req(
                    'UPDATE rdv SET statut = "choisi", repondu_le = NOW() WHERE id = ?',
                    [$lien['rdv_id']]
                );
                Db::req(
                    'UPDATE rdv_creneaux SET retenu = 1 WHERE rdv_id = ? AND rang = ?',
                    [$lien['rdv_id'], $rang]
                );
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        Rep::ok(['enregistre' => true]);

    // ═══════════════════════════════════════════════════════════
    case 'GET /sante':
        Db::un('SELECT 1');
        Rep::ok(['service' => 'timecool-api']);

    default:
        Rep::erreur(404, 'route_inconnue', 'Endpoint inexistant.');
}
