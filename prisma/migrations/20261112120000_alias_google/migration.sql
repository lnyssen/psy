-- Titres Google déjà rattachés à un patient : les suivants le sont d'eux-mêmes.
CREATE TABLE "alias_google" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "cabinet_id" TEXT,
    "participants" "Participants" NOT NULL DEFAULT 'INDIVIDUELLE',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alias_google_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alias_google_cle_key" ON "alias_google"("cle");
CREATE INDEX "alias_google_patient_id_idx" ON "alias_google"("patient_id");

ALTER TABLE "alias_google" ADD CONSTRAINT "alias_google_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alias_google" ADD CONSTRAINT "alias_google_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
