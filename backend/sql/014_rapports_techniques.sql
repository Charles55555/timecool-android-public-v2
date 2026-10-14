-- ═══════════════════════════════════════════════════════
-- 014 — Les rapports techniques envoyés par l'application (mission 41)
--
-- Quand TimeCool n'arrive pas à se charger (boucle arrêtée par le garde-fou) ou à joindre le
-- serveur (panneau « Vérifions ensemble »), l'utilisateur peut toucher « Envoyer le rapport » :
-- version, navigateur, compte (si connu), dernières requêtes et erreurs. Gardé tel quel, jamais
-- d'e-mail ; sans session obligatoire (compte_id rattaché si le jeton est valable).
-- Le plafond est de 10 rapports par heure et par adresse (d'où l'index sur ip, cree_le).
--
-- Rejouable sans dégât : la table n'est créée que si elle manque.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rapports_techniques (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id  INT UNSIGNED NULL,
  compte_ref VARCHAR(120) NULL,
  contexte   VARCHAR(40)  NOT NULL DEFAULT 'inconnu',
  version    VARCHAR(60)  NULL,
  navigateur VARCHAR(255) NULL,
  ip         VARBINARY(16) NULL,
  contenu    MEDIUMTEXT   NOT NULL,
  cree_le    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rapports_ip (ip, cree_le),
  KEY idx_rapports_compte (compte_id, cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
