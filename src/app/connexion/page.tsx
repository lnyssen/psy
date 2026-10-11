import { Connexion } from "@/components/Connexion";

export const dynamic = "force-dynamic";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{
    suite?: string;
    verrouille?: string;
    reinit?: string;
  }>;
}) {
  const { suite, verrouille, reinit } = await searchParams;
  return (
    <Connexion
      suite={suite ?? "/"}
      verrouille={verrouille === "1"}
      reinit={reinit === "1"}
    />
  );
}
