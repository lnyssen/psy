"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { synchroniserApres } from "@/lib/google-sync";

/**
 * Droit à l'effacement : anonymiser un dossier.
 *
 * On n'efface pas la ligne : les séances et leurs montants sont des pièces
 * comptables qu'il faut conserver (sept ans), et les supprimer fausserait les
 * totaux d'une année passée. On retire à la place tout ce qui identifie — nom,
 * coordonnées, numéro national, notes, documents — et on ne garde que le
 * squelette comptable, rattaché à « Dossier anonymisé ».
 *
 * Refusé tant qu'un rendez-vous à venir existe : il faut d'abord l'annuler.
 */
export async function anonymiserPatient(f: FormData) {
  await exigerSession();
  const id = String(f.get("id") ?? "");
  const confirmation = String(f.get("confirmation") ?? "").trim();
  if (!id) return;
  if (confirmation !== "ANONYMISER")
    redirect(`/admin/patients/${id}?rgpd=confirmation`);

  const aVenir = await prisma.session.count({
    where: {
      patientId: id,
      status: "SCHEDULED",
      startsAt: { gte: new Date() },
    },
  });
  if (aVenir > 0) redirect(`/admin/patients/${id}?rgpd=avenir`);

  await prisma.$transaction([
    prisma.note.deleteMany({ where: { patientId: id } }),
    prisma.documentPatient.deleteMany({ where: { patientId: id } }),
    prisma.session.updateMany({
      where: { patientId: id },
      data: { note: null },
    }),
    prisma.patient.update({
      where: { id },
      data: {
        firstName: "Dossier",
        lastName: "anonymisé",
        email: null,
        phone: null,
        phoneMother: null,
        phoneFather: null,
        emailMother: null,
        emailFather: null,
        nationalNumber: null,
        addressLine: null,
        postalCode: null,
        city: null,
        notes: null,
        jetonRdv: null,
        rappelsEmail: false,
        active: false,
        // L'année de naissance suffit encore à la statistique et au plafond INAMI ;
        // le jour et le mois identifient, eux.
        birthDate: null,
        anonymiseAt: new Date(),
      },
    }),
  ]);
  // Les événements Google portent le nom du patient : ils se mettent à jour.
  synchroniserApres();
  for (const c of [
    "/admin/patients",
    `/admin/patients/${id}`,
    "/admin/semaine",
    "/admin",
  ])
    revalidatePath(c);
  redirect(`/admin/patients/${id}?rgpd=ok`);
}
