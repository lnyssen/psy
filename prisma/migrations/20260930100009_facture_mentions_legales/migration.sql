-- AlterTable
ALTER TABLE "cabinets" ADD COLUMN     "mention_legale_client" TEXT,
ADD COLUMN     "prefixe_reference" TEXT,
ADD COLUMN     "raison_sociale" TEXT;

-- AlterTable
ALTER TABLE "parametres" ADD COLUMN     "adresse_siege" TEXT,
ADD COLUMN     "mention_legale" TEXT;
