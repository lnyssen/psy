import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

// Couleur de la barre du navigateur sur téléphone et de l'écran de lancement de
// l'application installée : le mauve du site.
export const viewport: Viewport = {
  themeColor: "#7F00FF",
};

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Amandine Monsel — Psychologue clinicienne à Uccle et Auderghem",
  description:
    "Psychologue clinicienne et psychothérapeute à Bruxelles. Enfants, adolescents et jeunes adultes. Orientations analytique et systémique. Consultations en français et en anglais.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le thème est lu ici, et non côté navigateur : la bonne version part dès la
  // première réponse, sans éclair blanc au chargement.
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="fr" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
