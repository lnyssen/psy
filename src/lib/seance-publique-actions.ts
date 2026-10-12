"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  adresseNotifications,
  creneauEnClair,
  envoyerCourriel,
} from "@/lib/courriel";
import { synchroniserApres } from "@/lib/google-sync";
import { adresseDe, tropd } from "@/lib/limite";
import { DELAI_ANNULATION_H } from "@/lib/rappels";

const URL_SITE = process.env.SITE_URL || "https://amandinemonsel.be";

/**
 * Annulation (ou report) d'un rendez-vous par le patient, depuis le lien de son
 * e-mail. Possible jusqu'à DELAI_ANNULATION_H heures avant la séance : c'est la
 * règle affichée sur le site. Passé ce délai, la séance reste due et le patient
 * est invité à téléphoner.
 *
 * La séance devient « annulée à temps » : elle ne compte ni dans la facturation
 * ni dans le plafond INAMI, et l'agenda Google se met à jour.
 */
export async function annulerParLien(f: FormData) {
  const jeton = String(f.get("jeton") ?? "");
  const deplacer = String(f.get("mode") ?? "") === "deplacer";
  if (!jeton) redirect("/rendez-vous");
  if (tropd(`annulation:${adresseDe(await headers())}`, 20, 60 * 60_000))
    redirect(`/rendez-vous/seance/${jeton}?erreur=trop`);

  const s = await prisma.session.findUnique({
    where: { jetonPublic: jeton },
    include: { patient: true, cabinet: true },
  });
  if (!s || !s.patient) redirect("/rendez-vous");

  const delaiOk =
    s.startsAt.getTime() - Date.now() >= DELAI_ANNULATION_H * 3_600_000;
  if (s.status !== "SCHEDULED" || !delaiOk)
    redirect(`/rendez-vous/seance/${jeton}`);

  await prisma.session.update({
    where: { id: s.id },
    data: { status: "CANCELLED_IN_TIME" },
  });

  const nom = `${s.patient.firstName} ${s.patient.lastName}`;
  after(() =>
    envoyerCourriel({
      a: adresseNotifications(),
      sujet: `${deplacer ? "Report" : "Annulation"} : ${nom}, ${creneauEnClair(s.startsAt)}`,
      texte: [
        `${nom} a ${deplacer ? "annulé pour choisir un autre créneau" : "annulé son rendez-vous"} :`,
        "",
        `${creneauEnClair(s.startsAt)} à ${s.cabinet.nom}.`,
        "",
        `Agenda : ${URL_SITE}/admin/semaine`,
      ].join("\n"),
    }),
  );
  revalidatePath("/admin/semaine");
  revalidatePath("/admin");
  revalidatePath(`/admin/patients/${s.patient.id}`);
  synchroniserApres();

  if (deplacer) {
    // Pour choisir un autre créneau, le patient a besoin de son lien personnel.
    let perso = s.patient.jetonRdv;
    if (!perso) {
      perso = randomUUID();
      await prisma.patient.update({
        where: { id: s.patient.id },
        data: { jetonRdv: perso },
      });
    }
    redirect(`/rendez-vous?p=${perso}`);
  }
  redirect(`/rendez-vous/seance/${jeton}?annule=1`);
}
