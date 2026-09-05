import { prisma } from "@/lib/db";

/** Les cabinets actifs, dans l'ordre voulu par les réglages. Toute vue qui
 *  propose un filtre de lieu part de là : la liste n'est plus écrite en dur. */
export function cabinetsActifs() {
  return prisma.cabinet.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
}

export function optionsCabinet(
  cabinets: { id: string; nom: string; colorHex: string; vividHex: string }[],
) {
  return cabinets.map((c) => ({
    valeur: c.id,
    label: c.nom,
    ton: { colorHex: c.colorHex, vividHex: c.vividHex },
  }));
}
