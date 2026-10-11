-- N° d'inscription à la Commission des psychologues : pied de page, mentions légales, reçu patient.
ALTER TABLE "parametres" ADD COLUMN "numero_commission" TEXT;

-- Valeur connue ; ne remplit que si le champ est vide.
UPDATE "parametres" SET "numero_commission" = '812208391' WHERE "id" = 'global' AND "numero_commission" IS NULL;
