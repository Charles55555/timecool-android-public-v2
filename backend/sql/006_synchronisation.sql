-- ═══════════════════════════════════════════════════════════════
-- 006 — Synchronisation continue entre appareils
--
-- Un rendez-vous cree sur le web n'apparaissait pas sur le mobile, et
-- inversement : la copie faite a l'appairage etait ponctuelle.
--
-- UNE SEULE TABLE, pas une par type. Ajouter une famille d'objets —
-- notes, factures, projets — ne demande alors NI table, NI migration,
-- NI endpoint : trois lignes cote application et c'est tout. Avec une
-- table par type, chaque nouveaute coute une migration et un
-- deploiement.
--
-- UN COMPTEUR, pas des horodatages. comptes.compteur_sync monte de un a
-- chaque ecriture, et chaque element retient le numero de sa derniere
-- modification. L'appareil dit « j'en suis a N », le serveur ne renvoie
-- que la suite : on ne retelecharge jamais ce qu'on a deja. Une horloge
-- de telephone peut etre fausse ou reculer, et deux ecritures dans la
-- meme seconde seraient indepartageables.
--
-- LES SUPPRESSIONS RESTENT, marquees par `supprime`. Sans cela, un
-- rendez-vous efface sur le telephone serait ressuscite par le PC qui
-- l'a encore.
--
-- Le contenu est du JSON : le serveur ne l'interprete pas, il le relaie.
--
-- Applique le 03/09/2026 sur timecool_prod.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS elements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL
    COMMENT 'rdv, tache, anniversaire, contact, reglage',
  uid VARCHAR(64) NOT NULL
    COMMENT 'Identifiant stable de l objet, cote application',
  contenu MEDIUMTEXT NULL
    COMMENT 'JSON. NULL quand l element est supprime',
  version BIGINT UNSIGNED NOT NULL
    COMMENT 'Valeur du compteur du compte au moment de l ecriture',
  supprime TINYINT(1) NOT NULL DEFAULT 0,
  maj_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_elements (compte_id, type, uid),
  -- L'index qui rend la synchronisation rapide : « ce qui a change
  -- depuis N » se lit sans parcourir la table.
  KEY ix_elements_suite (compte_id, version),
  CONSTRAINT fk_elements_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE comptes
  ADD COLUMN compteur_sync BIGINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Monte de un a chaque ecriture. Verrouille pendant la transaction de POST /sync';
