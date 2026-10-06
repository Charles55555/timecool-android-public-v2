-- ═══════════════════════════════════════════════════════
-- 009 — Départ de la synchronisation Google Agenda
--
-- Règle de Charles (07/10/2026) : la synchronisation ne regarde que ce
-- qui est créé ou modifié dans TimeCool APRÈS sa mise en route. Ce qui
-- existait avant ne regarde pas Google Agenda — ni les rendez-vous
-- importés d'un fichier (Google en a déjà l'original : les renvoyer
-- ferait un doublon), ni ceux créés dans TimeCool avant.
--
-- « depuis » est posé quand le compte est relié, et chaque fois que la
-- case « Envoyer » est remise en marche. NULL : les liaisons d'avant
-- cette règle, qui gardent leur comportement.
-- ═══════════════════════════════════════════════════════

ALTER TABLE google_agenda
  ADD COLUMN depuis DATETIME NULL AFTER recopie_le;
