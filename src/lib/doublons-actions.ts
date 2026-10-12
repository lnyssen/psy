"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { synchroniserApres } from "@/lib/google-sync";

/**
 * Fusionne des fiches en une seule : les séances, notes et documents des
 * autres passent sur la fiche conservée, qui reprend aussi ce qui lui manque
 * (téléphone, adresse, parents…) ; puis les autres fiches disparaissent.
 *
 * La fiche conservée garde ses propres valeurs : on ne comble que les vides.
 */
export async function fusionnerPatients(f: FormData) {
  await exigerSession();
  const garder = String(f.get("garder") ?? "");
  const autres = String(f.get("autres") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x && x !== garder);
  if (!garder || autres.length === 0) redirect("/admin/patients/doublons");

  const [fiche, doublons] = await Promise.all([
    prisma.patient.findUnique({ where: { id: garder } }),
    prisma.patient.findMany({ where: { id: { in: autres } } }),
  ]);
  if (!fiche || doublons.length === 0) redirect("/admin/patients/doublons");

  const comble = <K extends keyof typeof fiche>(cle: K) =>
    fiche[cle] ??
    doublons.map((d) => d[cle]).find((v) => v !== null && v !== undefined) ??
    null;
  const notes =
    [fiche.notes, ...doublons.map((d) => d.notes)]
      .filter(Boolean)
      .join("\n\n") || null;

  await prisma.$transaction([
    prisma.session.updateMany({
      where: { patientId: { in: autres } },
      data: { patientId: garder },
    }),
    prisma.note.updateMany({
      where: { patientId: { in: autres } },
      data: { patientId: garder },
    }),
    prisma.documentPatient.updateMany({
      where: { patientId: { in: autres } },
      data: { patientId: garder },
    }),
    prisma.patient.deleteMany({ where: { id: { in: autres } } }),
    prisma.patient.update({
      where: { id: garder },
      data: {
        email: comble("email"),
        phone: comble("phone"),
        phoneMother: comble("phoneMother"),
        phoneFather: comble("phoneFather"),
        emailMother: comble("emailMother"),
        emailFather: comble("emailFather"),
        nationalNumber: comble("nationalNumber"),
        addressLine: comble("addressLine"),
        postalCode: comble("postalCode"),
        city: comble("city"),
        birthDate: comble("birthDate"),
        cabinetId: comble("cabinetId"),
        jetonRdv:
          fiche.jetonRdv ?? doublons.find((d) => d.jetonRdv)?.jetonRdv ?? null,
        notes,
      },
    }),
  ]);

  synchroniserApres();
  for (const c of [
    "/admin/patients",
    "/admin/patients/doublons",
    `/admin/patients/${garder}`,
    "/admin/semaine",
    "/admin",
  ]) {
    revalidatePath(c);
  }
  redirect(`/admin/patients/${garder}`);
}
