import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

// Next lit .env.local tout seul, pas la CLI Prisma : on le charge donc
// explicitement ici, avant .env, pour que les migrations voient les mêmes
// variables que l'application.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// DIRECT_URL cible la connexion non poolée de Neon, exigée par les migrations ;
// DATABASE_URL passe par le pooler et sert à l'application.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // Pas de seed déclaré ici : `prisma migrate reset` le lancerait d'office, et
  // le seed de démonstration vide toutes les tables. Il se lance à la main,
  // en local seulement (voir prisma/seed.ts).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
