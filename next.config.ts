import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // L'import de patients envoie un classeur Excel à une action serveur ;
    // la limite par défaut (1 Mo) est trop juste pour un fichier avec mise en forme.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
