-- ═══════════════════════════════════════════════════════════════
-- 007 — Liaison d'un compte TimeCool à son Google Agenda
--
-- Une ligne par compte relié. Le jeton de renouvellement donné par
-- Google ouvre l'agenda de la personne sans limite de durée : il est
-- chiffré par le coffre, comme les clés API, et ne quitte jamais le
-- serveur — l'application ne reçoit que l'état de la liaison.
--
-- Table à part, et non cles_api : une clé de cles_api appartenant à
-- l'administrateur est prêtée à tous les comptes (GET /cles-api/valeur)
-- et recopiée à chaque inscription (clesDuModele). Un jeton Google
-- rangé là donnerait l'agenda de Charles à n'importe quel inscrit.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

CREATE TABLE google_agenda (
  compte_id    BIGINT UNSIGNED NOT NULL,

  -- Adresse du compte Google relié, pour que la personne sache lequel.
  email_google VARCHAR(255)    NULL,

  -- base64( iv | tag | chiffré ). Jamais en clair.
  jeton_renouvellement TEXT    NOT NULL,

  -- Jeton d'accès en cours (une heure de validité), gardé pour ne pas
  -- redemander à Google à chaque appel. Chiffré lui aussi.
  jeton_acces  TEXT            NULL,
  acces_expire_le DATETIME     NULL,

  -- Les deux cases de l'écran Paramètres.
  envoyer      TINYINT(1)      NOT NULL DEFAULT 1,  -- TimeCool → Google
  recevoir     TINYINT(1)      NOT NULL DEFAULT 1,  -- Google → TimeCool

  relie_le     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maj_le       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (compte_id),
  CONSTRAINT fk_google_agenda_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
