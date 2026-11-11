ALTER TABLE "patients" ADD COLUMN "lien_parent_1" TEXT NOT NULL DEFAULT 'mère';
ALTER TABLE "patients" ADD COLUMN "lien_parent_2" TEXT NOT NULL DEFAULT 'père';
