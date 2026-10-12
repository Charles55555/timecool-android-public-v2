-- ═══════════════════════════════════════════════════════
-- 012 — Convocations de groupe (mission 27b)
--
-- Les tables `convocations` et `convocation_reponses` existent déjà en
-- production (schéma initial, jamais utilisées par une route jusqu'ici) :
-- cette migration les décrit telles quelles, pour qu'une base neuve les
-- ait, et ne change rien là où elles existent. L'API de la mission 27b
-- s'appuie dessus :
--   convocations          : organisateur_id, titre, debut / fin (DATETIME),
--                           statut (active par défaut), lieu et groupe_id
--                           non utilisés (le nom du groupe voyage dans le
--                           message de messagerie).
--   convocation_reponses  : un membre inscrit = compte_id ; reponse
--                           sans_reponse (en attente) / present / absent,
--                           repondu_le. contact_id n'est pas utilisé (les
--                           membres sans compte sont notés par
--                           l'organisateur, sur son appareil).
--
-- La table `convocation_membres`, créée par erreur par la première version
-- de ce fichier (12/10/2026), n'est utilisée par rien : à supprimer
-- (DROP TABLE IF EXISTS convocation_membres) par le chef de projet.
--
-- Rejouable sans dégât : les tables ne sont créées que si elles manquent.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS convocations (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisateur_id  BIGINT UNSIGNED NOT NULL,
  groupe_id        BIGINT UNSIGNED NULL,
  titre            VARCHAR(200) NOT NULL,
  lieu             VARCHAR(255) NULL,
  debut            DATETIME NOT NULL,
  fin              DATETIME NOT NULL,
  statut           ENUM('active','annulee','passee') NOT NULL DEFAULT 'active',
  cree_le          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_conv_organisateur (organisateur_id),
  KEY ix_conv_groupe (groupe_id),
  CONSTRAINT fk_conv_organisateur FOREIGN KEY (organisateur_id) REFERENCES comptes (id) ON DELETE CASCADE,
  CONSTRAINT ck_conv_ordre CHECK (fin > debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS convocation_reponses (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  convocation_id   BIGINT UNSIGNED NOT NULL,
  contact_id       BIGINT UNSIGNED NULL,
  compte_id        BIGINT UNSIGNED NULL COMMENT 'Si le destinataire est inscrit',
  reponse          ENUM('sans_reponse','present','absent') NOT NULL DEFAULT 'sans_reponse',
  repondu_le       DATETIME NULL,
  destinataire_cle VARCHAR(24) GENERATED ALWAYS AS (CONCAT(IF(contact_id IS NOT NULL, 'c', 'a'), COALESCE(contact_id, compte_id))) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uk_conv_rep (convocation_id, destinataire_cle),
  KEY ix_conv_rep_contact (contact_id),
  KEY ix_conv_rep_compte (compte_id),
  KEY ix_conv_rep_reponse (convocation_id, reponse),
  CONSTRAINT fk_conv_rep_compte FOREIGN KEY (compte_id) REFERENCES comptes (id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_rep_conv FOREIGN KEY (convocation_id) REFERENCES convocations (id) ON DELETE CASCADE,
  CONSTRAINT ck_conv_rep_destinataire CHECK (contact_id IS NOT NULL OR compte_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
