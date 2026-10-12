"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import { chiffrerOctets, cleNotesPresente } from "@/lib/chiffrement";
import { TAILLE_MAX_DOCUMENT } from "@/lib/documents-constantes";

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
};

function retour(patientId: string, code: string): never {
  redirect(`/admin/patients/${patientId}?doc=${code}#documents`);
}

/**
 * Joint un document à un dossier. Le type est déduit de l'extension, jamais de
 * ce que déclare le navigateur : un fichier mal nommé est refusé plutôt que
 * servi avec un type trompeur. Le contenu est chiffré avant d'entrer en base.
 */
export async function ajouterDocument(f: FormData) {
  await exigerSession();
  const patientId = String(f.get("patientId") ?? "");
  const fichier = f.get("fichier");
  if (!patientId) return;
  if (!cleNotesPresente()) retour(patientId, "cle");
  if (!(fichier instanceof File) || fichier.size === 0)
    retour(patientId, "vide");

  const f2 = fichier as File;
  if (f2.size > TAILLE_MAX_DOCUMENT) retour(patientId, "taille");
  const extension = f2.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = TYPES[extension];
  if (!mime) retour(patientId, "type");

  const nom =
    f2.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 120) ||
    `document.${extension}`;
  await prisma.documentPatient.create({
    data: {
      patientId,
      nom,
      mime,
      taille: f2.size,
      contenu: new Uint8Array(
        chiffrerOctets(Buffer.from(await f2.arrayBuffer())),
      ),
    },
  });
  revalidatePath(`/admin/patients/${patientId}`);
  retour(patientId, "ok");
}

export async function supprimerDocument(f: FormData) {
  await exigerSession();
  const id = String(f.get("id") ?? "");
  const d = id
    ? await prisma.documentPatient.findUnique({
        where: { id },
        select: { patientId: true },
      })
    : null;
  if (!d) return;
  await prisma.documentPatient.delete({ where: { id } });
  revalidatePath(`/admin/patients/${d.patientId}`);
  retour(d.patientId, "retire");
}
