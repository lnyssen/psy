import { prisma } from "@/lib/db";

export type Parametres = {
  dureeSeanceMin: number;
  battementMin: number;
  trajetMin: number;
  pasMin: number;
  horizonSemaines: number;
  chainerSeances: boolean;
};

const PAR_DEFAUT: Parametres = {
  dureeSeanceMin: 45,
  battementMin: 0,
  trajetMin: 30,
  pasMin: 15,
  horizonSemaines: 4,
  chainerSeances: true,
};

/** Les paramètres tiennent en une ligne, créée à la volée si elle manque : on
 *  ne veut pas qu'un déploiement neuf tombe faute d'enregistrement. */
export async function parametres(): Promise<Parametres> {
  const p = await prisma.parametres.findUnique({ where: { id: "global" } });
  if (p) return p;
  return prisma.parametres.create({ data: { id: "global", ...PAR_DEFAUT } });
}
