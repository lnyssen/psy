-- Plafond INAMI selon la convention de 2024 : type de prise en charge et réseau.
CREATE TYPE "PplType" AS ENUM ('SOUTIEN', 'TRAITEMENT');
CREATE TYPE "PplReseau" AS ENUM ('ENFANTS', 'ADULTES');
ALTER TABLE "patients" ADD COLUMN "ppl_type" "PplType" NOT NULL DEFAULT 'SOUTIEN';
ALTER TABLE "patients" ADD COLUMN "ppl_reseau" "PplReseau";

-- Séance à distance.
ALTER TABLE "sessions" ADD COLUMN "visio" BOOLEAN NOT NULL DEFAULT false;
