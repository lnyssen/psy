import { niveauQuota, partQuota, SEUIL_ATTENTION, SEUIL_PROCHE, texteQuota } from "@/lib/jauge-quota";

const REMPLISSAGE = {
  ok: "bg-accent",
  attention: "bg-due",
  proche: "bg-overdue",
  atteint: "bg-overdue",
} as const;
const TEXTE = {
  ok: "text-ink-muted",
  attention: "text-due",
  proche: "text-overdue",
  atteint: "text-overdue",
} as const;

/**
 * Jauge du plafond INAMI sur douze mois, avec un repère à 60 % et un à 80 %.
 *
 * Le niveau se dit toujours en mots sous la barre (« plus que 2 séances ») : la
 * couleur seule ne porte pas le sens. Pour un lecteur d'écran, la barre est un
 * « meter » dont la valeur lue est cette même phrase.
 *
 * `compacte` : une barre fine à côté du « 4 / 10 », pour un tableau ; sans la
 * phrase, déjà dite par le texte voisin.
 */
export function JaugeQuota({
  utilisees,
  plafond,
  compacte = false,
}: {
  utilisees: number;
  plafond: number;
  compacte?: boolean;
}) {
  const niveau = niveauQuota(utilisees, plafond);
  const part = partQuota(utilisees, plafond);
  const phrase = texteQuota(utilisees, plafond);
  return (
    <div className={compacte ? "w-24" : "w-full"}>
      <div
        role="meter"
        aria-label="Séances remboursées sur douze mois"
        aria-valuemin={0}
        aria-valuemax={plafond}
        aria-valuenow={Math.min(utilisees, plafond)}
        aria-valuetext={`${utilisees} sur ${plafond}. ${phrase}`}
        className={`relative overflow-hidden rounded-full bg-sunken ring-1 ring-line ${compacte ? "h-1.5" : "h-2.5"}`}
      >
        <div className={`h-full rounded-full ${REMPLISSAGE[niveau]}`} style={{ width: `${part}%` }} />
        {/* Repères : une fine coupure dans la barre, à 60 % et à 80 %. */}
        {[SEUIL_ATTENTION, SEUIL_PROCHE].map((s) => (
          <span
            key={s}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-ink/45"
            style={{ left: `${s * 100}%` }}
          />
        ))}
      </div>
      {!compacte && (
        <p className={`mt-1.5 text-xs ${TEXTE[niveau]}`}>{phrase}</p>
      )}
    </div>
  );
}
