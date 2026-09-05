import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma 7 : la CLI lit l'URL ici, l'application la lit dans src/lib/db.ts.
// DIRECT_URL cible la connexion non poolée de Neon, exigée par les migrations ;
// DATABASE_URL passe par le pooler et sert à l'application.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
