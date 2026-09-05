-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ELECTRONIC');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "postal_code" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "receipt_at" TIMESTAMP(3),
ALTER COLUMN "duration_min" SET DEFAULT 45;

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_patient_id_created_at_idx" ON "notes"("patient_id", "created_at");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
