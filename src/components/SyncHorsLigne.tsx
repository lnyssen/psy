"use client";

import { useEffect } from "react";
import { horsLigneActive, synchroniserHorsLigne } from "@/lib/hors-ligne-client";

/**
 * À chaque ouverture d'une page de l'outil, rafraîchit l'instantané de la
 * journée — si, et seulement si, l'option a été activée sur cet appareil. Ne
 * rend rien. Les ouvertures rapprochées sont absorbées (une synchro toutes les
 * dix minutes au plus).
 */
export function SyncHorsLigne() {
  useEffect(() => {
    if (horsLigneActive()) void synchroniserHorsLigne();
  }, []);
  return null;
}
