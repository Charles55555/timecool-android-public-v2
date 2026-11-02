-- ═══════════════════════════════════════
-- 017 — Compteurs des relais (mission 71, Charles, 02/11/2026)
--
-- Une ligne par compte, par service et par jour :
--   n_jour   : appels du jour, refus compris.
--   minute / n_minute : la minute en cours et ses appels (limite par minute).
--   refus    : appels refusés au-delà de la limite, pour repérer un abus.
-- Lecture : GET /admin/relais. Effacée avec le compte.
-- Rejouable sans dégât. À jouer par le chef de projet, AVANT de déployer l'API de la mission 71.
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS relais_compteurs (
  compte_id BIGINT UNSIGNED NOT NULL,
  service   VARCHAR(40)     NOT NULL,
  jour      DATE            NOT NULL,
  minute    DATETIME        NOT NULL,
  n_minute  INT UNSIGNED    NOT NULL DEFAULT 0,
  n_jour    INT UNSIGNED    NOT NULL DEFAULT 0,
  refus     INT UNSIGNED    NOT NULL DEFAULT 0,
  PRIMARY KEY (compte_id, service, jour),
  KEY idx_relais_jour (jour),
  CONSTRAINT fk_relais_compte FOREIGN KEY (compte_id) REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
