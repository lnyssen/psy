import { cookies } from "next/headers";
import type { Metadata } from "next";
import { BarreLaterale } from "@/components/BarreLaterale";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { demoOuverte } from "@/lib/demo";

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
  const ouverte = demoOuverte();

  return (
    <div className="flex min-h-screen">
      <BarreLaterale
        theme={theme}
        demandesEnAttente={enAttente}
        replieeInitial={repliee}
        ouverte={ouverte}
      />

      {/* min-w-0 : sans lui, une table trop large repousserait la colonne au
          lieu de rester dans ses limites, et la page entière défilerait de
          côté — ce que l'outil s'interdit partout ailleurs. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Nav theme={theme} demandesEnAttente={enAttente} ouverte={ouverte} />
        {/* Un bandeau, et non une mention discrète en pied de page : tant que
            le mot de passe est levé, il faut qu'on ne puisse pas l'oublier —
            ni celui qui montre l'outil, ni celui qui le reprend en main. */}
        {ouverte && (
          <p
            role="status"
            className="mx-auto w-full max-w-7xl px-5 pt-5 md:px-8"
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] border border-due/40 bg-due-soft px-4 py-2.5 text-[13px] text-due">
              <span className="font-semibold">Démonstration ouverte</span>
              <span aria-hidden="true">·</span>
              <span>
                l’outil est accessible sans mot de passe. N’y saisissez aucune donnée réelle.
              </span>
            </span>
          </p>
        )}

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
