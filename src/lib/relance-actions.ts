"use server";

import { courrielConfigure, envoyerCourriel } from "@/lib/courriel";
import { exigerSession } from "@/lib/garde";
import { parametres } from "@/lib/parametres";
import { relancesImpayees, sujetRelance, texteRelance } from "@/lib/relance";

/**
 * Envoie la relance d'un patient directement depuis l'outil. Le texte est
 * reconstruit ici, d'après ce qui est réellement dû à cet instant : jamais d'après
 * ce que la page affichait, qui peut être périmé. « Préparer la relance »
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
  const texte = texteRelance(relance, iban);
  const sujet = sujetRelance(relance);
  const envois = await Promise.all(
    relance.adresses.map((a) => envoyerCourriel({ a, sujet, texte })),
  );
  if (!envois.some(Boolean))
    return { ok: false as const, message: "L’envoi a échoué. Réessayez." };
  return {
    ok: true as const,
    message: `Relance envoyée à ${relance.adresses.join(", ")}.`,
  };
}
