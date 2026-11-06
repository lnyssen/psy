-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "father_first_name" TEXT,
ADD COLUMN     "father_last_name" TEXT,
ADD COLUMN     "mother_first_name" TEXT,
ADD COLUMN     "mother_last_name" TEXT,
ADD COLUMN     "ppl_anterieures_le" TIMESTAMP(3),
ADD COLUMN     "ppl_seances_anterieures" INTEGER NOT NULL DEFAULT 0;
