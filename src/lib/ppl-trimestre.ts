import { prisma } from "@/lib/db";
import { instantBruxelles, isBillable, partiesJour } from "@/lib/format";
import {
  plafondConventionne,
  reseauPpl,
  seancesHorsQuota,
  seancesSurDouzeMois,
} from "@/lib/quotas";
import { montantSeanceCents } from "@/lib/tarifs";

/**
 * Suivi trimestriel de la convention de psychologie de première ligne : ce qui
 * a été fait, ce que l'INAMI doit verser, ce qui est déjà arrivé, et ce qui ne
 * sera pas remboursé parce qu'au-delà du plafond.
 *
 * Un trimestre est celui du calendrier (janvier–mars…), en heure de Bruxelles.
 */
export function trimestreCourant(maintenant = new Date()) {
  const { annee, mois } = partiesJour(maintenant);
  return { annee, trimestre: Math.floor((mois - 1) / 3) + 1 };
}

export function bornesTrimestre(annee: number, trimestre: number) {
  const m = (trimestre - 1) * 3 + 1;
  const iso = (a: number, mm: number) =>
    `${a}-${String(mm).padStart(2, "0")}-01`;
  const debut = instantBruxelles(iso(annee, m), "00:00")!;
  const fin = instantBruxelles(
    m + 3 > 12 ? iso(annee + 1, 1) : iso(annee, m + 3),
    "00:00",
  )!;
  return { debut, fin };
}

export type LignePatientPpl = {
  patientId: string;
  nom: string;
  nationalNumber: string | null;
  type: string;
  reseau: string;
  seances: number;
  horsQuota: number;
  montantCents: number;
  recuCents: number;
  aRecevoirCents: number;
  utilisees12Mois: number;
  plafond: number;
};

export type SeancePpl = {
  id: string;
  patientNom: string;
  nationalNumber: string | null;
  debut: Date;
  cabinet: string;
  dureeMin: number;
  montantCents: number;
  recu: boolean;
  horsQuota: boolean;
};

export async function suiviPpl(annee: number, trimestre: number) {
  const { debut, fin } = bornesTrimestre(annee, trimestre);
  const patients = await prisma.patient.findMany({
    where: {
      scheme: "CONVENTIONNE",
      sessions: { some: { startsAt: { gte: debut, lt: fin } } },
    },
    include: {
      tarif: true,
      sessions: {
        include: { cabinet: { select: { nom: true } } },
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const lignes: LignePatientPpl[] = [];
  const seances: SeancePpl[] = [];
  for (const p of patients) {
    const hors = seancesHorsQuota(p.sessions, p);
    const duTrimestre = p.sessions.filter(
      (s) => s.startsAt >= debut && s.startsAt < fin && isBillable(s.status),
    );
    if (duTrimestre.length === 0) continue;
    const nom = p.anonymiseAt
      ? "Dossier anonymisé"
      : `${p.lastName} ${p.firstName}`;
    let montant = 0;
    let recu = 0;
    let aRecevoir = 0;
    let nbHors = 0;
    for (const s of duTrimestre) {
      const valeur = s.amountCents ?? montantSeanceCents(p) ?? 0;
      const estHors = hors.has(s.id);
      const estRecu = s.paymentStatus === "PAID";
      montant += valeur;
      if (estHors) nbHors += 1;
      else if (estRecu) recu += valeur;
      else aRecevoir += valeur;
      seances.push({
        id: s.id,
        patientNom: nom,
        nationalNumber: p.nationalNumber,
        debut: s.startsAt,
        cabinet: s.cabinet.nom,
        dureeMin: s.durationMin,
        montantCents: valeur,
        recu: estRecu,
        horsQuota: estHors,
      });
    }
    lignes.push({
      patientId: p.id,
      nom,
      nationalNumber: p.nationalNumber,
      type: p.pplType === "TRAITEMENT" ? "traitement" : "soutien",
      reseau:
        reseauPpl(p, fin) === "ENFANTS" ? "enfants et adolescents" : "adultes",
      seances: duTrimestre.length,
      horsQuota: nbHors,
      montantCents: montant,
      recuCents: recu,
      aRecevoirCents: aRecevoir,
      utilisees12Mois: seancesSurDouzeMois(
        p.sessions,
        new Date(fin.getTime() - 1),
      ),
      plafond: plafondConventionne(p, fin),
    });
  }

  const somme = (f: (l: LignePatientPpl) => number) =>
    lignes.reduce((n, l) => n + f(l), 0);
  return {
    debut,
    fin,
    lignes,
    seances,
    totaux: {
      seances: somme((l) => l.seances),
      horsQuota: somme((l) => l.horsQuota),
      montantCents: somme((l) => l.montantCents),
      recuCents: somme((l) => l.recuCents),
      aRecevoirCents: somme((l) => l.aRecevoirCents),
    },
  };
}
