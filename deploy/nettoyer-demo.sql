-- Repère et supprime les données de démonstration semées par prisma/seed.ts.
-- Lancé par deploy/nettoyer-demo.sh, jamais à la main : la variable executer
-- vaut 0 (aperçu, tout est annulé à la fin) ou 1 (suppression validée).
--
-- Chaque critère reprend exactement une valeur du seed : rien n'est supprimé
-- « par défaut ». Les deux vrais cabinets, les tarifs, les horaires
-- d'ouverture, les paramètres, les catégories et Google Agenda ne sont pas
-- touchés.
\set ON_ERROR_STOP on
\pset footer off
BEGIN;

-- Les six patients fictifs du seed, par prénom et nom exacts.
CREATE TEMP TABLE demo_patients AS
  SELECT id, first_name, last_name, email FROM patients
  WHERE (first_name, last_name) IN (VALUES
    ('Camille', 'Dubois'), ('Thomas', 'Lefèvre'), ('Naïma', 'Ben Salah'),
    ('Jonas', 'Vermeulen'), ('Élise', 'Moreau'), ('Malik', 'Haddad'));

-- Le lieu « École » fictif, reconnu à sa raison sociale inventée. S'il a été
-- renommé avec de vraies coordonnées, il n'est plus reconnu et reste en place.
CREATE TEMP TABLE demo_ecole AS
  SELECT id FROM cabinets WHERE nom = 'École' AND raison_sociale = 'École du Verger ASBL';

-- Séances des patients fictifs, et blocs sans patient de l'école fictive.
-- Une séance d'un vrai patient à l'école n'est pas visée : dans ce cas la
-- suppression du lieu échoue et tout est annulé.
CREATE TEMP TABLE demo_sessions AS
  SELECT id, patient_id, cabinet_id, starts_at, status, google_event_id FROM sessions
  WHERE patient_id IN (SELECT id FROM demo_patients)
     OR (patient_id IS NULL AND cabinet_id IN (SELECT id FROM demo_ecole));

CREATE TEMP TABLE demo_factures AS
  SELECT id, annee, numero, mois, montant_cents, payee_le FROM factures_etablissement
  WHERE cabinet_id IN (SELECT id FROM demo_ecole);

CREATE TEMP TABLE demo_demandes AS
  SELECT id, first_name, last_name, souhaite FROM demandes_rdv
  WHERE email = 'sophie.delvaux@example.be' OR (first_name = 'Sophie' AND last_name = 'Delvaux');

-- Les deux dépenses du seed, sans photo (le seed n'en joint jamais).
CREATE TEMP TABLE demo_depenses AS
  SELECT id, date, libelle, amount_cents FROM depenses
  WHERE photo IS NULL AND (
       (libelle = 'Assurance RC professionnelle' AND amount_cents = 42000)
    OR (libelle = 'Loyer du mois — Uccle' AND amount_cents = 85000));

-- Le congé fictif : motif « Congé », exactement sept jours, de minuit à minuit.
CREATE TEMP TABLE demo_conges AS
  SELECT id, debut, fin FROM indisponibilites
  WHERE motif = 'Congé' AND fin - debut = interval '7 days'
    AND debut::time = '00:00' AND fin::time = '00:00';

\echo
\echo '=== Patients fictifs (leurs notes et séances partent avec eux)'
SELECT p.first_name || ' ' || p.last_name AS patient, coalesce(p.email, '') AS email,
       (SELECT count(*) FROM sessions s WHERE s.patient_id = p.id) AS seances,
       (SELECT count(*) FROM notes n WHERE n.patient_id = p.id) AS notes
FROM demo_patients p ORDER BY p.last_name;

\echo '=== Séances visées, par lieu et statut'
SELECT c.nom AS lieu, d.status AS statut, count(*) AS seances,
       to_char(min(d.starts_at), 'DD/MM/YYYY') AS du, to_char(max(d.starts_at), 'DD/MM/YYYY') AS au
FROM demo_sessions d JOIN cabinets c ON c.id = d.cabinet_id
GROUP BY c.nom, d.status ORDER BY c.nom, d.status;

\echo '=== Séances visées déjà envoyées dans Google Agenda (à effacer aussi côté Google)'
SELECT count(*) AS dans_google FROM demo_sessions WHERE google_event_id IS NOT NULL;

\echo '=== Lieu « École du Verger ASBL » (fictif), avec ses horaires d''ouverture'
SELECT c.nom, c.raison_sociale, c.address_line,
       (SELECT count(*) FROM disponibilites x WHERE x.cabinet_id = c.id) AS plages
FROM cabinets c WHERE c.id IN (SELECT id FROM demo_ecole);

\echo '=== Factures adressées à l''école fictive'
SELECT annee || '/' || lpad(numero::text, 3, '0') AS numero, mois,
       to_char(montant_cents / 100.0, 'FM999990.00') || ' €' AS montant,
       CASE WHEN payee_le IS NULL THEN 'non' ELSE 'oui' END AS payee
FROM demo_factures ORDER BY annee, numero;

\echo '=== Demande de rendez-vous fictive'
SELECT first_name || ' ' || last_name AS demande, to_char(souhaite, 'DD/MM/YYYY HH24:MI') AS souhaitee
FROM demo_demandes;

\echo '=== Dépenses fictives'
SELECT to_char(date, 'DD/MM/YYYY') AS date, libelle,
       to_char(amount_cents / 100.0, 'FM999990.00') || ' €' AS montant
FROM demo_depenses ORDER BY date;

\echo '=== Congé fictif'
SELECT to_char(debut, 'DD/MM/YYYY') AS du, to_char(fin, 'DD/MM/YYYY') AS au FROM demo_conges;

\echo '=== Ce qui RESTE après nettoyage'
SELECT
  (SELECT count(*) FROM patients WHERE id NOT IN (SELECT id FROM demo_patients)) AS patients,
  (SELECT count(*) FROM sessions WHERE id NOT IN (SELECT id FROM demo_sessions)) AS seances,
  (SELECT count(*) FROM depenses WHERE id NOT IN (SELECT id FROM demo_depenses)) AS depenses,
  (SELECT count(*) FROM factures_etablissement WHERE id NOT IN (SELECT id FROM demo_factures)) AS factures,
  (SELECT count(*) FROM demandes_rdv WHERE id NOT IN (SELECT id FROM demo_demandes)) AS demandes,
  (SELECT count(*) FROM cabinets WHERE id NOT IN (SELECT id FROM demo_ecole)) AS lieux;

\echo '=== Patients conservés'
SELECT first_name || ' ' || last_name AS patient FROM patients
WHERE id NOT IN (SELECT id FROM demo_patients) ORDER BY last_name;

\echo '=== Dépenses conservées'
SELECT to_char(date, 'DD/MM/YYYY') AS date, libelle,
       to_char(amount_cents / 100.0, 'FM999990.00') || ' €' AS montant
FROM depenses WHERE id NOT IN (SELECT id FROM demo_depenses) ORDER BY date;

-- Suppression, dans l'ordre imposé par les clés étrangères. Les notes
-- suivent leurs patients (cascade), les horaires suivent le lieu.
DELETE FROM sessions WHERE id IN (SELECT id FROM demo_sessions);
DELETE FROM patients WHERE id IN (SELECT id FROM demo_patients);
DELETE FROM factures_etablissement WHERE id IN (SELECT id FROM demo_factures);
DELETE FROM demandes_rdv WHERE id IN (SELECT id FROM demo_demandes);
DELETE FROM depenses WHERE id IN (SELECT id FROM demo_depenses);
DELETE FROM indisponibilites WHERE id IN (SELECT id FROM demo_conges);
DELETE FROM cabinets WHERE id IN (SELECT id FROM demo_ecole);

\if :executer
COMMIT;
\echo
\echo 'Suppression validée.'
\else
ROLLBACK;
\echo
\echo 'APERÇU SEULEMENT : rien n''a été supprimé.'
\endif
