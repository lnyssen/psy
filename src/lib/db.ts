import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { COOKIE_SESSION, roleDuJeton } from "@/lib/session";

/**
 * Accès à la base, avec une base à part pour le développeur.
 *
 * Deux personnes se connectent à l'outil : Amandine, sur ses vraies données,
 * et la personne qui le développe, qui doit pouvoir tout essayer sans jamais
 * voir un patient ni un chiffre réel. Masquer les données écran par écran
 * laisserait fuir la première page oubliée ; on sépare donc à la source. Une
 * session « développeur » (voir lib/session.ts) parle à une autre base,
 * DATABASE_URL_DEMO, remplie de données fictives. Le code est le même pour les
 * deux, et aucune requête ne choisit sa base : c'est ce module qui le fait.
 *
 * Concrètement, `prisma` est un intermédiaire : `prisma.patient.findMany(…)`
 * ne part vers une base qu'au moment où on l'attend, après lecture du cookie
 * de session. Hors requête (tâches planifiées, scripts) ou sans session
 * développeur, c'est la base réelle, comme avant.
 */

// Une seule instance par base en développement : le rechargement à chaud de
// Next rouvrirait sinon un pool de connexions à chaque édition.
const globalForPrisma = globalThis as unknown as { clientsPrisma?: Map<string, PrismaClient> };
const clients = globalForPrisma.clientsPrisma ?? new Map<string, PrismaClient>();
if (process.env.NODE_ENV !== "production") globalForPrisma.clientsPrisma = clients;

function client(connectionString: string) {
  let c = clients.get(connectionString);
  if (!c) {
    c = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    clients.set(connectionString, c);
  }
  return c;
}

function clientReel() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est absente. En local, renseignez .env.local.");
  }
  return client(url);
}

/** Le mode développeur n'existe que si sa base est configurée. */
export function modeDeveloppeurDisponible() {
  return Boolean(process.env.DATABASE_URL_DEMO && process.env.AUTH_DEV_PASSWORD_HASH_B64);
}

/** La session en cours est-elle celle du développeur ? */
export async function sessionDeveloppeur() {
  try {
    const { cookies } = await import("next/headers");
    return (await roleDuJeton((await cookies()).get(COOKIE_SESSION)?.value)) === "developpeur";
  } catch {
    // Hors requête : pas de session, donc pas de développeur.
    return false;
  }
}

async function clientCourant() {
  if (!(await sessionDeveloppeur())) return clientReel();
  // Jamais de repli sur la base réelle pour une session développeur : sans
  // base fictive, la requête échoue.
  const demo = process.env.DATABASE_URL_DEMO;
  if (!demo) throw new Error("Session développeur sans DATABASE_URL_DEMO : accès refusé.");
  return client(demo);
}

// --- L'intermédiaire ----------------------------------------------------------

type Client = PrismaClient;
const EXECUTER = Symbol("executer");

/**
 * Une requête différée, comme les PrismaPromise : rien ne part tant qu'on ne
 * l'attend pas, et $transaction([…]) peut la reconstruire sur la bonne base.
 */
function differee<T>(construire: (c: Client) => PromiseLike<T>) {
  let resultat: Promise<T> | undefined;
  const lancer = () => (resultat ??= clientCourant().then((c) => construire(c)));
  return {
    [EXECUTER]: construire,
    then<A = T, B = never>(ok?: (v: T) => A | PromiseLike<A>, ko?: (e: unknown) => B | PromiseLike<B>) {
      return lancer().then(ok, ko);
    },
    catch<B = never>(ko?: (e: unknown) => B | PromiseLike<B>) {
      return lancer().catch(ko);
    },
    finally(f?: () => void) {
      return lancer().finally(f);
    },
    [Symbol.toStringTag]: "PrismaPromise",
  };
}

type Differee = ReturnType<typeof differee>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Quelconque = any;

const racine = new Proxy({} as Record<string | symbol, unknown>, {
  get(_, cle) {
    if (typeof cle !== "string" || cle === "then") return undefined;
    if (cle === "$transaction") {
      return (arg: Quelconque, options?: Quelconque) =>
        differee((c) =>
          Array.isArray(arg)
            ? c.$transaction(
                (arg as Differee[]).map((d) => d[EXECUTER](c) as Quelconque),
                options,
              )
            : c.$transaction(arg, options),
        );
    }
    if (cle.startsWith("$")) {
      return (...args: unknown[]) => differee((c) => (c as Quelconque)[cle](...args));
    }
    // Un modèle : prisma.patient.findMany(…)
    return new Proxy({} as Record<string | symbol, unknown>, {
      get(__, methode) {
        if (typeof methode !== "string" || methode === "then") return undefined;
        return (...args: unknown[]) =>
          differee((c) => (c as Quelconque)[cle][methode](...args));
      },
    });
  },
});

export const prisma = racine as unknown as PrismaClient;
