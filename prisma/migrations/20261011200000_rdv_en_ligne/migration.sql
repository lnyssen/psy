-- Interrupteur des rendez-vous en ligne (ouvert par défaut) et message de fermeture.
ALTER TABLE "parametres" ADD COLUMN "rdv_en_ligne" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "parametres" ADD COLUMN "rdv_message" TEXT;
