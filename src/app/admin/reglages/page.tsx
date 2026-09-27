import { prisma } from "@/lib/db";
import { PALETTE_CABINETS } from "@/lib/palette";
import {
  enregistrerCabinet,
  enregistrerCategorieDepense,
  enregistrerTarif,
  supprimerCabinet,
  supprimerCategorieDepense,
  supprimerTarif,
} from "@/lib/actions";
import { euros } from "@/lib/format";
import { Horaires } from "@/components/Horaires";
import { Parametres } from "@/components/Parametres";
import { parametres } from "@/lib/parametres";

export const dynamic = "force-dynamic";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

export default async function Reglages() {
  const [cabinets, tarifs, categoriesDepense, comptes, comptesCategorie, disponibilites, conges] =
    await Promise.all([
      prisma.cabinet.findMany({ orderBy: { ordre: "asc" } }),
      prisma.tarif.findMany({ orderBy: { ordre: "asc" } }),
      prisma.categorieDepense.findMany({ orderBy: { ordre: "asc" } }),
      prisma.session.groupBy({ by: ["cabinetId"], _count: { _all: true } }),
      prisma.depense.groupBy({ by: ["categorieId"], _count: { _all: true } }),
      prisma.disponibilite.findMany(),
      prisma.indisponibilite.findMany({ orderBy: { debut: "asc" } }),
    ]);
  const valeurs = await parametres();
  const seancesPar = new Map(comptes.map((c) => [c.cabinetId, c._count._all]));
  const depensesPar = new Map(comptesCategorie.map((c) => [c.categorieId, c._count._all]));

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Réglages</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Le rythme des séances et les horaires d’ouverture décident de ce que le site propose.
          Viennent ensuite les tarifs, puis les lieux, qu’on touche plus rarement.
        </p>
      </header>

      <Parametres valeurs={valeurs} />

      <Horaires
        cabinets={cabinets.filter((c) => c.actif)}
        disponibilites={disponibilites}
        conges={conges}
      />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl">Tarifs</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Grille de référence. Le tarif propre à un patient, s’il en a un, prime toujours sur
            celle-ci.
          </p>
        </div>

        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {tarifs.map((t) => (
            <li key={t.id} className="border-b border-line px-5 py-3 last:border-b-0">
              <form action={enregistrerTarif} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={t.id} />
                <label className="min-w-52 flex-1">
                  <span className={libelleChamp}>Libellé</span>
                  <input name="libelle" defaultValue={t.libelle} required className={`mt-1 ${champ}`} />
                </label>
                <label className="w-32">
                  <span className={libelleChamp}>Montant (€)</span>
                  <input
                    name="montant"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={(t.amountCents / 100).toFixed(2)}
                    required
                    className={`mt-1 ${champ}`}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="parDefaut" defaultChecked={t.parDefaut} />
                  Par défaut
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="actif" defaultChecked={t.actif} />
                  Actif
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                >
                  Enregistrer
                </button>
                <button
                  type="submit"
                  formAction={supprimerTarif}
                  className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form
          action={enregistrerTarif}
          className="flex flex-wrap items-end gap-3 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
        >
          <label className="min-w-52 flex-1">
            <span className={libelleChamp}>Nouveau tarif</span>
            <input name="libelle" required placeholder="Bilan" className={`mt-1 ${champ}`} />
          </label>
          <label className="w-32">
            <span className={libelleChamp}>Montant (€)</span>
            <input
              name="montant"
              type="number"
              step="0.01"
              min="0"
              required
              className={`mt-1 ${champ}`}
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="actif" defaultChecked />
            Actif
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Ajouter
          </button>
        </form>

        <p className="text-xs text-ink-muted">
          Tarif par défaut actuel :{" "}
          <span className="font-semibold" data-numeric>
            {euros(tarifs.find((t) => t.parDefaut)?.amountCents ?? null)}
          </span>
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl">Catégories de dépenses</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sert à trier l’export comptable. Une catégorie qui porte déjà des dépenses se
            désactive plutôt que de disparaître — l’export d’un mois passé garde son libellé.
          </p>
        </div>

        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {categoriesDepense.map((c) => {
            const nb = depensesPar.get(c.id) ?? 0;
            return (
              <li key={c.id} className="border-b border-line px-5 py-3 last:border-b-0">
                <form action={enregistrerCategorieDepense} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="min-w-52 flex-1">
                    <span className={libelleChamp}>Libellé</span>
                    <input
                      name="libelle"
                      defaultValue={c.libelle}
                      required
                      className={`mt-1 ${champ}`}
                    />
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input type="checkbox" name="actif" defaultChecked={c.actif} />
                    Active
                  </label>
                  <span className="pb-2 text-xs text-ink-muted" data-numeric>
                    {nb} dépense{nb > 1 ? "s" : ""}
                  </span>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="submit"
                    formAction={supprimerCategorieDepense}
                    className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                  >
                    {nb > 0 ? "Désactiver" : "Supprimer"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <form
          action={enregistrerCategorieDepense}
          className="flex flex-wrap items-end gap-3 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
        >
          <label className="min-w-52 flex-1">
            <span className={libelleChamp}>Nouvelle catégorie</span>
            <input name="libelle" required placeholder="Horeca" className={`mt-1 ${champ}`} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="actif" defaultChecked />
            Active
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Ajouter
          </button>
        </form>
      </section>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl">Lieux</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cabinets et institutions. La couleur se choisit dans une palette dont chaque teinte a
            été vérifiée lisible et distincte des couleurs qui signalent déjà un état de paiement.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {cabinets.map((c) => {
            const nb = seancesPar.get(c.id) ?? 0;
            return (
              <li key={c.id} className="rounded-[14px] border border-line bg-surface px-5 py-4">
                <form action={enregistrerCabinet} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label>
                      <span className={libelleChamp}>Nom</span>
                      <input name="nom" defaultValue={c.nom} required className={`mt-1 ${champ}`} />
                    </label>
                    <label className="lg:col-span-2">
                      <span className={libelleChamp}>Rue et numéro</span>
                      <input
                        name="addressLine"
                        defaultValue={c.addressLine}
                        required
                        className={`mt-1 ${champ}`}
                      />
                    </label>
                    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                      <label>
                        <span className={libelleChamp}>Code</span>
                        <input
                          name="postalCode"
                          defaultValue={c.postalCode}
                          required
                          className={`mt-1 ${champ}`}
                        />
                      </label>
                      <label>
                        <span className={libelleChamp}>Commune</span>
                        <input
                          name="city"
                          defaultValue={c.city}
                          required
                          className={`mt-1 ${champ}`}
                        />
                      </label>
                    </div>
                  </div>

                  <label>
                    <span className={libelleChamp}>Accès — une ligne par moyen de transport</span>
                    <textarea
                      name="acces"
                      defaultValue={c.acces}
                      rows={3}
                      placeholder={"Tram 4 — arrêt Wagon, à cinq minutes à pied."}
                      className={`mt-1 ${champ} resize-y leading-snug`}
                    />
                  </label>

                  <fieldset className="flex flex-wrap items-center gap-3">
                    <legend className={`${libelleChamp} mb-1`}>Couleur</legend>
                    {PALETTE_CABINETS.map((t) => (
                      <label key={t.cle} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="colorHex"
                          value={t.colorHex}
                          defaultChecked={t.colorHex.toLowerCase() === c.colorHex.toLowerCase()}
                          className="peer sr-only"
                        />
                        <span
                          style={{ backgroundColor: t.vividHex }}
                          className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                        />
                        <span className="text-xs text-ink-muted">{t.nom}</span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label>
                      <span className={libelleChamp}>Plafond hebdomadaire (h)</span>
                      <input
                        name="quotaHebdoHeures"
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder="aucun"
                        defaultValue={c.quotaHebdoMin ? c.quotaHebdoMin / 60 : ""}
                        className={`mt-1 ${champ}`}
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <input
                        type="checkbox"
                        name="factureInstitution"
                        defaultChecked={c.factureInstitution}
                      />
                      Facturé à l’heure à un établissement
                    </label>
                    <label>
                      <span className={libelleChamp}>Tarif horaire établissement (€)</span>
                      <input
                        name="tarifHoraireEuros"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="—"
                        defaultValue={c.tarifHoraireCents ? (c.tarifHoraireCents / 100).toFixed(2) : ""}
                        className={`mt-1 ${champ}`}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap gap-x-5 gap-y-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="actif" defaultChecked={c.actif} />
                        Proposé à la création d’une séance
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="publie" defaultChecked={c.publie} />
                        Visible sur le site public
                      </label>
                    </span>
                    <span className="text-xs text-ink-muted" data-numeric>
                      {nb} séance{nb > 1 ? "s" : ""} enregistrée{nb > 1 ? "s" : ""}
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="submit"
                        formAction={supprimerCabinet}
                        className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                      >
                        {nb > 0 ? "Fermer le lieu" : "Supprimer"}
                      </button>
                    </span>
                  </div>
                  {nb > 0 && (
                    <p className="text-xs text-ink-muted">
                      Un lieu qui porte des séances est fermé, jamais supprimé : effacer le lieu
                      d’une séance passée réécrirait l’histoire, et les reçus déjà délivrés
                      mentionnent cette adresse.
                    </p>
                  )}
                </form>
              </li>
            );
          })}
        </ul>

        <form
          action={enregistrerCabinet}
          className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
        >
          <p className="mb-3 text-sm font-semibold">Ajouter un lieu</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className={libelleChamp}>Nom</span>
              <input name="nom" required placeholder="Ixelles" className={`mt-1 ${champ}`} />
            </label>
            <label className="lg:col-span-2">
              <span className={libelleChamp}>Rue et numéro</span>
              <input name="addressLine" required className={`mt-1 ${champ}`} />
            </label>
            <div className="grid grid-cols-[5.5rem_1fr] gap-2">
              <label>
                <span className={libelleChamp}>Code</span>
                <input name="postalCode" required className={`mt-1 ${champ}`} />
              </label>
              <label>
                <span className={libelleChamp}>Commune</span>
                <input name="city" required className={`mt-1 ${champ}`} />
              </label>
            </div>
          </div>
          <label className="mt-3 block">
            <span className={libelleChamp}>Accès — une ligne par moyen de transport</span>
            <textarea
              name="acces"
              rows={3}
              placeholder="Tram 4 — arrêt Wagon, à cinq minutes à pied."
              className={`mt-1 ${champ} resize-y leading-snug`}
            />
          </label>
          <fieldset className="mt-3 flex flex-wrap items-center gap-3">
            <legend className={`${libelleChamp} mb-1`}>Couleur</legend>
            {PALETTE_CABINETS.map((t, i) => (
              <label key={t.cle} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="colorHex"
                  value={t.colorHex}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span
                  style={{ backgroundColor: t.vividHex }}
                  className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                />
                <span className="text-xs text-ink-muted">{t.nom}</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className={libelleChamp}>Plafond hebdomadaire (h)</span>
              <input
                name="quotaHebdoHeures"
                type="number"
                step="0.25"
                min="0"
                placeholder="aucun"
                className={`mt-1 ${champ}`}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="factureInstitution" />
              Facturé à l’heure à un établissement
            </label>
            <label>
              <span className={libelleChamp}>Tarif horaire établissement (€)</span>
              <input
                name="tarifHoraireEuros"
                type="number"
                step="0.01"
                min="0"
                placeholder="—"
                className={`mt-1 ${champ}`}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="actif" defaultChecked />
              Proposé à la création d’une séance
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publie" defaultChecked />
              Visible sur le site public
            </label>
            <button
              type="submit"
              className="ml-auto rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Ajouter
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}
