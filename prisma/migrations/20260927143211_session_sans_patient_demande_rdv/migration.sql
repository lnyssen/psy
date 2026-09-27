/*
  Warnings:

  - Made the column `phone` on table `demandes_rdv` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "demandes_rdv" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "patient_id" DROP NOT NULL;
