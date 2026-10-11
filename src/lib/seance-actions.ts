"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { synchroniserApres } from "@/lib/google-sync";
import { chiffrer, cleNotesPresente } from "@/lib/chiffrement";

/**
 * Le statut d'une séance passée : venue ou absente. C'est ce geste qui la rend
 * facturable (voir isBillable) — sans lui, une séance reste « prévue » pour
 * toujours et n'apparaît ni en facturation, ni en finance, ni dans le quota
 * INAMI.
 *
 * Seule une séance déjà commencée se statue : marquer « venu » un rendez-vous
 * de jeudi prochain fabriquerait une recette qui n'existe pas encore. Une
 * séance déjà statuée peut encore passer de venue à absente (ou l'inverse)
 * tant qu'elle n'est ni encaissée ni portée sur une facture : après, le
 * montant est figé ailleurs et la corriger ici le contredirait.
 */
type Statut = "ATTENDED" | "NO_SHOW";

export async function statuerSeances(ids: string[], statut: Statut) {
  await exigerSession();
  if (statut !== "ATTENDED" && statut !== "NO_SHOW") return { ok: false as const };
  const maintenant = new Date();

  const r = await prisma.session.updateMany({
    where: {
      id: { in: ids },
      startsAt: { lte: maintenant },
      paymentStatus: { not: "PAID" },
      factureId: null,
      status: { in: ["SCHEDULED", "ATTENDED", "NO_SHOW"] },
    },
    data: { status: statut },
  });

  const patients = await prisma.session.findMany({
    where: { id: { in: ids }, patientId: { not: null } },
    select: { patientId: true },
    distinct: ["patientId"],
  });
  revalidatePath("/admin");
  revalidatePath("/admin/semaine");
  revalidatePath("/admin/facturation");
  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/statistiques");
  for (const p of patients) revalidatePath(`/admin/patients/${p.patientId}`);
  return { ok: true as const, nb: r.count };
}

/**
 * Note clinique d'une séance, chiffrée avant d'entrer en base (voir
 * lib/chiffrement.ts, clé NOTES_KEY). Une note vide efface la note.
 */
export async function enregistrerNoteSeance(id: string, texte: string) {
  await exigerSession();
  if (!cleNotesPresente()) {
    return { ok: false as const, message: "NOTES_KEY absente : la note n’a pas été enregistrée." };
  }
  const propre = texte.trim();
  const seance = await prisma.session.update({
    where: { id },
    data: { note: propre ? chiffrer(propre, "NOTES_KEY") : null },
    select: { patientId: true },
  });
  if (seance.patientId) revalidatePath(`/admin/patients/${seance.patientId}`);
  return { ok: true as const };
}

/** Bascule une séance entre cabinet et visio. L'agenda Google suit : son lieu
 *  devient « Visio », ou reprend l'adresse du cabinet. */
export async function basculerVisio(id: string) {
  await exigerSession();
  const s = await prisma.session.findUnique({ where: { id }, select: { visio: true, patientId: true } });
  if (!s) return;
  await prisma.session.update({ where: { id }, data: { visio: !s.visio } });
  revalidatePath("/admin");
  revalidatePath("/admin/semaine");
  if (s.patientId) revalidatePath(`/admin/patients/${s.patientId}`);
  synchroniserApres();
}
