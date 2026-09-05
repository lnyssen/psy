-- CreateEnum
CREATE TYPE "DemandeStatut" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'REFUSEE');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "jeton_rdv" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "reservee_en_ligne" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "disponibilites" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "debut_min" INTEGER NOT NULL,
    "fin_min" INTEGER NOT NULL,

    CONSTRAINT "disponibilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indisponibilites" (
    "id" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,

    CONSTRAINT "indisponibilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_rdv" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "souhaite" TIMESTAMP(3) NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "statut" "DemandeStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demandes_rdv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disponibilites_cabinet_id_jour_idx" ON "disponibilites"("cabinet_id", "jour");

-- CreateIndex
CREATE INDEX "indisponibilites_debut_fin_idx" ON "indisponibilites"("debut", "fin");

-- CreateIndex
CREATE INDEX "demandes_rdv_statut_souhaite_idx" ON "demandes_rdv"("statut", "souhaite");

-- CreateIndex
CREATE UNIQUE INDEX "patients_jeton_rdv_key" ON "patients"("jeton_rdv");

-- AddForeignKey
ALTER TABLE "disponibilites" ADD CONSTRAINT "disponibilites_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_rdv" ADD CONSTRAINT "demandes_rdv_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

