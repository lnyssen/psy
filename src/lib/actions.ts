"use server";

import { synchroniserApres } from "@/lib/google-sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { JOURS_OUVRES, instantBruxelles, numeroNational, partiesJour } from "@/lib/format";
import { parametres } from "@/lib/parametres";
import { montantSeanceCents, payeurDe } from "@/lib/tarifs";
import { PALETTE_CABINETS } from "@/lib/palette";
import { exigerSession } from "@/lib/garde";
import { seancesARetablir } from "@/lib/factures-etablissement";

/**
 * Déplace une séance sur un autre créneau, depuis le glisser-déposer de la
 * grille hebdomadaire.
 *
 * Le week-end est refusé côté serveur et pas seulement dans l'interface : une
 * règle métier qui ne vit que dans le navigateur n'est pas une règle.
 */
export async function deplacerSeance(id: string, isoDebut: string) {
  await exigerSession();
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
  await exigerSession();
  const texte = body.trim();
  if (!texte) return { ok: false as const, message: "La note est vide." };

  await prisma.note.create({ data: { patientId, body: texte } });
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true as const };
}

export async function supprimerNote(id: string, patientId: string) {
  await exigerSession();
  await prisma.note.delete({ where: { id } });
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true as const };
}

/**
 * Modifie une fiche patient — identité, coordonnées, régime, tarif, cabinet
 * habituel. La seule validation de fond : un e-mail doit ressembler à un
 * e-mail s'il est renseigné, rien n'est obligatoire hors nom et prénom.
 */
export async function enregistrerPatient(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;

  const firstName = texte(f, "firstName");
  const lastName = texte(f, "lastName");
  if (!firstName || !lastName) return;

  const email = texte(f, "email");
  if (email && !email.includes("@")) return;

  const scheme = texte(f, "scheme");
  if (!["PRIVE", "CONVENTIONNE"].includes(scheme)) return;
  const regime = scheme as "PRIVE" | "CONVENTIONNE";

  const actuel = await prisma.patient.findUnique({ where: { id }, select: { feeCents: true } });
  const { tarifId, feeCents } = await resoudreTarif(regime, texte(f, "tarifId"), actuel?.feeCents ?? null);

  const birthSaisie = texte(f, "birthDate");
  const birthDate = birthSaisie ? new Date(birthSaisie) : null;
  if (birthSaisie && Number.isNaN(birthDate?.getTime())) return;

  const cabinetId = texte(f, "cabinetId") || null;

  const nnSaisi = texte(f, "nationalNumber");
  const nationalNumber = nnSaisi ? numeroNational(nnSaisi) : null;
  if (nnSaisi && !nationalNumber) return;

  await prisma.patient.update({
    where: { id },
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: texte(f, "phone") || null,
      phoneMother: texte(f, "phoneMother") || null,
      phoneFather: texte(f, "phoneFather") || null,
      emailMother: texte(f, "emailMother") || null,
      emailFather: texte(f, "emailFather") || null,
      nationalNumber,
      addressLine: texte(f, "addressLine") || null,
      postalCode: texte(f, "postalCode") || null,
      city: texte(f, "city") || null,
      birthDate,
      scheme: regime,
      tarifId,
      feeCents,
      cabinetId,
    },
  });
  revalidatePath(`/admin/patients/${id}`);
  revalidatePath("/admin/patients");
}

export async function marquerPaye(id: string, methode: "CASH" | "ELECTRONIC") {
  await exigerSession();
  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: { include: { tarif: true } } },
  });
  if (!seance) return { ok: false as const, message: "Séance introuvable." };
  if (seance.patient && payeurDe(seance.patient.scheme) === "INAMI") {
    return {
      ok: false as const,
      message: "Séance conventionnée : le patient ne paie rien. Marquez-la « reçue de l’INAMI ».",
    };
  }

  await prisma.session.update({
    where: { id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: methode,
      // Le montant se fige au moment de l'encaissement : le tarif du patient
      // peut changer ensuite sans réécrire l'historique comptable.
      amountCents: seance.amountCents ?? montantSeanceCents(seance.patient),
    },
  });
  revalidatePath("/admin/facturation");
  revalidatePath("/admin/finance");
  revalidatePath(`/admin/patients/${seance.patientId}`);
  return { ok: true as const };
}

/**
 * Séance conventionnée (psychologue de première ligne) : l'INAMI a versé le
 * montant du tarif conventionné. Le patient, lui, n'a rien payé — d'où une
 * action à part, qui n'a pas de mode de paiement à choisir (c'est un virement)
 * et qui ne s'applique jamais à un patient privé.
 */
export async function marquerRecuInami(id: string) {
  await exigerSession();
  const r = await marquerRecuInamiLot([id]);
  return r.ok ? { ok: true as const } : r;
}

export async function marquerRecuInamiLot(ids: string[]) {
  await exigerSession();
  if (ids.length === 0) return { ok: false as const, message: "Aucune séance sélectionnée." };

  const seances = await prisma.session.findMany({
    where: {
      id: { in: ids },
      paymentStatus: { not: "PAID" },
      status: { in: ["ATTENDED", "NO_SHOW"] },
      patient: { scheme: "CONVENTIONNE" },
    },
    include: { patient: { include: { tarif: true } } },
  });
  if (seances.length === 0) {
    return { ok: false as const, message: "Aucune séance conventionnée à marquer reçue." };
  }

  const maintenant = new Date();
  await prisma.$transaction(
    seances.map((s) =>
      prisma.session.update({
        where: { id: s.id },
        data: {
          paymentStatus: "PAID",
          paidAt: maintenant,
          paymentMethod: "ELECTRONIC",
          // Figé au moment du versement, comme pour un encaissement patient : un
          // changement ultérieur du tarif ne réécrit pas ce qui a été reçu.
          amountCents: s.amountCents ?? montantSeanceCents(s.patient),
        },
      }),
    ),
  );

  revalidatePath("/admin/facturation");
  revalidatePath("/admin/finance");
  for (const s of seances) revalidatePath(`/admin/patients/${s.patientId}`);
  return { ok: true as const, n: seances.length };
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
  await exigerSession();
  if (ids.length === 0) return { ok: false as const, message: "Aucune séance sélectionnée." };

  const seances = await prisma.session.findMany({
    where: {
      id: { in: ids },
      paymentStatus: { not: "PAID" },
      status: { in: ["ATTENDED", "NO_SHOW"] },
      // Une séance conventionnée n'est pas une dette du patient : elle se marque
      // « reçue de l'INAMI », pas encaissée.
      patient: { scheme: "PRIVE" },
    },
    include: { patient: { include: { tarif: true } } },
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
          amountCents: s.amountCents ?? montantSeanceCents(s.patient),
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
  await exigerSession();
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

/**
 * Même création, mais depuis un formulaire ordinaire (patient, cabinet, date
 * et heure séparés) plutôt que des arguments positionnels — pour un bouton
 * « nouvelle séance » qui ne connaît pas encore l'ISO exact. Le week-end est
 * refusé ici aussi, pas seulement dans l'agenda : une règle qui ne vaudrait
 * que côté affichage n'en serait pas une.
 */
/** Un jour ouvré (lundi-vendredi), sur le calendrier bruxellois — pas
 *  l'heure locale du serveur (voir le même souci résolu dans format.ts). */
function estJourOuvre(d: Date) {
  const { annee, mois, jour } = partiesJour(d);
  const jourSemaine = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
  return (jourSemaine + 6) % 7 < JOURS_OUVRES;
}

/**
 * Crée une séance, seule ou répétée chaque semaine jusqu'à une date — le
 * même geste : le formulaire ne change pas, un champ « jusqu'au » en plus
 * suffit. Plafonné à cinquante-deux occurrences (un an de rythme
 * hebdomadaire) : au-delà, mieux vaut reprendre la main que de peupler
 * l'agenda d'une seule frappe.
 */
export async function creerSeanceDepuisFormulaire(f: FormData) {
  await exigerSession();
  const patientId = texte(f, "patientId");
  const cabinetId = texte(f, "cabinetId");
  const date = texte(f, "date");
  const heure = texte(f, "heure");
  if (!patientId || !cabinetId || !date || !heure) return;

  const debut = instantBruxelles(date, heure);
  if (!debut || !estJourOuvre(debut)) return;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;

  const dates = [debut];
  const jusquau = texte(f, "jusquau");
  if (/^\d{4}-\d{2}-\d{2}$/.test(jusquau)) {
    // Chaque occurrence est recalculée à l'heure murale de Bruxelles, une
    // semaine de calendrier après la précédente. Ajouter 7 × 24 h ferait
    // glisser les séances d'une heure après le passage à l'heure d'hiver.
    const [a, m, j] = date.split("-").map(Number);
    for (let semaine = 1; semaine < 52; semaine++) {
      const jourCible = new Date(Date.UTC(a, m - 1, j + 7 * semaine)).toISOString().slice(0, 10);
      if (jourCible > jusquau) break;
      const suivante = instantBruxelles(jourCible, heure);
      if (suivante && estJourOuvre(suivante)) dates.push(suivante);
    }
  }

  const duree = (await parametres()).dureeSeanceMin;
  await prisma.session.createMany({
    data: dates.map((d) => ({ patientId, cabinetId, startsAt: d, durationMin: duree })),
  });

  revalidatePath("/admin/semaine");
  revalidatePath("/admin");
  revalidatePath(`/admin/patients/${patientId}`);
}

/** Annule un rendez-vous à venir — pas encore honoré, donc pas encore
 *  facturable : passer par CANCELLED_IN_TIME plutôt que de le supprimer
 *  garde la trace pour la praticienne, au même titre qu'une annulation par
 *  le patient. Une séance déjà passée relève d'un autre geste (le statut se
 *  pose après coup, celui-ci n'annule qu'un avenir). */
export async function annulerSeance(id: string) {
  await exigerSession();
  const seance = await prisma.session.findUnique({ where: { id } });
  if (!seance || seance.status !== "SCHEDULED") return;

  await prisma.session.update({ where: { id }, data: { status: "CANCELLED_IN_TIME" } });
  revalidatePath("/admin/semaine");
  revalidatePath("/admin");
  if (seance.patientId) revalidatePath(`/admin/patients/${seance.patientId}`);
}

/**
 * Crée une fiche patient, puis ouvre son dossier — c'est là qu'on continue
 * (première séance, notes). Prénom et nom seuls sont exigés ; le reste se
 * complète quand on l'a sous la main, comme pour enregistrerPatient.
 */
export async function creerPatient(f: FormData) {
  await exigerSession();
  const firstName = texte(f, "firstName");
  const lastName = texte(f, "lastName");
  if (!firstName || !lastName) return;

  const scheme = texte(f, "scheme");
  const schemeValide = scheme === "CONVENTIONNE" ? "CONVENTIONNE" : "PRIVE";
  const { tarifId } = await resoudreTarif(schemeValide, texte(f, "tarifId"), null);

  const email = texte(f, "email");
  const birthSaisie = texte(f, "birthDate");
  const birthDate = birthSaisie ? new Date(birthSaisie) : null;
  const cabinetId = texte(f, "cabinetId") || null;

  const nnSaisi = texte(f, "nationalNumber");
  const nationalNumber = nnSaisi ? numeroNational(nnSaisi) : null;
  if (nnSaisi && !nationalNumber) return;

  const patient = await prisma.patient.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: texte(f, "phone") || null,
      phoneMother: texte(f, "phoneMother") || null,
      phoneFather: texte(f, "phoneFather") || null,
      emailMother: texte(f, "emailMother") || null,
      emailFather: texte(f, "emailFather") || null,
      nationalNumber,
      addressLine: texte(f, "addressLine") || null,
      postalCode: texte(f, "postalCode") || null,
      city: texte(f, "city") || null,
      birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
      scheme: schemeValide,
      tarifId,
      cabinetId,
      jetonRdv: crypto.randomUUID(),
    },
  });
  revalidatePath("/admin/patients");
  redirect(`/admin/patients/${patient.id}`);
}

// ---------------------------------------------------------------------------
// Réglages : cabinets et grille tarifaire
// ---------------------------------------------------------------------------

/** Toutes les vues qui affichent un lieu ou un tarif doivent être rafraîchies :
 *  un changement de nom ou de couleur se répercute partout. */
function rafraichirTout() {
  // Une modification de l'agenda part vers Google une fois la réponse envoyée.
  synchroniserApres();
  for (const chemin of [
    "/admin",
    "/admin/semaine",
    "/admin/patients",
    "/admin/facturation",
    "/admin/etablissements",
    "/admin/depenses",
    "/admin/reglages",
  ]) {
    revalidatePath(chemin);
  }
}

/**
 * Le tarif à poser sur une fiche, d'après le choix du formulaire et le régime.
 *
 * Le régime commande : un tarif d'un autre régime est refusé, et on retombe sur
 * le tarif par défaut du bon régime (en conventionné, le premier tarif actif —
 * il n'y en a qu'un). L'ancien montant libre est conservé seulement si on le
 * demande (« ancien »), faute de quoi il est effacé : un seul montant fait foi.
 */
async function resoudreTarif(
  scheme: "PRIVE" | "CONVENTIONNE",
  choix: string,
  ancienFeeCents: number | null,
): Promise<{ tarifId: string | null; feeCents: number | null }> {
  if (choix === "ancien" && scheme === "PRIVE" && ancienFeeCents !== null) {
    return { tarifId: null, feeCents: ancienFeeCents };
  }
  if (choix && choix !== "ancien") {
    const t = await prisma.tarif.findUnique({ where: { id: choix } });
    if (t && t.actif && t.regime === scheme) return { tarifId: t.id, feeCents: null };
  }
  const defaut =
    (await prisma.tarif.findFirst({
      where: { regime: scheme, actif: true, parDefaut: true },
      orderBy: { ordre: "asc" },
    })) ??
    (await prisma.tarif.findFirst({
      where: { regime: scheme, actif: true },
      orderBy: { ordre: "asc" },
    }));
  return { tarifId: defaut?.id ?? null, feeCents: null };
}

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

export async function enregistrerCabinet(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  // Plafond hebdomadaire saisi en heures, gardé en minutes ; vide = pas de
  // plafond. Le tarif horaire suit la même convention euros → centimes que
  // les tarifs de la grille.
  const quotaHeures = texte(f, "quotaHebdoHeures");
  const quotaHebdoMin = quotaHeures ? Math.round(Number(quotaHeures.replace(",", ".")) * 60) : null;
  const tarifHoraire = texte(f, "tarifHoraireEuros");
  const tarifHoraireCents = tarifHoraire
    ? Math.round(Number(tarifHoraire.replace(",", ".")) * 100)
    : null;

  const donnees = {
    nom: texte(f, "nom"),
    addressLine: texte(f, "addressLine"),
    postalCode: texte(f, "postalCode"),
    city: texte(f, "city"),
    colorHex: texte(f, "colorHex"),
    acces: texte(f, "acces"),
    actif: f.get("actif") === "on",
    publie: f.get("publie") === "on",
    quotaHebdoMin: quotaHeures && Number.isFinite(quotaHebdoMin) ? quotaHebdoMin : null,
    factureInstitution: f.get("factureInstitution") === "on",
    tarifHoraireCents:
      tarifHoraire && Number.isFinite(tarifHoraireCents) ? tarifHoraireCents : null,
    raisonSociale: texte(f, "raisonSociale") || null,
    mentionLegaleClient: texte(f, "mentionLegaleClient") || null,
    prefixeReference: texte(f, "prefixeReference") || null,
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
  await exigerSession();
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
  await exigerSession();
  const id = texte(f, "id");
  const libelle = texte(f, "libelle");
  // Saisi en euros, stocké en centimes : aucun flottant ne traverse la base.
  const euros = Number(texte(f, "montant").replace(",", "."));
  if (!libelle || !Number.isFinite(euros) || euros < 0) return;

  const regime = texte(f, "regime") === "CONVENTIONNE" ? "CONVENTIONNE" : "PRIVE";
  const donnees = {
    libelle,
    regime: regime as "PRIVE" | "CONVENTIONNE",
    amountCents: Math.round(euros * 100),
    // Le tarif par défaut n'a de sens qu'en privé : en conventionné, il n'y en a
    // qu'un. Et il est unique par régime.
    parDefaut: regime === "PRIVE" && f.get("parDefaut") === "on",
    actif: f.get("actif") === "on",
  };

  if (donnees.parDefaut) {
    await prisma.tarif.updateMany({ where: { regime }, data: { parDefaut: false } });
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
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;
  // Un tarif choisi dans des fiches se désactive plutôt que de disparaître :
  // le supprimer ferait retomber ces patients sur « aucun montant » sans qu'on
  // s'en aperçoive.
  const utilise = await prisma.patient.count({ where: { tarifId: id } });
  if (utilise > 0) {
    await prisma.tarif.update({ where: { id }, data: { actif: false, parDefaut: false } });
  } else {
    await prisma.tarif.delete({ where: { id } });
  }
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
  await exigerSession();
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
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;
  await prisma.disponibilite.delete({ where: { id } });
  rafraichirTout();
  revalidatePath("/rendez-vous");
}

/** Congés et absences. Se soustraient des créneaux proposés. */
export async function enregistrerConge(f: FormData) {
  await exigerSession();
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
  await exigerSession();
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
  await exigerSession();
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
    numeroEntreprise: texte(f, "numeroEntreprise") || null,
    numeroInami: texte(f, "numeroInami") || null,
    numeroVisa: texte(f, "numeroVisa") || null,
    numeroCommission: texte(f, "numeroCommission") || null,
    iban: texte(f, "iban") || null,
    delaiPaiementJours: entier("delaiPaiementJours", 0, 180, 30),
    adresseSiege: texte(f, "adresseSiege") || null,
    mentionLegale: texte(f, "mentionLegale") || null,
  };

  await prisma.parametres.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  });

  rafraichirTout();
  revalidatePath("/rendez-vous");
}

// ---------------------------------------------------------------------------
// Dépenses professionnelles, reçu photographié
// ---------------------------------------------------------------------------

/**
 * Enregistre une dépense, avec la photo de son reçu si elle a été jointe.
 *
 * Le fichier est stocké en base plutôt que sur un service à part : au volume
 * d'une pratique individuelle, ça reste négligeable, et ça évite d'introduire
 * un stockage externe pour ce premier jet (voir le commentaire du modèle).
 */
export async function enregistrerDepense(f: FormData) {
  await exigerSession();
  const libelle = texte(f, "libelle");
  const dateSaisie = new Date(texte(f, "date"));
  const montant = Number(texte(f, "montant").replace(",", "."));
  const categorieId = texte(f, "categorieId");
  if (!libelle || Number.isNaN(dateSaisie.getTime())) return;
  if (!Number.isFinite(montant) || montant < 0) return;
  if (!categorieId) return;

  const fichier = f.get("photo");
  // Le typage DOM de arrayBuffer() admet un SharedArrayBuffer que Prisma
  // refuse ; un fichier issu d'un formulaire n'en est jamais un, d'où le cast.
  let photo: Uint8Array<ArrayBuffer> | null = null;
  let photoMime: string | null = null;
  if (fichier instanceof File && fichier.size > 0) {
    photo = new Uint8Array(await fichier.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    photoMime = fichier.type || "application/octet-stream";
  }

  const cabinetId = texte(f, "cabinetId");

  await prisma.depense.create({
    data: {
      libelle,
      date: dateSaisie,
      amountCents: Math.round(montant * 100),
      categorieId,
      fournisseur: texte(f, "fournisseur") || null,
      cabinetId: cabinetId || null,
      ...(photo ? { photo, photoMime } : {}),
    },
  });
  revalidatePath("/admin/depenses");
}

export async function supprimerDepense(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;
  await prisma.depense.delete({ where: { id } });
  revalidatePath("/admin/depenses");
}

/**
 * Catégories de dépenses, réglables depuis Réglages — comme les cabinets et
 * les tarifs, ce ne sont pas des valeurs figées dans le code.
 */
export async function enregistrerCategorieDepense(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  const libelle = texte(f, "libelle");
  if (!libelle) return;

  const donnees = { libelle, actif: f.get("actif") === "on" };
  if (id) {
    await prisma.categorieDepense.update({ where: { id }, data: donnees });
  } else {
    const dernier = await prisma.categorieDepense.findFirst({ orderBy: { ordre: "desc" } });
    await prisma.categorieDepense.create({
      data: { ...donnees, ordre: (dernier?.ordre ?? -1) + 1 },
    });
  }
  revalidatePath("/admin/depenses");
  revalidatePath("/admin/reglages");
}

/** Une catégorie qui porte des dépenses n'est pas supprimée mais désactivée :
 *  effacer la catégorie d'une dépense passée réécrirait l'histoire de
 *  l'export comptable déjà remis. */
export async function supprimerCategorieDepense(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;
  const nb = await prisma.depense.count({ where: { categorieId: id } });
  if (nb > 0) {
    await prisma.categorieDepense.update({ where: { id }, data: { actif: false } });
  } else {
    await prisma.categorieDepense.delete({ where: { id } });
  }
  revalidatePath("/admin/depenses");
  revalidatePath("/admin/reglages");
}

// ---------------------------------------------------------------------------
// Facturation à un établissement (l'école) : factures numérotées
// ---------------------------------------------------------------------------

/**
 * Émet la facture d'un mois de vacations à un établissement.
 *
 * Contrairement au patient, l'établissement ne paie pas séance par séance : il
 * règle un relevé mensuel d'heures. C'est ici, à l'émission, que tout se fige
 * — numéro, heures, tarif, montant — et que les séances concernées se lient à
 * la facture : elles ne pourront plus glisser dans une autre, et modifier une
 * séance ensuite ne changera plus rien à une facture déjà partie (voir le
 * commentaire du modèle FactureEtablissement).
 *
 * Émettre n'est pas encaisser : le montant devient facturé (Finance le compte
 * dès maintenant), pas encore payé. Voir marquerFacturePayee.
 */
export async function emettreFactureEtablissement(cabinetId: string, annee: number, mois: number) {
  await exigerSession();
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId } });
  if (!cabinet?.factureInstitution || !cabinet.tarifHoraireCents) return;

  const debut = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 1));
  // factureId: null exclut ce qu'une facture précédente couvre déjà — une
  // séance ajoutée en retard sur un mois déjà facturé attend la prochaine
  // facture plutôt que de rouvrir celle-là.
  const seances = await prisma.session.findMany({
    where: {
      cabinetId,
      startsAt: { gte: debut, lt: fin },
      status: { in: ["ATTENDED", "NO_SHOW"] },
      factureId: null,
    },
  });
  if (seances.length === 0) return;

  const heuresTotalesMin = seances.reduce((n, s) => n + s.durationMin, 0);
  const montantCents = Math.round((heuresTotalesMin / 60) * cabinet.tarifHoraireCents);
  const reglages = await parametres();
  const maintenant = new Date();
  const echeanceLe = new Date(maintenant);
  echeanceLe.setDate(echeanceLe.getDate() + reglages.delaiPaiementJours);

  // Numérotation continue et chronologique, une seule séquence pour l'année —
  // jamais par établissement (voir le commentaire du modèle). Le dernier
  // numéro de l'année plus un ; @@unique([annee, numero]) refuse le doublon si
  // deux émissions se chevauchaient malgré tout.
  const dernier = await prisma.factureEtablissement.findFirst({
    where: { annee },
    orderBy: { numero: "desc" },
  });

  await prisma.$transaction(async (tx) => {
    const facture = await tx.factureEtablissement.create({
      data: {
        cabinetId,
        annee,
        mois,
        numero: (dernier?.numero ?? 0) + 1,
        heuresTotalesMin,
        tarifHoraireCents: cabinet.tarifHoraireCents!,
        montantCents,
        emiseLe: maintenant,
        echeanceLe,
      },
    });
    await tx.session.updateMany({
      where: { id: { in: seances.map((s) => s.id) } },
      data: { factureId: facture.id },
    });
    // Le montant se fige séance par séance, au prorata de sa durée : c'est ce
    // que Finance additionnera dans le facturé du mois.
    for (const s of seances) {
      await tx.session.update({
        where: { id: s.id },
        data: { amountCents: Math.round((s.durationMin / 60) * cabinet.tarifHoraireCents!) },
      });
    }
  });

  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
}

/**
 * Crée ou modifie une facture manuelle — un supplément ponctuel qui ne vient
 * pas d'un décompte de séances, une régularisation, ce que le calcul mensuel
 * ne couvre pas.
 *
 * Créer : assigne le prochain numéro de la séquence de l'année, comme
 * emettreFactureEtablissement. Modifier : seuls le libellé, le montant et
 * l'échéance bougent — jamais le numéro ni l'année, une fois posés. Refusé
 * si la facture est déjà payée ou annulée : la corriger relève alors de la
 * comptable, pas d'un formulaire.
 */
export async function enregistrerFactureEtablissementManuelle(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  const libelleSaisi = texte(f, "libelle");
  const echeanceSaisie = texte(f, "echeance");
  const commentaire = texte(f, "commentaire") || null;

  // Heures et tarif horaire sont facultatifs : une régularisation ponctuelle
  // n'en a pas besoin, mais un décompte tapé à la main — pour refaire une
  // facture antérieure à l'outil, par exemple — en a besoin exactement comme
  // celui que l'agenda calcule automatiquement. Quand les deux sont fournis,
  // le montant s'en déduit ; sinon il vient du champ saisi directement.
  const heures = Number(texte(f, "heures") || "0");
  const minutes = Number(texte(f, "minutes") || "0");
  const heuresTotalesMin =
    Number.isFinite(heures) && Number.isFinite(minutes) && (heures > 0 || minutes > 0)
      ? Math.round(heures * 60 + minutes)
      : null;
  const tarifHoraire = Number(texte(f, "tarifHoraireEuros").replace(",", "."));
  const tarifHoraireCents =
    heuresTotalesMin !== null && Number.isFinite(tarifHoraire) && tarifHoraire > 0
      ? Math.round(tarifHoraire * 100)
      : null;

  let montantCents: number;
  if (heuresTotalesMin !== null && tarifHoraireCents !== null) {
    montantCents = Math.round((heuresTotalesMin / 60) * tarifHoraireCents);
  } else {
    const montant = Number(texte(f, "montant").replace(",", "."));
    if (!Number.isFinite(montant) || montant < 0) return;
    montantCents = Math.round(montant * 100);
  }
  // Un libellé reste nécessaire pour une régularisation (rien d'autre ne dit
  // de quoi il s'agit) ; un décompte d'heures se suffit à lui-même, l'objet
  // par défaut de la facture s'en charge (voir la route PDF).
  if (!libelleSaisi && heuresTotalesMin === null) return;
  const libelle = libelleSaisi || null;

  if (id) {
    const facture = await prisma.factureEtablissement.findUnique({ where: { id } });
    if (!facture || facture.payeeLe || facture.annuleeLe) return;
    const echeanceLe = echeanceSaisie ? new Date(echeanceSaisie) : facture.echeanceLe;
    if (Number.isNaN(echeanceLe.getTime())) return;
    await prisma.factureEtablissement.update({
      where: { id },
      data: { libelle, montantCents, echeanceLe, commentaire, heuresTotalesMin, tarifHoraireCents },
    });
  } else {
    const cabinetId = texte(f, "cabinetId");
    const annee = Number(texte(f, "annee"));
    const mois = Number(texte(f, "mois"));
    const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId } });
    if (!cabinet || !Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
      return;
    }
    const reglages = await parametres();
    const maintenant = new Date();
    const echeanceLe = echeanceSaisie ? new Date(echeanceSaisie) : new Date(maintenant);
    if (!echeanceSaisie) echeanceLe.setDate(echeanceLe.getDate() + reglages.delaiPaiementJours);
    if (Number.isNaN(echeanceLe.getTime())) return;

    const dernier = await prisma.factureEtablissement.findFirst({
      where: { annee },
      orderBy: { numero: "desc" },
    });
    await prisma.factureEtablissement.create({
      data: {
        cabinetId,
        annee,
        mois,
        numero: (dernier?.numero ?? 0) + 1,
        montantCents,
        libelle,
        commentaire,
        manuelle: true,
        emiseLe: maintenant,
        echeanceLe,
        heuresTotalesMin,
        tarifHoraireCents,
      },
    });
  }

  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
}

/**
 * Annule une facture non payée : elle ne se supprime pas — la numérotation ne
 * tolère pas de trou — elle se marque annulée, et ses séances (s'il y en a)
 * redeviennent disponibles pour une prochaine facture.
 */
export async function annulerFactureEtablissement(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  const facture = await prisma.factureEtablissement.findUnique({ where: { id } });
  if (!facture || facture.payeeLe || facture.annuleeLe) return;

  await prisma.$transaction([
    prisma.factureEtablissement.update({
      where: { id },
      data: { annuleeLe: new Date() },
    }),
    prisma.session.updateMany({
      where: { factureId: id },
      data: { factureId: null, amountCents: null },
    }),
  ]);

  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
}

/**
 * Rétablit une facture annulée par erreur : elle reprend son numéro (jamais
 * réattribué, la numérotation reste continue) et redevient due. Une facture
 * calculée reprend ses séances, au même tarif horaire qu'à l'émission — si
 * elles ne correspondent plus exactement, rien ne bouge (voir
 * seancesARetablir).
 */
export async function retablirFactureEtablissement(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");

  await prisma.$transaction(async (tx) => {
    const facture = await tx.factureEtablissement.findUnique({ where: { id } });
    if (!facture) return;
    const seances = await seancesARetablir(facture, tx);
    if (!seances) return;

    await tx.factureEtablissement.update({ where: { id }, data: { annuleeLe: null } });
    for (const s of seances) {
      await tx.session.update({
        where: { id: s.id },
        data: {
          factureId: id,
          amountCents: Math.round((s.durationMin / 60) * facture.tarifHoraireCents!),
        },
      });
    }
  });

  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
}

/**
 * Annule le caractère facturable d'une absence non excusée : la praticienne
 * choisit de ne pas réclamer le montant. La séance garde la trace que
 * c'était une absence (NO_SHOW_ANNULE plutôt que CANCELLED_IN_TIME), mais
 * isBillable() la traite désormais comme non facturable — elle sort du dû,
 * de l'encaissé possible, et du quota INAMI de l'année si le patient est
 * conventionné, puisque ce quota se recompte depuis isBillable() à chaque
 * lecture plutôt que d'être suivi à part.
 */
export async function annulerAbsence(id: string) {
  await exigerSession();
  const seance = await prisma.session.findUnique({ where: { id } });
  if (!seance || seance.status !== "NO_SHOW") return;

  await prisma.session.update({
    where: { id },
    data: {
      status: "NO_SHOW_ANNULE",
      paymentStatus: "DUE",
      amountCents: null,
      paidAt: null,
      paymentMethod: null,
    },
  });

  revalidatePath("/admin/facturation");
  revalidatePath("/admin/finance");
  revalidatePath(`/admin/patients/${seance.patientId}`);
}

/** Encaisse une facture déjà émise : la facture et chacune de ses séances. */
export async function marquerFacturePayee(factureId: string) {
  await exigerSession();
  const facture = await prisma.factureEtablissement.findUnique({
    where: { id: factureId },
    include: { seances: true },
  });
  if (!facture || facture.payeeLe) return;

  const maintenant = new Date();
  await prisma.$transaction([
    prisma.factureEtablissement.update({ where: { id: factureId }, data: { payeeLe: maintenant } }),
    prisma.session.updateMany({
      where: { factureId },
      data: { paymentStatus: "PAID", paidAt: maintenant, paymentMethod: "ELECTRONIC" },
    }),
  ]);

  revalidatePath("/admin/etablissements");
  revalidatePath("/admin/finance");
}
