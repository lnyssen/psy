-- Appareils (navigateurs) qui se sont déjà connectés à l'outil : une connexion
-- depuis un appareil inconnu déclenche un e-mail d'alerte. Seule l'empreinte
-- SHA-256 de l'identifiant porté par le cookie est stockée, jamais l'identifiant.
CREATE TABLE "appareils_connus" (
    "id" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "premiere_vue" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_vue" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appareils_connus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appareils_connus_empreinte_key" ON "appareils_connus"("empreinte");
