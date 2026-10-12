import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ACCENTS, accentValide, cssAccent } from "@/lib/accent";
import { parametres } from "@/lib/parametres";

/** La couleur d'accent choisie dans Réglages › Apparence ; le violet de marque
 *  si la base ne répond pas — une page ne doit jamais tomber pour une couleur. */
async function accentActuel() {
  try {
    return accentValide((await parametres()).accent);
  } catch {
    return accentValide(null);
  }
}

// Couleur de la barre du navigateur sur téléphone : celle de l'accent choisi.
// (L'écran de lancement de l'application installée, lui, vient du manifeste,
// un fichier fixe : il garde le violet.)
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: ACCENTS[await accentActuel()].clair.accent };
}

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Amandine Monsel — Psychologue clinicienne à Uccle et Auderghem",
  description:
    "Psychologue clinicienne et psychothérapeute à Bruxelles. Enfants, adolescents et jeunes adultes. Orientations analytique et systémique. Consultations en français et en anglais.",
};

/** Thème « automatique » : suit le réglage du téléphone ou de l'ordinateur, et
 *  le suit encore si celui-ci change. Exécuté avant le premier affichage, pour
 *  qu'il n'y ait pas d'éclair clair avant le sombre. */
const SCRIPT_THEME_AUTO = `(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.dataset.theme=m.matches?"dark":"light"};a();m.addEventListener("change",a)}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Les préférences d'affichage sont lues ici, côté serveur : la bonne version
  // part dès la première réponse, sans éclair au chargement.
  const jar = await cookies();
  const preference = jar.get("theme")?.value;
  const theme = preference === "dark" ? "dark" : "light";
  const auto = preference === "auto";
  const taille = jar.get("taille")?.value;
  const accent = await accentActuel();
  // Le violet est déjà dans la feuille de style : rien à ajouter.
  const css = accent === "violet" ? "" : cssAccent(accent);

  return (
    // suppressHydrationWarning : en thème automatique, le script ci-dessous
    // corrige data-theme avant l'hydratation, ce que React verrait comme un écart.
    <html
      lang="fr"
      data-theme={theme}
      data-taille={taille === "petite" || taille === "grande" ? taille : undefined}
      suppressHydrationWarning
    >
      <head>
        {css && <style id="accent-site" dangerouslySetInnerHTML={{ __html: css }} />}
        {auto && <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME_AUTO }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
