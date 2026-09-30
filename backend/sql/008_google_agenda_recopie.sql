-- ═══════════════════════════════════════════════════════════════
-- 008 — Recopie des rendez-vous TimeCool vers Google Agenda
--
-- Une ligne par rendez-vous recopié : elle relie l'identifiant
-- TimeCool à celui de l'événement chez Google. Sans elle, modifier
-- un rendez-vous en créerait un second chez Google au lieu de
-- corriger le premier, et le supprimer ne supprimerait rien.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

CREATE TABLE google_agenda_liens (
  compte_id    BIGINT UNSIGNED NOT NULL,
  uid          VARCHAR(64)     NOT NULL,   -- elements.uid du rendez-vous
  google_id    VARCHAR(1024)   NOT NULL,   -- identifiant de l'événement chez Google

  -- Empreinte de ce qui a été envoyé : tant qu'elle ne change pas,
  -- le rendez-vous n'est pas renvoyé.
  empreinte    CHAR(40)        NOT NULL,

  maj_le       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (compte_id, uid),
  CONSTRAINT fk_google_agenda_liens_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- Ce que Google a répondu la dernière fois que l'accès a échoué
-- (accès retiré par la personne, par exemple). NULL : tout va bien.
ALTER TABLE google_agenda
  ADD COLUMN erreur VARCHAR(40) NULL AFTER lire_tout,
  ADD COLUMN recopie_le DATETIME NULL AFTER erreur;
