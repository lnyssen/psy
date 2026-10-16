"use client";

/**
 * Côté navigateur de l'affichage hors connexion (voir lib/hors-ligne.ts pour le
 * contenu, public/hors-ligne.html pour l'écran, public/sw-hors-ligne.js pour ce
 * qui le sert sans réseau).
 *
 * Une option par appareil, décidée sur cet appareil : l'indicateur est dans son
 * stockage local, jamais côté serveur. Désactivée, il n'y a ni instantané ni
 * service worker. Activée, l'instantané est rafraîchi à chaque ouverture de
 * l'outil (au plus toutes les dix minutes) et effacé : au verrouillage, quand la
 * date change, à la désactivation.
 */
const NOM_BASE = "amapsy-hors-ligne";
const INDICATEUR = "amapsy-hors-ligne-actif";
const RAFRAICHIR_MS = 10 * 60_000;
let derniereSynchro = 0;

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(NOM_BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("etat");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function ecrire(valeur: unknown) {
  const db = await ouvrir();
  await new Promise<void>((ok, ko) => {
    const t = db.transaction("etat", "readwrite");
    t.objectStore("etat").put(valeur, "instantane");
    t.oncomplete = () => ok();
    t.onerror = () => ko(t.error);
  });
  db.close();
}

export function horsLigneDisponible() {
  return typeof indexedDB !== "undefined" && "serviceWorker" in navigator;
}

export function horsLigneActive() {
  try {
    return localStorage.getItem(INDICATEUR) === "1";
  } catch {
    return false;
  }
}

/** Efface l'instantané de cet appareil (verrouillage, changement de jour, désactivation). */
export async function viderHorsLigne() {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await ouvrir();
    await new Promise<void>((ok) => {
      const t = db.transaction("etat", "readwrite");
      t.objectStore("etat").delete("instantane");
      t.oncomplete = () => ok();
      t.onerror = () => ok();
    });
    db.close();
  } catch {
    /* rien à effacer */
  }
}

/** Télécharge l'instantané du jour et le range sur l'appareil. */
export async function synchroniserHorsLigne(force = false) {
  if (!horsLigneActive() || !horsLigneDisponible()) return false;
  if (!force && Date.now() - derniereSynchro < RAFRAICHIR_MS) return true;
  try {
    const r = await fetch("/admin/hors-ligne/instantane", { credentials: "same-origin", cache: "no-store" });
    // Pas de session (redirigé vers la connexion, 401) : rien n'est enregistré.
    if (!r.ok || r.redirected) return false;
    await ecrire(await r.json());
    derniereSynchro = Date.now();
    return true;
  } catch {
    return false;
  }
}

export async function activerHorsLigne() {
  if (!horsLigneDisponible()) return false;
  await navigator.serviceWorker.register("/sw-hors-ligne.js", { scope: "/" });
  localStorage.setItem(INDICATEUR, "1");
  return synchroniserHorsLigne(true);
}

export async function desactiverHorsLigne() {
  try {
    localStorage.removeItem(INDICATEUR);
  } catch {
    /* sans stockage local, l'option n'était de toute façon pas active */
  }
  await viderHorsLigne();
  if ("serviceWorker" in navigator) {
    const inscriptions = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      inscriptions
        .filter((i) => i.active?.scriptURL.endsWith("/sw-hors-ligne.js"))
        .map((i) => i.unregister()),
    );
    if ("caches" in window) await caches.delete("amapsy-hors-ligne-v1");
  }
  derniereSynchro = 0;
}
