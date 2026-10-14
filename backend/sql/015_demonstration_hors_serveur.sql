-- Mission 42 (14/10/2026) : les rendez-vous de démonstration (demo_1, demo_2, demo_3) restent sur l appareil.
-- Les comptes d avant les avaient poussés dans `elements` (27 comptes le 14/10, aucun lien Google sur ces uid).
-- Rejouable : sans effet une fois les lignes parties. Les applications à jour ignorent ces uid de toute façon ;
-- une ancienne application les garde en local (rien ne lui est annoncé comme supprimé).
-- À jouer seulement sur le « ok » du chef de projet.
DELETE FROM elements WHERE type = 'rdv' AND uid IN ('demo_1', 'demo_2', 'demo_3');
