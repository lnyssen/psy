-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "duree_seance_min" INTEGER NOT NULL DEFAULT 45,
    "battement_min" INTEGER NOT NULL DEFAULT 0,
    "trajet_min" INTEGER NOT NULL DEFAULT 30,
    "pas_min" INTEGER NOT NULL DEFAULT 15,
    "horizon_semaines" INTEGER NOT NULL DEFAULT 4,
    "chainer_seances" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

