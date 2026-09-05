-- Les cabinets deviennent des données : nom, adresse et couleur cessent d'être
-- figés dans le code. S'y ajoute une grille tarifaire, et un troisième régime
-- pour les prestations facturées à une institution.
--
-- Migration destructrice, assumée : elle vide les séances et les patients.
-- Elle date de la phase de démonstration, où la base ne contient que des
-- données fictives semées par prisma/seed.ts. Ne jamais rejouer un tel schéma
-- une fois de vraies données présentes : il faudrait alors créer la colonne en
-- nullable, la remplir, puis la contraindre.
DELETE FROM "notes";
DELETE FROM "sessions";
DELETE FROM "patients";

-- AlterEnum
ALTER TYPE "CareScheme" ADD VALUE 'INSTITUTION';

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "usual_office",
ADD COLUMN     "cabinet_id" TEXT;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "office",
ADD COLUMN     "cabinet_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Office";

-- CreateTable
CREATE TABLE "cabinets" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "fill_hex" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifs" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "par_defaut" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tarifs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_nom_key" ON "cabinets"("nom");

-- CreateIndex
CREATE INDEX "sessions_cabinet_id_starts_at_idx" ON "sessions"("cabinet_id", "starts_at");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

