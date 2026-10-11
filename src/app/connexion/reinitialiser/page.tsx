import Link from "next/link";
import { prisma } from "@/lib/db";
import { empreinteJeton } from "@/lib/acces";
import { NouveauMotDePasse } from "@/components/NouveauMotDePasse";

export const dynamic = "force-dynamic";

export default async function PageReinitialiser({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;
  const ligne = jeton
    ? await prisma.reinitialisationMdp.findUnique({
        where: { jetonHash: empreinteJeton(jeton) },
      })
    : null;
  const valable = Boolean(
    ligne && !ligne.utiliseAt && ligne.expireAt > new Date(),
  );

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-display text-3xl tracking-tight">
        Nouveau mot de passe
      </h1>
      {valable && jeton ? (
        <NouveauMotDePasse jeton={jeton} />
      ) : (
        <>
          <p className="max-w-sm text-center text-sm text-ink-muted">
            Ce lien n’est plus valable : il a expiré ou il a déjà servi.
            Demandez-en un nouveau depuis l’écran de connexion.
          </p>
          <Link
            href="/connexion/oublie"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Demander un nouveau lien
          </Link>
        </>
      )}
    </div>
  );
}
