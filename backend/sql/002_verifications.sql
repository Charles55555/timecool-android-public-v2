-- ═══════════════════════════════════════════════════════════════
-- TimeCool — vérification de l'email ou du téléphone à l'inscription
--
-- Jusqu'ici la vérification était entièrement côté navigateur : le code
-- était tiré par Math.random() en JavaScript et comparé à lui-même. Elle
-- passe côté serveur, ce qui la rend réelle.
--
-- Cycle de vie d'une ligne :
--   1. demande      -> code tiré, haché, expiration courte
--   2. validation   -> preuve émise, également stockée hachée
--   3. inscription  -> preuve consommée, la ligne ne peut plus resservir
--
-- La destination est conservée en clair : elle est nécessaire pour
-- envoyer le message. Ces lignes sont éphémères et purgeables.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

CREATE TABLE verifications (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference           CHAR(26)        NOT NULL COMMENT 'Poignee publique, ne revele pas la destination',
  canal               ENUM('sms','email') NOT NULL,
  destination         VARCHAR(255)    NOT NULL COMMENT 'Email normalise ou telephone E.164',
  destination_empreinte CHAR(64)      NOT NULL COMMENT 'Poivree, pour compter les demandes sans indexer le clair',

  -- Le code n'est jamais stocké en clair : une lecture de la base ne
  -- permet pas de valider une vérification en cours.
  code_hash           CHAR(64)        NOT NULL,
  tentatives          TINYINT UNSIGNED NOT NULL DEFAULT 0,

  -- Preuve remise après validation, à présenter à l'inscription.
  -- Hachée elle aussi : le jeton en clair n'existe que chez le client.
  preuve_hash         CHAR(64)        NULL,
  preuve_expire_le    DATETIME        NULL,

  valide_le           DATETIME        NULL,
  consomme_le         DATETIME        NULL COMMENT 'Inscription effectuee : la preuve ne resserf plus',
  ip_creation         VARBINARY(16)   NULL,
  cree_le             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le           DATETIME        NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uk_verif_reference (reference),
  UNIQUE KEY uk_verif_preuve (preuve_hash),
  -- Sert à plafonner le nombre de demandes par destination et par heure.
  KEY ix_verif_destination (destination_empreinte, cree_le),
  KEY ix_verif_expire (expire_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
