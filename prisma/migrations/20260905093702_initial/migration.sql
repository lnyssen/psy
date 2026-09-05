-- CreateEnum
CREATE TYPE "CareScheme" AS ENUM ('CONVENTIONNE', 'PRIVE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'CANCELLED_IN_TIME', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "scheme" "CareScheme" NOT NULL,
    "fee_cents" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 50,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'DUE',
    "amount_cents" INTEGER,
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "sessions_starts_at_idx" ON "sessions"("starts_at");

-- CreateIndex
CREATE INDEX "sessions_patient_id_starts_at_idx" ON "sessions"("patient_id", "starts_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
