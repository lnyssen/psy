"use server";

import { courrielConfigure, envoyerCourriel } from "@/lib/courriel";
import { exigerSession } from "@/lib/garde";
import { parametres } from "@/lib/parametres";
import { qrVirement } from "@/lib/epc-qr";
import { relancesImpayees, sujetRelance, texteRelance } from "@/lib/relance";

/**
 * Envoie la relance d'un patient directement depuis l'outil. Le texte est
 * reconstruit ici, d'après ce qui est réellement dû à cet instant : jamais d'après
 * ce que la page affichait, qui peut être périmé. Si l'IBAN des Réglages est
 * valide, un code QR de virement est joint. « Préparer la relance »
 * reste là pour qui veut relire le message dans sa messagerie avant de l'envoyer.
 */
export async function envoyerRelance(patientId: string) {
  await exigerSession();
  if (!courrielConfigure())
    return { ok: false as const, message: "L’envoi d’e-mails n’est pas configuré." };
  const [relance] = await relancesImpayees(patientId);
  if (!relance)
    return { ok: false as const, message: "Plus rien à relancer : tout est réglé." };
  if (relance.adresses.length === 0)
    return { ok: false as const, message: "Aucune adresse e-mail sur la fiche." };

  const { iban } = await parametres();
  const qr = await qrVirement({
    iban,
    montantCents: relance.totalCents,
    communication: `Séances ${relance.nom}`,
  });
  const texte = texteRelance(relance, iban, Boolean(qr));
  const sujet = sujetRelance(relance);
  const pieces = qr
    ? [{ nom: "paiement-qr.png", contenu: qr, type: "image/png" }]
    : undefined;
  const envois = await Promise.all(
    relance.adresses.map((a) => envoyerCourriel({ a, sujet, texte, pieces })),
  );
  if (!envois.some(Boolean))
    return { ok: false as const, message: "L’envoi a échoué. Réessayez." };
  return {
    ok: true as const,
    message: `Relance envoyée à ${relance.adresses.join(", ")}.`,
  };
}
