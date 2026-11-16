-- ═══════════════════════════════════════════════════════
-- 020 — Comptes rangés à la main dans l'onglet « Tests » de la page administrateur (mission 103)
--
-- Un administrateur peut ranger un compte dans l'onglet « Tests » (bouton « Ranger dans Tests »)
-- et l'en sortir (« Remettre dans Utilisateurs »). C'est un classement d'affichage, partagé par
-- tous les administrateurs et tous les appareils : il ne change aucun droit ni aucune donnée du
-- compte, ni la purge des comptes de test (scripts/purger-comptes-test.sh, qui ne lit que l'e-mail).
--
--   range_tests_le   date du rangement à la main ; NULL = pas rangé à la main.
--
-- Rejouable sans dégât : la colonne n'est ajoutée que si elle manque.
-- ═══════════════════════════════════════════════════════

SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comptes' AND COLUMN_NAME = 'range_tests_le');
SET @sql = IF(@existe = 0, 'ALTER TABLE comptes ADD COLUMN range_tests_le DATETIME NULL AFTER bloque_le', 'DO 0');
PREPARE etape FROM @sql; EXECUTE etape; DEALLOCATE PREPARE etape;
