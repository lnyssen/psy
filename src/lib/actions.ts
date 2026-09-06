"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { JOURS_OUVRES, partiesJour } from "@/lib/format";
import { parametres } from "@/lib/parametres";
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

/**
 * Encaissement en lot, depuis la sélection de la table de facturation.
 *
 * Le filtre sur le statut n'est pas une redondance de l'interface : la table
 * n'affiche que des actes facturables et que des lignes impayées, mais une
 * sélection peut avoir vieilli entre l'affichage et le clic — un autre onglet,
 * un retour arrière. Réécrire un paiement déjà enregistré changerait sa date et
 * son mode, et donc le reçu déjà remis.
 *
 * Une transaction, pour que le lot passe entier ou pas du tout.
 */
export async function marquerPayeLot(ids: string[], methode: "CASH" | "ELECTRONIC") {
  if (ids.length === 0) return { ok: false as const, message: "Aucune séance sélectionnée." };

  const seances = await prisma.session.findMany({
    where: {
      id: { in: ids },
      paymentStatus: { not: "PAID" },
      status: { in: ["ATTENDED", "NO_SHOW"] },
    },
    include: { patient: true },
  });

  if (seances.length === 0) {
    return { ok: false as const, message: "Ces séances sont déjà encaissées." };
  }

  const maintenant = new Date();
  await prisma.$transaction(
    seances.map((s) =>
      prisma.session.update({
        where: { id: s.id },
        data: {
          paymentStatus: "PAID",
          paidAt: maintenant,
          paymentMethod: methode,
          amountCents: s.amountCents ?? s.patient.feeCents,
        },
      }),
    ),
  );

  revalidatePath("/admin/facturation");
  revalidatePath("/admin/finance");
  for (const s of seances) revalidatePath(`/admin/patients/${s.patientId}`);
  return { ok: true as const, n: seances.length, ignorees: ids.length - seances.length };
}

export async function creerSeance(patientId: string, isoDebut: string, cabinetId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, message: "Patient introuvable." };

  await prisma.session.create({
    data: {
      patientId,
      startsAt: new Date(isoDebut),
      durationMin: (await parametres()).dureeSeanceMin,
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
  for (const chemin of [
    "/admin",
    "/admin/semaine",
    "/admin/patients",
    "/admin/facturation",
    "/admin/reglages",
  ]) {
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
    publie: f.get("publie") === "on",
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
      data: { ...donnees, fillHex: teinte.fillHex, vividHex: teinte.vividHex },
    });
  } else {
    const dernier = await prisma.cabinet.findFirst({ orderBy: { ordre: "desc" } });
    await prisma.cabinet.create({
      data: {
        ...donnees,
        fillHex: teinte.fillHex,
        vividHex: teinte.vividHex,
        ordre: (dernier?.ordre ?? -1) + 1,
      },
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

// ---------------------------------------------------------------------------
// Disponibilités : horaires d'ouverture et congés
// ---------------------------------------------------------------------------

/** « 09:30 » vers 570 minutes. Renvoie null si l'heure est illisible. */
function minutesDepuisHeure(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Enregistre une plage d'ouverture.
 *
 * Ces horaires ne servent pas qu'à l'affichage : ce sont eux qui déterminent
 * les créneaux proposés au public. Une plage mal saisie ouvrirait l'agenda à
 * des heures où Amandine n'est pas là — d'où le contrôle du sens et de la durée
 * plutôt qu'une confiance aveugle dans le formulaire.
 */
export async function enregistrerDisponibilite(f: FormData) {
  const cabinetId = texte(f, "cabinetId");
  const jour = Number(texte(f, "jour"));
  const debutMin = minutesDepuisHeure(texte(f, "debut"));
  const finMin = minutesDepuisHeure(texte(f, "fin"));

  if (!cabinetId || !Number.isInteger(jour) || jour < 0 || jour > 4) return;
  if (debutMin === null || finMin === null) return;
  if (finMin - debutMin < (await parametres()).dureeSeanceMin) return;

  const id = texte(f, "id");
  if (id) {
    await prisma.disponibilite.update({ where: { id }, data: { jour, debutMin, finMin } });
  } else {
    await prisma.disponibilite.create({ data: { cabinetId, jour, debutMin, finMin } });
  }
  rafraichirTout();
  revalidatePath("/rendez-vous");
}

export async function supprimerDisponibilite(f: FormData) {
  const id = texte(f, "id");
  if (!id) return;
  await prisma.disponibilite.delete({ where: { id } });
  rafraichirTout();
  revalidatePath("/rendez-vous");
}

/** Congés et absences. Se soustraient des créneaux proposés. */
export async function enregistrerConge(f: FormData) {
  const debut = new Date(texte(f, "debut"));
  const finSaisie = new Date(texte(f, "fin"));
  if (Number.isNaN(debut.getTime()) || Number.isNaN(finSaisie.getTime())) return;

  // La date de fin est inclusive à la saisie : on ferme la journée entière.
  const fin = new Date(finSaisie);
  fin.setDate(fin.getDate() + 1);
  if (fin <= debut) return;

  await prisma.indisponibilite.create({
    data: { debut, fin, motif: texte(f, "motif") || null },
  });
  rafraichirTout();
  revalidatePath("/rendez-vous");
}

export async function supprimerConge(f: FormData) {
  const id = texte(f, "id");
  if (!id) return;
  await prisma.indisponibilite.delete({ where: { id } });
  rafraichirTout();
  revalidatePath("/rendez-vous");
}

/**
 * Paramètres de la pratique.
 *
 * Ils gouvernent le calcul des créneaux proposés au public : durée d'une
 * séance, battement entre deux séances au même endroit, temps de trajet entre
 * deux lieux, pas de la grille et horizon de réservation. C'étaient des
 * constantes dans le code ; ce sont des décisions qui appartiennent à la
 * praticienne.
 */
export async function enregistrerParametres(f: FormData) {
  const entier = (cle: string, min: number, max: number, defaut: number) => {
    const n = Number(texte(f, cle));
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : defaut;
  };

  const data = {
    dureeSeanceMin: entier("dureeSeanceMin", 15, 240, 45),
    battementMin: entier("battementMin", 0, 120, 0),
    trajetMin: entier("trajetMin", 0, 180, 30),
    pasMin: entier("pasMin", 5, 120, 15),
    horizonSemaines: entier("horizonSemaines", 1, 26, 4),
    chainerSeances: f.get("chainerSeances") === "on",
  };

  await prisma.parametres.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  });

  rafraichirTout();
  revalidatePath("/rendez-vous");
}
