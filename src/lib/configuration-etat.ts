import { prisma } from "@/lib/db";
import { cleNotesPresente } from "@/lib/chiffrement";
import { courrielConfigure } from "@/lib/courriel";
import { parametres } from "@/lib/parametres";
import { statutRestauration, statutSauvegarde } from "@/lib/sauvegardes";
import { pointsAcompleter } from "@/lib/configuration";

/** Lit l'état de l'installation et en tire la liste des points à compléter. */
export async function configurationACompleter() {
  const [reglages, acces, nbTarifsActifs, nbCabinetsActifs, nbDisponibilites, sauvegarde, restauration] =
    await Promise.all([
      parametres(),
      prisma.acces.findUnique({ where: { id: "global" } }),
      prisma.tarif.count({ where: { actif: true } }),
      prisma.cabinet.count({ where: { actif: true } }),
      prisma.disponibilite.count(),
      statutSauvegarde(),
      statutRestauration(),
    ]);
  return pointsAcompleter({
    reglages,
    courrielConfigure: courrielConfigure(),
    cleNotesPresente: cleNotesPresente(),
    adresseRecuperation: acces?.recoveryEmail ?? null,
    nbTarifsActifs,
    nbCabinetsActifs,
    nbDisponibilites,
    sauvegarde,
    restauration,
  });
}
