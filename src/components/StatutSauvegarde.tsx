import { TitreSection } from "@/components/tags";
import { statutSauvegarde } from "@/lib/sauvegardes";

const fmt = new Intl.DateTimeFormat("fr-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Brussels",
});

/**
 * Dernière sauvegarde de la base, visible dans les réglages. Une sauvegarde qui
 * ne tourne plus ne fait aucun bruit : c'est précisément pour cela qu'on la
 * montre.
 */
export async function StatutSauvegarde() {
  const s = await statutSauvegarde();
  return (
    <section id="sauvegardes" className="flex flex-col gap-3 scroll-mt-6">
      <TitreSection>Sauvegardes</TitreSection>
      {s.etat === "inconnu" ? (
        <p className="rounded-[14px] border border-line bg-surface px-5 py-4 text-sm text-ink-muted">
          Le statut des sauvegardes n’est pas disponible ici. Il l’est sur le
          serveur d’amandinemonsel.be, une fois le script de sauvegarde mis à
          jour par un déploiement.
        </p>
      ) : (
        <div
          className={`rounded-[14px] border px-5 py-4 text-sm ${
            s.etat === "ok"
              ? "border-line bg-surface"
              : "border-overdue/40 bg-overdue-soft text-overdue"
          }`}
        >
          <p className="font-medium">
            {s.etat === "ok"
              ? "Dernière sauvegarde : "
              : "Aucune sauvegarde récente. La dernière date du "}
            {fmt.format(s.date)}
          </p>
          <p
            className={`mt-1 text-xs ${s.etat === "ok" ? "text-ink-muted" : ""}`}
          >
            {s.tailleMo} Mo, chiffrée. {s.nombre} sauvegarde
            {s.nombre > 1 ? "s" : ""} conservée{s.nombre > 1 ? "s" : ""} sur le
            serveur (30 jours).
            {s.etat === "ancienne" &&
              " Faites vérifier le serveur : les sauvegardes ne se font plus."}
          </p>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        Une copie sur votre Mac se récupère avec le script{" "}
        <code>recuperer-sauvegardes.sh</code> : un serveur qui tombe emporterait
        aussi les sauvegardes qui y sont rangées.
      </p>
    </section>
  );
}
