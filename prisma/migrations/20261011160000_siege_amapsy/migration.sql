-- Identité légale de la SRL, reprise sur le site (mentions légales) et sur les
-- factures. Ne remplit que les champs encore vides : ce qu'Amandine a saisi
-- dans les réglages n'est jamais écrasé.
UPDATE "parametres"
SET "numero_entreprise" = COALESCE(NULLIF("numero_entreprise", ''), 'BE 1037.929.296'),
    "adresse_siege" = COALESCE(NULLIF("adresse_siege", ''), E'Rue Victor Allard 191\n1180 Uccle')
WHERE "id" = 'global';
