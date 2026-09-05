import { Connexion } from "@/components/Connexion";

export const dynamic = "force-dynamic";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; verrouille?: string }>;
}) {
  const { suite, verrouille } = await searchParams;
  return <Connexion suite={suite ?? "/"} verrouille={verrouille === "1"} />;
}
