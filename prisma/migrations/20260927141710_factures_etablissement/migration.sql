-- AlterTable
ALTER TABLE "parametres" ADD COLUMN     "delai_paiement_jours" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "numero_entreprise" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "facture_id" TEXT;

-- CreateTable
CREATE TABLE "factures_etablissement" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "heures_totales_min" INTEGER NOT NULL,
    "tarif_horaire_cents" INTEGER NOT NULL,
    "montant_cents" INTEGER NOT NULL,
    "emise_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "echeance_le" TIMESTAMP(3) NOT NULL,
    "payee_le" TIMESTAMP(3),

    CONSTRAINT "factures_etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factures_etablissement_cabinet_id_annee_mois_idx" ON "factures_etablissement"("cabinet_id", "annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "factures_etablissement_annee_numero_key" ON "factures_etablissement"("annee", "numero");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "factures_etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_etablissement" ADD CONSTRAINT "factures_etablissement_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
