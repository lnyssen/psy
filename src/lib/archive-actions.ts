"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";

/**
 * Archiver un patient qui ne vient plus, ou le réactiver.
 *
 * Rien ne s'efface : l'archive retire seulement le dossier de la liste des
 * patients, des choix de l'agenda et des alertes de quota. Ses séances,
 * factures et notes restent, et le dossier se rouvre d'un clic s'il revient.
 * Pour effacer vraiment, c'est l'anonymisation (droit à l'effacement).
 */
export async function basculerArchive(f: FormData) {
  await exigerSession();
  const id = String(f.get("id") ?? "");
  if (!id) return;
  const p = await prisma.patient.findUnique({ where: { id }, select: { active: true, anonymiseAt: true } });
  if (!p || p.anonymiseAt) return;
  await prisma.patient.update({ where: { id }, data: { active: !p.active } });
  revalidatePath(`/admin/patients/${id}`);
  revalidatePath("/admin/patients");
  revalidatePath("/admin/semaine");
}

/** Archive d'un coup les dossiers dormants proposés par la liste. */
export async function archiverPlusieurs(f: FormData) {
  await exigerSession();
  const ids = f.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await prisma.patient.updateMany({
    where: { id: { in: ids }, anonymiseAt: null },
    data: { active: false },
  });
  revalidatePath("/admin/patients");
  revalidatePath("/admin/semaine");
}
