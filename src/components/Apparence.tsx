"use client";

import { useState, useTransition } from "react";
import { ACCENTS, CLES_ACCENT, cssAccent, type CleAccent } from "@/lib/accent";
import { enregistrerAccent } from "@/lib/apparence-actions";

type PreferenceTheme = "light" | "dark" | "auto";
type Taille = "petite" | "normale" | "grande";

/** Un an : ce sont des préférences, pas une session. */
function poserCookie(nom: string, valeur: string) {
  document.cookie = `${nom}=${valeur}; path=/; max-age=31536000; samesite=lax`;
}

/** Montre la couleur à l'écran, sans l'enregistrer : l'aperçu se défait en rechargeant. */
function apercuAccent(cle: CleAccent) {
  let el = document.getElementById("accent-site") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "accent-site";
    document.head.appendChild(el);
  }
  el.textContent = cssAccent(cle);
}

/** Applique tout de suite le thème choisi et le retient pour cet appareil. */
function appliquerTheme(p: PreferenceTheme) {
  poserCookie("theme", p);
  document.documentElement.dataset.theme =
    p === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : p;
}

/** Idem pour la taille de l'interface : « normale » retire l'attribut. */
function appliquerTaille(t: Taille) {
  poserCookie("taille", t);
  if (t === "normale") delete document.documentElement.dataset.taille;
  else document.documentElement.dataset.taille = t;
}

const choix =
  "flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-accent";

/**
 * Réglages › Apparence. Trois choses, de portée différente : la couleur d'accent
 * vaut pour tout le monde (le site public la porte aussi) et s'enregistre en
 * base ; le thème et la taille de l'interface ne valent que pour cet appareil
 * et s'appliquent aussitôt, par cookie.
 */
export function Apparence({
  accentInitial,
  themeInitial,
  tailleInitiale,
}: {
  accentInitial: CleAccent;
  themeInitial: PreferenceTheme;
  tailleInitiale: Taille;
}) {
  const [accent, setAccent] = useState<CleAccent>(accentInitial);
  const [enregistre, setEnregistre] = useState<CleAccent>(accentInitial);
  const [theme, setTheme] = useState(themeInitial);
  const [taille, setTaille] = useState(tailleInitiale);
  const [enCours, demarrer] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  function choisirTheme(p: PreferenceTheme) {
    setTheme(p);
    appliquerTheme(p);
  }

  function choisirTaille(t: Taille) {
    setTaille(t);
    appliquerTaille(t);
  }

  return (
    <div className="flex flex-col gap-6 rounded-[14px] border border-line bg-surface px-5 py-5">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setRetour(null);
          demarrer(async () => {
            const r = await enregistrerAccent(accent);
            if (r.ok) setEnregistre(accent);
            setRetour({ ok: r.ok, texte: r.ok ? "Couleur enregistrée, pour le site et pour l’outil." : r.message });
          });
        }}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">Couleur d’accent du site et de l’outil</legend>
          <p className="max-w-2xl text-xs text-ink-muted">
            Elle colore les boutons, les liens et les pastilles actives, sur le site public comme dans
            l’outil. Chaque teinte a été choisie pour que les textes restent lisibles, en clair
            comme en sombre. L’essai se voit tout de suite, mais ne vaut pour tout le monde qu’une
            fois enregistré.
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {CLES_ACCENT.map((cle) => (
              <label key={cle} className="relative">
                <input
                  type="radio"
                  name="accent"
                  value={cle}
                  checked={accent === cle}
                  onChange={() => {
                    setAccent(cle);
                    setRetour(null);
                    apercuAccent(cle);
                  }}
                  className="peer sr-only"
                />
                <span className={choix}>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: ACCENTS[cle].clair.accent }}
                  />
                  {ACCENTS[cle].nom}
                  {cle === "violet" && <span className="text-[11px] font-normal text-ink-muted">(marque)</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="max-w-2xl text-xs text-ink-muted">
            Les couleurs des cabinets (Uccle, Auderghem, École) et des paiements (vert payé, ambre dû,
            rouge en retard) ne changent pas : elles ont un sens. Une teinte proche de l’une d’elles
            peut s’y confondre. Les PDF (reçus, attestations, factures) et l’icône de l’application
            gardent le violet.
          </p>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enCours || accent === enregistre}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {enCours ? "Enregistrement…" : "Enregistrer la couleur"}
          </button>
          {retour && (
            <span role={retour.ok ? "status" : "alert"} className={`text-sm ${retour.ok ? "text-paid" : "text-overdue"}`}>
              {retour.texte}
            </span>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-5 border-t border-line pt-5">
        <div>
          <h3 className="text-sm font-semibold">Sur cet appareil</h3>
          <p className="mt-1 max-w-2xl text-xs text-ink-muted">
            Ces deux choix s’appliquent tout de suite et ne valent que pour cet ordinateur ou ce
            téléphone : chaque appareil garde les siens.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Thème</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(
              [
                ["light", "Clair"],
                ["dark", "Sombre"],
                ["auto", "Automatique"],
              ] as const
            ).map(([valeur, label]) => (
              <label key={valeur} className="relative">
                <input
                  type="radio"
                  name="theme"
                  value={valeur}
                  checked={theme === valeur}
                  onChange={() => choisirTheme(valeur)}
                  className="peer sr-only"
                />
                <span className={choix}>{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-muted">Automatique suit le réglage clair ou sombre de l’appareil.</p>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Taille de l’interface
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(
              [
                ["petite", "Petite"],
                ["normale", "Normale"],
                ["grande", "Grande"],
              ] as const
            ).map(([valeur, label]) => (
              <label key={valeur} className="relative">
                <input
                  type="radio"
                  name="taille"
                  value={valeur}
                  checked={taille === valeur}
                  onChange={() => choisirTaille(valeur)}
                  className="peer sr-only"
                />
                <span className={choix}>{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            Grande agrandit les textes et les boutons d’environ 12 % ; petite les réduit de 6 %, pour
            voir plus de choses à la fois.
          </p>
        </fieldset>
      </div>
    </div>
  );
}
