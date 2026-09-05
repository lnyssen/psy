"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { DUREE_SEANCE, JOURS_OUVRES, partiesJour } from "@/lib/format";

/**
 * Déplace une séance sur un autre créneau, depuis le glisser-déposer de la
 * grille hebdomadaire.
 *
 * Le week-end est refusé côté serveur et pas seulement dans l'interface : une
 * règle métier qui ne vit que dans le navigateur n'est pas une règle.
 */
export async function deplacerSeance(id: string, isoDebut: string) {
  const debut = new Date(isoDebut);
  if (Number.isNaN(debut.getTime())) {
    return { ok: false as const, message: "Créneau invalide." };
  }

  const jour = new Date(
    Date.UTC(partiesJour(debut).annee, partiesJour(debut).mois - 1, partiesJour(debut).jour),
  ).getUTCDay();
  // getUTCDay : 0 = dimanche, 6 = samedi.
  const indexOuvre = (jour + 6) % 7;
  if (indexOuvre >= JOURS_OUVRES) {
    return { ok: false as const, message: "Pas de séance le week-end." };
  }

  await prisma.session.update({ where: { id }, data: { startsAt: debut } });
  revalidatePath("/semaine");
  revalidatePath("/");
  return { ok: true as const };
}

export async function ajouterNote(patientId: string, body: string) {
  const texte = body.trim();
  if (!texte) return { ok: false as const, message: "La note est vide." };

  await prisma.note.create({ data: { patientId, body: texte } });
  revalidatePath(`/patients/${patientId}`);
  return { ok: true as const };
}

export async function supprimerNote(id: string, patientId: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath(`/patients/${patientId}`);
  return { ok: true as const };
}

export async function marquerPaye(id: string, methode: "CASH" | "ELECTRONIC") {
  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: true },
  });
  if (!seance) return { ok: false as const, message: "Séance introuvable." };

  await prisma.session.update({
    where: { id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: methode,
      // Le montant se fige au moment de l'encaissement : le tarif du patient
      // peut changer ensuite sans réécrire l'historique comptable.
      amountCents: seance.amountCents ?? seance.patient.feeCents,
    },
  });
  revalidatePath("/facturation");
  revalidatePath(`/patients/${seance.patientId}`);
  return { ok: true as const };
}

export async function creerSeance(patientId: string, isoDebut: string, office: "UCCLE" | "AUDERGHEM") {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, message: "Patient introuvable." };

  await prisma.session.create({
    data: {
      patientId,
      startsAt: new Date(isoDebut),
      durationMin: DUREE_SEANCE,
      office,
    },
  });
  revalidatePath("/semaine");
  revalidatePath(`/patients/${patientId}`);
  return { ok: true as const };
}
