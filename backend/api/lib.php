<?php
/**
 * Couche technique de l'API TimeCool.
 * Base de données, réponses JSON, empreintes d'identifiants, sessions.
 */

declare(strict_types=1);

final class Conf
{
    private static array $v = [];

    public static function charger(string $chemin): void
    {
        if (!is_file($chemin)) {
            Rep::erreur(500, 'config_absente', 'config.php introuvable sur le serveur.');
        }
        self::$v = require $chemin;
    }

    public static function get(string $cle, mixed $defaut = null): mixed
    {
        return self::$v[$cle] ?? $defaut;
    }
}

final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $c = Conf::get('db');
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['hote'], $c['base']);
            try {
                self::$pdo = new PDO($dsn, $c['utilisateur'], $c['mot_de_passe'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                // Le message PDO peut contenir les identifiants : jamais exposé.
                error_log('TimeCool DB: ' . $e->getMessage());
                Rep::erreur(500, 'base_indisponible', 'Service momentanément indisponible.');
            }
        }
        return self::$pdo;
    }

    public static function req(string $sql, array $params = []): PDOStatement
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st;
    }

    public static function un(string $sql, array $params = []): ?array
    {
        $l = self::req($sql, $params)->fetch();
        return $l === false ? null : $l;
    }

    public static function tous(string $sql, array $params = []): array
    {
        return self::req($sql, $params)->fetchAll();
    }
}

final class Rep
{
    /** Pose les en-têtes CORS et de sécurité. Appelé une seule fois. */
    public static function entetes(): void
    {
        $origine = $_SERVER['HTTP_ORIGIN'] ?? '';
        $permises = Conf::get('origines_autorisees', []);
        if ($origine !== '' && in_array($origine, $permises, true)) {
            header('Access-Control-Allow-Origin: ' . $origine);
            header('Vary: Origin');
        }
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Max-Age: 86400');
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('Cache-Control: no-store');
    }

    public static function ok(array $donnees = [], int $code = 200): never
    {
        http_response_code($code);
        echo json_encode($donnees + ['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function erreur(int $code, string $cle, string $message): never
    {
        http_response_code($code);
        echo json_encode(
            ['ok' => false, 'erreur' => $cle, 'message' => $message],
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }
}

final class Entree
{
    private static ?array $corps = null;

    /** Corps JSON de la requête, décodé une seule fois. */
    public static function corps(): array
    {
        if (self::$corps === null) {
            $brut = file_get_contents('php://input') ?: '';
            $d = json_decode($brut, true);
            self::$corps = is_array($d) ? $d : [];
        }
        return self::$corps;
    }

    public static function texte(string $cle, int $max = 255): ?string
    {
        $v = self::corps()[$cle] ?? null;
        if (!is_string($v)) {
            return null;
        }
        $v = trim($v);
        if ($v === '' || mb_strlen($v) > $max) {
            return null;
        }
        return $v;
    }

    /** Récupère une valeur obligatoire, ou interrompt en 400. */
    public static function requis(string $cle, int $max = 255): string
    {
        $v = self::texte($cle, $max);
        if ($v === null) {
            Rep::erreur(400, 'champ_manquant', "Champ obligatoire ou invalide : $cle");
        }
        return $v;
    }

    public static function entier(string $cle): ?int
    {
        $v = self::corps()[$cle] ?? null;
        return is_int($v) ? $v : (is_string($v) && ctype_digit($v) ? (int) $v : null);
    }
}

final class Empreinte
{
    /** Email normalisé : minuscules, sans espaces périphériques. */
    public static function normaliserEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    /**
     * Téléphone normalisé au format E.164 (« +33612345678 »).
     * Un numéro national français à 10 chiffres commençant par 0 est
     * converti par défaut, faute d'indicatif explicite.
     */
    public static function normaliserTelephone(string $tel, string $indicatifDefaut = '+33'): string
    {
        $t = preg_replace('/[^0-9+]/', '', $tel) ?? '';
        if (str_starts_with($t, '00')) {
            $t = '+' . substr($t, 2);
        }
        if (!str_starts_with($t, '+')) {
            $t = $indicatifDefaut . ltrim($t, '0');
        }
        return $t;
    }

    /**
     * Empreinte publique : SHA-256 du seul identifiant normalisé.
     *
     * C'est exactement ce que l'application calcule et transmet. Elle ne
     * contient PAS le poivre : l'application est distribuée publiquement
     * en APK, donc tout secret qu'elle embarquerait serait extractible et
     * n'offrirait aucune protection réelle.
     */
    public static function publique(string $valeurNormalisee): string
    {
        return hash('sha256', $valeurNormalisee);
    }

    /**
     * Poivrage d'une empreinte publique, pour stockage et comparaison.
     *
     * Le poivre ne quitte jamais le serveur. Une lecture de la seule base
     * ne permet donc pas de revenir aux identifiants par force brute, ce
     * qui serait sinon trivial sur l'espace des numéros de téléphone.
     *
     * Cela reste de la pseudonymisation : quiconque détiendrait à la fois
     * la base et le poivre pourrait les retrouver.
     */
    public static function poivrer(string $empreintePublique): string
    {
        return hash('sha256', Conf::get('poivre') . '|' . $empreintePublique);
    }

    /** Chaîne complète, depuis un identifiant en clair jusqu'au stockage. */
    public static function stockable(string $valeurNormalisee): string
    {
        return self::poivrer(self::publique($valeurNormalisee));
    }

    public static function email(string $email): string
    {
        return self::stockable(self::normaliserEmail($email));
    }

    public static function telephone(string $tel): string
    {
        return self::stockable(self::normaliserTelephone($tel));
    }
}

/**
 * Chiffrement des secrets détenus pour le compte des utilisateurs
 * (leurs clés API). AES-256-GCM : confidentialité et authenticité, une
 * valeur altérée en base est rejetée au lieu d'être déchiffrée en
 * silence vers n'importe quoi.
 */
final class Coffre
{
    private const ALGO = 'aes-256-gcm';

    /** Clé binaire de 32 octets, dérivée de la valeur hexadécimale du config. */
    private static function cle(): string
    {
        $hex = (string) Conf::get('cle_chiffrement', '');
        if (strlen($hex) !== 64 || !ctype_xdigit($hex)) {
            Rep::erreur(500, 'chiffrement_indisponible',
                'Service momentanément indisponible.');
        }
        return (string) hex2bin($hex);
    }

    /** Retourne base64( iv | tag | chiffré ). */
    public static function chiffrer(string $clair): string
    {
        $iv = random_bytes(12); // 96 bits, taille recommandée pour GCM
        $tag = '';
        $chiffre = openssl_encrypt($clair, self::ALGO, self::cle(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($chiffre === false) {
            Rep::erreur(500, 'chiffrement_echoue', 'Service momentanément indisponible.');
        }
        return base64_encode($iv . $tag . $chiffre);
    }

    /** Retourne null si la valeur est illisible ou a été altérée. */
    public static function dechiffrer(string $encode): ?string
    {
        $brut = base64_decode($encode, true);
        if ($brut === false || strlen($brut) < 29) {
            return null;
        }
        $iv = substr($brut, 0, 12);
        $tag = substr($brut, 12, 16);
        $chiffre = substr($brut, 28);
        $clair = openssl_decrypt($chiffre, self::ALGO, self::cle(), OPENSSL_RAW_DATA, $iv, $tag);
        return $clair === false ? null : $clair;
    }
}

final class Jeton
{
    /** Jeton opaque de 32 octets, rendu en hexadécimal. */
    public static function creer(): string
    {
        return bin2hex(random_bytes(32));
    }

    /** Seule l'empreinte du jeton est stockée en base. */
    public static function hacher(string $jeton): string
    {
        return hash('sha256', $jeton);
    }

    /**
     * Identifiant public opaque du compte, compatible avec la colonne
     * CHAR(12). 12 caractères sur un alphabet de 32 symboles (sans 0/O,
     * 1/I/L, U — ambigus à l'oral ou à la recopie) donnent 32^12, soit
     * environ 1,15 × 10^18 combinaisons : trop grand pour qu'une
     * collision ait une chance réaliste de se produire à l'échelle de
     * cette application, tout en restant nettement plus court à lire
     * ou recopier que les 26 caractères précédents.
     */
    public static function reference(): string
    {
        $alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        $out = '';
        for ($i = 0; $i < 12; $i++) {
            $out .= $alphabet[random_int(0, 31)];
        }
        return $out;
    }
}

/**
 * Vérification des jetons d'identité Google (OpenID Connect).
 *
 * La vérification est faite ICI, côté serveur, et non côté application :
 * un jeton reçu de l'application est une donnée que n'importe qui peut
 * fabriquer. Sans contrôle de la signature, se connecter sous l'identité
 * de quelqu'un d'autre serait trivial.
 */
final class Google
{
    private const JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
    private const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

    private static function base64url(string $s): string
    {
        $r = strtr($s, '-_', '+/');
        $pad = strlen($r) % 4;
        if ($pad) {
            $r .= str_repeat('=', 4 - $pad);
        }
        $d = base64_decode($r, true);
        return $d === false ? '' : $d;
    }

    /** Longueur DER. */
    private static function derLong(int $n): string
    {
        if ($n < 128) {
            return chr($n);
        }
        $o = '';
        while ($n > 0) { $o = chr($n & 0xFF) . $o; $n >>= 8; }
        return chr(0x80 | strlen($o)) . $o;
    }

    /** Entier DER, avec l'octet nul si le bit de poids fort est à 1. */
    private static function derEntier(string $bin): string
    {
        $bin = ltrim($bin, "\x00");
        if ($bin === '' ) { $bin = "\x00"; }
        if (ord($bin[0]) & 0x80) { $bin = "\x00" . $bin; }
        return "\x02" . self::derLong(strlen($bin)) . $bin;
    }

    /** Reconstruit une clé publique PEM à partir du modulus et de l'exposant. */
    private static function pemDepuisJwk(string $n64, string $e64): string
    {
        $rsa = "\x30" . self::derLong(
            strlen(self::derEntier(self::base64url($n64)) . self::derEntier(self::base64url($e64)))
        ) . self::derEntier(self::base64url($n64)) . self::derEntier(self::base64url($e64));

        // AlgorithmIdentifier rsaEncryption + NULL
        $algo = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $bits = "\x03" . self::derLong(strlen($rsa) + 1) . "\x00" . $rsa;
        $spki = "\x30" . self::derLong(strlen($algo) + strlen($bits)) . $algo . $bits;

        return "-----BEGIN PUBLIC KEY-----\n"
             . chunk_split(base64_encode($spki), 64, "\n")
             . "-----END PUBLIC KEY-----\n";
    }

    /** Clés publiques Google, mises en cache une heure. */
    private static function cles(): array
    {
        $cache = sys_get_temp_dir() . '/timecool_google_jwks.json';
        if (is_file($cache) && (time() - filemtime($cache)) < 3600) {
            $j = json_decode((string) file_get_contents($cache), true);
            if (is_array($j) && isset($j['keys'])) {
                return $j['keys'];
            }
        }
        $ch = curl_init(self::JWKS);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $rep = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($rep === false || $code !== 200) {
            Rep::erreur(503, 'google_injoignable', 'Vérification Google momentanément impossible.');
        }
        $j = json_decode((string) $rep, true);
        if (!is_array($j) || !isset($j['keys'])) {
            Rep::erreur(503, 'google_reponse_invalide', 'Vérification Google momentanément impossible.');
        }
        @file_put_contents($cache, $rep);
        return $j['keys'];
    }

    /**
     * Valide un jeton d'identité et retourne ses revendications.
     * Interrompt en 401 au moindre doute — jamais de repli permissif.
     */
    public static function verifier(string $jeton, array $audiences): array
    {
        $parts = explode('.', $jeton);
        if (count($parts) !== 3) {
            Rep::erreur(401, 'jeton_google_invalide', 'Jeton Google illisible.');
        }
        [$h64, $p64, $s64] = $parts;

        $entete = json_decode(self::base64url($h64), true);
        // Refus explicite de tout algorithme autre que RS256 : accepter
        // « none » ou un algorithme symétrique permettrait de forger un
        // jeton sans posseder la clé privée de Google.
        if (!is_array($entete) || ($entete['alg'] ?? '') !== 'RS256' || empty($entete['kid'])) {
            Rep::erreur(401, 'jeton_google_invalide', 'Jeton Google non conforme.');
        }

        $pem = null;
        foreach (self::cles() as $k) {
            if (($k['kid'] ?? '') === $entete['kid'] && ($k['kty'] ?? '') === 'RSA') {
                $pem = self::pemDepuisJwk($k['n'], $k['e']);
                break;
            }
        }
        if ($pem === null) {
            Rep::erreur(401, 'jeton_google_inconnu', 'Clé de signature Google inconnue.');
        }

        $ok = openssl_verify($h64 . '.' . $p64, self::base64url($s64), $pem, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) {
            Rep::erreur(401, 'signature_google_invalide', 'Signature du jeton Google invalide.');
        }

        $c = json_decode(self::base64url($p64), true);
        if (!is_array($c)) {
            Rep::erreur(401, 'jeton_google_invalide', 'Jeton Google illisible.');
        }
        if (!in_array($c['iss'] ?? '', self::EMETTEURS, true)) {
            Rep::erreur(401, 'emetteur_invalide', 'Émetteur du jeton inattendu.');
        }
        // L'audience doit être NOTRE identifiant client : sans ce contrôle,
        // un jeton emis pour une toute autre application serait accepte.
        if (!in_array((string) ($c['aud'] ?? ''), $audiences, true)) {
            Rep::erreur(401, 'audience_invalide', 'Ce jeton ne concerne pas TimeCool.');
        }
        if (!isset($c['exp']) || (int) $c['exp'] <= time()) {
            Rep::erreur(401, 'jeton_google_expire', 'Jeton Google expiré.');
        }
        if (empty($c['email']) || ($c['email_verified'] ?? false) !== true) {
            Rep::erreur(401, 'email_google_non_verifie', 'Adresse Google non vérifiée.');
        }

        return $c;
    }
}

/**
 * Envoi de SMS réel via l'API Twilio.
 *
 * ═══ USAGE NORMAL — comment déclencher un SMS en production ═══
 * Un seul point d'entrée : Sms::envoyer($numeroE164, $message). C'est le
 * bloc de base pour tout envoi automatisé futur — rappel de RDV, code de
 * vérification (voir case 'POST /verification/demander' plus bas, déjà
 * branché), notification de changement, etc. Toujours depuis le SERVEUR,
 * jamais depuis l'app : voir l'avertissement de configuration ci-dessous.
 *
 * ═══ CONFIGURATION REQUISE (backend/private/config.php, jamais commité) ═══
 * 'twilio_account_sid'       => Account SID (console.twilio.com, page d'accueil)
 * 'twilio_auth_token'        => Auth Token (même page)
 * 'twilio_numero_expediteur' => numéro Twilio au format E.164, ex. '+33755530123'
 *
 * ⚠️ Le champ "Twilio (SMS)" de l'écran Configuration IA (côté app, dans
 * localStorage) n'alimente PAS ces 3 valeurs et n'est lu par aucun code —
 * c'est un simple espace réservé dans une liste de fournisseurs futurs.
 * Un identifiant Twilio est un secret serveur à part entière (Account SID
 * + Auth Token), jamais un secret embarquable dans l'app : contrairement
 * à une clé Google Maps ou LLM (restreignable par app/domaine), un Auth
 * Token qui fuiterait depuis un APK décompilé permettrait d'envoyer des
 * SMS illimités aux frais du compte, depuis n'importe où. D'où sa place
 * ici, dans config.php, au même titre que le poivre et la clé de
 * chiffrement — jamais dans le JS distribué publiquement.
 */
final class Sms
{
    public static function envoyer(string $numeroE164, string $message): void
    {
        $sid     = Conf::get('twilio_account_sid');
        $jeton   = Conf::get('twilio_auth_token');
        $depuis  = Conf::get('twilio_numero_expediteur');
        if (!$sid || !$jeton || !$depuis) {
            throw new RuntimeException(
                'Twilio non configuré : renseigner twilio_account_sid, twilio_auth_token '
                . 'et twilio_numero_expediteur dans config.php.'
            );
        }

        $ch = curl_init("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'To'   => $numeroE164,
                'From' => $depuis,
                'Body' => $message,
            ]),
            CURLOPT_USERPWD        => $sid . ':' . $jeton,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $repBrute   = curl_exec($ch);
        $codeHttp   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $erreurCurl = curl_error($ch);
        curl_close($ch);

        if ($repBrute === false) {
            throw new RuntimeException('Twilio : échec réseau — ' . $erreurCurl);
        }
        $rep = json_decode((string) $repBrute, true);
        if ($codeHttp < 200 || $codeHttp >= 300) {
            $detail = is_array($rep) && isset($rep['message']) ? (string) $rep['message'] : ('HTTP ' . $codeHttp);
            throw new RuntimeException('Twilio : ' . $detail);
        }
    }
}

final class Auth
{
    /**
     * Compte rattaché au jeton « Authorization: Bearer … ».
     * Interrompt en 401 si le jeton est absent, inconnu, révoqué ou expiré.
     */
    public static function compte(): array
    {
        $entete = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($entete === '' && function_exists('apache_request_headers')) {
            $h = apache_request_headers();
            $entete = $h['Authorization'] ?? $h['authorization'] ?? '';
        }
        if (!preg_match('/^Bearer\s+([0-9a-f]{64})$/i', $entete, $m)) {
            Rep::erreur(401, 'non_authentifie', 'Session requise.');
        }

        $ligne = Db::un(
            'SELECT c.*, s.id AS session_id
               FROM sessions s
               JOIN comptes c ON c.id = s.compte_id
              WHERE s.jeton_hash = ?
                AND s.revoque_le IS NULL
                AND s.expire_le > NOW()
                AND c.cloture_le IS NULL',
            [Jeton::hacher(strtolower($m[1]))]
        );
        if ($ligne === null) {
            Rep::erreur(401, 'session_invalide', 'Session expirée ou révoquée.');
        }

        // Trace de dernière activité, utile pour la purge des sessions.
        Db::req('UPDATE sessions SET vu_le = NOW() WHERE id = ?', [$ligne['session_id']]);

        return $ligne;
    }
}
