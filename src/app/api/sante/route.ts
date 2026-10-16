import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { statutRestauration, statutSauvegarde } from "@/lib/sauvegardes";

/**
 * Point de contrôle pour la surveillance extérieure (voir
 * .github/workflows/surveillance.yml). Public, donc volontairement pauvre : il
 * dit seulement si la base répond et si la sauvegarde de la nuit est récente.
 * Aucun nom, aucun compte, aucune donnée de patient.
 *
 * 200 : tout va bien. 503 : la base ne répond pas, la dernière sauvegarde
 * réussie date de plus de 36 h, ou le dernier test de restauration a échoué —
 * dans tous les cas quelqu'un doit regarder. Un statut « inconnu » (poste de
 * développement, démonstration) n'est pas une panne.
 */
export const dynamic = "force-dynamic";

async function baseRepond() {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("délai")), 5000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [base, sauvegarde, restauration] = await Promise.all([
    baseRepond(),
    statutSauvegarde(),
    statutRestauration(),
  ]);
  const ok = base && sauvegarde.etat !== "ancienne" && restauration.etat !== "echec";
  return NextResponse.json(
    {
      ok,
      base: base ? "ok" : "panne",
      sauvegarde: sauvegarde.etat,
      restauration: restauration.etat,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
