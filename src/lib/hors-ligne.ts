import { ACCENTS, accentValide } from "@/lib/accent";
import { fmtJourLong, isoJour, partiesJour } from "@/lib/format";

/**
 * Instantané de la journée, pour l'afficher sans réseau (téléphone dans un
 * cabinet sans couverture). Ce qui est gardé sur l'appareil, et seulement cela :
 *
 *   — l'heure, le prénom et l'initiale du nom (« Zoé M. »), le lieu et son
 *     adresse, une mention « visio » ;
 *   — ni téléphone, ni e-mail, ni montant, ni note, ni numéro national.
 *
 * Il ne contient QUE des séances de la journée de référence et de la suivante
 * travaillée ; la page hors connexion s'efface d'elle-même dès que la date a
 * changé (voir public/hors-ligne.html).
 */
export type SeanceHorsLigne = {
  debut: string;
  fin: string;
  nom: string;
  cabinet: string;
  adresse: string;
  visio: boolean;
  statut: "prevue" | "honoree" | "absente";
};
export type JourHorsLigne = { iso: string; titre: string; seances: SeanceHorsLigne[] };
export type InstantaneHorsLigne = {
  version: 1;
  genere: string;
  /** Jour (Bruxelles) auquel l'instantané se rapporte : au-delà, il est périmé. */
  jourReference: string;
  accent: { clair: string; sombre: string };
  jours: JourHorsLigne[];
};

export type SeanceSource = {
  startsAt: Date;
  durationMin: number;
  status: string;
  visio: boolean;
  patient: { firstName: string; lastName: string } | null;
  cabinet: { nom: string; addressLine: string | null; postalCode: string | null; city: string | null };
};

/** « 13 h 15 » ; à l'heure pile, « 13 h ». */
export function heureEnClair(d: Date) {
  const { heure, minute } = partiesJour(d);
  return minute === 0 ? `${heure} h` : `${heure} h ${String(minute).padStart(2, "0")}`;
}

/** « Zoé M. » : le prénom suffit à reconnaître, l'initiale à départager. */
export function nomAbrege(p: { firstName: string; lastName: string }) {
  const initiale = p.lastName.trim()[0];
  return initiale ? `${p.firstName} ${initiale.toLocaleUpperCase("fr-BE")}.` : p.firstName;
}

function adresseUne(c: SeanceSource["cabinet"]) {
  return [c.addressLine, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function construireInstantane(o: {
  maintenant: Date;
  jours: { debut: Date; seances: SeanceSource[] }[];
  accent: string | null | undefined;
}): InstantaneHorsLigne {
  const teinte = ACCENTS[accentValide(o.accent)];
  return {
    version: 1,
    genere: o.maintenant.toISOString(),
    jourReference: isoJour(o.maintenant),
    accent: { clair: teinte.clair.accent, sombre: teinte.sombre.accent },
    jours: o.jours.map((j) => ({
      iso: isoJour(j.debut),
      titre: fmtJourLong.format(j.debut),
      seances: j.seances
        .filter((s) => s.status !== "CANCELLED_IN_TIME")
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
        .map((s) => ({
          debut: heureEnClair(s.startsAt),
          fin: heureEnClair(new Date(s.startsAt.getTime() + s.durationMin * 60_000)),
          nom: s.patient ? nomAbrege(s.patient) : s.cabinet.nom,
          cabinet: s.cabinet.nom,
          adresse: adresseUne(s.cabinet),
          visio: s.visio,
          statut: s.status === "ATTENDED" ? "honoree" : s.status === "NO_SHOW" ? "absente" : "prevue",
        })),
    })),
  };
}
