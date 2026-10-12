import { Connexion } from "@/components/Connexion";

export const dynamic = "force-dynamic";

import { cibleApresConnexion } from "@/lib/acces-constantes";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{
    suite?: string;
    verrouille?: string;
    reinit?: string;
  }>;
}) {
  const { suite, verrouille, reinit } = await searchParams;
  return (
    <Connexion
      // Sans page d'origine (après un verrouillage, une expiration, un mot de
      // passe réinitialisé), on rouvre l'outil. « / » mènerait au site public
      // sur le domaine principal.
      suite={cibleApresConnexion(suite)}
      verrouille={verrouille === "1"}
      reinit={reinit === "1"}
    />
  );
}
