-- ═══════════════════════════════════════════════════════
-- 011 — Les commentaires envoyés depuis « Aide et commentaires »
--
-- Chaque commentaire est gardé tel quel, avec le compte qui l'a envoyé,
-- la version de l'application et l'appareil. Un e-mail part en plus à
-- social@timecool.fr ; s'il échoue, la ligne reste (c'est elle qui fait foi).
--
-- Rejouable sans dégât : la table n'est créée que si elle manque.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS commentaires (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id  INT UNSIGNED NOT NULL,
  texte      TEXT NOT NULL,
  version    VARCHAR(40)  NULL,
  appareil   VARCHAR(120) NULL,
  email_envoye TINYINT(1) NOT NULL DEFAULT 0,
  cree_le    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commentaires_compte (compte_id, cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
