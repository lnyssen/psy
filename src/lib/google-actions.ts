"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { dechiffrer } from "@/lib/chiffrement";
import { revoquer } from "@/lib/google-api";
import { synchroniser, synchroniserApres } from "@/lib/google-sync";

/**
 * Actions de l'interface pour la synchronisation Google Agenda.
 *
 * Les événements créés dans Google arrivent « à rattacher » : trois issues,
 * toutes décidées par Amandine — une séance (avec son patient, ou un lieu
 * facturé à l'heure comme l'école), un simple créneau occupé, ou rien.
 */

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

function rafraichir() {
  for (const c of ["/admin", "/admin/semaine", "/admin/patients", "/admin/reglages"]) {
    revalidatePath(c);
  }
  revalidatePath("/rendez-vous");
}

/** Le formulaire peut viser toute la série d'un événement récurrent. */
async function cibles(f: FormData) {
  const id = texte(f, "id");
  const ev = await prisma.evenementGoogle.findUnique({ where: { id } });
  if (!ev) return [];
  if (f.get("serie") === "on" && ev.serieId) {
    return prisma.evenementGoogle.findMany({
      where: { serieId: ev.serieId, statut: "A_RATTACHER" },
      orderBy: { debut: "asc" },
    });
  }
  return [ev];
}

export async function rattacherEvenementGoogle(f: FormData) {
  const cabinetId = texte(f, "cabinetId");
  const patientId = texte(f, "patientId");
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId } });
  if (!cabinet) return;

  // Un lieu facturé à l'heure (l'école) n'a pas de patient ; partout ailleurs
  // une séance en a un, et sans lui il n'y a rien à rattacher.
  let patient: { id: string } | null = null;
  if (!cabinet.factureInstitution) {
    if (!patientId) return;
    patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) return;
  }

  for (const ev of await cibles(f)) {
    const duree = Math.min(480, Math.max(5, Math.round((ev.fin.getTime() - ev.debut.getTime()) / 60_000)));
    try {
      await prisma.$transaction([
        prisma.session.create({
          data: {
            patientId: patient?.id ?? null,
            cabinetId: cabinet.id,
            startsAt: ev.debut,
            durationMin: duree,
            // Le lien est posé tout de suite : la prochaine lecture reconnaît
            // l'événement comme une séance, pas comme un nouvel inconnu. Pas
            // d'empreinte — la séance repart vers Google pour y prendre son
            // titre normalisé (nom du patient, lieu).
            googleEventId: ev.googleId,
            googleEtag: ev.etag,
          },
        }),
        prisma.evenementGoogle.delete({ where: { id: ev.id } }),
      ]);
    } catch {
      // Déjà rattaché entre-temps (double clic) : rien à faire.
    }
  }

  rafraichir();
  synchroniserApres();
}

async function marquer(f: FormData, statut: "OCCUPE" | "IGNORE") {
  const ids = (await cibles(f)).map((e) => e.id);
  if (ids.length === 0) return;
  await prisma.evenementGoogle.updateMany({ where: { id: { in: ids } }, data: { statut } });
  rafraichir();
}

export async function marquerEvenementOccupe(f: FormData) {
  await marquer(f, "OCCUPE");
}

export async function ignorerEvenementGoogle(f: FormData) {
  await marquer(f, "IGNORE");
}

export async function synchroniserMaintenant() {
  await synchroniser();
  rafraichir();
}

/**
 * Déconnecte Google. Les événements déjà créés restent dans l'agenda — les
 * effacer sans qu'on l'ait demandé serait pire qu'un résidu — mais l'outil
 * cesse de les suivre. À la reconnexion, ils sont reconnus à l'identifiant de
 * séance qu'ils portent et renoués sans doublon.
 */
export async function deconnecterGoogle() {
  const c = await prisma.googleConnexion.findUnique({ where: { id: "global" } });
  if (c) {
    try {
      await revoquer(dechiffrer(c.refreshTokenChiffre));
    } catch {
      /* le jeton local est supprimé de toute façon */
    }
  }
  await prisma.$transaction([
    prisma.googleConnexion.deleteMany(),
    prisma.evenementGoogle.deleteMany(),
    prisma.session.updateMany({
      where: { googleEventId: { not: null } },
      data: { googleEventId: null, googleEtag: null, googleEmpreinte: null },
    }),
  ]);
  rafraichir();
}
