-- ═══════════════════════════════════════════════════════
-- 018 — Les propositions de créneaux envoyées par Charly (mission 73)
--
-- Quand Charly décale un rendez-vous qui concerne un contact, il lui
-- propose 2 ou 3 créneaux à boutons au lieu de déplacer tout de suite.
-- Le rendez-vous d'origine reste en place jusqu'au choix du contact.
-- La réponse attend sur le serveur ; l'application la retrouve et,
-- selon « Ma confiance en Charly », demande ou place.
--
--   origine      'charly' : proposition de Charly (les liens de la fiche
--                contact gardent NULL et leur écriture automatique).
--   remplace_uid le rendez-vous d'origine, dans l'agenda de l'organisateur.
--   expire_le    au-delà, sans réponse : Charly le dit à l'utilisateur.
--   traite_le    l'utilisateur (ou Charly) a donné suite : placé, laissé,
--                ou reproposé ; la réponse ne revient plus.
--
-- Rejouable sans dégât : chaque colonne n'est ajoutée que si elle manque.
-- ═══════════════════════════════════════════════════════

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'origine');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD COLUMN origine VARCHAR(20) NULL AFTER statut', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'remplace_uid');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD COLUMN remplace_uid VARCHAR(100) NULL AFTER origine', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'expire_le');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD COLUMN expire_le DATETIME NULL AFTER repondu_le', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'traite_le');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD COLUMN traite_le DATETIME NULL AFTER expire_le', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;

SET @existe = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND INDEX_NAME = 'ix_rdv_origine');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD KEY ix_rdv_origine (organisateur_id, origine, traite_le)', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;
