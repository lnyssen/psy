-- Accès à l'outil : mot de passe modifiable, adresse de récupération, appareils
-- enregistrés (Face ID, Touch ID…) et liens de réinitialisation.
CREATE TABLE "acces" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "password_hash" TEXT,
    "recovery_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys"("credential_id");

CREATE TABLE "reinitialisations_mdp" (
    "id" TEXT NOT NULL,
    "jeton_hash" TEXT NOT NULL,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "utilise_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reinitialisations_mdp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reinitialisations_mdp_jeton_hash_key" ON "reinitialisations_mdp"("jeton_hash");
