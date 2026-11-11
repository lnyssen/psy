import { PARTICIPANTS } from "@/lib/participants";

/** Choix « individuelle / avec le père / avec la mère / avec les parents » à
 *  la création d'une séance. */
export function ChampParticipants({
  className,
  defaultValue = "INDIVIDUELLE",
  "aria-label": ariaLabel,
}: {
  className: string;
  defaultValue?: string;
  "aria-label"?: string;
}) {
  return (
    <select name="participants" defaultValue={defaultValue} aria-label={ariaLabel} className={className}>
      {PARTICIPANTS.map((p) => (
        <option key={p.valeur} value={p.valeur}>
          {p.libelle}
        </option>
      ))}
    </select>
  );
}
