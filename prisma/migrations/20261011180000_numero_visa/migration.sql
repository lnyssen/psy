-- N° de visa (SPF Santé publique) : pied de page, mentions légales et reçu patient.
ALTER TABLE "parametres" ADD COLUMN "numero_visa" TEXT;

-- Valeur connue ; ne remplit que si le champ est vide.
UPDATE "parametres" SET "numero_visa" = '279757' WHERE "id" = 'global' AND "numero_visa" IS NULL;
