-- ═══════════════════════════════════════════════════════════════
-- TimeCool — schéma initial
-- Cible : MariaDB 10.6.23, base timecool_prod, InnoDB / utf8mb4
--
-- Conçu d'après :
--   TIMECOOL_Spec_RDV_Bilateral_vs_Groupe.md
--   TIMECOOL_Spec_Reponse_Contact_Sans_App.md
--   TIMECOOL_Politique_Confidentialite_Projet.pdf
--
-- Principes appliqués :
--   - Minimisation : aucune colonne qui ne serve à une fonction décrite.
--   - Effacement : tout ce qui appartient à un compte part en CASCADE.
--   - Conservation : les durées étant « à valider juridiquement », rien
--     n'est figé ici. Les colonnes expire_le / cloture_le rendent la
--     purge possible sans modifier le schéma.
--   - Aucune opération hors de timecool_prod. La base multi_vendor
--     (Denxiad) n'est jamais référencée.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ───────────────────────────────────────────────────────────────
-- 1. COMPTES
-- Les colonnes *_empreinte stockent un SHA-256 de l'identifiant
-- normalisé (email en minuscules ; téléphone au format E.164),
-- concaténé à un poivre applicatif conservé hors base. Elles servent
-- à reconnaître qu'un contact est déjà inscrit sans que l'application
-- ait à transmettre le carnet d'adresses en clair.
-- ───────────────────────────────────────────────────────────────
CREATE TABLE comptes (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference           CHAR(26)        NOT NULL COMMENT 'Identifiant public opaque (ULID)',
  email               VARCHAR(255)    NOT NULL,
  email_empreinte     CHAR(64)        NOT NULL,
  telephone           VARCHAR(20)     NOT NULL COMMENT 'Format E.164',
  telephone_empreinte CHAR(64)        NOT NULL,
  mot_de_passe_hash   VARCHAR(255)    NOT NULL COMMENT 'Argon2id, jamais en clair',
  prenom              VARCHAR(100)    NOT NULL,
  nom                 VARCHAR(100)    NOT NULL,
  ville               VARCHAR(120)    NOT NULL,
  code_postal         VARCHAR(16)     NOT NULL,
  pays                CHAR(2)         NOT NULL DEFAULT 'FR',
  langue              CHAR(5)         NOT NULL DEFAULT 'fr',
  fuseau              VARCHAR(64)     NOT NULL DEFAULT 'Europe/Paris',
  email_verifie_le    DATETIME        NULL,
  derniere_connexion  DATETIME        NULL,
  cloture_le          DATETIME        NULL COMMENT 'Cloture demandee par utilisateur',
  cree_le             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maj_le              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_comptes_reference (reference),
  UNIQUE KEY uk_comptes_email (email),
  UNIQUE KEY uk_comptes_telephone (telephone),
  KEY ix_comptes_email_empreinte (email_empreinte),
  KEY ix_comptes_telephone_empreinte (telephone_empreinte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ───────────────────────────────────────────────────────────────
-- 2. SESSIONS — connexion
-- Seul le hash du jeton est stocké : une lecture de la base ne permet
-- pas de rejouer une session.
-- ───────────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id   BIGINT UNSIGNED NOT NULL,
  jeton_hash  CHAR(64)        NOT NULL,
  appareil    VARCHAR(160)    NULL,
  ip_creation VARBINARY(16)   NULL,
  cree_le     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vu_le       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le   DATETIME        NOT NULL,
  revoque_le  DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sessions_jeton (jeton_hash),
  KEY ix_sessions_compte (compte_id),
  KEY ix_sessions_expire (expire_le),
  CONSTRAINT fk_sessions_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ───────────────────────────────────────────────────────────────
-- 3. APPAIRAGES — TC_BACKEND.createPairingSession / approvePairing
-- Code a 6 chiffres, expiration 10 minutes.
-- ───────────────────────────────────────────────────────────────
CREATE TABLE appairages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        CHAR(6)         NOT NULL,
  compte_id   BIGINT UNSIGNED NULL COMMENT 'Renseigne a approbation',
  statut      ENUM('attente','approuve','expire','annule') NOT NULL DEFAULT 'attente',
  cree_le     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le   DATETIME        NOT NULL,
  approuve_le DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_appairages_code (code),
  KEY ix_appairages_expire (expire_le),
  CONSTRAINT fk_appairages_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ───────────────────────────────────────────────────────────────
-- 4. CLES_PUBLIQUES — TC_BACKEND.exchangePublicKey
-- Le serveur ne voit que des clés publiques ; les clés privées ne
-- quittent jamais l'appareil (TC_CRYPTO).
-- ───────────────────────────────────────────────────────────────
CREATE TABLE cles_publiques (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id  BIGINT UNSIGNED NOT NULL,
  appareil   VARCHAR(160)    NOT NULL,
  cle_jwk    TEXT            NOT NULL,
  cree_le    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoque_le DATETIME        NULL,
  PRIMARY KEY (id),
  KEY ix_cles_compte (compte_id),
  CONSTRAINT fk_cles_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ───────────────────────────────────────────────────────────────
-- 5. CONTACTS
-- compte_lie_id : rempli quand le contact est lui-même inscrit, ce qui
-- déclenche le flux applicatif plutôt que le lien public.
-- niveau_autorisation 0 a 3, conservé tel quel depuis l'application.
-- ───────────────────────────────────────────────────────────────
CREATE TABLE contacts (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id           BIGINT UNSIGNED NOT NULL COMMENT 'Proprietaire du carnet',
  compte_lie_id       BIGINT UNSIGNED NULL COMMENT 'Compte du contact si inscrit',
  prenom              VARCHAR(100)    NOT NULL,
  nom                 VARCHAR(100)    NULL,
  email               VARCHAR(255)    NULL,
  email_empreinte     CHAR(64)        NULL,
  telephone           VARCHAR(20)     NULL,
  telephone_empreinte CHAR(64)        NULL,
  categorie           VARCHAR(60)     NULL COMMENT 'Categorie de relation',
  canal_prefere       ENUM('sms','email','whatsapp') NULL,
  niveau_autorisation TINYINT UNSIGNED NOT NULL DEFAULT 0,
  cree_le             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maj_le              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_contacts_compte (compte_id),
  KEY ix_contacts_lie (compte_lie_id),
  KEY ix_contacts_email_empreinte (email_empreinte),
  KEY ix_contacts_tel_empreinte (telephone_empreinte),
  CONSTRAINT ck_contacts_niveau CHECK (niveau_autorisation BETWEEN 0 AND 3),
  CONSTRAINT fk_contacts_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_lie FOREIGN KEY (compte_lie_id)
    REFERENCES comptes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ───────────────────────────────────────────────────────────────
-- 6-7. GROUPES — support de la convocation collective
-- ───────────────────────────────────────────────────────────────
CREATE TABLE groupes (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compte_id BIGINT UNSIGNED NOT NULL,
  nom       VARCHAR(120)    NOT NULL,
  cree_le   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maj_le    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_groupes_compte (compte_id),
  CONSTRAINT fk_groupes_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE groupe_membres (
  groupe_id  BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  ajoute_le  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (groupe_id, contact_id),
  KEY ix_gm_contact (contact_id),
  CONSTRAINT fk_gm_groupe FOREIGN KEY (groupe_id)
    REFERENCES groupes (id) ON DELETE CASCADE,
  CONSTRAINT fk_gm_contact FOREIGN KEY (contact_id)
    REFERENCES contacts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ═══════════════════════════════════════════════════════════════
-- MÉCANISME 1 — RDV BILATÉRAL (négociation, 3 créneaux)
-- Tables distinctes du mécanisme groupe, conformément à la spec.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE rdv (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisateur_id  BIGINT UNSIGNED NOT NULL,
  contact_id       BIGINT UNSIGNED NULL,
  invite_compte_id BIGINT UNSIGNED NULL COMMENT 'Si le destinataire est inscrit',
  titre            VARCHAR(200)    NULL,
  lieu             VARCHAR(255)    NULL,
  statut           ENUM('attente','choisi','refuse','expire','annule') NOT NULL DEFAULT 'attente',
  cree_le          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  repondu_le       DATETIME        NULL,
  PRIMARY KEY (id),
  KEY ix_rdv_organisateur (organisateur_id),
  KEY ix_rdv_contact (contact_id),
  KEY ix_rdv_invite (invite_compte_id),
  KEY ix_rdv_statut (statut),
  CONSTRAINT fk_rdv_organisateur FOREIGN KEY (organisateur_id)
    REFERENCES comptes (id) ON DELETE CASCADE,
  CONSTRAINT fk_rdv_contact FOREIGN KEY (contact_id)
    REFERENCES contacts (id) ON DELETE SET NULL,
  CONSTRAINT fk_rdv_invite FOREIGN KEY (invite_compte_id)
    REFERENCES comptes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE rdv_creneaux (
  id      BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  rdv_id  BIGINT UNSIGNED  NOT NULL,
  rang    TINYINT UNSIGNED NOT NULL COMMENT '1 a 3',
  debut   DATETIME         NOT NULL,
  fin     DATETIME         NOT NULL,
  libelle VARCHAR(120)     NULL,
  retenu  TINYINT(1)       NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_creneaux_rdv_rang (rdv_id, rang),
  CONSTRAINT ck_creneaux_ordre CHECK (fin > debut),
  CONSTRAINT fk_creneaux_rdv FOREIGN KEY (rdv_id)
    REFERENCES rdv (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- Lien public a usage unique — contact sans application.
-- prenom_organisateur uniquement : jamais le nom de famille.
CREATE TABLE rdv_liens (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rdv_id              BIGINT UNSIGNED NOT NULL,
  jeton_hash          CHAR(64)        NOT NULL COMMENT 'SHA-256 du jeton ; le jeton en clair nexiste que dans URL',
  prenom_organisateur VARCHAR(100)    NOT NULL,
  prenom_destinataire VARCHAR(100)    NULL,
  canal               ENUM('sms','email','whatsapp') NOT NULL,
  statut              ENUM('attente','choisi','refuse','expire') NOT NULL DEFAULT 'attente',
  choix_rang          TINYINT         NULL COMMENT '1 a 3, ou -1 = aucun ne convient',
  cree_le             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le           DATETIME        NOT NULL,
  utilise_le          DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_liens_jeton (jeton_hash),
  KEY ix_liens_rdv (rdv_id),
  KEY ix_liens_expire (expire_le),
  CONSTRAINT fk_liens_rdv FOREIGN KEY (rdv_id)
    REFERENCES rdv (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ═══════════════════════════════════════════════════════════════
-- MÉCANISME 2 — CONVOCATION GROUPE (horaire impose, Present/Absent)
-- Aucune table de créneaux : un seul horaire, pas de négociation.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE convocations (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisateur_id BIGINT UNSIGNED NOT NULL,
  groupe_id       BIGINT UNSIGNED NULL,
  titre           VARCHAR(200)    NOT NULL,
  lieu            VARCHAR(255)    NULL,
  debut           DATETIME        NOT NULL,
  fin             DATETIME        NOT NULL,
  statut          ENUM('active','annulee','passee') NOT NULL DEFAULT 'active',
  cree_le         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_conv_organisateur (organisateur_id),
  KEY ix_conv_groupe (groupe_id),
  CONSTRAINT ck_conv_ordre CHECK (fin > debut),
  CONSTRAINT fk_conv_organisateur FOREIGN KEY (organisateur_id)
    REFERENCES comptes (id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_groupe FOREIGN KEY (groupe_id)
    REFERENCES groupes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- Une ligne par destinataire. Le décompte de l'organisateur
-- (« 12 Presents / 2 Absents / 1 sans reponse ») est un simple
-- GROUP BY sur reponse, sans compteur dénormalisé a maintenir.
CREATE TABLE convocation_reponses (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  convocation_id BIGINT UNSIGNED NOT NULL,
  contact_id     BIGINT UNSIGNED NULL,
  compte_id      BIGINT UNSIGNED NULL COMMENT 'Si le destinataire est inscrit',
  reponse        ENUM('sans_reponse','present','absent') NOT NULL DEFAULT 'sans_reponse',
  repondu_le     DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_conv_rep (convocation_id, contact_id),
  KEY ix_conv_rep_compte (compte_id),
  KEY ix_conv_rep_reponse (convocation_id, reponse),
  CONSTRAINT fk_conv_rep_conv FOREIGN KEY (convocation_id)
    REFERENCES convocations (id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_rep_contact FOREIGN KEY (contact_id)
    REFERENCES contacts (id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_rep_compte FOREIGN KEY (compte_id)
    REFERENCES comptes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
