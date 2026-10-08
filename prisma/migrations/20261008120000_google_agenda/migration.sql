-- CreateEnum
CREATE TYPE "StatutEvenementGoogle" AS ENUM ('A_RATTACHER', 'OCCUPE', 'IGNORE');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "google_empreinte" TEXT,
ADD COLUMN     "google_etag" TEXT,
ADD COLUMN     "google_event_id" TEXT;

-- CreateTable
CREATE TABLE "google_connexions" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "email" TEXT NOT NULL,
    "refresh_token_chiffre" TEXT NOT NULL,
    "calendrier_id" TEXT NOT NULL DEFAULT 'primary',
    "sync_token" TEXT,
    "derniere_synchro" TIMESTAMP(3),
    "derniere_erreur" TEXT,
    "verrou_jusqua" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_connexions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements_google" (
    "id" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "etag" TEXT,
    "titre" TEXT NOT NULL,
    "lieu" TEXT,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutEvenementGoogle" NOT NULL DEFAULT 'A_RATTACHER',
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evenements_google_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evenements_google_google_id_key" ON "evenements_google"("google_id");

-- CreateIndex
CREATE INDEX "evenements_google_debut_idx" ON "evenements_google"("debut");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_google_event_id_key" ON "sessions"("google_event_id");

