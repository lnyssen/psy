import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amandine Monsel — Psychologue à Uccle et Auderghem",
  description:
    "Psychologue clinicienne à Bruxelles. Consultations à Uccle et Auderghem, sur rendez-vous.",
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
