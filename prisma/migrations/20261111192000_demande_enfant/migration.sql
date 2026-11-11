ALTER TABLE "demandes_rdv" ADD COLUMN "enfant_prenom" TEXT;
ALTER TABLE "demandes_rdv" ADD COLUMN "enfant_nom" TEXT;
ALTER TABLE "demandes_rdv" ADD COLUMN "enfant_naissance" TIMESTAMP(3);
ALTER TABLE "demandes_rdv" ADD COLUMN "lien_demandeur" TEXT;
