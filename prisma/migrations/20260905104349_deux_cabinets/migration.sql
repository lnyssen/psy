-- CreateEnum
CREATE TYPE "Office" AS ENUM ('UCCLE', 'AUDERGHEM');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "usual_office" "Office";

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "office" "Office" NOT NULL DEFAULT 'UCCLE';
