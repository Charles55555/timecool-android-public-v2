-- ═══════════════════════════════════════════════════════════════
-- TimeCool — clés API des utilisateurs, conservées côté serveur
--
-- Jusqu'ici ces clés vivaient dans le localStorage du navigateur et
-- disparaissaient avec lui. Les déplacer ici les rend durables, mais
-- fait porter au serveur des identifiants FACTURABLES (OpenAI,
-- Anthropic, Google) appartenant aux utilisateurs.
--
-- D'où le chiffrement : la colonne ne contient jamais la clé en clair.
-- AES-256-GCM, clé de chiffrement dans config.php, hors base. Lire la
-- base ne suffit donc pas à obtenir les clés — il faut aussi le
-- fichier de configuration.
--
-- Cela ne protège pas d'un accès root au serveur, qui donne les deux.
-- C'est inhérent au fait que le serveur doive restituer la clé en
-- clair à l'application.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

CREATE TABLE cles_api (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id    BIGINT UNSIGNED NOT NULL,

  -- Identifiant du service : openai, anthropic, google_translate, etc.
  service      VARCHAR(40)     NOT NULL,

  -- base64( iv | tag | chiffre ). Jamais la clé en clair.
  valeur_chiffree TEXT         NOT NULL,

  -- Quatre derniers caractères, pour que l'utilisateur reconnaisse sa
  -- clé dans l'interface sans qu'on ait à la déchiffrer ni à l'exposer.
  indice       VARCHAR(8)      NULL,

  cree_le      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maj_le       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- Une seule clé par service et par compte : un enregistrement
  -- remplace le précédent au lieu de s'empiler.
  UNIQUE KEY uk_cles_compte_service (compte_id, service),
  CONSTRAINT fk_cles_api_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
