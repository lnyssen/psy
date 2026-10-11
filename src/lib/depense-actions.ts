"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

/**
 * Corrige une dépense déjà enregistrée : une faute de frappe dans le montant,
 * la mauvaise catégorie, un reçu photographié après coup.
 *
 * Le reçu existant reste en place tant qu'aucun nouveau fichier n'est joint ;
 * il ne disparaît que si la case « retirer le reçu » est cochée, pour qu'une
 * simple correction de libellé n'efface jamais la preuve.
 */
export async function modifierDepense(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  const libelle = texte(f, "libelle");
  const dateSaisie = new Date(texte(f, "date"));
  const montant = Number(texte(f, "montant").replace(",", "."));
  const categorieId = texte(f, "categorieId");
  if (!id || !libelle || Number.isNaN(dateSaisie.getTime())) return;
  if (!Number.isFinite(montant) || montant < 0) return;
  if (!categorieId) return;

  const fichier = f.get("photo");
  let recu: { photo: Uint8Array<ArrayBuffer> | null; photoMime: string | null } | null = null;
  if (fichier instanceof File && fichier.size > 0) {
    // Même cast que dans enregistrerDepense : un fichier de formulaire n'est
    // jamais un SharedArrayBuffer.
    recu = {
      photo: new Uint8Array(await fichier.arrayBuffer()) as Uint8Array<ArrayBuffer>,
      photoMime: fichier.type || "application/octet-stream",
    };
  } else if (f.get("retirerPhoto")) {
    recu = { photo: null, photoMime: null };
  }

  await prisma.depense.update({
    where: { id },
    data: {
      libelle,
      date: dateSaisie,
      amountCents: Math.round(montant * 100),
      categorieId,
      fournisseur: texte(f, "fournisseur") || null,
      cabinetId: texte(f, "cabinetId") || null,
      ...(recu ?? {}),
    },
  });
  revalidatePath("/admin/depenses");
}
