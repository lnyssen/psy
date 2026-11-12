-- Chaque base reçoit son propre identifiant : une copie de la base (ancienne
-- instance, restauration) ne peut plus supprimer les événements de l'autre.
ALTER TABLE "google_connexions" ADD COLUMN "instance" TEXT NOT NULL DEFAULT (gen_random_uuid())::text;
