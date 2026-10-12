"use server";

import { courrielConfigure, envoyerCourriel } from "@/lib/courriel";
import { construireAttestation } from "@/lib/attestation-pdf";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { destinatairesDe } from "@/lib/rappels";

/**
 * Envoie l'attestation de présence par e-mail, en pièce jointe : au patient s'il
 * a une adresse, sinon à ses parents. Le texte ne dit rien d'autre que la
 * pièce jointe.
 */
export async function envoyerAttestationParCourriel(
  patientId: string,
  o: { du: string; au: string; montants: boolean; pour: string },
) {
  await exigerSession();
  if (!courrielConfigure())
    return { ok: false as const, message: "L’envoi d’e-mails n’est pas configuré." };
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, message: "Patient introuvable." };
  const dest = destinatairesDe(patient);
  if (dest.length === 0)
    return { ok: false as const, message: "Aucune adresse e-mail sur la fiche du patient." };

  const pdf = await construireAttestation({ patientId, ...o, pour: o.pour.slice(0, 120) });
  if (!pdf.ok) return { ok: false as const, message: pdf.message };

  const envois = await Promise.all(
    dest.map((a) =>
      envoyerCourriel({
        a,
        sujet: "Attestation de présence",
        texte: [
          "Bonjour,",
          "",
          "Veuillez trouver en pièce jointe l’attestation de présence demandée.",
          "",
          "Bien cordialement,",
          "Amandine Monsel",
        ].join("\n"),
        pieces: [{ nom: pdf.nom, contenu: Buffer.from(pdf.octets), type: "application/pdf" }],
      }),
    ),
  );
  if (!envois.some(Boolean))
    return { ok: false as const, message: "L’envoi a échoué. Réessayez, ou utilisez « partager »." };
  return { ok: true as const, message: `Attestation envoyée à ${dest.join(", ")}.` };
}
