-- Catégories de dépenses : d'une énumération figée à une table éditable
-- depuis Réglages (comme les cabinets et les tarifs).

CREATE TABLE "categories_depense" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_depense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_depense_libelle_key" ON "categories_depense"("libelle");

-- Une catégorie par valeur de l'ancienne énumération, dans l'ordre où elles
-- étaient présentées jusqu'ici.
INSERT INTO "categories_depense" ("id", "libelle", "ordre") VALUES
    ('cat-loyer', 'Loyer', 0),
    ('cat-assurance', 'Assurance', 1),
    ('cat-formation', 'Formation', 2),
    ('cat-materiel', 'Matériel', 3),
    ('cat-comptable', 'Comptable', 4),
    ('cat-deplacement', 'Déplacement', 5),
    ('cat-cotisations', 'Cotisations sociales', 6),
    ('cat-autre', 'Autre', 7);

-- La colonne nouvelle, nullable le temps de reporter les valeurs existantes.
ALTER TABLE "depenses" ADD COLUMN "categorie_id" TEXT;

UPDATE "depenses" SET "categorie_id" = CASE "categorie"
    WHEN 'LOYER' THEN 'cat-loyer'
    WHEN 'ASSURANCE' THEN 'cat-assurance'
    WHEN 'FORMATION' THEN 'cat-formation'
    WHEN 'MATERIEL' THEN 'cat-materiel'
    WHEN 'COMPTABLE' THEN 'cat-comptable'
    WHEN 'DEPLACEMENT' THEN 'cat-deplacement'
    WHEN 'COTISATIONS' THEN 'cat-cotisations'
    ELSE 'cat-autre'
END;

ALTER TABLE "depenses" ALTER COLUMN "categorie_id" SET NOT NULL;
ALTER TABLE "depenses" DROP COLUMN "categorie";

DROP TYPE "CategorieDepense";

ALTER TABLE "depenses" ADD CONSTRAINT "depenses_categorie_id_fkey"
    FOREIGN KEY ("categorie_id") REFERENCES "categories_depense"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
