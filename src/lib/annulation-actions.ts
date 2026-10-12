"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod, PaymentStatus, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { synchroniserApres } from "@/lib/google-sync";

/**
 * Annuler un geste (honorée, absente, encaissé, annulé…) : l'écran lit l'état
 * des séances avant le geste, puis, si on change d'avis dans les secondes qui
 * suivent, les remet comme elles étaient. Rien ne change dans les actions
 * existantes, qui gardent leurs propres règles.
 */
export type EtatSeance = {
  id: string;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  amountCents: number | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
};

/** L'état actuel des séances données, à garder avant d'agir sur elles. */
export async function etatsDe(ids: string[]): Promise<EtatSeance[]> {
  await exigerSession();
  const seances = await prisma.session.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      paidAt: true,
      paymentMethod: true,
    },
  });
  return seances.map((s) => ({ ...s, paidAt: s.paidAt?.toISOString() ?? null }));
}

/**
 * Remet les séances dans l'état gardé. Une séance portée depuis sur une facture
 * d'établissement n'est jamais touchée : son montant est figé ailleurs.
 */
export async function restaurerSeances(etats: EtatSeance[]) {
  await exigerSession();
  if (etats.length === 0) return { ok: false as const };
  const seances = await prisma.session.findMany({
    where: { id: { in: etats.map((e) => e.id) }, factureId: null },
    select: { id: true, patientId: true },
  });
  const permises = new Set(seances.map((s) => s.id));
  await prisma.$transaction(
    etats
      .filter((e) => permises.has(e.id))
      .map((e) =>
        prisma.session.update({
          where: { id: e.id },
          data: {
            status: e.status,
            paymentStatus: e.paymentStatus,
            amountCents: e.amountCents,
            paidAt: e.paidAt ? new Date(e.paidAt) : null,
            paymentMethod: e.paymentMethod,
          },
        }),
      ),
  );
  // Une annulation rétablie ramène l'événement dans l'agenda Google.
  synchroniserApres();
  for (const c of [
    "/admin",
    "/admin/semaine",
    "/admin/facturation",
    "/admin/finance",
    "/admin/statistiques",
    "/admin/patients",
  ])
    revalidatePath(c);
  for (const s of seances)
    if (s.patientId) revalidatePath(`/admin/patients/${s.patientId}`);
  return { ok: true as const, nb: seances.length };
}
