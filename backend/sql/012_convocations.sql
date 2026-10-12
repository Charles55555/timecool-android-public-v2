-- ═══════════════════════════════════════════════════════
-- 012 — Convocations de groupe (mission 27b)
--
-- Une convocation = un horaire fixé par l'organisateur, envoyée dans la
-- messagerie de chaque membre qui a TimeCool ; chacun répond Présent ou
-- Absent, l'organisateur lit les réponses. Les membres sans compte ne
-- sont pas ici : l'organisateur note leur réponse à la main, sur son
-- appareil.
--
-- Rejouable sans dégât : les tables ne sont créées que si elles manquent.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS convocations (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisateur_id  INT UNSIGNED NOT NULL,
  groupe           VARCHAR(120) NULL,
  titre            VARCHAR(120) NOT NULL,
  jour             DATE NOT NULL,
  debut            TIME NOT NULL,
  fin              TIME NOT NULL,
  cree_le          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_convocations_organisateur (organisateur_id, cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS convocation_membres (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  convocation_id   INT UNSIGNED NOT NULL,
  compte_id        INT UNSIGNED NOT NULL,
  statut           ENUM('attente','present','absent') NOT NULL DEFAULT 'attente',
  repondu_le       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_convocation_membre (convocation_id, compte_id),
  KEY idx_convocation_membres_compte (compte_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
