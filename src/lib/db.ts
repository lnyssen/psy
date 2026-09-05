import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Une seule instance en développement : le rechargement à chaud de Next
// rouvrirait sinon un pool de connexions à chaque édition, et Neon compte les
// connexions.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est absente. En local, renseignez .env.local ; sur Vercel, les variables du projet.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
