import { TitreSection } from "@/components/tags";
import { statutRestauration, statutSauvegarde } from "@/lib/sauvegardes";

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
  const [s, r] = await Promise.all([statutSauvegarde(), statutRestauration()]);
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
      {r.etat !== "inconnu" && (
        <div
          className={`rounded-[14px] border px-5 py-4 text-sm ${
            r.etat === "ok" ? "border-line bg-surface" : "border-overdue/40 bg-overdue-soft text-overdue"
          }`}
        >
          <p className="font-medium">
            {r.etat === "ok" && `Dernier test de restauration réussi : ${fmt.format(r.date)}`}
            {r.etat === "ancien" && `Aucun test de restauration récent. Le dernier date du ${fmt.format(r.date)}`}
            {r.etat === "echec" && `Le test de restauration a échoué (${fmt.format(r.date)})`}
          </p>
          <p className={`mt-1 text-xs ${r.etat === "ok" ? "text-ink-muted" : ""}`}>
            {r.etat === "echec"
              ? `${r.motif}. Une sauvegarde qui ne se restaure pas ne protège de rien : faites vérifier le serveur.`
              : `Une fois par mois, la dernière sauvegarde est restaurée dans une base jetable pour prouver qu’elle fonctionne (${r.patients} patient${r.patients > 1 ? "s" : ""}, ${r.seances} séance${r.seances > 1 ? "s" : ""} retrouvés), puis la copie est supprimée.`}
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
