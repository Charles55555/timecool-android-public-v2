-- ═══════════════════════════════════════════════════════
-- 019 — Le rendez-vous d'avant, dans une proposition de Charly (mission 73a, après l'examen)
--
-- Tant que l'utilisateur n'a pas validé le créneau choisi, le contact lit
-- « En attendant, le rendez-vous du mardi 4 novembre à 10h reste en place. »
-- (page du lien et carte de la messagerie ; décision du chef, 03/11).
--
--   avant   le libellé du rendez-vous qu'on décale, tel que l'application
--           l'écrit (« mardi 4 novembre à 10h »).
--
-- Rejouable sans dégât : la colonne n'est ajoutée que si elle manque.
-- ═══════════════════════════════════════════════════════

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'avant');
SET @sql = IF(@existe = 0, 'ALTER TABLE rdv ADD COLUMN avant VARCHAR(120) NULL AFTER remplace_uid', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;
