-- ═══════════════════════════════════════════════════════
-- 013 — Documents joints à un rendez-vous (mission 40a)
--
-- Le fichier lui-même vit hors racine web, chiffré au repos avec la clé
-- de configuration (Coffre) : `<documents_dossier>/<compte_id>/<id>.bin`.
-- Ici : qui, quel rendez-vous (uid de synchronisation), le nom, le type,
-- la taille en clair, l'origine (appareil, ou Google Drive : lien gardé,
-- pas de copie), et la date. Une suppression est marquée (supprime_le),
-- le fichier est effacé.
--
-- Rejouable sans dégât : la table n'est créée que si elle manque.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS documents (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id     BIGINT UNSIGNED NOT NULL,
  rdv_uid       VARCHAR(64) NOT NULL,
  nom           VARCHAR(200) NOT NULL,
  type_mime     VARCHAR(100) NOT NULL,
  taille        INT UNSIGNED NOT NULL,
  origine       ENUM('appareil','drive') NOT NULL DEFAULT 'appareil',
  lien_drive    VARCHAR(500) NULL,
  supprime_le   DATETIME NULL,
  cree_le       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_compte_rdv (compte_id, rdv_uid),
  KEY idx_documents_compte_cree (compte_id, cree_le),
  CONSTRAINT fk_documents_compte FOREIGN KEY (compte_id) REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
