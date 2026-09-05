import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Praticalites() {
  // Les tarifs ne figurent pas sur le site : ils se disent au téléphone ou en
  // séance, comme le veut la praticienne. Ils restent gérés dans l'outil.
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h1 className="font-display text-4xl font-bold tracking-tight">Praticalités</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Où me trouver, et comment se faire rembourser.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Les cabinets</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {cabinets.map((c) => (
            <div key={c.id} className="rounded-[14px] border border-line px-6 py-5">
              <p
                style={{ "--cab": c.colorHex } as React.CSSProperties}
                className="texte-cabinet text-lg font-bold"
              >
                {c.nom}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{adresseCabinet(c)}</p>
              <p className="mt-3 text-xs text-ink-muted">
                <span className="font-semibold text-ink">À compléter</span> — accès en transports,
                stationnement, étage, accessibilité.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Remboursement</h2>
        <div className="mt-4 flex max-w-2xl flex-col gap-4 leading-relaxed text-ink-muted">
          <p>
            La plupart des mutuelles belges interviennent partiellement dans le coût des séances
            de psychologie. Le montant et le nombre de séances varient d’une mutuelle à l’autre :
            renseignez-vous auprès de la vôtre.
          </p>
          <p>
            Une partie des consultations relève par ailleurs de la{" "}
            <span className="text-ink">convention INAMI de psychologie de première ligne</span>,
            qui rend la séance nettement moins chère. L’accès en est encadré.
          </p>
          <p className="rounded-[14px] border border-dashed border-line-strong px-5 py-4 text-sm">
            <span className="font-semibold text-ink">À compléter</span> — conditions exactes
            d’accès à la convention dans son cas, et pièces à fournir à la mutuelle.
          </p>
        </div>
      </section>
    </div>
  );
}
