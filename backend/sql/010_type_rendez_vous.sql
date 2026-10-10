-- ═══════════════════════════════════════════════════════
-- 010 — Le TYPE d'un rendez-vous (étape 1)
--
-- Trois types, un seul geste : par téléphone, en personne, en visio.
-- La demande de rendez-vous entre comptes porte le type choisi par le
-- demandeur ; il est repris quand le rendez-vous s'écrit dans les deux
-- agendas (/rdv/choisir, /rdv/proposer-creneau).
--
-- NULL : les demandes d'avant cette règle, et celles où personne n'a
-- rien précisé. Un rendez-vous sans type vaut « en personne » partout.
--
-- Rejouable sans dégât : la colonne n'est ajoutée que si elle manque.
-- ═══════════════════════════════════════════════════════

SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rdv' AND COLUMN_NAME = 'type'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE rdv ADD COLUMN type ENUM(''telephone'',''physique'',''visio'') NULL AFTER lieu',
  'DO 0');
PREPARE etape FROM @sql;
EXECUTE etape;
DEALLOCATE PREPARE etape;
