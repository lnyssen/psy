import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // L'import de patients envoie un classeur Excel à une action serveur ;
    // la limite par défaut (1 Mo) est trop juste pour un fichier avec mise en forme.
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Personne d'autre ne peut afficher l'outil dans un cadre (clic piégé).
          // « self » suffit : la vue scindée de l'outil charge ses propres pages.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
