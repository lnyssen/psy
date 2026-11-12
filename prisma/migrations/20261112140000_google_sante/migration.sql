-- Santé de la synchronisation Google : de quoi alerter (bandeau, e-mail)
-- quand elle échoue, se bloque ou ne tourne plus.
ALTER TABLE "google_connexions" ADD COLUMN "echecs_consecutifs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "google_connexions" ADD COLUMN "probleme_depuis" TIMESTAMP(3);
ALTER TABLE "google_connexions" ADD COLUMN "bloquee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "google_connexions" ADD COLUMN "alerte_envoyee_le" TIMESTAMP(3);
