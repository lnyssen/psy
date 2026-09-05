import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import "./globals.css";


export const metadata: Metadata = {
  title: "Amandine Monsel — Amapsy SRL",
  description: "Outil de gestion de pratique. Instance de test, données fictives.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le thème est lu ici, et non côté navigateur : la bonne version part dès la
  // première réponse, sans éclair blanc au chargement.
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="fr" data-theme={theme}>
      <body>
        <Nav theme={theme} />
        <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
          <p className="rounded-full bg-sunken px-4 py-2 text-center text-[11px] text-ink-muted">
            Instance de démonstration. Toutes les personnes affichées sont fictives.
          </p>
        </footer>
      </body>
    </html>
  );
}
