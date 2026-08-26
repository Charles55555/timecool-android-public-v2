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

    /** Identifiant public opaque, compatible avec la colonne CHAR(26). */
    public static function reference(): string
    {
        $alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        $out = '';
        for ($i = 0; $i < 26; $i++) {
            $out .= $alphabet[random_int(0, 31)];
        }
        return $out;
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
