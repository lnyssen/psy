-- Supprime les trois factures de test annulées (2026-001 à 2026-003), à la
-- demande de Laurent (2026-10-11). Lancé par deploy/supprimer-factures-test.sh.
-- Seules ces factures, et seulement si elles sont annulées, sont visées.
-- La numérotation reprend au plus grand numéro restant + 1.
\set ON_ERROR_STOP on
\pset footer off
BEGIN;

CREATE TEMP TABLE visees AS
  SELECT id FROM factures_etablissement
  WHERE annee = 2026 AND numero IN (1, 2, 3) AND annulee_le IS NOT NULL;

\echo
\echo '=== Toutes les factures (supprimer = oui pour celles qui partent)'
SELECT f.annee || '-' || lpad(f.numero::text, 3, '0') AS numero, c.nom AS lieu,
       coalesce(f.libelle, '') AS libelle,
       to_char(f.montant_cents / 100.0, 'FM999990.00') || ' €' AS montant,
       CASE WHEN f.annulee_le IS NULL THEN '' ELSE 'annulée' END AS etat,
       CASE WHEN f.id IN (SELECT id FROM visees) THEN 'oui' ELSE '' END AS supprimer
FROM factures_etablissement f JOIN cabinets c ON c.id = f.cabinet_id
ORDER BY f.annee, f.numero;

-- Les séances éventuellement liées repassent à facture_id nul (ON DELETE SET NULL).
DELETE FROM factures_etablissement WHERE id IN (SELECT id FROM visees);

\if :executer
COMMIT;
\echo
\echo 'Suppression validée.'
\else
ROLLBACK;
\echo
\echo 'APERÇU SEULEMENT : rien n''a été supprimé.'
\endif
