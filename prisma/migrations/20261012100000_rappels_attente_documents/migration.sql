-- Rappels et annulation par le patient, anonymisation, liste d'attente et
-- documents joints chiffrés.
ALTER TABLE "patients" ADD COLUMN "rappels_email" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "patients" ADD COLUMN "anonymise_at" TIMESTAMP(3);

ALTER TABLE "sessions" ADD COLUMN "rappel_envoye_at" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "jeton_public" TEXT;
CREATE UNIQUE INDEX "sessions_jeton_public_key" ON "sessions"("jeton_public");

ALTER TABLE "parametres" ADD COLUMN "nouveaux_patients" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "parametres" ADD COLUMN "nouveaux_patients_message" TEXT;

CREATE TABLE "attente_rdv" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attente_rdv_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "attente_rdv_active_created_at_idx" ON "attente_rdv"("active", "created_at");

CREATE TABLE "documents_patient" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "contenu" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_patient_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "documents_patient_patient_id_idx" ON "documents_patient"("patient_id");
ALTER TABLE "documents_patient" ADD CONSTRAINT "documents_patient_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
