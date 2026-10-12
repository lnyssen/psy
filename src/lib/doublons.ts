import { prisma } from "@/lib/db";
import { normaliser } from "@/lib/google-correspondance";

/**
 * Fiches patients qui ressemblent à une même personne : même prénom et même
 * nom (casse et accents ignorés, ordre indifférent), ou même numéro national,
 * ou même téléphone avec le même nom de famille. Les trois liens se
 * transmettent : A proche de B et B proche de C font un seul groupe.
 *
 * C'est une aide, pas un verdict : deux homonymes existent. La fusion reste un
 * geste de la praticienne, fiche par fiche.
 */
export type FicheDoublon = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationalNumber: string | null;
  birthDate: Date | null;
  createdAt: Date;
  seances: number;
  derniere: Date | null;
};

const cleNom = (p: { firstName: string; lastName: string }) =>
  [normaliser(p.firstName), normaliser(p.lastName)].sort().join("|");
const chiffres = (t: string | null) => (t ?? "").replace(/\D/g, "");

export async function trouverDoublons(): Promise<FicheDoublon[][]> {
  const patients = await prisma.patient.findMany({
    where: { anonymiseAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nationalNumber: true,
      birthDate: true,
      createdAt: true,
      sessions: { select: { startsAt: true } },
    },
  });

  // Regroupement par union de clés partagées.
  const parent = new Map<string, string>();
  const racine = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const lier = (a: string, b: string) => parent.set(racine(a), racine(b));
  for (const p of patients) parent.set(p.id, p.id);

  const vus = new Map<string, string>();
  const voir = (cle: string, id: string) => {
    const deja = vus.get(cle);
    if (deja) lier(deja, id);
    else vus.set(cle, id);
  };
  for (const p of patients) {
    voir(`nom:${cleNom(p)}`, p.id);
    if (p.nationalNumber) voir(`nn:${chiffres(p.nationalNumber)}`, p.id);
    const tel = chiffres(p.phone);
    if (tel.length >= 8)
      voir(`tel:${tel.slice(-9)}:${normaliser(p.lastName)}`, p.id);
  }

  const groupes = new Map<string, FicheDoublon[]>();
  for (const p of patients) {
    const g = groupes.get(racine(p.id)) ?? [];
    const dates = p.sessions.map((s) => s.startsAt.getTime());
    g.push({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      nationalNumber: p.nationalNumber,
      birthDate: p.birthDate,
      createdAt: p.createdAt,
      seances: p.sessions.length,
      derniere: dates.length ? new Date(Math.max(...dates)) : null,
    });
    groupes.set(racine(p.id), g);
  }
  return [...groupes.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      g.sort(
        (a, b) =>
          b.seances - a.seances ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      ),
    );
}
