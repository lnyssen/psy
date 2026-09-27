-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('LOYER', 'ASSURANCE', 'FORMATION', 'MATERIEL', 'COMPTABLE', 'DEPLACEMENT', 'COTISATIONS', 'AUTRE');

-- AlterTable
ALTER TABLE "cabinets" ADD COLUMN     "facture_institution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quota_hebdo_min" INTEGER,
ADD COLUMN     "tarif_horaire_cents" INTEGER;

-- CreateTable
CREATE TABLE "depenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "fournisseur" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "cabinet_id" TEXT,
    "photo" BYTEA,
    "photo_mime" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "depenses_date_idx" ON "depenses"("date");

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
