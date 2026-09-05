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

/*
 * lib.php et config.php vivent hors de la racine web : même si PHP
 * venait à être désactivé sur le vhost, leur source — donc le mot de
 * passe de la base et le poivre — ne pourrait pas être servie.
 */
require __DIR__ . '/../private/lib.php';

Conf::charger(__DIR__ . '/../private/config.php');
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
        'provenance'        => $c['provenance'] ?? null,
        'provenance_detail' => $c['provenance_detail'] ?? null,
    ];
}


/* ═══════════════════════════════════════════════════════════════
   RENDEZ-VOUS ENTRE DEUX COMPTES

   Le serveur ne « pousse » rien : il écrit dans le magasin synchronisé
   du destinataire, et la sonde de son appareil vient le chercher dans
   la seconde. Tout passe donc par elementsPoser().
   ═══════════════════════════════════════════════════════════════ */

/**
 * Écrit des éléments dans un ou plusieurs comptes, chacun sous son
 * propre numéro de version.
 *
 * @param array $ecritures  [['compte_id'=>int,'type'=>string,'uid'=>string,'contenu'=>?array], ...]
 */
function elementsPoser(array $ecritures): void
{
    $parCompte = [];
    foreach ($ecritures as $e) {
        $parCompte[(int) $e['compte_id']][] = $e;
    }

    $pdo = Db::pdo();
    $transaction = !$pdo->inTransaction();
    if ($transaction) {
        $pdo->beginTransaction();
    }
    try {
        foreach ($parCompte as $compteId => $lot) {
            // Le compteur est verrouillé le temps de l'écriture : deux
            // écritures simultanées obtiennent des numéros distincts.
            $c = Db::un('SELECT compteur_sync FROM comptes WHERE id = ? FOR UPDATE', [$compteId]);
            if ($c === null) {
                continue;
            }
            $version = (int) $c['compteur_sync'];
            foreach ($lot as $e) {
                $version++;
                $supprime = !isset($e['contenu']) || $e['contenu'] === null;
                Db::req(
                    'INSERT INTO elements (compte_id, type, uid, contenu, version, supprime)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                       contenu = VALUES(contenu),
                       version = VALUES(version),
                       supprime = VALUES(supprime)',
                    [
                        $compteId, $e['type'], $e['uid'],
                        $supprime ? null : json_encode($e['contenu'], JSON_UNESCAPED_UNICODE),
                        $version, $supprime ? 1 : 0,
                    ]
                );
            }
            Db::req('UPDATE comptes SET compteur_sync = ? WHERE id = ?', [$version, $compteId]);
        }
        if ($transaction) {
            $pdo->commit();
        }
    } catch (Throwable $err) {
        if ($transaction) {
            $pdo->rollBack();
        }
        throw $err;
    }
}

/** Compte ouvert portant cette référence, ou null. */
function compteParReference(string $reference): ?array
{
    if (!preg_match('/^[0-9A-Z]{12,26}$/', $reference)) {
        return null;
    }
    return Db::un('SELECT * FROM comptes WHERE reference = ? AND cloture_le IS NULL', [$reference]);
}

/**
 * Le titulaire a-t-il autorisé ce demandeur à lui prendre rendez-vous ?
 *
 * L'autorisation est une fiche contact, chez LUI, portant le numéro ou
 * l'email du demandeur et au moins une catégorie cochée. Un contact
 * bloqué n'autorise rien — et ne le saura jamais : la réponse rendue au
 * demandeur est la même que pour un agenda plein.
 *
 * Seul un booléen sort d'ici. Le reste du carnet du titulaire n'est ni
 * lu ni transmis.
 */
function autorisationPourPrendreRdv(int $titulaireId, array $demandeur): bool
{
    $tel = Empreinte::normaliserTelephone((string) $demandeur['telephone']);
    $email = Empreinte::normaliserEmail((string) $demandeur['email']);

    $fiches = Db::tous(
        'SELECT contenu FROM elements
          WHERE compte_id = ? AND type = "contact" AND supprime = 0',
        [$titulaireId]
    );
    foreach ($fiches as $f) {
        $c = json_decode((string) $f['contenu'], true);
        if (!is_array($c)) {
            continue;
        }
        $memeTel = isset($c['phone']) && $c['phone'] !== ''
            && Empreinte::normaliserTelephone((string) $c['phone']) === $tel;
        $memeMail = isset($c['email']) && $c['email'] !== ''
            && Empreinte::normaliserEmail((string) $c['email']) === $email;
        if (!$memeTel && !$memeMail) {
            continue;
        }
        if (!empty($c['blocked'])) {
            return false;
        }
        return is_array($c['categories'] ?? null) && $c['categories'] !== [];
    }
    return false;   // aucune fiche : rien n'a été configuré pour ce demandeur
}

/**
 * Créneaux libres dans l'agenda du titulaire — le SIEN, pas celui du
 * demandeur, ce qui était toute l'erreur de la version précédente.
 *
 * Un créneau d'une heure par jour, jours ouvrés, sur quinze jours.
 */
function creneauxLibres(int $titulaireId, int $combien = 3): array
{
    $occupes = [];
    $lignes = Db::tous(
        'SELECT contenu FROM elements
          WHERE compte_id = ? AND type = "rdv" AND supprime = 0',
        [$titulaireId]
    );
    foreach ($lignes as $l) {
        $e = json_decode((string) $l['contenu'], true);
        if (!is_array($e) || !isset($e['date'])) {
            continue;
        }
        $occupes[$e['date']][] = [
            (int) ($e['startH'] ?? 0) * 60 + (int) ($e['startM'] ?? 0),
            (int) ($e['endH'] ?? 0) * 60 + (int) ($e['endM'] ?? 0),
        ];
    }

    $heures = [9, 10, 11, 14, 15, 16, 17];
    $jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $mois = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
             'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    $sortie = [];
    for ($j = 1; $j <= 15 && count($sortie) < $combien; $j++) {
        $t = strtotime("+$j day");
        $jsem = (int) date('w', $t);
        if ($jsem === 0 || $jsem === 6) {
            continue;   // week-end
        }
        $date = date('Y-m-d', $t);
        foreach ($heures as $h) {
            $debut = $h * 60;
            $fin = $debut + 60;
            $libre = true;
            foreach ($occupes[$date] ?? [] as $o) {
                if ($debut < $o[1] && $fin > $o[0]) {
                    $libre = false;
                    break;
                }
            }
            if (!$libre) {
                continue;
            }
            $sortie[] = [
                'date'    => $date,
                'heure'   => $h,
                'minute'  => 0,
                'libelle' => $jours[$jsem] . ' ' . (int) date('j', $t) . ' ' . $mois[(int) date('n', $t)],
            ];
            break;   // un seul créneau par jour, plus lisible
        }
    }
    return $sortie;
}

/**
 * Le message envoyé quand l'agenda du destinataire ne peut pas être
 * consulté — plein, pas encore configuré, ou accès non accordé.
 *
 * Écrit à la première personne : c'est un message DU demandeur, pas une
 * notification du système. Un ton sec ferait passer une demande banale
 * pour un reproche.
 */
function messageDemandeRdv(array $de, array $vers): string
{
    return "Salut " . $vers['prenom'] . " 👋 J'ai essayé de prendre rendez-vous avec toi "
        . "sur TimeCool, mais ton agenda ne semble pas encore configuré pour la prise "
        . "d'un rendez-vous instantané. SVP tu me dis quand tu es disponible ? Merci !";
}

/**
 * Dépose un message dans les deux messageries, celle de l'expéditeur et
 * celle du destinataire.
 *
 * Une conversation par correspondant : l'identifiant de l'élément est
 * la référence de l'autre compte. Chacun voit donc le même échange,
 * rangé sous le nom de l'autre.
 */
function messagePoser(array $de, array $vers, string $texte, ?int $rdvId = null): void
{
    $maintenant = date('c');
    $ligne = ['texte' => $texte, 'le' => $maintenant];
    if ($rdvId !== null) {
        $ligne['rdv'] = $rdvId;
    }

    $ecritures = [];
    foreach ([[$de, $vers, 'me'], [$vers, $de, 'them']] as [$proprietaire, $autre, $sens]) {
        $uid = $autre['reference'];
        $existant = Db::un(
            'SELECT contenu FROM elements
              WHERE compte_id = ? AND type = "conversation" AND uid = ?',
            [$proprietaire['id'], $uid]
        );
        $conv = $existant ? json_decode((string) $existant['contenu'], true) : null;
        if (!is_array($conv)) {
            $conv = [
                'reference' => $uid,
                'with'      => trim($autre['prenom'] . ' ' . $autre['nom']),
                'thread'    => [],
            ];
        }
        $conv['thread'][] = ['from' => $sens] + $ligne;
        // Une conversation ne garde pas tout : au-delà, le premier
        // chargement deviendrait lourd pour rien.
        if (count($conv['thread']) > 200) {
            $conv['thread'] = array_slice($conv['thread'], -200);
        }
        $conv['maj'] = $maintenant;
        $ecritures[] = [
            'compte_id' => (int) $proprietaire['id'],
            'type'      => 'conversation',
            'uid'       => $uid,
            'contenu'   => $conv,
        ];
    }
    elementsPoser($ecritures);
}


switch ($route) {

    // ═══════════════════════════════════════════════════════════
    // VÉRIFICATION — demande d'un code par SMS ou email
    // ═══════════════════════════════════════════════════════════
    case 'POST /verification/demander':
        $canal = Entree::requis('canal', 10);
        if (!in_array($canal, ['sms', 'email'], true)) {
            Rep::erreur(400, 'canal_invalide', 'Canal attendu : sms ou email.');
        }
        $brut = Entree::requis('destination');

        if ($canal === 'email') {
            if (!filter_var($brut, FILTER_VALIDATE_EMAIL)) {
                Rep::erreur(400, 'email_invalide', 'Adresse email invalide.');
            }
            $destination = Empreinte::normaliserEmail($brut);
        } else {
            $destination = Empreinte::normaliserTelephone($brut);
            if (!preg_match('/^\+[1-9][0-9]{7,14}$/', $destination)) {
                Rep::erreur(400, 'telephone_invalide', 'Numéro de téléphone invalide.');
            }
        }
        $destEmpreinte = Empreinte::stockable($destination);

        // Plafond par destination : empêche d'inonder un numéro de SMS
        // et de balayer les codes en multipliant les demandes.
        $recentes = Db::un(
            'SELECT COUNT(*) AS n FROM verifications
              WHERE destination_empreinte = ? AND cree_le > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
            [$destEmpreinte]
        );
        if ((int) $recentes['n'] >= (int) Conf::get('verification_max_par_heure', 5)) {
            Rep::erreur(429, 'trop_de_demandes', 'Trop de demandes. Réessayez dans une heure.');
        }

        $code    = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $ref     = Jeton::reference();
        $minutes = (int) Conf::get('verification_minutes', 15);
        $ip      = $_SERVER['REMOTE_ADDR'] ?? null;

        Db::req(
            'INSERT INTO verifications (reference, canal, destination, destination_empreinte,
                 code_hash, ip_creation, expire_le)
             VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
            [
                $ref, $canal, $destination, $destEmpreinte,
                Jeton::hacher($code),
                $ip !== null ? @inet_pton($ip) : null,
                $minutes,
            ]
        );

        // Envoi réel — SMS via Twilio (voir la classe Sms dans lib.php).
        // TODO distinct, non couvert ici : l'email n'a encore aucun
        // fournisseur branché (SendGrid ou équivalent).
        $reponse = ['reference' => $ref, 'expire_dans_minutes' => $minutes];
        if (Conf::get('mode_test', false) === true) {
            $reponse['code_test'] = $code;
            $reponse['avertissement'] = 'Mode test actif : aucun message envoyé.';
        } elseif ($canal === 'sms') {
            try {
                Sms::envoyer($destination, "Votre code de vérification TimeCool : {$code} (valable {$minutes} minutes).");
            } catch (Throwable $e) {
                error_log('TimeCool SMS verification: ' . $e->getMessage());
                Rep::erreur(502, 'envoi_echoue', 'Envoi du SMS impossible pour le moment. Réessayez.');
            }
        } else {
            Rep::erreur(503, 'envoi_indisponible', 'Envoi par email pas encore disponible — utilisez le SMS.');
        }
        Rep::ok($reponse, 201);

    // ═══════════════════════════════════════════════════════════
    // VÉRIFICATION — validation du code, remise d'une preuve
    // ═══════════════════════════════════════════════════════════
    case 'POST /verification/valider':
        $ref  = Entree::requis('reference', 26);
        $code = Entree::requis('code', 6);

        $v = Db::un('SELECT * FROM verifications WHERE reference = ?', [$ref]);
        if ($v === null || $v['consomme_le'] !== null || strtotime($v['expire_le']) < time()) {
            Rep::erreur(410, 'verification_expiree', 'Cette vérification a expiré. Demandez un nouveau code.');
        }
        if ((int) $v['tentatives'] >= 5) {
            Rep::erreur(429, 'trop_de_tentatives', 'Trop d essais. Demandez un nouveau code.');
        }

        // La tentative est comptée avant la comparaison : un abandon en
        // cours de route ne redonne pas d'essai gratuit.
        Db::req('UPDATE verifications SET tentatives = tentatives + 1 WHERE id = ?', [$v['id']]);

        if (!hash_equals($v['code_hash'], Jeton::hacher($code))) {
            Rep::erreur(400, 'code_incorrect', 'Code incorrect.');
        }

        $preuve = Jeton::creer();
        Db::req(
            'UPDATE verifications
                SET valide_le = NOW(), preuve_hash = ?,
                    preuve_expire_le = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
              WHERE id = ?',
            [Jeton::hacher($preuve), $v['id']]
        );
        Rep::ok(['preuve' => $preuve, 'canal' => $v['canal']]);

    // ═══════════════════════════════════════════════════════════
    // ⚠️ TEMPORAIRE — TEST TWILIO, À RETIRER APRÈS VÉRIFICATION ⚠️
    // Point d'entrée volontairement minimal : ni numéro ni message ne
    // sont pris en paramètre (donc pas d'oracle d'envoi vers un numéro
    // arbitraire) — seulement pour confirmer que la config Twilio
    // (twilio_account_sid / twilio_auth_token / twilio_numero_expediteur
    // dans config.php) fonctionne bout en bout. Authentifié malgré tout
    // par prudence (Auth::compte()). À supprimer une fois le SMS de test
    // reçu et confirmé — ou, si conservé plus longtemps que prévu, au
    // minimum restreindre à un compte admin identifié.
    // ═══════════════════════════════════════════════════════════
    case 'POST /test/sms-twilio':
        Auth::compte();
        try {
            Sms::envoyer(
                Empreinte::normaliserTelephone('06 07 78 66 26'),
                'Test TimeCool : intégration Twilio fonctionnelle.'
            );
        } catch (Throwable $e) {
            error_log('TimeCool SMS test: ' . $e->getMessage());
            Rep::erreur(502, 'envoi_echoue', 'Envoi Twilio impossible : ' . $e->getMessage());
        }
        Rep::ok(['envoye' => true]);

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

        /*
         * Preuve de vérification. Quand elle est exigée, c'est elle qui
         * empêche de s'inscrire avec un email ou un numéro qui ne vous
         * appartient pas.
         *
         * Le réglage verification_obligatoire permet de la suspendre le
         * temps des tests. Une preuve valide reste honorée dans les deux
         * cas : désactiver la contrainte n'invalide pas ce qui a été
         * réellement vérifié.
         */
        $v = null;
        $verifExigee = Conf::get('verification_obligatoire', true) === true;
        $preuve = Entree::texte('preuve', 64);
        $googleVerifie = false;

        /*
         * Un jeton Google valide vaut preuve de possession de l'adresse :
         * Google l'a deja verifiee, et le controle de concordance
         * ci-dessous garantit qu'il s'agit bien de celle qu'on inscrit.
         */
        $preuveGoogle = Entree::texte('preuve_google', 4096);
        if ($preuveGoogle !== null) {
            $audiences = Conf::get('google_client_ids', []);
            if (!is_array($audiences) || $audiences === []) {
                Rep::erreur(503, 'google_non_configure', 'Connexion Google non configurée.');
            }
            $claimsG = Google::verifier($preuveGoogle, $audiences);
            if (!hash_equals(Empreinte::normaliserEmail((string) $claimsG['email']), $emailNorm)) {
                Rep::erreur(403, 'verification_non_concordante',
                    'Le compte Google ne correspond pas à l email fourni.');
            }
            $googleVerifie = true;
        }

        if ($verifExigee && $preuve === null && !$googleVerifie) {
            Rep::erreur(403, 'verification_requise', 'Vérification préalable obligatoire.');
        }

        if ($preuve !== null) {
            $v = Db::un(
                'SELECT * FROM verifications
                  WHERE preuve_hash = ? AND consomme_le IS NULL
                    AND valide_le IS NOT NULL AND preuve_expire_le > NOW()',
                [Jeton::hacher($preuve)]
            );
            if ($v === null) {
                if ($verifExigee) {
                    Rep::erreur(403, 'verification_requise', 'Vérification absente, expirée ou déjà utilisée.');
                }
            } else {
                // La destination vérifiée doit être celle qu'on inscrit :
                // sinon on pourrait vérifier son propre numéro puis créer
                // un compte avec celui de quelqu'un d'autre.
                $attendue = $v['canal'] === 'email' ? $emailNorm : $telephone;
                if (!hash_equals($v['destination'], $attendue)) {
                    Rep::erreur(403, 'verification_non_concordante',
                        'La vérification ne correspond pas à l identifiant fourni.');
                }
            }
        }

        $compte = [
            'reference'           => Jeton::reference(),
            'email'               => $emailNorm,
            'email_empreinte'     => Empreinte::stockable($emailNorm),
            'telephone'           => $telephone,
            'telephone_empreinte' => Empreinte::stockable($telephone),
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

        // La preuve est consommée : elle ne peut pas servir à créer un
        // second compte. Absente quand la vérification est suspendue —
        // email_verifie_le reste alors NULL, ce qui laisse une trace des
        // comptes créés sans preuve de possession.
        if ($v !== null) {
            Db::req('UPDATE verifications SET consomme_le = NOW() WHERE id = ?', [$v['id']]);
            if ($v['canal'] === 'email') {
                Db::req('UPDATE comptes SET email_verifie_le = NOW() WHERE id = ?', [$id]);
            }
        }
        if ($googleVerifie) {
            Db::req('UPDATE comptes SET email_verifie_le = NOW() WHERE id = ?', [$id]);
        }

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

        // Les comptes clos sont chargés eux aussi : le tri se fait plus
        // bas, une fois le mot de passe vérifié.
        $c = Db::un("SELECT * FROM comptes WHERE $colonne = ?", [$empreinte]);

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

        /*
         * Mot de passe correct : c est le propriétaire du compte. On peut
         * donc lui dire pourquoi il n entre pas — un tiers, lui, n a
         * jamais atteint cette ligne.
         *
         * Auparavant un compte clos recevait « identifiant ou mot de
         * passe incorrect », et son propriétaire cherchait une faute de
         * frappe qui n existait pas.
         */
        if ($c['bloque_le'] !== null) {
            Rep::erreur(403, 'compte_suspendu',
                'Votre compte a été suspendu. Écrivez à contact@timecool.fr.');
        }
        if ($c['cloture_le'] !== null) {
            Rep::erreur(403, 'compte_cloture', 'Ce compte a été clôturé.');
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
    // CONNEXION AVEC UN COMPTE GOOGLE
    //
    // Le jeton est verifie ici, contre les cles publiques de Google.
    // Un compte existant ouvre une session ; sinon l'application est
    // invitee a completer l'inscription, notre table exigeant un
    // telephone, une ville et un code postal que Google ne fournit pas.
    // ═══════════════════════════════════════════════════════════
    case 'POST /connexion/google':
        $idToken = Entree::requis('id_token', 4096);
        $audiences = Conf::get('google_client_ids', []);
        if (!is_array($audiences) || $audiences === []) {
            Rep::erreur(503, 'google_non_configure', 'Connexion Google non configurée.');
        }
        $claims = Google::verifier($idToken, $audiences);

        $emailNorm = Empreinte::normaliserEmail((string) $claims['email']);
        $c = Db::un(
            'SELECT * FROM comptes WHERE email_empreinte = ? AND cloture_le IS NULL',
            [Empreinte::stockable($emailNorm)]
        );

        if ($c === null) {
            // Pas un echec : l'application enchaine sur le formulaire,
            // pre-rempli avec ce que Google a deja verifie.
            Rep::ok([
                'compte_existant' => false,
                'prefill' => [
                    'email'  => $emailNorm,
                    'prenom' => (string) ($claims['given_name'] ?? ''),
                    'nom'    => (string) ($claims['family_name'] ?? ''),
                ],
            ]);
        }

        Db::req('UPDATE comptes SET derniere_connexion = NOW() WHERE id = ?', [$c['id']]);
        // Google a verifie cette adresse : on l'acte si ce n'etait pas fait.
        if ($c['email_verifie_le'] === null) {
            Db::req('UPDATE comptes SET email_verifie_le = NOW() WHERE id = ?', [$c['id']]);
        }
        Rep::ok([
            'compte_existant' => true,
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

        // L'application transmet des empreintes non poivrées : c'est ici,
        // et seulement ici, que le poivre est appliqué. Il ne quitte
        // jamais le serveur.
        $versClient = [];
        foreach ($propres as $publique) {
            $versClient[Empreinte::poivrer($publique)] = $publique;
        }
        $poivrees = array_keys($versClient);

        $trous = implode(',', array_fill(0, count($poivrees), '?'));
        $lignes = Db::tous(
            "SELECT reference, prenom, email_empreinte, telephone_empreinte
               FROM comptes
              WHERE cloture_le IS NULL
                AND (email_empreinte IN ($trous) OR telephone_empreinte IN ($trous))",
            array_merge($poivrees, $poivrees)
        );

        // La réponse renvoie l'empreinte telle que le client l'a envoyée,
        // pour qu'il puisse la rapprocher de son contact, plus le strict
        // nécessaire à l'ouverture du flux applicatif.
        $inscrits = [];
        foreach ($lignes as $l) {
            foreach (['email_empreinte', 'telephone_empreinte'] as $col) {
                if (isset($versClient[$l[$col]])) {
                    $inscrits[] = [
                        'empreinte' => $versClient[$l[$col]],
                        'reference' => $l['reference'],
                        'prenom'    => $l['prenom'],
                    ];
                }
            }
        }
        Rep::ok(['inscrits' => $inscrits]);

    // ═══════════════════════════════════════════════════════════
    // PRISE DE RENDEZ-VOUS ENTRE COMPTES
    // ═══════════════════════════════════════════════════════════

    /*
     * Demande de rendez-vous.
     *
     * Deux issues, et le demandeur ne peut pas les distinguer d'un
     * refus : soit le titulaire l'a autorisé et a des créneaux libres,
     * et on les lui propose ; soit non, et la demande part dans les deux
     * messageries. Un contact bloqué tombe dans le second cas sans
     * jamais l'apprendre.
     */
    case 'POST /rdv/demander':
        $moi = Auth::compte();
        $cible = compteParReference(Entree::requis('reference', 26));
        if ($cible === null) {
            Rep::erreur(404, 'compte_introuvable', 'Ce contact n a pas de compte TimeCool.');
        }
        if ((int) $cible['id'] === (int) $moi['id']) {
            Rep::erreur(400, 'soi_meme', 'Vous ne pouvez pas vous prendre rendez-vous.');
        }

        $titre = Entree::texte('titre', 200) ?? trim($moi['prenom'] . ' ' . $moi['nom']);
        $autorise = autorisationPourPrendreRdv((int) $cible['id'], $moi);
        $creneaux = $autorise ? creneauxLibres((int) $cible['id'], 3) : [];

        /*
         * Une seule demande en attente à la fois vers la même personne.
         *
         * Sans cela, chaque clic créait une demande et déposait un
         * message : trois essais, et le destinataire recevait trois fois
         * la même chose. On reprend celle qui attend déjà.
         */
        // Les demandes restées sans réponse au-delà du délai sont
        // abandonnées : sinon la première d'entre elles bloquerait pour
        // toujours toute nouvelle demande vers cette personne.
        $jours = (int) Conf::get('rdv_demande_jours', 7);
        Db::req(
            'UPDATE rdv SET statut = "expire"
              WHERE organisateur_id = ? AND invite_compte_id = ? AND statut = "attente"
                AND cree_le < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$moi['id'], $cible['id'], $jours]
        );

        $enAttente = Db::un(
            'SELECT id, cree_le FROM rdv
              WHERE organisateur_id = ? AND invite_compte_id = ? AND statut = "attente"
              ORDER BY id DESC LIMIT 1',
            [$moi['id'], $cible['id']]
        );
        $reprise = $enAttente !== null;

        if ($reprise) {
            $rdvId = (int) $enAttente['id'];
            // Les créneaux d'une demande reprise sont recalculés :
            // l'agenda du destinataire a pu changer entre-temps.
            Db::req('DELETE FROM rdv_creneaux WHERE rdv_id = ?', [$rdvId]);
        } else {
            Db::req(
                'INSERT INTO rdv (organisateur_id, invite_compte_id, titre, statut)
                 VALUES (?, ?, ?, "attente")',
                [$moi['id'], $cible['id'], $titre]
            );
            $rdvId = (int) Db::pdo()->lastInsertId();
        }

        if ($creneaux === []) {
            // Agenda plein, pas encore configuré, ou accès bloqué : la
            // même réponse dans les trois cas. Le message n'est déposé
            // qu'à la première demande.
            if (!$reprise) {
                messagePoser($moi, $cible, messageDemandeRdv($moi, $cible), $rdvId);
            }
            Rep::ok([
                'mode'    => 'messagerie',
                'rdv'     => $rdvId,
                // Au deuxième clic rien n'est reparti : le dire, plutôt
                // que d'annoncer un envoi qui n'a pas eu lieu.
                'message' => $reprise
                    ? $cible['prenom'] . " n'a pas encore configuré son agenda TimeCool. "
                        . "En attendant tu peux consulter ta messagerie pour confirmer que "
                        . "nous lui avons envoyé un message pour le tenir informé."
                    : 'Son agenda est complet ou pas encore configuré. Ta demande de '
                        . 'rendez-vous est partie dans la messagerie de ' . $cible['prenom']
                        . ', et tu peux la retrouver dans ta messagerie.',
            ]);
        }

        foreach ($creneaux as $rang => $c) {
            $debut = $c['date'] . ' ' . str_pad((string) $c['heure'], 2, '0', STR_PAD_LEFT) . ':00:00';
            Db::req(
                'INSERT INTO rdv_creneaux (rdv_id, rang, debut, fin, libelle)
                 VALUES (?, ?, ?, DATE_ADD(?, INTERVAL 1 HOUR), ?)',
                [$rdvId, $rang + 1, $debut, $debut, $c['libelle']]
            );
        }
        Rep::ok(['mode' => 'creneaux', 'rdv' => $rdvId, 'creneaux' => $creneaux]);

    /*
     * Le demandeur retient un créneau : le rendez-vous s inscrit dans
     * LES DEUX agendas, en une seule transaction.
     */
    case 'POST /rdv/choisir':
        $moi = Auth::compte();
        $rdvId = Entree::entier('rdv');
        $rang = Entree::entier('rang');
        if ($rdvId === null || $rang === null) {
            Rep::erreur(400, 'champs_manquants', 'Champs rdv et rang requis.');
        }

        $rdv = Db::un(
            'SELECT * FROM rdv WHERE id = ? AND organisateur_id = ? AND statut = "attente"',
            [$rdvId, $moi['id']]
        );
        if ($rdv === null) {
            Rep::erreur(404, 'rdv_introuvable', 'Demande inconnue ou déjà traitée.');
        }
        $creneau = Db::un('SELECT * FROM rdv_creneaux WHERE rdv_id = ? AND rang = ?', [$rdvId, $rang]);
        if ($creneau === null) {
            Rep::erreur(404, 'creneau_introuvable', 'Créneau inconnu.');
        }
        $cible = Db::un('SELECT * FROM comptes WHERE id = ?', [$rdv['invite_compte_id']]);
        if ($cible === null) {
            Rep::erreur(410, 'compte_absent', 'Le compte destinataire n existe plus.');
        }

        $debut = strtotime($creneau['debut']);
        $fin = strtotime($creneau['fin']);
        $entree = static function (string $titre) use ($debut, $fin, $rdvId): array {
            return [
                'id'     => 'tc_rdv_' . $rdvId,
                'date'   => date('Y-m-d', $debut),
                'startH' => (int) date('G', $debut), 'startM' => (int) date('i', $debut),
                'endH'   => (int) date('G', $fin),   'endM'   => (int) date('i', $fin),
                'title'  => $titre,
                'cat'    => 'travail',
                'mode'   => 'user',
            ];
        };

        Db::req('UPDATE rdv_creneaux SET retenu = 1 WHERE id = ?', [$creneau['id']]);
        Db::req('UPDATE rdv SET statut = "choisi", repondu_le = NOW() WHERE id = ?', [$rdvId]);

        // Chacun voit le nom de l'autre dans son agenda.
        elementsPoser([
            ['compte_id' => (int) $moi['id'], 'type' => 'rdv', 'uid' => 'tc_rdv_' . $rdvId,
             'contenu' => $entree(trim($cible['prenom'] . ' ' . $cible['nom']))],
            ['compte_id' => (int) $cible['id'], 'type' => 'rdv', 'uid' => 'tc_rdv_' . $rdvId,
             'contenu' => $entree(trim($moi['prenom'] . ' ' . $moi['nom']))],
        ]);

        messagePoser(
            $moi, $cible,
            'Rendez-vous confirmé : ' . $creneau['libelle'] . ' à '
                . date('H\\hi', $debut) . '.',
            $rdvId
        );

        Rep::ok([
            'date'   => date('Y-m-d', $debut),
            'heure'  => date('H:i', $debut),
            'libelle' => $creneau['libelle'],
        ]);

    /* Message libre d un compte à un autre. */
    case 'POST /messages/envoyer':
        $moi = Auth::compte();
        $cible = compteParReference(Entree::requis('reference', 26));
        if ($cible === null) {
            Rep::erreur(404, 'compte_introuvable', 'Destinataire inconnu.');
        }
        if ((int) $cible['id'] === (int) $moi['id']) {
            Rep::erreur(400, 'soi_meme', 'Vous ne pouvez pas vous écrire à vous-même.');
        }
        messagePoser($moi, $cible, Entree::requis('texte', 2000));
        Rep::ok();

    // ═══════════════════════════════════════════════════════════
    // SYNCHRONISATION ENTRE APPAREILS
    // ═══════════════════════════════════════════════════════════

    /*
     * Le numero atteint par ce compte, et rien d autre.
     *
     * Interrogee tres souvent, elle doit couter le moins possible : une
     * seule colonne, deja chargee par la verification de session. Aucun
     * acces a la table des elements.
     */
    case 'GET /sync/version':
        $compte = Auth::compte();
        Rep::ok(['version' => (int) $compte['compteur_sync']]);

    /*
     * Ce qui a changé depuis la version que l'appareil connaît.
     *
     * Les suppressions sont rendues elles aussi, marquées : sans cela un
     * rendez-vous effacé sur un téléphone serait ressuscité par le PC
     * qui l'a encore.
     */
    case 'GET /sync':
        $compte = Auth::compte();
        $depuis = isset($_GET['depuis']) && ctype_digit((string) $_GET['depuis'])
            ? (int) $_GET['depuis'] : 0;

        // Une page à la fois : un premier chargement de plusieurs
        // milliers d'objets ne doit pas tenir dans une seule réponse.
        $lot = 500;
        $lignes = Db::tous(
            'SELECT type, uid, contenu, version, supprime
               FROM elements
              WHERE compte_id = ? AND version > ?
              ORDER BY version
              LIMIT ' . ($lot + 1),
            [$compte['id'], $depuis]
        );
        $suite = count($lignes) > $lot;
        if ($suite) {
            array_pop($lignes);
        }

        $elements = [];
        foreach ($lignes as $l) {
            $elements[] = [
                'type'     => $l['type'],
                'uid'      => $l['uid'],
                'contenu'  => $l['contenu'] === null ? null : json_decode($l['contenu'], true),
                'version'  => (int) $l['version'],
                'supprime' => (int) $l['supprime'] === 1,
            ];
        }

        Rep::ok([
            'elements' => $elements,
            // Version atteinte par ce lot. L appareil la garde et la
            // renvoie au prochain appel.
            'version'  => $elements === []
                ? (int) $compte['compteur_sync']
                : $elements[count($elements) - 1]['version'],
            'suite'    => $suite,
        ]);

    /*
     * Ce que l'appareil a modifié.
     *
     * Le dernier qui écrit gagne, OBJET PAR OBJET. Deux appareils qui
     * modifient deux rendez-vous différents ne s'écrasent donc jamais —
     * ce qui serait le cas si l'agenda voyageait d'un bloc.
     */
    case 'POST /sync':
        $compte = Auth::compte();
        $entrants = Entree::corps()['elements'] ?? null;
        if (!is_array($entrants)) {
            Rep::erreur(400, 'elements_manquants', 'Champ elements attendu.');
        }
        if (count($entrants) > 500) {
            Rep::erreur(413, 'lot_trop_grand', 'Envoyez au plus 500 éléments à la fois.');
        }

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            // Le compteur est verrouillé le temps de la transaction :
            // deux appareils qui écrivent en même temps obtiennent des
            // numéros distincts, jamais le même.
            $c = Db::un('SELECT compteur_sync FROM comptes WHERE id = ? FOR UPDATE',
                [$compte['id']]);
            $version = (int) $c['compteur_sync'];

            $appliques = [];
            foreach ($entrants as $e) {
                if (!is_array($e)) {
                    continue;
                }
                $type = $e['type'] ?? '';
                $uid  = $e['uid'] ?? '';
                if (!is_string($type) || !preg_match('/^[a-z_]{2,40}$/', $type)
                    || !is_string($uid) || $uid === '' || strlen($uid) > 64) {
                    Rep::erreur(400, 'element_invalide', 'Type ou identifiant invalide.');
                }
                $supprime = array_key_exists('contenu', $e) && $e['contenu'] === null;
                $contenu = $supprime ? null : json_encode($e['contenu'], JSON_UNESCAPED_UNICODE);
                if (!$supprime && strlen((string) $contenu) > 262144) {
                    Rep::erreur(413, 'element_trop_gros', 'Élément trop volumineux.');
                }

                $version++;
                Db::req(
                    'INSERT INTO elements (compte_id, type, uid, contenu, version, supprime)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                       contenu = VALUES(contenu),
                       version = VALUES(version),
                       supprime = VALUES(supprime)',
                    [$compte['id'], $type, $uid, $contenu, $version, $supprime ? 1 : 0]
                );
                $appliques[] = ['type' => $type, 'uid' => $uid, 'version' => $version];
            }

            Db::req('UPDATE comptes SET compteur_sync = ? WHERE id = ?',
                [$version, $compte['id']]);
            $pdo->commit();
        } catch (Throwable $err) {
            $pdo->rollBack();
            throw $err;
        }

        Rep::ok(['version' => $version, 'appliques' => $appliques]);

    // ═══════════════════════════════════════════════════════════
    // ESPACE ADMINISTRATEUR
    // La liste des inscrits vit ici, et nulle part ailleurs.
    // ═══════════════════════════════════════════════════════════
    case 'GET /admin/utilisateurs':
        $moi = Auth::compte();
        if ((int) ($moi['admin'] ?? 0) !== 1) {
            Rep::erreur(403, 'acces_refuse', 'Accès réservé à l administrateur.');
        }
        Rep::ok([
            'utilisateurs' => Db::tous(
                'SELECT reference, prenom, nom, email, telephone, ville, code_postal,
                        provenance, provenance_detail, cree_le, derniere_connexion,
                        bloque_le, admin
                   FROM comptes
                  ORDER BY cree_le DESC'
            ),
            // Sa propre référence, pour que l écran sache quelle fiche est
            // la sienne : ni le blocage ni la suppression ne doivent lui
            // être proposés dessus.
            'moi' => $moi['reference'],
        ]);

    case 'POST /admin/bloquer':
        $moi = Auth::compte();
        if ((int) ($moi['admin'] ?? 0) !== 1) {
            Rep::erreur(403, 'acces_refuse', 'Accès réservé à l administrateur.');
        }
        $ref = Entree::requis('reference', 26);
        if (!preg_match('/^[0-9A-Z]{12,26}$/', $ref)) {
            Rep::erreur(400, 'reference_invalide', 'Référence de compte invalide.');
        }
        if (hash_equals($moi['reference'], $ref)) {
            Rep::erreur(400, 'auto_blocage', 'Vous ne pouvez pas bloquer votre propre compte.');
        }
        $bloquer = ($corpsB = Entree::corps())['bloquer'] ?? null;
        if (!is_bool($bloquer)) {
            Rep::erreur(400, 'champ_manquant', 'Champ bloquer attendu : true ou false.');
        }

        /*
         * Le blocage passe par cloture_le : c est la colonne que la
         * connexion, la connexion Google, la vérification de session et
         * la recherche de contacts consultent déjà. Rien à ajouter
         * ailleurs, donc rien à oublier.
         *
         * bloque_le note que la fermeture vient de l administrateur, et
         * non de la personne elle-même — sans quoi un déblocage
         * rouvrirait un compte que son propriétaire avait clos.
         */
        $maj = Db::req(
            $bloquer
                ? 'UPDATE comptes SET bloque_le = NOW(), cloture_le = NOW()
                    WHERE reference = ? AND cloture_le IS NULL'
                : 'UPDATE comptes SET bloque_le = NULL, cloture_le = NULL
                    WHERE reference = ? AND bloque_le IS NOT NULL',
            [$ref]
        );
        if ($maj->rowCount() === 0) {
            Rep::erreur(404, 'compte_introuvable', 'Compte inconnu, ou déjà dans cet état.');
        }

        // Les sessions ouvertes tombent tout de suite : sans cela,
        // l appareil déjà connecté continuerait de fonctionner jusqu à
        // l expiration de son jeton.
        if ($bloquer) {
            Db::req(
                'UPDATE sessions
                    SET revoque_le = NOW()
                  WHERE revoque_le IS NULL
                    AND compte_id = (SELECT id FROM comptes WHERE reference = ?)',
                [$ref]
            );
        }
        Rep::ok(['bloque' => $bloquer]);

    case 'POST /admin/supprimer':
        $moi = Auth::compte();
        if ((int) ($moi['admin'] ?? 0) !== 1) {
            Rep::erreur(403, 'acces_refuse', 'Accès réservé à l administrateur.');
        }
        $ref = Entree::requis('reference', 26);
        if (!preg_match('/^[0-9A-Z]{12,26}$/', $ref)) {
            Rep::erreur(400, 'reference_invalide', 'Référence de compte invalide.');
        }
        if (hash_equals($moi['reference'], $ref)) {
            Rep::erreur(400, 'auto_suppression', 'Vous ne pouvez pas supprimer votre propre compte.');
        }

        /*
         * Une seule ligne suffit : sessions, contacts, groupes, rendez-vous
         * organisés, appairages et clés portent tous une clé étrangère en
         * ON DELETE CASCADE. Rien à effacer à la main, donc rien à oublier.
         *
         * Définitif, et c est le but : l email et le téléphone sont uniques
         * en base, et seule la disparition de la ligne les libère. Une
         * clôture, elle, les garde immobilisés.
         *
         * L agenda de la personne reste sur son téléphone : il n a jamais
         * été stocké ici.
         */
        $sup = Db::req('DELETE FROM comptes WHERE reference = ?', [$ref]);
        if ($sup->rowCount() === 0) {
            Rep::erreur(404, 'compte_introuvable', 'Compte inconnu.');
        }
        Rep::ok();

    case 'POST /admin/administrateur':
        $moi = Auth::compte();
        if ((int) ($moi['admin'] ?? 0) !== 1) {
            Rep::erreur(403, 'acces_refuse', 'Accès réservé à l administrateur.');
        }
        $ref = Entree::requis('reference', 26);
        if (!preg_match('/^[0-9A-Z]{12,26}$/', $ref)) {
            Rep::erreur(400, 'reference_invalide', 'Référence de compte invalide.');
        }
        $donner = Entree::corps()['administrateur'] ?? null;
        if (!is_bool($donner)) {
            Rep::erreur(400, 'champ_manquant', 'Champ administrateur attendu : true ou false.');
        }
        // Se retirer le droit à soi-même pourrait ne laisser aucun
        // administrateur, et il faudrait alors repasser par la base pour
        // en désigner un. Il en reste donc toujours au moins un.
        if (hash_equals($moi['reference'], $ref)) {
            Rep::erreur(400, 'auto_retrait',
                'Vous ne pouvez pas modifier votre propre accès administrateur.');
        }
        $maj = Db::req(
            'UPDATE comptes SET admin = ? WHERE reference = ? AND cloture_le IS NULL',
            [$donner ? 1 : 0, $ref]
        );
        if ($maj->rowCount() === 0) {
            Rep::erreur(404, 'compte_introuvable',
                'Compte inconnu, clôturé, ou déjà dans cet état.');
        }
        Rep::ok(['administrateur' => $donner]);

    // ═══════════════════════════════════════════════════════════
    // APPAIRAGE D'APPAREILS — TC_BACKEND.createPairingSession
    // ═══════════════════════════════════════════════════════════
    case 'POST /appairage/creer':
        $minutes = (int) Conf::get('appairage_minutes', 10);

        // Cle publique du nouvel appareil, facultative : sans elle
        // l appairage fonctionne comme avant, mais sans transfert de
        // donnees. Une version ancienne de l application reste donc
        // compatible.
        $cleNouvelAppareil = Entree::corps()['cle_publique'] ?? null;
        $cleJson = null;
        if ($cleNouvelAppareil !== null) {
            if (!is_array($cleNouvelAppareil)) {
                Rep::erreur(400, 'cle_invalide', 'Champ cle_publique invalide.');
            }
            $cleJson = json_encode($cleNouvelAppareil, JSON_UNESCAPED_UNICODE);
            if (strlen($cleJson) > 2000) {
                Rep::erreur(400, 'cle_invalide', 'Clé publique trop volumineuse.');
            }
        }
        // Un code court est deviné facilement : il expire vite et ne vaut
        // que pour un appairage, jamais pour une connexion.
        for ($essai = 0; $essai < 8; $essai++) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            try {
                Db::req(
                    'INSERT INTO appairages (code, cle_publique, expire_le)
                     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
                    [$code, $cleJson, $minutes]
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

        // La clé publique du navigateur est rendue ici : c est avec elle
        // que le téléphone chiffrera les données. Nulle si l autre
        // appareil n en a pas déposé — l appairage se fait alors sans
        // transfert.
        $att = Db::un('SELECT cle_publique FROM appairages WHERE code = ?', [$code]);
        Rep::ok([
            'cle_publique' => ($att && $att['cle_publique'] !== null)
                ? json_decode($att['cle_publique'], true)
                : null,
        ]);

    /* Dépôt des données chiffrées, depuis le téléphone qui vient
       d approuver. Le contenu est opaque pour le serveur : il est
       chiffré avec une clé dérivée de la clé publique du navigateur,
       dont la moitié privée n a jamais quitté celui-ci. */
    case 'POST /appairage/donnees':
        $compte = Auth::compte();
        $code = Entree::requis('code', 6);
        $corps = Entree::corps();
        $paquet = $corps['paquet'] ?? null;
        $cleSource = $corps['cle_publique'] ?? null;
        if (!is_string($paquet) || $paquet === '' || !is_array($cleSource)) {
            Rep::erreur(400, 'paquet_invalide', 'Champs paquet et cle_publique requis.');
        }
        // Au-delà de cette taille il ne s agit plus d un agenda.
        $maxPaquet = (int) Conf::get('appairage_paquet_max', 4000000);
        if (strlen($paquet) > $maxPaquet) {
            Rep::erreur(413, 'paquet_trop_gros', 'Données trop volumineuses pour le transfert.');
        }

        $depot = Db::req(
            'UPDATE appairages
                SET paquet = ?, paquet_cle = ?, paquet_le = NOW()
              WHERE code = ? AND statut = "approuve" AND compte_id = ?
                AND expire_le > NOW()',
            [
                $paquet,
                json_encode($cleSource, JSON_UNESCAPED_UNICODE),
                $code,
                $compte['id'],
            ]
        );
        if ($depot->rowCount() === 0) {
            Rep::erreur(404, 'appairage_inconnu', 'Appairage inconnu, expiré ou déjà consommé.');
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

        // Approuvé, mais les données n ont pas encore été déposées : on
        // laisse au téléphone le temps de les envoyer. Sans cette
        // attente, le navigateur consommerait la session aussitôt et
        // s ouvrirait sur un agenda vide. Passé ce délai on lie quand
        // même — mieux vaut un appareil lié sans données qu un écran
        // bloqué.
        if ($a['paquet'] === null
            && $a['cle_publique'] !== null
            && (time() - strtotime($a['approuve_le']))
               < (int) Conf::get('appairage_transfert_secondes', 25)) {
            Rep::ok(['statut' => 'transfert']);
        }

        // Approuvé : le code est consommé et échangé contre une session.
        // Il ne peut jamais servir deux fois.
        // Le paquet est effacé en même temps : il est livré une fois, et
        // ne subsiste pas en base une seconde de plus que nécessaire.
        Db::req('UPDATE appairages SET statut = "annule", paquet = NULL WHERE id = ?', [$id]);
        $c = Db::un('SELECT * FROM comptes WHERE id = ?', [$a['compte_id']]);
        if ($c === null) {
            Rep::erreur(410, 'compte_absent', 'Le compte associé n existe plus.');
        }
        Rep::ok([
            'statut'  => 'approuve',
            'compte'  => vueCompte($c),
            'session' => ouvrirSession((int) $c['id'], Entree::texte('appareil', 160)),
            'paquet'  => $a['paquet'],
            'paquet_cle' => $a['paquet_cle'] !== null
                ? json_decode($a['paquet_cle'], true)
                : null,
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
        if (!is_string($ref) || !preg_match('/^[0-9A-Z]{12}$/', $ref)) {
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
    // COMPTE COURANT
    // Restitue le compte à partir du seul jeton de session — utilisé
    // notamment après un déverrouillage biométrique, où l'appareil n'a
    // que le jeton (déchiffré localement) et doit reconstituer le
    // compte affiché sans redemander identifiant ni mot de passe.
    // ═══════════════════════════════════════════════════════════
    case 'GET /compte':
        $compte = Auth::compte();
        Rep::ok(['compte' => vueCompte($compte)]);

    // ═══════════════════════════════════════════════════════════
    // PROVENANCE ("Comment as-tu connu TimeCool ?")
    // Réponse facultative proposée une seule fois après l'inscription,
    // à but statistique (analyse des canaux d'acquisition côté admin).
    // Enregistrable une seule fois : un appel ultérieur écrase la
    // réponse précédente plutôt que d'empiler un historique, ce champ
    // ne représentant qu'un instantané, pas un journal.
    // ═══════════════════════════════════════════════════════════
    case 'POST /compte/provenance':
        $compte = Auth::compte();

        $provenances = [
            'ami_famille', 'collegue',
            'facebook', 'instagram', 'linkedin', 'snapchat', 'tiktok', 'twitter_x', 'youtube',
            'presse_blog', 'google_recherche', 'google_ia', 'publicite_ligne',
            'app_store', 'google_play',
            'salon_evenement', 'autre',
        ];

        $provenance = Entree::corps()['provenance'] ?? '';
        if (!is_string($provenance) || !in_array($provenance, $provenances, true)) {
            Rep::erreur(400, 'provenance_invalide', 'Provenance inconnue.');
        }

        $detail = Entree::corps()['provenance_detail'] ?? null;
        if ($provenance !== 'autre') {
            $detail = null;
        } elseif ($detail !== null) {
            if (!is_string($detail)) {
                Rep::erreur(400, 'detail_invalide', 'Précision invalide.');
            }
            $detail = mb_substr(trim($detail), 0, 200);
            if ($detail === '') {
                $detail = null;
            }
        }

        Db::req(
            'UPDATE comptes SET provenance = ?, provenance_detail = ? WHERE id = ?',
            [$provenance, $detail, $compte['id']]
        );

        Rep::ok(['enregistre' => true]);

    // ═══════════════════════════════════════════════════════════
    // CHANGEMENT DE MOT DE PASSE
    // Décision produit explicite : pas de redemande de l'ancien mot de
    // passe, la session authentifiée (jeton Bearer vérifié par
    // Auth::compte() ci-dessous) fait foi comme seule vérification.
    // Compromis assumé : contrairement à une re-authentification par
    // l'ancien mot de passe, une session volée ou un appareil laissé
    // déverrouillé suffit désormais à changer le mot de passe. Les
    // autres sessions sont révoquées immédiatement après (voir plus
    // bas), ce qui limite la fenêtre d'exploitation à la session
    // compromise elle-même plutôt qu'à un accès permanent.
    // ═══════════════════════════════════════════════════════════
    case 'POST /compte/mot-de-passe':
        $compte = Auth::compte();

        $nouveau = Entree::corps()['nouveau_mot_de_passe'] ?? '';

        if (!is_string($nouveau) || mb_strlen($nouveau) < 10) {
            Rep::erreur(400, 'mot_de_passe_faible', 'Le nouveau mot de passe doit faire au moins 10 caractères.');
        }

        Db::req(
            'UPDATE comptes SET mot_de_passe_hash = ? WHERE id = ?',
            [password_hash($nouveau, algoMotDePasse()), $compte['id']]
        );

        // Les autres sessions ouvertes (autres appareils) sont révoquées :
        // un mot de passe qui change doit fermer tout accès obtenu avec
        // l'ancien, la session courante exceptée.
        Db::req(
            'UPDATE sessions SET revoque_le = NOW()
              WHERE compte_id = ? AND id != ? AND revoque_le IS NULL',
            [$compte['id'], $compte['session_id']]
        );

        Rep::ok(['change' => true]);

    // ═══════════════════════════════════════════════════════════
    // CLÉS API DE L'UTILISATEUR
    // Conservées chiffrées, restituées uniquement au titulaire du
    // compte, authentifié par sa session.
    // ═══════════════════════════════════════════════════════════

    // Liste sans les valeurs : de quoi afficher l'écran de configuration
    // sans jamais déchiffrer ni transmettre les clés inutilement.
    case 'GET /cles-api':
        $compte = Auth::compte();
        Rep::ok([
            'cles' => Db::tous(
                'SELECT service, indice, maj_le FROM cles_api WHERE compte_id = ? ORDER BY service',
                [$compte['id']]
            ),
        ]);

    // Valeur en clair d'une seule clé, pour que l'application puisse
    // appeler le service concerné.
    case 'GET /cles-api/valeur':
        $compte = Auth::compte();
        $service = $_GET['service'] ?? '';
        if (!is_string($service) || !preg_match('/^[a-z0-9_]{2,40}$/', $service)) {
            Rep::erreur(400, 'service_invalide', 'Service invalide.');
        }
        $ligne = Db::un(
            'SELECT valeur_chiffree FROM cles_api WHERE compte_id = ? AND service = ?',
            [$compte['id'], $service]
        );
        if ($ligne === null) {
            Rep::erreur(404, 'cle_absente', 'Aucune clé enregistrée pour ce service.');
        }
        $clair = Coffre::dechiffrer($ligne['valeur_chiffree']);
        if ($clair === null) {
            // Valeur illisible : clé de chiffrement changée, ou donnée
            // altérée. Le dire franchement plutôt que renvoyer du vide.
            Rep::erreur(500, 'cle_illisible',
                'Clé enregistrée illisible. Ressaisissez-la.');
        }
        Rep::ok(['service' => $service, 'valeur' => $clair]);

    case 'POST /cles-api':
        $compte = Auth::compte();
        $service = Entree::requis('service', 40);
        if (!preg_match('/^[a-z0-9_]{2,40}$/', $service)) {
            Rep::erreur(400, 'service_invalide', 'Service invalide.');
        }
        $valeur = Entree::corps()['valeur'] ?? null;
        if (!is_string($valeur) || trim($valeur) === '' || strlen($valeur) > 500) {
            Rep::erreur(400, 'valeur_invalide', 'Clé absente ou trop longue.');
        }
        $valeur = trim($valeur);

        Db::req(
            'INSERT INTO cles_api (compte_id, service, valeur_chiffree, indice)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE valeur_chiffree = VALUES(valeur_chiffree),
                                     indice = VALUES(indice)',
            [
                $compte['id'],
                $service,
                Coffre::chiffrer($valeur),
                substr($valeur, -4),
            ]
        );
        Rep::ok(['service' => $service, 'indice' => substr($valeur, -4)], 201);

    case 'POST /cles-api/supprimer':
        $compte = Auth::compte();
        $service = Entree::requis('service', 40);
        Db::req('DELETE FROM cles_api WHERE compte_id = ? AND service = ?',
            [$compte['id'], $service]);
        Rep::ok();

    // ═══════════════════════════════════════════════════════════
    // PARAMÈTRES PUBLICS
    // Ce que l'application doit savoir avant d'afficher un écran.
    // N'expose aucun secret : uniquement des drapeaux de parcours.
    // ═══════════════════════════════════════════════════════════
    case 'GET /parametres':
        Rep::ok([
            'verification_obligatoire' => Conf::get('verification_obligatoire', true) === true,
            'mode_test'                => Conf::get('mode_test', false) === true,
        ]);

    // ═══════════════════════════════════════════════════════════
    case 'GET /sante':
        Db::un('SELECT 1');
        Rep::ok(['service' => 'timecool-api']);

    default:
        Rep::erreur(404, 'route_inconnue', 'Endpoint inexistant.');
}
