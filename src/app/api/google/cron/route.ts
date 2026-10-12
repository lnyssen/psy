import { NextResponse } from "next/server";
import { synchroniser } from "@/lib/google-sync";
import { envoyerRappels } from "@/lib/rappels";

/**
 * Passage quotidien de secours (voir vercel.json). Les synchronisations
 * courantes partent des actions et de l'ouverture de l'agenda ; celle-ci
 * rattrape ce qu'elles auraient manqué — un jour sans que personne n'ouvre
 * l'outil, par exemple.
 *
 * Vercel envoie `Authorization: Bearer <CRON_SECRET>`. Sans secret configuré,
 * la route reste fermée plutôt qu'ouverte à tous.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET absente.", { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé.", { status: 401 });
  }
  // Même tâche quotidienne (05 h) : après la synchronisation, les rappels des
  // rendez-vous de demain. Un échec de l'un ne doit pas empêcher l'autre.
  const google = await synchroniser().catch((e) => ({ erreur: String(e) }));
  const rappels = await envoyerRappels().catch((e) => ({ erreur: String(e) }));
  return NextResponse.json({ google, rappels });
}
