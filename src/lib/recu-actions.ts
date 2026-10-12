"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { courrielConfigure, creneauEnClair, envoyerCourriel } from "@/lib/courriel";
import { fmtJourMoisAn } from "@/lib/format";
import { exigerSession } from "@/lib/garde";
import { destinatairesDe } from "@/lib/rappels";
import { construireRecu } from "@/lib/recu-pdf";

/**
 * Envoie le reçu d'honoraires par e-mail, en pièce jointe : au patient s'il a
 * une adresse, sinon à ses parents. Le texte ne dit rien de clinique, seulement
 * la date de la séance. La date d'envoi est gardée sur la séance (receiptAt)
 * pour ne pas en envoyer deux sans le savoir.
 */
export async function envoyerRecuParCourriel(id: string) {
  await exigerSession();
  if (!courrielConfigure())
    return { ok: false as const, message: "L’envoi d’e-mails n’est pas configuré." };

  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: true },
  });
  if (!seance?.patient)
    return { ok: false as const, message: "Séance introuvable." };
  const dest = destinatairesDe(seance.patient);
  if (dest.length === 0)
    return {
      ok: false as const,
      message: "Aucune adresse e-mail sur la fiche du patient.",
    };

  const recu = await construireRecu(id);
  if (!recu.ok) return { ok: false as const, message: recu.message };

  const jour = fmtJourMoisAn.format(seance.startsAt);
  const resultats = await Promise.all(
    dest.map((a) =>
      envoyerCourriel({
        a,
        sujet: `Reçu d’honoraires — séance du ${jour}`,
        texte: [
          "Bonjour,",
          "",
          `Veuillez trouver en pièce jointe le reçu d’honoraires pour la séance du ${creneauEnClair(seance.startsAt)}.`,
          "",
          "Bien cordialement,",
          "Amandine Monsel",
        ].join("\n"),
        pieces: [
          { nom: recu.nom, contenu: Buffer.from(recu.octets), type: "application/pdf" },
        ],
      }),
    ),
  );
  if (!resultats.some(Boolean))
    return {
      ok: false as const,
      message: "L’envoi a échoué. Réessayez, ou utilisez « partager ».",
    };

  await prisma.session.update({
    where: { id },
    data: { receiptAt: new Date() },
  });
  revalidatePath(`/admin/patients/${seance.patientId}`);
  return {
    ok: true as const,
    message: `Reçu envoyé à ${dest.join(", ")}.`,
  };
}
