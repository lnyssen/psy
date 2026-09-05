"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { creneauEncoreLibre } from "@/lib/creneaux";
import { DUREE_SEANCE } from "@/lib/format";

/**
 * Prise de rendez-vous depuis le site public.
 *
 * Deux chemins, selon que l'outil connaît déjà la personne :
 *
 * - un patient qui arrive avec son lien personnel réserve directement, son
 *   créneau devient une séance ;
 * - toute autre personne dépose une demande, qu'Amandine confirme ou décline.
 *   Elle garde ainsi la main sur qui entre dans son agenda, ce qui compte
 *   particulièrement pour une première consultation.
 *
 * Dans les deux cas la disponibilité est revérifiée ici : l'affichage a pu
 * vieillir de quelques minutes entre la page et l'envoi du formulaire.
 */

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

export type ResultatRdv = { ok: boolean; message: string } | null;

export async function reserverOuDemander(_etat: ResultatRdv, f: FormData): Promise<ResultatRdv> {
  const cabinetId = texte(f, "cabinetId");
  const iso = texte(f, "creneau");
  const jeton = texte(f, "jeton");

  if (!cabinetId || !iso) {
    return { ok: false, message: "Choisissez un créneau." };
  }

  const debut = new Date(iso);
  if (Number.isNaN(debut.getTime()) || debut < new Date()) {
    return { ok: false, message: "Ce créneau n’est plus valable." };
  }

  if (!(await creneauEncoreLibre(cabinetId, iso))) {
    return {
      ok: false,
      message: "Ce créneau vient d’être pris. Choisissez-en un autre, la liste est à jour.",
    };
  }

  // Patient connu : réservation immédiate.
  if (jeton) {
    const patient = await prisma.patient.findUnique({ where: { jetonRdv: jeton } });
    if (!patient) {
      return { ok: false, message: "Ce lien personnel n’est plus valable." };
    }
    await prisma.session.create({
      data: {
        patientId: patient.id,
        cabinetId,
        startsAt: debut,
        durationMin: DUREE_SEANCE,
        reserveeEnLigne: true,
      },
    });
    revalidatePath("/admin/semaine");
    revalidatePath("/admin");
    return {
      ok: true,
      message: "Votre rendez-vous est confirmé. Vous le retrouverez dans votre courriel.",
    };
  }

  // Inconnu : demande à confirmer. Le minimum de champs, et rien de clinique —
  // le motif se dira en séance, pas dans un formulaire public.
  const firstName = texte(f, "firstName");
  const lastName = texte(f, "lastName");
  const email = texte(f, "email");
  if (!firstName || !lastName || !email.includes("@")) {
    return { ok: false, message: "Nom, prénom et adresse électronique sont nécessaires." };
  }

  await prisma.demandeRdv.create({
    data: {
      firstName,
      lastName,
      email,
      phone: texte(f, "phone") || null,
      message: texte(f, "message") || null,
      souhaite: debut,
      cabinetId,
    },
  });
  revalidatePath("/admin/demandes");

  return {
    ok: true,
    message:
      "Votre demande est transmise. Amandine vous répondra pour confirmer ce créneau ou vous en proposer un autre.",
  };
}

/** Confirmation d'une demande : elle crée le dossier patient s'il n'existe pas,
 *  puis la séance. Décliner ne crée rien. */
export async function traiterDemande(f: FormData) {
  const id = texte(f, "id");
  const decision = texte(f, "decision");
  if (!id) return;

  const demande = await prisma.demandeRdv.findUnique({ where: { id } });
  if (!demande || demande.statut !== "EN_ATTENTE") return;

  if (decision === "refuser") {
    await prisma.demandeRdv.update({ where: { id }, data: { statut: "REFUSEE" } });
  } else {
    const tarif = await prisma.tarif.findFirst({ where: { parDefaut: true } });
    const patient = await prisma.patient.create({
      data: {
        firstName: demande.firstName,
        lastName: demande.lastName,
        email: demande.email,
        phone: demande.phone,
        scheme: "PRIVE",
        feeCents: tarif?.amountCents ?? null,
        cabinetId: demande.cabinetId,
        jetonRdv: crypto.randomUUID(),
      },
    });
    await prisma.session.create({
      data: {
        patientId: patient.id,
        cabinetId: demande.cabinetId,
        startsAt: demande.souhaite,
        durationMin: DUREE_SEANCE,
        reserveeEnLigne: true,
      },
    });
    if (demande.message) {
      await prisma.note.create({
        data: { patientId: patient.id, body: `Demande en ligne : ${demande.message}` },
      });
    }
    await prisma.demandeRdv.update({ where: { id }, data: { statut: "CONFIRMEE" } });
  }

  for (const c of ["/admin/demandes", "/admin", "/admin/semaine", "/admin/patients"]) {
    revalidatePath(c);
  }
}
