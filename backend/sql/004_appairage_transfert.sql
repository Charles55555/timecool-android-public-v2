-- ═══════════════════════════════════════════════════════════════
-- 004 — Transfert de l'agenda pendant l'appairage
--
-- L'appairage partageait le compte, jamais les données : on scannait,
-- on arrivait sur un agenda vide. Ces colonnes servent de relais.
--
-- Le serveur ne peut PAS lire ce qu'il relaie. Le paquet est chiffré
-- avec une clé dérivée de la clé publique du navigateur (ECDH P-256),
-- dont la moitié privée n'a jamais quitté celui-ci. Le paquet est
-- effacé à la livraison — voir GET /appairage/statut.
--
-- Applique le 03/09/2026 sur timecool_prod.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE appairages
  ADD COLUMN cle_publique TEXT NULL
    COMMENT 'Cle publique ECDH du nouvel appareil'
    AFTER code,
  ADD COLUMN paquet MEDIUMTEXT NULL
    COMMENT 'Donnees chiffrees deposees par le telephone — illisibles ici',
  ADD COLUMN paquet_cle TEXT NULL
    COMMENT 'Cle publique ECDH du telephone',
  ADD COLUMN paquet_le DATETIME NULL;
