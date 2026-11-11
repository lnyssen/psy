-- CreateEnum
CREATE TYPE "Participants" AS ENUM ('INDIVIDUELLE', 'AVEC_PERE', 'AVEC_MERE', 'AVEC_PARENTS');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "ppl_periodes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "premiere_seance_le" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "participants" "Participants" NOT NULL DEFAULT 'INDIVIDUELLE';
