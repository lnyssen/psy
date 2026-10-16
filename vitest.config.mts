import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests automatiques : `npm test`. Ils ne touchent jamais à une vraie base — la
 * base et les fonctions de Next (cookies, redirection) sont remplacées par des
 * doubles dans chaque fichier — et se lancent en quelques secondes.
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Clé de signature de session propre aux tests : jamais la vraie.
      AUTH_SECRET: "cle-de-test-uniquement-0123456789",
      TZ: "UTC",
    },
  },
});
