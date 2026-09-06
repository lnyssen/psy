import { cookies } from "next/headers";
import type { Metadata } from "next";
import { BarreLaterale } from "@/components/BarreLaterale";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Amandine Monsel — Amapsy SRL",
  description: "Outil de gestion de pratique.",
  // L'outil n'a rien à faire dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Coquille de l'outil : une barre latérale à partir de 900 px, une barre du
 * haut en dessous. Les deux préférences — thème et repli de la navigation —
 * sont lues ici, côté serveur, et non dans le navigateur : la bonne version
 * part dès la première réponse, sans éclair blanc ni barre qui se replie après
 * coup sous les yeux.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = jar.get("theme")?.value === "dark" ? "dark" : "light";
  const repliee = jar.get("nav")?.value === "replie";

  // Une demande déposée depuis le site n'avertit personne : aucun e-mail n'est
  // encore envoyé. Ce compteur est, en attendant, le seul signal qu'elle
  // existe — sans lui, une demande peut dormir des jours.
  const enAttente = await prisma.demandeRdv.count({ where: { statut: "EN_ATTENTE" } });

  return (
    <div className="flex min-h-screen">
      <BarreLaterale theme={theme} demandesEnAttente={enAttente} replieeInitial={repliee} />

      {/* min-w-0 : sans lui, une table trop large repousserait la colonne au
          lieu de rester dans ses limites, et la page entière défilerait de
          côté — ce que l'outil s'interdit partout ailleurs. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Nav theme={theme} demandesEnAttente={enAttente} />
        <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-5 pb-10 md:px-8">
          <p className="rounded-full bg-sunken px-4 py-2 text-center text-[11px] text-ink-muted">
            Instance de démonstration. Toutes les personnes affichées sont fictives.
          </p>
        </footer>
      </div>
    </div>
  );
}
