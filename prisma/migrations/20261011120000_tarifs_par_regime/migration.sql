-- Régime sur chaque tarif, tarif rattaché au patient.
ALTER TABLE "tarifs" ADD COLUMN "regime" "CareScheme" NOT NULL DEFAULT 'PRIVE';
ALTER TABLE "patients" ADD COLUMN "tarif_id" TEXT;

-- Retrait de la valeur INSTITUTION du régime. Aucune ligne ne l'utilise
-- (contrôlé avant : seuls CONVENTIONNE et PRIVE existent) ; si une ligne s'y
-- trouvait, la conversion échouerait plutôt que de la perdre en silence.
BEGIN;
ALTER TABLE "tarifs" ALTER COLUMN "regime" DROP DEFAULT;
CREATE TYPE "CareScheme_new" AS ENUM ('CONVENTIONNE', 'PRIVE');
ALTER TABLE "tarifs" ALTER COLUMN "regime" TYPE "CareScheme_new" USING ("regime"::text::"CareScheme_new");
ALTER TABLE "patients" ALTER COLUMN "scheme" TYPE "CareScheme_new" USING ("scheme"::text::"CareScheme_new");
ALTER TYPE "CareScheme" RENAME TO "CareScheme_old";
ALTER TYPE "CareScheme_new" RENAME TO "CareScheme";
DROP TYPE "public"."CareScheme_old";
ALTER TABLE "tarifs" ALTER COLUMN "regime" SET DEFAULT 'PRIVE';
COMMIT;

ALTER TABLE "patients" ADD CONSTRAINT "patients_tarif_id_fkey" FOREIGN KEY ("tarif_id") REFERENCES "tarifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
