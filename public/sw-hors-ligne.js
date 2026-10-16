/*
 * Service worker de l'affichage hors connexion — il ne fait qu'une chose.
 *
 * Il garde en mémoire UNE page statique (/hors-ligne.html, sans aucune donnée)
 * et la sert à la place d'une page de l'outil quand le réseau est coupé. Il ne
 * met en cache aucune autre page, aucune réponse de l'API, aucun script : une
 * page de l'outil ne reste donc jamais lisible sans connexion. Les séances du
 * jour, elles, sont dans le stockage local de l'appareil (voir
 * src/lib/hors-ligne-client.ts) et seulement si l'option a été activée.
 */
const CACHE = "amapsy-hors-ligne-v1";
const PAGE = "/hors-ligne.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(PAGE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.mode !== "navigate") return;
  const url = new URL(requete.url);
  // Seulement l'outil : le site public n'a rien à faire d'une page hors connexion.
  const dansLOutil = url.hostname.startsWith("admin.") || url.pathname.startsWith("/admin");
  if (!dansLOutil) return;
  event.respondWith(fetch(requete).catch(() => caches.match(PAGE)));
});
