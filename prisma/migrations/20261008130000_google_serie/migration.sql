-- AlterTable
ALTER TABLE "evenements_google" ADD COLUMN     "serie_id" TEXT;

-- CreateIndex
CREATE INDEX "evenements_google_serie_id_idx" ON "evenements_google"("serie_id");
