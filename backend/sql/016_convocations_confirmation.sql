-- ═══════════════════════════════════════════════════════
-- 016 — Confirmation par convocation (mission 48, Charles, 15/10/2026)
--
-- Un « Présent » vaut accord : quand tous les membres ont répondu présent, l'organisateur confirme la convocation
-- (POST /convocations/confirmer) et le rendez-vous s'inscrit chez lui et chez chacun d'eux, sans exiger leurs plages.
--   statut      : 'confirmee' s'ajoute aux valeurs existantes ; 'annulee' est posé quand un membre répond absent.
--   rdv_uid     : l'identifiant (tc_grp_…) du rendez-vous inscrit, rendu au second appel (deja = true).
--   confirme_le : quand.
-- Rejouable sans dégât : MODIFY ne change rien si l'ENUM a déjà la valeur ; ADD COLUMN IF NOT EXISTS (MariaDB).
-- À jouer par le chef de projet, avant de déployer l'API de la mission 48.
-- ═══════════════════════════════════════════════════════

ALTER TABLE convocations
  MODIFY COLUMN statut ENUM('active','annulee','passee','confirmee') NOT NULL DEFAULT 'active';

ALTER TABLE convocations
  ADD COLUMN IF NOT EXISTS rdv_uid VARCHAR(40) NULL AFTER statut;

ALTER TABLE convocations
  ADD COLUMN IF NOT EXISTS confirme_le DATETIME NULL AFTER rdv_uid;
