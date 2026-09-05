import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Amandine Monsel — Amapsy SRL",
  description: "Outil de gestion de pratique.",
  // L'outil n'a rien à faire dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <>
      <Nav theme={theme} />
      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
        <p className="rounded-full bg-sunken px-4 py-2 text-center text-[11px] text-ink-muted">
          Instance de démonstration. Toutes les personnes affichées sont fictives.
        </p>
      </footer>
    </>
  );
}
