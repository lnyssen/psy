"use server";

import { revalidatePath } from "next/cache";
import { accentValide, CLES_ACCENT } from "@/lib/accent";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { parametres } from "@/lib/parametres";

/**
 * Enregistre la couleur d'accent du site et de l'outil. Elle vaut pour tout le
 * monde : le site public l'affiche aussi. La liste est fermée — une valeur
 * inconnue est refusée plutôt que corrigée en silence.
 */
export async function enregistrerAccent(cle: string) {
  await exigerSession();
  if (!(CLES_ACCENT as string[]).includes(cle))
    return { ok: false as const, message: "Cette couleur n’existe pas." };
  await parametres(); // crée la ligne si elle manque
  await prisma.parametres.update({
    where: { id: "global" },
    data: { accent: accentValide(cle) },
  });
  // Toutes les pages portent la couleur : on invalide depuis la racine.
  revalidatePath("/", "layout");
  return { ok: true as const };
}
