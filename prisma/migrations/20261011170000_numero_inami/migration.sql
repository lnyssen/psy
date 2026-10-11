-- N° INAMI de la praticienne : reçu patient et mentions légales du site.
ALTER TABLE "parametres" ADD COLUMN "numero_inami" TEXT;

-- Valeur connue ; ne remplit que si le champ est vide.
UPDATE "parametres" SET "numero_inami" = '703768-64' WHERE "id" = 'global' AND "numero_inami" IS NULL;
