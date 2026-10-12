import { prisma } from "@/lib/db";

export type Parametres = {
  dureeSeanceMin: number;
  battementMin: number;
  trajetMin: number;
  pasMin: number;
  horizonSemaines: number;
  chainerSeances: boolean;
  numeroEntreprise: string | null;
  numeroInami: string | null;
  numeroVisa: string | null;
  numeroCommission: string | null;
  rdvEnLigne: boolean;
  rdvMessage: string | null;
  nouveauxPatients: boolean;
  nouveauxPatientsMessage: string | null;
  iban: string | null;
  delaiPaiementJours: number;
  adresseSiege: string | null;
  mentionLegale: string | null;
  accent: string;
};

const PAR_DEFAUT: Parametres = {
  dureeSeanceMin: 45,
  battementMin: 0,
  trajetMin: 30,
  pasMin: 15,
  horizonSemaines: 4,
  chainerSeances: true,
  numeroEntreprise: null,
  numeroInami: null,
  numeroVisa: null,
  numeroCommission: null,
  rdvEnLigne: true,
  rdvMessage: null,
  nouveauxPatients: true,
  nouveauxPatientsMessage: null,
  iban: null,
  delaiPaiementJours: 30,
  adresseSiege: null,
  mentionLegale: null,
  accent: "violet",
};

/** Les paramètres tiennent en une ligne, créée à la volée si elle manque : on
 *  ne veut pas qu'un déploiement neuf tombe faute d'enregistrement. */
export async function parametres(): Promise<Parametres> {
  const p = await prisma.parametres.findUnique({ where: { id: "global" } });
  if (p) return p;
  return prisma.parametres.create({ data: { id: "global", ...PAR_DEFAUT } });
}
