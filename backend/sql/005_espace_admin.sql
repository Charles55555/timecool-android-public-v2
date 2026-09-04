-- ═══════════════════════════════════════════════════════════════
-- 005 — Espace administrateur : liste des inscrits et blocage
--
-- La liste des inscrits vivait dans le localStorage de l'appareil qui
-- faisait l'inscription : elle ne pouvait contenir que les comptes crees
-- sur CET appareil-la. Deux personnes inscrites depuis leur propre
-- telephone n'y figuraient jamais.
--
-- BLOCAGE — il passe par cloture_le, la colonne que la connexion, la
-- connexion Google, la verification de session et la recherche de
-- contacts consultent deja : rien a ajouter ailleurs, donc rien a
-- oublier. bloque_le note que la fermeture vient de l'administrateur et
-- non de la personne — sans quoi un deblocage rouvrirait un compte clos
-- par son proprietaire.
--
-- Le PREMIER administrateur se pose a la main — il en faut un pour en
-- designer d'autres :
--     UPDATE comptes SET admin = 1 WHERE reference = '...';
-- Les suivants se donnent depuis l'application, sans SQL.
--
-- PROVENANCE — pas de colonne a ajouter ici : 001_schema_initial.sql
-- declare deja `provenance` et `provenance_detail`. La base de
-- production, elle, avait ete creee AVANT leur ajout au fichier : elles
-- y manquaient, et POST /compte/provenance ecrivait donc dans le vide
-- depuis des semaines. Elles ont ete ajoutees a la main le 03/09/2026
-- pour rattraper l'ecart. Une installation neuve n'a rien a faire.
--
--     ALTER TABLE comptes
--       ADD COLUMN provenance VARCHAR(40) NULL,
--       ADD COLUMN provenance_detail VARCHAR(200) NULL;
--
-- Lecon : rejouer toute la chaine de migrations sur une base jetable
-- avant de la livrer. C'est ce qui a revele cet ecart.
--
-- Applique le 03/09/2026 sur timecool_prod.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE comptes
  ADD COLUMN admin TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Acces a la liste des inscrits',
  ADD COLUMN bloque_le DATETIME NULL
    COMMENT 'Blocage administrateur, reversible — cloture_le est pose en meme temps';
