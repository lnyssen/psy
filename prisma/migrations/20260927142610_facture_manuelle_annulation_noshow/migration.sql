-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'NO_SHOW_ANNULE';

-- AlterTable
ALTER TABLE "factures_etablissement" ADD COLUMN     "annulee_le" TIMESTAMP(3),
ADD COLUMN     "libelle" TEXT,
ADD COLUMN     "manuelle" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "heures_totales_min" DROP NOT NULL,
ALTER COLUMN "tarif_horaire_cents" DROP NOT NULL;
