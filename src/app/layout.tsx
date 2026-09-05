import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";


export const metadata: Metadata = {
  title: "Amandine Monsel — Amapsy SRL",
  description: "Outil de gestion de pratique. Instance de test, données fictives.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Nav />
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
