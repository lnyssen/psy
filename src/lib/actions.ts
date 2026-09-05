"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { DUREE_SEANCE, JOURS_OUVRES, partiesJour } from "@/lib/format";
import { PALETTE_CABINETS } from "@/lib/palette";

/**
 * Déplace une séance sur un autre créneau, depuis le glisser-déposer de la
 * grille hebdomadaire.
 *
 * Le week-end est refusé côté serveur et pas seulement dans l'interface : une
 * règle métier qui ne vit que dans le navigateur n'est pas une règle.
 */
export async function deplacerSeance(id: string, isoDebut: string) {
  const debut = new Date(isoDebut);
  if (Number.isNaN(debut.getTime())) {
    return { ok: false as const, message: "Créneau invalide." };
  }

  const jour = new Date(
    Date.UTC(partiesJour(debut).annee, partiesJour(debut).mois - 1, partiesJour(debut).jour),
  ).getUTCDay();
  // getUTCDay : 0 = dimanche, 6 = samedi.
  const indexOuvre = (jour + 6) % 7;
  if (indexOuvre >= JOURS_OUVRES) {
    return { ok: false as const, message: "Pas de séance le week-end." };
  }

  await prisma.session.update({ where: { id }, data: { startsAt: debut } });
  revalidatePath("/admin/semaine");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function ajouterNote(patientId: string, body: string) {
  const texte = body.trim();
  if (!texte) return { ok: false as const, message: "La note est vide." };

  await prisma.note.create({ data: { patientId, body: texte } });
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true as const };
}

export async function supprimerNote(id: string, patientId: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true as const };
}

export async function marquerPaye(id: string, methode: "CASH" | "ELECTRONIC") {
  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: true },
  });
  if (!seance) return { ok: false as const, message: "Séance introuvable." };

  await prisma.session.update({
    where: { id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: methode,
      // Le montant se fige au moment de l'encaissement : le tarif du patient
      // peut changer ensuite sans réécrire l'historique comptable.
      amountCents: seance.amountCents ?? seance.patient.feeCents,
    },
  });
  revalidatePath("/admin/facturation");
  revalidatePath(`/admin/patients/${seance.patientId}`);
  return { ok: true as const };
}

export async function creerSeance(patientId: string, isoDebut: string, cabinetId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, message: "Patient introuvable." };

  await prisma.session.create({
    data: {
      patientId,
      startsAt: new Date(isoDebut),
      durationMin: DUREE_SEANCE,
      cabinetId,
    },
  });
  revalidatePath("/admin/semaine");
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Réglages : cabinets et grille tarifaire
// ---------------------------------------------------------------------------

/** Toutes les vues qui affichent un lieu ou un tarif doivent être rafraîchies :
 *  un changement de nom ou de couleur se répercute partout. */
function rafraichirTout() {
  for (const chemin of ["/admin", "/admin/semaine", "/admin/patients", "/admin/facturation", "/admin/reglages"]) {
    revalidatePath(chemin);
  }
}

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

export async function enregistrerCabinet(f: FormData) {
  const id = texte(f, "id");
  const donnees = {
    nom: texte(f, "nom"),
    addressLine: texte(f, "addressLine"),
    postalCode: texte(f, "postalCode"),
    city: texte(f, "city"),
    colorHex: texte(f, "colorHex"),
    actif: f.get("actif") === "on",
  };
  if (!donnees.nom) return;

  // La teinte doit venir de la palette vérifiée : accepter une valeur libre
  // rouvrirait la porte aux couleurs illisibles ou confondues avec un état de
  // paiement.
  const teinte = PALETTE_CABINETS.find((t) => t.colorHex === donnees.colorHex);
  if (!teinte) return;

  if (id) {
    await prisma.cabinet.update({
      where: { id },
      data: { ...donnees, fillHex: teinte.fillHex },
    });
  } else {
    const dernier = await prisma.cabinet.findFirst({ orderBy: { ordre: "desc" } });
    await prisma.cabinet.create({
      data: { ...donnees, fillHex: teinte.fillHex, ordre: (dernier?.ordre ?? -1) + 1 },
    });
  }
  rafraichirTout();
}

/**
 * Un cabinet qui porte des séances n'est pas supprimé mais désactivé : effacer
 * le lieu d'une séance passée réécrirait l'histoire, et le reçu déjà délivré
 * mentionne cette adresse.
 */
export async function supprimerCabinet(f: FormData) {
  const id = texte(f, "id");
  if (!id) return;

  const seances = await prisma.session.count({ where: { cabinetId: id } });
  if (seances > 0) {
    await prisma.cabinet.update({ where: { id }, data: { actif: false } });
  } else {
    await prisma.patient.updateMany({ where: { cabinetId: id }, data: { cabinetId: null } });
    await prisma.cabinet.delete({ where: { id } });
  }
  rafraichirTout();
}

export async function enregistrerTarif(f: FormData) {
  const id = texte(f, "id");
  const libelle = texte(f, "libelle");
  // Saisi en euros, stocké en centimes : aucun flottant ne traverse la base.
  const euros = Number(texte(f, "montant").replace(",", "."));
  if (!libelle || !Number.isFinite(euros) || euros < 0) return;

  const donnees = {
    libelle,
    amountCents: Math.round(euros * 100),
    parDefaut: f.get("parDefaut") === "on",
    actif: f.get("actif") === "on",
  };

  if (donnees.parDefaut) {
    await prisma.tarif.updateMany({ data: { parDefaut: false } });
  }

  if (id) {
    await prisma.tarif.update({ where: { id }, data: donnees });
  } else {
    const dernier = await prisma.tarif.findFirst({ orderBy: { ordre: "desc" } });
    await prisma.tarif.create({ data: { ...donnees, ordre: (dernier?.ordre ?? -1) + 1 } });
  }
  rafraichirTout();
}

export async function supprimerTarif(f: FormData) {
  const id = texte(f, "id");
  if (!id) return;
  await prisma.tarif.delete({ where: { id } });
  rafraichirTout();
}
